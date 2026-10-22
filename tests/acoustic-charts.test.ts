import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AcousticMicrophoneChart, FraunhoferChart, sampleAngularIntensity } from '../src/components/ScientificCharts';
import { compareMicrophonePhase } from '../src/physics/acousticMeasurements';
import { DEFAULT_PARAMETERS } from '../src/types';

describe('acoustic pressure measurements and plotting', () => {
  it('plots two pressures in Pa against milliseconds with one common signed scale', () => {
    const markup = renderToStaticMarkup(AcousticMicrophoneChart({ samples: [
      { t: 0, a: -1, b: -2 }, { t: 0.001, a: 0, b: 0 }, { t: 0.002, a: 1, b: 2 },
    ] }));
    expect(markup.match(/<svg /g)).toHaveLength(1);
    expect(markup).toContain('Temps (ms)');
    expect(markup).toContain('Pression p′ (Pa)');
    expect(markup).toContain('Abscisse : 0 à 2. Ordonnée : -2 à 2.');
    expect(markup).toContain('M1 · p′₁(t)');
    expect(markup).toContain('M2 · p′₂(t)');
    expect(markup).toContain('stroke="#218dba"');
    expect(markup).toContain('stroke="#c65353"');
  });

  it('does not invent microphone values before recording or after removal', () => {
    const markup = renderToStaticMarkup(AcousticMicrophoneChart({ samples: [], microphoneCount: 0 }));
    expect(markup).not.toContain('<svg');
    expect(markup).toContain('Les pressions des microphones apparaîtront');
  });

  it('identifies the sound Fraunhofer curve as squared pressure amplitude, not measured power', () => {
    const sound = renderToStaticMarkup(FraunhoferChart({ aperture: 0.68, wavelength: 0.34, medium: 'sound' }));
    expect(sound).toContain('P²(θ) / P²(0)');
    expect(sound).toContain('ne fournit pas une intensité acoustique en W/m²');
    expect(sound).toContain('Cette courbe n’est pas une mesure du calcul FDTD.');
    const water = renderToStaticMarkup(FraunhoferChart({ aperture: 0.4, wavelength: 0.2 }));
    expect(water).toContain('Intensité I / I(0)');
  });

  it('keeps angular measurement eligibility limited to apertures and requires four sound periods', () => {
    const engine = {
      parameters: { ...DEFAULT_PARAMETERS, medium: 'sound' as const, frequency: 1000, speed: 340 },
      grid: { nx: 201, ny: 115, width: 2.8, height: 1.6, dx: 0.014, dy: 1.6 / 114, dt: 0.000023, cfl: 0.8 },
      measurementReady: false,
      sampleAt: (x: number, y: number) => ({ x, y, amplitude: 0.5, displacement: 0, intensity: 0.25, phase: 0, solid: false }),
    };
    expect(sampleAngularIntensity(engine)).toEqual({ ready: false, message: expect.stringContaining('quatre périodes') });
    for (const obstacle of ['none', 'circle', 'rectangle', 'edge'] as const) {
      engine.parameters.obstacle = obstacle;
      expect(sampleAngularIntensity(engine)).toEqual({ ready: false, message: expect.stringContaining('fente simple ou double') });
    }
  });
});

describe('measured microphone phase comparison', () => {
  const first = { amplitude: 1, phase: 170 * Math.PI / 180, solid: false };
  const second = { amplitude: 0.8, phase: -170 * Math.PI / 180, solid: false };

  it('compares the measured harmonic phases modulo one cycle without inventing a time of flight', () => {
    const measured = compareMicrophonePhase(first, second, true, 1);
    expect(measured.ready).toBe(true);
    if (!measured.ready) return;
    expect(measured.phaseDegrees).toBeCloseTo(20, 12);
    expect(measured.message).toContain('ne détermine pas un retard de propagation unique');
    expect('delay' in measured).toBe(false);
    expect('distance' in measured).toBe(false);
  });

  it('withholds phase before the measurement window is complete, inside solids, or at a low-signal node', () => {
    expect(compareMicrophonePhase(first, second, false, 1).ready).toBe(false);
    expect(compareMicrophonePhase({ ...first, solid: true }, second, true, 1).ready).toBe(false);
    expect(compareMicrophonePhase({ ...first, amplitude: 0.001 }, second, true, 1).ready).toBe(false);
    expect(compareMicrophonePhase({ ...first, phase: null }, second, true, 1).ready).toBe(false);
    expect(compareMicrophonePhase({ ...first, amplitude: NaN }, second, true, 1).ready).toBe(false);
  });
});
