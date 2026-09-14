/**
 * LG-26 · Anotação persistida.
 *
 * O briefing pede ponto de anotação salvo no cache, seção por seção. Isto é o
 * mecanismo inteiro: nenhum estado global, nenhuma biblioteca, uma chave por
 * campo. `localStorage` sobrevive ao fechamento do app e é por dispositivo, que
 * é exatamente o escopo pedido.
 *
 * A chave é `lithium:<protocolo>:<sessao>:<campo>`. Trocar de protocolo não
 * mistura anotação, e renomear uma sessão não apaga a do vizinho por acidente.
 *
 * `localStorage` LANÇA em aba anônima com dados de site bloqueados, e volta
 * vazio depois de limpar o navegador: toda leitura e toda escrita vão em
 * try/catch, e a tela desenha certo sem valor nenhum.
 */
const PREFIXO = "lithium";

/** Monta a chave fora do DOM, para o componente React poder usá-la. */
export function chaveDe(protocolo, sessao, campo) {
  return [PREFIXO, protocolo, sessao, campo].join(":");
}
const ESPERA = 400;

function chave(campo) {
  const raiz = campo.closest("[data-protocolo]") || document.body;
  const sessao = campo.closest("[data-sessao]");
  return [PREFIXO, raiz.dataset.protocolo || "?",
          sessao?.dataset.sessao || "?", campo.dataset.campo].join(":");
}

// Valor e hora vivem na MESMA chave, em JSON. Duas chaves por campo dobram o
// storage e abrem a chance de uma sobreviver sem a outra.
export function ler(k) {
  try {
    const bruto = localStorage.getItem(k);
    return bruto === null ? null : JSON.parse(bruto);
  } catch { return null; }
}

export function gravar(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify({ v, em: Date.now() }));
    return true;
  } catch { return false; }
}

export function hora(ms) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function carimbar(campo, ok, em = Date.now()) {
  const estado = campo.parentElement.querySelector(".anotacao__estado");
  if (!estado) return;
  estado.textContent = ok ? `[salvo · ${hora(em)}]` : "[não foi possível salvar]";
  estado.classList.add("anotacao__estado--visivel");
}

export function ligarAnotacoes(raiz = document) {
  for (const campo of raiz.querySelectorAll("[data-campo]")) {
    const k = chave(campo);
    const salvo = ler(k);

    if (salvo && typeof salvo === "object") {
      if (campo.type === "checkbox") campo.checked = salvo.v === true;
      else campo.value = salvo.v ?? "";
      carimbar(campo, true, salvo.em);
    }

    // Caixa de marcação grava no ato: é um bit, e esperar não ajuda ninguém.
    if (campo.type === "checkbox") {
      campo.addEventListener("change", () =>
        carimbar(campo, gravar(k, campo.checked)));
      continue;
    }

    // Texto espera 400ms depois da última tecla. Gravar por tecla escreve no
    // disco a cada caractere; esperar o blur perde o que o visitante digitou
    // antes de trocar de app, que no celular é o caso comum.
    let relogio = 0;
    const adiar = () => {
      clearTimeout(relogio);
      relogio = setTimeout(() => carimbar(campo, gravar(k, campo.value)), ESPERA);
    };
    campo.addEventListener("input", adiar);
    campo.addEventListener("blur", () => {
      clearTimeout(relogio);
      carimbar(campo, gravar(k, campo.value));
    });
  }
}
