import { DEFAULT_PARAMETERS } from '../types';
import type { Parameters, ValidationResult } from '../types';
import { WaveEngine } from './WaveEngine';

const settings = (patch: Partial<Parameters> = {}): Parameters => ({
  ...DEFAULT_PARAMETERS, medium: 'sound', frequency: 1000, speed: 340, amplitude: 1,
  source: 'plane', sourceEnabled: true, obstacle: 'none', boundary: 'reflecting',
  resolution: 'performance', ...patch,
});
const advanceTo = (engine: WaveEngine, time: number) => engine.step(Math.max(0, Math.ceil((time - engine.time) / engine.grid.dt)));
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const relative = (value: number, expected: number) => Math.abs(value / expected - 1);
function crossings(values: number[], positions: number[]) {
  const result: number[] = [];
  for (let i = 1; i < values.length; i++) if (values[i - 1] <= 0 && values[i] > 0) {
    result.push(positions[i - 1] - values[i - 1] / (values[i] - values[i - 1]) * (positions[i] - positions[i - 1]));
  }
  return result;
}
const spacing = (points: number[]) => points.length > 1 ? average(points.slice(1).map((value, i) => value - points[i])) : NaN;

/** Independent pressure-wave experiments, computed on demand; no prefilled pass flags. */
export function runAcousticValidation(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const check = (metadata: Omit<ValidationResult, 'result' | 'passed'>, evaluate: () => Pick<ValidationResult, 'result' | 'passed' | 'error'>) => {
    try { results.push({ ...metadata, ...evaluate() }); }
    catch (error) { results.push({ ...metadata, passed: false, result: 'Calcul interrompu.', error: String(error) }); }
  };
  check({ id: 'sound-plane', title: 'Son : longueur d’onde et période',
    objective: 'Mesurer λ sur le champ de pression et T dans une trace temporelle.',
    parameters: 'f = 1 000 Hz ; c = 340 m/s ; Δx = 2 cm ; source plane imposée.',
    prediction: 'λ = 0,340 m ; T = 1,000 ms ; vitesse de phase λ/T proche de 340 m/s.',
    limitation: 'Zone centrale avant le retour des bords ; le schéma cartésien est dispersif.' }, () => {
    const engine = new WaveEngine(settings());
    const values: number[] = [], times: number[] = [];
    while (engine.time < 0.006) {
      engine.step();
      if (engine.time > 0.003) { values.push(engine.sampleAt(0.7, 0.8).displacement); times.push(engine.time); }
    }
    const period = spacing(crossings(values, times));
    const line: number[] = [], xs: number[] = [];
    const row = Math.round(0.8 / engine.grid.dy);
    for (let i = Math.ceil(0.6 / engine.grid.dx); i <= Math.floor(1.6 / engine.grid.dx); i++) {
      line.push(engine.field[row * engine.grid.nx + i]); xs.push(i * engine.grid.dx);
    }
    const wavelength = spacing(crossings(line, xs));
    const speed = wavelength / period;
    return { passed: relative(period, 0.001) < 0.02 && relative(wavelength, 0.34) < 0.04 && relative(speed, 340) < 0.05,
      result: `λ mesurée = ${wavelength.toFixed(4)} m ; T = ${(period * 1000).toFixed(4)} ms ; λ/T = ${speed.toFixed(2)} m/s.` };
  });
  check({ id: 'sound-reflection', title: 'Son : réflexion sur une paroi rigide',
    objective: 'Vérifier la pression réfléchie sans inversion de signe et son temps de retour.',
    parameters: 'Impulsion de pression gaussienne vers +x ; paroi fermée x ≈ 1,6 m ; microphone x = 1 m.',
    prediction: 'Coefficient de réflexion en pression ≈ +1 ; retard du retour ≈ 2d/c.',
    limitation: 'Ce trajet connu ne justifie pas une estimation distance/c dans un champ diffracté quelconque.' }, () => {
    const engine = new WaveEngine(settings({ sourceEnabled: false, obstacle: 'slit', aperture: 0, obstacleX: 1.6 }));
    const sigma = 0.09, center = 0.65, c = engine.parameters.speed;
    const gaussian = (x: number) => Math.exp(-0.5 * ((x - center) / sigma) ** 2);
    engine.setInitialCondition(x => gaussian(x), x => c * (x - center) / sigma ** 2 * gaussian(x));
    let incident = 0, reflected = 0, incidentTime = 0, reflectedTime = 0;
    while (engine.time < 0.0062) {
      engine.step();
      const pressure = engine.sampleAt(1, 0.8).displacement;
      if (engine.time < 0.0023 && pressure > incident) { incident = pressure; incidentTime = engine.time; }
      if (engine.time > 0.003 && pressure > reflected) { reflected = pressure; reflectedTime = engine.time; }
    }
    const firstSolid = engine.mask.findIndex((value, index) => value === 1 && index < engine.grid.nx);
    const wallFace = (firstSolid - 0.5) * engine.grid.dx;
    const expectedDelay = 2 * (wallFace - 1) / c;
    const delay = reflectedTime - incidentTime;
    const ratio = reflected / incident;
    return { passed: incident > 0.9 && ratio > 0.88 && ratio < 1.12 && Math.abs(delay - expectedDelay) < 0.00012,
      result: `Pic incident = ${incident.toFixed(3)} Pa ; réfléchi = ${reflected.toFixed(3)} Pa ; rapport = +${ratio.toFixed(3)} ; retour ${(delay * 1000).toFixed(3)} ms (attendu ${(expectedDelay * 1000).toFixed(3)} ms).` };
  });
  check({ id: 'sound-cfl', title: 'Son : stabilité de la discrétisation',
    objective: 'Propager un mode propre libre de pression pendant 800 pas.',
    parameters: 'c = 340 m/s ; domaine 2,8 × 1,6 m ; source inactive ; parois rigides.',
    prediction: 'CFL = 0,8 < 1 ; pression finie et pic ≤ 1,02 Pa.' }, () => {
    const engine = new WaveEngine(settings({ sourceEnabled: false }));
    const { nx, ny, dx, dy, dt } = engine.grid;
    engine.setInitialCondition((x, y) => Math.cos(Math.PI * (x / dx + 0.5) / nx) * Math.cos(2 * Math.PI * (y / dy + 0.5) / ny));
    let peak = 0, finite = true;
    for (let i = 0; i < 80; i++) {
      engine.step(10);
      for (const value of engine.field) { peak = Math.max(peak, Math.abs(value)); finite &&= Number.isFinite(value); }
    }
    const cfl = engine.parameters.speed * dt * Math.sqrt(1 / dx ** 2 + 1 / dy ** 2);
    return { passed: finite && cfl < 1 && peak <= 1.02,
      result: `CFL = ${cfl.toFixed(3)} ; pic = ${peak.toFixed(5)} Pa ; valeurs finies : ${finite ? 'oui' : 'non'}.` };
  });
  check({ id: 'sound-rms', title: 'Son : pression efficace et amplitude',
    objective: 'Mesurer le signal prescrit après la rampe, sur quatre périodes complètes.',
    parameters: 'A₀ = 2 Pa ; f = 1 000 Hz ; 128 instants interpolés sur 4 ms.',
    prediction: 'Amplitude ≈ 2 Pa ; pression efficace ≈ √2 Pa ; indicateur relatif ≈ 1.',
    limitation: 'Ce contrôle porte sur la source imposée. pᵣₘₛ² n’est pas une intensité en W/m².' }, () => {
    const engine = new WaveEngine(settings({ amplitude: 2, phase: 35 }));
    advanceTo(engine, 0.009);
    const probe = engine.sampleAt(engine.parameters.sourceX, 0.8);
    const rms = probe.rms ?? NaN;
    return { passed: engine.measurementReady && relative(probe.amplitude, 2) < 0.025 && relative(rms, Math.SQRT2) < 0.025 && relative(probe.intensity, 1) < 0.05,
      result: `Amplitude = ${probe.amplitude.toFixed(4)} Pa ; pᵣₘₛ = ${rms.toFixed(4)} Pa ; indicateur relatif = ${probe.intensity.toFixed(4)}.` };
  });
  return results;
}
