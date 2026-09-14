/**
 * Guarda-corpo de orçamento, herdado da landing e ajustado ao app.
 *
 * A landing tem uma página e teto de 120 KB de JavaScript. O app tem quatro
 * documentos que dividem o mesmo React, o mesmo Lenis e o mesmo anime.js, e
 * carrega o service worker por cima. O teto sobe para 180 KB, e o número é
 * argumento, não conveniência: acima disso a stack passa a custar sessão em 4G,
 * e a conversa vira sobre o que sai.
 *
 * O TETO VALE POR DOCUMENTO, e não pela soma dos quatro.
 *
 * A primeira versão somava todo `.js` do `dist`. Com dois protocolos deu 160,4
 * KB e passou; com o terceiro deu 194,0 KB e reprovou um app que ninguém baixa:
 * o leitor abre UM protocolo, e leva o compartilhado mais o dele. A soma dos
 * quatro não é o peso de sessão de ninguém, e reprovar por ela é reprovar pelo
 * número errado - ela cresce a cada protocolo mesmo que o custo por leitor não
 * mude, que é exatamente o caso aqui.
 *
 * Então mede-se cada documento pelo seu próprio grafo: o Vite já declara em
 * cada HTML os `assets/*.js` que ele carrega, e o pior documento é o que
 * responde pelo teto. O teto continua 180 KB, e agora ele significa o que diz.
 *
 * O orçamento de fonte não muda: são as mesmas duas famílias da landing.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TETO_JS = 180 * 1024;
const TETO_CSS = 40 * 1024;
const TETO_FONTES = 130 * 1024;

async function somar(pasta, extensoes, comprimir) {
  let total = 0;
  const itens = await readdir(pasta, { withFileTypes: true }).catch(() => []);
  for (const item of itens) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) {
      total += await somar(caminho, extensoes, comprimir);
    } else if (extensoes.includes(extname(item.name))) {
      total += comprimir
        ? gzipSync(await readFile(caminho)).length
        : (await stat(caminho)).size;
    }
  }
  return total;
}

/** O peso de JS de um documento: os `assets/*.js` que o próprio HTML declara. */
async function pesoDoDocumento(html) {
  const marcacao = await readFile(join(raiz, "dist", html), "utf8");
  const arquivos = new Set(marcacao.match(/assets\/[^"']+?\.js/g) ?? []);
  let total = 0;
  for (const a of arquivos) total += gzipSync(await readFile(join(raiz, "dist", a))).length;
  return total;
}

const documentos = (await readdir(join(raiz, "dist"))).filter((f) => f.endsWith(".html")).sort();
const pesos = [];
for (const html of documentos) pesos.push([html, await pesoDoDocumento(html)]);
const js = Math.max(...pesos.map(([, n]) => n));
const css = await somar(join(raiz, "dist"), [".css"], true);
const fontes = await somar(join(raiz, "public", "fonts"), [".woff2"], false);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const veredito = (valor, teto) => (valor <= teto ? "ok  " : "ESTOUROU");

console.log("");
for (const [html, n] of pesos) console.log(`  ${html.padEnd(18)} ${kb(n).padStart(9)}  de JS`);
console.log("");
console.log(`  JS por documento ${kb(js).padStart(9)}  / ${kb(TETO_JS)}  ${veredito(js, TETO_JS)}  (pior: ${pesos.find(([, n]) => n === js)[0]})`);
console.log(`  CSS comprimido   ${kb(css).padStart(9)}  / ${kb(TETO_CSS)}  ${veredito(css, TETO_CSS)}`);
console.log(`  fontes           ${kb(fontes).padStart(9)}  / ${kb(TETO_FONTES)}  ${veredito(fontes, TETO_FONTES)}`);
console.log("");

if (js > TETO_JS || css > TETO_CSS || fontes > TETO_FONTES) process.exit(1);
