# Por que não Chat Participant API sozinha

Hipótese inicial de arquitetura: registrar um `vscode.chat.createChatParticipant`
e deixar o VS Code renderizar tudo nativamente — inclusive dentro do popup
de inline chat (Ctrl+I) — via `ChatResponseStream.textEdit()` e
`ChatRequest.location`.

Investigação (baixado o `vscode.d.ts` estável do branch `main` de
`microsoft/vscode`, grep direto):

- `ChatRequest` **não tem** propriedade `location` na API estável.
- `ChatResponseStream` **não tem** método `textEdit(...)` na API estável —
  só `markdown`, `anchor`, `button`, `filetree`, `progress`, `reference`,
  `push`.
- As duas peças existem, mas em arquivos de *proposed API*:
  - `stream.textEdit()` está em `vscode.proposed.chatParticipantAdditions.d.ts`.
  - `ChatRequest.location` / `enum ChatLocation` está em
    `vscode.proposed.chatParticipantPrivate.d.ts` — o sufixo "Private" é
    convenção do VS Code para proposals reservadas, sem garantia de que
    terceiros consigam usá-las mesmo com a flag `--enable-proposed-api`.
- Documentação oficial confirma: extensões usando proposed API **não podem
  ser publicadas no Marketplace** e só rodam no Insiders (ou Stable com flag
  + sideload).

Prova de campo decisiva: inspecionei a extensão oficial
`anthropic.claude-code@2.1.224` instalada localmente
(`~/.vscode-server/extensions/anthropic.claude-code-2.1.224-linux-x64/package.json`).
Ela **não declara `contributes.chatParticipants`**, **não usa
`enabledApiProposals`** — toda a UI é um `WebviewPanel` (`claudeVSCodePanel`)
mais keybindings. O próprio time da Anthropic, com acesso a canais internos
da Microsoft, optou por não depender dessa API para o diff nativo.

**Decisão**: Chat Participant API estável fica reservada para a Chat view
lateral / Quick Chat (onde funciona hoje, sem restrição) — não é a base do
popup inline. Ver [[why-inline-ui-approach]] para a rota realmente escolhida
para o popup e o diff.

## Nota lateral — não confundir com Inline Edit Provider

A issue pública `anthropics/claude-code#66521` ("Register as VS Code inline
chat edit tool provider") fala de uma API diferente:
`vscode.languages.registerInlineEditProvider` — API de "Next Edit
Suggestions" (sugestão fantasma do próximo edit, tipo autocomplete
preditivo), sem relação com Chat Participant nem com o popup de prompt em
linguagem natural. Fácil de confundir os dois temas; registrar aqui pra não
cair na mesma confusão de novo.
