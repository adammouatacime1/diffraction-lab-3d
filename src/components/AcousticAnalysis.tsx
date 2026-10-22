import { useState } from 'react';
import { Focus, RotateCcw } from 'lucide-react';
import type { WaveEngine } from '../physics/WaveEngine';
import type { ProbePosition } from '../types';
import { compareMicrophonePhase } from '../physics/acousticMeasurements';
import { AcousticMicrophoneChart } from './ScientificCharts';
import type { MicrophoneSample } from './ScientificCharts';
import { NumericInput } from './ParameterControl';

interface AcousticAnalysisProps {
  engine: WaveEngine;
  probes: ProbePosition[];
  samples: MicrophoneSample[];
  onMoveProbe: (index: number, patch: Partial<ProbePosition>) => void;
  onClearMeasurements: () => void;
  onClearProbes: () => void;
  onAddProbe: () => void;
  selectedMicrophone: number;
  onSelectMicrophone: (index: number) => void;
}

const number = (value: number, digits = 3) => value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const colors = ['#218dba', '#c65353'];

/** Acoustic measurements use the same pressure field and physical clock as both views. */
export function AcousticAnalysis({
  engine, probes, samples, onMoveProbe, onClearMeasurements, onClearProbes, onAddProbe,
  selectedMicrophone, onSelectMicrophone,
}: AcousticAnalysisProps) {
  const [coordinateError, setCoordinateError] = useState('');
  const [inputRevision, setInputRevision] = useState(0);
  const readings = probes.map(probe => engine.sampleAt(probe.x, probe.y));
  const windowPeriods = engine.measurementWindowPeriods;
  const windowMilliseconds = windowPeriods / engine.parameters.frequency * 1000;
  const phase = readings.length === 2 ? compareMicrophonePhase(readings[0], readings[1], engine.measurementReady, engine.parameters.amplitude) : null;

  const move = (index: number, patch: Partial<ProbePosition>) => {
    const candidate = { ...probes[index], ...patch };
    if (engine.sampleAt(candidate.x, candidate.y).solid) {
      setCoordinateError(`M${index + 1} : ce point se trouve dans un obstacle. Choisissez une position dans le milieu libre.`);
      // NumericInput commits on blur. Remount it to restore the accepted coordinate.
      setInputRevision(revision => revision + 1);
      return;
    }
    setCoordinateError('');
    onMoveProbe(index, patch);
  };

  return <section className="panel analysis-panel acoustic-analysis" aria-label="Analyse des microphones virtuels">
    <div className="panel-heading" style={{ flexWrap: 'wrap' }}>
      <Focus size={17}/><h2>Microphones virtuels</h2><span className="data-badge">PRESSIONS DU SOLVEUR</span>
      {probes.length < 2 && <button type="button" className="text-button" onClick={onAddProbe}>Ajouter un microphone</button>}
      <button type="button" className="text-button" onClick={() => { setCoordinateError(''); onClearMeasurements(); }}><RotateCcw size={13}/>Réinitialiser les mesures</button>
      <button type="button" className="text-button" onClick={() => { setCoordinateError(''); onClearProbes(); }}>Effacer les microphones</button>
    </div>
    <div className="probe-grid">{readings.map((reading, index) => <div className="probe-card" key={index}>
      <div className="probe-title">
        <span className="probe-dot" style={{ background: colors[index] }}/>
        <button type="button" className="text-button" aria-label={`Déplacer M${index + 1}`} aria-pressed={selectedMicrophone === index} onClick={() => onSelectMicrophone(index)}><b>M{index + 1}</b> · Déplacer</button>
        <span>x = {number(reading.x, 2)} m · y = {number(reading.y, 2)} m{reading.solid ? ' · DANS UN OBSTACLE' : ''}</span>
      </div>
      <div className="probe-position">
        <label>x (m)<NumericInput key={`x-${index}-${inputRevision}`} label={`Position x du microphone M${index + 1}`} value={probes[index].x} min={0} max={engine.grid.width} step={0.01} onChange={value => move(index, { x: value })}/></label>
        <label>y (m)<NumericInput key={`y-${index}-${inputRevision}`} label={`Position y du microphone M${index + 1}`} value={probes[index].y} min={0} max={engine.grid.height} step={0.01} onChange={value => move(index, { y: value })}/></label>
      </div>
      <div className="probe-stats">
        <span>Pression p′ instantanée<b>{reading.solid ? '—' : `${number(reading.displacement)} Pa`}</b></span>
        <span>Amplitude estimée<b>{reading.solid ? '—' : engine.measurementReady ? `${number(reading.amplitude)} Pa` : `Acquisition ${windowPeriods} T…`}</b></span>
        <span>Pression efficace p_rms<b>{reading.solid ? '—' : engine.measurementReady && Number.isFinite(reading.rms) ? `${number(reading.rms!)} Pa` : `Acquisition ${windowPeriods} T…`}</b></span>
      </div>
    </div>)}</div>
    <div className="chart-section">
      {coordinateError && <p className="warning-box" role="status">{coordinateError}</p>}
      <p className="muted micro">Choisissez « Déplacer M1 » ou « Déplacer M2 », puis cliquez dans la vue 2D ou 3D. Les coordonnées sont aussi éditables ; les obstacles sont exclus.</p>
      <AcousticMicrophoneChart samples={samples} microphoneCount={probes.length}/>
      {phase && <p className="muted">{phase.ready ? `Déphasage harmonique mesuré M2 − M1 : ${number(phase.phaseDegrees, 1)}°. ${phase.message}` : phase.message}</p>}
      <p className="science-note">Une pression instantanément nulle ne signifie pas absence de son. L’amplitude harmonique est estimée par projection ; la pression efficace est calculée à partir des carrés des pressions sur une fenêtre glissante de {windowPeriods} périodes ({number(windowMilliseconds, 2)} ms). Une fenêtre complète ne garantit pas un régime stationnaire : les transitoires et les réflexions peuvent encore modifier ces mesures.</p>
      <p className="muted micro">Les microphones partagent la même échelle en Pa et la même horloge en ms. Aucun retard n’est déduit automatiquement de distance/c. L’indicateur d’énergie éventuel reste relatif ; p_rms² n’est pas à lui seul une intensité en W/m². La relation p_rms²/(ρc) nécessite notamment une onde progressive appropriée et ne s’applique pas automatiquement au champ proche ou aux interférences.</p>
    </div>
  </section>;
}
