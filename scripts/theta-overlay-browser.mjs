import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const output = 'test-results/theta-overlay';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const errors = [], checks = [];
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
async function check(name, action) {
  try { await action(); checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function pause(page) {
  const button = page.getByRole('button', { name: 'Mettre en pause', exact: true });
  if (await button.count()) await button.click();
}
async function loadCase(page) {
  await page.getByRole('button', { name: 'Charger le cas θ = 30°', exact: true }).click();
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(12_000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  const toggle = page.getByRole('checkbox', { name: 'Afficher θ sur la cuve', exact: true });
  await check('Option désactivée au départ et absence de faux minimum pour la fente étroite', async () => {
    assert.equal(await toggle.isChecked(), false);
    assert.equal(await page.locator('.theta-scene-note').count(), 0);
    await toggle.check();
    assert.match(await page.locator('.theta-scene-note').innerText(), /a < λ/);
    assert.equal(await page.getByRole('button', { name: 'Charger le cas θ = 30°', exact: true }).isVisible(), true);
  });
  await loadCase(page);
  await check('Cas 30° chargé sur la cuve avec son repère théorique', async () => {
    assert.equal(await toggle.isChecked(), true);
    assert.match(await page.getByRole('button', { name: 'Dessus', exact: true }).getAttribute('class'), /selected/);
    assert.match(await page.locator('.theta-scene-note').innerText(), /θ₁ = 30°/);
    assert.match(await page.locator('.theta-scene-note').innerText(), /pas des nœuds mesurés/);
    await page.getByRole('combobox', { name: 'Vitesse de lecture', exact: true }).selectOption('1');
    await page.waitForFunction(() => Number(document.querySelector('.physical-clock strong').textContent.replace(',', '.').replace(/[^\d.]/g, '')) >= 1.4, undefined, { timeout: 25_000 });
    await pause(page);
  });
  await check('La case ajoute effectivement des tracés dans le canvas et peut les retirer', async () => {
    await page.locator('.simulation-panel').screenshot({ path: `${output}/desktop.png` });
    const canvas = page.locator('canvas').first();
    const enabled = await canvas.screenshot();
    await toggle.uncheck();
    assert.equal(await page.locator('.theta-scene-note').count(), 0);
    const disabled = await canvas.screenshot();
    assert.equal(enabled.equals(disabled), false, 'Le canvas doit changer quand les rayons sont retirés.');
    await toggle.check();
  });
  await check('Le repère suit la largeur et est masqué en incidence oblique', async () => {
    const width = page.getByRole('spinbutton', { name: 'Largeur de fente', exact: true });
    await width.fill('0.8'); await width.press('Tab');
    assert.match(await page.locator('.theta-scene-note').innerText(), /14,5°/);
    await page.getByRole('button', { name: 'Réglages avancés', exact: true }).click();
    const angle = page.getByRole('spinbutton', { name: 'Direction incidente', exact: true });
    await angle.fill('15'); await angle.press('Tab');
    assert.match(await page.locator('.theta-scene-note').innerText(), /incidence normale/);
    await loadCase(page); await pause(page);
    assert.match(await page.locator('.theta-scene-note').innerText(), /θ₁ = 30°/);
  });
  await check('Chaque cuve de comparaison utilise sa propre largeur', async () => {
    await page.getByRole('tab', { name: 'Comparaison', exact: true }).click();
    const notes = await page.locator('.theta-scene-note').allInnerTexts();
    assert.equal(notes.length, 2);
    assert.match(notes[0], /30°/); assert.match(notes[1], /14,5°/);
  });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  mobile.setDefaultTimeout(12_000);
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(base, { waitUntil: 'networkidle' });
  await check('Activation sur téléphone, sans débordement et avec défilement tactile disponible', async () => {
    await mobile.getByRole('checkbox', { name: 'Afficher θ sur la cuve', exact: true }).check();
    await loadCase(mobile); await pause(mobile);
    assert.match(await mobile.locator('.theta-scene-note').innerText(), /θ₁ = 30°/);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
    for (const selector of ['.wave-scene', 'canvas']) {
      assert.equal(await mobile.locator(selector).evaluate(element => getComputedStyle(element).touchAction), 'pan-y');
    }
    await mobile.locator('.simulation-panel').screenshot({ path: `${output}/mobile.png` });
  });
} finally { await browser.close(); }
await writeFile(`${output}/browser-report.json`, JSON.stringify({ checks, errors }, null, 2));
if (errors.length || checks.some(check => !check.passed)) process.exitCode = 1;
