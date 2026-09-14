# src/protocolos

O conteúdo das sessões, um diretório por protocolo. É a única parte do app que
sabe de qual protocolo se trata.

```
protocolos/
├── hipertrofia/    64 páginas mapeadas, 10 sessões (s00 a s09)
├── dieta/          63 páginas mapeadas, 10 sessões
└── sono/           61 páginas mapeadas, 10 sessões
```

**A fonte é `01-lithium/05-pós-produção/aprovados/<protocolo>/`**, e em
divergência ela vence. Cada `pagina-NNN.md` de lá diz, bloco a bloco, qual
layout global recebe o quê, o que sai, o que muda de nome e o que vira estado
no cache. Nada aqui se inventa: o que entra é a aplicação daquilo.

Os três diretórios estão vazios de propósito: o ambiente foi preparado, o
desenvolvimento não começou.
