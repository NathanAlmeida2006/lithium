import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";
/**
 * Mesma stack da `fluor-landing`: Vite, React, anime.js e Lenis. Build
 * estatico, sem CDN em tempo de execucao, sem backend.
 *
 * TRES DIFERENCAS, e cada uma tem motivo.
 *
 * 1. QUATRO DOCUMENTOS, UM APP. `index.html` e os enderecos curtos de cada
 *    protocolo montam a mesma entrada (`src/entradas/principal.jsx`); o
 *    `data-protocolo` do body so escolhe a jornada que abre. A navegacao
 *    interna e por hash (`src/app/rotas.js`): funciona offline e dispensa
 *    roteador.
 *
 * 2. PWA. `vite-plugin-pwa` gera o manifesto e o service worker, e o precache
 *    cobre HTML, JS, CSS, fonte e icone: o protocolo abre inteiro sem rede, que
 *    e a condicao real de uma academia no subsolo.
 *
 * 3. SEGURANCA POR CABECALHO, nunca por meta tag. A hospedagem e Cloudflare
 *    Pages, que injeta cabecalho nativamente a partir de `public/_headers`.
 *    `frame-ancestors` so funciona assim - por meta ela e ignorada, com aviso
 *    no console - e manter a politica em dois lugares so cria a chance de eles
 *    divergirem. Nada de CSP no HTML.
 */
// `frame-ancestors` NÃO entra aqui: o navegador ignora a diretiva quando ela
// chega por meta tag, e avisa no console. Ela e as outras que só existem como
// cabeçalho (X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
// HSTS) vivem em `public/_headers`, que a hospedagem aplica.

const pagina = (nome) => resolve(import.meta.dirname, `${nome}.html`);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icones/apple-touch-icon.png"],
      manifest: {
        name: "Lithium · Protocolos",
        short_name: "Lithium",
        description:
          "Os tres protocolos do Projeto Lithium: hipertrofia, dieta basica e cuidado com o sono.",
        lang: "pt-BR",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        // Os dois na cor do Modo Sigilo: a barra do sistema encosta no fundo
        // do app em vez de piscar branco na abertura.
        theme_color: "#09090b",
        background_color: "#09090b",
        categories: ["health", "fitness", "education"],
        icons: [
          { src: "icones/icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "icones/icone-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icones/icone-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // PRECACHE: o protocolo inteiro, incluindo o JSON de conteudo, que
        // entra no bundle. Sem rede ele continua abrindo, que e a condicao de
        // uso real. A fonte entra de proposito - 79,2 KB que evitam texto
        // trocando de forma no meio da sessao.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        // O precache tem teto de arquivo; o JSON de conteudo passa de 2 MB nao
        // comprimido quando os tres protocolos entrarem.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

        // CACHE PESADO DE MIDIA, em Cache Storage, fora do precache.
        //
        // Foto e video de exercicio nao podem entrar no precache: eles somam
        // dezenas de MB e travariam a PRIMEIRA abertura do app, justamente
        // quem instalou pelo anuncio. Entao a estrategia e `CacheFirst` com
        // populacao na primeira exibicao: quem viu uma vez tem offline para
        // sempre, e quem nunca viu nao pagou por ela.
        //
        // Teto de 120 arquivos e 60 dias, para o armazenamento do aparelho nao
        // crescer sem limite - um celular de 32 GB e o caso comum da persona.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/midias/"),
            handler: "CacheFirst",
            options: {
              cacheName: "lithium-midias",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,   // video em <video> pede faixa, nao o arquivo inteiro
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: "es2020",
    assetsInlineLimit: 2048,
    // `scripts/check-size.mjs` ja mede o gzip contra o teto, e a conta do Vite
    // refaz a mesma compressao em cada arquivo so para imprimir.
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        principal: pagina("index"),
        hipertrofia: pagina("hipertrofia"),
        dieta: pagina("dieta"),
        sono: pagina("sono"),
      },
    },
  },
});
