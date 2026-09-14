import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { Icone } from "./Icone.jsx";
import { alterar, salvarRegistro, removerRegistro, validarBackup, importarBackup } from "../estado/repositorioLocal.js";
import { dataLocal, inicioSemana } from "../estado/indicadores.js";

export function Dialogo({ titulo, children, fechar }) {
  const ref = useRef(null);
  useEffect(() => {
    const origem = document.activeElement;
    ref.current.showModal();
    return () => { if (origem?.isConnected) origem.focus(); };
  }, []);
  return <dialog ref={ref} className="dialogo-app" onCancel={(e) => { e.preventDefault(); fechar(); }} aria-labelledby="titulo-dialogo">
    <header className="dialogo-cabeca"><h2 id="titulo-dialogo">{titulo}</h2><button className="botao-icone" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" /></button></header>{children}
  </dialog>;
}
const nomes = { treino: "Registrar treino", dieta: "Registrar refeição", sono: "Registrar noite", peso: "Registrar peso" };
const novaLinha = () => ({ nome: "", carga: "", series: "1", repeticoes: "", unidade: "reps" });
function Campo({ nome, children, ...props }) {
  const id = useId();
  return <div className="campo"><label htmlFor={id}>{nome}</label>{children ? cloneElement(children, { id }) : <input id={id} {...props} />}</div>;
}
export function DialogoRegistro({ tipo, registro, fechar }) {
  const hoje = dataLocal();
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  const [form, setForm] = useState(() => registro || ({
    id: crypto.randomUUID(), tipo, data: hoje, nota: "", treino: "A", exercicios: [novaLinha()],
    refeicao: "", blocos: "", deitou: "", levantou: "", sensacao: "", kg: "",
  }));
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const trava = useRef(false);
  const mudar = (chave) => (e) => setForm({ ...form, [chave]: e.target.value });
  const linha = (i, chave, valor) => setForm({ ...form, exercicios: form.exercicios.map((e, j) => j === i ? { ...e, [chave]: valor } : e) });
  async function salvar(e) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true; setOcupado(true); setErro("");
    try {
      const dados = { id: form.id, tipo, data: form.data, nota: form.nota, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone };
      if (tipo === "treino") Object.assign(dados, { treino: form.treino, exercicios: form.exercicios.map((r) => ({ ...r, nome: r.nome.trim(), carga: Number(r.carga), series: Number(r.series), repeticoes: Number(r.repeticoes) })) });
      if (tipo === "dieta") Object.assign(dados, { refeicao: form.refeicao.trim(), blocos: Number(form.blocos) });
      if (tipo === "sono") Object.assign(dados, { deitou: form.deitou, levantou: form.levantou, sensacao: Number(form.sensacao), deitouEm: registro?.deitou === form.deitou && registro.deitouEm ? registro.deitouEm : new Date(form.deitou).toISOString(), levantouEm: registro?.levantou === form.levantou && registro.levantouEm ? registro.levantouEm : new Date(form.levantou).toISOString() });
      if (tipo === "peso") dados.kg = Number(form.kg);
      await salvarRegistro(dados, registro?.revision ?? null);
      fechar("Registro salvo neste aparelho.");
    } catch (err) { setErro(err.message); }
    finally { trava.current = false; setOcupado(false); }
  }
  async function remover() {
    if (trava.current) return;
    trava.current = true; setOcupado(true);
    try { await removerRegistro(registro.id, registro.revision); fechar("Registro removido."); }
    catch (e) { setErro(e.message); }
    finally { trava.current = false; setOcupado(false); }
  }
  return <Dialogo titulo={registro ? "Editar registro" : nomes[tipo]} fechar={() => !ocupado && fechar()}>
    <form onSubmit={salvar} className="formulario">
      <p className="texto-secundario">Registre o que aconteceu. Você pode corrigir depois.</p>
      <Campo nome={tipo === "sono" ? "Data em que acordou" : "Data"} type="date" value={form.data} max={hoje} required onChange={mudar("data")} />
      {tipo === "treino" && <>
        <Campo nome="Treino"><select value={form.treino} onChange={mudar("treino")}>{["A", "B", "C", "D"].map((v) => <option key={v}>{v}</option>)}</select></Campo>
        <p className="texto-secundario">Agrupe séries com a mesma carga e repetições. Para valores diferentes, adicione outra linha do exercício.</p>
        {form.exercicios.map((r, i) => <fieldset className="exercicio-form" key={i}><legend>Exercício / grupo de séries {i + 1}</legend>
          <Campo nome="Exercício" required maxLength={100} value={r.nome} onChange={(e) => linha(i, "nome", e.target.value)} placeholder="Ex.: agachamento goblet" />
          <div className="campos-grade">
            <Campo nome="Carga (kg)" type="number" inputMode="decimal" min="0" max="1000" step="0.25" required value={r.carga} onChange={(e) => linha(i, "carga", e.target.value)} />
            <Campo nome="Séries" type="number" inputMode="numeric" min="1" max="20" required value={r.series} onChange={(e) => linha(i, "series", e.target.value)} />
            <Campo nome={r.unidade === "s" ? "Segundos" : "Repetições"} type="number" inputMode="numeric" min="1" max="3600" required value={r.repeticoes} onChange={(e) => linha(i, "repeticoes", e.target.value)} />
            <Campo nome="Unidade"><select value={r.unidade} onChange={(e) => linha(i, "unidade", e.target.value)}><option value="reps">Repetições</option><option value="s">Segundos</option></select></Campo>
          </div>
          {form.exercicios.length > 1 && <button type="button" className="botao-texto" onClick={() => setForm({ ...form, exercicios: form.exercicios.filter((_, j) => j !== i) })}>Remover linha {i + 1}</button>}
        </fieldset>)}
        <button type="button" className="botao secundario" disabled={form.exercicios.length >= 40} onClick={() => setForm({ ...form, exercicios: [...form.exercicios, novaLinha()] })}><Icone nome="mais" /> Adicionar exercício / série</button>
      </>}
      {tipo === "dieta" && <><Campo nome="Refeição" required value={form.refeicao} maxLength={100} onChange={mudar("refeicao")} placeholder="Ex.: almoço" /><Campo nome="Blocos desta refeição" required type="number" inputMode="decimal" min="0.5" max="100" step="0.5" value={form.blocos} onChange={mudar("blocos")} /><p className="texto-secundario">Use o método de blocos do protocolo. Cada refeição contribui uma vez para o total do dia.</p></>}
      {tipo === "sono" && <><Campo nome="Deitou em" required type="datetime-local" value={form.deitou} onChange={mudar("deitou")} /><Campo nome="Levantou em" required type="datetime-local" value={form.levantou} onChange={mudar("levantou")} /><Campo nome="Como acordou?"><select required value={form.sensacao} onChange={mudar("sensacao")}><option value="">Selecione</option><option value="1">1 · Muito cansado</option><option value="2">2 · Cansado</option><option value="3">3 · Razoável</option><option value="4">4 · Descansado</option><option value="5">5 · Muito descansado</option></select></Campo><p className="texto-secundario">Os horários calculam tempo na cama. Não medem sozinhos o tempo dormido.</p></>}
      {tipo === "peso" && <Campo nome="Peso (kg)" required type="number" inputMode="decimal" min="20" max="400" step="0.1" value={form.kg} onChange={mudar("kg")} />}
      <Campo nome="Observação (opcional)"><textarea rows="2" maxLength={5000} value={form.nota || ""} onChange={mudar("nota")} /></Campo>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="acoes-form"><button type="submit" className="botao primario" disabled={ocupado}><Icone nome="salvo" />{ocupado ? "Salvando…" : "Salvar registro"}</button><button type="button" className="botao secundario" disabled={ocupado} onClick={() => fechar()}>Cancelar</button></div>
      {registro && <div className="remover-registro">{removendo ? <><p>Remover este registro do histórico? Os indicadores serão recalculados.</p><button type="button" className="botao secundario" onClick={remover} disabled={ocupado}>Confirmar remoção</button><button type="button" className="botao-texto" onClick={() => setRemovendo(false)}>Manter registro</button></> : <button type="button" className="botao-texto" onClick={() => setRemovendo(true)}>Remover registro</button>}</div>}
    </form>
  </Dialogo>;
}
export function DialogoMetas({ dados, fechar }) {
  const semana = inicioSemana();
  const [metas, setMetas] = useState(dados.metas[semana] || { treinos: 3, noites: 5, blocos: "" });
  const [erro, setErro] = useState(""), [ocupado, setOcupado] = useState(false);
  async function salvar(e) {
    e.preventDefault(); setOcupado(true);
    try {
      await alterar((d) => { d.metas[semana] = { treinos: Number(metas.treinos), noites: Number(metas.noites), blocos: metas.blocos === "" ? null : Number(metas.blocos) }; });
      fechar("Metas desta semana salvas.");
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <Dialogo titulo="Planejar minha semana" fechar={() => !ocupado && fechar()}><form className="formulario" onSubmit={salvar}>
    <p>Confirme metas possíveis para esta semana. Seus registros anteriores continuam iguais.</p>
    <Campo nome="Treinos planejados" type="number" min="1" max="4" required value={metas.treinos} onChange={(e) => setMetas({ ...metas, treinos: e.target.value })} />
    <Campo nome="Manhãs para preencher o diário de sono" type="number" min="1" max="7" required value={metas.noites} onChange={(e) => setMetas({ ...metas, noites: e.target.value })} />
    <Campo nome="Meta diária de blocos (opcional)" type="number" min="1" max="100" step="0.5" value={metas.blocos ?? ""} onChange={(e) => setMetas({ ...metas, blocos: e.target.value })} />
    <p className="texto-secundario">A meta de blocos vem da tabela do seu protocolo. Deixe em branco até defini-la.</p>
    {erro && <p role="alert" className="erro">{erro}</p>}
    <button className="botao primario" disabled={ocupado}>{ocupado ? "Salvando…" : "Confirmar metas"}</button>
  </form></Dialogo>;
}
export function DialogoImportar({ fechar }) {
  const [copia, setCopia] = useState(null), [erro, setErro] = useState(""), [ocupado, setOcupado] = useState(false);
  async function ler(e) {
    setCopia(null); setErro("");
    const arquivo = e.target.files?.[0]; if (!arquivo) return;
    try {
      if (arquivo.size > 5 * 1024 * 1024) throw new Error("Escolha uma cópia de até 5 MB.");
      const obj = JSON.parse(await arquivo.text()); validarBackup(obj); setCopia(obj);
    } catch (e) { setErro(e.message); }
  }
  async function restaurar() {
    setOcupado(true);
    try { await importarBackup(copia); fechar("Cópia restaurada."); } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <Dialogo titulo="Restaurar cópia local" fechar={() => !ocupado && fechar()}><div className="formulario"><Campo nome="Arquivo de cópia"><input type="file" accept=".json,application/json" onChange={ler} /></Campo>
    {copia && <><p>{copia.dados.registros.length} registros e {Object.values(copia.dados.progresso).filter((p) => p.concluidaEm).length} sessões concluídas nesta cópia.</p><p>A restauração substitui os dados atuais deste aparelho. Exporte os dados atuais pelo Kit antes de continuar, se quiser preservá-los.</p><button className="botao primario" disabled={ocupado} onClick={restaurar}>Substituir dados pela cópia</button></>}
    {erro && <p role="alert" className="erro">{erro}</p>}
  </div></Dialogo>;
}
