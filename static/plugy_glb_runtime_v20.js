(()=>{
 const GLB='/static/plugy.glb?v=20';
 async function exists(){try{const r=await fetch(GLB,{method:'HEAD',cache:'no-store'});return r.ok}catch{return false}}
 function loadModelViewer(){return new Promise((resolve,reject)=>{if(customElements.get('model-viewer'))return resolve();const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
 function addBlink(shell){const blink=document.createElement('div');blink.className='plugy-v20-blink';blink.innerHTML='<i></i><i></i>';shell.appendChild(blink)}
 async function boot(){const host=document.getElementById('plugyCompanion');if(!host)return;if(!(await exists())){host.dataset.renderer='procedural';return}try{await loadModelViewer()}catch{host.dataset.renderer='procedural';return}
  const old=host.querySelector('.plugy-cloud3d,.plugy-glb-viewer,.plugy-glb-shell');if(!old)return;const shell=document.createElement('div');shell.className='plugy-glb-shell';const mv=document.createElement('model-viewer');mv.className='plugy-glb-viewer';mv.src=GLB;mv.setAttribute('camera-orbit','0deg 78deg 3.6m');mv.setAttribute('camera-target','0m .75m 0m');mv.setAttribute('field-of-view','28deg');mv.setAttribute('interaction-prompt','none');mv.setAttribute('disable-zoom','');mv.setAttribute('shadow-intensity','.35');mv.setAttribute('environment-image','neutral');mv.setAttribute('aria-label','PLUGY, assistant 3D PLUG ART');shell.appendChild(mv);addBlink(shell);old.replaceWith(shell);host.dataset.renderer='glb-v20';
  mv.addEventListener('load',()=>{try{const anims=mv.availableAnimations||[];if(anims.includes('Idle')){mv.animationName='Idle';mv.setAttribute('autoplay','')}}catch{}});
  const obs=new MutationObserver(()=>{shell.classList.toggle('thinking',host.classList.contains('thinking'));shell.classList.toggle('mini',host.classList.contains('is-mini'))});obs.observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{try{document.hidden?mv.pause():mv.play()}catch{}})
 }
 let n=0;const t=setInterval(()=>{if(document.getElementById('plugyCompanion')){clearInterval(t);boot()}else if(++n>50)clearInterval(t)},200)
})();
