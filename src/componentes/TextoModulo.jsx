import { Fragment } from "react";
export function EmLinha({ texto, pilar }) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*|\*[^*]+\*|\x60[^\x60]+\x60|\[\d{1,2}\])/g);
  return partes.map((p, i) => {
    if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.charCodeAt(0) === 96) return <span key={i}>{p.slice(1, -1)}</span>;
    if (/^\[\d+\]$/.test(p)) return <a key={i} className="referencia" href={"#/kit/" + pilar + "/fontes/" + p.slice(1, -1)} aria-label={"Consultar fonte " + p.slice(1, -1)}>{p}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
export function TextoModulo({ texto = "", pilar }) {
  const partes = texto.split(/\n\s*\n/).filter(Boolean);
  return <div className="texto-modulo">{partes.map((parte, i) => {
    const linhas = parte.trim().split("\n");
    if (linhas[0].startsWith("|")) {
      const rows = linhas.filter((l) => !/^\|[\s:|\-]+\|?$/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
      return <div className="tabela-adaptada" key={i}><table role="table"><thead role="rowgroup"><tr role="row">{rows[0]?.map((c, j) => <th role="columnheader" scope="col" key={j}><EmLinha texto={c} pilar={pilar} /></th>)}</tr></thead><tbody role="rowgroup">{rows.slice(1).map((row, k) => <tr role="row" key={k}>{row.map((c, j) => <td role="cell" key={j} data-rotulo={rows[0][j]?.replace(/\*/g, "")}><EmLinha texto={c} pilar={pilar} /></td>)}</tr>)}</tbody></table></div>;
    }
    if (/^\s*(?:\d+\.|[-·])\s/.test(parte)) {
      const itens = parte.split(/\n(?=\s*(?:\d+\.|[-·])\s)/).map((l) => l.replace(/^\s*(?:\d+\.|[-·])\s/, "").replace(/\n/g, " "));
      const Tag = /^\d/.test(parte) ? "ol" : "ul";
      const inicio = /^\d+/.exec(parte)?.[0];
      return <Tag key={i} start={Tag === "ol" ? Number(inicio) : undefined}>{itens.map((t, j) => <li key={j} id={Tag === "ol" ? "fonte-" + (Number(inicio) + j) : undefined}><EmLinha texto={t} pilar={pilar} /></li>)}</Tag>;
    }
    if (linhas[0].startsWith(">")) return <blockquote key={i}><EmLinha texto={linhas.map((l) => l.replace(/^>\s?/, "")).join(" ")} pilar={pilar} /></blockquote>;
    return <p key={i}><EmLinha texto={parte.replace(/\n/g, " ")} pilar={pilar} /></p>;
  })}</div>;
}
