/**
 * O vocabulario de movimento da fluor-landing (`src/motion/index.js`), trazido
 * para o app. Mesmos dois idiomas, e a mesma regra que os separa:
 *
 *   - REVELACAO DE MARCA e corte seco, em `steps()`: card que entra, numero que
 *     carimba, palavra que acende.
 *   - MOVIMENTO DE LAYOUT e continuo, em expo-out: titulo subindo do recorte,
 *     traco desenhando, a rolagem do Lenis.
 *
 * As tres travas da landing valem igual:
 *
 *   1. Com `prefers-reduced-motion` tudo vira opacidade.
 *   2. O estado inicial e escrito por JS. Sem JS o app nao existe, mas o
 *      conteudo nunca depende de animacao para ser lido.
 *   3. Nada fica preso invisivel: o gatilho e IntersectionObserver, com
 *      varredura na rolagem e rede de seguranca no fim.
 *
 * Uma diferenca, e ela e do app: aqui o React e dono do texto. Nada neste
 * arquivo reescreve filhos de um no (nada de `splitText`): so `style` e classe.
 * Um titulo que o React atualiza depois de fatiado continuaria mostrando o
 * texto velho, e o defeito seria silencioso.
 */
import { animate, createDrawable, onScroll, stagger, steps, utils } from "animejs";
import { duracao, semMovimento } from "./tokens.js";

// A curva do Lenis (1.001 - 2^(-10t)), para rolagem e revelacao pesarem igual.
const EXPO = "cubicBezier(0.16, 1, 0.3, 1)";

/* -------------------------------------------------------------------------
   Gatilho
   ------------------------------------------------------------------------- */

let observador = null;
const pendentes = new Map();

function disparar(alvo) {
  const acao = pendentes.get(alvo);
  if (!acao) return;
  pendentes.delete(alvo);
  observador?.unobserve(alvo);
  acao();
}

// O observador perde callback em rolagem rapida; a varredura cobre o que ja
// passou pela tela, e nao so o que esta nela (licao medida na landing).
let relogio = 0;
function varrer() {
  for (const alvo of [...pendentes.keys()]) {
    if (!alvo.isConnected) pendentes.delete(alvo);
    else if (alvo.getBoundingClientRect().top < window.innerHeight) disparar(alvo);
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => {
    if (!pendentes.size) return;
    clearTimeout(relogio);
    relogio = setTimeout(varrer, 120);
  }, { passive: true });
}

function aoEntrar(alvo, executar) {
  if (!alvo) return;
  if (!("IntersectionObserver" in window)) return executar();
  observador ??= new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) disparar(e.target);
  });
  pendentes.set(alvo, executar);
  observador.observe(alvo);
}

/* -------------------------------------------------------------------------
   Revelacao
   ------------------------------------------------------------------------- */

/** Aparicao em corte seco. `imediato` e para o que ja esta na tela. */
export function revelar(alvo, { atraso = 0, deslocamento = 12, imediato = false } = {}) {
  if (!alvo) return;
  const reduzido = semMovimento();
  utils.set(alvo, { opacity: 0, y: reduzido ? 0 : deslocamento });
  alvo.dataset.revelar = "";
  const tocar = () => animate(alvo, {
    opacity: [0, 1],
    y: reduzido ? 0 : [deslocamento, 0],
    duration: duracao(reduzido ? "--motion-fast" : "--motion-base"),
    delay: atraso,
    ease: reduzido ? "linear" : steps(2),
  });
  imediato ? tocar() : aoEntrar(alvo, tocar);
}

/**
 * Cascata com gatilho POR ITEM: uma lista longa nao cabe na tela, e disparar
 * tudo pelo primeiro animaria no vazio o que esta tres telas abaixo. O
 * escalonamento para no quarto item, senao o fim da lista chega atrasado.
 */
export function revelarEmCascata(alvos, { atraso = 0, intervalo = 60, lado = false } = {}) {
  const reduzido = semMovimento();
  for (const [i, item] of Array.from(alvos ?? []).entries()) {
    // `lado`: o ziguezague do roadmap entra pelo lado de onde o card esta.
    // Deslocamento de layout, por isso contínuo; a opacidade continua em corte.
    const x = lado && !reduzido ? (i % 2 ? 24 : -24) : 0;
    const y = reduzido ? 0 : 10;
    utils.set(item, { opacity: 0, x, y });
    item.dataset.revelar = "";
    aoEntrar(item, () => {
      const inicio = atraso + (reduzido ? 0 : Math.min(i, 3) * intervalo);
      animate(item, {
        opacity: { to: 1, ease: reduzido ? "linear" : steps(2), duration: duracao(reduzido ? "--motion-fast" : "--motion-base") },
        x: { to: 0, ease: EXPO, duration: 640 },
        y: { to: 0, ease: EXPO, duration: 640 },
        delay: inicio,
      });
    });
  }
}

/**
 * O titulo sobe de dentro do proprio recorte. Na landing isso e `subirLinhas`,
 * com um `span` por linha; aqui o recorte e `clip-path` no proprio titulo, para
 * nao tocar nos filhos que o React controla. Limpa o recorte no fim: `inset`
 * zero comeria acento e haste.
 */
export function subirTitulo(alvo, { atraso = 0, imediato = true } = {}) {
  if (!alvo) return;
  if (semMovimento()) return revelar(alvo, { atraso, deslocamento: 0, imediato });
  alvo.dataset.revelar = "";
  utils.set(alvo, { opacity: 1, y: "0.6em", clipPath: "inset(0% 0% 100% 0%)" });
  const tocar = () => animate(alvo, {
    y: ["0.6em", "0em"],
    clipPath: ["inset(0% 0% 100% 0%)", "inset(-30% -5% -30% -5%)"],
    duration: 780,
    delay: atraso,
    ease: EXPO,
    onComplete: () => { alvo.style.clipPath = ""; },
  });
  imediato ? tocar() : aoEntrar(alvo, tocar);
}

/** O carimbo: tres degraus na duracao de celebracao. Reservado a numero e conquista. */
export function carimbar(alvo, { atraso = 0, imediato = false, girar = 0 } = {}) {
  if (!alvo) return;
  const reduzido = semMovimento();
  // Carimbo nunca cai reto: entra torto e assenta (selo de garantia, T09).
  utils.set(alvo, { opacity: 0, scale: reduzido ? 1 : 1.14, rotate: reduzido ? 0 : girar });
  alvo.dataset.revelar = "";
  const tocar = () => animate(alvo, {
    opacity: [0, 1],
    scale: reduzido ? 1 : [1.14, 1],
    rotate: reduzido ? 0 : [girar, 0],
    duration: duracao(reduzido ? "--motion-fast" : "--motion-celebracao"),
    delay: atraso,
    ease: reduzido ? "linear" : steps(3),
  });
  imediato ? tocar() : aoEntrar(alvo, tocar);
}

/** Desenha tracos de SVG. Sob movimento reduzido o traco so aparece. */
export function desenhar(alvos, { atraso = 0, tempo, imediato = false } = {}) {
  const lista = Array.from(alvos ?? []).filter(Boolean);
  if (!lista.length) return;
  const reduzido = semMovimento();
  if (reduzido) utils.set(lista, { opacity: 0 });
  const tocar = () => reduzido
    ? animate(lista, { opacity: [0, 1], duration: duracao("--motion-fast"), delay: atraso, ease: "linear" })
    : animate(createDrawable(lista), { draw: ["0 0", "0 1"], duration: tempo ?? duracao("--motion-slow") * 2, delay: stagger(40, { start: atraso }), ease: "out(2)" });
  imediato ? tocar() : aoEntrar(lista[0], tocar);
}

/**
 * Acende um a um, a fronteira no acento. Na landing o avanco e ligado a
 * rolagem; aqui a tela de hoje cabe inteira, entao o relogio faz o papel da
 * rolagem. Sob movimento reduzido tudo nasce aceso.
 */
export function acenderEmSequencia(alvos, { atraso = 0, passo = 110, classe = "palavra--acesa", classeAtual = null, raiz = null } = {}) {
  const lista = Array.from(alvos ?? []);
  if (!lista.length) return;
  if (semMovimento()) return;
  raiz?.setAttribute("data-acendendo", "");
  for (const el of lista) el.classList.remove(classe, classeAtual);
  const estado = { avanco: 0 };
  let ultimo = -1;
  animate(estado, {
    avanco: [0, lista.length + 1],
    duration: (lista.length + 1) * passo,
    delay: atraso,
    ease: "linear",
    onUpdate: () => {
      const acesas = Math.min(lista.length, Math.floor(estado.avanco));
      if (acesas === ultimo) return;
      ultimo = acesas;
      for (const [i, el] of lista.entries()) {
        el.classList.toggle(classe, i < acesas);
        if (classeAtual) el.classList.toggle(classeAtual, i === acesas - 1 && estado.avanco < lista.length);
      }
    },
    onComplete: () => {
      raiz?.removeAttribute("data-acendendo");
      if (classeAtual) for (const el of lista) el.classList.remove(classeAtual);
    },
  });
}

/** Resposta ao toque. Um degrau: e confirmacao, nao animacao. */
export function pulsar(alvo) {
  if (!alvo || semMovimento()) return;
  animate(alvo, { scale: [1, 0.97, 1], duration: duracao("--motion-fast"), ease: steps(2) });
}

/* -------------------------------------------------------------------------
   Rede de seguranca
   ------------------------------------------------------------------------- */

/** Qualquer `[data-revelar]` ainda apagado dentro da tela volta a aparecer. */
export function garantirVisibilidade(prazo = 2500) {
  clearTimeout(garantirVisibilidade.relogio);
  garantirVisibilidade.relogio = setTimeout(() => {
    for (const el of document.querySelectorAll("[data-revelar]")) {
      const caixa = el.getBoundingClientRect();
      if (caixa.top < window.innerHeight && caixa.bottom > 0 && parseFloat(getComputedStyle(el).opacity) < 0.99) {
        utils.set(el, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 });
        el.style.clipPath = "";
      }
    }
    // Manchete na tela sem nenhuma palavra acesa: o gatilho falhou, e ela acende inteira.
    for (const el of document.querySelectorAll("[data-acendendo]")) {
      const caixa = el.getBoundingClientRect();
      if (caixa.top < window.innerHeight && caixa.bottom > 0 && !el.querySelector(".palavra--acesa")) el.removeAttribute("data-acendendo");
    }
  }, prazo);
}

/* -------------------------------------------------------------------------
   Movimento ligado a rolagem
   ------------------------------------------------------------------------- */

/**
 * O `parallaxe` da landing, com teto menor: no card o ornamento desliza dentro
 * do proprio recorte, e o recorte e pequeno. Movimento de layout, entao
 * continuo. Ornamento que nao anima continua no lugar; por isso a rolagem
 * pode ser o gatilho aqui, e nunca numa revelacao.
 */
export function parallaxe(alvo, { fator = 0.06, teto = 28 } = {}) {
  if (!alvo || semMovimento()) return;
  const curso = Math.min(Math.round(window.innerHeight * fator), teto);
  return animate(alvo, {
    y: [curso, -curso],
    ease: "linear",
    autoplay: onScroll({ enter: "bottom top", leave: "top bottom", sync: 0.35 }),
  });
}

/* -------------------------------------------------------------------------
   Os cards de aprendizado
   ------------------------------------------------------------------------- */

/**
 * A manchete que acende: as palavras do manifesto da landing, uma a uma, com a
 * da fronteira no acento. Dispara quando entra na tela, nunca antes; sob
 * movimento reduzido nasce inteira acesa.
 */
export function acenderManchetes(raiz) {
  if (!raiz || semMovimento()) return;
  for (const manchete of raiz.querySelectorAll(".manchete")) {
    const palavras = manchete.querySelectorAll(".palavra");
    if (!palavras.length) continue;
    manchete.setAttribute("data-acendendo", "");
    aoEntrar(manchete, () => acenderEmSequencia(palavras, {
      atraso: 160,
      passo: Math.max(30, Math.min(90, 1400 / palavras.length)),
      classeAtual: "palavra--atual",
      raiz: manchete,
    }));
  }
  garantirVisibilidade(4000);
}

// Grupo disjunto do `LINHAS` de `animarTela`: blockquote e linha de tabela sao dela.
const PECAS_DO_CARD = [
  ".aprendizado-instrucao", ".mapa-conceito-pecas > button", ".conceito-desafio > div > button",
  ".trechos-trilho > button", ".trecho-conteudo", ".trechos-rodape", ".tabela-comando", ".tabela-seletor > button",
  ".mito-mesa > :not(.mito-explicacao)", ".cuidado-grupo", ".cuidados-selo",
  ".aprendizado-conteudo > .texto-modulo > :is(p, ul, ol)", ".explorador > .texto-modulo > :is(p:not(.manchete), ul, ol)",
].join(",");

/**
 * A coreografia de um card, na ordem de `abrirPainel`: o titulo do diagrama
 * sobe do recorte, as pecas entram em cascata conforme a rolagem as alcanca,
 * os cantos da moldura se desenham e a manchete acende. Os ornamentos grandes
 * (numero do trecho, sinal do mito) ficam ligados a rolagem. Devolve a limpeza
 * do que segue a rolagem.
 */
export function animarCard(raiz) {
  if (!raiz) return;
  const q = (s) => raiz.querySelectorAll(s);
  subirTitulo(raiz.querySelector(".mapa-conceito-titulo"), { imediato: false });
  revelarEmCascata(q(PECAS_DO_CARD), { intervalo: 50 });
  desenhar(q(".moldura-card path"), { atraso: 240, tempo: 620 });
  desenhar(q(".cuidados-selo path"), { atraso: 120 });
  acenderManchetes(raiz);
  const lacos = [...q(".trecho-numero, .mito-sinal")].map((el) => parallaxe(el)).filter(Boolean);
  garantirVisibilidade();
  return () => { for (const laco of lacos) laco.revert(); };
}

/* -------------------------------------------------------------------------
   A coreografia de uma tela
   ------------------------------------------------------------------------- */

// Grupos disjuntos: um elemento em dois grupos seria zerado duas vezes.
const CARTOES = [
  ".carregando", ".proxima-acao", ".indicador", ".dashboard-grade > .painel", ".registro-atalhos > .botao",
  ".resumo-peso", "main > .painel", ".mapa-painel", ".jornada-aside > *", ".atividades-nav > a",
  ".atividade", ".kit-grade > .painel", ".kit-grade > aside > .painel", ".consulta", ".legado", ".etapa-bloqueada",
].join(",");
const LINHAS = ".lista-registros > li, .kit-lista > li, .tarefa, .opcao, .tabela-adaptada tbody tr, .texto-modulo blockquote";

/**
 * A ordem de `abrirPainel` na landing, lida como ordem de leitura: rotulo,
 * titulo subindo, o resto do cabecalho, os cartoes em cascata, e so entao os
 * numeros carimbando. `soAtividade` e a troca de atividade dentro da mesma
 * sessao: la so o miolo entra de novo, o menu ao lado nao pisca a cada passo.
 */
export function animarTela(main, { atraso = 0, soAtividade = false } = {}) {
  if (!main) return;
  const q = (s) => main.querySelectorAll(s);
  // O que a tela anterior deixou esperando rolagem ja saiu do documento.
  for (const alvo of [...pendentes.keys()]) if (!alvo.isConnected) { observador?.unobserve(alvo); pendentes.delete(alvo); }

  if (soAtividade) {
    const atividade = main.querySelector(".atividade");
    revelar(atividade, { atraso, imediato: true, deslocamento: 16 });
    subirTitulo(atividade?.querySelector("h2"), { atraso: atraso + 60 });
    revelarEmCascata(atividade?.querySelectorAll(LINHAS), { atraso: atraso + 180 });
    garantirVisibilidade(atraso + 2500);
    return;
  }

  for (const el of q("main > .voltar-app, .cabecalho-pagina .sobretitulo")) revelar(el, { atraso: atraso + 60, imediato: true });
  subirTitulo(main.querySelector("h1"), { atraso: atraso + 120 });
  for (const [i, el] of [...q(".cabecalho-pagina > :not(div), .cabecalho-pagina > div > .texto-secundario, .abas-pilares")].entries()) {
    revelar(el, { atraso: atraso + 320 + i * 60, imediato: true });
  }

  revelarEmCascata(q(CARTOES), { atraso: atraso + 260 });
  revelarEmCascata(q(".roadmap-passo"), { atraso: atraso + 200, lado: true });
  revelarEmCascata(q(LINHAS), { atraso: atraso + 420, intervalo: 45 });

  // Carimbo: so numero e conquista, e so depois do cartao que os carrega.
  for (const el of q(".indicador-valor, .contador")) carimbar(el, { atraso: atraso + 520 });
  for (const el of q(".marco.conquistado > svg")) carimbar(el, { atraso: atraso + 620, girar: -8 });

  // A regua da semana (T06): os dias registrados acendem em sequencia.
  for (const pontos of q(".semana-pontos")) {
    const acesos = pontos.querySelectorAll(".preenchido");
    utils.set(acesos, { opacity: semMovimento() ? 1 : 0.16 });
    aoEntrar(pontos, () => animate(acesos, {
      opacity: [0.16, 1], duration: duracao("--motion-fast"), delay: stagger(70, { start: atraso + 640 }), ease: steps(2),
    }));
  }

  const hero = main.querySelector(".hero-texto");
  if (hero) acenderEmSequencia(hero.querySelectorAll(".palavra"), { atraso: atraso + 240, classeAtual: "palavra--atual", raiz: hero });

  desenhar(document.querySelectorAll(".nav-principal a[aria-current] path"), { imediato: true, atraso: atraso + 100 });
  garantirVisibilidade(atraso + 2500);
}

/**
 * Etapa concluida: o selo de garantia (T09) aplicado a conquista. A medalha se
 * desenha, o titulo cai torto e assenta em tres degraus, e so entao as saidas.
 */
export function celebrar(secao) {
  if (!secao) return;
  desenhar(secao.querySelectorAll(":scope > svg path"), { imediato: true, tempo: 700 });
  carimbar(secao.querySelector("h1"), { imediato: true, atraso: 420, girar: -2 });
  revelarEmCascata(secao.querySelectorAll(":scope > p, .acoes-form > *"), { atraso: 640 });
  garantirVisibilidade();
}
