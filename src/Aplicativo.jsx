import { useEffect, useRef, useState } from "react";
import "./styles/app.css";
import { iniciar, useDados } from "./estado/repositorioLocal.js";
import { CATALOGO } from "./conteudo/catalogo.js";
import { Icone } from "./componentes/Icone.jsx";
import { Dashboard, Registros } from "./componentes/Dashboard.jsx";
import { MapaJornada } from "./componentes/MapaJornada.jsx";
import { FluxoSessao } from "./componentes/FluxoSessao.jsx";
import { KitConsulta } from "./componentes/KitConsulta.jsx";
import { DialogoRegistro, DialogoMetas, DialogoImportar } from "./componentes/DialogoRegistro.jsx";
import { EstadoOffline } from "./componentes/EstadoOffline.jsx";
const navegacao = [["hoje", "Hoje"], ["jornada", "Jornada"], ["registros", "Registros"], ["kit", "Kit"]];
function lerRota() {
  const padrao = document.body.dataset.protocolo, hash = window.location.hash;
  if (!hash) return padrao ? ["jornada", padrao] : ["hoje"];
  if (hash === "#conteudo") return ["hoje"];
  if (/^#s\d{2}/.test(hash) && CATALOGO[padrao]) {
    const sessao = CATALOGO[padrao].sessoes.find((s) => s.numero === Number(hash.slice(2, 4)));
    return ["jornada", padrao, sessao?.id];
  }
  try { return decodeURIComponent(hash.replace(/^#\/?/, "")).split("/"); }
  catch { return ["invalida"]; }
}
export function Aplicativo() {
  const { dados, erro } = useDados();
  const [rota, setRota] = useState(lerRota), [dialogo, setDialogo] = useState(null), [aviso, setAviso] = useState("");
  const [tema, setTema] = useState(() => { try { return localStorage.getItem("lithium:tema") || "sigilo"; } catch { return "sigilo"; } });
  const anterior = useRef(rota), retorno = useRef(null);
  const [tela, candidato, sessao, modulo] = rota;
  const pilar = Object.hasOwn(CATALOGO, candidato || "") ? candidato : "hipertrofia";
  const invalida = (candidato && !Object.hasOwn(CATALOGO, candidato) && ["jornada", "kit"].includes(tela)) || !navegacao.some(([id]) => id === tela);
  useEffect(() => { iniciar(); }, []);
  useEffect(() => {
    const navegar = () => {
      const nova = lerRota();
      if (nova[0] === "kit" && anterior.current[0] === "jornada" && anterior.current[2]) retorno.current = "#/" + anterior.current.join("/");
      else if (nova[0] !== "kit") retorno.current = null;
      anterior.current = nova; setRota(nova); setDialogo(null); setAviso("");
    };
    window.addEventListener("hashchange", navegar);
    return () => window.removeEventListener("hashchange", navegar);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = tema === "cartaz" ? "cartaz" : "";
    try { localStorage.setItem("lithium:tema", tema); } catch { /* Preferência opcional. */ }
  }, [tema]);
  useEffect(() => {
    if (!dados) return;
    document.title = (sessao ? CATALOGO[pilar]?.sessoes.find((s) => s.id === sessao)?.nome || "Jornada" : navegacao.find(([id]) => id === tela)?.[1] || "Lithium") + " · Lithium";
    window.scrollTo({ top: 0, behavior: "instant" });
    const alvo = tela === "kit" && sessao === "fontes" && modulo ? document.getElementById("fonte-" + modulo) : tela === "jornada" && sessao ? document.querySelector(".atividade h2") : null;
    if (alvo) { alvo.tabIndex = -1; alvo.focus({ preventScroll: true }); if (tela === "kit") alvo.scrollIntoView({ block: "center" }); }
    else document.querySelector("main h1")?.focus({ preventScroll: true });
  }, [rota, !!dados]);
  function fechar(mensagem) { setDialogo(null); if (typeof mensagem === "string") setAviso(mensagem); }
  const abrirRegistro = (tipo) => setDialogo({ tipo }), abrirMetas = () => setDialogo({ tipo: "metas" }), editar = (registro) => setDialogo({ tipo: registro.tipo, registro });
  return <div className="app-shell" data-pilar={tela === "jornada" ? pilar : ""}>
    <a className="pular" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById("conteudo").focus(); }}>Pular para o conteúdo</a>
    <aside className="navegacao-lateral">
      <a className="assinatura" href="#/hoje" aria-label="Lithium, início"><span className="wordmark-grupo"><img className="wordmark" src="/lithium-wordmark.svg" alt="Lithium" width="142" height="38" /><small>PROTOCOLOS</small></span></a>
      <p className="sobretitulo nav-rotulo">SEU ESPAÇO</p>
      <nav className="nav-principal" aria-label="Navegação principal">{navegacao.map(([id, nome]) => <a key={id} href={"#/" + id + (["jornada", "kit"].includes(id) ? "/" + pilar : "")} aria-current={tela === id ? "page" : undefined}><Icone nome={id} /><span>{nome}</span>{id === tela && <span className="nav-marca" aria-hidden="true" />}</a>)}</nav>
      <div className="lateral-rodape"><div className="marca-lateral" aria-hidden="true">LI<span>03</span></div><p>Um sistema.<br />Três pilares.</p><span className="registro-pequeno">FEITO PARA A SUA ROTINA</span></div>
    </aside>
    <div className="app-corpo"><header className="barra-superior"><span className="caminho-topo">LITHIUM <span>/</span> {navegacao.find(([id]) => id === tela)?.[1] || "Início"}</span><div className="barra-acoes"><EstadoOffline ocupado={!!dialogo} /><button className="botao-icone" onClick={() => setTema(tema === "cartaz" ? "sigilo" : "cartaz")} aria-label={tema === "cartaz" ? "Ativar tema escuro" : "Ativar tema claro"}><Icone nome={tema === "cartaz" ? "sono" : "alvo"} tamanho={19} /></button><span className="perfil-local" aria-label="Perfil local">EU</span></div></header>
      <main id="conteudo" tabIndex="-1" data-rota={rota.join("/")}>
        {!dados ? <section className="painel carregando"><h1>{erro ? "Vamos recuperar seu espaço." : "Preparando seu espaço…"}</h1><p role={erro ? "alert" : "status"}>{erro || "Carregando os dados deste aparelho."}</p>{erro && <button className="botao primario" onClick={iniciar}>Tentar novamente</button>}</section>
          : invalida ? <section className="painel"><h1 tabIndex="-1">Caminho não encontrado.</h1><a href="#/hoje" className="botao primario">Voltar para hoje</a></section>
          : tela === "hoje" ? <Dashboard dados={dados} abrirRegistro={abrirRegistro} abrirMetas={abrirMetas} editar={editar} />
          : tela === "jornada" ? sessao ? <FluxoSessao key={pilar + sessao} dados={dados} pilar={pilar} id={sessao} moduloId={modulo} registrar={abrirRegistro} /> : <MapaJornada dados={dados} pilar={pilar} />
          : tela === "registros" ? <Registros dados={dados} abrirRegistro={abrirRegistro} editar={editar} />
          : <KitConsulta dados={dados} pilar={pilar} destino={sessao} referencia={modulo} retorno={retorno.current} registrar={abrirRegistro} importar={() => setDialogo({ tipo: "importar" })} />}
        <footer className="rodape-app"><span>LITHIUM / PROTOCOLOS</span><span>O progresso é seu. O ritmo também.</span></footer>
      </main>
    </div>
    <div className="aviso-flutuante" role="status">{aviso && <span><Icone nome="check" tamanho={18} />{aviso}<button className="botao-icone" onClick={() => setAviso("")} aria-label="Fechar mensagem"><Icone nome="fechar" tamanho={16} /></button></span>}</div>
    {dialogo && dados && (dialogo.tipo === "metas" ? <DialogoMetas dados={dados} fechar={fechar} /> : dialogo.tipo === "importar" ? <DialogoImportar fechar={fechar} /> : <DialogoRegistro tipo={dialogo.tipo} registro={dialogo.registro} fechar={fechar} />)}
  </div>;
}
