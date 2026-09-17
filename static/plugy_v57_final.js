(()=>{
 const GLB='/static/PLUGY_final_animated.glb?v=57.20260917.1';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let stage=null,mv=null,raf=0,targetYaw=-6,targetPitch=76,yaw=-6,pitch=76,px=0,py=0,tx=0,ty=0,idleTimer=0,lastAction=0;

 function ensureModelViewer(){return new Promise((resolve,reject)=>{if(customElements.get('model-viewer'))return resolve();const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}

 const css=document.createElement('style');
 css.id='plugy-v57-final-css';
 css.textContent=`
 #plugyDockV55,#plugyIntegratedV56,#plugyV40Model{display:none!important}
 #plugyCompanion .plugy-v41-shell,#plugyCompanion .plugy-glb-shell,#plugyCompanion model-viewer{display:none!important}
 .hero{grid-template-columns:minmax(330px,.92fr) minmax(350px,1.06fr) minmax(270px,.72fr)!important;gap:20px!important;align-items:center!important}
 #plugyIntegratedV57{position:relative;min-height:520px;display:grid;place-items:center;isolation:isolate;overflow:visible;cursor:pointer;outline:none;user-select:none;-webkit-user-select:none}
 #plugyIntegratedV57 model-viewer{width:min(100%,540px);height:510px;background:transparent!important;--poster-color:transparent!important;z-index:3;pointer-events:none;filter:drop-shadow(0 30px 40px rgba(86,71,186,.17)) drop-shadow(0 0 30px rgba(255,91,202,.13));transition:filter .22s ease,transform .22s ease}
 #plugyIntegratedV57:hover model-viewer,#plugyIntegratedV57:focus-visible model-viewer{filter:drop-shadow(0 36px 48px rgba(92,70,205,.24)) drop-shadow(0 0 42px rgba(255,91,202,.21));transform:scale(1.012)}
 #plugyIntegratedV57 .v57-floor{position:absolute;z-index:1;left:24%;right:24%;bottom:13%;height:36px;border-radius:50%;background:radial-gradient(ellipse,rgba(72,215,255,.30),rgba(126,73,255,.21) 38%,rgba(255,95,203,.16) 57%,transparent 76%);filter:blur(11px);transform:scaleX(1.16);pointer-events:none}
 #plugyIntegratedV57 .v57-aura{position:absolute;z-index:0;width:78%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0) 0 31%,rgba(86,220,255,.13) 44%,rgba(131,78,255,.11) 56%,rgba(255,94,202,.10) 64%,transparent 75%);filter:blur(10px);animation:v57Aura 5.8s ease-in-out infinite;pointer-events:none}
 #plugyIntegratedV57 .v57-ring{position:absolute;z-index:2;width:74%;height:27%;border-radius:50%;border:1px solid rgba(126,94,255,.18);box-shadow:0 0 28px rgba(255,102,207,.10);transform:rotate(-8deg);opacity:.68;pointer-events:none;animation:v57Ring 13s linear infinite}
 #plugyIntegratedV57 .v57-ring:after{content:"";position:absolute;width:7px;height:7px;border-radius:50%;right:10%;top:9%;background:#ff72c8;box-shadow:0 0 15px #ff72c8,0 0 25px #5de0ff}
 #plugyIntegratedV57 .v57-speck{position:absolute;z-index:2;width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#65e6ff,#a96fff,#ff78ca);box-shadow:0 0 14px rgba(135,87,255,.28);pointer-events:none;animation:v57Speck var(--d,6s) ease-in-out infinite;animation-delay:var(--delay,0s)}
 #plugyIntegratedV57 .s1{left:18%;top:30%;--d:5.4s;--delay:-1.4s}#plugyIntegratedV57 .s2{right:16%;top:34%;--d:6.8s;--delay:-2.2s}#plugyIntegratedV57 .s3{left:25%;bottom:23%;--d:7.1s;--delay:-3.1s}
 #plugyIntegratedV57 .v57-label{position:absolute;z-index:4;bottom:5%;left:50%;transform:translateX(-50%);font:750 8px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:1.45px;text-transform:uppercase;color:#756e91;white-space:nowrap;opacity:.72}
 #plugyIntegratedV57 .v57-label:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:7px;background:#ff71c8;box-shadow:0 0 0 4px rgba(255,113,200,.09),0 0 12px rgba(122,78,255,.25);vertical-align:1px}
 #plugyIntegratedV57[data-state="thinking"] .v57-label:before{background:#a978ff}#plugyIntegratedV57[data-state="active"] .v57-label:before{background:#58ddff}
 @keyframes v57Aura{50%{transform:scale(1.08);opacity:.80}}@keyframes v57Ring{to{transform:rotate(352deg)}}@keyframes v57Speck{0%,100%{transform:translate(0,0) scale(.82);opacity:.40}50%{transform:translate(5px,-12px) scale(1.18);opacity:.90}}
 @media(max-width:1180px){.hero{grid-template-columns:minmax(320px,1fr) minmax(310px,.88fr)!important}.hero>.plugy-panel{grid-column:1/-1!important}#plugyIntegratedV57{min-height:455px}#plugyIntegratedV57 model-viewer{height:440px;max-width:470px}}
 @media(max-width:900px){.hero{grid-template-columns:1fr!important}#plugyIntegratedV57{min-height:390px;order:2}#plugyIntegratedV57 model-viewer{height:380px;width:min(92%,420px)}.hero>.plugy-panel{order:3!important;grid-column:auto!important}}
 @media(max-width:620px){#plugyIntegratedV57{min-height:310px}#plugyIntegratedV57 model-viewer{height:300px;width:min(94%,340px)}#plugyIntegratedV57 .v57-label{bottom:2%;font-size:7px}#plugyIntegratedV57 .v57-ring{width:83%}#plugyIntegratedV57 .v57-aura{width:90%}}
 @media(prefers-reduced-motion:reduce){#plugyIntegratedV57 .v57-aura,#plugyIntegratedV57 .v57-ring,#plugyIntegratedV57 .v57-speck{animation:none!important}}
 `;
 document.head.appendChild(css);

 function removeDuplicates(){
   document.getElementById('plugyDockV55')?.remove();
   document.getElementById('plugyIntegratedV56')?.remove();
   const old=document.querySelector('.hero .plugy-stage');if(old)old.style.display='none';
   document.querySelectorAll('model-viewer').forEach(m=>{if(m===mv)return;const src=(m.getAttribute('src')||'').toLowerCase();if(src.includes('plugy'))m.style.display='none'});
 }
 function play(name,once=true){
   if(!mv)return;
   const a=mv.availableAnimations||[];
   if(!a.includes(name))return;
   try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});lastAction=performance.now();if(once)setTimeout(()=>{if(stage&&stage.dataset.state!=='thinking')play('Idle',false)},name==='Think'?1500:name==='Blink'?450:1100)}catch{}
 }
 function contextGesture(){const s=((location.hash||'')+' '+(document.querySelector('.view.active')?.id||'')).toLowerCase();if(s.includes('radar')||s.includes('opportun'))return'Curious';if(s.includes('content')||s.includes('studio'))return'Attentive';if(s.includes('note'))return'Think';if(s.includes('artist'))return'Happy';return'Present'}
 function loop(t){
   if(!stage||!mv||document.hidden){raf=0;return}
   yaw+=(targetYaw-yaw)*.06;pitch+=(targetPitch-pitch)*.06;px+=(tx-px)*.05;py+=(ty-py)*.05;
   const drift=reduced?0:Math.sin(t/2300)*1.1;
   mv.setAttribute('camera-orbit',`${yaw+drift}deg ${pitch}deg 3.82m`);
   stage.style.transform=`translate3d(${px}px,${py+(reduced?0:Math.sin(t/1700)*2.1)}px,0)`;
   raf=requestAnimationFrame(loop)
 }
 function wake(){if(!raf)raf=requestAnimationFrame(loop)}
 function focusAssistant(){const input=document.querySelector('.chat-form input,.chat-form textarea,.plugy-panel input,.plugy-panel textarea');const panel=input?.closest('.plugy-panel')||document.querySelector('.plugy-panel');play('Happy');stage.dataset.state='active';if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'});if(input)setTimeout(()=>{try{input.focus({preventScroll:true})}catch{}},220);setTimeout(()=>{if(stage)stage.dataset.state='idle'},1400)}
 function bind(){
   stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();const dx=(e.clientX-(r.left+r.width/2))/Math.max(1,r.width);const dy=(e.clientY-(r.top+r.height/2))/Math.max(1,r.height);targetYaw=-6+Math.max(-9,Math.min(9,dx*13));targetPitch=76+Math.max(-4,Math.min(4,dy*6));tx=Math.max(-8,Math.min(8,dx*8));ty=Math.max(-5,Math.min(5,dy*5));stage.dataset.state='active';wake()},{passive:true});
   stage.addEventListener('pointerleave',()=>{targetYaw=-6;targetPitch=76;tx=0;ty=0;stage.dataset.state='idle';play('Curious')});
   stage.addEventListener('click',focusAssistant);stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusAssistant()}});
   window.addEventListener('hashchange',()=>play(contextGesture()));
   document.addEventListener('click',e=>{if(e.target.closest('.nav button'))setTimeout(()=>play(contextGesture()),90);else if(e.target.closest('.primary,.soft,.chip,.plug-v20-card,.plug-v20-chip'))play('Bounce')},{passive:true});
   let st=0;window.addEventListener('scroll',()=>{clearTimeout(st);st=setTimeout(()=>{if(!document.hidden)play('Attentive')},150)},{passive:true});
   const host=document.getElementById('plugyCompanion');if(host){const obs=new MutationObserver(()=>{const thinking=host.classList.contains('thinking');stage.dataset.state=thinking?'thinking':'idle';if(thinking)play('Think',false);else if(performance.now()-lastAction>450)play('Idle',false)});obs.observe(host,{attributes:true,attributeFilter:['class']})}
   const schedule=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!document.hidden&&stage.dataset.state!=='thinking')play(['SoftTurn','Blink','Curious','Present','Happy','Attentive'][Math.floor(Math.random()*6)]);schedule()},7600+Math.random()*6200)};schedule()
 }
 async function mount(){
   if(document.getElementById('plugyIntegratedV57')){removeDuplicates();return true}
   const hero=document.querySelector('.hero');if(!hero)return false;
   try{await ensureModelViewer()}catch{return false}
   stage=document.createElement('div');stage.id='plugyIntegratedV57';stage.tabIndex=0;stage.setAttribute('role','button');stage.setAttribute('aria-label','PLUGY, assistant créatif PLUG ART');stage.dataset.state='idle';
   stage.innerHTML='<div class="v57-aura"></div><div class="v57-ring"></div><i class="v57-speck s1"></i><i class="v57-speck s2"></i><i class="v57-speck s3"></i><div class="v57-floor"></div><model-viewer id="plugyModelV57" src="'+GLB+'" camera-orbit="-6deg 76deg 3.82m" camera-target="0m 1.02m -0.09m" field-of-view="28deg" interaction-prompt="none" disable-zoom shadow-intensity=".16" shadow-softness="1" exposure="1.07" environment-image="neutral" loading="eager" reveal="auto" animation-crossfade-duration="250" aria-label="PLUGY, mascotte 3D officielle de PLUG ART"></model-viewer><div class="v57-label">PLUGY actif</div>';
   const panel=hero.querySelector('.plugy-panel');hero.insertBefore(stage,panel||null);mv=stage.querySelector('model-viewer');removeDuplicates();mv.style.display='block';mv.addEventListener('load',()=>{play('Idle',false);wake()},{once:true});bind();wake();return true
 }
 let tries=0;const timer=setInterval(async()=>{if(await mount()||++tries>120)clearInterval(timer)},100);
 const mo=new MutationObserver(()=>removeDuplicates());mo.observe(document.documentElement,{subtree:true,childList:true});
 window.addEventListener('pageshow',mount);document.addEventListener('visibilitychange',()=>{if(!document.hidden){mount();wake()}else if(raf){cancelAnimationFrame(raf);raf=0}})
})();