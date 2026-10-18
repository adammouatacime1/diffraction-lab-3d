import { describe, expect, it } from 'vitest';
import { thetaOverlay } from '../src/physics/thetaOverlay';
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
