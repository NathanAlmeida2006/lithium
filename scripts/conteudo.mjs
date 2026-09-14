import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_LITHIUM || resolve(raiz, "../projetos/01-lithium/05-pos-producao");
const pilares = {
  hipertrofia: ["hipertrofia", "Hipertrofia"],
  dieta: ["dieta-basica", "Dieta básica"],
  sono: ["cuidado-com-o-sono", "Cuidado com o sono"],
};
const ler = (p) => readFile(p, "utf8");
const secao = (texto, nome) => texto.split("## " + nome + "\n")[1]?.split("\n## ")[0]?.trim() || "";
const meta = (texto, nome) => texto.match(new RegExp("^" + nome + ": (.+)$", "m"))?.[1]?.replace(/^"|"$/g, "") || "";

// Só o Texto adaptado atravessa. Instruções de produção viram estrutura,
// nunca HTML executável. Os arquivos de origem continuam sendo a referência.
function limpar(texto) {
  return texto
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\([^)]*(?:template|pinad|acende|vazad|cheia|fio de|rótulo|rotulo|micro-registro|composição|compostas à mão|superfície|superficie|grudada|layout|palavra da fronteira|variante|design-protocolo)[^)]*\)/gi, "")
    .replace(/\x60[^\x60]*(?:type=|hipertrofia\/|dieta-basica\/|cuidado-com-o-sono\/|--|§)[^\x60]*\x60/g, "")
    .replace(/§\d+(?:\.\d+)*(?: do draft| do mestre)?/g, "")
    .replace(/\*\*Bloco[^*]*\*\*\s*[:.]?\s*/g, "")
    .replace(/\*\*Glossário inline de "([^"]+)":\*\*/g, "**$1:**")
    .replace(/\*\*(?:Título|Subtítulo|Frase|Tese|Abertura|Pé|Marca de fechamento|Statement|Nota de leitura)[^*]*\*\*\s*(?:\([^)]*\))?\s*:?\s*/g, "")
    .split(/\n\s*\n/).map((p) => {
      const flat = p.replace(/\n/g, " ");
      if (/^O aviso \*\*não é adaptado/.test(p)) return "";
      if (/^\*\*(?:Painel|Cabeça)/.test(p)) {
        const corpo = flat.match(/corpo:\s*["“]([\s\S]*)/i);
        return corpo ? corpo[1].replace(/["”]\s*\.?$/, "") : "";
      }
      if (/^\*\*(?:Peça central|Figura|Transição|Registro ao marcar|Campo|Cabeçalho da ficha|Botão|Botões|Marquise|Notas da semana|Observação da noite|Registro da sessão)/.test(p)) return "";
      if (/^\*\*[^*]+\*\*\s*(?:\([^)]*\))?\s*:\s*$/.test(flat)) return "";
      return p;
    }).filter(Boolean).join("\n\n")
    .replace(/\*\*(?:Manifesto|Lista|Cotas|Selos|Diálogo|Fichas|Cabeçalho|Rótulo)[^*]*\*\*\s*(?:\([^)]*\))?\s*:?\s*/g, "")
    .replace(/^\s*[·-]\s*(?:campo|seletor|a data da semana)[^\n]*/gmi, "")
    .replace(/\*\*Palavra-monumento:\*\*\s*([^·]+)· legenda:\s*/g, "**$1** · ")
    .replace(/\*\*Números crus do rodapé do painel:\*\*/g, "")
    .replace(/\*\*Subcotas do andar 3:\*\*/g, "")
    .replace(/\*\*Seletor[^*]*\*\*/g, "**Escolha sua situação:**")
    .replace(/\*\*Contador · traços de hoje\.\*\*/g, "**Blocos de hoje**")
    .replace(/\(aparece no painel de consulta ao tocar em[^)]*\)/g, "")
    .replace(/\(logo abaixo dos selos\)/g, "")
    .replace(/Não precisa ler na ordem\. Escolha a sua e vá direto:/g, "Na Jornada, siga a sequência. Para consulta rápida, use o Kit:")
    .trim();
}

let total = 0;
for (const id of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(pilares)) {
  if (!pilares[id]) throw new Error("Protocolo desconhecido: " + id);
  const [pasta, nome] = pilares[id];
  const destino = join(raiz, "src/conteudo", id + ".json");
  let pastas;
  try { pastas = (await readdir(join(base, pasta))).filter((p) => p.startsWith("sessao-")).sort(); }
  catch (erro) {
    if (erro.code !== "ENOENT" || process.env.BASE_LITHIUM) throw erro;
    const copia = JSON.parse(await ler(destino));
    if (copia.schemaVersion !== 2 || !copia.sourceHash) throw new Error("Catálogo v2 ausente: configure BASE_LITHIUM.");
    console.log(id + ": catálogo versionado validado (fontes externas ausentes).");
    continue;
  }
  const sessoes = [];
  const hash = createHash("sha256");
  for (const pastaSessao of pastas) {
    const diretorio = join(base, pasta, pastaSessao);
    const visao = await ler(join(diretorio, "visao-geral.md"));
    hash.update(visao);
    const numero = Number(meta(visao, "sessao"));
    const sessao = {
      id: "s" + pastaSessao.slice(7),
      numero, nome: meta(visao, "titulo"),
      objetivo: limpar(secao(visao, "O que esta sessão faz")).split("\n\n")[0],
      modulos: [],
    };
    for (const arquivo of (await readdir(diretorio)).filter((p) => /^modulo-.*\.md$/.test(p)).sort()) {
      const texto = await ler(join(diretorio, arquivo));
      hash.update(texto);
      const adaptado = secao(texto, "Texto adaptado");
      if (!adaptado) {
        if (id === "dieta" && arquivo === "modulo-02-pagina-duplicada.md") continue;
        throw new Error("Texto adaptado ausente: " + arquivo);
      }
      const consulta = /fontes|fast-travel/.test(arquivo);
      const inicioPratica = adaptado.search(/^\*\*Faça isto hoje[^\n]*$/m);
      const praticaSeparada = inicioPratica >= 0 && !/faca-isto-hoje/.test(arquivo);
      let conteudo = limpar(praticaSeparada ? adaptado.slice(0, inicioPratica) : adaptado);
      const textoPratica = limpar(praticaSeparada ? adaptado.slice(inicioPratica) : adaptado);
      const acoes = /faca-isto-hoje/.test(arquivo) || praticaSeparada ? [...textoPratica.matchAll(/^\d\.\s+(.+(?:\n(?!\n|\d\. ).+)*)/gm)].map((m) => m[1].trim()) : [];
      if (acoes.length && acoes.length !== 3) throw new Error("Faça isto hoje precisa de três ações: " + arquivo);
      const acaoRegistro = /ficha-de-treino/.test(arquivo) ? "treino" : /diario-de-sono/.test(arquivo) ? "sono" : /tracos-nao-gramas/.test(arquivo) ? "dieta" : /a-sua-meta|a-semana-na-vida-real/.test(arquivo) ? "metas" : null;
      if (/ficha-de-treino/.test(arquivo)) conteudo = "Registre cada realização do treino com a data, o exercício, a carga e as repetições de cada série. Na prancha, use segundos.\n\nAgrupe apenas séries com os mesmos valores. Se a carga ou as repetições mudaram, adicione outra linha do exercício. Seus registros podem ser consultados e corrigidos no histórico.";
      if (/diario-de-sono/.test(arquivo)) conteudo = "Registre a data em que acordou, quando deitou, quando levantou e como acordou, de 1 a 5. Uma observação curta ajuda a lembrar o contexto.\n\nOs horários informam o tempo na cama. Eles não medem, sozinhos, o tempo efetivamente dormido. O diário fica disponível no Kit e no dashboard.";
      sessao.modulos.push({
        id: arquivo.replace(".md", ""), titulo: meta(texto, "titulo"),
        objetivo: secao(texto, "Objetivo").replace(/\n/g, " "),
        tipo: consulta ? "consulta" : acoes.length && !praticaSeparada ? "pratica" : "leitura",
        kit: consulta || /treino-[abcd]|antes-de-comecar|quando-parar|como-usar|agachar|empurrar|puxar|dobradica|acessorios|regras-de-retorno|diario-de-sono|ficha-de-treino|quando-procurar|substituicoes|a-sua-meta|regra-da-balanca|kit-casa|kit-estagio|checklist-semanal|conversa|ancora|regra-do-dia-seguinte/.test(arquivo),
        fonte: pasta + "/" + pastaSessao + "/" + arquivo,
        texto: conteudo, acoes: praticaSeparada ? [] : acoes, acaoRegistro,
      });
      if (praticaSeparada) sessao.modulos.push({ id: arquivo.replace(".md", "-pratica"), titulo: "Faça isto hoje" + (id === "sono" ? " à noite" : ""), tipo: "pratica", kit: false, fonte: pasta + "/" + pastaSessao + "/" + arquivo, texto: textoPratica, acoes });
      total++;
    }
    if (!sessao.modulos.length) throw new Error("Sessão vazia: " + pastaSessao);
    sessoes.push(sessao);
  }
  if (sessoes.length !== 10) throw new Error("Esperadas dez sessões em " + id);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, JSON.stringify({ schemaVersion: 2, sourceHash: hash.digest("hex"), protocolo: id, nome, sessoes }, null, 2) + "\n");
  console.log(id + ": " + sessoes.length + " sessões, " + sessoes.reduce((n, s) => n + s.modulos.length, 0) + " módulos.");
}
if (total) console.log(total + " módulos com conteúdo próprio; duplicata de Dieta excluída.");
const catalogo = {};
for (const id of Object.keys(pilares)) {
  const completo = JSON.parse(await ler(join(raiz, "src/conteudo", id + ".json")));
  catalogo[id] = { protocolo: id, nome: completo.nome, sessoes: completo.sessoes.map((s) => ({
    id: s.id, numero: s.numero, nome: s.nome,
    modulos: s.modulos.map(({ texto, fonte, objetivo, ...m }) => m),
  })) };
  const acoes = completo.sessoes.flatMap((s) => s.modulos).filter((m) => m.tipo === "pratica");
  if (acoes.length !== 8 || acoes.some((m) => m.acoes.length !== 3)) throw new Error("Cada protocolo precisa de oito cards com três ações.");
}
await writeFile(join(raiz, "src/conteudo/catalogo.json"), JSON.stringify(catalogo, null, 2) + "\n");
