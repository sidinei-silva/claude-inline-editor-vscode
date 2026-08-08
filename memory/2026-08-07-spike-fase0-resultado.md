# 2026-08-07 — Spike Fase 0: resultado (parcial)

## O que aconteceu

Sidinei rodou `claude -p "<edição trivial>" --permission-mode default
--output-format stream-json --include-partial-messages --verbose` duas
vezes, num terminal integrado do VS Code não-aninhado (fora de qualquer
sessão Claude Code em andamento). As duas vezes, a tool `Edit` foi negada
automaticamente pelo callback de permissão — nenhum diff nativo abriu no VS
Code, apesar de haver lock file ativo (`~/.claude/ide/*.lock`) apontando
pro workspace correto.

(Um teste anterior, rodado por mim de dentro da minha própria sessão via
Bash tool — portanto aninhado —, teve o mesmo resultado, mas foi descartado
como evidência limpa por causa do confounder de nesting. O teste do
Sidinei, não-aninhado, é o dado real.)

## Decisão

Rota C rebaixada: não é mais "provável vencedora" — `-p` (headless)
aparentemente nunca roteia pro `openDiff`, só nega quando não há aprovação
disponível. Hipótese revisada: `openDiff` pode ser exclusivo de sessões
interativas (REPL sem `-p`, ou o chat da própria extensão via Agent SDK
in-process). Ver `specs/ide-bridge.md` para o detalhe completo e
`context/why-inline-ui-approach.md` para a pergunta em aberto que decide o
próximo passo.

Custo real incorrido nos testes até aqui: ~US$0,33 (dois testes do Sidinei)
+ ~US$0,17 (um teste aninhado meu, descartado) — motivo para não continuar
testando variações às cegas sem antes esclarecer a pergunta em aberto.
