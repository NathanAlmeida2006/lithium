import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { EmLinha, TextoModulo } from "./TextoModulo.jsx";
import { Icone } from "./Icone.jsx";
import { MapaConceito } from "./MapaConceito.jsx";
import { formatoDoModulo, lerTabela, nomeDoTrecho, partesDoTexto, textoLimpo, trechosDeEstudo } from "../conteudo/experiencias.js";
import { animarCard, ligarPalco } from "../motion/revelacao.js";
import { rolarAte } from "../motion/rolagem.js";
import { tocar } from "../motion/som.js";

const FORMATOS = {
  cuidados: ["Cuidados para começar", "Leia todos os avisos antes de seguir.", "cadeado"],
  mito: ["Coloque a ideia à prova", "Reconheça a afirmação. Depois, explore a explicação.", "alvo"],
  explorar: ["Explore na prática", "Toque nos itens para olhar os detalhes.", "kit"],
  passos: ["Um passo de cada vez", "Leia no seu ritmo, parte por parte.", "jornada"],
  cenas: ["Entre nesta cena", "Uma história curta para ligar a ideia à sua rotina.", "sono"],
  conceito: ["Monte o raciocínio", "Leia no seu ritmo, parte por parte.", "alvo"],
};

// Tabela que só posiciona um diagrama ("Marca | Esquerda | Direita") não relaciona linha com coluna.
const TABELA_DE_DIAGRAMA = /^(esquerda|direita|coluna)/i;
const COLUNA_DE_NUMERO = /^(marca|#|nº|número)$/i;

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
  const id = useId(), raiz = useRef(null);
  // Trocar entre partes e texto inteiro monta outro miolo, e ele entra de novo.
  useEffect(() => animarCard(raiz.current), [integral]);
  return <div className={"aprendizado aprendizado--" + formato} data-formato={formato} ref={raiz}>
    <div className="aprendizado-barra">
      <span><Icone nome={icone} tamanho={20} /><span className="aprendizado-rotulo">{nome}</span></span>
      {formato !== "cuidados" && <button type="button" className="botao-texto" aria-pressed={integral} aria-controls={id} onClick={() => setIntegral(!integral)}>{integral ? "Explorar por partes" : "Ver conteúdo inteiro"}</button>}
    </div>
    <div id={id} className="aprendizado-conteudo">
      {formato === "cuidados" ? <Cuidados texto={modulo.texto} pilar={pilar} />
        : integral ? <TextoModulo texto={modulo.texto} pilar={pilar} />
        : <>
          <p className="aprendizado-instrucao">{instrucao}</p>
          <MapaConceito modulo={modulo} />
          {formato === "mito" ? <Mito texto={modulo.texto} pilar={pilar} consulta={consulta} />
            : formato === "explorar" ? <Explorador texto={modulo.texto} pilar={pilar} />
            : <Palco texto={modulo.texto} pilar={pilar} formato={formato} />}
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

/**
 * O texto corrido em partes: a mesa da prova da landing, sem a capa. No monitor a
 * régua gruda ao lado e acompanha a parte do meio da tela; no celular ela sai e
 * cada parte carrega o próprio rótulo. Todo o texto fica visível desde o início,
 * em ordem, sem clique: ler adiantado não é erro.
 */
function Palco({ texto, pilar, formato }) {
  const trechos = trechosDeEstudo(texto);
  const [atual, setAtual] = useState(0);
  const raiz = useRef(null), anterior = useRef(0);
  useLayoutEffect(() => ligarPalco(raiz.current, setAtual), []);
  useEffect(() => {
    if (anterior.current !== atual) tocar("virar");
    anterior.current = atual;
  }, [atual]);
  const dois = (n) => String(n).padStart(2, "0");
  return <section className={"palco palco--" + formato} ref={raiz} aria-label={"Leitura em " + trechos.length + (trechos.length === 1 ? " parte" : " partes")}>
    <div className="palco-mesa">
      <div className="palco-trilho" aria-hidden="true">
        <span className="palco-numero"><span key={atual}>{dois(atual + 1)}</span></span>
        <span className="palco-total">/ {dois(trechos.length)}</span>
        <ol className="palco-regua">{trechos.map((_, i) => <li key={i} className={i < atual ? "acesa" : i === atual ? "atual" : undefined} />)}</ol>
        <span className="palco-nome" key={"nome-" + atual}>{nomeDoTrecho(trechos[atual], atual)}</span>
      </div>
      <div className="palco-corpo">
        {trechos.map((t, i) => <article className="palco-trecho" key={i} data-indice={i} aria-label={"Parte " + (i + 1) + " de " + trechos.length}>
          <p className="palco-rotulo" aria-hidden="true">(parte {dois(i + 1)})</p>
          <TextoModulo texto={t} pilar={pilar} manchete />
        </article>)}
      </div>
    </div>
    <p className="palco-fim"><span className="palco-fim-seta" aria-hidden="true">↓</span>Fim da leitura. O que você levaria para a sua rotina?</p>
  </section>;
}

function Mito({ texto, pilar, consulta }) {
  const [aberto, setAberto] = useState(false), [aposta, setAposta] = useState(null);
  const id = useId();
  // A objeção permanece literal; toda a explicação e suas ressalvas são reveladas juntas.
  const corte = texto.search(/\n[-·] \*\*Resposta/);
  const partes = partesDoTexto(texto);
  const frente = corte > 0 ? texto.slice(0, corte) : partes[0];
  const verso = corte > 0 ? texto.slice(corte) : partes.slice(1).join("\n\n");
  function alternar() {
    tocar(aberto ? "toque" : "carimbo");
    setAberto(!aberto);
  }
  return <div className="mito-mesa">
    <div className="mito-afirmacao grao"><span className="mito-sinal" aria-hidden="true">?</span><p className="sobretitulo">A afirmação em discussão</p><TextoModulo texto={frente} pilar={pilar} manchete /></div>
    {/* Na jornada, a explicação abre com uma aposta: tomar posição antes de ler faz a leitura ter o que conferir. */}
    {!consulta && !aposta ? <div className="mito-aposta" role="group" aria-label="Antes de abrir a explicação">
      <p className="sobretitulo">Antes de abrir: você acreditava nisso?</p>
      <div>{[["acreditava", "Eu acreditava"], ["duvidava", "Eu já duvidava"]].map(([valor, rotulo]) => <button key={valor} type="button" data-som className="botao secundario" aria-controls={id} onClick={() => { setAposta(valor); if (!aberto) alternar(); }}>{rotulo}</button>)}</div>
    </div>
      : <button type="button" data-som className="botao secundario mito-revelar" aria-expanded={aberto} aria-controls={id} onClick={alternar}>{aberto ? "Recolher explicação" : "O que explica isso?"}<Icone nome={aberto ? "fechar" : "mais"} /></button>}
    <div id={id} hidden={!aberto} className="mito-explicacao">
      {/* O selo da garantia da landing, aplicado ao veredito: cai torto e assenta em três degraus. */}
      <span className="selo-veredito" aria-hidden="true"><i /><i /><i /><i />Explicado</span>
      {aposta && <p className="mito-aposta-eco">{aposta === "acreditava" ? "Você acreditava. Agora confira o que o protocolo mostra." : "Você já duvidava. Agora você tem o porquê."}</p>}
      <p className="sobretitulo">Conecte a explicação à sua rotina</p><TextoModulo texto={verso} pilar={pilar} />
    </div>
  </div>;
}

/** As células de uma tabela de diagrama, em ordem de leitura, sem o número da marca nem célula vazia. */
function listaDoDiagrama({ colunas, itens }) {
  const inicio = COLUNA_DE_NUMERO.test(textoLimpo(colunas[0])) ? 1 : 0;
  return itens.flatMap((linha) => linha.slice(inicio)).filter((celula) => textoLimpo(celula).replace(/·/g, "").trim()).map((celula) => "- " + celula).join("\n");
}

function Explorador({ texto, pilar }) {
  const grupos = [];
  for (const parte of partesDoTexto(texto)) {
    const tabela = lerTabela(parte), anterior = grupos.at(-1);
    if (!tabela && anterior && !anterior.tabela) anterior.parte += "\n\n" + parte;
    else grupos.push({ parte, tabela });
  }
  return <div className="explorador">{grupos.map(({ parte, tabela }, i) => {
    if (tabela && tabela.colunas.some((coluna) => TABELA_DE_DIAGRAMA.test(textoLimpo(coluna)))) return <TextoModulo key={i} texto={listaDoDiagrama(tabela)} pilar={pilar} />;
    return tabela ? <TabelaExploravel key={i} tabela={tabela} parte={parte} pilar={pilar} />
      : parte.length > 650 ? <Palco key={i} texto={parte} pilar={pilar} formato="conceito" />
      : <TextoModulo key={i} texto={parte} pilar={pilar} manchete={i === 0} />;
  })}</div>;
}

function TabelaExploravel({ tabela, parte, pilar }) {
  const [indice, setIndice] = useState(0), [comparar, setComparar] = useState(false);
  const id = useId(), ficha = useRef(null);
  const { colunas, itens } = tabela;
  const numerada = COLUNA_DE_NUMERO.test(textoLimpo(colunas[0]));
  const nome = (linha) => textoLimpo(linha[numerada ? 1 : 0]) || "Item";
  function escolher(i) {
    setIndice(i);
    // Em coluna única a ficha fica abaixo da lista: a leitura vai até ela.
    if (window.matchMedia("(max-width: 1100px)").matches) requestAnimationFrame(() => ficha.current && rolarAte(ficha.current));
  }
  return <section className="tabela-exploravel" aria-label="Explorar tabela">
    <div className="tabela-comando"><span>{itens.length} itens para explorar</span><button className="botao-texto" type="button" aria-pressed={comparar} onClick={() => setComparar(!comparar)}>{comparar ? "Explorar itens" : "Comparar todos"}</button></div>
    {comparar ? <TextoModulo texto={parte} pilar={pilar} /> : <div className="tabela-estacao">
      <div className="tabela-seletor" aria-label="Escolher item">{itens.map((linha, i) => <button type="button" key={i} aria-pressed={indice === i} aria-controls={id} onClick={() => escolher(i)}>{numerada && <span className="tabela-numero">{linha[0]}</span>}<span>{nome(linha)}</span><Icone nome="seta" tamanho={16} /></button>)}</div>
      {/* A região viva fica; só o miolo troca, para a ficha nova entrar de novo. */}
      <div className="tabela-ficha" id={id} ref={ficha} aria-live="polite"><div key={indice} className="ficha-entrada">
        <p className="sobretitulo">Item {indice + 1} de {itens.length}</p><h3>{nome(itens[indice])}</h3>
        <dl>{colunas.map((coluna, i) => <div key={i}><dt><EmLinha texto={coluna} pilar={pilar} /></dt><dd><EmLinha texto={itens[indice][i] || ""} pilar={pilar} /></dd></div>)}</dl>
      </div></div>
    </div>}
  </section>;
}
