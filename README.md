# claude-inline-editor-vscode

Extensão VS Code para edição inline com o Claude Code, no estilo do
Ctrl+I/Copilot: selecione texto ou posicione o cursor, peça uma mudança em
linguagem natural, escolha modelo e nível de esforço, e revise o resultado
como diff antes de aceitar.

> Estado: em desenvolvimento inicial (spike de arquitetura em andamento).
> Não publicada, uso pessoal via sideload de `.vsix`.

## Por que existe

A extensão oficial "Claude Code" da Anthropic já dá diffs inline e streaming
no VS Code, mas via painel lateral — você digita o pedido num painel fixo,
não num popup ancorado onde está o cursor. Esta extensão cobre esse gap
específico, reaproveitando o mesmo `claude` CLI e (quando possível) a mesma
integração nativa de diff que a extensão oficial já usa. Ver
`context/why-inline-ui-approach.md` para os detalhes técnicos.

## Requisitos

- `claude` CLI instalado e autenticado (`claude login` ou `claude
  setup-token`) — usa a sua assinatura Pro/Max/Team, não gasta API key.
- Extensão oficial `anthropic.claude-code` instalada e ativa no mesmo
  workspace, **se** a Rota C (ver `context/why-inline-ui-approach.md`) for a
  rota efetivamente usada — a extensão detecta isso em runtime e cai para um
  modo sem essa dependência quando não disponível.
- Node 24+ e npm para build local (não publicada no Marketplace).

## Instalação (desenvolvimento)

```bash
npm install
npm run compile
```

Depois, `F5` no VS Code abre um Extension Development Host com a extensão
carregada. Para gerar um `.vsix` e instalar localmente:

```bash
npx vsce package
code --install-extension claude-inline-editor-vscode-*.vsix
```

## Uso

Ainda em definição — ver `specs/inline-entrypoint.md` (keybinding e comando
exatos dependem do resultado do spike de arquitetura).

## Mais contexto

- `AGENTS.md` — mapa do repositório para humanos e agentes
- `CONTEXT.md` / `context/` — porquês das decisões
- `MEMORY.md` / `memory/` — histórico de decisões, datado
- `specs/` — especificações técnicas
