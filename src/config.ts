import * as vscode from "vscode";

export interface InlineEditorConfig {
  model: string;
  effort: string;
  permissionMode: string;
  allowedTools: string;
}

const CONFIG_SECTION = "claudeInlineEditor";

export function getConfig(): InlineEditorConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    model: config.get<string>("model", "sonnet"),
    effort: config.get<string>("effort", "medium"),
    permissionMode: config.get<string>("permissionMode", "acceptEdits"),
    allowedTools: config.get<string>("allowedTools", "Edit,Read"),
  };
}
