(()=>{
 const GLB='/static/plugy.glb?v=54.20260917.1';
 let host=null,shell=null,mv=null,raf=0,tx=0,ty=0,cx=0,cy=0,idleTimer=0,lastAction=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

 const css=document.createElement('style');
 css.id='plugy-v54-immersive-css';
 css.textContent=`
 #plugyCompanion{position:relative!important;isolation:isolate!important}
 #plugyCompanion .plugy-v41-shell.plugy-v54-shell{
   inset:5% 5% 6% 5%!important;
   transform:translate3d(var(--v54-x,0px),calc(var(--v54-y,0px) + var(--plugy-bob,0px)),0) rotate(calc(var(--plugy-tilt,0deg) + var(--v54-rot,0deg))) scale(var(--v54-scale,.78))!important;
   transform-origin:50% 52%!important;
   transition:filter .22s ease!important;
   overflow:visible!important;
   filter:drop-shadow(0 24px 34px rgba(118,76,255,.14)) drop-shadow(0 0 24px rgba(255,92,190,.10))!important;
 }
 #plugyCompanion .plugy-v41-shell.plugy-v54-shell.plugy-hover{filter:drop-shadow(0 28px 38px rgba(118,76,255,.20)) drop-shadow(0 0 32px rgba(255,92,190,.18))!important}
 #plugyCompanion .plugy-v54-viewer{width:min(72%,440px)!important;height:88%!important;max-height:430px!important;background:transparent!important;--poster-color:transparent!important}
 #plugyCompanion .plugy-v41-halo{width:48%!important;background:radial-gradient(circle,rgba(255,112,205,.20),rgba(143,86,255,.14) 34%,rgba(74,214,255,.08) 53%,transparent 72%)!important;filter:blur(12px)!important;animation:v54halo 4.8s ease-in-out infinite!important}
 #plugyCompanion .plugy-v54-aura{position:absolute;inset:20% 19%;z-index:-2;border-radius:50%;pointer-events:none;background:conic-gradient(from 30deg,rgba(255,98,196,.16),rgba(134,81,255,.12),rgba(61,218,255,.09),rgba(255,98,196,.16));filter:blur(26px);animation:v54aura 8s linear infinite}
 #plugyCompanion .plugy-v41-badge{left:auto!important;right:12px!important;bottom:12px!important;padding:6px 9px!important;font-size:7px!important;letter-spacing:1px!important;background:rgba(255,255,255,.72)!important;border-color:rgba(195,177,240,.45)!important;color:#736b91!important}
 #plugyCompanion .plugy-v41-badge i{background:#ff6fc6!important;box-shadow:0 0 0 4px rgba(255,111,198,.12),0 0 14px rgba(126,79,255,.30)!important}
 #plugyCompanion[data-v54-state="thinking"] .plugy-v41-badge i{background:#a979ff!important}
 #plugyCompanion[data-v54-state="active"] .plugy-v41-badge i{background:#52dbff!important}
 @keyframes v54halo{50%{transform:scale(1.09);opacity:.82}}
 @keyframes v54aura{to{transform:rotate(360deg)}}
 @media(max-width:900px){#plugyCompanion .plugy-v41-shell.plugy-v54-shell{--v54-scale:.68!important;inset:8% 2%!important}#plugyCompanion .plugy-v54-viewer{width:min(68%,340px)!important;height:82%!important}}
 @media(max-width:620px){#plugyCompanion .plugy-v41-shell.plugy-v54-shell{--v54-scale:.60!important;inset:11% 0!important}#plugyCompanion .plugy-v54-viewer{width:min(64%,270px)!important;height:78%!important}.plugy-v41-badge{display:none!important}}
 @media(prefers-reduced-motion:reduce){#plugyCompanion .plugy-v54-aura{animation:none!important}#plugyCompanion .plugy-v41-shell.plugy-v54-shell{transform:scale(.72)!important}}
 `;
 document.head.appendChild(css);

 function play(name,once=true){
   if(!mv)return;
   const list=mv.availableAnimations||[];
   if(!list.includes(name))return;
   try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});lastAction=performance.now();if(once)setTimeout(()=>{if(host&&!host.classList.contains('thinking'))play('Idle',false)},name==='Think'?1500:1050)}catch{}
 }

 function contextGesture(){
   const s=((location.hash||'')+' '+(document.querySelector('.view.active')?.id||'')).toLowerCase();
   if(s.includes('radar')||s.includes('opportun'))return 'Curious';
   if(s.includes('content')||s.includes('studio'))return 'Attentive';
   if(s.includes('note'))return 'Think';
   if(s.includes('artist'))return 'Happy';
   return 'Present';
 }

 function loop(t){
   if(!shell||document.hidden){raf=0;return}
   cx+=(tx-cx)*.055;cy+=(ty-cy)*.055;
   const drift=reduced?0:Math.sin(t/2100)*3.2;
   shell.style.setProperty('--v54-x',`${cx+drift}px`);
   shell.style.setProperty('--v54-y',`${cy+Math.sin(t/1450)*2.4}px`);
   shell.style.setProperty('--v54-rot',`${reduced?0:Math.sin(t/2500)*.7}deg`);
   raf=requestAnimationFrame(loop);
 }
 function wake(){if(!raf)raf=requestAnimationFrame(loop)}

 function bind(){
   if(!host||!shell)return;
   document.addEventListener('pointermove',e=>{
     const r=host.getBoundingClientRect();
     const dx=(e.clientX-(r.left+r.width/2))/Math.max(1,r.width);
     const dy=(e.clientY-(r.top+r.height/2))/Math.max(1,r.height);
     tx=Math.max(-16,Math.min(16,dx*22));
     ty=Math.max(-10,Math.min(10,dy*14));
     wake();
   },{passive:true});
   shell.addEventListener('pointerenter',()=>{shell.classList.add('plugy-hover');host.dataset.v54State='active';play('Curious')});
   shell.addEventListener('pointerleave',()=>{shell.classList.remove('plugy-hover');host.dataset.v54State='idle'});
   shell.addEventListener('click',()=>{
     play('Happy');
     host.dataset.v54State='active';
     const input=host.querySelector('input,textarea');
     if(input){input.focus({preventScroll:true});setTimeout(()=>input.scrollIntoView({behavior:'smooth',block:'center'}),60)}
   });
   window.addEventListener('hashchange',()=>play(contextGesture()));
   document.addEventListener('click',e=>{
     if(e.target.closest('.nav button'))setTimeout(()=>play(contextGesture()),80);
     else if(e.target.closest('.primary,.soft,.chip,.plug-v20-card,.plug-v20-chip'))play('Bounce');
   },{passive:true});
   const obs=new MutationObserver(()=>{
     const thinking=host.classList.contains('thinking');
     host.dataset.v54State=thinking?'thinking':'idle';
     if(thinking)play('Think',false);else if(performance.now()-lastAction>500)play('Idle',false);
   });
   obs.observe(host,{attributes:true,attributeFilter:['class']});
   window.addEventListener('scroll',()=>{
     const r=host.getBoundingClientRect();
     const center=r.top+r.height/2-window.innerHeight/2;
     ty=Math.max(-8,Math.min(8,-center*.018));
   },{passive:true});
   clearTimeout(idleTimer);
   const schedule=()=>{idleTimer=setTimeout(()=>{if(!document.hidden&&!host.classList.contains('thinking'))play(['Curious','Present','Happy','Attentive'][Math.floor(Math.random()*4)]);schedule()},9000+Math.random()*7000)};
   schedule();wake();
 }

 function apply(){
   host=document.getElementById('plugyCompanion');
   if(!host)return false;
   shell=host.querySelector('.plugy-v41-shell,.plugy-glb-shell');
   mv=host.querySelector('model-viewer');
   if(!shell||!mv)return false;
   host.dataset.renderer='glb-v54-immersive';host.dataset.plugyVersion='54';host.dataset.body='none';host.dataset.v54State='idle';
   shell.classList.add('plugy-v54-shell');mv.classList.add('plugy-v54-viewer');
   if(mv.getAttribute('src')!==GLB)mv.setAttribute('src',GLB);
   mv.setAttribute('camera-orbit','0deg 76deg 3.25m');
   mv.setAttribute('camera-target','0m .73m 0m');
   mv.setAttribute('field-of-view','27deg');
   mv.setAttribute('shadow-intensity','.20');mv.setAttribute('shadow-softness','1');mv.setAttribute('exposure','1.06');
   mv.setAttribute('aria-label','PLUGY V54, tête-prise 3D immersive rose et violette de PLUG ART');
   if(!shell.querySelector('.plugy-v54-aura')){const a=document.createElement('div');a.className='plugy-v54-aura';shell.prepend(a)}
   host.querySelectorAll('.plugy-v41-badge span').forEach(x=>x.textContent='PLUGY · ACTIF');
   if(!shell.dataset.v54Bound){shell.dataset.v54Bound='1';bind()}
   mv.addEventListener('load',()=>{play('Idle',false);wake()},{once:true});
   return true;
 }

 let tries=0;const timer=setInterval(()=>{if(apply()||++tries>160)clearInterval(timer)},90);
 const mo=new MutationObserver(()=>apply());mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 window.addEventListener('pageshow',apply);document.addEventListener('visibilitychange',()=>{if(!document.hidden){apply();wake()}});
})();