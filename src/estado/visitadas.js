import { chaveDe, ler, gravar } from "./anotacao.js";

/**
 * LG-30 · o ponto de estado do mapa de sessões.
 *
 * Mesmo mecanismo da anotação, com a chave `…:<sessao>:visitada`. Não é
 * progresso, é memória: o ponto cheio diz "você já esteve aqui", e nenhuma
 * barra de progresso aparece, porque o mestre visual proíbe.
 */
export function marcarVisitada(protocolo, sessao) {
  if (visitada(protocolo, sessao)) return;
  gravar(chaveDe(protocolo, sessao, "visitada"), true);
}

export function visitada(protocolo, sessao) {
  return ler(chaveDe(protocolo, sessao, "visitada"))?.v === true;
}
