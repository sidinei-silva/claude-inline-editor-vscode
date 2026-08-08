# Contrato com o `claude` CLI

## Flags confirmadas (via `claude -p --help`, CLI 2.1.224)

- `-p, --print` — modo não-interativo, obrigatório.
- `--model <model>` — alias (`sonnet`, `opus`, `fable`, `haiku`) ou nome
  completo. Alimenta `ui/modelEffortPicker.ts`.
- `--effort <level>` — `low`, `medium`, `high`, `xhigh`, `max`. Alimenta
  `ui/modelEffortPicker.ts`.
- `--output-format <text|json|stream-json>` — usar sempre `stream-json`
  pra streaming em tempo real.
- `--include-partial-messages` — chunks parciais durante streaming (só
  funciona com `--print` + `--output-format=stream-json`).
- `--permission-mode <acceptEdits|auto|bypassPermissions|default|dontAsk|plan>`
  — decisão de qual usar depende do resultado do spike (ver
  `specs/ide-bridge.md`): na Rota C, nunca `bypassPermissions` (pula o
  `openDiff`); na Rota B, `bypassPermissions`/`acceptEdits` (a extensão
  controla a UI de aprovação sozinha, não precisa que o CLI pergunte).
- `--allowedTools` / `--disallowedTools` — escopo de ferramentas do agente.
  A definir: provavelmente permitir só `Edit`/`Write` no arquivo alvo,
  negar `Bash` por padrão (evitar que um pedido de "edição" vire execução
  de comando arbitrário sem o usuário esperar isso).
- `--add-dir <workspaceRoot>` — dar acesso ao workspace.
- **Nunca usar** `--bare` (força `ANTHROPIC_API_KEY`, ignora OAuth — ver
  `context/why-cli-bridge-not-sdk.md`).

## Em aberto — TODO a confirmar antes de implementar `cliBridge.ts`

- Como o prompt é passado: argumento posicional (`claude -p "texto"`) ou via
  stdin? Checar `claude -p --help` na íntegra — não confirmado nesta
  pesquisa inicial.
- Formato exato dos eventos do `stream-json` (schema de cada tipo de linha
  NDJSON) — necessário para `streamJsonParser.ts`. Levantar rodando o CLI
  manualmente e inspecionando a saída real durante o spike.
- Como correlacionar o evento de "usuário resolveu o diff" (Rota C) com a
  tool call correspondente no stream — ver Fase 2 do spike em
  `context/why-inline-ui-approach.md`.
