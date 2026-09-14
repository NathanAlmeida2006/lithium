import { CATALOGO, PILARES } from "../conteudo/catalogo.js";
import { estadoSessao, chaveSessao, modulosDaJornada } from "../estado/progresso.js";
import { Icone } from "./Icone.jsx";
const rotulos = { bloqueada: "Bloqueada", disponivel: "Disponível", andamento: "Em andamento", concluida: "Concluída" };
export function AbasPilares({ pilar, destino = "jornada" }) {
  return <nav className="abas-pilares" aria-label="Protocolos">{PILARES.map((p) => <a key={p.id} href={"#/" + destino + "/" + p.id} aria-current={pilar === p.id ? "page" : undefined}><Icone nome={p.icone} />{p.nome}</a>)}</nav>;
}
export function MapaJornada({ dados, pilar }) {
  const catalogo = CATALOGO[pilar];
  const completas = catalogo.sessoes.filter((s) => estadoSessao(catalogo.sessoes, dados.progresso, pilar, s.id) === "concluida").length;
  const atual = catalogo.sessoes.find((s) => ["andamento", "disponivel"].includes(estadoSessao(catalogo.sessoes, dados.progresso, pilar, s.id)));
  return <>
    <header className="cabecalho-pagina"><div><p className="sobretitulo">UM PASSO DE CADA VEZ</p><h1 tabIndex="-1">Sua jornada.</h1><p className="texto-secundario">Entenda, coloque em prática e abra o próximo caminho.</p></div><span className="registro-pequeno">03 PROTOCOLOS / SEU RITMO</span></header>
    <AbasPilares pilar={pilar} />
    <div className="jornada-composicao">
      <section className="mapa-painel" aria-label={"Mapa de " + catalogo.nome}>
        <div className="secao-cabeca"><div><span className="sobretitulo">MAPA DO PROTOCOLO</span><h2>{catalogo.nome}</h2></div><span className="contador">{completas}<span> / {catalogo.sessoes.length}</span></span></div>
        <div className="mapa-legenda"><span><Icone nome="check" tamanho={16} /> Concluída</span><span><Icone nome="alvo" tamanho={16} /> Próximo passo</span><span><Icone nome="cadeado" tamanho={16} /> Bloqueada</span></div>
        <ol className="roadmap">
          {catalogo.sessoes.map((s, i) => {
            const estado = estadoSessao(catalogo.sessoes, dados.progresso, pilar, s.id);
            const quantidade = dados.progresso[chaveSessao(pilar, s.id)]?.modulos?.length || 0;
            return <li key={s.id} className={"roadmap-passo " + estado} id={"no-" + s.id}>
              <a className="roadmap-no" href={"#/jornada/" + pilar + "/" + s.id} aria-label={s.nome + ". " + rotulos[estado]}>
                <span className="roadmap-indice">{String(i).padStart(2, "0")}</span>
                <span className="roadmap-texto"><span className="sobretitulo">{rotulos[estado]}{atual?.id === s.id ? " · VOCÊ ESTÁ AQUI" : ""}</span><strong>{s.nome}</strong><span className="texto-secundario">{estado === "andamento" ? quantidade + " de " + modulosDaJornada(s).length + " atividades confirmadas" : i === 0 ? "Prepare seu ponto de partida" : modulosDaJornada(s).length + " atividades"}</span></span>
                <Icone nome={estado === "bloqueada" ? "cadeado" : estado === "concluida" ? "check" : "seta"} />
              </a>
            </li>;
          })}
        </ol>
        <div className="fim-mapa"><Icone nome="medalha" /><span>{completas === catalogo.sessoes.length ? "Trilha concluída. Suas ferramentas continuam aqui." : "Cada etapa prepara a próxima."}</span></div>
      </section>
      <aside className="jornada-aside">
        <section className="painel"><span className="sobretitulo">SEU PRÓXIMO PASSO</span><h2>{atual?.nome || "Jornada concluída"}</h2><p className="texto-secundario">{atual ? "Comece por esta etapa. Seu lugar fica salvo para quando voltar." : "Revise as sessões e siga registrando sua rotina."}</p>{atual && <a className="botao primario" href={"#/jornada/" + pilar + "/" + atual.id}>Continuar <Icone nome="seta" /></a>}</section>
        <section className="painel"><Icone nome="kit" /><h2>Na hora de fazer.</h2><p className="texto-secundario">Fichas, guias e fontes sempre à mão, inclusive antes de terminar a jornada.</p><a className="botao secundario" href={"#/kit/" + pilar}>Abrir meu Kit <Icone nome="seta" /></a></section>
        <p className="nota-lateral">Seu progresso continua aqui depois de uma pausa. Volte a partir de onde parou.</p>
      </aside>
    </div>
  </>;
}
