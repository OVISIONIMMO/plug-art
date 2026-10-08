(()=>{'use strict';
const REV='206.20261008.1';
const q=(s,r=document)=>r.querySelector(s);
async function install(){
  const bp=q('#buildPill'),sv=q('#sidebarVersion');
  if(bp)bp.textContent='V206'; if(sv)sv.textContent='V206';
  if(document.body?.dataset.view!=='radar' && !q('#view-radar.active'))return;
  const live=q('#radarLiveV168');
  if(!live||q('#radarDepthV206'))return;
  const bar=document.createElement('div');
  bar.id='radarDepthV206';
  bar.className='v205-glass';
  bar.style.cssText='display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:10px 0 14px;padding:10px 12px;border-radius:16px;font-size:10px;color:#5f6876';
  bar.innerHTML='<strong style="color:#202733">Recherche profonde</strong><span>Paris / IDF</span><span>France</span><span>Europe</span><span>Mines cachées</span><span>·</span><span>Vernissages 60 jours</span><span id="radarSourcesV206" style="margin-left:auto">sources…</span>';
  live.insertAdjacentElement('afterend',bar);
  const all=q('#radarRefreshAllV169'),opps=q('#radarRefreshOppsV168'),events=q('#radarRefreshEventsV168');
  if(all)all.textContent='Actualiser tout · profond';
  if(opps)opps.textContent='Open Calls · 4 passes';
  if(events)events.textContent='Vernissages · 60 jours';
  const web=q('#eventSearchWebV167');if(web)web.textContent='◉ Recherche web élargie';
  try{
    const r=await fetch('/api/v206/radar/config',{cache:'no-store'});
    if(r.ok){
      const d=await r.json(),el=q('#radarSourcesV206');
      if(el)el.textContent=(d.discovery_sources||0)+' sources actives';
    }
  }catch(_){}
}
function boot(){
  install();
  document.addEventListener('plugart:route',()=>setTimeout(install,120));
  const mo=new MutationObserver(()=>{if((document.body?.dataset.view==='radar'||q('#view-radar.active'))&&!q('#radarDepthV206'))install()});
  mo.observe(document.body,{childList:true,subtree:true});
  console.info('[PLUG ART] Radar V206',REV);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();