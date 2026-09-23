(function(){
'use strict';

const loaded=new Map();
const VERSION='102.20260923.1';
const asset=(name,legacy=false)=>'/static/'+name+'?v='+(legacy?'102.20260923.1':VERSION);
const idle=(fn,timeout=900)=>'requestIdleCallback'in window?requestIdleCallback(fn,{timeout}):setTimeout(fn,120);

function loadScript(src,opts={}){
  if(loaded.has(src))return loaded.get(src);
  const p=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    if(opts.module)s.type='module';
    s.onload=()=>resolve(s);
    s.onerror=()=>reject(new Error('Asset unavailable: '+src));
    document.head.appendChild(s);
  });
  loaded.set(src,p);
  return p;
}

async function loadSequence(files){
  for(const file of files)await loadScript(asset(file,true));
}

const routeModules={
  studio:['dashboard_v65_studio.js','dashboard_v86_editor.js'],
  map:['dashboard_v86_map.js'],
  artists:['dashboard_v86_people.js'],
  crm:['dashboard_v86_people.js'],
  social:['dashboard_v88_instagram.js'],
  builder:['dashboard_v90_builder.js']
};
const routeReady=new Map();

function viewNode(id){return document.getElementById('view-'+id)}
function setLoading(id,on){
  const v=viewNode(id);if(!v)return;
  v.classList.toggle('v102-loading',!!on);
  let veil=v.querySelector(':scope > .v102-module-loading');
  if(on&&!veil){
    veil=document.createElement('div');
    veil.className='v102-module-loading';
    veil.innerHTML='<span><i></i> Préparation de l’espace</span>';
    v.style.position='relative';
    v.appendChild(veil);
  }else if(!on&&veil){
    veil.remove();
  }
}
async function ensureRoute(id,quiet=false){
  const files=routeModules[id];if(!files?.length)return;
  if(routeReady.has(id))return routeReady.get(id);
  if((id==='artists'&&routeReady.has('crm'))||(id==='crm'&&routeReady.has('artists'))){
    const p=routeReady.get(id==='artists'?'crm':'artists');routeReady.set(id,p);return p;
  }
  if(!quiet)setLoading(id,true);
  const p=loadSequence(files).then(()=>{
    if(id==='artists'||id==='crm'){routeReady.set('artists',p);routeReady.set('crm',p)}
  }).catch(err=>{
    console.warn('[PLUG ART] feature module',id,err);
  }).finally(()=>setLoading(id,false));
  routeReady.set(id,p);
  return p;
}

let modelPromise=null;
function warmModel(){
  if(modelPromise)return modelPromise;
  modelPromise=fetch('/static/plugy_official_v84.glb?v=102.20260923.1',{cache:'force-cache'})
    .catch(()=>null);
  return modelPromise;
}
async function ensureModelViewer(){
  if(customElements.get('model-viewer'))return;
  const src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';
  await Promise.allSettled([loadScript(src,{module:true}),warmModel()]);
  try{await customElements.whenDefined('model-viewer')}catch{}
  document.querySelectorAll('model-viewer[data-src]').forEach(el=>{
    if(!el.getAttribute('src'))el.setAttribute('src',el.dataset.src);
  });
  document.documentElement.dataset.plugy3d='ready';
}
let plugyPromise=null;
async function ensurePlugy(){
  if(window.PlugyAssistant)return window.PlugyAssistant;
  if(plugyPromise)return plugyPromise;
  plugyPromise=Promise.all([
    ensureModelViewer(),
    loadScript(asset('plugy_assistant_v90.js',true))
  ]).then(()=>window.PlugyAssistant).catch(err=>{
    console.warn('[PLUG ART] PLUGY deferred load',err);return null;
  });
  return plugyPromise;
}

function bindPlugyIntent(){
  const selectors=['#openPlugy','#homePlugyForm','.orbit-action','#plugyFloat','.sidebar-agent'];
  selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
    if(el.dataset.v102PlugyIntent)return;
    el.dataset.v102PlugyIntent='1';
    ['pointerdown','focusin','touchstart'].forEach(ev=>{
      el.addEventListener(ev,()=>ensurePlugy(),{once:true,passive:true,capture:true});
    });
  }));
}


let imageObserver=null;
function hydrateDeferredImages(root=document){
  const nodes=Array.from(root.querySelectorAll('img[data-v102-src]'));
  if(!nodes.length)return;
  if(!('IntersectionObserver'in window)){
    idle(()=>nodes.forEach(img=>{if(!img.src)img.src=img.dataset.v102Src||''}),350);
    return;
  }
  if(!imageObserver){
    imageObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const img=entry.target;
        if(!img.src&&img.dataset.v102Src)img.src=img.dataset.v102Src;
        imageObserver.unobserve(img);
      });
    },{rootMargin:'320px 0px'});
  }
  nodes.forEach(img=>imageObserver.observe(img));
}

function tuneImages(root=document){
  hydrateDeferredImages(root);
  root.querySelectorAll('img').forEach((img,i)=>{
    if(!img.loading)img.loading=i<2?'eager':'lazy';
    if(!img.decoding)img.decoding='async';
    if(i>1&&!img.fetchPriority)img.fetchPriority='low';
    img.addEventListener('load',()=>img.classList.add('v102-image-ready'),{once:true});
  });
}

function observeNewContent(){
  const mo=new MutationObserver(records=>{
    let imageWork=false,plugyWork=false;
    for(const r of records){
      if(r.addedNodes?.length){imageWork=true;plugyWork=true;break}
    }
    if(imageWork)tuneImages();
    if(plugyWork)bindPlugyIntent();
  });
  mo.observe(document.body,{childList:true,subtree:true});
}

function premiumRuntime(){
  document.body.classList.add('v89-ui','v100-ui','v101-ui','v102-ui');
  document.documentElement.dataset.plugartUi='v102';
  tuneImages();bindPlugyIntent();observeNewContent();

  addEventListener('plugart:view',e=>{
    const id=e.detail?.id||document.body.dataset.view||'dashboard';
    ensureRoute(id);
  });

  const initial=document.body.dataset.view||location.hash.slice(1)||'dashboard';
  ensureRoute(initial);

  const health=document.getElementById('layoutHealth');
  health?.addEventListener('pointerdown',()=>ensureRoute('__quality'),{once:true});
  health?.addEventListener('click',async()=>{
    if(!window.PLUGQuality){
      await loadScript(asset('dashboard_v86_quality.js',true)).catch(()=>null);
    }
  },{capture:true});

  const coarse=matchMedia('(pointer:coarse)').matches;
  // PLUGY stays instant on intent, but its 3D engine no longer competes with first paint.
  idle(()=>ensurePlugy(),coarse?2200:900);

  // Desktop can afford warm modules. Touch devices load them strictly on demand.
  idle(()=>{
    const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    if(coarse||conn?.saveData||/2g/.test(conn?.effectiveType||''))return;
    ['studio','social','map'].forEach((id,i)=>setTimeout(()=>ensureRoute(id,true),i*260));
  },3000);

  // Runtime quality adaptation: keep visual quality, remove expensive motion on stressed mobile sessions.
  const lowMemory=Number(navigator.deviceMemory||8)<=4;
  if(coarse&&lowMemory)document.body.classList.add('v102-efficient-motion');

  // Small Web Vitals telemetry in-memory only for diagnostics.
  const perf={nav:performance.now()};
  try{
    new PerformanceObserver(list=>{
      for(const e of list.getEntries()){
        if(e.entryType==='largest-contentful-paint')perf.lcp=Math.round(e.startTime);
        if(e.entryType==='layout-shift'&&!e.hadRecentInput)perf.cls=Number(((perf.cls||0)+e.value).toFixed(4));
      }
      window.PLUGART_V102_PERF=perf;
    }).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>{
      for(const e of list.getEntries())if(!e.hadRecentInput)perf.cls=Number(((perf.cls||0)+e.value).toFixed(4));
      window.PLUGART_V102_PERF=perf;
    }).observe({type:'layout-shift',buffered:true});
  }catch{}

  addEventListener('load',()=>{
    perf.load=Math.round(performance.now());
    perf.resources=performance.getEntriesByType('resource').length;
    window.PLUGART_V102_PERF=perf;
  },{once:true});
  addEventListener('pageshow',e=>{
    if(e.persisted){tuneImages();bindPlugyIntent();}
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',premiumRuntime,{once:true});
else premiumRuntime();

window.PLUGART_V102={
  version:'102.0',
  ensureRoute,
  ensurePlugy,
  ensureModelViewer,
  warmModel,
  metrics:()=>window.PLUGART_V102_PERF||{}
};
})();