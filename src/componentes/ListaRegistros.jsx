import { tempoNaCama } from "../dominio/indicadores.js";
import { formatarData, formatarNumero } from "./formato.js";
import { Icone } from "./Icone.jsx";

/** Peso não tem ícone próprio: usa o alvo. Os outros tipos têm ícone com o próprio nome. */
export const iconeDoTipo = (tipo) => (tipo === "peso" ? "alvo" : tipo);

const TITULO = {
  treino: (r) => "Treino " + r.treino,
  dieta: (r) => r.refeicao,
  sono: () => "Diário de sono",
  peso: () => "Peso corporal",
};

const DETALHE = {
  treino: (r) => r.exercicios.length + " grupos de séries",
  dieta: (r) => formatarNumero(r.blocos, 1) + " blocos",
  sono: (r) => formatarNumero(tempoNaCama(r), 1) + " h na cama · sensação " + r.sensacao + "/5",
  peso: (r) => formatarNumero(r.kg, 1) + " kg",
};

/** Mais recentes primeiro; na mesma data, o último editado primeiro. */
const maisRecentePrimeiro = (a, b) => b.data.localeCompare(a.data) || b.updatedAt.localeCompare(a.updatedAt);

export function ListaRegistros({ registros, editar, limite }) {
  const lista = [...registros].sort(maisRecentePrimeiro).slice(0, limite);
  if (!lista.length) {
    return (
      <div className="estado-vazio">
        <Icone nome="registros" />
        <p>Nenhum registro neste período.</p>
        <span className="texto-secundario">Comece pelo que aconteceu hoje.</span>
      </div>
    );
  }
  return (
    <ul className="lista-registros">
      {lista.map((r) => (
        <li key={r.id}>
          <span className="registro-icone"><Icone nome={iconeDoTipo(r.tipo)} /></span>
          <div className="registro-descricao">
            <strong>{TITULO[r.tipo](r)}</strong>
            <span className="texto-secundario">{formatarData(r.data)} · {DETALHE[r.tipo](r)}</span>
          </div>
          <button className="botao-texto" onClick={() => editar(r)}>Editar<span className="sr-only"> registro de {r.data}</span></button>
        </li>
      ))}
    </ul>
  );
}
