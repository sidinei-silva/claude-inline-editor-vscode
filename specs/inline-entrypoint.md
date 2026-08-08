# Ponto de entrada do fluxo (popup inline)

**Placeholder — depende do resultado do spike de arquitetura.** Ver
`context/why-inline-ui-approach.md`.

A preencher após o spike:

- Keybinding exata (candidato: `Ctrl+I`, livre no ambiente do usuário — sem
  GitHub Copilot instalado).
- Se o "popup" é um `QuickPick` (Rota B/C — aparece no topo do editor) ou,
  na Rota A, um inline chat de verdade ancorado no cursor.
- Como o contexto é capturado no momento da invocação: arquivo ativo,
  seleção (`vscode.window.activeTextEditor.selection`) vs. posição do
  cursor quando não há seleção.
