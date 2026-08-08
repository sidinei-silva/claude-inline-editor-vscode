# Fluxo de aprovação do diff

Implementado (Rota B — ver `context/why-inline-ui-approach.md` para o
porquê da Rota C ter sido descartada como alvo do v1).

## Arquivo git-tracked

`src/diffReview/gitHunkAdapter.ts` checa `git ls-files --error-unmatch` e,
se o arquivo está versionado, chama o comando nativo `git.openChange` (da
extensão git embutida do VS Code) depois que o `claude` já aplicou a
edição no disco (`--permission-mode acceptEdits`). A partir daí é 100%
mecanismo nativo do VS Code: stage de hunk = aceitar, discard = rejeitar,
navegação entre hunks já vem de graça no painel de Source Control. A
extensão não desenha nada disso — `extension.ts` só mostra uma mensagem
informativa e não inicia uma revisão própria (`reviewManager.startReview`
não é chamado nesse caminho).

## Arquivo não versionado (fallback)

`src/diffReview/decorationProvider.ts` (`DiffReviewManager`) guarda um
snapshot do conteúdo original do arquivo antes de rodar o `claude`, e
depois computa hunks (via `diffLines` do pacote `diff`, em
`src/diffReview/diffUtils.ts`) comparando esse snapshot com o conteúdo
atual do documento — não com o disco, que já foi sobrescrito pelo CLI.

- `src/diffReview/codeLensProvider.ts` mostra "Accept All"/"Reject All" no
  topo do arquivo e "Accept"/"Reject" por hunk, na primeira linha de cada
  bloco alterado.
- Accept (hunk ou all) não muda o conteúdo — o texto já está aplicado no
  documento — só remove o hunk/arquivo da lista de pendências e limpa a
  decoration correspondente.
- Reject (hunk) substitui a faixa de linhas do hunk pelo texto original
  correspondente (via `WorkspaceEdit`), usando `originalTextForHunk` pra
  recortar o snapshot preservando quebras de linha.
- Reject All substitui o documento inteiro pelo snapshot original.
- Decoration: `TextEditorDecorationType` com
  `diffEditor.insertedTextBackground` (tema do editor), linha inteira, nas
  faixas de cada hunk pendente.

## Navegação entre blocos de mudança

Não implementada como comando dedicado no v1 — o CodeLens de cada hunk já
serve como "âncora" pra pular entre eles via `Ctrl+Shift+.`/navegação
padrão de CodeLens do VS Code, ou clicando direto. Se isso não for
suficiente na prática, considerar um comando
`claudeInlineEditor.nextHunk`/`previousHunk` que usa
`editor.revealRange` sobre a lista de `getHunks()`.

## Limitação conhecida

Só um arquivo por vez tem revisão pendente por design
(`invoke()` recusa uma nova chamada se `reviewManager.hasReview(uri)` já é
verdadeiro pro arquivo ativo) — evita hunks de duas revisões sobrepostas no
mesmo documento antes de existir suporte a merge de revisões.
