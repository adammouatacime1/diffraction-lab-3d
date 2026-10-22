import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMETERS, SOUND_PARAMETERS } from '../src/types';
import { parseSession, serializeSession } from '../src/data/sessionFormat';

describe('format de session avec milieu et unités explicites', () => {
  it('migre les exports eau de version 1 sans modifier leurs valeurs physiques', () => {
    const oldParameters = { ...DEFAULT_PARAMETERS } as Record<string, unknown>;
    delete oldParameters.medium;
    const oldExport = { application: 'Diffraction Lab 3D', version: 1, parameters: oldParameters };
    expect(parseSession(oldExport)).toEqual({ ...DEFAULT_PARAMETERS, medium: 'water' });
    expect(oldExport.parameters).not.toHaveProperty('medium');
    expect(parseSession({ parameters: oldParameters })).toEqual({ ...DEFAULT_PARAMETERS, medium: 'water' });
  });

  it.each([
    ['water', DEFAULT_PARAMETERS, 'm'],
    ['sound', SOUND_PARAMETERS, 'Pa'],
  ] as const)('conserve les valeurs %s lors d’un aller-retour JSON avec des unités explicites', (_medium, parameters, unit) => {
    const exported = serializeSession(parameters);
    expect(exported.version).toBe(2);
    expect(exported.medium).toBe(parameters.medium);
    expect(exported.units).toEqual({ length: 'm', time: 's', frequency: 'Hz', speed: 'm/s', amplitude: unit, field: unit });
    expect(parseSession(JSON.parse(JSON.stringify(exported)))).toEqual(parameters);
    expect(exported.parameters).not.toBe(parameters);
  });

  it('ne réinterprète pas une pression acoustique comme une élongation de surface', () => {
    const exported = serializeSession(SOUND_PARAMETERS);
    expect(() => parseSession({ ...exported, medium: 'water' })).toThrow(/milieux/);
    expect(() => parseSession({ ...exported, units: { ...exported.units, amplitude: 'mm' } })).toThrow(/Unité incompatible/);
    expect(() => parseSession({ ...exported, units: { ...exported.units, field: 'm' } })).toThrow(/Unité incompatible/);
    expect(() => parseSession({ ...exported, units: { ...exported.units, time: 'ms' } })).toThrow(/Unité incompatible/);
    expect(() => parseSession({ ...exported, version: 1 })).toThrow(/uniquement/);
    const water = serializeSession(DEFAULT_PARAMETERS);
    expect(() => parseSession({ ...water, version: 1, units: { ...water.units, field: 'Pa' } })).toThrow(/Unité incompatible/);
  });

  it('refuse les versions inconnues, les unités absentes et les milieux ambigus', () => {
    const exported = serializeSession(SOUND_PARAMETERS);
    expect(() => parseSession({ ...exported, version: 3 })).toThrow(/Version/);
    expect(() => parseSession({ ...exported, version: '2' })).toThrow(/Version/);
    expect(() => parseSession({ ...exported, units: undefined })).toThrow(/unités/);
    expect(() => parseSession({ ...exported, medium: 'air' })).toThrow(/Milieu/);
    expect(() => parseSession({ ...exported, parameters: { ...SOUND_PARAMETERS, medium: undefined } })).toThrow(/milieux/);
    expect(() => parseSession({ ...exported, application: 'Autre simulation' })).toThrow(/format/);
  });

  it.each([NaN, Infinity, -Infinity, '1000', undefined])('refuse une fréquence non numérique ou non finie (%s)', value => {
    const exported = serializeSession(SOUND_PARAMETERS);
    expect(() => parseSession({ ...exported, parameters: { ...SOUND_PARAMETERS, frequency: value } })).toThrow(/frequency/);
  });

  it('respecte les bornes des deux milieux, les choix et les booléens natifs', () => {
    const water = serializeSession(DEFAULT_PARAMETERS);
    const sound = serializeSession(SOUND_PARAMETERS);
    expect(() => parseSession({ ...water, parameters: { ...DEFAULT_PARAMETERS, frequency: 1000 } })).toThrow(/frequency/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, speed: 2 } })).toThrow(/speed/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, amplitude: 11 } })).toThrow(/amplitude/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, obstacleX: 9 } })).toThrow(/obstacleX/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, sourceEnabled: 'false' } })).toThrow(/Activation/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, obstacle: 'sphere' } })).toThrow(/Choix/);
    expect(() => parseSession({ ...sound, parameters: { ...SOUND_PARAMETERS, source: 'speaker' } })).toThrow(/Choix/);
  });

  it('permet toutes les géométries et conserve les unités acoustiques en coordonnées SI', () => {
    for (const obstacle of ['none', 'slit', 'double', 'circle', 'rectangle', 'edge'] as const) {
      const parameters = { ...SOUND_PARAMETERS, obstacle, sourceX: 0.4, sourceY: 0.7, obstacleX: 1.6, obstacleY: 0.9 };
      expect(parseSession(serializeSession(parameters))).toEqual(parameters);
    }
  });

  it('refuse les conteneurs invalides et les paramètres absents', () => {
    for (const value of [null, false, [], 'texte', {}, { parameters: [] }, { parameters: null }]) {
      expect(() => parseSession(value)).toThrow(/paramètres/);
    }
    expect(() => parseSession({ version: 1, parameters: {} })).toThrow(/Valeur invalide/);
  });
});
