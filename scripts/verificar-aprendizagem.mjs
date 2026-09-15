import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { formatoDoModulo, trechosDeEstudo, partesDoTexto, lerTabela, textoLimpo } from '../src/conteudo/experiencias.js';
import { desafiosDaSessao } from '../src/conteudo/desafios.js';

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

// Desafios: a resposta certa sai do texto do módulo, nada é inventado, e a sessão não repete o jogo seguido.
const tiposDeDesafio = {};
const desafios = [];
for (const [pilar, c] of Object.entries(catalogos)) for (const s of c.sessoes) {
  const d = desafiosDaSessao(s);
  let anterior = null;
  for (const m of s.modulos) {
    const x = d[m.id];
    if (!x) continue;
    desafios.push({ ...m, pilar, sessao: s.id, desafio: x });
    tiposDeDesafio[x.tipo] = (tiposDeDesafio[x.tipo] || 0) + 1;
    const limpo = normal(textoLimpo(m.texto));
    ok(x.tipo !== anterior || s.modulos.filter(n => d[n.id]).length < 2, 'Jogo repetido em sequência: ' + m.fonte);
    anterior = x.tipo;
    ok(!['cuidados', 'consulta', 'missao'].includes(formatoDoModulo(m)), 'Cuidado de saúde virou jogo: ' + m.fonte);
    if (x.tipo === 'lacuna' || x.tipo === 'numero') ok(new Set(x.opcoes).size === 3 && x.opcoes.includes(x.correta) && limpo.includes(normal(x.antes)) && limpo.includes(x.correta), 'Lacuna fora do texto: ' + m.fonte);
    if (x.tipo === 'ordem' || x.tipo === 'monte') ok([...x.pilha].sort().join('|') === [...x.itens].sort().join('|') && x.pilha.join('|') !== x.itens.join('|'), 'Sequência inválida: ' + m.fonte);
    if (x.tipo === 'monte') ok(limpo.includes(normal(x.itens.join(' '))), 'Frase remontada fora do texto: ' + m.fonte);
    if (x.tipo === 'par') ok([...x.valores].sort().join('|') === x.pares.map(p => p[1]).sort().join('|'), 'Pares inválidos: ' + m.fonte);
    if (x.tipo === 'troca') ok(x.rodadas.some(r => r.confere) && x.rodadas.some(r => !r.confere) && x.rodadas.filter(r => r.confere).every(r => limpo.includes(normal(r.texto))), 'Troca inválida: ' + m.fonte);
  }
}
console.log('Desafios em ' + desafios.length + ' módulos:', tiposDeDesafio);

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
  await page.addInitScript(() => localStorage.setItem('lithium-tour', 'visto'));
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
  await page.getByRole('button', { name: 'Eu acreditava' }).focus();
  await page.keyboard.press('Enter');
  ok(await page.locator('.mito-explicacao').isVisible(), 'Aposta revela por teclado');
  ok((await page.locator('.mito-aposta-eco').innerText()).includes('acreditava'), 'Explicação ecoa a aposta');
  ok((await page.locator('.mito-explicacao').innerText()).includes('Ressalva honesta'), 'Ressalva junto da explicação');
  await ir(conceito);
  const nTrechos = trechosDeEstudo(conceito.texto).length;
  ok(await page.locator('.palco-trecho').count() === nTrechos, 'Palco monta todos os trechos em sequência');
  ok((await page.locator('.palco').innerText()).includes('Todo o resto'), 'Palco inclui o final sem clique');
  await page.locator('.palco-trecho').last().evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(n => document.querySelector('.palco-numero')?.textContent.trim() === String(n).padStart(2, '0'), nTrechos);
  ok(true, 'Régua acompanha a rolagem');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('.palco-numero')?.textContent.trim() === '01');
  ok(true, 'Régua volta ao primeiro trecho quando a leitura sobe');
  await page.getByRole('button', { name: 'Ver conteúdo inteiro' }).click();
  ok((await page.locator('.aprendizado').innerText()).includes('Todo o resto'), 'Leitura integral inclui o final');
  await page.getByRole('button', { name: 'Explorar por partes' }).click();
  ok(await page.locator('.palco').isVisible(), 'Volta ao palco');
  await ir(tabela);
  await page.locator('.tabela-seletor button').last().click();
  ok((await page.locator('.tabela-ficha').innerText()).includes('00h25'), 'Ficha muda para a etapa escolhida');
  await page.getByRole('button', { name: 'Comparar todos' }).click();
  ok(await page.locator('.tabela-exploravel tbody tr').count() === 4, 'Comparação preserva as quatro etapas');
  await ir(andares);
  ok(await page.locator('.mapa-conceito-pecas').count() === 0, 'A pergunta do diagrama vem antes das peças que a respondem');
  await page.locator('.conceito-desafio button').first().click();
  ok((await page.locator('.conceito-desafio [role=status]').innerText()).includes('tente de novo'), 'Desafio permite errar e tentar de novo');
  await page.locator('.conceito-desafio button').nth(1).click();
  ok((await page.locator('.conceito-desafio [role=status]').innerText()).includes('Isso mesmo'), 'Desafio explica a resposta correta');
  await page.locator('.mapa-conceito-pecas button').nth(1).click();
  ok((await page.locator('.mapa-conceito-legenda').innerText()).includes('qualidade'), 'Mapa explica o andar selecionado');
  await ir(prato);
  const textoDoPrato = await page.locator('.aprendizado').innerText();
  ok(!/Esquerda|Direita/.test(textoDoPrato) && textoDoPrato.includes('Bônus da casa'), 'Tabela de diagramação vira lista, sem perder o conteúdo');
  ok(await page.locator('.marquise-card, .palco-capa').count() === 0, 'Leitura começa no texto, sem capa nem faixa decorativa');
  await ir(missao);
  await page.locator('.tarefa input').first().click();
  await page.waitForFunction(() => document.querySelector('.missao-progresso progress').value === 1);
  await page.locator('.tarefa').nth(1).getByRole('button').click();
  ok(await page.locator('.missao-progresso progress').getAttribute('value') === '1', 'Não se aplica não conta como feita');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.missao-progresso progress')?.value === 1);
  ok(await page.locator('.tarefa input').first().isChecked(), 'Missão persiste na recarga');

  // Remontar a frase: erro custa marca, acerto carimba, a melhor partida persiste e aparece no menu.
  const monte = desafios.find(m => m.desafio.tipo === 'monte');
  await ir(monte);
  const errado = monte.desafio.pilha.find(t => t !== monte.desafio.itens[0]);
  await page.locator('.sequencia-pilha button', { hasText: errado }).first().click();
  for (const item of monte.desafio.itens) await page.locator('.sequencia-pilha button').filter({ hasText: item }).first().click();
  ok((await page.locator('.desafio-selo').innerText()).trim() === '+2', 'Um erro vale duas marcas');
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  for (const item of monte.desafio.itens) await page.locator('.sequencia-pilha button').filter({ hasText: item }).first().click();
  ok((await page.locator('.desafio-selo').innerText()).trim() === '+3', 'Revanche de primeira vale três');
  // A escrita no IndexedDB termina depois do carimbo: o menu acende quando ela chega, e só então se recarrega.
  await page.waitForFunction(() => document.querySelectorAll('.atividades-nav a[aria-current] .marcas i.acesa').length === 3, null, { timeout: 5000 });
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('.atividades-nav a[aria-current] .marcas i.acesa').length === 3);
  ok(true, 'Melhor partida persiste e aparece no menu');
  const lacuna = desafios.find(m => m.desafio.tipo === 'lacuna');
  await ir(lacuna);
  await page.locator('.lacuna-fichas button', { hasText: lacuna.desafio.opcoes.find(o => o !== lacuna.desafio.correta) }).first().click();
  ok(await page.locator('.lacuna-fichas [data-estado="errada"]').count() === 1, 'Ficha errada fica riscada');
  await page.locator('.lacuna-fichas button').filter({ hasText: lacuna.desafio.correta }).first().click();
  ok((await page.locator('.lacuna-vaga').innerText()).includes(lacuna.desafio.correta), 'Vaga preenchida com o termo do texto');
  const pares = desafios.find(m => m.desafio.tipo === 'par');
  await ir(pares);
  for (const [nome, valor] of pares.desafio.pares) {
    await page.locator('.pares-coluna').first().getByRole('button', { name: nome, exact: true }).click();
    await page.locator('.pares-coluna').nth(1).getByRole('button', { name: valor, exact: true }).click();
  }
  ok((await page.locator('.desafio-selo').innerText()).trim() === '+3', 'Pares ligados de primeira');
  const troca = desafios.find(m => m.desafio.tipo === 'troca');
  await ir(troca);
  for (const r of troca.desafio.rodadas) await page.getByRole('button', { name: r.confere ? 'Confere' : 'Foi trocada' }).click();
  ok((await page.locator('.desafio-selo').innerText()).trim() === '+3', 'Detector de troca de primeira');
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
        alvos: [...document.querySelectorAll('.aprendizado button, .desafio button')].filter(el => el.getClientRects().length).filter(el => el.getBoundingClientRect().height < 48 || el.getBoundingClientRect().width < 48).map(el => el.textContent),
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
  await ctx.setOffline(false);

  // Tour por tela: o botão "?" da barra de cima abre o tour da tela, com o fio no alvo, e o Esc fecha.
  const recursoDoKit = modulos.find(m => m.kit && m.pilar === 'hipertrofia' && formatoDoModulo(m) === 'explorar');
  for (const [hash, titulo] of [['hoje', 'Seus próximos passos'], ['jornada/sono', 'Os três protocolos'], ['registros', 'Registrar'], ['kit/dieta', 'Consulta rápida'], ['kit/hipertrofia/' + recursoDoKit.id, 'Todos os recursos'], ['kit/sono/fontes', 'Todos os recursos']]) {
    await page.goto(base + '/#/' + hash);
    await page.waitForFunction(h => document.querySelector('main')?.dataset.rota === h, hash);
    await page.getByRole('button', { name: 'Tour desta tela' }).click();
    await page.locator('.tour-cartao h2', { hasText: titulo }).waitFor();
    await page.waitForFunction(() => !!document.querySelector('[data-tour-alvo]'));
    // Sem vir de uma atividade não há "Voltar à atividade": o passo não pode aparecer.
    const passosDoTour = Number((await page.locator('.tour-cartao .sobretitulo').innerText()).split('/')[1]);
    for (let i = 1; i < passosDoTour; i++) {
      await page.locator('.tour-acoes .primario').click();
      ok((await page.locator('.tour-cartao h2').innerText()) !== 'Voltar à atividade', 'Passo sem alvo pulado em ' + hash);
    }
    if (hash.endsWith('fontes')) ok((await page.locator('.tour-cartao h2').innerText()) === 'A lista numerada', 'Tour das fontes chega à lista');
    await page.keyboard.press('Escape');
    ok(await page.locator('.tour-cartao').count() === 0, 'Tour de ' + hash + ' abre no botão da barra e fecha com Esc');
  }

  // Primeiro acesso: aparelho limpo pergunta; aceitar percorre as quatro telas; respondido, não volta.
  const aparelhoNovo = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const visita = await aparelhoNovo.newPage();
  visita.on('pageerror', e => erros.push(e.message));
  await visita.goto(base);
  await visita.getByRole('button', { name: 'Fazer o tour' }).click();
  const telasDoTour = new Set();
  for (let i = 0; i < 30 && await visita.locator('.tour-cartao').count(); i++) {
    await visita.waitForTimeout(150);
    telasDoTour.add((await visita.evaluate(() => document.querySelector('main').dataset.rota)).split('/')[0]);
    await visita.locator('.tour-acoes .primario').click();
  }
  ok(['hoje', 'jornada', 'registros', 'kit'].every(t => telasDoTour.has(t)), 'Tour geral passa pelas quatro telas: ' + [...telasDoTour]);
  await visita.reload();
  await visita.locator('main h1').waitFor();
  await visita.waitForTimeout(900);
  ok(await visita.getByRole('button', { name: 'Fazer o tour' }).count() === 0, 'Convite não volta depois de respondido');
  await aparelhoNovo.close();

  // Reset total: pede a palavra, apaga o documento inteiro e volta para hoje.
  await page.goto(base + '/#/registros');
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click();
  ok(await page.getByRole('button', { name: 'Apagar tudo' }).isDisabled(), 'Reset bloqueado sem a palavra');
  await page.getByLabel('Para confirmar, digite APAGAR').fill('apagar');
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Apagar tudo' }).click()]);
  await page.locator('main h1').waitFor();
  const aposReset = await page.evaluate(async () => {
    const db = await new Promise(r => { const q = indexedDB.open('lithium-local', 1); q.onsuccess = () => r(q.result); });
    const d = await new Promise(r => { const q = db.transaction('estado').objectStore('estado').get('principal'); q.onsuccess = () => r(q.result); });
    db.close();
    return { progresso: Object.keys(d.progresso).length, dominio: Object.keys(d.dominio).length, acoes: Object.keys(d.acoes).length, registros: d.registros.length, hash: location.hash };
  });
  ok(aposReset.progresso === 0 && aposReset.dominio === 0 && aposReset.acoes === 0 && aposReset.registros === 0 && aposReset.hash === '#/hoje', 'Reset apaga progresso, marcas, ações e registros: ' + JSON.stringify(aposReset));
  ok(erros.length === 0, 'Erros no navegador: ' + erros.join('; '));
  console.log(total + ' verificações de aprendizado concluídas. Capturas em test-results/aprendizagem.');
} finally { await browser?.close(); servidor.close(); }
