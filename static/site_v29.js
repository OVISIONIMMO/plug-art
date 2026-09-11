(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
window.__PLUG_V26=true;
window.__PLUG_HEAD_ONLY=true;

function cleanupPlugy(){
  const host=$('#v24PlugySingle');
  const stage=$('#v24PlugyHomeSlot');
  if(!host)return false;
  document.documentElement.classList.add('plugy-v29');
  host.classList.add('v26-head-only','v29-head-only');

  // Un seul modèle 3D autorisé : la tête PLUGY V26.
  $$('model-viewer',host).forEach(m=>{if(m.id!=='v26PlugyModel')m.remove()});
  $$('img,picture,video,.plug-robot,.plugy-hero-image,.plugy-cloud3d,.v24-poster',host).forEach(n=>n.remove());
  if(stage){
    $$(':scope > img,:scope > picture,:scope > video,:scope > .plug-robot,:scope > .plugy-hero-image,:scope > .plugy-cloud3d',stage).forEach(n=>n.remove());
    if(!stage.querySelector('.v29-plugy-id')){
      const id=document.createElement('div');
      id.className='v29-plugy-id';
      id.innerHTML='<i></i><strong>PLUGY</strong><span>Agent créatif & radar artistique · actif</span>';
      stage.appendChild(id);
    }
  }
  const model=$('#v26PlugyModel',host);
  if(model){
    model.removeAttribute('poster');
    model.style.setProperty('--poster-color','transparent');
    model.setAttribute('interaction-prompt','none');
    model.setAttribute('camera-controls','');
    model.setAttribute('disable-pan','');
    model.setAttribute('disable-zoom','');
  }
  if(host.classList.contains('v26-model-ready')){
    const fallback=$('.v24-fallback',host);if(fallback){fallback.style.display='none';fallback.style.opacity='0';fallback.style.visibility='hidden'}
  }
  return true;
}

function watchPlugy(){
  const stage=$('#v24PlugyHomeSlot');
  if(!stage||stage.dataset.v29watch==='1')return;
  stage.dataset.v29watch='1';
  let queued=false;
  const obs=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;cleanupPlugy()});
  });
  obs.observe(stage,{childList:true,subtree:true});
}

function enhanceIdentity(){
  const head=$('.v24-chat-head');
  if(head){
    const b=$('b',head);if(b)b.textContent='Parler avec PLUGY';
    const status=$('.v24-online',head);if(status)status.textContent='● Agent PLUG ART actif';
  }
  $$('.v24-chat-head').forEach(h=>{
    const b=$('b',h);if(b)b.textContent='Parler avec PLUGY';
    const s=$('.v24-online',h);if(s)s.textContent='● Agent PLUG ART actif';
  });
}

function boot(){
  let tries=0;
  const timer=setInterval(()=>{
    const ok=cleanupPlugy();
    if(ok){watchPlugy();enhanceIdentity();clearInterval(timer)}
    else if(++tries>100)clearInterval(timer);
  },100);
  cleanupPlugy();watchPlugy();enhanceIdentity();
  document.addEventListener('click',e=>{if(e.target.closest('[data-page]'))setTimeout(()=>{cleanupPlugy();enhanceIdentity()},90)});
  window.addEventListener('hashchange',()=>setTimeout(()=>{cleanupPlugy();enhanceIdentity()},90));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
