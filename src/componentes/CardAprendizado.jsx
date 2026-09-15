import { useId, useRef, useState } from "react";
import { EmLinha, TextoModulo } from "./TextoModulo.jsx";
import { Icone } from "./Icone.jsx";
import { MapaConceito } from "./MapaConceito.jsx";
import { formatoDoModulo, lerTabela, nomeDoTrecho, partesDoTexto, textoLimpo, trechosDeEstudo } from "../conteudo/experiencias.js";

const FORMATOS = {
  cuidados: ["Cuidados para começar", "Leia todos os avisos antes de seguir.", "cadeado"],
  mito: ["Coloque a ideia à prova", "Reconheça a afirmação. Depois, explore a explicação.", "alvo"],
  explorar: ["Explore na prática", "Toque nos itens para olhar os detalhes.", "kit"],
  passos: ["Um passo de cada vez", "Percorra a sequência no seu ritmo.", "jornada"],
  cenas: ["Entre nesta cena", "Uma história curta para ligar a ideia à sua rotina.", "sono"],
  conceito: ["Monte o raciocínio", "Explore os trechos e conecte as ideias.", "alvo"],
};

export function CardAprendizado({ modulo, pilar, consulta = false }) {
  // O catálogo chega antes do texto ao trocar de protocolo após uma recarga.
  if (typeof modulo.texto !== "string") return null;
  const formato = formatoDoModulo(modulo);
  if (formato === "consulta") return <TextoModulo texto={modulo.texto} pilar={pilar} />;
  return <Experiencia key={pilar + ":" + modulo.id + ":" + modulo.texto} modulo={modulo} pilar={pilar} formato={formato} consulta={consulta} />;
}

function Experiencia({ modulo, pilar, formato, consulta }) {
  const [integral, setIntegral] = useState(consulta);
  const [nome, instrucao, icone] = FORMATOS[formato] || FORMATOS.conceito;
  const id = useId();
  return <div className={"aprendizado aprendizado--" + formato} data-formato={formato}>
    <div className="aprendizado-barra">
      <span><Icone nome={icone} tamanho={20} />{nome}</span>
      {formato !== "cuidados" && <button type="button" className="botao-texto" aria-pressed={integral} aria-controls={id} onClick={() => setIntegral(!integral)}>{integral ? "Explorar por partes" : "Ver conteúdo inteiro"}</button>}
    </div>
    <div id={id}>
      {formato === "cuidados" ? <Cuidados texto={modulo.texto} pilar={pilar} />
        : integral ? <TextoModulo texto={modulo.texto} pilar={pilar} />
        : <>
          <p className="aprendizado-instrucao">{instrucao}</p>
          <MapaConceito modulo={modulo} />
          {formato === "mito" ? <Mito texto={modulo.texto} pilar={pilar} />
            : formato === "explorar" ? <Explorador texto={modulo.texto} pilar={pilar} />
            : <Trechos texto={modulo.texto} pilar={pilar} formato={formato} />}
        </>}
    </div>
  </div>;
}

function rotuloCuidado(parte) {
  if (/18 anos|maiores de|idade/i.test(parte)) return "Faixa etária";
  if (/Lei nº|prescrição de dieta/i.test(parte)) return "Acompanhamento profissional";
  if (/caráter educacional|não é consulta/i.test(parte)) return "O papel deste material";
  if (/não é exaustiva|na dúvida/i.test(parte)) return "Na dúvida, procure avaliação";
  if (/interrompa|interromper|sinal de parada/i.test(parte)) return "Sinais de parada";
  if (/médico|avaliação|atendimento/i.test(parte)) return "Antes de iniciar";
  return "Tenha em mente";
}

function Cuidados({ texto, pilar }) {
  const partes = partesDoTexto(texto);
  const grupos = [];
  for (const parte of partes) {
    if (/^\s*[-·]\s/.test(parte) && grupos.length) grupos[grupos.length - 1] += "\n\n" + parte;
    else grupos.push(parte);
  }
  return <div className="cuidados-dossie">
    <div className="cuidados-selo" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none"><path d="M60 8 103 25v34c0 24-21 42-43 53C38 101 17 83 17 59V25Z" /><path d="M60 34v31m0 14v5M31 32l29-11 29 11" /></svg><span>Aprender com cuidado</span></div>
    <div className="cuidados-grupos">{grupos.map((parte, i) => <section className="cuidado-grupo" key={i}>
      <h3>{rotuloCuidado(parte)}</h3><TextoModulo texto={parte} pilar={pilar} />
    </section>)}</div>
  </div>;
}

function Trechos({ texto, pilar, formato }) {
  const trechos = trechosDeEstudo(texto);
  const [indice, setIndice] = useState(0), [vistos, setVistos] = useState([0]);
  const conteudo = useRef(null), id = useId();
  function ir(i, focar = false) {
    setIndice(i); setVistos((v) => [...new Set([...v, i])]);
    if (focar) requestAnimationFrame(() => conteudo.current?.focus({ preventScroll: true }));
  }
  const unidade = formato === "cenas" ? "Cena" : formato === "passos" ? "Parte" : "Trecho";
  return <div className={"leitura-guiada leitura-guiada--" + formato}>
    <div className="trechos-trilho" aria-label="Escolher trecho">
      {trechos.map((t, i) => <button type="button" key={i} aria-label={unidade + " " + (i + 1) + ": " + nomeDoTrecho(t, i)} aria-current={indice === i ? "step" : undefined} aria-controls={id} onClick={() => ir(i)}>
        <span>{String(i + 1).padStart(2, "0")}</span><span className="trecho-nome">{nomeDoTrecho(t, i)}</span>{vistos.includes(i) && <span className="sr-only">, aberto</span>}
      </button>)}
    </div>
    <div className="trecho-conteudo" id={id} tabIndex={-1} ref={conteudo}>
      <div className="trecho-folio" aria-hidden="true"><span>{String(indice + 1).padStart(2, "0")}</span><Icone nome={formato === "passos" ? "jornada" : "alvo"} tamanho={30} /></div>
      <div key={indice} className="trecho-entrada"><TextoModulo texto={trechos[indice]} pilar={pilar} /></div>
    </div>
    <div className="trechos-rodape">
      <span role="status">{unidade} {indice + 1} de {trechos.length}</span>
      <div><button className="botao secundario" type="button" aria-label="Trecho anterior" disabled={indice === 0} onClick={() => ir(indice - 1, true)}>←</button>
        <button className="botao secundario" type="button" disabled={indice === trechos.length - 1} onClick={() => ir(indice + 1, true)}>Próximo trecho <Icone nome="seta" tamanho={18} /></button></div>
    </div>
    {vistos.length === trechos.length && trechos.length > 1 && <p className="exploracao-retorno" role="status"><Icone nome="check" tamanho={18} />Todos os trechos abertos. O que você levaria para a sua rotina?</p>}
  </div>;
}

function Mito({ texto, pilar }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  // A objeção permanece literal; toda a explicação e suas ressalvas são reveladas juntas.
  const corte = texto.search(/\n[-·] \*\*Resposta/);
  const partes = partesDoTexto(texto);
  const frente = corte > 0 ? texto.slice(0, corte) : partes[0];
  const verso = corte > 0 ? texto.slice(corte) : partes.slice(1).join("\n\n");
  return <div className="mito-mesa">
    <div className="mito-afirmacao"><span className="mito-sinal" aria-hidden="true">?</span><p className="sobretitulo">A afirmação em discussão</p><TextoModulo texto={frente} pilar={pilar} /></div>
    <button type="button" className="botao secundario mito-revelar" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto(!aberto)}>{aberto ? "Recolher explicação" : "O que explica isso?"}<Icone nome={aberto ? "fechar" : "mais"} /></button>
    <div id={id} hidden={!aberto} className="mito-explicacao"><p className="sobretitulo">Conecte a explicação à sua rotina</p><TextoModulo texto={verso} pilar={pilar} /></div>
  </div>;
}

function Explorador({ texto, pilar }) {
  const grupos = [];
  for (const parte of partesDoTexto(texto)) {
    const tabela = lerTabela(parte), anterior = grupos.at(-1);
    if (!tabela && anterior && !anterior.tabela) anterior.parte += "\n\n" + parte;
    else grupos.push({ parte, tabela });
  }
  return <div className="explorador">{grupos.map(({ parte, tabela }, i) => {
    return tabela ? <TabelaExploravel key={i} tabela={tabela} parte={parte} pilar={pilar} />
      : parte.length > 650 ? <Trechos key={i} texto={parte} pilar={pilar} formato="conceito" />
      : <TextoModulo key={i} texto={parte} pilar={pilar} />;
  })}</div>;
}

function TabelaExploravel({ tabela, parte, pilar }) {
  const [indice, setIndice] = useState(0), [comparar, setComparar] = useState(false);
  const id = useId();
  const { colunas, itens } = tabela;
  const numerada = /^(marca|#|nº|número)$/i.test(textoLimpo(colunas[0]));
  const nome = (linha) => textoLimpo(linha[numerada ? 1 : 0]) || "Item";
  return <section className="tabela-exploravel" aria-label="Explorar tabela">
    <div className="tabela-comando"><span>{itens.length} itens para explorar</span><button className="botao-texto" type="button" aria-pressed={comparar} onClick={() => setComparar(!comparar)}>{comparar ? "Explorar itens" : "Comparar todos"}</button></div>
    {comparar ? <TextoModulo texto={parte} pilar={pilar} /> : <div className="tabela-estacao">
      <div className="tabela-seletor" aria-label="Escolher item">{itens.map((linha, i) => <button type="button" key={i} aria-pressed={indice === i} aria-controls={id} onClick={() => setIndice(i)}>{numerada && <span className="tabela-numero">{linha[0]}</span>}<span>{nome(linha)}</span><Icone nome="seta" tamanho={16} /></button>)}</div>
      <div className="tabela-ficha" id={id} aria-live="polite"><p className="sobretitulo">Item {indice + 1} de {itens.length}</p><h3>{nome(itens[indice])}</h3><dl>{colunas.map((coluna, i) => <div key={i}><dt><EmLinha texto={coluna} pilar={pilar} /></dt><dd><EmLinha texto={itens[indice][i] || ""} pilar={pilar} /></dd></div>)}</dl></div>
    </div>}
  </section>;
}
