# Por que a abordagem de UI/diff é a Rota C, com B como fallback

Decisão central do projeto: como mostrar o popup de prompt e o diff de
resultado. Três rotas avaliadas, nesta ordem de prioridade.

## Rota C — ponte com a IDE integration existente (prioridade 1)

A extensão nova não desenha diff nenhum: detecta que a extensão oficial
`anthropic.claude-code` já está rodando um servidor IDE local para o
workspace atual, spawna `claude -p` reaproveitando essa conexão, e deixa o
próprio CLI rotear a edição pra `openDiff` — o mesmo diff nativo com
accept/reject que já existe hoje no fluxo do terminal integrado.

**Evidência observada diretamente** (não é suposição — inspecionado no
ambiente real, lock files ativos apontando pra este mesmo projeto):

- `~/.claude/ide/<port>.lock` contém
  `{"pid", "workspaceFolders", "ideName", "transport":"ws", "runningInWindows", "authToken"}`,
  um por janela/workspace do VS Code aberta.
- Env var `CLAUDE_CODE_SSE_PORT` é propagada ao `claude` CLI quando ele roda
  dentro do terminal integrado do VS Code (`TERM_PROGRAM=vscode`).
- O bundle da extensão oficial instalada
  (`anthropic.claude-code-2.1.224-linux-x64/extension.js`) expõe um servidor
  MCP local via WebSocket registrando as tools: `openDiff` (schema
  `old_file_path, new_file_path, new_file_contents, ...`; handler:
  `case"open_diff":return this.openDiff(originalFilePath,newFilePath,edits,supportMultiEdits,...)`,
  retorna `{type:"open_diff_response", newEdits: ...}` — call síncrona que
  bloqueia até o usuário decidir), além de `close_tab`, `closeAllDiffTabs`,
  `getDiagnostics`, `getOpenEditors`, `getCurrentSelection`,
  `getLatestSelection`, `checkDocumentDirty`, `saveDocument`,
  `getWorkspaceFolders`, `openFile`, `executeCode`.
- Achado o schema de configuração interno do MCP server que faz essa ponte:
  `{type:"ws-ide", url, ideName, authToken, ideRunningInWindows, timeout, alwaysLoad, role}`
  e a variante `sse-ide` — ou seja, quando o CLI detecta o ambiente (via
  `CLAUDE_CODE_SSE_PORT`/lock file), ele se autoconfigura com uma entrada de
  `--mcp-config` construída internamente, não é mágica indocumentável a esse
  nível.
- Nenhuma menção a `enabledApiProposals` ou chat participant no bundle —
  `openDiff` é implementado inteiramente com API estável do VS Code.
- Confirmado também: a string
  `"canUseTool will not be invoked: permissionMode 'bypassPermissions' auto-approves every tool call (except explicit deny rules) before the callback is consulted."`
  — ou seja, `bypassPermissions` pula o callback de permissão inteiro, e por
  extensão pula o roteamento pro `openDiff`. Os demais modos
  (`default`, `acceptEdits`, `auto`, `dontAsk`, `plan`) invocam o callback,
  e é razoável inferir (mas **não confirmado em runtime**) que é aí que o
  `openDiff` é disparado quando há IDE conectada.

**O que ainda é hipótese, a confirmar no spike (ver `specs/ide-bridge.md`
para o protocolo detalhado e `AGENTS.md`/plano de execução para as fases):**
se isso funciona em modo `-p` (headless, sem TTY) e, se sim, em quais
`--permission-mode` especificamente.

**Trade-offs assumidos:**
- Depende da extensão oficial `anthropic.claude-code` estar instalada e
  ativa no mesmo workspace — aceitável pro uso pessoal do autor (já a usa),
  mas é uma dependência real, diferente de uma extensão standalone.
- Protocolo **não documentado oficialmente** pela Anthropic — é engenharia
  reversa de um bundle minificado. Pode mudar sem aviso entre versões do
  CLI/extensão. Qualquer código que dependa disso precisa de fallback
  gracioso pra Rota B (timeout, formato de lock desconhecido, IDE não
  conectada).

## Rota B — 100% API estável, sem dependências externas (fallback garantido)

Prompt via `QuickPick` (aparece no topo do editor, não colado no pixel do
cursor — concessão de UX assumida conscientemente, já que a API pública não
expõe um `IContentWidget` livre como o Monaco interno tem). Diff via
`TextEditorDecorationType` + `CodeLensProvider` (Accept/Reject/Accept
All/Reject All por bloco) para arquivos genéricos, e reaproveitando
`git.stageSelectedRanges`/`editor.action.dirtydiff.next` (já nativos do VS
Code, sem UI customizada) quando o arquivo está versionado em git.

Não depende de nenhuma outra extensão nem de proposed API — funciona hoje no
VS Code Stable, sem Insiders. É o alvo garantido caso a Rota C falhe ou o
usuário não queira a dependência da extensão oficial.

## Rota A — Chat Participant + proposed API (último recurso)

Ver [[why-chat-participant-vs-webview]] para o porquê da API estável não
servir. A Rota A usaria as APIs proposed (`chatParticipantAdditions`,
`chatParticipantPrivate`), viável apenas via Extension Development Host (F5)
com garantia, ou VS Code Insiders + `--enable-proposed-api` sem garantia
para proposals "Private" de terceiros. Só entra em jogo se nem C nem B
derem o resultado de UX desejado (popup literalmente ancorado no pixel do
cursor).

## Critério de decisão

- Se a Fase 0 do spike (`specs/ide-bridge.md`) falhar em todos os
  `--permission-mode` testados (nenhum abre `openDiff` via `-p`), Rota C é
  descartada e o projeto segue só com a Rota B.
- Se funcionar só em modos específicos (ex. só `default`, não
  `acceptEdits`), essa restrição vira comportamento documentado do produto
  — a extensão força esse modo quando IDE está conectada.
- A escolha entre C e B não é estática no código: `ideDetection.ts` decide
  em runtime se há IDE ativa compatível, e cai pra B quando não há.

## Atualização — resultado real da Fase 0 (2026-08-07)

Teste limpo (não-aninhado) rodado pelo usuário: `claude -p ...
--permission-mode default` **nega** a tool `Edit` automaticamente, não abre
diff nenhum. Detalhe completo em `specs/ide-bridge.md`. Hipótese revisada:
`-p` (headless) provavelmente nunca bloqueia esperando aprovação humana —
nem via TTY, nem via IDE —, e o `openDiff` que o usuário observa no dia a
dia pode ser exclusivo de sessões interativas (REPL sem `-p`, ou o chat da
própria extensão via Agent SDK in-process com seu próprio `canUseTool`).

**Status: Rota C rebaixada de "provável vencedora" para "incerta". Pergunta
em aberto pro usuário, que decide o próximo passo**: ele já observou
`openDiff` nativo vindo de uma sessão `claude` **interativa** (REPL puro no
terminal, sem `-p`), ou só observou isso através do painel/webview da
própria extensão oficial? Se for só pelo painel da extensão, a Rota C como
"CLI standalone reaproveitando IDE bridge" está provavelmente descartada
(o mecanismo é interno da extensão, não generalizável a um `claude -p`
externo), e o projeto deveria migrar o foco pra Rota B como alvo principal
do v1, sem gastar mais orçamento testando variações de `--permission-mode`
em `-p` (evidência já aponta pra "nenhuma funciona").

## Atualização 2 — observação decisiva do usuário (2026-08-07, sem custo)

O próprio Edit que gerou a atualização acima (feito por este agente, numa
sessão Claude Code genuinamente interativa, rodando no terminal integrado
do VS Code do usuário) **também não abriu diff nativo nenhum** — o usuário
viu só o diff em texto no terminal, igual ao teste `-p`. Nesse momento, o
painel/sidebar da extensão oficial **não estava aberto**.

Isso é uma evidência forte, e de graça (não custou uma chamada `-p` nova):
o `openDiff` provavelmente só é acionado quando o **painel/webview da
extensão oficial está aberto e ativo** — ou seja, é a própria UI do
webview que renderiza o diff (possivelmente dentro do webview, não como
aba nativa separada do editor), não um mecanismo "ambient" que qualquer
sessão `claude` (interativa ou não) aciona automaticamente só por existir
lock file. Isso enfraquece ainda mais a Rota C como "CLI externo
reaproveita IDE bridge sem depender do painel estar aberto e em foco" — se
a dependência é literalmente "o painel precisa estar aberto", a vantagem
de "zero UI pra construir" desaparece, porque a extensão nova não pode
garantir/forçar que o painel oficial esteja aberto.

O usuário vai testar deixando o painel/sidebar oficial aberto (sem iniciar
conversa nova) pra ver se isso muda o comportamento — resultado a
registrar aqui. **Enquanto isso, decisão prática: seguir com a Rota B como
alvo principal do scaffolding de código (é o que o plano aprovado já previa
como "sempre vale a pena, em paralelo"), sem gastar mais chamadas `-p`
pagas testando variações da Rota C até haver um sinal mais decisivo.**

## Conclusão definitiva (2026-08-07)

O usuário fechou a questão com uma sequência de testes bem desenhada
(detalhe completo em `specs/ide-bridge.md`, seção "Conclusão definitiva"):
o diff nativo **só abre quando o `claude` roda sem `-p` (sessão totalmente
interativa)** — `-p`/`--print` é sempre one-shot (imprime e sai), então
nunca entra no loop interativo que apresenta o prompt de aprovação, nem via
TTY nem via IDE. Isso é independente de `--permission-mode` e
`--output-format`.

Isso não é mais "confounder de conexão" nem "só funciona com o painel
aberto" — é uma característica de design do próprio `-p`. E também não é
mais incerto: **é fato observado, reproduzido de forma limpa**.

## Decisão final de arquitetura

**Rota B (100% API estável) é o alvo do v1.** Um `cliBridge.ts` baseado em
`-p` + `stream-json` (a abordagem estruturada, testável, e já documentada
em `specs/cli-bridge.md`) é incompatível com `openDiff` por construção —
não há combinação de flags que resolva isso. Reaproveitar a Rota C
exigiria trocar toda a base de `cliBridge.ts` por controle de pseudo-
terminal (`node-pty`) simulando um usuário digitando no REPL interativo do
`claude`, parseando saída ANSI de terminal em vez de JSON estruturado —
uma integração bem mais frágil (acoplada ao layout visual do CLI, que pode
mudar entre versões) e sem o parsing estruturado que o `-p` oferece de
graça.

Rota C fica documentada como caminho tecnicamente viável (confirmado que
funciona), mas **não é o alvo do v1** por causa desse trade-off de
complexidade/fragilidade. Revisitar só se a Rota B se mostrar insuficiente
em uso real — e, se revisitada, tratar como um redesenho completo de
`cliBridge.ts`, não um ajuste incremental.

Rota A (Chat Participant + proposed API) permanece descartada como alvo do
v1 pelos motivos já documentados em [[why-chat-participant-vs-webview]].

## Atualização 3 — confounder real encontrado: conexão IDE é exclusiva por máquina

Rodando `/ide` no terminal deste workspace, o usuário viu:

> "Only one Claude Code instance can be connected to VS Code at a time.
> Found 1 other running IDE(s). However, their workspace/project
> directories do not match the current cwd. ● Visual Studio Code:
> .../gc-stack/projects/service-csgo-frontend"

Ou seja: a conexão IDE (WS) do `claude` CLI é **exclusiva — só uma janela
do VS Code por vez, globalmente na máquina**, não uma conexão paralela por
lock file/workspace como eu tinha assumido. O usuário tinha outra janela do
VS Code aberta (workspace `service-csgo-frontend`, de trabalho) que
provavelmente já segurava a única conexão disponível — apesar do lock file
deste workspace existir e `CLAUDE_CODE_SSE_PORT` apontar pra ele.

**Isso invalida a leitura da "Atualização 2"** (a hipótese de que `openDiff`
só funciona com o painel oficial aberto) — não dá pra concluir isso a
partir de testes onde a conexão IDE pra este workspace especificamente
pode nunca ter se estabelecido de verdade. Os três resultados negativos
anteriores (meu teste aninhado, os dois testes `-p` do usuário, e a edição
interativa minha que só apareceu como diff de terminal) podem ter essa
mesma causa raiz, não uma limitação do mecanismo em si.

O usuário rodou `/ide` e selecionou explicitamente "Visual Studio Code"
(a entrada que bate com o cwd deste workspace) — a conexão agora deveria
estar ativa e correta para este projeto. **Próximo passo real: repetir UM
teste limpo (`-p ... --permission-mode default`) agora, com a conexão IDE
deste workspace confirmada como ativa via `/ide`, antes de tirar qualquer
conclusão definitiva sobre a Rota C.** Enquanto isso não roda, o status
desta decisão continua "incerto", não "descartado".
