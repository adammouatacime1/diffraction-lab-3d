import { ArrowRight, Power, RotateCcw } from 'lucide-react';
import type { Parameters } from '../types';
import { ParameterControl } from './ParameterControl';
import '../styles/diffraction-observation.css';

export interface DiffractionObservationProps {
  parameters: Parameters;
  frequencyMax: number;
  onChange: (parameters: Partial<Parameters>) => void;
  onLoadSlit: () => void;
}

const format = (value: number, digits = 2) => value.toLocaleString('fr-FR', {
  maximumFractionDigits: digits,
});

/** Small, physical controls for the default GBF → speaker → slit experiment. */
export function DiffractionObservation({ parameters, frequencyMax, onChange, onLoadSlit }: DiffractionObservationProps) {
  const wavelength = parameters.speed / parameters.frequency;
  return <section className="diffraction-observation" aria-label="Observer la diffraction sonore">
    <div className="diffraction-observation-heading">
      <p className="diffraction-observation-path"><span>Ondes incidentes</span><ArrowRight size={13} aria-hidden="true"/><strong>Fente</strong><ArrowRight size={13} aria-hidden="true"/><span>Ondes diffractées</span></p>
      <button className={`diffraction-gbf-toggle ${parameters.sourceEnabled ? 'is-on' : ''}`} type="button" aria-label={parameters.sourceEnabled ? 'Arrêter le GBF' : 'Allumer le GBF'} aria-pressed={parameters.sourceEnabled} onClick={() => onChange({ sourceEnabled: !parameters.sourceEnabled })}>
        <Power size={14} aria-hidden="true"/><span>GBF {parameters.sourceEnabled ? 'en marche' : 'arrêté'}</span>
      </button>
    </div>
    <p className="diffraction-observation-explanation">Le GBF fournit un signal électrique au haut-parleur, qui émet les ondes sonores vers la fente.</p>
    <div className="diffraction-observation-controls">
      <ParameterControl label="Fréquence du son" symbol="f" unit="Hz" value={parameters.frequency} min={100} max={frequencyMax} step={10} onChange={frequency => onChange({ frequency })}/>
      <ParameterControl label="Largeur de la fente" symbol="a" unit="m" value={parameters.aperture} min={0.06} max={1.2} step={0.01} onChange={aperture => onChange({ aperture })}/>
      <div className="diffraction-observation-values"><span><i>λ = c/f</i> <strong>{format(wavelength * 100, 1)} cm</strong></span><span><i>a/λ</i> <strong>{format(parameters.aperture / wavelength)}</strong></span></div>
    </div>
    <div className="diffraction-observation-footer">
      <p>Modèle sonore 2D : la directivité réelle du haut-parleur n’est pas modélisée.</p>
      <button className="text-button" type="button" onClick={onLoadSlit}><RotateCcw size={12} aria-hidden="true"/>Revoir la diffraction par une fente</button>
    </div>
  </section>;
}
