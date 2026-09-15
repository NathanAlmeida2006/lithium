import { cloneElement, useEffect, useId, useRef } from "react";
import { Icone } from "./Icone.jsx";

/**
 * Diálogo modal nativo: o navegador prende o foco e o Esc fecha; ao sair, o
 * foco volta para quem abriu. `data-lenis-prevent` deixa a roda rolar dentro
 * dele em vez de rolar a página por trás.
 */
export function Dialogo({ titulo, children, fechar }) {
  const ref = useRef(null);
  useEffect(() => {
    const origem = document.activeElement;
    ref.current.showModal();
    return () => { if (origem?.isConnected) origem.focus(); };
  }, []);
  const cancelar = (evento) => { evento.preventDefault(); fechar(); };

  return (
    <dialog ref={ref} data-lenis-prevent className="dialogo-app" onCancel={cancelar} aria-labelledby="titulo-dialogo">
      <header className="dialogo-cabeca">
        <h2 id="titulo-dialogo">{titulo}</h2>
        <button className="botao-icone" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" /></button>
      </header>
      {children}
    </dialog>
  );
}

/** Rótulo ligado ao controle. Sem filho, o controle é um `<input>` com as props recebidas. */
export function Campo({ nome, children, ...props }) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{nome}</label>
      {children ? cloneElement(children, { id }) : <input id={id} {...props} />}
    </div>
  );
}
