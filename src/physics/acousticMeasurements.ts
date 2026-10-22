import type { ProbeReading } from '../types';

export type MicrophonePhaseComparison = {
  ready: false;
  message: string;
} | {
  ready: true;
  phaseDegrees: number;
  message: string;
};

/**
 * Compare the solver's harmonic fits at a shared frequency and time window.
 * This is a phase modulo 360°, never a path length or a unique travel time.
 */
export function compareMicrophonePhase(
  first: Pick<ProbeReading, 'amplitude' | 'phase' | 'solid'>,
  second: Pick<ProbeReading, 'amplitude' | 'phase' | 'solid'>,
  measurementReady: boolean,
  sourceAmplitude: number,
): MicrophonePhaseComparison {
  if (!measurementReady) return { ready: false, message: 'Acquisition des pressions sur quatre périodes complètes nécessaire.' };
  if (first.solid || second.solid) return { ready: false, message: 'Les deux microphones doivent être placés dans le milieu libre.' };
  const threshold = Math.max(1e-12, Math.abs(sourceAmplitude) * 0.01);
  if (![first.amplitude, second.amplitude].every(value => Number.isFinite(value) && value > threshold)
    || first.phase === null || second.phase === null || !Number.isFinite(first.phase) || !Number.isFinite(second.phase)) {
    return { ready: false, message: 'Pression trop faible ou phase indéfinie : comparaison non fiable près d’une zone de faible amplitude.' };
  }
  const difference = second.phase - first.phase;
  const wrapped = Math.atan2(Math.sin(difference), Math.cos(difference));
  return {
    ready: true,
    phaseDegrees: wrapped * 180 / Math.PI,
    message: 'Phase harmonique M2 − M1 modulo 360°, sur la même fenêtre de quatre périodes. Interprétation limitée en régime transitoire ou près d’un minimum. Ce déphasage ne détermine pas un retard de propagation unique dans un champ diffracté ou réfléchi.',
  };
}
