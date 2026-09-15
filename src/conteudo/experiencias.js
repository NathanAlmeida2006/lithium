/** Apresentação derivada: nunca altera o texto nem os JSON do protocolo. */
export const partesDoTexto = (texto = "") => texto.split(/\n\s*\n/).filter((p) => p.trim());
export const textoLimpo = (texto = "") => texto.replace(/\s*\[\d{1,2}\]/g, "").replace(/[*`>]/g, "").replace(/\s+/g, " ").trim();

export function formatoDoModulo(modulo) {
  if (modulo.tipo === "pratica") return "missao";
  if (/fontes|fast-travel/.test(modulo.id)) return "consulta";
  if (/antes-de-comecar|quando-parar|quando-procurar-avaliacao|tecnica-segura/.test(modulo.id)) return "cuidados";
  if (/mito/.test(modulo.id)) return "mito";
  if (/\n\|[\s:|\-]+\|/.test(modulo.texto || "")) return "explorar";
  if (/regras|checklist|como-usar|retomada|alarmes/.test(modulo.id)) return "passos";
  if (/espelho|paisagem|a-cozinha|hora-invisivel|mesa-posta|madrugada|descanso-renomeado/.test(modulo.id)) return "cenas";
  return "conceito";
}

/** Conserva blocos inteiros, inclusive contexto + lista. Só agrupa parágrafos. */
export function trechosDeEstudo(texto = "") {
  const partes = partesDoTexto(texto), trechos = [];
  let atual = [];
  for (let i = 0; i < partes.length; i++) {
    atual.push(partes[i]);
    const proximaELista = /^\s*(?:[-·]|\d+\.)\s/.test(partes[i + 1] || "");
    if (!proximaELista && (atual.join("\n\n").length >= 430 || i === partes.length - 1)) {
      trechos.push(atual.join("\n\n"));
      atual = [];
    }
  }
  return trechos;
}

export function lerTabela(parte) {
  if (!parte.trim().startsWith("|")) return null;
  const linhas = parte.trim().split("\n");
  if (!linhas.some((l) => /^\|[\s:|\-]+\|?$/.test(l))) return null;
  const [colunas, ...itens] = linhas.filter((l) => !/^\|[\s:|\-]+\|?$/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  return itens.length && colunas.length ? { colunas, itens } : null;
}

export function nomeDoTrecho(texto, indice) {
  const destaque = /\*\*([^*]+)\*\*/.exec(texto)?.[1];
  if (destaque && destaque.length < 65) return textoLimpo(destaque).replace(/[:.]$/, "");
  return "Trecho " + (indice + 1);
}
