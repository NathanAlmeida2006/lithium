import { useEffect, useRef, useState } from "react";
import { doisDigitos, link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { rolarAte } from "../motion/rolagem.js";
import { esperaDaCortina } from "./Cortina.jsx";
import { TELAS_POR_PILAR } from "./rotas.js";

/**
 * O tour: no primeiro acesso um cartão, que não bloqueia a tela, pergunta se a
 * pessoa quer conhecer as quatro telas; depois, o botão "?" da barra de cima
 * abre só o tour da tela aberta. Não é modal: o cartão guia e o fio marca a
 * parte da tela, que continua usável por baixo.
 *
 * A chave tem hífen, e não dois-pontos, de propósito: toda chave `lithium:` é
 * lida como anotação da versão antiga na migração (`dados/repositorio.js`).
 */
const CHAVE = "lithium-tour";

// [seletor do alvo, título, explicação]. Alvo que não existir na hora (lista vazia) só não ganha o fio.
const PASSOS = {
  hoje: [
    [".proxima-acao", "Seus próximos passos", "Cada protocolo mostra a sessão em que você está. Um toque e você volta de onde parou."],
    [".indicadores", "Os três pilares", "Treino, dieta e sono num olhar. Cada cartão tem o atalho para registrar na hora."],
    [".evolucao", "Evolução", "Troque o indicador e o período, de 7 a 30 dias. O gráfico mostra só o que você registrou."],
    [".metas-semana", "Metas da semana", "As metas quem define é você. Uma pausa não apaga o caminho."],
    [".dashboard-grade + .dashboard-grade", "Registros e marcos", "Os últimos registros e as conquistas que o seu caderno já juntou."],
  ],
  jornada: [
    [".abas-pilares", "Os três protocolos", "Troque entre Hipertrofia, Dieta e Sono. Cada um tem a própria trilha."],
    [".mapa-painel", "O mapa", "As sessões em ordem. A próxima abre quando você conclui a atual, e cada atividade de leitura fecha num desafio que vale até três marcas."],
    [".jornada-aside", "Continuar e marcas", "O seu próximo passo, o total de marcas do protocolo e o atalho para o Kit."],
  ],
  sessao: [
    [".sessao-medidor", "Seu avanço na sessão", "A barra mostra as atividades confirmadas e quantas marcas você já ganhou nesta sessão."],
    [".atividade", "A atividade", "Leia, jogue o desafio do fim e confirme para seguir. Errar custa marca, nunca trava."],
    [".atividades-nav", "Todas as atividades", "Pule para qualquer atividade. As lâminas ao lado de cada uma mostram as marcas dela."],
  ],
  registros: [
    [".registro-atalhos", "Registrar", "Treino, refeição, noite ou peso: um toque abre o formulário."],
    [".abas-dados", "Filtrar", "Veja um pilar de cada vez, ou mude o período do histórico."],
    [".lista-registros, .estado-vazio", "O histórico", "Tudo o que você registrou fica aqui. Toque em Editar para corrigir um registro."],
    [".dados-locais", "Seus dados", "Tudo fica neste aparelho. Exporte uma cópia para guardar, ou restaure de um arquivo."],
    [".zona-apagar", "Recomeçar do zero", "No fim da tela fica o botão que apaga todos os dados deste aparelho. Exporte uma cópia antes."],
  ],
  kit: [
    [".consulta-rapida", "Consulta rápida", "Fichas, guias e avisos do protocolo, com busca. Abre mesmo antes de você chegar na sessão."],
    [".consulta-rapida > .botao", "Fontes", "Cada afirmação técnica do protocolo tem de onde veio. A lista abre mesmo sem internet."],
  ],
  // Um recurso aberto do Kit: ficha, guia ou aviso.
  consulta: [
    ["main > .voltar-app", "Voltar à atividade", "Veio de uma sessão da jornada? Este atalho leva de volta para a atividade onde você estava."],
    [".consulta > .voltar-app", "Todos os recursos", "Volta para a lista do Kit, com a busca que você tinha feito."],
    [".consulta > h2", "O recurso aberto", "O mesmo conteúdo da jornada, disponível a qualquer hora, mesmo antes de você chegar na sessão."],
    [".consulta .aprendizado-barra", "Por partes ou inteiro", "Explore o recurso por partes, ou toque para ver o conteúdo inteiro de uma vez."],
    [".consulta .tabela-exploravel", "Itens para explorar", "Toque num item para abrir a ficha dele, ou compare todos lado a lado."],
    [".consulta .mito-mesa", "A afirmação e a explicação", "A ideia em discussão fica em cima. A explicação, com as ressalvas, abre logo abaixo."],
    [".consulta > .botao", "Registrar daqui", "Este recurso tem atalho para o registro: anote sem sair do Kit."],
  ],
  fontes: [
    ["main > .voltar-app", "Voltar à atividade", "Veio de uma sessão da jornada? Este atalho leva de volta para a atividade onde você estava."],
    [".consulta > .voltar-app", "Todos os recursos", "Volta para a lista do Kit, com a busca que você tinha feito."],
    [".consulta > h2", "As fontes", "Cada afirmação técnica do protocolo tem de onde veio. Aqui estão todas as referências dele, disponíveis offline."],
    [".consulta .texto-modulo ol", "A lista numerada", "O número de cada fonte é o número com que o protocolo a cita. Role para ver a lista inteira."],
  ],
};

export function conviteVisto() {
  try { return Boolean(localStorage.getItem(CHAVE)); } catch { return true; }
}

/** Qual tour o botão "?" oferece: dentro de uma sessão, o da sessão; no Kit, o do recurso aberto ou o das fontes. */
export function chaveDoTour(tela, sessao) {
  if (tela === "jornada" && sessao) return "sessao";
  if (tela === "kit" && sessao) return sessao === "fontes" ? "fontes" : "consulta";
  return Object.hasOwn(PASSOS, tela) ? tela : null;
}

const montar = (tela, lista) => lista.map(([alvo, titulo, texto]) => ({ tela, alvo, titulo, texto }));

/**
 * O tour da tela aberta só explica o que ela mostra agora: sem o atalho de
 * volta, sem tabela, sem registro, o passo sai. Tela sem nenhum alvo ainda
 * (conteúdo carregando) fica com todos, para o tour não abrir vazio.
 */
export function tourDaTela(chave) {
  const todos = montar(null, PASSOS[chave]);
  const presentes = todos.filter((passo) => document.querySelector(passo.alvo));
  return { passos: presentes.length ? presentes : todos, i: 0 };
}

/** O tour de primeiro acesso é curto: os dois primeiros passos de cada tela. O resto fica no "?" de cada uma. */
const PASSOS_POR_TELA_NO_GERAL = 2;
export const tourGeral = () => ({ passos: ["hoje", "jornada", "registros", "kit"].flatMap((tela) => montar(tela, PASSOS[tela].slice(0, PASSOS_POR_TELA_NO_GERAL))), i: 0 });

export function ConviteTour({ responder }) {
  // Espera a cortina de entrada subir: o convite não abre em cima da animação.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const relogio = setTimeout(() => setPronto(true), esperaDaCortina() + 400);
    return () => clearTimeout(relogio);
  }, []);

  function escolher(aceitou) {
    try { localStorage.setItem(CHAVE, aceitou ? "aceito" : "recusado"); } catch { /* Sem armazenamento, o convite volta na próxima visita. */ }
    responder(aceitou);
  }

  if (!pronto) return null;
  return (
    <section className="tour-cartao convite-tour" role="dialog" aria-modal="false" aria-labelledby="convite-titulo">
      <div className="tour-cartao-topo">
        <span className="sobretitulo">PRIMEIRA VEZ POR AQUI</span>
        <button className="botao-icone" onClick={() => escolher(false)} aria-label="Fechar convite"><Icone nome="fechar" tamanho={18} /></button>
      </div>
      <h2 id="convite-titulo">Quer um tour rápido?</h2>
      <p>{4 * PASSOS_POR_TELA_NO_GERAL} passos pelas quatro telas: Hoje, Jornada, Registros e Kit. Para ver depois, toque no ? da barra de cima.</p>
      <div className="tour-acoes">
        <button className="botao secundario" data-seta="nenhuma" onClick={() => escolher(false)}>Agora não</button>
        <button className="botao primario" onClick={() => escolher(true)}>Fazer o tour <Icone nome="seta" /></button>
      </div>
    </section>
  );
}

export function Tour({ tour, pilar, rota, mudar, fechar }) {
  const passo = tour.passos[tour.i], total = tour.passos.length, ultimo = tour.i === total - 1;
  const cartao = useRef(null);
  const caminho = rota.join("/");

  useEffect(() => {
    // Passo de outra tela (tour geral): navega, e o efeito roda de novo quando a rota chegar.
    if (passo.tela && (rota[0] !== passo.tela || rota[2])) {
      window.location.hash = link(passo.tela, TELAS_POR_PILAR.includes(passo.tela) && pilar);
      return;
    }
    let alvo = null, tentativas = 0;
    // A tela nova ainda entra (cortina, cascata, rolagem ao topo): espera o alvo existir.
    let relogio = setTimeout(function procurar() {
      alvo = document.querySelector(passo.alvo);
      if (!alvo && ++tentativas < 15) { relogio = setTimeout(procurar, 120); return; }
      if (!alvo) return;
      // Atributo, e não classe: o React reescreve `className` a cada render e apagaria o fio.
      alvo.setAttribute("data-tour-alvo", "");
      rolarAte(alvo);
    }, esperaDaCortina() + 250);
    cartao.current?.focus({ preventScroll: true });
    return () => { clearTimeout(relogio); alvo?.removeAttribute("data-tour-alvo"); };
  }, [tour.i, caminho]);

  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [fechar]);

  return (
    <section key={tour.i} ref={cartao} className="tour-cartao" tabIndex="-1" role="dialog" aria-modal="false" aria-labelledby="tour-titulo" aria-live="polite">
      <div className="tour-cartao-topo">
        <span className="sobretitulo">TOUR · {doisDigitos(tour.i + 1)} / {doisDigitos(total)}</span>
        <button className="botao-icone" onClick={fechar} aria-label="Sair do tour"><Icone nome="fechar" tamanho={18} /></button>
      </div>
      <h2 id="tour-titulo">{passo.titulo}</h2>
      <p>{passo.texto}</p>
      <div className="tour-regua" aria-hidden="true">{tour.passos.map((_, j) => <i key={j} className={j <= tour.i ? "acesa" : undefined} />)}</div>
      <div className="tour-acoes">
        {tour.i > 0 && <button className="botao secundario" data-seta="voltar" onClick={() => mudar(tour.i - 1)}>Anterior</button>}
        <button className="botao primario" onClick={() => (ultimo ? fechar() : mudar(tour.i + 1))}>{ultimo ? "Concluir" : "Próximo"}<Icone nome={ultimo ? "check" : "seta"} /></button>
      </div>
    </section>
  );
}
