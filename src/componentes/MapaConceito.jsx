import { useState } from "react";

// Rótulos extraídos dos próprios módulos, sem acrescentar prescrição.
const MAPAS = {
  "modulo-01-tres-andares": { tipo: "andares", titulo: "Comece pela fundação", pergunta: "Qual andar sustenta os outros?", correta: 1, opcoes: ["O horário das refeições", "As calorias", "O tipo de carboidrato"], retorno: "Calorias são a fundação. Proteína vem no segundo andar; o resto é acabamento.", itens: [
    ["Calorias", "Andar 1", "O andar 1 decide se o peso se move e em que direção."],
    ["Proteína", "Andar 2", "O andar 2 decide a qualidade do que você ganha."],
    ["O resto", "Andar 3", "O andar 3 é acabamento, e somado dá um efeito pequeno perto dos dois de baixo."],
  ] },
  "modulo-01-o-gatilho": { tipo: "elos", titulo: "A ideia em movimento", pergunta: "O que conecta o estímulo à construção?", correta: 2, opcoes: ["Trocar de aparelho a cada treino", "Buscar uma técnica nova por sessão", "Repetir e aumentar a tensão ao longo das semanas"], retorno: "Esse aumento ao longo das semanas é a sobrecarga progressiva. A explicação completa e a fonte estão nos trechos abaixo.", itens: [
    ["Tensão", "O estímulo", "A força que a fibra muscular precisa produzir contra uma resistência."],
    ["Repetição", "Ao longo das semanas", "Quando essa tensão se repete e aumenta ao longo das semanas, o corpo entende o recado."],
    ["Construção", "A resposta", "Esse aumentar ao longo das semanas tem nome: sobrecarga progressiva."],
  ] },
  "modulo-02-o-prato-ajustado": { tipo: "prato", titulo: "Explore o prato de sempre", pergunta: "Qual é a ideia do prato ajustado?", correta: 0, opcoes: ["Mesma comida, outro tamanho", "Um cardápio completamente novo", "Uma panela extra em cada refeição"], retorno: "Porção reposicionada, não cardápio novo. O diagrama é uma referência visual; o contexto completo continua abaixo.", itens: [
    ["A mistura", "Cerca de ¼ do prato", "1 palma e meia. O diagrama é uma regra visual, não uma medida de laboratório."],
    ["Arroz e feijão", "De sempre", "Mesma comida, outro tamanho."],
    ["Salada", "O que houver", "Sem pesar nada. Sem panela extra."],
  ] },
};

export function MapaConceito({ modulo }) {
  const [ativo, setAtivo] = useState(0);
  const [resposta, setResposta] = useState(null);
  const mapa = MAPAS[modulo.id];
  if (!mapa) return null;
  return <section className={"mapa-conceito mapa-conceito--" + mapa.tipo} aria-label={mapa.titulo}>
    <p className="mapa-conceito-titulo">{mapa.titulo}</p>
    <div className="mapa-conceito-pecas">
      {mapa.itens.map(([nome, legenda], i) => <button key={nome} type="button" aria-pressed={ativo === i} onClick={() => setAtivo(i)}>
        <span>{legenda}</span><strong>{nome}</strong>
      </button>)}
    </div>
    <p className="mapa-conceito-legenda" aria-live="polite">{mapa.itens[ativo][2]}</p>
    <fieldset className="conceito-desafio">
      <legend>{mapa.pergunta}</legend>
      <div>{mapa.opcoes.map((opcao, i) => <button type="button" key={opcao} aria-pressed={resposta === i} onClick={() => setResposta(i)}>{opcao}</button>)}</div>
      {resposta !== null && <p role="status">{resposta === mapa.correta ? "Isso mesmo. " + mapa.retorno : "Volte às peças do diagrama e tente de novo. Você pode explorar quantas vezes quiser."}</p>}
    </fieldset>
  </section>;
}
