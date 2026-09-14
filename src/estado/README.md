# src/estado

O estado do app inteiro, e ele cabe em dois arquivos.

- `anotacao.js` · LG-26. O único mecanismo de persistência: uma chave por
  campo, `lithium:<protocolo>:<sessao>:<campo>`, em `localStorage`. Testado com
  recarga real em 07/09/2026.
- *(a chegar)* `visitadas.js` · LG-30. Marca a sessão como visitada, com o
  mesmo mecanismo e a chave `lithium:<protocolo>:<sessao>:visitada`.

Sem gerenciador de estado, sem contexto global, sem backend. Se um dia o estado
precisar sair do aparelho, a conversa é sobre sincronização, e ela começa aqui.
