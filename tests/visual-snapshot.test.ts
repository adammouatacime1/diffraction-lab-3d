import { describe, expect, it } from 'vitest';
import { WaveEngine } from '../src/physics/WaveEngine';
import { getVisualSnapshot, linkVisualEngines } from '../src/physics/visualSnapshot';
import { DEFAULT_PARAMETERS } from '../src/types';

const sound = () => new WaveEngine({ ...DEFAULT_PARAMETERS, medium: 'sound', frequency: 1000,
  speed: 340, amplitude: 1, obstacle: 'none', sourceEnabled: false, resolution: 'performance' });

describe('visualisation acoustique : un champ figé par frame navigateur', () => {
  it('conserve exactement le même champ et temps si le solveur avance entre les deux vues', () => {
    const engine = sound();
    engine.setInitialCondition((x, y) => Math.exp(-((x - 1.2) ** 2 + (y - 0.8) ** 2) / 0.02));
    const plane = getVisualSnapshot(engine, 100);
    const initial = plane.field.slice(), initialTime = plane.time;
    engine.step(9); // The physics RAF runs between Canvas 2D and the R3F callback.
    const relief = getVisualSnapshot(engine, 100);
    expect(engine.time).toBeGreaterThan(initialTime);
    expect(relief).toBe(plane);
    expect(relief.time).toBe(initialTime);
    expect(relief.field).not.toBe(engine.field);
    expect([...relief.field]).toEqual([...initial]);
    expect([...engine.field]).not.toEqual([...initial]);
    const reusedBuffer = plane.field;
    const nextFrame = getVisualSnapshot(engine, 116.67);
    expect(nextFrame.field).toBe(reusedBuffer);
    expect(nextFrame.time).toBe(engine.time);
    expect([...nextFrame.field]).toEqual([...engine.field]);
  });

  it('fige aussi amplitudes, phase, RMS, masque et paramètres pour les surcouches', () => {
    const engine = sound();
    engine.field.fill(0.3); engine.amplitude.fill(0.4); engine.rms.fill(0.2);
    engine.intensity.fill(0.16); engine.phase.fill(0.7); engine.measurementReady = true;
    const plane = getVisualSnapshot(engine, 200), reading = plane.sampleAt(1, 0.8);
    engine.field.fill(9); engine.amplitude.fill(9); engine.rms.fill(9);
    engine.intensity.fill(9); engine.phase.fill(9); engine.mask.fill(1);
    engine.parameters.amplitude = 9;
    const relief = getVisualSnapshot(engine, 200);
    expect(relief.sampleAt(1, 0.8)).toEqual(reading);
    expect(relief.parameters.amplitude).toBe(1);
    expect(relief.measurementReady).toBe(true);
    expect(relief.mask).not.toBe(engine.mask);
    expect(relief.rms).not.toBe(engine.rms);
    const next = getVisualSnapshot(engine, 216.67);
    expect(next.sampleAt(1, 0.8).solid).toBe(true);
    expect(next.parameters.amplitude).toBe(9);
    expect(next.sampleAt(1, 0.8).rms).toBe(9);
  });

  it('réalloue seulement lorsque la taille du maillage change et reprend les réinitialisations', () => {
    const engine = sound();
    const first = getVisualSnapshot(engine, 300), oldBuffer = first.field;
    engine.updateParameters({ resolution: 'precision' });
    const resized = getVisualSnapshot(engine, 316.67);
    expect(resized.field).not.toBe(oldBuffer);
    expect(resized.field.length).toBe(engine.grid.nx * engine.grid.ny);
    expect(resized.time).toBe(0);
    engine.setInitialCondition(() => 0.25);
    const initial = getVisualSnapshot(engine, 333.33);
    expect(initial.field).toBe(resized.field);
    expect(initial.sampleAt(1, 0.8).displacement).toBe(0.25);
    engine.reset();
    expect(getVisualSnapshot(engine, 350).sampleAt(1, 0.8).displacement).toBe(0);
  });

  it('garde le chemin eau direct, sans copie ni nouvel état visuel', () => {
    const engine = new WaveEngine({ ...DEFAULT_PARAMETERS });
    expect(getVisualSnapshot(engine, 400)).toBe(engine);
    engine.step(3);
    expect(getVisualSnapshot(engine, 400).time).toBe(engine.time);
    expect(getVisualSnapshot(engine, 416.67).field).toBe(engine.field);
  });

  it('fige ensemble les deux configurations même si le calcul avance avant le rendu de la seconde', () => {
    const main = sound(), comparison = sound();
    main.setInitialCondition(() => 0.25); comparison.setInitialCondition(() => 0.5);
    const release = linkVisualEngines([main, comparison]);
    const mainView = getVisualSnapshot(main, 500);
    main.step(7); comparison.step(7);
    const comparisonView = getVisualSnapshot(comparison, 500);
    expect(mainView.time).toBe(0);
    expect(comparisonView.time).toBe(mainView.time);
    expect(comparisonView.field[100]).toBe(0.5);
    const nextMain = getVisualSnapshot(main, 516.67);
    const nextComparison = getVisualSnapshot(comparison, 516.67);
    expect(nextMain.time).toBe(main.time);
    expect(nextComparison.time).toBe(comparison.time);
    expect(nextMain.time).toBe(nextComparison.time);
    release();
    main.step(3);
    const individual = getVisualSnapshot(main, 533.33);
    expect(individual.time).toBeGreaterThan(getVisualSnapshot(comparison, 533.33).time);
  });
});
