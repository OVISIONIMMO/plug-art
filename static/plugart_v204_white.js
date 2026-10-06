(()=>{'use strict';
const V='204.20261006.1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function go(id){
  if(typeof window.page==='function'){try{window.page(id);return}catch(_){}}
  qa('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  qa('.nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  try{history.pushState(null,'','#'+id)}catch(_){}
  scrollTo({top:0,behavior:'smooth'});
}
function installNav(){
  const nav=q('.nav'); if(!nav)return;
  nav.innerHTML=[
    ['explorer','Dashboard'],['workspace','Radar'],['content','Création'],['artists','Artistes'],
    ['office','Bureau'],['resources','Carte'],['events','Agenda'],['contacts','Contacts']
  ].map(([id,label],i)=>'<button '+(i?'':'class="active"')+' data-page="'+id+'">'+label+'</button>').join('');
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){e.preventDefault();go(b.dataset.page)}});
}
function installDashboard(){
  const v=q('#explorer');if(!v||q('#pa204Dashboard'))return;
  const box=document.createElement('section');box.id='pa204Dashboard';box.className='pa204-dashboard';
  box.innerHTML='<div class="pa204-dash-head"><div><h1>Tableau de bord</h1><p>Accès direct aux outils PLUG ART.</p></div><div class="pa204-dash-state"><span class="pa204-pill"><i></i>Radar actif</span><span class="pa204-pill">PLUGY disponible</span></div></div>'+
  '<div class="pa204-tools">'+
  [
    ['workspace','radar','⌁','Radar','Open calls, vernissages et nouvelles pistes'],
    ['content','creation','✦','Création','Carrousels, posts, stories et contenus'],
    ['artists','artists','A','Artistes','Profils, parcours et matières éditoriales'],
    ['office','office','▤','Bureau','Dossiers, PDF et présentations'],
    ['resources','map','⌖','Carte','Repérage rapide par zone'],
    ['events','events','◷','Agenda','Expositions, événements et rendez-vous']
  ].map(x=>'<button class="pa204-tool '+x[1]+'" data-page="'+x[0]+'"><span class="pa204-tool-icon">'+x[2]+'</span><b>'+x[3]+'</b><span>'+x[4]+'</span><strong>→</strong></button>').join('')+
  '</div>';
  v.prepend(box);
  box.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)go(b.dataset.page)});
  const stats=q('#homeStats');if(stats){
    const mo=new MutationObserver(()=>qa('.quote',stats).forEach(x=>x.remove()));
    mo.observe(stats,{childList:true,subtree:true});qa('.quote',stats).forEach(x=>x.remove());
  }
}
function initials(name){return String(name||'A').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function artistCard(a){
  const tags=Array.isArray(a.tags)?a.tags:String(a.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
  return '<article class="card pa204-artist" data-artist-id="'+esc(a.id)+'">'+
    '<div class="pa204-artist-visual"><span class="pa204-artist-monogram">'+esc(initials(a.name))+'</span></div>'+
    '<div class="pa204-artist-body"><small>'+esc(a.city||a.country||'ARTISTE')+'</small><h3>'+esc(a.name||'Sans nom')+'</h3>'+
    '<div class="discipline">'+esc(a.discipline||'Artiste visuel')+'</div><p>'+esc((a.bio||'').slice(0,320))+'</p>'+
    '<div class="pa204-tags">'+tags.slice(0,5).map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div></article>';
}
async function refreshArtists(){
  const grid=q('#artistGrid');if(!grid)return;
  try{
    const r=await fetch('/api/artists',{cache:'no-store'});if(!r.ok)throw new Error();
    const data=await r.json();grid.innerHTML=(Array.isArray(data)?data:[]).map(artistCard).join('')||'<div class="empty">Aucun profil artiste.</div>';
    grid.addEventListener('click',e=>{const c=e.target.closest('.pa204-artist');if(c)c.classList.toggle('expanded')},{once:false});
  }catch(_){}
}
function installArtists(){
  const v=q('#artists');if(!v)return;
  const hero=q('.page-hero',v);if(hero){
    hero.innerHTML='<div><small>ARTISTES</small><h1>Profils artistes</h1><p>Profils internes, parcours, disciplines et contenus exploitables.</p></div><button class="soft" data-page="content">Créer depuis un artiste</button>';
    q('[data-page="content"]',hero)?.addEventListener('click',()=>go('content'));
  }
  refreshArtists();
}
const officeTemplates=[
  ['Dossier institutionnel','Projet, partenaires, impact territorial et plan d’action.'],
  ['Deck partenariat','Présentation courte, visuelle et orientée décision.'],
  ['Open Call','Appel à candidatures avec visuels, critères et calendrier.'],
  ['Projet HUB','Vision du lieu, usages, programmation et projection spatiale.'],
  ['Rapport exposition','Bilan illustré, fréquentation, artistes et retombées.'],
  ['Proposition lieu','Concept, implantation, bénéfices et scénarios visuels.']
];
function installOffice(){
  if(q('#office'))return;
  const main=q('main');if(!main)return;
  const s=document.createElement('section');s.className='view';s.id='office';
  s.innerHTML='<div class="pa204-office-head"><div><h1>Bureau</h1><p>PDF, dossiers et présentations avec une logique plus visuelle, proche d’un deck.</p></div><span class="pa204-pill">6 directions prêtes</span></div>'+
    '<div class="pa204-office-grid">'+officeTemplates.map((t,i)=>'<button class="pa204-doc '+(i===0?'on':'')+'" data-office="'+i+'"><div class="pa204-doc-preview"><div class="pa204-slide-surface"></div></div><div class="pa204-doc-copy"><b>'+esc(t[0])+'</b><span>'+esc(t[1])+'</span></div></button>').join('')+'</div>'+
    '<div class="pa204-office-actions"><button class="primary" id="pa204UseOffice">Utiliser ce modèle dans Création</button><button class="soft" id="pa204PreviewOffice">Prévisualiser le style</button></div>';
  main.appendChild(s);
  const modal=document.createElement('div');modal.className='pa204-preview-modal';modal.id='pa204OfficePreview';
  modal.innerHTML='<div class="pa204-preview-sheet"><button class="pa204-preview-close" aria-label="Fermer">×</button><small>PLUG ART · BUREAU</small><h2>'+officeTemplates[0][0]+'</h2><p>'+officeTemplates[0][1]+'</p><div class="visual"></div></div>';
  document.body.appendChild(modal);
  let selected=0;
  s.addEventListener('click',e=>{const d=e.target.closest('[data-office]');if(!d)return;selected=Number(d.dataset.office)||0;qa('[data-office]',s).forEach(x=>x.classList.toggle('on',x===d))});
  q('#pa204PreviewOffice').onclick=()=>{const t=officeTemplates[selected];q('.pa204-preview-sheet h2',modal).textContent=t[0];q('.pa204-preview-sheet p',modal).textContent=t[1];modal.classList.add('open')};
  q('.pa204-preview-close',modal).onclick=()=>modal.classList.remove('open');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
  q('#pa204UseOffice').onclick=()=>{const t=officeTemplates[selected];go('content');setTimeout(()=>{const brief=q('#carouselBrief');if(brief)brief.value='Créer un '+t[0]+' PLUG ART. '+t[1];const obj=q('#carouselObjective');if(obj)obj.value='inform';q('#carouselBrief')?.focus()},80)};
}
const paletteGroups={
  format:[
    ['Carrousel 4:5','ratio','4:5','blue'],['Carré 1:1','ratio','1:1',''],['Story 9:16','ratio','9:16','pink'],
    ['Post simple','mode','post',''],['DM / prospection','mode','dm','dark']
  ],
  design:[
    ['PLUG clair','theme','gradient','blue'],['Minimal blanc','theme','gradient',''],['Éditorial','theme','photo','photo'],
    ['Photo immersive','theme','photo','photo'],['Impact sombre','theme','dark','dark'],['Urgence','theme','urgent','pink'],
    ['Galerie','theme','gradient',''],['Culture urbaine','theme','dark','dark']
  ],
  content:[
    ['Open Call','preset','opportunity','blue'],['Dernier jour','preset','urgent','pink'],['Événement','preset','event',''],['Focus artiste','preset','artist','photo'],
    ['Source Radar','focus','carouselSource',''],['Brief libre','focus','carouselBrief','']
  ],
  tools:[
    ['Générer','click','generateCarousel','blue'],['Améliorer avec PLUGY','click','improveCarousel','pink'],['Exporter tout','click','downloadAllSlides',''],['Sauvegarder','click','saveDraft',''],['Copier les textes','click','copyCarousel','']
  ]
};
function paletteButtons(group){return paletteGroups[group].map(x=>'<button class="pa204-choice" data-kind="'+x[1]+'" data-value="'+x[2]+'" '+(x[3]?'data-accent="'+x[3]+'"':'')+'><i></i>'+x[0]+'</button>').join('')}
function activatePalette(root,group){
  qa('.pa204-tab',root).forEach(b=>b.classList.toggle('on',b.dataset.group===group));
  const body=q('.pa204-palette-body',root);body.innerHTML=paletteButtons(group);body.dataset.group=group;
}
function installCreationPalette(){
  const v=q('#content');if(!v||q('#pa204CreatePalette'))return;
  const p=document.createElement('div');p.className='pa204-create-palette';p.id='pa204CreatePalette';
  p.innerHTML='<div class="pa204-palette-tabs">'+[['format','Formats'],['design','Design'],['content','Contenu'],['tools','Actions']].map((x,i)=>'<button class="pa204-tab '+(i?'':'on')+'" data-group="'+x[0]+'">'+x[1]+'</button>').join('')+'</div><div class="pa204-palette-body"></div>';
  const hero=q('.page-hero',v);hero?.after(p);activatePalette(p,'format');
  p.addEventListener('click',e=>{
    const tab=e.target.closest('[data-group].pa204-tab');if(tab){activatePalette(p,tab.dataset.group);return}
    const b=e.target.closest('.pa204-choice');if(!b)return;
    const kind=b.dataset.kind,val=b.dataset.value;
    if(kind==='ratio'){const target=q('.format-row [data-ratio="'+CSS.escape(val)+'"]');target?.click()}
    if(kind==='mode'){q('[data-content-mode="'+CSS.escape(val)+'"]')?.click()}
    if(kind==='theme'){q('#themeButtons [data-theme="'+CSS.escape(val)+'"]')?.click()}
    if(kind==='preset'){q('.preset[data-preset="'+CSS.escape(val)+'"]')?.click()}
    if(kind==='focus'){const el=q('#'+val);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus()}
    if(kind==='click'){q('#'+val)?.click()}
    qa('.pa204-choice',p).forEach(x=>x.classList.toggle('on',x===b));
  });
  const ph=q('.page-hero',v);if(ph)ph.innerHTML='<small>CRÉATION</small><h1>Studio de contenu</h1><p>Formats, direction artistique, sources et actions sont regroupés dans une palette unique.</p>';
}
function installRadarNetwork(){
  const v=q('#workspace');if(!v||q('#pa204RadarNetworks'))return;
  const names=['Instagram','Facebook Events','Eventbrite','LinkedIn','ArtConnect','On the Move','OpenCallArtist','FindArt','CNAP','Mairies','Tiers-lieux','Galeries','Hôtels / restaurants','Centres commerciaux'];
  const row=document.createElement('div');row.id='pa204RadarNetworks';row.className='pa204-radar-networks';
  row.innerHTML=names.map((n,i)=>'<span class="pa204-network">'+(i<4?'<b>'+n+'</b>':n)+'</span>').join('');
  q('.radar-layout',v)?.before(row);
  const hero=q('.page-hero',v);if(hero)hero.innerHTML='<small>RADAR</small><h1>Recherche opportunités</h1><p>Open calls, expositions collectives, vernissages et lieux à prospecter.</p>';
}
function installPlugyMini(){
  if(q('#pa204Plugy'))return;
  const b=document.createElement('button');b.id='pa204Plugy';b.className='pa204-plugy';b.type='button';b.setAttribute('aria-label','Ouvrir PLUGY');
  b.innerHTML='<span class="pa204-plugy-head"><span class="pa204-plugy-eyes"><i></i><i></i></span></span><span class="pa204-plugy-dot"></span>';
  document.body.appendChild(b);
  b.onclick=()=>{
    const launcher=q('#plugyFlowLauncher');if(launcher){launcher.click();return}
    q('#floatBtn')?.click();
  };
}
function normalizeButtons(){
  qa('.content-mode-tabs button,.segment button,.format-row button,.editor-actions button,.studio-actions button,.filters select,.filters input').forEach(el=>el.setAttribute('data-pa-control','1'));
}
function bindGlobalRoute(){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.closest('.nav'))return;if(b.dataset.page==='office'||b.closest('#pa204Dashboard')){e.preventDefault();go(b.dataset.page)}},true);
  addEventListener('popstate',()=>{const id=location.hash.slice(1);if(id&&q('#'+CSS.escape(id)))go(id)});
}
function boot(){
  document.documentElement.dataset.plugartUi='204';
  installNav();installDashboard();installOffice();installArtists();installCreationPalette();installRadarNetwork();installPlugyMini();normalizeButtons();bindGlobalRoute();
  if(location.hash==='#office')go('office');
  document.addEventListener('click',e=>{if(e.target.closest('[data-page="artists"]'))setTimeout(refreshArtists,180)},true);
  setTimeout(refreshArtists,900);
  console.info('[PLUG ART] V204 interface blanche active',V);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();