# Por que CLI local em vez de SDK/API direto

A extensão spawna o binário `claude` local (`child_process.spawn`) em modo
headless (`-p`), em vez de usar o Claude Agent SDK ou a API da Anthropic
diretamente.

## Motivo

O objetivo explícito é usar a **assinatura** do usuário (Pro/Max/Team via
OAuth do `claude login` / `claude setup-token`), não uma API key paga por
token. O CLI tem dois caminhos de auth:

- `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` — API paga por token.
- `CLAUDE_CODE_OAUTH_TOKEN` / login via `claude login` — usa a assinatura.

O modo headless (`claude -p "prompt" --output-format json`) já usa por
padrão o login da assinatura — não pede API key, a menos que se force
`--bare` (que exige `ANTHROPIC_API_KEY` explicitamente e **nunca** lê
credenciais OAuth/keychain).

É exatamente assim que a extensão oficial funciona: ela empacota o próprio
CLI e usa a mesma sessão autenticada da conta do usuário, sem key separada.

## Implicações pra esta extensão

- `cliBridge.ts` nunca deve passar `--bare` nem definir `ANTHROPIC_API_KEY`.
- Autenticação não é gerenciada nem armazenada pela extensão — ela assume
  que o usuário já rodou `claude login` localmente. Isso é uma dependência
  externa (o usuário precisa ter o CLI instalado e autenticado antes de usar
  a extensão), documentada no `README.md`.
- Risco a monitorar: uso via CLI/assinatura ainda conta contra os limites de
  uso do plano do usuário — a extensão não deve rodar chamadas pesadas em
  background sem pedido explícito do usuário.
- Flags relevantes confirmadas via `claude -p --help` (CLI 2.1.224):
  `--model`, `--effort`, `--output-format {text,json,stream-json}`,
  `--include-partial-messages`, `--permission-mode
  {acceptEdits,auto,bypassPermissions,default,dontAsk,plan}`,
  `--allowedTools`/`--disallowedTools`, `--add-dir`. Detalhe de uso de cada
  uma em `specs/cli-bridge.md`.
