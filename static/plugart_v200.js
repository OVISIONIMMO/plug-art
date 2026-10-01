
/* PLUG ART V200 — premium dashboard */
(function(){
'use strict';
var q=function(s,r){return (r||document).querySelector(s)};
var qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
function go(route){
  var el=q('.nav-item[data-route="'+route+'"]');
  if(el){el.click();return}
  try{if(typeof showView==='function')showView(route)}catch(e){}
}
function plugy(seed){
  try{if(typeof openPlugy==='function'){openPlugy(seed||'');return}}catch(e){}
  var b=q('#topPlugy');if(b)b.click();
}
function loc(o){return [o&&o.city,o&&o.country].filter(Boolean).join(' · ')||(o&&o.location)||'Lieu à confirmer'}
function dt(o){return (o&&(o.deadline||o.event_date||o.date||o.start_date))||'Date à confirmer'}
async function data(){
  try{var r=await fetch('/api/v124/dashboard-bootstrap',{cache:'no-store'});if(r.ok)return await r.json()}catch(e){}
  return {};
}
async function install(){
  document.body.classList.add('plugart-v200');
  var bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp)bp.textContent='V200';if(sv)sv.textContent='V200';
  var view=q('#view-dashboard');if(!view||q('#dashboardV200'))return;
  qa('#view-dashboard > .dashboard-grid,#dashboardV176,#slideDashboard,#dashboardV175',view).forEach(function(x){x.hidden=true;x.setAttribute('aria-hidden','true')});
  var root=document.createElement('div');root.id='dashboardV200';
  root.innerHTML=
  '<section class="v200-hero">'+
   '<div class="v200-copy"><div><div class="v200-kicker"><i></i>PLUG ART · CREATIVE OPERATING SYSTEM</div><h2>Créer. Repérer.<br><em>Faire circuler l’art.</em></h2><p>Un poste de travail unique pour détecter les opportunités, fabriquer tes campagnes, structurer les projets et travailler avec PLUGY sans changer d’univers toutes les trente secondes.</p></div><div class="v200-actions"><button data-v200-go="creation">Créer une campagne</button><button data-v200-go="radar">Explorer le Radar</button><button data-v200-plugy>Parler à PLUGY</button></div></div>'+
   '<div class="v200-plugy-stage"><model-viewer id="dashboardPlugyV200" src="/assets/plugy-v113-premium.glb?v=200.20261001.1" loading="eager" reveal="auto" interaction-prompt="none" environment-image="neutral" tone-mapping="neutral" shadow-intensity=".02" exposure=".68" camera-target="0m 0m 0m" camera-orbit="0deg 79deg 8.9m" field-of-view="43deg" alt="PLUGY"></model-viewer><div class="v200-plugy-label"><i></i> PLUGY · DISPONIBLE</div></div>'+
  '</section>'+
  '<section class="v200-commandbar">'+
   '<button class="v200-command" data-v200-go="radar"><b>◉</b><div><strong>Radar</strong><span>Open calls & vernissages</span></div></button>'+
   '<button class="v200-command" data-v200-go="creation"><b>✦</b><div><strong>Labo création</strong><span>Campagnes & carrousels</span></div></button>'+
   '<button class="v200-command" data-v200-go="bureau"><b>▤</b><div><strong>Bureau</strong><span>PDF, dossiers, textes</span></div></button>'+
   '<button class="v200-command" data-v200-go="map"><b>⌖</b><div><strong>Map</strong><span>Opportunités par lieu</span></div></button>'+
   '<button class="v200-command" data-v200-go="social"><b>◎</b><div><strong>Instagram</strong><span>Créer & publier</span></div></button>'+
  '</section>'+
  '<section class="v200-lower"><div class="v200-feed"><div class="v200-section-head"><div><small>RADAR · À REGARDER</small><strong>Opportunités actives</strong></div><button data-v200-go="opencalls">Tout voir →</button></div><div class="v200-opps" id="v200Opps"><div class="empty">Synchronisation…</div></div></div>'+
  '<div class="v200-radar-card"><div class="v200-section-head"><div><small>SIGNAL</small><strong>Vue rapide</strong></div><button data-v200-go="radar">Actualiser →</button></div><div class="v200-signal-grid" id="v200Signals"></div><div class="v200-note">PLUGY reste visible ici en entier. Sur les autres rubriques, il redevient discret pour garder le travail au premier plan.</div></div></section>';
  view.appendChild(root);
  root.addEventListener('click',function(e){
    var g=e.target.closest('[data-v200-go]');if(g)go(g.getAttribute('data-v200-go'));
    if(e.target.closest('[data-v200-plugy]'))plugy('Aide-moi à organiser mon travail PLUG ART.');
    var o=e.target.closest('[data-v200-opp]');if(o){go('creation');setTimeout(function(){if(window.PLUGART_V200&&window.PLUGART_V200.seedOpportunity)window.PLUGART_V200.seedOpportunity(o.getAttribute('data-v200-opp'))},300)}
  });
  try{
    if(typeof ensureModelViewer==='function')await ensureModelViewer();
    var mv=q('#dashboardPlugyV200');
    if(mv){
      mv.addEventListener('load',function(){try{var a=mv.availableAnimations||[];if(a.indexOf('Idle')>=0){mv.animationName='Idle';mv.play({repetitions:Infinity})}}catch(e){}},{once:true});
      mv.addEventListener('click',function(){plugy('Je veux travailler avec toi sur PLUG ART.')});
    }
  }catch(e){}
  var d=await data(),opps=(d.opportunities||(d.data&&d.data.opportunities)||[]).slice(0,5),stats=d.stats||(d.data&&d.data.stats)||{};
  var list=q('#v200Opps');
  if(list)list.innerHTML=opps.length?opps.map(function(o,i){return '<article class="v200-opp"><div class="v200-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(o.title||'Opportunité')+'</strong><span>'+esc(loc(o))+' · '+esc(dt(o))+'</span></div><button data-v200-opp="'+esc(o.id||'')+'">Créer ↗</button></article>'}).join(''):'<div class="empty">Aucune opportunité chargée.</div>';
  var all=d.opportunities||(d.data&&d.data.opportunities)||[],urgent=all.filter(function(o){var t=Date.parse(o.deadline||'');return Number.isFinite(t)&&t>Date.now()&&t-Date.now()<604800000}).length;
  var sg=q('#v200Signals');
  if(sg)sg.innerHTML=[[stats.opportunities!=null?stats.opportunities:all.length,'Open Calls'],[stats.events!=null?stats.events:(d.events||[]).length,'Vernissages'],[stats.drafts!=null?stats.drafts:(d.drafts||[]).length,'Brouillons'],[stats.urgent!=null?stats.urgent:urgent,'À traiter vite']].map(function(x){return '<div class="v200-signal"><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div>'}).join('');
}
function boot(){
  install();
  var ob=new MutationObserver(function(){document.body.classList.add('plugart-v200');if(q('#view-dashboard')&&!q('#dashboardV200'))install()});
  ob.observe(document.body,{childList:true,subtree:true});
  window.PLUGART_V200=window.PLUGART_V200||{};window.PLUGART_V200.go=go;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
