# src/layouts

Um arquivo CSS por layout global, com o nome do catálogo:
`25-tabela-de-sessao.css`, `26-anotacao-persistida.css`, e assim por diante.

**A fonte é `01-lithium/05-pós-produção/layouts-globais/`, e em divergência ela
vence.** O que mora aqui é a implementação do que está especificado lá: o CSS
sai do bloco `## Código` do arquivo correspondente, sem reinterpretação.

Cada arquivo que entrar aqui ganha uma linha de `@import` em
`../styles/app.css`, na ordem do catálogo.

Vazio de propósito: nenhum protocolo foi desenvolvido ainda.
