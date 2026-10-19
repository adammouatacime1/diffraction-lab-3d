import { firstMinimumDegrees } from './fraunhofer';
import type { Grid, Parameters, ProbePosition } from '../types';

export type ThetaOverlay = { ready: false; message: string } | {
  ready: true;
  kind: 'minimum' | 'observation';
  angleDegrees: number;
  axisAngleDegrees: number;
  originLabel: string;
  origin: ProbePosition;
  axisEnd: ProbePosition;
  rays: { angleDegrees: number; end: ProbePosition }[];
  arcRadius: number;
};

export type ThetaMode = 'minimum' | 'observation';
export function angleOverlay(parameters: Parameters, grid: Pick<Grid, 'width' | 'height' | 'dx'>, mode: ThetaMode, observationAngle: number): ThetaOverlay {
  return mode === 'observation' ? observationOverlay(parameters, grid, observationAngle) : thetaOverlay(parameters, grid);
}

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
    ready: true, kind: 'minimum', angleDegrees: angle, axisAngleDegrees: 0, originLabel: 'Normale à la fente', origin,
    axisEnd: { x: grid.width - margin, y: origin.y }, rays,
    arcRadius: Math.min(0.24, shortest * 0.3),
  };
}

/** A geometric observation direction; it makes no claim about field minima. */
export function observationOverlay(parameters: Parameters, grid: Pick<Grid, 'width' | 'height' | 'dx'>, angleDegrees: number): ThetaOverlay {
  const p = parameters;
  if (!Number.isFinite(angleDegrees) || Math.abs(angleDegrees) > 80) {
    return { ready: false, message: 'Choisissez un angle d’observation entre −80° et +80°.' };
  }
  if (p.source === 'pair' || (p.obstacle !== 'slit' && p.obstacle !== 'none')) {
    return { ready: false, message: 'Le repère d’observation est disponible avec une source unique et une fente simple, ou sans obstacle.' };
  }
  const slit = p.obstacle === 'slit';
  if (slit && Math.abs(p.sourceX - p.obstacleX) <= Math.max(0.0175, grid.dx)) {
    return { ready: false, message: 'Éloignez la source de la barrière pour définir le côté d’observation.' };
  }
  const origin = slit ? { x: p.obstacleX, y: p.obstacleY } : { x: p.sourceX, y: p.sourceY };
  const margin = 0.045;
  if (origin.x <= margin || origin.x >= grid.width - margin || origin.y <= margin || origin.y >= grid.height - margin) {
    return { ready: false, message: 'Déplacez l’origine du repère à l’intérieur de la cuve.' };
  }
  const axisAngleDegrees = slit && p.sourceX > p.obstacleX ? 180 : 0;
  const endpoint = (angle: number): ProbePosition => {
    const radians = angle * Math.PI / 180;
    const dx = Math.cos(radians), dy = -Math.sin(radians);
    const xDistance = dx > 1e-12 ? (grid.width - margin - origin.x) / dx : dx < -1e-12 ? (margin - origin.x) / dx : Infinity;
    const yDistance = dy > 1e-12 ? (grid.height - margin - origin.y) / dy : dy < -1e-12 ? (margin - origin.y) / dy : Infinity;
    const length = Math.min(xDistance, yDistance);
    return { x: origin.x + length * dx, y: origin.y + length * dy };
  };
  const axisEnd = endpoint(axisAngleDegrees), end = endpoint(axisAngleDegrees + angleDegrees);
  const shortest = Math.min(Math.hypot(axisEnd.x - origin.x, axisEnd.y - origin.y), Math.hypot(end.x - origin.x, end.y - origin.y));
  return {
    ready: true, kind: 'observation', angleDegrees, axisAngleDegrees, origin,
    originLabel: slit ? `Centre de la fente · normale vers ${axisAngleDegrees === 0 ? '+x' : '−x'}` : 'Origine à la source · référence +x',
    axisEnd, rays: [{ angleDegrees, end }], arcRadius: Math.min(0.24, shortest * 0.3),
  };
}
