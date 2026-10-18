import { firstMinimumDegrees } from './fraunhofer';
import type { Grid, Parameters, ProbePosition } from '../types';

export type ThetaOverlay = { ready: false; message: string } | {
  ready: true;
  angleDegrees: number;
  origin: ProbePosition;
  axisEnd: ProbePosition;
  rays: { angleDegrees: number; end: ProbePosition }[];
  arcRadius: number;
};

/** Theoretical directions only; this does not read or alter the computed field. */
export function thetaOverlay(parameters: Parameters, grid: Pick<Grid, 'width' | 'height' | 'dx'>): ThetaOverlay {
  const p = parameters;
  if (p.obstacle !== 'slit') return { ready: false, message: 'Le repère θ nécessite une fente simple.' };
  if (p.source !== 'plane' || Math.abs(p.sourceAngle) > 1e-8) {
    return { ready: false, message: 'Choisissez une source rectiligne en incidence normale pour ce repère.' };
  }
  if (p.sourceX >= p.obstacleX - Math.max(0.0175, grid.dx)) {
    return { ready: false, message: 'Placez la source à gauche de la barrière pour ce repère vers la droite.' };
  }
  if (p.obstacleY - p.aperture / 2 <= 0 || p.obstacleY + p.aperture / 2 >= grid.height) {
    return { ready: false, message: 'La fente doit être entièrement comprise entre les bords de la cuve.' };
  }
  const angle = firstMinimumDegrees(p.aperture, p.speed / p.frequency);
  if (angle === null) return { ready: false, message: 'Aucun premier minimum théorique pour a < λ. Chargez le cas θ = 30° pour le voir.' };
  if (angle === 90) return { ready: false, message: 'Le premier minimum est à 90°, en direction rasante le long de la barrière.' };
  const margin = 0.045;
  const origin = { x: p.obstacleX, y: p.obstacleY };
  if (origin.x >= grid.width - margin || origin.y <= margin || origin.y >= grid.height - margin) {
    return { ready: false, message: 'Déplacez la fente pour laisser de la place aux repères dans la cuve.' };
  }
  const rays = [-angle, angle].map(angleDegrees => {
    const radians = angleDegrees * Math.PI / 180;
    const dx = Math.cos(radians);
    const dy = -Math.sin(radians);
    const length = Math.min(
      (grid.width - margin - origin.x) / dx,
      dy > 0 ? (grid.height - margin - origin.y) / dy : (margin - origin.y) / dy,
    );
    return { angleDegrees, end: { x: origin.x + length * dx, y: origin.y + length * dy } };
  });
  const shortest = Math.min(...rays.map(ray => Math.hypot(ray.end.x - origin.x, ray.end.y - origin.y)), grid.width - margin - origin.x);
  return {
    ready: true, angleDegrees: angle, origin,
    axisEnd: { x: grid.width - margin, y: origin.y }, rays,
    arcRadius: Math.min(0.24, shortest * 0.3),
  };
}
