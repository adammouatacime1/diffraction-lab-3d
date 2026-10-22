import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Expand, FlaskConical, Focus, Layers, Moon, MousePointer2, Pause, Play, Radio, RotateCcw, Ruler, Settings2, ShieldCheck, SkipForward, SlidersHorizontal, Sun, Upload, Waves, X, ZoomIn } from 'lucide-react';
import { WaveEngine } from './physics/WaveEngine';
import { runValidation } from './physics/validation';
import { runAcousticValidation } from './physics/acousticValidation';
import type { AcousticView, CameraView, DisplayField, LabMode, MediumKind, Parameters, ProbePosition, ValidationResult } from './types';
import { EXPERIMENTS as WATER_EXPERIMENTS, SOUND_EXPERIMENTS } from './data/experiments';
import { MEDIA, defaultProbes, dimensionRatio, frequencyLimit } from './data/media';
import { parseSession, serializeSession } from './data/sessionFormat';
import { WaveScene } from './components/WaveScene';
import { AcousticViews } from './components/AcousticViews';
import { AcousticAnalysis } from './components/AcousticAnalysis';
import { DiffractionObservation } from './components/DiffractionObservation';
import { ParameterControl, NumericInput } from './components/ParameterControl';
import { LineChart, FraunhoferChart, AngularMeasurement } from './components/ScientificCharts';
import { HelpContent } from './components/HelpContent';
import { ThetaDemonstration } from './components/ThetaDemonstration';
import { angleOverlay, type ThetaMode } from './physics/thetaOverlay';
import { linkVisualEngines } from './physics/visualSnapshot';
import './styles/acoustic-views.css';
import './styles/media.css';

const fmt=(n:number,d=2)=>n.toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
const MODES:{id:LabMode;label:string}[]=[{id:'discovery',label:'Découverte'},{id:'huygens',label:'Huygens'},{id:'analysis',label:'Analyse'},{id:'comparison',label:'Comparaison'},{id:'presentation',label:'Présentation'}];
const HUYG=["Repérez les fronts incidents : chaque crête rassemble des points de même phase.","La portion du front située dans l’ouverture transmet la perturbation.","Les points lumineux représentent une distribution de sources secondaires virtuelles.","Les ondelettes illustrent la propagation depuis les points de l’ouverture.","Les contributions se superposent. La densité des points ne change pas le calcul physique.","Observez le champ diffracté, calculé par le solveur FDTD.","Les illustrations sont masquées : seul le champ numérique reste visible."];
interface Sample { t:number; a:number; b:number }
interface MediumSession { parameters:Parameters; scenario:string; playback:number; exaggeration:number; probes:ProbePosition[] }
function IconButton({children,label,onClick,active=false}:{children:ReactNode;label:string;onClick:()=>void;active?:boolean}) { return <button className={`icon-button ${active?'active':''}`} title={label} aria-label={label} aria-pressed={active} onClick={onClick}>{children}</button>; }
function download(blob:Blob,name:string){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
const initialMedium=():MediumKind=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('medium')==='sound'?'sound':'water';
function nearestFree(engine:WaveEngine,point:ProbePosition):ProbePosition {
  if(!engine.sampleAt(point.x,point.y).solid)return {...point};
  const {nx,ny,dx,dy}=engine.grid;let best={x:0,y:0},distance=Infinity;
  for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++)if(!engine.mask[j*nx+i]){
    const d=(i*dx-point.x)**2+(j*dy-point.y)**2;
    if(d<distance){distance=d;best={x:i*dx,y:j*dy};}
  }
  return best;
}

/** Exportable lab boundary. Its host can stop and unmount every scene with active=false. */
export function DiffractionLaboratory({active=true}:{active?:boolean}={}) {
  const [params,setParams]=useState<Parameters>(()=>({...MEDIA[initialMedium()].defaults}));
  const engineRef=useRef<WaveEngine|null>(null); if(!engineRef.current)engineRef.current=new WaveEngine(params);
  const engine=engineRef.current;
  const acoustic=params.medium==='sound';const medium=params.medium;const units=MEDIA[medium];
  const EXPERIMENTS=acoustic?SOUND_EXPERIMENTS:WATER_EXPERIMENTS;
  const compareRef=useRef<WaveEngine|null>(null);
  const releaseVisualGroup=useRef<(()=>void)|null>(null);
  const clearVisualGroup=()=>{releaseVisualGroup.current?.();releaseVisualGroup.current=null;};
  useEffect(()=>()=>{releaseVisualGroup.current?.();releaseVisualGroup.current=null;},[]);
  const [mode,setMode]=useState<LabMode>('discovery');
  const [page,setPage]=useState<'lab'|'help'|'validation'>('lab');
  const [dark,setDark]=useState(false),[running,setRunning]=useState(true),[playback,setPlayback]=useState<number>(units.defaultPlayback);
  const [scenario,setScenario]=useState(()=>initialMedium()==='sound'?'gbf':'narrow'),[display,setDisplay]=useState<DisplayField>('displacement');
  const [camera,setCamera]=useState<CameraView>('iso'),[exaggeration,setExaggeration]=useState(10);
  const [soundView,setSoundView]=useState<AcousticView>('2d'),[showWavefronts,setShowWavefronts]=useState(false);
  const [selectedMicrophone,setSelectedMicrophone]=useState(0);
  const [soundFocused,setSoundFocused]=useState(true);
  const focused=acoustic&&soundFocused;
  const [zoomEnabled,setZoomEnabled]=useState(false),[showTheta,setShowTheta]=useState(false);
  const [thetaMode,setThetaMode]=useState<ThetaMode>('minimum'),[thetaObservationAngle,setThetaObservationAngle]=useState(30);
  const [sidebar,setSidebar]=useState(true),[advanced,setAdvanced]=useState(false),[annotations,setAnnotations]=useState(true);
  const [huygens,setHuygens]=useState(false),[huygensStep,setHuygensStep]=useState(3),[secondaryCount,setSecondaryCount]=useState(9);
  const [showNodes,setShowNodes]=useState(false),[nodeThreshold,setNodeThreshold]=useState(.08),[showMaxima,setShowMaxima]=useState(false);
  const [tool,setTool]=useState<'probe'|'ruler'|'section'>('probe');
  const [probes,setProbes]=useState<ProbePosition[]>(()=>defaultProbes(medium));
  const [ruler,setRuler]=useState<ProbePosition[]>([]),[section,setSection]=useState<ProbePosition[]>([{x:.4,y:.8},{x:2.5,y:.8}]);
  const [samples,setSamples]=useState<Sample[]>([]),[tick,setTick]=useState(0);
  const [notice,setNotice]=useState(''),[validation,setValidation]=useState<ValidationResult[]|null>(null),[validating,setValidating]=useState(false);
  const [compareAperture,setCompareAperture]=useState(acoustic?.68:.8);
  const [visible,setVisible]=useState(()=>!document.hidden);
  const sceneCanvas=useRef<HTMLCanvasElement|null>(null),[jsonError,setJsonError]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);
  const clock=useRef({last:0,acc:0,lastSample:0,lastUI:0});
  const sampleRef=useRef<Sample[]>([]);
  const probesRef=useRef(probes);probesRef.current=probes;
  const arrivals=useRef<(number|null)[]>([null,null]);
  const arrivalEligible=useRef(true);
  const sessions=useRef<Record<MediumKind,MediumSession>>({
    water:{parameters:{...MEDIA.water.defaults},scenario:'narrow',playback:.25,exaggeration:10,probes:defaultProbes('water')},
    sound:{parameters:{...MEDIA.sound.defaults},scenario:'gbf',playback:1,exaggeration:10,probes:defaultProbes('sound')},
  });
  const clearHistory=()=>{arrivals.current=[null,null];sampleRef.current=[];setSamples([]);clock.current={last:0,acc:0,lastSample:0,lastUI:0};};
  const saveMedium=()=>{sessions.current[medium]={parameters:{...engine.parameters},scenario,playback,exaggeration,probes:probes.map(p=>({...p}))};};
  const replaceMedium=(next:Parameters,session?:MediumSession,prepared?:WaveEngine)=>{
    if(validationTimer.current){clearTimeout(validationTimer.current);validationTimer.current=null;}
    clearVisualGroup();
    saveMedium();engineRef.current=prepared??new WaveEngine(next);compareRef.current=null;
    const replacement=engineRef.current;
    setParams({...replacement.parameters});setScenario(session?.scenario??(next.medium==='sound'?'gbf':'narrow'));
    setSoundFocused(next.medium==='sound'&&(session?session.scenario==='gbf':next.source==='point'&&next.obstacle==='slit'));setSoundView('2d');
    setPlayback(session?.playback??MEDIA[next.medium].defaultPlayback);setExaggeration(session?.exaggeration??10);
    setProbes((session?.probes??defaultProbes(next.medium)).map(p=>nearestFree(replacement,p)));
    setMode('discovery');setSidebar(true);setHuygens(false);setShowNodes(false);setShowMaxima(false);
    setDisplay('displacement');setShowTheta(false);setZoomEnabled(false);setRuler([]);setSection([{x:.4,y:.8},{x:2.5,y:.8}]);
    setSelectedMicrophone(0);setTool('probe');setCompareAperture(next.medium==='sound'?.68:.8);
    setValidation(null);setValidating(false);setJsonError('');setRunning(false);sceneCanvas.current=null;arrivalEligible.current=true;clearHistory();setTick(t=>t+1);
  };
  const changeMedium=(next:MediumKind)=>{if(next===medium)return;replaceMedium(sessions.current[next].parameters,sessions.current[next]);if(next==='sound'&&sessions.current.sound.scenario==='gbf')setRunning(true);setNotice(`${MEDIA[next].label} : paramètres restaurés ; champ et mesures réinitialisés.`);};
  const capture=()=>{
    const positions=probesRef.current;if(!positions.length)return;
    const readings=positions.map(p=>engine.sampleAt(p.x,p.y));if(readings.some(r=>r.solid))return;
    const scale=MEDIA[engine.parameters.medium].fieldScale;
    sampleRef.current.push({t:engine.time,a:readings[0].displacement*scale,b:(readings[1]?.displacement??0)*scale});
    if(sampleRef.current.length>(engine.parameters.medium==='sound'?2048:500))sampleRef.current.shift();
    readings.forEach((r,i)=>{if(arrivalEligible.current&&arrivals.current[i]===null&&Math.abs(r.displacement)>=.05*engine.parameters.amplitude)arrivals.current[i]=engine.time;});
  };
  const playbackRef=useRef(playback);playbackRef.current=playback;
  const modeRef=useRef(mode);modeRef.current=mode;
  const reset=useCallback(()=>{arrivals.current=[null,null];arrivalEligible.current=true;engine.reset();compareRef.current?.reset();clock.current.acc=0;clock.current.lastSample=0;sampleRef.current=[];setSamples([]);setTick(t=>t+1);},[engine]);
  const update=useCallback((patch:Partial<Parameters>)=>{
    const candidate={...engine.parameters,...patch};
    if(candidate.medium==='sound'&&candidate.source==='pair'){
      const maximumSeparation=2*Math.min(candidate.sourceY,engine.grid.height-candidate.sourceY);
      if(candidate.sourceSeparation>maximumSeparation)patch={...patch,sourceSeparation:maximumSeparation};
    }
    engine.updateParameters(patch);
    if(engine.parameters.medium==='sound'){
      const max=frequencyLimit(engine.parameters,engine.grid);
      if(engine.parameters.frequency>max){engine.updateParameters({frequency:max});setNotice(`Fréquence limitée à ${max} Hz pour conserver au moins 12 cellules par longueur d’onde.`);}
      if(Object.keys(patch).some(key=>key!=='sourceEnabled'))engine.reset();
      arrivals.current=[null,null];arrivalEligible.current=true;clock.current.acc=0;clock.current.lastSample=0;sampleRef.current=[];setSamples([]);
      setProbes(current=>current.map(p=>nearestFree(engine,p)));
    }else arrivalEligible.current=false;
    setParams({...engine.parameters});
    if(compareRef.current){compareRef.current.updateParameters({...engine.parameters,aperture:compareAperture});if(engine.parameters.medium==='sound'&&Object.keys(patch).some(key=>key!=='sourceEnabled'))compareRef.current.reset();}
    if(patch.resolution){arrivals.current=[null,null];arrivalEligible.current=true;clock.current.acc=0;clock.current.lastSample=0;sampleRef.current=[];setSamples([]);}
    setTick(t=>t+1);
  },[engine,compareAperture]);
  useEffect(()=>{
    if(!active)return;const onVisibility=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',onVisibility);onVisibility();
    return()=>document.removeEventListener('visibilitychange',onVisibility);
  },[active]);
  useEffect(()=>{
    clock.current.last=0;
    if(!active||page!=='lab'||!visible||!running)return;
    let raf=0;
    const frame=(now:number)=>{
      const c=clock.current;const elapsed=c.last?Math.min(.05,(now-c.last)/1000):0;c.last=now;
      c.acc+=elapsed*playbackRef.current*MEDIA[engine.parameters.medium].physicalRate;
      let iterations=0;
      const sampleInterval=engine.parameters.medium==='sound'?1/(engine.parameters.frequency*32):.004;
      while(c.acc>=engine.grid.dt&&iterations<100){
        const dt=engine.grid.dt;engine.step();if(modeRef.current==='comparison')compareRef.current?.step();
        c.acc-=dt;iterations++;
        if(engine.time-c.lastSample>=sampleInterval){c.lastSample=engine.time;capture();}
      }
      if(now-c.lastUI>100){c.lastUI=now;setTick(t=>t+1);setSamples([...sampleRef.current]);}
      raf=requestAnimationFrame(frame);
    };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[engine,active,page,visible,running]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  const chooseMode=(m:LabMode)=>{
    if(acoustic)setSoundFocused(false);
    setMode(m);setPage('lab');if(m==='huygens')setHuygens(true);
    if(m==='analysis')setAdvanced(true);
    if(m==='comparison'){
      clearVisualGroup();
      setScenario('comparison');engine.updateParameters({obstacle:'slit'});setParams({...engine.parameters});
      if(acoustic)setProbes(current=>current.map(p=>nearestFree(engine,p)));
      compareRef.current=new WaveEngine({...engine.parameters,aperture:compareAperture});
      if(acoustic)releaseVisualGroup.current=linkVisualEngines([engine,compareRef.current]);reset();
      setNotice(acoustic?'Les deux domaines sonores repartent au même temps physique.':'Les deux cuves repartent au même instant, avec le même pas de temps.');
    }else{clearVisualGroup();compareRef.current=null;}
    setSidebar(m!=='presentation');
  };
  const chooseExperiment=(id:string)=>{
    const e=EXPERIMENTS.find(x=>x.id===id);if(!e)return;
    setScenario(id);update({...units.defaults,...e.parameters});
    setHuygens(e.mode==='huygens');setShowNodes(id==='nodes');setDisplay(id==='nodes'||id==='theta'?'amplitude':'displacement');
    if(id==='theta'){setThetaMode('minimum');setCamera('top');setZoomEnabled(false);requestAnimationFrame(()=>document.getElementById('theta-demonstration')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));}
    if(e.mode)chooseMode(e.mode);
    if(acoustic){setSoundFocused(id==='gbf');if(id==='gbf'){setSoundView('2d');setShowTheta(false);setHuygens(false);setShowNodes(false);setShowMaxima(false);}}
    reset();setRunning(true);
    setNotice('Expérience réinitialisée : les observations proviendront du nouveau calcul.');
  };
  const moveProbe=(i:number,patch:Partial<ProbePosition>)=>{
    const point={...probes[i],...patch};if(!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    if(acoustic&&engine.sampleAt(point.x,point.y).solid){setNotice('Un microphone doit rester dans une zone d’air libre, hors des obstacles.');return;}
    setProbes(ps=>ps.map((p,index)=>index===i?point:p));arrivals.current=[null,null];arrivalEligible.current=false;sampleRef.current=[];setSamples([]);
    if(acoustic)engine.resetMeasurements();setTick(t=>t+1);
  };
  const onPick=(point:ProbePosition)=>{
    if(engine.sampleAt(point.x,point.y).solid){setNotice(acoustic?'Choisissez un point dans l’air, hors des obstacles.':'Choisissez un point dans l’eau, en dehors des obstacles.');return;}
    if(tool==='probe'){
      if(acoustic){if(!probes.length)setProbes([point]);else{moveProbe(Math.min(selectedMicrophone,probes.length-1),point);if(probes.length===2)setSelectedMicrophone(1-selectedMicrophone);}}
      else setProbes(p=>p.length>=2?[point]:[...p,point]);
      arrivals.current=[null,null];arrivalEligible.current=engine.time===0;sampleRef.current=[];setSamples([]);
    }
    if(tool==='ruler')setRuler(p=>p.length>=2?[point]:[...p,point]);
    if(tool==='section')setSection(p=>p.length>=2?[point]:[...p,point]);
  };
  const exportJson=()=>{
    try{download(new Blob([JSON.stringify(serializeSession(params),null,2)],{type:'application/json'}),`diffraction-lab-${medium}-parametres.json`);}
    catch(error){setNotice(`Export impossible : ${String(error)}`);}
  };
  const importJson=async(file:File)=>{
    try{
      if(file.size>100_000)throw new Error('Fichier trop volumineux.');
      const data=JSON.parse(await file.text());const next=parseSession(data);
      const prepared=next.medium==='sound'?new WaveEngine(next):undefined;
      if(prepared&&next.frequency>frequencyLimit(next,prepared.grid))throw new Error(`Fréquence sonore trop élevée pour ce maillage : maximum ${frequencyLimit(next,prepared.grid)} Hz pour au moins 12 cellules par λ. Choisissez une fréquence plus basse ou un maillage plus fin.`);
      if(next.medium!==medium)replaceMedium(next,undefined,prepared);
      else{update(next);reset();}
      setJsonError('');setNotice(`Paramètres ${MEDIA[next.medium].label} importés${data.version===1||data.version===undefined?' (ancien format eau migré)':''}. Le champ repart de l’équilibre.`);
    }catch(err){setJsonError(err instanceof Error?err.message:'Fichier JSON invalide.');}
  };
  const exportPng=()=>{
    if(!sceneCanvas.current){setNotice('Attendez le premier rendu pour réaliser la capture.');return;}
    const src=sceneCanvas.current,out=document.createElement('canvas');out.width=1600;out.height=1000;
    const ctx=out.getContext('2d');if(!ctx)return;
    ctx.fillStyle=dark?'#14212c':'#eef4f8';ctx.fillRect(0,0,1600,1000);
    ctx.fillStyle=dark?'#f2f7fa':'#142d3e';ctx.font='bold 32px sans-serif';ctx.fillText('DIFFRACTION LAB 3D',48,58);
    ctx.font='20px sans-serif';ctx.fillText(`${units.label} · ${EXPERIMENTS.find(e=>e.id===scenario)?.title} · t = ${fmt(engine.time*units.timeScale,3)} ${units.timeUnit}`,48,94);
    const scale=Math.min(1504/src.width,730/src.height);ctx.drawImage(src,48+(1504-src.width*scale)/2,120,src.width*scale,src.height*scale);
    ctx.font='20px sans-serif';ctx.fillText(`f = ${fmt(params.frequency)} Hz     ${acoustic?'c':'v'} = ${fmt(params.speed)} m/s     λ = ${fmt(params.speed/params.frequency,3)} m     a = ${fmt(params.aperture)} m     A₀ = ${fmt(params.amplitude*units.fieldScale)} ${units.fieldUnit}`,48,890);
    ctx.fillText(`Champ : ${display==='displacement'?(acoustic?'pression p′ (Pa)':'élongation η (mm)'):display==='rms'?'pression efficace (Pa)':display==='amplitude'?`amplitude estimée (${units.fieldUnit})`:acoustic?'énergie relative (sans unité)':'intensité relative A²/A₀²'} · Relief ×${exaggeration} · Maillage ${engine.grid.nx} × ${engine.grid.ny}`,48,930);
    ctx.font='16px sans-serif';ctx.fillText(acoustic?'Relief = pression acoustique, pas déplacement vertical de l’air · Modèle 2D · Huygens illustratif · Export v2, Pa / m / s':showTheta&&thetaOnTank.ready?(effectiveThetaMode==='observation'?'θ : direction d’observation géométrique, sans condition d’annulation de l’amplitude.':'θ : premiers minima théoriques de Fraunhofer · Ces repères ne sont pas des nœuds mesurés dans la cuve.'):'Modèle scalaire linéaire non dispersif · Huygens : illustration pédagogique · Amplitudes : estimation sur une période',48,968);
    out.toBlob(b=>{if(b)download(b,`diffraction-lab-${medium}-experience.png`);});
  };
  const validationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    if(!active||page!=='validation')setValidating(false);
    return()=>{if(validationTimer.current)clearTimeout(validationTimer.current);};
  },[active,page,medium]);
  const startValidation=()=>{setValidating(true);setValidation(null);validationTimer.current=setTimeout(()=>{try{setValidation(acoustic?runAcousticValidation():runValidation());}catch(e){setNotice(`Erreur de validation : ${String(e)}`);}finally{setValidating(false);}},50);};
  const experiment=EXPERIMENTS.find(e=>e.id===scenario)??EXPERIMENTS[2];
  const lambda=params.speed/params.frequency,ratio=params.aperture/lambda;
  const physicalDimension=dimensionRatio(params);
  const legendMaximum=params.amplitude*units.fieldScale*(display==='rms'?Math.SQRT1_2:1);
  const readings=probes.map(p=>engine.sampleAt(p.x,p.y));
  const distance=ruler.length===2?Math.hypot(ruler[1].x-ruler[0].x,ruler[1].y-ruler[0].y):null;
  const sectionLength=section.length===2?Math.hypot(section[1].x-section[0].x,section[1].y-section[0].y):0;
  const sectionPoints=section.length===2?Array.from({length:160},(_,i)=>{const q=i/159;return{x:q*sectionLength,y:(()=>{const r=engine.sampleAt(section[0].x+(section[1].x-section[0].x)*q,section[0].y+(section[1].y-section[0].y)*q);return r.solid?NaN:r.displacement*units.fieldScale;})()};}):[];
  const effectiveThetaMode:ThetaMode=params.source==='point'?'observation':thetaMode;
  const thetaOnTank=angleOverlay(params,engine.grid,effectiveThetaMode,thetaObservationAngle);
  const sceneProps={engine,display,camera,zoomEnabled,showTheta,thetaMode:effectiveThetaMode,thetaObservationAngle,exaggeration,huygens,huygensStep,secondaryCount,showNodes,nodeThreshold,showMaxima,probes:focused?[]:probes,onPick:focused?()=>{}:onPick,dark};
  const step=()=>{setRunning(false);const count=Math.max(1,Math.round((1/params.frequency/32)/engine.grid.dt));for(let i=0;i<count;i++){engine.step();if(mode==='comparison')compareRef.current?.step();capture();}setSamples([...sampleRef.current]);setTick(t=>t+1);};
  const colorLegend=<div className={acoustic?'color-legend acoustic-color-legend':'color-legend'}><span>{display==='displacement'?(acoustic?'Pression p′ (Pa)':'Élongation η (mm)'):display==='rms'?'Pression efficace (Pa)':display==='amplitude'?`Amplitude estimée (${units.fieldUnit})`:acoustic?'Énergie relative 2⟨p′²⟩/p₀²':'Intensité relative A²/A₀²'}</span><div className={display==='displacement'?'legend-gradient diverging':'legend-gradient sequential'}/><div className="legend-values"><span>{display==='displacement'?`−${fmt(params.amplitude*units.fieldScale,acoustic?3:1)}`:'0'}</span><span>{display==='displacement'?'0':''}</span><span>{display==='intensity'?'1':`+${fmt(legendMaximum,acoustic?3:1)}`}</span></div><small>Échelle de couleur saturée hors limites</small></div>;
  void tick;
  if(!active)return null;
  return <div data-medium={medium} className={`app ${acoustic?'sound-lab':''} ${focused?'sound-focused':''} ${mode==='presentation'?'presentation':''}`}>
    <header className="app-header"><button className="brand" onClick={()=>setPage('lab')} aria-label="Retour au laboratoire"><span className="brand-icon"><Waves size={24}/></span><span>Diffraction <strong>Lab 3D</strong><small>LABORATOIRE VIRTUEL DE MÉCANIQUE ONDULATOIRE</small></span><span className="version">BÊTA SCIENTIFIQUE</span></button><nav className="header-actions"><button className={page==='validation'?'text-button selected':'text-button'} onClick={()=>{setPage('validation');}}><ShieldCheck size={16}/><span>Validation scientifique</span></button><IconButton label="Comment fonctionne la simulation ?" active={page==='help'} onClick={()=>setPage(page==='help'?'lab':'help')}><CircleHelp size={19}/></IconButton><span className="header-divider"/><IconButton label={dark?'Activer le mode clair':'Activer le mode sombre'} onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</IconButton></nav></header>
    <section className="medium-selector" aria-label="Choix du milieu"><div><span className="eyebrow">MILIEU DE PROPAGATION</span><label htmlFor="propagation-medium">Une même expérience, deux milieux</label></div><select id="propagation-medium" aria-label="Milieu de propagation" value={medium} onChange={e=>changeMedium(e.target.value as MediumKind)}><option value="water">Surface de l’eau</option><option value="sound">Ondes sonores</option></select><p>{acoustic?'Pression acoustique · modèle 2D · parois rigides':'Ondes de surface · laboratoire de diffraction'}</p></section>
    {page!=='lab'?<main className="document-page"><button className="text-button back" onClick={()=>setPage('lab')}><ArrowLeft size={16}/>Retour au laboratoire</button>{page==='help'?<HelpContent/>:<><span className="eyebrow">LA SCIENCE, VÉRIFIABLE</span><h1>Validation scientifique</h1><p className="document-lead">Ces expériences de référence exécutent le moteur numérique dans votre navigateur. Aucun statut n’est prérempli.</p><button className="primary-button" onClick={startValidation} disabled={validating}><Activity size={17}/>{validating?'Calcul des expériences de référence…':'Exécuter les validations'}</button>{validation&&<p className="validation-summary">{validation.filter(r=>r.passed).length} / {validation.length} vérifications satisfaites · résultats calculés à l’instant</p>}<div className="validation-grid">{validation?.map(r=><article className="card validation-card" key={r.id}><span className={`status-chip ${r.passed?'pass':'fail'}`}>{r.passed?<Check size={14}/>:<X size={14}/>} {r.passed?'Vérifié':'À examiner'}</span><h3>{r.title}</h3><p>{r.objective}</p><dl><dt>Paramètres</dt><dd>{r.parameters}</dd><dt>Prédiction</dt><dd>{r.prediction}</dd><dt>Résultat calculé</dt><dd>{r.result}</dd>{r.error&&<><dt>Écart / tolérance</dt><dd>{r.error}</dd></>}</dl>{r.limitation&&<p className="science-note">{r.limitation}</p>}</article>)}</div><p className="science-note">{acoustic?'Ces validations concernent le modèle de pression acoustique scalaire 2D, pas une propagation volumique complète ni une validation expérimentale de haut-parleur.':'Ces validations concernent le modèle scalaire discrétisé, pas une validation expérimentale complète des ondes gravito-capillaires.'} Les détails, tolérances et limites figurent dans la documentation du projet.</p></>}</main>:<>
    <div className="workspace-top"><div><span className="eyebrow">VOTRE ESPACE D’EXPÉRIMENTATION</span><h1>{focused?'La diffraction du son.':'Explorer les ondes.'}</h1><p>{focused?'GBF → haut-parleur → fente → ondes diffractées':'Manipulez. Observez. Comprenez.'}</p></div>{acoustic&&<button className="secondary-button sound-experience-toggle" onClick={()=>{if(focused){setSoundFocused(false);setSidebar(true);}else chooseExperiment('gbf');}}>{focused?'Outils et autres expériences':'Voir le montage GBF et fente'}<ArrowRight size={15}/></button>}<div className="mode-tabs" role="tablist" aria-label="Mode du laboratoire">{MODES.map(m=><button role="tab" aria-selected={mode===m.id} key={m.id} onClick={()=>chooseMode(m.id)}>{m.label}</button>)}</div></div>
    <main className={`lab-layout ${!sidebar?'sidebar-hidden':''}`}>
      {sidebar&&<aside className="sidebar" tabIndex={0} aria-label="Expériences et paramètres physiques">
        <section className="panel experiment-library"><div className="panel-heading"><FlaskConical size={16}/><h2>Expériences</h2><span className="count">{EXPERIMENTS.length}</span></div><div className="experiment-list">{EXPERIMENTS.map((e,i)=><button className={`experiment-button ${scenario===e.id?'chosen':''}`} key={e.id} onClick={()=>chooseExperiment(e.id)}><span className="experiment-number">{String(i+1).padStart(2,'0')}</span><span>{e.shortTitle}</span>{scenario===e.id?<span className="active-dot"/>:<ChevronRight size={13}/>}</button>)}</div></section>
        <section className="panel parameters"><div className="panel-heading"><SlidersHorizontal size={16}/><h2>Paramètres physiques</h2><span className="live-dot" title="Réglages actifs pendant le calcul"/></div>
          <div className="parameter-body"><div className="select-row"><label htmlFor="source-kind">Source d’onde</label><select id="source-kind" value={params.source} onChange={e=>update({source:e.target.value as Parameters['source']})}><option value="plane">Rectiligne</option><option value="point">Ponctuelle</option><option value="pair">Deux sources cohérentes</option></select></div>
          <ParameterControl label="Fréquence" symbol="f" unit="Hz" value={params.frequency} min={acoustic?100:1} max={frequencyLimit(params,engine.grid)} step={acoustic?10:.1} onChange={v=>update({frequency:v})} hint="Nombre d’oscillations par seconde"/>
          <ParameterControl label="Célérité" symbol={acoustic?'c':'v'} unit="m/s" value={params.speed} min={acoustic?300:.5} max={acoustic?380:4} step={acoustic?1:.05} onChange={v=>update({speed:v})} hint="Vitesse de propagation dans le modèle non dispersif"/>
          <ParameterControl label={acoustic?'Pression source':'Amplitude source'} symbol={acoustic?'p₀':'A₀'} unit={units.fieldUnit} value={params.amplitude*units.fieldScale} min={acoustic?.01:.1} max={10} step={acoustic?.01:.1} onChange={v=>update({amplitude:v/units.fieldScale})}/>
          <div className="select-row"><label htmlFor="obstacle-kind">Géométrie</label><select id="obstacle-kind" value={params.obstacle} onChange={e=>update({obstacle:e.target.value as Parameters['obstacle']})}><option value="none">Sans obstacle</option><option value="slit">Fente simple</option><option value="double">Double fente</option><option value="circle">Obstacle circulaire</option><option value="rectangle">Obstacle rectangulaire</option><option value="edge">Bord unique</option></select></div>
          {(params.obstacle==='slit'||params.obstacle==='double')&&<ParameterControl label="Largeur de fente" symbol="a" unit="m" value={params.aperture} min={.04} max={1.2} step={.01} onChange={v=>update({aperture:v})}/>}
          {params.obstacle==='double'&&<ParameterControl label="Écartement des fentes" symbol="d" unit="m" value={params.separation} min={.1} max={1.2} step={.01} onChange={v=>update({separation:v})}/>}
          {['circle','rectangle'].includes(params.obstacle)&&<ParameterControl label={params.obstacle==='circle'?'Diamètre':'Largeur obstacle'} symbol="D" unit="m" value={params.obstacleWidth} min={.05} max={1} step={.01} onChange={v=>update({obstacleWidth:v})}/>}
          {params.obstacle==='rectangle'&&<ParameterControl label="Hauteur obstacle" symbol="h" unit="m" value={params.obstacleHeight} min={.05} max={1.2} step={.01} onChange={v=>update({obstacleHeight:v})}/>}
          {params.source==='pair'&&<><ParameterControl label="Séparation des sources" symbol="dₛ" unit="m" value={params.sourceSeparation} min={.1} max={acoustic?Math.min(1,2*Math.min(params.sourceY,engine.grid.height-params.sourceY)):1} step={.01} onChange={v=>update({sourceSeparation:v})}/><ParameterControl label="Déphasage des sources" symbol="Δφ" unit="°" value={params.phase} min={-180} max={180} step={1} onChange={v=>update({phase:v})}/></>}
          <div className="derived-values"><span>Longueur d’onde <b>λ = {fmt(lambda,3)} m</b></span><span>Période <b>T = {fmt(units.timeScale/params.frequency,3)} {units.timeUnit}</b></span></div>
          <button className="advanced-toggle" onClick={()=>setAdvanced(!advanced)}><Settings2 size={14}/>Réglages avancés<ChevronDown size={14} className={advanced?'rotated':''}/></button>
          {advanced&&<div className="advanced-controls"><label className="check-row"><input type="checkbox" checked={params.sourceEnabled} onChange={e=>update({sourceEnabled:e.target.checked})}/>Source active</label><ParameterControl label="Position de source x" symbol="xₛ" unit="m" value={params.sourceX} min={.12} max={1} step={.01} onChange={v=>update({sourceX:v})}/><ParameterControl label="Position de source y" symbol="yₛ" unit="m" value={params.sourceY} min={acoustic&&params.source==='pair'?Math.max(.2,params.sourceSeparation/2):.2} max={acoustic&&params.source==='pair'?Math.min(1.4,engine.grid.height-params.sourceSeparation/2):1.4} step={.01} onChange={v=>update({sourceY:v})}/>{params.source==='plane'&&<ParameterControl label="Direction incidente" symbol="θ" unit="°" value={params.sourceAngle} min={-70} max={70} step={1} onChange={v=>update({sourceAngle:v})}/>}{params.source!=='pair'&&<ParameterControl label="Phase initiale" symbol="φ₀" unit="°" value={params.phase} min={-180} max={180} step={1} onChange={v=>update({phase:v})}/>}<ParameterControl label="Position obstacle x" symbol="xₒ" unit="m" value={params.obstacleX} min={.8} max={2.2} step={.01} onChange={v=>update({obstacleX:v})}/><ParameterControl label="Position obstacle y" symbol="yₒ" unit="m" value={params.obstacleY} min={.25} max={1.35} step={.01} onChange={v=>update({obstacleY:v})}/><div className="derived-edit"><label>Période T ({units.timeUnit})<NumericInput value={units.timeScale/params.frequency} min={units.timeScale/frequencyLimit(params,engine.grid)} max={acoustic?10:1} step={.001} label="Période" onChange={v=>update({frequency:units.timeScale/v})}/></label><label>Longueur λ (m)<NumericInput value={lambda} min={params.speed/frequencyLimit(params,engine.grid)} max={params.speed/(acoustic?100:1)} step={.001} label="Longueur d’onde" onChange={v=>update({frequency:params.speed/v})}/></label></div><div className="select-row"><label htmlFor="boundary">{acoustic?'Bords du domaine':'Bords de cuve'}</label><select id="boundary" value={params.boundary} onChange={e=>update({boundary:e.target.value as Parameters['boundary']})}><option value="absorbing">Absorbants (couche amortissante)</option><option value="reflecting">Réfléchissants</option></select></div><div className="select-row"><label htmlFor="resolution">Résolution du solveur</label><select id="resolution" value={params.resolution} onChange={e=>{update({resolution:e.target.value as Parameters['resolution']});setNotice('Le maillage change : le calcul est réinitialisé.');}}><option value="performance">Performance</option><option value="balanced">Équilibré</option><option value="precision">Haute précision</option></select></div><p className="muted micro">{acoustic?'Changer la fréquence ou la géométrie recommence le champ et ses mesures. Arrêter le GBF conserve les ondes déjà émises. La fréquence est limitée pour conserver au moins 12 cellules par λ.':'Un changement de maillage recommence l’expérience. Les autres paramètres modifient le champ futur, sans effacer les ondes présentes.'}</p></div>}
          </div></section>
        <div className="model-note"><ShieldCheck size={16}/><p><b>Un modèle, des limites explicites.</b>Équation d’onde scalaire 2D, linéaire et non dispersive. <button onClick={()=>setPage('help')}>Comprendre le modèle <ArrowRight size={12}/></button></p></div>
      </aside>}
      <div className="lab-main">{scenario==='theta'?<ThetaDemonstration parameters={params} onRestore={()=>chooseExperiment('theta')}/>:<section className="panel theta-launcher"><div><span className="eyebrow">COMPRENDRE LA DIFFRACTION</span><h2>Où l’amplitude s’annule-t-elle ?</h2><p>Un exemple théorique avec les directions du premier minimum clairement repérées.</p></div><button className="secondary-button" onClick={()=>chooseExperiment('theta')}>Voir le cas θ = 30°<ArrowRight size={16}/></button></section>}{mode==='presentation'&&<section className="panel presentation-equations"><div><span className="eyebrow">MODÈLE SCALAIRE LINÉAIRE</span><strong>{acoustic?'∂²p′/∂t² = c² ∇²p′':'∂²η/∂t² = v² ∇²η'}</strong><span>{acoustic?'λ = c/f · T = 1/f':'λ = v/f · T = 1/f'}</span></div><label className="check-row"><input type="checkbox" checked={annotations} onChange={e=>setAnnotations(e.target.checked)}/>Annotations explicatives</label><button className="secondary-button" onClick={()=>setSidebar(!sidebar)}><Settings2 size={16}/>{sidebar?'Masquer les réglages':'Afficher les réglages'}</button></section>}<section className="panel simulation-panel" id="simulation-panel"><div className="simulation-heading"><div className="experiment-title"><span className="eyebrow">EXPÉRIENCE {String(EXPERIMENTS.findIndex(e=>e.id===scenario)+1).padStart(2,'0')}</span><h2>{focused?'Du haut-parleur à la fente':experiment.title.replace(/^\d+ · /,'')}</h2></div><div className="simulation-actions"><span className="calculation-badge"><span className={running?'live-dot':'paused-dot'}/>{running?'Calcul en direct':'En pause'}</span><IconButton label={focused?'Afficher les commandes':sidebar?'Masquer les commandes':'Afficher les commandes'} onClick={()=>{if(focused){setSoundFocused(false);setSidebar(true);}else setSidebar(!sidebar);}}><Settings2 size={17}/></IconButton><IconButton label="Capturer l’expérience en PNG" onClick={exportPng}><ArrowDownToLine size={17}/></IconButton><IconButton label="Plein écran" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>setNotice('Le plein écran est indisponible dans ce navigateur.'));}}><Expand size={17}/></IconButton></div></div>
        {acoustic&&<div className="acoustic-controls"><div className="segmented" role="group" aria-label="Vues du champ sonore">{([{id:'2d',label:'Vue 2D'},{id:'3d',label:'Vue 3D'},{id:'split',label:'Vue partagée 2D + 3D'}] as const).map(view=><button key={view.id} aria-pressed={soundView===view.id} className={soundView===view.id?'selected':''} onClick={()=>setSoundView(view.id)}>{view.label}</button>)}</div><label className="check-row"><input type="checkbox" checked={showWavefronts} onChange={e=>setShowWavefronts(e.target.checked)}/>Afficher les fronts d’onde</label></div>}
        <div className="scene-toolbar">{(!acoustic||soundView!=='2d')&&<div className="segmented">{([{id:'iso',label:'Isométrique'},{id:'top',label:'Dessus'},{id:'profile',label:'Profil'},{id:'free',label:'3D libre'}] as const).map(v=><button className={camera===v.id?'selected':''} key={v.id} onClick={()=>setCamera(v.id)}>{v.label}</button>)}</div>}<div className="toolbar-end"><Layers size={14}/><select aria-label="Grandeur visualisée" value={display} onChange={e=>setDisplay(e.target.value as DisplayField)}><option value="displacement">{acoustic?'Pression instantanée p′ (Pa)':'Élongation instantanée'}</option><option value="amplitude">{acoustic?'Amplitude locale estimée (Pa)':'Amplitude locale estimée'}</option>{acoustic&&<option value="rms">Pression efficace p_rms (Pa)</option>}<option value="intensity">{acoustic?'Indicateur relatif d’énergie':'Intensité relative'}</option></select></div></div>
        <div className="theta-overlay-controls"><label className="check-row"><input type="checkbox" checked={showTheta} onChange={e=>{setShowTheta(e.target.checked);if(e.target.checked)setCamera('top');}}/>{acoustic?'Afficher θ sur le champ':'Afficher θ sur la cuve'}</label>{showTheta&&<><label className="theta-mode-label">Repère<select aria-label="Type de repère θ" value={effectiveThetaMode} onChange={e=>setThetaMode(e.target.value as ThetaMode)}><option value="minimum" disabled={params.source==='point'}>Premier minimum idéal</option><option value="observation">Angle d’observation</option></select></label>{effectiveThetaMode==='observation'?<label className="theta-observation-control">θ = {fmt(thetaObservationAngle,0)}°<input type="range" aria-label="Angle d’observation sur la cuve" min={-80} max={80} step={1} value={thetaObservationAngle} onChange={e=>setThetaObservationAngle(Number(e.target.value))}/></label>:<span className="theory-badge">REPÈRE THÉORIQUE</span>}{!thetaOnTank.ready&&<button className="text-button" onClick={()=>{chooseExperiment('theta');setShowTheta(true);requestAnimationFrame(()=>document.getElementById('simulation-panel')?.scrollIntoView({block:'start'}));}}>Charger le cas θ = 30°<ArrowRight size={13}/></button>}</>}</div>
        <div className={`viewport ${acoustic?'acoustic-viewport':''} ${mode==='comparison'?'split-view':''}`}><div className="scene-container"><div className="scene-corner-label"><span>{acoustic?'DOMAINE ACOUSTIQUE 2D':'CUVE NUMÉRIQUE'}</span><small>2,80 × 1,60 m {mode==='comparison'?`· a = ${fmt(params.aperture)} m`:''}</small></div>{acoustic&&mode==='comparison'&&<div className="acoustic-comparison-caption">Configuration 1 · a = {fmt(params.aperture)} m · t = {fmt(engine.time*1000,3)} ms</div>}{acoustic?<AcousticViews {...sceneProps} active={visible} view={focused?'2d':soundView} illustration={focused} showWavefronts={focused||showWavefronts} onMoveProbe={focused?undefined:moveProbe} ruler={ruler} section={tool==='section'?section:[]} onCanvasReady={c=>{sceneCanvas.current=c;}}/>:<WaveScene {...sceneProps} active={visible} onCanvasReady={c=>{sceneCanvas.current=c;}}/>}<div className="scene-hint"><MousePointer2 size={13}/>{tool==='probe'?(acoustic?'Cliquez dans l’air pour déplacer un microphone':'Cliquez sur l’eau pour placer une sonde'):tool==='ruler'?'Sélectionnez deux crêtes successives':'Choisissez les deux extrémités de la coupe'}<span>{zoomEnabled?'Glisser pour tourner · molette pour zoomer':'Glisser pour tourner · molette pour défiler'}</span></div></div>{mode==='comparison'&&compareRef.current&&<div className="scene-container"><div className="scene-corner-label"><span>EXPÉRIENCE COMPARÉE</span><small>a = {fmt(compareAperture)} m · t = {fmt(compareRef.current.time*units.timeScale,3)} {units.timeUnit}</small></div>{acoustic&&<div className="acoustic-comparison-caption">Configuration 2 · a = {fmt(compareAperture)} m · t = {fmt(compareRef.current.time*1000,3)} ms</div>}{acoustic?<AcousticViews {...sceneProps} active={visible} view={soundView} showWavefronts={showWavefronts} engine={compareRef.current} huygens={false} probes={[]} onPick={()=>{}}/>:<WaveScene {...sceneProps} active={visible} engine={compareRef.current} huygens={false} probes={[]} onPick={()=>{}}/>}</div>}
          <div className="scene-tools">{(!acoustic||soundView!=='2d')&&<IconButton label={zoomEnabled?'Désactiver le zoom pour faire défiler':'Activer le zoom à la molette'} active={zoomEnabled} onClick={()=>setZoomEnabled(!zoomEnabled)}><ZoomIn size={17}/></IconButton>}<IconButton label={acoustic?'Déplacer un microphone':'Placer une sonde (deux au maximum)'} active={tool==='probe'} onClick={()=>{setTool('probe');setMode(m=>m==='discovery'?'analysis':m);}}><Focus size={17}/></IconButton><IconButton label="Mesurer une distance" active={tool==='ruler'} onClick={()=>{setTool('ruler');setMode('analysis');setCamera('top');}}><Ruler size={17}/></IconButton><IconButton label="Tracer une coupe" active={tool==='section'} onClick={()=>{setTool('section');setMode('analysis');setCamera('top');setSection([]);}}><Activity size={17}/></IconButton></div>
          {!acoustic&&colorLegend}
        </div>
        {acoustic&&!focused&&colorLegend}
        <div className="playback-bar"><div className="playback-controls"><IconButton label="Recommencer l’expérience" onClick={reset}><RotateCcw size={17}/></IconButton><button className="play-button" aria-label={running?'Mettre en pause':'Démarrer'} onClick={()=>{if(running)setSamples([...sampleRef.current]);setRunning(!running);}}>{running?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}<span>{running?'Pause':'Démarrer'}</span></button><IconButton label="Avancer d’un pas d’observation" onClick={step}><SkipForward size={18}/></IconButton><span className="playback-divider"/><label className="speed-control">Vitesse<select aria-label="Vitesse de lecture" value={playback} onChange={e=>setPlayback(Number(e.target.value))}><option value={.1}>0,1×</option><option value={.25}>0,25×</option><option value={.5}>0,5×</option><option value={1}>1×</option><option value={2}>2×</option>{![.1,.25,.5,1,2].includes(playback)&&<option value={playback}>{fmt(playback,2)}×</option>}</select></label></div><div className="physical-clock"><span>TEMPS PHYSIQUE</span><strong>{fmt(engine.time*units.timeScale,3)} <small>{units.timeUnit}</small></strong></div></div>
      </section>
      {focused&&<DiffractionObservation parameters={params} frequencyMax={frequencyLimit(params,engine.grid)} onChange={update} onLoadSlit={()=>chooseExperiment('gbf')}/>}
      {acoustic&&<div className="sound-model-note" role="note"><p><strong>Le relief représente la pression acoustique ; ce n’est pas un déplacement vertical de l’air.</strong> Visualisation 3D d’un modèle 2D, pas une propagation acoustique volumique.</p><p>Ralentissement pédagogique : temps physique × {fmt(units.physicalRate*playback,5)}, soit {fmt(1/(units.physicalRate*playback),0)} fois plus lent. La vitesse de lecture et le relief ne modifient ni c, ni f, ni la pression source.</p><p>{params.obstacle==='circle'?'Le cercle représente la section d’un cylindre rigide étendu perpendiculairement au plan.':params.obstacle==='rectangle'?'Le rectangle représente la section d’un obstacle rigide étendu perpendiculairement au plan.':params.source==='point'||params.source==='pair'?'Une source ponctuelle du modèle 2D représente une source linéique perpendiculaire au plan ; ses fronts sont circulaires.':'La ligne de pression imposée idéalise une onde plane et émet des deux côtés. Elle ne reproduit pas la directivité complète d’un haut-parleur.'}</p></div>}
      {acoustic&&<section className="sound-playback-settings" aria-label="Réglages de visualisation sonore"><ParameterControl label="Vitesse de lecture pédagogique" symbol="" unit="×" value={playback} min={.1} max={2} step={.05} onChange={setPlayback}/><ParameterControl label="Amplification du relief" symbol="" unit="×" value={exaggeration} min={1} max={30} step={1} onChange={setExaggeration}/></section>}
      <div className="metrics-row"><div className="metric"><span>LONGUEUR D’ONDE</span><strong><i>λ</i> {fmt(lambda,3)} <small>m</small></strong><small>{acoustic?'λ = c / f · valeur du modèle':'λ = v / f · valeur du modèle'}</small></div><div className="metric"><span>PÉRIODE</span><strong><i>T</i> {fmt(units.timeScale/params.frequency,3)} <small>{units.timeUnit}</small></strong><small>T = 1 / f</small></div><div className="metric ratio-metric"><span>{acoustic?physicalDimension.label:'RAPPORT D’OUVERTURE'}</span><strong><i>{acoustic?physicalDimension.symbol:'a/λ'}</i> {fmt(acoustic?physicalDimension.value:ratio,2)}</strong><small>{params.obstacle==='slit'||params.obstacle==='double'?ratio<=1?'Diffraction importante attendue':'Propagation plus directionnelle attendue':acoustic?'Dimension de l’obstacle comparée à λ':'Rapport pertinent avec une fente'}</small></div><div className="metric"><span>MAILLAGE NUMÉRIQUE</span><strong>{engine.grid.nx} <small>×</small> {engine.grid.ny}</strong><small>Δx = {fmt(engine.grid.dx,3)} m · CFL = {fmt(engine.grid.cfl)}</small></div></div>
      {engine.warnings.length>0&&<div className="warning-box" role="status">{engine.warnings.map((w,i)=><p key={i}>{w}</p>)}{mode==='comparison'&&compareRef.current?.warnings.filter(w=>!engine.warnings.includes(w)).map((w,i)=><p key={`c${i}`}>{acoustic?'Second domaine':'Seconde cuve'} : {w}</p>)}</div>}
      {mode==='comparison'&&<section className="panel compare-controls"><div><h3>Une variable, deux expériences.</h3><p className="muted">La largeur de la seconde fente varie ; les horloges sont synchronisées.</p></div><ParameterControl label="Fente de la seconde configuration" symbol="a₂" unit="m" value={compareAperture} min={.04} max={1.2} step={.01} onChange={v=>{setCompareAperture(v);compareRef.current?.updateParameters({aperture:v});if(acoustic)reset();}}/><button className="secondary-button" onClick={()=>{setCompareAperture(params.aperture);compareRef.current?.updateParameters({...params});reset();}}><Copy size={15}/>Recopier les paramètres</button></section>}
      {(mode==='huygens'||huygens)&&<section className="panel huygens-panel"><div className="panel-heading"><Radio size={17}/><h2>Le principe de Huygens-Fresnel</h2><span className="theory-badge">ILLUSTRATION PÉDAGOGIQUE</span></div><div className="huygens-body"><div><span className="eyebrow">ÉTAPE {huygensStep} / 7</span><p>{HUYG[huygensStep-1]}</p><div className="step-dots">{HUYG.map((_,i)=><button key={i} aria-label={`Étape ${i+1}`} className={huygensStep===i+1?'active':''} onClick={()=>setHuygensStep(i+1)}>{i+1}</button>)}<button className="text-button" onClick={()=>setHuygensStep(s=>Math.min(7,s+1))}>Suivant<ArrowRight size={14}/></button></div></div><div><ParameterControl label="Sources secondaires visibles" symbol="N" unit="points" value={secondaryCount} min={3} max={25} step={2} onChange={setSecondaryCount}/><p className="muted micro">Aucune onde supplémentaire n’est injectée dans le solveur.</p></div></div></section>}
      {mode==='analysis'&&<>
      {acoustic?<AcousticAnalysis engine={engine} probes={probes} samples={samples} selectedMicrophone={selectedMicrophone} onSelectMicrophone={index=>{setSelectedMicrophone(index);setTool('probe');}} onMoveProbe={moveProbe} onClearMeasurements={()=>{engine.resetMeasurements();clearHistory();arrivalEligible.current=false;setTick(t=>t+1);}} onClearProbes={()=>{setProbes([]);setSelectedMicrophone(0);engine.resetMeasurements();clearHistory();}} onAddProbe={()=>{setSelectedMicrophone(probes.length);setTool('probe');setProbes(current=>[...current,nearestFree(engine,{x:current.length?2.15:1.85,y:current.length?.95:.65})]);engine.resetMeasurements();clearHistory();}}/>:<section className="panel analysis-panel"><div className="panel-heading"><Focus size={17}/><h2>Mesures dans la cuve</h2><span className="data-badge">DONNÉES DU SOLVEUR</span>{probes.length<2&&<button className="text-button" onClick={()=>{setProbes(p=>[...p,{x:2.1,y:.8}]);arrivals.current=[null,null];arrivalEligible.current=false;sampleRef.current=[];setSamples([]);}}>Ajouter une sonde</button>}<button className="text-button" onClick={()=>{setProbes([]);arrivals.current=[null,null];sampleRef.current=[];setSamples([]);}}>Effacer les sondes</button></div><div className="probe-grid">{readings.map((r,i)=><div className="probe-card" key={i}><div className="probe-title"><span className={`probe-dot probe-${i}`}/><b>Sonde {i+1}</b><span>x = {fmt(r.x)} m · y = {fmt(r.y)} m{r.solid?' · DANS UN OBSTACLE':''}</span></div><div className="probe-position"><label>x (m)<NumericInput label={`Position x de la sonde ${i+1}`} value={probes[i].x} min={0} max={engine.grid.width} step={.01} onChange={v=>moveProbe(i,{x:v})}/></label><label>y (m)<NumericInput label={`Position y de la sonde ${i+1}`} value={probes[i].y} min={0} max={engine.grid.height} step={.01} onChange={v=>moveProbe(i,{y:v})}/></label></div><div className="probe-stats"><span>η instantanée<b>{r.solid?'—':`${fmt(r.displacement*1000,3)} mm`}</b></span><span>Amplitude estimée<b>{r.solid?'—':engine.measurementReady?`${fmt(r.amplitude*1000,3)} mm`:'Acquisition…'}</b></span><span>Phase harmonique<b>{engine.measurementReady&&r.phase!==null?`${fmt(r.phase*180/Math.PI,1)}°`:'Indéfinie'}</b></span></div></div>)}</div><div className="chart-section"><LineChart series={[...(probes.length>0&&!readings[0].solid?[{label:'Sonde 1',color:'#218dba',points:samples.map(s=>({x:s.t,y:s.a}))}]:[]),...(probes.length>1&&!readings[1].solid?[{label:'Sonde 2',color:'#c26a46',points:samples.map(s=>({x:s.t,y:s.b}))}]:[])]} xLabel="Temps t (s)" yLabel="Élongation η (mm)"/>{readings.length===2&&<p className="muted">Déphasage estimé : {engine.measurementReady&&readings.every(r=>r.phase!==null)?`${fmt(Math.atan2(Math.sin(readings[1].phase!-readings[0].phase!),Math.cos(readings[1].phase!-readings[0].phase!))*180/Math.PI,1)}°`:'en attente de signaux mesurables'}.</p>}<p className="muted">Arrivée opérationnelle (|η| ≥ 5 % de A₀) : {arrivalEligible.current?probes.map((_,i)=>`S${i+1} : ${arrivals.current[i]!==null?`${fmt(arrivals.current[i]!,3)} s`:"non détectée"}`).join(" · "):"recommencez l’expérience après avoir placé les sondes"}{arrivalEligible.current&&arrivals.current.every(t=>t!==null)&&probes.length===2?` · Δt = ${fmt(arrivals.current[1]!-arrivals.current[0]!,3)} s`:""}. Échantillonnage ≤ {fmt((.004+engine.grid.dt)*1000,1)} ms ; seuil dépendant du signal, pas un front exact.</p><p className="science-note">Une élongation nulle à un instant ne signifie pas une amplitude nulle. L’amplitude et la phase sont estimées sur une période complète ; les transitoires et réflexions peuvent perturber cette estimation. La phase perd son sens aux nœuds.</p></div>
      </section>}<div className="analysis-columns"><section className="panel"><div className="panel-heading"><Ruler size={16}/><h2>Règle et coupe spatiale</h2></div><div className="analysis-body"><div className="tool-buttons"><button className="secondary-button" onClick={()=>{setTool('ruler');setCamera('top');setRuler([]);}}><Ruler size={14}/>Mesurer λ</button><button className="secondary-button" onClick={()=>{setTool('section');setCamera('top');setSection([]);}}><Activity size={14}/>Tracer une coupe</button></div><p className="muted">Distance : <b>{distance!==null?`${fmt(distance,3)} m`:`${ruler.length} / 2 points`}</b> · λ du modèle : {fmt(lambda,3)} m{distance!==null?` · écart ${fmt(Math.abs(distance-lambda)/lambda*100,1)} %`:''}</p><p className="muted micro">Choisissez deux crêtes consécutives, dans la direction de propagation et hors des obstacles. Cette distance n’est une mesure de λ que dans cette configuration.</p>{ruler.map((p,i)=><span className="coordinate-tag" key={i}>P{i+1} ({fmt(p.x)}, {fmt(p.y)}) m</span>)}<LineChart series={[{label:'Coupe du champ instantané',color:'#218dba',points:sectionPoints}]} xLabel="Distance le long de la coupe (m)" yLabel={acoustic?'p′ (Pa)':'η (mm)'} height={180}/><p className="muted micro">Coupe : {section.map(p=>`(${fmt(p.x)}, ${fmt(p.y)}) m`).join(' → ')||'choisir deux points dans la cuve'}. Les segments dans les obstacles sont exclus.</p></div></section><section className="panel"><div className="panel-heading"><Activity size={16}/><h2>Diffraction en champ lointain</h2><span className="theory-badge">THÉORIE</span></div><div className="analysis-body"><AngularMeasurement engine={engine}/>{(!acoustic||params.obstacle==='slit'||params.obstacle==='double')&&<FraunhoferChart aperture={params.aperture} wavelength={lambda} medium={medium}/>}</div></section></div>
      <section className="panel visualization-controls"><label className="check-row"><input type="checkbox" checked={showNodes} onChange={e=>{setShowNodes(e.target.checked);if(e.target.checked)setDisplay('amplitude');}}/>Afficher les zones de faible amplitude</label><ParameterControl label="Seuil nodal relatif" symbol="A/A₀" unit="" value={nodeThreshold} min={.01} max={.3} step={.01} onChange={setNodeThreshold}/><label className="check-row"><input type="checkbox" checked={showMaxima} onChange={e=>setShowMaxima(e.target.checked)}/>Afficher les maxima locaux</label><p className="micro muted">Seuil mesuré, pas un zéro exact. Une zone non encore atteinte par l’onde a aussi une amplitude faible.</p></section>
      </>}
      {(mode!=='presentation'||annotations)&&<section className="panel insight-panel"><div className="insight-icon"><BookOpen size={20}/></div><div><span className="eyebrow">À OBSERVER</span><h3>{experiment.objective}</h3><p>{experiment.explanation}</p><details><summary>Prédiction à confronter au calcul</summary><p>{experiment.prediction}</p></details></div><div className="quick-presets"><span>COMPARER a / λ</span><div>{(acoustic?[{a:.17,label:'0,5'},{a:.34,label:'1'},{a:.68,label:'2'}]:[{a:.1,label:'0,5'},{a:.2,label:'1'},{a:.8,label:'4'}]).map(p=><button key={p.a} className={Math.abs(ratio-Number(p.label.replace(',','.')))<.01?'active':''} onClick={()=>{update({speed:acoustic?340:2,frequency:acoustic?1000:10,aperture:p.a,obstacle:'slit',source:'plane'});reset();}}>{p.label}</button>)}</div></div></section>}
      <div className="view-settings">{!acoustic&&<label className="relief-control">Relief visuel <input aria-label="Exagération verticale" type="range" min={1} max={30} value={exaggeration} onChange={e=>setExaggeration(Number(e.target.value))}/><b>×{exaggeration}</b><span>sans effet sur l’amplitude physique</span></label>}<label className="check-row"><input type="checkbox" checked={huygens} onChange={e=>setHuygens(e.target.checked)}/>Visualisation de Huygens</label><button className="text-button" onClick={exportJson}><ArrowDownToLine size={14}/>Exporter JSON</button><button className="text-button" onClick={()=>fileInput.current?.click()}><Upload size={14}/>Importer</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importJson(f);e.currentTarget.value='';}}/></div>{jsonError&&<p className="warning-box" role="alert">{jsonError}</p>}
      </div>
    </main><footer className="app-footer"><span><span className="live-dot"/>{acoustic?'Calcul FDTD de pression · Même champ pour les vues 2D/3D et les microphones':'Calcul FDTD · Même champ pour la cuve, les cartes et les sondes'}</span><span>Δt = {fmt(engine.grid.dt*1000,3)} ms · Modèle pédagogique non dispersif</span></footer>
    </>}{notice&&<div className="toast" role="status"><Check size={16}/>{notice}<button aria-label="Fermer le message" onClick={()=>setNotice('')}><X size={14}/></button></div>}
  </div>;
}

export default DiffractionLaboratory;
