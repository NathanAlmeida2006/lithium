import { useEffect, useId, useRef, useState } from "react";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { revisao } from "../conteudo/revisoes.js";
import { alterar } from "../estado/repositorioLocal.js";
import { chaveSessao, estadoSessao, modulosDaJornada, concluirSessao } from "../estado/progresso.js";
import { TextoModulo, EmLinha } from "./TextoModulo.jsx";
import { Icone } from "./Icone.jsx";

function Nota({ chave, dados, rotulo = "Seu próximo passo (opcional)" }) {
  const [valor, setValor] = useState(dados.anotacoes[chave] || ""), [estado, setEstado] = useState("");
  const id = useId(), ultimoSalvo = useRef(dados.anotacoes[chave] || ""), fila = useRef(Promise.resolve()), sequencia = useRef(0);
  function mudar(e) {
    const texto = e.target.value; setValor(texto); setEstado("Salvando…");
    const atual = ++sequencia.current;
    fila.current = fila.current.catch(() => {}).then(async () => {
      try {
        await alterar((d) => {
          if ((d.anotacoes[chave] || "") !== ultimoSalvo.current) throw new Error("Esta anotação mudou em outra aba. Seu rascunho continua aqui; copie-o antes de reabrir a atividade.");
          d.anotacoes[chave] = texto;
        });
        ultimoSalvo.current = texto;
        if (atual === sequencia.current) setEstado("Salvo neste aparelho.");
      } catch (e) { setEstado(e.message); }
    });
  }
  return <div className="campo"><label htmlFor={id}>{rotulo}</label><textarea id={id} rows="3" maxLength={5000} value={valor} onChange={mudar} placeholder="Uma decisão que cabe na sua rotina." /><span className="texto-secundario" role="status">{estado}</span></div>;
}
export function FluxoSessao({ pilar, id, moduloId, dados, registrar }) {
  const carregado = useConteudo(pilar);
  const catalogo = CATALOGO[pilar];
  const sessao = catalogo.sessoes.find((s) => s.id === id);
  const [resposta, setResposta] = useState(null), [erro, setErro] = useState(""), [ocupado, setOcupado] = useState(false), [celebrar, setCelebrar] = useState(false);
  useEffect(() => { if (celebrar) document.querySelector(".celebracao h1")?.focus(); }, [celebrar]);
  if (!sessao) return <div className="painel"><h1 tabIndex="-1">Etapa não encontrada.</h1><a className="botao" href={"#/jornada/" + pilar}>Voltar ao mapa</a></div>;
  const estado = estadoSessao(catalogo.sessoes, dados.progresso, pilar, id);
  const chave = chaveSessao(pilar, id);
  const progresso = dados.progresso[chave] || { modulos: [] };
  const modulos = modulosDaJornada(sessao);
  const primeiro = modulos.find((m) => !progresso.modulos.includes(m.id));
  const selecionado = moduloId || primeiro?.id || "revisao";
  const modulo = (carregado.conteudo?.sessoes.find((s) => s.id === id)?.modulos || modulos).find((m) => m.id === selecionado);
  const indice = modulos.findIndex((m) => m.id === selecionado);
  const caminho = "#/jornada/" + pilar + "/" + id;
  const questao = revisao(pilar, sessao.numero);
  const final = selecionado === "revisao";
  const completas = modulos.every((m) => progresso.modulos.includes(m.id));
  const correta = resposta === questao.correta;
  async function confirmar() {
    setOcupado(true); setErro("");
    try {
      await alterar((d) => {
        if (estadoSessao(catalogo.sessoes, d.progresso, pilar, id) === "bloqueada") throw new Error("Conclua a sessão anterior primeiro.");
        const registro = d.progresso[chave] || { modulos: [] };
        d.progresso[chave] = { ...registro, modulos: [...new Set([...registro.modulos, modulo.id])], ultimoModulo: modulos[indice + 1]?.id || "revisao" };
      });
      window.location.hash = caminho + "/" + (modulos[indice + 1]?.id || "revisao");
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  async function concluir() {
    if (ocupado) return;
    setOcupado(true); setErro("");
    try {
      await alterar((d) => {
        concluirSessao(d, catalogo, pilar, id, correta);
        d.progresso[chave].revisaoCorreta = true;
      });
      setCelebrar(true);
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  async function acao(index, valor) {
    setErro("");
    try { await alterar((d) => { d.acoes[chave + ":" + modulo.id + ":" + index] = valor; }); }
    catch (e) { setErro(e.message); }
  }
  if (estado === "bloqueada") {
    const anterior = catalogo.sessoes.find((s) => estadoSessao(catalogo.sessoes, dados.progresso, pilar, s.id) !== "concluida");
    return <><a className="voltar-app" href={"#/jornada/" + pilar}>← Voltar ao mapa</a><section className="etapa-bloqueada painel"><Icone nome="cadeado" tamanho={40} /><p className="sobretitulo">ETAPA BLOQUEADA</p><h1 tabIndex="-1">{sessao.nome}</h1><p>Conclua “{anterior.nome}” para seguir por este caminho.</p><p className="texto-secundario">{modulos.length} atividades nesta etapa. Os guias e as fontes continuam disponíveis no Kit.</p><a className="botao primario" href={"#/jornada/" + pilar + "/" + anterior.id}>Ir para minha etapa <Icone nome="seta" /></a></section></>;
  }
  const proxima = catalogo.sessoes[sessao.numero + 1];
  if (celebrar) return <section className="celebracao painel"><Icone nome="medalha" tamanho={56} /><p className="sobretitulo">MAIS UM PASSO FEITO</p><h1 tabIndex="-1">Etapa concluída.</h1><p>{sessao.nome}</p><p className="texto-secundario">{proxima ? "O próximo caminho já está aberto: " + proxima.nome + "." : "Você concluiu este protocolo. O Kit e seus registros continuam disponíveis."}</p><div className="acoes-form">{proxima && <a className="botao primario" href={"#/jornada/" + pilar + "/" + proxima.id}>Próxima etapa <Icone nome="seta" /></a>}<a className="botao secundario" href={"#/jornada/" + pilar}>Ver meu mapa</a><a className="botao-texto" href="#/hoje">Voltar para hoje</a></div></section>;
  return <>
    <a className="voltar-app" href={"#/jornada/" + pilar}>← Voltar ao mapa</a>
    <header className="cabecalho-pagina"><div><p className="sobretitulo">{catalogo.nome} / ETAPA {String(sessao.numero).padStart(2, "0")}</p><h1 tabIndex="-1">{sessao.nome}</h1></div><span className="registro-pequeno">{progresso.modulos.length} / {modulos.length} ATIVIDADES</span></header>
    <div className="sessao-composicao">
      <nav className="atividades-nav" aria-label="Atividades desta sessão">{modulos.map((m, i) => <a key={m.id} href={caminho + "/" + m.id} aria-current={modulo?.id === m.id ? "step" : undefined}><span>{progresso.modulos.includes(m.id) ? <Icone nome="check" tamanho={18} /> : String(i + 1).padStart(2, "0")}</span>{m.titulo}</a>)}<a href={caminho + "/revisao"} aria-current={final ? "step" : undefined}><Icone nome="alvo" tamanho={18} />Revisão e conclusão</a></nav>
      <section className="atividade painel" data-sessao={sessao.id}>
        {final ? <>
          <p className="sobretitulo">CONFERIR E SEGUIR</p><h2>O que fica desta etapa?</h2>
          {!completas && <p className="aviso" role="status">Ainda faltam {modulos.filter((m) => !progresso.modulos.includes(m.id)).length} atividades. <a href={caminho + "/" + primeiro.id}>Retomar atividade</a>.</p>}
          <fieldset className="revisao"><legend>{questao.pergunta}</legend>{questao.opcoes.map((opcao, i) => <label className={"opcao " + (resposta === i ? "selecionada" : "")} key={opcao}><input type="radio" name="revisao" checked={resposta === i} onChange={() => setResposta(i)} /><span>{opcao}</span></label>)}</fieldset>
          {resposta != null && <p className={correta ? "retorno-correto" : "aviso"} role="status">{correta ? "Isso mesmo. " + questao.retorno : "Revise a ideia e tente novamente. Você pode consultar as atividades ao lado."}</p>}
          <Nota key={chave} chave={chave} dados={dados} />
          <p className="texto-secundario">Concluir registra esta etapa de aprendizado. As ações da rotina continuam no seu ritmo.</p>
          <button className="botao primario" disabled={!completas || !correta || ocupado} onClick={concluir}>{ocupado ? "Salvando…" : estado === "concluida" ? "Confirmar revisão" : "Concluir e liberar próxima etapa"}<Icone nome="check" /></button>
        </> : modulo ? <>
          <p className="sobretitulo">ATIVIDADE {indice + 1} / {modulos.length} · {modulo.tipo === "pratica" ? "APLICAR" : "ENTENDER"}</p>
          <h2>{modulo.titulo}</h2>
          {modulo.tipo === "pratica" ? <><p>Três ações para levar esta ideia à rotina. Marque o que fez; use “Não se aplica” somente quando a condição da ação não corresponder ao seu caso.</p><div className="tarefas">{modulo.acoes.map((t, i) => {
            const valor = dados.acoes[chave + ":" + modulo.id + ":" + i] || "";
            return <div className="tarefa" key={i}><label><input type="checkbox" checked={valor === "feita"} onChange={(e) => acao(i, e.target.checked ? "feita" : "")} /><span><EmLinha texto={t} pilar={pilar} /></span></label><button className="botao-texto" onClick={() => acao(i, valor === "nao-aplicavel" ? "" : "nao-aplicavel")}>{valor === "nao-aplicavel" ? "Não se aplica · desfazer" : "Não se aplica ao meu caso"}</button></div>;
          })}</div><Nota key={chave + ":" + modulo.id} chave={chave + ":" + modulo.id} dados={dados} rotulo="Planeje sua ação (opcional)" /></> : <TextoModulo texto={modulo.texto} pilar={pilar} />}
          {modulo.acaoRegistro && <button className="botao secundario" onClick={() => registrar(modulo.acaoRegistro)}>{modulo.acaoRegistro === "metas" ? "Planejar minha semana" : "Abrir registro"}<Icone nome="mais" /></button>}
          {!carregado.conteudo && <p role="status">{carregado.erro || "Preparando conteúdo…"}{carregado.erro && <button className="botao-texto" onClick={carregado.tentar}>Tentar novamente</button>}</p>}
          <footer className="atividade-acoes">{indice > 0 && <a className="botao secundario" href={caminho + "/" + modulos[indice - 1].id}>Anterior</a>}<button className="botao primario" disabled={ocupado || !carregado.conteudo} onClick={confirmar}>{ocupado ? "Salvando…" : modulo.tipo === "pratica" ? "Plano revisado, continuar" : "Entendi, continuar"}<Icone nome="seta" /></button></footer>
        </> : <><h2>Atividade não encontrada.</h2><a className="botao" href={caminho}>Retomar sessão</a></>}
        {erro && <p role="alert" className="erro">{erro}</p>}
      </section>
    </div>
  </>;
}
