import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { WaveEngine } from '../physics/WaveEngine';
import { WaveScene } from './WaveScene';
import { PlanarWaveScene } from './PlanarWaveScene';
import type { PlanarWaveSceneProps } from './PlanarWaveScene';

export type AcousticView = '2d' | '3d' | 'split';
export interface AcousticViewsProps extends PlanarWaveSceneProps {
  view: AcousticView;
  showWavefronts: boolean;
}
const engineIdentifiers = new WeakMap<WaveEngine, number>();
let nextEngineIdentifier = 1;
function engineIdentifier(engine: WaveEngine) {
  let value = engineIdentifiers.get(engine);
  if (!value) { value = nextEngineIdentifier++; engineIdentifiers.set(engine, value); }
  return value;
}

/** Both renderers receive the exact same engine; neither owns a solver or a clock. */
export function AcousticViews({ view, ...props }: AcousticViewsProps) {
  const id = useId();
  const planarCanvas = useRef<HTMLCanvasElement | null>(null), spatialCanvas = useRef<HTMLCanvasElement | null>(null);
  const latest = useRef({ view, onCanvasReady: props.onCanvasReady }); latest.current = { view, onCanvasReady: props.onCanvasReady };
  const planarReady = useCallback((canvas: HTMLCanvasElement) => {
    planarCanvas.current = canvas;
    if (latest.current.view !== '3d') latest.current.onCanvasReady?.(canvas);
  }, []);
  const spatialReady = useCallback((canvas: HTMLCanvasElement) => {
    spatialCanvas.current = canvas;
    if (latest.current.view === '3d') latest.current.onCanvasReady?.(canvas);
  }, []);
  // Split exports use the plane; reselect its still-mounted canvas after leaving 3D.
  useEffect(() => {
    const selected = view === '3d' ? spatialCanvas.current : planarCanvas.current;
    if (selected?.isConnected) props.onCanvasReady?.(selected);
  }, [view, props.onCanvasReady]);
  // R3F initializes WebGL asynchronously. Detect unsupported contexts before mounting
  // it, while the Canvas 2D path never creates or probes a WebGL context.
  const webgl = useMemo(() => {
    if (view === '2d') return null;
    const probe = document.createElement('canvas');
    try {
      const context = probe.getContext('webgl2') ?? probe.getContext('webgl');
      if (!context) return false;
      context.getExtension('WEBGL_lose_context')?.loseContext();
      probe.width = probe.height = 0;
      return true;
    } catch { return false; }
  }, [view]);
  const engineId = `pressure-${engineIdentifier(props.engine)}`;
  const fallback = <div className="acoustic-webgl-fallback"><p role="status">WebGL indisponible : la carte de pression 2D reste utilisable.</p><PlanarWaveScene {...props} onCanvasReady={spatialReady}/></div>;
  return <div className={`acoustic-views acoustic-views-${view}`} data-shared-engine={engineId}>
    {(view === '2d' || view === 'split') && <section className="acoustic-view acoustic-view-2d" data-view="2d" data-engine-id={engineId} data-physical-time={props.engine.time} aria-labelledby={`${id}-2d`}>
      <h3 className="acoustic-view-title" id={`${id}-2d`}>Vue 2D · carte de pression</h3>
      <PlanarWaveScene {...props} onCanvasReady={planarReady}/>
    </section>}
    {(view === '3d' || view === 'split') && <section className="acoustic-view acoustic-view-3d" data-view="3d" data-engine-id={engineId} data-physical-time={props.engine.time} aria-labelledby={`${id}-3d`}>
      <h3 className="acoustic-view-title" id={`${id}-3d`}>Vue 3D · relief de pression</h3>
      {webgl ? <WaveScene {...props} fallback={fallback} onCanvasReady={spatialReady}/> : fallback}
    </section>}
  </div>;
}
