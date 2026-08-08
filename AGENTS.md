# claude-inline-editor-vscode

Extensão VS Code que replica a experiência de edição inline estilo Ctrl+I
(Copilot) usando o `claude` CLI como motor, autenticado via assinatura
(OAuth do `claude login`, não API key). Usuário seleciona texto/posiciona o
cursor, abre um popup, escolhe modelo e effort, digita o pedido, e revisa o
resultado como diff (aceitar tudo, rejeitar tudo, ou bloco a bloco).

A extensão oficial "Claude Code" da Anthropic não cobre esse fluxo — ela é
um painel lateral (sidebar), não um popup ancorado no cursor. Ver
`MEMORY.md` para o que já foi decidido e `CONTEXT.md` para o porquê.

## Onde buscar o quê (carregar sob demanda, não de cara)

- Visão geral de arquitetura (as 3 rotas e como elas se conectam) → `specs/architecture.md`
- O protocolo de integração com a extensão oficial (lock files, WS, tool `openDiff`) → `specs/ide-bridge.md`
- Contrato com o `claude` CLI (flags, parsing de stream-json, cancelamento) → `specs/cli-bridge.md`
- Onde/como expor escolha de model e effort → `specs/model-effort-picker.md`
- Mecanismo de revisão do diff nas duas rotas → `specs/diff-approval-flow.md`
- Como o usuário aciona o fluxo (keybinding, comando, popup) → `specs/inline-entrypoint.md`
- Por que as decisões foram tomadas → `CONTEXT.md`
- Histórico de decisões/progresso → `MEMORY.md`

## Estrutura

- `src/extension.ts` — `activate()`/`deactivate()`, registra comandos e keybindings
- `src/ideDetection.ts` — lê `~/.claude/ide/*.lock`, casa `workspaceFolders`, valida pid vivo, decide Rota C ou B
- `src/cliBridge.ts` — spawn de `claude -p`, monta args (model/effort/permission-mode/allowedTools), roteia pra Rota C ou B conforme `ideDetection`
- `src/streamJsonParser.ts` — parser incremental do `stream-json` de saída do CLI
- `src/diffReview/` — Rota B: `decorationProvider.ts`, `codeLensProvider.ts`, `gitHunkAdapter.ts`
- `src/ui/` — `modelEffortPicker.ts`, `promptInput.ts`
- `src/config.ts` — leitura de settings do VS Code (defaults de model/effort/permission-mode)
- `specs/` — specs técnicas detalhadas
- `context/` — racional/trade-offs das decisões de arquitetura
- `memory/` — log de decisões, datado

## Convenções

- Nunca usar `--bare` nem `--permission-mode bypassPermissions` no `cliBridge.ts`
  quando a Rota C estiver ativa — `bypassPermissions` pula o callback de
  permissão inteiro (confirmado via string no bundle da extensão oficial),
  o que pula o `openDiff` também. Ver `context/why-inline-ui-approach.md`.
- O protocolo da Rota C (`specs/ide-bridge.md`) é reverse-engineered, **não
  documentado oficialmente** pela Anthropic — qualquer código que dependa
  dele precisa de fallback gracioso pra Rota B (timeout, versão de lock
  desconhecida, IDE não conectada).
- Autenticação nunca é gerenciada pela extensão — ela sempre invoca o
  binário `claude` local, que resolve auth sozinho via `claude login`/OAuth.
  Ver `context/why-cli-bridge-not-sdk.md`.
- Perfil de build: npm puro (sem pnpm/yarn), node 24 via mise, esbuild pra
  bundle, `@vscode/vsce` só pra empacotar `.vsix` de sideload local — esta
  extensão não vai pro Marketplace.
