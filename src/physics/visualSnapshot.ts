import type { Grid, Parameters, ProbeReading } from '../types';
import type { WaveEngine } from './WaveEngine';

/** Read-only by convention, valid for the current browser frame only.
 * The arrays are reused on the next frame; this is not a second solver. */
export interface VisualSnapshot {
  parameters: Parameters;
  grid: Grid;
  field: Float32Array;
  amplitude: Float32Array;
  intensity: Float32Array;
  phase: Float32Array;
  rms: Float32Array;
  mask: Uint8Array;
  time: number;
  measurementReady: boolean;
  sampleAt: (x: number, y: number) => ProbeReading;
}
interface CachedFrame { timestamp: number; snapshot: VisualSnapshot }
const frames = new WeakMap<WaveEngine, CachedFrame>();
interface VisualGroup { engines: WaveEngine[]; timestamp: number | null }
const groups = new WeakMap<WaveEngine, VisualGroup>();

/** Comparison configurations must also be sampled on the same side of the physics RAF.
 * The owner releases this group when comparison ends or the laboratory unmounts. */
export function linkVisualEngines(engines: readonly WaveEngine[]): () => void {
  const group: VisualGroup = { engines: [...new Set(engines)].filter(engine => engine.parameters.medium === 'sound'), timestamp: null };
  for (const engine of group.engines) groups.set(engine, group);
  return () => {
    for (const engine of group.engines) if (groups.get(engine) === group) groups.delete(engine);
    group.engines.length = 0;
  };
}

function allocate(engine: WaveEngine): VisualSnapshot {
  return {
    parameters: { ...engine.parameters }, grid: { ...engine.grid },
    field: new Float32Array(engine.field.length), amplitude: new Float32Array(engine.field.length),
    intensity: new Float32Array(engine.field.length), phase: new Float32Array(engine.field.length),
    rms: new Float32Array(engine.field.length), mask: new Uint8Array(engine.mask.length),
    time: engine.time, measurementReady: engine.measurementReady,
    sampleAt(x, y) {
      const px = Math.max(0, Math.min(this.grid.width, x)), py = Math.max(0, Math.min(this.grid.height, y));
      const index = Math.round(py / this.grid.dy) * this.grid.nx + Math.round(px / this.grid.dx);
      return { x: px, y: py, displacement: this.field[index], amplitude: this.amplitude[index],
        intensity: this.intensity[index], rms: this.rms[index], solid: Boolean(this.mask[index]),
        phase: Number.isFinite(this.phase[index]) ? this.phase[index] : null };
    },
  };
}

/**
 * All RAF callbacks in one rendering cycle receive this same document-timeline
 * timestamp, even when the physics RAF runs between the Canvas and R3F callbacks.
 */
export function visualFrameTimestamp(): number {
  return typeof document !== 'undefined' && typeof document.timeline?.currentTime === 'number'
    ? document.timeline.currentTime : performance.now();
}

/** Freeze one sound-field/time pair for both renderers for one browser frame.
 * Water keeps the original engine object and its original rendering path.
 * Copies allocate only once per engine/grid size and are released with the engine
 * through the WeakMap. No worker, animation callback, timer or listener is created.
 */
function copyFrame(engine: WaveEngine, timestamp: number): VisualSnapshot {
  let frame = frames.get(engine);
  if (!frame || frame.snapshot.field.length !== engine.field.length) {
    frame = { timestamp, snapshot: allocate(engine) }; frames.set(engine, frame);
  } else frame.timestamp = timestamp;
  const snapshot = frame.snapshot;
  Object.assign(snapshot.parameters, engine.parameters); Object.assign(snapshot.grid, engine.grid);
  snapshot.time = engine.time; snapshot.measurementReady = engine.measurementReady;
  snapshot.field.set(engine.field); snapshot.amplitude.set(engine.amplitude);
  snapshot.intensity.set(engine.intensity); snapshot.phase.set(engine.phase);
  snapshot.rms.set(engine.rms); snapshot.mask.set(engine.mask);
  return snapshot;
}

export function getVisualSnapshot(engine: WaveEngine, timestamp?: number): VisualSnapshot {
  if (engine.parameters.medium !== 'sound') return engine;
  timestamp ??= visualFrameTimestamp();
  const group = groups.get(engine);
  if (group && group.timestamp !== timestamp) {
    group.timestamp = timestamp;
    for (const member of group.engines) copyFrame(member, timestamp);
  }
  const frame = frames.get(engine);
  return frame?.timestamp === timestamp ? frame.snapshot : copyFrame(engine, timestamp);
}
