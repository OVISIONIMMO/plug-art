(()=>{
 const GLB='/static/plugy.glb';
 async function exists(){try{const r=await fetch(GLB,{method:'HEAD',cache:'no-store'});return r.ok}catch{return false}}
 function loadModelViewer(){return new Promise((resolve,reject)=>{if(customElements.get('model-viewer'))return resolve();const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
 async function boot(){
  const host=document.getElementById('plugyCompanion'); if(!host)return;
  if(!(await exists())){host.dataset.renderer='procedural';return;}
  try{await loadModelViewer()}catch{host.dataset.renderer='procedural';return;}
  const cloud=host.querySelector('.plugy-cloud3d'); if(!cloud)return;
  const mv=document.createElement('model-viewer');
  mv.className='plugy-glb-viewer'; mv.src=GLB; mv.setAttribute('camera-orbit','0deg 78deg 2.6m'); mv.setAttribute('interaction-prompt','none'); mv.setAttribute('disable-zoom',''); mv.setAttribute('shadow-intensity','0'); mv.setAttribute('environment-image','neutral'); mv.setAttribute('animation-name','Idle'); mv.setAttribute('autoplay',''); mv.setAttribute('aria-label','PLUGY, assistant 3D PLUG ART');
  cloud.replaceWith(mv); host.dataset.renderer='glb';
  const setAnim=name=>{try{mv.animationName=name;mv.play()}catch{}};
  const obs=new MutationObserver(()=>{if(host.classList.contains('thinking'))setAnim('Think');else if(host.classList.contains('is-mini'))setAnim('MiniIdle');else setAnim('Idle')}); obs.observe(host,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{try{document.hidden?mv.pause():mv.play()}catch{}});
 }
 let n=0;const t=setInterval(()=>{if(document.getElementById('plugyCompanion')){clearInterval(t);boot()}else if(++n>40)clearInterval(t)},250);
})();
