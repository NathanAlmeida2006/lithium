import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { estadoSessao, concluirSessao, chaveSessao, modulosDaJornada } from '../src/dominio/progresso.js';
import { dataLocal, resumir, tempoNaCama, inicioSemana, diasDoPeriodo, serieDiaria, exerciciosRegistrados } from '../src/dominio/indicadores.js';
import { validarRegistro } from '../src/dominio/registros.js';
import { revisao } from '../src/conteudo/revisoes.js';

let verificacoes = 0;
const conferir = (valor, descricao) => { assert.ok(valor, descricao); verificacoes++; console.log('ok ' + descricao); };
const catalogo = JSON.parse(await readFile('src/conteudo/catalogo.json', 'utf8'));
for (const [pilar, c] of Object.entries(catalogo)) {
  conferir(c.sessoes.length === 10, pilar + ': dez sessões');
  const praticas = c.sessoes.flatMap((s) => s.modulos).filter((m) => m.tipo === 'pratica');
  conferir(praticas.length === 8 && praticas.every((m) => m.acoes.length === 3), pilar + ': oito cards, três ações');
  const dados = { progresso: {} };
  for (const [i, s] of c.sessoes.entries()) {
    conferir(estadoSessao(c.sessoes, dados.progresso, pilar, s.id) === 'disponivel', pilar + ': etapa ' + i + ' libera na ordem');
    if (i + 1 < c.sessoes.length) assert.throws(() => concluirSessao(dados, c, pilar, c.sessoes[i + 1].id, true));
    assert.throws(() => concluirSessao(dados, c, pilar, s.id, true));
    dados.progresso[chaveSessao(pilar, s.id)] = { modulos: modulosDaJornada(s).map((m) => m.id) };
    assert.throws(() => concluirSessao(dados, c, pilar, s.id, false));
    concluirSessao(dados, c, pilar, s.id, true, '2026-09-14T12:00:00.000Z');
    concluirSessao(dados, c, pilar, s.id, true, '2026-09-15T12:00:00.000Z');
    conferir(dados.progresso[chaveSessao(pilar, s.id)].concluidaEm === '2026-09-14T12:00:00.000Z', pilar + ': conclusão ' + i + ' idempotente');
  }
  delete dados.progresso[chaveSessao(pilar, c.sessoes[0].id)];
  conferir(estadoSessao(c.sessoes, dados.progresso, pilar, c.sessoes[9].id) === 'bloqueada', pilar + ': cadeia inteira é validada');
}
conferir(tempoNaCama({ deitou: '2026-09-13T23:30', levantou: '2026-09-14T07:00' }) === 7.5, 'sono atravessa meia-noite');
conferir(tempoNaCama({ deitou: '2026-09-14T23:30', levantou: '2026-09-14T07:00' }) === null, 'horários invertidos recusados');
conferir(inicioSemana('2026-09-13') === '2026-09-07', 'domingo pertence à semana iniciada na segunda');
conferir(diasDoPeriodo(7, '2026-01-03')[0] === '2025-12-28', 'período atravessa o ano');
const vazio = resumir({ registros: [] }, 7, '2026-09-14');
conferir(vazio.blocosHoje === null && vazio.tempoNaCama === null, 'ausência não vira zero de alimentação ou sono');
assert.throws(() => validarRegistro({ id: 'x', tipo: 'constructor', data: '2026-01-02' }), /Tipo de registro desconhecido/);
conferir(true, 'tipo herdado do protótipo é recusado na validação');
const serie = serieDiaria([
  { tipo: 'treino', data: '2026-01-01', exercicios: [{ nome: 'Remada', carga: 20 }, { nome: 'Remada', carga: 30 }] },
  { tipo: 'dieta', data: '2026-01-01', blocos: 3 },
], ['2026-01-01', '2026-01-02'], 'treino', 'Remada');
conferir(serie[0] === 30 && serie[1] === null, 'série do gráfico usa a maior carga e deixa lacuna onde não houve registro');
const noiteAntiga = resumir({ registros: [{ tipo: 'sono', data: '2026-08-01', deitou: '2026-07-31T23:00', levantou: '2026-08-01T07:00', sensacao: 3 }] }, 7, '2026-09-14');
conferir(noiteAntiga.tempoNaCama === 8, 'o último registro de sono vale mesmo fora do período do gráfico');
const grafias = [{ tipo: 'treino', data: '2026-01-01', exercicios: [{ nome: 'Supino  reto ', carga: 40 }, { nome: 'supino reto', carga: 42 }] }];
conferir(serieDiaria(grafias, ['2026-01-01'], 'treino', 'Supino reto')[0] === 42 && exerciciosRegistrados(grafias).length === 1, 'outra grafia do mesmo exercício não parte a série');
conferir(serieDiaria([{ tipo: 'peso', data: '2026-01-01', kg: 70 }], ['2026-01-01', '2026-01-02'], 'peso').join() === '70,', 'peso entra no gráfico com lacuna');
const posicoes = new Set(Object.keys(catalogo).flatMap((p) => catalogo[p].sessoes.map((s) => revisao(p, s.numero).correta)));
conferir(posicoes.size === 3, 'a resposta certa das revisões não fica presa a uma posição');

const raiz = resolve('dist');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const cabecalhos = await readFile('dist/_headers', 'utf8');
const csp = cabecalhos.match(/Content-Security-Policy: (.+)/)[1];
const servidor = createServer(async (req, res) => {
  let caminho;
  try { caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const aliases = { '/': '/index.html', '/treino': '/hipertrofia.html', '/hipertrofia': '/hipertrofia.html', '/dieta': '/dieta.html', '/sono': '/sono.html' };
  caminho = aliases[caminho] || caminho;
  const arquivo = resolve(raiz, '.' + caminho);
  if (!arquivo.startsWith(raiz + '/')) { res.writeHead(403).end(); return; }
  try { const body = await readFile(arquivo); res.writeHead(200, { 'Content-Type': mime[extname(arquivo)] || 'application/octet-stream', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' }); res.end(body); }
  catch { res.writeHead(404).end('Não encontrado'); }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const BASE = 'http://127.0.0.1:' + servidor.address().port;
let navegador;
await mkdir('test-results', { recursive: true });
try {
  navegador = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on('pageerror', (e) => erros.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await pg.addInitScript(() => {
    // O convite do tour é de primeiro acesso e cobriria estes fluxos; `verificar-aprendizagem` testa o convite.
    localStorage.setItem('lithium-tour', 'visto');
    if (!localStorage.getItem('teste-inicializado')) {
      localStorage.setItem('lithium:hipertrofia:s01-sua-primeira-vitoria:anotacao', JSON.stringify({ v: 'Anotação anterior preservada', em: 123 }));
      localStorage.setItem('lithium:hipertrofia:s01-sua-primeira-vitoria:visitada', JSON.stringify({ v: true, em: 123 }));
      localStorage.setItem('teste-inicializado', 'sim');
    }
  });
  const ir = async (hash) => { await pg.goto(BASE + '/#/' + hash); await pg.waitForFunction((rota) => document.querySelector('main')?.dataset.rota === rota, hash); await pg.locator('main h1').waitFor(); };
  // A tela entra por revelação ligada à rolagem: percorre a página e espera tudo assentar antes de fotografar.
  // Sem isso a captura saía no instante da montagem, com o conteúdo ainda invisível.
  const fotografar = async (path) => {
    await pg.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
      scrollTo(0, 0);
    });
    await pg.waitForFunction(() => !document.querySelector('.cortina') && [...document.querySelectorAll('[data-revelar]')].every((el) => Number(getComputedStyle(el).opacity) >= .99), null, { timeout: 10000 });
    await pg.screenshot({ path, fullPage: true });
  };
  await ir('hoje');
  await pg.getByRole('heading', { name: 'Seu ritmo, hoje.' }).waitFor();
  conferir(await pg.locator('.indicadores').getByText('Sem registro', { exact: true }).count() === 2, 'dashboard começa sem dados fictícios');
  conferir((await pg.locator('.proxima-acao').innerText()).includes('COMECE POR AQUI'), 'aparelho novo não ouve "continue de onde parou"');
  await fotografar('test-results/dashboard-desktop.png');
  await ir('registros');
  await pg.getByText('Anotações da versão anterior', { exact: true }).waitFor();
  conferir(await pg.getByText('Anotação anterior preservada', { exact: true }).count() === 1, 'anotação legada preservada');
  for (const [pilar, c] of Object.entries(catalogo)) {
    const primeira = c.sessoes[0], segunda = c.sessoes[1];
    await ir('jornada/' + pilar + '/' + segunda.id);
    await pg.getByText('SESSÃO BLOQUEADA', { exact: true }).waitFor();
    await pg.reload(); await pg.getByText('SESSÃO BLOQUEADA', { exact: true }).waitFor();
    conferir(await pg.locator('.atividade').count() === 0, pilar + ': link direto e recarga respeitam bloqueio');
    await ir('jornada/' + pilar + '/' + primeira.id + '/revisao');
    conferir(await pg.getByRole('button', { name: 'Concluir e liberar a próxima sessão' }).isDisabled(), pilar + ': não conclui sem atividades');
    await ir('jornada/' + pilar + '/' + primeira.id);
    for (const m of modulosDaJornada(primeira)) {
      await pg.getByRole('heading', { name: m.titulo, exact: true }).waitFor();
      conferir(await pg.locator('section[data-sessao]').count() === 1, pilar + ': apenas uma atividade montada');
      await pg.getByRole('button', { name: /Entendi, continuar|Plano revisado, continuar/ }).click();
    }
    await pg.getByRole('heading', { name: 'O que fica desta sessão?' }).waitFor();
    const questao = revisao(pilar, 0);
    await pg.getByRole('radio').nth((questao.correta + 1) % questao.opcoes.length).check();
    await pg.getByRole('button', { name: 'Conferir resposta' }).click();
    conferir(await pg.getByRole('button', { name: 'Concluir e liberar a próxima sessão' }).isDisabled(), pilar + ': revisão incorreta não conclui');
    await pg.getByRole('radio').nth(questao.correta).check();
    conferir(await pg.getByRole('button', { name: 'Concluir e liberar a próxima sessão' }).isDisabled(), pilar + ': escolher sem conferir não conclui');
    await pg.getByRole('button', { name: 'Conferir resposta' }).click();
    await pg.getByLabel('Seu próximo passo (opcional)').fill('Uma ação possível nesta semana.');
    await pg.getByText('Salvo neste aparelho.', { exact: true }).waitFor();
    await pg.getByRole('button', { name: 'Concluir e liberar a próxima sessão' }).click();
    await pg.getByRole('heading', { name: 'Sessão concluída.' }).waitFor();
    await pg.getByRole('link', { name: 'Próxima sessão', exact: true }).click();
    await pg.getByRole('heading', { name: segunda.nome, exact: true }).waitFor();
    await pg.reload();
    await pg.locator('.atividade').waitFor();
    conferir(await pg.getByText('SESSÃO BLOQUEADA', { exact: true }).count() === 0, pilar + ': desbloqueio sobrevive à recarga');
  }
  await ir('hoje');
  await pg.getByRole('button', { name: 'Planejar minha semana', exact: true }).click();
  await pg.getByLabel('Meta diária de blocos (opcional)').fill('5');
  await pg.getByRole('button', { name: 'Confirmar metas' }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  conferir(await pg.getByText('Metas desta semana salvas.').count() === 1, 'metas confirmadas');
  await pg.getByRole('button', { name: 'Registrar treino', exact: true }).click();
  await pg.getByLabel('Exercício', { exact: true }).fill('Agachamento goblet');
  await pg.getByLabel('Carga (kg)', { exact: true }).fill('12');
  await pg.getByLabel('Séries', { exact: true }).fill('2');
  await pg.getByLabel('Repetições', { exact: true }).fill('12');
  await pg.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  conferir(await pg.getByText('Treino A', { exact: true }).count() === 1, 'treino alimenta o dashboard');
  await pg.getByRole('button', { name: 'Registrar refeição', exact: true }).click();
  await pg.getByLabel('Refeição', { exact: true }).fill('Almoço');
  await pg.getByLabel('Blocos desta refeição').fill('2');
  await pg.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  const antes = new Date(ontem); antes.setDate(antes.getDate() - 1);
  await pg.getByRole('button', { name: 'Registrar noite', exact: true }).click();
  await pg.getByLabel('Deitou em', { exact: true }).fill(dataLocal(antes) + 'T23:30');
  await pg.getByLabel('Levantou em', { exact: true }).fill(dataLocal(ontem) + 'T07:00');
  await pg.getByLabel('Como acordou?', { exact: true }).selectOption('4');
  await pg.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  await pg.reload(); await pg.getByRole('heading', { name: 'Seu ritmo, hoje.' }).waitFor();
  conferir((await pg.locator('.indicadores').innerText()).includes('7,5'), 'sono é tempo na cama e persiste');
  await ir('registros');
  await pg.locator('.lista-registros li').filter({ hasText: 'Almoço' }).getByRole('button', { name: /Editar/ }).click();
  await pg.getByLabel('Blocos desta refeição').fill('3');
  await pg.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  conferir(await pg.locator('.lista-registros li').filter({ hasText: 'Almoço' }).count() === 1, 'editar refeição não duplica contribuições');
  conferir((await pg.locator('.lista-registros li').filter({ hasText: 'Almoço' }).innerText()).includes('3 blocos'), 'edição recalcula a contribuição');
  await ir('registros');
  const [download] = await Promise.all([pg.waitForEvent('download'), pg.getByRole('button', { name: 'Exportar cópia local' }).click()]);
  if (download) await download.saveAs('test-results/copia.json');
  conferir(!!download, 'exporta cópia local');
  await pg.getByRole('button', { name: 'Restaurar de um arquivo' }).click();
  await pg.getByLabel('Arquivo de cópia').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{"produto":"lithium","schemaVersion":999}') });
  await pg.getByRole('alert').waitFor();
  conferir(await pg.getByRole('button', { name: 'Substituir dados pela cópia' }).count() === 0, 'importação inválida não permite substituir dados');
  await pg.getByRole('button', { name: 'Fechar', exact: true }).click();
  // Responsive, light/dark, no overflow, touch and runtime errors.
  for (const largura of [320, 390, 768, 1440]) {
    await pg.setViewportSize({ width: largura, height: 900 });
    for (const tema of ['sigilo', 'cartaz']) {
      await pg.evaluate((t) => document.documentElement.dataset.theme = t === 'cartaz' ? 'cartaz' : '', tema);
      for (const rota of ['hoje', 'jornada/hipertrofia', 'registros', 'kit/sono/fontes', 'jornada/dieta/' + catalogo.dieta.sessoes[0].id + '/' + modulosDaJornada(catalogo.dieta.sessoes[0])[0].id]) {
        await ir(rota);
        await pg.locator('main h1').waitFor();
        const info = await pg.evaluate(() => {
          const pequenos = [...document.querySelectorAll('a,button,input,select,summary')].filter((el) => el.offsetParent !== null && !el.matches('.referencia,input[type=radio],input[type=checkbox]') && !el.closest('.texto-modulo')).filter((el) => (el.closest('label') || el).getBoundingClientRect().height < 47);
          return { overflow: document.documentElement.scrollWidth > innerWidth, pequenos: pequenos.map((el) => el.textContent.slice(0, 30)) };
        });
        conferir(!info.overflow, largura + 'px ' + tema + ' ' + rota + ': sem overflow');
        conferir(info.pequenos.length === 0, largura + 'px ' + rota + ': alvos de toque ' + info.pequenos.join(', '));
      }
    }
  }
  await pg.setViewportSize({ width: 390, height: 844 });
  await ir('hoje'); await fotografar('test-results/dashboard-mobile.png');
  await ir('jornada/hipertrofia'); await fotografar('test-results/mapa-mobile.png');
  await pg.setViewportSize({ width: 1440, height: 1000 });
  await pg.evaluate(() => document.documentElement.dataset.theme = '');
  await ir('jornada/hipertrofia'); await fotografar('test-results/mapa-desktop.png');
  await ir('hoje'); await fotografar('test-results/dashboard-dados-desktop.png');
  await pg.evaluate(() => navigator.serviceWorker.ready);
  await pg.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  for (const pilar of Object.keys(catalogo)) {
    await pg.goto(BASE + '/' + pilar + '.html#/kit/' + pilar + '/fontes', { waitUntil: 'domcontentloaded' });
    await pg.locator('.texto-modulo li').first().waitFor();
    conferir(await pg.locator('.texto-modulo li').count() > 5, pilar + ': conteúdo e fontes nunca consultados abrem offline');
  }
  await ir('registros');
  await pg.getByRole('button', { name: 'Peso', exact: true }).first().click();
  await pg.getByLabel('Peso (kg)', { exact: true }).fill('70');
  await pg.getByRole('button', { name: 'Salvar registro', exact: true }).click();
  await pg.getByRole('dialog').waitFor({ state: 'hidden' });
  await pg.reload(); await pg.getByText('70 kg', { exact: true }).waitFor();
  conferir(await pg.getByText('70 kg', { exact: true }).count() >= 1, 'escrita e recarga offline preservam registros');
  await ctx.setOffline(false);
  conferir(erros.length === 0, 'sem erros de console sob CSP real: ' + erros.join('; '));
  await ctx.close();
  console.log('\n' + verificacoes + ' verificações concluídas.');
} finally { await navegador?.close(); servidor.close(); }
