const caminhos = {
  hoje: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  jornada: "M5 4h5v5H5ZM14 15h5v5h-5ZM7.5 9v8h6.5M10 6.5h7V15",
  registros: "M6 3h12v18H6ZM9 7h6M9 11h6M9 15h4",
  kit: "M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 10v4h4v-4",
  treino: "M3 8v8M6 5v14M18 5v14M21 8v8M6 12h12",
  dieta: "M5 3v7M2 3v4a3 3 0 0 0 6 0V3M5 10v11M19 3c-5 4-5 9 0 9V3v18",
  sono: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  seta: "M5 12h14M13 6l6 6-6 6",
  check: "m5 12 4 4L19 6",
  cadeado: "M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  mais: "M12 5v14M5 12h14",
  fechar: "m6 6 12 12M6 18 18 6",
  alvo: "M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6M8 12h8M12 8v8",
  offline: "m3 3 18 18M2 8c5-4 12-4 20 0M5 12c3-3 9-3 14 0M9 16c2-1 4-1 6 0M12 20h.01",
  salvo: "M3 3h15l3 3v15H3ZM7 3v6h10V3M7 21v-8h10v8",
  medalha: "M7 3h10v9l-5 3-5-3ZM9 14l-2 7 5-2 5 2-2-7",
};
export function Icone({ nome, tamanho = 22 }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d={caminhos[nome] || caminhos.alvo} /></svg>;
}
