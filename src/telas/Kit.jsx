import { CardAprendizado } from "../componentes/CardAprendizado.jsx";
import { useEffect, useMemo, useState } from "react";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { baixarCopia } from "../dados/repositorio.js";
import { AbasPilares } from "../componentes/AbasPilares.jsx";
import { link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { CabecalhoPagina } from "../componentes/Pagina.jsx";
import { EstadoConteudo, TextoModulo } from "../componentes/TextoModulo.jsx";

/** Busca sem acento e sem caixa: "execucao" acha "Execução". */
const normalizar = (texto) => texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

const textoDoLegado = (valor) => {
  if (typeof valor?.v === "string") return valor.v;
  if (typeof valor?.v === "boolean") return valor.v ? "Marcado" : "Não marcado";
  return JSON.stringify(valor);
};

/**
 * O Kit: o que se consulta na hora de fazer, de qualquer ponto da jornada, e a
 * guarda dos dados (exportar e restaurar a cópia local).
 */
export function Kit({ dados, pilar, destino, referencia, retorno, importar, registrar }) {
  const carregado = useConteudo(pilar);
  // Aqui, e não na consulta rápida: a busca sobrevive a abrir um recurso e voltar.
  const [busca, setBusca] = useState("");
  const trilha = carregado.conteudo || CATALOGO[pilar];
  const modulos = useMemo(() => trilha.sessoes.flatMap((s) => s.modulos.map((m) => ({ ...m, sessao: s.nome }))), [trilha]);

  // A nota `[12]` de um texto abre as fontes já na fonte 12.
  useEffect(() => {
    if (destino !== "fontes" || !referencia) return;
    const fonte = document.getElementById("fonte-" + referencia);
    if (!fonte) return;
    fonte.tabIndex = -1;
    fonte.focus();
    fonte.scrollIntoView({ block: "center" });
  }, [destino, referencia, carregado.conteudo]);

  return <>
    <CabecalhoPagina sobretitulo="APOIO NA HORA CERTA" titulo="Seu Kit." descricao="Consulte, registre e volte para o que estava fazendo.">
      <Icone nome="kit" tamanho={36} />
    </CabecalhoPagina>
    {retorno && <a className="voltar-app" href={retorno}>← Voltar à atividade</a>}
    <AbasPilares pilar={pilar} destino="kit" />
    {destino
      ? <Consulta pilar={pilar} destino={destino} trilha={trilha} modulos={modulos} carregado={carregado} registrar={registrar} />
      : <>
        <div className="kit-grade">
          <ConsultaRapida pilar={pilar} trilha={trilha} modulos={modulos} busca={busca} buscar={setBusca} />
          <aside>
            <section className="painel">
              <Icone nome="salvo" />
              <h2>Seus dados, com você.</h2>
              <p className="texto-secundario">Tudo fica neste aparelho. Exporte uma cópia para guardar seus registros antes de trocar de navegador ou limpar os dados.</p>
              <div className="pilha-botoes">
                <button className="botao primario" onClick={() => baixarCopia(dados)}>Exportar cópia local</button>
                <button className="botao secundario" onClick={importar}>Restaurar de um arquivo</button>
              </div>
            </section>
            <section className="painel">
              <h2>Sobre o Lithium</h2>
              <p className="texto-secundario">Treino, dieta e sono em um único protocolo de rotina. Conteúdo educativo, com fontes e avisos acessíveis a qualquer momento.</p>
              <span className="registro-pequeno">VERSÃO 0.2 · DADOS NO APARELHO</span>
            </section>
          </aside>
        </div>
        <AnotacoesAntigas legado={dados.legado} />
      </>}
  </>;
}

function ConsultaRapida({ pilar, trilha, modulos, busca, buscar }) {
  const termo = normalizar(busca);
  const itens = modulos.filter((m) => m.kit && !/fontes|fast-travel/.test(m.id) && normalizar(m.titulo + " " + m.sessao).includes(termo));

  return (
    <section className="painel">
      <div className="secao-cabeca"><h2>Consulta rápida</h2><span className="sobretitulo">{trilha.nome}</span></div>
      <label className="campo"><span>Buscar no Kit</span><input type="search" value={busca} onChange={(e) => buscar(e.target.value)} placeholder="Exercício, ficha, aviso…" /></label>
      <ul className="kit-lista">
        {itens.map((m) => (
          <li key={m.fonte}><a href={link("kit", pilar, m.id)}><div><strong>{m.titulo}</strong><span className="texto-secundario">{m.sessao}</span></div><Icone nome="seta" tamanho={18} /></a></li>
        ))}
        {!itens.length && <li><p>Nenhum recurso com esse nome.</p></li>}
      </ul>
      <a className="botao secundario" href={link("kit", pilar, "fontes")}>Fontes e referências <Icone nome="seta" /></a>
    </section>
  );
}

/** Um recurso aberto, ou todas as fontes do protocolo. */
function Consulta({ pilar, destino, trilha, modulos, carregado, registrar }) {
  const fontes = destino === "fontes";
  const alvo = modulos.find((m) => m.id === destino && m.kit);
  return (
    <section className="painel consulta">
      <a className="voltar-app" href={link("kit", pilar)}>← Todos os recursos</a>
      <h2>{fontes ? "Fontes · " + trilha.nome : alvo?.titulo || "Recurso não encontrado"}</h2>
      {fontes ? modulos.filter((m) => /fontes/.test(m.id)).map((m) => <TextoModulo key={m.id} texto={m.texto} pilar={pilar} />)
        : alvo ? <CardAprendizado modulo={alvo} pilar={pilar} />
        : <p>Escolha um recurso no Kit para continuar.</p>}
      {alvo?.acaoRegistro && <button className="botao secundario" onClick={() => registrar(alvo.acaoRegistro)}>{alvo.acaoRegistro === "metas" ? "Planejar minha semana" : "Abrir registro"}</button>}
      <EstadoConteudo carregado={carregado} />
    </section>
  );
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
