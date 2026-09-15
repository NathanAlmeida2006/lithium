import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { formatoDoModulo, trechosDeEstudo, partesDoTexto, lerTabela } from '../src/conteudo/experiencias.js';

const catalogos = Object.fromEntries(await Promise.all(['hipertrofia', 'dieta', 'sono'].map(async p => [p, JSON.parse(await readFile('src/conteudo/' + p + '.json', 'utf8'))])));
const modulos = Object.entries(catalogos).flatMap(([pilar, c]) => c.sessoes.flatMap(s => s.modulos.map(m => ({ ...m, pilar, sessao: s.id }))));
let total = 0;
function ok(condicao, mensagem) { assert.ok(condicao, mensagem); total++; }
const normal = t => t.replace(/\s+/g, ' ').trim();
const formatos = {};
for (const m of modulos) {
  ok(normal(trechosDeEstudo(m.texto).join('\n\n')) === normal(m.texto), 'Conteúdo perdido: ' + m.fonte);
  const formato = formatoDoModulo(m);
  formatos[formato] = (formatos[formato] || 0) + 1;
  for (const parte of partesDoTexto(m.texto)) {
    const tabela = lerTabela(parte);
    if (tabela) ok(tabela.itens.every(l => l.length === tabela.colunas.length), 'Tabela irregular: ' + m.fonte);
  }
}
console.log('Integridade dos ' + modulos.length + ' módulos:', formatos);

const raiz = resolve('dist');
const csp = (await readFile('dist/_headers', 'utf8')).match(/Content-Security-Policy: (.+)/)[1];
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const servidor = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const arquivo = resolve(raiz, '.' + (path === '/' ? '/index.html' : path));
    if (!arquivo.startsWith(raiz + '/')) return res.writeHead(403).end();
    res.writeHead(200, { 'Content-Type': mime[extname(arquivo)] || 'application/octet-stream', 'Content-Security-Policy': csp });
    res.end(await readFile(arquivo));
  } catch { res.end(); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + servidor.address().port;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await page.goto(base);
  await page.locator('main h1').waitFor();
  // Fixture isolada do navegador de teste: libera sessões para inspecionar todo o miolo.
  await page.evaluate(async catalogos => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('lithium-local', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('estado', 'readwrite'), store = tx.objectStore('estado'), r = store.get('principal');
      r.onsuccess = () => {
        const d = r.result;
        for (const [p, c] of Object.entries(catalogos)) for (const s of c.sessoes) d.progresso[p + ':' + s.id] = { modulos: s.modulos.filter(m => m.tipo !== 'consulta').map(m => m.id), concluidaEm: '2026-09-14T12:00:00Z', revisaoCorreta: true };
        store.put(d, 'principal');
      };
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    }); db.close();
  }, catalogos);
  await page.reload();
  async function ir(m) {
    const hash = 'jornada/' + m.pilar + '/' + m.sessao + '/' + m.id;
    await page.goto(base + '/#/' + hash);
    try { await page.waitForFunction(hash => document.querySelector('main')?.dataset.rota === hash, hash); } catch (e) { console.log('Erros acumulados', erros); console.log('Rota esperada', hash, await page.evaluate(() => ({hash: location.hash, rota: document.querySelector('main')?.dataset.rota, texto: document.body.innerText.slice(-1600)}))); throw e; }
    await page.getByRole('heading', { name: m.titulo, exact: true }).waitFor();
    await page.locator(m.tipo === 'pratica' ? '.tarefas' : '.aprendizado').waitFor();
  }
  // Todos os módulos consumidos na jornada montam com o formato esperado.
  for (const m of modulos.filter(m => m.tipo !== 'consulta')) {
    await ir(m);
    const formato = formatoDoModulo(m);
    if (formato === 'missao') ok(await page.locator('.tarefa').count() === m.acoes.length, m.fonte);
    else {
      await page.locator('[data-formato="' + formato + '"]').waitFor();
      ok(await page.locator('.aprendizado .texto-modulo').count() > 0, m.fonte);
    }
  }
  console.log('Todos os módulos da jornada montados.');
  const achar = trecho => modulos.find(m => m.id.includes(trecho));
  const cuidados = achar('antes-de-comecar'), mito = achar('mito-de-3'), conceito = achar('o-gatilho');
  const tabela = achar('procedimento-de-descida'), prato = achar('prato-ajustado'), andares = achar('tres-andares');
  const cena = achar('espelho'), passos = achar('checklist-do-primeiro-dia'), missao = modulos.find(m => m.tipo === 'pratica');
  await ir(cuidados);
  ok(await page.locator('.cuidados-grupos li:visible').count() === 13, 'Todas as 13 condições visíveis');
  ok((await page.locator('.cuidados-grupos').innerText()).includes('18 anos'), 'Faixa etária visível');
  ok(await page.locator('.cuidados-dossie input').count() === 0, 'Sem coleta de condições clínicas');
  await ir(mito);
  ok(!await page.locator('.mito-explicacao').isVisible(), 'Explicação inicialmente fechada');
  await page.getByRole('button', { name: 'O que explica isso?' }).focus();
  await page.keyboard.press('Enter');
  ok(await page.locator('.mito-explicacao').isVisible(), 'Revelação por teclado');
  ok((await page.locator('.mito-explicacao').innerText()).includes('Ressalva honesta'), 'Ressalva junto da explicação');
  await ir(conceito);
  await page.getByRole('button', { name: 'Próximo trecho' }).click();
  await page.waitForFunction(() => document.querySelector('.trecho-conteudo') === document.activeElement);
  ok(true, 'Foco acompanha trecho');
  const trecho = await page.locator('.trecho-conteudo').innerText();
  await page.getByRole('button', { name: 'Ver conteúdo inteiro' }).click();
  ok((await page.locator('.aprendizado').innerText()).includes('Todo o resto'), 'Leitura integral inclui o final');
  await page.getByRole('button', { name: 'Explorar por partes' }).click();
  ok((await page.locator('.trecho-conteudo').innerText()) !== trecho, 'Nova exploração reinicia de forma previsível');
  await ir(tabela);
  await page.locator('.tabela-seletor button').last().click();
  ok((await page.locator('.tabela-ficha').innerText()).includes('00h25'), 'Ficha muda para a etapa escolhida');
  await page.getByRole('button', { name: 'Comparar todos' }).click();
  ok(await page.locator('.tabela-exploravel tbody tr').count() === 4, 'Comparação preserva as quatro etapas');
  await ir(andares);
  await page.locator('.mapa-conceito-pecas button').nth(1).click();
  ok((await page.locator('.mapa-conceito-legenda').innerText()).includes('qualidade'), 'Mapa explica o andar selecionado');
  await page.locator('.conceito-desafio button').first().click();
  ok((await page.locator('.conceito-desafio [role=status]').innerText()).includes('tente de novo'), 'Desafio permite errar e tentar de novo');
  await page.locator('.conceito-desafio button').nth(1).click();
  ok((await page.locator('.conceito-desafio [role=status]').innerText()).includes('Isso mesmo'), 'Desafio explica a resposta correta');
  await ir(missao);
  await page.locator('.tarefa input').first().click();
  await page.waitForFunction(() => document.querySelector('.missao-progresso progress').value === 1);
  await page.locator('.tarefa').nth(1).getByRole('button').click();
  ok(await page.locator('.missao-progresso progress').getAttribute('value') === '1', 'Não se aplica não conta como feita');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.missao-progresso progress')?.value === 1);
  ok(await page.locator('.tarefa input').first().isChecked(), 'Missão persiste na recarga');
  await mkdir('test-results/aprendizagem', { recursive: true });
  for (const largura of [320, 390, 768, 1440]) for (const tema of ['', 'cartaz']) {
    await page.setViewportSize({ width: largura, height: 1000 });
    await page.evaluate(t => document.documentElement.dataset.theme = t, tema);
    for (const m of [cuidados, mito, conceito, tabela, prato, andares, cena, passos, missao]) {
      await ir(m);
      await page.locator('.atividade').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.atividade')).opacity) >= .99);
      const problema = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        alvos: [...document.querySelectorAll('.aprendizado button')].filter(el => el.getClientRects().length).filter(el => el.getBoundingClientRect().height < 48 || el.getBoundingClientRect().width < 48).map(el => el.textContent),
      }));
      ok(!problema.overflow, 'Overflow: ' + largura + tema + m.id);
      ok(!problema.alvos.length, 'Alvos pequenos: ' + problema.alvos.join(', '));
      if ([390, 1440].includes(largura)) {
        for (const el of await page.locator('.atividade [data-revelar]:visible').all()) {
          await el.scrollIntoViewIfNeeded();
          await page.waitForFunction(el => Number(getComputedStyle(el).opacity) >= .99, await el.elementHandle());
        }
        await page.locator('.atividade').screenshot({ path: 'test-results/aprendizagem/' + m.pilar + '-' + m.id + '-' + largura + '-' + (tema || 'sigilo') + '.png' });
      }
    }
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await ir(tabela);
  await page.reload();
  await page.locator('.tabela-seletor button').last().click();
  ok((await page.locator('.tabela-ficha').innerText()).includes('00h25'), 'Exploração funciona offline após recarga');
  ok(erros.length === 0, 'Erros no navegador: ' + erros.join('; '));
  console.log(total + ' verificações de aprendizado concluídas. Capturas em test-results/aprendizagem.');
} finally { await browser?.close(); servidor.close(); }
