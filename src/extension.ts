import * as vscode from "vscode";
import * as path from "path";
import { getConfig, InlineEditorConfig } from "./config";
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
  const cursorLineText = document.lineAt(selection.active.line).text;

  // Manda o conteúdo do arquivo direto no prompt (numerado, no mesmo
  // formato que a própria tool Read do Claude usa) em vez de depender do
  // modelo decidir ler o arquivo sozinho antes de editar — com haiku/low
  // effort isso às vezes não acontecia e ele editava sem contexto real.
  // Acima de maxInlineFileLines, cai pra uma janela ao redor do
  // cursor/seleção (ver buildFileContextBlock) pra não estourar o prompt
  // em arquivos grandes — o modelo ainda pode usar Read pro resto.
  const promptParts = [
    `Edite o arquivo ${relPath}.`,
    buildFileContextBlock(document, selection, defaults),
    selectedText
      ? `Trecho selecionado pelo usuário (linhas ${selection.start.line + 1}-${selection.end.line + 1}):\n${selectedText}`
      : `Cursor do usuário na linha ${selection.active.line + 1} (conteúdo: ${JSON.stringify(cursorLineText)}).`,
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
      notifyReviewReady(document.uri);
    }
  );
}

function numberedLines(text: string, startLine = 0): string {
  return text
    .split("\n")
    .map((line, index) => `${startLine + index + 1}\t${line}`)
    .join("\n");
}

// Inspirado em como o Copilot Inline Chat lida com contexto (pesquisado,
// não fonte primária documentada): com seleção, escopa nela; sem seleção,
// usa o arquivo até um limite, priorizando o que está perto do cursor
// quando precisa truncar. Diferença nossa: o backend é um agente de
// verdade (claude CLI) que pode chamar Read por conta própria se precisar
// ver mais — então a janela aqui é só uma otimização de custo/latência,
// não a única fonte de verdade.
function buildFileContextBlock(
  document: vscode.TextDocument,
  selection: vscode.Selection,
  config: InlineEditorConfig
): string {
  const totalLines = document.lineCount;

  if (totalLines <= config.maxInlineFileLines) {
    return `Conteúdo atual do arquivo (linhas numeradas):\n${numberedLines(document.getText())}`;
  }

  const anchorStart = selection.isEmpty ? selection.active.line : selection.start.line;
  const anchorEnd = selection.isEmpty ? selection.active.line : selection.end.line;

  const windowStart = Math.max(0, anchorStart - config.contextWindowLines);
  const windowEnd = Math.min(totalLines - 1, anchorEnd + config.contextWindowLines);

  const windowRange = new vscode.Range(windowStart, 0, windowEnd, document.lineAt(windowEnd).text.length);
  const windowedNumbered = numberedLines(document.getText(windowRange), windowStart);

  return [
    `Arquivo com ${totalLines} linhas — acima do limite de ${config.maxInlineFileLines} configurado em ` +
      `claudeInlineEditor.maxInlineFileLines, então só as linhas ${windowStart + 1}-${windowEnd + 1} ` +
      `(ao redor do cursor/seleção) foram incluídas abaixo. Use a tool Read se precisar ver outras partes do arquivo.`,
    `Conteúdo (linhas numeradas):\n${windowedNumbered}`,
  ].join("\n");
}

// O CodeLens de accept/reject por hunk usa a cor/tamanho padrão do tema
// (editorCodeLens.foreground) — o VS Code não deixa uma extensão forçar um
// CodeLens individual a ficar maior/mais vivo. Essa notificação nativa
// serve de caminho principal, bem mais visível; o CodeLens continua
// disponível pra quem quiser aceitar/rejeitar bloco a bloco.
function notifyReviewReady(uri: vscode.Uri): void {
  vscode.window
    .showInformationMessage("Claude Inline Editor: revise as mudanças destacadas no editor.", "Accept All", "Reject All")
    .then((choice) => {
      if (choice === "Accept All") {
        reviewManager.acceptAll(uri);
      } else if (choice === "Reject All") {
        reviewManager.rejectAll(uri);
      }
    });
}

export function deactivate() {}
