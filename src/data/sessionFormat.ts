import { DEFAULT_PARAMETERS, SOUND_PARAMETERS } from '../types';
import type { MediumKind, Parameters } from '../types';
import { assertSoundPairBounds } from '../physics/WaveEngine';

/** Units of serialized physical values, independently of the display's mm/ms labels. */
export interface SessionUnits {
  length: 'm';
  time: 's';
  frequency: 'Hz';
  speed: 'm/s';
  amplitude: 'm' | 'Pa';
  field: 'm' | 'Pa';
}

export interface LaboratorySession {
  application: 'Diffraction Lab 3D';
  version: 2;
  medium: MediumKind;
  units: SessionUnits;
  parameters: Parameters;
}

const geometryBounds = {
  aperture: [0.04, 1.2],
  sourceX: [0.12, 1],
  sourceY: [0.2, 1.4],
  sourceSeparation: [0.1, 1],
  sourceAngle: [-70, 70],
  phase: [-180, 180],
  obstacleX: [0.8, 2.2],
  obstacleY: [0.25, 1.35],
  obstacleWidth: [0.05, 1],
  obstacleHeight: [0.05, 1.2],
  separation: [0.1, 1.2],
} as const;

const physicalBounds = {
  water: { frequency: [1, 20], speed: [0.5, 4], amplitude: [0.0001, 0.01] },
  sound: { frequency: [100, 4000], speed: [300, 380], amplitude: [0.01, 10] },
} as const;

const choices = {
  source: ['plane', 'point', 'pair'],
  obstacle: ['none', 'slit', 'double', 'circle', 'rectangle', 'edge'],
  boundary: ['absorbing', 'reflecting'],
  resolution: ['performance', 'balanced', 'precision'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unitsFor(medium: MediumKind): SessionUnits {
  return {
    length: 'm', time: 's', frequency: 'Hz', speed: 'm/s',
    amplitude: medium === 'sound' ? 'Pa' : 'm',
    field: medium === 'sound' ? 'Pa' : 'm',
  };
}

function validateUnits(raw: unknown, medium: MediumKind) {
  if (!isRecord(raw)) throw new Error('Les unités du format de version 2 sont absentes.');
  for (const [key, expected] of Object.entries(unitsFor(medium))) {
    if (raw[key] !== expected) throw new Error(`Unité incompatible : ${key} doit être exprimé en ${expected}.`);
  }
}

function validateParameters(raw: Record<string, unknown>, medium: MediumKind): Parameters {
  const next = { ...(medium === 'sound' ? SOUND_PARAMETERS : DEFAULT_PARAMETERS), medium };
  const target = next as unknown as Record<string, unknown>;
  const bounds = { ...geometryBounds, ...physicalBounds[medium] };
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const value = raw[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`Valeur invalide : ${key} (entre ${min} et ${max}, en unités SI).`);
    }
    target[key] = value;
  }
  for (const [key, options] of Object.entries(choices)) {
    const value = raw[key];
    if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) {
      throw new Error(`Choix invalide : ${key}.`);
    }
    target[key] = value;
  }
  if (typeof raw.sourceEnabled !== 'boolean') throw new Error('Activation de source invalide.');
  next.sourceEnabled = raw.sourceEnabled;
  assertSoundPairBounds(next);
  return next;
}

/** Version 1 (including older unversioned containers) is explicitly a water experiment. */
export function parseSession(data: unknown): Parameters {
  if (!isRecord(data) || !isRecord(data.parameters)) {
    throw new Error('Le fichier doit contenir les paramètres d’une expérience.');
  }
  if (data.application !== undefined && data.application !== 'Diffraction Lab 3D') {
    throw new Error('Ce fichier ne provient pas du format Diffraction Lab 3D.');
  }
  const version = data.version === undefined ? 1 : data.version;
  if (version !== 1 && version !== 2) throw new Error('Version de format non prise en charge.');
  const raw = data.parameters;
  let medium: MediumKind;
  if (version === 1) {
    if ((data.medium !== undefined && data.medium !== 'water') || (raw.medium !== undefined && raw.medium !== 'water')) {
      throw new Error('Un ancien export de version 1 représente uniquement la surface de l’eau.');
    }
    medium = 'water';
    // Original v1 exports have no units. If supplied, they must still identify water SI values.
    if (data.units !== undefined) validateUnits(data.units, medium);
  } else {
    if (data.medium !== 'water' && data.medium !== 'sound') throw new Error('Milieu de propagation invalide.');
    medium = data.medium;
    if (raw.medium !== medium) throw new Error('Les milieux déclarés dans le fichier ne correspondent pas.');
    validateUnits(data.units, medium);
  }
  return validateParameters(raw, medium);
}

/** Snapshot only physical parameters; playback rate and relief never alter the model. */
export function serializeSession(parameters: Parameters): LaboratorySession {
  if (parameters.medium !== 'water' && parameters.medium !== 'sound') throw new Error('Milieu de propagation invalide.');
  return {
    application: 'Diffraction Lab 3D', version: 2, medium: parameters.medium,
    units: unitsFor(parameters.medium),
    parameters: validateParameters(parameters as unknown as Record<string, unknown>, parameters.medium),
  };
}
