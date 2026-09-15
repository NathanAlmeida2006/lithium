import { useEffect, useState } from "react";
import { link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { semMovimento } from "../motion/tokens.js";
import { EstadoOffline } from "./EstadoOffline.jsx";
import { NAVEGACAO, TELAS_POR_PILAR } from "./rotas.js";

const CHAVE_DO_TEMA = "lithium:tema";

/** A navegação principal: lateral no monitor, barra na base do celular (interface.css). */
export function NavegacaoLateral({ tela, pilar }) {
  return (
    <aside className="navegacao-lateral">
      <a className="assinatura" href="#/hoje" aria-label="Lithium, início">
        <span className="wordmark-grupo"><img className="wordmark" src="/lithium-wordmark.svg" alt="Lithium" width="142" height="38" /><small>PROTOCOLOS</small></span>
      </a>
      <p className="sobretitulo nav-rotulo">SEU ESPAÇO</p>
      <nav className="nav-principal" aria-label="Navegação principal">
        {NAVEGACAO.map(([id, nome]) => (
          <a key={id} href={link(id, TELAS_POR_PILAR.includes(id) && pilar)} aria-current={tela === id ? "page" : undefined}>
            <Icone nome={id} /><span>{nome}</span>{id === tela && <span className="nav-marca" aria-hidden="true" />}
          </a>
        ))}
      </nav>
      <div className="lateral-rodape">
        <div className="marca-lateral" aria-hidden="true">LI<span>03</span></div>
        <p>Um sistema.<br />Três pilares.</p>
        <span className="registro-pequeno">FEITO PARA A SUA ROTINA</span>
      </div>
    </aside>
  );
}

export function BarraSuperior({ tela, ocupado }) {
  const [tema, alternarTema] = useTema();
  const cartaz = tema === "cartaz";
  return (
    <header className="barra-superior">
      <span className="caminho-topo">LITHIUM <span>/</span> {NAVEGACAO.find(([id]) => id === tela)?.[1] || "Início"}</span>
      <div className="barra-acoes">
        <EstadoOffline ocupado={ocupado} />
        <button className="botao-icone" onClick={alternarTema} aria-label={cartaz ? "Ativar tema escuro" : "Ativar tema claro"}><Icone nome={cartaz ? "sono" : "alvo"} tamanho={19} /></button>
        <span className="perfil-local" aria-label="Perfil local">EU</span>
      </div>
    </header>
  );
}

/**
 * Sigilo (escuro) ou Cartaz (claro), lembrado neste aparelho. A troca é em
 * corte: o papel novo cai de cima em três degraus (`movimento.css`).
 */
function useTema() {
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem(CHAVE_DO_TEMA) || "sigilo"; } catch { return "sigilo"; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = tema === "cartaz" ? "cartaz" : "";
    try { localStorage.setItem(CHAVE_DO_TEMA, tema); } catch { /* Preferência opcional. */ }
  }, [tema]);

  function alternar() {
    const novo = tema === "cartaz" ? "sigilo" : "cartaz";
    // O atributo muda dentro da transição, e não no efeito: é o quadro novo que ela fotografa.
    const aplicar = () => { document.documentElement.dataset.theme = novo === "cartaz" ? "cartaz" : ""; setTema(novo); };
    if (document.startViewTransition && !semMovimento()) document.startViewTransition(aplicar);
    else aplicar();
  }

  return [tema, alternar];
}
