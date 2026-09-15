/**
 * Os dados do usuário, neste aparelho. Um documento só em IndexedDB
 * (`estado/principal`), alterado sempre por transação: ler, aplicar a receita,
 * gravar. Abas abertas se avisam por BroadcastChannel. As regras do que é
 * válido moram em `dominio/`; aqui só se guarda e se publica.
 */
import { useSyncExternalStore } from "react";
import { CATALOGO } from "../conteudo/catalogo.js";
import { dataLocal } from "../dominio/indicadores.js";
import { VERSAO_DADOS, validarBackup, validarRegistro } from "../dominio/registros.js";

const BANCO = "lithium-local";
const inscritos = new Set();
const escritas = new Set();
let conexao, iniciando, canal;
let instantaneo = { dados: null, erro: "" };

const estadoVazio = () => ({ schemaVersion: VERSAO_DADOS, revision: 0, progresso: {}, anotacoes: {}, acoes: {}, metas: {}, registros: [], legado: {}, migrado: false });

function publicar(dados, erro = "") {
  // Uma leitura atrasada de outra aba não desfaz uma escrita mais nova.
  if (dados && instantaneo.dados && dados.revision < instantaneo.dados.revision) return;
  instantaneo = { dados, erro };
  inscritos.forEach((avisar) => avisar());
}

function abrir() {
  conexao ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, VERSAO_DADOS);
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
    const pedido = db.transaction("estado").objectStore("estado").get("principal");
    pedido.onsuccess = () => resolve(pedido.result || estadoVazio());
    pedido.onerror = () => reject(pedido.error);
  });
}

const sincronizar = () => ler().then((dados) => publicar(dados)).catch(() => {});

async function gravar(receita) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const transacao = db.transaction("estado", "readwrite");
    const store = transacao.objectStore("estado");
    const pedido = store.get("principal");
    let dados, erro;
    pedido.onsuccess = () => {
      try {
        dados = pedido.result || estadoVazio();
        receita(dados);
        dados.revision += 1;
        dados.updatedAt = new Date().toISOString();
        store.put(dados, "principal");
      } catch (e) { erro = e; transacao.abort(); }
    };
    transacao.oncomplete = () => { publicar(dados); canal?.postMessage("atualizar"); resolve(dados); };
    transacao.onabort = transacao.onerror = () => reject(erro || new Error("Não foi possível salvar. Seu preenchimento continua nesta tela."));
  });
}

/** Aplica `receita(dados)` numa transação. Se a receita lançar, nada é gravado. */
export function alterar(receita) {
  const tarefa = gravar(receita);
  escritas.add(tarefa);
  tarefa.then(() => escritas.delete(tarefa), () => escritas.delete(tarefa));
  return tarefa;
}

/** Quem vai recarregar o app espera as escritas em curso terminarem. */
export const aguardarEscritas = () => Promise.all([...escritas]);

/** As chaves `lithium:*` da versão anterior, guardadas como estavam. Visita não vira conclusão. */
function lerLegado() {
  const legado = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave?.startsWith("lithium:")) continue;
      const bruto = localStorage.getItem(chave);
      try { legado[chave] = JSON.parse(bruto); } catch { legado[chave] = { v: bruto }; }
    }
  } catch { /* IndexedDB continua funcionando sem localStorage. */ }
  return legado;
}

export function iniciar() {
  iniciando ??= (async () => {
    try {
      const dados = await ler();
      if (dados.migrado) publicar(dados);
      else {
        const legado = lerLegado();
        await alterar((atual) => {
          if (atual.migrado) return;
          atual.legado = legado;
          atual.migrado = true;
        });
      }
      if (!canal && "BroadcastChannel" in window) {
        canal = new BroadcastChannel("lithium-registros");
        canal.onmessage = sincronizar;
        window.addEventListener("focus", sincronizar);
      }
    } catch (e) { publicar(null, e.message); }
    finally { iniciando = null; }
  })();
  return iniciando;
}

const inscrever = (avisar) => { inscritos.add(avisar); return () => inscritos.delete(avisar); };
export const useDados = () => useSyncExternalStore(inscrever, () => instantaneo);

export function salvarRegistro(registro, revisaoEsperada = null) {
  validarRegistro(registro);
  return alterar((dados) => {
    const indice = dados.registros.findIndex((r) => r.id === registro.id);
    const anterior = dados.registros[indice];
    if (anterior && anterior.revision !== revisaoEsperada) throw new Error("Este registro mudou em outra aba. Feche e reabra para conferir antes de editar.");
    if (!anterior && revisaoEsperada != null) throw new Error("Este registro foi removido em outra aba.");
    if (registro.tipo === "sono" && dados.registros.some((r) => r.id !== registro.id && r.tipo === "sono" && r.data === registro.data)) throw new Error("Essa manhã já tem uma noite registrada. Edite o registro existente.");
    const agora = new Date().toISOString();
    const salvo = { ...registro, revision: (anterior?.revision || 0) + 1, createdAt: anterior?.createdAt || agora, updatedAt: agora };
    if (indice < 0) dados.registros.push(salvo);
    else dados.registros[indice] = salvo;
  });
}

export function removerRegistro(id, revisao) {
  return alterar((dados) => {
    const atual = dados.registros.find((r) => r.id === id);
    if (atual?.revision !== revisao) throw new Error("O registro mudou. Reabra antes de remover.");
    dados.registros = dados.registros.filter((r) => r.id !== id);
  });
}

export const validarCopia = (copia) => validarBackup(copia, CATALOGO);

export function importarBackup(copia) {
  const dadosDaCopia = validarCopia(copia);
  return alterar((dados) => {
    const revision = dados.revision;
    Object.assign(dados, dadosDaCopia, { revision, migrado: true });
  });
}

/** Baixa a cópia local em JSON, no formato que `importarBackup` aceita de volta. */
export function baixarCopia(dados) {
  const copia = { produto: "lithium", schemaVersion: VERSAO_DADOS, exportadoEm: new Date().toISOString(), dados };
  const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" }));
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = "lithium-" + dataLocal() + ".json";
  ancora.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
