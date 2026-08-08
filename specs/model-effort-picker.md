# Escolha de model e effort

Implementado: settings do VS Code como default +  override pontual via
`QuickPick` a cada invocação (a opção "com override" mencionada como
possibilidade neste spec antes do código existir).

## Settings (`src/config.ts`, `package.json` → `contributes.configuration`)

- `claudeInlineEditor.model` — default `"sonnet"`, enum
  `sonnet|opus|haiku|fable` (aliases confirmados via `claude -p --help`).
- `claudeInlineEditor.effort` — default `"medium"`, enum
  `low|medium|high|xhigh|max` (confirmado via `claude -p --help`).
- `claudeInlineEditor.permissionMode` — default `"acceptEdits"`. **Nunca
  `bypassPermissions`** — ver `context/why-inline-ui-approach.md`.
- `claudeInlineEditor.allowedTools` — default `"Edit,Read"`.

## Override por invocação (`src/ui/modelEffortPicker.ts`)

Dois `showQuickPick` sequenciais depois do prompt de instrução. Esc em
qualquer um dos dois mantém o padrão configurado (não cancela o fluxo) —
decisão de UX: minimizar fricção pra quem só quer aceitar o padrão via
Enter/Esc rápido, mas ainda permitir override pontual sem precisar abrir
Settings.
