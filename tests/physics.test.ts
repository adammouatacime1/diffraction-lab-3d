import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMETERS } from '../src/types';
import { WaveEngine } from '../src/physics/WaveEngine';
import { runValidation } from '../src/physics/validation';

describe('contrat physique du solveur', () => {
  it('respecte CFL, conserve le temps au changement de source et réinitialise explicitement la grille', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS, resolution: 'performance' });
    const { dx, dy, dt } = engine.grid;
    expect(engine.parameters.speed * dt * Math.sqrt(1 / dx ** 2 + 1 / dy ** 2)).toBeCloseTo(0.8, 12);
    engine.step(20);
    const time = engine.time;
    const field = engine.field.slice();
    engine.updateParameters({ frequency: 12 });
    expect(engine.time).toBe(time);
    expect(engine.field).toEqual(field);
    expect(engine.measurementReady).toBe(false);
    engine.updateParameters({ resolution: 'precision' });
    expect(engine.grid.nx).toBe(281);
    expect(engine.time).toBe(0);
    expect(engine.field.every(value => value === 0)).toBe(true);
  });

  it('ne confond pas un passage par zéro avec une amplitude nulle', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS, obstacle: 'none', boundary: 'reflecting', resolution: 'precision' });
    expect(engine.sampleAt(0.28, 0.8).phase).toBeNull();
    engine.step(Math.round(0.4 / engine.grid.dt));
    const reading = engine.sampleAt(0.28, 0.8);
    expect(engine.measurementReady).toBe(true);
    expect(Math.abs(reading.displacement)).toBeLessThan(0.1 * engine.parameters.amplitude);
    expect(reading.amplitude).toBeGreaterThan(0.98 * engine.parameters.amplitude);
    expect(reading.intensity).toBeGreaterThan(0.96);
  });

  it('reconstruit les obstacles et avertit si une ouverture ou une onde est mal résolue', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS, resolution: 'performance', aperture: 0.04, frequency: 25 });
    expect(engine.warnings.some(text => text.includes('Ouverture peu résolue'))).toBe(true);
    expect(engine.warnings.some(text => text.includes('Longueur d’onde peu résolue'))).toBe(true);
    expect(engine.sampleAt(DEFAULT_PARAMETERS.obstacleX, 0.4).solid).toBe(true);
    expect(engine.sampleAt(DEFAULT_PARAMETERS.obstacleX, 0.8).solid).toBe(false);
    engine.updateParameters({ obstacle: 'none' });
    expect(engine.mask.every(value => value === 0)).toBe(true);
  });

  it('refuse les valeurs non physiques sans corrompre un solveur existant', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS, resolution: 'performance' });
    expect(() => engine.updateParameters({ frequency: 0 })).toThrow(RangeError);
    expect(engine.parameters.frequency).toBe(DEFAULT_PARAMETERS.frequency);
    expect(() => engine.updateParameters({ speed: NaN })).toThrow(RangeError);
  });
});

describe('banc de validation numérique quantitatif', () => {
  it('calcule et réussit les sept expériences indépendantes', () => {
    const results = runValidation();
    expect(results).toHaveLength(7);
    for (const result of results) expect(result.passed, `${result.title} : ${result.result} ${result.error ?? ''}`).toBe(true);
  }, 30_000);
});
