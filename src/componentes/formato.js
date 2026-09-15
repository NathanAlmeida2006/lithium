/** Como número, data e endereço aparecem na tela. Um lugar só, para o app inteiro falar igual. */

/** `link("jornada", pilar, sessao)` vira `#/jornada/<pilar>/<sessao>`; partes vazias somem. */
export const link = (...partes) => "#/" + partes.filter(Boolean).join("/");

export const formatarNumero = (n, casas = 0) => n == null ? "Sem registro" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

/** `2026-09-14` vira `14/09/2026`. Meio-dia, para o fuso não puxar a data para ontem. */
export const formatarData = (data) => new Date(data + "T12:00:00").toLocaleDateString("pt-BR");

export const doisDigitos = (n) => String(n).padStart(2, "0");
