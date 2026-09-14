/**
 * O que muda de um protocolo para outro vive aqui, e é só isto.
 *
 * Um app, três protocolos: a diferença entre eles é um acento, um nome e um
 * conjunto de sessões. Nada de fork, nada de `if (protocolo === ...)` espalhado
 * pelo código.
 *
 * O acento é o do mestre visual (§4.4): um por protocolo, nunca dois na mesma
 * superfície.
 */
export const PROTOCOLOS = {
  hipertrofia: {
    id: "hipertrofia",
    nome: "Hipertrofia",
    sub: "O básico bem feito, doze semanas",
    acento: "var(--rubro)",
    // A palavra do dashboard e a classe do painel, lidas do PDF do menu.
    palavra: "Treino",
    chave: "treino",
    paginas: 64,
  },
  dieta: {
    id: "dieta",
    nome: "Dieta básica",
    sub: "Calorias, proteína e o resto",
    acento: "var(--praga)",
    palavra: "Dieta",
    chave: "dieta",
    paginas: 63,
  },
  sono: {
    id: "sono",
    nome: "Cuidado com o sono",
    sub: "A vantagem desleal",
    acento: "var(--vigilia)",
    palavra: "Sono",
    chave: "sono",
    paginas: 61,
  },
};

/** Lê o protocolo do `data-protocolo` do `<body>`, escrito no HTML da página. */
export function protocoloAtual() {
  if (typeof document === "undefined") return null;
  const id = document.body?.dataset?.protocolo;
  return id ? PROTOCOLOS[id] ?? null : null;
}
