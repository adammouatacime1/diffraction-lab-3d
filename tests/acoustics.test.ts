import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMETERS } from '../src/types';
import type { ObstacleKind, Parameters } from '../src/types';
import { WaveEngine } from '../src/physics/WaveEngine';
import { runAcousticValidation } from '../src/physics/acousticValidation';

const sound = (patch: Partial<Parameters> = {}): Parameters => ({
  ...DEFAULT_PARAMETERS, medium: 'sound', frequency: 1000, speed: 340, amplitude: 1,
  obstacle: 'none', resolution: 'performance', boundary: 'reflecting', ...patch,
});
const advance = (engine: WaveEngine, seconds: number) => engine.step(Math.ceil(seconds / engine.grid.dt));

describe('pression acoustique : validation quantitative', () => {
  it('mesure propagation, réflexion rigide, stabilité et vraie pression efficace', () => {
    const results = runAcousticValidation();
    expect(results).toHaveLength(4);
    for (const result of results) expect(result.passed, `${result.title} : ${result.result}`).toBe(true);
  }, 30_000);

  it('attend quatre périodes puis sépare p′ instantanée, amplitude et RMS', () => {
    const engine = new WaveEngine(sound({ amplitude: 2 }));
    advance(engine, 0.003);
    expect(engine.measurementReady).toBe(false);
    expect(engine.measurementWindowPeriods).toBe(4);
    expect(engine.measurementWindowDuration).toBeCloseTo(0.004, 12);
    advance(engine, 0.006);
    let probe = engine.sampleAt(engine.parameters.sourceX, engine.parameters.sourceY);
    for (let i = 0; i < Math.ceil(1 / engine.parameters.frequency / engine.grid.dt); i++) {
      engine.step();
      const candidate = engine.sampleAt(engine.parameters.sourceX, engine.parameters.sourceY);
      if (Math.abs(candidate.displacement) < Math.abs(probe.displacement)) probe = candidate;
    }
    expect(engine.measurementReady).toBe(true);
    expect(probe.amplitude).toBeCloseTo(2, 1);
    expect(probe.rms).toBeCloseTo(Math.SQRT2, 1);
    // The imposed sinusoid is near a zero crossing while its RMS remains non-zero.
    expect(Math.abs(probe.displacement)).toBeLessThan(0.5);
    expect(probe.rms).toBeGreaterThan(1.3);
    const before = engine.field.slice(); const time = engine.time;
    engine.resetMeasurements();
    expect(engine.time).toBe(time);
    expect(engine.field).toEqual(before);
    expect(engine.measurementReady).toBe(false);
    expect(engine.rms.every(value => value === 0)).toBe(true);
  });

  it('calcule la vraie RMS des échantillons et pas amplitude harmonique divisée par √2', () => {
    const engine = new WaveEngine(sound({ sourceEnabled: false }));
    engine.setInitialCondition(() => 1);
    advance(engine, 0.005);
    const probe = engine.sampleAt(1.4, 0.8);
    expect(engine.measurementReady).toBe(true);
    expect(probe.rms).toBeCloseTo(1, 6);
    expect(probe.amplitude).toBeLessThan(1e-5);
    expect(probe.intensity).toBeCloseTo(2, 6);
  });

  it('repart du repos en changeant de milieu, avec une fenêtre adaptée', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS, resolution: 'performance' });
    engine.step(30);
    engine.updateParameters(sound());
    expect(engine.time).toBe(0);
    expect(engine.field.every(value => value === 0)).toBe(true);
    expect(engine.measurementWindowPeriods).toBe(4);
    engine.step(30);
    engine.updateParameters({ ...DEFAULT_PARAMETERS, resolution: 'performance' });
    expect(engine.time).toBe(0);
    expect(engine.measurementWindowPeriods).toBe(1);
    expect(engine.rms.every(value => value === 0)).toBe(true);
  });

  it('conserve la vitesse du paquet et n’ajoute aucune décroissance 1/r', () => {
    const engine = new WaveEngine(sound({ sourceEnabled: false }));
    const center = 0.45, sigma = 0.09, c = engine.parameters.speed;
    const gaussian = (x: number) => Math.exp(-0.5 * ((x - center) / sigma) ** 2);
    engine.setInitialCondition(x => gaussian(x), x => c * (x - center) / sigma ** 2 * gaussian(x));
    advance(engine, 0.002);
    const row = Math.round(0.8 / engine.grid.dy);
    let maximum = 0, peakX = 0;
    for (let i = 0; i < engine.grid.nx; i++) {
      const value = engine.field[row * engine.grid.nx + i];
      if (value > maximum) { maximum = value; peakX = i * engine.grid.dx; }
    }
    expect(Math.abs(peakX - center - c * engine.time)).toBeLessThan(0.04);
    expect(maximum).toBeGreaterThan(0.95);
  });

  it('garde un CFL stable sur les trois maillages et signale les ondes sous-résolues', () => {
    for (const resolution of ['performance', 'balanced', 'precision'] as const) {
      const engine = new WaveEngine(sound({ resolution, speed: 300, frequency: 1250, sourceEnabled: false }));
      const { dt, dx, dy } = engine.grid;
      expect(engine.parameters.speed * dt * Math.sqrt(dx ** -2 + dy ** -2)).toBeCloseTo(0.8, 12);
      const { nx, ny } = engine.grid;
      // A resolved high spatial frequency eigenmode; no continuously driven cavity.
      engine.setInitialCondition((x, y) => Math.cos(23 * Math.PI * (x / dx + 0.5) / nx) * Math.cos(2 * Math.PI * (y / dy + 0.5) / ny));
      engine.step(450);
      expect(engine.field.every(Number.isFinite)).toBe(true);
      expect(Math.max(...engine.field)).toBeLessThan(1.02);
    }
    const underResolved = new WaveEngine(sound({ frequency: 4000, aperture: 0.04, obstacle: 'slit' }));
    expect(underResolved.warnings.some(message => message.includes('Longueur d’onde peu résolue'))).toBe(true);
    expect(underResolved.warnings.some(message => message.includes('Ouverture peu résolue'))).toBe(true);
    expect(underResolved.warnings.some(message => message.includes('aucune PML'))).toBe(false);
    underResolved.updateParameters({ boundary: 'absorbing' });
    expect(underResolved.warnings.some(message => message.includes('sponge') && message.includes('aucune PML'))).toBe(true);
  }, 30_000);
});

describe('géométries et interférences acoustiques calculées', () => {
  const geometry: ObstacleKind[] = ['none', 'slit', 'double', 'circle', 'rectangle', 'edge'];
  const pulse = (obstacle: ObstacleKind) => {
    const engine = new WaveEngine(sound({ sourceEnabled: false, obstacle, obstacleX: 1.35,
      aperture: 0.2, separation: 0.5, obstacleWidth: 0.35, obstacleHeight: 0.6 }));
    const sigma = 0.08, center = 0.45, c = engine.parameters.speed;
    const gaussian = (x: number) => Math.exp(-0.5 * ((x - center) / sigma) ** 2);
    engine.setInitialCondition(x => gaussian(x), x => c * (x - center) / sigma ** 2 * gaussian(x));
    advance(engine, 0.004);
    return engine;
  };
  it.each(geometry)('%s : masque réellement couplé au champ', obstacle => {
    const reference = pulse('none'); const engine = pulse(obstacle);
    let difference = 0, norm = 0, solids = 0;
    for (let k = 0; k < engine.field.length; k++) {
      difference += (reference.field[k] - engine.field[k]) ** 2;
      norm += reference.field[k] ** 2;
      expect(Number.isFinite(engine.field[k])).toBe(true);
      if (engine.mask[k]) { solids++; expect(engine.field[k]).toBe(0); }
    }
    if (obstacle === 'none') { expect(solids).toBe(0); expect(difference).toBe(0); }
    else { expect(solids).toBeGreaterThan(0); expect(Math.sqrt(difference / norm)).toBeGreaterThan(0.1); }
  }, 30_000);

  it('fermer complètement la fente bloque la transmission et une ouverture laisse diffracter', () => {
    const closed = new WaveEngine(sound({ obstacle: 'slit', aperture: 0, obstacleX: 1.1, boundary: 'absorbing' }));
    const open = new WaveEngine(sound({ obstacle: 'slit', aperture: 0.2, obstacleX: 1.1, boundary: 'absorbing' }));
    advance(closed, 0.012); advance(open, 0.012);
    const transmitted = open.sampleAt(1.6, 1.05).rms ?? 0;
    const blocked = closed.sampleAt(1.6, 1.05).rms ?? 0;
    expect(open.measurementReady).toBe(true);
    expect(transmitted).toBeGreaterThan(0.02);
    expect(blocked).toBeLessThan(transmitted * 0.001);
  });

  it('deux sources cohérentes peuvent interférer destructivement sur leur médiatrice', () => {
    const coherent = new WaveEngine(sound({ source: 'pair', sourceSeparation: 0.4, phase: 0 }));
    const opposite = new WaveEngine(sound({ source: 'pair', sourceSeparation: 0.4, phase: 180 }));
    advance(coherent, 0.012); advance(opposite, 0.012);
    const constructive = coherent.sampleAt(1.5, 0.8).rms ?? 0;
    const destructive = opposite.sampleAt(1.5, 0.8).rms ?? 0;
    const side = opposite.sampleAt(1.5, 1.05).rms ?? 0;
    expect(constructive).toBeGreaterThan(0.02);
    expect(destructive).toBeLessThan(constructive * 1e-4);
    expect(side).toBeGreaterThan(0.005);
  });

  it('la couche dissipative diminue les retours sans être une PML', () => {
    const create = (boundary: Parameters['boundary']) => {
      const engine = new WaveEngine(sound({ sourceEnabled: false, boundary }));
      engine.setInitialCondition((x, y) => Math.exp(-((x - 1.4) ** 2 + (y - 0.8) ** 2) / 0.015));
      advance(engine, 0.02);
      return engine.field.reduce((sum, pressure) => sum + pressure ** 2, 0);
    };
    const damped = create('absorbing'), reflecting = create('reflecting');
    expect(damped).toBeLessThan(reflecting * 0.1);
  });
});
