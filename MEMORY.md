# Memory — índice

Log de decisões e progresso do projeto. Cada linha é só o gancho; abrir o
arquivo em `memory/` apenas quando precisar do detalhe.

- [Kickoff do projeto](memory/2026-08-07-project-kickoff.md) — descoberta da Rota C (ponte com a IDE integration da extensão oficial), descarte da Rota A como alvo principal, estrutura lite-SDD definida
- [Spike Fase 0: resultado parcial](memory/2026-08-07-spike-fase0-resultado.md) — `-p` + `--permission-mode default` nega Edit em vez de abrir diff; Rota C rebaixada, pergunta em aberto sobre modo interativo
- [Decisão final: Rota B é o alvo do v1](memory/2026-08-07-decisao-final-rota-b.md) — `-p` é sempre one-shot, nunca abre `openDiff`; diff nativo só existe em modo totalmente interativo; Rota C exigiria reescrever cliBridge com PTY
