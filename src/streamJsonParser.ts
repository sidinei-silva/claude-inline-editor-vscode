// Parser incremental do NDJSON produzido por
// `claude -p --output-format stream-json --include-partial-messages --verbose`.
//
// Os formatos abaixo (`stream_event`/`content_block_delta`, `result`,
// `system`/`permission_denied`) foram confirmados observando a saída real
// do CLI (v2.1.224) durante o spike — ver specs/ide-bridge.md e
// specs/cli-bridge.md. Não é schema documentado oficialmente; se o CLI
// mudar o formato, os eventos aqui simplesmente deixam de ser reconhecidos
// (parseLine retorna undefined) em vez de quebrar o parsing.

export type StreamEvent =
  | { kind: "progress"; text: string }
  | { kind: "result"; success: boolean; message: string; costUsd?: number }
  | { kind: "error"; message: string };

export class StreamJsonParser {
  private buffer = "";

  feed(chunk: string): StreamEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    const events: StreamEvent[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const event = this.parseLine(trimmed);
      if (event) events.push(event);
    }
    return events;
  }

  private parseLine(line: string): StreamEvent | undefined {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(line);
    } catch {
      return undefined;
    }

    if (json.type === "stream_event") {
      const event = json.event as Record<string, unknown> | undefined;
      if (event?.type === "content_block_delta") {
        const delta = event.delta as Record<string, unknown> | undefined;
        if (delta?.type === "text_delta" && typeof delta.text === "string") {
          return { kind: "progress", text: delta.text };
        }
      }
      return undefined;
    }

    if (json.type === "result") {
      const success = json.is_error === false;
      return {
        kind: "result",
        success,
        message: typeof json.result === "string" ? json.result : "",
        costUsd: typeof json.total_cost_usd === "number" ? json.total_cost_usd : undefined,
      };
    }

    if (json.type === "system" && json.subtype === "permission_denied") {
      return {
        kind: "error",
        message: typeof json.message === "string" ? json.message : "Permissão negada pelo claude CLI.",
      };
    }

    return undefined;
  }
}
