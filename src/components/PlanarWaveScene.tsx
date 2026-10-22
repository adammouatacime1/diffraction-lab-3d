import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import type { ProbePosition } from '../types';
import type { WaveEngine } from '../physics/WaveEngine';
import type { WaveSceneProps } from './WaveScene';
import { angleOverlay } from '../physics/thetaOverlay';
import { getVisualSnapshot } from '../physics/visualSnapshot';
import type { VisualSnapshot } from '../physics/visualSnapshot';

export interface PlanarWaveSceneProps extends WaveSceneProps {
  showWavefronts?: boolean;
  onMoveProbe?: (index: number, point: ProbePosition) => void;
  ruler?: ProbePosition[];
  section?: ProbePosition[];
}
interface MapBounds { left: number; top: number; width: number; height: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const TAU = 2 * Math.PI;
const LOW = [23, 99, 173], ZERO = [172, 210, 220], HIGH = [246, 169, 126], EMPTY = [16, 35, 66];

function mapBounds(width: number, height: number, engine: WaveEngine | VisualSnapshot): MapBounds {
  const availableWidth = Math.max(1, width - 58), availableHeight = Math.max(1, height - 84);
  const scale = Math.min(availableWidth / engine.grid.width, availableHeight / engine.grid.height);
  const fieldWidth = engine.grid.width * scale, fieldHeight = engine.grid.height * scale;
  return { left: 38 + (availableWidth - fieldWidth) / 2, top: 37 + (availableHeight - fieldHeight) / 2, width: fieldWidth, height: fieldHeight };
}

/** This is an actual plane of the solver's SI pressure samples, not a top-down WebGL camera. */
export function PlanarWaveScene(props: PlanarWaveSceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props); latest.current = props;
  const bounds = useRef<MapBounds>({ left: 0, top: 0, width: 1, height: 1 });
  const hover = useRef<ProbePosition | null>(null);
  const drag = useRef<{ index: number; pointer: number; moved: boolean } | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element || props.active === false) return;
    const context = element.getContext('2d', { alpha: false });
    if (!context) return;
    props.onCanvasReady?.(element);
    const raster = document.createElement('canvas');
    const rasterContext = raster.getContext('2d');
    if (!rasterContext) return;
    let pixels: ImageData | null = null;
    const crossings = new Float64Array(8);
    let frame = 0, stopped = false;
    let viewRect = element.getBoundingClientRect();
    const draw = (frameTimestamp: number) => {
      if (stopped) return;
      const p = latest.current, engine = getVisualSnapshot(p.engine, frameTimestamp), g = engine.grid;
      const rect = viewRect, ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== Math.round(rect.width * ratio) || element.height !== Math.round(rect.height * ratio)) {
        element.width = Math.max(1, Math.round(rect.width * ratio)); element.height = Math.max(1, Math.round(rect.height * ratio));
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const box = mapBounds(rect.width, rect.height, engine); bounds.current = box;
      const xy = (point: ProbePosition) => ({ x: box.left + point.x / g.width * box.width, y: box.top + point.y / g.height * box.height });
      context.fillStyle = p.dark ? '#162a38' : '#e8f1f7'; context.fillRect(0, 0, rect.width, rect.height);
      if (raster.width !== g.nx || raster.height !== g.ny || !pixels) {
        raster.width = g.nx; raster.height = g.ny; pixels = rasterContext.createImageData(g.nx, g.ny);
      }
      const bytes = pixels.data, source = Math.max(engine.parameters.amplitude, 1e-10);
      for (let index = 0; index < engine.field.length; index++) {
        const offset = index * 4;
        if (engine.mask[index]) { bytes[offset] = 17; bytes[offset + 1] = 38; bytes[offset + 2] = 56; }
        else {
          let low: number[], high: number[], blend: number;
          if (p.display === 'displacement') {
            const value = clamp(engine.field[index] / source, -1, 1);
            low = ZERO; high = value < 0 ? LOW : HIGH; blend = Math.pow(Math.abs(value), 0.72);
          } else {
            const value = clamp(p.display === 'amplitude' ? engine.amplitude[index] / source : p.display === 'rms' ? engine.rms[index] / (source / Math.SQRT2) : engine.intensity[index], 0, 1);
            if (value < 0.42) { low = EMPTY; high = ZERO; blend = Math.min(1, value * 2.25); }
            else { low = ZERO; high = HIGH; blend = (value - 0.42) / 0.58; }
          }
          bytes[offset] = low[0] + (high[0] - low[0]) * blend;
          bytes[offset + 1] = low[1] + (high[1] - low[1]) * blend;
          bytes[offset + 2] = low[2] + (high[2] - low[2]) * blend;
        }
        bytes[offset + 3] = 255;
      }
      rasterContext.putImageData(pixels, 0, 0);
      // Node-centered pixels occupy ±dx/2 (or ±dy/2), exactly like the 3D mask faces.
      const cellWidth = g.dx / g.width * box.width, cellHeight = g.dy / g.height * box.height;
      context.save(); context.beginPath(); context.rect(box.left, box.top, box.width, box.height); context.clip();
      context.imageSmoothingEnabled = false;
      context.drawImage(raster, box.left - cellWidth / 2, box.top - cellHeight / 2, box.width + cellWidth, box.height + cellHeight);
      context.restore();
      context.strokeStyle = p.dark ? '#839cab' : '#688595'; context.lineWidth = 1;
      context.strokeRect(box.left, box.top, box.width, box.height);
      // Fixed physical rules and coordinates stay outside the field rectangle.
      context.fillStyle = p.dark ? '#a8bfcc' : '#5b7787'; context.font = '9px system-ui, sans-serif';
      context.textAlign = 'center';
      for (let x = 0; x <= g.width + 0.001; x += 0.1) {
        const px = xy({ x, y: 0 }).x, major = Math.round(x * 10) % 5 === 0;
        context.beginPath(); context.moveTo(px, box.top + box.height); context.lineTo(px, box.top + box.height + (major ? 7 : 4)); context.stroke();
        if (major) context.fillText(x.toFixed(1).replace('.', ','), px, box.top + box.height + 20);
      }
      context.fillText('x (m)', box.left + box.width - 10, box.top + box.height + 33);
      context.textAlign = 'right';
      for (let y = 0; y <= g.height + 0.001; y += 0.2) {
        const py = xy({ x: 0, y }).y; context.beginPath(); context.moveTo(box.left - 5, py); context.lineTo(box.left, py); context.stroke();
        if (Math.round(y * 10) % 4 === 0) context.fillText(y.toFixed(1).replace('.', ','), box.left - 9, py + 3);
      }
      context.textAlign = 'left'; context.fillText('y (m)', Math.max(3, box.left - 33), box.top - 10);

      context.save(); context.beginPath(); context.rect(box.left, box.top, box.width, box.height); context.clip();
      if (p.showWavefronts) {
        // Instantaneous zero-pressure contours trace phase fronts. They are not
        // zero-amplitude zones; unreached/very weak cells are omitted explicitly.
        context.strokeStyle = p.dark ? '#ffffffa0' : '#ffffffc5'; context.lineWidth = 1; context.beginPath();
        for (let y = 0; y < g.ny - 1; y++) for (let x = 0; x < g.nx - 1; x++) {
          const k = y * g.nx + x;
          if (engine.mask[k] || engine.mask[k + 1] || engine.mask[k + g.nx] || engine.mask[k + g.nx + 1]) continue;
          const a = engine.field[k], b = engine.field[k + 1], c = engine.field[k + g.nx + 1], d = engine.field[k + g.nx];
          if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) < source * 0.025) continue;
          const left = box.left + x * cellWidth, top = box.top + y * cellHeight;
          let count = 0;
          if ((a >= 0) !== (b >= 0)) { crossings[count++] = left + cellWidth * a / (a - b); crossings[count++] = top; }
          if ((b >= 0) !== (c >= 0)) { crossings[count++] = left + cellWidth; crossings[count++] = top + cellHeight * b / (b - c); }
          if ((c >= 0) !== (d >= 0)) { crossings[count++] = left + cellWidth * (1 - c / (c - d)); crossings[count++] = top + cellHeight; }
          if ((d >= 0) !== (a >= 0)) { crossings[count++] = left; crossings[count++] = top + cellHeight * (1 - d / (d - a)); }
          for (let n = 0; n + 3 < count; n += 4) { context.moveTo(crossings[n], crossings[n + 1]); context.lineTo(crossings[n + 2], crossings[n + 3]); }
        }
        context.stroke();
      }
      const sourcePositions = engine.parameters.source === 'pair' ? [engine.parameters.sourceY - engine.parameters.sourceSeparation / 2, engine.parameters.sourceY + engine.parameters.sourceSeparation / 2] : [engine.parameters.sourceY];
      context.strokeStyle = engine.parameters.sourceEnabled ? '#f7be66' : '#7c8e99'; context.lineWidth = 2.5;
      if (engine.parameters.source === 'plane') { const a = xy({ x: engine.parameters.sourceX, y: 0 }), b = xy({ x: engine.parameters.sourceX, y: g.height }); context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke(); }
      else sourcePositions.forEach(y => { const point = xy({ x: engine.parameters.sourceX, y }); context.beginPath(); context.arc(point.x, point.y, 5, 0, TAU); context.stroke(); });

      if (p.huygens && p.huygensStep > 1 && p.huygensStep < 7 && (engine.parameters.obstacle === 'slit' || engine.parameters.obstacle === 'double')) {
        const centers = engine.parameters.obstacle === 'double' ? [engine.parameters.obstacleY - engine.parameters.separation / 2, engine.parameters.obstacleY + engine.parameters.separation / 2] : [engine.parameters.obstacleY];
        context.strokeStyle = '#ffb33199'; context.fillStyle = '#ffb331'; context.lineWidth = 1;
        const count = Math.max(2, Math.floor(p.secondaryCount / centers.length)), wavelength = engine.parameters.speed / engine.parameters.frequency;
        centers.forEach(center => {
          for (let n = 0; n < count; n++) {
            const point = { x: engine.parameters.obstacleX + Math.max(0.0175, g.dx) + 2 * g.dx, y: center + engine.parameters.aperture * ((n + 0.5) / count - 0.5) };
            if (point.x >= g.width || point.y < 0 || point.y > g.height || engine.sampleAt(point.x, point.y).solid) continue;
            const screen = xy(point), reading = engine.sampleAt(point.x, point.y);
            context.beginPath(); context.arc(screen.x, screen.y, 2.4, 0, TAU); context.fill();
            if (p.huygensStep >= 4 && engine.measurementReady && reading.phase !== null) {
              const cycle = ((engine.parameters.frequency * engine.time + reading.phase / TAU - 0.25) % 1 + 1) % 1;
              for (let ring = 0; ring < 3; ring++) { const radius = wavelength * (cycle + ring) / g.width * box.width; context.beginPath(); context.arc(screen.x, screen.y, radius, 0, TAU); context.stroke(); }
            }
          }
        });
      }
      if (engine.measurementReady && (p.showNodes || p.showMaxima)) {
        for (let y = 2; y < g.ny - 2; y += 3) for (let x = 2; x < g.nx - 2; x += 3) {
          const k = y * g.nx + x; if (engine.mask[k]) continue; const amplitude = engine.amplitude[k], point = xy({ x: x * g.dx, y: y * g.dy });
          if (p.showNodes && amplitude < p.nodeThreshold * source) { context.fillStyle = '#e8daff'; context.fillRect(point.x, point.y, 1.5, 1.5); }
          if (p.showMaxima && amplitude > 0.18 * source && amplitude > engine.amplitude[k - 2] && amplitude >= engine.amplitude[k + 2] && amplitude > engine.amplitude[k - 2 * g.nx] && amplitude >= engine.amplitude[k + 2 * g.nx]) { context.fillStyle = '#ffe7a8'; context.beginPath(); context.arc(point.x, point.y, 2, 0, TAU); context.fill(); }
        }
      }
      const line = (points: ProbePosition[] | undefined, color: string) => {
        if (!points?.length) return; context.strokeStyle = color; context.lineWidth = 1.5; context.setLineDash([5, 4]); context.beginPath();
        points.forEach((point, index) => { const screen = xy(point); if (index) context.lineTo(screen.x, screen.y); else context.moveTo(screen.x, screen.y); }); context.stroke(); context.setLineDash([]);
        points.forEach(point => { const screen = xy(point); context.fillStyle = color; context.beginPath(); context.arc(screen.x, screen.y, 3.5, 0, TAU); context.fill(); });
      };
      line(p.ruler, '#f7bc64'); line(p.section, '#fff');
      if (p.showTheta) {
        const angle = angleOverlay(engine.parameters, g, p.thetaMode, p.thetaObservationAngle);
        if (angle.ready) { line([angle.origin, angle.axisEnd], '#ffffff'); angle.rays.forEach(ray => line([angle.origin, ray.end], '#ffb331')); const point = xy(angle.origin); context.fillStyle = '#fff3c4'; context.font = 'bold 12px system-ui, sans-serif'; context.fillText(`θ = ${angle.angleDegrees.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}°`, point.x + 13, point.y - 12); }
      }
      context.restore();
      p.probes.forEach((probe, index) => {
        const point = xy(probe), color = index === 0 ? '#218dba' : '#c65353';
        context.fillStyle = p.dark ? '#12222f' : '#fff'; context.strokeStyle = color; context.lineWidth = 2;
        context.beginPath(); context.arc(point.x, point.y, 7, 0, TAU); context.fill(); context.stroke();
        context.fillStyle = color; context.font = 'bold 11px system-ui, sans-serif'; context.textAlign = 'left'; context.fillText(`M${index + 1}`, point.x + 10, point.y - 8);
      });
      if (hover.current) {
        const reading = engine.sampleAt(hover.current.x, hover.current.y);
        context.fillStyle = p.dark ? '#dce7ee' : '#243b49'; context.font = '10px system-ui, sans-serif'; context.textAlign = 'left';
        context.fillText(`x ${hover.current.x.toFixed(2)} m · y ${hover.current.y.toFixed(2)} m · ${reading.solid ? 'obstacle' : `p′ ${reading.displacement.toFixed(3)} Pa`}`, 12, rect.height - 7);
      } else if (p.showWavefronts) {
        context.fillStyle = p.dark ? '#a8bfcc' : '#5b7787'; context.font = '9px system-ui, sans-serif'; context.textAlign = 'left';
        context.fillText('Fronts : p′ = 0 instantané (phase), pas amplitude nulle', 12, rect.height - 7);
      }
      element.dataset.physicalTime = String(engine.time);
      element.dataset.grid = `${g.nx}x${g.ny}`;
      frame = requestAnimationFrame(draw);
    };
    const resize = new ResizeObserver(() => { viewRect = element.getBoundingClientRect(); }); resize.observe(element);
    frame = requestAnimationFrame(draw);
    return () => { stopped = true; cancelAnimationFrame(frame); resize.disconnect(); element.style.touchAction = 'pan-y'; raster.width = raster.height = 0; };
  }, [props.engine, props.active]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): ProbePosition | null => {
    const rect = event.currentTarget.getBoundingClientRect(), box = bounds.current;
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (x < box.left || x > box.left + box.width || y < box.top || y > box.top + box.height) return null;
    return { x: (x - box.left) / box.width * props.engine.grid.width, y: (y - box.top) / box.height * props.engine.grid.height };
  };
  const release = (event: PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (drag.current) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; event.currentTarget.style.touchAction = 'pan-y'; return; }
    const point = pointFromEvent(event); if (!cancelled && point) props.onPick(point);
  };
  return <canvas ref={canvas} className="planar-wave-canvas" role="img" aria-label="Carte plane 2D de la pression acoustique : surpression et dépression, obstacles et microphones virtuels" onPointerDown={event => {
    const point = pointFromEvent(event); if (!point || !props.onMoveProbe) return;
    const box = bounds.current;
    const index = props.probes.findIndex(probe => Math.hypot((probe.x - point.x) / props.engine.grid.width * box.width, (probe.y - point.y) / props.engine.grid.height * box.height) < 14);
    if (index >= 0) { drag.current = { index, pointer: event.pointerId, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.style.touchAction = 'none'; }
  }} onPointerMove={event => {
    const point = pointFromEvent(event); hover.current = point;
    if (point && drag.current && !props.engine.sampleAt(point.x, point.y).solid) { drag.current.moved = true; props.onMoveProbe?.(drag.current.index, point); }
  }} onPointerUp={event => release(event)} onPointerCancel={event => release(event, true)} onPointerLeave={() => { hover.current = null; }}/>
}
