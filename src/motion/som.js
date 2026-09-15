/**
 * Efeitos sonoros sintetizados na hora pela Web Audio API: nenhum arquivo, nada
 * a baixar, funciona offline. O som segue a assinatura do movimento: corte
 * seco, ataque imediato e cauda curta, nunca melodia.
 *
 * Três travas:
 *   1. O contexto de áudio só nasce depois do primeiro gesto do usuário. Antes
 *      disso, nada toca e o navegador não reclama.
 *   2. Começa desligado: liga na barra superior, e a escolha fica neste aparelho.
 *   3. Som nunca comunica sozinho: tudo o que toca também aparece na tela.
 */
const CHAVE = "lithium:som";
let contexto = null;
// Academia e ônibus não pediram trilha sonora: só toca depois que a pessoa liga.
let ligado = (() => { try { return localStorage.getItem(CHAVE) === "ligado"; } catch { return false; } })();

// [frequência em Hz, duração em s, forma de onda, volume, atraso em s]
const TIMBRES = {
  toque: [[880, 0.035, "square", 0.035]],
  virar: [[520, 0.03, "triangle", 0.06], [780, 0.025, "triangle", 0.04, 0.03]],
  carimbo: [[150, 0.08, "square", 0.08], [75, 0.14, "sine", 0.16]],
  acerto: [[660, 0.07, "triangle", 0.08], [990, 0.12, "triangle", 0.08, 0.075]],
  erro: [[220, 0.1, "sawtooth", 0.04], [165, 0.14, "sawtooth", 0.04, 0.09]],
};

export const somLigado = () => ligado;

export function alternarSom() {
  ligado = !ligado;
  try { localStorage.setItem(CHAVE, ligado ? "ligado" : "desligado"); } catch { /* Preferência opcional. */ }
  if (ligado) tocar("acerto");
  return ligado;
}

export function tocar(nome) {
  if (!ligado || typeof window === "undefined" || !window.AudioContext) return;
  if (!contexto && !navigator.userActivation?.hasBeenActive) return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") contexto.resume();
    const agora = contexto.currentTime;
    for (const [frequencia, duracao, forma, volume, atraso = 0] of TIMBRES[nome] || []) {
      const oscilador = contexto.createOscillator(), ganho = contexto.createGain();
      const inicio = agora + atraso;
      oscilador.type = forma;
      oscilador.frequency.setValueAtTime(frequencia, inicio);
      ganho.gain.setValueAtTime(volume, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
      oscilador.connect(ganho).connect(contexto.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracao + 0.02);
    }
  } catch { /* Sem áudio, a interface continua inteira. */ }
}
