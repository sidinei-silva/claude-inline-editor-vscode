# Fluxo de aprovação do diff

**Placeholder — depende do resultado do spike de arquitetura.** Ver
`context/why-inline-ui-approach.md` (Rotas A/B/C) e `specs/ide-bridge.md`
(protocolo da Rota C).

A preencher após o spike:

- Rota C: como o `cliBridge.ts` sabe que o `openDiff` foi resolvido (aceito
  integralmente, editado, ou rejeitado) e o que fazer em cada caso.
- Rota B: comportamento exato de `decorationProvider.ts` +
  `codeLensProvider.ts` (Accept/Reject/Accept All/Reject All por bloco) e de
  `gitHunkAdapter.ts` (delegação pra `git.stageSelectedRanges`/
  `editor.action.dirtydiff.next` em arquivos git-tracked).
- Navegação entre blocos de mudança (pedido original do usuário: "podendo
  pular para próxima mudança") — mecanismo exato depende de qual rota
  vingar.
