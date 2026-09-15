/**
 * Datas locais e os números que o painel mostra. Puro: recebe registros,
 * devolve números. A ausência de registro é `null`, nunca zero: "sem registro"
 * e "comeu zero blocos" são coisas diferentes.
 */

export function dataLocal(data = new Date()) {
  return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
}

/** O meio-dia evita que a troca de horário de verão empurre a data. */
const meioDia = (dia) => new Date(dia + "T12:00:00");

export function diasDoPeriodo(quantidade = 7, fim = dataLocal()) {
  const ultimo = meioDia(fim);
  return Array.from({ length: quantidade }, (_, i) => {
    const dia = new Date(ultimo);
    dia.setDate(dia.getDate() - quantidade + i + 1);
    return dataLocal(dia);
  });
}

/** Semana começa na segunda; domingo pertence à semana que começou antes. */
export function inicioSemana(dia = dataLocal()) {
  const data = meioDia(dia);
  data.setDate(data.getDate() - ((data.getDay() + 6) % 7));
  return dataLocal(data);
}

/** Horas entre deitar e levantar. Não mede tempo dormido, e recusa noite de mais de 24 h. */
export function tempoNaCama(noite) {
  const minutos = (Date.parse(noite.levantouEm || noite.levantou) - Date.parse(noite.deitouEm || noite.deitou)) / 60000;
  return Number.isFinite(minutos) && minutos > 0 && minutos <= 24 * 60 ? minutos / 60 : null;
}

export function resumir(dados, dias = 7, hoje = dataLocal()) {
  const periodo = diasDoPeriodo(dias, hoje);
  const noPeriodo = new Set(periodo);
  const semana = inicioSemana(hoje);
  const naSemana = (r) => r.data >= semana && r.data <= hoje;
  const doTipo = (tipo) => dados.registros.filter((r) => r.tipo === tipo);

  const treinos = doTipo("treino");
  const noites = doTipo("sono");
  const refeicoesDeHoje = doTipo("dieta").filter((r) => r.data === hoje);
  const ultimaNoite = noites.filter((r) => noPeriodo.has(r.data)).sort((a, b) => b.data.localeCompare(a.data))[0];

  return {
    periodo,
    ultimaNoite,
    tempoNaCama: ultimaNoite ? tempoNaCama(ultimaNoite) : null,
    blocosHoje: refeicoesDeHoje.length ? refeicoesDeHoje.reduce((soma, r) => soma + r.blocos, 0) : null,
    treinosSemana: treinos.filter(naSemana).length,
    noitesSemana: new Set(noites.filter(naSemana).map((r) => r.data)).size,
    registrosPeriodo: dados.registros.filter((r) => noPeriodo.has(r.data)),
  };
}

/** Datas com pelo menos um registro do tipo: a régua da semana consulta em O(1). */
export const datasRegistradas = (registros, tipo) => new Set(registros.filter((r) => r.tipo === tipo).map((r) => r.data));

export const exerciciosRegistrados = (registros) =>
  [...new Set(registros.filter((r) => r.tipo === "treino").flatMap((r) => r.exercicios.map((e) => e.nome)))].sort();

/**
 * Um valor por dia do período, `null` onde não houve registro: a lacuna do
 * gráfico é informação. Treino é a maior carga do exercício no dia; dieta, a
 * soma dos blocos; sono, o tempo na cama da noite registrada.
 */
export function serieDiaria(registros, periodo, tipo, exercicio) {
  const porDia = new Map();
  for (const r of registros) {
    if (r.tipo !== tipo) continue;
    if (!porDia.has(r.data)) porDia.set(r.data, []);
    porDia.get(r.data).push(r);
  }
  return periodo.map((dia) => {
    const doDia = porDia.get(dia);
    if (!doDia) return null;
    if (tipo === "dieta") return doDia.reduce((soma, r) => soma + r.blocos, 0);
    if (tipo === "sono") return tempoNaCama(doDia[0]);
    const cargas = doDia.flatMap((r) => r.exercicios.filter((e) => e.nome === exercicio).map((e) => e.carga));
    return cargas.length ? Math.max(...cargas) : null;
  });
}
