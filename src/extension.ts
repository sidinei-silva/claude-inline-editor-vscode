import * as vscode from "vscode";
import * as path from "path";
import { getConfig } from "./config";
import { promptForInstruction } from "./ui/promptInput";
import { pickModelAndEffort } from "./ui/modelEffortPicker";
import { runInlineEdit } from "./cliBridge";
import { DiffReviewManager } from "./diffReview/decorationProvider";
import { DiffCodeLensProvider } from "./diffReview/codeLensProvider";
import { isGitTracked, openNativeGitDiff } from "./diffReview/gitHunkAdapter";

const reviewManager = new DiffReviewManager();

export function activate(context: vscode.ExtensionContext) {
  const codeLensProvider = new DiffCodeLensProvider(reviewManager);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ scheme: "file" }, codeLensProvider),
    vscode.commands.registerCommand("claudeInlineEditor.invoke", invoke),
    vscode.commands.registerCommand("claudeInlineEditor.acceptAll", (uri: vscode.Uri) => reviewManager.acceptAll(uri)),
    vscode.commands.registerCommand("claudeInlineEditor.rejectAll", (uri: vscode.Uri) => reviewManager.rejectAll(uri)),
    vscode.commands.registerCommand("claudeInlineEditor.acceptHunk", (uri: vscode.Uri, hunk) =>
      reviewManager.acceptHunk(uri, hunk)
    ),
    vscode.commands.registerCommand("claudeInlineEditor.rejectHunk", (uri: vscode.Uri, hunk) =>
      reviewManager.rejectHunk(uri, hunk)
    )
  );
}

async function invoke(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Claude Inline Editor: abra um arquivo primeiro.");
    return;
  }

  const document = editor.document;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("Claude Inline Editor: o arquivo precisa estar dentro de um workspace aberto.");
    return;
  }

  if (reviewManager.hasReview(document.uri)) {
    vscode.window.showWarningMessage(
      "Claude Inline Editor: já existe uma revisão pendente neste arquivo — aceite ou rejeite antes de pedir outra mudança."
    );
    return;
  }

  const instruction = await promptForInstruction();
  if (!instruction) return;

  const defaults = getConfig();
  const { model, effort } = await pickModelAndEffort(defaults);

  const originalContent = document.getText();
  const relPath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath);
  const selection = editor.selection;
  const selectedText = selection.isEmpty ? undefined : document.getText(selection);

  const promptParts = [
    `Edite o arquivo ${relPath}.`,
    selectedText
      ? `Trecho selecionado (linhas ${selection.start.line + 1}-${selection.end.line + 1}):\n${selectedText}`
      : `Cursor na linha ${selection.active.line + 1}.`,
    `Pedido: ${instruction}`,
  ];

  if (document.isDirty) {
    await document.save();
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Claude Inline Editor",
      cancellable: true,
    },
    async (progress, token) => {
      const handle = runInlineEdit({
        prompt: promptParts.join("\n\n"),
        cwd: workspaceFolder.uri.fsPath,
        config: { ...defaults, model, effort },
        onEvent: (event) => {
          if (event.kind === "progress" && event.text.trim()) {
            progress.report({ message: event.text.trim().slice(0, 80) });
          }
        },
      });

      token.onCancellationRequested(() => handle.cancel());

      const result = await handle.done;

      if (!result.success) {
        vscode.window.showErrorMessage(`Claude Inline Editor: ${result.message || "a execução falhou."}`);
        return;
      }

      const updatedDocument = await vscode.workspace.openTextDocument(document.uri);
      if (updatedDocument.getText() === originalContent) {
        vscode.window.showInformationMessage("Claude Inline Editor: nenhuma mudança foi feita.");
        return;
      }

      const gitTracked = await isGitTracked(document.uri, workspaceFolder.uri.fsPath);
      const openedNativeDiff = gitTracked && (await openNativeGitDiff(document.uri));

      if (openedNativeDiff) {
        vscode.window.showInformationMessage(
          "Claude Inline Editor: revise no painel de Source Control — stage = aceitar, discard = rejeitar."
        );
        return;
      }

      reviewManager.startReview(document.uri, originalContent);
      await vscode.window.showTextDocument(updatedDocument);
    }
  );
}

export function deactivate() {}
