# Arquitetura

## Visão geral

```
entrada do usuário (comando/keybinding)
  -> ui/promptInput.ts (captura pedido + contexto: arquivo, seleção/cursor)
  -> ui/modelEffortPicker.ts (model + effort, com default via settings)
  -> ideDetection.ts (há uma IDE ativa compatível pro workspace atual?)
       |-- sim -> cliBridge.ts usa Rota C (permission-mode compatível com openDiff,
       |          propaga conexão IDE existente)
       '-- não -> cliBridge.ts usa Rota B (permission-mode bypassPermissions/acceptEdits,
                  diff renderizado por diffReview/)
  -> cliBridge.ts spawna `claude -p ...`, parseia stdout via streamJsonParser.ts
  -> Rota C: diff nativo já foi resolvido pelo usuário quando o processo `claude` retorna
     Rota B: diffReview/ aplica decorations/CodeLens, espera decisão do usuário na UI própria
```

A escolha entre Rota C e Rota B não é uma flag estática — é decidida em
runtime por `ideDetection.ts` a cada invocação, com base em se existe um
lock file válido (`~/.claude/ide/*.lock`) cujo `workspaceFolders` bate com o
workspace atual e cujo `pid` ainda está vivo.

## Módulos

- **`extension.ts`** — ponto de entrada. Registra o comando principal (ex.
  `claudeInlineEditor.invoke`) e a keybinding correspondente (ver
  `specs/inline-entrypoint.md`). Não contém lógica de negócio.
- **`ideDetection.ts`** — única fonte de verdade sobre "a Rota C está
  disponível agora?". Ver `specs/ide-bridge.md` para o protocolo que ele
  precisa implementar.
- **`cliBridge.ts`** — monta os argumentos do `claude -p` e faz o spawn.
  Contrato completo em `specs/cli-bridge.md`.
- **`streamJsonParser.ts`** — transforma o NDJSON de `--output-format
  stream-json --include-partial-messages` em eventos internos tipados
  (texto parcial, tool use, resultado final, erro).
- **`diffReview/`** — só usado na Rota B. `decorationProvider.ts` marca
  linhas alteradas, `codeLensProvider.ts` expõe Accept/Reject por bloco,
  `gitHunkAdapter.ts` reaproveita `git.stageSelectedRanges` quando o arquivo
  é git-tracked. Ver `specs/diff-approval-flow.md`.
- **`ui/promptInput.ts`** — captura o pedido em linguagem natural e o
  contexto (arquivo ativo, seleção ou posição do cursor).
- **`ui/modelEffortPicker.ts`** — `QuickPick` de model
  (`sonnet`/`opus`/`haiku`/`fable`) e effort
  (`low`/`medium`/`high`/`xhigh`/`max`), com defaults vindos de
  `config.ts`.
- **`config.ts`** — leitura de `vscode.workspace.getConfiguration()` para
  defaults de model/effort/permission-mode.

## Cancelamento e erro

- Cancelamento: o handler ouve o cancelamento da UI (ex. usuário fecha o
  QuickPick ou aciona um comando de cancelar) e mata o processo `claude`
  (`child.kill()`). Na Rota B, edições parciais já aplicadas via decorations
  precisam ser revertíveis.
- Erro: stderr do CLI + código de saída não-zero viram uma mensagem de erro
  amigável na UI, distinguindo erro de auth (usuário não rodou `claude
  login`) de erro de execução comum.
