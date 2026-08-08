# Por que documentação no padrão lite-SDD

Este repositório replica a estrutura de documentação usada em
[`sidinei-silva/claude-switch`](https://github.com/sidinei-silva/claude-switch)
(CLI Go do mesmo usuário): `AGENTS.md` como entrypoint com ponteiros "onde
buscar o quê", `CONTEXT.md`/`context/why-*.md` para o racional de cada
decisão, `MEMORY.md`/`memory/*.md` como log datado de decisões, e
`specs/*.md` como especificação técnica por área funcional.

## Motivo

Este projeto começou com uma investigação de arquitetura não-trivial — três
hipóteses de "como mostrar o diff" testadas e descartadas/confirmadas com
evidência real (ver [[why-inline-ui-approach]]) — que não é óbvia a partir
do código sozinho. Sem esse registro, qualquer sessão futura (própria ou de
outro agente) reproduziria a mesma investigação do zero, incluindo o risco
de cair na mesma confusão entre APIs parecidas (ver nota lateral em
[[why-chat-participant-vs-webview]]).

O padrão foi escolhido por já ter se provado útil no `claude-switch`: o
`AGENTS.md` funciona como mapa de carregamento sob demanda (não carrega tudo
de cara), e separar "o quê" (specs) de "por quê" (context) de "quando/o que
mudou" (memory) evita que documentação vire um único arquivo monolítico
difícil de manter.
