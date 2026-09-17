(()=>{
 const GLB='/static/plugy.glb?v=53.20260917.1';
 function apply(){
  const host=document.getElementById('plugyCompanion');
  if(!host)return false;
  host.dataset.renderer='glb-v53-head';
  host.dataset.plugyVersion='53';
  host.dataset.body='none';
  host.querySelectorAll('model-viewer').forEach(m=>{
   const src=m.getAttribute('src')||'';
   if(src!==GLB){m.setAttribute('src',GLB);m.dataset.plugyForced='53'}
   m.setAttribute('camera-orbit','0deg 76deg 2.65m');
   m.setAttribute('camera-target','0m .84m 0m');
   m.setAttribute('field-of-view','25deg');
   m.setAttribute('shadow-intensity','.26');
   m.setAttribute('shadow-softness','1');
   m.setAttribute('exposure','1.04');
   m.setAttribute('aria-label','PLUGY V53, mascotte officielle tête-prise 3D de PLUG ART');
   m.addEventListener('load',()=>{m.style.opacity='1'},{once:true});
  });
  host.querySelectorAll('.plugy-v41-badge span').forEach(x=>x.textContent='PLUGY · HEAD');
  return true;
 }
 const style=document.createElement('style');
 style.id='plugy-v53-head-css';
 style.textContent='#plugyCompanion model-viewer[src*="plugy_head_v33.glb"],#plugyCompanion model-viewer[src*="plugy_head_v26.glb"]{opacity:0!important}.plugy-v41-shell{transform:translateY(var(--plugy-bob,0)) rotate(var(--plugy-tilt,0));}';
 document.head.appendChild(style);
 let tries=0;const t=setInterval(()=>{apply();if(++tries>140)clearInterval(t)},90);
 const mo=new MutationObserver(()=>apply());
 mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 window.addEventListener('pageshow',apply);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
})();
