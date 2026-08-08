# Ponto de entrada do fluxo

Implementado em `src/extension.ts` (`invoke()`), registrado como comando
`claudeInlineEditor.invoke`.

## Keybinding

`Ctrl+I` (`Cmd+I` no mac), `when: editorTextFocus` — livre no ambiente do
autor (sem GitHub Copilot instalado). Se colidir com outra extensão,
ajustar em `package.json` → `contributes.keybindings`, não há dependência
de nenhum código específico nesse valor.

## UI

Não é um popup flutuante ancorado no cursor (ver
`context/why-chat-participant-vs-webview.md` — API estável não expõe isso).
É uma sequência de `showInputBox`/`showQuickPick` (paleta de comando,
aparece no topo do editor):

1. `ui/promptInput.ts` — `showInputBox` captura o pedido em linguagem
   natural. Cancelar aqui (Esc) aborta o fluxo inteiro.
2. `ui/modelEffortPicker.ts` — dois `showQuickPick` sequenciais (modelo,
   depois esforço). Esc em qualquer um dos dois só mantém o valor padrão
   configurado (`claudeInlineEditor.model`/`.effort`) — não cancela o
   fluxo, diferente do passo 1.
3. `vscode.window.withProgress` (notificação, cancelável) mostra o texto
   parcial que o `claude` vai streamando enquanto roda.

## Captura de contexto

No momento da invocação: `vscode.window.activeTextEditor` precisa existir
e estar dentro de um `workspaceFolder` aberto (senão mostra aviso e
aborta). Se há seleção não-vazia, o texto selecionado e o range de linhas
vão no prompt; senão, só a linha do cursor. O documento é salvo antes de
rodar o `claude` se estiver "dirty" (`document.isDirty`), pra evitar
divergência entre o que o CLI lê do disco e o que está no editor.
