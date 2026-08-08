# Context — índice

Racional por trás das decisões de design. Abrir o arquivo específico só
quando a dúvida for "por que foi feito assim" — não precisa ler tudo de cara.

- [Por que não Chat Participant API sozinha](context/why-chat-participant-vs-webview.md) — por que essa API estável não cobre o popup inline, e por que a extensão oficial usa Webview
- [Por que a abordagem de UI/diff é a Rota C, com B como fallback](context/why-inline-ui-approach.md) — decisão central: as 3 rotas avaliadas, evidência de cada uma, critério de escolha
- [Por que CLI local em vez de SDK/API direto](context/why-cli-bridge-not-sdk.md) — autenticação via assinatura (OAuth), não API key
- [Por que documentação no padrão lite-SDD](context/why-lite-sdd-docs.md) — por que replicar o padrão do `claude-switch` aqui
