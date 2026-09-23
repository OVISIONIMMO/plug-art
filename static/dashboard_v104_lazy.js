(function(){
'use strict';
const VERSION='104.20260923.1';
const loaded=new Map();
const routeMap={
  studio:['dashboard_v65_studio.js','dashboard_v86_editor.js'],
  map:['dashboard_v86_map.js'],
  artists:['dashboard_v86_people.js'],
  crm:['dashboard_v86_people.js'],
  social:['dashboard_v88_instagram.js'],
  builder:['dashboard_v90_builder.js']
};
function src(name){return '/static/'+name+'?v='+VERSION}
function loadScript(name,opts={}){
  const url=opts.external?name:src(name);
  if(loaded.has(url))return loaded.get(url);
  const p=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=url;
    s.async=true;
    if(opts.module)s.type='module';
    s.onload=()=>resolve(s);
    s.onerror=()=>reject(new Error('Chargement impossible: '+url));
    document.head.appendChild(s);
  });
  loaded.set(url,p);
  return p;
}
async function loadFiles(files){
  for(const f of files)await loadScript(f);
}
const routePromises=new Map();
function setBusy(id,on){
  const view=document.getElementById('view-'+id);
  if(!view)return;
  view.classList.toggle('v104-busy',!!on);
}
async function ensureRoute(id){
  const files=routeMap[id];
  if(!files)return;
  const key=(id==='artists'||id==='crm')?'people':id;
  if(routePromises.has(key))return routePromises.get(key);
  setBusy(id,true);
  const p=loadFiles(files).catch(err=>console.warn('[PLUG ART V104]',err)).finally(()=>{
    setBusy(id,false);
    document.dispatchEvent(new CustomEvent('plugart:v104-module',{detail:{id}}));
  });
  routePromises.set(key,p);
  return p;
}
let plugyPromise=null;
async function ensurePlugy(){
  if(window.PlugyAssistant)return window.PlugyAssistant;
  if(plugyPromise)return plugyPromise;
  document.body.classList.add('v104-plugy-loading');
  plugyPromise=(async()=>{
    if(!customElements.get('model-viewer')){
      await loadScript('https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js',{external:true,module:true});
      try{await customElements.whenDefined('model-viewer')}catch{}
    }
    document.querySelectorAll('model-viewer[data-src]').forEach(el=>{
      if(!el.getAttribute('src'))el.setAttribute('src',el.dataset.src);
    });
    await loadScript('plugy_assistant_v90.js');
    return window.PlugyAssistant||null;
  })().catch(err=>{console.warn('[PLUG ART V104] PLUGY',err);return null}).finally(()=>document.body.classList.remove('v104-plugy-loading'));
  return plugyPromise;
}
function bind(){
  document.body.classList.add('v104-ui');
  document.documentElement.dataset.plugartUi='v104';

  addEventListener('plugart:view',e=>ensureRoute(e.detail?.id||document.body.dataset.view||'dashboard'));
  document.querySelectorAll('[data-view]').forEach(el=>{
    const warm=()=>ensureRoute(el.dataset.view);
    el.addEventListener('touchstart',warm,{once:true,passive:true});
    el.addEventListener('pointerenter',warm,{once:true,passive:true});
    el.addEventListener('focusin',warm,{once:true,passive:true});
  });

  // Load PLUGY only when the user actually asks for it.
  document.addEventListener('click',async e=>{
    const target=e.target.closest('#openPlugy,#plugyFloatVoice,.plugy-float-visual,[data-plugy-prompt]');
    if(!target||window.PlugyAssistant)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    await ensurePlugy();
    if(target.id==='openPlugy')target.click();
    else document.getElementById('openPlugy')?.click();
  },true);

  document.addEventListener('submit',async e=>{
    if(e.target?.id!=='homePlugyForm'||window.PlugyAssistant)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const input=document.getElementById('homePlugyPrompt');
    const message=input?.value?.trim()||'';
    await ensurePlugy();
    document.getElementById('openPlugy')?.click();
    setTimeout(()=>{
      const chat=document.getElementById('chatInput');
      const form=document.getElementById('chatForm');
      if(chat&&form&&message){chat.value=message;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
      if(input)input.value='';
    },80);
  },true);

  const initial=document.body.dataset.view||location.hash.slice(1)||'dashboard';
  ensureRoute(initial);

  // Quality diagnostics are also demand-loaded.
  document.getElementById('layoutHealth')?.addEventListener('click',async e=>{
    if(window.PLUGQuality)return;
    e.preventDefault();e.stopImmediatePropagation();
    await loadScript('dashboard_v86_quality.js');
    document.getElementById('layoutHealth')?.click();
  },true);

  window.PLUGART_V104={version:'104.0',ensureRoute,ensurePlugy};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();