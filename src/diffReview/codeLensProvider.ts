import * as vscode from "vscode";
import { DiffReviewManager } from "./decorationProvider";

export class DiffCodeLensProvider implements vscode.CodeLensProvider {
  readonly onDidChangeCodeLenses: vscode.Event<void>;

  constructor(private readonly manager: DiffReviewManager) {
    this.onDidChangeCodeLenses = manager.onDidChange;
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.manager.hasReview(document.uri)) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];
    const topRange = new vscode.Range(0, 0, 0, 0);

    lenses.push(
      new vscode.CodeLens(topRange, {
        title: "$(check-all) Claude: Accept All",
        command: "claudeInlineEditor.acceptAll",
        arguments: [document.uri],
      }),
      new vscode.CodeLens(topRange, {
        title: "$(discard) Claude: Reject All",
        command: "claudeInlineEditor.rejectAll",
        arguments: [document.uri],
      })
    );

    for (const hunk of this.manager.getHunks(document)) {
      const line = Math.min(hunk.modifiedStart, Math.max(document.lineCount - 1, 0));
      const range = new vscode.Range(line, 0, line, 0);
      lenses.push(
        new vscode.CodeLens(range, {
          title: "$(check) Accept",
          command: "claudeInlineEditor.acceptHunk",
          arguments: [document.uri, hunk],
        }),
        new vscode.CodeLens(range, {
          title: "$(x) Reject",
          command: "claudeInlineEditor.rejectHunk",
          arguments: [document.uri, hunk],
        })
      );
    }

    return lenses;
  }
}
