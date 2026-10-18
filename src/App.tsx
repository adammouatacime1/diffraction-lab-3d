import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Expand, FlaskConical, Focus, Layers, Moon, MousePointer2, Pause, Play, Radio, RotateCcw, Ruler, Settings2, ShieldCheck, SkipForward, SlidersHorizontal, Sun, Upload, Waves, X } from 'lucide-react';
import { WaveEngine } from './physics/WaveEngine';
import { runValidation } from './physics/validation';
import { DEFAULT_PARAMETERS } from './types';
import type { CameraView, DisplayField, LabMode, Parameters, ProbePosition, ValidationResult } from './types';
import { EXPERIMENTS } from './data/experiments';
import { WaveScene } from './components/WaveScene';
import { ParameterControl, NumericInput } from './components/ParameterControl';
import { LineChart, FraunhoferChart, AngularMeasurement } from './components/ScientificCharts';
import { HelpContent } from './components/HelpContent';

const fmt=(n:number,d=2)=>n.toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const MODES:{id:LabMode;label:string}[]=[{id:'discovery',label:'Découverte'},{id:'huygens',label:'Huygens'},{id:'analysis',label:'Analyse'},{id:'comparison',label:'Comparaison'},{id:'presentation',label:'Présentation'}];
const HUYG=["Repérez les fronts incidents : chaque crête rassemble des points de même phase.","La portion du front située dans l’ouverture transmet la perturbation.","Les points lumineux représentent une distribution de sources secondaires virtuelles.","Les ondelettes illustrent la propagation depuis les points de l’ouverture.","Les contributions se superposent. La densité des points ne change pas le calcul physique.","Observez le champ diffracté, calculé par le solveur FDTD.","Les illustrations sont masquées : seul le champ numérique reste visible."];
interface Sample { t:number; a:number; b:number }
function IconButton({children,label,onClick,active=false}:{children:ReactNode;label:string;onClick:()=>void;active?:boolean}) { return <button className={`icon-button ${active?'active':''}`} title={label} aria-label={label} aria-pressed={active} onClick={onClick}>{children}</button>; }
function download(blob:Blob,name:string){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}

export default function App(){
  const [params,setParams]=useState<Parameters>({...DEFAULT_PARAMETERS});
  const engineRef=useRef<WaveEngine|null>(null); if(!engineRef.current)engineRef.current=new WaveEngine(DEFAULT_PARAMETERS);
  const engine=engineRef.current;
  const compareRef=useRef<WaveEngine|null>(null);
  const [mode,setMode]=useState<LabMode>('discovery');
  const [page,setPage]=useState<'lab'|'help'|'validation'>('lab');
  const [dark,setDark]=useState(false),[running,setRunning]=useState(true),[playback,setPlayback]=useState(.25);
  const [scenario,setScenario]=useState('narrow'),[display,setDisplay]=useState<DisplayField>('displacement');
  const [camera,setCamera]=useState<CameraView>('iso'),[exaggeration,setExaggeration]=useState(10);
  const [sidebar,setSidebar]=useState(true),[advanced,setAdvanced]=useState(false),[annotations,setAnnotations]=useState(true);
  const [huygens,setHuygens]=useState(false),[huygensStep,setHuygensStep]=useState(3),[secondaryCount,setSecondaryCount]=useState(9);
  const [showNodes,setShowNodes]=useState(false),[nodeThreshold,setNodeThreshold]=useState(.08),[showMaxima,setShowMaxima]=useState(false);
  const [tool,setTool]=useState<'probe'|'ruler'|'section'>('probe');
  const [probes,setProbes]=useState<ProbePosition[]>([{x:1.85,y:.8}]);
  const [ruler,setRuler]=useState<ProbePosition[]>([]),[section,setSection]=useState<ProbePosition[]>([{x:.4,y:.8},{x:2.5,y:.8}]);
  const [samples,setSamples]=useState<Sample[]>([]),[tick,setTick]=useState(0);
  const [notice,setNotice]=useState(''),[validation,setValidation]=useState<ValidationResult[]|null>(null),[validating,setValidating]=useState(false);
  const [compareAperture,setCompareAperture]=useState(.8);
  const sceneCanvas=useRef<HTMLCanvasElement|null>(null),[jsonError,setJsonError]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);
  const clock=useRef({last:0,acc:0,lastSample:0,lastUI:0});
  const sampleRef=useRef<Sample[]>([]);
  const probesRef=useRef(probes);probesRef.current=probes;
  const arrivals=useRef<(number|null)[]>([null,null]);
  const arrivalEligible=useRef(true);
  const capture=()=>{
    const positions=probesRef.current;
    if(!positions.length)return;
    const readings=positions.map(p=>engine.sampleAt(p.x,p.y));
    if(readings.some(r=>r.solid))return;
    sampleRef.current.push({t:engine.time,a:readings[0].displacement*1000,b:readings[1]?.displacement*1000||0});
    if(sampleRef.current.length>500)sampleRef.current.shift();
    readings.forEach((r,i)=>{if(arrivalEligible.current&&arrivals.current[i]===null&&Math.abs(r.displacement)>=.05*engine.parameters.amplitude)arrivals.current[i]=engine.time;});
  };
  const runningRef=useRef(running&&page==='lab');runningRef.current=running&&page==='lab';
  const playbackRef=useRef(playback);playbackRef.current=playback;
  const modeRef=useRef(mode);modeRef.current=mode;

  const update=useCallback((patch:Partial<Parameters>)=>{
    engine.updateParameters(patch);setParams({...engine.parameters});arrivalEligible.current=false;
    if(compareRef.current)compareRef.current.updateParameters({...patch,aperture:compareAperture});
    if(patch.resolution){arrivals.current=[null,null];arrivalEligible.current=true;clock.current.acc=0;clock.current.lastSample=0;sampleRef.current=[];setSamples([]);}
    setTick(t=>t+1);
  },[engine,compareAperture]);
  const reset=useCallback(()=>{arrivals.current=[null,null];arrivalEligible.current=true;engine.reset();compareRef.current?.reset();clock.current.acc=0;clock.current.lastSample=0;sampleRef.current=[];setSamples([]);setTick(t=>t+1);},[engine]);
  useEffect(()=>{
    let raf=0;
    const frame=(now:number)=>{
      const c=clock.current;const elapsed=c.last?Math.min(.05,(now-c.last)/1000):0;c.last=now;
      if(runningRef.current){
        c.acc+=elapsed*playbackRef.current;
        let iterations=0;
        while(c.acc>=engine.grid.dt&&iterations<100){
          const dt=engine.grid.dt;engine.step();
          if(modeRef.current==='comparison')compareRef.current?.step();
          c.acc-=dt;iterations++;
          if(engine.time-c.lastSample>=.004){
            c.lastSample=engine.time;capture();
          }
        }
      }
      if(now-c.lastUI>100){c.lastUI=now;setTick(t=>t+1);setSamples([...sampleRef.current]);}
      raf=requestAnimationFrame(frame);
    };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[engine]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  const chooseMode=(m:LabMode)=>{
    setMode(m);setPage('lab');if(m==='huygens')setHuygens(true);
    if(m==='analysis'){setAdvanced(true);}
    if(m==='comparison'){
      setScenario('comparison');engine.updateParameters({obstacle:'slit'});setParams({...engine.parameters});
      compareRef.current=new WaveEngine({...engine.parameters,aperture:compareAperture});
      reset();setNotice('Les deux cuves repartent au même instant, avec le même pas de temps.');
    }
    if(m==='presentation')setSidebar(false);else setSidebar(true);
  };
  const chooseExperiment=(id:string)=>{
    const e=EXPERIMENTS.find(x=>x.id===id);if(!e)return;
    setScenario(id);update({...DEFAULT_PARAMETERS,...e.parameters});
    setHuygens(e.mode==='huygens');setShowNodes(id==='nodes');setDisplay(id==='nodes'?'amplitude':'displacement');
    if(e.mode)chooseMode(e.mode);reset();setRunning(true);
    setNotice('Expérience réinitialisée : les observations proviendront du nouveau calcul.');
  };
  const moveProbe=(i:number,patch:Partial<ProbePosition>)=>{setProbes(ps=>ps.map((p,index)=>index===i?{...p,...patch}:p));arrivals.current=[null,null];arrivalEligible.current=false;sampleRef.current=[];setSamples([]);};
  const onPick=(point:ProbePosition)=>{
    const reading=engine.sampleAt(point.x,point.y);if(reading.solid){setNotice('Choisissez un point dans l’eau, en dehors des obstacles.');return;}
    if(tool==='probe'){arrivals.current=[null,null];arrivalEligible.current=engine.time===0;setProbes(p=>p.length>=2?[point]:[...p,point]);sampleRef.current=[];setSamples([]);}
    if(tool==='ruler')setRuler(p=>p.length>=2?[point]:[...p,point]);
    if(tool==='section')setSection(p=>p.length>=2?[point]:[...p,point]);
  };
  const exportPng=()=>{
    if(!sceneCanvas.current){setNotice('Le rendu 3D doit être disponible pour la capture.');return;}
    const src=sceneCanvas.current,out=document.createElement('canvas');out.width=1600;out.height=1000;
    const ctx=out.getContext('2d');if(!ctx)return;
    ctx.fillStyle=dark?'#14212c':'#eef4f8';ctx.fillRect(0,0,1600,1000);
    ctx.fillStyle=dark?'#f2f7fa':'#142d3e';ctx.font='bold 32px sans-serif';ctx.fillText('DIFFRACTION LAB 3D',48,58);
    ctx.font='20px sans-serif';ctx.fillText(`${EXPERIMENTS.find(e=>e.id===scenario)?.title} · t = ${fmt(engine.time,3)} s`,48,94);
    const scale=Math.min(1504/src.width,730/src.height);ctx.drawImage(src,48+(1504-src.width*scale)/2,120,src.width*scale,src.height*scale);
    ctx.font='20px sans-serif';ctx.fillText(`f = ${fmt(params.frequency)} Hz     v = ${fmt(params.speed)} m/s     λ = ${fmt(params.speed/params.frequency,3)} m     a = ${fmt(params.aperture)} m     A = ${fmt(params.amplitude*1000)} mm`,48,890);
    ctx.fillText(`Champ : ${display==='displacement'?'élongation η (mm)':display==='amplitude'?'amplitude estimée (mm)':'intensité relative A²/A₀²'} · Relief ×${exaggeration} · Maillage ${engine.grid.nx} × ${engine.grid.ny}`,48,930);
    ctx.font='16px sans-serif';ctx.fillText('Modèle scalaire linéaire non dispersif · Huygens : illustration pédagogique · Amplitudes : estimation sur une période',48,968);
    out.toBlob(b=>{if(b)download(b,'diffraction-lab-experience.png');});
  };
  const exportJson=()=>download(new Blob([JSON.stringify({application:'Diffraction Lab 3D',version:1,parameters:params},null,2)],{type:'application/json'}),'diffraction-lab-parametres.json');
  const importJson=async(file:File)=>{
    try{
      if(file.size>100_000)throw new Error('Fichier trop volumineux.');
      const data=JSON.parse(await file.text());const raw=data.parameters;
      if(!raw||typeof raw!=='object')throw new Error('Le fichier doit contenir les paramètres d’une expérience.');
      const numeric:Record<string,[number,number]>={frequency:[1,20],speed:[.5,4],amplitude:[.0001,.01],aperture:[.04,1.2],sourceX:[.12,1],sourceY:[.2,1.4],sourceSeparation:[.1,1],sourceAngle:[-70,70],phase:[-180,180],obstacleX:[.8,2.2],obstacleY:[.25,1.35],obstacleWidth:[.05,1],obstacleHeight:[.05,1.2],separation:[.1,1.2]};
      const next={...DEFAULT_PARAMETERS};for(const [k,[min,max]] of Object.entries(numeric)){const v=raw[k];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(`Valeur invalide : ${k}.`);(next as unknown as Record<string,unknown>)[k]=v;}
      const enums={source:['plane','point','pair'],obstacle:['none','slit','double','circle','rectangle','edge'],boundary:['absorbing','reflecting'],resolution:['performance','balanced','precision']};
      for(const [k,values] of Object.entries(enums)){if(!values.includes(raw[k]))throw new Error(`Choix invalide : ${k}.`);(next as unknown as Record<string,unknown>)[k]=raw[k];}
      if(typeof raw.sourceEnabled!=='boolean')throw new Error('Activation de source invalide.');next.sourceEnabled=raw.sourceEnabled;
      update(next);reset();setJsonError('');setNotice('Paramètres importés. Le champ repart de l’équilibre.');
    }catch(err){setJsonError(err instanceof Error?err.message:'Fichier JSON invalide.');}
  };
  const startValidation=()=>{setValidating(true);setValidation(null);setTimeout(()=>{try{setValidation(runValidation());}catch(e){setNotice(`Erreur de validation : ${String(e)}`);}finally{setValidating(false);}},50);};
  const experiment=EXPERIMENTS.find(e=>e.id===scenario)!;
  const lambda=params.speed/params.frequency,ratio=params.aperture/lambda;
  const readings=probes.map(p=>engine.sampleAt(p.x,p.y));
  const distance=ruler.length===2?Math.hypot(ruler[1].x-ruler[0].x,ruler[1].y-ruler[0].y):null;
  const sectionLength=section.length===2?Math.hypot(section[1].x-section[0].x,section[1].y-section[0].y):0;
  const sectionPoints=section.length===2?Array.from({length:160},(_,i)=>{const q=i/159;return{x:q*sectionLength,y:(()=>{const r=engine.sampleAt(section[0].x+(section[1].x-section[0].x)*q,section[0].y+(section[1].y-section[0].y)*q);return r.solid?NaN:r.displacement*1000;})()};}):[];
  const sceneProps={engine,display,camera,exaggeration,huygens,huygensStep,secondaryCount,showNodes,nodeThreshold,showMaxima,probes,onPick,dark};
  const step=()=>{setRunning(false);const count=Math.max(1,Math.round((1/params.frequency/32)/engine.grid.dt));for(let i=0;i<count;i++){engine.step();if(mode==='comparison')compareRef.current?.step();capture();}setSamples([...sampleRef.current]);setTick(t=>t+1);};
  void tick;
  return <div className={`app ${mode==='presentation'?'presentation':''}`}>
    <header className="app-header"><button className="brand" onClick={()=>setPage('lab')} aria-label="Retour au laboratoire"><span className="brand-icon"><Waves size={24}/></span><span>Diffraction <strong>Lab 3D</strong><small>LABORATOIRE VIRTUEL DE MÉCANIQUE ONDULATOIRE</small></span><span className="version">BÊTA SCIENTIFIQUE</span></button><nav className="header-actions"><button className={page==='validation'?'text-button selected':'text-button'} onClick={()=>{setPage('validation');}}><ShieldCheck size={16}/><span>Validation scientifique</span></button><IconButton label="Comment fonctionne la simulation ?" active={page==='help'} onClick={()=>setPage(page==='help'?'lab':'help')}><CircleHelp size={19}/></IconButton><span className="header-divider"/><IconButton label={dark?'Activer le mode clair':'Activer le mode sombre'} onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</IconButton></nav></header>
    {page!=='lab'?<main className="document-page"><button className="text-button back" onClick={()=>setPage('lab')}><ArrowLeft size={16}/>Retour au laboratoire</button>{page==='help'?<HelpContent/>:<><span className="eyebrow">LA SCIENCE, VÉRIFIABLE</span><h1>Validation scientifique</h1><p className="document-lead">Ces expériences de référence exécutent le moteur numérique dans votre navigateur. Aucun statut n’est prérempli.</p><button className="primary-button" onClick={startValidation} disabled={validating}><Activity size={17}/>{validating?'Calcul des expériences de référence…':'Exécuter les validations'}</button>{validation&&<p className="validation-summary">{validation.filter(r=>r.passed).length} / {validation.length} vérifications satisfaites · résultats calculés à l’instant</p>}<div className="validation-grid">{validation?.map(r=><article className="card validation-card" key={r.id}><span className={`status-chip ${r.passed?'pass':'fail'}`}>{r.passed?<Check size={14}/>:<X size={14}/>} {r.passed?'Vérifié':'À examiner'}</span><h3>{r.title}</h3><p>{r.objective}</p><dl><dt>Paramètres</dt><dd>{r.parameters}</dd><dt>Prédiction</dt><dd>{r.prediction}</dd><dt>Résultat calculé</dt><dd>{r.result}</dd>{r.error&&<><dt>Écart / tolérance</dt><dd>{r.error}</dd></>}</dl>{r.limitation&&<p className="science-note">{r.limitation}</p>}</article>)}</div><p className="science-note">Ces validations concernent le modèle scalaire discrétisé, pas une validation expérimentale complète des ondes gravito-capillaires. Les détails, tolérances et limites figurent dans la documentation du projet.</p></>}</main>:<>
    <div className="workspace-top"><div><span className="eyebrow">VOTRE ESPACE D’EXPÉRIMENTATION</span><h1>Explorer les ondes.</h1><p>Manipulez. Observez. Comprenez.</p></div><div className="mode-tabs" role="tablist" aria-label="Mode du laboratoire">{MODES.map(m=><button role="tab" aria-selected={mode===m.id} key={m.id} onClick={()=>chooseMode(m.id)}>{m.label}</button>)}</div></div>
    <main className={`lab-layout ${!sidebar?'sidebar-hidden':''}`}>
      {sidebar&&<aside className="sidebar">
        <section className="panel experiment-library"><div className="panel-heading"><FlaskConical size={16}/><h2>Expériences</h2><span className="count">10</span></div><div className="experiment-list">{EXPERIMENTS.map((e,i)=><button className={`experiment-button ${scenario===e.id?'chosen':''}`} key={e.id} onClick={()=>chooseExperiment(e.id)}><span className="experiment-number">{String(i+1).padStart(2,'0')}</span><span>{e.shortTitle}</span>{scenario===e.id?<span className="active-dot"/>:<ChevronRight size={13}/>}</button>)}</div></section>
        <section className="panel parameters"><div className="panel-heading"><SlidersHorizontal size={16}/><h2>Paramètres physiques</h2><span className="live-dot" title="Réglages actifs pendant le calcul"/></div>
          <div className="parameter-body"><div className="select-row"><label htmlFor="source-kind">Source d’onde</label><select id="source-kind" value={params.source} onChange={e=>update({source:e.target.value as Parameters['source']})}><option value="plane">Rectiligne</option><option value="point">Ponctuelle</option><option value="pair">Deux sources cohérentes</option></select></div>
          <ParameterControl label="Fréquence" symbol="f" unit="Hz" value={params.frequency} min={1} max={20} step={.1} onChange={v=>update({frequency:v})} hint="Nombre d’oscillations par seconde"/>
          <ParameterControl label="Célérité" symbol="v" unit="m/s" value={params.speed} min={.5} max={4} step={.05} onChange={v=>update({speed:v})} hint="Vitesse de propagation dans le modèle non dispersif"/>
          <ParameterControl label="Amplitude source" symbol="A₀" unit="mm" value={params.amplitude*1000} min={.1} max={10} step={.1} onChange={v=>update({amplitude:v/1000})}/>
          <div className="select-row"><label htmlFor="obstacle-kind">Géométrie</label><select id="obstacle-kind" value={params.obstacle} onChange={e=>update({obstacle:e.target.value as Parameters['obstacle']})}><option value="none">Sans obstacle</option><option value="slit">Fente simple</option><option value="double">Double fente</option><option value="circle">Obstacle circulaire</option><option value="rectangle">Obstacle rectangulaire</option><option value="edge">Bord unique</option></select></div>
          {(params.obstacle==='slit'||params.obstacle==='double')&&<ParameterControl label="Largeur de fente" symbol="a" unit="m" value={params.aperture} min={.04} max={1.2} step={.01} onChange={v=>update({aperture:v})}/>}
          {params.obstacle==='double'&&<ParameterControl label="Écartement des fentes" symbol="d" unit="m" value={params.separation} min={.1} max={1.2} step={.01} onChange={v=>update({separation:v})}/>}
          {['circle','rectangle'].includes(params.obstacle)&&<ParameterControl label={params.obstacle==='circle'?'Diamètre':'Largeur obstacle'} symbol="D" unit="m" value={params.obstacleWidth} min={.05} max={1} step={.01} onChange={v=>update({obstacleWidth:v})}/>}
          {params.obstacle==='rectangle'&&<ParameterControl label="Hauteur obstacle" symbol="h" unit="m" value={params.obstacleHeight} min={.05} max={1.2} step={.01} onChange={v=>update({obstacleHeight:v})}/>}
          {params.source==='pair'&&<><ParameterControl label="Séparation des sources" symbol="dₛ" unit="m" value={params.sourceSeparation} min={.1} max={1} step={.01} onChange={v=>update({sourceSeparation:v})}/><ParameterControl label="Déphasage des sources" symbol="Δφ" unit="°" value={params.phase} min={-180} max={180} step={1} onChange={v=>update({phase:v})}/></>}
          <div className="derived-values"><span>Longueur d’onde <b>λ = {fmt(lambda,3)} m</b></span><span>Période <b>T = {fmt(1/params.frequency,3)} s</b></span></div>
          <button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)}><Settings2 size={14}/>Réglages avancés<ChevronDown size={14} className={advanced?'rotated':''}/></button>
          {advanced&&<div className="advanced-controls"><label className="check-row"><input type="checkbox" checked={params.sourceEnabled} onChange={e=>update({sourceEnabled:e.target.checked})}/>Source active</label><ParameterControl label="Position de source x" symbol="xₛ" unit="m" value={params.sourceX} min={.12} max={1} step={.01} onChange={v=>update({sourceX:v})}/><ParameterControl label="Position de source y" symbol="yₛ" unit="m" value={params.sourceY} min={.2} max={1.4} step={.01} onChange={v=>update({sourceY:v})}/>{params.source==='plane'&&<ParameterControl label="Direction incidente" symbol="θ" unit="°" value={params.sourceAngle} min={-70} max={70} step={1} onChange={v=>update({sourceAngle:v})}/>}{params.source!=='pair'&&<ParameterControl label="Phase initiale" symbol="φ₀" unit="°" value={params.phase} min={-180} max={180} step={1} onChange={v=>update({phase:v})}/>}<ParameterControl label="Position obstacle x" symbol="xₒ" unit="m" value={params.obstacleX} min={.8} max={2.2} step={.01} onChange={v=>update({obstacleX:v})}/><ParameterControl label="Position obstacle y" symbol="yₒ" unit="m" value={params.obstacleY} min={.25} max={1.35} step={.01} onChange={v=>update({obstacleY:v})}/><div className="derived-edit"><label>Période T (s)<NumericInput value={1/params.frequency} min={.05} max={1} step={.001} label="Période" onChange={v=>update({frequency:1/v})}/></label><label>Longueur λ (m)<NumericInput value={lambda} min={params.speed/20} max={params.speed} step={.001} label="Longueur d’onde" onChange={v=>update({frequency:params.speed/v})}/></label></div><div className="select-row"><label htmlFor="boundary">Bords de cuve</label><select id="boundary" value={params.boundary} onChange={e=>update({boundary:e.target.value as Parameters['boundary']})}><option value="absorbing">Absorbants (couche amortissante)</option><option value="reflecting">Réfléchissants</option></select></div><div className="select-row"><label htmlFor="resolution">Résolution du solveur</label><select id="resolution" value={params.resolution} onChange={e=>{update({resolution:e.target.value as Parameters['resolution']});setNotice('Le maillage change : le calcul est réinitialisé.');}}><option value="performance">Performance</option><option value="balanced">Équilibré</option><option value="precision">Haute précision</option></select></div><p className="muted micro">Un changement de maillage recommence l’expérience. Les autres paramètres modifient le champ futur, sans effacer les ondes présentes.</p></div>}
          </div></section>
        <div className="model-note"><ShieldCheck size={16}/><p><b>Un modèle, des limites explicites.</b>Équation d’onde scalaire 2D, linéaire et non dispersive. <button onClick={()=>setPage('help')}>Comprendre le modèle <ArrowRight size={12}/></button></p></div>
      </aside>}
      <div className="lab-main">{mode==='presentation'&&<section className="panel presentation-equations"><div><span className="eyebrow">MODÈLE SCALAIRE LINÉAIRE</span><strong>∂²η/∂t² = v² ∇²η</strong><span>λ = v/f · T = 1/f</span></div><label className="check-row"><input type="checkbox" checked={annotations} onChange={e=>setAnnotations(e.target.checked)}/>Annotations explicatives</label><button className="secondary-button" onClick={()=>setSidebar(!sidebar)}><Settings2 size={16}/>{sidebar?'Masquer les réglages':'Afficher les réglages'}</button></section>}<section className="panel simulation-panel"><div className="simulation-heading"><div className="experiment-title"><span className="eyebrow">EXPÉRIENCE {String(EXPERIMENTS.findIndex(e=>e.id===scenario)+1).padStart(2,'0')}</span><h2>{experiment.title.replace(/^\d+ · /,'')}</h2></div><div className="simulation-actions"><span className="calculation-badge"><span className={running?'live-dot':'paused-dot'}/>{running?'Calcul en direct':'En pause'}</span><IconButton label={sidebar?'Masquer les commandes':'Afficher les commandes'} onClick={()=>setSidebar(!sidebar)}><Settings2 size={17}/></IconButton><IconButton label="Capturer l’expérience en PNG" onClick={exportPng}><ArrowDownToLine size={17}/></IconButton><IconButton label="Plein écran" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>setNotice('Le plein écran est indisponible dans ce navigateur.'));}}><Expand size={17}/></IconButton></div></div>
        <div className="scene-toolbar"><div className="segmented">{([{id:'iso',label:'Isométrique'},{id:'top',label:'Dessus'},{id:'profile',label:'Profil'},{id:'free',label:'3D libre'}] as const).map(v=><button className={camera===v.id?'selected':''} key={v.id} onClick={()=>setCamera(v.id)}>{v.label}</button>)}</div><div className="toolbar-end"><Layers size={14}/><select aria-label="Grandeur visualisée" value={display} onChange={e=>setDisplay(e.target.value as DisplayField)}><option value="displacement">Élongation instantanée</option><option value="amplitude">Amplitude locale estimée</option><option value="intensity">Intensité relative</option></select></div></div>
        <div className={`viewport ${mode==='comparison'?'split-view':''}`}><div className="scene-container"><div className="scene-corner-label"><span>CUVE NUMÉRIQUE</span><small>2,80 × 1,60 m {mode==='comparison'?`· a = ${fmt(params.aperture)} m`:''}</small></div><WaveScene {...sceneProps} onCanvasReady={c=>{sceneCanvas.current=c;}}/><div className="scene-hint"><MousePointer2 size={13}/>{tool==='probe'?'Cliquez sur l’eau pour placer une sonde':tool==='ruler'?'Sélectionnez deux crêtes successives':'Choisissez les deux extrémités de la coupe'}<span>Glisser pour tourner · molette pour zoomer</span></div></div>{mode==='comparison'&&compareRef.current&&<div className="scene-container"><div className="scene-corner-label"><span>EXPÉRIENCE COMPARÉE</span><small>a = {fmt(compareAperture)} m · t = {fmt(compareRef.current.time,3)} s</small></div><WaveScene {...sceneProps} engine={compareRef.current} huygens={false} probes={[]} onPick={()=>{}}/></div>}
          <div className="scene-tools"><IconButton label="Placer une sonde (deux au maximum)" active={tool==='probe'} onClick={()=>{setTool('probe');setMode(m=>m==='discovery'?'analysis':m);}}><Focus size={17}/></IconButton><IconButton label="Mesurer une distance" active={tool==='ruler'} onClick={()=>{setTool('ruler');setMode('analysis');setCamera('top');}}><Ruler size={17}/></IconButton><IconButton label="Tracer une coupe" active={tool==='section'} onClick={()=>{setTool('section');setMode('analysis');setCamera('top');setSection([]);}}><Activity size={17}/></IconButton></div>
          <div className="color-legend"><span>{display==='displacement'?'Élongation η (mm)':display==='amplitude'?'Amplitude estimée (mm)':'Intensité relative A²/A₀²'}</span><div className={display==='displacement'?'legend-gradient diverging':'legend-gradient sequential'}/><div className="legend-values"><span>{display==='displacement'?`−${fmt(params.amplitude*1000,1)}`:'0'}</span><span>{display==='displacement'?'0':''}</span><span>{display==='intensity'?'1':`+${fmt(params.amplitude*1000,1)}`}</span></div><small>Échelle de couleur saturée hors limites</small></div>
        </div>
        <div className="playback-bar"><div className="playback-controls"><IconButton label="Recommencer l’expérience" onClick={reset}><RotateCcw size={17}/></IconButton><button className="play-button" aria-label={running?'Mettre en pause':'Démarrer'} onClick={()=>setRunning(!running)}>{running?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}<span>{running?'Pause':'Démarrer'}</span></button><IconButton label="Avancer d’un pas d’observation" onClick={step}><SkipForward size={18}/></IconButton><span className="playback-divider"/><label className="speed-control">Vitesse<select aria-label="Vitesse de lecture" value={playback} onChange={e=>setPlayback(Number(e.target.value))}><option value={.1}>0,1×</option><option value={.25}>0,25×</option><option value={.5}>0,5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label></div><div className="physical-clock"><span>TEMPS PHYSIQUE</span><strong>{fmt(engine.time,3)} <small>s</small></strong></div></div>
      </section>
      <div className="metrics-row"><div className="metric"><span>LONGUEUR D’ONDE</span><strong><i>λ</i> {fmt(lambda,3)} <small>m</small></strong><small>λ = v / f · valeur du modèle</small></div><div className="metric"><span>PÉRIODE</span><strong><i>T</i> {fmt(1/params.frequency,3)} <small>s</small></strong><small>T = 1 / f</small></div><div className="metric ratio-metric"><span>RAPPORT D’OUVERTURE</span><strong><i>a/λ</i> {fmt(ratio,2)}</strong><small>{params.obstacle==='slit'||params.obstacle==='double'?ratio<=1?'Diffraction importante attendue':'Propagation plus directionnelle attendue':'Rapport pertinent avec une fente'}</small></div><div className="metric"><span>MAILLAGE NUMÉRIQUE</span><strong>{engine.grid.nx} <small>×</small> {engine.grid.ny}</strong><small>Δx = {fmt(engine.grid.dx,3)} m · CFL = {fmt(engine.grid.cfl)}</small></div></div>
      {engine.warnings.length>0&&<div className="warning-box" role="status">{engine.warnings.map((w,i)=><p key={i}>{w}</p>)}{mode==='comparison'&&compareRef.current?.warnings.filter(w=>!engine.warnings.includes(w)).map((w,i)=><p key={`c${i}`}>Seconde cuve : {w}</p>)}</div>}
      {mode==='comparison'&&<section className="panel compare-controls"><div><h3>Une variable, deux expériences.</h3><p className="muted">La largeur de la seconde fente varie ; les horloges sont synchronisées.</p></div><ParameterControl label="Fente de la seconde cuve" symbol="a₂" unit="m" value={compareAperture} min={.04} max={1.2} step={.01} onChange={v=>{setCompareAperture(v);compareRef.current?.updateParameters({aperture:v});}}/><button className="secondary-button" onClick={()=>{setCompareAperture(params.aperture);compareRef.current?.updateParameters({...params});reset();}}><Copy size={15}/>Recopier les paramètres</button></section>}
      {(mode==='huygens'||huygens)&&<section className="panel huygens-panel"><div className="panel-heading"><Radio size={17}/><h2>Le principe de Huygens-Fresnel</h2><span className="theory-badge">ILLUSTRATION PÉDAGOGIQUE</span></div><div className="huygens-body"><div><span className="eyebrow">ÉTAPE {huygensStep} / 7</span><p>{HUYG[huygensStep-1]}</p><div className="step-dots">{HUYG.map((_,i)=><button key={i} aria-label={`Étape ${i+1}`} className={huygensStep===i+1?'active':''} onClick={()=>setHuygensStep(i+1)}>{i+1}</button>)}<button className="text-button" onClick={()=>setHuygensStep(s=>Math.min(7,s+1))}>Suivant<ArrowRight size={14}/></button></div></div><div><ParameterControl label="Sources secondaires visibles" symbol="N" unit="points" value={secondaryCount} min={3} max={25} step={2} onChange={setSecondaryCount}/><p className="muted micro">Aucune onde supplémentaire n’est injectée dans le solveur.</p></div></div></section>}
      {mode==='analysis'&&<>
      <section className="panel analysis-panel"><div className="panel-heading"><Focus size={17}/><h2>Mesures dans la cuve</h2><span className="data-badge">DONNÉES DU SOLVEUR</span>{probes.length<2&&<button className="text-button" onClick={()=>{setProbes(p=>[...p,{x:2.1,y:.8}]);arrivals.current=[null,null];arrivalEligible.current=false;sampleRef.current=[];setSamples([]);}}>Ajouter une sonde</button>}<button className="text-button" onClick={()=>{setProbes([]);arrivals.current=[null,null];sampleRef.current=[];setSamples([]);}}>Effacer les sondes</button></div><div className="probe-grid">{readings.map((r,i)=><div className="probe-card" key={i}><div className="probe-title"><span className={`probe-dot probe-${i}`}/><b>Sonde {i+1}</b><span>x = {fmt(r.x)} m · y = {fmt(r.y)} m{r.solid?' · DANS UN OBSTACLE':''}</span></div><div className="probe-position"><label>x (m)<NumericInput label={`Position x de la sonde ${i+1}`} value={probes[i].x} min={0} max={engine.grid.width} step={.01} onChange={v=>moveProbe(i,{x:v})}/></label><label>y (m)<NumericInput label={`Position y de la sonde ${i+1}`} value={probes[i].y} min={0} max={engine.grid.height} step={.01} onChange={v=>moveProbe(i,{y:v})}/></label></div><div className="probe-stats"><span>η instantanée<b>{r.solid?'—':`${fmt(r.displacement*1000,3)} mm`}</b></span><span>Amplitude estimée<b>{r.solid?'—':engine.measurementReady?`${fmt(r.amplitude*1000,3)} mm`:'Acquisition…'}</b></span><span>Phase harmonique<b>{engine.measurementReady&&r.phase!==null?`${fmt(r.phase*180/Math.PI,1)}°`:'Indéfinie'}</b></span></div></div>)}</div><div className="chart-section"><LineChart series={[...(probes.length>0&&!readings[0].solid?[{label:'Sonde 1',color:'#218dba',points:samples.map(s=>({x:s.t,y:s.a}))}]:[]),...(probes.length>1&&!readings[1].solid?[{label:'Sonde 2',color:'#c26a46',points:samples.map(s=>({x:s.t,y:s.b}))}]:[])]} xLabel="Temps t (s)" yLabel="Élongation η (mm)"/>{readings.length===2&&<p className="muted">Déphasage estimé : {engine.measurementReady&&readings.every(r=>r.phase!==null)?`${fmt(Math.atan2(Math.sin(readings[1].phase!-readings[0].phase!),Math.cos(readings[1].phase!-readings[0].phase!))*180/Math.PI,1)}°`:'en attente de signaux mesurables'}.</p>}<p className="muted">Arrivée opérationnelle (|η| ≥ 5 % de A₀) : {arrivalEligible.current?probes.map((_,i)=>`S${i+1} : ${arrivals.current[i]!==null?`${fmt(arrivals.current[i]!,3)} s`:"non détectée"}`).join(" · "):"recommencez l’expérience après avoir placé les sondes"}{arrivalEligible.current&&arrivals.current.every(t=>t!==null)&&probes.length===2?` · Δt = ${fmt(arrivals.current[1]!-arrivals.current[0]!,3)} s`:""}. Échantillonnage ≤ {fmt((.004+engine.grid.dt)*1000,1)} ms ; seuil dépendant du signal, pas un front exact.</p><p className="science-note">Une élongation nulle à un instant ne signifie pas une amplitude nulle. L’amplitude et la phase sont estimées sur une période complète ; les transitoires et réflexions peuvent perturber cette estimation. La phase perd son sens aux nœuds.</p></div>
      </section><div className="analysis-columns"><section className="panel"><div className="panel-heading"><Ruler size={16}/><h2>Règle et coupe spatiale</h2></div><div className="analysis-body"><div className="tool-buttons"><button className="secondary-button" onClick={()=>{setTool('ruler');setCamera('top');setRuler([]);}}><Ruler size={14}/>Mesurer λ</button><button className="secondary-button" onClick={()=>{setTool('section');setCamera('top');setSection([]);}}><Activity size={14}/>Tracer une coupe</button></div><p className="muted">Distance : <b>{distance!==null?`${fmt(distance,3)} m`:`${ruler.length} / 2 points`}</b> · λ du modèle : {fmt(lambda,3)} m{distance!==null?` · écart ${fmt(Math.abs(distance-lambda)/lambda*100,1)} %`:''}</p><p className="muted micro">Choisissez deux crêtes consécutives, dans la direction de propagation et hors des obstacles. Cette distance n’est une mesure de λ que dans cette configuration.</p>{ruler.map((p,i)=><span className="coordinate-tag" key={i}>P{i+1} ({fmt(p.x)}, {fmt(p.y)}) m</span>)}<LineChart series={[{label:'Coupe du champ instantané',color:'#218dba',points:sectionPoints}]} xLabel="Distance le long de la coupe (m)" yLabel="η (mm)" height={180}/><p className="muted micro">Coupe : {section.map(p=>`(${fmt(p.x)}, ${fmt(p.y)}) m`).join(' → ')||'choisir deux points dans la cuve'}. Les segments dans les obstacles sont exclus.</p></div></section><section className="panel"><div className="panel-heading"><Activity size={16}/><h2>Diffraction en champ lointain</h2><span className="theory-badge">THÉORIE</span></div><div className="analysis-body"><AngularMeasurement engine={engine}/><FraunhoferChart aperture={params.aperture} wavelength={lambda}/></div></section></div>
      <section className="panel visualization-controls"><label className="check-row"><input type="checkbox" checked={showNodes} onChange={e=>{setShowNodes(e.target.checked);if(e.target.checked)setDisplay('amplitude');}}/>Afficher les zones de faible amplitude</label><ParameterControl label="Seuil nodal relatif" symbol="A/A₀" unit="" value={nodeThreshold} min={.01} max={.3} step={.01} onChange={setNodeThreshold}/><label className="check-row"><input type="checkbox" checked={showMaxima} onChange={e=>setShowMaxima(e.target.checked)}/>Afficher les maxima locaux</label><p className="micro muted">Seuil mesuré, pas un zéro exact. Une zone non encore atteinte par l’onde a aussi une amplitude faible.</p></section>
      </>}
      {(mode!=='presentation'||annotations)&&<section className="panel insight-panel"><div className="insight-icon"><BookOpen size={20}/></div><div><span className="eyebrow">À OBSERVER</span><h3>{experiment.objective}</h3><p>{experiment.explanation}</p><details><summary>Prédiction à confronter au calcul</summary><p>{experiment.prediction}</p></details></div><div className="quick-presets"><span>COMPARER a / λ</span><div>{[{a:.1,label:'0,5'},{a:.2,label:'1'},{a:.8,label:'4'}].map(p=><button key={p.a} className={Math.abs(ratio-Number(p.label.replace(',','.')))<.01?'active':''} onClick={()=>{update({speed:2,frequency:10,aperture:p.a,obstacle:'slit',source:'plane'});reset();}}>{p.label}</button>)}</div></div></section>}
      <div className="view-settings"><label className="relief-control">Relief visuel <input aria-label="Exagération verticale" type="range" min={1} max={30} value={exaggeration} onChange={e=>setExaggeration(Number(e.target.value))}/><b>×{exaggeration}</b><span>sans effet sur l’amplitude physique</span></label><label className="check-row"><input type="checkbox" checked={huygens} onChange={e=>setHuygens(e.target.checked)}/>Visualisation de Huygens</label><button className="text-button" onClick={exportJson}><ArrowDownToLine size={14}/>Exporter JSON</button><button className="text-button" onClick={()=>fileInput.current?.click()}><Upload size={14}/>Importer</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importJson(f);e.currentTarget.value='';}}/></div>{jsonError&&<p className="warning-box" role="alert">{jsonError}</p>}
      </div>
    </main><footer className="app-footer"><span><span className="live-dot"/>Calcul FDTD · Même champ pour la cuve, les cartes et les sondes</span><span>Δt = {fmt(engine.grid.dt*1000,3)} ms · Modèle pédagogique non dispersif</span></footer>
    </>}{notice&&<div className="toast" role="status"><Check size={16}/>{notice}<button aria-label="Fermer le message" onClick={()=>setNotice('')}><X size={14}/></button></div>}
  </div>;
}
