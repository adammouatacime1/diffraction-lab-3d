import { useId, useState } from 'react';
import { firstMinimumDegrees, fraunhoferAmplitude } from '../physics/fraunhofer';
import type { Parameters } from '../types';

const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});
const radians = (angle: number) => angle * Math.PI / 180;
const origin = { x: 76, y: 170 };
const point = (angle: number, radius: number) => ({
  x: origin.x + radius * Math.cos(radians(angle)),
  y: origin.y - radius * Math.sin(radians(angle)),
});

/** An explicitly analytical far-field demonstration, independent of the tank. */
export function ThetaDemonstration({ parameters, onRestore }: {
  parameters: Parameters;
  onRestore: () => void;
}) {
  const id = useId();
  const [selection, setSelection] = useState<{ mode: 'minimum' | 'custom'; angle: number }>({ mode: 'minimum', angle: 0 });
  const wavelength = parameters.speed / parameters.frequency;
  const minimum = firstMinimumDegrees(parameters.aperture, wavelength);
  const angle = selection.mode === 'minimum' ? minimum ?? 0 : selection.angle;
  const amplitude = fraunhoferAmplitude(angle, parameters.aperture, wavelength);
  const atMinimum = minimum !== null && Math.abs(Math.abs(angle) - minimum) < 1e-8;
  const eligible = parameters.obstacle === 'slit' && parameters.source === 'plane' && Math.abs(parameters.sourceAngle) < 1e-8;
  const selectedPoint = point(angle, 148);
  const minPoints = minimum === null ? [] : [-minimum, minimum].map(value => ({ angle: value, ...point(value, 148) }));
  const sector = minimum === null ? [] : Array.from({ length: 61 }, (_, i) => point(-minimum + 2 * minimum * i / 60, 148));
  const angles = new Set(Array.from({ length: 721 }, (_, i) => -90 + i / 4));
  for (let m = 1; m <= Math.floor(parameters.aperture / wavelength); m++) {
    const value = Math.asin(Math.min(1, m * wavelength / parameters.aperture)) * 180 / Math.PI;
    angles.add(value); angles.add(-value);
  }
  const mapX = (value: number) => 52 + (value + 90) / 180 * 364;
  const mapY = (value: number) => 190 - value * 142;
  const curve = [...angles].sort((a, b) => a - b).map(value => `${mapX(value)},${mapY(fraunhoferAmplitude(value, parameters.aperture, wavelength))}`).join(' ');
  const angleArc = Array.from({ length: 25 }, (_, i) => point(angle * i / 24, 48));
  const angleLabel = point(angle / 2, 73);
  const restore = () => { setSelection({ mode: 'minimum', angle: 0 }); onRestore(); };

  return <section className="panel theta-panel" id="theta-demonstration" aria-labelledby={`${id}-heading`}>
    <div className="theta-heading">
      <span className="eyebrow">MODÈLE IDÉAL · CHAMP LOINTAIN</span>
      <h2 id={`${id}-heading`}>Angle θ et premier minimum</h2>
      <p>Repérez l’extrémité du lobe central et vérifiez que l’amplitude théorique y est nulle.</p>
    </div>
    {!eligible ? <div className="theta-unavailable" role="status">
      <p>Ce modèle suppose une <strong>fente simple</strong>, éclairée par une <strong>onde plane en incidence normale</strong>. Les réglages actuels ne correspondent plus à ce cas.</p>
      <button className="secondary-button" onClick={restore}>Rétablir le cas θ = 30°</button>
    </div> : <>
      <div className="theta-values">
        <div><span>Largeur de fente</span><strong>a = {number(parameters.aperture, 2)} m</strong></div>
        <div><span>Longueur d’onde</span><strong>λ = {number(wavelength, 3)} m</strong></div>
        <div><span>Premier minimum</span><strong>{minimum === null ? 'Aucun pour a < λ' : `θ₁ = ${number(minimum)}°`}</strong></div>
      </div>
      <div className="theta-visuals">
        <figure>
          <svg viewBox="0 0 440 340" role="img" aria-labelledby={`${id}-diagram-title ${id}-diagram-desc`}>
            <title id={`${id}-diagram-title`}>Angle de diffraction depuis l’axe de propagation</title>
            <desc id={`${id}-diagram-desc`}>{minimum === null ? 'Aucun premier minimum théorique : la fente est plus étroite que la longueur d’onde.' : `Les directions plus et moins ${number(minimum)} degrés sont les premiers minima théoriques. L’amplitude y est nulle.`} La direction sélectionnée est {number(angle)} degrés.</desc>
            {sector.length > 0 && <polygon points={`${origin.x},${origin.y} ${sector.map(p => `${p.x},${p.y}`).join(' ')}`} className="theta-sector" />}
            <path d="M76 26V148 M76 192V314" className="theta-wall" />
            <path d="M56 148V192 M51 148H61 M51 192H61" className="theta-axis" />
            <text x="37" y="177" className="theta-svg-text">a</text>
            <text x="25" y="19" className="theta-svg-small">Fente</text>
            <line x1={origin.x} y1={origin.y} x2="416" y2={origin.y} className="theta-axis" strokeDasharray="6 5" />
            <text x="266" y="194" className="theta-svg-small">Axe de propagation</text>
            <path d="M76 22 A148 148 0 0 1 76 318" className="theta-observation-arc" />
            {minPoints.map(p => <g key={p.angle}>
              <line x1={origin.x} y1={origin.y} x2={p.x} y2={p.y} className="theta-minimum-ray" />
              <circle cx={p.x} cy={p.y} r="6" className="theta-zero-dot" />
            </g>)}
            {minimum !== null && <>
              <text x="246" y="46" className="theta-svg-text theta-gold">+θ₁ = {number(minimum)}°</text>
              <text x="246" y="69" className="theta-svg-small">Premier minimum : A = 0</text>
              <text x="246" y="279" className="theta-svg-text theta-gold">−θ₁ = −{number(minimum)}°</text>
              <text x="246" y="302" className="theta-svg-small">Premier minimum : A = 0</text>
            </>}
            <line x1={origin.x} y1={origin.y} x2={selectedPoint.x} y2={selectedPoint.y} className="theta-selected-ray" />
            <polyline points={angleArc.map(p => `${p.x},${p.y}`).join(' ')} className="theta-angle-arc" />
            <circle cx={selectedPoint.x} cy={selectedPoint.y} r="4" className="theta-selected-dot" />
            {Math.abs(angle) > 3 && <text x={angleLabel.x} y={angleLabel.y} className="theta-svg-text">θ</text>}
            <circle cx={origin.x} cy={origin.y} r="4" className="theta-selected-dot" />
          </svg>
          <figcaption>Repères théoriques ; schéma sans échelle de distance.</figcaption>
        </figure>
        <figure>
          <svg viewBox="0 0 440 255" role="img" aria-labelledby={`${id}-profile-title ${id}-profile-desc`}>
            <title id={`${id}-profile-title`}>Amplitude théorique en fonction de l’angle</title>
            <desc id={`${id}-profile-desc`}>Amplitude relative A de theta sur A de zéro, entre moins et plus 90 degrés. Les premiers minima sont marqués sur la courbe.</desc>
            {[0, 0.5, 1].map(value => <g key={value}>
              <line x1="52" y1={mapY(value)} x2="416" y2={mapY(value)} className="theta-grid-line" />
              <text x="42" y={mapY(value) + 5} textAnchor="end" className="theta-svg-small">{number(value, value === 0.5 ? 1 : 0)}</text>
            </g>)}
            <text x="52" y="27" className="theta-svg-text">Amplitude A(θ) / A(0)</text>
            <path d="M52 42V190H416" className="theta-axis" />
            <polyline points={curve} className="theta-amplitude-curve" />
            {[-90, 0, 90].map(value => <text key={value} x={mapX(value)} y="213" textAnchor="middle" className="theta-svg-small">{value}°</text>)}
            {minPoints.map(p => <g key={p.angle}>
              <line x1={mapX(p.angle)} y1="48" x2={mapX(p.angle)} y2="190" className="theta-profile-minimum" />
              <circle cx={mapX(p.angle)} cy="190" r="5" className="theta-zero-dot" />
              {minimum! < 80 && <text x={mapX(p.angle)} y="213" textAnchor="middle" className="theta-svg-small theta-gold">{number(p.angle)}°</text>}
            </g>)}
            <line x1={mapX(angle)} y1={mapY(amplitude)} x2={mapX(angle)} y2="190" className="theta-selected-ray" />
            <circle cx={mapX(angle)} cy={mapY(amplitude)} r="6" className="theta-selected-dot" />
            <text x="234" y="244" textAnchor="middle" className="theta-svg-small">Angle depuis l’axe de propagation</text>
          </svg>
          <figcaption>Le lobe central est compris entre −θ₁ et +θ₁. Des lobes secondaires peuvent subsister au-delà.</figcaption>
        </figure>
      </div>
      <div className="theta-controls">
        <label htmlFor={`${id}-angle`}>Angle d’observation <strong>θ = {number(angle)}°</strong></label>
        <input id={`${id}-angle`} aria-label="Angle d’observation" type="range" min="-90" max="90" step="0.1" value={angle} onChange={event => setSelection({ mode: 'custom', angle: Number(event.target.value) })} />
        <div className="theta-buttons">
          <button className="secondary-button" onClick={() => setSelection({ mode: 'custom', angle: 0 })}>Sur l’axe</button>
          <button className="primary-button" disabled={minimum === null} onClick={() => setSelection({ mode: 'minimum', angle: 0 })}>Premier minimum</button>
          <button className="text-button" onClick={restore}>Rétablir le cas θ = 30°</button>
        </div>
        <div className={`theta-reading ${atMinimum ? 'at-minimum' : ''}`} aria-live="polite">
          <span>Amplitude théorique A(θ) / A(0)</span>
          <output aria-label="Amplitude théorique relative">{number(amplitude, 3)}</output>
          <small>{atMinimum ? 'Annulation au premier minimum du modèle idéal.' : Math.abs(angle) < 1e-8 ? 'Maximum central, amplitude de référence.' : 'Lecture de la courbe théorique pour cet angle.'}</small>
        </div>
      </div>
      <div className="theta-explanation">
        <p><strong>A(θ) / A(0) = |sin β / β|</strong>, avec β = πa sin θ / λ. Au premier minimum : <strong>sin θ₁ = λ/a</strong>.</p>
        {minimum === null ? <p>Aucun premier minimum pour a &lt; λ : l’onde peut s’étaler dans tout le demi-espace transmis.</p> : <p>{minimum === 90 ? 'Ici, les minima sont à ±90°, en direction rasante.' : `Le lobe central s’étend sur 2θ₁ = ${number(2 * minimum)}°.`} L’approximation θ₁ ≈ λ/a s’utilise en radians et aux petits angles.</p>}
        <p>Hypothèses : fente uniformément éclairée, incidence normale, champ lointain avec D ≫ a²/λ = {number(parameters.aperture ** 2 / wavelength, 2)} m. Ces repères sont une prévision analytique ; la cuve ci-dessous montre le calcul numérique à distance finie.</p>
      </div>
    </>}
  </section>;
}
