import { useEffect, useId, useRef, useState } from "react";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { revisao } from "../conteudo/revisoes.js";
import { alterar } from "../dados/repositorio.js";
import { chaveSessao, concluirSessao, estadoSessao, estadosDasSessoes, modulosDaJornada, sessaoAtual } from "../dominio/progresso.js";
import { doisDigitos, link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { EmLinha, EstadoConteudo } from "../componentes/TextoModulo.jsx";
import { useOperacao } from "../componentes/useOperacao.js";
import { CardAprendizado } from "../componentes/CardAprendizado.jsx";
import { celebrar } from "../motion/revelacao.js";

/**
 * Uma sessão da jornada: as atividades em ordem, cada uma confirmada antes da
 * próxima, e a revisão que conclui a etapa e abre a seguinte.
 */
export function Sessao({ pilar, id, moduloId, dados, registrar }) {
  const carregado = useConteudo(pilar);
  const trilha = CATALOGO[pilar];
  const sessao = trilha.sessoes.find((s) => s.id === id);
  const [resposta, setResposta] = useState(null), [concluida, setConcluida] = useState(false);
  const { ocupado, erro, setErro, executar } = useOperacao();

  useEffect(() => {
    if (!concluida) return;
    const secao = document.querySelector(".celebracao");
    secao?.querySelector("h1")?.focus();
    celebrar(secao);
  }, [concluida]);

  if (!sessao) return <div className="painel"><h1 tabIndex="-1">Etapa não encontrada.</h1><a className="botao" href={link("jornada", pilar)}>Voltar ao mapa</a></div>;

  const estados = estadosDasSessoes(trilha.sessoes, dados.progresso, pilar);
  const estado = estados[trilha.sessoes.indexOf(sessao)];
  const chave = chaveSessao(pilar, id);
  const progresso = dados.progresso[chave] || { modulos: [] };
  const modulos = modulosDaJornada(sessao);
  const pendentes = modulos.filter((m) => !progresso.modulos.includes(m.id));
  const selecionado = moduloId || pendentes[0]?.id || "revisao";
  const modulo = (carregado.conteudo?.sessoes.find((s) => s.id === id)?.modulos || modulos).find((m) => m.id === selecionado);
  const indice = modulos.findIndex((m) => m.id === selecionado);
  const caminho = (...resto) => link("jornada", pilar, id, ...resto);
  const questao = revisao(pilar, sessao.numero);

  if (estado === "bloqueada") return <EtapaBloqueada pilar={pilar} sessao={sessao} anterior={sessaoAtual(trilha.sessoes, estados)} atividades={modulos.length} />;
  if (concluida) return <Celebracao pilar={pilar} sessao={sessao} proxima={trilha.sessoes[sessao.numero + 1]} />;

  const confirmarAtividade = () => executar(async () => {
    const seguinte = modulos[indice + 1]?.id || "revisao";
    await alterar((d) => {
      if (estadoSessao(trilha.sessoes, d.progresso, pilar, id) === "bloqueada") throw new Error("Conclua a sessão anterior primeiro.");
      const registro = d.progresso[chave] || { modulos: [] };
      d.progresso[chave] = { ...registro, modulos: [...new Set([...registro.modulos, modulo.id])], ultimoModulo: seguinte };
    });
    window.location.hash = caminho(seguinte);
  });

  const correta = resposta === questao.correta;
  const concluirEtapa = () => executar(async () => {
    await alterar((d) => {
      concluirSessao(d, trilha, pilar, id, correta);
      d.progresso[chave].revisaoCorreta = true;
    });
    setConcluida(true);
  });

  async function marcarAcao(numero, valor) {
    setErro("");
    try { await alterar((d) => { d.acoes[chave + ":" + modulo.id + ":" + numero] = valor; }); }
    catch (e) { setErro(e.message); }
  }

  return <>
    <a className="voltar-app" href={link("jornada", pilar)}>← Voltar ao mapa</a>
    <header className="cabecalho-pagina">
      <div><p className="sobretitulo">{trilha.nome} / ETAPA {doisDigitos(sessao.numero)}</p><h1 tabIndex="-1">{sessao.nome}</h1></div>
      <span className="registro-pequeno">{progresso.modulos.length} / {modulos.length} ATIVIDADES</span>
    </header>
    <div className="sessao-medidor"><progress aria-label="Atividades concluídas nesta etapa" value={progresso.modulos.length} max={modulos.length} /></div>
    <div className="sessao-composicao">
      <nav className="atividades-nav" aria-label="Atividades desta sessão">
        {modulos.map((m, i) => (
          <a key={m.id} href={caminho(m.id)} aria-current={modulo?.id === m.id ? "step" : undefined}><span>{progresso.modulos.includes(m.id) ? <Icone nome="check" tamanho={18} /> : doisDigitos(i + 1)}</span>{m.titulo}</a>
        ))}
        <a href={caminho("revisao")} aria-current={selecionado === "revisao" ? "step" : undefined}><Icone nome="alvo" tamanho={18} />Revisão e conclusão</a>
      </nav>
      <section className="atividade painel" data-sessao={sessao.id}>
        {selecionado === "revisao" ? (
          <Revisao
            questao={questao} resposta={resposta} correta={correta} responder={setResposta} pendentes={pendentes} caminho={caminho}
            chave={chave} dados={dados} ocupado={ocupado} jaConcluida={estado === "concluida"} concluir={concluirEtapa}
          />
        ) : modulo ? (
          <Atividade
            modulo={modulo} indice={indice} modulos={modulos} pilar={pilar} chave={chave} dados={dados} caminho={caminho}
            carregado={carregado} ocupado={ocupado} confirmar={confirmarAtividade} marcarAcao={marcarAcao} registrar={registrar}
          />
        ) : <><h2>Atividade não encontrada.</h2><a className="botao" href={caminho()}>Retomar sessão</a></>}
        {erro && <p role="alert" className="erro">{erro}</p>}
      </section>
    </div>
  </>;
}

function Atividade({ modulo, indice, modulos, pilar, chave, dados, caminho, carregado, ocupado, confirmar, marcarAcao, registrar }) {
  const pratica = modulo.tipo === "pratica";
  const feitas = (modulo.acoes || []).filter((_, i) => dados.acoes[chave + ":" + modulo.id + ":" + i] === "feita").length;
  return <>
    <p className="sobretitulo">ATIVIDADE {indice + 1} / {modulos.length} · {pratica ? "APLICAR" : "ENTENDER"}</p>
    <h2>{modulo.titulo}</h2>
    {pratica ? <>
      <p>Três ações para levar esta ideia à rotina. Marque o que fez; use “Não se aplica” somente quando a condição da ação não corresponder ao seu caso.</p>
      <div className="missao-progresso"><strong>{feitas}/{modulo.acoes.length}</strong><div><p>Ações feitas</p><progress aria-label="Ações feitas nesta atividade" value={feitas} max={modulo.acoes.length} /><small>Seu ritmo vale. O plano pode continuar em aberto.</small></div></div>
      <div className="tarefas">
        {modulo.acoes.map((texto, i) => <Tarefa key={i} numero={i + 1} texto={texto} pilar={pilar} valor={dados.acoes[chave + ":" + modulo.id + ":" + i] || ""} marcar={(valor) => marcarAcao(i, valor)} />)}
      </div>
      <Nota key={chave + ":" + modulo.id} chave={chave + ":" + modulo.id} dados={dados} rotulo="Planeje sua ação (opcional)" />
    </> : <CardAprendizado modulo={modulo} pilar={pilar} />}
    {modulo.acaoRegistro && <button className="botao secundario" onClick={() => registrar(modulo.acaoRegistro)}>{modulo.acaoRegistro === "metas" ? "Planejar minha semana" : "Abrir registro"}<Icone nome="mais" /></button>}
    <EstadoConteudo carregado={carregado} />
    <footer className="atividade-acoes">
      {indice > 0 && <a className="botao secundario" href={caminho(modulos[indice - 1].id)}>Anterior</a>}
      <button className="botao primario" disabled={ocupado || !carregado.conteudo} onClick={confirmar}>{ocupado ? "Salvando…" : pratica ? "Plano revisado, continuar" : "Entendi, continuar"}<Icone nome="seta" /></button>
    </footer>
  </>;
}

/** Feita, não se aplica, ou em aberto. "Não se aplica" é escolha explícita, nunca o padrão. */
function Tarefa({ texto, pilar, valor, marcar, numero }) {
  const naoSeAplica = valor === "nao-aplicavel";
  return (
    <div className="tarefa" data-estado={valor || "aberta"}>
      <div className="tarefa-cabeca"><strong>Ação {String(numero).padStart(2, "0")}</strong><span>{valor === "feita" ? "Feita" : naoSeAplica ? "Não se aplica" : "Em aberto"}</span></div>
      <label><input type="checkbox" checked={valor === "feita"} onChange={(e) => marcar(e.target.checked ? "feita" : "")} /><span><EmLinha texto={texto} pilar={pilar} /></span></label>
      <button className="botao-texto" onClick={() => marcar(naoSeAplica ? "" : "nao-aplicavel")}>{naoSeAplica ? "Não se aplica · desfazer" : "Não se aplica ao meu caso"}</button>
    </div>
  );
}

function Revisao({ questao, resposta, correta, responder, pendentes, caminho, chave, dados, ocupado, jaConcluida, concluir }) {
  return <>
    <div className="desafio-cabeca"><Icone nome="alvo" tamanho={44} /><div><p className="sobretitulo">DESAFIO DE REVISÃO</p>
    <h2>O que fica desta etapa?</h2></div></div>
    {pendentes.length > 0 && <p className="aviso" role="status">Ainda faltam {pendentes.length} atividades. <a href={caminho(pendentes[0].id)}>Retomar atividade</a>.</p>}
    <fieldset className="revisao">
      <legend>{questao.pergunta}</legend>
      {questao.opcoes.map((opcao, i) => (
        <label className={"opcao " + (resposta === i ? "selecionada" : "")} key={opcao}><input type="radio" name="revisao" checked={resposta === i} onChange={() => responder(i)} /><span className="opcao-letra" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span>{opcao}</span></label>
      ))}
    </fieldset>
    {resposta != null && <p className={correta ? "retorno-correto" : "aviso"} role="status">{correta ? "Isso mesmo. " + questao.retorno : "Revise a ideia e tente novamente. Você pode consultar as atividades ao lado."}</p>}
    <Nota key={chave} chave={chave} dados={dados} />
    <p className="texto-secundario">Concluir registra esta etapa de aprendizado. As ações da rotina continuam no seu ritmo.</p>
    <button className="botao primario" disabled={pendentes.length > 0 || !correta || ocupado} onClick={concluir}>{ocupado ? "Salvando…" : jaConcluida ? "Confirmar revisão" : "Concluir e liberar próxima etapa"}<Icone nome="check" /></button>
  </>;
}

/**
 * Anotação salva a cada tecla, em fila, para a última digitação ser a última
 * gravada. Se outra aba mudou a mesma anotação, não sobrescreve: avisa.
 */
function Nota({ chave, dados, rotulo = "Seu próximo passo (opcional)" }) {
  const salvoAoAbrir = dados.anotacoes[chave] || "";
  const [valor, setValor] = useState(salvoAoAbrir), [estado, setEstado] = useState("");
  const id = useId(), ultimoSalvo = useRef(salvoAoAbrir), fila = useRef(Promise.resolve()), sequencia = useRef(0);

  function mudar(evento) {
    const texto = evento.target.value;
    setValor(texto);
    setEstado("Salvando…");
    const esta = ++sequencia.current;
    fila.current = fila.current.catch(() => {}).then(async () => {
      try {
        await alterar((d) => {
          if ((d.anotacoes[chave] || "") !== ultimoSalvo.current) throw new Error("Esta anotação mudou em outra aba. Seu rascunho continua aqui; copie-o antes de reabrir a atividade.");
          d.anotacoes[chave] = texto;
        });
        ultimoSalvo.current = texto;
        if (esta === sequencia.current) setEstado("Salvo neste aparelho.");
      } catch (e) { setEstado(e.message); }
    });
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <textarea id={id} rows="3" maxLength={5000} value={valor} onChange={mudar} placeholder="Uma decisão que cabe na sua rotina." />
      <span className="texto-secundario" role="status">{estado}</span>
    </div>
  );
}

function EtapaBloqueada({ pilar, sessao, anterior, atividades }) {
  return <>
    <a className="voltar-app" href={link("jornada", pilar)}>← Voltar ao mapa</a>
    <section className="etapa-bloqueada painel">
      <Icone nome="cadeado" tamanho={40} />
      <p className="sobretitulo">ETAPA BLOQUEADA</p>
      <h1 tabIndex="-1">{sessao.nome}</h1>
      <p>Conclua “{anterior.nome}” para seguir por este caminho.</p>
      <p className="texto-secundario">{atividades} atividades nesta etapa. Os guias e as fontes continuam disponíveis no Kit.</p>
      <a className="botao primario" href={link("jornada", pilar, anterior.id)}>Ir para minha etapa <Icone nome="seta" /></a>
    </section>
  </>;
}

function Celebracao({ pilar, sessao, proxima }) {
  return (
    <section className="celebracao painel">
      <Icone nome="medalha" tamanho={56} />
      <p className="sobretitulo">MAIS UM PASSO FEITO</p>
      <h1 tabIndex="-1">Etapa concluída.</h1>
      <p>{sessao.nome}</p>
      <p className="texto-secundario">{proxima ? "O próximo caminho já está aberto: " + proxima.nome + "." : "Você concluiu este protocolo. O Kit e seus registros continuam disponíveis."}</p>
      <div className="acoes-form">
        {proxima && <a className="botao primario" href={link("jornada", pilar, proxima.id)}>Próxima etapa <Icone nome="seta" /></a>}
        <a className="botao secundario" href={link("jornada", pilar)}>Ver meu mapa</a>
        <a className="botao-texto" href="#/hoje">Voltar para hoje</a>
      </div>
    </section>
  );
}
