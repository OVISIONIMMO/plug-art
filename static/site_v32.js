(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const MODEL='/static/plugy_head_v26.glb?v=32.20260911.1';
const VIEWERS=['https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js','https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js'];
let host=null,model=null,lastPage='',scrollRaf=0,tipTimer=0,history=[];
try{history=JSON.parse(localStorage.getItem('plugy_v32_history')||'[]').slice(-10)}catch{history=[]}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const activePage=()=>$('.view.active')?.id||'explorer';
const saveHistory=()=>{try{localStorage.setItem('plugy_v32_history',JSON.stringify(history.slice(-10)))}catch{}};
function go(page){const b=$(`[data-page="${page}"]`);if(b)b.click();else location.hash=page;queueMicrotask(syncPage)}
async function ensureViewer(){
  if(customElements.get('model-viewer'))return true;
  for(const src of VIEWERS){
    try{
      await Promise.race([new Promise((ok,no)=>{const s=document.createElement('script');s.type='module';s.src=src;s.async=true;s.onload=ok;s.onerror=no;document.head.appendChild(s)}),sleep(3200).then(()=>{throw new Error('viewer-timeout')})]);
      for(let i=0;i<18&&!customElements.get('model-viewer');i++)await sleep(70);
      if(customElements.get('model-viewer'))return true;
    }catch{}
  }
  return false;
}
function chatMarkup(){return `<div class="v30-chat-head"><span class="v30-mini"></span><div><b>PLUGY</b><span>● Assistant personnel actif</span></div></div><div class="v30-msgs"><div class="v30-msg bot">Je reste avec toi partout sur PLUG ART. Je comprends la page ouverte, le Radar et tes dernières demandes.</div></div><div class="v30-quick"><button data-q="Quelle est ma meilleure prochaine action ?">Prochaine action</button><button data-q="Résume les priorités du Radar et dis-moi quoi vérifier en premier">Priorités Radar</button><button data-page="content">Créer un contenu</button></div><form class="v30-form"><input autocomplete="off" placeholder="Demande à PLUGY…"><button aria-label="Envoyer">➤</button></form>`}
function addMsg(text,who='bot',pending=false){const nodes=[];$$('.v30-msgs').forEach(box=>{const d=document.createElement('div');d.className=`v30-msg ${who}${pending?' p32-pending':''}`;d.textContent=String(text||'');box.appendChild(d);box.scrollTop=box.scrollHeight;nodes.push(d)});return nodes}
function settle(nodes,text,error=false){nodes.forEach(n=>{if(!n)return;n.textContent=String(text||'');n.classList.remove('p32-pending');n.classList.toggle('p32-error',!!error);n.parentElement&&(n.parentElement.scrollTop=n.parentElement.scrollHeight)})}
async function ask(q,mode='fast'){
  q=String(q||'').trim();if(!q)return;
  addMsg(q,'user');history.push({role:'user',content:q});saveHistory();
  const pending=addMsg('PLUGY réfléchit…','bot',true);host?.classList.add('p32-thinking');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
  try{
    const r=await fetch('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,page:activePage(),mode,history:history.slice(-8)}),cache:'no-store',signal:ctl.signal});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.detail||`Erreur ${r.status}`);
    const answer=String(d.answer||'').trim()||'Je n’ai pas reçu de réponse exploitable.';settle(pending,answer);history.push({role:'assistant',content:answer});saveHistory();
    if(d.suggestion)setTip(d.suggestion,9000);
  }catch(e){settle(pending,e?.name==='AbortError'?'Je mets trop de temps à répondre. Réessaie, je basculerai sur le mode rapide.':'Je rencontre un souci de connexion. Réessaie dans un instant.',true)}
  finally{clearTimeout(timer);host?.classList.remove('p32-thinking')}
}
window.ask=(q)=>ask(q,'fast');
function wire(root){
  root.addEventListener('click',e=>{const b=e.target.closest('[data-page],[data-q]');if(!b)return;if(b.dataset.page)go(b.dataset.page);if(b.dataset.q)ask(b.dataset.q)});
  $('.v30-form',root)?.addEventListener('submit',e=>{e.preventDefault();const i=$('input',e.currentTarget);const q=i?.value?.trim();if(!q)return;i.value='';ask(q)});
}
function buildHome(){
  const ex=$('#explorer');if(!ex)return;
  $('#v32Home')?.remove();
  const home=document.createElement('section');home.id='v32Home';home.className='v30-home';home.innerHTML=`<div class="v30-hero"><div class="v30-copy"><small>PLUG ART · assistant personnel</small><h1>PLUGY<span>Ton assistant <em>créatif IA</em></span></h1><p>PLUGY reste libre dans l’interface, suit ce que tu fais et t’aide à trouver les bonnes opportunités, créer du contenu et organiser les prochaines actions.</p><div class="v30-actions"><button class="primary" data-page="content">Créer avec PLUGY</button><button data-page="opencalls">Explorer le Radar</button></div></div><div class="v30-agent-space"></div><aside class="v30-chat">${chatMarkup()}</aside></div><div class="v30-tools"><button class="v30-tool" data-q="Analyse le Radar et sélectionne les opportunités les plus accessibles pour des artistes émergents"><strong>Radar intelligent</strong><span>Priorités, urgence et accessibilité.</span></button><button class="v30-tool" data-page="content"><strong>Studio</strong><span>Texte et visuels avec une interface épurée.</span></button><button class="v30-tool" data-q="Organise mes prochaines actions PLUG ART par ordre de priorité"><strong>Organisation</strong><span>Des prochaines étapes claires.</span></button><button class="v30-tool" data-q="Propose une stratégie de contenu PLUG ART pour cette semaine"><strong>Stratégie</strong><span>Angles, publications et CTA.</span></button></div>`;
  ex.prepend(home);wire(home);
}
function buildAgent(){
  document.documentElement.classList.add('plugy-v30','plugy-v32');document.body.classList.add('plugy30-home');
  $('#plugyFree30')?.remove();$('#plugyDrawer30')?.remove();
  host=document.createElement('div');host.id='plugyFree30';host.className='p32-agent';host.innerHTML=`<div class="v30-aura"></div><model-viewer id="plugyModel30" src="${MODEL}" alt="PLUGY, tête de prise 3D interactive" camera-controls auto-rotate auto-rotate-delay="1200" rotation-per-second="3deg" camera-orbit="0deg 78deg 3.0m" camera-target="0m .22m 0m" field-of-view="27deg" interaction-prompt="none" disable-pan disable-zoom shadow-intensity=".62" shadow-softness=".94" environment-image="neutral" exposure="1.2"></model-viewer><div class="v30-tip hide">Je suis là.</div><div class="v30-agent-chip"><i></i>PLUGY · actif</div>`;document.body.appendChild(host);model=$('#plugyModel30',host);
  const drawer=document.createElement('div');drawer.id='plugyDrawer30';drawer.innerHTML=`<aside class="v30-chat">${chatMarkup()}</aside>`;document.body.appendChild(drawer);wire(drawer);
  host.addEventListener('click',e=>{if(e.target.closest('model-viewer')){if(activePage()==='explorer')$('.v30-form input')?.focus();else document.body.classList.toggle('plugy30-drawer')}});
  host.addEventListener('pointerenter',()=>{host.classList.add('p32-engaged');try{model.timeScale=1.35;model.setAttribute('rotation-per-second','6deg')}catch{}});
  host.addEventListener('pointerleave',()=>{host.classList.remove('p32-engaged');try{model.timeScale=1;model.setAttribute('rotation-per-second','3deg');model.setAttribute('camera-orbit','0deg 78deg 3.0m')}catch{}});
  let raf=0;host.addEventListener('pointermove',e=>{if(!model||raf)return;const r=host.getBoundingClientRect(),x=(e.clientX-r.left)/Math.max(1,r.width)-.5,y=(e.clientY-r.top)/Math.max(1,r.height)-.5;raf=requestAnimationFrame(()=>{raf=0;model.setAttribute('camera-orbit',`${(x*20).toFixed(1)}deg ${(78+y*8).toFixed(1)}deg 3.0m`)})},{passive:true});
}
function setTip(text,duration=7000){const t=$('.v30-tip',host);if(!t||!text)return;clearTimeout(tipTimer);t.textContent=String(text);t.classList.remove('hide');tipTimer=setTimeout(()=>t.classList.add('hide'),duration)}
async function contextualTip(page){
  try{const r=await fetch(`/api/v32/assistant/context?page=${encodeURIComponent(page)}`,{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(d.suggestion)setTip(d.suggestion,8500)}catch{}
}
function syncPage(){
  if(!host)return;const page=activePage(),home=page==='explorer';document.body.classList.toggle('plugy30-home',home);document.body.classList.toggle('plugy30-away',!home);if(home)document.body.classList.remove('plugy30-drawer');
  const pos={opencalls:'54%',events:'48%',artists:'57%',mapview:'47%',resources:'53%',workspace:'49%',content:'56%',notes:'60%',contacts:'52%'};host.style.setProperty('--plugy30-top',pos[page]||'55%');
  if(page!==lastPage){lastPage=page;contextualTip(page)}
}
function onScroll(){if(scrollRaf)return;scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;if(!host||activePage()==='explorer')return;const y=Math.sin(window.scrollY/260)*7;host.style.setProperty('--p32-drift',`${y.toFixed(1)}px`)})}
async function boot(){
  buildHome();buildAgent();syncPage();
  const ok=await ensureViewer();if(ok){const play=()=>{try{const a=model.availableAnimations||[];if(a.includes('IdleBlink')){model.animationName='IdleBlink';model.setAttribute('autoplay','');model.play();model.timeScale=1}}catch{}};model.addEventListener('load',play,{once:true});play()}
  document.addEventListener('click',e=>{if(e.target.closest('[data-page]'))requestAnimationFrame(syncPage)});
  window.addEventListener('hashchange',syncPage,{passive:true});window.addEventListener('popstate',syncPage,{passive:true});window.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('visibilitychange',()=>{try{document.hidden?model?.pause():model?.play()}catch{}});
  const nav=$('.nav');if(nav)new MutationObserver(syncPage).observe(nav,{subtree:true,attributes:true,attributeFilter:['class','aria-current']});
  (window.requestIdleCallback||((fn)=>setTimeout(fn,180)))(()=>contextualTip(activePage()));
  console.info('[PLUG ART] V32 PLUGY libre/event-driven actif');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
