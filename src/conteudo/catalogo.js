import { useEffect, useState } from "react";
import catalogo from "./catalogo.json";
export const CATALOGO = catalogo;
const carregadores = { hipertrofia: () => import("./hipertrofia.json"), dieta: () => import("./dieta.json"), sono: () => import("./sono.json") };
const cache = {};
export function useConteudo(pilar) {
  const [resultado, setResultado] = useState({ pilar, conteudo: cache[pilar] || null, erro: "" });
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    carregadores[pilar]().then((m) => { cache[pilar] = m.default; if (ativo) setResultado({ pilar, conteudo: m.default, erro: "" }); })
      .catch(() => { if (ativo) setResultado({ pilar, conteudo: null, erro: "Não foi possível abrir o conteúdo. Conecte-se para preparar o pacote offline e tente novamente." }); });
    return () => { ativo = false; };
  }, [pilar, tentativa]);
  return { conteudo: resultado.pilar === pilar ? resultado.conteudo : null, erro: resultado.pilar === pilar ? resultado.erro : "", tentar: () => setTentativa((v) => v + 1) };
}
export const PILARES = [
  { id: "hipertrofia", nome: "Hipertrofia", icone: "treino", descricao: "Construa uma base. Repita. Evolua." },
  { id: "dieta", nome: "Dieta", icone: "dieta", descricao: "O básico que cabe na sua rotina." },
  { id: "sono", nome: "Sono", icone: "sono", descricao: "Dê espaço para a recuperação." },
];
