import { DEFAULT_PARAMETERS } from '../types';
import type { Parameters, ValidationResult } from '../types';
import { WaveEngine } from './WaveEngine';

const base = (overrides: Partial<Parameters> = {}): Parameters => ({ ...DEFAULT_PARAMETERS,
  resolution: 'performance', obstacle: 'none', boundary: 'reflecting', ...overrides });
const advanceTo = (engine: WaveEngine, time: number) => engine.step(Math.ceil((time - engine.time) / engine.grid.dt));
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
const relative = (measured: number, predicted: number) => Math.abs(measured / predicted - 1);
const percent = (value: number) => `${(value * 100).toFixed(2)} %`;

function risingCrossings(values: number[], coordinates: number[]) {
  const crossings: number[] = [];
  for (let k = 1; k < values.length; k++) if (values[k - 1] <= 0 && values[k] > 0) {
    const fraction = -values[k - 1] / (values[k] - values[k - 1]);
    crossings.push(coordinates[k - 1] + fraction * (coordinates[k] - coordinates[k - 1]));
  }
  return crossings;
}
const meanSpacing = (crossings: number[]) => mean(crossings.slice(1).map((value, k) => value - crossings[k]));

/** These checks run independent numerical experiments; none of the displayed results are canned. */
export function runValidation(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const check = (metadata: Omit<ValidationResult, 'result' | 'passed'>, evaluate: () => Pick<ValidationResult, 'result' | 'passed' | 'error'>) => {
    try { results.push({ ...metadata, ...evaluate() }); }
    catch (error) { results.push({ ...metadata, passed: false, result: 'Calcul interrompu.', error: String(error) }); }
  };

  check({ id: 'plane', title: 'Onde plane : λ et T', objective: 'Mesurer les espacements sur le champ et sur une trace temporelle.',
    parameters: 'f = 10 Hz ; c = 2 m/s ; Δx = 0,02 m ; parois réfléchissantes.',
    prediction: 'λ = c/f = 0,200 m ; T = 1/f = 0,100 s.' }, () => {
    const engine = new WaveEngine(base());
    const trace: number[] = [], times: number[] = [];
    while (engine.time < 0.9) {
      engine.step();
      if (engine.time > 0.35) { trace.push(engine.sampleAt(0.7, 0.8).displacement); times.push(engine.time); }
    }
    const period = meanSpacing(risingCrossings(trace, times));
    const line: number[] = [], xs: number[] = [];
    const j = Math.round(0.8 / engine.grid.dy);
    for (let i = Math.ceil(0.6 / engine.grid.dx); i <= Math.floor(1.6 / engine.grid.dx); i++) {
      line.push(engine.field[j * engine.grid.nx + i]); xs.push(i * engine.grid.dx);
    }
    const wavelength = meanSpacing(risingCrossings(line, xs));
    return { passed: relative(period, 0.1) < 0.02 && relative(wavelength, 0.2) < 0.05,
      result: `λ mesurée = ${wavelength.toFixed(4)} m ; T mesurée = ${period.toFixed(4)} s.`,
      error: `Écarts : λ ${percent(relative(wavelength, 0.2))} ; T ${percent(relative(period, 0.1))}.` };
  });

  check({ id: 'circular', title: 'Symétrie et circularité d’une source ponctuelle', objective: 'Comparer les axes de symétrie puis 36 amplitudes sur un cercle de rayon 0,30 m.',
    parameters: 'Source centrale (1,4 ; 0,8) m ; f = 10 Hz ; t ≈ 0,32 s.',
    prediction: 'Écart de symétrie L₂ < 0,01 % ; variations angulaires RMS : amplitude < 6 %, phase < 0,22 rad.',
    limitation: 'Les sondes utilisent le nœud le plus proche ; le réseau cartésien est légèrement anisotrope et dispersif.' }, () => {
    const engine = new WaveEngine(base({ source: 'point', sourceX: 1.4, sourceY: 0.8 }));
    advanceTo(engine, 0.32);
    const { nx, ny } = engine.grid;
    let error2 = 0, norm2 = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const value = engine.field[j * nx + i];
      error2 += (value - engine.field[j * nx + nx - 1 - i]) ** 2 + (value - engine.field[(ny - 1 - j) * nx + i]) ** 2;
      norm2 += 2 * value * value;
    }
    const error = Math.sqrt(error2 / Math.max(norm2, 1e-30));
    const circle = Array.from({ length: 36 }, (_, k) => engine.sampleAt(1.4 + 0.3 * Math.cos(k * 2 * Math.PI / 36), 0.8 + 0.3 * Math.sin(k * 2 * Math.PI / 36)));
    const average = mean(circle.map(probe => probe.amplitude));
    const angularVariation = Math.sqrt(mean(circle.map(probe => (probe.amplitude - average) ** 2))) / average;
    const meanPhase = Math.atan2(mean(circle.map(probe => Math.sin(probe.phase ?? NaN))), mean(circle.map(probe => Math.cos(probe.phase ?? NaN))));
    const phaseVariation = Math.sqrt(mean(circle.map(probe => Math.atan2(Math.sin((probe.phase ?? NaN) - meanPhase), Math.cos((probe.phase ?? NaN) - meanPhase)) ** 2)));
    return { passed: error < 1e-4 && norm2 > 1e-12 && angularVariation < 0.06 && phaseVariation < 0.22,
      result: `Écart de symétrie L₂ : ${percent(error)} ; variations sur le cercle : amplitude ${percent(angularVariation)}, phase ${phaseVariation.toFixed(3)} rad (RMS).` };
  });

  check({ id: 'stability', title: 'Stabilité et condition CFL', objective: 'Faire évoluer un mode libre sans forçage pendant 500 pas.',
    parameters: 'Source inactive ; mode propre discret ; parois Neumann ; 500 pas.',
    prediction: 'CFL = 0,8 < 1 ; aucune croissance de l’amplitude maximale (> 2 %).' }, () => {
    const engine = new WaveEngine(base({ sourceEnabled: false }));
    const { nx, ny, dx, dy, dt } = engine.grid;
    engine.setInitialCondition((x, y) => 0.004 * Math.cos(Math.PI * (x / dx + 0.5) / nx) * Math.cos(2 * Math.PI * (y / dy + 0.5) / ny));
    let maximum = 0, finite = true;
    for (let chunk = 0; chunk < 50; chunk++) {
      engine.step(10);
      for (const value of engine.field) { maximum = Math.max(maximum, Math.abs(value)); finite &&= Number.isFinite(value); }
    }
    const cfl = engine.parameters.speed * dt * Math.sqrt(1 / dx ** 2 + 1 / dy ** 2);
    return { passed: finite && cfl < 1 && maximum < 0.004 * 1.02,
      result: `CFL calculée = ${cfl.toFixed(3)} ; maximum observé = ${(maximum * 1000).toFixed(3)} mm ; valeurs finies : ${finite ? 'oui' : 'non'}.` };
  });

  check({ id: 'reflection', title: 'Réflexion sur une paroi Neumann', objective: 'Mesurer le signe, l’amplitude et le délai de retour d’une impulsion.',
    parameters: 'Impulsion gaussienne droite ; c = 2 m/s ; paroi x ≈ 1,6 m ; sonde x = 1 m.',
    prediction: 'Réflexion sans inversion ; délai = 2d/c ; amplitude réfléchie proche de l’incidente.',
    limitation: 'Impulsion de largeur finie et dispersion du réseau : tolérance de 12 % sur le pic.' }, () => {
    const engine = new WaveEngine(base({ sourceEnabled: false, obstacle: 'slit', aperture: 0, obstacleX: 1.6 }));
    const sigma = 0.09, center = 0.65, amplitude = 0.004, c = engine.parameters.speed;
    const gaussian = (x: number) => amplitude * Math.exp(-0.5 * ((x - center) / sigma) ** 2);
    engine.setInitialCondition(x => gaussian(x), x => c * (x - center) / sigma ** 2 * gaussian(x));
    let incident = 0, reflected = 0, incidentTime = 0, reflectedTime = 0;
    while (engine.time < 1.05) {
      engine.step();
      const value = engine.sampleAt(1, 0.8).displacement;
      if (engine.time < 0.4 && value > incident) { incident = value; incidentTime = engine.time; }
      if (engine.time > 0.5 && value > reflected) { reflected = value; reflectedTime = engine.time; }
    }
    const firstSolid = engine.mask.findIndex((value, index) => value === 1 && index < engine.grid.nx);
    const wall = firstSolid * engine.grid.dx - engine.grid.dx / 2;
    const expectedDelay = 2 * (wall - 1) / c;
    const delay = reflectedTime - incidentTime;
    const ratio = reflected / incident;
    return { passed: ratio > 0.88 && ratio < 1.12 && Math.abs(delay - expectedDelay) < 0.04,
      result: `Rapport des pics = ${ratio.toFixed(3)} (même signe) ; délai = ${delay.toFixed(3)} s ; attendu = ${expectedDelay.toFixed(3)} s.` };
  });

  check({ id: 'diffraction', title: 'Diffraction et influence de la largeur', objective: 'Comparer le mur fermé et deux fentes, puis mesurer la demi-largeur de leurs profils normalisés.',
    parameters: 'λ = 0,20 m ; a = 0,20 et 0,60 m ; mur x = 1,10 m ; profils à x = 1,80 m.',
    prediction: 'La petite fente étale davantage le signal ; un signal entre dans l’ombre ; le mur fermé bloque la transmission.',
    limitation: 'Angle effectif à A/Aaxe = 0,5, en champ proche ; ce n’est ni le premier minimum ni un contrôle strict de Fraunhofer.' }, () => {
    const open = new WaveEngine(base({ obstacle: 'slit', obstacleX: 1.1, aperture: 0.2, boundary: 'absorbing' }));
    const closed = new WaveEngine(base({ obstacle: 'slit', obstacleX: 1.1, aperture: 0, boundary: 'absorbing' }));
    const wide = new WaveEngine(base({ obstacle: 'slit', obstacleX: 1.1, aperture: 0.6, boundary: 'absorbing' }));
    advanceTo(open, 1.05); advanceTo(closed, 1.05); advanceTo(wide, 1.05);
    const axis = open.sampleAt(1.5, 0.8).amplitude;
    const shadow = open.sampleAt(1.5, 1.02).amplitude;
    const blocked = closed.sampleAt(1.5, 1.02).amplitude;
    const halfWidth = (engine: WaveEngine) => {
      const center = engine.sampleAt(1.8, 0.8).amplitude;
      let previousRatio = 1;
      for (let offset = engine.grid.dy; offset <= 0.56; offset += engine.grid.dy) {
        const ratio = engine.sampleAt(1.8, 0.8 + offset).amplitude / center;
        if (ratio <= 0.5) return offset - engine.grid.dy + engine.grid.dy * (previousRatio - 0.5) / (previousRatio - ratio);
        previousRatio = ratio;
      }
      return NaN;
    };
    const smallAngle = Math.atan(halfWidth(open) / 0.7) * 180 / Math.PI;
    const wideAngle = Math.atan(halfWidth(wide) / 0.7) * 180 / Math.PI;
    return { passed: axis > 0.05 * open.parameters.amplitude && shadow > 0.05 * axis && blocked < shadow * 0.01 && smallAngle > 1.15 * wideAngle,
      result: `Ombre = ${(shadow * 1000).toFixed(3)} mm ; mur fermé = ${(blocked * 1000).toFixed(6)} mm. Angle effectif : a=0,20 m → ${smallAngle.toFixed(1)}° ; a=0,60 m → ${wideAngle.toFixed(1)}°.` };
  });

  check({ id: 'superposition', title: 'Superposition de deux champs libres', objective: 'Propager A, B et A+B indépendamment, puis comparer les champs calculés.',
    parameters: 'Trois solveurs ; sources inactives ; deux impulsions ; mêmes parois et pas ; 150 pas.',
    prediction: 'η(A+B) = η(A) + η(B), à l’arrondi Float32 près ; écart L₂ relatif < 0,02 %.' }, () => {
    const a = new WaveEngine(base({ sourceEnabled: false, boundary: 'absorbing' }));
    const b = new WaveEngine(base({ sourceEnabled: false, boundary: 'absorbing' }));
    const sum = new WaveEngine(base({ sourceEnabled: false, boundary: 'absorbing' }));
    const ga = (x: number, y: number) => 0.004 * Math.exp(-((x - 0.9) ** 2 + (y - 0.6) ** 2) / 0.025);
    const gb = (x: number, y: number) => -0.003 * Math.exp(-((x - 1.8) ** 2 + (y - 1) ** 2) / 0.04);
    a.setInitialCondition(ga); b.setInitialCondition(gb); sum.setInitialCondition((x, y) => ga(x, y) + gb(x, y));
    a.step(150); b.step(150); sum.step(150);
    let error2 = 0, norm2 = 0;
    for (let k = 0; k < sum.field.length; k++) {
      const predicted = a.field[k] + b.field[k];
      error2 += (sum.field[k] - predicted) ** 2; norm2 += predicted ** 2;
    }
    const error = Math.sqrt(error2 / Math.max(norm2, 1e-30));
    return { passed: error < 2e-4, result: `Écart L₂ relatif = ${percent(error)}.` };
  });

  check({ id: 'probe', title: 'Sonde : amplitude et phase harmoniques', objective: 'Vérifier la mesure de la source calculée, après sa rampe de démarrage.',
    parameters: 'A = 4 mm ; f = 10 Hz ; phase = 35° ; mesure sur une période, 32 instants interpolés.',
    prediction: 'Amplitude ≈ 4 mm ; phase ≈ 0,611 rad ; intensité relative ≈ 1.',
    limitation: 'L’interpolation temporelle atténue légèrement la mesure ; ce contrôle vérifie l’estimateur à la source.' }, () => {
    const engine = new WaveEngine(base({ phase: 35 }));
    advanceTo(engine, 0.4);
    const probe = engine.sampleAt(engine.parameters.sourceX, 0.8);
    const expectedPhase = 35 * Math.PI / 180;
    const phaseError = probe.phase === null ? Infinity : Math.abs(Math.atan2(Math.sin(probe.phase - expectedPhase), Math.cos(probe.phase - expectedPhase)));
    return { passed: engine.measurementReady && relative(probe.amplitude, 0.004) < 0.025 && phaseError < 0.025 && relative(probe.intensity, 1) < 0.05,
      result: `A = ${(probe.amplitude * 1000).toFixed(3)} mm ; φ = ${probe.phase?.toFixed(3) ?? 'indisponible'} rad ; Iᵣ = ${probe.intensity.toFixed(3)}.`,
      error: `Écart amplitude : ${percent(relative(probe.amplitude, 0.004))} ; écart phase : ${phaseError.toFixed(4)} rad.` };
  });
  return results;
}
