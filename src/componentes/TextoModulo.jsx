import { Fragment } from "react";

/**
 * O texto das sessões chega do pipeline em markdown mínimo, e vira elemento
 * aqui. Sem `dangerouslySetInnerHTML`: o conteúdo nunca é interpretado como HTML.
 */

// Negrito, itálico e código. A nota numerada `[12]` sai do card: a fonte segue no Kit.
const MARCAS_EM_LINHA = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
const NOTA = /\s*\[\d{1,2}\]/g;
const INICIO_DE_ITEM = /^\s*(?:\d+\.|[-·])\s/;
const QUEBRA_ENTRE_ITENS = /\n(?=\s*(?:\d+\.|[-·])\s)/;
const SEPARADOR_DE_TABELA = /^\|[\s:|\-]+\|?$/;

// Uma `.palavra` por palavra, com o espaço fora dela: a justificação continua valendo.
const emPalavras = (texto, chave) => texto.split(/(\s+)/).map((p, j) => (p.trim() ? <span className="palavra" key={chave + "-" + j}>{p}</span> : p));

/** `palavras` fatia o texto para a manchete acender; quem fatia é o React, então nada reescreve o nó por fora. */
export function EmLinha({ texto, palavras = false }) {
  const corpo = (t, i) => (palavras ? emPalavras(t, i) : t);
  return String(texto).replace(NOTA, "").split(MARCAS_EM_LINHA).map((parte, i) => {
    if (parte.startsWith("**")) return <strong key={i}>{corpo(parte.slice(2, -2), i)}</strong>;
    if (parte.startsWith("*")) return <em key={i}>{corpo(parte.slice(1, -1), i)}</em>;
    if (parte.startsWith("`")) return <span key={i}>{parte.slice(1, -1)}</span>;
    return <Fragment key={i}>{corpo(parte, i)}</Fragment>;
  });
}

function Tabela({ linhas, pilar }) {
  const [cabecalho = [], ...corpo] = linhas
    .filter((linha) => !SEPARADOR_DE_TABELA.test(linha))
    .map((linha) => linha.split("|").slice(1, -1).map((celula) => celula.trim()));
  return (
    <div className="tabela-adaptada">
      <table role="table">
        <thead role="rowgroup">
          <tr role="row">{cabecalho.map((celula, j) => <th role="columnheader" scope="col" key={j}><EmLinha texto={celula} pilar={pilar} /></th>)}</tr>
        </thead>
        <tbody role="rowgroup">
          {corpo.map((linha, k) => (
            <tr role="row" key={k}>
              {linha.map((celula, j) => <td role="cell" key={j} data-rotulo={cabecalho[j]?.replace(/\*/g, "")}><EmLinha texto={celula} pilar={pilar} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lista numerada começa no número escrito, e cada item vira âncora `fonte-N` para o link da nota. */
function Lista({ parte, pilar }) {
  parte = parte.trim(); // Quebra antes do primeiro item virava um item vazio.
  const itens = parte.split(QUEBRA_ENTRE_ITENS).map((item) => item.replace(INICIO_DE_ITEM, "").replace(/\n/g, " "));
  if (!/^\d/.test(parte)) return <ul>{itens.map((item, j) => <li key={j}><EmLinha texto={item} pilar={pilar} /></li>)}</ul>;
  const inicio = Number(/^\d+/.exec(parte)[0]);
  return <ol start={inicio}>{itens.map((item, j) => <li key={j} id={"fonte-" + (inicio + j)}><EmLinha texto={item} pilar={pilar} /></li>)}</ol>;
}

// Acima disto o parágrafo é leitura, não manchete: acender palavra a palavra cansaria.
const MANCHETE_MAXIMA = 180;

function Bloco({ parte, pilar, manchete }) {
  const linhas = parte.trim().split("\n");
  if (linhas[0].startsWith("|")) return <Tabela linhas={linhas} pilar={pilar} />;
  if (INICIO_DE_ITEM.test(parte)) return <Lista parte={parte} pilar={pilar} />;
  if (linhas[0].startsWith(">")) return <blockquote><EmLinha texto={linhas.map((l) => l.replace(/^>\s?/, "")).join(" ")} pilar={pilar} /></blockquote>;
  if (manchete && parte.length <= MANCHETE_MAXIMA) return <p className="manchete"><EmLinha texto={parte.replace(/\n/g, " ")} palavras /></p>;
  return <p><EmLinha texto={parte.replace(/\n/g, " ")} pilar={pilar} /></p>;
}

/** `manchete`: o primeiro parágrafo curto abre o texto em escala de título, e acende. */
export function TextoModulo({ texto = "", pilar, manchete = false }) {
  return (
    <div className="texto-modulo">
      {texto.split(/\n\s*\n/).filter(Boolean).map((parte, i) => <Bloco key={i} parte={parte} pilar={pilar} manchete={manchete && i === 0} />)}
    </div>
  );
}

/** Enquanto o conteúdo do protocolo não chega, ou quando ele falha em chegar. */
export function EstadoConteudo({ carregado }) {
  if (carregado.conteudo) return null;
  return (
    <p role="status">
      {carregado.erro || "Preparando conteúdo…"}
      {carregado.erro && <button className="botao-texto" onClick={carregado.tentar}>Tentar novamente</button>}
    </p>
  );
}
