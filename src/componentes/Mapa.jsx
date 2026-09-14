import { useEffect, useState } from "react";
import { visitada } from "../estado/visitadas.js";

/**
 * LG-30 · o mapa de sessões: o índice virado destino.
 *
 * É o que o briefing pede pelo nome, e é o que substitui o sumário: toca e vai.
 * Nenhum número de página, nenhuma contagem de progresso. O ponto cheio diz que
 * a sessão já foi vista, e o índice muda de tom junto - cor nunca comunica
 * sozinha.
 */
export function Mapa({ sessoes, protocolo }) {
  const [vistas, definirVistas] = useState(() => new Set());

  useEffect(() => {
    definirVistas(new Set(sessoes.filter((s) => visitada(protocolo, s.id)).map((s) => s.id)));
  }, [sessoes, protocolo]);

  return (
    <nav className="mapa" aria-label="Sessões do protocolo">
      {sessoes.map((s) => (
        <a
          className={`mapa__item${vistas.has(s.id) ? " mapa__item--visitada" : ""}`}
          href={`#${s.id}`}
          key={s.id}
        >
          <span className="mapa__ponto" />
          <span className="mapa__indice mono-reg">{String(s.numero).padStart(2, "0")}</span>
          <span className="mapa__nome h3">{s.nome}</span>
          <span className="mapa__sub caption">{s.sub}</span>
        </a>
      ))}
    </nav>
  );
}
