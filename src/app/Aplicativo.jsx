import { useEffect, useRef, useState } from "react";
import { CATALOGO } from "../conteudo/catalogo.js";
import { iniciar, useDados } from "../dados/repositorio.js";
import { Icone } from "../componentes/Icone.jsx";
import { animarTela, pulsar } from "../motion/revelacao.js";
import { ligarLenis, rolarParaTopo } from "../motion/rolagem.js";
import { DialogoImportar, DialogoMetas, DialogoRegistro } from "../telas/Dialogos.jsx";
import { Hoje } from "../telas/Hoje.jsx";
import { Jornada } from "../telas/Jornada.jsx";
import { Kit } from "../telas/Kit.jsx";
import { Registros } from "../telas/Registros.jsx";
import { Sessao } from "../telas/Sessao.jsx";
import { BarraSuperior, NavegacaoLateral } from "./Casca.jsx";
import { Cortina, esperaDaCortina } from "./Cortina.jsx";
import { NAVEGACAO, TELAS_POR_PILAR, useRota } from "./rotas.js";
import { ConviteTour, Tour, chaveDoTour, conviteVisto, tourDaTela, tourGeral } from "./Tour.jsx";

const PILAR_PADRAO = "hipertrofia";

/**
 * A composição do app: casca, tela da rota, aviso e diálogo. Regra de negócio
 * não mora aqui (ver `dominio/`), nem acesso a dados (ver `dados/`): este
 * arquivo só decide o que aparece e liga o movimento de cada troca de tela.
 */
export function Aplicativo() {
  const { dados, erro } = useDados();
  const [dialogo, setDialogo] = useState(null), [aviso, setAviso] = useState("");
  const { rota, retorno } = useRota(() => { setDialogo(null); setAviso(""); });
  const [tela, candidato, sessao, modulo] = rota;
  const pilar = Object.hasOwn(CATALOGO, candidato || "") ? candidato : PILAR_PADRAO;
  const invalida = (candidato && !Object.hasOwn(CATALOGO, candidato) && TELAS_POR_PILAR.includes(tela)) || !NAVEGACAO.some(([id]) => id === tela);
  const ultimaAnimada = useRef(null);
  const [tour, setTour] = useState(null), [convite, setConvite] = useState(() => !conviteVisto());
  const telaDoTour = chaveDoTour(tela, sessao);

  useEffect(() => { iniciar(); }, []);
  useEffect(() => ligarLenis(), []);
  // O toque no botão responde com um degrau, em qualquer tela (o `pulsar` da landing).
  // Sem clique sonoro genérico: som fica para o que significa algo (acerto, erro, carimbo).
  useEffect(() => {
    const aoTocar = (e) => pulsar(e.target.closest?.(".botao:not(:disabled), .aprendizado button:not(:disabled)"));
    document.addEventListener("pointerdown", aoTocar);
    return () => document.removeEventListener("pointerdown", aoTocar);
  }, []);
  // O aviso é confirmação, não tarefa: some sozinho.
  useEffect(() => {
    if (!aviso) return;
    const relogio = setTimeout(() => setAviso(""), 5000);
    return () => clearTimeout(relogio);
  }, [aviso]);

  useEffect(() => {
    if (!dados) return;
    document.title = tituloDaTela(tela, pilar, sessao);
    rolarParaTopo();
    focarTela(tela, sessao, modulo);
    // Trocar de atividade dentro da mesma sessão só renova o miolo.
    const anterior = ultimaAnimada.current;
    ultimaAnimada.current = rota;
    const soAtividade = Boolean(sessao && anterior && tela === "jornada" && anterior[0] === tela && anterior[1] === candidato && anterior[2] === sessao);
    animarTela(document.getElementById("conteudo"), { atraso: esperaDaCortina(), soAtividade });
  }, [rota, !!dados]);

  function fechar(mensagem) {
    setDialogo(null);
    if (typeof mensagem === "string") setAviso(mensagem);
  }
  const abrirRegistro = (tipo) => setDialogo({ tipo });
  const abrirMetas = () => setDialogo({ tipo: "metas" });
  const editar = (registro) => setDialogo({ tipo: registro.tipo, registro });
  const pularParaConteudo = (e) => { e.preventDefault(); document.getElementById("conteudo").focus(); };

  function telaDaRota() {
    if (!dados) return <Carregando erro={erro} />;
    if (invalida) return <CaminhoInvalido />;
    if (tela === "hoje") return <Hoje dados={dados} abrirRegistro={abrirRegistro} abrirMetas={abrirMetas} editar={editar} />;
    if (tela === "registros") return <Registros dados={dados} abrirRegistro={abrirRegistro} editar={editar} importar={() => setDialogo({ tipo: "importar" })} />;
    if (tela === "jornada") {
      return sessao
        ? <Sessao key={pilar + sessao} dados={dados} pilar={pilar} id={sessao} moduloId={modulo} registrar={abrirRegistro} />
        : <Jornada dados={dados} pilar={pilar} />;
    }
    return <Kit pilar={pilar} destino={sessao} referencia={modulo} retorno={retorno} registrar={abrirRegistro} />;
  }

  return (
    <div className="app-shell" data-pilar={tela === "jornada" ? pilar : ""}>
      <Cortina />
      <a className="pular" href="#conteudo" onClick={pularParaConteudo}>Pular para o conteúdo</a>
      <NavegacaoLateral tela={tela} pilar={pilar} />
      <div className="app-corpo">
        <BarraSuperior ocupado={Boolean(dialogo)} ajuda={dados && !invalida && telaDoTour ? () => setTour(tourDaTela(telaDoTour)) : null} />
        <main id="conteudo" tabIndex="-1" data-rota={rota.join("/")}>
          {telaDaRota()}
          <footer className="rodape-app">
            <span>LITHIUM / PROTOCOLOS</span><span>O progresso é seu. O ritmo também.</span>
          </footer>
        </main>
      </div>
      <div className="aviso-flutuante" role="status">
        {aviso && <span><Icone nome="check" tamanho={18} />{aviso}<button className="botao-icone" onClick={() => setAviso("")} aria-label="Fechar mensagem"><Icone nome="fechar" tamanho={16} /></button></span>}
      </div>
      {dialogo && dados && <DialogoAberto dialogo={dialogo} dados={dados} fechar={fechar} />}
      {convite && dados && !dialogo && <ConviteTour responder={(aceitou) => { setConvite(false); if (aceitou) setTour(tourGeral()); }} />}
      {tour && <Tour tour={tour} pilar={pilar} rota={rota} mudar={(i) => setTour({ ...tour, i })} fechar={() => setTour(null)} />}
    </div>
  );
}

/** O nome da sessão só vale na jornada; no Kit, o recurso aberto não é sessão. */
function tituloDaTela(tela, pilar, sessao) {
  const nome = tela === "jornada" && sessao
    ? CATALOGO[pilar]?.sessoes.find((s) => s.id === sessao)?.nome || "Jornada"
    : NAVEGACAO.find(([id]) => id === tela)?.[1] || "Lithium";
  return nome + " · Lithium";
}

/** O foco vai para onde a leitura começa: a fonte citada, a atividade aberta, ou o título da tela. */
function focarTela(tela, sessao, modulo) {
  const alvo = tela === "kit" && sessao === "fontes" && modulo ? document.getElementById("fonte-" + modulo)
    : tela === "jornada" && sessao ? document.querySelector(".atividade h2")
    : null;
  if (!alvo) {
    document.querySelector("main h1")?.focus({ preventScroll: true });
    return;
  }
  alvo.tabIndex = -1;
  alvo.focus({ preventScroll: true });
  if (tela === "kit") alvo.scrollIntoView({ block: "center" });
}

function Carregando({ erro }) {
  return (
    <section className="painel carregando">
      <h1>{erro ? "Vamos recuperar seu espaço." : "Preparando seu espaço…"}</h1>
      <p role={erro ? "alert" : "status"}>{erro || "Carregando os dados deste aparelho."}</p>
      {erro && <button className="botao primario" onClick={iniciar}>Tentar novamente</button>}
    </section>
  );
}

function CaminhoInvalido() {
  return (
    <section className="painel">
      <h1 tabIndex="-1">Caminho não encontrado.</h1>
      <a href="#/hoje" className="botao primario" data-seta="voltar">Voltar para hoje</a>
    </section>
  );
}

function DialogoAberto({ dialogo, dados, fechar }) {
  if (dialogo.tipo === "metas") return <DialogoMetas dados={dados} fechar={fechar} />;
  if (dialogo.tipo === "importar") return <DialogoImportar fechar={fechar} />;
  return <DialogoRegistro tipo={dialogo.tipo} registro={dialogo.registro} registros={dados.registros} fechar={fechar} />;
}
