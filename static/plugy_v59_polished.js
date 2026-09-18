(()=>{
 const GLB='/static/PLUGY_final_animated.glb?v=59.20260918.3';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let stage=null,mv=null,raf=0,yaw=-11,pitch=76,targetYaw=-11,targetPitch=76,dx=0,dy=0,tx=0,ty=0,lastAction=0,idleTimer=0;

 function ensureModelViewer(){return new Promise((resolve,reject)=>{
  if(customElements.get('model-viewer'))return resolve();
  const existing=[...document.scripts].find(s=>(s.src||'').includes('model-viewer'));
  if(existing){let n=0;const t=setInterval(()=>{if(customElements.get('model-viewer')){clearInterval(t);resolve()}else if(++n>50){clearInterval(t);reject(new Error('model-viewer timeout'))}},100);return}
  const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)
 })}

 const css=document.createElement('style');
 css.id='plugy-v59-polished-css';
 css.textContent=`
 #plugyEmergencyMount,#plugyDockV55,#plugyIntegratedV56,#plugyIntegratedV57,#plugyStageV58,#plugyV40Model{display:none!important}
 #plugyCompanion .plugy-v41-shell,#plugyCompanion .plugy-glb-shell,#plugyCompanion model-viewer{display:none!important}
 #explorer{overflow:visible}
 #explorer .hero{position:relative;overflow:hidden;border-radius:34px;padding:34px 32px;background:
   radial-gradient(circle at 80% 28%,rgba(115,220,255,.18),transparent 28%),
   radial-gradient(circle at 92% 62%,rgba(255,111,205,.15),transparent 31%),
   radial-gradient(circle at 57% 78%,rgba(130,93,255,.12),transparent 34%),
   linear-gradient(135deg,rgba(255,255,255,.88),rgba(240,247,255,.76) 52%,rgba(249,242,255,.82));
   border:1px solid rgba(110,126,177,.12);box-shadow:0 26px 70px rgba(67,76,133,.09)}
 #plugyStageV59{position:relative;min-height:500px;display:grid!important;place-items:center;isolation:isolate;overflow:visible;cursor:pointer;outline:none;z-index:5}
 #plugyStageV59 .v59-visual{position:relative;width:min(100%,540px);height:500px;display:grid;place-items:center}
 #plugyStageV59 .v59-poster,#plugyStageV59 model-viewer{position:absolute;inset:0;width:100%;height:100%;background:transparent!important;--poster-color:transparent!important;transition:opacity .3s ease,filter .22s ease,transform .22s ease}
 #plugyStageV59 .v59-poster{display:grid;place-items:center;z-index:2;opacity:1;pointer-events:none}
 #plugyStageV59 .v59-poster svg{width:88%;height:88%;overflow:visible}
 #plugyStageV59 model-viewer{z-index:3;opacity:0;pointer-events:none;transform:rotate(-5deg);filter:drop-shadow(0 28px 36px rgba(69,78,169,.17)) drop-shadow(-12px 12px 26px rgba(65,221,246,.13)) drop-shadow(12px 12px 28px rgba(227,85,216,.13))}
 #plugyStageV59.is-3d-ready .v59-poster{opacity:0}
 #plugyStageV59.is-3d-ready model-viewer{opacity:1}
 #plugyStageV59:hover model-viewer,#plugyStageV59:hover .v59-poster{transform:rotate(-5deg) scale(1.018)}
 #plugyStageV59 .v59-aura{position:absolute;width:78%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,transparent 0 36%,rgba(84,224,255,.12) 48%,rgba(138,89,255,.10) 60%,rgba(255,105,205,.10) 69%,transparent 78%);filter:blur(10px);z-index:0;animation:v59Aura 6s ease-in-out infinite}
 #plugyStageV59 .v59-orbit{position:absolute;width:78%;height:31%;border:1px solid rgba(121,100,255,.18);border-radius:50%;transform:rotate(-11deg);z-index:1;box-shadow:0 0 26px rgba(255,111,203,.10)}
 #plugyStageV59 .v59-orbit:after{content:'';position:absolute;right:7%;top:9%;width:7px;height:7px;border-radius:50%;background:#ff79cd;box-shadow:0 0 14px #ff79cd,0 0 22px #63e7ff}
 #plugyStageV59 .v59-floor{position:absolute;left:24%;right:24%;bottom:11%;height:32px;border-radius:50%;background:radial-gradient(ellipse,rgba(88,221,255,.25),rgba(126,80,255,.17) 45%,rgba(255,104,205,.12) 62%,transparent 78%);filter:blur(10px);z-index:1}
 @keyframes v59Aura{50%{transform:scale(1.07);opacity:.82}}

 @media(min-width:1181px){
   #explorer .hero{grid-template-columns:minmax(360px,.92fr) minmax(390px,1.06fr) minmax(280px,.72fr)!important;gap:24px!important;align-items:center!important}
 }
 @media(max-width:1180px){
   #explorer .hero{grid-template-columns:minmax(320px,1fr) minmax(340px,.95fr)!important;gap:20px!important}
   #explorer .hero>.plugy-panel{display:none!important}
   #plugyStageV59{min-height:450px}
   #plugyStageV59 .v59-visual{height:440px;max-width:470px}
 }
 @media(max-width:760px){
   body{overflow-x:hidden}
   .shell{padding:0 10px 34px!important}
   .header{height:72px!important;display:flex!important;align-items:center!important;gap:10px!important;margin:10px 0 16px!important;padding:0 14px!important;border:1px solid rgba(86,103,157,.13)!important;border-radius:24px!important;background:rgba(255,255,255,.86)!important;box-shadow:0 14px 38px rgba(68,76,132,.08)!important;backdrop-filter:blur(20px)!important;top:8px!important}
   .header .nav{display:none!important}
   .header .brand{align-items:center!important;gap:8px!important}
   .header .brand-main{font-size:22px!important;letter-spacing:-1px!important;white-space:nowrap}
   .header .brand-sub{display:none!important}
   .header .brand-orb{width:19px!important;height:19px!important;flex:0 0 auto}
   .header .head-actions{margin-left:auto!important}
   .header .head-actions>.brand-orb{display:none!important}
   .header .space-btn{padding:10px 13px!important;font-size:10px!important;white-space:nowrap!important}

   #explorer .hero{display:grid!important;grid-template-columns:minmax(0,1fr) 42%!important;grid-auto-rows:auto!important;gap:0 6px!important;min-height:auto!important;padding:24px 15px 26px!important;border-radius:29px!important}
   #explorer .hero-copy{display:contents!important}
   #explorer .eyebrow{grid-column:1/-1!important;grid-row:1!important;margin:0 0 14px!important;font-size:9px!important;line-height:1.55!important;letter-spacing:3.2px!important}
   #explorer .hero-title{grid-column:1/2!important;grid-row:2!important;font-size:50px!important;line-height:.90!important;letter-spacing:-3px!important;margin:0!important;align-self:center!important}
   #explorer .hero-title span{font-size:28px!important;line-height:1.02!important;letter-spacing:-1.6px!important;margin-top:12px!important}
   #plugyStageV59{grid-column:2/3!important;grid-row:2!important;min-height:230px!important;height:230px!important;align-self:center!important;margin-right:-10px!important}
   #plugyStageV59 .v59-visual{width:100%!important;height:230px!important}
   #plugyStageV59 .v59-poster svg{width:112%!important;height:112%!important}
   #plugyStageV59 .v59-orbit{width:108%!important;height:38%!important}
   #plugyStageV59 .v59-aura{width:118%!important}
   #plugyStageV59 .v59-floor{left:8%!important;right:8%!important;bottom:4%!important}
   #explorer .hero-copy>p{grid-column:1/-1!important;grid-row:3!important;margin:22px 0 18px!important;max-width:none!important;font-size:14px!important;line-height:1.55!important;color:#697698!important}
   #explorer .actions{grid-column:1/-1!important;grid-row:4!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:9px!important;width:100%!important}
   #explorer .actions .primary{grid-column:1/-1!important;background:linear-gradient(135deg,#315bff,#7a50ff)!important;box-shadow:0 12px 30px rgba(82,77,237,.20)!important}
   #explorer .actions button{width:100%!important;min-height:48px!important;padding:12px 13px!important;font-size:11px!important}
   #explorer .hero>.plugy-panel{display:none!important}
   .stats{margin-top:18px!important}
   .float-chat{z-index:320!important}
 }
 @media(max-width:430px){
   #explorer .hero{grid-template-columns:minmax(0,1fr) 44%!important;padding:22px 13px 24px!important}
   #explorer .hero-title{font-size:45px!important;letter-spacing:-2.6px!important}
   #explorer .hero-title span{font-size:25px!important}
   #plugyStageV59,#plugyStageV59 .v59-visual{height:210px!important;min-height:210px!important}
 }
 @media(prefers-reduced-motion:reduce){#plugyStageV59 .v59-aura{animation:none!important}}
 `;
 document.head.appendChild(css);

 const poster=`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <defs>
  <linearGradient id="v59edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#58eaff"/><stop offset=".48" stop-color="#7d69ff"/><stop offset=".78" stop-color="#f56bd0"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  <linearGradient id="v59face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".68" stop-color="#fbfbff"/><stop offset="1" stop-color="#f1eafa"/></linearGradient>
  <filter id="v59glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 </defs>
 <ellipse cx="255" cy="337" rx="118" ry="17" fill="#796bff" opacity=".12" filter="url(#v59glow)"/>
 <ellipse cx="255" cy="220" rx="188" ry="88" fill="none" stroke="url(#v59edge)" stroke-width="3" opacity=".42" transform="rotate(-9 255 220)"/>
 <g transform="rotate(-8 250 215)">
  <rect x="126" y="118" width="270" height="190" rx="72" fill="url(#v59edge)" opacity=".58" filter="url(#v59glow)"/>
  <rect x="113" y="105" width="270" height="190" rx="72" fill="url(#v59face)"/>
  <rect x="165" y="45" width="43" height="98" rx="22" fill="url(#v59face)"/>
  <rect x="290" y="45" width="43" height="98" rx="22" fill="url(#v59face)"/>
  <path d="M168 205 Q191 177 214 205" fill="none" stroke="#10236f" stroke-width="14" stroke-linecap="round"/>
  <path d="M282 205 Q305 177 328 205" fill="none" stroke="#10236f" stroke-width="14" stroke-linecap="round"/>
  <path d="M121 252 Q144 277 175 291" fill="none" stroke="#5ce8ff" stroke-width="6" stroke-linecap="round" opacity=".82" filter="url(#v59glow)"/>
  <path d="M320 289 Q355 282 379 257" fill="none" stroke="#ef6bd2" stroke-width="6" stroke-linecap="round" opacity=".82" filter="url(#v59glow)"/>
 </g></svg>`;

 function cleanup(){
  ['plugyEmergencyMount','plugyDockV55','plugyIntegratedV56','plugyIntegratedV57','plugyStageV58'].forEach(id=>document.getElementById(id)?.remove());
  document.querySelectorAll('model-viewer').forEach(m=>{if(m===mv)return;const src=(m.getAttribute('src')||'').toLowerCase();if(src.includes('plugy'))m.style.display='none'});
  const old=document.querySelector('#explorer .plugy-stage');if(old)old.style.display='none'
 }
 function play(name,once=true){
  if(!mv||!stage?.classList.contains('is-3d-ready'))return;
  const a=mv.availableAnimations||[];if(!a.includes(name))return;
  try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});lastAction=performance.now();
    if(once)setTimeout(()=>{if(stage&&stage.dataset.state!=='thinking')play('Idle',false)},name==='Blink'?430:name==='Think'?1450:1050)
  }catch{}
 }
 function loop(t){
  if(!stage||!mv||document.hidden||!stage.classList.contains('is-3d-ready')){raf=0;return}
  yaw+=(targetYaw-yaw)*.06;pitch+=(targetPitch-pitch)*.06;dx+=(tx-dx)*.05;dy+=(ty-dy)*.05;
  const drift=reduced?0:Math.sin(t/2350)*.8;
  mv.setAttribute('camera-orbit',`${yaw+drift}deg ${pitch}deg 4.45m`);
  stage.style.setProperty('--plugy-shift-x',`${dx}px`);
  stage.style.setProperty('--plugy-shift-y',`${dy+(reduced?0:Math.sin(t/1750)*1.8)}px`);
  stage.querySelector('.v59-visual').style.transform=`translate3d(var(--plugy-shift-x),var(--plugy-shift-y),0)`;
  raf=requestAnimationFrame(loop)
 }
 function wake(){if(!raf)raf=requestAnimationFrame(loop)}
 function openAssistant(){
  play('Happy');stage.dataset.state='active';
  const floating=document.querySelector('.float-chat');if(floating){floating.classList.add('open');const input=floating.querySelector('input,textarea');setTimeout(()=>input?.focus(),180)}
  else document.querySelector('.plugy-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>{if(stage)stage.dataset.state='idle'},1200)
 }
 function bind(){
  stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/Math.max(1,r.width);const y=(e.clientY-r.top-r.height/2)/Math.max(1,r.height);targetYaw=-11+Math.max(-7,Math.min(7,x*11));targetPitch=76+Math.max(-3,Math.min(3,y*5));tx=Math.max(-6,Math.min(6,x*7));ty=Math.max(-4,Math.min(4,y*4));wake()},{passive:true});
  stage.addEventListener('pointerleave',()=>{targetYaw=-11;targetPitch=76;tx=0;ty=0;play('Curious')});
  stage.addEventListener('click',openAssistant);
  window.addEventListener('hashchange',()=>{const h=(location.hash||'').toLowerCase();play(h.includes('artist')?'Happy':h.includes('content')?'Attentive':'Present')});
  const host=document.getElementById('plugyCompanion');if(host)new MutationObserver(()=>{const thinking=host.classList.contains('thinking');stage.dataset.state=thinking?'thinking':'idle';if(thinking)play('Think',false);else if(performance.now()-lastAction>400)play('Idle',false)}).observe(host,{attributes:true,attributeFilter:['class']});
  const schedule=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!document.hidden)play(['SoftTurn','Blink','Curious','Happy','Attentive'][Math.floor(Math.random()*5)]);schedule()},8000+Math.random()*5500)};schedule()
 }
 async function mount(){
  cleanup();
  if(document.getElementById('plugyStageV59')){stage=document.getElementById('plugyStageV59');return true}
  const hero=document.querySelector('#explorer .hero');if(!hero)return false;
  stage=document.createElement('div');stage.id='plugyStageV59';stage.tabIndex=0;stage.dataset.state='idle';stage.setAttribute('aria-label','PLUGY, assistant créatif PLUG ART');
  stage.innerHTML=`<div class="v59-aura"></div><div class="v59-orbit"></div><div class="v59-floor"></div><div class="v59-visual"><div class="v59-poster">${poster}</div><model-viewer id="plugyModelV59" src="${GLB}" camera-orbit="-11deg 76deg 4.45m" camera-target="0m 1.03m -0.08m" field-of-view="30deg" interaction-prompt="none" disable-zoom shadow-intensity=".08" shadow-softness="1" exposure="1.1" environment-image="neutral" loading="eager" reveal="auto" animation-crossfade-duration="250" aria-label="PLUGY, mascotte 3D officielle"></model-viewer></div>`;
  const panel=hero.querySelector('.plugy-panel');hero.insertBefore(stage,panel||null);
  mv=stage.querySelector('model-viewer');bind();
  try{await ensureModelViewer();await customElements.whenDefined('model-viewer')}catch{}
  const ready=()=>{stage.classList.add('is-3d-ready');play('Idle',false);wake()};
  mv.addEventListener('load',ready,{once:true});mv.addEventListener('error',()=>stage.classList.remove('is-3d-ready'));if(mv.loaded)ready();
  return true
 }
 let tries=0;const t=setInterval(async()=>{if(await mount()||++tries>100)clearInterval(t)},100);
 window.addEventListener('pageshow',mount);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){mount();wake()}else if(raf){cancelAnimationFrame(raf);raf=0}})
})();