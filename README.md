# Claude Inline Editor

Extensão VS Code para edição inline com o [Claude Code](https://code.claude.com/docs/en/overview), no estilo do `Ctrl+I`/Copilot: selecione um trecho (ou só posicione o cursor), peça uma mudança em linguagem natural, escolha modelo e nível de esforço, e revise o resultado como diff — aceitando tudo, rejeitando tudo, ou bloco a bloco.

> **Estado**: funcional, em uso pessoal. Não publicada no Marketplace — instale via sideload do `.vsix` ou rodando em modo desenvolvimento (`F5`).

## Por que existe

A extensão oficial "Claude Code" da Anthropic já mostra diffs inline no VS Code, mas via **painel lateral** — você digita o pedido num painel fixo, não num popup ancorado onde está o cursor. Esta extensão cobre esse gap específico: um atalho de teclado, um pedido em linguagem natural, e o diff aparece direto no editor, sem trocar de painel.

Por baixo, ela reaproveita o próprio `claude` CLI local (autenticado com a sua assinatura, sem API key) rodando em modo `-p`/headless — o porquê da arquitetura, incluindo um desvio de investigação interessante (por que não dá pra reaproveitar o diff nativo da extensão oficial), está documentado em [`context/why-inline-ui-approach.md`](context/why-inline-ui-approach.md).

## Requisitos

- [`claude` CLI](https://code.claude.com/docs/en/overview) instalado e autenticado (`claude login` ou `claude setup-token`) — usa a sua assinatura Pro/Max/Team, **não** gasta API key.
- Node 24+ e npm para build local (não publicada no Marketplace, não há `npm install` global).
- O arquivo que você quer editar precisa estar dentro de uma pasta de workspace aberta no VS Code (não um arquivo solto).

## Instalação

### Rodando em desenvolvimento

```bash
npm install
npm run compile
```

Depois, `F5` no VS Code abre um Extension Development Host com a extensão carregada (o build roda automaticamente antes, via `.vscode/tasks.json`).

### Sideload local

```bash
npm install
npx vsce package
code --install-extension claude-inline-editor-vscode-*.vsix
```

## Uso

**Atalho**: `Ctrl+I` (`Cmd+I` no Mac), com o cursor dentro de um editor de texto.

1. Selecione um trecho de código (opcional) ou só posicione o cursor.
2. `Ctrl+I` → digite o pedido em linguagem natural na caixa que aparece no topo do editor.
3. Escolha o modelo (`sonnet`/`opus`/`haiku`/`fable`) e o nível de esforço (`low`/`medium`/`high`/`xhigh`/`max`) — `Esc` em qualquer um dos dois mantém o padrão configurado.
4. Uma notificação de progresso mostra o Claude trabalhando.
5. Ao terminar, revise o diff:
   - **Arquivo versionado em git**: abre o diff nativo do VS Code — use o painel de Source Control (stage = aceitar, discard = rejeitar, por hunk ou tudo).
   - **Arquivo fora do git**: aparece uma notificação com botões `Accept All`/`Reject All`, além de CodeLens `Accept`/`Reject` em cada bloco alterado.

## Configuração

Todas as opções ficam em `claudeInlineEditor.*` nas Settings do VS Code:

| Setting | Padrão | Descrição |
|---|---|---|
| `model` | `sonnet` | Modelo passado como `--model` ao `claude` CLI. |
| `effort` | `medium` | Nível de esforço (`--effort`). |
| `permissionMode` | `acceptEdits` | Permission mode do CLI. **Nunca** `bypassPermissions` (ver [`context/why-inline-ui-approach.md`](context/why-inline-ui-approach.md)). |
| `allowedTools` | `Edit,Read` | Tools liberadas pro agente durante a edição. |
| `maxInlineFileLines` | `500` | Acima disso, o arquivo inteiro deixa de ser embutido no prompt. |
| `contextWindowLines` | `150` | Linhas antes/depois do cursor/seleção enviadas quando o arquivo excede `maxInlineFileLines`. |

## Limitações conhecidas

- Não é um popup literalmente ancorado no pixel do cursor (API estável do VS Code não expõe isso) — é a UI padrão de input/QuickPick do editor, que aparece no topo da tela.
- Só uma revisão pendente por arquivo de cada vez.
- Sem navegação dedicada entre blocos de mudança (usa o CodeLens de cada hunk como âncora).

## Mais contexto

- [`AGENTS.md`](AGENTS.md) — mapa do repositório (onde buscar o quê, estrutura, convenções)
- [`CONTEXT.md`](CONTEXT.md) / `context/` — porquês das decisões de arquitetura
- [`MEMORY.md`](MEMORY.md) / `memory/` — histórico de decisões, datado
- `specs/` — especificações técnicas de cada parte (ponte com o CLI, fluxo de diff, etc.)
