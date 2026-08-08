import * as vscode from "vscode";
import { computeHunks, originalTextForHunk, Hunk } from "./diffUtils";

interface PendingReview {
  originalContent: string;
}

// Estado central da Rota B (fallback não-git): mantém o snapshot de antes
// da edição, calcula os hunks sob demanda comparando com o conteúdo atual
// do documento, e aplica accept/reject via WorkspaceEdit. Usado tanto pelo
// CodeLensProvider quanto pelas decorations.
export class DiffReviewManager {
  private reviews = new Map<string, PendingReview>();

  private readonly decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor("diffEditor.insertedTextBackground"),
    isWholeLine: true,
  });

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  startReview(uri: vscode.Uri, originalContent: string): void {
    this.reviews.set(uri.toString(), { originalContent });
    this.refreshDecorations(uri);
    this._onDidChange.fire();
  }

  hasReview(uri: vscode.Uri): boolean {
    return this.reviews.has(uri.toString());
  }

  getHunks(document: vscode.TextDocument): Hunk[] {
    const review = this.reviews.get(document.uri.toString());
    if (!review) return [];
    return computeHunks(review.originalContent, document.getText());
  }

  async acceptAll(uri: vscode.Uri): Promise<void> {
    this.reviews.delete(uri.toString());
    this.clearDecorations(uri);
    this._onDidChange.fire();
  }

  async rejectAll(uri: vscode.Uri): Promise<void> {
    const review = this.reviews.get(uri.toString());
    if (!review) return;

    const document = await vscode.workspace.openTextDocument(uri);
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, fullRange, review.originalContent);
    await vscode.workspace.applyEdit(edit);
    await document.save();

    this.reviews.delete(uri.toString());
    this.clearDecorations(uri);
    this._onDidChange.fire();
  }

  async acceptHunk(uri: vscode.Uri, hunk: Hunk): Promise<void> {
    const document = await vscode.workspace.openTextDocument(uri);
    const remaining = this.getHunks(document).filter((h) => h.modifiedStart !== hunk.modifiedStart);
    if (remaining.length === 0) {
      await this.acceptAll(uri);
    } else {
      this.refreshDecorations(uri);
    }
  }

  async rejectHunk(uri: vscode.Uri, hunk: Hunk): Promise<void> {
    const review = this.reviews.get(uri.toString());
    if (!review) return;

    const document = await vscode.workspace.openTextDocument(uri);
    const startPos = this.positionForLine(document, hunk.modifiedStart);
    const endPos = this.positionForLine(document, hunk.modifiedStart + hunk.modifiedLines);
    const originalText = originalTextForHunk(review.originalContent, hunk);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(startPos, endPos), originalText);
    await vscode.workspace.applyEdit(edit);
    await document.save();

    const remaining = this.getHunks(await vscode.workspace.openTextDocument(uri));
    if (remaining.length === 0) {
      await this.acceptAll(uri);
    } else {
      this.refreshDecorations(uri);
    }
  }

  refreshDecorations(uri: vscode.Uri): void {
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri.toString());
    if (!editor) return;

    const hunks = this.getHunks(editor.document).filter((h) => h.modifiedLines > 0);
    const ranges = hunks.map(
      (h) => new vscode.Range(h.modifiedStart, 0, Math.max(h.modifiedStart + h.modifiedLines - 1, h.modifiedStart), 0)
    );
    editor.setDecorations(this.decorationType, ranges);
  }

  clearDecorations(uri: vscode.Uri): void {
    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri.toString());
    editor?.setDecorations(this.decorationType, []);
  }

  private positionForLine(document: vscode.TextDocument, line: number): vscode.Position {
    if (line >= document.lineCount) {
      return document.positionAt(document.getText().length);
    }
    return new vscode.Position(line, 0);
  }
}
