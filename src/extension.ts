import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const invoke = vscode.commands.registerCommand("claudeInlineEditor.invoke", () => {
    vscode.window.showInformationMessage(
      "Claude Inline Editor: placeholder — lógica real ainda não implementada (aguardando decisão da Rota A/B/C)."
    );
  });

  context.subscriptions.push(invoke);
}

export function deactivate() {}
