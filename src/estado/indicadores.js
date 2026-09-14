export function dataLocal(data = new Date()) {
  return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
}
export function diasDoPeriodo(quantidade = 7, fim = dataLocal()) {
  const data = new Date(fim + "T12:00:00");
  return Array.from({ length: quantidade }, (_, i) => {
    const dia = new Date(data); dia.setDate(dia.getDate() - quantidade + i + 1); return dataLocal(dia);
  });
}
export function inicioSemana(dia = dataLocal()) {
  const data = new Date(dia + "T12:00:00");
  data.setDate(data.getDate() - ((data.getDay() + 6) % 7));
  return dataLocal(data);
}
export function tempoNaCama(noite) {
  const minutos = (Date.parse(noite.levantouEm || noite.levantou) - Date.parse(noite.deitouEm || noite.deitou)) / 60000;
  return Number.isFinite(minutos) && minutos > 0 && minutos <= 24 * 60 ? minutos / 60 : null;
}
export function resumir(dados, dias = 7, hoje = dataLocal()) {
  const periodo = diasDoPeriodo(dias, hoje);
  const noPeriodo = (r) => periodo.includes(r.data);
  const treinos = dados.registros.filter((r) => r.tipo === "treino" && noPeriodo(r));
  const dieta = dados.registros.filter((r) => r.tipo === "dieta" && r.data === hoje);
  const noites = dados.registros.filter((r) => r.tipo === "sono" && noPeriodo(r)).sort((a, b) => b.data.localeCompare(a.data));
  const ultimaNoite = noites[0];
  const minutos = ultimaNoite ? tempoNaCama(ultimaNoite) : null;
  const semana = inicioSemana(hoje);
  return {
    periodo, treinos, noites, ultimaNoite, tempoNaCama: minutos,
    blocosHoje: dieta.length ? dieta.reduce((n, r) => n + r.blocos, 0) : null,
    treinosSemana: dados.registros.filter((r) => r.tipo === "treino" && r.data >= semana && r.data <= hoje).length,
    noitesSemana: new Set(dados.registros.filter((r) => r.tipo === "sono" && r.data >= semana && r.data <= hoje).map((r) => r.data)).size,
    registrosPeriodo: dados.registros.filter(noPeriodo),
  };
}
export const formatarNumero = (n, casas = 0) => n == null ? "Sem registro" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
