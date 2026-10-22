import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4180';
const soundURL = new URL('?medium=sound', baseURL.endsWith('/') ? baseURL : `${baseURL}/`).href;
const output = path.resolve('test-results/gbf-theta3d');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const checks = [], errors = [], captures = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce', acceptDownloads: true });
function monitor(page, label) {
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push({ page: label, type: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') errors.push({ page: label, type: 'console', message: message.text() }); });
  page.on('response', response => { if (response.status() >= 400) errors.push({ page: label, type: 'http', status: response.status(), url: response.url() }); });
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
const canvas3D = page => page.locator('.acoustic-view-3d canvas').first();
const canvas2D = page => page.locator('canvas.planar-wave-canvas').first();
const thetaControl = page => page.getByRole('checkbox', { name: 'Afficher θ sur le montage', exact: true });
const currentCanvas = async page => await canvas2D(page).isVisible() ? canvas2D(page) : canvas3D(page);
async function pause(page) {
  const control = button(page, 'Mettre en pause');
  if (await control.count()) await control.click();
  await page.waitForTimeout(180);
}
async function play(page) { const control = button(page, 'Démarrer'); if (await control.count()) await control.click(); }
async function waitTime(page, seconds, selector = '.acoustic-view-3d canvas') {
  await page.waitForFunction(({ seconds, selector }) => Number(document.querySelector(selector)?.dataset.physicalTime) >= seconds, { seconds, selector }, { timeout: 60000 });
}
async function until(predicate, label = 'état attendu') {
  const deadline = Date.now() + 15000;
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error(`Délai dépassé : ${label}`);
    await new Promise(resolve => setTimeout(resolve, 80));
  }
}
async function check(name, action) {
  try { const detail = await action(); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`); }
  catch (error) { checks.push({ name, passed: false, error: error.stack || String(error) }); console.error(`FAIL ${name}: ${error.message}`); await pause(page).catch(() => {}); }
}
async function pixelFrame(canvas, downstreamOnly = false) {
  return canvas.evaluate((element, downstreamOnly) => {
    const gl = element.getContext('webgl2') ?? element.getContext('webgl');
    if (!gl) throw new Error('Le montage 3D doit utiliser un véritable contexte WebGL');
    const x = downstreamOnly ? Math.floor(element.width * 0.54) : 0;
    const y = downstreamOnly ? Math.floor(element.height * 0.17) : 0;
    const width = downstreamOnly ? Math.floor(element.width * 0.37) : element.width;
    const height = downstreamOnly ? Math.floor(element.height * 0.55) : element.height;
    const bytes = new Uint8Array(width * height * 4);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    let low = 255, high = 0, hash = 2166136261;
    for (let i = 0; i < bytes.length; i += 4) {
      low = Math.min(low, bytes[i], bytes[i + 1], bytes[i + 2]); high = Math.max(high, bytes[i], bytes[i + 1], bytes[i + 2]);
      hash = Math.imul(hash ^ bytes[i] ^ bytes[i + 1] ^ bytes[i + 2], 16777619);
    }
    return { time: Number(element.dataset.physicalTime), hash: hash >>> 0, low, high, width, height, pixels: downstreamOnly ? Array.from(bytes) : undefined };
  }, downstreamOnly);
}
async function capture(page, filename) {
  await page.mouse.move(0, 0); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(120);
  await page.locator('.simulation-panel').screenshot({ path: path.join(output, filename) });
  captures.push({ filename, viewport: page.viewportSize(), ...(await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, physicalTime: document.querySelector('.acoustic-view canvas')?.dataset.physicalTime, documentWidth: document.documentElement.scrollWidth }))) });
}
async function exportAndCheck(page, filename) {
  const canvas = await currentCanvas(page);
  const request = page.waitForEvent('download');
  // Camera inertia may continue while physics is paused. Freeze the source and
  // trigger the actual export in one browser task, before another frame draws.
  const sourceFrame = await canvas.evaluate(source => {
    const png = source.toDataURL('image/png');
    const capture = document.querySelector('button[aria-label="Capturer l’expérience en PNG"]');
    if (!capture) throw new Error('Commande de capture introuvable');
    capture.click();
    return { png, width: source.width, height: source.height };
  });
  const download = await request;
  const destination = path.join(output, filename); await download.saveAs(destination);
  const encoded = (await readFile(destination)).toString('base64');
  const comparison = await page.evaluate(async ({ sourceFrame, encoded }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const source = await createImageBitmap(await (await fetch(sourceFrame.png)).blob());
    const actual = document.createElement('canvas'); actual.width = 1600; actual.height = 1000;
    const expected = document.createElement('canvas'); expected.width = 1600; expected.height = 1000;
    const a = actual.getContext('2d'), e = expected.getContext('2d');
    a.drawImage(bitmap, 0, 0); bitmap.close();
    e.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#14212c' : '#eef4f8'; e.fillRect(0, 0, 1600, 1000);
    const scale = Math.min(1504 / sourceFrame.width, 730 / sourceFrame.height);
    e.drawImage(source, 48 + (1504 - sourceFrame.width * scale) / 2, 120, sourceFrame.width * scale, sourceFrame.height * scale);
    source.close();
    const left = a.getImageData(48, 120, 1504, 730).data, right = e.getImageData(48, 120, 1504, 730).data;
    let mismatches = 0, total = 0;
    for (let i = 0; i < left.length; i += 4) { total++; if (Math.abs(left[i] - right[i]) + Math.abs(left[i + 1] - right[i + 1]) + Math.abs(left[i + 2] - right[i + 2]) > 8) mismatches++; }
    return { total, mismatches, width: actual.width, height: actual.height };
  }, { sourceFrame, encoded });
  assert.equal(comparison.width, 1600); assert.equal(comparison.height, 1000);
  assert.ok(comparison.mismatches < comparison.total * 0.001, `Le PNG doit reprendre le canvas actuellement visible : ${comparison.mismatches}/${comparison.total} pixels différents`);
  return comparison;
}
const page = await context.newPage(); monitor(page, 'desktop');
try {
  await page.goto(soundURL, { waitUntil: 'networkidle' }); await canvas3D(page).waitFor();
  await check('Le montage sonore ouvre directement une véritable scène 3D avec θ', async () => {
    assert.ok(await page.locator('.app.sound-focused').isVisible());
    assert.equal(await button(page, 'Vue 3D').getAttribute('aria-pressed'), 'true');
    assert.equal(await thetaControl(page).isChecked(), true);
    assert.equal(await page.getByRole('spinbutton', { name: 'Angle θ du montage', exact: true }).inputValue(), '30');
    assert.match(await page.locator('.theta-scene-note').innerText(), /θ = 30°.*observation/s);
    const pixels = await pixelFrame(canvas3D(page)); assert.ok(pixels.high - pixels.low > 60);
    return `WebGL ${pixels.width} × ${pixels.height}, θ = 30° à l’ouverture`;
  });
  await check('Les fronts 3D évoluent réellement derrière la fente', async () => {
    await pause(page); await button(page, 'Recommencer l’expérience').click(); await page.waitForTimeout(200);
    const empty = await pixelFrame(canvas3D(page), true); assert.equal(empty.time, 0);
    await play(page); await waitTime(page, 0.014); await pause(page);
    const transmitted = await pixelFrame(canvas3D(page), true);
    let changed = 0;
    for (let i = 0; i < empty.pixels.length; i += 4) if (Math.abs(empty.pixels[i] - transmitted.pixels[i]) + Math.abs(empty.pixels[i + 1] - transmitted.pixels[i + 1]) + Math.abs(empty.pixels[i + 2] - transmitted.pixels[i + 2]) > 20) changed++;
    assert.ok(changed > 80, `${changed} pixels modifiés dans la région transmise`);
    await capture(page, 'gbf-theta3d-desktop-light.png');
    return `${changed} pixels modifiés en aval, t = ${(transmitted.time * 1000).toFixed(3)} ms`;
  });
  await check('Changer θ modifie le repère dessiné sans changer le champ ni le temps', async () => {
    await pause(page);
    const initial = await pixelFrame(canvas3D(page));
    const angle = page.getByRole('spinbutton', { name: 'Angle θ du montage', exact: true });
    await angle.fill('55'); await angle.press('Tab');
    await until(async () => (await page.locator('.theta-scene-note').innerText()).includes('55°'), 'θ = 55°');
    await until(async () => (await pixelFrame(canvas3D(page))).hash !== initial.hash, 'rayon et arc redessinés');
    const changed = await pixelFrame(canvas3D(page)); assert.equal(changed.time, initial.time);
    const slider = page.getByRole('slider', { name: 'Angle θ du montage', exact: true });
    await slider.evaluate(element => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '-25');
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await until(async () => (await angle.inputValue()) === '-25');
    assert.equal(Number(await canvas3D(page).getAttribute('data-physical-time')), initial.time);
    await angle.fill('30'); await angle.press('Tab'); await page.waitForTimeout(200);
    return 'θ modifié dans les deux sens ; temps et moteur conservés';
  });
  await check('Le bouton θ masque et réaffiche effectivement les traits dans le canvas', async () => {
    await pause(page); const before = await pixelFrame(canvas3D(page));
    await thetaControl(page).uncheck(); await page.waitForTimeout(200);
    const hidden = await pixelFrame(canvas3D(page));
    assert.notEqual(hidden.hash, before.hash); assert.equal(hidden.time, before.time);
    assert.equal(await page.locator('.theta-scene-note').count(), 0);
    await thetaControl(page).check(); await page.waitForTimeout(200);
    const shown = await pixelFrame(canvas3D(page));
    assert.notEqual(shown.hash, hidden.hash); assert.equal(shown.time, before.time);
  });
  await check('Les caméras et la rotation à la souris conservent le même temps physique', async () => {
    await pause(page); const time = Number(await canvas3D(page).getAttribute('data-physical-time'));
    for (const label of ['Dessus', '3D libre', 'Isométrique']) {
      await button(page, label).click(); await page.waitForTimeout(250);
      assert.equal(Number(await canvas3D(page).getAttribute('data-physical-time')), time);
      assert.ok((await pixelFrame(canvas3D(page))).high - (await pixelFrame(canvas3D(page))).low > 60);
      if (label === 'Dessus') await capture(page, 'gbf-theta3d-desktop-top.png');
      if (label === '3D libre') {
        assert.equal(await canvas3D(page).evaluate(element => getComputedStyle(element).touchAction), 'none');
        const before = await pixelFrame(canvas3D(page));
        await canvas3D(page).scrollIntoViewIfNeeded();
        const rect = await canvas3D(page).boundingBox();
        await page.mouse.move(rect.x + rect.width * 0.57, rect.y + rect.height * 0.45);
        await page.mouse.down();
        await page.mouse.move(rect.x + rect.width * 0.67, rect.y + rect.height * 0.53, { steps: 10 });
        await page.mouse.up();
        await until(async () => (await pixelFrame(canvas3D(page))).hash !== before.hash, 'rotation réelle à la souris');
        assert.equal(Number(await canvas3D(page).getAttribute('data-physical-time')), time);
      }
      if (label === 'Isométrique') assert.equal(await canvas3D(page).evaluate(element => getComputedStyle(element).touchAction), 'pan-y');
    }
  });
  await check('La vue 2D et le retour 3D partagent le moteur, le temps et le bon export PNG', async () => {
    await pause(page);
    const time = Number(await canvas3D(page).getAttribute('data-physical-time'));
    const engine = await page.locator('.acoustic-views').getAttribute('data-shared-engine');
    const export3D = await exportAndCheck(page, 'gbf-theta3d-export-3d.png');
    await button(page, 'Vue 2D').click(); await canvas2D(page).waitFor(); await page.waitForTimeout(200);
    assert.equal(Number(await canvas2D(page).getAttribute('data-physical-time')), time);
    assert.equal(await page.locator('.acoustic-views').getAttribute('data-shared-engine'), engine);
    const export2D = await exportAndCheck(page, 'gbf-theta3d-export-2d.png');
    await button(page, 'Vue 3D').click(); await canvas3D(page).waitFor(); await page.waitForTimeout(300);
    assert.equal(Number(await canvas3D(page).getAttribute('data-physical-time')), time);
    assert.equal(await page.locator('.acoustic-views').getAttribute('data-shared-engine'), engine);
    return `Même moteur ${engine} ; exports issus des canvas affichés (${export3D.mismatches} / ${export2D.mismatches} pixels différents)`;
  });
  await check('Le θ du haut-parleur localisé est explicitement une direction d’observation', async () => {
    const note = await page.locator('.theta-scene-note').innerText();
    assert.match(note, /observation/); assert.match(note, /Centre de la fente/);
    assert.match(note, /pas un minimum d’amplitude/);
    assert.doesNotMatch(note, /Minima théoriques|θ₁|amplitude nulle/);
    assert.equal(await page.getByRole('spinbutton', { name: 'Largeur de la fente', exact: true }).inputValue(), '0.17');
  });
  await check('Le cas θ₁ = 30° charge séparément les premiers minima idéaux de Fraunhofer', async () => {
    await button(page, 'Cas θ₁ = 30° (théorie)').click();
    await pause(page); await canvas3D(page).waitFor();
    await until(async () => (await page.locator('.theta-scene-note').innerText()).includes('Minima théoriques'), 'repère théorique de Fraunhofer');
    const note = await page.locator('.theta-scene-note').innerText();
    assert.match(note, /θ₁ = 30°/); assert.match(note, /pas des nœuds mesurés/);
    assert.equal(await page.getByLabel('Source d’onde', { exact: true }).inputValue(), 'plane');
    assert.equal(await page.getByRole('spinbutton', { name: 'Largeur de fente', exact: true }).inputValue(), '0.68');
    await capture(page, 'gbf-theta3d-theoretical-minimum.png');
    await button(page, 'Voir le montage GBF et fente').click(); await pause(page);
    assert.ok(await page.locator('.app.sound-focused').isVisible());
    assert.equal(await button(page, 'Vue 3D').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.theta-scene-note').innerText(), /θ = 30°.*observation/s);
    return 'Source plane et a/λ = 2 pour le minimum ; retour au haut-parleur localisé avec angle d’observation';
  });
  // A paused WebGL scene still draws; close it before emulating another device
  // so software-rendered Chromium does not compete with itself for every frame.
  await page.close();
  for (const dark of [false, true]) {
    await check(`Montage 3D avec θ visible sur mobile, thème ${dark ? 'sombre' : 'clair'}`, async () => {
      const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const mobile = await mobileContext.newPage(); monitor(mobile, dark ? 'mobile-dark' : 'mobile-light');
      try {
        await mobile.goto(soundURL, { waitUntil: 'networkidle' }); await canvas3D(mobile).waitFor();
        if (dark) await button(mobile, 'Activer le mode sombre').click();
        await waitTime(mobile, 0.012); await pause(mobile);
        assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const rect = await canvas3D(mobile).boundingBox(); assert.ok(rect.width > 300 && rect.height > 250);
        assert.equal(await thetaControl(mobile).isChecked(), true);
        assert.ok(await mobile.getByRole('slider', { name: 'Angle θ du montage', exact: true }).isVisible());
        assert.match(await mobile.locator('.theta-scene-note').innerText(), /30°/);
        assert.ok((await pixelFrame(canvas3D(mobile))).high > 100);
        await capture(mobile, `gbf-theta3d-mobile-${dark ? 'dark' : 'light'}.png`);
        // Send a real touch gesture through Chromium rather than merely setting
        // a control value. It must rotate the view while the physics is paused.
        await button(mobile, '3D libre').click();
        await until(async () => (await canvas3D(mobile).evaluate(element => getComputedStyle(element).touchAction)) === 'none', 'rotation tactile activée');
        await canvas3D(mobile).scrollIntoViewIfNeeded();
        const touchRect = await canvas3D(mobile).boundingBox();
        const beforeTouch = await pixelFrame(canvas3D(mobile));
        const cdp = await mobileContext.newCDPSession(mobile);
        const start = { x: touchRect.x + touchRect.width * 0.53, y: touchRect.y + touchRect.height * 0.45 };
        const finger = (x, y) => ({ x, y, id: 1, radiusX: 3, radiusY: 3, force: 1 });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger(start.x, start.y)] });
        for (let step = 1; step <= 8; step++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger(start.x + step * 8, start.y + step * 4)] });
          await mobile.waitForTimeout(30);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await until(async () => (await pixelFrame(canvas3D(mobile))).hash !== beforeTouch.hash, 'rotation réelle par geste tactile');
        assert.equal(Number(await canvas3D(mobile).getAttribute('data-physical-time')), beforeTouch.time);
        await button(mobile, 'Isométrique').click();
        await until(async () => (await canvas3D(mobile).evaluate(element => getComputedStyle(element).touchAction)) === 'pan-y', 'défilement de page rétabli');
        assert.equal(Number(await canvas3D(mobile).getAttribute('data-physical-time')), beforeTouch.time);
        await cdp.detach();
        return 'Geste tactile réel en 3D libre : image modifiée, temps physique conservé ; retour Isométrique rétablit pan-y';
      } finally { await mobileContext.close(); }
    });
  }
  await check('Sans WebGL, le montage et θ restent utilisables en Canvas 2D', async () => {
    const noGL = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await noGL.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      window.__webglAttempts = 0;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') { window.__webglAttempts++; return null; }
        return original.call(this, kind, ...args);
      };
    });
    const fallback = await noGL.newPage(); monitor(fallback, 'no-webgl');
    try {
      await fallback.goto(soundURL, { waitUntil: 'networkidle' }); await canvas2D(fallback).waitFor();
      assert.match(await fallback.locator('.acoustic-webgl-fallback').innerText(), /WebGL indisponible/);
      assert.equal(await thetaControl(fallback).isChecked(), true);
      await waitTime(fallback, 0.01, 'canvas.planar-wave-canvas'); await pause(fallback);
      assert.equal(await canvas2D(fallback).getAttribute('data-illustration'), 'true');
      await capture(fallback, 'gbf-theta3d-no-webgl.png');
      // The explicit 2D URL must not even probe for a WebGL context.
      await fallback.goto(new URL('?medium=sound&view=2d', soundURL).href, { waitUntil: 'networkidle' }); await canvas2D(fallback).waitFor();
      assert.equal(await fallback.evaluate(() => window.__webglAttempts), 0);
      return 'Repli 2D après demande 3D ; URL 2D explicite sans tentative WebGL';
    } finally { await noGL.close(); }
  });
} catch (error) {
  checks.push({ name: 'Initialisation du montage 3D', passed: false, error: error.stack || String(error) });
} finally {
  checks.push({ name: 'Aucune erreur JavaScript, console ou ressource manquante', passed: errors.length === 0, errors });
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify({ baseURL, soundURL, testedAt: new Date().toISOString(), browser: browser.version(), checks, captures, errors }, null, 2) + '\n');
  await context.close().catch(() => {}); await browser.close().catch(() => {});
}
console.log(`${checks.filter(check => check.passed).length}/${checks.length} contrôles GBF 3D + θ réussis`);
if (checks.some(check => !check.passed)) process.exitCode = 1;
