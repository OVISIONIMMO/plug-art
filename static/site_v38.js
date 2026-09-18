(()=>{'use strict';
const MODEL='/static/plugy_head_v38.glb?v=38.20260918.1';
function tune(){
 const host=document.querySelector('#plugyFree33'), m=document.querySelector('#plugyModel33');
 if(!host||!m)return false;
 m.setAttribute('src',MODEL);
 m.setAttribute('camera-orbit','-8deg 78deg 4.85m');
 m.setAttribute('camera-target','0m .16m 0m');
 m.setAttribute('field-of-view','31deg');
 m.setAttribute('exposure','1.04');
 m.setAttribute('shadow-intensity','.34');
 m.setAttribute('shadow-softness','1');
 m.setAttribute('environment-image','neutral');
 m.removeAttribute('poster');
 m.style.background='transparent';
 m.addEventListener('load',()=>{try{if((m.availableAnimations||[]).includes('IdleBlink')){m.animationName='IdleBlink';m.play()}}catch{}},{once:true});
 return true;
}
function route(){
 const q=new URLSearchParams(location.search);
 if((q.get('v')||'').startsWith('38') && !location.hash){
   history.replaceState(null,'',location.pathname+location.search+'#explorer');
 }
}
function boot(){
 route();
 if(!tune()){const o=new MutationObserver(()=>{if(tune())o.disconnect()});o.observe(document.body,{childList:true,subtree:true})}
 document.documentElement.classList.add('plug-v38');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();