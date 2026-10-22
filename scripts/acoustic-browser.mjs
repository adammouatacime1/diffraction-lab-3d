import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const output = path.resolve('test-results/acoustics');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const checks = [];
const errors = [];
const captures = [];
const liveSynchronization = [];
const comparisonSynchronization = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, acceptDownloads: true });
function monitor(page, label) {
  page.on('pageerror', error => errors.push({ page: label, type: 'pageerror', message: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ page: label, type: 'console', message: message.text() });
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push({ page: label, type: 'http', status: response.status(), url: response.url() });
  });
}
async function check(name, action) {
  try {
    const detail = await action();
    checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    checks.push({ name, passed: false, error: error.stack || error.message });
    console.error(`FAIL ${name} — ${error.message}`);
  }
}
const number = text => Number(text.replace(/[\s\u202f\u00a0]/g, '').replace(',', '.').replace(/[^\d.−-]/g, '').replace('−', '-'));
const until = async condition => {
  const deadline = Date.now() + 20000;
  while (!(await condition())) { if (Date.now() >= deadline) throw new Error('Condition non satisfaite après 20 secondes'); await new Promise(done => setTimeout(done, 50)); }
};
async function pause(page) {
  const button = page.getByRole('button', { name: 'Mettre en pause', exact: true });
  if (await button.count()) await button.click();
  await page.waitForTimeout(150);
}
async function fullLab(page) {
  const tools = page.getByRole('button', { name: 'Outils et autres expériences', exact: true });
  if (await tools.isVisible()) await tools.click();
  const planar = page.getByRole('button', { name: 'Vue 2D', exact: true });
  if (await planar.isVisible()) await planar.click();
}
async function play(page) {
  const button = page.getByRole('button', { name: 'Démarrer', exact: true });
  if (await button.count()) await button.click();
}
async function edit(page, label, value) {
  const input = page.getByRole('spinbutton', { name: label, exact: typeof label === 'string' });
  await input.fill(String(value)); await input.press('Tab');
}
async function setRange(locator, value) {
  await locator.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function reset(page) { await page.getByRole('button', { name: 'Recommencer l’expérience', exact: true }).click(); }
const clock = page => page.locator('.physical-clock strong');
const medium = page => page.getByRole('combobox', { name: 'Milieu de propagation', exact: true });
const micCoordinate = (page, axis, index) => page.getByRole('spinbutton', { name: new RegExp(`Position ${axis}.*microphone M?${index}`, 'i') });
const acousticCanvas = page => page.locator('canvas.planar-wave-canvas').first();
async function canvasHash(canvas) {
  return canvas.evaluate(element => {
    const context = element.getContext('2d');
    if (!context) throw new Error('Le canvas demandé ne possède pas de contexte 2D');
    const bytes = context.getImageData(0, 0, element.width, element.height).data;
    let hash = 2166136261;
    for (let index = 0; index < bytes.length; index += 4) hash = Math.imul(hash ^ bytes[index] ^ bytes[index + 1] ^ bytes[index + 2], 16777619);
    return hash >>> 0;
  });
}
async function saveDownload(page, button, filename) {
  const promise = page.waitForEvent('download'); await button.click(); const download = await promise;
  const destination = path.join(output, filename); await download.saveAs(destination); return destination;
}
async function screenshot(page, filename) {
  await page.evaluate(() => { scrollTo(0, 0); document.querySelectorAll('.sidebar').forEach(element => { element.scrollTop = 0; }); });
  await page.mouse.move(0, 0); await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(output, filename), fullPage: true });
  captures.push({ filename, viewport: page.viewportSize(), ...(await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    medium: document.querySelector('[aria-label="Milieu de propagation"]')?.value,
    physicalTime: document.querySelector('.physical-clock strong')?.textContent,
    view: document.querySelector('.acoustic-controls [aria-pressed="true"]')?.textContent,
    documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    deviceScaleFactor: devicePixelRatio,
  }))) });
}
const page = await context.newPage();
monitor(page, 'desktop');
page.setDefaultTimeout(12000);
let soundExport;
try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await medium(page).waitFor(); await pause(page);

  await check('Sélecteur de milieu distinct des cinq modes existants', async () => {
    assert.equal(await medium(page).inputValue(), 'water');
    assert.equal(await page.getByRole('tablist', { name: 'Mode du laboratoire' }).getByRole('tab').count(), 5);
    await edit(page, 'Fréquence', 12.5);
    await medium(page).selectOption('sound'); await pause(page); await fullLab(page);
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), '1000');
    assert.equal(await page.getByRole('spinbutton', { name: 'Célérité', exact: true }).inputValue(), '340');
    assert.match(await page.locator('.metrics-row').innerText(), /0,340/);
    assert.match(await page.locator('.metrics-row').innerText(), /1,000.*ms/s);
    assert.match(await page.locator('.color-legend').innerText(), /Pa/);
    assert.doesNotMatch(await page.locator('.color-legend').innerText(), /mm|Élongation/);
    await page.getByRole('combobox', { name: 'Grandeur visualisée', exact: true }).selectOption('rms');
    assert.match(await page.locator('.color-legend').innerText(), /Pression efficace/);
    assert.match(await page.locator('.color-legend .legend-values').innerText(), /0,707/);
    await page.getByRole('combobox', { name: 'Grandeur visualisée', exact: true }).selectOption('displacement');
    assert.equal(await clock(page).locator('small').innerText(), 'ms');
    assert.equal(await page.getByRole('button', { name: 'Vue 2D', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Vue 3D', exact: true }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Vue partagée 2D + 3D', exact: true }).count(), 1);
    const viewportBox = await page.locator('.viewport').boundingBox();
    const legendBox = await page.locator('.color-legend').boundingBox();
    assert.ok(legendBox.y >= viewportBox.y + viewportBox.height - 1, 'La légende sonore doit laisser visibles la carte et ses axes');
    return 'Eau conservée, son initial : 1 000 Hz, 340 m/s, λ = 0,340 m';
  });

  await check('Paramètres indépendants et champ réinitialisé au changement de milieu', async () => {
    await edit(page, 'Fréquence', 800); await edit(page, 'Pression source', 0.75);
    await until(async () => (await page.locator('.color-legend .legend-values').innerText()).includes('0,750'));
    assert.match(await page.locator('.color-legend .legend-values').innerText(), /−0,750/);
    assert.match(await page.locator('.color-legend .legend-values').innerText(), /\+0,750/);
    await medium(page).selectOption('water'); await pause(page);
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), '12.5');
    assert.equal(await page.getByRole('spinbutton', { name: 'Amplitude source', exact: true }).inputValue(), '4');
    assert.equal(number(await clock(page).innerText()), 0);
    await medium(page).selectOption('sound'); await pause(page); await fullLab(page);
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), '800');
    assert.equal(await page.getByRole('spinbutton', { name: 'Pression source', exact: true }).inputValue(), '0.75');
    assert.ok(number(await clock(page).innerText()) < 2, 'Le champ sonore vient de recommencer ; le montage peut démarrer automatiquement');
    return 'f eau=12,5 Hz ; f son=800 Hz et pression source=0,75 Pa sans mélange des unités';
  });

  await check('Six géométries accessibles et rendues dans le canvas de pression', async () => {
    await page.getByRole('button', { name: 'Vue 2D', exact: true }).click();
    const geometry = page.getByLabel('Géométrie', { exact: true });
    const values = await geometry.locator('option').evaluateAll(options => options.map(option => option.value));
    assert.deepEqual(new Set(values), new Set(['none', 'slit', 'double', 'circle', 'rectangle', 'edge']));
    const hashes = {};
    for (const obstacle of values) {
      await geometry.selectOption(obstacle); await reset(page); await pause(page); await page.waitForTimeout(160);
      assert.ok(await acousticCanvas(page).isVisible());
      hashes[obstacle] = await canvasHash(acousticCanvas(page));
      if (obstacle === 'double') assert.ok(await page.getByRole('spinbutton', { name: 'Écartement des fentes', exact: true }).isVisible());
      if (obstacle === 'rectangle') assert.ok(await page.getByRole('spinbutton', { name: 'Hauteur obstacle', exact: true }).isVisible());
      if (obstacle === 'circle') assert.ok(await page.getByRole('spinbutton', { name: 'Diamètre', exact: true }).isVisible());
    }
    for (const obstacle of values.filter(value => value !== 'none')) assert.notEqual(hashes[obstacle], hashes.none, `${obstacle} doit apparaître dans le champ plan`);
    return JSON.stringify(hashes);
  });

  await check('Microphones virtuels, coordonnées libres et refus des obstacles', async () => {
    await page.getByRole('tab', { name: 'Analyse', exact: true }).click();
    assert.equal(await page.locator('.probe-card').count(), 2);
    assert.match(await page.locator('.probe-card').first().innerText(), /M1/);
    assert.match(await page.locator('.probe-card').nth(1).innerText(), /M2/);
    await page.getByLabel('Géométrie', { exact: true }).selectOption('circle');
    const y = micCoordinate(page, 'y', 1); await y.fill('0.8'); await y.press('Tab');
    const x = micCoordinate(page, 'x', 1); const initial = await x.inputValue();
    await x.fill('1.35'); await x.press('Tab');
    assert.equal(await x.inputValue(), initial, 'Un microphone ne doit pas entrer dans la section cylindrique');
    assert.doesNotMatch(await page.locator('.probe-card').first().innerText(), /DANS UN OBSTACLE/);
    await x.fill('2'); await x.press('Tab'); assert.equal(await x.inputValue(), '2');
    const canvas = acousticCanvas(page); await canvas.scrollIntoViewIfNeeded(); const rect = await canvas.boundingBox();
    const scale = Math.min((rect.width - 58) / 2.8, (rect.height - 84) / 1.6);
    const left = rect.x + 38 + (rect.width - 58 - 2.8 * scale) / 2;
    const top = rect.y + 37 + (rect.height - 84 - 1.6 * scale) / 2;
    await page.mouse.move(left + 2 * scale, top + 0.8 * scale); await page.mouse.down();
    await page.mouse.move(left + 2.2 * scale, top + 0.75 * scale, { steps: 6 }); await page.mouse.up();
    assert.ok(Math.abs(Number(await x.inputValue()) - 2.2) < 0.02);
    assert.ok(Math.abs(Number(await y.inputValue()) - 0.75) < 0.02);
    return 'M1/M2 présents ; coordonnées et glisser-déposer validés, position dans le cylindre refusée';
  });

  await check('Un microphone sélectionné seul est déplacé sans créer un deuxième microphone', async () => {
    await page.getByLabel('Géométrie', { exact: true }).selectOption('none');
    await page.getByRole('button', { name: 'Effacer les microphones', exact: true }).click();
    await page.getByRole('button', { name: 'Ajouter un microphone', exact: true }).click();
    assert.equal(await page.locator('.probe-card').count(), 1);
    const x = micCoordinate(page, 'x', 1); const initial = await x.inputValue();
    await page.getByRole('button', { name: 'Déplacer M1', exact: true }).click();
    const canvas = acousticCanvas(page); await canvas.scrollIntoViewIfNeeded(); const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: bounds.width * 0.75, y: bounds.height * 0.55 } });
    assert.equal(await page.locator('.probe-card').count(), 1);
    await until(async () => (await x.inputValue()) !== initial);
    assert.notEqual(await x.inputValue(), initial);
    await page.getByRole('button', { name: 'Ajouter un microphone', exact: true }).click();
    assert.equal(await page.locator('.probe-card').count(), 2);
  });

  await check('Un microphone est relocalisé si la comparaison crée une paroi à sa position', async () => {
    await page.getByLabel('Géométrie', { exact: true }).selectOption('none');
    await edit(page, 'Position x du microphone M1', 1.35);
    await edit(page, 'Position y du microphone M1', 1.3);
    await page.getByRole('tab', { name: 'Comparaison', exact: true }).click();
    await page.getByRole('tab', { name: 'Analyse', exact: true }).click();
    assert.equal(await page.locator('.probe-card').count(), 2);
    assert.doesNotMatch(await page.locator('.probe-card').first().innerText(), /DANS UN OBSTACLE/);
    const coordinates = [Number(await micCoordinate(page, 'x', 1).inputValue()), Number(await micCoordinate(page, 'y', 1).inputValue())];
    assert.ok(coordinates[0] !== 1.35 || coordinates[1] !== 1.3, 'Le microphone doit quitter la cellule devenue solide');
    await page.getByLabel('Géométrie', { exact: true }).selectOption('none');
  });

  await check('Pressions des deux microphones, unités communes et pression efficace acquise', async () => {
    await page.getByLabel('Géométrie', { exact: true }).selectOption('none');
    await page.getByLabel('Source d’onde', { exact: true }).selectOption('plane');
    await page.getByRole('combobox', { name: 'Vitesse de lecture', exact: true }).selectOption('1');
    await reset(page); await play(page);
    await until(async () => number(await clock(page).innerText()) >= 14);
    await pause(page);
    const chart = page.locator('.analysis-panel svg[role="img"]').first();
    assert.ok(await chart.isVisible());
    assert.match(await chart.textContent(), /Pression.*Pa/);
    assert.match(await chart.textContent(), /Temps.*ms/);
    const curves = chart.locator('path[stroke-width="2"]'); assert.equal(await curves.count(), 2);
    assert.ok((await curves.first().getAttribute('d')).includes('L'));
    assert.equal(await curves.first().getAttribute('stroke'), '#218dba');
    assert.equal(await curves.nth(1).getAttribute('stroke'), '#c65353');
    assert.match(await page.locator('.analysis-panel .chart-legend').innerText(), /M1.*M2/s);
    for (const card of await page.locator('.probe-card').all()) {
      const text = await card.innerText(); assert.match(text, /Pression efficace|p.*rms/i); assert.match(text, /Pa/); assert.doesNotMatch(text, /mm|Acquisition/);
    }
    await screenshot(page, 'sound-desktop-analysis-light.png');
    return `t=${await clock(page).innerText()}, deux séries Pa sur le même axe en ms`;
  });

  await check('Remise à zéro des mesures sans modifier le champ ni le temps physique', async () => {
    const time = await clock(page).innerText();
    await page.getByRole('button', { name: 'Réinitialiser les mesures', exact: true }).click();
    assert.equal(await clock(page).innerText(), time);
    assert.equal(await page.locator('.analysis-panel svg[role="img"]').count(), 0);
    assert.match(await page.locator('.probe-card').first().innerText(), /Acquisition 4 T/);
    await play(page); await until(async () => number(await clock(page).innerText()) > number(time) + 5.5); await pause(page);
    assert.doesNotMatch(await page.locator('.probe-card').first().innerText(), /Acquisition/);
  });

  await check('Synchronisation réelle de 20 images 2D/3D, caméras et relief indépendant', async () => {
    await page.getByRole('button', { name: 'Vue partagée 2D + 3D', exact: true }).click();
    await page.waitForTimeout(350);
    const views = page.locator('[data-engine-id][data-physical-time]');
    assert.equal(await views.count(), 2);
    const before = await views.evaluateAll(elements => elements.map(element => ({ id: element.dataset.engineId, time: Number(element.dataset.physicalTime) })));
    assert.equal(before[0].id, before[1].id); assert.equal(before[0].time, before[1].time);
    assert.ok(before[0].time > 0);
    await play(page);
    await until(async () => page.locator('.acoustic-view canvas').evaluateAll(canvases => canvases.length === 2 && canvases.every(canvas => Number.isFinite(Number(canvas.dataset.physicalTime)))));
    const frames = await page.evaluate(async () => {
      const frames = [];
      await new Promise(resolve => {
        const sample = () => {
          frames.push([...document.querySelectorAll('.acoustic-view canvas')].map(canvas => Number(canvas.dataset.physicalTime)));
          if (frames.length < 20) requestAnimationFrame(sample); else resolve();
        };
        requestAnimationFrame(sample);
      });
      return frames;
    });
    liveSynchronization.push(...frames);
    await pause(page);
    assert.equal(frames.length, 20);
    for (const times of frames) { assert.equal(times.length, 2); assert.ok(times.every(Number.isFinite)); assert.equal(times[0], times[1], `Rendu 2D/3D décalé : ${times.join(' / ')} s`); }
    assert.ok(new Set(frames.map(times => times[0])).size > 1, 'Le champ doit évoluer durant le contrôle de synchronisation');
    const after = await views.evaluateAll(elements => elements.map(element => ({ id: element.dataset.engineId, time: Number(element.dataset.physicalTime) })));
    assert.equal(after[0].id, after[1].id); assert.equal(after[0].time, after[1].time); assert.ok(after[0].time > before[0].time);
    assert.match(await page.locator('.sound-model-note').innerText(), /Le relief représente la pression acoustique.*ce n’est pas un déplacement vertical de l’air/s);
    const frequency = await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue();
    const source = await page.getByRole('spinbutton', { name: 'Pression source', exact: true }).inputValue();
    const pausedTime = await clock(page).innerText();
    const relief = page.getByRole('slider', { name: /Amplification du relief|Exagération verticale/ });
    await setRange(relief, 20);
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), frequency);
    assert.equal(await page.getByRole('spinbutton', { name: 'Pression source', exact: true }).inputValue(), source);
    for (const name of ['Isométrique', 'Dessus', 'Profil', '3D libre']) await page.getByRole('button', { name, exact: true }).click();
    assert.equal(await clock(page).innerText(), pausedTime);
    await screenshot(page, 'sound-desktop-split-light.png');
    return `20 images dessinées synchrones, moteur ${after[0].id} partagé ; t₂D=t₃D=${after[0].time} s`;
  });

  await check('Sources, fronts et Huygens illustratifs sans modification des paramètres physiques', async () => {
    await page.getByRole('button', { name: 'Vue 2D', exact: true }).click();
    const sources = page.getByLabel('Source d’onde', { exact: true });
    for (const value of ['plane', 'point', 'pair']) await sources.selectOption(value);
    assert.ok(await page.getByRole('spinbutton', { name: 'Déphasage des sources', exact: true }).isVisible());
    await edit(page, 'Séparation des sources', 1);
    await sources.selectOption('point');
    await edit(page, 'Position de source y', 0.2);
    await sources.selectOption('pair');
    await until(async () => Number(await page.getByRole('spinbutton', { name: 'Séparation des sources', exact: true }).inputValue()) <= 0.4 + 1e-12);
    assert.equal(await page.getByRole('spinbutton', { name: 'Position de source y', exact: true }).inputValue(), '0.2');
    await edit(page, 'Position de source y', 0.8);
    await edit(page, 'Séparation des sources', 0.4);
    await page.getByLabel('Géométrie', { exact: true }).selectOption('slit');
    await page.getByRole('tab', { name: 'Huygens', exact: true }).click();
    await page.getByRole('button', { name: 'Étape 4', exact: true }).click();
    assert.match(await page.locator('.huygens-panel').innerText(), /Aucune onde supplémentaire n’est injectée/);
    const time = await clock(page).innerText();
    const fronts = page.getByRole('checkbox', { name: /fronts d’onde/i });
    await fronts.check(); await fronts.uncheck();
    await page.getByRole('button', { name: 'Étape 7', exact: true }).click();
    assert.equal(await clock(page).innerText(), time);
    assert.match(await page.locator('.huygens-body').innerText(), /seul le champ numérique/);
  });

  await check('Export sonore versionné, PNG Canvas 2D et migration des exports eau v1', async () => {
    await play(page); await until(async () => number(await clock(page).innerText()) >= 7); await pause(page);
    soundExport = await saveDownload(page, page.getByRole('button', { name: 'Exporter JSON', exact: true }), 'sound-parameters.json');
    const sound = JSON.parse(await readFile(soundExport, 'utf8'));
    assert.ok(sound.version >= 2); assert.equal(sound.medium ?? sound.parameters?.medium, 'sound');
    assert.match(JSON.stringify(sound.units), /Pa/);
    const png = await saveDownload(page, page.getByRole('button', { name: 'Capturer l’expérience en PNG', exact: true }), 'sound-experience.png');
    const imageBytes = await readFile(png);
    assert.equal(imageBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const colors = await page.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const bytes = context.getImageData(400, 250, 800, 500).data; const colors = new Set();
      for (let index = 0; index < bytes.length; index += 400) colors.add((bytes[index] << 16) + (bytes[index + 1] << 8) + bytes[index + 2]);
      return colors.size;
    }, `data:image/png;base64,${imageBytes.toString('base64')}`);
    assert.ok(colors > 24, `Le PNG doit contenir le champ coloré actuel, pas un canvas 3D libéré (${colors} couleurs)`);
    await medium(page).selectOption('water'); await pause(page);
    const waterFile = await saveDownload(page, page.getByRole('button', { name: 'Exporter JSON', exact: true }), 'water-parameters.json');
    const water = JSON.parse(await readFile(waterFile, 'utf8'));
    assert.equal(water.medium ?? water.parameters?.medium, 'water');
    await page.locator('input[type="file"]').setInputFiles(soundExport); await pause(page);
    assert.equal(await medium(page).inputValue(), 'sound');
    await until(async () => (await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue()) === String(sound.parameters.frequency));
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), String(sound.parameters.frequency));
    const legacy = { application: 'Diffraction Lab 3D', version: 1, parameters: { ...water.parameters } }; delete legacy.parameters.medium;
    const legacyFile = path.join(output, 'legacy-water-v1.json'); await writeFile(legacyFile, JSON.stringify(legacy));
    await page.locator('input[type="file"]').setInputFiles(legacyFile); await pause(page);
    assert.equal(await medium(page).inputValue(), 'water');
    await until(async () => (await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue()) === String(water.parameters.frequency));
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), String(water.parameters.frequency));
    assert.equal(number(await clock(page).innerText()), 0);
    assert.equal(await page.locator('[role="alert"]').count(), 0);
    return `format v${sound.version}, milieu/unité Pa identifiés ; export eau v1 importé`;
  });

  await check('Import sonore sous-résolu refusé sans modifier le milieu, les paramètres ni le temps', async () => {
    const sound = JSON.parse(await readFile(soundExport, 'utf8'));
    const invalid = { ...sound, parameters: { ...sound.parameters, frequency: 4000, resolution: 'balanced' } };
    const invalidFile = path.join(output, 'underresolved-sound.json'); await writeFile(invalidFile, JSON.stringify(invalid));
    assert.equal(await medium(page).inputValue(), 'water');
    const waterFrequency = await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue();
    await page.locator('input[type="file"]').setInputFiles(invalidFile); await page.getByRole('alert').waitFor();
    assert.equal(await medium(page).inputValue(), 'water');
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), waterFrequency);
    await page.locator('input[type="file"]').setInputFiles(soundExport);
    await until(async () => (await medium(page).inputValue()) === 'sound' && await page.getByRole('alert').count() === 0);
    await until(async () => (await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue()) === String(sound.parameters.frequency));
    await play(page); await until(async () => number(await clock(page).innerText()) > 2); await pause(page);
    const time = await clock(page).innerText();
    await page.locator('input[type="file"]').setInputFiles(invalidFile); await page.getByRole('alert').waitFor();
    assert.equal(await medium(page).inputValue(), 'sound');
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), String(sound.parameters.frequency));
    assert.equal(await clock(page).innerText(), time);
    assert.match(await page.getByRole('alert').innerText(), /résol|cellules|maillage/i);
    const invalidPair = { ...sound, parameters: { ...sound.parameters, source: 'pair', sourceY: 0.2, sourceSeparation: 1 } };
    const invalidPairFile = path.join(output, 'outside-domain-sources.json'); await writeFile(invalidPairFile, JSON.stringify(invalidPair));
    await page.locator('input[type="file"]').setInputFiles(invalidPairFile);
    await until(async () => /sources.*positions.*domaine/i.test(await page.getByRole('alert').innerText()));
    assert.equal(await medium(page).inputValue(), 'sound');
    assert.equal(await page.getByRole('spinbutton', { name: 'Fréquence', exact: true }).inputValue(), String(sound.parameters.frequency));
    assert.equal(await clock(page).innerText(), time);
    return '4 000 Hz sous-résolu et sources cohérentes hors domaine refusés sans mutation';
  });

  await check('Validations acoustiques exécutées dans l’interface sans faire avancer le laboratoire', async () => {
    await pause(page);
    const time = await clock(page).innerText();
    assert.equal(await medium(page).inputValue(), 'sound');
    await page.getByRole('button', { name: 'Validation scientifique', exact: true }).click();
    assert.equal(await page.locator('.validation-card').count(), 0, 'Aucun résultat acoustique prérempli');
    await page.getByRole('button', { name: 'Exécuter les validations', exact: true }).click();
    await page.locator('.validation-summary').waitFor({ timeout: 30000 });
    const summary = await page.locator('.validation-summary').innerText();
    assert.match(summary, /4 \/ 4/);
    assert.equal(await page.locator('.validation-card').count(), 4);
    assert.equal(await page.locator('.validation-card .fail').count(), 0);
    await page.locator('.document-page .back').click();
    assert.equal(await medium(page).inputValue(), 'sound');
    assert.equal(await clock(page).innerText(), time);
    return summary;
  });

  await check('Une validation différée est annulée lors du changement de milieu', async () => {
    await medium(page).selectOption('water');
    await medium(page).selectOption('sound');
    await pause(page);
    await page.getByRole('button', { name: 'Validation scientifique', exact: true }).click();
    assert.equal(await page.locator('.validation-card').count(), 0);
    // Both user actions occur in the same event-loop turn, before the validation timer can fire.
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(element => element.textContent.includes('Exécuter les validations'));
      if (!button) throw new Error('Bouton de validation absent');
      button.click();
      const selector = document.querySelector('[aria-label="Milieu de propagation"]');
      selector.value = 'water'; selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await until(async () => (await medium(page).inputValue()) === 'water');
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.validation-card').count(), 0);
    assert.equal(await page.locator('.validation-summary').count(), 0);
    assert.doesNotMatch(await page.locator('.app').innerText(), /Calcul des expériences de référence/);
    const back = page.locator('.document-page .back'); if (await back.count()) await back.click();
    await medium(page).selectOption('sound');
    await pause(page);
  });

  await check('Affichage ordinateur/mobile clair/sombre et comparaison partagée sans débordement', async () => {
    for (const viewport of [{ width: 1440, height: 1050 }, { width: 390, height: 844 }]) {
      const visual = await context.newPage(); monitor(visual, `${viewport.width}`);
      await visual.setViewportSize(viewport); await visual.goto(`${baseURL}/?medium=sound&view=2d`, { waitUntil: 'networkidle' }); await fullLab(visual);
      await play(visual); await until(async () => number(await clock(visual).innerText()) >= 9); await pause(visual);
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await visual.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
        assert.ok(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.ok(await acousticCanvas(visual).isVisible());
        await screenshot(visual, `sound-${viewport.width}-${theme}.png`);
      }
      if (viewport.width === 390) {
        await visual.getByRole('button', { name: 'Vue partagée 2D + 3D', exact: true }).click();
        await visual.waitForTimeout(250);
        assert.equal(await visual.locator('.acoustic-view').count(), 2);
        assert.ok(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await screenshot(visual, 'sound-mobile-split-dark.png');
        await visual.getByRole('tab', { name: 'Comparaison', exact: true }).click();
        await play(visual); await until(async () => number(await clock(visual).innerText()) >= 6);
        await until(async () => visual.locator('.acoustic-view canvas').evaluateAll(canvases => canvases.length === 4 && canvases.every(canvas => Number.isFinite(Number(canvas.dataset.physicalTime)))));
        const frames = await visual.evaluate(async () => {
          const frames = [];
          await new Promise(resolve => {
            const sample = () => {
              frames.push([...document.querySelectorAll('.acoustic-view canvas')].map(canvas => Number(canvas.dataset.physicalTime)));
              if (frames.length < 20) requestAnimationFrame(sample); else resolve();
            };
            requestAnimationFrame(sample);
          });
          return frames;
        });
        comparisonSynchronization.push(...frames);
        for (const times of frames) { assert.equal(times.length, 4); assert.ok(times.every(Number.isFinite)); assert.equal(new Set(times).size, 1, `Configurations dessinées à des instants distincts : ${times.join(' / ')} s`); }
        assert.ok(new Set(frames.map(times => times[0])).size > 1);
        await pause(visual);
        const views = visual.locator('.acoustic-view'); assert.equal(await views.count(), 4);
        const times = await views.evaluateAll(elements => elements.map(element => ({ engine: element.dataset.engineId, time: Number(element.dataset.physicalTime) })));
        assert.equal(new Set(times.map(value => value.engine)).size, 2);
        assert.equal(new Set(times.map(value => value.time)).size, 1);
        for (const view of await views.all()) { const bounds = await view.boundingBox(); assert.ok(bounds.height > 200, `Vue comparée tronquée : ${bounds.height}px`); }
        assert.ok(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await screenshot(visual, 'sound-mobile-comparison-split-dark.png');
      }
      await visual.close();
    }
  });

  await check('Vue 2D sans WebGL et repli lisible lorsque la 3D est indisponible', async () => {
    const noGL = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await noGL.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      window.__webglAttempts = 0;
      HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') { window.__webglAttempts++; return null; }
        return getContext.call(this, kind, ...options);
      };
    });
    const fallback = await noGL.newPage(); monitor(fallback, 'sans-webgl');
    await fallback.goto(`${baseURL}/?medium=sound&view=2d`, { waitUntil: 'networkidle' });
    await acousticCanvas(fallback).waitFor({ state: 'visible' });
    assert.equal(await medium(fallback).inputValue(), 'sound');
    assert.equal(await fallback.evaluate(() => window.__webglAttempts), 0, 'La vue 2D doit fonctionner sans créer de contexte WebGL');
    await pause(fallback); const firstHash = await canvasHash(acousticCanvas(fallback)); const initialTime = number(await clock(fallback).innerText());
    await play(fallback); await until(async () => number(await clock(fallback).innerText()) > initialTime + 2); await pause(fallback);
    const hash = await canvasHash(acousticCanvas(fallback)); assert.notEqual(hash, firstHash, 'Le champ Canvas doit évoluer avec le calcul, sans WebGL');
    await fullLab(fallback);
    await fallback.getByRole('button', { name: 'Vue 3D', exact: true }).click();
    await acousticCanvas(fallback).waitFor({ state: 'visible' });
    assert.match(await fallback.locator('.simulation-panel').innerText(), /WebGL|indisponible|2D/);
    await screenshot(fallback, 'sound-no-webgl.png');
    await noGL.close();
    return 'Canvas 2D actif, temps physique avancé, repli après demande 3D';
  });
} catch (error) {
  checks.push({ name: 'Initialisation', passed: false, error: error.stack || error.message });
} finally {
  checks.push({ name: 'Aucune erreur JavaScript, console ou ressource manquante', passed: errors.length === 0, errors });
  const report = { baseURL, testedAt: new Date().toISOString(), browser: browser.version(), checks, captures, liveSynchronization, comparisonSynchronization, errors, passed: checks.every(item => item.passed) };
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${checks.filter(item => item.passed).length}/${checks.length} contrôles acoustiques réussis.`);
  await browser.close(); process.exitCode = report.passed ? 0 : 1;
}
