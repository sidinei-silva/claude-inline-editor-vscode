# Escolha de model e effort

**Placeholder — baixa prioridade, praticamente independente da rota
escolhida.** Preencher quando `src/ui/modelEffortPicker.ts` e
`src/config.ts` forem implementados.

A definir:

- Settings do VS Code como default (`claudeInlineEditor.model`,
  `claudeInlineEditor.effort`) + override pontual via `QuickPick` a cada
  invocação, ou só settings sem override por invocação (mais simples, menos
  fricção).
- Valores válidos: model = `sonnet`/`opus`/`haiku`/`fable` (aliases
  confirmados via `claude -p --help`); effort =
  `low`/`medium`/`high`/`xhigh`/`max` (confirmado via `claude -p --help`).
