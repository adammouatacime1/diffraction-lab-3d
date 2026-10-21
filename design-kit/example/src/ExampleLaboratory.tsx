import { useEffect, useId, useRef, useState } from 'react';
import { Activity, BookOpen, FlaskConical, SlidersHorizontal } from 'lucide-react';
import {
  Badge, Callout, ExperimentList, LabLayout, LabRoot, MetricGrid, Panel,
  ParameterControl, PlaybackBar, SegmentedControl, SelectControl,
  SimulationCard, SimulationViewport, Tabs, Toggle, WorkspaceHeading,
} from '../../src';
import type { LabTheme } from '../../src';

interface Parameters { amplitude: number; mass: number; stiffness: number; phase: number }
interface CanvasState extends Parameters { showGrid: boolean; view: string; theme: LabTheme }
const DEFAULTS: Parameters = { amplitude: 0.6, mass: 1, stiffness: 9, phase: 0 };
const number = (value: number, digits = 3) => value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const modes = [{ id: 'discovery', label: 'Découverte' }, { id: 'analysis', label: 'Analyse' }, { id: 'presentation', label: 'Présentation' }];

/** An intentionally small analytic example; replace this renderer with your own engine. */
function drawOscillator(canvas: HTMLCanvasElement, time: number, state: CanvasState) {
  const context = canvas.getContext('2d'); if (!context) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const dark = state.theme === 'dark';
  const accent = dark ? '#64c2d2' : '#218ca2';
  const muted = dark ? '#94a7b5' : '#7c8e99';
  const omega = Math.sqrt(state.stiffness / state.mass);
  const position = state.amplitude * Math.cos(omega * time + state.phase);
  context.clearRect(0, 0, width, height);
  if (state.showGrid) {
    context.strokeStyle = dark ? '#2c3d48' : '#d5e3e9'; context.lineWidth = 1;
    for (let x = 35; x < width; x += 35) { context.beginPath(); context.moveTo(x, 65); context.lineTo(x, height - 45); context.stroke(); }
    for (let y = 65; y < height - 30; y += 35) { context.beginPath(); context.moveTo(25, y); context.lineTo(width - 25, y); context.stroke(); }
  }
  const center = width / 2; const middle = height * 0.51; const scale = Math.max(35, (width - 150) / 4.2);
  if (state.view === 'position') {
    context.strokeStyle = muted; context.lineWidth = 1;
    context.beginPath(); context.moveTo(35, middle + 42); context.lineTo(width - 35, middle + 42); context.stroke();
    context.setLineDash([4, 5]); context.beginPath(); context.moveTo(center, middle - 50); context.lineTo(center, middle + 60); context.stroke(); context.setLineDash([]);
    const blockX = center + position * scale; const wallX = 38;
    context.strokeStyle = accent; context.lineWidth = 2.5;
    context.beginPath(); context.moveTo(wallX, middle - 36); context.lineTo(wallX, middle + 36); context.stroke();
    context.beginPath(); context.moveTo(wallX, middle);
    const springEnd = blockX - 23; const start = wallX + 12; const springWidth = Math.max(12, springEnd - start - 10);
    context.lineTo(start, middle);
    for (let index = 0; index < 18; index++) context.lineTo(start + springWidth * (index + 1) / 18, middle + (index % 2 ? 13 : -13));
    context.lineTo(springEnd, middle); context.stroke();
    context.fillStyle = accent; context.beginPath(); context.roundRect(blockX - 23, middle - 24, 46, 48, 7); context.fill();
    context.fillStyle = dark ? '#1b2934' : '#ffffff'; context.font = '600 14px system-ui, sans-serif'; context.textAlign = 'center'; context.fillText('m', blockX, middle + 5);
    context.fillStyle = muted; context.font = '11px system-ui, sans-serif'; context.fillText('0', center, middle + 79); context.fillText(`x = ${number(position, 2)} m`, center, middle + 111);
  } else {
    const chartLeft = 45; const chartWidth = width - 85; const chartHeight = Math.max(60, height * 0.28);
    context.strokeStyle = muted; context.lineWidth = 1;
    context.beginPath(); context.moveTo(chartLeft, middle); context.lineTo(width - 30, middle); context.stroke();
    context.strokeStyle = accent; context.lineWidth = 2.5; context.beginPath();
    const period = 2 * Math.PI / omega;
    for (let index = 0; index <= 240; index++) {
      const sampleTime = time - period * 2 + index / 240 * period * 2;
      const x = chartLeft + index / 240 * chartWidth;
      const y = middle - Math.cos(omega * sampleTime + state.phase) * chartHeight * state.amplitude / 2;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke(); context.fillStyle = '#c26a46'; context.beginPath(); context.arc(chartLeft + chartWidth, middle - Math.cos(omega * time + state.phase) * chartHeight * state.amplitude / 2, 5, 0, Math.PI * 2); context.fill();
    context.fillStyle = muted; context.font = '11px system-ui, sans-serif'; context.textAlign = 'left'; context.fillText('Deux dernières périodes', chartLeft, middle + chartHeight + 35);
  }
}

/** Exported simulation boundary: no router, site navigation or document-level theme mutation. */
export function ExampleLaboratory({ active = true, theme = 'light' }: { active?: boolean; theme?: LabTheme }) {
  const [parameters, setParameters] = useState<Parameters>({ ...DEFAULTS });
  const [scenario, setScenario] = useState('standard');
  const [mode, setMode] = useState('discovery');
  const [view, setView] = useState('position');
  const [showGrid, setShowGrid] = useState(true);
  const [running, setRunning] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const physicalTime = useRef(0);
  const state = useRef<CanvasState>({ ...parameters, showGrid, view, theme });
  state.current = { ...parameters, showGrid, view, theme };
  const modeId = useId();
  const omega = Math.sqrt(parameters.stiffness / parameters.mass);
  const period = 2 * Math.PI / omega;
  const position = parameters.amplitude * Math.cos(omega * time + parameters.phase);
  const energy = 0.5 * parameters.stiffness * parameters.amplitude ** 2;

  const update = (patch: Partial<Parameters>) => { setParameters(previous => ({ ...previous, ...patch })); };
  const reset = () => { physicalTime.current = 0; setTime(0); if (canvas.current) drawOscillator(canvas.current, 0, state.current); };
  const selectScenario = (id: string) => {
    setScenario(id);
    setParameters(id === 'heavy' ? { ...DEFAULTS, mass: 2 } : id === 'stiff' ? { ...DEFAULTS, stiffness: 18 } : { ...DEFAULTS });
    reset();
  };

  // No RAF, observer or document listener survives active=false or unmount.
  useEffect(() => {
    if (!active || !canvas.current) return;
    const element = canvas.current;
    let frame = 0; let previous = 0; let lastUpdate = 0; let disposed = false;
    const paint = () => { if (!disposed) drawOscillator(element, physicalTime.current, state.current); };
    const animate = (now: number) => {
      if (disposed) return;
      if (previous) physicalTime.current += Math.min((now - previous) / 1000, 0.05) * speed;
      previous = now; paint();
      if (now - lastUpdate > 90) { setTime(physicalTime.current); lastUpdate = now; }
      frame = requestAnimationFrame(animate);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
    const visibility = () => {
      stop();
      if (!document.hidden && running) frame = requestAnimationFrame(animate);
      else setTime(physicalTime.current);
    };
    const resize = new ResizeObserver(paint); resize.observe(element);
    document.addEventListener('visibilitychange', visibility);
    paint(); visibility();
    return () => { disposed = true; stop(); resize.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [active, running, speed]);

  useEffect(() => {
    if (active && canvas.current) drawOscillator(canvas.current, physicalTime.current, state.current);
  }, [active, parameters, showGrid, view, theme]);

  useEffect(() => {
    if (!active) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (query.matches) setRunning(false); };
    query.addEventListener('change', change); return () => query.removeEventListener('change', change);
  }, [active]);

  return <LabRoot theme={theme} className="lk-app" aria-label="Laboratoire exemple : oscillateur harmonique">
    <WorkspaceHeading eyebrow="Votre espace d’expérimentation" title="Explorer les oscillations." description="Manipulez. Observez. Comprenez.">
      <Tabs id={modeId} label="Modes du laboratoire" options={modes} value={mode} onChange={setMode}/>
    </WorkspaceHeading>
    <div role="tabpanel" id={`${modeId}-panel`} aria-labelledby={`${modeId}-${mode}`}>
      <LabLayout sidebar={<>
        <Panel title="Expériences" icon={<FlaskConical size={15}/>} bodyClassName="lk-library-body"><ExperimentList options={[{ id: 'standard', label: 'Oscillateur de référence' }, { id: 'heavy', label: 'Masse doublée' }, { id: 'stiff', label: 'Ressort plus raide' }]} value={scenario} onChange={selectScenario}/></Panel>
        <Panel title="Paramètres physiques" icon={<SlidersHorizontal size={15}/>} className="lk-parameters">
          <SelectControl label="Modèle" value="harmonic" options={[{ id: 'harmonic', label: 'Ressort idéal' }]} onChange={() => {}}/>
          <ParameterControl label="Masse" symbol="m" unit="kg" value={parameters.mass} min={0.2} max={5} step={0.1} onChange={mass => update({ mass })}/>
          <ParameterControl label="Raideur" symbol="k" unit="N/m" value={parameters.stiffness} min={1} max={25} step={0.5} onChange={stiffness => update({ stiffness })}/>
          <ParameterControl label="Amplitude" symbol="A" unit="m" value={parameters.amplitude} min={0.1} max={2} step={0.05} onChange={amplitude => update({ amplitude })}/>
          <SelectControl label="Phase initiale" value={String(parameters.phase)} options={[{ id: '0', label: '0 rad' }, { id: String(Math.PI / 2), label: 'π/2 rad' }]} onChange={phase => update({ phase: Number(phase) })}/>
          <div className="lk-derived"><div className="lk-derived-row"><span>Pulsation</span><b>ω = {number(omega, 2)} rad/s</b></div><div className="lk-derived-row"><span>Période</span><b>T = {number(period)} s</b></div></div>
          <Toggle label="Afficher le quadrillage" checked={showGrid} onChange={setShowGrid}/>
        </Panel>
        <Callout icon={<BookOpen size={16}/>} title="Un modèle, des limites explicites."><p>Oscillateur analytique sans frottement. Ce rendu illustre le kit d’interface ; chaque laboratoire fournit son propre moteur.</p></Callout>
      </>}>
        <SimulationCard eyebrow="Expérience modèle" title="Oscillateur harmonique" actions={<Badge>{active ? 'Modèle analytique' : 'Laboratoire inactif'}</Badge>}
          toolbar={<><SegmentedControl label="Vue de la simulation" options={[{ id: 'position', label: 'Système' }, { id: 'curve', label: 'Courbe x(t)' }]} value={view} onChange={setView}/><span className="lk-example-legend">Position instantanée</span></>}
          playback={<PlaybackBar running={running && active} onRunningChange={setRunning} onReset={reset} onStep={() => { physicalTime.current += 1 / 60; setTime(physicalTime.current); if (canvas.current) drawOscillator(canvas.current, physicalTime.current, state.current); }} speed={speed} onSpeedChange={setSpeed} time={time} disabled={!active}/>}
        >
          <SimulationViewport label="Représentation du système masse-ressort" caption={<><div className="lk-eyebrow">Système numérique</div><span>Masse–ressort · modèle idéal</span></>} note="La molette fait défiler la page. Aucun zoom n’est capturé.">
            <canvas ref={canvas} className="lk-canvas" role="img" aria-label={`Oscillateur : masse ${number(parameters.mass, 1)} kg, amplitude ${number(parameters.amplitude, 2)} m. La position est disponible dans les mesures sous la simulation.`}/>
          </SimulationViewport>
        </SimulationCard>
        <MetricGrid metrics={[
          { label: 'Période', symbol: 'T', value: number(period), unit: 's', hint: 'T = 2π √(m / k)' },
          { label: 'Fréquence', symbol: 'f', value: number(1 / period), unit: 'Hz', hint: 'f = 1 / T' },
          { label: 'Énergie mécanique', symbol: 'E', value: number(energy), unit: 'J', hint: 'E = ½ k A² · constante' },
          { label: 'Position', symbol: 'x', value: number(position), unit: 'm', hint: 'x(t) = A cos(ωt + φ)' },
        ]}/>
        <div className="lk-warning">Modèle exemple : ressort idéal, mouvement à une dimension, sans frottement. Le moteur de diffraction reste indépendant du kit.</div>
        <Callout icon={<Activity size={20}/>} eyebrow={mode === 'analysis' ? 'Analyser' : mode === 'presentation' ? 'Présenter' : 'À observer'} title={mode === 'analysis' ? 'Relier les mesures aux paramètres du modèle.' : mode === 'presentation' ? 'Préparer une démonstration pour la classe.' : 'Observer l’effet de la masse sur la période.'}>
          <p>{mode === 'analysis' ? 'Doublez la masse : la période est multipliée par √2. L’amplitude modifie l’énergie et la position, sans modifier la période de ce modèle idéal.' : mode === 'presentation' ? 'Choisissez les paramètres, mettez la simulation en pause, puis avancez pas à pas. Le site hôte peut fermer le laboratoire : ses animations et observateurs sont alors arrêtés.' : 'Comparez les expériences : une masse plus grande ralentit les oscillations ; un ressort plus raide les accélère. Les mesures sont recalculées à chaque changement.'}</p>
        </Callout>
      </LabLayout>
    </div>
  </LabRoot>;
}

export default ExampleLaboratory;
