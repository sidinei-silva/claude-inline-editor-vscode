import { spawn } from "child_process";
import { StreamJsonParser, StreamEvent } from "./streamJsonParser";
import { InlineEditorConfig } from "./config";

export interface RunInlineEditOptions {
  prompt: string;
  cwd: string;
  config: InlineEditorConfig;
  onEvent: (event: StreamEvent) => void;
}

export interface RunInlineEditResult {
  success: boolean;
  message: string;
}

export interface RunInlineEditHandle {
  cancel: () => void;
  done: Promise<RunInlineEditResult>;
}

// Nunca passar --bare nem --permission-mode bypassPermissions aqui — ver
// context/why-cli-bridge-not-sdk.md (auth de assinatura) e
// context/why-inline-ui-approach.md (bypassPermissions pula o callback de
// permissão inteiro, o que não importa mais pra Rota B, mas continuamos
// preferindo acceptEdits pra manter regras de deny explícitas ativas).
export function runInlineEdit(options: RunInlineEditOptions): RunInlineEditHandle {
  const { prompt, cwd, config, onEvent } = options;

  const args = [
    "-p",
    prompt,
    "--model",
    config.model,
    "--effort",
    config.effort,
    "--permission-mode",
    config.permissionMode,
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--add-dir",
    cwd,
  ];

  if (config.allowedTools) {
    args.push("--allowedTools", config.allowedTools);
  }

  const child = spawn("claude", args, { cwd });
  const parser = new StreamJsonParser();

  let settled = false;
  let resolveDone!: (value: RunInlineEditResult) => void;
  const done = new Promise<RunInlineEditResult>((resolve) => {
    resolveDone = resolve;
  });

  const finish = (result: RunInlineEditResult) => {
    if (settled) return;
    settled = true;
    resolveDone(result);
  };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    for (const event of parser.feed(chunk)) {
      onEvent(event);
      if (event.kind === "result") {
        finish({ success: event.success, message: event.message });
      }
    }
  });

  let stderrBuffer = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrBuffer += chunk;
  });

  child.on("error", (err) => {
    finish({ success: false, message: `Falha ao executar o claude CLI: ${err.message}` });
  });

  child.on("close", (code) => {
    if (!settled) {
      finish({ success: false, message: stderrBuffer.trim() || `claude saiu com código ${code}` });
    }
  });

  return {
    cancel: () => {
      child.kill();
    },
    done,
  };
}
