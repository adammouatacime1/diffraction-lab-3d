import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMETERS, SOUND_PARAMETERS } from '../src/types';
import { WaveEngine } from '../src/physics/WaveEngine';
import { parseSession, serializeSession } from '../src/data/sessionFormat';

describe('sources cohérentes : positions acoustiques dans le domaine', () => {
  it.each([0.2, 1.4])('conserve les deux émetteurs aux limites physiques pour un centre y = %s m', sourceY => {
    const parameters = { ...SOUND_PARAMETERS, source: 'pair' as const, obstacle: 'none' as const,
      sourceY, sourceSeparation: 0.4, resolution: 'performance' as const };
    const engine = new WaveEngine(parameters);
    engine.step(10);
    const lower = sourceY - parameters.sourceSeparation / 2;
    const upper = sourceY + parameters.sourceSeparation / 2;
    expect(engine.parameters).toEqual(parameters);
    // Both requested endpoints emit, including the one exactly on a domain edge.
    expect(Math.abs(engine.sampleAt(parameters.sourceX, lower).displacement)).toBeGreaterThan(0);
    expect(engine.sampleAt(parameters.sourceX, lower).displacement)
      .toBeCloseTo(engine.sampleAt(parameters.sourceX, upper).displacement, 7);
    expect(parseSession(serializeSession(parameters))).toEqual(parameters);
  });

  it.each([0.2, 1.4])('refuse une paire sonore qui déborde du domaine autour de y = %s m', sourceY => {
    expect(() => new WaveEngine({ ...SOUND_PARAMETERS, source: 'pair', sourceY, sourceSeparation: 1 }))
      .toThrow(/deux positions.*domaine/i);
  });

  it('rejette une modification invalide sans altérer le champ ni les paramètres acceptés', () => {
    const engine = new WaveEngine({ ...SOUND_PARAMETERS, source: 'pair', resolution: 'performance' });
    engine.step(12);
    const parameters = { ...engine.parameters }, field = engine.field.slice(), time = engine.time;
    expect(() => engine.updateParameters({ sourceY: 0.2, sourceSeparation: 1 })).toThrow(RangeError);
    expect(engine.parameters).toEqual(parameters);
    expect(engine.field).toEqual(field);
    expect(engine.time).toBe(time);
  });

  it.each([0.2, 1.4])('refuse explicitement un JSON sonore hors domaine autour de y = %s m', sourceY => {
    const valid = serializeSession({ ...SOUND_PARAMETERS, source: 'pair' });
    const invalid = { ...valid, parameters: { ...valid.parameters, sourceY, sourceSeparation: 1 } };
    expect(() => parseSession(JSON.parse(JSON.stringify(invalid)))).toThrow(/deux positions.*domaine/i);
    expect(() => serializeSession(invalid.parameters)).toThrow(/deux positions.*domaine/i);
    expect(invalid.parameters.sourceSeparation).toBe(1);
  });

  it('conserve les anciens paramètres eau et leur comportement de rabattement aux bords', () => {
    const parameters = { ...DEFAULT_PARAMETERS, source: 'pair' as const, obstacle: 'none' as const,
      sourceY: 0.2, sourceSeparation: 1, resolution: 'performance' as const };
    const legacy = { ...parameters } as Partial<typeof parameters>;
    delete legacy.medium;
    expect(parseSession({ application: 'Diffraction Lab 3D', version: 1, parameters: legacy })).toEqual(parameters);
    const engine = new WaveEngine(parameters);
    engine.step(10);
    expect(engine.parameters.sourceSeparation).toBe(1);
    expect(engine.sampleAt(parameters.sourceX, 0).displacement).not.toBe(0);
    expect(parseSession(serializeSession(parameters))).toEqual(parameters);
  });

  it('laisse les paramètres de séparation inactifs inchangés pour une source sonore unique', () => {
    const parameters = { ...SOUND_PARAMETERS, source: 'point' as const, sourceY: 0.2, sourceSeparation: 1 };
    expect(new WaveEngine(parameters).parameters).toEqual(parameters);
    expect(parseSession(serializeSession(parameters))).toEqual(parameters);
  });
});
