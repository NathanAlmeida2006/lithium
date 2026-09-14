# public/midias

As fotos e vídeos de execução dos exercícios.

**Vazio hoje, e isso é fato apurado, não pendência esquecida:** os três PDFs dos
protocolos somam 104 imagens embutidas e nenhuma é fotografia — são fios com
gradiente. Toda imagem do material é hoje um retângulo cinza com legenda.

Quando as fotos existirem, entram aqui com o nome do movimento em kebab-case
(`agachamento-goblet.webp`) e o pipeline as liga em `scripts/conteudo.mjs`, no
campo `figura.midia` do bloco LG-28.

O service worker já está configurado para guardá-las em Cache Storage na
primeira exibição, com teto de 120 arquivos e 60 dias. Ver `vite.config.js`.
