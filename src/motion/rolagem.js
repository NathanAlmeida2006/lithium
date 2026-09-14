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
 *   - `anchors: true` é o que faz o fast travel do índice (LG-30) funcionar
 *     sem interceptar clique.
 *   - `respectReducedMotion` é da própria biblioteca: ela força o `lerp` para
 *     1 e mantém a instância viva. Não desligue o Lenis para isso.
 *
 * Expõe a velocidade em `--scroll-velocity` (px por quadro), que a marquise
 * consome em CSS.
 */
export function ligarLenis() {
  if (typeof window === "undefined") return () => {};
  const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
  const raiz = document.documentElement;
  lenis.on("scroll", ({ velocity }) => {
    const v = Math.max(-18, Math.min(18, velocity));
    raiz.style.setProperty("--scroll-velocity", v.toFixed(2));
  });
  return () => {
    lenis.destroy();
    raiz.style.removeProperty("--scroll-velocity");
  };
}
