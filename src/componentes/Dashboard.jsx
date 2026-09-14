import { useState } from "react";
import { PILARES, CATALOGO } from "../conteudo/catalogo.js";
import { resumir, formatarNumero, inicioSemana, tempoNaCama, dataLocal } from "../estado/indicadores.js";
import { estadoSessao } from "../estado/progresso.js";
import { Icone } from "./Icone.jsx";

export function ProximaAcao({ dados }) {
  const candidatos = PILARES.map((p) => ({
    ...p,
    sessao: CATALOGO[p.id].sessoes.find((s) => estadoSessao(CATALOGO[p.id].sessoes, dados.progresso, p.id, s.id) === "andamento")
      || CATALOGO[p.id].sessoes.find((s) => estadoSessao(CATALOGO[p.id].sessoes, dados.progresso, p.id, s.id) === "disponivel"),
  })).filter((p) => p.sessao);
  const proximo = candidatos.find((p) => estadoSessao(CATALOGO[p.id].sessoes, dados.progresso, p.id, p.sessao.id) === "andamento") || candidatos[0];
  return <section className="proxima-acao">
    <div className="hero-texto"><p className="sobretitulo">SEU PROTOCOLO. SUA CONSTÂNCIA.</p><h2>O básico.<br /><span>Bem feito.</span></h2><p>Pequenos passos, registrados.<br />Um caminho que continua amanhã.</p></div>
    <div className="hero-proximo"><span className="sobretitulo">CONTINUE DE ONDE PAROU</span><div className="mini-caminho" aria-hidden="true"><span><Icone nome="check" /></span><i /><span className="mini-atual"><Icone nome="alvo" /></span><i /><span><Icone nome="cadeado" /></span></div><span className="texto-secundario">{proximo ? proximo.nome + " · etapa " + String(proximo.sessao.numero).padStart(2, "0") : "Os três protocolos"}</span><h3>{proximo?.sessao.nome || "Suas trilhas estão completas."}</h3><a className="botao primario" href={proximo ? "#/jornada/" + proximo.id + "/" + proximo.sessao.id : "#/jornada/hipertrofia"}>{proximo ? "Continuar jornada" : "Revisar jornada"}<Icone nome="seta" /></a></div>
  </section>;
}
function SemanaPontos({ registros, dias, label }) {
  return <div className="semana-pontos" aria-label={label}>{dias.map((data) => <span key={data} className={registros.some((r) => r.data === data) ? "preenchido" : ""} title={new Date(data + "T12:00:00").toLocaleDateString("pt-BR") + (registros.some((r) => r.data === data) ? ": registrado" : ": sem registro")} />)}</div>;
}
export function MetasSemana({ dados, abrirMetas }) {
  const resumo = resumir(dados);
  const meta = dados.metas[inicioSemana()];
  const itens = [
    ["Treinos", resumo.treinosSemana, meta?.treinos, "sessões nesta semana"],
    ["Diário de sono", resumo.noitesSemana, meta?.noites, "manhãs registradas"],
    ["Alimentação", resumo.blocosHoje, meta?.blocos, "blocos hoje"],
  ];
  return <section className="painel metas-semana"><div className="secao-cabeca"><h2>Metas da semana</h2><Icone nome="alvo" /></div><p className="texto-secundario">A semana conta. Uma pausa não apaga o caminho.</p>{itens.map(([nome, feito, total, legenda]) => <div className="meta" key={nome}><div><strong>{nome}</strong><span>{formatarNumero(feito, 1)}{total != null ? " / " + total : ""}</span></div><progress aria-label={nome} value={total && feito != null ? Math.min(feito, total) : 0} max={total || 1} /><span className="texto-secundario">{total ? legenda : "Meta ainda não definida"}</span></div>)}<button className="botao secundario" onClick={abrirMetas}>{meta ? "Ajustar esta semana" : "Planejar minha semana"}<Icone nome="seta" /></button></section>;
}
export function Evolucao({ dados, dias }) {
  const [pilar, setPilar] = useState("treino"), [exercicio, setExercicio] = useState("");
  const resumo = resumir(dados, dias);
  const exercicios = [...new Set(dados.registros.filter((r) => r.tipo === "treino").flatMap((r) => r.exercicios.map((e) => e.nome)))].sort();
  const escolhido = exercicios.includes(exercicio) ? exercicio : exercicios[0];
  const pontos = resumo.periodo.map((dia) => {
    const registros = dados.registros.filter((r) => r.data === dia && r.tipo === pilar);
    if (!registros.length) return null;
    if (pilar === "dieta") return registros.reduce((n, r) => n + r.blocos, 0);
    if (pilar === "sono") return tempoNaCama(registros[0]);
    const cargas = registros.flatMap((r) => r.exercicios.filter((e) => e.nome === escolhido).map((e) => e.carga));
    return cargas.length ? Math.max(...cargas) : null;
  });
  const unidade = pilar === "treino" ? "kg · maior carga registrada por dia" : pilar === "dieta" ? "blocos registrados por dia" : "horas na cama · não horas dormidas";
  const disponiveis = pontos.filter((p) => p != null);
  const teto = Math.max(1, ...disponiveis) * 1.15;
  const x = (i) => 34 + i * (532 / Math.max(1, pontos.length - 1));
  const y = (n) => 156 - n / teto * 125;
  let corrente = [];
  const segmentos = [];
  pontos.forEach((p, i) => {
    if (p == null) { if (corrente.length) segmentos.push(corrente); corrente = []; }
    else corrente.push([x(i), y(p)]);
  });
  if (corrente.length) segmentos.push(corrente);
  return <section className="painel evolucao"><div className="secao-cabeca"><div><span className="sobretitulo">SEU HISTÓRICO, SEM COMPARAÇÕES</span><h2>Evolução no período</h2></div><span className="registro-pequeno">{dias} DIAS</span></div>
    <div className="abas-dados" role="group" aria-label="Indicador do gráfico">{["treino", "dieta", "sono"].map((p) => <button key={p} aria-pressed={pilar === p} onClick={() => setPilar(p)}>{p === "treino" ? "Treino" : p === "dieta" ? "Dieta" : "Sono"}</button>)}</div>
    {pilar === "treino" && exercicios.length > 0 && <label className="campo seletor-exercicio"><span>Exercício</span><select value={escolhido} onChange={(e) => setExercicio(e.target.value)}>{exercicios.map((e) => <option key={e}>{e}</option>)}</select></label>}
    <p className="texto-secundario">{unidade}</p>
    {disponiveis.length ? <><svg className="grafico" viewBox="0 0 600 190" role="img" aria-label={"Evolução: " + disponiveis.length + " dias com registro. Lacunas indicam ausência de dados."}>
      {[0, 0.5, 1].map((n) => <g key={n}><line x1="34" x2="580" y1={y(teto * n)} y2={y(teto * n)} className="grafico-grade" /><text x="0" y={y(teto * n) + 4}>{formatarNumero(teto * n, 1)}</text></g>)}
      {segmentos.map((p, i) => <polyline key={i} points={p.map((q) => q.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />)}
      {pontos.map((p, i) => p == null ? null : <circle key={i} cx={x(i)} cy={y(p)} r="3.5"><title>{resumo.periodo[i] + ": " + formatarNumero(p, 1)}</title></circle>)}
      {[0, Math.floor((dias - 1) / 2), dias - 1].map((i) => <text key={i} x={x(i)} y="183" textAnchor="middle">{resumo.periodo[i].slice(8) + "/" + resumo.periodo[i].slice(5, 7)}</text>)}
    </svg><details className="dados-grafico"><summary>Consultar valores · {disponiveis.length} dias registrados</summary><ul>{pontos.map((p, i) => p == null ? null : <li key={i}>{new Date(resumo.periodo[i] + "T12:00:00").toLocaleDateString("pt-BR")}: <strong>{formatarNumero(p, 1)}</strong> {pilar === "treino" ? "kg" : pilar === "sono" ? "h na cama" : "blocos"}</li>)}</ul></details></> : <div className="grafico-vazio"><div className="grade-vazia" aria-hidden="true" /><Icone nome="registros" tamanho={32} /><h3>O primeiro registro é o ponto de partida.</h3><p className="texto-secundario">Sua evolução aparece aqui conforme você registra.</p><a className="botao-texto" href="#/registros">Fazer meu primeiro registro <Icone nome="seta" tamanho={18} /></a></div>}
  </section>;
}
export function ListaRegistros({ registros, editar, limite }) {
  const lista = [...registros].sort((a, b) => b.data.localeCompare(a.data) || b.updatedAt.localeCompare(a.updatedAt)).slice(0, limite);
  return lista.length ? <ul className="lista-registros">{lista.map((r) => <li key={r.id}><span className="registro-icone"><Icone nome={r.tipo === "peso" ? "alvo" : r.tipo} /></span><div className="registro-descricao"><strong>{r.tipo === "treino" ? "Treino " + r.treino : r.tipo === "dieta" ? r.refeicao : r.tipo === "sono" ? "Diário de sono" : "Peso corporal"}</strong><span className="texto-secundario">{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")} · {r.tipo === "treino" ? r.exercicios.length + " grupos de séries" : r.tipo === "dieta" ? formatarNumero(r.blocos, 1) + " blocos" : r.tipo === "sono" ? formatarNumero(tempoNaCama(r), 1) + " h na cama · sensação " + r.sensacao + "/5" : formatarNumero(r.kg, 1) + " kg"}</span></div><button className="botao-texto" onClick={() => editar(r)}>Editar<span className="sr-only"> registro de {r.data}</span></button></li>)}</ul> : <div className="estado-vazio"><Icone nome="registros" /><p>Nenhum registro neste período.</p><span className="texto-secundario">Comece pelo que aconteceu hoje.</span></div>;
}
export function Dashboard({ dados, abrirRegistro, abrirMetas, editar }) {
  const [dias, setDias] = useState(7);
  const resumo = resumir(dados, dias);
  const meta = dados.metas[inicioSemana()];
  const completas = Object.values(dados.progresso).filter((p) => p.concluidaEm).length;
  const marcos = [
    ["Primeiro registro", dados.registros.length > 0, "Sua rotina começa a ganhar memória."],
    ["Primeira etapa", completas > 0, "Uma ideia levada adiante."],
    ["Trilha completa", Object.keys(CATALOGO).some((p) => CATALOGO[p].sessoes.every((s) => dados.progresso[p + ":" + s.id]?.concluidaEm)), "Um protocolo do começo ao fim."],
  ];
  return <>
    <header className="cabecalho-pagina"><div><p className="sobretitulo">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}</p><h1 tabIndex="-1">Seu ritmo, hoje.</h1></div><label className="periodo"><span>Histórico</span><select value={dias} onChange={(e) => setDias(Number(e.target.value))}><option value="7">Últimos 7 dias</option><option value="14">Últimos 14 dias</option><option value="30">Últimos 30 dias</option></select></label></header>
    <ProximaAcao dados={dados} />
    <section className="indicadores" aria-label="Resumo dos três pilares">
      <article className="indicador"><div className="secao-cabeca"><h2><Icone nome="treino" />Treino</h2><span className="sobretitulo">ESTA SEMANA</span></div><div className="indicador-valor">{resumo.treinosSemana}<span>{meta ? " / " + meta.treinos : " treinos"}</span></div><p className="texto-secundario">{meta ? "sessões realizadas / planejadas" : "Planeje sua semana para definir a meta"}</p><SemanaPontos dias={resumo.periodo.slice(-7)} registros={dados.registros.filter((r) => r.tipo === "treino")} label="Dias com treino nos últimos sete dias" /><button className="botao-texto" onClick={() => abrirRegistro("treino")}>Registrar treino <Icone nome="mais" tamanho={18} /></button></article>
      <article className="indicador"><div className="secao-cabeca"><h2><Icone nome="dieta" />Dieta</h2><span className="sobretitulo">HOJE</span></div><div className={"indicador-valor " + (resumo.blocosHoje == null ? "sem-valor" : "")}>{resumo.blocosHoje == null ? "Sem registro" : formatarNumero(resumo.blocosHoje, 1)}{resumo.blocosHoje != null && <span>{meta?.blocos ? " / " + meta.blocos : " blocos"}</span>}</div><p className="texto-secundario">{meta?.blocos ? "blocos registrados / meta confirmada" : "Registre suas refeições pelo método de blocos"}</p><SemanaPontos dias={resumo.periodo.slice(-7)} registros={dados.registros.filter((r) => r.tipo === "dieta")} label="Dias com alimentação registrada nos últimos sete dias" /><button className="botao-texto" onClick={() => abrirRegistro("dieta")}>Registrar refeição <Icone nome="mais" tamanho={18} /></button></article>
      <article className="indicador"><div className="secao-cabeca"><h2><Icone nome="sono" />Sono</h2><span className="sobretitulo">ÚLTIMO REGISTRO</span></div><div className={"indicador-valor " + (resumo.tempoNaCama == null ? "sem-valor" : "")}>{resumo.tempoNaCama == null ? "Sem registro" : formatarNumero(resumo.tempoNaCama, 1)}{resumo.tempoNaCama != null && <span> h na cama</span>}</div><p className="texto-secundario">{resumo.ultimaNoite ? new Date(resumo.ultimaNoite.data + "T12:00:00").toLocaleDateString("pt-BR") + " · sensação " + resumo.ultimaNoite.sensacao + "/5" : "Registre a noite e como você acordou"}</p><SemanaPontos dias={resumo.periodo.slice(-7)} registros={dados.registros.filter((r) => r.tipo === "sono")} label="Dias com noite registrada nos últimos sete dias" /><button className="botao-texto" onClick={() => abrirRegistro("sono")}>Registrar noite <Icone nome="mais" tamanho={18} /></button></article>
    </section>
    <div className="dashboard-grade"><Evolucao dados={dados} dias={dias} /><MetasSemana dados={dados} abrirMetas={abrirMetas} /></div>
    <div className="dashboard-grade"><section className="painel"><div className="secao-cabeca"><h2>Últimos registros</h2><a className="botao-texto" href="#/registros">Ver todos <Icone nome="seta" tamanho={18} /></a></div><ListaRegistros registros={resumo.registrosPeriodo} editar={editar} limite={4} /></section><section className="painel marcos"><span className="sobretitulo">CONQUISTAS DO SEU CAMINHO</span><h2>Pequenas vitórias.</h2>{marcos.map(([nome, feito, descricao]) => <div className={"marco " + (feito ? "conquistado" : "")} key={nome}><Icone nome={feito ? "medalha" : "cadeado"} /><div><strong>{nome}</strong><p className="texto-secundario">{feito ? "Conquistado · " : ""}{descricao}</p></div></div>)}</section></div>
  </>;
}
export function Registros({ dados, abrirRegistro, editar }) {
  const [filtro, setFiltro] = useState("todos"), [dias, setDias] = useState("todos");
  const periodo = dias === "todos" ? null : resumir(dados, Number(dias)).periodo;
  const registros = dados.registros.filter((r) => (filtro === "todos" || r.tipo === filtro) && (!periodo || periodo.includes(r.data)));
  const pesos = dados.registros.filter((r) => r.tipo === "peso").sort((a, b) => b.data.localeCompare(a.data));
  return <><header className="cabecalho-pagina"><div><p className="sobretitulo">A ROTINA GANHA MEMÓRIA</p><h1 tabIndex="-1">Seus registros.</h1><p className="texto-secundario">Tudo o que aconteceu, com espaço para corrigir.</p></div><span className="registro-pequeno">{dados.registros.length} REGISTROS</span></header>
    <div className="registro-atalhos">{["treino", "dieta", "sono", "peso"].map((tipo) => <button className="botao secundario" key={tipo} onClick={() => abrirRegistro(tipo)}><Icone nome={tipo === "peso" ? "alvo" : tipo} />{tipo === "treino" ? "Treino" : tipo === "dieta" ? "Refeição" : tipo === "sono" ? "Noite" : "Peso"}<Icone nome="mais" tamanho={18} /></button>)}</div>
    {pesos[0] && <section className="resumo-peso painel"><div><p className="sobretitulo">ÚLTIMO PESO REGISTRADO</p><h2>{formatarNumero(pesos[0].kg, 1)} kg</h2></div><p className="texto-secundario">{new Date(pesos[0].data + "T12:00:00").toLocaleDateString("pt-BR")} · o mesmo histórico para treino e dieta</p></section>}
    <section className="painel"><div className="secao-cabeca"><h2>Histórico</h2><label className="periodo"><span>Período</span><select value={dias} onChange={(e) => setDias(e.target.value)}><option value="todos">Todo o histórico</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label></div><div className="abas-dados" role="group" aria-label="Filtrar registros">{[["todos", "Todos"], ["treino", "Treino"], ["dieta", "Dieta"], ["sono", "Sono"], ["peso", "Peso"]].map(([id, nome]) => <button aria-pressed={filtro === id} onClick={() => setFiltro(id)} key={id}>{nome}</button>)}</div><ListaRegistros registros={registros} editar={editar} /></section>
  </>;
}
