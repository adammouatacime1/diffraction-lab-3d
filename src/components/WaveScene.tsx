import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { WaveEngine } from '../physics/WaveEngine';
import type { CameraView, DisplayField, ProbePosition } from '../types';
import { angleOverlay, type ThetaMode } from '../physics/thetaOverlay';

export interface WaveSceneProps {
  engine: WaveEngine;
  display: DisplayField;
  camera: CameraView;
  zoomEnabled: boolean;
  showTheta: boolean;
  thetaMode: ThetaMode;
  thetaObservationAngle: number;
  exaggeration: number;
  huygens: boolean;
  huygensStep: number;
  secondaryCount: number;
  showNodes: boolean;
  nodeThreshold: number;
  showMaxima: boolean;
  probes: ProbePosition[];
  onPick: (point: ProbePosition) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  dark: boolean;
}

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const FIELD_COLORS = {
  low: new THREE.Color('#1763ad'),
  zero: new THREE.Color('#acd2dc'),
  high: new THREE.Color('#f6a97e'),
  empty: new THREE.Color('#102342'),
  solid: new THREE.Color('#112638'),
};

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <CanvasFallback />;
    return this.props.children;
  }
}

function CanvasFallback() {
  return <div role="status" style={{ padding: 40, color: '#c8dae8', textAlign: 'center' }}>
    <strong>La vue 3D nécessite WebGL.</strong>
    <p>Activez l’accélération graphique de votre navigateur, puis rechargez la page.</p>
  </div>;
}

function CameraControls({ view, zoomEnabled }: { view: CameraView; zoomEnabled: boolean }) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const destination = useRef(new THREE.Vector3(2.05, 2.4, 2.5));
  const desiredUp = useRef(new THREE.Vector3(0, 1, 0));
  const transitioning = useRef(false);
  const initialized = useRef(false);
  const reduceMotion = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduceMotion.current = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    camera.up.set(0, 1, 0);
    const instance = new OrbitControls(camera, gl.domElement);
    controls.current = instance;
    instance.enableDamping = true;
    instance.dampingFactor = 0.075;
    instance.minDistance = 1.25;
    instance.maxDistance = 8;
    instance.maxPolarAngle = Math.PI * 0.49;
    instance.enablePan = true;
    instance.target.set(0, 0, 0);
    return () => { instance.dispose(); controls.current = null; };
  }, [camera, gl]);
  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    // Return wheel and vertical touch gestures to the page until zoom is chosen.
    instance.enableZoom = zoomEnabled;
    instance.touches.ONE = zoomEnabled ? THREE.TOUCH.ROTATE : undefined;
    instance.touches.TWO = zoomEnabled ? THREE.TOUCH.DOLLY_PAN : undefined;
    gl.domElement.style.touchAction = zoomEnabled ? 'none' : 'pan-y';
  }, [zoomEnabled, gl]);
  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const aspect = size.width / Math.max(size.height, 1);
    desiredUp.current.set(0, 1, 0);
    if (view === 'top') {
      // Fit both the tank and its ruler, including narrow/mobile viewports.
      const tangent = Math.tan(THREE.MathUtils.degToRad(38 / 2));
      const distance = Math.max(1.99 / (2 * tangent), 3.15 / (2 * tangent * aspect)) * 1.04;
      destination.current.set(0, distance, 0.0001);
      desiredUp.current.set(0, 0, -1);
    } else if (view === 'profile') {
      destination.current.set(0, 0.19, 3.35 * Math.max(1, 1.45 / aspect));
    } else {
      destination.current.set(2.05, 2.4, 2.5).multiplyScalar(Math.max(1, 1.45 / aspect));
    }
    instance.enableRotate = view === 'free' || view === 'iso';
    if (!initialized.current || reduceMotion.current) {
      camera.position.copy(destination.current);
      camera.up.copy(desiredUp.current);
      instance.target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
      transitioning.current = false;
      instance.enabled = true;
      instance.enableDamping = true;
      instance.update();
    } else {
      // Orbit interaction resumes as soon as the short transition settles.
      instance.enabled = false;
      instance.enableDamping = false;
      transitioning.current = true;
    }
    initialized.current = true;
    invalidate();
  }, [view, camera, gl, size.width, size.height, invalidate]);
  useFrame((_, delta) => {
    const instance = controls.current;
    if (!instance) return;
    if (transitioning.current) {
      const alpha = reduceMotion.current ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 10);
      camera.position.lerp(destination.current, alpha);
      camera.up.lerp(desiredUp.current, alpha).normalize();
      instance.target.lerp(new THREE.Vector3(), alpha);
      camera.lookAt(instance.target);
      if (camera.position.distanceToSquared(destination.current) < 0.000004 && camera.up.distanceToSquared(desiredUp.current) < 0.000004) {
        camera.position.copy(destination.current);
        camera.up.copy(desiredUp.current);
        instance.target.set(0, 0, 0);
        transitioning.current = false;
        instance.enabled = true;
        instance.enableDamping = true;
      }
    }
    instance.update();
  });
  return null;
}

function FieldSurface({ engine, display, exaggeration, onPick }: Pick<WaveSceneProps, 'engine' | 'display' | 'exaggeration' | 'onPick'>) {
  const { nx, ny, width, height, dx, dy } = engine.grid;
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    const positions = new Float32Array(nx * ny * 3);
    const colors = new Float32Array(nx * ny * 3);
    const normals = new Float32Array(nx * ny * 3);
    const indices = new Uint32Array((nx - 1) * (ny - 1) * 6);
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        positions[i * 3] = x * dx - width / 2;
        positions[i * 3 + 2] = y * dy - height / 2;
        normals[i * 3 + 1] = 1;
      }
    }
    let offset = 0;
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const a = y * nx + x;
        indices.set([a, a + nx, a + 1, a + 1, a + nx, a + nx + 1], offset);
        offset += 6;
      }
    }
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    result.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
    result.setIndex(new THREE.BufferAttribute(indices, 1));
    result.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.8);
    return result;
  }, [nx, ny, width, height, dx, dy]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = geometry.attributes.color as THREE.BufferAttribute;
    const normals = geometry.attributes.normal as THREE.BufferAttribute;
    const field = engine.field;
    const sourceAmplitude = Math.max(engine.parameters.amplitude, 1e-10);
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        const solid = engine.mask[i] !== 0;
        const eta = solid ? 0 : field[i];
        positions.setY(i, eta * exaggeration);
        if (solid) {
          color.copy(FIELD_COLORS.solid);
        } else if (display === 'displacement') {
          const value = clamp(eta / sourceAmplitude, -1, 1);
          color.copy(FIELD_COLORS.zero).lerp(value < 0 ? FIELD_COLORS.low : FIELD_COLORS.high, Math.pow(Math.abs(value), 0.72));
        } else {
          const ratio = display === 'amplitude'
            ? engine.amplitude[i] / sourceAmplitude
            : engine.intensity[i];
          const value = clamp(ratio, 0, 1);
          color.copy(FIELD_COLORS.empty).lerp(FIELD_COLORS.zero, Math.min(1, value * 2.25));
          if (value > 0.42) color.lerp(FIELD_COLORS.high, (value - 0.42) / 0.58);
        }
        colors.setXYZ(i, color.r, color.g, color.b);
        const left = field[y * nx + Math.max(0, x - 1)];
        const right = field[y * nx + Math.min(nx - 1, x + 1)];
        const above = field[Math.max(0, y - 1) * nx + x];
        const below = field[Math.min(ny - 1, y + 1) * nx + x];
        const sx = solid ? 0 : -(right - left) * exaggeration / (2 * dx);
        const sz = solid ? 0 : -(below - above) * exaggeration / (2 * dy);
        const length = Math.sqrt(sx * sx + 1 + sz * sz);
        normals.setXYZ(i, sx / length, 1 / length, sz / length);
      }
    }
    positions.needsUpdate = colors.needsUpdate = normals.needsUpdate = true;
  });
  const handlePick = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 5) return;
    event.stopPropagation();
    onPick({ x: clamp(event.point.x + width / 2, 0, width), y: clamp(event.point.z + height / 2, 0, height) });
  };
  return <mesh geometry={geometry} onClick={handlePick}>
    <meshStandardMaterial vertexColors roughness={0.36} metalness={0.16} side={THREE.DoubleSide} />
  </mesh>;
}

/** Obstacles are drawn from the solver mask, including its actual grid thickness. */
function Obstacles({ engine }: { engine: WaveEngine }) {
  const signature = [engine.parameters.obstacle, engine.parameters.obstacleX, engine.parameters.obstacleY, engine.parameters.aperture, engine.parameters.obstacleWidth, engine.parameters.obstacleHeight, engine.parameters.separation].join(':');
  const { nx, ny, dx, dy, width, height } = engine.grid;
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const normals: number[] = [];
    const addQuad = (a: number[], b: number[], c: number[], d: number[], normal: number[]) => {
      for (const point of [a, b, c, a, c, d]) {
        positions.push(...point);
        normals.push(...normal);
      }
    };
    const solid = (x: number, y: number) => x >= 0 && x < nx && y >= 0 && y < ny && engine.mask[y * nx + x] !== 0;
    const bottom = -0.045;
    const top = 0.045;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        if (!solid(x, y)) continue;
        const x0 = Math.max(-width / 2, x * dx - width / 2 - dx / 2);
        const x1 = Math.min(width / 2, x0 + dx);
        const z0 = Math.max(-height / 2, y * dy - height / 2 - dy / 2);
        const z1 = Math.min(height / 2, z0 + dy);
        addQuad([x0, top, z0], [x0, top, z1], [x1, top, z1], [x1, top, z0], [0, 1, 0]);
        if (!solid(x - 1, y)) addQuad([x0, bottom, z1], [x0, top, z1], [x0, top, z0], [x0, bottom, z0], [-1, 0, 0]);
        if (!solid(x + 1, y)) addQuad([x1, bottom, z0], [x1, top, z0], [x1, top, z1], [x1, bottom, z1], [1, 0, 0]);
        if (!solid(x, y - 1)) addQuad([x0, bottom, z0], [x0, top, z0], [x1, top, z0], [x1, bottom, z0], [0, 0, -1]);
        if (!solid(x, y + 1)) addQuad([x1, bottom, z1], [x1, top, z1], [x0, top, z1], [x0, bottom, z1], [0, 0, 1]);
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return result;
  }, [engine, engine.mask, nx, ny, dx, dy, width, height, signature]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}>
    <meshStandardMaterial color="#bdc9cb" metalness={0.56} roughness={0.33} side={THREE.DoubleSide} />
  </mesh>;
}

function Label({ text, position, scale = 0.1, color = '#9eb3c8', outline = false, screenHeight }: { text: string; position: [number, number, number]; scale?: number; color?: string; outline?: boolean; screenHeight?: number }) {
  const sprite = useRef<THREE.Sprite>(null);
  const { camera, size } = useThree();
  const projected = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!screenHeight || !sprite.current || !(camera instanceof THREE.PerspectiveCamera)) return;
    sprite.current.getWorldPosition(projected);
    const depth = -projected.applyMatrix4(camera.matrixWorldInverse).z;
    const worldHeight = screenHeight * 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / size.height;
    if (worldHeight > 0) sprite.current.scale.set(worldHeight * 3.2, worldHeight, 1);
  });
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const context = canvas.getContext('2d');
    if (context) {
      context.font = '500 37px Inter, Arial, sans-serif';
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      if (outline) { context.strokeStyle = '#102635'; context.lineWidth = 7; context.lineJoin = 'round'; context.strokeText(text, 128, 40); }
      context.fillText(text, 128, 40);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [text, color, outline]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite ref={sprite} position={position} scale={[scale * 3.2, scale, 1]}>
    <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} />
  </sprite>;
}

function ThetaOverlay({ engine, mode, observationAngle }: { engine: WaveEngine; mode: ThetaMode; observationAngle: number }) {
  const overlay = useMemo(() => angleOverlay(engine.parameters, engine.grid, mode, observationAngle), [engine.parameters, engine.grid, mode, observationAngle]);
  const geometry = useMemo(() => {
    if (!overlay.ready) return null;
    const { width, height } = engine.grid;
    const stroke = (paths: ProbePosition[][], thickness: number) => {
      const positions: number[] = [];
      for (const points of paths) for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (!length) continue;
        const nx = -(b.y - a.y) / length * thickness / 2;
        const ny = (b.x - a.x) / length * thickness / 2;
        const vertices = [[a.x + nx, a.y + ny], [a.x - nx, a.y - ny], [b.x + nx, b.y + ny], [b.x + nx, b.y + ny], [a.x - nx, a.y - ny], [b.x - nx, b.y - ny]];
        vertices.forEach(([x, y]) => positions.push(x - width / 2, 0.075, y - height / 2));
      }
      const result = new THREE.BufferGeometry();
      result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      return result;
    };
    const dashed = (end: ProbePosition) => {
      const start = overlay.origin, length = Math.hypot(end.x - start.x, end.y - start.y);
      const paths: ProbePosition[][] = [];
      for (let distance = 0; distance < length; distance += 0.09) {
        paths.push([distance, Math.min(distance + 0.058, length)].map(d => ({ x: start.x + (end.x - start.x) * d / length, y: start.y + (end.y - start.y) * d / length })));
      }
      return paths;
    };
    const arc = Array.from({ length: 49 }, (_, i) => {
      const angle = (overlay.axisAngleDegrees + overlay.angleDegrees * i / 48) * Math.PI / 180;
      return { x: overlay.origin.x + overlay.arcRadius * Math.cos(angle), y: overlay.origin.y - overlay.arcRadius * Math.sin(angle) };
    });
    return {
      axis: stroke(dashed(overlay.axisEnd), 0.009),
      rays: stroke(overlay.rays.flatMap(ray => dashed(ray.end)), 0.014),
      arc: stroke([arc], 0.012),
    };
  }, [overlay, engine.grid]);
  useEffect(() => () => { if (geometry) Object.values(geometry).forEach(value => value.dispose()); }, [geometry]);
  if (!overlay.ready || !geometry) return null;
  const position = (p: ProbePosition, lift = 0.1): [number, number, number] => [p.x - engine.grid.width / 2, lift, p.y - engine.grid.height / 2];
  const halfAngle = (overlay.axisAngleDegrees + overlay.angleDegrees / 2) * Math.PI / 180;
  const label = { x: overlay.origin.x + overlay.arcRadius * 1.7 * Math.cos(halfAngle), y: overlay.origin.y - overlay.arcRadius * 1.7 * Math.sin(halfAngle) };
  return <group name="theoretical-theta-overlay" renderOrder={40}>
    <mesh geometry={geometry.axis}><meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} depthTest={false} depthWrite={false}/></mesh>
    <mesh geometry={geometry.rays}><meshBasicMaterial color="#ffb331" side={THREE.DoubleSide} depthTest={false} depthWrite={false}/></mesh>
    <mesh geometry={geometry.arc}><meshBasicMaterial color="#ffdc75" side={THREE.DoubleSide} depthTest={false} depthWrite={false}/></mesh>
    <Label text={`θ = ${overlay.angleDegrees.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}°`} position={position(label, 0.12)} scale={0.1} screenHeight={32} color="#fff3c4" outline />
    {overlay.kind === 'minimum' && overlay.rays.map(ray => <Label key={ray.angleDegrees} text={ray.angleDegrees > 0 ? '+θ₁' : '−θ₁'} position={position({ x: overlay.origin.x + (ray.end.x - overlay.origin.x) * 0.62, y: overlay.origin.y + (ray.end.y - overlay.origin.y) * 0.62 })} scale={0.09} screenHeight={26} color="#ffd47b" outline />)}
  </group>;
}

function Tank({ engine, dark }: { engine: WaveEngine; dark: boolean }) {
  const { width, height } = engine.grid;
  const grid = useMemo(() => {
    const positions: number[] = [];
    const rule: number[] = [];
    for (let x = 0; x <= width + 0.001; x += 0.2) positions.push(x - width / 2, -0.022, -height / 2, x - width / 2, -0.022, height / 2);
    for (let z = 0; z <= height + 0.001; z += 0.2) positions.push(-width / 2, -0.022, z - height / 2, width / 2, -0.022, z - height / 2);
    for (let x = 0; x <= width + 0.001; x += 0.1) {
      const major = Math.round(x * 10) % 5 === 0;
      rule.push(x - width / 2, -0.027, height / 2 + 0.025, x - width / 2, -0.027, height / 2 + (major ? 0.075 : 0.052));
    }
    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const ruleGeometry = new THREE.BufferGeometry();
    ruleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rule, 3));
    return { gridGeometry, ruleGeometry };
  }, [width, height]);
  useEffect(() => () => { grid.gridGeometry.dispose(); grid.ruleGeometry.dispose(); }, [grid]);
  return <group>
    <mesh position={[0, -0.095, 0]}>
      <boxGeometry args={[width + 0.07, 0.13, height + 0.07]} />
      <meshStandardMaterial color={dark ? '#0a1726' : '#8faab6'} roughness={0.45} metalness={0.5} />
    </mesh>
    <mesh position={[0, -0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color="#09242f" roughness={0.7} />
    </mesh>
    <lineSegments geometry={grid.gridGeometry}>
      <lineBasicMaterial color="#3d7d87" transparent opacity={0.16} />
    </lineSegments>
    <lineSegments geometry={grid.ruleGeometry}>
      <lineBasicMaterial color={dark ? '#728da6' : '#567080'} transparent opacity={0.85} />
    </lineSegments>
    {[0, 0.5, 1, 1.5, 2, 2.5].filter(x => x <= width).map(x => <Label key={x} text={x.toFixed(1)} position={[x - width / 2, -0.025, height / 2 + 0.12]} scale={0.065} />)}
    <Label text="x (m)" position={[width / 2 + 0.05, -0.015, height / 2 + 0.13]} scale={0.07} />
    <Label text="y (m)" position={[-width / 2 - 0.13, -0.015, -height / 2 - 0.025]} scale={0.07} />
    {[-1, 1].map(side => <mesh key={`z${side}`} position={[0, -0.012, side * (height / 2 + 0.016)]}>
      <boxGeometry args={[width + 0.06, 0.023, 0.024]} />
      <meshStandardMaterial color="#466476" roughness={0.3} metalness={0.7} />
    </mesh>)}
    {[-1, 1].map(side => <mesh key={`x${side}`} position={[side * (width / 2 + 0.016), -0.012, 0]}>
      <boxGeometry args={[0.024, 0.023, height + 0.06]} />
      <meshStandardMaterial color="#466476" roughness={0.3} metalness={0.7} />
    </mesh>)}
  </group>;
}

function SourceIndicators({ engine }: { engine: WaveEngine }) {
  const { parameters: p, grid } = engine;
  const positions = p.source === 'pair'
    ? [p.sourceY - p.sourceSeparation / 2, p.sourceY + p.sourceSeparation / 2]
    : [p.sourceY];
  const color = p.sourceEnabled ? '#ffc477' : '#657180';
  if (p.source === 'plane') return <group position={[p.sourceX - grid.width / 2, 0.023, 0]}>
    <mesh>
      <boxGeometry args={[0.011, 0.013, grid.height - 0.06]} />
      <meshBasicMaterial color={color} transparent opacity={0.86} />
    </mesh>
    <Label text="SOURCE" position={[0, 0.1, -grid.height / 2 - 0.025]} scale={0.066} color={color} />
  </group>;
  return <group>
    {positions.map((y, i) => <group key={i} position={[p.sourceX - grid.width / 2, 0.027, clamp(y, 0, grid.height) - grid.height / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.028, 0.034, 40]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>)}
  </group>;
}

function ProbeMarkers({ probes, engine }: Pick<WaveSceneProps, 'probes' | 'engine'>) {
  return <group>{probes.map((probe, index) => <group key={index} position={[probe.x - engine.grid.width / 2, 0.045, probe.y - engine.grid.height / 2]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.021, 0.028, 32]} />
      <meshBasicMaterial color={index === 0 ? '#ffca7c' : '#c1b0ff'} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
    <mesh position={[0, 0.04, 0]}>
      <cylinderGeometry args={[0.002, 0.002, 0.08, 6]} />
      <meshBasicMaterial color={index === 0 ? '#ffca7c' : '#c1b0ff'} depthTest={false} />
    </mesh>
    <Label text={`P${index + 1}`} position={[0, 0.115, 0]} scale={0.07} color={index === 0 ? '#ffca7c' : '#c1b0ff'} />
  </group>)}</group>;
}

function sampledSecondaryPoints(engine: WaveEngine, count: number): ProbePosition[] {
  const { parameters: p, grid: g } = engine;
  const x = clamp(p.obstacle === 'slit' || p.obstacle === 'double'
    ? p.obstacleX + Math.max(0.035, g.dx * 2) / 2 + 2 * g.dx
    : Math.max(p.sourceX + 0.35, Math.min(p.obstacleX + 0.25, g.width - 0.3)), 2 * g.dx, g.width - 2 * g.dx);
  const intervals = p.obstacle === 'slit'
    ? [[p.obstacleY - p.aperture / 2, p.obstacleY + p.aperture / 2]]
    : p.obstacle === 'double'
      ? [p.obstacleY - p.separation / 2, p.obstacleY + p.separation / 2].map(center => [center - p.aperture / 2, center + p.aperture / 2])
      : [[0.08, g.height - 0.08]];
  const points: ProbePosition[] = [];
  const perInterval = Math.max(1, Math.floor(count / intervals.length));
  intervals.forEach(([start, end]) => {
    for (let i = 0; i < perInterval; i++) {
      const y = clamp(start + (end - start) * ((i + 0.5) / perInterval), 0, g.height);
      const index = Math.round(y / g.dy) * g.nx + Math.round(x / g.dx);
      if (!engine.mask[index]) points.push({ x, y });
    }
  });
  return points;
}

/** Pedagogical overlays only: these points never drive or modify the PDE solver. */
function HuygensOverlay({ engine, step, count, exaggeration }: { engine: WaveEngine; step: number; count: number; exaggeration: number }) {
  const signature = [engine.parameters.obstacle, engine.parameters.obstacleX, engine.parameters.obstacleY, engine.parameters.aperture, engine.parameters.separation, engine.parameters.sourceX].join(':');
  const samplePoints = useMemo(() => sampledSecondaryPoints(engine, clamp(count, 2, 48)), [engine, engine.mask, count, signature]);
  const ringGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3 * 64 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(48 * 3 * 64 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);
  const pointGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(48 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, 0);
    return geometry;
  }, []);
  useEffect(() => () => { ringGeometry.dispose(); pointGeometry.dispose(); }, [ringGeometry, pointGeometry]);
  useFrame(() => {
    const { grid: g, parameters: p } = engine;
    const pointPositions = pointGeometry.attributes.position as THREE.BufferAttribute;
    const pointColors = pointGeometry.attributes.color as THREE.BufferAttribute;
    const ringPositions = ringGeometry.attributes.position as THREE.BufferAttribute;
    const ringColors = ringGeometry.attributes.color as THREE.BufferAttribute;
    let ringVertex = 0;
    let pointVertex = 0;
    samplePoints.forEach((point, pointIndex) => {
      const index = Math.round(point.y / g.dy) * g.nx + Math.round(point.x / g.dx);
      const phase = engine.phase[index];
      const strength = Number.isFinite(phase) ? clamp(engine.amplitude[index] / Math.max(p.amplitude, 1e-10), 0, 1.5) : 0.35;
      const localOscillation = Number.isFinite(phase) ? Math.sin(TAU * p.frequency * engine.time + phase) : 0;
      const pulse = 0.64 + localOscillation * 0.25;
      pointPositions.setXYZ(pointVertex, point.x - g.width / 2, engine.field[index] * exaggeration + 0.025, point.y - g.height / 2);
      pointColors.setXYZ(pointVertex, pulse, pulse * 0.66, pulse * 0.28);
      if (step >= 3) pointVertex++;
      if (step === 2) {
        const next = samplePoints[pointIndex + 1];
        const gap = Math.max(0.1, g.height / samplePoints.length * 1.8);
        if (next && next.y - point.y < gap) {
          for (const endpoint of [point, next]) {
            ringPositions.setXYZ(ringVertex, endpoint.x - g.width / 2, 0.05, endpoint.y - g.height / 2);
            ringColors.setXYZ(ringVertex++, 1, 0.73, 0.38);
          }
        }
      }
      if (step < 4 || !engine.measurementReady || !Number.isFinite(phase) || strength < 0.015) return;
      // η=A sin(ωt+φ); a crest leaves a secondary point at phase π/2.
      const cycle = ((p.frequency * engine.time + phase / TAU - 0.25) % 1 + 1) % 1;
      const wavelength = p.speed / p.frequency;
      for (let ring = 0; ring < 3; ring++) {
        const radius = wavelength * (cycle + ring);
        if (radius < 0.012 || radius > 1.1) continue;
        const brightness = clamp(strength, 0.12, 1) * (1 - radius / 1.4) * (step >= 6 ? 0.35 : 1);
        for (let segment = 0; segment < 64; segment++) {
          const a = segment / 64 * TAU;
          const b = (segment + 1) / 64 * TAU;
          const xa = point.x + Math.cos(a) * radius;
          const ya = point.y + Math.sin(a) * radius;
          const xb = point.x + Math.cos(b) * radius;
          const yb = point.y + Math.sin(b) * radius;
          if (xa < 0 || xa > g.width || xb < 0 || xb > g.width || ya < 0 || ya > g.height || yb < 0 || yb > g.height) continue;
          for (const [x, y] of [[xa, ya], [xb, yb]]) {
            ringPositions.setXYZ(ringVertex, x - g.width / 2, 0.035, y - g.height / 2);
            ringColors.setXYZ(ringVertex, brightness, brightness * 0.65, brightness * 0.25);
            ringVertex++;
          }
        }
      }
    });
    pointGeometry.setDrawRange(0, pointVertex);
    ringGeometry.setDrawRange(0, ringVertex);
    pointPositions.needsUpdate = pointColors.needsUpdate = ringPositions.needsUpdate = ringColors.needsUpdate = true;
  });
  return <group>
    <points geometry={pointGeometry} frustumCulled={false}>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.95} depthTest={false} depthWrite={false} />
    </points>
    <lineSegments geometry={ringGeometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.72} depthTest={false} depthWrite={false} />
    </lineSegments>
  </group>;
}

function FieldFeatures({ engine, showNodes, nodeThreshold, showMaxima }: Pick<WaveSceneProps, 'engine' | 'showNodes' | 'nodeThreshold' | 'showMaxima'>) {
  const geometries = useMemo(() => [new THREE.BufferGeometry(), new THREE.BufferGeometry()], []);
  useMemo(() => {
    for (const geometry of geometries) {
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(900 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0, 0);
    }
  }, [geometries]);
  useEffect(() => () => geometries.forEach(geometry => geometry.dispose()), [geometries]);
  const previous = useRef(-Infinity);
  useFrame(({ clock }) => {
    if (!engine.measurementReady || (!showNodes && !showMaxima)) {
      geometries.forEach(geometry => geometry.setDrawRange(0, 0));
      return;
    }
    if (clock.elapsedTime - previous.current < 0.16) return;
    previous.current = clock.elapsedTime;
    const { nx, ny, dx, dy, width, height } = engine.grid;
    const nodes = geometries[0].attributes.position as THREE.BufferAttribute;
    const maxima = geometries[1].attributes.position as THREE.BufferAttribute;
    const threshold = nodeThreshold * engine.parameters.amplitude;
    let nodeCount = 0;
    let maximumCount = 0;
    const stride = Math.max(2, Math.ceil(nx / 110));
    for (let y = 4; y < ny - 4; y += stride) {
      for (let x = 4; x < nx - 4; x += stride) {
        const i = y * nx + x;
        if (engine.mask[i]) continue;
        const amplitude = engine.amplitude[i];
        if (showNodes && nodeCount < 900 && amplitude <= threshold) {
          nodes.setXYZ(nodeCount++, x * dx - width / 2, 0.016, y * dy - height / 2);
        }
        if (showMaxima && maximumCount < 120 && amplitude > engine.parameters.amplitude * 0.18
          && amplitude > engine.amplitude[i - 2] && amplitude >= engine.amplitude[i + 2]
          && amplitude > engine.amplitude[i - 2 * nx] && amplitude >= engine.amplitude[i + 2 * nx]) {
          maxima.setXYZ(maximumCount++, x * dx - width / 2, 0.02, y * dy - height / 2);
        }
      }
    }
    nodes.needsUpdate = maxima.needsUpdate = true;
    geometries[0].setDrawRange(0, nodeCount);
    geometries[1].setDrawRange(0, maximumCount);
  });
  return <group>
    <points geometry={geometries[0]} frustumCulled={false}>
      <pointsMaterial color="#d6d2ff" size={0.012} sizeAttenuation transparent opacity={0.7} depthTest={false} depthWrite={false} />
    </points>
    <points geometry={geometries[1]} frustumCulled={false}>
      <pointsMaterial color="#ffcb7b" size={0.026} sizeAttenuation depthTest={false} depthWrite={false} />
    </points>
  </group>;
}

function Scene(props: WaveSceneProps) {
  return <>
    <color attach="background" args={[props.dark ? '#09121f' : '#e1e9ed']} />
    <ambientLight intensity={0.9} />
    <hemisphereLight args={['#e5ffff', '#23334d', 1.4]} />
    <directionalLight position={[-1, 5, 2]} intensity={2.2} color="#e3fffa" />
    <directionalLight position={[3, 2, -3]} intensity={1.1} color="#94c9ff" />
    <CameraControls view={props.camera} zoomEnabled={props.zoomEnabled} />
    <Tank engine={props.engine} dark={props.dark} />
    <FieldSurface engine={props.engine} display={props.display} exaggeration={props.exaggeration} onPick={props.onPick} />
    <Obstacles engine={props.engine} />
    <SourceIndicators engine={props.engine} />
    <ProbeMarkers probes={props.probes} engine={props.engine} />
    <FieldFeatures engine={props.engine} showNodes={props.showNodes} nodeThreshold={props.nodeThreshold} showMaxima={props.showMaxima} />
    {props.showTheta && <ThetaOverlay engine={props.engine} mode={props.thetaMode} observationAngle={props.thetaObservationAngle} />}
    {props.huygens && props.huygensStep > 1 && props.huygensStep < 7 && <HuygensOverlay engine={props.engine} step={props.huygensStep} count={props.secondaryCount} exaggeration={props.exaggeration} />}
  </>;
}

export function WaveScene(props: WaveSceneProps) {
  const angle = props.showTheta ? angleOverlay(props.engine.parameters, props.engine.grid, props.thetaMode, props.thetaObservationAngle) : null;
  return <div className="wave-scene" style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, touchAction: props.zoomEnabled ? 'none' : 'pan-y' }}>
    <SceneBoundary>
      <Canvas
        camera={{ position: [2.05, 2.4, 2.5], fov: 38, near: 0.01, far: 30 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        fallback={<CanvasFallback />}
        onCreated={({ gl }) => { gl.setClearColor(props.dark ? '#09121f' : '#e1e9ed'); props.onCanvasReady?.(gl.domElement); }}
        style={{ touchAction: props.zoomEnabled ? 'none' : 'pan-y' }}
      >
        <Scene {...props} />
      </Canvas>
    </SceneBoundary>
    {angle && <div className="theta-scene-note" role="status">
      {angle.ready ? angle.kind === 'minimum' ? <><strong>θ₁ = {angle.angleDegrees.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}° · plan horizontal</strong><span>Minima théoriques de Fraunhofer<br/>Repères, pas des nœuds mesurés</span></> : <><strong>θ = {angle.angleDegrees.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}° · observation</strong><span>{angle.originLabel}<br/>Direction géométrique, pas un minimum d’amplitude</span></> : <span>{angle.message}</span>}
    </div>}
  </div>;
}
