import { useState } from "react";
import { diasDoPeriodo } from "../dominio/indicadores.js";
import { formatarData, formatarNumero } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { ListaRegistros, iconeDoTipo } from "../componentes/ListaRegistros.jsx";
import { CabecalhoPagina, SeletorPeriodo } from "../componentes/Pagina.jsx";

const ATALHOS = [["treino", "Treino"], ["dieta", "Refeição"], ["sono", "Noite"], ["peso", "Peso"]];
const FILTROS = [["todos", "Todos"], ["treino", "Treino"], ["dieta", "Dieta"], ["sono", "Sono"], ["peso", "Peso"]];
const PERIODOS = [["todos", "Todo o histórico"], ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"]];

/** O mais recente; na mesma data, o que foi registrado antes (a ordem de chegada desempata). */
const ultimoPeso = (registros) => registros.reduce((ultimo, r) => r.tipo === "peso" && (!ultimo || r.data > ultimo.data) ? r : ultimo, null);

export function Registros({ dados, abrirRegistro, editar }) {
  const [filtro, setFiltro] = useState("todos"), [dias, setDias] = useState("todos");
  const periodo = dias === "todos" ? null : new Set(diasDoPeriodo(Number(dias)));
  const registros = dados.registros.filter((r) => (filtro === "todos" || r.tipo === filtro) && (!periodo || periodo.has(r.data)));
  const peso = ultimoPeso(dados.registros);

  return <>
    <CabecalhoPagina sobretitulo="A ROTINA GANHA MEMÓRIA" titulo="Seus registros." descricao="Tudo o que aconteceu, com espaço para corrigir.">
      <span className="registro-pequeno">{dados.registros.length} REGISTROS</span>
    </CabecalhoPagina>
    <div className="registro-atalhos">
      {ATALHOS.map(([tipo, nome]) => (
        <button className="botao secundario" key={tipo} onClick={() => abrirRegistro(tipo)}><Icone nome={iconeDoTipo(tipo)} />{nome}<Icone nome="mais" tamanho={18} /></button>
      ))}
    </div>
    {peso && (
      <section className="resumo-peso painel">
        <div><p className="sobretitulo">ÚLTIMO PESO REGISTRADO</p><h2>{formatarNumero(peso.kg, 1)} kg</h2></div>
        <p className="texto-secundario">{formatarData(peso.data)} · o mesmo histórico para treino e dieta</p>
      </section>
    )}
    <section className="painel">
      <div className="secao-cabeca">
        <h2>Histórico</h2>
        <SeletorPeriodo rotulo="Período" valor={dias} aoMudar={setDias} opcoes={PERIODOS} />
      </div>
      <div className="abas-dados" role="group" aria-label="Filtrar registros">
        {FILTROS.map(([id, nome]) => <button aria-pressed={filtro === id} onClick={() => setFiltro(id)} key={id}>{nome}</button>)}
      </div>
      <ListaRegistros registros={registros} editar={editar} />
    </section>
  </>;
}
