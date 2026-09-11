(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const VERSION='28.20260911.1';
let providerEnabled=false;
let generating=false;
let legacyPromise=null;
let lastImage='';

function setStatus(text,busy=false){
  const el=$('#v26Status');
  if(!el)return;
  el.textContent=text;
  el.classList.toggle('busy',!!busy);
}

function activeRatio(){
  const on=$('[data-v26-format].on');
  return on?.dataset?.ratio || '4:5';
}

function imagePrompt(){
  const custom=$('#v26AiPrompt')?.value?.trim();
  if(custom)return custom;
  const title=$('#v26Title')?.value?.trim()||'';
  const context=$('#v26Context')?.value?.trim()||'';
  return [title,context].filter(Boolean).join('. ') || 'Visuel éditorial contemporain pour PLUG ART';
}

function imageStyle(){return $('#v26ImageStyle')?.value || 'photo'}
function imageQuality(){return $('#v26Quality')?.value || 'medium'}

function renderImage(url,label='Visuel prêt'){
  lastImage=url;
  try{localStorage.setItem('plugart_v28_last_image',url)}catch{}
  const stage=$('#v26ImageStage');
  if(!stage)return;
  stage.innerHTML=`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Visuel généré dans PLUG ART"><div class="v26-image-actions"><button type="button" id="v28DownloadImage">Télécharger</button><button type="button" id="v28UseEditor">Éditer</button></div>`;
  $('#v28DownloadImage')?.addEventListener('click',()=>{
    const a=document.createElement('a');a.href=lastImage;a.download='PLUG_ART_visuel.png';document.body.appendChild(a);a.click();a.remove();
  });
  $('#v28UseEditor')?.addEventListener('click',async()=>{
    await openLegacyEditor();
    setTimeout(()=>{
      const input=$('#slideImageURL');
      if(input){input.value=lastImage;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));setStatus('Image envoyée dans l’éditeur');}
    },180);
  });
  setStatus(label,false);
  window.dispatchEvent(new CustomEvent('plugart:image-ready',{detail:{url,source:label}}));
}

function renderError(message){
  const stage=$('#v26ImageStage');
  if(stage)stage.innerHTML=`<div class="v26-empty-visual"><strong>Création visuelle indisponible</strong><span>${String(message||'Erreur inconnue').replace(/[<>]/g,'')}</span><br><br><button class="v26-btn" type="button" id="v28RetryLocal">Créer un fond local</button></div>`;
  $('#v28RetryLocal')?.addEventListener('click',()=>generateLocal());
  setStatus('Erreur visuelle',false);
}

async function generateLocal(){
  const prompt=imagePrompt();
  setStatus('Création locale…',true);
  try{
    const r=await fetch('/api/content/visual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:'abstract'}),cache:'no-store'});
    if(!r.ok)throw new Error(`Fond local : erreur ${r.status}`);
    const blob=await r.blob();
    renderImage(URL.createObjectURL(blob),'Fond local prêt');
  }catch(err){renderError(err?.message||err)}
}

async function generateSmartImage(){
  if(generating)return;
  generating=true;
  const buttons=['#v26GenerateImage','#v26GenerateImage2'].map($).filter(Boolean);
  buttons.forEach(b=>{b.disabled=true});
  setStatus(providerEnabled?'Génération de l’image IA…':'Création du visuel…',true);
  try{
    if(providerEnabled){
      const r=await fetch('/api/v26/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imagePrompt(),style:imageStyle(),ratio:activeRatio(),quality:imageQuality()}),cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(r.ok&&data.url){renderImage(data.url,`Visuel IA prêt · ${data.model||'OpenAI'}`);return}
      console.warn('[PLUG ART V28] image IA indisponible, fallback local',data.detail||r.status);
    }
    await generateLocal();
  }catch(err){
    console.warn('[PLUG ART V28] image generation failed, fallback local',err);
    await generateLocal();
  }finally{
    generating=false;
    buttons.forEach(b=>{b.disabled=false});
  }
}

async function checkProvider(){
  try{
    const r=await fetch('/api/v26/content/image/status',{cache:'no-store'});
    const data=await r.json();
    providerEnabled=!!data.enabled;
    const p=$('#v26Provider');
    if(p){
      p.textContent=providerEnabled?'Image IA active · génération + fallback':'Mode visuel local · toujours disponible';
      p.classList.toggle('off',!providerEnabled);
    }
  }catch{providerEnabled=false}
  ['#v26GenerateImage','#v26GenerateImage2'].forEach(sel=>{const b=$(sel);if(b){b.disabled=false;b.title=providerEnabled?'Génération IA avec repli local':'Génération locale disponible'}});
}

function loadStyle(href,key){
  if(document.querySelector(`link[data-v28-lazy="${key}"]`))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.v28Lazy=key;link.onload=resolve;link.onerror=reject;document.head.appendChild(link);
  });
}
function loadScript(src,key){
  if(document.querySelector(`script[data-v28-lazy="${key}"]`))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.defer=true;script.dataset.v28Lazy=key;script.onload=resolve;script.onerror=reject;document.body.appendChild(script);
  });
}

async function loadLegacyEditor(){
  if(legacyPromise)return legacyPromise;
  legacyPromise=(async()=>{
    setStatus('Chargement de l’éditeur complet…',true);
    await Promise.all([
      loadStyle('/static/content_studio_v10.css?v=10','css10'),
      loadStyle('/static/content_studio_v11.css?v=11','css11')
    ]);
    await loadScript('/static/content_studio_v10.js?v=10','js10');
    await loadScript('/static/content_studio_v11.js?v=11','js11');
    return true;
  })().catch(err=>{legacyPromise=null;throw err});
  return legacyPromise;
}

async function openLegacyEditor(){
  const wrap=$('#v26LegacyWrap');
  const shell=$('.studio-shell');
  if(!wrap||!shell){setStatus('Éditeur complet indisponible');return}
  wrap.classList.add('loading');
  try{
    await loadLegacyEditor();
    if(!wrap.contains(shell))wrap.appendChild(shell);
    wrap.classList.add('open');
    setStatus('Éditeur complet chargé');
    setTimeout(()=>window.dispatchEvent(new Event('resize')),120);
  }catch(err){setStatus('Impossible de charger l’éditeur complet');console.error('[PLUG ART V28] legacy editor load',err)}
  finally{wrap.classList.remove('loading')}
}

function bind(){
  if(document.documentElement.dataset.plugStudioPatch==='28')return true;
  if(!$('#v26Studio'))return false;
  document.documentElement.dataset.plugStudioPatch='28';

  ['#v26GenerateImage','#v26GenerateImage2'].forEach(sel=>{
    const b=$(sel);if(!b)return;b.disabled=false;
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();generateSmartImage()},true);
  });
  const local=$('#v26LocalVisual');
  if(local)local.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();generateLocal()},true);
  const advanced=$('#v26OpenLegacy');
  if(advanced)advanced.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openLegacyEditor()},true);

  const restored=(()=>{try{return localStorage.getItem('plugart_v28_last_image')||''}catch{return ''}})();
  if(restored&&restored.startsWith('/api/v26/content/generated/'))renderImage(restored,'Dernier visuel restauré');
  (window.requestIdleCallback||((fn)=>setTimeout(fn,50)))(checkProvider);
  console.info('[PLUG ART] Studio V28 patch actif : génération fiable + éditeur lazy');
  return true;
}

let tries=0;const timer=setInterval(()=>{if(bind()||++tries>80)clearInterval(timer)},125);bind();
})();
