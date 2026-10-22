import { describe, expect, it } from 'vitest';
import { SOUND_MONTAGE } from '../src/data/media';
import type { Parameters } from '../src/types';
import { WaveEngine } from '../src/physics/WaveEngine';

// Same point-like 2D loudspeaker and aperture as the initial GBF observation.
// The generator controls the existing source; there is no second source at the slit.
const montage = (patch: Partial<Parameters> = {}): Parameters => ({
  ...SOUND_MONTAGE, resolution: 'performance', ...patch,
});
const advance = (engine: WaveEngine, seconds: number) => engine.step(Math.ceil(seconds / engine.grid.dt));
const squareNorm = (engine: WaveEngine) => engine.field.reduce((sum, pressure) => sum + pressure * pressure, 0);

describe('montage GBF, haut-parleur et fente : phénomène calculé', () => {
  it('attend la propagation puis transmet de la pression après la fente', () => {
    const engine = new WaveEngine(montage());
    advance(engine, 0.0015);
    expect(engine.sampleAt(1.95, 0.8).displacement).toBe(0);
    advance(engine, 0.014);
    expect(engine.measurementReady).toBe(true);
    expect(engine.sampleAt(1.95, 0.8).rms).toBeGreaterThan(0.0001);
    expect(engine.field.every(Number.isFinite)).toBe(true);
    expect(engine.parameters.speed * engine.grid.dt * Math.hypot(1 / engine.grid.dx, 1 / engine.grid.dy)).toBeCloseTo(0.8, 12);
  });

  it('transmet hors axe par l’ouverture et ne génère rien derrière une paroi fermée', () => {
    const open = new WaveEngine(montage());
    const closed = new WaveEngine(montage({ aperture: 0 }));
    advance(open, 0.016); advance(closed, 0.016);
    for (const point of [{ x: 1.95, y: 0.8 }, { x: 1.95, y: 0.35 }, { x: 1.95, y: 1.25 }]) {
      const transmitted = open.sampleAt(point.x, point.y).rms ?? 0;
      expect(transmitted).toBeGreaterThan(0.0001);
      expect(closed.sampleAt(point.x, point.y).rms).toBe(0);
    }
    // A local zero-amplitude drawing at the slit cannot pass this check:
    // every solid cell remains at zero and all downstream pressure comes from the solver.
    for (let k = 0; k < open.mask.length; k++) if (open.mask[k]) expect(open.field[k]).toBe(0);
  });

  it('éteindre le GBF laisse les ondes déjà émises se propager et s’amortir', () => {
    const engine = new WaveEngine(montage());
    advance(engine, 0.016);
    const field = engine.field.slice(), time = engine.time, initialNorm = squareNorm(engine);
    expect(initialNorm).toBeGreaterThan(0);
    engine.updateParameters({ sourceEnabled: false });
    expect(engine.time).toBe(time);
    expect(engine.field).toEqual(field);
    engine.step();
    expect(squareNorm(engine)).toBeGreaterThan(0);
    advance(engine, 0.05);
    expect(engine.field.every(Number.isFinite)).toBe(true);
    // This is a numerical L2 norm, not an acoustic intensity or energy in SI units.
    expect(squareNorm(engine)).toBeLessThan(initialNorm * 0.2);
  });
});
