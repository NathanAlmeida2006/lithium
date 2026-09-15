import { useEffect, useMemo, useState } from "react";
import { CardAprendizado } from "../componentes/CardAprendizado.jsx";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { AbasPilares } from "../componentes/AbasPilares.jsx";
import { link } from "../componentes/formato.js";
import { Icone } from "../componentes/Icone.jsx";
import { CabecalhoPagina } from "../componentes/Pagina.jsx";
import { EstadoConteudo, TextoModulo } from "../componentes/TextoModulo.jsx";

/** Busca sem acento e sem caixa: "execucao" acha "Execução". */
const normalizar = (texto) => texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * O Kit: o que se consulta na hora de fazer, de qualquer ponto da jornada. A
 * guarda dos dados (cópia, restauração e reset) mora em Registros, junto do que
 * ela guarda.
 */
export function Kit({ pilar, destino, referencia, retorno, registrar }) {
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
    <CabecalhoPagina sobretitulo="APOIO NA HORA CERTA" titulo="Seu Kit." descricao="Consulte e volte para o que estava fazendo.">
      <Icone nome="kit" tamanho={36} />
    </CabecalhoPagina>
    {retorno && <a className="voltar-app" href={retorno}>← Voltar à atividade</a>}
    <AbasPilares pilar={pilar} destino="kit" />
    {destino
      ? <Consulta pilar={pilar} destino={destino} trilha={trilha} modulos={modulos} carregado={carregado} registrar={registrar} />
      : <ConsultaRapida pilar={pilar} trilha={trilha} modulos={modulos} busca={busca} buscar={setBusca} />}
  </>;
}

function ConsultaRapida({ pilar, trilha, modulos, busca, buscar }) {
  const termo = normalizar(busca);
  const itens = modulos.filter((m) => m.kit && !/fontes|fast-travel/.test(m.id) && normalizar(m.titulo + " " + m.sessao).includes(termo));

  return (
    <section className="painel consulta-rapida">
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
