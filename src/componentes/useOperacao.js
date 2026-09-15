import { useRef, useState } from "react";

/**
 * Uma operação assíncrona disparada pela tela: trava contra duplo toque,
 * `ocupado` para o botão dizer "Salvando…" e a mensagem de erro para a tela
 * mostrar. O preenchimento do usuário nunca se perde: quem falha é a operação.
 */
export function useOperacao() {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const trava = useRef(false);

  async function executar(operacao) {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try { await operacao(); }
    catch (e) { setErro(e.message); }
    finally { trava.current = false; setOcupado(false); }
  }

  return { ocupado, erro, setErro, executar };
}
