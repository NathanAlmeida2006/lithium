# app-lithium

O app dos três protocolos do Projeto Lithium: hipertrofia, dieta básica e
cuidado com o sono. **Um app, três protocolos**, não três apps.

A especificação vive na base de documentação, não aqui:

| O que | Onde |
| --- | --- |
| o briefing | `~/Documentos/projetos/01-lithium/05-pós-produção/ESTRUTURAÇÃO DE APP PWA.md` |
| os 31 layouts, com código e travas | `.../05-pós-produção/layouts-globais/` |
| a descrição das 188 páginas | `.../05-pós-produção/jsons/` |
| o que cada página vira, bloco a bloco | `.../05-pós-produção/aprovados/` |

Em divergência, **o documento vence**. Este repositório é a implementação dele.

## Por que fora da base

Mesmo motivo da `fluor-landing`: a base trava a profundidade em 3 níveis dentro
de cada raiz, e `01-lithium/05-pós-produção/app/src/componentes/` já seria 5. A
ponte entre os dois é o `ds-bundle`, que chega por `npm run sync:ds`.

## Começar

```bash
npm install
npm run sync:ds     # tokens e fontes do ds-bundle, mais o favicon
npm run icones      # os ícones do PWA
npm run dev
```

Se a base estiver em outro caminho:

```bash
DS_BUNDLE=/caminho/para/.design-sync/ds-bundle npm run sync:ds
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run sync:ds` | copia tokens e fontes do `ds-bundle` e gera o favicon |
| `npm run icones` | desenha os ícones do PWA (192, 512, maskable e apple-touch) |
| `npm run conteudo` | gera `src/conteudo/<protocolo>.json` a partir dos JSONs e dos aprovados da base |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | sync, conteúdo, build dos quatro documentos, service worker e conferência de orçamento |
| `npm run preview` | serve o `dist` como em produção |
| `npm run size` | só a conferência de orçamento |
| `npm run verificar` | a bateria de testes: responsividade, persistência, offline e hospedagem |

## A stack, e é a mesma da landing

Vite, React, anime.js e Lenis. Build estático, sem CDN em tempo de execução,
sem backend. **Três diferenças**, e cada uma tem motivo.

**Quatro documentos, um app, e nenhum roteador.** `index.html` e os endereços
curtos de cada protocolo montam a mesma entrada; o `data-protocolo` do body só
escolhe a jornada que abre. A navegação interna é por hash (`#/jornada/dieta`),
lida em `src/app/rotas.js`: funciona offline, sem servidor que conheça os
caminhos, e sem biblioteca.

**PWA.** `vite-plugin-pwa` gera o manifesto e o service worker. O precache cobre
HTML, JavaScript, CSS, fonte e ícone: **o protocolo abre inteiro sem rede**, que
é a condição real de uma academia no subsolo. Hoje são 26 arquivos, 312 KB.

**Conteúdo gerado, não escrito.** `scripts/conteudo.mjs` lê os JSONs de
`05-pós-produção/jsons/` (o que há em cada página) e os arquivos de
`05-pós-produção/aprovados/` (qual layout global recebe cada bloco), e escreve
um JSON por protocolo agrupado por SESSÃO, não por página. Nada de conteúdo é
digitado aqui: a base continua sendo a fonte, e refazer é um comando.

**Estado por dispositivo, em IndexedDB.** Um documento só, alterado por
transação, com as abas abertas se avisando por BroadcastChannel
(`src/dados/repositorio.js`). As chaves `lithium:*` da versão anterior, em
`localStorage`, são lidas uma vez e guardadas como legado. Não sincroniza, não
sobe para lugar nenhum, e some se o leitor limpar os dados do navegador: por
isso o Kit exporta e restaura uma cópia local. Prometer mais que isso exige
backend, que não é deste escopo.

## Segurança

**Segurança por cabeçalho, nunca por meta tag.** A CSP e o resto vivem em
`public/_headers`: `frame-ancestors` é ignorada quando chega por meta, e
`nosniff`, `Referrer-Policy`, `Permissions-Policy` e HSTS só existem como
cabeçalho. Manter a política em dois lugares só criaria a chance de eles
divergirem. O formato do arquivo é o da Netlify e do Cloudflare Pages, que o
leem direto. Em outra hospedagem o conteúdo é o mesmo e o lugar muda:

- **Nginx** → `add_header` no bloco `server`
- **Apache** → `Header set` no `.htaccess`
- **Vercel** → a chave `headers` do `vercel.json`
- **S3 com CloudFront** → uma response headers policy

**Nenhum script embutido.** A landing decide a cortina de introdução num
`<script>` inline do HTML; aqui não há nenhum, e é o que permite `script-src
'self'` sem `unsafe-inline` e sem hash para manter.

## Orçamento

`scripts/check-size.mjs` falha o build quando estoura. Hoje:

| | agora | teto |
| --- | --- | --- |
| JavaScript comprimido | 73,2 KB | 180 KB |
| CSS comprimido | 2,3 KB | 40 KB |
| fontes | 79,2 KB | 130 KB |

O teto de JavaScript é 180 e não 120 como na landing: são quatro documentos
dividindo o mesmo React, o mesmo Lenis e o mesmo anime.js, com o service worker
por cima. O número é argumento, não conveniência: acima dele a stack passa a
custar sessão em 4G, e a conversa vira sobre o que sai.

## A organização

```
app-lithium/
├── index.html            a escolha entre os três protocolos
├── hipertrofia.html      um documento por protocolo; `data-protocolo` no body
├── dieta.html
├── sono.html
├── public/
│   ├── _headers          os cabeçalhos que meta tag não entrega
│   ├── fonts/            ← sync:ds, não versionado
│   ├── icones/           ← npm run icones, não versionado
│   └── favicon.svg       ← sync:ds, não versionado
├── scripts/
│   ├── sync-ds.mjs       traz tokens e fontes da base
│   ├── icones.py         desenha os ícones do PWA, sem dependência de sistema
│   ├── check-size.mjs    o guarda-corpo de orçamento
│   └── verificar.mjs     confere o ambiente nos quatro documentos
└── src/
    ├── entradas/         principal.jsx: a única montagem do React
    ├── app/              a composição: rotas, casca, cortina, estado offline
    ├── telas/            uma por rota (Hoje, Registros, Jornada, Sessao, Kit) e os diálogos
    ├── componentes/      peças de interface reusadas por mais de uma tela
    ├── motion/           tokens de tempo, Lenis e o vocabulário de revelação
    ├── dados/            o repositório em IndexedDB e a cópia local
    ├── dominio/          regras puras: progresso, indicadores, validação
    ├── conteudo/         catálogo, JSON gerado dos protocolos e revisões
    └── styles/           tokens ← sync:ds, fontes, interface e movimento
```

**A regra de dependência** é o que mantém a organização de pé: cada camada só
importa as de baixo.

```
entradas → app → telas → componentes, motion → dados → dominio, conteudo
```

`dominio/` não conhece React, IndexedDB nem tela, e é por isso que a bateria
de testes o importa direto. `componentes/` não sabe de rota nem de
armazenamento: recebe por prop e desenha. Regra nova de negócio entra em
`dominio/`; tela nova entra em `telas/` e ganha uma linha em `app/Aplicativo.jsx`.

## O que não entra aqui

Roteador, framework de CSS utilitário, biblioteca de componentes, gerenciador de
estado, backend, segunda biblioteca de animação ou de rolagem, e CDN em tempo de
execução. São as mesmas exclusões da landing, pelas mesmas razões, e o orçamento
acima é o que as mantém honestas.

## O que o app apaga do e-book

O briefing pede um app, não um livro na tela, e isto é o que o pipeline retira
ou reescreve, com a contagem da última geração:

| O que | Quantos | Vira |
| --- | --- | --- |
| cabeçalho e rodapé correntes | 119 elementos | o rótulo da sessão |
| número de página | todos | nada: o app não pagina |
| "capítulo" | 100% | "sessão", **com concordância**: "o próximo capítulo" vira "a próxima sessão" |
| "e-book", "livro", "esta página" | 100% | "protocolo", "esta sessão" |
| numeração de seção (`1.1 ·`, `§4.2 ·`) | todas | o nome da parte, sem o número |
| instrução de produção esquecida no PDF | todas | nada |
| placeholder de imagem | 35 de 37 | nada; ficam as 2 fotos de exercício |
| sumário numerado | o índice inteiro | o mapa de sessões, em fast travel |

98,2% dos caracteres do protocolo atravessam. O 1,8% que fica para trás é
exatamente a lista acima.

## Estado atual · fase 4 fechada, os três protocolos

**Os três renderizados inteiros**, na mesma estrutura, sem fork e sem caso especial:

| protocolo | sessões | blocos | caracteres | citações | campos |
| --- | --- | --- | --- | --- | --- |
| hipertrofia | 10 | 326 | 80.394 | 24 | 17 |
| dieta básica | 10 | 343 | 67.892 | 14 | 3 |
| cuidado com o sono | 10 | 344 | 61.647 | 17 | 5 |

Os campos de anotação de cada protocolo são exatamente os que o aprovado declara
em "O que vira estado no cache", com a chave que ele declara: 17, 3 e 5.

`npm run verificar` roda **195 checagens e todas passam**, nos três protocolos: a
bateria lê o catálogo de `src/conteudo/catalogo.json` e cobra de cada protocolo o
que o próprio catálogo diz que ele tem.

**O teto de JavaScript vale por documento**, e não pela soma dos quatro. O leitor
abre um documento e leva o que ele declara; a soma não é o peso de sessão de
ninguém.

## A bateria de testes

`npm run verificar` serve o `dist` com os cabeçalhos de `public/_headers` e faz quatro perguntas:

1. **Responsividade.** Cinco aparelhos, de 320px a 1440px, na raiz e em cada
   protocolo com conteúdo:
   sem rolagem horizontal, nada estourando a janela, corpo nunca abaixo de 16px,
   alvo de toque nunca abaixo de 40px e nenhum erro de console. A exceção
   declarada é o link inline dentro de frase (a nota `[11]` no meio do
   parágrafo), que a WCAG 2.5.5 dispensa. Em controle embrulhado por `label`,
   o alvo medido é o rótulo: é ele que recebe o toque, e é o que o LG-26
   especifica - 48px no rótulo, 20px na caixa desenhada.
2. **Persistência.** Escreve numa anotação, marca uma caixa, **recarrega**, e
   confere que os dois voltaram com o carimbo da hora real. Confere também que a
   chave é `lithium:<protocolo>:<sessao>:<campo>` e que um protocolo não vaza
   para o outro.
3. **Offline.** Espera o service worker assumir, **corta a rede de verdade**
   (`setOffline`) e recarrega: as sessões, o texto, a fonte, as tabelas, as
   citações e os campos de anotação precisam vir todos do cache, e a anotação
   precisa continuar legível. As contagens saem do JSON de cada protocolo, não
   de número escrito à mão.
4. **Hospedagem.** `frame-ancestors` por cabeçalho, `nosniff`, HSTS, nenhuma CSP
   em meta tag, `start_url` na raiz, ícone maskable e a rota curta de cada
   protocolo.

## Node

Fixado em **Node 20 LTS** por Volta (campo `volta` no `package.json`) e por
`.nvmrc`, e é o que destrava duas coisas: o build não precisa mais da flag
`--experimental-global-webcrypto` (o worker do terser recebe `globalThis.crypto`
sozinho no 20), e o `playwright-core` pôde subir para a versão atual.
