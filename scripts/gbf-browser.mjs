import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4180';
const soundURL = new URL('?medium=sound', baseURL.endsWith('/') ? baseURL : `${baseURL}/`).href;
const output = path.resolve('test-results/gbf');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const checks = [], errors = [], captures = [];
function monitor(page, name) {
  page.on('pageerror', error => errors.push({ page: name, type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') errors.push({ page: name, type: 'console', message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) errors.push({ page: name, type: 'http', status: response.status(), url: response.url() }); });
  page.setDefaultTimeout(15000);
}
async function check(name, action) {
  try { const detail = await action(); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
  catch (error) { checks.push({ name, passed: false, error: error.stack || String(error) }); console.error(`FAIL ${name}: ${error.message}`); }
}
const canvas = page => page.locator('canvas.planar-wave-canvas').first();
async function pause(page) {
  const control = page.getByRole('button', { name: 'Mettre en pause', exact: true });
  if (await control.count()) await control.click();
  await page.waitForTimeout(150);
}
async function play(page) {
  const control = page.getByRole('button', { name: 'Démarrer', exact: true });
  if (await control.count()) await control.click();
}
async function waitTime(page, seconds) {
  await page.waitForFunction(time => Number(document.querySelector('canvas.planar-wave-canvas')?.dataset.physicalTime) >= time, seconds, { timeout: 60000 });
}
async function edit(page, label, value) {
  const control = page.getByRole('spinbutton', { name: label, exact: true });
  await control.fill(String(value)); await control.press('Tab'); await page.waitForTimeout(150);
}
async function frame(page) {
  return canvas(page).evaluate(element => {
    const context = element.getContext('2d');
    assertCanvas(context);
    // Only the downstream part of the drawing, away from GBF, cable and speaker.
    // Differences here require transmitted fronts, not a blinking generator icon.
    const x = Math.floor(element.width * 0.64), y = Math.floor(element.height * 0.3);
    const width = Math.max(1, Math.floor(element.width * 0.29)), height = Math.max(1, Math.floor(element.height * 0.45));
    const pixels = context.getImageData(x, y, width, height).data;
    return { time: Number(element.dataset.physicalTime), pixels: Array.from(pixels), width, height };
    function assertCanvas(value) { if (!value) throw new Error('No Canvas 2D context'); }
  });
}
async function screenshot(page, filename) {
  await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(0, 0); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(output, filename), fullPage: true });
  captures.push({ filename, viewport: page.viewportSize(), ...(await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, physicalTime: document.querySelector('canvas.planar-wave-canvas')?.dataset.physicalTime, documentWidth: document.documentElement.scrollWidth }))) });
}
async function exportSession(page, filename) {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter JSON', exact: true }).click();
  const file = await downloading; const destination = path.join(output, filename); await file.saveAs(destination);
  return JSON.parse(await readFile(destination, 'utf8'));
}
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, acceptDownloads: true, deviceScaleFactor: 1 });
const page = await context.newPage(); monitor(page, 'desktop');
try {
  await page.goto(soundURL, { waitUntil: 'networkidle' });
  await canvas(page).waitFor();
  await check('Le lien sonore ouvre directement le montage de diffraction', async () => {
    assert.ok(await page.locator('.app').evaluate(element => element.classList.contains('sound-focused')));
    assert.equal(await page.getByRole('combobox', { name: 'Milieu de propagation', exact: true }).inputValue(), 'sound');
    assert.ok(await page.getByRole('heading', { name: 'La diffraction du son.', exact: true }).isVisible());
    assert.match(await canvas(page).getAttribute('aria-label'), /GBF.*haut-parleur.*fente/);
    assert.ok(await page.getByRole('spinbutton', { name: 'Fréquence du son', exact: true }).isVisible());
    assert.ok(await page.getByRole('spinbutton', { name: 'Largeur de la fente', exact: true }).isVisible());
    assert.equal(await page.locator('.sidebar').isVisible(), false);
    assert.equal(await page.locator('.metrics-row').isVisible(), false);
    assert.equal(await page.locator('.theta-launcher').isVisible(), false);
    return 'GBF et émetteur sur la scène ; fréquence et largeur de fente seules au premier plan';
  });
  await check('Les fronts transmis derrière la fente proviennent d’un champ évolutif', async () => {
    await pause(page); await page.getByRole('button', { name: 'Recommencer l’expérience', exact: true }).click();
    await page.waitForTimeout(180);
    const empty = await frame(page); assert.equal(empty.time, 0);
    await play(page); await waitTime(page, 0.014); await pause(page);
    const wave = await frame(page);
    let changed = 0;
    for (let i = 0; i < empty.pixels.length; i += 4) if (Math.abs(empty.pixels[i] - wave.pixels[i]) + Math.abs(empty.pixels[i + 1] - wave.pixels[i + 1]) + Math.abs(empty.pixels[i + 2] - wave.pixels[i + 2]) > 20) changed++;
    assert.ok(changed > 80, `${changed} pixels modifiés dans la région derrière la fente`);
    assert.ok(wave.time >= 0.014);
    await screenshot(page, 'gbf-desktop-light.png');
    await page.locator('.simulation-panel').screenshot({ path: path.join(output, 'gbf-desktop-scene.png') });
    return `${changed} pixels modifiés en aval ; t = ${(wave.time * 1000).toFixed(3)} ms`;
  });
  await check('Les réglages essentiels modifient réellement le montage et recommencent le champ', async () => {
    await pause(page);
    await edit(page, 'Fréquence du son', 800);
    assert.equal(Number(await canvas(page).getAttribute('data-physical-time')), 0);
    await edit(page, 'Largeur de la fente', 0.34);
    assert.equal(Number(await canvas(page).getAttribute('data-physical-time')), 0);
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence du son', exact: true }).inputValue(), '800');
    assert.equal(await page.getByRole('spinbutton', { name: 'Largeur de la fente', exact: true }).inputValue(), '0.34');
    await page.getByRole('button', { name: 'Outils et autres expériences', exact: true }).click();
    const exported = await exportSession(page, 'montage-800Hz-34cm.json');
    assert.equal(exported.parameters.medium, 'sound');
    assert.equal(exported.parameters.source, 'point');
    assert.equal(exported.parameters.sourceX, 0.38);
    assert.equal(exported.parameters.obstacle, 'slit');
    assert.equal(exported.parameters.frequency, 800);
    assert.equal(exported.parameters.aperture, 0.34);
    assert.ok(await page.getByRole('button', { name: 'Vue 2D', exact: true }).isVisible());
    assert.ok(await page.getByRole('button', { name: 'Vue 3D', exact: true }).isVisible());
    assert.ok(await page.getByRole('tab', { name: 'Analyse', exact: true }).isVisible());
    return 'JSON : source ponctuelle (0,38 ; 0,80) m, fente, 800 Hz et ouverture 0,34 m';
  });
  await check('Le montage simple se recharge sans supprimer les outils avancés', async () => {
    await page.getByRole('button', { name: 'Voir le montage GBF et fente', exact: true }).click();
    assert.ok(await page.locator('.app').evaluate(element => element.classList.contains('sound-focused')));
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence du son', exact: true }).inputValue(), '1000');
    assert.equal(await page.getByRole('spinbutton', { name: 'Largeur de la fente', exact: true }).inputValue(), '0.17');
    await waitTime(page, 0.014); await pause(page);
    return 'Retour au montage GBF et fente initial à 1 000 Hz';
  });
  // Source-switch semantics are checked below when the scene/control implementation
  // exposes the actual GBF switch. Absence of the switch is a failed requirement.
  await check('Arrêter le GBF conserve les ondes déjà émises et le temps physique', async () => {
    await pause(page);
    const switchOff = page.getByRole('button', { name: 'Arrêter le GBF', exact: true });
    assert.ok(await switchOff.isVisible());
    const before = await frame(page);
    await switchOff.click(); await page.waitForTimeout(180);
    const after = await frame(page);
    assert.equal(after.time, before.time, 'L’arrêt de l’excitation ne réinitialise pas le temps');
    assert.deepEqual(after.pixels, before.pixels, 'Les ondes déjà présentes derrière la fente sont conservées');
    assert.ok(await page.getByRole('button', { name: 'Allumer le GBF', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Outils et autres expériences', exact: true }).click();
    const exported = await exportSession(page, 'montage-gbf-eteint.json');
    assert.equal(exported.parameters.sourceEnabled, false);
    assert.ok(await page.getByRole('tab', { name: 'Analyse', exact: true }).isVisible());
    return 'L’arrêt coupe la source sans effacer les fronts déjà calculés';
  });
  await check('Le milieu eau reste accessible avec son interface et ses unités', async () => {
    await page.getByRole('combobox', { name: 'Milieu de propagation', exact: true }).selectOption('water');
    assert.equal(await page.locator('.app').evaluate(element => element.classList.contains('sound-focused')), false);
    assert.ok(await page.getByRole('tab', { name: 'Découverte', exact: true }).isVisible());
    assert.ok(await page.getByRole('spinbutton', { name: 'Amplitude source', exact: true }).isVisible());
    assert.match(await page.locator('.color-legend').innerText(), /mm/);
  });
  for (const dark of [false, true]) {
    await check(`Montage visible sur mobile, thème ${dark ? 'sombre' : 'clair'}`, async () => {
      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      const mobile = await mobileContext.newPage(); monitor(mobile, dark ? 'mobile-dark' : 'mobile-light');
      await mobile.goto(soundURL, { waitUntil: 'networkidle' }); await canvas(mobile).waitFor();
      if (dark) await mobile.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
      await waitTime(mobile, 0.012); await pause(mobile);
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const rect = await canvas(mobile).boundingBox(); assert.ok(rect.width > 300 && rect.height > 250);
      assert.ok(await mobile.getByRole('spinbutton', { name: 'Fréquence du son', exact: true }).isVisible());
      assert.ok(await mobile.getByRole('spinbutton', { name: 'Largeur de la fente', exact: true }).isVisible());
      await screenshot(mobile, `gbf-mobile-${dark ? 'dark' : 'light'}.png`);
      await mobile.locator('.simulation-panel').screenshot({ path: path.join(output, `gbf-mobile-scene-${dark ? 'dark' : 'light'}.png`) });
      await mobileContext.close();
    });
  }
} finally {
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify({ baseURL, soundURL, testedAt: new Date().toISOString(), browser: await browser.version(), checks, captures, errors }, null, 2));
  await context.close().catch(() => {}); await browser.close().catch(() => {});
}
if (checks.some(check => !check.passed) || errors.length) {
  if (errors.length) console.error('Browser errors:', errors);
  process.exitCode = 1;
}
console.log(`${checks.filter(check => check.passed).length}/${checks.length} contrôles GBF réussis, ${errors.length} erreurs de navigateur`);
