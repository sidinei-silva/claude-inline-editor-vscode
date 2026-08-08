# 2026-08-07 — Decisão final: Rota B é o alvo do v1

## O que aconteceu

Depois do resultado parcial/confuso registrado em
`2026-08-07-spike-fase0-resultado.md` (negação em `-p` + `default`, sem
diff), e de uma pista falsa sobre conexão IDE exclusiva por máquina
(`/ide` revelou que só uma janela do VS Code pode estar conectada por
vez), o usuário rodou uma sequência decisiva de testes por conta própria
(com apoio de outro assistente pra descartar hipóteses de flag de saída) e
achou a causa raiz real: **`-p`/`--print` é sempre one-shot** — imprime o
resultado e encerra o processo, nunca entra no loop interativo que mostra
o prompt de aprovação (nem via TTY `y/N`, nem via `openDiff` da IDE). O
diff nativo só abre quando o `claude` roda **sem `-p` nenhum** (sessão
totalmente interativa).

## Decisão

Rota B (100% API estável: `-p` + `stream-json` estruturado no
`cliBridge.ts`, diff próprio via `CodeLensProvider`/`decorationProvider`)
é o alvo do v1. Rota C (diff nativo via `openDiff`) fica documentada como
tecnicamente viável mas exigiria trocar `cliBridge.ts` inteiro por controle
de pseudo-terminal (`node-pty`) — mais frágil, sem streaming estruturado.
Não vale o trade-off pro v1. Ver `context/why-inline-ui-approach.md` e
`specs/ide-bridge.md` (seções "Conclusão definitiva") para o detalhe
técnico completo.

## Custo total da investigação

Entre meus testes (1, descartado por nesting) e os do usuário (6 chamadas
`-p` no total ao longo da sessão), o custo real incorrido na investigação
foi de aproximadamente US$1,10 em uso da assinatura — considerado
aceitável dado que evitou meses de retrabalho numa arquitetura que não
funcionaria (Rota C via `-p`).

## Próximo passo

Implementar `diffReview/` (Rota B): `decorationProvider.ts`,
`codeLensProvider.ts`, `gitHunkAdapter.ts`, e completar `cliBridge.ts` +
`streamJsonParser.ts` já documentados em `specs/cli-bridge.md`. Ver
`AGENTS.md`/plano de execução pra ordem completa.
