import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { aguardarEscritas } from "../dados/repositorio.js";
import { Icone } from "../componentes/Icone.jsx";

/**
 * Diz se o app abre sem rede, e oferece a versão nova quando ela chega.
 *
 * "Disponível offline" só aparece depois de conferido: as quatro páginas, a
 * fonte e toda resposta do precache íntegra. A conferência roda quando algo
 * que a muda acontece (o service worker assume, a rede cai ou volta, a aba volta
 * a ficar visível), e não num relógio: reler o cache inteiro a cada cinco
 * segundos custava trabalho sem mudar a resposta.
 */
const PAGINAS = ["/index.html", "/hipertrofia.html", "/dieta.html", "/sono.html"];

let atualizar;
let versaoNovaPronta = false;
const ouvintes = new Set();

function registrar() {
  if (atualizar) return;
  atualizar = registerSW({
    immediate: true,
    onNeedRefresh() { versaoNovaPronta = true; ouvintes.forEach((avisar) => avisar(true)); },
  });
}

/** `null` quando ainda não há o que conferir (sem service worker no controle). */
async function pacoteOfflineCompleto() {
  if (!("serviceWorker" in navigator) || !("caches" in window) || !navigator.serviceWorker.controller) return null;
  const nome = (await caches.keys()).find((n) => n.includes("precache"));
  if (!nome) return null;
  const cache = await caches.open(nome);
  const pedidos = await cache.keys();
  const caminhos = new Set(pedidos.map((pedido) => new URL(pedido.url).pathname));
  const temTudo = PAGINAS.every((pagina) => caminhos.has(pagina)) && pedidos.some((pedido) => pedido.url.includes(".woff2"));
  const respostas = await Promise.all(pedidos.map((pedido) => cache.match(pedido)));
  return temTudo && respostas.every((resposta) => resposta?.ok);
}

export function EstadoOffline({ ocupado }) {
  const [rede, setRede] = useState(navigator.onLine);
  const [offline, setOffline] = useState(false);
  const [nova, setNova] = useState(versaoNovaPronta);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (import.meta.env.PROD) registrar();
    ouvintes.add(setNova);
    let ativo = true;
    const conferir = () => pacoteOfflineCompleto().then(
      (completo) => { if (ativo && completo != null) setOffline(completo); },
      () => { if (ativo) setOffline(false); },
    );
    const aoMudarRede = () => { setRede(navigator.onLine); conferir(); };
    const aoVoltarParaAba = () => { if (document.visibilityState === "visible") conferir(); };
    const trabalhador = "serviceWorker" in navigator ? navigator.serviceWorker : null;

    conferir();
    trabalhador?.ready.then(conferir);
    trabalhador?.addEventListener("controllerchange", conferir);
    window.addEventListener("online", aoMudarRede);
    window.addEventListener("offline", aoMudarRede);
    document.addEventListener("visibilitychange", aoVoltarParaAba);
    return () => {
      ativo = false;
      ouvintes.delete(setNova);
      trabalhador?.removeEventListener("controllerchange", conferir);
      window.removeEventListener("online", aoMudarRede);
      window.removeEventListener("offline", aoMudarRede);
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, []);

  async function instalarVersaoNova() {
    try { await aguardarEscritas(); atualizar?.(true); }
    catch { setErro("Confira o registro antes de atualizar."); }
  }

  const rotulo = offline ? (rede ? "Disponível offline" : "Você está offline") : (rede ? "Dados neste aparelho" : "Sem conexão");
  const explicacao = offline ? "Os arquivos desta versão foram conferidos no aparelho." : "A preparação offline acontece depois de abrir o app com internet.";

  return (
    <div className="estado-offline">
      <span title={explicacao}><Icone nome={rede ? "salvo" : "offline"} tamanho={16} />{rotulo}</span>
      {nova && <button className="botao-texto" disabled={ocupado} onClick={instalarVersaoNova}>Atualizar app</button>}
      {erro && <span role="alert">{erro}</span>}
    </div>
  );
}
