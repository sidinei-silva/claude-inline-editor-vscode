import * as vscode from "vscode";

export async function promptForInstruction(): Promise<string | undefined> {
  return vscode.window.showInputBox({
    title: "Claude Inline Editor",
    prompt: "O que você quer que o Claude faça?",
    placeHolder: "ex: extraia essa função para um helper separado",
    ignoreFocusOut: true,
  });
}
