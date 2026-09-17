(()=>{
 const GLB='/static/plugy.glb?v=56.20260917.1';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let stage=null,mv=null,raf=0,targetYaw=0,targetPitch=76,yaw=0,pitch=76,px=0,py=0,tx=0,ty=0,idleTimer=0,lastAction=0;

 function ensureModelViewer(){return new Promise((resolve,reject)=>{if(customElements.get('model-viewer'))return resolve();const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}

 const css=document.createElement('style');
 css.id='plugy-v56-integrated-css';
 css.textContent=`
 #plugyDockV55{display:none!important}
 #plugyCompanion .plugy-v41-shell,#plugyCompanion .plugy-glb-shell,#plugyCompanion model-viewer{display:none!important}
 .hero{grid-template-columns:minmax(330px,.92fr) minmax(330px,1.02fr) minmax(270px,.72fr)!important;gap:18px!important;align-items:center!important}
 #plugyIntegratedV56{position:relative;min-height:520px;display:grid;place-items:center;isolation:isolate;overflow:visible;cursor:pointer;outline:none;user-select:none;-webkit-user-select:none}
 #plugyIntegratedV56 model-viewer{width:min(100%,520px);height:500px;background:transparent!important;--poster-color:transparent!important;z-index:3;pointer-events:none;filter:drop-shadow(0 30px 38px rgba(90,72,190,.18)) drop-shadow(0 0 28px rgba(255,92,201,.12));transition:filter .22s ease}
 #plugyIntegratedV56:hover model-viewer,#plugyIntegratedV56:focus-visible model-viewer{filter:drop-shadow(0 34px 44px rgba(92,70,200,.23)) drop-shadow(0 0 38px rgba(255,92,201,.20))}
 #plugyIntegratedV56 .v56-floor{position:absolute;z-index:1;left:23%;right:23%;bottom:14%;height:34px;border-radius:50%;background:radial-gradient(ellipse,rgba(71,209,255,.27),rgba(130,76,255,.20) 37%,rgba(255,98,201,.14) 56%,transparent 75%);filter:blur(10px);transform:scaleX(1.15);pointer-events:none}
 #plugyIntegratedV56 .v56-aura{position:absolute;z-index:0;width:76%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.02) 0 30%,rgba(99,217,255,.12) 43%,rgba(135,80,255,.10) 55%,rgba(255,95,201,.10) 63%,transparent 74%);filter:blur(8px);animation:v56Aura 5.8s ease-in-out infinite;pointer-events:none}
 #plugyIntegratedV56 .v56-orbit{position:absolute;z-index:2;width:72%;height:28%;border-radius:50%;border:1px solid rgba(116,91,255,.20);box-shadow:0 0 24px rgba(255,102,207,.10);transform:rotate(-9deg);opacity:.72;pointer-events:none;animation:v56Orbit 12s linear infinite}
 #plugyIntegratedV56 .v56-orbit:after{content:"";position:absolute;width:8px;height:8px;border-radius:50%;right:9%;top:12%;background:#ff74c9;box-shadow:0 0 15px #ff74c9,0 0 25px #5de0ff}
 #plugyIntegratedV56 .v56-particle{position:absolute;z-index:2;width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#66e5ff,#ad72ff,#ff79ca);box-shadow:0 0 16px rgba(135,87,255,.32);pointer-events:none;animation:v56Float var(--d,6s) ease-in-out infinite;animation-delay:var(--delay,0s)}
 #plugyIntegratedV56 .v56-p1{left:18%;top:28%;--d:5.4s;--delay:-1.4s}.v56-p2{right:15%;top:34%;--d:6.8s;--delay:-2.1s}.v56-p3{left:24%;bottom:24%;--d:7.2s;--delay:-3s}.v56-p4{right:22%;bottom:20%;--d:5.9s;--delay:-.8s}
 #plugyIntegratedV56 .v56-status{position:absolute;z-index:4;bottom:7%;left:50%;transform:translateX(-50%);font:700 8px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:1.35px;text-transform:uppercase;color:#7b7394;white-space:nowrap;opacity:.74}
 #plugyIntegratedV56 .v56-status:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:7px;background:#ff72c8;box-shadow:0 0 0 4px rgba(255,114,200,.10),0 0 12px rgba(122,78,255,.28);vertical-align:1px}
 #plugyIntegratedV56[data-state="thinking"] .v56-status:before{background:#a878ff}#plugyIntegratedV56[data-state="active"] .v56-status:before{background:#59ddff}
 @keyframes v56Aura{50%{transform:scale(1.08);opacity:.80}}
 @keyframes v56Orbit{to{transform:rotate(351deg)}}
 @keyframes v56Float{0%,100%{transform:translate(0,0) scale(.8);opacity:.42}50%{transform:translate(5px,-13px) scale(1.2);opacity:.92}}
 @media(max-width:1180px){.hero{grid-template-columns:minmax(320px,1fr) minmax(300px,.86fr)!important}.hero>.plugy-panel{grid-column:1/-1!important}#plugyIntegratedV56{min-height:460px}#plugyIntegratedV56 model-viewer{height:440px;max-width:470px}}
 @media(max-width:900px){.hero{grid-template-columns:1fr!important}#plugyIntegratedV56{min-height:390px;order:2}#plugyIntegratedV56 model-viewer{height:380px;width:min(92%,410px)}.hero>.plugy-panel{order:3!important;grid-column:auto!important}}
 @media(max-width:620px){#plugyIntegratedV56{min-height:310px}#plugyIntegratedV56 model-viewer{height:300px;width:min(92%,330px)}#plugyIntegratedV56 .v56-status{bottom:3%;font-size:7px}.v56-orbit{width:82%!important}.v56-aura{width:88%!important}}
 @media(prefers-reduced-motion:reduce){#plugyIntegratedV56 .v56-aura,#plugyIntegratedV56 .v56-orbit,#plugyIntegratedV56 .v56-particle{animation:none!important}}
 `;
 document.head.appendChild(css);

 function removeDuplicates(){
   const dock=document.getElementById('plugyDockV55');if(dock)dock.remove();
   document.querySelectorAll('model-viewer').forEach(m=>{if(m===mv)return;const src=m.getAttribute('src')||'';if(src.includes('plugy'))m.style.display='none'});
   const old=document.querySelector('.hero .plugy-stage');if(old)old.style.display='none';
 }
 function play(name,once=true){if(!mv)return;const a=mv.availableAnimations||[];if(!a.includes(name))return;try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});lastAction=performance.now();if(once)setTimeout(()=>{if(stage&&stage.dataset.state!=='thinking')play('Idle',false)},name==='Think'?1450:1050)}catch{}}
 function contextGesture(){const s=((location.hash||'')+' '+(document.querySelector('.view.active')?.id||'')).toLowerCase();if(s.includes('radar')||s.includes('opportun'))return 'Curious';if(s.includes('content')||s.includes('studio'))return 'Attentive';if(s.includes('note'))return 'Think';if(s.includes('artist'))return 'Happy';return 'Present'}
 function loop(t){if(!stage||!mv||document.hidden){raf=0;return}yaw+=(targetYaw-yaw)*.06;pitch+=(targetPitch-pitch)*.06;px+=(tx-px)*.05;py+=(ty-py)*.05;const drift=reduced?0:Math.sin(t/2200)*1.2;mv.setAttribute('camera-orbit',`${yaw+drift}deg ${pitch}deg 3.25m`);stage.style.transform=`translate3d(${px}px,${py+Math.sin(t/1700)*2.2}px,0)`;raf=requestAnimationFrame(loop)}
 function wake(){if(!raf)raf=requestAnimationFrame(loop)}
 function focusAssistant(){const input=document.querySelector('.chat-form input,.chat-form textarea,.plugy-panel input,.plugy-panel textarea');const panel=input?.closest('.plugy-panel')||document.querySelector('.plugy-panel');play('Happy');stage.dataset.state='active';if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'});if(input)setTimeout(()=>{try{input.focus({preventScroll:true})}catch{}},220);setTimeout(()=>{if(stage)stage.dataset.state='idle'},1400)}
 function bind(){
   stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const dx=(e.clientX-(r.left+r.width/2))/Math.max(1,r.width);const dy=(e.clientY-(r.top+r.height/2))/Math.max(1,r.height);targetYaw=Math.max(-9,Math.min(9,dx*13));targetPitch=76+Math.max(-4,Math.min(4,dy*6));tx=Math.max(-8,Math.min(8,dx*8));ty=Math.max(-5,Math.min(5,dy*5));stage.dataset.state='active';wake()},{passive:true});
   stage.addEventListener('pointerleave',()=>{targetYaw=0;targetPitch=76;tx=0;ty=0;stage.dataset.state='idle';play('Curious')});
   stage.addEventListener('click',focusAssistant);stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusAssistant()}});
   window.addEventListener('hashchange',()=>play(contextGesture()));
   document.addEventListener('click',e=>{if(e.target.closest('.nav button'))setTimeout(()=>play(contextGesture()),90);else if(e.target.closest('.primary,.soft,.chip,.plug-v20-card,.plug-v20-chip'))play('Bounce')},{passive:true});
   let st=0;window.addEventListener('scroll',()=>{clearTimeout(st);st=setTimeout(()=>{if(!document.hidden)play('Attentive')},140)},{passive:true});
   const host=document.getElementById('plugyCompanion');if(host){const obs=new MutationObserver(()=>{const thinking=host.classList.contains('thinking');stage.dataset.state=thinking?'thinking':'idle';if(thinking)play('Think',false);else if(performance.now()-lastAction>450)play('Idle',false)});obs.observe(host,{attributes:true,attributeFilter:['class']})}
   const schedule=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!document.hidden&&stage.dataset.state!=='thinking')play(['Curious','Present','Happy','Attentive'][Math.floor(Math.random()*4)]);schedule()},9000+Math.random()*6500)};schedule();
 }
 async function mount(){
   if(document.getElementById('plugyIntegratedV56')){removeDuplicates();return true}
   const hero=document.querySelector('.hero');if(!hero)return false;
   try{await ensureModelViewer()}catch{return false}
   stage=document.createElement('div');stage.id='plugyIntegratedV56';stage.tabIndex=0;stage.setAttribute('role','button');stage.setAttribute('aria-label','PLUGY, assistant créatif PLUG ART');stage.dataset.state='idle';
   stage.innerHTML='<div class="v56-aura"></div><div class="v56-orbit"></div><i class="v56-particle v56-p1"></i><i class="v56-particle v56-p2"></i><i class="v56-particle v56-p3"></i><i class="v56-particle v56-p4"></i><div class="v56-floor"></div><model-viewer id="plugyModelV56" src="'+GLB+'" camera-orbit="0deg 76deg 3.25m" camera-target="0m .73m 0m" field-of-view="27deg" interaction-prompt="none" disable-zoom shadow-intensity=".16" shadow-softness="1" exposure="1.08" environment-image="neutral" loading="eager" reveal="auto" aria-label="PLUGY, mascotte 3D officielle de PLUG ART"></model-viewer><div class="v56-status">PLUGY actif</div>';
   const panel=hero.querySelector('.plugy-panel');hero.insertBefore(stage,panel||null);mv=stage.querySelector('model-viewer');removeDuplicates();mv.style.display='block';mv.addEventListener('load',()=>{play('Idle',false);wake()},{once:true});bind();wake();return true;
 }
 let tries=0;const timer=setInterval(async()=>{if(await mount()||++tries>120)clearInterval(timer)},100);const mo=new MutationObserver(()=>removeDuplicates());mo.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('pageshow',mount);document.addEventListener('visibilitychange',()=>{if(!document.hidden){mount();wake()}else if(raf){cancelAnimationFrame(raf);raf=0}});
})();