import { describe, expect, it } from 'vitest';
import { fraunhoferIntensity, sampleAngularIntensity } from '../src/components/ScientificCharts';
import { firstMinimumDegrees, fraunhoferAmplitude, fraunhoferField } from '../src/physics/fraunhofer';
import { DEFAULT_PARAMETERS } from '../src/types';

describe('single-slit Fraunhofer reference model', () => {
  it('has a finite normalized central maximum', () => {
    expect(fraunhoferField(0, 0.4, 0.2)).toBe(1);
    expect(fraunhoferAmplitude(0, 0.4, 0.2)).toBe(1);
    expect(fraunhoferIntensity(0, 0.4, 0.2)).toBe(1);
    expect(fraunhoferIntensity(1e-12, 0.4, 0.2)).toBeCloseTo(1, 12);
  });

  it('places the minima at sin(theta) = m lambda / a', () => {
    const aperture = 0.8;
    const wavelength = 0.2;
    for (let order = 1; order <= 4; order += 1) {
      const angle = Math.asin(order * wavelength / aperture) * 180 / Math.PI;
      expect(fraunhoferIntensity(angle, aperture, wavelength)).toBeLessThan(1e-28);
      expect(fraunhoferIntensity(-angle, aperture, wavelength)).toBeLessThan(1e-28);
    }
    // The first minimum must be 30 degrees here; using theta in place of sin(theta)
    // would produce a different zero and fail this independent reference case.
    expect(fraunhoferIntensity(30, 0.4, 0.2)).toBeLessThan(1e-28);
    expect(firstMinimumDegrees(0.4, 0.2)).toBeCloseTo(30, 12);
    expect(fraunhoferField(30, 0.4, 0.2)).toBe(0);
    expect(fraunhoferAmplitude(-30, 0.4, 0.2)).toBe(0);
    expect(fraunhoferIntensity(20, 0.4, 0.2)).toBeGreaterThan(0.1);
  });

  it('has no accessible zero when the aperture is smaller than the wavelength', () => {
    const aperture = 0.1;
    const wavelength = 0.2;
    const boundaryIntensity = (2 / Math.PI) ** 2;
    for (let angle = -90; angle <= 90; angle += 0.5) {
      const intensity = fraunhoferIntensity(angle, aperture, wavelength);
      expect(intensity).toBeGreaterThanOrEqual(boundaryIntensity - 1e-14);
      expect(intensity).toBeLessThanOrEqual(1);
    }
    expect(wavelength / aperture).toBeGreaterThan(1);
    expect(firstMinimumDegrees(aperture, wavelength)).toBeNull();
    expect(firstMinimumDegrees(wavelength * (1 - 1e-12), wavelength)).toBeNull();
    expect(fraunhoferIntensity(90, aperture, wavelength)).toBeCloseTo(boundaryIntensity, 12);
  });

  it('retains secondary lobes beyond the first minimum instead of imposing a hard cutoff', () => {
    // At sin(theta) = 3/4 and a/lambda = 2, beta = 3 pi / 2.
    const angle = Math.asin(0.75) * 180 / Math.PI;
    const field = -2 / (3 * Math.PI);
    expect(fraunhoferField(angle, 0.4, 0.2)).toBeCloseTo(field, 14);
    expect(fraunhoferAmplitude(angle, 0.4, 0.2)).toBeCloseTo(-field, 14);
    expect(fraunhoferIntensity(angle, 0.4, 0.2)).toBeCloseTo(field ** 2, 14);
    expect(fraunhoferField(-angle, 0.4, 0.2)).toBeCloseTo(field, 14);
  });

  it('places the limiting first minimum at 90 degrees when a equals lambda', () => {
    expect(firstMinimumDegrees(0.2, 0.2)).toBe(90);
    expect(fraunhoferAmplitude(90, 0.2, 0.2)).toBe(0);
    expect(fraunhoferAmplitude(-90, 0.2, 0.2)).toBe(0);
    expect(fraunhoferAmplitude(89, 0.2, 0.2)).toBeGreaterThan(0);
  });

  it('is symmetric and invariant under a common change of length units', () => {
    for (const angle of [5, 17, 42, 73]) {
      const intensity = fraunhoferIntensity(angle, 0.42, 0.17);
      expect(intensity).toBeCloseTo(fraunhoferIntensity(-angle, 0.42, 0.17), 14);
      expect(intensity).toBeCloseTo(fraunhoferIntensity(angle, 420, 170), 14);
    }
  });

  it('rejects undefined physical inputs instead of inventing a curve', () => {
    for (const [angle, aperture, wavelength] of [
      [0, 0, 0.2], [0, -0.1, 0.2], [0, 0.1, 0],
      [0, 0.1, -0.2], [NaN, 0.1, 0.2], [0, Infinity, 0.2],
    ]) {
      expect(fraunhoferIntensity(angle, aperture, wavelength)).toBeNaN();
      expect(fraunhoferField(angle, aperture, wavelength)).toBeNaN();
      expect(fraunhoferAmplitude(angle, aperture, wavelength)).toBeNaN();
    }
    for (const [aperture, wavelength] of [[0, 0.2], [-1, 0.2], [0.1, 0], [0.1, -1], [NaN, 0.2], [0.1, Infinity]]) {
      expect(firstMinimumDegrees(aperture, wavelength)).toBeNull();
    }
  });
});

describe('numerical angular sampling', () => {
  function fixture() {
    return {
      parameters: { ...DEFAULT_PARAMETERS },
      grid: { nx: 201, ny: 115, width: 2.8, height: 1.6, dx: 0.014, dy: 1.6 / 114, dt: 0.0039, cfl: 0.8 },
      measurementReady: true,
      sampleAt: (x: number, y: number) => ({ x, y, amplitude: 0.002, displacement: 0, intensity: 0.25, phase: 0, solid: false }),
    };
  }

  it('normalizes measured amplitudes on a safely bounded downstream arc', () => {
    const engine = fixture();
    const sampled: { x: number; y: number }[] = [];
    engine.sampleAt = (x, y) => {
      sampled.push({ x, y });
      const theta = Math.atan2(y - engine.parameters.obstacleY, x - engine.parameters.obstacleX);
      return { x, y, amplitude: 0.002 * Math.cos(theta), displacement: 0, intensity: 0, phase: 0, solid: false };
    };
    const measurement = sampleAngularIntensity(engine);
    expect(measurement.ready).toBe(true);
    if (!measurement.ready) return;
    expect(measurement.radius).toBeCloseTo(0.56 / Math.sin(Math.PI / 3), 12);
    expect(measurement.points).toHaveLength(121);
    expect(measurement.points[60]).toEqual({ x: 0, y: 1 });
    expect(measurement.points[0].y).toBeCloseTo(0.25, 12);
    expect(measurement.fresnel).toBeCloseTo(0.1 ** 2 / (0.2 * measurement.radius), 12);
    expect(sampled.every(({ x, y }) => x > engine.parameters.obstacleX && x <= 2.55 && y >= 0.24 - 1e-12 && y <= 1.36 + 1e-12)).toBe(true);
  });

  it('returns no points before acquisition, without a slit, or without axial signal', () => {
    const engine = fixture();
    engine.measurementReady = false;
    expect(sampleAngularIntensity(engine).ready).toBe(false);
    engine.measurementReady = true;
    engine.parameters.obstacle = 'none';
    expect(sampleAngularIntensity(engine).ready).toBe(false);
    engine.parameters.obstacle = 'slit';
    engine.sampleAt = (x, y) => ({ x, y, amplitude: 0, displacement: 0, intensity: 0, phase: 0, solid: false });
    expect(sampleAngularIntensity(engine).ready).toBe(false);
  });

  it('declines an arc too close to the side boundary', () => {
    const engine = fixture();
    engine.parameters.obstacleY = 0.25;
    expect(sampleAngularIntensity(engine).ready).toBe(false);
  });
});
