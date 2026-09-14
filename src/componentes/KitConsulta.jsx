import { useEffect, useState } from "react";
import { CATALOGO, useConteudo } from "../conteudo/catalogo.js";
import { AbasPilares } from "./MapaJornada.jsx";
import { TextoModulo } from "./TextoModulo.jsx";
import { Icone } from "./Icone.jsx";
import { dataLocal } from "../estado/indicadores.js";
export function KitConsulta({ dados, pilar, destino, referencia, retorno, importar, registrar }) {
  const carregado = useConteudo(pilar);
  const [busca, setBusca] = useState("");
  const catalogo = carregado.conteudo || CATALOGO[pilar];
  const modulos = catalogo.sessoes.flatMap((s) => s.modulos.map((m) => ({ ...m, sessao: s.nome })));
  const fontes = modulos.filter((m) => /fontes/.test(m.id));
  const alvo = modulos.find((m) => m.id === destino && m.kit);
  useEffect(() => {
    if (destino === "fontes" && referencia) {
      const el = document.getElementById("fonte-" + referencia);
      if (el) { el.tabIndex = -1; el.focus(); el.scrollIntoView({ block: "center" }); }
    }
  }, [destino, referencia, carregado.conteudo]);
  function exportar() {
    const blob = new Blob([JSON.stringify({ produto: "lithium", schemaVersion: 1, exportadoEm: new Date().toISOString(), dados }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "lithium-" + dataLocal() + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const normal = (s) => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const itens = modulos.filter((m) => m.kit && !/fontes|fast-travel/.test(m.id) && normal(m.titulo + " " + m.sessao).includes(normal(busca)));
  const legados = Object.entries(dados.legado).filter(([k, v]) => !k.endsWith(":visitada") && v != null);
  return <>
    <header className="cabecalho-pagina"><div><p className="sobretitulo">APOIO NA HORA CERTA</p><h1 tabIndex="-1">Seu Kit.</h1><p className="texto-secundario">Consulte, registre e volte para o que estava fazendo.</p></div><Icone nome="kit" tamanho={36} /></header>
    {retorno && <a className="voltar-app" href={retorno}>← Voltar à atividade</a>}
    <AbasPilares pilar={pilar} destino="kit" />
    {destino ? <section className="painel consulta"><a className="voltar-app" href={"#/kit/" + pilar}>← Todos os recursos</a><h2>{destino === "fontes" ? "Fontes · " + catalogo.nome : alvo?.titulo || "Recurso não encontrado"}</h2>{destino === "fontes" ? fontes.map((m) => <TextoModulo key={m.id} texto={m.texto} pilar={pilar} />) : alvo ? <TextoModulo texto={alvo.texto} pilar={pilar} /> : <p>Escolha um recurso no Kit para continuar.</p>}{alvo?.acaoRegistro && <button className="botao secundario" onClick={() => registrar(alvo.acaoRegistro)}>{alvo.acaoRegistro === "metas" ? "Planejar minha semana" : "Abrir registro"}</button>}{!carregado.conteudo && <p role="status">{carregado.erro || "Preparando conteúdo…"}{carregado.erro && <button className="botao-texto" onClick={carregado.tentar}>Tentar novamente</button>}</p>}</section> : <>
      <div className="kit-grade"><section className="painel"><div className="secao-cabeca"><h2>Consulta rápida</h2><span className="sobretitulo">{catalogo.nome}</span></div><label className="campo"><span>Buscar no Kit</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Exercício, ficha, aviso…" /></label><ul className="kit-lista">{itens.map((m) => <li key={m.fonte}><a href={"#/kit/" + pilar + "/" + m.id}><div><strong>{m.titulo}</strong><span className="texto-secundario">{m.sessao}</span></div><Icone nome="seta" tamanho={18} /></a></li>)}{!itens.length && <li><p>Nenhum recurso com esse nome.</p></li>}</ul><a className="botao secundario" href={"#/kit/" + pilar + "/fontes"}>Fontes e referências <Icone nome="seta" /></a></section>
      <aside><section className="painel"><Icone nome="salvo" /><h2>Seus dados, com você.</h2><p className="texto-secundario">Tudo fica neste aparelho. Exporte uma cópia para guardar seus registros antes de trocar de navegador ou limpar os dados.</p><div className="pilha-botoes"><button className="botao primario" onClick={exportar}>Exportar cópia local</button><button className="botao secundario" onClick={importar}>Restaurar de um arquivo</button></div></section><section className="painel"><h2>Sobre o Lithium</h2><p className="texto-secundario">Treino, dieta e sono em um único protocolo de rotina. Conteúdo educativo, com fontes e avisos acessíveis a qualquer momento.</p><span className="registro-pequeno">VERSÃO 0.2 · DADOS NO APARELHO</span></section></aside></div>
      {legados.length > 0 && <section className="painel legado"><h2>Anotações da versão anterior</h2><p className="texto-secundario">Preservadas como foram gravadas. Visitas antigas não contam como conclusões.</p>{legados.map(([chave, valor]) => <details key={chave}><summary>{chave.split(":").slice(1).join(" / ")}</summary><p>{typeof valor?.v === "string" ? valor.v : typeof valor?.v === "boolean" ? valor.v ? "Marcado" : "Não marcado" : JSON.stringify(valor)}</p></details>)}</section>}
    </>}
  </>;
}
