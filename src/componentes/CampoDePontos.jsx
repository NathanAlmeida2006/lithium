import { useEffect, useRef } from "react";
import { semMovimento } from "../motion/tokens.js";

/**
 * O campo de pontos da landing (`CampoDePontos.jsx`), so a variante `malha`:
 * grade regular com deslocamento senoidal, ponto de 1 bit em `--bone`, fio em
 * `--line`, nenhuma cor propria. Aqui mora atras do grafico vazio, onde o
 * primeiro registro ainda nao existe e a superficie parada lia como defeito.
 *
 * Carrega a mesma pendencia do TR-03 ("faisca ou particula"). Reprovado o
 * teste, o conserto e trocar o componente por `null` em `Dashboard.jsx`.
 *
 * As tres travas de custo da landing: so anima na tela, movimento reduzido
 * pinta um quadro e para, densidade com teto.
 */
const ESPACO = 22;
const MAX_PONTOS = 1400;

export function CampoDePontos() {
  const tela = useRef(null);

  useEffect(() => {
    const canvas = tela.current, ctx = canvas?.getContext("2d");
    if (!ctx) return;
    let largura = 0, altura = 0, espaco = ESPACO, corPonto = "", quadro = 0, vivo = false;

    const cores = () => { corPonto = getComputedStyle(canvas).getPropertyValue("--bone").trim() || "#ededf0"; };
    const medir = () => {
      const caixa = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = Math.max(1, Math.round(caixa.width)); altura = Math.max(1, Math.round(caixa.height));
      canvas.width = largura * dpr; canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      espaco = ESPACO;
      while ((largura / espaco) * (altura / espaco) > MAX_PONTOS) espaco += 2;
      cores();
    };
    // A mesma conta manda no deslocamento e na opacidade: ponto alto aparece,
    // ponto baixo some, e a malha le como relevo em vez de chuvisco.
    const pintar = (t) => {
      ctx.clearRect(0, 0, largura, altura);
      ctx.fillStyle = corPonto;
      for (let x = espaco / 2; x < largura; x += espaco) {
        for (let y = espaco / 2; y < altura; y += espaco) {
          const onda = Math.sin(x * 0.011 + t * 0.00042) * Math.cos(y * 0.013 - t * 0.00031) + Math.sin((x + y) * 0.006 + t * 0.00019);
          const alpha = 0.05 + Math.max(0, onda) * 0.3;
          if (alpha <= 0.07) continue;
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.round(x), Math.round(y + onda * 7), 1.5, 1.5);
        }
      }
      ctx.globalAlpha = 1;
    };
    // Parado, repinta o ultimo instante: sob movimento reduzido o quadro unico
    // nao pode mudar so porque a janela ou o tema mudaram.
    let instante = 0;
    const laco = (t) => { if (!vivo) return; instante = t; pintar(t); quadro = requestAnimationFrame(laco); };

    medir(); pintar(instante);
    const aoRedimensionar = () => { medir(); if (!vivo) pintar(instante); };
    window.addEventListener("resize", aoRedimensionar, { passive: true });
    // O tema troca no `html`; a cor do ponto precisa acompanhar.
    const tema = new MutationObserver(() => { cores(); if (!vivo) pintar(instante); });
    tema.observe(document.documentElement, { attributeFilter: ["data-theme"] });

    let obs = null;
    if (!semMovimento() && "IntersectionObserver" in window) {
      obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !vivo) { vivo = true; quadro = requestAnimationFrame(laco); }
        else if (!e.isIntersecting && vivo) { vivo = false; cancelAnimationFrame(quadro); }
      });
      obs.observe(canvas);
    }
    return () => { vivo = false; cancelAnimationFrame(quadro); obs?.disconnect(); tema.disconnect(); window.removeEventListener("resize", aoRedimensionar); };
  }, []);

  return <canvas className="campo-pontos" ref={tela} aria-hidden="true" />;
}
