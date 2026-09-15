import { PILARES } from "../conteudo/catalogo.js";
import { link } from "./formato.js";
import { Icone } from "./Icone.jsx";

/** A troca entre os três protocolos, na tela de destino (jornada ou kit). */
export function AbasPilares({ pilar, destino = "jornada" }) {
  return (
    <nav className="abas-pilares" aria-label="Protocolos">
      {PILARES.map((p) => (
        <a key={p.id} href={link(destino, p.id)} aria-current={pilar === p.id ? "page" : undefined}><Icone nome={p.icone} />{p.nome}</a>
      ))}
    </nav>
  );
}
