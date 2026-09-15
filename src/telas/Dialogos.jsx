import { useState } from "react";
import { alterar, importarBackup, removerRegistro, salvarRegistro, validarCopia } from "../dados/repositorio.js";
import { dataLocal, inicioSemana } from "../dominio/indicadores.js";
import { Campo, Dialogo } from "../componentes/Dialogo.jsx";
import { Icone } from "../componentes/Icone.jsx";
import { useOperacao } from "../componentes/useOperacao.js";

const TITULO_NOVO = { treino: "Registrar treino", dieta: "Registrar refeição", sono: "Registrar noite", peso: "Registrar peso" };
const LIMITE_DA_COPIA = 5 * 1024 * 1024;
const MAXIMO_DE_LINHAS = 40;

const linhaVazia = () => ({ nome: "", carga: "", series: "1", repeticoes: "", unidade: "reps" });

const formularioVazio = (tipo) => ({
  id: crypto.randomUUID(), tipo, data: dataLocal(), nota: "", treino: "A", exercicios: [linhaVazia()],
  refeicao: "", blocos: "", deitou: "", levantou: "", sensacao: "", kg: "",
});

/** O horário local só vira instante novo se mudou: editar a nota não reescreve a noite com o fuso de hoje. */
const instante = (local, localAnterior, instanteAnterior) => (localAnterior === local && instanteAnterior ? instanteAnterior : new Date(local).toISOString());

/** Do formulário (texto) para o registro (números), só com os campos do tipo. */
function montarRegistro(tipo, form, anterior) {
  const base = { id: form.id, tipo, data: form.data, nota: form.nota, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (tipo === "treino") {
    const exercicios = form.exercicios.map((e) => ({ ...e, nome: e.nome.trim(), carga: Number(e.carga), series: Number(e.series), repeticoes: Number(e.repeticoes) }));
    return { ...base, treino: form.treino, exercicios };
  }
  if (tipo === "dieta") return { ...base, refeicao: form.refeicao.trim(), blocos: Number(form.blocos) };
  if (tipo === "sono") {
    return {
      ...base, deitou: form.deitou, levantou: form.levantou, sensacao: Number(form.sensacao),
      deitouEm: instante(form.deitou, anterior?.deitou, anterior?.deitouEm),
      levantouEm: instante(form.levantou, anterior?.levantou, anterior?.levantouEm),
    };
  }
  return { ...base, kg: Number(form.kg) };
}

export function DialogoRegistro({ tipo, registro, fechar }) {
  const [form, setForm] = useState(() => registro || formularioVazio(tipo));
  const [removendo, setRemovendo] = useState(false);
  const { ocupado, erro, executar } = useOperacao();
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function salvar(evento) {
    evento.preventDefault();
    executar(async () => {
      await salvarRegistro(montarRegistro(tipo, form, registro), registro?.revision ?? null);
      fechar("Registro salvo neste aparelho.");
    });
  }
  const remover = () => executar(async () => {
    await removerRegistro(registro.id, registro.revision);
    fechar("Registro removido.");
  });

  return (
    <Dialogo titulo={registro ? "Editar registro" : TITULO_NOVO[tipo]} fechar={() => !ocupado && fechar()}>
      <form onSubmit={salvar} className="formulario">
        <p className="texto-secundario">Registre o que aconteceu. Você pode corrigir depois.</p>
        <Campo nome={tipo === "sono" ? "Data em que acordou" : "Data"} type="date" value={form.data} max={dataLocal()} required onChange={mudar("data")} />
        {tipo === "treino" && <CamposDeTreino form={form} setForm={setForm} mudar={mudar} />}
        {tipo === "dieta" && <>
          <Campo nome="Refeição" required value={form.refeicao} maxLength={100} onChange={mudar("refeicao")} placeholder="Ex.: almoço" />
          <Campo nome="Blocos desta refeição" required type="number" inputMode="decimal" min="0.5" max="100" step="0.5" value={form.blocos} onChange={mudar("blocos")} />
          <p className="texto-secundario">Use o método de blocos do protocolo. Cada refeição contribui uma vez para o total do dia.</p>
        </>}
        {tipo === "sono" && <>
          <Campo nome="Deitou em" required type="datetime-local" value={form.deitou} onChange={mudar("deitou")} />
          <Campo nome="Levantou em" required type="datetime-local" value={form.levantou} onChange={mudar("levantou")} />
          <Campo nome="Como acordou?">
            <select required value={form.sensacao} onChange={mudar("sensacao")}>
              <option value="">Selecione</option>
              <option value="1">1 · Muito cansado</option>
              <option value="2">2 · Cansado</option>
              <option value="3">3 · Razoável</option>
              <option value="4">4 · Descansado</option>
              <option value="5">5 · Muito descansado</option>
            </select>
          </Campo>
          <p className="texto-secundario">Os horários calculam tempo na cama. Não medem sozinhos o tempo dormido.</p>
        </>}
        {tipo === "peso" && <Campo nome="Peso (kg)" required type="number" inputMode="decimal" min="20" max="400" step="0.1" value={form.kg} onChange={mudar("kg")} />}
        <Campo nome="Observação (opcional)"><textarea rows="2" maxLength={5000} value={form.nota || ""} onChange={mudar("nota")} /></Campo>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="acoes-form">
          <button type="submit" className="botao primario" disabled={ocupado}><Icone nome="salvo" />{ocupado ? "Salvando…" : "Salvar registro"}</button>
          <button type="button" className="botao secundario" disabled={ocupado} onClick={() => fechar()}>Cancelar</button>
        </div>
        {registro && (
          <div className="remover-registro">
            {removendo ? <>
              <p>Remover este registro do histórico? Os indicadores serão recalculados.</p>
              <button type="button" className="botao secundario" onClick={remover} disabled={ocupado}>Confirmar remoção</button>
              <button type="button" className="botao-texto" onClick={() => setRemovendo(false)}>Manter registro</button>
            </> : <button type="button" className="botao-texto" onClick={() => setRemovendo(true)}>Remover registro</button>}
          </div>
        )}
      </form>
    </Dialogo>
  );
}

/** Uma linha por grupo de séries com a mesma carga e repetições. */
function CamposDeTreino({ form, setForm, mudar }) {
  const exercicios = form.exercicios;
  const trocarLinha = (i, campo, valor) => setForm({ ...form, exercicios: exercicios.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)) });
  const removerLinha = (i) => setForm({ ...form, exercicios: exercicios.filter((_, j) => j !== i) });
  const adicionarLinha = () => setForm({ ...form, exercicios: [...exercicios, linhaVazia()] });

  return <>
    <Campo nome="Treino"><select value={form.treino} onChange={mudar("treino")}>{["A", "B", "C", "D"].map((v) => <option key={v}>{v}</option>)}</select></Campo>
    <p className="texto-secundario">Agrupe séries com a mesma carga e repetições. Para valores diferentes, adicione outra linha do exercício.</p>
    {exercicios.map((linha, i) => (
      <fieldset className="exercicio-form" key={i}>
        <legend>Exercício / grupo de séries {i + 1}</legend>
        <Campo nome="Exercício" required maxLength={100} value={linha.nome} onChange={(e) => trocarLinha(i, "nome", e.target.value)} placeholder="Ex.: agachamento goblet" />
        <div className="campos-grade">
          <Campo nome="Carga (kg)" type="number" inputMode="decimal" min="0" max="1000" step="0.25" required value={linha.carga} onChange={(e) => trocarLinha(i, "carga", e.target.value)} />
          <Campo nome="Séries" type="number" inputMode="numeric" min="1" max="20" required value={linha.series} onChange={(e) => trocarLinha(i, "series", e.target.value)} />
          <Campo nome={linha.unidade === "s" ? "Segundos" : "Repetições"} type="number" inputMode="numeric" min="1" max="3600" required value={linha.repeticoes} onChange={(e) => trocarLinha(i, "repeticoes", e.target.value)} />
          <Campo nome="Unidade">
            <select value={linha.unidade} onChange={(e) => trocarLinha(i, "unidade", e.target.value)}><option value="reps">Repetições</option><option value="s">Segundos</option></select>
          </Campo>
        </div>
        {exercicios.length > 1 && <button type="button" className="botao-texto" onClick={() => removerLinha(i)}>Remover linha {i + 1}</button>}
      </fieldset>
    ))}
    <button type="button" className="botao secundario" disabled={exercicios.length >= MAXIMO_DE_LINHAS} onClick={adicionarLinha}><Icone nome="mais" /> Adicionar exercício / série</button>
  </>;
}

export function DialogoMetas({ dados, fechar }) {
  const semana = inicioSemana();
  const [metas, setMetas] = useState(dados.metas[semana] || { treinos: 3, noites: 5, blocos: "" });
  const { ocupado, erro, executar } = useOperacao();
  const mudar = (campo) => (e) => setMetas({ ...metas, [campo]: e.target.value });

  function salvar(evento) {
    evento.preventDefault();
    executar(async () => {
      // Campo em branco é meta não definida: `null`, nunca zero.
      const blocos = metas.blocos === "" || metas.blocos == null ? null : Number(metas.blocos);
      await alterar((d) => { d.metas[semana] = { treinos: Number(metas.treinos), noites: Number(metas.noites), blocos }; });
      fechar("Metas desta semana salvas.");
    });
  }

  return (
    <Dialogo titulo="Planejar minha semana" fechar={() => !ocupado && fechar()}>
      <form className="formulario" onSubmit={salvar}>
        <p>Confirme metas possíveis para esta semana. Seus registros anteriores continuam iguais.</p>
        <Campo nome="Treinos planejados" type="number" min="1" max="4" required value={metas.treinos} onChange={mudar("treinos")} />
        <Campo nome="Manhãs para preencher o diário de sono" type="number" min="1" max="7" required value={metas.noites} onChange={mudar("noites")} />
        <Campo nome="Meta diária de blocos (opcional)" type="number" min="1" max="100" step="0.5" value={metas.blocos ?? ""} onChange={mudar("blocos")} />
        <p className="texto-secundario">A meta de blocos vem da tabela do seu protocolo. Deixe em branco até defini-la.</p>
        {erro && <p role="alert" className="erro">{erro}</p>}
        <button className="botao primario" disabled={ocupado}>{ocupado ? "Salvando…" : "Confirmar metas"}</button>
      </form>
    </Dialogo>
  );
}

export function DialogoImportar({ fechar }) {
  const [copia, setCopia] = useState(null);
  const { ocupado, erro, setErro, executar } = useOperacao();

  async function lerArquivo(evento) {
    setCopia(null);
    setErro("");
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    try {
      if (arquivo.size > LIMITE_DA_COPIA) throw new Error("Escolha uma cópia de até 5 MB.");
      const conteudo = JSON.parse(await arquivo.text());
      validarCopia(conteudo);
      setCopia(conteudo);
    } catch (e) { setErro(e.message); }
  }
  const restaurar = () => executar(async () => {
    await importarBackup(copia);
    fechar("Cópia restaurada.");
  });

  return (
    <Dialogo titulo="Restaurar cópia local" fechar={() => !ocupado && fechar()}>
      <div className="formulario">
        <Campo nome="Arquivo de cópia"><input type="file" accept=".json,application/json" onChange={lerArquivo} /></Campo>
        {copia && <>
          <p>{copia.dados.registros.length} registros e {Object.values(copia.dados.progresso).filter((p) => p.concluidaEm).length} sessões concluídas nesta cópia.</p>
          <p>A restauração substitui os dados atuais deste aparelho. Exporte os dados atuais pelo Kit antes de continuar, se quiser preservá-los.</p>
          <button className="botao primario" disabled={ocupado} onClick={restaurar}>Substituir dados pela cópia</button>
        </>}
        {erro && <p role="alert" className="erro">{erro}</p>}
      </div>
    </Dialogo>
  );
}
