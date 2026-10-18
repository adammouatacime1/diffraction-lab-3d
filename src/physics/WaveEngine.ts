import type { Grid, Parameters, ProbeReading } from '../types';

const WIDTH = 2.8;
const HEIGHT = 1.6;
const SAMPLES = 32;
const TAU = 2 * Math.PI;
const RAD = Math.PI / 180;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Linear 2D scalar wave equation. Physical coordinates and time are in SI units. */
export class WaveEngine {
  parameters: Parameters;
  grid!: Grid;
  field!: Float32Array;
  amplitude!: Float32Array;
  intensity!: Float32Array;
  phase!: Float32Array;
  mask!: Uint8Array;
  time = 0;
  measurementReady = false;
  warnings: string[] = [];

  private previous!: Float32Array;
  private next!: Float32Array;
  private damping!: Float32Array;
  private snapshots!: Float32Array;
  private sumCos!: Float32Array;
  private sumSin!: Float32Array;
  private sampleIndex = 0;
  private sampleCount = 0;
  private nextSampleTime = 0;
  private sampleOrigin = 0;
  private sourceIndices: number[] = [];
  private sourcePhases: number[] = [];

  constructor(parameters: Parameters) {
    this.parameters = { ...parameters };
    this.sanitizeParameters();
    this.allocate();
    this.reset();
  }

  private sanitizeParameters() {
    const p = this.parameters;
    for (const key of ['frequency', 'speed', 'amplitude', 'aperture', 'sourceX', 'sourceY',
      'sourceSeparation', 'sourceAngle', 'phase', 'obstacleX', 'obstacleY',
      'obstacleWidth', 'obstacleHeight', 'separation'] as const) {
      if (!Number.isFinite(p[key])) throw new RangeError(`Paramètre non fini : ${key}`);
    }
    if (p.frequency <= 0 || p.speed <= 0) throw new RangeError('La fréquence et la célérité doivent être positives.');
    p.amplitude = Math.max(0, p.amplitude);
    p.aperture = clamp(p.aperture, 0, HEIGHT);
    p.sourceX = clamp(p.sourceX, 0, WIDTH);
    p.sourceY = clamp(p.sourceY, 0, HEIGHT);
    p.obstacleX = clamp(p.obstacleX, 0, WIDTH);
    p.obstacleY = clamp(p.obstacleY, 0, HEIGHT);
    p.obstacleWidth = clamp(p.obstacleWidth, 0, WIDTH);
    p.obstacleHeight = clamp(p.obstacleHeight, 0, HEIGHT);
    p.sourceSeparation = clamp(p.sourceSeparation, 0, HEIGHT);
    p.separation = clamp(p.separation, 0, HEIGHT);
  }

  private allocate() {
    const nx = this.parameters.resolution === 'precision' ? 281 : this.parameters.resolution === 'performance' ? 141 : 201;
    const ny = Math.round((nx - 1) * HEIGHT / WIDTH) + 1;
    const dx = WIDTH / (nx - 1);
    const dy = HEIGHT / (ny - 1);
    const dt = 0.8 / (this.parameters.speed * Math.sqrt(1 / (dx * dx) + 1 / (dy * dy)));
    this.grid = { nx, ny, width: WIDTH, height: HEIGHT, dx, dy, dt, cfl: 0.8 };
    const size = nx * ny;
    this.field = new Float32Array(size);
    this.previous = new Float32Array(size);
    this.next = new Float32Array(size);
    this.amplitude = new Float32Array(size);
    this.intensity = new Float32Array(size);
    this.phase = new Float32Array(size);
    this.mask = new Uint8Array(size);
    this.damping = new Float32Array(size);
    this.snapshots = new Float32Array(size * SAMPLES);
    this.sumCos = new Float32Array(size);
    this.sumSin = new Float32Array(size);
    this.configureGeometry();
  }

  private configureGeometry() {
    const { nx, ny, dx, dy } = this.grid;
    const p = this.parameters;
    const wallHalfThickness = Math.max(0.0175, dx);
    this.mask.fill(0);
    for (let j = 0; j < ny; j++) {
      const y = j * dy;
      for (let i = 0; i < nx; i++) {
        const x = i * dx;
        const k = j * nx + i;
        const wall = Math.abs(x - p.obstacleX) <= wallHalfThickness;
        const offsetY = y - p.obstacleY;
        let solid = false;
        if (p.obstacle === 'slit') solid = wall && Math.abs(offsetY) >= p.aperture / 2;
        if (p.obstacle === 'double') solid = wall && Math.abs(offsetY - p.separation / 2) >= p.aperture / 2 && Math.abs(offsetY + p.separation / 2) >= p.aperture / 2;
        if (p.obstacle === 'edge') solid = wall && y <= p.obstacleY;
        if (p.obstacle === 'circle') solid = (x - p.obstacleX) ** 2 + offsetY ** 2 <= (p.obstacleWidth / 2) ** 2;
        if (p.obstacle === 'rectangle') solid = Math.abs(x - p.obstacleX) <= p.obstacleWidth / 2 && Math.abs(offsetY) <= p.obstacleHeight / 2;
        this.mask[k] = solid ? 1 : 0;
        if (solid) this.field[k] = this.previous[k] = this.next[k] = 0;
        const edgeDistance = Math.min(x, WIDTH - x, y, HEIGHT - y);
        // A gradually increasing velocity damping layer; this is a sponge, not a PML.
        this.damping[k] = p.boundary === 'absorbing' ? 55 * p.speed * Math.max(0, 1 - edgeDistance / 0.22) ** 3 : 0;
      }
    }
    this.sourceIndices = [];
    this.sourcePhases = [];
    const column = Math.round(p.sourceX / dx);
    if (p.source === 'plane') {
      const ky = TAU * p.frequency / p.speed * Math.sin(p.sourceAngle * RAD);
      for (let j = 0; j < ny; j++) {
        this.sourceIndices.push(j * nx + column);
        this.sourcePhases.push(p.phase * RAD - ky * (j * dy - p.sourceY));
      }
    } else {
      const ys = p.source === 'pair' ? [p.sourceY - p.sourceSeparation / 2, p.sourceY + p.sourceSeparation / 2] : [p.sourceY];
      ys.forEach((y, index) => {
        this.sourceIndices.push(Math.round(clamp(y, 0, HEIGHT) / dy) * nx + column);
        this.sourcePhases.push(p.source === 'pair' ? index * p.phase * RAD : p.phase * RAD);
      });
    }
    this.updateWarnings();
  }

  private updateWarnings() {
    const p = this.parameters;
    const cell = Math.max(this.grid.dx, this.grid.dy);
    this.warnings = [];
    const points = p.speed / p.frequency / cell;
    if (points < 12) this.warnings.push(`Longueur d’onde peu résolue : ${points.toFixed(1)} cellules par λ ; viser au moins 12.`);
    if ((p.obstacle === 'slit' || p.obstacle === 'double') && p.aperture / this.grid.dy < 6) this.warnings.push(`Ouverture peu résolue : ${(p.aperture / this.grid.dy).toFixed(1)} cellules ; viser au moins 6.`);
    if (p.obstacle === 'double' && p.aperture >= p.separation) this.warnings.push('Ouvertures en contact ou chevauchantes : elles forment une ouverture unique.');
    if (this.sourceIndices.some(k => this.mask[k])) this.warnings.push('Une partie de la source se trouve dans un obstacle et ne peut pas émettre.');
    if (p.source === 'plane' && Math.abs(p.sourceAngle) > 60) this.warnings.push('L’incidence très oblique est sensible aux bords et à la dispersion numérique.');
    if (p.boundary === 'absorbing') this.warnings.push('Bords : couche dissipative progressive (sponge), avec réflexions résiduelles ; aucune PML.');
  }

  private clearMeasurement() {
    this.amplitude.fill(0);
    this.intensity.fill(0);
    this.phase.fill(NaN);
    this.sumCos.fill(0);
    this.sumSin.fill(0);
    this.snapshots.fill(0);
    this.sampleIndex = 0;
    this.sampleCount = 0;
    this.sampleOrigin = this.time;
    this.nextSampleTime = this.time + 1 / (this.parameters.frequency * SAMPLES);
    this.measurementReady = false;
  }

  reset() {
    this.time = 0;
    this.field.fill(0);
    this.previous.fill(0);
    this.next.fill(0);
    this.clearMeasurement();
  }

  /** A resolution change creates a new grid and explicitly restarts physical time. */
  updateParameters(partial: Partial<Parameters>) {
    const old = this.parameters;
    this.parameters = { ...old, ...partial };
    try { this.sanitizeParameters(); } catch (error) { this.parameters = old; throw error; }
    if (old.resolution !== this.parameters.resolution) {
      this.allocate();
      this.reset();
      return;
    }
    const previousDt = this.grid.dt;
    this.grid.dt = 0.8 / (this.parameters.speed * Math.sqrt(1 / this.grid.dx ** 2 + 1 / this.grid.dy ** 2));
    if (previousDt !== this.grid.dt) {
      const ratio = this.grid.dt / previousDt;
      for (let k = 0; k < this.field.length; k++) this.previous[k] = this.field[k] - (this.field[k] - this.previous[k]) * ratio;
    }
    this.configureGeometry();
    this.clearMeasurement();
  }

  step(count = 1) {
    const { nx, ny, dx, dy, dt } = this.grid;
    const p = this.parameters;
    const rx = (p.speed * dt / dx) ** 2;
    const ry = (p.speed * dt / dy) ** 2;
    const steps = Math.max(0, Math.floor(count));
    for (let step = 0; step < steps; step++) {
      const u = this.field;
      const prev = this.previous;
      const next = this.next;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          if (this.mask[k]) { next[k] = 0; continue; }
          const value = u[k];
          // Mirroring a fluid cell at a solid face gives zero normal derivative.
          const left = i > 0 && !this.mask[k - 1] ? u[k - 1] : value;
          const right = i + 1 < nx && !this.mask[k + 1] ? u[k + 1] : value;
          const down = j > 0 && !this.mask[k - nx] ? u[k - nx] : value;
          const up = j + 1 < ny && !this.mask[k + nx] ? u[k + nx] : value;
          const damping = this.damping[k] * dt;
          next[k] = (2 * value - (1 - damping) * prev[k] + rx * (left + right - 2 * value) + ry * (down + up - 2 * value)) / (1 + damping);
        }
      }
      const nextTime = this.time + dt;
      if (p.sourceEnabled) {
        // Smooth turn-on avoids an unphysical impulse. A prescribed line emits to both sides;
        // its useful incident wave travels toward +x on the right of the source.
        const ramp = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, nextTime * p.frequency));
        const omegaTime = TAU * p.frequency * nextTime;
        for (let s = 0; s < this.sourceIndices.length; s++) {
          const k = this.sourceIndices[s];
          if (!this.mask[k]) next[k] = ramp * p.amplitude * Math.sin(omegaTime + this.sourcePhases[s]);
        }
      }
      // Interpolate at exact T/32 timestamps, rather than treating 32 solver steps as a period.
      while (this.nextSampleTime <= nextTime + 1e-12) {
        const alpha = clamp((this.nextSampleTime - this.time) / dt, 0, 1);
        this.captureMeasurement(u, next, alpha);
      }
      this.previous = u;
      this.field = next;
      this.next = prev;
      this.time = nextTime;
    }
  }

  private captureMeasurement(before: Float32Array, after: Float32Array, alpha: number) {
    const size = this.field.length;
    const slot = this.sampleIndex % SAMPLES;
    const offset = slot * size;
    const omega = TAU * this.parameters.frequency;
    const angle = omega * this.nextSampleTime;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    // The replaced sample is exactly one period old: its sine/cosine are identical.
    for (let k = 0; k < size; k++) {
      const value = before[k] + (after[k] - before[k]) * alpha;
      const difference = value - this.snapshots[offset + k];
      this.snapshots[offset + k] = value;
      this.sumCos[k] += difference * cosine;
      this.sumSin[k] += difference * sine;
    }
    this.sampleIndex++;
    this.sampleCount = Math.min(SAMPLES, this.sampleCount + 1);
    this.nextSampleTime = this.sampleOrigin + (this.sampleIndex + 1) / (this.parameters.frequency * SAMPLES);
    this.measurementReady = this.sampleCount === SAMPLES;
    if (!this.measurementReady || this.sampleIndex % 4 !== 0) return;
    const sourceSquared = this.parameters.amplitude ** 2;
    const threshold = Math.max(1e-10, this.parameters.amplitude * 1e-5);
    for (let k = 0; k < size; k++) {
      const c = this.sumCos[k] * 2 / SAMPLES;
      const s = this.sumSin[k] * 2 / SAMPLES;
      const amplitude = this.mask[k] ? 0 : Math.hypot(c, s);
      this.amplitude[k] = amplitude;
      this.intensity[k] = sourceSquared > 0 ? amplitude ** 2 / sourceSquared : 0;
      this.phase[k] = amplitude > threshold ? Math.atan2(c, s) : NaN;
    }
  }

  sampleAt(x: number, y: number): ProbeReading {
    const { nx, dx, dy, width, height } = this.grid;
    const px = clamp(x, 0, width);
    const py = clamp(y, 0, height);
    // Nearest fluid grid node: the discretization error is explicit, with no solid blending.
    const k = Math.round(py / dy) * nx + Math.round(px / dx);
    return { x: px, y: py, displacement: this.field[k], amplitude: this.amplitude[k],
      intensity: this.intensity[k], phase: Number.isFinite(this.phase[k]) ? this.phase[k] : null,
      solid: Boolean(this.mask[k]) };
  }

  /** Useful for controlled source-free numerical experiments (SI displacement and velocity). */
  setInitialCondition(displacement: (x: number, y: number) => number, velocity: (x: number, y: number) => number = () => 0) {
    this.reset();
    const { nx, ny, dx, dy, dt } = this.grid;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      this.field[k] = this.mask[k] ? 0 : displacement(i * dx, j * dy);
    }
    const c2dt2 = this.parameters.speed ** 2 * dt ** 2;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (this.mask[k]) continue;
      const center = this.field[k];
      const left = i > 0 && !this.mask[k - 1] ? this.field[k - 1] : center;
      const right = i + 1 < nx && !this.mask[k + 1] ? this.field[k + 1] : center;
      const down = j > 0 && !this.mask[k - nx] ? this.field[k - nx] : center;
      const up = j + 1 < ny && !this.mask[k + nx] ? this.field[k + nx] : center;
      const laplacian = (left + right - 2 * center) / dx ** 2 + (down + up - 2 * center) / dy ** 2;
      this.previous[k] = center - dt * velocity(i * dx, j * dy) + 0.5 * c2dt2 * laplacian;
    }
  }
}
