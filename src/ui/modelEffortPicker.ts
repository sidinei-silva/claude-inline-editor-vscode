import * as vscode from "vscode";
import { InlineEditorConfig } from "../config";

// Aliases confirmados via `claude -p --help` (CLI 2.1.224) — ver
// specs/cli-bridge.md.
const MODELS = ["sonnet", "opus", "haiku", "fable"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

// Escape em qualquer um dos dois picks só mantém o padrão configurado —
// nunca cancela o fluxo inteiro (só o showInputBox do prompt faz isso).
export async function pickModelAndEffort(
  defaults: InlineEditorConfig
): Promise<{ model: string; effort: string }> {
  const model = await vscode.window.showQuickPick(MODELS, {
    title: `Claude Inline Editor — modelo (Esc = padrão: ${defaults.model})`,
  });

  const effort = await vscode.window.showQuickPick(EFFORTS, {
    title: `Claude Inline Editor — esforço (Esc = padrão: ${defaults.effort})`,
  });

  return { model: model ?? defaults.model, effort: effort ?? defaults.effort };
}
