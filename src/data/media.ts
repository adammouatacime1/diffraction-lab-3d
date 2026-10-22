import { DEFAULT_PARAMETERS, SOUND_PARAMETERS } from '../types';
import type { Grid, MediumKind, Parameters } from '../types';

/** Visible GBF + loudspeaker experiment; the generator controls an existing source. */
export const SOUND_MONTAGE: Parameters = {
  ...SOUND_PARAMETERS,
  source: 'point', sourceX: 0.38, sourceY: 0.8,
  obstacle: 'slit', obstacleX: 1.35, obstacleY: 0.8,
  aperture: 0.17, sourceEnabled: true,
};

/** Physical configurations are separate; the renderer never converts physics parameters. */
export const MEDIA = {
  water: { label: 'Surface de l’eau', defaults: DEFAULT_PARAMETERS, fieldUnit: 'mm', fieldScale: 1000, timeUnit: 's', timeScale: 1, physicalRate: 1, defaultPlayback: 0.25 },
  sound: { label: 'Ondes sonores', defaults: SOUND_MONTAGE, fieldUnit: 'Pa', fieldScale: 1, timeUnit: 'ms', timeScale: 1000, physicalRate: 0.005, defaultPlayback: 1 },
} as const;

/** Twelve cells per shortest wavelength on the selected grid. CFL alone is not accuracy. */
export function frequencyLimit(parameters: Parameters, grid: Pick<Grid, 'dx' | 'dy'>): number {
  return parameters.medium === 'sound'
    ? Math.floor(Math.min(4000, parameters.speed / (12 * Math.max(grid.dx, grid.dy))) / 10) * 10
    : 20;
}

export function dimensionRatio(parameters: Parameters) {
  const wavelength = parameters.speed / parameters.frequency;
  if (parameters.obstacle === 'slit' || parameters.obstacle === 'double') return { symbol: 'a/λ', label: 'Rapport d’ouverture', value: parameters.aperture / wavelength };
  if (parameters.obstacle === 'circle') return { symbol: 'D/λ', label: 'Diamètre / longueur d’onde', value: parameters.obstacleWidth / wavelength };
  if (parameters.obstacle === 'rectangle') return { symbol: 'h/λ', label: 'Hauteur / longueur d’onde', value: parameters.obstacleHeight / wavelength };
  if (parameters.obstacle === 'edge') return { symbol: 'h/λ', label: 'Hauteur du bord / longueur d’onde', value: parameters.obstacleY / wavelength };
  return { symbol: 'L/λ', label: 'Longueur du domaine / λ', value: 2.8 / wavelength };
}

export function defaultProbes(medium: MediumKind) {
  return medium === 'sound' ? [{ x: 1.85, y: 0.65 }, { x: 2.15, y: 0.95 }] : [{ x: 1.85, y: 0.8 }];
}
