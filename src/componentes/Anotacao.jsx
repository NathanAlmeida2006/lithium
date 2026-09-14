import { useEffect, useRef, useState } from "react";
import { ler, gravar, hora } from "../estado/anotacao.js";

/**
 * LG-26 · Anotação persistida, na forma de componente.
 *
 * O mecanismo é o mesmo de `estado/anotacao.js`: uma chave por campo,
 * `lithium:<protocolo>:<sessao>:<campo>`, em `localStorage`. Aqui ele fica
 * ligado ao ciclo de vida do React, para o campo montar já preenchido em vez
 * de piscar vazio antes da varredura.
 *
 * Texto espera 400ms depois da última tecla: gravar por tecla escreve a cada
 * caractere, e esperar o `blur` perde o que o leitor digitou antes de trocar de
 * app, que no celular é o caso comum.
 */
const ESPERA = 400;

export function Anotacao({ chave, rotulo, linhas = 3 }) {
  const [valor, definirValor] = useState("");
  const [carimbo, definirCarimbo] = useState("");
  const relogio = useRef(0);

  useEffect(() => {
    const salvo = ler(chave);
    if (salvo) {
      definirValor(salvo.v ?? "");
      definirCarimbo(`[salvo · ${hora(salvo.em)}]`);
    }
  }, [chave]);

  function guardar(v) {
    const ok = gravar(chave, v);
    definirCarimbo(ok ? `[salvo · ${hora(Date.now())}]` : "[não foi possível salvar]");
  }

  function aoDigitar(e) {
    const v = e.target.value;
    definirValor(v);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => guardar(v), ESPERA);
  }

  return (
    <label className="anotacao">
      <span className="anotacao__rotulo overline">{rotulo}</span>
      <textarea
        className="anotacao__campo"
        rows={linhas}
        value={valor}
        onChange={aoDigitar}
        onBlur={() => { clearTimeout(relogio.current); guardar(valor); }}
        placeholder="Anote aqui. Fica salvo no aparelho."
      />
      <span className={`anotacao__estado mono-reg${carimbo ? " anotacao__estado--visivel" : ""}`}
            aria-live="polite">
        {carimbo}
      </span>
    </label>
  );
}

/** A caixa de marcação do checklist. Grava no ato: é um bit. */
export function Marcar({ chave, children }) {
  const [marcado, definirMarcado] = useState(false);

  useEffect(() => {
    const salvo = ler(chave);
    if (salvo) definirMarcado(salvo.v === true);
  }, [chave]);

  return (
    <label className="marcar">
      <input
        className="marcar__caixa"
        type="checkbox"
        checked={marcado}
        onChange={(e) => { definirMarcado(e.target.checked); gravar(chave, e.target.checked); }}
      />
      <span className="marcar__texto body">{children}</span>
    </label>
  );
}
