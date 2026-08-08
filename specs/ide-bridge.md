# IDE bridge (Rota C) — protocolo reverse-engineered

Este documento descreve o mecanismo que a extensão oficial `anthropic.claude-code`
usa para expor diff nativo ao `claude` CLI, e que `ideDetection.ts`/`cliBridge.ts`
precisam replicar/reaproveitar para a Rota C.

**Aviso permanente**: este protocolo **não é documentado oficialmente** pela
Anthropic. Tudo marcado como "observado" veio de leitura direta do bundle
minificado da extensão instalada (`anthropic.claude-code-2.1.224-linux-x64/extension.js`)
e do estado real do filesystem/env — não de documentação pública. Pode mudar
sem aviso entre versões do CLI ou da extensão. Todo código que depender
disto precisa de fallback gracioso para a Rota B.

## Restrição de conexão — observado (importante, invalida leituras anteriores)

O comando `/ide` do CLI revela: **a conexão IDE é exclusiva por máquina —
só uma janela do VS Code por vez pode estar conectada**, não uma conexão
independente por lock file/workspace. Saída real observada:

> "Only one Claude Code instance can be connected to VS Code at a time.
> Found 1 other running IDE(s). However, their workspace/project
> directories do not match the current cwd."

Isso significa que a simples presença de um lock file válido pro workspace
atual **não garante** que a conexão WS esteja de fato ativa pra ele — outra
janela do VS Code aberta na mesma máquina pode estar segurando a única
conexão disponível. Qualquer teste de Fase 0 precisa confirmar via `/ide`
(selecionando explicitamente a entrada que bate com o workspace atual)
antes de rodar `claude -p`, ou o resultado não tem valor de sinal.

## Descoberta da IDE ativa — observado

Lock file em `~/.claude/ide/<port>.lock`, um por janela/workspace do VS Code
aberta, conteúdo JSON:

```json
{
  "pid": 1074,
  "workspaceFolders": ["/caminho/do/workspace"],
  "ideName": "Visual Studio Code",
  "transport": "ws",
  "runningInWindows": false,
  "authToken": "uuid-do-token"
}
```

O nome do arquivo é a porta do WebSocket. `ideDetection.ts` deve:
1. Listar `~/.claude/ide/*.lock`.
2. Fazer parse de cada um; descartar os que não têm `workspaceFolders`
   compatível com o workspace atual do VS Code.
3. Validar que `pid` ainda está vivo (ex. `process.kill(pid, 0)` — lança se
   não existe) — locks podem sobreviver a um fechamento não-limpo do VS
   Code.

## Propagação ao CLI — observado

Quando `claude` roda dentro do terminal integrado do VS Code
(`TERM_PROGRAM=vscode`), a env var `CLAUDE_CODE_SSE_PORT=<port>` é definida
automaticamente, batendo com o nome do lock file correspondente.

Achado o schema de configuração interno (via zod) para o MCP server que faz
essa ponte:

```
{ type: "ws-ide", url, ideName, authToken, ideRunningInWindows, timeout, alwaysLoad, role }
{ type: "sse-ide", url, ideName, ideRunningInWindows, timeout, alwaysLoad, role }
```

Ou seja: o CLI se autoconfigura com uma entrada de `--mcp-config` do tipo
`ws-ide`, usando a porta e o `authToken` do lock file. **Hipótese a
confirmar no spike**: basta propagar `CLAUDE_CODE_SSE_PORT` no `env` do
`child_process.spawn` pra reaproveitar essa auto-configuração, sem precisar
montar `--mcp-config` manualmente. Se não bastar, o plano B é montar o JSON
de `--mcp-config` explicitamente a partir dos campos do lock file.

## Tools expostas pelo servidor IDE — observado

Strings literais encontradas no bundle (nomes de tool + handlers):

- `openDiff` — schema `{old_file_path, new_file_path, new_file_contents, ...}`.
  Descrição registrada: "Open a git diff for the file". Handler
  correspondente no lado servidor:
  `case "open_diff": return this.openDiff(originalFilePath, newFilePath, edits, supportMultiEdits, ...)`,
  retorna `{type: "open_diff_response", newEdits: ...}`. É uma call
  **síncrona que bloqueia** até o usuário decidir no editor.
- `close_tab`, `closeAllDiffTabs` — fecham a aba de diff.
- `getDiagnostics`, `getOpenEditors`, `getCurrentSelection`,
  `getLatestSelection`, `checkDocumentDirty`, `saveDocument`,
  `getWorkspaceFolders`, `openFile`, `executeCode` — introspecção/ações
  auxiliares (`getDiagnostics` e `executeCode` são, confirmadamente, também
  expostas como tools chamáveis pelo modelo em sessões interativas — as
  outras aparentam ser uso interno do CLI, não do LLM).

Nenhuma referência a `enabledApiProposals` ou chat participant no bundle —
`openDiff` é implementado inteiramente com API estável do VS Code (mecanismo
interno exato — `vscode.diff`? `TextDocumentContentProvider`? Source
Control API? — não confirmado, não é necessário confirmar pra reaproveitar
o protocolo).

## Relação com `--permission-mode` — parcialmente observado, parcialmente hipótese

Confirmado (string literal no bundle):

> "canUseTool will not be invoked: permissionMode 'bypassPermissions'
> auto-approves every tool call (except explicit deny rules) before the
> callback is consulted."

Ou seja: `bypassPermissions` pula o callback `canUseTool` inteiro — e por
extensão, pula qualquer roteamento pro `openDiff`. Os modos
`default`, `acceptEdits`, `auto`, `dontAsk`, `plan` invocam o callback.

**Hipótese ainda não confirmada em runtime**: que é dentro desse callback,
quando ele é invocado E há uma IDE conectada, que a call de edição é
roteada pro `openDiff` via WebSocket em vez de escrever direto no disco ou
perguntar via TTY. Isso precisa ser testado empiricamente (Fase 0 do spike,
ver `AGENTS.md`/plano de execução) rodando:

```bash
claude -p "faça uma edição trivial e segura num arquivo de teste descartável" \
  --permission-mode default --output-format stream-json --include-partial-messages
```

variando `--permission-mode` entre `default`, `acceptEdits`, `auto`,
`dontAsk`, com `cwd` dentro de um workspace com lock file ativo, e
observando se o diff nativo abre no VS Code.

## Resultado do spike

**Parcial — um teste rodado, resultado inconclusivo por confounder de
nesting, teste limpo ainda pendente.**

Teste rodado (2026-08-07): `claude -p "<edição trivial em spike/scratch.md>"
--permission-mode default --output-format stream-json
--include-partial-messages --verbose`, disparado a partir de uma chamada
Bash de dentro de uma sessão Claude Code já ativa (este próprio agente de
planejamento, rodando dentro do VS Code do usuário, com
`CLAUDE_CODE_SSE_PORT=64997` presente no ambiente herdado e o lock file
correspondente apontando pra este workspace).

**Resultado**: nem a tool `Edit` nem `Bash` foram executadas — ambas
apareceram em `permission_denials` no evento final (`type: "result"`), com
`result: "O Edit foi bloqueado por permissão. Você precisa aprovar a
escrita em spike/scratch.md para eu concluir a tarefa."`. Nenhum diff abriu
no VS Code. O arquivo `spike/scratch.md` permaneceu inalterado.

**Por que isso não decide a questão ainda**: o processo `claude -p` de teste
rodou **aninhado** dentro de uma sessão Claude Code já ativa (via
`CLAUDE_CODE_CHILD_SESSION=1` herdado no ambiente) — Claude Code
provavelmente nega automaticamente tool calls mutáveis em sessões filhas
por segurança (evitar escalonamento/loop de agentes aninhados),
independente de haver IDE conectada ou não. Isso é um confounder real: o
teste não isola a variável que importa (se `openDiff` dispara em uma
invocação `-p` **standalone**, não aninhada).

**Custo real incorrido**: esse teste único já consumiu uso real da
assinatura (~US$0,21 de custo equivalente reportado no evento `result`,
majoritariamente cache de contexto do Sonnet 5) — motivo pelo qual os
demais `--permission-mode` (`acceptEdits`, `auto`, `dontAsk`) não foram
testados em sequência automaticamente a partir desta mesma sessão aninhada:
o teste precisa ser refeito **fora** de uma sessão Claude Code ativa (um
terminal comum, não um Bash tool call de outro Claude) pra dar sinal
limpo, e envolve decisão ao vivo do usuário no VS Code (aceitar/rejeitar o
diff, se aparecer) — não é algo pra automatizar sem supervisão.

**Próximo passo real**: rodar, num terminal comum (fora de qualquer sessão
Claude Code ativa), com `cwd` dentro deste workspace:
```bash
claude -p "adicione uma linha ao final de spike/scratch.md dizendo 'spike <modo>: ok'" \
  --permission-mode <default|acceptEdits|auto|dontAsk> \
  --output-format stream-json --include-partial-messages --verbose
```
e observar se o VS Code abre um diff nativo esperando aprovação, repetindo
por modo. Registrar o resultado real aqui antes de prosseguir pra Fase 1.

## Resultado real — teste limpo rodado pelo usuário (2026-08-07)

Sidinei rodou o comando acima duas vezes, num terminal integrado do VS Code
diferente do usado por qualquer sessão Claude Code em andamento (não
aninhado) — `--permission-mode default`, `--output-format stream-json`.

**Resultado, as duas vezes**: a tool `Edit` foi **negada automaticamente**
(`system/permission_denied`: *"Claude requested permissions to write to
.../spike/scratch.md, but you haven't granted it yet."*) — o `canUseTool`
foi invocado (não é `bypassPermissions`), mas a decisão foi negar direto,
**sem abrir nenhum diff no VS Code**. `spike/scratch.md` permaneceu
inalterado nas duas execuções.

**Isso muda a hipótese principal.** A leitura mais provável agora, revisando
a inferência anterior: `-p` (headless) provavelmente **nunca bloqueia
esperando aprovação humana**, nem via TTY nem via IDE — faz sentido de
design (um script headless travando indefinidamente esperando clique no
editor seria ruim). O roteamento pro `openDiff` que o usuário observa no dia
a dia pode ser exclusivo de sessões **interativas** (REPL do `claude` rodado
sem `-p` no terminal, ou o chat do próprio painel/webview da extensão
oficial, que usa o Agent SDK internamente com seu próprio `canUseTool`
customizado) — não algo que uma chamada `-p` isolada herda automaticamente
só por existir um lock file no workspace.

**Isso não mata necessariamente a Rota C**, mas muda a peça que falta
confirmar: não é mais "qual `--permission-mode` disperta o `openDiff` em
`-p`" (nenhum parece disparar), e sim **se `openDiff` é alcançável a partir
de uma sessão interativa (não `-p`) disparada por um processo filho não
aninhado** — o que mudaria a arquitetura de `cliBridge.ts` de "spawn `-p` e
ler stream-json" para "spawn interativo via pty e dirigir a conversa
programaticamente", bem mais complexo e frágil. Pendente confirmar com o
usuário se ele já observou native diff vindo de um `claude` **interativo**
puro no terminal (não pelo painel da extensão) — ver pergunta em
`context/why-inline-ui-approach.md`.

**Status da decisão: Rota C rebaixada de "provável vencedora" para "incerta,
possivelmente inviável para uma arquitetura baseada em `-p`". Rota B ganha
peso como alvo mais realista pro v1.**

## Conclusão definitiva (2026-08-07)

Sequência de testes do usuário fechou a questão, com causa raiz clara:

1. `claude -p ... --permission-mode default` → negado (sem TTY, `-p` não
   tem como pedir confirmação).
2. `claude -p ... --permission-mode acceptEdits --output-format stream-json`
   → edição aplicada direto (sem diff — `stream-json` é saída pra máquina,
   não renderiza UI nenhuma).
3. `claude -p "..." --verbose` (sem `acceptEdits`, formato texto) → o
   comando imprime "Edit ficou pendente de aprovação" e **encerra o
   processo imediatamente** — não fica esperando um `y/N`, porque `-p` é
   one-shot por definição (imprime e sai).
4. `claude "..." --verbose` (**sem `-p` nenhum, sessão totalmente
   interativa**) → **o diff abriu nativamente no VS Code**, confirmado pelo
   usuário (com apoio de investigação própria, inclusive consultando outro
   assistente pra descartar as flags de formato de saída).

**Causa raiz**: `-p`/`--print` é estritamente one-shot — processa o prompt,
imprime o resultado (texto ou JSON) e encerra, **nunca entra no loop
interativo que apresenta o prompt de aprovação** (nem via TTY `y/N`, nem via
IDE `openDiff`). O roteamento pro `openDiff` só acontece dentro desse loop
interativo, que só existe quando o CLI roda sem `-p`.

**Implicação pra arquitetura**: um `cliBridge.ts` baseado em `claude -p
--output-format stream-json` (a base de todo o parsing de stream-json
documentado em `specs/cli-bridge.md`) **nunca vai conseguir acionar
`openDiff`**, não importa o `--permission-mode`. Pra reaproveitar o diff
nativo (Rota C), a extensão precisaria rodar o `claude` em modo
**totalmente interativo** (sem `-p`) via um pseudo-terminal (ex.
`node-pty`), simulando um usuário digitando o prompt e lendo a tela — sem o
`stream-json` estruturado, com parsing de saída ANSI/terminal em vez de
JSON. Isso é uma integração bem mais complexa e frágil (acoplada ao layout
visual do terminal do CLI, que pode mudar entre versões) do que o
`cliBridge.ts` baseado em `-p` já documentado.

**Decisão final**: Rota C fica documentada como caminho tecnicamente viável
mas de custo/risco bem mais alto (PTY + parsing de terminal em vez de JSON
estruturado) — não é o alvo do v1. **Rota B (100% API estável, `-p` +
stream-json + diff próprio via CodeLens/decorations) é o alvo do v1.**
Revisitar Rota C só se a Rota B se mostrar insuficiente em uso real.
