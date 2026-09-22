
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,modal}=P;
function calibrate(){
  const w=innerWidth,h=innerHeight,dpr=devicePixelRatio||1;
  const mode=w>=1700?'wide':w>=1280?'desktop':w>=860?'compact':'mobile';
  document.body.dataset.desktopDensity=mode;
  document.documentElement.style.setProperty('--viewport-h',h+'px');
  const shell=q('.shell'),active=q('.view.active');
  const overflow=shell?Math.max(0,shell.scrollWidth-shell.clientWidth):0;
  const activeOverflow=active?Math.max(0,active.scrollWidth-active.clientWidth):0;
  const ok=overflow<3&&activeOverflow<3;
  const btn=q('#layoutHealth');
  if(btn){btn.textContent=ok?'✓':'!';btn.dataset.ok=ok?'1':'0';btn.title='Interface '+mode+' · '+w+'×'+h+' · DPR '+dpr}
  return{w,h,dpr,mode,overflow,activeOverflow,ok};
}
let resizeTimer=0;
addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(calibrate,80)},{passive:true});
new MutationObserver(()=>requestAnimationFrame(calibrate)).observe(document.body,{attributes:true,attributeFilter:['data-view']});
q('#layoutHealth')?.addEventListener('click',()=>{
  const r=calibrate();
  const visibleButtons=qa('button').filter(x=>x.offsetParent!==null&&!x.disabled).length;
  const visibleLinks=qa('a').filter(x=>x.offsetParent!==null).length;
  const navBroken=qa('[data-view]').filter(x=>!q('#view-'+x.dataset.view)&&x.offsetParent!==null).length;
  modal('<h3>Diagnostic interface</h3><div class="layout-diagnostic"><div><b>'+r.w+' × '+r.h+'</b><span>viewport</span></div><div><b>'+r.dpr+'</b><span>DPR</span></div><div><b>'+r.mode+'</b><span>calibrage</span></div><div><b>'+(r.ok?'OK':'À surveiller')+'</b><span>débordement</span></div></div><p>Contrôles visibles : '+visibleButtons+' boutons · '+visibleLinks+' liens. Routes visibles sans vue correspondante : '+navBroken+'.</p>');
});
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href="#"],a:not([href])');
  if(a&&a.offsetParent!==null){
    e.preventDefault();
    modal('<h3>Lien indisponible</h3><p>Cette source n’a pas encore d’URL exploitable. Le contrôle est bloqué proprement plutôt que de t’envoyer vers une page vide.</p>');
  }
},true);
requestAnimationFrame(calibrate);
})();
