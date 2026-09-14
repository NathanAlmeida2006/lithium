import { useSyncExternalStore } from "react";
import { CATALOGO } from "../conteudo/catalogo.js";
import { chaveSessao, modulosDaJornada } from "./progresso.js";
import { dataLocal, tempoNaCama } from "./indicadores.js";

const DB = "lithium-local";
const VERSAO = 1;
const inscritos = new Set();
const escritas = new Set();
export const aguardarEscritas = () => Promise.all([...escritas]);
let conexao;
let snapshot = { dados: null, erro: "" };
let iniciando;
let canal;
const novo = () => ({ schemaVersion: VERSAO, revision: 0, progresso: {}, anotacoes: {}, acoes: {}, metas: {}, registros: [], legado: {}, migrado: false });
const avisar = (dados, erro = "") => {
  if (dados && snapshot.dados && dados.revision < snapshot.dados.revision) return;
  snapshot = { dados, erro };
  inscritos.forEach((fn) => fn());
};
function abrir() {
  if (!conexao) conexao = new Promise((resolve, reject) => {
    const pedido = indexedDB.open(DB, VERSAO);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains("estado")) pedido.result.createObjectStore("estado");
    };
    pedido.onsuccess = () => {
      pedido.result.onversionchange = () => { pedido.result.close(); conexao = null; };
      resolve(pedido.result);
    };
    pedido.onerror = () => { conexao = null; reject(new Error("Não foi possível abrir os dados neste aparelho.")); };
    pedido.onblocked = () => { conexao = null; reject(new Error("Feche as outras abas do Lithium e tente novamente.")); };
  });
  return conexao;
}
async function ler() {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const req = db.transaction("estado").objectStore("estado").get("principal");
    req.onsuccess = () => resolve(req.result || novo());
    req.onerror = () => reject(req.error);
  });
}
export function alterar(receita) {
  const tarefa = executarAlteracao(receita);
  escritas.add(tarefa);
  tarefa.then(() => escritas.delete(tarefa), () => escritas.delete(tarefa));
  return tarefa;
}
async function executarAlteracao(receita) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("estado", "readwrite");
    const store = tx.objectStore("estado");
    const pedido = store.get("principal");
    let dados, erro;
    pedido.onsuccess = () => {
      try {
        dados = pedido.result || novo();
        receita(dados);
        dados.revision += 1;
        dados.updatedAt = new Date().toISOString();
        store.put(dados, "principal");
      } catch (e) { erro = e; tx.abort(); }
    };
    tx.oncomplete = () => {
      avisar(dados); canal?.postMessage("atualizar"); resolve(dados);
    };
    tx.onabort = tx.onerror = () => reject(erro || new Error("Não foi possível salvar. Seu preenchimento continua nesta tela."));
  });
}
export async function iniciar() {
  if (iniciando) return iniciando;
  iniciando = (async () => {
    try {
      const dados = await ler();
      if (!dados.migrado) {
        const legado = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const chave = localStorage.key(i);
            if (!chave?.startsWith("lithium:")) continue;
            const bruto = localStorage.getItem(chave);
            try { legado[chave] = JSON.parse(bruto); } catch { legado[chave] = { v: bruto }; }
          }
        } catch { /* IndexedDB continua funcionando sem localStorage. */ }
        await alterar((atual) => {
          if (atual.migrado) return;
          atual.legado = legado;
          atual.migrado = true;
          // Visitada significa só visita; nenhuma conclusão é inferida.
        });
      } else avisar(dados);
      if (!canal && "BroadcastChannel" in window) {
        canal = new BroadcastChannel("lithium-registros");
        canal.onmessage = () => ler().then((d) => avisar(d)).catch(() => {});
        window.addEventListener("focus", () => ler().then((d) => avisar(d)).catch(() => {}));
      }
    } catch (e) { avisar(null, e.message); }
    finally { iniciando = null; }
  })();
  return iniciando;
}
export function useDados() {
  return useSyncExternalStore((fn) => { inscritos.add(fn); return () => inscritos.delete(fn); }, () => snapshot);
}
const finito = (n, min, max) => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
const texto = (s, max = 5000) => typeof s === "string" && s.length <= max;
export function validarRegistro(r) {
  if (!r || !texto(r.id, 100) || !r.id || !/^\d{4}-\d{2}-\d{2}$/.test(r.data) || dataLocal(new Date(r.data + "T12:00:00")) !== r.data || r.data > dataLocal()) throw new Error("Informe uma data válida, até hoje.");
  if (!texto(r.nota || "")) throw new Error("A observação é muito longa.");
  if (r.tipo === "treino") {
    if (!["A", "B", "C", "D"].includes(r.treino) || !Array.isArray(r.exercicios) || !r.exercicios.length || r.exercicios.length > 40) throw new Error("Informe o treino e pelo menos um exercício.");
    for (const e of r.exercicios) {
      if (!texto(e.nome, 100) || !e.nome.trim() || !finito(e.carga, 0, 1000) || !Number.isInteger(e.series) || !finito(e.series, 1, 20) || !finito(e.repeticoes, 1, 3600) || !["reps", "s"].includes(e.unidade)) throw new Error("Confira exercício, carga, séries e repetições ou segundos.");
    }
  } else if (r.tipo === "dieta") {
    if (!finito(r.blocos, 0.5, 100) || !texto(r.refeicao, 100) || !r.refeicao.trim()) throw new Error("Informe a refeição e a quantidade de blocos.");
  } else if (r.tipo === "sono") {
    if (!texto(r.deitou, 40) || !texto(r.levantou, 40) || tempoNaCama(r) == null || dataLocal(new Date(r.levantou)) !== r.data || Date.parse(r.levantou) > Date.now() || !Number.isInteger(r.sensacao) || !finito(r.sensacao, 1, 5)) throw new Error("Confira os horários e a sensação ao acordar. A noite deve durar até 24 horas e terminar na data registrada.");
  } else if (r.tipo === "peso") {
    if (!finito(r.kg, 20, 400)) throw new Error("Informe um peso entre 20 e 400 kg.");
  } else throw new Error("Tipo de registro desconhecido.");
}
export function salvarRegistro(registro, revisaoEsperada = null) {
  validarRegistro(registro);
  return alterar((dados) => {
    const i = dados.registros.findIndex((r) => r.id === registro.id);
    const anterior = dados.registros[i];
    if (anterior && anterior.revision !== revisaoEsperada) throw new Error("Este registro mudou em outra aba. Feche e reabra para conferir antes de editar.");
    if (!anterior && revisaoEsperada != null) throw new Error("Este registro foi removido em outra aba.");
    if (registro.tipo === "sono" && dados.registros.some((r) => r.id !== registro.id && r.tipo === "sono" && r.data === registro.data)) throw new Error("Essa manhã já tem uma noite registrada. Edite o registro existente.");
    const novoRegistro = { ...registro, revision: (anterior?.revision || 0) + 1, createdAt: anterior?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (i < 0) dados.registros.push(novoRegistro);
    else dados.registros[i] = novoRegistro;
  });
}
export function removerRegistro(id, revisao) {
  return alterar((dados) => {
    const atual = dados.registros.find((r) => r.id === id);
    if (atual?.revision !== revisao) throw new Error("O registro mudou. Reabra antes de remover.");
    dados.registros = dados.registros.filter((r) => r.id !== id);
  });
}
export function validarBackup(obj) {
  if (!obj || obj.produto !== "lithium" || obj.schemaVersion !== VERSAO) throw new Error("Cópia inválida ou de uma versão não suportada.");
  const d = obj.dados;
  if (!d || d.schemaVersion !== VERSAO || !Array.isArray(d.registros) || d.registros.length > 20000) throw new Error("Registros inválidos.");
  for (const k of ["progresso", "anotacoes", "acoes", "metas", "legado"]) {
    if (!d[k] || typeof d[k] !== "object" || Array.isArray(d[k])) throw new Error("Cópia incompleta: " + k);
  }
  if (/"(?:__proto__|constructor|prototype)"\s*:/.test(JSON.stringify(d))) throw new Error("Formato não permitido.");
  const ids = new Set(), noites = new Set();
  for (const r of d.registros) {
    validarRegistro(r);
    if (ids.has(r.id) || !Number.isInteger(r.revision) || r.revision < 1) throw new Error("Registro repetido ou revisão inválida.");
    ids.add(r.id);
    if (r.tipo === "sono") {
      if (noites.has(r.data)) throw new Error("Duas noites na mesma data.");
      noites.add(r.data);
    }
  }
  for (const [chave, valor] of Object.entries(d.anotacoes)) if (!texto(chave, 250) || !texto(valor)) throw new Error("Anotação inválida.");
  for (const valor of Object.values(d.acoes)) if (!["feita", "nao-aplicavel", ""].includes(valor)) throw new Error("Ação inválida.");
  for (const [chave, m] of Object.entries(d.metas)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chave) || !Number.isInteger(m.treinos) || !finito(m.treinos, 1, 4) || !Number.isInteger(m.noites) || !finito(m.noites, 1, 7) || (m.blocos != null && !finito(m.blocos, 1, 100))) throw new Error("Meta inválida.");
  }
  const permitidas = new Set();
  for (const [pilar, catalogo] of Object.entries(CATALOGO)) {
    let anterior = true;
    for (const s of catalogo.sessoes) {
      const chave = chaveSessao(pilar, s.id); permitidas.add(chave);
      const p = d.progresso[chave];
      if (p && (!Array.isArray(p.modulos) || p.modulos.some((id) => !modulosDaJornada(s).some((m) => m.id === id)))) throw new Error("Módulos desconhecidos na cópia.");
      if (p?.concluidaEm && (!anterior || !Number.isFinite(Date.parse(p.concluidaEm)) || modulosDaJornada(s).some((m) => !p.modulos.includes(m.id)) || p.revisaoCorreta !== true)) throw new Error("Sequência de conclusão inválida.");
      anterior = !!p?.concluidaEm;
    }
  }
  if (Object.keys(d.progresso).some((k) => !permitidas.has(k))) throw new Error("Sessão desconhecida na cópia.");
  return d;
}
export function importarBackup(obj) {
  const copia = validarBackup(obj);
  return alterar((d) => {
    const revision = d.revision;
    Object.assign(d, copia, { revision, migrado: true });
  });
}
