/* PLUG ART V207 · Consolidated incremental modules, original IIFEs retained. */
(()=>{'use strict';
const REV='207.20261015.1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const click=s=>{const el=q(s);if(el){el.click();return true}return false};
function route(name){
 if(window.PLUGART_V202_ROUTE){window.PLUGART_V202_ROUTE(name,true);return}
 click('.nav-item[data-route="'+name+'"]');
}
function lightMeta(){
 q('meta[name="theme-color"]')?.setAttribute('content','#ffffff');
 document.documentElement.style.background='#fff';
 document.body.classList.add('plugart-v204-white');
 const bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp&&bp.textContent!=='V208')bp.textContent='V208';if(sv&&sv.textContent!=='V208')sv.textContent='V208';
}
function installPlugyMini(){
 if(q('#v204PlugyMini'))return;
 const b=document.createElement('button');b.id='v204PlugyMini';b.className='v204-plugy-mini';b.type='button';b.setAttribute('aria-label','Ouvrir PLUGY');
 b.innerHTML='<span class="v204-plugy-head"><span class="v204-plugy-eyes"><i></i><i></i></span></span><span class="v204-plugy-dot"></span>';
 b.onclick=()=>{
   if(typeof window.openPlugy==='function'){try{window.openPlugy('');return}catch(_){}}
   if(click('#topPlugy'))return;
   click('[data-open-plugy]');
 };
 document.body.appendChild(b);
}
function simplifyDashboard(){
 const d=q('#dashboardV200');if(!d)return;
 qa('.v200-command span',d).forEach(x=>x.remove());
 const title=q('#pageTitle');if(document.body.dataset.view==='dashboard'&&title)title.textContent='Dashboard';
}
function actualChoices(kind){
 if(kind==='design')return qa('#creationV200 [data-c200-da]').map(b=>({label:(q('strong',b)?.textContent||q('b',b)?.textContent||b.textContent).trim().replace(/\s+/g,' '),value:b.dataset.c200Da}));
 if(kind==='layout')return qa('#creationV200 [data-c200-layout]').map(b=>({label:(q('span',b)?.textContent||b.textContent).trim().replace(/\s+/g,' '),value:b.dataset.c200Layout}));
 return [];
}
function shelfItems(group){
 if(group==='design')return actualChoices('design').slice(0,8).map(x=>({label:x.label,kind:'da',value:x.value}));
 if(group==='layout')return actualChoices('layout').map(x=>({label:x.label,kind:'layout',value:x.value}));
 if(group==='visual')return [
  {label:'Importer une image',kind:'click',value:'c200Upload'},{label:'2 variantes IA',kind:'click',value:'c200MoreVisuals'},
  {label:'Guides',kind:'click',value:'c203Guides'},{label:'Copier légende',kind:'click',value:'c200CopyCaption'}
 ];
 return [
  {label:'Générer campagne',kind:'click',value:'c200Generate'},{label:'Enregistrer',kind:'click',value:'c200Save'},
  {label:'Exporter ZIP',kind:'click',value:'c200Download'},{label:'Nouvelle campagne',kind:'click',value:'c200New'}
 ];
}
function renderShelf(root,group){
 qa('.v204-shelf-tab',root).forEach(b=>b.classList.toggle('on',b.dataset.group===group));
 const body=q('.v204-shelf-body',root);if(!body)return;
 body.innerHTML=shelfItems(group).map(x=>'<button class="v204-shelf-choice" data-kind="'+esc(x.kind)+'" data-value="'+esc(x.value)+'"><i></i>'+esc(x.label)+'</button>').join('');
}
function installCreationShelf(){
 const root=q('#creationV200');if(!root||q('#v204CreationShelf'))return;
 const shelf=document.createElement('section');shelf.id='v204CreationShelf';shelf.className='v204-creation-shelf';
 shelf.innerHTML='<div class="v204-shelf-tabs">'+[
  ['design','Direction'],['layout','Composition'],['visual','Visuels'],['action','Actions']
 ].map((x,i)=>'<button class="v204-shelf-tab '+(i?'':'on')+'" data-group="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="v204-shelf-body"></div>';
 const intro=q('.c200-intro',root);(intro||root.firstChild)?.after?.(shelf);if(!shelf.isConnected)root.prepend(shelf);
 renderShelf(shelf,'design');
 shelf.onclick=e=>{
  const tab=e.target.closest('.v204-shelf-tab');if(tab){renderShelf(shelf,tab.dataset.group);return}
  const b=e.target.closest('.v204-shelf-choice');if(!b)return;
  const kind=b.dataset.kind,value=b.dataset.value;
  if(kind==='da')q('#creationV200 [data-c200-da="'+CSS.escape(value)+'"]')?.click();
  else if(kind==='layout')q('#creationV200 [data-c200-layout="'+CSS.escape(value)+'"]')?.click();
  else if(kind==='click'){
    const target=q('#'+CSS.escape(value));
    if(value==='c200Upload'){target?.click()}else target?.click();
  }
  qa('.v204-shelf-choice',shelf).forEach(x=>x.classList.toggle('on',x===b));
 };
}
function initials(name){return String(name||'A').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function artistHTML(a){
 const tags=Array.isArray(a.tags)?a.tags:String(a.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
 return '<article class="v204-artist-card" data-v204-artist="'+esc(a.id||'')+'"><div class="v204-artist-cover"><span class="v204-artist-avatar">'+esc(initials(a.name))+'</span></div>'+
 '<div class="v204-artist-body"><small>'+esc(a.city||a.country||'ARTISTE')+'</small><h3>'+esc(a.name||'Sans nom')+'</h3><div class="v204-artist-discipline">'+esc(a.discipline||a.medium||'Artiste visuel')+'</div>'+
 '<p>'+esc(String(a.bio||a.notes||'').slice(0,360))+'</p><div class="v204-artist-tags">'+tags.slice(0,6).map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div></article>';
}
let artistLoading=false;
async function refreshArtists(){
 const grid=q('#artistGrid');if(!grid||artistLoading)return;artistLoading=true;
 try{
  const r=await fetch('/api/artists',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
  const raw=await r.json(),items=Array.isArray(raw)?raw:(raw.artists||raw.items||[]);
  if(items.length)grid.innerHTML=items.map(artistHTML).join('');
  grid.onclick=e=>{const c=e.target.closest('.v204-artist-card');if(c)c.classList.toggle('expanded')};
 }catch(_){}
 finally{artistLoading=false}
}
function installRadarSources(){
 const view=q('#view-radar');if(!view||q('#v204RadarSources'))return;
 const sources=[
  ['Instagram · Vernissages','https://www.instagram.com/explore/tags/vernissage/'],
  ['Instagram · Open calls','https://www.instagram.com/explore/tags/opencallforartists/'],
  ['Slash Paris','https://slash-paris.com/fr/vernissages'],
  ['L’Officiel','https://www.offi.fr/expositions-musees/galeries/vernissages.html'],
  ['ArtConnect','https://www.artconnect.com/opportunities/opencalls'],
  ['FindArt','https://www.findartplatform.com/opportunities/regions/europe'],
  ['TransArtists','https://www.transartists.org/en/call-artists'],
  ['OpenCallArtist','https://www.opencallartist.com/opportunities/europe?sort=newest&type=open_call'],
  ['On the Move','https://on-the-move.org/']
 ];
 const row=document.createElement('nav');row.id='v204RadarSources';row.className='v204-radar-sources';row.setAttribute('aria-label','Sources Radar');
 row.innerHTML=sources.map(x=>'<a href="'+esc(x[1])+'" target="_blank" rel="noopener">'+esc(x[0])+'</a>').join('');
 q('.tool-layout',view)?.before(row);
}
function installBureauShortcut(){
 const view=q('#view-bureau');if(!view||q('#v204BureauNote'))return;
 const bar=document.createElement('div');bar.id='v204BureauNote';bar.className='v204-bureau-note';
 bar.innerHTML='<div><b>Bureau visuel</b> · Documents, PDF Studio, compositions, images et export.</div><button class="secondary-btn" id="v204OpenPdf">Ouvrir PDF Studio</button>';
 q('.page-toolbar',view)?.after(bar);
 q('#v204OpenPdf').onclick=()=>{const b=q('[data-bureau-mode="pdf"]');if(b){b.click();setTimeout(()=>q('#pdfTemplateGalleryV1692')?.scrollIntoView({behavior:'smooth',block:'nearest'}),80)}};
}
function reinforceSelections(){
 const selectors=[
  '#creationV200 [data-c200-da]','#creationV200 [data-c200-layout]','.map-filter-chips button',
  '.bureau-mode-bar button','.page-preset-grid button','.page-toggle-grid button','.pdf-template-gallery-v1692 button'
 ];
 selectors.forEach(s=>qa(s).forEach(b=>b.setAttribute('data-v204-control','1')));
}
function refreshEnhancements(){
 lightMeta();installPlugyMini();simplifyDashboard();installCreationShelf();installRadarSources();installBureauShortcut();reinforceSelections();
}
function boot(){
 refreshEnhancements();
 setTimeout(refreshEnhancements,300);setTimeout(refreshEnhancements,1200);
 refreshArtists();
 document.addEventListener('click',e=>{
  const r=e.target.closest('[data-route]')?.dataset.route;
  if(r==='network')setTimeout(refreshArtists,120);
  if(r==='creation')setTimeout(installCreationShelf,120);
  if(r==='bureau')setTimeout(()=>{installBureauShortcut();reinforceSelections()},180);
  if(r==='radar')setTimeout(installRadarSources,100);
 },true);
 const observer=new MutationObserver(()=>{if(q('#creationV200')&&!q('#v204CreationShelf'))installCreationShelf();if(q('#bureauPdfV167'))reinforceSelections()});
 observer.observe(document.body,{childList:true,subtree:true});
 console.info('[PLUG ART] V204 white production patch',REV);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
/* White glass + media fallbacks */
(()=>{'use strict';
const REV='207.20261015.1';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));

function forceLight(){
  const html=document.documentElement,body=document.body;
  html.dataset.plugartTheme='light';
  html.style.backgroundColor='#ffffff';
  if(!body)return;
  body.classList.add('plugart-v205');
  ['dark','dark-theme','theme-dark','theme-black','night','night-theme'].forEach(c=>{
    html.classList.remove(c);body.classList.remove(c);
  });
  body.style.backgroundColor='#f7f9fc';
  q('meta[name="theme-color"]')?.setAttribute('content','#ffffff');
}

function updateVersion(){
  const bp=q('#buildPill'),sv=q('#sidebarVersion');
  if(bp&&bp.textContent!=='V208')bp.textContent='V208';
  if(sv&&sv.textContent!=='V208')sv.textContent='V208';
}

function classifyControls(root=document){
  const selectors=[
    '.nav-item','.sidebar-collapse','.global-search','.icon-btn','.text-btn','.primary-btn','.secondary-btn','.plugy-btn','.plugy-inline',
    '.toolbar-actions button','.bureau-actions button','.editor-actions button','.copy-format-toolbar button',
    '.map-filter-chips button','.content-mode-tabs button','.segment button','.format-row button',
    '.c200-drafts button','.c200-mini-actions button','.c200-secondary',
    '#creationV200 [data-c200-layout]','#creationV200 [data-c200-da]',
    '.bureau-mode-bar button','[data-bureau-mode]','.pdf-project-actions-v167 button',
    '.pdf-reader-toolbar-v167 button','.pdf-inspector-actions-v167 button','.pdf-add-elements-v168 button',
    '.pdf-template-gallery-v1692 button','.command-result','.create-grid button',
    '#dashboardV200 .v200-command','#dashboardV200 .v200-section-head button','#dashboardV200 .v200-opp button'
  ];
  selectors.forEach(sel=>qa(sel,root).forEach(el=>el.classList.add('v205-glass')));
  qa('button',root).forEach(btn=>{
    btn.style.removeProperty('opacity');
    btn.style.removeProperty('visibility');
    if(!btn.getAttribute('aria-label')){
      const label=(btn.textContent||'').trim().replace(/\s+/g,' ').slice(0,90);
      if(label)btn.setAttribute('aria-label',label);
      else if(btn.title)btn.setAttribute('aria-label',btn.title);
    }
  });
}

function svgFallback(label='PLUG ART'){
  const safe=String(label||'PLUG ART').replace(/[&<>"']/g,'').slice(0,42);
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8faff"/><stop offset=".48" stop-color="#e9efff"/><stop offset="1" stop-color="#f5edff"/></linearGradient>'+
    '<radialGradient id="a" cx=".22" cy=".18" r=".6"><stop stop-color="#6384ff" stop-opacity=".42"/><stop offset="1" stop-color="#6384ff" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="b" cx=".8" cy=".78" r=".62"><stop stop-color="#8a68ff" stop-opacity=".28"/><stop offset="1" stop-color="#8a68ff" stop-opacity="0"/></radialGradient></defs>'+
    '<rect width="1200" height="800" rx="42" fill="url(#g)"/><rect width="1200" height="800" rx="42" fill="url(#a)"/><rect width="1200" height="800" rx="42" fill="url(#b)"/>'+
    '<circle cx="90" cy="90" r="20" fill="#315dff" opacity=".9"/><text x="90" y="660" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial" font-size="26" letter-spacing="7" fill="#315dff" opacity=".58">PLUG ART</text>'+
    '<text x="90" y="715" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial" font-size="38" font-weight="700" fill="#182033">'+safe+'</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

function installMediaFallback(root=document){
  qa('img',root).forEach(img=>{
    if(img.dataset.v205Watch)return;
    img.dataset.v205Watch='1';
    const fail=()=>{
      if(img.dataset.v205Fallback)return;
      img.dataset.v205Fallback='1';
      img.classList.add('v205-media-fallback');
      const label=img.alt||img.dataset.title||'Visuel PLUG ART';
      img.src=svgFallback(label);
      img.removeAttribute('srcset');
    };
    img.addEventListener('error',fail,{once:true});
    if(img.complete && img.naturalWidth===0 && img.getAttribute('src'))fail();
  });
}

function polishDashboard(){
  const root=q('#dashboardV200');if(!root)return;
  qa('.v200-note',root).forEach(el=>el.remove());
  qa('.v200-command',root).forEach((btn,i)=>{
    btn.classList.add('v205-glass');
    btn.dataset.v205Index=String(i+1);
  });
  const sections=qa('.v200-feed,.v200-radar-card',root);
  sections.forEach(el=>el.dataset.v205Surface='1');
}

function polishCreation(){
  const root=q('#creationV200');if(!root)return;
  root.dataset.v205Ready='1';
  classifyControls(root);
}

function polishBureau(){
  const root=q('#view-bureau');if(!root)return;
  root.dataset.v205Ready='1';
  classifyControls(root);
}

function makeMiniPlugyReliable(){
  const existing=q('#v204PlugyMini')||q('.v204-plugy-mini')||q('#v205PlugyMini');
  if(existing){
    existing.classList.add('v205-plugy-mini');
    existing.removeAttribute('hidden');
    existing.style.removeProperty('display');
    return;
  }
  const b=document.createElement('button');
  b.id='v205PlugyMini';b.className='v205-plugy-mini v205-glass';b.type='button';b.setAttribute('aria-label','Ouvrir PLUGY');
  b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:280;width:58px;height:58px;display:grid;place-items:center;border-radius:19px';
  b.innerHTML='<span style="width:35px;height:28px;border-radius:10px;background:linear-gradient(145deg,#fff,#edf2ff);border:1px solid #ccd5e6;position:relative;display:block"><i style="position:absolute;left:8px;top:10px;width:5px;height:5px;border-radius:50%;background:#315dff;box-shadow:14px 0 0 #315dff"></i></span>';
  b.onclick=()=>{
    const top=q('#topPlugy');
    if(top){top.click();return}
    q('[data-open-plugy]')?.click();
  };
  document.body.appendChild(b);
}

function refresh(){
  forceLight();
  updateVersion();
  classifyControls();
  installMediaFallback();
  polishDashboard();
  polishCreation();
  polishBureau();
  makeMiniPlugyReliable();
  window.__PLUGART_V205_READY=true;
  document.documentElement.dataset.plugartUi='207';
  window.__PLUGART_V207_READY=true;
}

let scheduled=false;
function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;refresh()});
}

function boot(){
  refresh();
  setTimeout(refresh,250);
  setTimeout(refresh,900);
  const mo=new MutationObserver(schedule);
  // Observe only inserted/removed components. The old all-attribute observer caused needless full rescans.
  mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('plugart:route',()=>setTimeout(refresh,40));
  window.addEventListener('pageshow',refresh);
  console.info('[PLUG ART] V205 white liquid-glass patch active',REV);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
/* Radar display */
(()=>{'use strict';
const REV='207.20261015.1';
const q=(s,r=document)=>r.querySelector(s);
async function install(){
  const bp=q('#buildPill'),sv=q('#sidebarVersion');
  if(bp&&bp.textContent!=='V208')bp.textContent='V208'; if(sv&&sv.textContent!=='V208')sv.textContent='V208';
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
  const mo=new MutationObserver(()=>{const bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp&&bp.textContent!=='V208')bp.textContent='V208';if(sv&&sv.textContent!=='V208')sv.textContent='V208';if((document.body?.dataset.view==='radar'||q('#view-radar.active'))&&!q('#radarDepthV206'))install()});
  mo.observe(document.body,{childList:true,subtree:true});
  console.info('[PLUG ART] Radar V206',REV);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
/* V208.2 · Floating appearance picker: light-only site visual families. */
(()=>{'use strict';
 const key='plugart:site:theme',choices=[['porcelain','Porcelaine','Clair neutre'],['glacier','Givre','Bleu givré'],['warm','Ivoire','Crème éditoriale']];
 const get=()=>{try{return localStorage.getItem(key)||'porcelain'}catch(_){return 'porcelain'}};
 function set(theme){
  const id=choices.some(c=>c[0]===theme)?theme:'porcelain';
  document.body.dataset.paTheme=id;
  try{localStorage.setItem(key,id)}catch(_){}
  document.querySelectorAll('[data-pa-theme-option]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.paThemeOption===id)));
  const trigger=document.getElementById('paThemeToggle');
  if(trigger)trigger.setAttribute('aria-label','Apparence du site : '+(choices.find(c=>c[0]===id)||choices[0])[1]);
 }
 function mount(){
  if(!document.body)return;
  set(get());
  const bar=document.querySelector('.topbar .top-actions');
  if(!bar||document.getElementById('paThemeToggle'))return;
  const holder=document.createElement('div');holder.className='pa-theme-holder';
  holder.innerHTML='<button type="button" id="paThemeToggle" aria-label="Choisir le thème du site" aria-haspopup="true" aria-expanded="false">◐ Apparence</button>'+
  '<div class="pa-theme-menu" id="paThemeMenu" role="menu" aria-label="Ambiance du site" hidden>'+
  '<small>AMBIANCE DU WORKSPACE</small>'+choices.map(c=>
   '<button type="button" role="menuitemradio" data-pa-theme-option="'+c[0]+'" aria-checked="false">'+
   '<i class="pa-theme-dot '+c[0]+'"></i><span><strong>'+c[1]+'</strong><span style="display:block;font-size:10px;font-weight:400;color:#8993a1">'+c[2]+'</span></span></button>'
  ).join('')+'</div>';
  bar.insertBefore(holder,bar.firstChild);
  const trigger=holder.querySelector('#paThemeToggle'),menu=holder.querySelector('#paThemeMenu');
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
  trigger.addEventListener('click',()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden))});
  holder.addEventListener('click',e=>{
   const opt=e.target.closest('[data-pa-theme-option]');if(opt){set(opt.dataset.paThemeOption);close();}
  });
  document.addEventListener('pointerdown',e=>{if(!holder.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  set(get());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('pageshow',mount);
})();
