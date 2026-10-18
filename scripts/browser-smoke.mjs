import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const output = path.resolve('test-results');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const checks = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, acceptDownloads: true });
function monitor(page, label) {
  page.on('pageerror', error => errors.push({ page: label, type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ page: label, type: 'console', message: message.text(), location: message.location() });
  });
}
const page = await context.newPage();
monitor(page, 'desktop');
page.setDefaultTimeout(12_000);
const number = text => Number(text.replace(/[\s\u202f\u00a0]/g, '').replace(',', '.').replace(/[^\d.−-]/g, '').replace('−', '-'));
const physicalTime = async () => number(await page.locator('.physical-clock strong').innerText());
const pause = async () => {
  const button = page.getByRole('button', { name: 'Mettre en pause', exact: true });
  if (await button.count()) await button.click();
  await page.waitForTimeout(180);
};
const play = async () => {
  const button = page.getByRole('button', { name: 'Démarrer', exact: true });
  if (await button.count()) await button.click();
};
async function check(name, action) {
  try {
    const detail = await action();
    checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name} — ${error.message}`);
  }
}
async function setRange(locator, value) {
  await locator.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
let jsonPath;
try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.locator('canvas').first().waitFor({ state: 'visible' });

  await check('Rendu WebGL et progression du champ', async () => {
    await page.getByRole('combobox', { name: 'Vitesse de lecture' }).selectOption('1');
    await page.waitForFunction(() => Number(document.querySelector('.physical-clock strong').textContent.replace(',', '.').replace(/[^\d.]/g, '')) >= 1.4, undefined, { timeout: 20_000 });
    const canvas = await page.locator('canvas').first().evaluate(element => ({ width: element.width, height: element.height }));
    assert.ok(canvas.width > 400 && canvas.height > 200);
    const screenshot = await page.screenshot({ path: path.join(output, 'lab-desktop.png'), fullPage: true });
    await writeFile(path.join(output, 'lab-desktop-late.png'), screenshot);
    return `canvas ${canvas.width} × ${canvas.height}, t=${await physicalTime()} s`;
  });

  await check('Pause stable puis pas manuel effectif', async () => {
    await pause();
    const before = await physicalTime();
    await page.waitForTimeout(500);
    assert.equal(await physicalTime(), before, 'Le temps doit rester stable pendant la pause.');
    await page.getByRole('button', { name: 'Avancer d’un pas d’observation', exact: true }).click();
    const after = await physicalTime();
    assert.ok(after > before, `Pas manuel sans progression : ${before} → ${after}.`);
    assert.ok(await page.getByRole('button', { name: 'Démarrer', exact: true }).isVisible());
    return `${before} → ${after} s`;
  });

  await check('Curseur fréquence et réciprocité longueur d’onde', async () => {
    await setRange(page.getByRole('slider', { name: 'Fréquence — curseur', exact: true }), 12.5);
    await page.waitForFunction(() => document.querySelector('input[aria-label="Fréquence"]').value === '12.5');
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), '12.5');
    assert.match(await page.locator('.metrics-row .metric').first().innerText(), /0,160/);
    await page.getByRole('button', { name: 'Réglages avancés', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Longueur d’onde', exact: true }).fill('0.25');
    await page.getByRole('spinbutton', { name: 'Longueur d’onde', exact: true }).press('Tab');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Fréquence"]').value === '8');
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), '8');
    return 'f=12,5 Hz → λ=0,160 m ; λ=0,25 m → f=8 Hz';
  });

  await check('Sources et géométries réactives', async () => {
    await page.getByLabel('Source d’onde', { exact: true }).selectOption('pair');
    assert.ok(await page.getByRole('spinbutton', { name: 'Déphasage des sources', exact: true }).isVisible());
    await page.getByLabel('Source d’onde', { exact: true }).selectOption('point');
    await page.getByLabel('Géométrie', { exact: true }).selectOption('double');
    assert.ok(await page.getByRole('spinbutton', { name: 'Écartement des fentes', exact: true }).isVisible());
    await page.getByLabel('Géométrie', { exact: true }).selectOption('circle');
    assert.ok(await page.getByRole('spinbutton', { name: 'Diamètre', exact: true }).isVisible());
    await page.getByLabel('Géométrie', { exact: true }).selectOption('slit');
    await page.getByLabel('Source d’onde', { exact: true }).selectOption('plane');
    await page.getByRole('button', { name: 'Dessus', exact: true }).click();
    assert.match(await page.getByRole('button', { name: 'Dessus', exact: true }).getAttribute('class'), /selected/);
    await page.getByRole('combobox', { name: 'Grandeur visualisée' }).selectOption('intensity');
    assert.match(await page.locator('.color-legend').innerText(), /Intensité relative/);
    await page.getByRole('combobox', { name: 'Grandeur visualisée' }).selectOption('displacement');
  });

  await check('Parcours Huygens jusqu’au champ seul', async () => {
    await page.getByRole('tab', { name: 'Huygens', exact: true }).click();
    await page.getByRole('button', { name: 'Étape 4', exact: true }).click();
    assert.match(await page.locator('.huygens-body').innerText(), /ondelettes/);
    await page.getByRole('button', { name: 'Étape 7', exact: true }).click();
    assert.match(await page.locator('.huygens-body').innerText(), /seul le champ numérique/);
    await page.screenshot({ path: path.join(output, 'lab-huygens.png'), fullPage: true });
  });

  await check('Sondes sur la cuve et courbe issue du calcul', async () => {
    await page.getByRole('tab', { name: 'Analyse', exact: true }).click();
    await page.getByRole('button', { name: 'Dessus', exact: true }).click();
    const canvas = page.locator('.scene-container canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    await canvas.click({ position: { x: bounds.width * 0.6, y: bounds.height * 0.51 } });
    assert.equal(await page.locator('.probe-card').count(), 2, 'Le clic sur l’eau doit ajouter une seconde sonde.');
    await play();
    await page.waitForTimeout(1600);
    await pause();
    const chart = page.locator('.analysis-panel svg[role="img"]');
    assert.ok(await chart.isVisible());
    assert.ok(await chart.locator('path[stroke-width="2"]').count() >= 2);
    assert.ok((await chart.locator('path[stroke-width="2"]').first().getAttribute('d')).includes('L'), 'Au moins deux observations sont nécessaires.');
    await page.screenshot({ path: path.join(output, 'lab-analysis.png'), fullPage: true });
    return '2 sondes, 2 séries temporelles calculées';
  });

  await check('Pas manuel enregistré dans le graphe de sonde', async () => {
    await pause();
    const curve = page.locator('.analysis-panel svg[role="img"] path[stroke-width="2"]').first();
    const before = await curve.getAttribute('d');
    const time = await physicalTime();
    await page.getByRole('button', { name: 'Avancer d’un pas d’observation', exact: true }).click();
    assert.ok(await physicalTime() > time);
    assert.notEqual(await curve.getAttribute('d'), before, 'Le pas doit produire une observation dans le graphe.');
  });

  await check('Coordonnées de sonde validées au blur et historique réinitialisé', async () => {
    const coordinate = page.getByRole('spinbutton', { name: 'Position x de la sonde 1', exact: true });
    await coordinate.fill('2');
    await coordinate.press('Tab');
    assert.equal(await coordinate.inputValue(), '2');
    assert.match(await page.locator('.probe-title').first().innerText(), /x = 2,00 m/);
    assert.equal(await page.locator('.analysis-panel svg[role="img"]').count(), 0, 'Le déplacement de sonde doit effacer les anciennes observations.');
    assert.match(await page.locator('.chart-section').innerText(), /recommencez l’expérience après avoir placé les sondes/);
    await page.getByRole('button', { name: 'Avancer d’un pas d’observation', exact: true }).click();
    assert.match(await page.locator('.chart-section').innerText(), /recommencez l’expérience après avoir placé les sondes/);
  });

  await check('Acquisition angulaire réelle et détection d’arrivée après reset', async () => {
    await page.getByRole('button', { name: 'Recommencer l’expérience', exact: true }).click();
    const angular = page.getByRole('img', { name: /A²\(θ\) \/ A²\(0\)/ });
    assert.equal(await angular.count(), 0, 'Le profil angulaire ne doit pas être fabriqué avant l’arrivée du signal.');
    assert.match(await page.locator('.analysis-columns').innerText(), /Acquisition de l’amplitude/);
    assert.match(await page.locator('.chart-section').innerText(), /S1 : non détectée/);
    await play();
    await angular.waitFor({ state: 'visible', timeout: 30_000 });
    assert.ok(await angular.locator('path[stroke-width="2"]').count() === 1);
    await page.waitForFunction(() => /S1 : \d+[,.]\d+ s/.test(document.querySelector('.chart-section').textContent), undefined, { timeout: 20_000 });
    await pause();
    return 'Profil mesuré après acquisition ; arrivée au seuil de 5 % affichée';
  });

  await check('Effacement des sondes sans série artificielle', async () => {
    await page.getByRole('button', { name: 'Effacer les sondes', exact: true }).click();
    assert.equal(await page.locator('.probe-card').count(), 0);
    await page.getByRole('button', { name: 'Avancer d’un pas d’observation', exact: true }).click();
    assert.equal(await page.locator('.analysis-panel svg[role="img"]').count(), 0);
    assert.match(await page.locator('.analysis-panel .chart-empty').innerText(), /mesures apparaîtront/);
  });

  await check('Deux cuves et horloges synchronisées', async () => {
    await page.getByRole('tab', { name: 'Comparaison', exact: true }).click();
    assert.equal(await page.locator('.scene-container canvas').count(), 2);
    await play();
    await page.waitForTimeout(1100);
    await pause();
    const main = await physicalTime();
    const text = await page.locator('.scene-corner-label').nth(1).innerText();
    const comparison = number(text.match(/t = ([\d,]+)/)?.[1] || 'NaN');
    assert.ok(main > 0);
    assert.ok(Math.abs(main - comparison) <= 0.002, `${main} ≠ ${comparison}`);
    await page.screenshot({ path: path.join(output, 'lab-comparison.png'), fullPage: true });
    return `t₁=${main} s ; t₂=${comparison} s`;
  });

  await check('Présentation avec équations, annotations et réglages réversibles', async () => {
    await page.getByRole('tab', { name: 'Présentation', exact: true }).click();
    assert.ok(await page.locator('.presentation-equations').isVisible());
    assert.match(await page.locator('.presentation-equations').innerText(), /∂²η\/∂t² = v² ∇²η/);
    assert.equal(await page.locator('.sidebar').count(), 0);
    const annotations = page.getByRole('checkbox', { name: 'Annotations explicatives', exact: true });
    assert.ok(await annotations.isChecked());
    await annotations.uncheck();
    assert.equal(await page.locator('.insight-panel').count(), 0);
    await annotations.check();
    assert.ok(await page.locator('.insight-panel').isVisible());
    await page.getByRole('button', { name: 'Afficher les réglages', exact: true }).click();
    assert.ok(await page.locator('.sidebar').isVisible());
    await page.getByRole('button', { name: 'Masquer les réglages', exact: true }).click();
    assert.equal(await page.locator('.sidebar').count(), 0);
    await page.screenshot({ path: path.join(output, 'lab-presentation.png'), fullPage: true });
    await page.getByRole('tab', { name: 'Découverte', exact: true }).click();
  });

  await check('Thème sombre', async () => {
    await page.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  });

  await check('Export PNG et JSON', async () => {
    const pngPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Capturer l’expérience en PNG', exact: true }).click();
    const png = await pngPromise;
    const pngPath = path.join(output, 'experience.png');
    await png.saveAs(pngPath);
    const bytes = await readFile(pngPath);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok((await stat(pngPath)).size > 10_000);
    const jsonPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter JSON', exact: true }).click();
    const json = await jsonPromise;
    jsonPath = path.join(output, 'experience.json');
    await json.saveAs(jsonPath);
    const data = JSON.parse(await readFile(jsonPath, 'utf8'));
    assert.ok(data.parameters || data.frequency);
    return `${png.suggestedFilename()} et ${json.suggestedFilename()}`;
  });

  await check('Import des paramètres exportés', async () => {
    assert.ok(jsonPath, 'Export JSON préalable nécessaire.');
    const saved = JSON.parse(await readFile(jsonPath, 'utf8'));
    const parameters = saved.parameters || saved;
    await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).fill('13');
    await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).press('Tab');
    await page.locator('input[type="file"]').setInputFiles(jsonPath);
    await page.waitForFunction(expected => document.querySelector('input[aria-label="Fréquence"]').value === String(expected), parameters.frequency);
    assert.equal(await physicalTime(), 0, 'L’import doit réinitialiser le champ.');
    assert.equal(await page.locator('[role="alert"]').count(), 0);
  });

  await check('Validations scientifiques exécutées dans le navigateur', async () => {
    await page.getByRole('button', { name: 'Validation scientifique', exact: true }).click();
    assert.equal(await page.locator('.validation-card').count(), 0, 'Aucun résultat prérempli.');
    await page.getByRole('button', { name: 'Exécuter les validations', exact: true }).click();
    await page.locator('.validation-summary').waitFor({ timeout: 90_000 });
    const summary = await page.locator('.validation-summary').innerText();
    const match = summary.match(/(\d+) \/ (\d+)/);
    assert.ok(match);
    assert.equal(Number(match[1]), Number(match[2]), summary);
    assert.equal(await page.locator('.validation-card .fail').count(), 0);
    await page.screenshot({ path: path.join(output, 'lab-validation.png'), fullPage: true });
    return summary;
  });

  await check('Affichage mobile sans débordement horizontal', async () => {
    const mobile = await context.newPage();
    monitor(mobile, 'mobile');
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.goto(baseURL, { waitUntil: 'networkidle' });
    await mobile.locator('canvas').first().waitFor({ state: 'visible' });
    await mobile.waitForTimeout(1200);
    const dimensions = await mobile.evaluate(() => ({ inner: innerWidth, document: document.documentElement.scrollWidth }));
    await mobile.screenshot({ path: path.join(output, 'lab-mobile.png'), fullPage: true });
    assert.ok(dimensions.document <= dimensions.inner + 1, `Débordement : ${dimensions.document}px pour ${dimensions.inner}px.`);
    await mobile.getByRole('button', { name: 'Mettre en pause', exact: true }).click();
    await mobile.close();
    return `${dimensions.document} / ${dimensions.inner}px`;
  });
} catch (error) {
  checks.push({ name: 'Initialisation du navigateur', passed: false, error: error.message });
} finally {
  checks.push({ name: 'Aucune erreur console ou JavaScript', passed: errors.length === 0, errors });
  const report = { baseURL, browser: { name: 'Chromium', version: browser.version() }, testedAt: new Date().toISOString(), checks, errors, passed: checks.every(item => item.passed) };
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${checks.filter(item => item.passed).length}/${checks.length} contrôles navigateur réussis.`);
  if (errors.length) console.error(JSON.stringify(errors, null, 2));
  await browser.close();
  process.exitCode = report.passed ? 0 : 1;
}
