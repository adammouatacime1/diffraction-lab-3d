import { useId } from 'react';
import type { WaveEngine } from '../physics/WaveEngine';
import { fraunhoferIntensity } from '../physics/fraunhofer';

export { fraunhoferIntensity } from '../physics/fraunhofer';

export interface Series {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

interface LineChartProps {
  series: Series[];
  xLabel: string;
  yLabel: string;
  height?: number;
  emptyMessage?: string;
}

const formatNumber = (value: number): string => {
  if (value === 0 || Math.abs(value) < 1e-15) return '0';
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
    return value.toExponential(1).replace('.', ',').replace('e+', 'e');
  }
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(value);
};

function range(values: number[], includeZero = false): [number, number] {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    const padding = Math.abs(min) * 0.1 || 1;
    return [min - padding, max + padding];
  }
  return [min, max];
}

function ticks(min: number, max: number): number[] {
  const roughStep = (max - min) / 4;
  const scale = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / scale;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * scale;
  const result: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-8; value += step) {
    result.push(Math.abs(value) < step * 1e-8 ? 0 : value);
  }
  return result;
}

export function LineChart({
  series,
  xLabel,
  yLabel,
  height = 150,
  emptyMessage = 'Les mesures apparaîtront lorsque la simulation aura avancé.',
}: LineChartProps) {
  const id = useId();
  const width = 620;
  const chartHeight = Math.max(130, height);
  const margin = { top: 14, right: 16, bottom: 38, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const cleanSeries = series.map((item) => ({
    ...item,
    points: item.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
  }));
  const paths = series.map(item=>{
    let penDown=false;
    return item.points.map(point=>{
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y)){penDown=false;return null;}
      const command=penDown?'L':'M';penDown=true;return {command,point};
    }).filter((value):value is {command:string;point:{x:number;y:number}}=>value!==null);
  });
  const allPoints = cleanSeries.flatMap((item) => item.points);

  if (allPoints.length === 0) {
    return <div className="chart-wrap chart-empty" style={{ minHeight: chartHeight }} role="status">{emptyMessage}</div>;
  }

  const [xMin, xMax] = range(allPoints.map((point) => point.x));
  const [yMin, yMax] = range(allPoints.map((point) => point.y), true);
  const mapX = (value: number) => margin.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const mapY = (value: number) => margin.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${chartHeight}`} role="img" aria-labelledby={`${id}-title ${id}-desc`} style={{ display: 'block', width: '100%', overflow: 'visible' }}>
        <title id={`${id}-title`}>{yLabel} en fonction de {xLabel}</title>
        <desc id={`${id}-desc`}>{cleanSeries.map((item) => item.label).join(', ')}. Abscisse : {formatNumber(xMin)} à {formatNumber(xMax)}. Ordonnée : {formatNumber(yMin)} à {formatNumber(yMax)}.</desc>
        {ticks(yMin, yMax).map((value) => (
          <g key={`y-${value}`}>
            <line x1={margin.left} y1={mapY(value)} x2={width - margin.right} y2={mapY(value)} stroke="currentColor" opacity={value === 0 ? 0.28 : 0.1} />
            <text x={margin.left - 9} y={mapY(value) + 3.5} textAnchor="end" fill="currentColor" opacity="0.72" fontSize="10">{formatNumber(value)}</text>
          </g>
        ))}
        {ticks(xMin, xMax).map((value) => (
          <g key={`x-${value}`}>
            <line x1={mapX(value)} y1={margin.top} x2={mapX(value)} y2={chartHeight - margin.bottom} stroke="currentColor" opacity="0.07" />
            <text x={mapX(value)} y={chartHeight - margin.bottom + 17} textAnchor="middle" fill="currentColor" opacity="0.72" fontSize="10">{formatNumber(value)}</text>
          </g>
        ))}
        <path d={`M ${margin.left} ${margin.top} V ${chartHeight - margin.bottom} H ${width - margin.right}`} fill="none" stroke="currentColor" opacity="0.3" />
        {cleanSeries.map((item, index) => (
          <g key={`${item.label}-${index}`}>
            <path d={paths[index].map(({command,point}) => `${command} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={index > 0 ? `${6 + index * 2} 4` : undefined} />
            {item.points.length === 1 && <circle cx={mapX(item.points[0].x)} cy={mapY(item.points[0].y)} r="3" fill={item.color} />}
          </g>
        ))}
        <text x={margin.left + plotWidth / 2} y={chartHeight - 4} textAnchor="middle" fill="currentColor" opacity="0.76" fontSize="10">{xLabel}</text>
        <text transform={`translate(12 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fill="currentColor" opacity="0.76" fontSize="10">{yLabel}</text>
      </svg>
      {cleanSeries.length > 1 && (
        <div className="chart-legend">
          {cleanSeries.map((item, index) => <span key={`${item.label}-${index}`}><i style={{ background: item.color }} aria-hidden="true" />{item.label}{index > 0 ? ' (pointillés)' : ''}</span>)}
        </div>
      )}
    </div>
  );
}

export function FraunhoferChart({ aperture, wavelength }: { aperture: number; wavelength: number }) {
  if (!Number.isFinite(aperture) || !Number.isFinite(wavelength) || aperture <= 0 || wavelength <= 0) {
    return <p className="muted">Une largeur de fente et une longueur d’onde strictement positives sont nécessaires.</p>;
  }
  const minimumCount = Math.floor(aperture / wavelength);
  const firstMinima = Array.from({ length: Math.min(minimumCount, 3) }, (_, index) => {
    return Math.asin(Math.min(1, (index + 1) * wavelength / aperture)) * 180 / Math.PI;
  });
  // Include the labelled zeros exactly: a fixed 0.25° sampling can miss them.
  const angles = [...new Set([
    ...Array.from({ length: 721 }, (_, index) => -90 + index / 4),
    ...firstMinima.flatMap((angle) => [-angle, angle]),
  ])].sort((left, right) => left - right);
  const points = angles.map((x) => ({ x, y: fraunhoferIntensity(x, aperture, wavelength) }));
  return (
    <div>
      <LineChart series={[{ label: 'Modèle de Fraunhofer, fente unique', color: '#f4b65c', points }]} xLabel="Angle θ (°)" yLabel="Intensité I / I(0)" height={180} />
      <p className="science-note">Modèle théorique de fente unique : I/I(0) = [sin β/β]², β = πa sin θ/λ. Cette courbe n’est pas une mesure du calcul FDTD.</p>
      <p className="muted">Minima idéaux : sin θₘ = mλ/a (m ≠ 0, |mλ/a| ≤ 1). {firstMinima.length ? `Premiers angles : ${firstMinima.map((angle) => `±${formatNumber(angle)}°`).join(' ; ')}${minimumCount > 3 ? '…' : ''}.` : 'Aucun minimum dans le domaine angulaire pour a < λ.'}</p>
      <p className="muted">Domaine lointain requis : D ≫ a²/λ = {formatNumber(aperture ** 2 / wavelength)} m, avec une onde plane en incidence normale et une fente longue. Une coupe proche de l’obstacle ne vérifie pas directement cette loi.</p>
    </div>
  );
}

type AngularSample = { ready: false; message: string } | {
  ready: true;
  radius: number;
  fresnel: number;
  points: { x: number; y: number }[];
};

/** Samples the solver's harmonic amplitude, without constructing theoretical data. */
export function sampleAngularIntensity(engine: Pick<WaveEngine, 'parameters' | 'grid' | 'measurementReady' | 'sampleAt'>): AngularSample {
  const p = engine.parameters;
  if (p.obstacle !== 'slit' && p.obstacle !== 'double') return { ready: false, message: 'La mesure angulaire nécessite une fente simple ou double.' };
  if (!engine.measurementReady) return { ready: false, message: 'Acquisition de l’amplitude harmonique sur une période complète…' };
  const sin60 = Math.sin(Math.PI / 3);
  const radius = Math.min(0.65, engine.grid.width - p.obstacleX - 0.25, (p.obstacleY - 0.24) / sin60, (engine.grid.height - p.obstacleY - 0.24) / sin60);
  if (!Number.isFinite(radius) || radius <= Math.max(0.15, 3 * engine.grid.dx)) return { ready: false, message: 'Espace insuffisant en aval pour un arc de mesure hors des bords.' };
  const axis = engine.sampleAt(p.obstacleX + radius, p.obstacleY);
  if (axis.solid || !Number.isFinite(axis.amplitude) || axis.amplitude <= Math.max(1e-12, 0.02 * p.amplitude)) return { ready: false, message: 'Signal sur l’axe trop faible pour normaliser : attendez l’arrivée de l’onde ou ajustez le montage.' };
  const points: { x: number; y: number }[] = [];
  for (let angle = -60; angle <= 60; angle += 1) {
    const radians = angle * Math.PI / 180;
    const reading = engine.sampleAt(p.obstacleX + radius * Math.cos(radians), p.obstacleY + radius * Math.sin(radians));
    if (reading.solid || !Number.isFinite(reading.amplitude)) return { ready: false, message: 'L’arc de mesure rencontre un obstacle ou un signal indisponible.' };
    points.push({ x: angle, y: (reading.amplitude / axis.amplitude) ** 2 });
  }
  return { ready: true, radius, fresnel: p.aperture ** 2 / ((p.speed / p.frequency) * radius), points };
}

export function AngularMeasurement({ engine }: { engine: WaveEngine }) {
  const measurement = sampleAngularIntensity(engine);
  if (!measurement.ready) return <p className="muted" role="status">{measurement.message}</p>;
  return <div>
    <LineChart series={[{ label: 'Mesure FDTD sur un arc en aval', color: '#218dba', points: measurement.points }]} xLabel="Angle depuis l’axe +x (°)" yLabel="A²(θ) / A²(0)" height={180} />
    <p className="science-note">Données numériques : projection harmonique sur la dernière période, échantillonnée au nœud de grille le plus proche. Arc de rayon r = {formatNumber(measurement.radius)} m, centré sur la barrière. Des transitoires et réflexions peuvent subsister.</p>
    <p className="muted">Nombre de Fresnel Fₐ = a²/(λr) = {formatNumber(measurement.fresnel)}. {measurement.fresnel > 0.1 ? 'Champ proche : aucune comparaison quantitative avec Fraunhofer.' : 'Critère de distance indicatif ; les autres hypothèses de Fraunhofer restent nécessaires.'}</p>
    {engine.parameters.obstacle === 'double' && <p className="muted micro">Fₐ utilise la largeur d’une seule fente ; l’étendue complète des deux ouvertures impose aussi une condition de distance.</p>}
    <p className="muted micro">Cette distribution locale ne garantit pas le champ lointain. La référence théorique de fente unique suppose notamment une onde plane en incidence normale.</p>
  </div>;
}
