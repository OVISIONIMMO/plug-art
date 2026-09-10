(()=>{
'use strict';
const MODEL='/static/plugy_head_v26.glb?v=26.20260910.1';
const MV=['https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js','https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js'];
const $=(s,r=document)=>r.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function ensureViewer(){
  if(customElements.get('model-viewer')) return true;
  for(const src of MV){
    try{
      await Promise.race([
        new Promise((res,rej)=>{const s=document.createElement('script');s.type='module';s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)}),
        sleep(4500).then(()=>{throw new Error('timeout')})
      ]);
      for(let i=0;i<25&&!customElements.get('model-viewer');i++) await sleep(80);
      if(customElements.get('model-viewer')) return true;
    }catch{}
  }
  return false;
}

function miniHeadMarkup(){return '<span class="v26-mini-head"><i></i><b></b></span>'}

async function installHead(){
  const host=$('#v24PlugySingle');
  if(!host||host.dataset.v26==='1') return !!host;
  host.dataset.v26='1';
  host.classList.add('v26-head-only');
  host.querySelectorAll('.v25-fallback-body,.v25-fallback-feet').forEach(n=>n.remove());
  const old=host.querySelector('.v24-model');
  if(old) old.remove();
  const mv=document.createElement('model-viewer');
  mv.id='v26PlugyModel';
  mv.className='v24-model v26-model';
  mv.setAttribute('src',MODEL);
  mv.setAttribute('alt','PLUGY, mascotte 3D PLUG ART en forme de tête de prise');
  mv.setAttribute('camera-controls','');
  mv.setAttribute('auto-rotate','');
  mv.setAttribute('auto-rotate-delay','700');
  mv.setAttribute('rotation-per-second','5deg');
  mv.setAttribute('camera-orbit','0deg 78deg 3.1m');
  mv.setAttribute('camera-target','0m .22m 0m');
  mv.setAttribute('field-of-view','27deg');
  mv.setAttribute('interaction-prompt','none');
  mv.setAttribute('disable-pan','');
  mv.setAttribute('disable-zoom','');
  mv.setAttribute('shadow-intensity','.55');
  mv.setAttribute('shadow-softness','.92');
  mv.setAttribute('environment-image','neutral');
  mv.setAttribute('exposure','1.18');
  host.insertBefore(mv,host.firstChild);

  const stage=host.closest('.v24-model-stage');
  if(stage&&!stage.querySelector('.v26-model-hint')){
    const hint=document.createElement('div');hint.className='v26-model-hint';hint.textContent='Fais glisser PLUGY pour le tourner';stage.appendChild(hint);
  }
  document.querySelectorAll('.v24-mini-avatar').forEach(a=>a.innerHTML=miniHeadMarkup());

  const ok=await ensureViewer();
  if(!ok){host.classList.add('v25-model-error');return true}
  const ready=()=>{
    host.classList.remove('v25-model-error');
    host.classList.add('v26-model-ready');
    try{
      const animations=mv.availableAnimations||[];
      if(animations.includes('IdleBlink')){
        mv.animationName='IdleBlink';
        mv.setAttribute('autoplay','');
        mv.play();
        mv.timeScale=1.0;
      }
    }catch{}
  };
  mv.addEventListener('load',ready,{once:true});
  mv.addEventListener('error',()=>{host.classList.add('v25-model-error');host.classList.remove('v26-model-ready')},{once:true});
  host.addEventListener('pointerenter',()=>{try{mv.timeScale=1.28;mv.setAttribute('rotation-per-second','8deg')}catch{}});
  host.addEventListener('pointerleave',()=>{try{mv.timeScale=1.0;mv.setAttribute('rotation-per-second','5deg')}catch{}});
  host.addEventListener('pointerdown',()=>{try{mv.timeScale=1.5}catch{}});
  host.addEventListener('pointerup',()=>{try{mv.timeScale=1.05}catch{}});
  setTimeout(()=>{if(!host.classList.contains('v26-model-ready'))host.classList.add('v25-model-error')},8000);
  return true;
}

function boot(){
  let tries=0;
  const timer=setInterval(async()=>{
    const done=await installHead();
    if(done||++tries>120) clearInterval(timer);
  },120);
  installHead();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
