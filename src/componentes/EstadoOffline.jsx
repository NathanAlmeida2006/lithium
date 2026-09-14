import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { Icone } from "./Icone.jsx";
import { aguardarEscritas } from "../estado/repositorioLocal.js";
let atualizar;
const ouvintes = new Set();
let pronta = false;
function registrar() {
  if (atualizar) return;
  atualizar = registerSW({ immediate: true, onNeedRefresh() { pronta = true; ouvintes.forEach((f) => f(true)); } });
}
export function EstadoOffline({ ocupado }) {
  const [erro, setErro] = useState("");
  const [rede, setRede] = useState(navigator.onLine), [offline, setOffline] = useState(false), [nova, setNova] = useState(pronta);
  useEffect(() => {
    if (import.meta.env.PROD) registrar();
    ouvintes.add(setNova);
    let ativo = true;
    const onRede = () => setRede(navigator.onLine);
    window.addEventListener("online", onRede); window.addEventListener("offline", onRede);
    async function conferir() {
      if (!("serviceWorker" in navigator) || !("caches" in window)) return;
      try {
        const nomes = await caches.keys(), nome = nomes.find((n) => n.includes("precache"));
        if (!nome || !navigator.serviceWorker.controller) return;
        const cache = await caches.open(nome), chaves = await cache.keys();
        const paths = new Set(chaves.map((r) => new URL(r.url).pathname));
        const pacote = ["/index.html", "/hipertrofia.html", "/dieta.html", "/sono.html"].every((p) => paths.has(p)) && chaves.some((r) => r.url.includes(".woff2"));
        const respostas = await Promise.all(chaves.map((r) => cache.match(r)));
        if (ativo) setOffline(pacote && respostas.every((r) => r?.ok));
      } catch { if (ativo) setOffline(false); }
    }
    conferir(); const intervalo = setInterval(conferir, 5000);
    return () => { ativo = false; clearInterval(intervalo); ouvintes.delete(setNova); window.removeEventListener("online", onRede); window.removeEventListener("offline", onRede); };
  }, []);
  return <div className="estado-offline"><span title={offline ? "Os arquivos desta versão foram conferidos no aparelho." : "A preparação offline acontece depois de abrir o app com internet."}><Icone nome={rede ? "salvo" : "offline"} tamanho={16} />{offline ? rede ? "Disponível offline" : "Você está offline" : rede ? "Dados neste aparelho" : "Sem conexão"}</span>{nova && <button className="botao-texto" disabled={ocupado} onClick={async () => { try { await aguardarEscritas(); atualizar?.(true); } catch { setErro("Confira o registro antes de atualizar."); } }}>Atualizar app</button>}{erro && <span role="alert">{erro}</span>}</div>;
}
