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
aborta). O documento é salvo antes de rodar o `claude` se estiver "dirty"
(`document.isDirty`), pra evitar divergência entre o que o CLI lê do disco
e o que está no editor.

**O conteúdo do arquivo vai embutido no prompt** (numerado, no mesmo
formato `N\tconteúdo` que a tool `Read` do próprio Claude usa —
`numberedLines()`/`buildFileContextBlock()` em `extension.ts`), em vez de
só o caminho do arquivo. Se há seleção não-vazia, o texto selecionado e o
range de linhas também vão no prompt; senão, só a linha do cursor (número
+ conteúdo exato daquela linha).

Motivo (achado em teste real, não antecipado no design original): com
`--allowedTools "Edit,Read"`, o modelo *poderia* chamar `Read` sozinho
antes de editar, mas com `haiku`/effort baixo isso nem sempre acontecia —
ele editava "no escuro", só com o número da linha do cursor, sem saber o
que de fato tinha ali (ex.: completar texto na linha errada). Embutir o
conteúdo no prompt remove essa dependência do modelo decidir usar a tool
por conta própria.

## Janela de contexto em arquivos grandes

Mandar o arquivo inteiro sempre não escala — arquivo grande = prompt
grande = mais tokens/latência em todo pedido, não importa o tamanho do
pedido. `buildFileContextBlock()` decide entre dois modos, comparando
`document.lineCount` com `claudeInlineEditor.maxInlineFileLines` (default
`500`):

- **Abaixo do limite**: arquivo inteiro numerado (comportamento descrito
  acima).
- **Acima do limite**: janela de `claudeInlineEditor.contextWindowLines`
  linhas (default `150`) antes e depois do cursor/seleção, clampada nas
  bordas do arquivo — perto da linha 1 não tem "antes" pra incluir, então
  a janela puxa mais do lado que existe; mesma lógica perto do fim. O
  prompt deixa explícito quantas linhas foram omitidas e que o modelo pode
  usar `Read` se precisar ver outra parte do arquivo.

Isso foi desenhado depois de pesquisar como o Copilot Inline Chat lida com
contexto (sem seleção: arquivo atual até um limite, priorizando o que está
perto do cursor ao truncar — não há fonte primária documentando o
algoritmo exato). Diferença proposital daqui: como o backend é um agente
de verdade (`claude` CLI com a tool `Read` liberada), a janela é só uma
otimização de custo/latência — se o modelo achar que precisa de mais
contexto, ele pode ler o resto sozinho, o que o Copilot (chat de tiro
único, sem agente por trás) não tem como fazer.
