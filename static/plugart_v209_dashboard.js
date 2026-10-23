/* PLUG ART V209 · ultraviolet glass dashboard, real-data linked components.
 * Reference-inspired layout, never inserts fabricated artists, opportunities or statistics.
 */
(()=>{'use strict';
const VERSION='210.20261023.1';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=(n)=>(n===null||n===undefined||n==='')?null:(Number.isFinite(Number(n))?Number(n):null);
const clean=(v)=>v==null?'—':esc(v);
const brandMark='<span>PLUG<br><em>ART</em></span>';
const state={dashboard:null,events:[],artists:[],projects:[],ready:false,filter:'all',loading:false,lastUpdated:0,lastSecondary:0,request:null,degraded:[]};
const SECONDARY_TTL=120000,FOREGROUND_TTL=180000;
const chartShape='<svg class="n9-kpi-spark" viewBox="0 0 80 28" aria-hidden="true"><path d="M1 23 Q10 6 19 18T38 13T55 12T79 4" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>';
const dots=[
 [9,42],[23,12],[42,66],[61,6],[81,35],[13,78],[45,20],[70,85],
 [52,44],[88,68],[34,89],[5,23],[93,17],[75,10],[30,53],[58,74]
];
function ensureVersion(){
 for(const id of ['buildPill','sidebarVersion']){const el=$('#'+id);if(el&&el.textContent!=='V209')el.textContent='V209'}
 const meta=$('meta[name="theme-color"]');if(meta&&meta.content!=='#120b3c')meta.content='#120b3c';
}
function mkKpi(label,key,route,icon,hint){
 return '<button type="button" class="n9-kpi" data-n9-route="'+route+'"><span class="n9-kpi-icon" aria-hidden="true">'+icon+'</span>'+
 '<span class="n9-kpi-info"><span class="n9-kpi-label">'+label+'</span><strong class="n9-kpi-value" data-n9-stat="'+key+'">—</strong><span class="n9-kpi-hint">'+hint+'</span></span>'+
 '<span class="n9-kpi-arrow" aria-hidden="true">›</span>'+chartShape+'</button>';
}
function shell(){
 const view=$('#view-dashboard');if(!view)return null;
 let board=$('#v209Dashboard');if(board)return board;
 board=document.createElement('div');board.id='v209Dashboard';board.setAttribute('aria-label','Tableau de bord PLUG ART V209');
 const dotsHTML=dots.map(([x,y],i)=>'<i class="n9-orbit-dot" style="left:'+x+'%;top:'+y+'%;width:'+(i%4===0?11:7)+'px;height:'+(i%4===0?11:7)+'px" aria-hidden="true"></i>').join('');
 board.innerHTML=
 '<div class="n9-kpis">'+
 mkKpi('Open Calls','opportunities','opencalls','♧','Opportunités actives')+
 mkKpi('Vernissages','events','radar','▣','À découvrir')+
 mkKpi('Brouillons','drafts','creation','▤','Contenus en cours')+
 mkKpi('Studio Création','projects','creation','✎','Projets récents')+
 mkKpi('Bureau PDF','bureau','bureau','▱','Documents récents')+
 '</div>'+
 '<div class="n9-grid">'+
 '<section class="n9-card n9-radar"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">◎</span>Radar des opportunités</h2><button class="n9-pill" data-n9-route="radar">Explorer le Radar ↗</button></div>'+
 '<div class="n9-radar-vis"><div class="n9-orbit" aria-hidden="true">'+dotsHTML+
 '<div class="n9-orbit-center"><strong id="n9RadarCount">—</strong><span>OPPORTUNITÉS</span></div></div></div>'+
 '<div class="n9-radar-key"><span>Open Calls<strong data-n9-key="opportunities">—</strong></span><span>Deadlines proches<strong data-n9-key="urgent">—</strong></span><span>Contacts à suivre<strong data-n9-key="contacts">—</strong></span></div></section>'+
 '<section class="n9-card n9-events"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">▣</span>Prochains vernissages</h2><button class="n9-pill" data-n9-route="radar" data-n9-events>Voir tout ›</button></div>'+
 '<div class="n9-events-list" id="n9Events"><div class="n9-events-empty">Chargement des événements…</div></div></section>'+
 '<section class="n9-card n9-plugy"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">✦</span>Assistant Plugy</h2><span class="n9-online">Assistant</span></div>'+
 '<div class="n9-plugy-scene"><div class="n9-bot" aria-hidden="true"><div class="n9-bot-face"></div><div class="n9-bot-foot"></div></div>'+
 '<div class="n9-bubble"><strong>Salut !</strong><div>Je suis Plugy.<br>Je t’aide à explorer des opportunités, créer des visuels et organiser tes projets.</div></div></div>'+
 '<div class="n9-plugy-actions"><button data-n9-route="radar">◎ Trouver des Open Calls</button><button data-n9-route="creation">✦ Générer un visuel</button>'+
 '<button data-n9-route="ideas">♧ Idées d’expos</button><button data-n9-plugy>◉ Parler à Plugy</button></div></section>'+
 '<section class="n9-card n9-insight"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">▥</span>Activité du Radar</h2><span class="n9-pill">Données actives</span></div>'+
 '<div class="n9-metrics"><div><b data-n9-metric="opportunities">—</b><small>Open Calls</small></div>'+
 '<div><b data-n9-metric="urgent">—</b><small>Deadlines proches</small></div>'+
 '<div><b data-n9-metric="events">—</b><small>Vernissages</small></div></div>'+
 '<div class="n9-chart" role="img" aria-label="Scores de pertinence des opportunités visibles" id="n9Scores"></div>'+
 '<div class="n9-chart-caption">Scores de pertinence des opportunités sélectionnées</div></section>'+
 '<section class="n9-card n9-studio"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">✎</span>Studio Création</h2>'+
 '<button class="n9-pill" data-n9-route="creation">+ Nouveau projet ›</button></div>'+
 '<div class="n9-studio-tabs" role="group" aria-label="Types de compositions">'+
 '<button type="button" data-n9-studio="all" aria-pressed="true">Tous</button>'+
 '<button type="button" data-n9-studio="flyer" aria-pressed="false">Flyers</button>'+
 '<button type="button" data-n9-studio="cover" aria-pressed="false">Covers</button>'+
 '<button type="button" data-n9-studio="projects" aria-pressed="false">Mes projets</button></div>'+
 '<div class="n9-studio-cards" id="n9StudioCards"></div></section>'+
 '<section class="n9-card n9-artists"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">♥</span>Artistes du réseau</h2><button class="n9-pill" data-n9-route="network">Voir tout ›</button></div>'+
 '<div class="n9-artist-row" id="n9Artists"></div></section>'+
 '<section class="n9-card n9-map"><div class="n9-card-header"><h2 class="n9-card-title"><span class="n9-symbol">▣</span>Carte des opportunités</h2><button class="n9-pill" data-n9-route="map">Explorer ↗</button></div>'+
 '<button type="button" data-n9-route="map" class="n9-map-art" aria-label="Ouvrir la carte des opportunités"><span>Explorer les lieux ↗</span></button></section>'+
 '</div>'+
 '<div class="n9-footer"><span>PLUG ART · Artist Opportunity Workspace <span id="n9Sync">· Synchronisation en cours</span></span>'+
 '<button data-n9-refresh>↻ Actualiser les données</button></div>';
 view.prepend(board);
 board.addEventListener('click',clickDashboard);
 return board;
}
function go(route){
 if(window.PLUGART_V200&&typeof window.PLUGART_V200.go==='function'){window.PLUGART_V200.go(route);return;}
 const nav=$('.nav-item[data-route="'+route+'"]');if(nav)nav.click();
}
function clickDashboard(e){
 const refresh=e.target.closest('[data-n9-refresh]');if(refresh){load(true);return;}
 const studio=e.target.closest('[data-n9-studio]');if(studio){
  state.filter=studio.dataset.n9Studio;
  $$('[data-n9-studio]',$('#v209Dashboard')).forEach(x=>x.setAttribute('aria-pressed',String(x===studio)));
  showStudio();return;
 }
 if(e.target.closest('[data-n9-plugy]')){const launch=$('#v204PlugyMini')||$('#topPlugy');if(launch)launch.click();return}
 const target=e.target.closest('[data-n9-route]');
 if(target){
  const route=target.dataset.n9Route;
  if(target.hasAttribute('data-n9-events')){
   const eventTab=$('.nav-item.vernissage-nav[data-radar-direct="events"]');if(eventTab){eventTab.click();return;}
  }
  go(route);
 }
}
function setStat(key,value){
 $$('[data-n9-stat="'+key+'"],[data-n9-key="'+key+'"],[data-n9-metric="'+key+'"]').forEach(el=>el.textContent=(value==null?'—':String(value)));
}
function safeList(x){return Array.isArray(x)?x:[]}
function visibleDate(src){
 if(!src)return '';
 const iso=String(src).slice(0,10);
 const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
 return match?match[3]+' '+['JAN','FÉV','MAR','AVR','MAI','JUIN','JUIL','AOÛ','SEP','OCT','NOV','DÉC'][Number(match[2])-1]:esc(iso.slice(0,12));
}
function paint(){
 const d=state.dashboard||{},stats=d.stats||d.data?.stats||{},opps=safeList(d.opportunities||d.data?.opportunities);
 setStat('opportunities',num(stats.opportunities)!=null?stats.opportunities:null);
 setStat('events',num(stats.events)!=null?stats.events:null);
 setStat('drafts',num(stats.drafts)!=null?stats.drafts:null);
 setStat('urgent',num(stats.urgent)!=null?stats.urgent:null);
 setStat('contacts',num(stats.contacts)!=null?stats.contacts:null);
 setStat('projects',state.projects.length);
 setStat('bureau',safeList(d.bureau).length);
 const rad=$('#n9RadarCount');if(rad)rad.textContent=num(stats.opportunities)!=null?stats.opportunities:'—';
 const scores=$('#n9Scores');
 if(scores){
  const values=opps.map(o=>num(o.radar_score??o.score)).filter(n=>n!=null&&n>=0&&n<=100).slice(0,24);
  if(values.length){
   scores.innerHTML=values.map((v,i)=>'<div class="n9-bar" style="height:'+Math.max(8,v)+'%" title="Opportunité '+(i+1)+' · score '+v+'/100"></div>').join('');
   scores.setAttribute('aria-label','Scores de pertinence réels des '+values.length+' opportunités affichées');
  }else{
   scores.innerHTML='<div class="n9-events-empty" style="min-height:150px;margin:auto">Les scores apparaîtront après la synchronisation du Radar.</div>';
   scores.setAttribute('aria-label','Aucun score disponible');
  }
 }
 const sync=$('#n9Sync');
 if(sync){
   sync.textContent=state.degraded.length?' · Synchronisation partielle ('+state.degraded.join(', ')+')':
     ' · Données à jour à '+new Date(state.lastUpdated||Date.now()).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 }
 showEvents();showStudio();showArtists();
}
function showEvents(){
 const el=$('#n9Events');if(!el)return;
 const ev=state.events.slice(0,3);
 if(!ev.length){
  el.innerHTML='<div class="n9-events-empty"><strong>Aucun vernissage à afficher</strong><span>Le Radar peut rechercher de nouveaux événements.</span>'+
  '<button class="n9-pill" data-n9-route="radar" data-n9-events>Explorer les vernissages ↗</button></div>';
  return;
 }
 el.innerHTML=ev.map(e=>{
  const id=num(e.id),title=esc(e.title||'Vernissage'),when=visibleDate(e.starts_at||e.date);
  return '<button class="n9-event" type="button" data-n9-route="radar" data-n9-events aria-label="Voir '+title+' dans le Radar">'+
    '<span class="n9-event-art">'+(id!=null?'<img loading="lazy" src="/api/v201/events/'+id+'/media" alt="Visuel de '+title+'">':'')+
    '<span class="n9-event-date">'+esc(when||'À VENIR')+'</span></span>'+
    '<span class="n9-event-copy"><strong>'+title+'</strong><small>'+esc([e.venue_name,e.city].filter(Boolean).join(' · ')||'Lieu à vérifier')+'</small></span></button>';
 }).join('');
}
const themes=[
 ['flyer','EXPO<br>SITION','Affiche manifeste'],
 ['cover','PLUG<br>ART','Cover Open Call'],
 ['flyer','RÉSIDENCE<br>D’ARTISTES','Flyer officiel'],
 ['cover','ARTIST<br>OPEN CALL','Couverture typographique'],
 ['flyer','CULTURE<br>VISUELLE','Composition éditoriale']
];
function showStudio(){
 const el=$('#n9StudioCards');if(!el)return;
 const isProjects=state.filter==='projects';
 const projects=state.projects.slice(0,3);
 const presets=themes.filter(t=>state.filter==='all'||state.filter===t[0]||isProjects).slice(0,3);
 if(isProjects && !projects.length){el.innerHTML='<div class="n9-events-empty" style="grid-column:1/-1">Aucun projet enregistré. <button class="n9-pill" data-n9-route="creation">Créer un projet ↗</button></div>';return;}
 const data=isProjects?projects.map(p=>['project',esc(p.title||'Projet'), 'Reprendre ce projet']):presets;
 el.innerHTML=data.map(([type,title,label],i)=>'<button type="button" class="n9-studio-template" data-n9-route="creation">'+
  '<span class="n9-studio-art"><strong>'+title+'</strong></span><small>'+esc(label)+'</small></button>').join('');
}
function showArtists(){
 const el=$('#n9Artists');if(!el)return;
 const artists=state.artists.slice(0,5);
 if(!artists.length){
  el.innerHTML='<button class="n9-pill" data-n9-route="network">Consulter le répertoire d’artistes ↗</button>';return;
 }
 el.innerHTML=artists.map((a,i)=>{
  const name=String(a.name||a.real_name||'Artiste'),initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  return '<div class="n9-artist-item" title="'+esc(name)+'"><span class="n9-artist-avatar">'+esc(initials)+'</span><small>'+esc(name)+'</small></div>';
 }).join('')+'<button class="n9-pill" data-n9-route="network" aria-label="Voir plus d’artistes">＋</button>';
}
async function fetchJSON(url){
 const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),11000);
 try{const r=await fetch(url,{signal:ctrl.signal,cache:'no-store',headers:{'Accept':'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}
 finally{clearTimeout(t)}
}
function localDate(date){
 const d=new Date(date);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
async function load(force=false){
 // Sharing in-flight work prevents double network requests from navigation and refresh.
 if(state.request)return state.request;
 state.loading=true;
 const started=performance.now();
 const sync=$('#n9Sync');if(sync)sync.textContent=' · Actualisation…';
 state.request=(async()=>{
  const issues=[];
  let primaryOK=false;
  try{
   // Render useful first-screen stats as soon as the ~18 ms DB bootstrap resolves.
   const dashboard=typeof window.PLUGART_DASHBOARD_DATA==='function'
    ?await window.PLUGART_DASHBOARD_DATA(force)
    :await fetchJSON('/api/v124/dashboard-bootstrap');
   state.dashboard=dashboard;primaryOK=true;
   state.lastUpdated=Date.now();
   state.degraded=[];
   paint();
  }catch(e){
   issues.push('Dashboard');
  }
  const now=Date.now();
  // The three secondary panels are not required to paint the main dashboard.
  // Skip redundant fetches when cached data is still fresh, but allow explicit refresh.
  if(force||!state.lastSecondary||now-state.lastSecondary>=SECONDARY_TTL){
   const from=localDate(now),until=localDate(now+60*86400000);
   const calls=[
    ['/api/v167/events?date_from='+encodeURIComponent(from)+'&date_to='+encodeURIComponent(until),'events','Vernissages'],
    ['/api/artists','artists','Artistes'],
    ['/api/v208/studio/projects','projects','Studio']
   ];
   const fetched=await Promise.allSettled(calls.map(x=>fetchJSON(x[0])));
   fetched.forEach((r,i)=>{
    const [,key,label]=calls[i];
    if(r.status==='rejected'){issues.push(label);return;}
    const list=key==='projects'?r.value?.items:r.value;
    if(!Array.isArray(list)){issues.push(label);return;}
    state[key]=key==='events'?list.filter(e=>e&&e.id):list;
   });
   if(fetched.every((r,i)=>r.status==='fulfilled'&&
      Array.isArray(calls[i][1]==='projects'?r.value?.items:r.value)))state.lastSecondary=Date.now();
  }
  if(primaryOK)state.lastUpdated=Date.now();
  state.degraded=issues;
  state.ready=true;
  paint();
  if(sync&&issues.length)sync.title='La dernière mise à jour n’a pas reçu toutes les données : '+issues.join(', ');
  else if(sync)sync.removeAttribute('title');
  console.info('[PLUG ART] Dashboard sync',Math.round(performance.now()-started)+'ms',issues.length?'partial: '+issues.join(','):'ok');
  return {ok:primaryOK&&issues.length===0,partial:issues.length>0,issues};
 })().finally(()=>{state.loading=false;state.request=null;});
 return state.request;
}
function freshness(){
 if(document.visibilityState==='hidden'||document.body.dataset.view!=='dashboard')return;
 if(state.request)return;
 if(!state.lastUpdated||Date.now()-state.lastUpdated>FOREGROUND_TTL)void load();
}
function init(){
 document.body.classList.add('plugart-v209');document.documentElement.dataset.plugartUi='209';
 ensureVersion();shell();load();
 window.PLUGART_V209={refresh:()=>load(true),getDashboard:()=>state.dashboard,isReady:()=>state.ready,getSyncState:()=>({lastUpdated:state.lastUpdated,loading:state.loading,issues:[...state.degraded]})};
 window.addEventListener('pageshow',()=>{ensureVersion();shell();freshness()});
 document.addEventListener('visibilitychange',freshness);
 window.addEventListener('focus',freshness);
 document.addEventListener('plugart:route',()=>{ensureVersion();freshness()});
 console.info('[PLUG ART] V209 ultraviolet dashboard active',VERSION);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
