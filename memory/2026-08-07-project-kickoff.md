# 2026-08-07 — Kickoff do projeto

## O que aconteceu

Sessão de planejamento inicial do projeto, em `plan mode`, com pesquisa
técnica profunda antes de qualquer código. Três hipóteses de arquitetura
para "como mostrar o popup e o diff" foram investigadas em sequência, cada
uma com evidência de código real (não suposição):

1. **Chat Participant API + `stream.textEdit()` nativo do inline chat** —
   pesquisa inicial (via web search) sugeriu que isso era API estável.
   **Descartada** ao inspecionar o `vscode.d.ts` real: `textEdit()` e
   `ChatRequest.location` só existem em arquivos de *proposed/private API*,
   não estável. Confirmado também que a própria extensão oficial da
   Anthropic não usa essa API (é um `WebviewPanel`).

2. **Reaproveitar a integração IDE que já existe entre `claude` CLI e VS
   Code** — hipótese levantada pelo próprio usuário (Sidinei), que notou que
   rodar `claude` no terminal integrado do VS Code já abre diffs nativos.
   **Confirmada com evidência de código real**: inspecionado o bundle da
   extensão oficial instalada (`anthropic.claude-code-2.1.224`) e
   encontrados, literalmente no código minificado: o formato do lock file em
   `~/.claude/ide/*.lock`, a env var `CLAUDE_CODE_SSE_PORT`, o schema da tool
   `openDiff` (abre diff nativo, bloqueia até decisão do usuário), e os tipos
   de config MCP internos `ws-ide`/`sse-ide` usados para a ponte. Ver
   detalhes completos em `context/why-inline-ui-approach.md` e
   `specs/ide-bridge.md`.

3. **Chat Participant + proposed API do VS Code (F5/Insiders)** — mantida
   como último recurso, caso nem a rota 2 (agora chamada "Rota C") nem uma
   rota 100%-API-estável ("Rota B", CodeLens/decorations) atendam a UX
   desejada.

## Decisão

Prioridade de investigação: Rota C > Rota B > Rota A. A Rota C, se
confirmada em runtime (spike Fase 0, ainda não executado nesta sessão —
requer escrita real de arquivo, fora do escopo de `plan mode`), elimina a
necessidade de a extensão nova implementar qualquer UI de diff — ela delega
inteiramente pro mecanismo nativo que a extensão oficial já expõe.

## Próximos passos

Ver ordem de execução completa no plano aprovado
(`~/.claude/plans/contexto-estava-estava-cryptic-stroustrup.md` — cópia
local do racional em `context/`/`specs/` deste repo). Resumo: scaffolding de
docs (feito nesta sessão) → spike Fase 0 (terminal) → scaffolding de código
mínimo → spike Fase 1 (extensão mínima) → implementação da rota decidida.
