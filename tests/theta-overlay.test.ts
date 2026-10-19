import { describe, expect, it } from 'vitest';
import { observationOverlay, thetaOverlay } from '../src/physics/thetaOverlay';
import { DEFAULT_PARAMETERS } from '../src/types';

const grid = { width: 2.8, height: 1.6, dx: 0.01 };
const parameters = { ...DEFAULT_PARAMETERS, aperture: 0.4 };

describe('theoretical theta overlay geometry', () => {
  it('locates ±30° from the slit centre and clips the two directions inside the tank', () => {
    const result = thetaOverlay(parameters, grid);
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.angleDegrees).toBeCloseTo(30, 12);
    expect(result.origin).toEqual({ x: 1.35, y: 0.8 });
    expect(result.axisEnd).toEqual({ x: 2.755, y: 0.8 });
    for (const ray of result.rays) {
      const observed = Math.atan2(result.origin.y - ray.end.y, ray.end.x - result.origin.x) * 180 / Math.PI;
      expect(observed).toBeCloseTo(ray.angleDegrees, 12);
      expect(Math.abs(observed)).toBeCloseTo(30, 12);
      expect(ray.end.x).toBeLessThanOrEqual(grid.width);
      expect(ray.end.y).toBeGreaterThanOrEqual(0);
      expect(ray.end.y).toBeLessThanOrEqual(grid.height);
    }
  });

  it('keeps the same angles for an off-centre slit, with independently clipped ray lengths', () => {
    const result = thetaOverlay({ ...parameters, obstacleY: 0.4 }, grid);
    if (!result.ready) throw new Error(result.message);
    const lengths = result.rays.map(ray => Math.hypot(ray.end.x - result.origin.x, ray.end.y - result.origin.y));
    expect(lengths[0]).not.toBeCloseTo(lengths[1], 4);
    for (const ray of result.rays) {
      expect(Math.atan2(result.origin.y - ray.end.y, ray.end.x - result.origin.x) * 180 / Math.PI).toBeCloseTo(ray.angleDegrees, 12);
    }
  });

  it('does not draw an invented minimum or a grazing direction along the barrier', () => {
    const narrow = thetaOverlay(DEFAULT_PARAMETERS, grid);
    expect(narrow.ready).toBe(false);
    if (!narrow.ready) expect(narrow.message).toContain('a < λ');
    const grazing = thetaOverlay({ ...parameters, aperture: 0.2 }, grid);
    expect(grazing.ready).toBe(false);
    if (!grazing.ready) expect(grazing.message).toContain('90°');
  });

  it('rejects a different geometry, illumination, source side or truncated aperture', () => {
    for (const patch of [
      { obstacle: 'double' as const }, { source: 'point' as const }, { sourceAngle: 15 },
      { sourceX: 1, obstacleX: 0.8 }, { obstacleY: 0.25, aperture: 0.8 },
    ]) expect(thetaOverlay({ ...parameters, ...patch }, grid).ready).toBe(false);
  });
});

describe('geometric observation angle', () => {
  it('shows a point-source direction through a narrow slit without inventing a Fraunhofer minimum', () => {
    const result = observationOverlay({ ...DEFAULT_PARAMETERS, source: 'point' }, grid, 30);
    if (!result.ready) throw new Error(result.message);
    expect(result.kind).toBe('observation');
    expect(result.angleDegrees).toBe(30);
    expect(result.rays).toHaveLength(1);
    expect(result.origin).toEqual({ x: 1.35, y: 0.8 });
    const ray = result.rays[0];
    expect(Math.atan2(result.origin.y - ray.end.y, ray.end.x - result.origin.x) * 180 / Math.PI).toBeCloseTo(30, 12);
    expect(thetaOverlay({ ...DEFAULT_PARAMETERS, source: 'point' }, grid).ready).toBe(false);
  });

  it('uses the point source as polar origin without an obstacle and follows negative angles', () => {
    const result = observationOverlay({ ...DEFAULT_PARAMETERS, source: 'point', sourceX: 0.7, obstacle: 'none' }, grid, -40);
    if (!result.ready) throw new Error(result.message);
    expect(result.origin).toEqual({ x: 0.7, y: 0.8 });
    expect(result.axisAngleDegrees).toBe(0);
    const end = result.rays[0].end;
    expect(Math.atan2(result.origin.y - end.y, end.x - result.origin.x) * 180 / Math.PI).toBeCloseTo(-40, 12);
    expect(end.x).toBeLessThan(grid.width);
    expect(end.y).toBeLessThan(grid.height);
  });

  it('uses the opposite normal when a point source is on the right of the barrier', () => {
    const result = observationOverlay({ ...DEFAULT_PARAMETERS, source: 'point', sourceX: 1, obstacleX: 0.8, sourceY: 0.4 }, grid, 30);
    if (!result.ready) throw new Error(result.message);
    expect(result.axisAngleDegrees).toBe(180);
    expect(result.axisEnd.x).toBeLessThan(result.origin.x);
    const end = result.rays[0].end;
    expect(end.x).toBeLessThan(result.origin.x);
    const globalAngle = Math.atan2(result.origin.y - end.y, end.x - result.origin.x) * 180 / Math.PI;
    expect((globalAngle - result.axisAngleDegrees + 540) % 360 - 180).toBeCloseTo(30, 12);
    expect(result.origin.y).toBe(0.8);
  });

  it('keeps a zero observation angle geometric and rejects unsupported configurations', () => {
    const axis = observationOverlay({ ...DEFAULT_PARAMETERS, source: 'point' }, grid, 0);
    if (!axis.ready) throw new Error(axis.message);
    expect(axis.rays[0].end).toEqual(axis.axisEnd);
    expect(axis.kind).toBe('observation');
    for (const patch of [{ source: 'pair' as const }, { obstacle: 'double' as const }, { obstacle: 'circle' as const }]) {
      expect(observationOverlay({ ...DEFAULT_PARAMETERS, ...patch }, grid, 30).ready).toBe(false);
    }
    for (const angle of [NaN, Infinity, 81, -81]) expect(observationOverlay(DEFAULT_PARAMETERS, grid, angle).ready).toBe(false);
  });
});
