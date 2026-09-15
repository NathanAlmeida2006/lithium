/**
 * As peças que toda tela repete no topo. O `h1` recebe foco a cada troca de
 * tela, para o leitor de tela anunciar onde se chegou.
 */
export function CabecalhoPagina({ sobretitulo, titulo, descricao, children }) {
  return (
    <header className="cabecalho-pagina">
      <div>
        <p className="sobretitulo">{sobretitulo}</p>
        <h1 tabIndex="-1">{titulo}</h1>
        {descricao && <p className="texto-secundario">{descricao}</p>}
      </div>
      {children}
    </header>
  );
}

/** `opcoes` é uma lista de `[valor, rótulo]`. O valor volta como texto, do jeito que o `<select>` entrega. */
export function SeletorPeriodo({ rotulo, valor, aoMudar, opcoes }) {
  return (
    <label className="periodo">
      <span>{rotulo}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        {opcoes.map(([valorOpcao, nome]) => <option key={valorOpcao} value={valorOpcao}>{nome}</option>)}
      </select>
    </label>
  );
}
