import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOGO, PILARES } from "../conteudo/catalogo.js";
import { datasRegistradas, exerciciosRegistrados, inicioSemana, resumir, serieDiaria } from "../dominio/indicadores.js";
import { estadosDasSessoes, sessaoAtual } from "../dominio/progresso.js";
import { CampoDePontos } from "../componentes/CampoDePontos.jsx";
import { doisDigitos, formatarData, formatarNumero, link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { ListaRegistros } from "../componentes/ListaRegistros.jsx";
import { CabecalhoPagina, SeletorPeriodo } from "../componentes/Pagina.jsx";
import { desenhar } from "../motion/revelacao.js";

const PERIODOS = [["7", "Últimos 7 dias"], ["14", "Últimos 14 dias"], ["30", "Últimos 30 dias"]];

/** A tela de hoje: o próximo passo, os três pilares, a evolução, as metas e as conquistas. */
export function Hoje({ dados, abrirRegistro, abrirMetas, editar }) {
  const [dias, setDias] = useState(7);
  const resumo = useMemo(() => resumir(dados, dias), [dados, dias]);
  const meta = dados.metas[inicioSemana()];
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  return <>
    <CabecalhoPagina sobretitulo={hoje} titulo="Seu ritmo, hoje.">
      <SeletorPeriodo rotulo="Histórico" valor={dias} aoMudar={(v) => setDias(Number(v))} opcoes={PERIODOS} />
    </CabecalhoPagina>
    <ProximaAcao progresso={dados.progresso} />
    <Indicadores dados={dados} resumo={resumo} meta={meta} registrar={abrirRegistro} />
    <div className="dashboard-grade">
      <Evolucao registros={dados.registros} periodo={resumo.periodo} />
      <MetasSemana resumo={resumo} meta={meta} abrirMetas={abrirMetas} />
    </div>
    <div className="dashboard-grade">
      <section className="painel">
        <div className="secao-cabeca"><h2>Últimos registros</h2><a className="botao-texto" href="#/registros">Ver todos <Icone nome="seta" tamanho={18} /></a></div>
        <ListaRegistros registros={resumo.registrosPeriodo} editar={editar} limite={4} />
      </section>
      <Marcos dados={dados} />
    </div>
  </>;
}

/** O protocolo a continuar: o que está em andamento, ou o primeiro com etapa aberta. */
function ProximaAcao({ progresso }) {
  const abertos = PILARES.map((pilar) => {
    const sessoes = CATALOGO[pilar.id].sessoes;
    const estados = estadosDasSessoes(sessoes, progresso, pilar.id);
    const sessao = sessaoAtual(sessoes, estados);
    return sessao && { ...pilar, sessao, emAndamento: estados[sessoes.indexOf(sessao)] === "andamento" };
  }).filter(Boolean);
  const proximo = abertos.find((p) => p.emAndamento) || abertos[0];

  return (
    <section className="proxima-acao">
      <div className="hero-texto">
        <p className="sobretitulo">SEU PROTOCOLO. SUA CONSTÂNCIA.</p>
        {/* Uma palavra por `span`: é o que a headline acende, uma a uma (movimento.css). */}
        <h2><span className="palavra">O</span> <span className="palavra">básico.</span><br /><span><span className="palavra">Bem</span> <span className="palavra">feito.</span></span></h2>
        <p>Pequenos passos, registrados.<br />Um caminho que continua amanhã.</p>
      </div>
      <div className="hero-proximo">
        <span className="sobretitulo">CONTINUE DE ONDE PAROU</span>
        <div className="mini-caminho" aria-hidden="true"><span><Icone nome="check" /></span><i /><span className="mini-atual"><Icone nome="alvo" /></span><i /><span><Icone nome="cadeado" /></span></div>
        <span className="texto-secundario">{proximo ? proximo.nome + " · etapa " + doisDigitos(proximo.sessao.numero) : "Os três protocolos"}</span>
        <h3>{proximo?.sessao.nome || "Suas trilhas estão completas."}</h3>
        <a className="botao primario" href={proximo ? link("jornada", proximo.id, proximo.sessao.id) : link("jornada", "hipertrofia")}>{proximo ? "Continuar jornada" : "Revisar jornada"}<Icone nome="seta" /></a>
      </div>
    </section>
  );
}

function Indicadores({ dados, resumo, meta, registrar }) {
  const semana = resumo.periodo.slice(-7);
  const pontos = (tipo) => ({ dias: semana, datas: datasRegistradas(dados.registros, tipo) });
  const { blocosHoje, ultimaNoite } = resumo;

  return (
    <section className="indicadores" aria-label="Resumo dos três pilares">
      <Indicador
        tipo="treino" titulo="Treino" quando="ESTA SEMANA" registrar={registrar} acao="Registrar treino"
        valor={resumo.treinosSemana} unidade={meta ? " / " + meta.treinos : " treinos"}
        legenda={meta ? "sessões realizadas / planejadas" : "Planeje sua semana para definir a meta"}
        pontos={pontos("treino")} rotuloPontos="Dias com treino nos últimos sete dias"
      />
      <Indicador
        tipo="dieta" titulo="Dieta" quando="HOJE" registrar={registrar} acao="Registrar refeição"
        valor={blocosHoje == null ? null : formatarNumero(blocosHoje, 1)} unidade={meta?.blocos ? " / " + meta.blocos : " blocos"}
        legenda={meta?.blocos ? "blocos registrados / meta confirmada" : "Registre suas refeições pelo método de blocos"}
        pontos={pontos("dieta")} rotuloPontos="Dias com alimentação registrada nos últimos sete dias"
      />
      <Indicador
        tipo="sono" titulo="Sono" quando="ÚLTIMO REGISTRO" registrar={registrar} acao="Registrar noite"
        valor={resumo.tempoNaCama == null ? null : formatarNumero(resumo.tempoNaCama, 1)} unidade=" h na cama"
        legenda={ultimaNoite ? formatarData(ultimaNoite.data) + " · sensação " + ultimaNoite.sensacao + "/5" : "Registre a noite e como você acordou"}
        pontos={pontos("sono")} rotuloPontos="Dias com noite registrada nos últimos sete dias"
      />
    </section>
  );
}

/** `valor` nulo é ausência de registro, e não zero: mostra "Sem registro" e esconde a unidade. */
function Indicador({ tipo, titulo, quando, valor, unidade, legenda, pontos, rotuloPontos, acao, registrar }) {
  const semValor = valor == null;
  return (
    <article className="indicador">
      <div className="secao-cabeca"><h2><Icone nome={tipo} />{titulo}</h2><span className="sobretitulo">{quando}</span></div>
      <div className={"indicador-valor" + (semValor ? " sem-valor" : "")}>{semValor ? "Sem registro" : valor}{!semValor && <span>{unidade}</span>}</div>
      <p className="texto-secundario">{legenda}</p>
      <SemanaPontos {...pontos} rotulo={rotuloPontos} />
      <button className="botao-texto" onClick={() => registrar(tipo)}>{acao} <Icone nome="mais" tamanho={18} /></button>
    </article>
  );
}

function SemanaPontos({ dias, datas, rotulo }) {
  return (
    <div className="semana-pontos" aria-label={rotulo}>
      {dias.map((data) => {
        const registrado = datas.has(data);
        return <span key={data} className={registrado ? "preenchido" : ""} title={formatarData(data) + (registrado ? ": registrado" : ": sem registro")} />;
      })}
    </div>
  );
}

const ABAS_DO_GRAFICO = [["treino", "Treino"], ["dieta", "Dieta"], ["sono", "Sono"]];
const LEGENDA_DO_GRAFICO = { treino: "kg · maior carga registrada por dia", dieta: "blocos registrados por dia", sono: "horas na cama · não horas dormidas" };
const UNIDADE_DO_GRAFICO = { treino: "kg", dieta: "blocos", sono: "h na cama" };

// A área de desenho do SVG (viewBox 600 × 190): margem para a escala à esquerda e para as datas embaixo.
const AREA = { esquerda: 34, direita: 580, largura: 532, base: 156, altura: 125 };

/** Quebra a série onde falta registro: a lacuna aparece como lacuna, não como linha inventada. */
function trechosContinuos(pontos, x, y) {
  const trechos = [];
  let atual = [];
  pontos.forEach((valor, i) => {
    if (valor == null) { if (atual.length) trechos.push(atual); atual = []; }
    else atual.push([x(i), y(valor)]);
  });
  if (atual.length) trechos.push(atual);
  return trechos;
}

function Evolucao({ registros, periodo }) {
  const [pilar, setPilar] = useState("treino"), [exercicio, setExercicio] = useState("");
  const grafico = useRef(null);
  const dias = periodo.length;
  // A curva se desenha a cada troca do que ela mostra, como a régua da prova.
  useEffect(() => { desenhar(grafico.current?.querySelectorAll("polyline"), { tempo: 720 }); }, [pilar, exercicio, dias]);

  const exercicios = useMemo(() => exerciciosRegistrados(registros), [registros]);
  const escolhido = exercicios.includes(exercicio) ? exercicio : exercicios[0];
  const pontos = useMemo(() => serieDiaria(registros, periodo, pilar, escolhido), [registros, periodo, pilar, escolhido]);
  const disponiveis = pontos.filter((p) => p != null);

  return (
    <section className="painel evolucao">
      <div className="secao-cabeca">
        <div><span className="sobretitulo">SEU HISTÓRICO, SEM COMPARAÇÕES</span><h2>Evolução no período</h2></div>
        <span className="registro-pequeno">{dias} DIAS</span>
      </div>
      <div className="abas-dados" role="group" aria-label="Indicador do gráfico">
        {ABAS_DO_GRAFICO.map(([id, nome]) => <button key={id} aria-pressed={pilar === id} onClick={() => setPilar(id)}>{nome}</button>)}
      </div>
      {pilar === "treino" && exercicios.length > 0 && (
        <label className="campo seletor-exercicio">
          <span>Exercício</span>
          <select value={escolhido} onChange={(e) => setExercicio(e.target.value)}>{exercicios.map((e) => <option key={e}>{e}</option>)}</select>
        </label>
      )}
      <p className="texto-secundario">{LEGENDA_DO_GRAFICO[pilar]}</p>
      {disponiveis.length ? <>
        <Grafico referencia={grafico} pontos={pontos} disponiveis={disponiveis} periodo={periodo} />
        <details className="dados-grafico">
          <summary>Consultar valores · {disponiveis.length} dias registrados</summary>
          <ul>{pontos.map((p, i) => p == null ? null : <li key={i}>{formatarData(periodo[i])}: <strong>{formatarNumero(p, 1)}</strong> {UNIDADE_DO_GRAFICO[pilar]}</li>)}</ul>
        </details>
      </> : <GraficoVazio />}
    </section>
  );
}

function Grafico({ referencia, pontos, disponiveis, periodo }) {
  const dias = periodo.length;
  const teto = Math.max(1, ...disponiveis) * 1.15;
  const x = (i) => AREA.esquerda + i * (AREA.largura / Math.max(1, dias - 1));
  const y = (valor) => AREA.base - valor / teto * AREA.altura;
  const marcasDeData = [0, Math.floor((dias - 1) / 2), dias - 1];

  return (
    <svg ref={referencia} className="grafico" viewBox="0 0 600 190" role="img" aria-label={"Evolução: " + disponiveis.length + " dias com registro. Lacunas indicam ausência de dados."}>
      {[0, 0.5, 1].map((fracao) => (
        <g key={fracao}>
          <line x1={AREA.esquerda} x2={AREA.direita} y1={y(teto * fracao)} y2={y(teto * fracao)} className="grafico-grade" />
          <text x="0" y={y(teto * fracao) + 4}>{formatarNumero(teto * fracao, 1)}</text>
        </g>
      ))}
      {trechosContinuos(pontos, x, y).map((trecho, i) => <polyline key={i} points={trecho.map((ponto) => ponto.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />)}
      {pontos.map((p, i) => p == null ? null : <circle key={i} cx={x(i)} cy={y(p)} r="3.5"><title>{periodo[i] + ": " + formatarNumero(p, 1)}</title></circle>)}
      {marcasDeData.map((i) => <text key={i} x={x(i)} y="183" textAnchor="middle">{periodo[i].slice(8) + "/" + periodo[i].slice(5, 7)}</text>)}
    </svg>
  );
}

function GraficoVazio() {
  return (
    <div className="grafico-vazio">
      <CampoDePontos />
      <div className="grade-vazia" aria-hidden="true" />
      <Icone nome="registros" tamanho={32} />
      <h3>O primeiro registro é o ponto de partida.</h3>
      <p className="texto-secundario">Sua evolução aparece aqui conforme você registra.</p>
      <a className="botao-texto" href="#/registros">Fazer meu primeiro registro <Icone nome="seta" tamanho={18} /></a>
    </div>
  );
}

function MetasSemana({ resumo, meta, abrirMetas }) {
  const itens = [
    ["Treinos", resumo.treinosSemana, meta?.treinos, "sessões nesta semana"],
    ["Diário de sono", resumo.noitesSemana, meta?.noites, "manhãs registradas"],
    ["Alimentação", resumo.blocosHoje, meta?.blocos, "blocos hoje"],
  ];
  return (
    <section className="painel metas-semana">
      <div className="secao-cabeca"><h2>Metas da semana</h2><Icone nome="alvo" /></div>
      <p className="texto-secundario">A semana conta. Uma pausa não apaga o caminho.</p>
      {itens.map(([nome, feito, total, legenda]) => (
        <div className="meta" key={nome}>
          <div><strong>{nome}</strong><span>{formatarNumero(feito, 1)}{total != null ? " / " + total : ""}</span></div>
          <progress aria-label={nome} value={total && feito != null ? Math.min(feito, total) : 0} max={total || 1} />
          <span className="texto-secundario">{total ? legenda : "Meta ainda não definida"}</span>
        </div>
      ))}
      <button className="botao secundario" onClick={abrirMetas}>{meta ? "Ajustar esta semana" : "Planejar minha semana"}<Icone nome="seta" /></button>
    </section>
  );
}

function Marcos({ dados }) {
  const concluidas = Object.values(dados.progresso).filter((p) => p.concluidaEm).length;
  const trilhaCompleta = Object.keys(CATALOGO).some((pilar) => CATALOGO[pilar].sessoes.every((s) => dados.progresso[pilar + ":" + s.id]?.concluidaEm));
  const marcos = [
    ["Primeiro registro", dados.registros.length > 0, "Sua rotina começa a ganhar memória."],
    ["Primeira etapa", concluidas > 0, "Uma ideia levada adiante."],
    ["Trilha completa", trilhaCompleta, "Um protocolo do começo ao fim."],
  ];
  return (
    <section className="painel marcos">
      <span className="sobretitulo">CONQUISTAS DO SEU CAMINHO</span>
      <h2>Pequenas vitórias.</h2>
      {marcos.map(([nome, conquistado, descricao]) => (
        <div className={"marco " + (conquistado ? "conquistado" : "")} key={nome}>
          <Icone nome={conquistado ? "medalha" : "cadeado"} />
          <div><strong>{nome}</strong><p className="texto-secundario">{conquistado ? "Conquistado · " : ""}{descricao}</p></div>
        </div>
      ))}
    </section>
  );
}
