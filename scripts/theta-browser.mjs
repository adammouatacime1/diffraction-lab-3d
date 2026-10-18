import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const output = 'test-results/theta';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const checks = [];
const errors = [];
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const number = value => Number(value.replace(',', '.'));
async function check(name, action) {
  try { await action(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function range(locator, value) {
  await locator.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function pause(page) {
  const button = page.getByRole('button', { name: 'Mettre en pause', exact: true });
  if (await button.count()) await button.click();
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await pause(page);
  await check('La colonne défile sans déplacer la page', async () => {
    await page.evaluate(() => scrollTo(0, 0));
    const sidebar = page.getByLabel('Expériences et paramètres physiques');
    const state = await sidebar.evaluate(element => ({ height: element.clientHeight, scroll: element.scrollHeight, overflow: getComputedStyle(element).overflowY }));
    assert.ok(state.scroll > state.height);
    assert.equal(state.overflow, 'auto');
    const bounds = await sidebar.boundingBox();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 80);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(250);
    assert.ok(await sidebar.evaluate(element => element.scrollTop) > 100);
    assert.equal(await page.evaluate(() => scrollY), before);
  });
  await page.evaluate(() => {
    window.__wheelPrevented = null;
    document.addEventListener('wheel', event => { window.__wheelPrevented = event.defaultPrevented; });
  });
  async function wheelOnTank(delta) {
    await page.locator('canvas').first().scrollIntoViewIfNeeded();
    const bounds = await page.locator('canvas').first().boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(300);
    return { before, after: await page.evaluate(() => scrollY), prevented: await page.evaluate(() => window.__wheelPrevented) };
  }
  await check('La molette sur la cuve fait défiler par défaut', async () => {
    assert.equal(await page.getByRole('button', { name: 'Activer le zoom à la molette', exact: true }).getAttribute('aria-pressed'), 'false');
    const result = await wheelOnTank(180);
    assert.ok(result.after > result.before + 50, JSON.stringify(result));
    assert.equal(result.prevented, false);
  });
  await check('Le zoom se choisit puis peut être désactivé', async () => {
    await page.getByRole('button', { name: 'Activer le zoom à la molette', exact: true }).click();
    const result = await wheelOnTank(180);
    assert.equal(result.after, result.before);
    assert.equal(result.prevented, true);
    await page.getByRole('button', { name: 'Désactiver le zoom pour faire défiler', exact: true }).click();
    assert.equal((await wheelOnTank(-150)).prevented, false);
  });
  await page.getByRole('button', { name: 'Voir le cas θ = 30°', exact: true }).click();
  const panel = page.locator('#theta-demonstration');
  const amplitude = page.getByLabel('Amplitude théorique relative');
  await check('Le cas préparé affiche les minima à ±30° et A = 0', async () => {
    assert.match(await panel.innerText(), /θ₁ = 30,0°/);
    assert.match(await panel.innerText(), /a = 0,40 m/);
    assert.match(await panel.innerText(), /λ = 0,200 m/);
    assert.equal(number(await amplitude.innerText()), 0);
    assert.equal(await page.getByRole('combobox', { name: 'Grandeur visualisée' }).inputValue(), 'amplitude');
    await panel.screenshot({ path: `${output}/desktop-panel.png` });
  });
  await check('Axe, minimum et lobe secondaire restent distincts', async () => {
    await page.getByRole('button', { name: 'Sur l’axe', exact: true }).click();
    assert.equal(number(await amplitude.innerText()), 1);
    await range(page.getByRole('slider', { name: 'Angle d’observation', exact: true }), 48.6);
    assert.ok(number(await amplitude.innerText()) > 0.2);
    await page.getByRole('button', { name: 'Premier minimum', exact: true }).click();
    assert.equal(number(await amplitude.innerText()), 0);
    await range(page.getByRole('slider', { name: 'Angle d’observation', exact: true }), 45);
    await page.getByRole('button', { name: 'Rétablir le cas θ = 30°', exact: true }).click();
    assert.equal(number(await amplitude.innerText()), 0);
  });
  await check('Une fente plus étroite que λ ne crée pas de faux minimum', async () => {
    const aperture = page.getByRole('spinbutton', { name: 'Largeur de fente', exact: true });
    await aperture.fill('0.1'); await aperture.press('Tab');
    assert.match(await panel.innerText(), /Aucun premier minimum pour a < λ/);
    assert.equal(await page.getByRole('button', { name: 'Premier minimum', exact: true }).isDisabled(), true);
    assert.equal(number(await amplitude.innerText()), 1);
    await aperture.fill('0.4'); await aperture.press('Tab');
  });
  await check('L’incidence oblique est exclue et le cas peut être rétabli', async () => {
    await page.getByRole('button', { name: 'Réglages avancés', exact: true }).click();
    const incidence = page.getByRole('spinbutton', { name: 'Direction incidente', exact: true });
    await incidence.fill('15'); await incidence.press('Tab');
    assert.match(await panel.innerText(), /réglages actuels ne correspondent plus/);
    assert.equal(await amplitude.count(), 0);
    await page.getByRole('button', { name: 'Rétablir le cas θ = 30°', exact: true }).click();
    assert.equal(number(await amplitude.innerText()), 0);
  });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.setDefaultTimeout(10_000);
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(base, { waitUntil: 'networkidle' });
  await check('Sur téléphone, le cas θ est accessible avant la cuve', async () => {
    await mobile.getByRole('button', { name: 'Voir le cas θ = 30°', exact: true }).click();
    assert.equal(number(await mobile.getByLabel('Amplitude théorique relative').innerText()), 0);
    const sizes = await mobile.evaluate(() => ({ page: document.documentElement.scrollWidth, screen: innerWidth }));
    assert.equal(sizes.page, sizes.screen);
    assert.equal(await mobile.locator('.sidebar').evaluate(element => getComputedStyle(element).position), 'static');
    assert.equal(await mobile.locator('canvas').evaluate(element => getComputedStyle(element).touchAction), 'pan-y');
    await mobile.locator('#theta-demonstration').screenshot({ path: `${output}/mobile-panel.png` });
  });
  await check('Les commandes tactiles explicites activent puis libèrent la vue', async () => {
    await mobile.getByRole('button', { name: 'Activer le zoom à la molette', exact: true }).click();
    assert.equal(await mobile.locator('canvas').evaluate(element => getComputedStyle(element).touchAction), 'none');
    await mobile.getByRole('button', { name: 'Désactiver le zoom pour faire défiler', exact: true }).click();
    assert.equal(await mobile.locator('canvas').evaluate(element => getComputedStyle(element).touchAction), 'pan-y');
  });
} finally {
  await browser.close();
}
await writeFile(`${output}/browser-report.json`, JSON.stringify({ checks, errors }, null, 2));
if (checks.some(check => !check.passed) || errors.length) process.exitCode = 1;
