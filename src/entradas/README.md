# src/entradas

Um arquivo por documento HTML da raiz. É só a montagem do React: nenhuma lógica
mora aqui.

| Entrada | Documento | O que monta |
| --- | --- | --- |
| `principal.jsx` | `index.html` | a escolha entre os três protocolos |
| `hipertrofia.jsx` | `hipertrofia.html` | `<Protocolo />` |
| `dieta.jsx` | `dieta.html` | `<Protocolo />` |
| `sono.jsx` | `sono.html` | `<Protocolo />` |

Cada documento declara `data-protocolo` no `<body>`, e é dali que saem o acento
da página e a raiz da chave de anotação. Trocar de protocolo é trocar esse
atributo, não o código.

Documento novo pede entrada nova **e** uma linha em `build.rollupOptions.input`
de `vite.config.js`.
