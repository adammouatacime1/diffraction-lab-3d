import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Waves } from 'lucide-react';

export type LabTheme = 'light' | 'dark';
const classes = (...items: (string | undefined | false)[]) => items.filter(Boolean).join(' ');

/** Every theme token and selector belongs to this boundary, never to document/body. */
export function LabRoot({ theme = 'light', className, children, ...props }: HTMLAttributes<HTMLDivElement> & { theme?: LabTheme }) {
  return <div {...props} data-lab-theme={theme} className={classes('lab-kit', className)}>{children}</div>;
}

/** Optional site chrome. Keep this outside the exported simulation component. */
export function LabHeader({ title, subtitle, badge, actions }: { title: string; subtitle?: string; badge?: string; actions?: ReactNode }) {
  return <header className="lk-header"><div className="lk-brand"><span className="lk-brand-icon" aria-hidden="true"><Waves size={23}/></span><div className="lk-brand-copy">{title}{subtitle && <small>{subtitle}</small>}</div></div>{badge && <span className="lk-version">{badge}</span>}<div className="lk-header-actions">{actions}</div></header>;
}

export function WorkspaceHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="lk-workspace-top"><div>{eyebrow && <div className="lk-eyebrow">{eyebrow}</div>}<h1 className="lk-title">{title}</h1>{description && <p className="lk-lead">{description}</p>}</div>{children}</div>;
}

export interface TabOption { id: string; label: string }
/** The consumer supplies a matching tabpanel with id `${id}-panel`. */
export function Tabs({ id, label, options, value, onChange }: { id: string; label: string; options: readonly TabOption[]; value: string; onChange: (value: string) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="lk-tabs" role="tablist" aria-label={label}>{options.map((option, index) => <button key={option.id} id={`${id}-${option.id}`} type="button" role="tab" aria-selected={value === option.id} aria-controls={`${id}-panel`} tabIndex={value === option.id ? 0 : -1} ref={element => { buttons.current[index] = element; }} onClick={() => onChange(option.id)} onKeyDown={event => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;
    event.preventDefault(); onChange(options[next].id); buttons.current[next]?.focus();
  }}>{option.label}</button>)}</div>;
}

export function LabLayout({ sidebar, children, sidebarLabel = 'Expériences et paramètres' }: { sidebar: ReactNode; children: ReactNode; sidebarLabel?: string }) {
  return <div className="lk-layout"><aside className="lk-sidebar" aria-label={sidebarLabel} tabIndex={0}>{sidebar}</aside><div className="lk-main">{children}</div></div>;
}

export function Panel({ title, icon, actions, children, className, bodyClassName }: { title: string; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  const id = useId();
  return <section className={classes('lk-panel', className)} aria-labelledby={id}><div className="lk-panel-heading">{icon}<h2 id={id}>{title}</h2>{actions}</div><div className={classes('lk-panel-body', bodyClassName)}>{children}</div></section>;
}

export interface ExperimentOption { id: string; label: string }
export function ExperimentList({ options, value, onChange }: { options: readonly ExperimentOption[]; value: string; onChange: (id: string) => void }) {
  return <div className="lk-experiments" aria-label="Expériences">{options.map((option, index) => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}><span className="lk-experiment-number">{String(index + 1).padStart(2, '0')}</span>{option.label}<span aria-hidden="true">{value === option.id ? '•' : '›'}</span></button>)}</div>;
}

export function Button({ primary = false, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button {...props} type={type} className={classes('lk-button', primary && 'lk-button-primary', className)}/>;
}

export function IconButton({ label, active, className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button {...props} type={type} title={label} aria-label={label} aria-pressed={active} className={classes('lk-icon-button', className)}/>;
}

export interface NumericInputProps { id?: string; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; disabled?: boolean }
/** Commit on blur/Enter. Commas are accepted, invalid entries revert, values are clamped. */
export function NumericInput({ id, label, value, min, max, step, onChange, disabled }: NumericInputProps) {
  const format = (number: number) => String(Number(number.toFixed(5)));
  const [text, setText] = useState(format(value));
  useEffect(() => { setText(format(value)); }, [value]);
  const commit = () => {
    const number = Number(text.replace(',', '.'));
    const next = text.trim() && Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : value;
    setText(format(next)); if (next !== value) onChange(next);
  };
  return <input id={id} className="lk-numeric-input" role="spinbutton" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} type="text" inputMode="decimal" data-step={step} disabled={disabled} value={text} onChange={event => setText(event.target.value)} onBlur={commit} onKeyDown={event => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') { setText(format(value)); }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); const next = Math.min(max, Math.max(min, value + (event.key === 'ArrowUp' ? step : -step))); onChange(Number(next.toFixed(10)));
    }
  }}/>;
}

export function ParameterControl({ label, symbol, unit, hint, ...props }: Omit<NumericInputProps, 'id'> & { symbol?: string; unit?: string; hint?: string }) {
  const id = useId(); const hintId = useId();
  return <div className="lk-parameter"><div className="lk-parameter-label"><label htmlFor={id} title={hint}>{label} {symbol && <i>{symbol}</i>}</label><div className="lk-number-unit"><NumericInput {...props} id={id} label={label}/>{unit && <span>{unit}</span>}</div></div><input type="range" aria-label={`${label} — curseur`} aria-describedby={hint ? hintId : undefined} min={props.min} max={props.max} step={props.step} value={props.value} disabled={props.disabled} onChange={event => props.onChange(Number(event.target.value))}/>{hint && <span id={hintId} className="lk-visually-hidden">{hint}</span>}</div>;
}

export function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: readonly TabOption[]; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="lk-select-row"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></div>;
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="lk-toggle"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/><span>{label}</span></label>;
}

export function SegmentedControl({ label, options, value, onChange }: { label: string; options: readonly TabOption[]; value: string; onChange: (value: string) => void }) {
  return <div className="lk-segmented" role="group" aria-label={label}>{options.map(option => <button type="button" key={option.id} aria-pressed={option.id === value} onClick={() => onChange(option.id)}>{option.label}</button>)}</div>;
}

export function SimulationCard({ eyebrow, title, actions, toolbar, children, playback }: { eyebrow?: string; title: string; actions?: ReactNode; toolbar?: ReactNode; children: ReactNode; playback?: ReactNode }) {
  const id = useId();
  return <section className="lk-simulation" aria-labelledby={id}><div className="lk-simulation-heading"><div className="lk-simulation-title">{eyebrow && <div className="lk-eyebrow">{eyebrow}</div>}<h2 id={id}>{title}</h2></div><div className="lk-simulation-actions">{actions}</div></div>{toolbar && <div className="lk-scene-toolbar">{toolbar}</div>}{children}{playback}</section>;
}

/** Renderer slot: no scene engine, wheel handler or physics dependency. */
export function SimulationViewport({ children, caption, note, label }: { children: ReactNode; caption?: ReactNode; note?: ReactNode; label: string }) {
  return <div className="lk-viewport" role="group" aria-label={label}>{children}{caption && <div className="lk-viewport-caption">{caption}</div>}{note && <div className="lk-viewport-note">{note}</div>}</div>;
}

export function PlaybackBar({ running, onRunningChange, onReset, onStep, speed, onSpeedChange, time, disabled = false }: { running: boolean; onRunningChange: (running: boolean) => void; onReset: () => void; onStep: () => void; speed: number; onSpeedChange: (speed: number) => void; time: number; disabled?: boolean }) {
  const speedId = useId();
  return <div className="lk-playback"><div className="lk-playback-controls"><IconButton label="Réinitialiser" onClick={onReset} disabled={disabled}><RotateCcw size={20}/></IconButton><button className="lk-play-button" type="button" aria-label={running ? 'Mettre en pause' : 'Lancer la simulation'} onClick={() => onRunningChange(!running)} disabled={disabled}>{running ? <Pause size={17}/> : <Play size={17}/>} {running ? 'Pause' : 'Lecture'}</button><IconButton label="Avancer d’un pas" onClick={onStep} disabled={disabled || running}><SkipForward size={20}/></IconButton><div className="lk-playback-speed"><label htmlFor={speedId}>Vitesse</label><select id={speedId} aria-label="Vitesse de lecture" value={speed} onChange={event => onSpeedChange(Number(event.target.value))} disabled={disabled}>{[0.25, 0.5, 1, 2].map(option => <option key={option} value={option}>{option.toLocaleString('fr-FR')}×</option>)}</select></div></div><div className="lk-clock"><span>Temps physique</span><strong>{time.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</strong> <small>s</small></div></div>;
}

export interface MetricData { label: string; symbol?: string; value: string; unit?: string; hint?: string }
export function MetricGrid({ metrics, label = 'Mesures calculées' }: { metrics: readonly MetricData[]; label?: string }) {
  return <div className="lk-metrics" role="group" aria-label={label}>{metrics.map(metric => <div className="lk-metric" key={metric.label}><div className="lk-metric-label">{metric.label}</div><div className="lk-metric-value">{metric.symbol && <i>{metric.symbol}</i>} {metric.value} {metric.unit && <small>{metric.unit}</small>}</div>{metric.hint && <div className="lk-metric-hint">{metric.hint}</div>}</div>)}</div>;
}

export function Badge({ children }: { children: ReactNode }) { return <span className="lk-badge">{children}</span>; }
export function Callout({ icon, eyebrow, title, children }: { icon?: ReactNode; eyebrow?: string; title: string; children: ReactNode }) {
  return <section className="lk-callout">{icon && <span className="lk-callout-icon" aria-hidden="true">{icon}</span>}<div className="lk-callout-copy">{eyebrow && <div className="lk-eyebrow">{eyebrow}</div>}<h3>{title}</h3><div>{children}</div></div></section>;
}
