(()=>{'use strict';
const REV='204.20261006.1';
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
 const bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp)bp.textContent='V204';if(sv)sv.textContent='V204';
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