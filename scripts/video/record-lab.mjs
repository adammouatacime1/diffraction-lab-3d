import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const output=process.env.LAB_VIDEO_ROOT||'/workspace/video-lab';
const base=process.env.BASE_URL||'http://127.0.0.1:5173';
const chapters=JSON.parse(await fs.readFile(path.join(output,'timing.json'),'utf8'));
const wanted=(process.env.LAB_CHAPTERS||'').split(',').filter(Boolean);
const jobs=chapters.filter(c=>!wanted.length||wanted.includes(c.id));
await fs.mkdir(path.join(output,'recordings'),{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
const results=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function film(chapter){
 const manifest=path.join(output,'recordings',`${chapter.id}.json`);
 try{const old=JSON.parse(await fs.readFile(manifest,'utf8'));await fs.access(old.path);console.log(`REUSE ${chapter.id}`);results.push(old);return;}catch{}
 const sceneBrowser=process.env.LAB_FRESH_BROWSER!=='0'?await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}):browser;
 const context=await sceneBrowser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true,recordVideo:{dir:path.join(output,'recordings'),size:{width:1440,height:900}}});
 const page=await context.newPage();page.setDefaultTimeout(18000);
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 const focus=async target=>{const loc=typeof target==='string'?page.locator(target).first():target;await loc.scrollIntoViewIfNeeded();await page.evaluate(()=>document.querySelectorAll('[data-video-focus]').forEach(el=>el.removeAttribute('data-video-focus')));await loc.evaluate(el=>el.setAttribute('data-video-focus','true'));await sleep(150);return loc;};
 const top=async()=>{await page.evaluate(()=>scrollTo({top:0,behavior:'smooth'}));await sleep(220);};
 const tank=()=>focus('.viewport');
 const click=async label=>{const loc=page.getByRole('button',{name:label,exact:true}).first();await focus(loc);await loc.click();};
 const mode=async label=>{await page.getByRole('tab',{name:label,exact:true}).click();await sleep(120);};
 const scenario=async label=>{await page.locator('.experiment-button').filter({hasText:label}).first().click();await sleep(180);};
 const pause=async()=>{const b=page.getByRole('button',{name:'Mettre en pause',exact:true});if(await b.count())await b.click();await sleep(140);};
 const play=async()=>{const b=page.getByRole('button',{name:'Démarrer',exact:true});if(await b.count())await b.click();};
 const speed=async n=>{await page.getByRole('combobox',{name:'Vitesse de lecture'}).selectOption(String(n));};
 const reset=async()=>{await click('Recommencer l’expérience');};
 const advanced=async()=>{if(!await page.locator('.advanced-controls').count())await click('Réglages avancés');};
 const number=async(label,value)=>{const loc=page.getByRole('spinbutton',{name:label,exact:true});await focus(loc);await loc.fill(String(value));await loc.press('Tab');await sleep(160);};
 const select=async(label,value)=>{const loc=page.getByLabel(label,{exact:true});await focus(loc);await loc.selectOption(value);await sleep(140);};
 const range=async(label,value)=>{const loc=page.getByRole('slider',{name:label,exact:true});await focus(loc);await loc.evaluate((el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(value));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await sleep(160);};
 const check=async(label,value)=>{const loc=page.getByRole('checkbox',{name:label,exact:true});await focus(loc);await loc.setChecked(value);};
 const warm=async(t=1.4)=>{await speed(process.env.LAB_FAST_WARM==='1'?2:1);await play();await page.waitForFunction(t=>Number(document.querySelector('.physical-clock strong')?.textContent.replace(',','.').replace(/[^\d.]/g,''))>=t,t,{timeout:45000});await speed(.25);};
 const camera=async label=>{await click(label);await sleep(600);};
 const wavePoint=async(x,y)=>{
   const canvas=page.locator('.scene-container canvas').first();await canvas.scrollIntoViewIfNeeded();await sleep(700);
   const bounds=await canvas.boundingBox();const aspect=bounds.width/bounds.height;const tangent=Math.tan(38*Math.PI/360);const d=Math.max(1.99/(2*tangent),3.15/(2*tangent*aspect))*1.04;const h=2*d*tangent,w=h*aspect;
   await canvas.click({position:{x:bounds.width/2+(x-1.4)/w*bounds.width,y:bounds.height/2+(y-.8)/h*bounds.height}});
 };
 const card=async(title,lines)=>{await page.evaluate(({title,lines})=>{document.getElementById('video-card')?.remove();const box=document.createElement('aside');box.id='video-card';box.style.cssText='position:fixed;z-index:9999;left:70px;top:130px;width:590px;padding:32px 36px;background:rgba(255,255,255,.97);border:1px solid #bcd7de;border-radius:18px;box-shadow:0 20px 70px #122f4b33;color:#243b49;pointer-events:none;font:19px/1.7 system-ui';const tag=document.createElement('div');tag.textContent='COMMENTAIRE VIDÉO';tag.style.cssText='color:#218ca2;font-size:11px;letter-spacing:2px;margin-bottom:12px';box.append(tag);const h=document.createElement('h2');h.textContent=title;h.style.cssText='font-size:27px;margin:0 0 18px';box.append(h);for(const line of lines){const p=document.createElement('p');p.textContent=line;p.style.cssText='margin:9px 0';box.append(p);}document.body.append(box);},{title,lines});};
 const removeCard=()=>page.evaluate(()=>document.getElementById('video-card')?.remove());
 const actions=[];const at=(fraction,fn)=>actions.push({fraction,fn});
 let rulerInfo=null,validationInfo=null;
 try{
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('canvas').first().waitFor({state:'visible'});
  await page.addStyleTag({content:'[data-video-focus="true"]{outline:3px solid #e5a34d!important;outline-offset:5px!important;box-shadow:0 0 0 6px #e5a34d22!important;border-radius:6px}html{scroll-behavior:smooth}'});
  switch(chapter.id){
  case '01':
   await warm();await top();
   at(.05,()=>card('Diffraction Lab 3D',['Une visite guidée pour le professeur de physique.','Captures réelles • Voix de synthèse française','Calcul, mesures, illustrations et théorie : quatre statuts distincts.']));
   at(.43,()=>card('Démarrer sur votre ordinateur',['1. Installer Node.js, version LTS.','2. Extraire le ZIP ; ouvrir le dossier contenant package.json.','3. Dans le terminal : npm ci','4. Puis : npm run dev','5. Ouvrir l’adresse locale affichée.']));at(.93,removeCard);break;
  case '02':
   await scenario('Onde plane');await warm();await top();at(.08,()=>focus('.experiment-library'));at(.43,()=>focus('.mode-tabs'));at(.7,()=>focus('.parameters'));at(.88,tank);break;
  case '03':
   await scenario('Onde plane');await camera('Dessus');await warm();await tank();
   at(.12,pause);at(.3,()=>click('Avancer d’un pas d’observation'));at(.44,play);at(.55,()=>speed(.1));at(.67,()=>focus('.physical-clock'));at(.84,async()=>{await reset();await speed(.5);await tank();});break;
  case '04':
   await scenario('Onde plane');await warm();await pause();await focus('.parameters');
   at(.08,()=>focus(page.getByRole('spinbutton',{name:'Fréquence',exact:true})));at(.29,()=>focus(page.getByRole('spinbutton',{name:'Célérité',exact:true})));at(.43,()=>focus('.metrics-row'));at(.65,()=>number('Amplitude source',6));at(.78,async()=>{await number('Amplitude source',4);await advanced();await number('Période',.1);});at(.9,()=>number('Longueur d’onde',.2));break;
  case '05':
   await scenario('Onde circulaire');await warm();await advanced();await tank();
   at(.12,async()=>{await select('Source d’onde','pair');await number('Séparation des sources',.5);});at(.29,()=>number('Déphasage des sources',90));at(.48,async()=>{await select('Source d’onde','plane');await number('Direction incidente',20);});at(.65,()=>number('Position de source x',.35));at(.78,()=>check('Source active',false));at(.89,async()=>{await check('Source active',true);await tank();});break;
  case '06':
   await warm();await tank();at(.08,()=>camera('Dessus'));at(.26,()=>camera('Profil'));at(.43,()=>camera('Isométrique'));at(.6,async()=>{await camera('3D libre');const b=await page.locator('canvas').first().boundingBox();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.48);await page.mouse.down();await page.mouse.move(b.x+b.width*.67,b.y+b.height*.6,{steps:12});await page.mouse.up();});at(.79,async()=>{await range('Exagération verticale',22);await tank();});at(.92,async()=>{await range('Exagération verticale',10);await tank();});break;
  case '07':
   await scenario('Fente étroite');await camera('Dessus');await warm();await speed(.5);await tank();
   at(.10,async()=>{await page.locator('.quick-presets button').filter({hasText:'0,5'}).click();await warm(1.35);await tank();});at(.4,async()=>{await page.locator('.quick-presets button').getByText('1',{exact:true}).click();await warm(1.35);await tank();});at(.69,async()=>{await page.locator('.quick-presets button').getByText('4',{exact:true}).click();await warm(1.35);await tank();});break;
  case '08':
   await scenario('Obstacle circulaire');await warm();await camera('Dessus');await advanced();await tank();
   at(.08,()=>select('Géométrie','double'));at(.2,()=>number('Écartement des fentes',.55));at(.35,async()=>{await select('Géométrie','circle');await number('Diamètre',.4);await tank();});at(.55,async()=>{await select('Géométrie','rectangle');await number('Hauteur obstacle',.5);await tank();});at(.76,async()=>{await select('Géométrie','edge');await number('Position obstacle y',.8);await tank();});break;
  case '09':
   await scenario('Onde circulaire');await camera('Dessus');await advanced();await warm(.7);await focus('.advanced-controls');
   at(.12,()=>select('Bords de cuve','absorbing'));at(.38,async()=>{await select('Bords de cuve','reflecting');await reset();await speed(.5);await tank();});at(.78,()=>focus('.advanced-controls'));at(.9,tank);break;
  case '10':
   await scenario('Fente étroite');await advanced();await number('Largeur de fente',.04);await warm(.5);await focus('.advanced-controls');
   at(.12,async()=>{await select('Résolution du solveur','performance');await focus('.metrics-row');});at(.36,()=>focus('.warning-box'));at(.58,async()=>{await select('Résolution du solveur','balanced');await focus('.metrics-row');});at(.78,async()=>{await select('Résolution du solveur','precision');await focus('.metrics-row');});break;
  case '11':
   await scenario('Huygens');await warm();await camera('Dessus');await tank();
   for(const [fraction,step] of [[.10,1],[.34,2],[.54,3],[.75,4]])at(fraction,async()=>{await click(`Étape ${step}`);await tank();});break;
  case '12':
   await scenario('Huygens');await warm();await camera('Dessus');await tank();
   for(const [fraction,step] of [[.06,5],[.24,6],[.4,7]])at(fraction,async()=>{await click(`Étape ${step}`);await tank();});at(.58,async()=>{await click('Étape 4');await range('Sources secondaires visibles — curseur',25);await tank();});at(.82,async()=>{await check('Visualisation de Huygens',false);await tank();});break;
  case '13':
   await scenario('Double fente');await warm(1.7);await camera('Dessus');await tank();
   at(.07,()=>select('Grandeur visualisée','displacement'));at(.4,async()=>{await select('Grandeur visualisée','amplitude');await tank();});at(.7,async()=>{await select('Grandeur visualisée','intensity');await tank();});break;
  case '14': case '15':
   await scenario('Onde plane');await mode('Analyse');await click('Ajouter une sonde');await number('Position x de la sonde 1',.9);await number('Position x de la sonde 2',1.5);await reset();
   if(chapter.id==='14'){
    await warm(1.6);await focus('.analysis-panel');at(.1,()=>focus('.probe-position'));at(.4,()=>focus('.probe-stats'));at(.7,()=>focus('.chart-section'));
   }else{
    await pause();await focus('.analysis-panel');at(.08,async()=>{await reset();await speed(.5);await play();await focus('.analysis-panel');});at(.47,()=>focus('.chart-section'));at(.8,()=>focus('.probe-grid'));
   }break;
  case '16':
   await scenario('Onde plane');await mode('Analyse');await camera('Dessus');await warm(1.05);await pause();await tank();
   at(.10,async()=>{
    await click('Mesurer λ');await tank();
    const canvas=page.locator('.scene-container canvas').first();const png=await canvas.screenshot();const img=path.join(output,'recordings','ruler-view.png');await fs.writeFile(img,png);
    const bounds=await canvas.boundingBox();const aspect=bounds.width/bounds.height,t=Math.tan(38*Math.PI/360),d=Math.max(1.99/(2*t),3.15/(2*t*aspect))*1.04,w=2*d*t*aspect;
    const py=String.raw`from PIL import Image
import sys,json
im=Image.open(sys.argv[1]).convert('RGB');ww,hh=im.size;worldwidth=float(sys.argv[2]);pixel=lambda x:round(ww/2+(x-1.4)/worldwidth*ww)
lo,hi=pixel(.56),pixel(1.35);yy=hh//2
vals=[]
for x in range(lo,hi):
 cols=[im.getpixel((xx,yy)) for xx in range(max(lo,x-2),min(hi,x+3))];vals.append(sum(r-b for r,g,b in cols)/len(cols))
peaks=[]
for i in range(3,len(vals)-3):
 if vals[i]>=max(vals[i-3:i+4]) and vals[i]>-10 and (not peaks or i-peaks[-1]>12):peaks.append(i)
if len(peaks)<2:raise RuntimeError('Deux crêtes visuelles non identifiées')
xs=[(lo+i-ww/2)/ww*worldwidth+1.4 for i in peaks[:2]]
print(json.dumps(xs))`;
    const detected=spawnSync('python3',['-c',py,img,String(w)],{encoding:'utf8'});if(detected.status!==0)throw new Error(`Détection des crêtes: ${detected.stderr}`);const xs=JSON.parse(detected.stdout);rulerInfo={x1:xs[0],x2:xs[1],separation:xs[1]-xs[0],method:'Deux maxima de la palette positive repérés dans le rendu réel, sans imposer leur espacement.'};
    await wavePoint(xs[0],.8);await wavePoint(xs[1],.8);await focus('.analysis-columns');
   });at(.54,async()=>{await click('Tracer une coupe');await wavePoint(.5,.8);await wavePoint(1.65,.8);await focus('.analysis-columns');});break;
  case '17':
   await scenario('Fente étroite');await mode('Analyse');await warm(1.8);await focus(page.locator('.analysis-columns > .panel').nth(1));
   at(.12,()=>focus(page.locator('.analysis-columns > .panel').nth(1).locator('.chart-wrap').first()));at(.48,()=>focus(page.locator('.analysis-columns > .panel').nth(1).locator('.chart-wrap').nth(1)));at(.78,()=>focus(page.locator('.analysis-columns > .panel').nth(1)));break;
  case '18':
   await scenario('Zones nodales');await warm(1.6);await camera('Dessus');await tank();
   at(.15,async()=>{await range('Seuil nodal relatif — curseur',.04);await tank();});at(.45,async()=>{await check('Afficher les maxima locaux',true);await tank();});at(.7,async()=>{await range('Seuil nodal relatif — curseur',.12);await tank();});break;
  case '19':
   await mode('Comparaison');await warm(1.4);await camera('Dessus');await tank();
   at(.17,()=>focus('.compare-controls'));at(.4,async()=>{await number('Fente de la seconde cuve',.2);await tank();});at(.76,async()=>{await click('Recopier les paramètres');await tank();});break;
  case '20':{
   await warm();await pause();await tank();let jsonFile;
   at(.12,async()=>{const wait=page.waitForEvent('download');await click('Capturer l’expérience en PNG');const d=await wait;await d.saveAs(path.join(output,'export-experience.png'));await card('Capture enregistrée',[d.suggestedFilename(),'Le PNG contient la cuve et les paramètres affichés.']);});
   at(.4,async()=>{await removeCard();const wait=page.waitForEvent('download');await click('Exporter JSON');const d=await wait;jsonFile=path.join(output,'export-experience.json');await d.saveAs(jsonFile);await card('Paramètres enregistrés',[d.suggestedFilename(),'Le champ et son historique ne sont pas sauvegardés.']);});
   at(.69,async()=>{await removeCard();await focus('.view-settings');await page.locator('input[type=file]').setInputFiles(jsonFile);await tank();});break;}
  case '21':
   await warm();await mode('Présentation');await tank();
   at(.1,()=>focus('.presentation-equations'));at(.27,()=>check('Annotations explicatives',false));at(.4,async()=>{await click('Afficher les réglages');await focus('.parameters');});at(.6,async()=>{await click('Activer le mode sombre');await tank();});at(.76,async()=>{await click('Activer le mode clair');await mode('Présentation');await tank();});at(.9,()=>click('Plein écran'));break;
  case '22':
   await pause();await click('Validation scientifique');await top();
   at(.1,async()=>{await click('Exécuter les validations');await page.locator('.validation-summary').waitFor({timeout:60000});validationInfo=await page.locator('.validation-summary').innerText();if(!validationInfo.startsWith('7 / 7'))throw new Error(`Validation : ${validationInfo}`);});at(.39,()=>focus(page.locator('.validation-card').nth(3)));at(.62,()=>focus(page.locator('.validation-card').last()));at(.79,()=>card('Quatre statuts à distinguer',['1. Champ numérique : équation d’onde calculée.','2. Mesures : échantillonnage et estimation.','3. Huygens : illustration pédagogique.','4. Fraunhofer : théorie idéale sous conditions.','Modèle linéaire non dispersif, à confronter à la physique réelle.']));break;
  default:throw new Error(`Chapitre inconnu ${chapter.id}`);
  }
  const started=performance.now();
  console.log(`RECORD ${chapter.id} ${chapter.title} (${chapter.duration.toFixed(1)} s)`);
  for(const action of actions){await sleep(Math.max(0,chapter.duration*1000*action.fraction-(performance.now()-started)));await action.fn();}
  await sleep(Math.max(0,chapter.duration*1000-(performance.now()-started)));
  const recorded=(performance.now()-started)/1000;
  await page.close();const video=await page.video().path();await context.close();
  if(pageErrors.length)throw new Error(pageErrors.join('; '));
  const result={id:chapter.id,title:chapter.title,path:video,duration:chapter.duration,recorded,errors:pageErrors,rulerInfo,validationInfo};
  await fs.writeFile(manifest,JSON.stringify(result,null,2));results.push(result);console.log(`DONE ${chapter.id}`);
 }catch(e){await page.screenshot({path:path.join(output,'recordings',`failure-${chapter.id}.png`)}).catch(()=>{});errors.push({id:chapter.id,error:e.stack});console.error(`FAIL ${chapter.id}: ${e.stack}`);await context.close().catch(()=>{});}
 finally{if(sceneBrowser!==browser)await sceneBrowser.close().catch(()=>{});}
}
let next=0;
const workers=Math.min(Number(process.env.LAB_VIDEO_WORKERS||1),jobs.length);
await Promise.all(Array.from({length:workers},async()=>{while(next<jobs.length){const chapter=jobs[next++];await film(chapter);}}));
await browser.close();
await fs.writeFile(path.join(output,'recordings-report.json'),JSON.stringify({base,results,errors},null,2));
console.log(JSON.stringify({completed:results.length,failed:errors.length,total:jobs.length}));
if(errors.length)process.exitCode=1;
