import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'test-results');
const dist = resolve(root, 'example/dist');
await access(resolve(dist, 'index.html'));
await mkdir(output, { recursive: true });
const prefix = '/cours/physique/laboratoire/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
// Exercise the actual production build under a subdirectory, not Vite's dev server.
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const path = resolve(dist, pathname.slice(prefix.length) || 'index.html');
    if (!path.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
const candidates = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`, `${process.env['PROGRAMFILES(X86)']}/Microsoft/Edge/Application/msedge.exe`];
const executablePath = candidates.find(path => path && existsSync(path));
let browser;
const results = [];
const errors = [];
const report = { date: new Date().toISOString(), productionSubpath: prefix, results, errors };
const check = async (name, action) => { await action(); results.push({ name, passed: true }); console.log(`OK ${name}`); };
const until = async predicate => {
  const deadline = Date.now() + 4000;
  while (!(await predicate())) { if (Date.now() > deadline) throw new Error('Condition non satisfaite après 4 s'); await new Promise(done => setTimeout(done, 40)); }
};
try {
  if (!executablePath) throw new Error('Chrome/Chromium introuvable. Définir CHROME_PATH vers son exécutable.');
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const frames = new Set(); const observers = new Set(); const visibility = new Set(); const media = new Map();
    const raf = window.requestAnimationFrame.bind(window); const cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => { const id = raf(time => { frames.delete(id); callback(time); }); frames.add(id); return id; };
    window.cancelAnimationFrame = id => { frames.delete(id); cancel(id); };
    const OriginalObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalObserver {
      observe(...args) { observers.add(this); return super.observe(...args); }
      disconnect() { observers.delete(this); return super.disconnect(); }
    };
    const add = EventTarget.prototype.addEventListener; const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this === document && type === 'visibilitychange') visibility.add(listener);
      if (this instanceof MediaQueryList && type === 'change') { if (!media.has(this)) media.set(this, new Set()); media.get(this).add(listener); }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (this === document && type === 'visibilitychange') visibility.delete(listener);
      if (this instanceof MediaQueryList && type === 'change') { media.get(this)?.delete(listener); if (!media.get(this)?.size) media.delete(this); }
      return remove.call(this, type, listener, options);
    };
    window.__kitResources = () => ({ frames: frames.size, observers: observers.size, visibility: visibility.size, media: [...media.values()].reduce((sum, set) => sum + set.size, 0) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const resources = () => page.evaluate(() => window.__kitResources());
  const noResources = async () => until(async () => Object.values(await resources()).every(value => value === 0));
  const mass = () => page.getByRole('spinbutton', { name: 'Masse', exact: true });
  const metric = label => page.locator('.lk-metric').filter({ has: page.getByText(label, { exact: true }) }).locator('.lk-metric-value');

  await check('Construction de production et ressources servies dans un sous-dossier', async () => {
    await page.goto(base); await mass().waitFor();
    assert.equal(await page.locator('canvas').count(), 1);
    assert.equal(await page.locator('.lk-title').evaluate(element => getComputedStyle(element).fontSize), '30px');
    assert.equal(await page.locator('.lk-viewport').evaluate(element => getComputedStyle(element).height), '470px');
    assert.equal(await page.getByRole('button', { name: 'Lancer la simulation' }).count(), 1);
    const favicon = page.locator('link[rel="icon"]');
    assert.ok((await favicon.getAttribute('href')).startsWith('./assets/'));
  });
  await check('Saisie décimale, bornes, saisie invalide et mesures liées', async () => {
    await mass().fill('2,0'); await mass().press('Enter');
    await until(async () => (await metric('Période').innerText()).includes('2,962'));
    await mass().fill('100'); await mass().press('Enter'); assert.equal(await mass().inputValue(), '5');
    await mass().fill('abc'); await mass().press('Enter'); assert.equal(await mass().inputValue(), '5');
    await mass().fill('1'); await mass().press('Enter'); await mass().focus(); await mass().press('ArrowUp');
    await until(async () => (await mass().inputValue()) === '1.1');
    await page.getByRole('button', { name: /Oscillateur de référence/ }).click();
    await until(async () => (await metric('Période').innerText()).includes('2,094'));
  });
  await check('Onglets utilisables au clavier et panneau associé', async () => {
    const tab = page.getByRole('tab', { name: 'Découverte', exact: true }); await tab.focus(); await tab.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Analyse', exact: true }).getAttribute('aria-selected'), 'true');
    const panel = page.getByRole('tabpanel'); const labelledby = await panel.getAttribute('aria-labelledby');
    assert.equal(await page.locator(`[id="${labelledby}"]`).innerText(), 'Analyse');
    await page.getByRole('tab', { name: 'Analyse', exact: true }).press('Home');
  });
  await check('Animation, pause, pas à pas et remise à zéro', async () => {
    await page.getByRole('button', { name: 'Lancer la simulation' }).click();
    await until(async () => Number((await page.locator('.lk-clock strong').innerText()).replace(',', '.')) > 0.1);
    await page.getByRole('button', { name: 'Mettre en pause' }).click();
    await until(async () => (await resources()).frames === 0);
    // The pause effect publishes its final physical time once before becoming idle.
    await page.waitForTimeout(100);
    const before = await page.locator('.lk-clock strong').innerText();
    await page.waitForTimeout(150); assert.equal(await page.locator('.lk-clock strong').innerText(), before);
    await page.getByRole('button', { name: 'Avancer d’un pas' }).click();
    assert.notEqual(await page.locator('.lk-clock strong').innerText(), before);
    await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    assert.equal(await page.locator('.lk-clock strong').innerText(), '0,000');
  });
  await check('Défilement indépendant du panneau sur ordinateur', async () => {
    const sidebar = page.locator('.lk-sidebar');
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(await sidebar.evaluate(element => element.scrollHeight > element.clientHeight));
    const box = await sidebar.boundingBox();
    await page.mouse.move(box.x + 30, Math.max(16, box.y) + 50);
    const y = await page.evaluate(() => scrollY); await page.mouse.wheel(0, 450);
    await until(async () => (await sidebar.evaluate(element => element.scrollTop)) > 0);
    assert.equal(await page.evaluate(() => scrollY), y);
    const canvas = await page.locator('canvas').boundingBox();
    await page.mouse.move(canvas.x + canvas.width / 2, Math.max(0, canvas.y) + 80); await page.mouse.wheel(0, 220);
    await until(async () => (await page.evaluate(() => scrollY)) > y);
  });
  await check('Fermeture : aucune animation, aucun observer ni écouteur conservé', async () => {
    await page.getByRole('button', { name: 'Lancer la simulation' }).click();
    await page.getByRole('button', { name: 'Fermer le laboratoire', exact: true }).click();
    assert.equal(await page.locator('canvas').count(), 0); await noResources();
    await page.getByRole('button', { name: 'Ouvrir le laboratoire', exact: true }).click();
    await until(async () => (await resources()).observers === 1);
    assert.equal(await page.locator('canvas').count(), 1);
  });
  await check('Thèmes et adaptation 320, 390, 768, 1024 et 1440 px', async () => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      for (const theme of ['light', 'dark']) {
        const current = await page.locator('.lk-example-site').getAttribute('data-lab-theme');
        if (theme !== current) await page.getByRole('button', { name: theme === 'dark' ? 'Activer le mode sombre' : 'Activer le mode clair' }).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Débordement ${width} ${theme}`);
        const rootStyle = await page.locator('.lk-example-site').evaluate(element => getComputedStyle(element).backgroundColor);
        assert.equal(rootStyle, theme === 'dark' ? 'rgb(18, 28, 36)' : 'rgb(237, 242, 245)');
        if (width === 390 || width === 1440) {
          await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.lk-sidebar').scrollTop = 0; });
          await page.mouse.move(0, 0);
          await page.screenshot({ path: resolve(output, `example-${width}-${theme}.png`), fullPage: true });
        }
      }
      const sidebar = await page.locator('.lk-sidebar').boundingBox(); const scene = await page.locator('.lk-simulation').boundingBox();
      if (width < 601) { assert.ok(sidebar.y > scene.y + scene.height); assert.equal(await page.locator('.lk-sidebar').evaluate(element => getComputedStyle(element).position), 'static'); }
    }
  });
  await check('Styles du site hôte et thème clair imbriqué dans le thème sombre', async () => {
    await page.goto(base + 'integration.html'); await page.getByRole('button', { name: 'Désactiver sans démonter' }).waitFor();
    assert.equal(await page.locator('#host-button').evaluate(element => getComputedStyle(element).color), 'rgb(120, 20, 30)');
    assert.equal(await page.locator('#host-title').evaluate(element => getComputedStyle(element).marginTop), '24.12px');
    assert.equal(await page.locator('#host-title').evaluate(element => getComputedStyle(element).boxSizing), 'content-box');
    const inner = page.getByTestId('inner-light');
    assert.equal(await inner.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(237, 242, 245)');
    assert.equal(await inner.locator('.lk-warning').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(255, 245, 222)');
    assert.equal(await inner.locator('.lk-parameter-label label').evaluate(element => getComputedStyle(element).color), 'rgb(97, 119, 133)');
    assert.equal(await inner.locator('.lk-tabs').evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(223, 231, 236, 0.565)');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), undefined);
    await page.setViewportSize({ width: 2000, height: 1000 });
    assert.equal((await page.locator('.lab-kit.lk-app').boundingBox()).width, 1800);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('active=false : arrêt complet sans démontage, puis reprise', async () => {
    await page.getByRole('button', { name: 'Lancer la simulation' }).click();
    await until(async () => (await resources()).frames === 1);
    await page.getByRole('button', { name: 'Désactiver sans démonter' }).click(); await noResources();
    assert.equal(await page.locator('canvas').count(), 1);
    const before = await page.locator('.lk-clock strong').innerText(); await page.waitForTimeout(150);
    assert.equal(await page.locator('.lk-clock strong').innerText(), before);
    assert.equal(await page.getByRole('button', { name: 'Lancer la simulation' }).isDisabled(), true);
    await page.getByRole('button', { name: 'Réactiver le laboratoire' }).click();
    await until(async () => (await resources()).frames === 1);
    await page.getByRole('button', { name: 'Mettre en pause' }).click();
  });
  assert.deepEqual(errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack; console.error(error); process.exitCode = 1;
} finally {
  await browser?.close(); await new Promise(done => server.close(done));
  await writeFile(resolve(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
}
