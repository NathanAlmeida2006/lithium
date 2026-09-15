/**
 * O que é um registro válido e o que é uma cópia confiável. Puro: a mesma
 * validação guarda o formulário e a importação, então uma cópia editada à mão
 * não entra com o que a tela recusaria.
 */
import { chaveSessao, modulosDaJornada } from "./progresso.js";
import { dataLocal, tempoNaCama } from "./indicadores.js";

export const VERSAO_DADOS = 1;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const entre = (n, min, max) => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const inteiroEntre = (n, min, max) => Number.isInteger(n) && entre(n, min, max);
const texto = (s, max = 5000) => typeof s === "string" && s.length <= max;
const preenchido = (s, max) => texto(s, max) && s.trim() !== "";
const recusar = (mensagem) => { throw new Error(mensagem); };

/** Data de calendário real, até hoje. `2026-02-31` passa na expressão e cai aqui. */
const dataValida = (data) => DATA.test(data) && dataLocal(new Date(data + "T12:00:00")) === data && data <= dataLocal();

const REGRAS_POR_TIPO = {
  treino(r) {
    if (!["A", "B", "C", "D"].includes(r.treino) || !Array.isArray(r.exercicios) || !r.exercicios.length || r.exercicios.length > 40) recusar("Informe o treino e pelo menos um exercício.");
    for (const e of r.exercicios) {
      const valido = preenchido(e.nome, 100) && entre(e.carga, 0, 1000) && inteiroEntre(e.series, 1, 20) && entre(e.repeticoes, 1, 3600) && ["reps", "s"].includes(e.unidade);
      if (!valido) recusar("Confira exercício, carga, séries e repetições ou segundos.");
    }
  },
  dieta(r) {
    if (!entre(r.blocos, 0.5, 100) || !preenchido(r.refeicao, 100)) recusar("Informe a refeição e a quantidade de blocos.");
  },
  sono(r) {
    const valido = texto(r.deitou, 40) && texto(r.levantou, 40) && tempoNaCama(r) != null
      && dataLocal(new Date(r.levantou)) === r.data && Date.parse(r.levantou) <= Date.now() && inteiroEntre(r.sensacao, 1, 5);
    if (!valido) recusar("Confira os horários e a sensação ao acordar. A noite deve durar até 24 horas e terminar na data registrada.");
  },
  peso(r) {
    if (!entre(r.kg, 20, 400)) recusar("Informe um peso entre 20 e 400 kg.");
  },
};

export function validarRegistro(r) {
  if (!r || !texto(r.id, 100) || !r.id || !dataValida(r.data)) recusar("Informe uma data válida, até hoje.");
  if (!texto(r.nota || "")) recusar("A observação é muito longa.");
  // `hasOwn`, e não `in`: "constructor" numa cópia importada acharia a função do protótipo.
  if (!Object.hasOwn(REGRAS_POR_TIPO, r.tipo)) recusar("Tipo de registro desconhecido.");
  REGRAS_POR_TIPO[r.tipo](r);
}

function validarRegistrosDaCopia(registros) {
  const ids = new Set(), noites = new Set();
  for (const r of registros) {
    validarRegistro(r);
    if (ids.has(r.id) || !Number.isInteger(r.revision) || r.revision < 1) recusar("Registro repetido ou revisão inválida.");
    ids.add(r.id);
    if (r.tipo !== "sono") continue;
    if (noites.has(r.data)) recusar("Duas noites na mesma data.");
    noites.add(r.data);
  }
}

function validarMetas(metas) {
  for (const [semana, m] of Object.entries(metas)) {
    const valida = DATA.test(semana) && inteiroEntre(m.treinos, 1, 4) && inteiroEntre(m.noites, 1, 7) && (m.blocos == null || entre(m.blocos, 1, 100));
    if (!valida) recusar("Meta inválida.");
  }
}

/** A cadeia de conclusão também vale na cópia: ninguém importa uma trilha pulada. */
function validarProgresso(progresso, catalogo) {
  const permitidas = new Set();
  for (const [pilar, trilha] of Object.entries(catalogo)) {
    let anteriorConcluida = true;
    for (const sessao of trilha.sessoes) {
      const chave = chaveSessao(pilar, sessao.id);
      permitidas.add(chave);
      const p = progresso[chave];
      const modulos = modulosDaJornada(sessao);
      if (p && (!Array.isArray(p.modulos) || p.modulos.some((id) => !modulos.some((m) => m.id === id)))) recusar("Módulos desconhecidos na cópia.");
      if (p?.concluidaEm) {
        const valida = anteriorConcluida && Number.isFinite(Date.parse(p.concluidaEm)) && modulos.every((m) => p.modulos.includes(m.id)) && p.revisaoCorreta === true;
        if (!valida) recusar("Sequência de conclusão inválida.");
      }
      anteriorConcluida = Boolean(p?.concluidaEm);
    }
  }
  if (Object.keys(progresso).some((chave) => !permitidas.has(chave))) recusar("Sessão desconhecida na cópia.");
}

/** Devolve os dados da cópia, ou recusa com a primeira razão encontrada. */
export function validarBackup(copia, catalogo) {
  if (!copia || copia.produto !== "lithium" || copia.schemaVersion !== VERSAO_DADOS) recusar("Cópia inválida ou de uma versão não suportada.");
  const d = copia.dados;
  if (!d || d.schemaVersion !== VERSAO_DADOS || !Array.isArray(d.registros) || d.registros.length > 20000) recusar("Registros inválidos.");
  for (const campo of ["progresso", "anotacoes", "acoes", "metas", "legado"]) {
    if (!d[campo] || typeof d[campo] !== "object" || Array.isArray(d[campo])) recusar("Cópia incompleta: " + campo);
  }
  if (/"(?:__proto__|constructor|prototype)"\s*:/.test(JSON.stringify(d))) recusar("Formato não permitido.");
  validarRegistrosDaCopia(d.registros);
  for (const [chave, valor] of Object.entries(d.anotacoes)) if (!texto(chave, 250) || !texto(valor)) recusar("Anotação inválida.");
  for (const valor of Object.values(d.acoes)) if (!["feita", "nao-aplicavel", ""].includes(valor)) recusar("Ação inválida.");
  validarMetas(d.metas);
  validarProgresso(d.progresso, catalogo);
  return d;
}
