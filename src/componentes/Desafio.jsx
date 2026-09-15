import { useState } from "react";
import { marcasPorErros } from "../conteudo/desafios.js";
import { semMovimento } from "../motion/tokens.js";
import { tocar } from "../motion/som.js";
import { Icone } from "./Icone.jsx";

/**
 * O desafio que fecha um módulo de leitura. Seis jogos, um por módulo, e a
 * sessão nunca repete o do módulo anterior (`conteudo/desafios.js`). Errar não
 * trava nada: custa marca, e dá para jogar de novo sem perder a melhor.
 */
const JOGOS = {
  lacuna: ["Complete a ideia", "Qual termo fecha a frase que você acabou de ler?"],
  numero: ["Crave o número", "Qual número o texto usa aqui?"],
  troca: ["Detector de troca", "Algumas frases tiveram uma palavra trocada. Confere com o que você leu?"],
  ordem: ["Ponha em ordem", "Toque nos itens na ordem em que o texto apresenta."],
  monte: ["Remonte a frase", "Toque nos blocos na ordem certa para refazer a frase do texto."],
  par: ["Ligue os pares", "Escolha um item à esquerda e depois o que combina com ele."],
};

const dois = (n) => String(n).padStart(2, "0");

/** Resposta errada: o botão treme em três degraus. Sob movimento reduzido, só o texto avisa. */
function tremer(el) {
  if (!el?.animate || semMovimento()) return;
  el.animate([{ transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 240, easing: "steps(3)" });
}

export function Marcas({ n = 0, pequeno = false }) {
  return <span className={"marcas" + (pequeno ? " marcas--pequeno" : "")} role="img" aria-label={n + " de 3 marcas"}>
    {[0, 1, 2].map((i) => <i key={i} className={i < n ? "acesa" : undefined} />)}
  </span>;
}

export function Desafio({ desafio, marcas = 0, concluir }) {
  const [partida, setPartida] = useState(0), [resultado, setResultado] = useState(null);
  const [nome, instrucao] = JOGOS[desafio.tipo];
  const Jogo = { lacuna: Lacuna, numero: Lacuna, troca: Troca, ordem: Sequencia, monte: Sequencia, par: Pares }[desafio.tipo];

  function terminar(erros) {
    const obtidas = marcasPorErros(erros);
    setResultado(obtidas);
    tocar(obtidas === 3 ? "acerto" : "carimbo");
    concluir(obtidas);
  }
  function jogarDeNovo() {
    setResultado(null);
    setPartida(partida + 1);
  }

  return <section className={"desafio desafio--" + desafio.tipo} aria-label={"Desafio: " + nome}>
    <header className="desafio-topo">
      <div><p className="sobretitulo">Desafio da atividade</p><h3>{nome}</h3></div>
      <Marcas n={Math.max(marcas, resultado || 0)} />
    </header>
    <p className="desafio-instrucao">{instrucao}</p>
    <Jogo key={partida} desafio={desafio} terminar={terminar} />
    {resultado != null ? <div className="desafio-veredito">
      <span className="desafio-selo" aria-hidden="true">+{resultado}</span>
      <p role="status">{resultado === 3 ? "De primeira. Três marcas." : resultado + (resultado === 1 ? " marca." : " marcas.") + " Jogue de novo para buscar as três."}</p>
      {resultado < 3 && <button type="button" className="botao-texto" onClick={jogarDeNovo}>Jogar de novo</button>}
    </div> : marcas > 0 && <p className="desafio-nota">Sua melhor partida aqui: {marcas} de 3 marcas. Jogar de novo nunca tira marca.</p>}
  </section>;
}

function Lacuna({ desafio, terminar }) {
  const [erradas, setErradas] = useState([]), [certa, setCerta] = useState(false);
  function escolher(opcao, evento) {
    if (opcao === desafio.correta) {
      setCerta(true);
      terminar(erradas.length);
    } else {
      tocar("erro");
      tremer(evento.currentTarget);
      setErradas([...erradas, opcao]);
    }
  }
  const junto = /^[.,;:!?)]/.test(desafio.depois) ? "" : " ";
  return <>
    <p className="lacuna-frase">
      {desafio.antes}{desafio.antes && " "}
      <span className={"lacuna-vaga" + (certa ? " preenchida" : "")}>{certa ? desafio.correta : <span aria-label="lacuna">?</span>}</span>
      {junto}{desafio.depois}
    </p>
    <div className="lacuna-fichas">
      {desafio.opcoes.map((opcao) => <button type="button" key={opcao} data-estado={certa && opcao === desafio.correta ? "certa" : erradas.includes(opcao) ? "errada" : undefined} disabled={certa || erradas.includes(opcao)} onClick={(e) => escolher(opcao, e)}>{opcao}</button>)}
    </div>
    {!certa && erradas.length > 0 && <p className="desafio-retorno" role="status">Não é essa. Tente outra ficha.</p>}
  </>;
}

/** Ordem da lista ou blocos da frase: o mesmo trilho, preenchido de cima para baixo. */
function Sequencia({ desafio, terminar }) {
  const [postos, setPostos] = useState([]), [erros, setErros] = useState(0);
  const faltam = desafio.pilha.filter((t) => !postos.includes(t));
  const frase = desafio.tipo === "monte";
  function escolher(item, evento) {
    if (item === desafio.itens[postos.length]) {
      const novos = [...postos, item];
      setPostos(novos);
      tocar("virar");
      if (novos.length === desafio.itens.length) terminar(erros);
    } else {
      tocar("erro");
      tremer(evento.currentTarget);
      setErros(erros + 1);
    }
  }
  return <div className="sequencia">
    {frase
      ? <p className="sequencia-frase" aria-live="polite">{desafio.itens.map((_, i) => <span key={i} className={postos[i] ? "ocupado" : undefined}>{postos[i] || " "}</span>)}</p>
      : <ol className="sequencia-trilho" aria-live="polite">{desafio.itens.map((_, i) => <li key={i} className={postos[i] ? "ocupado" : undefined}><span>{dois(i + 1)}</span>{postos[i] || <em>posição vazia</em>}</li>)}</ol>}
    {faltam.length > 0 && <div className="sequencia-pilha" role="group" aria-label={frase ? "Blocos da frase" : "Itens para ordenar"}>
      {faltam.map((item) => <button type="button" key={item} onClick={(e) => escolher(item, e)}>{item}</button>)}
    </div>}
    {faltam.length > 0 && erros > 0 && <p className="desafio-retorno" role="status">{frase ? "Esse bloco vem depois." : "Esse item vem depois."} Erros: {erros}.</p>}
  </div>;
}

function Troca({ desafio, terminar }) {
  const [indice, setIndice] = useState(0), [erros, setErros] = useState(0), [ultima, setUltima] = useState(null);
  const total = desafio.rodadas.length, rodada = desafio.rodadas[indice];
  function responder(confere, evento) {
    const acertou = confere === rodada.confere, soma = erros + (acertou ? 0 : 1);
    tocar(acertou ? "virar" : "erro");
    if (!acertou) tremer(evento.currentTarget);
    setErros(soma);
    setUltima({ acertou, rodada });
    setIndice(indice + 1);
    if (indice + 1 === total) terminar(soma);
  }
  return <div className="troca">
    {rodada && <>
      <div className="troca-cartao" key={indice}>
        <span className="troca-numero" aria-hidden="true">{dois(indice + 1)}</span>
        <p className="sobretitulo">Frase {indice + 1} de {total}</p>
        <p className="troca-frase">{rodada.texto}</p>
      </div>
      <div className="troca-botoes">
        <button type="button" onClick={(e) => responder(true, e)}><Icone nome="check" />Confere</button>
        <button type="button" onClick={(e) => responder(false, e)}><Icone nome="fechar" />Foi trocada</button>
      </div>
    </>}
    {ultima && <p className={"desafio-retorno" + (ultima.acertou ? " certo" : "")} role="status">
      {ultima.acertou ? "Boa. " : "Quase. "}
      {ultima.rodada.confere ? "Essa frase estava igual ao texto." : "O texto diz “" + ultima.rodada.termo + "”, não “" + ultima.rodada.trocado + "”."}
    </p>}
  </div>;
}

function Pares({ desafio, terminar }) {
  const [ligados, setLigados] = useState([]), [escolhido, setEscolhido] = useState(null), [erros, setErros] = useState(0);
  const valorDe = Object.fromEntries(desafio.pares);
  const donoDe = (valor) => ligados.find((nome) => valorDe[nome] === valor);
  function escolherValor(valor, evento) {
    if (escolhido == null) return tremer(evento.currentTarget);
    if (valorDe[escolhido] === valor) {
      const novos = [...ligados, escolhido];
      setLigados(novos);
      setEscolhido(null);
      tocar("virar");
      if (novos.length === desafio.pares.length) terminar(erros);
    } else {
      tocar("erro");
      tremer(evento.currentTarget);
      setErros(erros + 1);
    }
  }
  return <div className="pares">
    <div className="pares-coluna" role="group" aria-label={desafio.colunas[0]}>
      <p className="sobretitulo">{desafio.colunas[0]}</p>
      {desafio.pares.map(([nome]) => {
        const n = ligados.indexOf(nome) + 1;
        return <button type="button" key={nome} aria-pressed={escolhido === nome} disabled={n > 0} data-ligado={n || undefined} onClick={() => { tocar("toque"); setEscolhido(nome); }}>
          {n > 0 && <span className="pares-marca">{dois(n)}</span>}{nome}
        </button>;
      })}
    </div>
    <div className="pares-coluna" role="group" aria-label={desafio.colunas[1]}>
      <p className="sobretitulo">{desafio.colunas[1]}</p>
      {desafio.valores.map((valor) => {
        const dono = donoDe(valor), n = dono ? ligados.indexOf(dono) + 1 : 0;
        return <button type="button" key={valor} disabled={n > 0} data-ligado={n || undefined} onClick={(e) => escolherValor(valor, e)}>
          {n > 0 && <span className="pares-marca">{dois(n)}</span>}{valor}
        </button>;
      })}
    </div>
    <p className="desafio-retorno" role="status">{ligados.length === desafio.pares.length ? "" : escolhido ? "Agora escolha o que combina com “" + escolhido + "”." : "Comece por um item da esquerda." + (erros ? " Erros: " + erros + "." : "")}</p>
  </div>;
}
