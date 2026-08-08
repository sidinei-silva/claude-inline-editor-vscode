# Spike scratch file

Arquivo descartável para o teste da Fase 0 (validar se `openDiff` abre
nativamente no VS Code quando o `claude` CLI roda em modo `-p` com
diferentes `--permission-mode`, num workspace com IDE ativa).

spike acceptEdits: ok -- Comentario do dev não aparece diff somente editou (nenhuma instancia de claude aberta 2 janelas do vscode aberta e sidebars fechados)
spike interativo somente o comando claude e --verbose: ok -- Comentario do dev apareceu o diff no vscode porém abriu uma sessão do claude no terminal e no terminal perguntou se queria aprovar, após aprovado continuou aberta a sessão (nenhuma instancia de claude aberta antes 2 janelas do vscode aberta e sidebars fechados)
