/**
 * Regras da jornada: em que estado cada sessão está e quando ela pode ser
 * concluída. Puro: não conhece React, armazenamento nem tela.
 */

/** Os módulos que contam para concluir: consulta fica no Kit, fora da trilha. */
export const modulosDaJornada = (sessao) => sessao.modulos.filter((m) => m.tipo !== "consulta");

export const chaveSessao = (pilar, sessao) => pilar + ":" + sessao;

/**
 * O estado de todas as sessões de uma trilha, numa passada. A cadeia é
 * cumulativa: basta uma sessão anterior sem conclusão para bloquear o resto,
 * inclusive em cópia importada ou link direto.
 */
export function estadosDasSessoes(sessoes, progresso, pilar) {
  let anterioresConcluidas = true;
  return sessoes.map((sessao) => {
    const registro = progresso[chaveSessao(pilar, sessao.id)];
    const estado = !anterioresConcluidas ? "bloqueada"
      : registro?.concluidaEm ? "concluida"
      : registro?.modulos?.length ? "andamento"
      : "disponivel";
    anterioresConcluidas &&= Boolean(registro?.concluidaEm);
    return estado;
  });
}

export function estadoSessao(sessoes, progresso, pilar, id) {
  const indice = sessoes.findIndex((s) => s.id === id);
  if (indice < 0) return "bloqueada";
  return estadosDasSessoes(sessoes.slice(0, indice + 1), progresso, pilar)[indice];
}

/** A primeira sessão ainda não concluída: é a única que pode estar aberta. */
export function sessaoAtual(sessoes, estados) {
  const indice = estados.findIndex((estado) => estado === "andamento" || estado === "disponivel");
  return indice < 0 ? undefined : sessoes[indice];
}

export function podeConcluir(sessao, registro, respostaCorreta) {
  return modulosDaJornada(sessao).every((m) => registro?.modulos?.includes(m.id)) && respostaCorreta === true;
}

export function concluirSessao(dados, catalogo, pilar, id, respostaCorreta, agora = new Date().toISOString()) {
  const sessao = catalogo.sessoes.find((s) => s.id === id);
  const chave = chaveSessao(pilar, id);
  if (!sessao || estadoSessao(catalogo.sessoes, dados.progresso, pilar, id) === "bloqueada") throw new Error("Conclua a sessão anterior primeiro.");
  const registro = dados.progresso[chave];
  if (registro?.concluidaEm) return;
  if (!podeConcluir(sessao, registro, respostaCorreta)) throw new Error("Confirme as atividades e responda à revisão antes de concluir.");
  dados.progresso[chave] = { ...registro, concluidaEm: agora };
}
