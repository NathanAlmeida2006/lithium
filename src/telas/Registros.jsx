import { useState } from "react";
import { apagarTudo, baixarCopia } from "../dados/repositorio.js";
import { diasDoPeriodo } from "../dominio/indicadores.js";
import { Campo, Dialogo } from "../componentes/Dialogo.jsx";
import { formatarData, formatarNumero } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { ListaRegistros, iconeDoTipo } from "../componentes/ListaRegistros.jsx";
import { CabecalhoPagina, SeletorPeriodo } from "../componentes/Pagina.jsx";

const ATALHOS = [["treino", "Treino"], ["dieta", "Refeição"], ["sono", "Noite"], ["peso", "Peso"]];
const FILTROS = [["todos", "Todos"], ["treino", "Treino"], ["dieta", "Dieta"], ["sono", "Sono"], ["peso", "Peso"]];
const PERIODOS = [["todos", "Todo o histórico"], ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"]];

/** O mais recente; na mesma data, o que foi registrado antes (a ordem de chegada desempata). */
const ultimoPeso = (registros) => registros.reduce((ultimo, r) => r.tipo === "peso" && (!ultimo || r.data > ultimo.data) ? r : ultimo, null);

const textoDoLegado = (valor) => {
  if (typeof valor?.v === "string") return valor.v;
  if (typeof valor?.v === "boolean") return valor.v ? "Marcado" : "Não marcado";
  return JSON.stringify(valor);
};

/** Os registros e, no fim, a guarda deles: cópia, restauração, anotações antigas e o reset. */
export function Registros({ dados, abrirRegistro, editar, importar }) {
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
        <p className="texto-secundario">{formatarData(peso.data)} · a evolução do peso fica no gráfico da tela Hoje</p>
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
      <ListaRegistros registros={registros} editar={editar} vazio={dados.registros.length ? "Nenhum registro com esses filtros." : "Nenhum registro ainda."} />
    </section>
    <section className="painel dados-locais">
      <div>
        <p className="sobretitulo">SEUS DADOS, COM VOCÊ</p>
        <h2>Tudo fica neste aparelho.</h2>
        <p className="texto-secundario">Exporte uma cópia para guardar seus registros antes de trocar de navegador ou limpar os dados. Lithium 0.2: conteúdo educativo, com fontes e avisos no Kit.</p>
      </div>
      <div className="pilha-botoes">
        <button className="botao primario" onClick={() => baixarCopia(dados)}>Exportar cópia local</button>
        <button className="botao secundario" onClick={importar}>Restaurar de um arquivo</button>
      </div>
    </section>
    <AnotacoesAntigas legado={dados.legado} />
    <ZonaApagar dados={dados} />
  </>;
}

/** O que a versão anterior gravou, preservado como estava. Visita antiga não conta como conclusão. */
function AnotacoesAntigas({ legado }) {
  const anotacoes = Object.entries(legado).filter(([chave, valor]) => !chave.endsWith(":visitada") && valor != null);
  if (!anotacoes.length) return null;
  return (
    <section className="painel legado">
      <h2>Anotações da versão anterior</h2>
      <p className="texto-secundario">Preservadas como foram gravadas. Visitas antigas não contam como conclusões.</p>
      {anotacoes.map(([chave, valor]) => (
        <details key={chave}><summary>{chave.split(":").slice(1).join(" / ")}</summary><p>{textoDoLegado(valor)}</p></details>
      ))}
    </section>
  );
}

function ZonaApagar({ dados }) {
  const [apagando, setApagando] = useState(false);
  return <>
    <section className="painel zona-apagar">
      <div>
        <p className="sobretitulo">ZONA DE RESET</p>
        <h2>Recomeçar do zero.</h2>
        <p className="texto-secundario">Apaga deste aparelho o progresso das três jornadas, as marcas, os registros, as metas, as anotações e as preferências. Exporte uma cópia antes se quiser guardar.</p>
      </div>
      <button className="botao perigo" onClick={() => setApagando(true)}>Apagar todos os dados</button>
    </section>
    {apagando && <DialogoApagar dados={dados} fechar={() => setApagando(false)} />}
  </>;
}

/** Ação sem volta pede a palavra escrita, não só um clique, e oferece a cópia antes. */
function DialogoApagar({ dados, fechar }) {
  const [confirmacao, setConfirmacao] = useState(""), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState("");
  const pronto = confirmacao.trim().toUpperCase() === "APAGAR";

  async function apagar() {
    setOcupado(true);
    setErro("");
    try {
      await apagarTudo();
      // Recarregar zera tema, som e o convite do tour, que moram fora do React.
      window.location.hash = "#/hoje";
      window.location.reload();
    } catch (e) {
      setErro(e.message);
      setOcupado(false);
    }
  }

  return (
    <Dialogo titulo="Apagar todos os dados?" fechar={fechar}>
      <div className="formulario">
        <p>Isso apaga deste aparelho o progresso das três jornadas, as marcas dos desafios, as ações, as anotações, as metas, todos os registros e as preferências. <strong>Não dá para desfazer.</strong></p>
        <div>
          <p className="texto-secundario">Quer guardar antes? A cópia pode ser restaurada depois em Registros.</p>
          <button className="botao secundario" onClick={() => baixarCopia(dados)}>Exportar cópia antes</button>
        </div>
        <Campo nome="Para confirmar, digite APAGAR">
          <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" autoCapitalize="characters" />
        </Campo>
        {erro && <p role="alert" className="erro">{erro}</p>}
        <div className="acoes-form">
          <button className="botao secundario" data-seta="nenhuma" onClick={fechar}>Cancelar</button>
          <button className="botao perigo" disabled={!pronto || ocupado} onClick={apagar}>{ocupado ? "Apagando…" : "Apagar tudo"}</button>
        </div>
      </div>
    </Dialogo>
  );
}
