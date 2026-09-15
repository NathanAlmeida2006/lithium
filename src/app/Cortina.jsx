import { useEffect, useState } from "react";
import { semMovimento } from "../motion/tokens.js";

/**
 * TEMPLATE 01 · Cortina de entrada, a do lenis.dev lida pela landing: cortina
 * fixa no acento, letras nascendo abaixo da propria linha
 * (`translateY(100% + indice * 5%)`) e subindo uma a uma em 1,5 s expo-out com
 * 75 ms por indice; aos 1,5 s a cortina sobe e o bloco de letras sobe mais
 * rapido que ela, com a tela ja composta por baixo.
 *
 * Duas diferencas da landing, as duas do app:
 *
 *   - Uma vez por sessao de visita, e nao em toda carga. O conceito do
 *     template diz que ela vale uma vez por visita; no app a recarga e rotina
 *     (voltar do treino, trocar de aba), e cortina a cada volta seria pedagio.
 *   - Sem script inline. O CSP do app nao admite, e nao precisa: a raiz chega
 *     vazia do HTML, entao nao ha tela pre-renderizada para piscar por baixo.
 *
 * `aria-hidden` e `pointer-events: none`: e imagem, nao interface.
 */
const CHAVE = "lithium:cortina";
const LETRAS = [..."LITHIUM"];
const MOSTRAR_EM = 60;
const SAIR_EM = 1500;
const FIM_EM = 3100;

let fimPrevisto = 0;
/** Quanto falta para a cortina comecar a subir. A tela entra junto com ela. */
export function esperaDaCortina() {
  return Math.max(0, fimPrevisto - performance.now());
}

// Uma vez por aparelho, e não por visita: no app a volta é rotina (voltar do
// treino, abrir de novo no dia seguinte), e cortina a cada volta vira pedágio.
function deveMostrar() {
  if (semMovimento()) return false;
  try { return !localStorage.getItem(CHAVE); } catch { return false; }
}

export function Cortina() {
  const [fase, setFase] = useState(() => {
    if (!deveMostrar()) return "fim";
    fimPrevisto = performance.now() + SAIR_EM;
    return "entrar";
  });

  useEffect(() => {
    if (fase === "fim") return;
    try { localStorage.setItem(CHAVE, "1"); } catch { /* Sem armazenamento, ela so repete. */ }
    const relogios = [
      setTimeout(() => setFase("mostrar"), MOSTRAR_EM),
      setTimeout(() => setFase("sair"), SAIR_EM),
      setTimeout(() => setFase("fim"), FIM_EM),
    ];
    return () => relogios.forEach(clearTimeout);
  }, []);

  if (fase === "fim") return null;
  return (
    <div className={"cortina cortina--" + fase} aria-hidden="true">
      <div className="cortina__bloco">
        <span className="cortina__rotulo sobretitulo">(treino · dieta · sono)</span>
        <p className="cortina__titulo">{LETRAS.map((letra, i) => <span className="cortina__letra" style={{ "--index": i }} key={i}>{letra}</span>)}</p>
      </div>
    </div>
  );
}
