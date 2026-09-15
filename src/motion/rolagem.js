import Lenis from "lenis";

/**
 * Lenis, com os defaults do estúdio que o escreveu: `lerp 0.1`, `anchors:
 * true`, `autoRaf: true`. Não invente valores; foram calibrados em milhões de
 * sessões.
 *
 * Três coisas que importam, e valem ainda mais no app que na landing:
 *
 *   - `syncTouch` fica em `false`, então no celular a rolagem é a do sistema,
 *     com o momentum do próprio iOS e Android. O Lenis só assume roda e
 *     trackpad. O app é principalmente celular: sequestrar o toque nativo é a
 *     forma mais rápida de um app parecer site.
 *   - `anchors` fica desligado: as rotas do app são hash (`#/hoje`), não
 *     âncora de seção, e o Lenis leria cada uma como alvo inexistente.
 *   - `respectReducedMotion` é da própria biblioteca: ela força o `lerp` para
 *     1 e mantém a instância viva. Não desligue o Lenis para isso.
 *
 */
let instancia = null;

export function ligarLenis() {
  if (typeof window === "undefined") return () => {};
  const lenis = instancia = new Lenis({ autoRaf: true, lerp: 0.1 });
  return () => {
    lenis.destroy();
    if (instancia === lenis) instancia = null;
  };
}

/**
 * Topo sem suavizar, na troca de tela. Pelo Lenis quando ele existe: um
 * `window.scrollTo` no meio de uma inércia de roda seria desfeito no quadro
 * seguinte, com o Lenis voltando ao alvo antigo.
 */
export function rolarAte(alvo) {
  // Cabe na tela: fica no meio. Mais alto que ela: o topo aparece, com folga.
  const altura = alvo.getBoundingClientRect().height;
  const offset = altura < window.innerHeight * 0.6 ? -(window.innerHeight - altura) / 2 : -24;
  if (instancia) instancia.scrollTo(alvo, { offset, force: true });
  else alvo.scrollIntoView({ block: altura < window.innerHeight * 0.6 ? "center" : "start" });
}

export function rolarParaTopo() {
  if (instancia) instancia.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: "instant" });
}
