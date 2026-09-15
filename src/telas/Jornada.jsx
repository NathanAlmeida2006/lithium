import { useMemo } from "react";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { desafiosDaSessao } from "../conteudo/desafios.js";
import { chaveSessao, estadosDasSessoes, modulosDaJornada, sessaoAtual } from "../dominio/progresso.js";
import { AbasPilares } from "../componentes/AbasPilares.jsx";
import { doisDigitos, link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { CabecalhoPagina } from "../componentes/Pagina.jsx";

const ROTULO_DO_ESTADO = { bloqueada: "Bloqueada", disponivel: "Disponível", andamento: "Em andamento", concluida: "Concluída" };
const ICONE_DO_ESTADO = { bloqueada: "cadeado", concluida: "check", disponivel: "seta", andamento: "seta" };

/** O mapa de um protocolo: as sessões em ziguezague, o próximo passo e o atalho para o Kit. */
export function Jornada({ dados, pilar }) {
  const trilha = CATALOGO[pilar];
  const estados = estadosDasSessoes(trilha.sessoes, dados.progresso, pilar);
  const concluidas = estados.filter((estado) => estado === "concluida").length;
  const atual = sessaoAtual(trilha.sessoes, estados);
  // As marcas dependem do texto dos módulos: enquanto ele não chega, o mapa mostra só o progresso.
  const { conteudo } = useConteudo(pilar);
  const idsComDesafio = useMemo(() => Object.fromEntries((conteudo?.sessoes || []).map((s) => [s.id, Object.keys(desafiosDaSessao(s))])), [conteudo]);
  const placarDe = (sessao) => {
    const ids = idsComDesafio[sessao.id] || [];
    return { obtidas: ids.reduce((soma, m) => soma + (dados.dominio?.[chaveSessao(pilar, sessao.id) + ":" + m] || 0), 0), possiveis: ids.length * 3 };
  };
  const placares = trilha.sessoes.map(placarDe);
  const total = placares.reduce((a, b) => ({ obtidas: a.obtidas + b.obtidas, possiveis: a.possiveis + b.possiveis }), { obtidas: 0, possiveis: 0 });

  return <>
    <CabecalhoPagina sobretitulo="UM PASSO DE CADA VEZ" titulo="Sua jornada." descricao="Entenda, coloque em prática e abra o próximo caminho.">
      <span className="registro-pequeno">03 PROTOCOLOS / SEU RITMO</span>
    </CabecalhoPagina>
    <AbasPilares pilar={pilar} />
    <div className="jornada-composicao">
      <section className="mapa-painel" aria-label={"Mapa de " + trilha.nome}>
        <div className="secao-cabeca">
          <div><span className="sobretitulo">MAPA DO PROTOCOLO</span><h2>{trilha.nome}</h2></div>
          <span className="contador">{concluidas}<span> / {trilha.sessoes.length}</span></span>
        </div>
        <div className="mapa-legenda"><span><Icone nome="check" tamanho={16} /> Concluída</span><span><Icone nome="seta" tamanho={16} /> Próximo passo</span><span><Icone nome="cadeado" tamanho={16} /> Bloqueada</span></div>
        <ol className="roadmap">
          {trilha.sessoes.map((sessao, i) => (
            <PassoDoMapa key={sessao.id} sessao={sessao} indice={i} estado={estados[i]} atual={atual?.id === sessao.id} pilar={pilar} placar={placares[i]} confirmadas={dados.progresso[chaveSessao(pilar, sessao.id)]?.modulos?.length || 0} />
          ))}
        </ol>
        <div className="fim-mapa"><Icone nome="medalha" /><span>{concluidas === trilha.sessoes.length ? "Trilha concluída. Suas ferramentas continuam aqui." : "Cada etapa prepara a próxima."}</span></div>
      </section>
      <aside className="jornada-aside">
        {total.possiveis > 0 && <section className="painel painel-marcas">
          <span className="sobretitulo">MARCAS DO PROTOCOLO</span>
          <p className="contador">{total.obtidas}<span> / {total.possiveis}</span></p>
          <progress aria-label="Marcas conquistadas neste protocolo" value={total.obtidas} max={total.possiveis} />
          <p className="texto-secundario">Cada atividade de leitura fecha num desafio, e a seguinte nunca repete o jogo. De primeira vale três marcas.</p>
        </section>}
        <section className="painel">
          <span className="sobretitulo">SEU PRÓXIMO PASSO</span>
          <h2>{atual?.nome || "Jornada concluída"}</h2>
          <p className="texto-secundario">{atual ? "Comece por esta sessão. Seu lugar fica salvo para quando voltar." : "Revise as sessões e siga registrando sua rotina."}</p>
          {atual && <a className="botao primario" href={link("jornada", pilar, atual.id)}>Continuar <Icone nome="seta" /></a>}
        </section>
        <section className="painel">
          <Icone nome="kit" />
          <h2>Na hora de fazer.</h2>
          <p className="texto-secundario">Fichas, guias e fontes sempre à mão, inclusive antes de terminar a jornada.</p>
          <a className="botao secundario" href={link("kit", pilar)}>Abrir meu Kit <Icone nome="seta" /></a>
        </section>
        <p className="nota-lateral">Seu progresso continua aqui depois de uma pausa. Volte a partir de onde parou.</p>
      </aside>
    </div>
  </>;
}

function PassoDoMapa({ sessao, indice, estado, atual, pilar, confirmadas, placar }) {
  const total = modulosDaJornada(sessao).length;
  const detalhe = estado === "andamento" ? confirmadas + " de " + total + " atividades confirmadas"
    : indice === 0 ? "Prepare seu ponto de partida"
    : total + (total === 1 ? " atividade" : " atividades");

  return (
    <li className={"roadmap-passo " + estado} id={"no-" + sessao.id}>
      <a className="roadmap-no" href={link("jornada", pilar, sessao.id)} aria-label={sessao.nome + ". " + ROTULO_DO_ESTADO[estado]}>
        <span className="roadmap-indice">{doisDigitos(indice)}</span>
        <span className="roadmap-texto">
          <span className="sobretitulo">{ROTULO_DO_ESTADO[estado]}{atual ? " · VOCÊ ESTÁ AQUI" : ""}</span>
          <strong>{sessao.nome}</strong>
          <span className="texto-secundario">{detalhe}</span>
          {placar.possiveis > 0 && estado !== "bloqueada" && <span className="roadmap-marcas"><progress aria-hidden="true" value={placar.obtidas} max={placar.possiveis} />{placar.obtidas} / {placar.possiveis} marcas</span>}
        </span>
        <Icone nome={ICONE_DO_ESTADO[estado]} />
      </a>
    </li>
  );
}
