(()=>{
 if(document.getElementById('plug-ui-v60-css')) return;
 const PAGES=[
  {id:'explorer',label:'Tableau de bord',short:'Accueil',icon:'⌂',group:'Pilotage'},
  {id:'opencalls',label:'Open Calls & Radar',short:'Open Calls',icon:'◎',group:'Pilotage'},
  {id:'events',label:'Événements',short:'Événements',icon:'◇',group:'Pilotage'},
  {id:'artists',label:'Artistes',short:'Artistes',icon:'◉',group:'Réseau'},
  {id:'resources',label:'Carte & lieux',short:'Carte',icon:'⌖',group:'Réseau'},
  {id:'content',label:'Création de contenu',short:'Créer',icon:'✦',group:'Production'},
  {id:'notes',label:'Notes',short:'Notes',icon:'✎',group:'Production'},
  {id:'contacts',label:'Contacts',short:'Contacts',icon:'☰',group:'Production'},
  {id:'workspace',label:'Mon espace',short:'Espace',icon:'▣',group:'Organisation'}
 ];
 const TITLES={
  explorer:['Tableau de bord','Tout ce qui compte, sans le bruit.'],
  opencalls:['Open Calls & Radar','Trouve, trie et vérifie les opportunités.'],
  events:['Événements','Les rendez-vous à garder dans ton radar.'],
  artists:['Artistes','Profils, suivi et connexions.'],
  resources:['Carte & lieux','Visualise les opportunités et les lieux.'],
  content:['Studio de contenu','Crée sans te perdre dans les réglages.'],
  notes:['Notes','Centralise les idées et prochaines actions.'],
  contacts:['Contacts','Garde les bons interlocuteurs à portée de main.'],
  workspace:['Mon espace','Priorités, suivi et organisation.']
 };

 const css=document.createElement('style');
 css.id='plug-ui-v60-css';
 css.textContent=`
 :root{
  --v60-ink:#11192d;--v60-muted:#6b7590;--v60-line:rgba(69,83,124,.15);
  --v60-glass:rgba(255,255,255,.42);--v60-glass-strong:rgba(255,255,255,.58);
  --v60-shadow:0 18px 55px rgba(54,64,103,.10);--v60-blur:blur(24px) saturate(135%);
  --v60-blue:#4d6cff;--v60-violet:#8362ff;--v60-cyan:#61dbe8;--v60-pink:#eb72c5;
 }
 html{background:#dde4ec}
 body{
  color:var(--v60-ink)!important;
  background:
   radial-gradient(circle at 8% 8%,rgba(116,214,232,.28),transparent 26%),
   radial-gradient(circle at 92% 10%,rgba(159,128,236,.24),transparent 30%),
   radial-gradient(circle at 75% 88%,rgba(235,142,204,.20),transparent 27%),
   linear-gradient(135deg,#dce5ec 0%,#e3dfeb 48%,#dbe8e8 100%)!important;
  min-height:100vh!important;background-attachment:fixed!important;
 }
 body:before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;background:linear-gradient(120deg,rgba(255,255,255,.12),rgba(255,255,255,0) 36%,rgba(255,255,255,.14));}
 .shell{max-width:none!important;margin:0!important;padding:16px 28px 52px 270px!important;transition:padding .25s ease}
 .header{
  height:68px!important;position:sticky!important;top:16px!important;z-index:110!important;
  display:flex!important;align-items:center!important;gap:16px!important;
  padding:0 16px!important;margin-bottom:18px!important;
  border:1px solid var(--v60-line)!important;border-radius:22px!important;
  background:rgba(255,255,255,.43)!important;box-shadow:var(--v60-shadow)!important;
  backdrop-filter:var(--v60-blur)!important;-webkit-backdrop-filter:var(--v60-blur)!important;
 }
 .header .brand,.header .nav{display:none!important}
 .head-actions{margin-left:auto!important}
 .space-btn,.primary,.soft,.ghost,.micro,.chip,.segment button,.format-row button,.dot,.editor-actions button,.content-mode-tabs button,.preset,.float-btn{
  border:1px solid rgba(79,91,132,.16)!important;
  background:rgba(255,255,255,.40)!important;color:#24314f!important;
  box-shadow:0 8px 20px rgba(66,75,111,.06)!important;
  backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;
  transition:transform .16s ease,background .16s ease,border-color .16s ease,box-shadow .16s ease!important;
 }
 .space-btn:hover,.primary:hover,.soft:hover,.ghost:hover,.micro:hover,.chip:hover,.segment button:hover,.format-row button:hover,.dot:hover,.editor-actions button:hover,.content-mode-tabs button:hover,.preset:hover,.float-btn:hover{
  transform:translateY(-1px);background:rgba(255,255,255,.62)!important;border-color:rgba(93,104,154,.25)!important;
 }
 .primary,.space-btn{
  background:linear-gradient(135deg,rgba(76,103,255,.78),rgba(130,86,255,.70))!important;
  color:#fff!important;border-color:rgba(255,255,255,.32)!important;
 }
 .segment button.on,.format-row button.on,.content-mode-tabs button.on,.dot.on{
  background:rgba(92,83,221,.15)!important;color:#4d45c9!important;border-color:rgba(92,83,221,.25)!important;
 }
 input,select,textarea,.chat-form{
  background:rgba(255,255,255,.34)!important;border:1px solid rgba(74,88,130,.15)!important;color:#24314b!important;
  backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;box-shadow:none!important;
 }
 input:focus,select:focus,textarea:focus{outline:none!important;border-color:rgba(83,98,204,.38)!important;background:rgba(255,255,255,.54)!important}
 .card,.studio-panel,.plugy-panel,.studio-preview,.page-hero,.map,.radar-dark,.caption-box,.draft,.intro,.cat,.float-chat{
  background:var(--v60-glass)!important;border:1px solid var(--v60-line)!important;
  box-shadow:var(--v60-shadow)!important;backdrop-filter:var(--v60-blur)!important;-webkit-backdrop-filter:var(--v60-blur)!important;
 }
 .page-hero{padding:22px 24px!important;margin:6px 0 16px!important;border-radius:24px!important;overflow:hidden!important}
 .page-hero:after{opacity:.28!important}
 .page-hero h1{font-size:34px!important;letter-spacing:-1.8px!important;margin:6px 0 4px!important}
 .page-hero p{font-size:13px!important;max-width:760px!important}
 .page-hero small{letter-spacing:2.5px!important}
 .card{border-radius:18px!important;padding:15px!important}
 .grid{gap:12px!important}
 .opp:before{height:2px!important;opacity:.65}
 .opp h3,.event h3,.artist h3{font-size:16px!important}
 .opp p,.event p,.artist p,.resource p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;color:#6f7892!important}
 .reason{background:rgba(255,255,255,.28)!important;color:#68718a!important;border:1px solid rgba(77,90,130,.10)!important}
 .thumb{height:125px!important;border-radius:14px!important}
 .score{background:rgba(105,91,239,.10)!important;color:#5548cf!important}
 .fav{background:rgba(255,255,255,.55)!important;backdrop-filter:blur(12px)!important}
 .map{background:rgba(255,255,255,.28)!important}
 .radar-dark{color:#172038!important;min-height:185px!important}
 .radar-dark p{color:#68738f!important}
 .studio-panel{border-radius:19px!important;padding:14px!important}
 .studio-preview{border-radius:20px!important;background:rgba(255,255,255,.28)!important;min-height:650px!important}
 .studio-shell{gap:12px!important}
 .filters{padding:10px!important;border:1px solid var(--v60-line);background:rgba(255,255,255,.25);border-radius:16px;backdrop-filter:blur(16px)}
 .stats{max-width:none!important;border:0!important;gap:9px!important;margin-top:18px!important;padding:0!important}
 .metric{border:1px solid var(--v60-line)!important;background:rgba(255,255,255,.28)!important;border-radius:17px!important;padding:14px 16px!important;backdrop-filter:blur(16px)}
 .metric strong{font-size:24px!important}
 .quote{border:1px solid var(--v60-line);background:rgba(255,255,255,.24);border-radius:17px;padding:14px 16px!important}
 .category-strip{display:none!important}

 .v60-sidebar{
  position:fixed;left:16px;top:16px;bottom:16px;width:232px;z-index:180;
  display:flex;flex-direction:column;padding:18px 14px;border-radius:26px;
  background:rgba(255,255,255,.42);border:1px solid rgba(71,84,125,.15);
  box-shadow:0 24px 70px rgba(51,61,101,.12);backdrop-filter:blur(28px) saturate(140%);-webkit-backdrop-filter:blur(28px) saturate(140%);
 }
 .v60-brand{display:flex;align-items:center;gap:10px;padding:6px 8px 18px;border-bottom:1px solid rgba(81,94,132,.12);margin-bottom:12px}
 .v60-brand b{font-size:22px;letter-spacing:-1.3px}.v60-brand b span{font-weight:300}.v60-orb{width:19px;height:19px;border-radius:50%;background:conic-gradient(#ee72c8,#8062ff,#5edce8,#ee72c8);box-shadow:0 0 22px rgba(113,83,255,.25)}
 .v60-brand small{display:block;font-size:8px;color:#7a8399;margin-top:2px;letter-spacing:1.1px}
 .v60-side-scroll{overflow:auto;min-height:0;padding-right:2px;scrollbar-width:none}.v60-side-scroll::-webkit-scrollbar{display:none}
 .v60-group{font-size:8px;letter-spacing:1.8px;text-transform:uppercase;color:#939aab;margin:15px 10px 6px}
 .v60-nav-btn{width:100%;display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#59637a;padding:10px 11px;border-radius:14px;text-align:left;font-size:12px;font-weight:650;margin:2px 0;transition:.16s}
 .v60-nav-btn .ico{width:26px;height:26px;display:grid;place-items:center;border-radius:9px;background:rgba(255,255,255,.32);font-size:14px}
 .v60-nav-btn:hover{background:rgba(255,255,255,.43);color:#222c47}
 .v60-nav-btn.active{background:rgba(255,255,255,.60);color:#1a2340;box-shadow:0 9px 24px rgba(65,75,116,.07)}
 .v60-nav-btn.active .ico{background:linear-gradient(135deg,rgba(80,108,255,.18),rgba(221,100,202,.15));color:#5a50d8}
 .v60-side-foot{margin-top:auto;padding:12px 9px 4px;color:#8790a5;font-size:9px;line-height:1.45}
 .v60-top-copy{min-width:0}
 .v60-top-title{font-size:15px;font-weight:850;letter-spacing:-.35px;color:#202942}
 .v60-top-sub{font-size:9.5px;color:#7b8498;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}

 #explorer .hero{min-height:410px!important;padding:24px!important;border-radius:26px!important;background:rgba(255,255,255,.30)!important;border:1px solid var(--v60-line)!important;box-shadow:var(--v60-shadow)!important;backdrop-filter:var(--v60-blur)!important}
 #explorer .hero-title{font-size:54px!important;letter-spacing:-3px!important}
 #explorer .hero-title span{font-size:30px!important;letter-spacing:-1.5px!important;margin-top:10px!important}
 #explorer .eyebrow{margin-bottom:15px!important;letter-spacing:3px!important}
 #explorer .hero-copy p{font-size:13px!important;margin:16px 0!important;max-width:410px!important}
 #plugyStageV59{min-height:370px!important}
 #plugyStageV59 .v59-visual{height:370px!important}
 #explorer .hero>.plugy-panel{min-height:370px!important}
 .v60-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:12px 0 0}
 .v60-quick button{border:1px solid var(--v60-line);background:rgba(255,255,255,.28);backdrop-filter:blur(15px);border-radius:15px;padding:13px;text-align:left;color:#26314c;font-size:11px;font-weight:750}
 .v60-quick button span{display:block;font-size:8px;font-weight:500;color:#7c859a;margin-top:3px}

 .v60-mobile-nav,.v60-more-sheet,.v60-mobile-menu{display:none}

 @media(max-width:1180px){
  .shell{padding-left:24px!important}
  .v60-sidebar{display:none!important}
  .header .brand{display:flex!important}
  .v60-top-copy{display:none!important}
  .header{top:10px!important}
  .v60-mobile-menu{display:flex!important;margin-left:auto;border:1px solid var(--v60-line);background:rgba(255,255,255,.35);border-radius:12px;width:40px;height:40px;align-items:center;justify-content:center;color:#26304a}
  .head-actions{display:none!important}
 }
 @media(max-width:760px){
  body{padding-bottom:86px!important}
  .shell{padding:10px 10px 32px!important}
  .header{height:58px!important;top:8px!important;border-radius:18px!important;margin-bottom:11px!important;padding:0 12px!important}
  .header .brand-main{font-size:20px!important}.header .brand-sub{display:none!important}.header .brand-orb{width:18px!important;height:18px!important}
  .page-hero{padding:17px!important;border-radius:20px!important}
  .page-hero h1{font-size:29px!important}.page-hero p{font-size:12px!important}
  .grid{grid-template-columns:1fr!important}
  .studio-shell{grid-template-columns:1fr!important}
  .studio-preview{grid-column:auto!important;grid-row:auto!important;min-height:auto!important}
  .radar-layout{grid-template-columns:1fr!important}
  .filters{display:grid!important;grid-template-columns:1fr 1fr!important}
  .filters input{grid-column:1/-1;min-width:0!important;width:100%!important}
  .stats{grid-template-columns:1fr 1fr!important}
  .v60-quick{grid-template-columns:1fr 1fr!important}
  #explorer .hero{padding:18px 14px 22px!important;min-height:auto!important}
  #explorer .hero-title{font-size:43px!important}
  #explorer .hero-title span{font-size:23px!important}
  #explorer .hero-copy p{font-size:12.5px!important}
  #plugyStageV59,#plugyStageV59 .v59-visual{min-height:195px!important;height:195px!important}
  .v60-mobile-nav{
   display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:9px;right:9px;bottom:9px;height:66px;z-index:250;
   padding:6px;border:1px solid rgba(75,88,127,.16);border-radius:22px;background:rgba(247,249,253,.66);
   box-shadow:0 18px 50px rgba(49,58,94,.17);backdrop-filter:blur(28px) saturate(145%);-webkit-backdrop-filter:blur(28px) saturate(145%);
  }
  .v60-mobile-nav button{border:0;background:transparent;color:#70798e;border-radius:15px;display:grid;place-items:center;align-content:center;gap:2px;font-size:8px;font-weight:700}
  .v60-mobile-nav button b{font-size:16px;line-height:1;font-weight:500}
  .v60-mobile-nav button.active{background:rgba(255,255,255,.64);color:#4f47cc}
  .v60-more-sheet{
   position:fixed;left:12px;right:12px;bottom:84px;z-index:249;padding:12px;border:1px solid var(--v60-line);border-radius:20px;
   background:rgba(246,248,252,.78);box-shadow:0 18px 55px rgba(51,60,99,.17);backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px);
  }
  .v60-more-sheet.open{display:grid!important;grid-template-columns:1fr 1fr;gap:8px}
  .v60-more-sheet button{border:1px solid var(--v60-line);background:rgba(255,255,255,.36);border-radius:14px;padding:12px;text-align:left;color:#33405b;font-size:11px}
  .float-btn{bottom:86px!important;right:12px!important}
  .float-chat{bottom:136px!important;right:10px!important;width:calc(100vw - 20px)!important;height:min(470px,65vh)!important}
 }
 `;
 document.head.appendChild(css);

 function go(id){
  const target=[...document.querySelectorAll('[data-page]')].find(x=>x.dataset.page===id);
  if(target){target.click()} else {location.hash='#'+id}
  sync(id)
 }
 function sync(id){
  const p=PAGES.find(x=>x.id===id)||PAGES[0];
  document.querySelectorAll('.v60-nav-btn,[data-v60-mobile]').forEach(b=>b.classList.toggle('active',b.dataset.v60Page===p.id));
  const t=TITLES[p.id]||TITLES.explorer;
  const title=document.querySelector('.v60-top-title'),sub=document.querySelector('.v60-top-sub');
  if(title) title.textContent=t[0]; if(sub) sub.textContent=t[1];
  document.querySelector('.v60-more-sheet')?.classList.remove('open');
 }

 function buildSidebar(){
  if(document.getElementById('v60Sidebar'))return;
  const side=document.createElement('aside');side.id='v60Sidebar';side.className='v60-sidebar';
  side.innerHTML='<div class="v60-brand"><div><b>PLUG <span>ART</span></b><small>DASHBOARD INTERNE</small></div><i class="v60-orb"></i></div><div class="v60-side-scroll"></div><div class="v60-side-foot">PLUGY · Assistant créatif<br>Interface simplifiée</div>';
  const scroll=side.querySelector('.v60-side-scroll');
  let group='';
  PAGES.forEach(p=>{
   if(p.group!==group){group=p.group;scroll.insertAdjacentHTML('beforeend',`<div class="v60-group">${group}</div>`)}
   const b=document.createElement('button');b.className='v60-nav-btn';b.dataset.v60Page=p.id;b.innerHTML=`<span class="ico">${p.icon}</span><span>${p.label}</span>`;b.onclick=()=>go(p.id);scroll.appendChild(b)
  });
  document.body.appendChild(side)
 }

 function buildTop(){
  const h=document.querySelector('.header');if(!h||h.querySelector('.v60-top-copy'))return;
  const d=document.createElement('div');d.className='v60-top-copy';d.innerHTML='<div class="v60-top-title">Tableau de bord</div><div class="v60-top-sub">Tout ce qui compte, sans le bruit.</div>';
  h.insertBefore(d,h.firstChild);
  const menu=document.createElement('button');menu.className='v60-mobile-menu';menu.setAttribute('aria-label','Ouvrir la navigation');menu.textContent='☰';
  menu.onclick=()=>document.querySelector('.v60-more-sheet')?.classList.toggle('open');
  h.appendChild(menu)
 }

 function buildMobile(){
  if(document.getElementById('v60MobileNav'))return;
  const nav=document.createElement('nav');nav.id='v60MobileNav';nav.className='v60-mobile-nav';
  const main=['explorer','opencalls','artists','content'];
  main.forEach(id=>{const p=PAGES.find(x=>x.id===id);const b=document.createElement('button');b.dataset.v60Mobile='1';b.dataset.v60Page=id;b.innerHTML=`<b>${p.icon}</b><span>${p.short}</span>`;b.onclick=()=>go(id);nav.appendChild(b)});
  const more=document.createElement('button');more.dataset.v60Mobile='1';more.innerHTML='<b>•••</b><span>Plus</span>';more.onclick=()=>document.querySelector('.v60-more-sheet')?.classList.toggle('open');nav.appendChild(more);
  document.body.appendChild(nav);
  const sheet=document.createElement('div');sheet.className='v60-more-sheet';
  ['events','resources','notes','contacts','workspace'].forEach(id=>{const p=PAGES.find(x=>x.id===id);const b=document.createElement('button');b.textContent=p.icon+'  '+p.label;b.onclick=()=>go(id);sheet.appendChild(b)});
  document.body.appendChild(sheet)
 }

 function simplifyHome(){
  const hero=document.querySelector('#explorer .hero');if(!hero)return;
  const eye=hero.querySelector('.eyebrow');if(eye)eye.textContent='TABLEAU DE BORD';
  const title=hero.querySelector('.hero-title');if(title)title.innerHTML='<b>PLUG</b> ART<span>Ton espace de pilotage créatif.</span>';
  const p=hero.querySelector('.hero-copy p');if(p)p.textContent='Opportunités, artistes, lieux et contenus réunis dans une interface claire pour passer rapidement à l’action.';
  const acts=hero.querySelector('.actions');if(acts){
   const buttons=acts.querySelectorAll('button');if(buttons[0])buttons[0].textContent='Voir les Open Calls';if(buttons[1])buttons[1].textContent='Créer du contenu';
  }
  if(!document.querySelector('.v60-quick')){
   const q=document.createElement('div');q.className='v60-quick';
   [['opencalls','Open Calls','Opportunités vérifiées'],['artists','Artistes','Suivi des profils'],['resources','Carte','Lieux & géographie'],['content','Studio','Créer & publier']].forEach(x=>{const b=document.createElement('button');b.innerHTML=x[1]+'<span>'+x[2]+'</span>';b.onclick=()=>go(x[0]);q.appendChild(b)});
   hero.parentElement.insertBefore(q,hero.nextSibling)
  }
 }

 function boot(){
  buildSidebar();buildTop();buildMobile();simplifyHome();
  const current=(location.hash||'#explorer').slice(1);sync(current);
  window.addEventListener('hashchange',()=>sync((location.hash||'#explorer').slice(1)));
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)setTimeout(()=>sync(b.dataset.page),0)},{passive:true})
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();