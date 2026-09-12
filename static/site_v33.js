(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const MODEL='/static/plugy_head_v33.glb?v=33.20260912.1';
const VIEWERS=['https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js','https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js'];
let host=null,model=null,lastPage='',tipTimer=0,history=[];
try{history=JSON.parse(localStorage.getItem('plugy_v33_history')||'[]').slice(-10)}catch{history=[]}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const activePage=()=>$('.view.active')?.id||'explorer';
const saveHistory=()=>{try{localStorage.setItem('plugy_v33_history',JSON.stringify(history.slice(-10)))}catch{}};
const go=page=>{const b=$(`[data-page="${page}"]`);if(b)b.click();else location.hash=page;requestAnimationFrame(syncPage)};

async function ensureViewer(){
  if(customElements.get('model-viewer'))return true;
  for(const src of VIEWERS){
    try{
      await Promise.race([new Promise((ok,no)=>{const s=document.createElement('script');s.type='module';s.src=src;s.async=true;s.onload=ok;s.onerror=no;document.head.appendChild(s)}),sleep(2800).then(()=>{throw new Error('viewer-timeout')})]);
      for(let i=0;i<16&&!customElements.get('model-viewer');i++)await sleep(70);
      if(customElements.get('model-viewer'))return true;
    }catch{}
  }
  return false;
}

function chatMarkup(compact=false){return `<div class="v33-chat-head"><span class="v33-mini"></span><div class="v33-chat-title"><b>PLUGY</b><span>Assistant personnel actif</span></div><span class="v33-chat-mode">MODE RAPIDE</span></div><div class="v33-msgs"><div class="v33-msg bot">Je suis ton copilote interne PLUG ART. Je peux prioriser le Radar, préparer les actions, structurer un projet et créer du contenu.</div></div><div class="v33-quick"><button data-q="Quelle est ma meilleure prochaine action aujourd'hui ?">Prochaine action</button><button data-q="Analyse les priorités du Radar et dis-moi quoi vérifier d'abord">Priorités Radar</button><button data-page="content">Créer</button></div><form class="v33-form"><textarea rows="1" autocomplete="off" placeholder="Demande à PLUGY…"></textarea><button aria-label="Envoyer">➤</button></form><div class="v33-chat-foot"><span>Réponse progressive</span><span>${compact?'Contexte de la page':'Radar + contexte actif'}</span></div>`}

function addMsg(text,who='bot',typing=false){
  const nodes=[];$$('.v33-msgs').forEach(box=>{const d=document.createElement('div');d.className=`v33-msg ${who}${typing?' typing':''}`;d.textContent=text||'';box.appendChild(d);box.scrollTop=box.scrollHeight;nodes.push(d)});return nodes
}

function typer(nodes){
  let queue='',done=false,timer=null,resolveDone=null;
  const finished=new Promise(r=>resolveDone=r);
  const pump=()=>{
    if(!queue.length){if(done){clearInterval(timer);timer=null;nodes.forEach(n=>n.classList.remove('typing'));resolveDone()}return}
    const take=queue.length>90?6:queue.length>40?4:2;const chunk=queue.slice(0,take);queue=queue.slice(take);
    nodes.forEach(n=>{n.textContent+=chunk;n.parentElement&&(n.parentElement.scrollTop=n.parentElement.scrollHeight)})
  };
  return {push:t=>{queue+=String(t||'');if(!timer)timer=setInterval(pump,12)},finish:()=>{done=true;if(!timer){nodes.forEach(n=>n.classList.remove('typing'));resolveDone()}return finished},fail:t=>{queue='';nodes.forEach(n=>{n.textContent=t;n.classList.remove('typing');n.classList.add('error')});done=true;if(timer){clearInterval(timer);timer=null}resolveDone()}}
}

function setAnim(name,returnMs=0){
  if(!model)return;try{const a=model.availableAnimations||[];if(!a.includes(name))return;model.pause?.();model.animationName=name;model.play?.();if(returnMs)setTimeout(()=>setAnim('IdleBlink'),returnMs)}catch{}
}

async function ask(q){
  q=String(q||'').trim();if(!q)return;
  addMsg(q,'user');history.push({role:'user',content:q});saveHistory();
  const nodes=addMsg('', 'bot', true), writer=typer(nodes);host?.classList.add('thinking');setAnim('Think');
  const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),36000);let answer='';
  try{
    const r=await fetch('/api/v33/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,page:activePage(),history:history.slice(-8)}),cache:'no-store',signal:ctl.signal});
    if(!r.ok)throw new Error(`Erreur ${r.status}`);
    const reader=r.body?.getReader();if(!reader)throw new Error('stream indisponible');
    const dec=new TextDecoder();let buf='';
    while(true){
      const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const line of lines){if(!line.trim())continue;let evt;try{evt=JSON.parse(line)}catch{continue}
        if(evt.type==='delta'&&evt.delta){answer+=evt.delta;writer.push(evt.delta)}
        if(evt.type==='done'&&evt.suggestion)setTip(evt.suggestion,7600);
      }
    }
    await writer.finish();if(!answer.trim())throw new Error('réponse vide');history.push({role:'assistant',content:answer.trim()});saveHistory();setAnim('React',1450);
  }catch(e){writer.fail(e?.name==='AbortError'?'La réponse prend trop de temps. Relance-moi : je garde le contexte.':'Je rencontre un souci de connexion. Réessaie dans un instant.');setAnim('Curious',2100)}
  finally{clearTimeout(timeout);host?.classList.remove('thinking')}
}
window.askPLUGY=ask;

function wire(root){
  root.addEventListener('click',e=>{const b=e.target.closest('[data-page],[data-q]');if(!b)return;if(b.dataset.page)go(b.dataset.page);if(b.dataset.q)ask(b.dataset.q)});
  $('.v33-form',root)?.addEventListener('submit',e=>{e.preventDefault();const i=$('textarea',e.currentTarget);const q=i?.value?.trim();if(!q)return;i.value='';ask(q)});
  const ta=$('textarea',root);if(ta){ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}});ta.addEventListener('input',e=>{e.currentTarget.style.height='42px';e.currentTarget.style.height=Math.min(104,e.currentTarget.scrollHeight)+'px'})}
}

function buildDashboard(){
  const ex=$('#explorer');if(!ex)return;$('#v33Home')?.remove();
  const home=document.createElement('section');home.id='v33Home';home.innerHTML=`<div class="v33-hero"><section class="v33-copy"><div class="v33-kicker">Tableau de bord interne</div><h1>PLUGY<span>Ton copilote <em>PLUG ART</em></span></h1><p>Une vue claire pour piloter les opportunités, les artistes, les lieux, les contenus et les prochaines actions sans quitter le même espace.</p><div class="v33-actions"><button class="primary" data-q="Donne-moi les 3 actions PLUG ART les plus importantes maintenant">Voir mes priorités</button><button data-page="opencalls">Ouvrir le Radar</button><button data-page="content">Créer un contenu</button></div></section><div class="v33-agent-space"></div><aside class="v33-chat">${chatMarkup()}</aside></div><section class="v33-overview"><div class="v33-overview-title"><small>Vue d'ensemble</small><strong>PLUG ART aujourd'hui</strong><span>Les informations utiles, sans le bruit.</span></div><div class="v33-metric ok"><b id="v33Opp">—</b><span><i></i>Opportunités actives</span></div><div class="v33-metric urgent"><b id="v33Urgent">—</b><span><i></i>Priorités fortes</span></div><div class="v33-metric"><b id="v33Artists">—</b><span><i></i>Artistes suivis</span></div><div class="v33-metric create"><b>Studio</b><span><i></i>Création prête</span></div></section><section class="v33-workgrid"><div class="v33-panel"><div class="v33-panel-head"><strong>Raccourcis opérationnels</strong><span>Actions fréquentes</span></div><div class="v33-shortcuts"><button class="v33-shortcut" data-q="Classe les opportunités par accessibilité pour artistes émergents"><b>Prioriser le Radar</b><span>Accessibilité, coût, urgence.</span></button><button class="v33-shortcut" data-page="content"><b>Préparer un carrousel</b><span>Texte, angle et visuel.</span></button><button class="v33-shortcut" data-q="Prépare un plan de relance pour les lieux potentiels PLUG ART"><b>Relancer les lieux</b><span>Contacts et prochaines étapes.</span></button><button class="v33-shortcut" data-q="Organise mes tâches PLUG ART de la semaine"><b>Planifier la semaine</b><span>Priorités et échéances.</span></button></div></div><div class="v33-panel"><div class="v33-panel-head"><strong>État du système</strong><span>Temps réel</span></div><div class="v33-feed"><div class="v33-feed-row"><i></i><div><b>PLUGY</b><span>Assistant contextuel</span></div><em>Actif</em></div><div class="v33-feed-row"><i></i><div><b>Radar</b><span>Opportunités et vérifications</span></div><em>Prêt</em></div><div class="v33-feed-row"><i></i><div><b>Studio</b><span>Texte + génération d'image</span></div><em>Prêt</em></div></div></div></section>`;
  ex.prepend(home);wire(home);
  const head=$('.head-actions');if(head&&!$('.v33-internal-pill',head)){const p=document.createElement('span');p.className='v33-internal-pill';p.textContent='Interne';head.prepend(p)}
}

function buildAgent(){
  document.documentElement.classList.add('plugy-v33');document.body.classList.add('plugy33-home');
  $('#plugyFree30')?.remove();$('#plugyDrawer30')?.remove();$('#plugyFree33')?.remove();$('#plugyDrawer33')?.remove();
  host=document.createElement('div');host.id='plugyFree33';host.innerHTML=`<div class="v33-aura"></div><model-viewer id="plugyModel33" src="${MODEL}" alt="PLUGY, assistant 3D PLUG ART" camera-controls camera-orbit="0deg 78deg 4.35m" camera-target="0m .18m 0m" field-of-view="34deg" interaction-prompt="none" disable-pan disable-zoom shadow-intensity=".46" shadow-softness=".95" environment-image="neutral" exposure=".92"></model-viewer><div class="v33-tip hide">Je reste disponible.</div><div class="v33-chip">PLUGY actif</div>`;document.body.appendChild(host);model=$('#plugyModel33',host);
  const drawer=document.createElement('div');drawer.id='plugyDrawer33';drawer.innerHTML=`<aside class="v33-chat">${chatMarkup(true)}</aside>`;document.body.appendChild(drawer);wire(drawer);
  host.addEventListener('click',e=>{if(!e.target.closest('model-viewer'))return;setAnim('React',1450);if(activePage()==='explorer')$('.v33-form textarea')?.focus();else document.body.classList.toggle('plugy33-drawer')});
  host.addEventListener('pointerenter',()=>{host.classList.add('engaged');setAnim('Curious',2100)});host.addEventListener('pointerleave',()=>host.classList.remove('engaged'));
  let raf=0;host.addEventListener('pointermove',e=>{if(!model||raf)return;const r=host.getBoundingClientRect(),x=(e.clientX-r.left)/Math.max(1,r.width)-.5,y=(e.clientY-r.top)/Math.max(1,r.height)-.5;raf=requestAnimationFrame(()=>{raf=0;model.setAttribute('camera-orbit',`${(x*12).toFixed(1)}deg ${(78+y*5).toFixed(1)}deg 4.35m`)})},{passive:true});
}

function setTip(text,duration=6500){const t=$('.v33-tip',host);if(!t||!text)return;clearTimeout(tipTimer);t.textContent=String(text);t.classList.remove('hide');setAnim('Curious',2100);tipTimer=setTimeout(()=>t.classList.add('hide'),duration)}

async function loadContext(page='explorer'){
  try{const r=await fetch(`/api/v32/assistant/context?page=${encodeURIComponent(page)}`,{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(d.suggestion&&page!=='explorer')setTip(d.suggestion,7000);
    if(page==='explorer'){
      const s=d.stats||{},top=d.top_opportunities||[];
      const pick=(...keys)=>{for(const k of keys){const v=s[k];if(Number.isFinite(Number(v)))return Number(v)}return null};
      const opp=pick('opportunities','open_opportunities','total_opportunities');const artists=pick('artists','artist_count','total_artists');const urgent=top.filter(x=>['urgente','très haute','haute','urgent','high'].includes(String(x.priority||'').toLowerCase())).length;
      const a=$('#v33Opp'),b=$('#v33Urgent'),c=$('#v33Artists');if(a)a.textContent=opp??top.length;if(b)b.textContent=urgent;if(c)c.textContent=artists??'—';
    }
  }catch{}
}

function syncPage(){
  if(!host)return;const page=activePage(),home=page==='explorer';document.body.classList.toggle('plugy33-home',home);document.body.classList.toggle('plugy33-away',!home);if(home)document.body.classList.remove('plugy33-drawer');
  const positions={opencalls:'52%',events:'48%',artists:'56%',mapview:'48%',resources:'52%',workspace:'48%',content:'55%',notes:'59%',contacts:'52%'};if(!home)host.style.top=positions[page]||'54%';
  if(page!==lastPage){lastPage=page;loadContext(page)}
}

async function boot(){
  buildDashboard();buildAgent();syncPage();loadContext('explorer');
  const ok=await ensureViewer();if(ok){const play=()=>setAnim('IdleBlink');model.addEventListener('load',play,{once:true});play()}
  document.addEventListener('click',e=>{if(e.target.closest('[data-page]'))requestAnimationFrame(syncPage)});window.addEventListener('hashchange',syncPage,{passive:true});window.addEventListener('popstate',syncPage,{passive:true});document.addEventListener('visibilitychange',()=>{try{document.hidden?model?.pause():setAnim('IdleBlink')}catch{}});
  const nav=$('.nav');if(nav)new MutationObserver(syncPage).observe(nav,{subtree:true,attributes:true,attributeFilter:['class','aria-current']});
  console.info('[PLUG ART] V33 dashboard interne + PLUGY stream actif');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
