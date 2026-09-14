import { useEffect, useRef } from "react";
import { Bloco } from "./Bloco.jsx";
import { marcarVisitada } from "../estado/visitadas.js";

/**
 * Uma sessão: a unidade de leitura do app, no lugar do capítulo.
 *
 * O `id` é o destino do fast travel (LG-30) e a raiz da chave de anotação
 * (LG-26). O tema alterna por sessão, na cadência da landing: a troca acontece
 * no limite, em corte.
 *
 * Ela se marca como visitada quando ENTRA de verdade na tela, e não quando é
 * montada: montar é o React, ver é o leitor.
 */
export function Sessao({ sessao, protocolo, indice }) {
  const raiz = useRef(null);

  useEffect(() => {
    const no = raiz.current;
    if (!no || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { marcarVisitada(protocolo, sessao.id); obs.disconnect(); } },
      { threshold: 0.25 },
    );
    obs.observe(no);
    return () => obs.disconnect();
  }, [protocolo, sessao.id]);

  const cartas = sessao.blocos.filter((b) => b.lg === "LG-09");

  // A abertura de capítulo do PDF repete o nome do capítulo, e o cabeçalho da
  // sessão já o diz. Duas vezes o mesmo título em escala de cartaz é ruído, e
  // custa uma tela inteira de rolagem.
  //
  // O nome nem sempre chega inteiro num elemento: o cartaz o quebra em linhas
  // ("SEUS" / "NÚMEROS", "A HIERARQUIA DO" / "QUE IMPORTA"), e comparar por
  // igualdade deixava o pedaço solto na tela, logo abaixo do nome completo.
  // Some o pedaço que o nome da sessão contém, e só na capa de abertura dela.
  const nomeNormal = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
  // Vale na capa (LG-02) e no texto que acende (LG-08), que são os dois
  // layouts em que o cartaz do PDF repete o nome do capítulo.
  const cartaz = (b) => b.lg === "LG-02" || b.lg === "LG-08";
  const ecoDoNome = (e) =>
    (e.tipo === "titulo-cartaz" || e.tipo === "titulo")
    && nomeNormal(e.texto).length >= 2
    && nomeNormal(sessao.nome).includes(nomeNormal(e.texto));
  const blocos = juntarFechamento(sessao.blocos
    .map((b) => (cartaz(b)
      ? { ...b, elementos: b.elementos.filter((e) => !ecoDoNome(e)) } : b))
    .filter((b) => b.elementos.length));

  return (
    <section
      className="bloco"
      id={sessao.id}
      ref={raiz}
      data-sessao={sessao.id}
      data-theme={indice % 2 === 1 ? "cartaz" : undefined}
    >
      <header className="envelope">
        <span className="rotulo overline">({sessao.sub})</span>
        <h2 className="titulo h1">{sessao.nome}</h2>
      </header>

      {cartas.length >= 2 ? (
        <BlocosComBaralho sessao={sessao} protocolo={protocolo} cartas={cartas} blocos={blocos} />
      ) : (
        blocos.map((b, i) => (
          <Bloco key={i} bloco={b} ordem={i} protocolo={protocolo} sessao={sessao.id} />
        ))
      )}
    </section>
  );
}

/**
 * LG-27 · "uma ocorrência por sessão", e o catálogo é literal nisso.
 *
 * Uma página "Faça isto hoje" é UM card, mas ela chega em vários blocos - a
 * chamada, cada ação e o quadro de acompanhamento saem separados da extração.
 * Renderizados um a um, o leitor via "Faça isto hoje" cinco vezes seguidas na
 * mesma tela. A corrida de blocos vira um card só, pelo mesmo motivo que as
 * cartas viram um baralho só logo abaixo: o efeito é o acúmulo, não a
 * repetição.
 */
function juntarFechamento(blocos) {
  const saida = [];
  for (const b of blocos) {
    const ultimo = saida.at(-1);
    if (b.lg === "LG-27" && ultimo?.lg === "LG-27") {
      ultimo.elementos = [...ultimo.elementos, ...b.elementos];
      if (b.campos?.length) ultimo.campos = [...(ultimo.campos ?? []), ...b.campos];
      continue;
    }
    saida.push({ ...b });
  }
  return saida;
}

/**
 * As cartas de uma sessão empilham num baralho só (LG-09): cada uma gruda num
 * degrau abaixo da anterior. Espalhadas pelo fluxo elas grudariam sozinhas, e
 * o acúmulo, que é o efeito, não acontece.
 */
function BlocosComBaralho({ sessao, protocolo, cartas, blocos }) {
  const saida = [];
  let baralhoPosto = false;
  blocos.forEach((b, i) => {
    if (b.lg === "LG-09") {
      if (baralhoPosto) return;
      baralhoPosto = true;
      saida.push(
        <div className="envelope" key={`baralho-${i}`}>
          <div className="baralho">
            {cartas.map((c, j) => (
              <Bloco key={j} bloco={c} ordem={j} protocolo={protocolo} sessao={sessao.id} />
            ))}
          </div>
        </div>,
      );
      return;
    }
    saida.push(<Bloco key={i} bloco={b} ordem={i} protocolo={protocolo} sessao={sessao.id} />);
  });
  return saida;
}
