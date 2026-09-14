import { Anotacao, Marcar } from "./Anotacao.jsx";
import { chaveDe } from "../estado/anotacao.js";

/**
 * O despachante: um bloco do conteúdo, no layout global que o aprovado
 * escolheu para ele.
 *
 * O `lg` vem de `aprovados/<protocolo>/pagina-NNN.md`, e este arquivo não
 * decide nada sobre ele: só sabe desenhar cada um. Layout que não tem forma
 * própria cai no LG-01, que é a coluna do envelope.
 */
const CLASSE = {
  "titulo-cartaz": "h1",
  titulo: "h2",
  subtitulo: "h3",
  corpo: "body prosa",
  rotulo: "label",
  microrregistro: "mono-reg",
  "ponto-de-anotacao": "body",
};

/**
 * O `[n]` do corpo vira link para a fonte (LG-29).
 *
 * É o que substitui "as fontes estão no fim do livro": no app o fim do livro
 * não existe, e a nota precisa de destino. `:target` faz o realce do outro
 * lado, sem uma linha de JavaScript.
 */
const RX_NOTA = /\[(\d{1,2})\]/g;

function comNotas(texto) {
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(RX_NOTA)) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    partes.push(
      <a className="nota-fonte" href={`#fonte-${m[1]}`} key={`${m.index}`}
         aria-label={`fonte ${m[1]}`}>[{m[1]}]</a>,
    );
    ultimo = m.index + m[0].length;
  }
  if (!partes.length) return texto;
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/** Texto de um elemento, na classe da escala canônica que corresponde ao papel. */
function Texto({ el, className = "" }) {
  const classe = `${CLASSE[el.tipo] ?? "body"}${el.acento ? " registro--acento" : ""} ${className}`.trim();
  if (el.tipo === "titulo-cartaz") return <h2 className={classe}>{el.texto}</h2>;
  if (el.tipo === "titulo") return <h3 className={classe}>{el.texto}</h3>;
  if (el.tipo === "subtitulo") return <h4 className={classe}>{el.texto}</h4>;
  if (el.tipo === "rotulo" || el.tipo === "microrregistro")
    return <p className={classe} style={{ color: "var(--silver)" }}>{el.texto}</p>;
  return <p className={classe}>{comNotas(el.texto)}</p>;
}

/** LG-01 · a coluna do envelope. O caso comum, e é o que a maioria vira. */
function Prosa({ bloco }) {
  return (
    <div className="pilha">
      {bloco.elementos.map((el, i) => <Texto key={i} el={el} />)}
    </div>
  );
}

/** LG-02 · a capa da sessão: headline em escala de arquitetura. */
function Capa({ bloco }) {
  const titulos = bloco.elementos.filter((e) => e.tipo === "titulo-cartaz" || e.tipo === "titulo");
  const resto = bloco.elementos.filter((e) => !titulos.includes(e));
  // O cartaz quebra a headline em linhas, e cada linha chega como um elemento:
  // "FAÇA O" / "BÁSICO". Mostrar só o primeiro decepava a frase pela metade.
  const headline = titulos.map((t) => t.texto).join(" ").trim();
  return (
    <div className="capa">
      <div className="envelope">
        {headline ? (
          <p className="capa__titulo">
            <span className="linha"><span className="linha__texto">{headline}</span></span>
          </p>
        ) : null}
        <hr className="capa__fio" />
        {resto.map((el, i) => <Texto key={i} el={el} className="capa__corpo" />)}
      </div>
    </div>
  );
}

/** LG-08 · uma ideia por tela, acendendo com a rolagem. */
function Acende({ bloco }) {
  const texto = bloco.elementos.map((e) => e.texto).join(" ");
  return (
    <div className="acende">
      <div className="acende__fixo envelope">
        <p className="acende__texto display">
          {texto.split(" ").map((palavra, i) => (
            // O espaço fica FORA do span: espaço no fim de um inline-block é
            // descartado pelo navegador, e as palavras colam.
            <span key={i}><span className="palavra">{palavra}</span>{" "}</span>
          ))}
        </p>
      </div>
    </div>
  );
}

/** LG-09 · a carta: um acento por card, e é o índice. */
function Carta({ bloco, ordem }) {
  const [cabeca, ...corpo] = bloco.elementos;
  return (
    <div className="carta" style={{ "--ordem": ordem }}>
      <span className="carta__indice mono-reg">{String(ordem + 1).padStart(2, "0")}</span>
      {cabeca ? <h3 className="carta__titulo h3">{cabeca.texto}</h3> : null}
      {corpo.map((el, i) => (
        <p key={i} className={`carta__${el.tipo === "corpo" ? "texto" : "nota"} ${CLASSE[el.tipo] ?? "body"}`}>
          {el.texto}
        </p>
      ))}
    </div>
  );
}

/** LG-15 · a lista catalogada: índice, fio entre itens, tabular-nums. */
function Lista({ bloco }) {
  return (
    <ol className="lista">
      {bloco.elementos.map((el, i) => (
        <li key={i}>
          <span className="lista__indice mono-reg">[{String(i + 1).padStart(2, "0")}]</span>
          <span className={`lista__texto${el.tipo !== "corpo" ? " lista__texto--secundario" : ""} ${CLASSE[el.tipo] ?? "body"}`}>
            {el.texto}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** LG-16 · o selo: o aviso que não pode ser mais uma linha de corpo. */
function Selo({ bloco }) {
  const [titulo, ...resto] = bloco.elementos;
  return (
    <div className="selo">
      {["se", "sd", "ie", "id"].map((c) => (
        <span key={c} className={`selo__cruz selo__cruz--${c}`} aria-hidden="true" />
      ))}
      {titulo ? <h3 className="selo__titulo h2">{titulo.texto}</h3> : null}
      {resto.map((el, i) => <p key={i} className="selo__texto body prosa">{el.texto}</p>)}
    </div>
  );
}

/** LG-17 · o diálogo: a crença de um lado, a correção do outro. */
function Dialogo({ bloco }) {
  const els = bloco.elementos;
  return (
    <dl className="dialogo">
      {els.map((el, i) => (i % 2 === 0 ? (
        <dt className="fala fala--deles" key={i}>
          <span className="fala__aspas display-xxl" aria-hidden="true">&ldquo;</span>
          <span className="fala__texto h3">{el.texto}</span>
        </dt>
      ) : (
        <dd className="fala fala--nossa" key={i}>
          <span className="fala__quem overline">o protocolo</span>
          <p className="body prosa">{el.texto}</p>
        </dd>
      )))}
    </dl>
  );
}

/** LG-25 · a tabela: card por linha no celular, tabela a partir de 640px. */
function Tabela({ bloco }) {
  const linhas = bloco.tabela ?? [];
  const rotulos = ["#", "exercício", "séries", "reps", "descanso"];
  return (
    <ol className="sessao-tabela">
      <li className="sessao-tabela__cabeca overline" aria-hidden="true">
        {rotulos.map((r) => <span key={r}>{r}</span>)}
      </li>
      {linhas.map((celulas, i) => (
        <li className="linha-exercicio" key={i}>
          <span className="linha-exercicio__topo">
            <span className="linha-exercicio__indice mono-reg">{celulas[0] || i + 1}</span>
            <span><span className="linha-exercicio__nome h3">{celulas[1]}</span></span>
          </span>
          <span className="linha-exercicio__numeros">
            {celulas.slice(2, 5).map((valor, j) => (
              <span className="dado" key={j}>
                <span className="dado__rotulo overline">{rotulos[j + 2]}</span>
                <span className="dado__valor h3">{valor || "—"}</span>
              </span>
            ))}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** LG-28 · execução: a figura obrigatória e os passos numerados. */
function Execucao({ bloco }) {
  const passos = bloco.elementos.filter((e) => e.tipo === "corpo" || e.tipo === "subtitulo");
  return (
    <div>
      {bloco.figura ? (
        <>
          <figure className="execucao__figura">
            {bloco.figura.midia
              ? <img src={bloco.figura.midia} alt={bloco.figura.legenda} loading="lazy" />
              : <span className="mono-reg" style={{ color: "var(--silver)" }}>foto do exercício</span>}
          </figure>
          <span className="execucao__legenda caption">{bloco.figura.legenda}</span>
        </>
      ) : null}
      <ol className="passos-exec">
        {passos.map((el, i) => (
          <li className="passo-exec" key={i}>
            <span className="passo-exec__indice h3">{String(i + 1).padStart(2, "0")}</span>
            <span><span className="passo-exec__texto body">{el.texto}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** LG-29 · as fontes: o `[n]` do texto salta pra cá e a fonte acende. */
function Fontes({ bloco }) {
  const itens = bloco.fontes ?? [];
  // Na página de fontes nem todo bloco é citação: há o rótulo "FONTES · 1 DE
  // 2", a nota sobre as afirmações sem fonte única, a linha que explica que a
  // referência traz DOI. Sem citação nenhuma, a lista saía vazia e o texto do
  // bloco sumia da tela sem aviso.
  if (!itens.length) return <Prosa bloco={bloco} />;
  return (
    <ol className="fontes">
      {itens.map((f) => (
        <li className="fonte" id={`fonte-${f.indice}`} key={f.indice}>
          <span className="fonte__indice mono-reg">{String(f.indice).padStart(2, "0")}</span>
          <span className="fonte__texto caption">{f.texto}</span>
        </li>
      ))}
    </ol>
  );
}

/** O rótulo do campo já aparece na anotação: não se repete no corpo do bloco. */
const achatar = (s) => s.replace(/\s+/g, " ").trim();

/**
 * O que vira MARCAÇÃO num checklist: a ação (`corpo`) e a etiqueta da grade
 * (`rotulo`) - os dois que se leem como algo a riscar. O `microrregistro` NÃO
 * entra: é a letra miúda que explica o card ("Semana fechada com 5 dos 7 dias?
 * Avance."), e transformá-la em caixa transformaria a nota de rodapé em tarefa.
 *
 * A primeira versão marcava só `corpo`, e o resto do bloco não era renderizado
 * em lugar nenhum: em 5 dos 7 checklists dos três protocolos o card saía com o
 * título "Faça isto hoje" e NADA embaixo - inclusive os sete dias da semana do
 * sono, que são a peça inteira daquela página.
 */
const MARCAVEL = new Set(["corpo", "rotulo"]);

/** LG-26 e LG-27 · o que vira estado no aparelho. */
function Campos({ bloco, protocolo, sessao, checklist }) {
  const campos = bloco.campos ?? [];
  const rotulos = new Set(campos.map((c) => achatar(c.rotulo)));
  const texto = bloco.elementos.filter((e) => !rotulos.has(achatar(e.texto)));
  const anotacoes = (linhas) => campos.map((c) => (
    <Anotacao key={c.chave} chave={chaveDe(protocolo, sessao, c.chave)}
              rotulo={c.rotulo} linhas={linhas} />
  ));

  const itens = texto.filter((e) => MARCAVEL.has(e.tipo));
  const notas = texto.filter((e) => !MARCAVEL.has(e.tipo));
  // Um checklist com menos de duas coisas a marcar e nada a escrever NÃO é um
  // checklist: é prosa que calhou de morar numa página "Faça isto hoje". O
  // catálogo é literal - "três marcações e um campo", "Marque os três" - e a
  // página do arquétipo carrega, além do card, a linha de transição para a
  // sessão seguinte e a assinatura do rodapé. Sem esta trava elas viravam seis
  // cards com o título "Faça isto hoje" e uma caixa para riscar "LITHIUM".
  if (checklist && itens.length < 2 && !campos.length) {
    return <div className="pilha">{texto.map((el, i) => <Texto key={i} el={el} />)}</div>;
  }
  if (!checklist) {
    return (
      <div className="pilha">
        {texto.map((el, i) => <Texto key={i} el={el} />)}
        {anotacoes(3)}
      </div>
    );
  }
  return (
    <div className="fechamento">
      <h3 className="fechamento__titulo h2">Faça isto hoje</h3>
      {notas.map((el, i) => <Texto key={i} el={el} />)}
      <ul className="fechamento__itens">
        {itens.map((el, i) => (
          <li key={i}>
            <Marcar chave={chaveDe(protocolo, sessao, `item-${i}`)}>{el.texto}</Marcar>
          </li>
        ))}
      </ul>
      {anotacoes(2)}
    </div>
  );
}

const POR_LAYOUT = {
  "LG-02": Capa,
  "LG-08": Acende,
  "LG-09": Carta,
  "LG-15": Lista,
  "LG-16": Selo,
  "LG-17": Dialogo,
  "LG-25": Tabela,
  "LG-28": Execucao,
  "LG-29": Fontes,
};

export function Bloco({ bloco, ordem, protocolo, sessao }) {
  if (bloco.lg === "LG-26" || bloco.lg === "LG-27") {
    return <Campos bloco={bloco} protocolo={protocolo} sessao={sessao} checklist={bloco.lg === "LG-27"} />;
  }
  const Componente = POR_LAYOUT[bloco.lg] ?? Prosa;
  const conteudo = <Componente bloco={bloco} ordem={ordem} />;
  // A capa e o texto que acende trazem o próprio envelope: são de tela cheia.
  if (bloco.lg === "LG-02" || bloco.lg === "LG-08") return conteudo;
  // Nem todo ponto de anotação cai num LG-26 ou LG-27: o diário de sono da
  // página 48 cai num recibo e a lista de proteína da dieta num bloco de
  // envelope. O aprovado manda no layout, a extração manda no que vira estado,
  // e o campo aparece sem que o bloco troque de forma para acomodá-lo.
  return (
    <div className="envelope">
      {conteudo}
      {(bloco.campos ?? []).map((c) => (
        <Anotacao key={c.chave} chave={chaveDe(protocolo, sessao, c.chave)}
                  rotulo={c.rotulo} linhas={2} />
      ))}
    </div>
  );
}

export { Carta };
