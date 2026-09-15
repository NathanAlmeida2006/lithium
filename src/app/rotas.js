import { useEffect, useRef, useState } from "react";
import { CATALOGO } from "../conteudo/catalogo.js";
import { link } from "../componentes/formato.js";

/**
 * A rota mora no hash (`#/jornada/hipertrofia/s01/modulo-02`): funciona offline,
 * sem servidor que conheça os caminhos, e sem biblioteca de roteamento.
 */
export const NAVEGACAO = [["hoje", "Hoje"], ["jornada", "Jornada"], ["registros", "Registros"], ["kit", "Kit"]];

/** As telas que pertencem a um protocolo e carregam o pilar no caminho. */
export const TELAS_POR_PILAR = ["jornada", "kit"];

export function lerRota() {
  const padrao = document.body.dataset.protocolo, hash = window.location.hash;
  if (!hash) return padrao ? ["jornada", padrao] : ["hoje"];
  if (hash === "#conteudo") return ["hoje"];
  // Os endereços antigos por âncora de sessão (`hipertrofia.html#s03`) continuam abrindo.
  if (/^#s\d{2}/.test(hash) && CATALOGO[padrao]) {
    const sessao = CATALOGO[padrao].sessoes.find((s) => s.numero === Number(hash.slice(2, 4)));
    return ["jornada", padrao, sessao?.id];
  }
  try { return decodeURIComponent(hash.replace(/^#\/?/, "")).split("/"); }
  catch { return ["invalida"]; }
}

/**
 * A rota atual e o caminho de volta. Quem sai de uma atividade para o Kit ganha
 * o "voltar à atividade"; qualquer outra navegação o esquece.
 */
export function useRota(aoNavegar) {
  const [rota, setRota] = useState(lerRota);
  const anterior = useRef(rota), retorno = useRef(null), callback = useRef(aoNavegar);
  callback.current = aoNavegar;

  useEffect(() => {
    const navegar = () => {
      const nova = lerRota();
      const [telaAnterior, , sessaoAnterior] = anterior.current;
      if (nova[0] === "kit" && telaAnterior === "jornada" && sessaoAnterior) retorno.current = link(...anterior.current);
      else if (nova[0] !== "kit") retorno.current = null;
      anterior.current = nova;
      setRota(nova);
      callback.current?.();
    };
    window.addEventListener("hashchange", navegar);
    return () => window.removeEventListener("hashchange", navegar);
  }, []);

  return { rota, retorno: retorno.current };
}
