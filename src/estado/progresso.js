export const modulosDaJornada = (sessao) => sessao.modulos.filter((m) => m.tipo !== "consulta");
export const chaveSessao = (pilar, sessao) => pilar + ":" + sessao;
export function estadoSessao(sessoes, progresso, pilar, id) {
  const indice = sessoes.findIndex((s) => s.id === id);
  if (indice < 0) return "bloqueada";
  // Verifica a cadeia inteira, inclusive em importações e links diretos.
  if (sessoes.slice(0, indice).some((s) => !progresso[chaveSessao(pilar, s.id)]?.concluidaEm)) return "bloqueada";
  const atual = progresso[chaveSessao(pilar, id)];
  return atual?.concluidaEm ? "concluida" : atual?.modulos?.length ? "andamento" : "disponivel";
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
