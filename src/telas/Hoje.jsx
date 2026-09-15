import { useEffect, useMemo, useRef, useState } from "react";
import { CATALOGO, PILARES } from "../conteudo/catalogo.js";
import { datasRegistradas, exerciciosRegistrados, inicioSemana, resumir, serieDiaria } from "../dominio/indicadores.js";
import { estadosDasSessoes, sessaoAtual } from "../dominio/progresso.js";
import { CampoDePontos } from "../componentes/CampoDePontos.jsx";
import { doisDigitos, formatarData, formatarNumero, link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { ListaRegistros, iconeDoTipo } from "../componentes/ListaRegistros.jsx";
import { CabecalhoPagina, SeletorPeriodo } from "../componentes/Pagina.jsx";
import { desenhar } from "../motion/revelacao.js";

const PERIODOS = [["7", "Últimos 7 dias"], ["14", "Últimos 14 dias"], ["30", "Últimos 30 dias"]];

/** A tela de hoje: onde cada protocolo parou, os três pilares, a evolução, as metas e as conquistas. */
export function Hoje({ dados, abrirRegistro, abrirMetas, editar }) {
  const [dias, setDias] = useState(7);
  const resumo = useMemo(() => resumir(dados, dias), [dados, dias]);
  const meta = dados.metas[inicioSemana()];
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

  return <>
    <CabecalhoPagina sobretitulo={hoje} titulo="Seu ritmo, hoje." />
    <ProximosPassos progresso={dados.progresso} />
    <Indicadores dados={dados} resumo={resumo} meta={meta} registrar={abrirRegistro} />
    <div className="dashboard-grade">
      <Evolucao registros={dados.registros} periodo={resumo.periodo} dias={dias} mudarDias={setDias} registrar={abrirRegistro} />
      <MetasSemana resumo={resumo} meta={meta} abrirMetas={abrirMetas} />
    </div>
    <div className="dashboard-grade">
      <section className="painel">
        <div className="secao-cabeca"><h2>Últimos registros</h2><a className="botao-texto" href="#/registros">Ver todos <Icone nome="seta" tamanho={18} /></a></div>
        <ListaRegistros registros={dados.registros} editar={editar} limite={4} vazio="Nenhum registro ainda." />
      </section>
      <Marcos dados={dados} />
    </div>
  </>;
}

/**
 * Onde cada protocolo parou. Os três aparecem, porque a pessoa pode seguir mais
 * de um ao mesmo tempo; o botão cheio vai para o que está em andamento, ou para
 * o primeiro com sessão aberta.
 */
function ProximosPassos({ progresso }) {
  const trilhas = PILARES.map((pilar) => {
    const sessoes = CATALOGO[pilar.id].sessoes;
    const estados = estadosDasSessoes(sessoes, progresso, pilar.id);
    const sessao = sessaoAtual(sessoes, estados);
    return {
      ...pilar, sessao, nome: CATALOGO[pilar.id].nome, total: sessoes.length,
      concluidas: estados.filter((estado) => estado === "concluida").length,
      emAndamento: Boolean(sessao) && estados[sessoes.indexOf(sessao)] === "andamento",
      comecou: estados.some((estado) => estado === "andamento" || estado === "concluida"),
    };
  });
  const destaque = trilhas.find((t) => t.emAndamento) || trilhas.find((t) => t.sessao);

  return (
    <section className="proxima-acao" aria-labelledby="proximos-titulo">
      <p className="sobretitulo">{trilhas.some((t) => t.comecou) ? "CONTINUE DE ONDE PAROU" : "COMECE POR AQUI"}</p>
      <h2 id="proximos-titulo">Seus próximos passos</h2>
      <ul className="proximos-lista">
        {trilhas.map((t) => {
          const acao = !t.sessao ? "Revisar" : t.comecou ? "Continuar" : "Começar";
          return (
            <li key={t.id} className={t === destaque ? "destaque" : undefined}>
              <p className="proximo-protocolo"><Icone nome={t.icone} tamanho={18} /><span>{t.nome}</span><span className="texto-secundario">{t.concluidas} / {t.total}</span></p>
              <h3>{t.sessao ? t.sessao.nome : "Protocolo concluído"}</h3>
              <p className="texto-secundario">{t.sessao ? "Sessão " + doisDigitos(t.sessao.numero) : "O Kit e os registros continuam aqui."}</p>
              <a className={"botao " + (t === destaque ? "primario" : "secundario")} href={t.sessao ? link("jornada", t.id, t.sessao.id) : link("jornada", t.id)} aria-label={acao + ": " + t.nome}>{acao}<Icone nome="seta" /></a>
            </li>
          );
        })}
      </ul>
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
        valor={resumo.treinosSemana} unidade={meta ? " / " + meta.treinos : resumo.treinosSemana === 1 ? " treino" : " treinos"}
        legenda={meta ? "treinos feitos / planejados" : "Planeje sua semana para definir a meta"}
        pontos={pontos("treino")} rotuloPontos="Dias com treino nos últimos sete dias"
      />
      <Indicador
        tipo="dieta" titulo="Dieta" quando="HOJE" registrar={registrar} acao="Registrar refeição"
        valor={blocosHoje == null ? null : formatarNumero(blocosHoje, 1)} unidade={meta?.blocos ? " / " + meta.blocos : " blocos"}
        legenda={meta?.blocos ? "blocos registrados / meta diária" : "Registre suas refeições pelo método de blocos"}
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

const ABAS_DO_GRAFICO = [["treino", "Treino"], ["dieta", "Dieta"], ["sono", "Sono"], ["peso", "Peso"]];
const LEGENDA_DO_GRAFICO = { treino: "kg · maior carga registrada por dia", dieta: "blocos registrados por dia", sono: "horas na cama · não horas dormidas", peso: "kg · peso registrado no dia" };
const UNIDADE_DO_GRAFICO = { treino: "kg", dieta: "blocos", sono: "h na cama", peso: "kg" };
const NOME_DO_REGISTRO = { treino: "treino", dieta: "refeição", sono: "noite", peso: "peso" };

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

/** O período mora aqui porque é só o gráfico que ele muda: os cartões de cima falam de hoje e da semana. */
function Evolucao({ registros, periodo, dias, mudarDias, registrar }) {
  const [pilar, setPilar] = useState("treino"), [exercicio, setExercicio] = useState("");
  const grafico = useRef(null);
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
        <SeletorPeriodo rotulo="Período" valor={dias} aoMudar={(v) => mudarDias(Number(v))} opcoes={PERIODOS} />
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
          <summary>Consultar valores · {disponiveis.length} {disponiveis.length === 1 ? "dia registrado" : "dias registrados"}</summary>
          <ul>{pontos.map((p, i) => p == null ? null : <li key={i}>{formatarData(periodo[i])}: <strong>{formatarNumero(p, 1)}</strong> {UNIDADE_DO_GRAFICO[pilar]}</li>)}</ul>
        </details>
      </> : <GraficoVazio tipo={pilar} dias={dias} temRegistro={registros.some((r) => r.tipo === pilar)} registrar={registrar} />}
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

/** Quem já registra outra coisa não é "primeiro registro": o vazio diz o que falta e abre o formulário daqui. */
function GraficoVazio({ tipo, dias, temRegistro, registrar }) {
  return (
    <div className="grafico-vazio">
      <CampoDePontos />
      <div className="grade-vazia" aria-hidden="true" />
      <Icone nome={iconeDoTipo(tipo)} tamanho={32} />
      <h3>{temRegistro ? "Sem registro de " + NOME_DO_REGISTRO[tipo] + " nos últimos " + dias + " dias." : "O primeiro registro é o ponto de partida."}</h3>
      <p className="texto-secundario">Sua evolução aparece aqui conforme você registra.</p>
      <button className="botao-texto" onClick={() => registrar(tipo)}>Novo registro de {NOME_DO_REGISTRO[tipo]} <Icone nome="mais" tamanho={18} /></button>
    </div>
  );
}

function MetasSemana({ resumo, meta, abrirMetas }) {
  const itens = [
    ["Treinos", resumo.treinosSemana, meta?.treinos, "treinos nesta semana"],
    ["Diário de sono", resumo.noitesSemana, meta?.noites, "manhãs registradas nesta semana"],
    ["Blocos hoje", resumo.blocosHoje, meta?.blocos, "meta diária de blocos"],
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
    ["Primeira sessão", concluidas > 0, "Uma ideia levada adiante."],
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
