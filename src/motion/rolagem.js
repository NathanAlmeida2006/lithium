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
 * Expõe a velocidade em `--scroll-velocity` (px por quadro), que a marquise
 * consome em CSS.
 */
let instancia = null;

export function ligarLenis() {
  if (typeof window === "undefined") return () => {};
  const lenis = instancia = new Lenis({ autoRaf: true, lerp: 0.1 });
  const raiz = document.documentElement;
  lenis.on("scroll", ({ velocity }) => {
    const v = Math.max(-18, Math.min(18, velocity));
    raiz.style.setProperty("--scroll-velocity", v.toFixed(2));
  });
  return () => {
    lenis.destroy();
    if (instancia === lenis) instancia = null;
    raiz.style.removeProperty("--scroll-velocity");
  };
}

/**
 * Topo sem suavizar, na troca de tela. Pelo Lenis quando ele existe: um
 * `window.scrollTo` no meio de uma inércia de roda seria desfeito no quadro
 * seguinte, com o Lenis voltando ao alvo antigo.
 */
export function rolarParaTopo() {
  if (instancia) instancia.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo({ top: 0, behavior: "instant" });
}
