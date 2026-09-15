/**
 * Os desafios da jornada, tirados do próprio texto do módulo: nada é inventado.
 * A resposta certa é sempre um termo, um número, uma ordem, uma frase ou um par
 * que o leitor acabou de ler; as alternativas erradas são termos e números de
 * outros módulos da mesma sessão. Puro: não conhece React.
 */
import { formatoDoModulo, lerTabela, partesDoTexto, textoLimpo } from "./experiencias.js";

// Rótulos de estrutura não são termos.
const NAO_E_TERMO = /^(nota|atenção|resposta|objeção|mito|exemplo|caixa|hoje|virada|fecho|destaque|ressalva|checklist|números crus|legenda)\b|[()]/i;
const ITEM = /^\s*(?:\d+\.|[-·])\s/;
const NUMERO = /`?(\d+(?:[.,]\d+)?)`?\s*(%|kcal|horas?|minutos?|semanas?|dias?|repetições|séries|vezes|anos|g\b)/i;
// Palavra de ligação não fecha bloco: "No fim de cada" pede a próxima palavra.
const LIGACAO = /^(a|o|as|os|e|ou|de|da|do|das|dos|em|no|na|nos|nas|um|uma|que|para|pra|com|por|se|sem|ao|à|cada|seu|sua|é|mais|não)$/i;

const limparTermo = (bruto) => textoLimpo(bruto).replace(/[:.,;!?]$/, "");
const termoValido = (t) => t.length >= 3 && t.length <= 32 && t.split(" ").length <= 4 && !NAO_E_TERMO.test(t) && /\p{L}/u.test(t);
const unidade = (u) => u.toLowerCase().replace(/s$/, "");
const contem = (a, b) => a.toLowerCase().includes(b.toLowerCase());

/** Os termos em negrito de um texto, na ordem, sem repetição. */
export function termosDoTexto(texto = "") {
  const termos = new Map();
  for (const [, bruto] of texto.matchAll(/\*\*([^*]+)\*\*/g)) {
    // Negrito que termina em dois-pontos ou ponto é rótulo de bloco ("Evidência:"), não termo.
    const termo = limparTermo(bruto);
    if (!/[:.]\s*$/.test(bruto) && termoValido(termo)) termos.set(termo.toLowerCase(), termo);
  }
  return [...termos.values()];
}

// Palavras longas demais para serem ligação, curtas demais para serem jargão solto.
const COMUM = /^(porque|quando|sempre|também|depois|durante|através|qualquer|primeiro|primeira|próximo|próxima|exatamente|simplesmente|realmente|enquanto|continua|ninguém|alguém|nenhuma|nenhum|protocolo)$/i;
const palavrasChave = (texto) => [...new Set((texto.match(/[\p{L}-]{7,}/gu) || []).filter((p) => !COMUM.test(p)))];

/**
 * O que some da frase: o termo em negrito quando o autor marcou um, senão a
 * palavra mais longa. A resposta certa é sempre a palavra literal do texto; o
 * risco mora na alternativa errada, e por isso ela só sai de termos em negrito
 * (ver `desafiosDaSessao`). Só vale se aparece uma vez, para a vaga não ser óbvia.
 */
function alvoDaFrase(frase) {
  const limpa = textoLimpo(frase);
  const negritos = [...frase.matchAll(/\*\*([^*]+)\*\*/g)].filter(([, b]) => !/[:.]\s*$/.test(b)).map(([, b]) => limparTermo(b)).filter(termoValido);
  const longas = palavrasChave(limpa).sort((a, b) => b.length - a.length);
  // Vaga na primeira palavra fica sem contexto antes dela: só vale do meio da frase em diante.
  const alvo = [...negritos, ...longas].find((t) => limpa.toLowerCase().split(t.toLowerCase()).length === 2 && limpa.toLowerCase().indexOf(t.toLowerCase()) > 0);
  return alvo && { limpa, alvo, i: limpa.toLowerCase().indexOf(alvo.toLowerCase()) };
}

/** Embaralha sempre igual para o mesmo módulo: recarregar não troca as alternativas. */
export function embaralhar(lista, semente) {
  let h = [...semente].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Frases de parágrafo corrido, sem o rótulo de abertura. Lista, tabela, citação e legenda ficam de fora. */
function frases(texto) {
  return partesDoTexto(texto)
    .filter((p) => !ITEM.test(p) && !/^\s*[|>]/.test(p))
    .flatMap((p) => p.replace(/\n/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú"“*`])/))
    // Rótulo de abertura ("**Legenda:**", "**Erro comum** (✕):", "Dado:") não é frase: sai.
    .map((f) => f.replace(/^\s*\*\*[^*]{1,40}?[.:]\*\*\s*/, "").replace(/^\s*(\*\*)?[^*:.]{1,30}(\*\*)?\s*(\([^)]*\))?\s*:\s+/, ""))
    .filter((f) => !/`\)|\s·\s|\[(DIAGRAMA|LAYOUT)/.test(f));
}

/** Duas alternativas erradas parecidas com a certa: tamanho próximo, número com número. */
function distratores(candidatos, correta, frase, semente) {
  const numerica = /^\d/.test(correta);
  const validos = candidatos.filter((t) => !contem(t, correta) && !contem(correta, t) && !contem(frase, t) && /^\d/.test(t) === numerica);
  const proximos = validos.sort((a, b) => Math.abs(a.length - correta.length) - Math.abs(b.length - correta.length)).slice(0, 6);
  return embaralhar(proximos, semente).slice(0, 2);
}

function lacuna(modulo, pool) {
  for (const frase of frases(modulo.texto)) {
    const achado = alvoDaFrase(frase);
    if (!achado || achado.limpa.length < 50 || achado.limpa.length > 220) continue;
    const { limpa, alvo, i } = achado;
    const antes = limpa.slice(0, i).trim(), depois = limpa.slice(i + alvo.length).trim();
    const erradas = distratores(pool, alvo, limpa, modulo.id);
    if (erradas.length < 2) continue;
    return { tipo: "lacuna", antes, depois, correta: alvo, opcoes: embaralhar([alvo, ...erradas], modulo.id + alvo) };
  }
  return null;
}

function numerosDoTexto(texto = "") {
  return frases(texto).flatMap((frase) => {
    const m = NUMERO.exec(frase);
    return m ? [{ frase, marca: m[0], valor: m[1], unidade: unidade(m[2]) }] : [];
  });
}

function numero(modulo, numerosDaSessao) {
  for (const { frase, marca, valor, unidade: u } of numerosDoTexto(modulo.texto)) {
    const i = frase.indexOf(marca);
    const antes = textoLimpo(frase.slice(0, i));
    const depois = textoLimpo(marca.slice(marca.indexOf(valor) + valor.length).replace(/`/g, "") + frase.slice(i + marca.length));
    if ((antes + depois).length < 30 || (antes + depois).length > 220) continue;
    const outros = [...new Set(numerosDaSessao.filter((n) => n.unidade === u && n.valor !== valor).map((n) => n.valor))];
    const erradas = embaralhar(outros, modulo.id).slice(0, 2);
    if (erradas.length < 2) continue;
    return { tipo: "numero", antes, depois, correta: valor, opcoes: embaralhar([valor, ...erradas], modulo.id + valor) };
  }
  return null;
}

/** A pilha nunca começa já na ordem certa. */
function pilhaDe(itens, semente) {
  const pilha = embaralhar(itens, semente);
  return pilha.every((t, i) => t === itens[i]) ? [...pilha.slice(1), pilha[0]] : pilha;
}

function ordem(modulo) {
  for (const parte of partesDoTexto(modulo.texto)) {
    if (!/^\s*\d+\.\s/.test(parte)) continue;
    const itens = parte.trim().split(/\n(?=\s*\d+\.\s)/).map((item) => {
      const destaque = /^\s*\d+\.\s*\*\*([^*]+)\*\*/.exec(item)?.[1];
      return limparTermo(destaque || item.replace(/^\s*\d+\.\s*/, ""));
    });
    if (itens.length < 3 || itens.length > 6 || itens.some((t) => t.length < 2 || t.length > 120) || new Set(itens).size !== itens.length) continue;
    return { tipo: "ordem", itens, pilha: pilhaDe(itens, modulo.id) };
  }
  return null;
}

/** Uma frase do módulo em três ou quatro blocos: remontar é reler com atenção. */
function monte(modulo) {
  const candidatas = frases(modulo.texto).map(textoLimpo).filter((f) => f.length >= 45 && f.length <= 150 && f.split(" ").length >= 8);
  const frase = candidatas.find((f) => /[,:;]/.test(f)) || candidatas[0];
  if (!frase) return null;
  const palavras = frase.split(" "), n = palavras.length >= 14 ? 4 : 3, cortes = [0];
  for (let k = 1; k < n; k++) {
    let c = Math.round((palavras.length / n) * k);
    const virgula = [0, 1, -1, 2, -2].find((d) => /[,;:]$/.test(palavras[c + d - 1] || ""));
    if (virgula !== undefined) c += virgula;
    while (c < palavras.length - 1 && LIGACAO.test(palavras[c - 1])) c++;
    if (c > cortes.at(-1) && c < palavras.length) cortes.push(c);
  }
  const itens = cortes.map((c, i) => palavras.slice(c, cortes[i + 1]).join(" "));
  if (itens.length < 3 || new Set(itens).size !== itens.length) return null;
  return { tipo: "monte", itens, pilha: pilhaDe(itens, modulo.id) };
}

/**
 * Detector de troca: afirmações do módulo, algumas com o termo em negrito
 * trocado por outro termo da sessão. O leitor diz qual confere com o que leu.
 */
function troca(modulo, pool) {
  const rodadas = [];
  for (const frase of frases(modulo.texto)) {
    const achado = alvoDaFrase(frase);
    if (!achado || achado.limpa.length < 50 || achado.limpa.length > 200) continue;
    const { limpa: texto, alvo: termo, i } = achado;
    const [trocado] = distratores(pool, termo, texto, modulo.id + rodadas.length);
    if (!trocado) continue;
    // Alterna verdade e troca a partir da semente: nunca todas iguais.
    const confere = (rodadas.length + modulo.id.length) % 2 === 0;
    rodadas.push({ texto: confere ? texto : texto.slice(0, i) + trocado + texto.slice(i + termo.length), confere, termo, trocado });
    if (rodadas.length === 3) break;
  }
  return rodadas.length >= 2 ? { tipo: "troca", rodadas } : null;
}

function par(modulo) {
  for (const parte of partesDoTexto(modulo.texto)) {
    const tabela = lerTabela(parte);
    // Tabela de diagramação ("Esquerda | Direita") não relaciona linha com valor: não vira par.
    if (!tabela || tabela.colunas.length < 2 || tabela.itens.length < 3 || tabela.colunas.some((c) => /^(esquerda|direita|coluna)/i.test(textoLimpo(c)))) continue;
    const [a, b] = /^(marca|#|nº|número)$/i.test(textoLimpo(tabela.colunas[0])) ? [1, 2] : [0, 1];
    if (tabela.colunas.length <= b) continue;
    const pares = tabela.itens.slice(0, 4).map((linha) => [textoLimpo(linha[a]), textoLimpo(linha[b])]);
    const validos = pares.every(([n, v]) => /\p{L}|\d/u.test(n) && /\p{L}|\d/u.test(v) && n.length <= 60 && v.length <= 90);
    if (!validos || new Set(pares.map((p) => p[0])).size !== pares.length || new Set(pares.map((p) => p[1])).size !== pares.length) continue;
    return { tipo: "par", colunas: [textoLimpo(tabela.colunas[a]), textoLimpo(tabela.colunas[b])], pares, valores: pilhaDe(pares.map((p) => p[1]), modulo.id) };
  }
  return null;
}

const PREFERENCIA = {
  passos: ["ordem", "par", "troca", "lacuna", "numero", "monte"],
  explorar: ["par", "numero", "troca", "lacuna", "ordem", "monte"],
  mito: ["troca", "lacuna", "numero", "monte"],
  cenas: ["monte", "troca", "lacuna", "numero", "ordem"],
  conceito: ["lacuna", "troca", "numero", "ordem", "par", "monte"],
};

/**
 * Um desafio por módulo de leitura. A escolha foge da mesmice em duas regras:
 * nunca a mesma mecânica do módulo anterior, e entre as possíveis vence a
 * menos usada na sessão até ali. Cuidados de saúde nunca viram jogo.
 */
export function desafiosDaSessao(sessao) {
  const modulos = sessao?.modulos?.filter((m) => typeof m.texto === "string") || [];
  // Alternativas erradas também só de termos em negrito da sessão: nunca uma palavra solta que por acaso cabe na frase.
  const pool = [...new Set(modulos.flatMap((m) => termosDoTexto(m.texto)))];
  const numeros = modulos.flatMap((m) => numerosDoTexto(m.texto));
  const geradores = { lacuna: (m) => lacuna(m, pool), numero: (m) => numero(m, numeros), troca: (m) => troca(m, pool), ordem, par, monte };
  const resultado = {}, usos = {};
  let anterior = null;
  for (const modulo of modulos) {
    const preferencia = PREFERENCIA[formatoDoModulo(modulo)];
    if (!preferencia) continue;
    const candidatos = preferencia.map((tipo) => geradores[tipo](modulo)).filter(Boolean);
    const custo = (d, i) => (d.tipo === anterior ? 100 : 0) + (usos[d.tipo] || 0) * 10 + i;
    const escolhido = candidatos.map((d, i) => [custo(d, i), d]).sort((a, b) => a[0] - b[0])[0]?.[1];
    if (escolhido) usos[escolhido.tipo] = (usos[escolhido.tipo] || 0) + 1, resultado[modulo.id] = escolhido;
    anterior = escolhido?.tipo ?? null;
  }
  return resultado;
}

/** Marcas por erro: de primeira vale 3, depois 2, depois 1. Terminar sempre vale alguma. */
export const marcasPorErros = (erros) => Math.max(1, 3 - erros);
