import * as vscode from "vscode";
import { execFile } from "child_process";
import * as path from "path";

export function isGitTracked(uri: vscode.Uri, cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const relPath = path.relative(cwd, uri.fsPath);
    execFile("git", ["ls-files", "--error-unmatch", relPath], { cwd }, (error) => {
      resolve(!error);
    });
  });
}

// Delega pro diff nativo do próprio VS Code (extensão git embutida) —
// accept/reject por hunk já vem de graça via stage/discard no painel de
// Source Control, sem precisar de decorations/CodeLens nossos.
export async function openNativeGitDiff(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.commands.executeCommand("git.openChange", uri);
    return true;
  } catch {
    return false;
  }
}
