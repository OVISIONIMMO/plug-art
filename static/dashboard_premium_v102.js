/* ===== static/dashboard_v86_quality.js ===== */
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
window.PLUGQuality={calibrate};
})();
;

/* ===== static/dashboard_v90_shell.js ===== */
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,state,view,esc}=P;

const pageMeta={
  dashboard:{eyebrow:'CONTROL ROOM',kicker:'PLUG ART',desc:'Priorités, signaux, création et suivi en un seul point.'},
  radar:{eyebrow:'DISCOVERY',kicker:'RADAR',desc:'Cherche, qualifie et hiérarchise les opportunités adaptées aux artistes émergents.'},
  opencalls:{eyebrow:'OPPORTUNITIES',kicker:'OPEN CALLS',desc:'Décide rapidement quoi vérifier, candidater, archiver ou transformer en contenu.'},
  studio:{eyebrow:'CREATE',kicker:'STUDIO SOCIAL',desc:'Compose tes carrousels, stories et publications avec un vrai espace de production.'},
  social:{eyebrow:'DISTRIBUTE',kicker:'INSTAGRAM',desc:'Feed, planning, commentaires, publication et connexion Meta dans le même flux.'},
  map:{eyebrow:'EXPLORE',kicker:'CARTE',desc:'Visualise les expositions et opportunités par territoire, ville et pays.'},
  artists:{eyebrow:'NETWORK',kicker:'ARTISTES',desc:'Construis un réseau vivant de profils, portfolios, œuvres et contacts.'},
  crm:{eyebrow:'RELATIONSHIPS',kicker:'CRM',desc:'Pilote les prospects, relances, rendez-vous et partenaires sans perdre le fil.'},
  builder:{eyebrow:'SYSTEM',kicker:'INTERFACE LAB',desc:'Reconstruis le design system, teste les responsive states et explore PLUGY 2.0.'}
};

const cues={
  dashboard:'Je peux te faire un brief des priorités ou lancer directement une action.',
  radar:'Je peux trier le Radar par accessibilité, urgence, ville ou type d’exposition.',
  opencalls:'Donne-moi une ville, un budget ou une discipline et je peux filtrer avec toi.',
  studio:'Je peux transformer une opportunité en structure de carrousel prête à éditer.',
  social:'Je peux analyser ton feed réel, le planning et la file de publication.',
  map:'Je peux t’aider à repérer les zones actives et les opportunités par territoire.',
  artists:'Je peux préparer une fiche artiste, un résumé ou une sélection de profils.',
  crm:'Je peux résumer les relances à faire et t’aider à préparer le prochain contact.',
  builder:'Je peux t’aider à arbitrer la structure, les composants et la prochaine forme de PLUGY.'
};

let commandItems=[];
let commandActive=0;
let cueTimer=0;

function decorateSectionBars(){
  Object.entries(pageMeta).forEach(([id,m])=>{
    if(id==='dashboard')return;
    const viewEl=q('#view-'+id),bar=viewEl?.querySelector('.section-bar'),h1=bar?.querySelector('h1');
    if(!bar||!h1||bar.querySelector('.v89-section-copy'))return;
    const wrap=document.createElement('div');
    wrap.className='v89-section-copy';
    const kicker=document.createElement('small');
    kicker.className='v89-section-kicker';
    kicker.textContent=m.kicker;
    const desc=document.createElement('p');
    desc.className='v89-section-desc';
    desc.textContent=m.desc;
    h1.parentNode.insertBefore(wrap,h1);
    wrap.append(kicker,h1,desc);
  });
}

function syncPageChrome(){
  const id=document.body.dataset.view||'dashboard',m=pageMeta[id]||pageMeta.dashboard;
  const eye=q('#pageEyebrow');if(eye)eye.textContent=m.eyebrow;
  const title=q('#pageTitle');if(title&&id==='opencalls')title.textContent='Opportunités';
  showCue(id);
}

function showCue(id){
  const el=q('#v90PlugyCue');if(!el)return;
  const text=el.querySelector('span');if(text)text.textContent=cues[id]||'PLUGY est prêt.';
  clearTimeout(cueTimer);
  el.classList.remove('show');
  setTimeout(()=>el.classList.add('show'),260);
  cueTimer=setTimeout(()=>el.classList.remove('show'),3800);
}

function setupSidebar(){
  const key='plugart_v89_sidebar';
  const collapsed=localStorage.getItem(key)==='collapsed';
  document.body.dataset.sidebar=collapsed?'collapsed':'open';
  q('#sidebarCollapse')?.addEventListener('click',()=>{
    const next=document.body.dataset.sidebar==='collapsed'?'open':'collapsed';
    document.body.dataset.sidebar=next;
    localStorage.setItem(key,next);
    setTimeout(syncPlugyHero,300);
  });
}

function openOverlay(id){
  closeOverlays();
  const el=q('#'+id);if(!el)return;
  el.classList.add('open');el.setAttribute('aria-hidden','false');
  document.body.dataset.overlay='1';
}
function closeOverlays(){
  qa('.v89-overlay.open').forEach(el=>{el.classList.remove('open');el.setAttribute('aria-hidden','true')});
  delete document.body.dataset.overlay;
}
qa('[data-v89-close]').forEach(b=>b.addEventListener('click',closeOverlays));

function navItems(){
  return [
    {icon:'⌂',title:'Accueil',sub:'Control Room',kind:'Page',run:()=>view('dashboard')},
    {icon:'◉',title:'Radar',sub:'Chercher et qualifier les opportunités',kind:'Page',run:()=>view('radar')},
    {icon:'◇',title:'Opportunités',sub:'Open calls vérifiés et prioritaires',kind:'Page',run:()=>view('opencalls')},
    {icon:'✦',title:'Studio Social',sub:'Créer un carrousel, post ou story',kind:'Page',run:()=>view('studio')},
    {icon:'◎',title:'Instagram',sub:'Feed, planning et publication',kind:'Page',run:()=>view('social')},
    {icon:'⌖',title:'Carte internationale',sub:'Explorer par territoire',kind:'Page',run:()=>view('map')},
    {icon:'◌',title:'Artistes',sub:'Profils, portfolios et réseau',kind:'Page',run:()=>view('artists')},
    {icon:'▦',title:'CRM',sub:'Prospects, relances et partenaires',kind:'Page',run:()=>view('crm')},
    {icon:'⌘',title:'Interface Lab',sub:'Design system, responsive et PLUGY 2.0',kind:'Page',run:()=>view('builder')},
    {icon:'⌁',title:'Parler à PLUGY',sub:'Ouvrir l’assistant personnel',kind:'Action',run:()=>openPlugy()}
  ];
}

function dynamicItems(term){
  const t=term.toLowerCase().trim();
  const base=navItems().filter(x=>!t||[x.title,x.sub,x.kind].join(' ').toLowerCase().includes(t));
  const opps=(state.opps||[]).filter(o=>!t||[o.title,o.city,o.country,o.type].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0,5).map(o=>({
    icon:'◇',title:o.title||'Opportunité',sub:[o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call',kind:'Opportunité',
    run:()=>{view('opencalls');setTimeout(()=>P.openOppDetails?.(o.id),100)}
  }));
  const artists=(state.artists||[]).filter(a=>t&&[a.name,a.city,a.country,a.discipline].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0,4).map(a=>({
    icon:'◌',title:a.name||'Artiste',sub:[a.discipline,a.city].filter(Boolean).join(' · '),kind:'Artiste',run:()=>view('artists')
  }));
  const crm=(state.crm||[]).filter(x=>t&&[x.name,x.organization,x.city,x.kind].filter(Boolean).join(' ').toLowerCase().includes(t)).slice(0,4).map(x=>({
    icon:'▦',title:x.organization||x.name||'Contact',sub:[x.name,x.city,x.kind].filter(Boolean).join(' · '),kind:'CRM',run:()=>view('crm')
  }));
  return [...base,...opps,...artists,...crm].slice(0,14);
}

function renderCommands(term=''){
  const box=q('#v90CommandResults');if(!box)return;
  commandItems=dynamicItems(term);commandActive=0;
  box.innerHTML=commandItems.map((item,i)=>'<button class="v89-command-item '+(i===0?'active':'')+'" data-command-index="'+i+'"><i>'+esc(item.icon)+'</i><div><strong>'+esc(item.title)+'</strong><span>'+esc(item.sub||'')+'</span></div><em>'+esc(item.kind||'')+'</em></button>').join('')||'<div class="empty-line">Aucun résultat.</div>';
  qa('[data-command-index]',box).forEach(b=>b.onclick=()=>runCommand(Number(b.dataset.commandIndex)));
}
function runCommand(i){
  const item=commandItems[i];if(!item)return;
  closeOverlays();item.run?.();
}
function openCommand(){
  openOverlay('v90CommandPalette');
  const input=q('#v90CommandInput');
  renderCommands('');
  requestAnimationFrame(()=>{if(input){input.value='';input.focus()}});
}
q('#v89GlobalSearch')?.addEventListener('click',openCommand);
q('#quickGo')?.addEventListener('click',openCommand);
q('#v90CommandInput')?.addEventListener('input',e=>renderCommands(e.target.value));
q('#v90CommandInput')?.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    commandActive=Math.max(0,Math.min(commandItems.length-1,commandActive+(e.key==='ArrowDown'?1:-1)));
    qa('[data-command-index]',q('#v90CommandResults')).forEach((b,i)=>b.classList.toggle('active',i===commandActive));
    qa('[data-command-index]',q('#v90CommandResults'))[commandActive]?.scrollIntoView({block:'nearest'});
  }
  if(e.key==='Enter'){e.preventDefault();runCommand(commandActive)}
});
addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();openCommand()}
  if(e.key==='Escape')closeOverlays();
},true);

function openCreate(){openOverlay('v90CreateSheet')}
q('#v90CreateButton')?.addEventListener('click',openCreate);
qa('[data-create-action]').forEach(b=>b.onclick=()=>runCreate(b.dataset.createAction));
function runCreate(action){
  closeOverlays();
  if(action==='carousel'){view('studio');return}
  if(action==='instagram'){view('studio');setTimeout(()=>{const f=q('#studioFormat');if(f){f.value='portrait';f.dispatchEvent(new Event('change',{bubbles:true}))}},120);return}
  if(action==='artist'){view('artists');setTimeout(()=>q('#addArtistBtn')?.click(),140);return}
  if(action==='lead'){view('crm');setTimeout(()=>q('#addLeadBtn')?.click(),140);return}
  if(action==='radar'){view('radar');setTimeout(()=>q('#runRadar')?.click(),160);return}
  if(action==='plugy'){openPlugy();return}
  if(action==='builder'){view('builder');return}
}

function openPlugy(prompt=''){
  q('#openPlugy')?.click();
  if(prompt)setTimeout(()=>window.PlugyAssistant?.ask?.(prompt),120);
}
q('#homeOpenPlugy')?.addEventListener('click',()=>openPlugy());
q('#homeDailyBrief')?.addEventListener('click',()=>openPlugy('Fais-moi un brief très court de mes priorités PLUG ART aujourd’hui à partir du Radar, des opportunités, du CRM, des artistes et d’Instagram. Termine par les 3 actions à faire maintenant.'));
q('#homePlugyForm')?.addEventListener('submit',e=>{
  e.preventDefault();const input=q('#homePlugyPrompt'),msg=input?.value.trim();if(!msg)return;
  input.value='';openPlugy(msg);
});
qa('[data-plugy-prompt]').forEach(b=>b.onclick=()=>openPlugy(b.dataset.plugyPrompt||''));

qa('[data-home-action]').forEach(b=>b.onclick=()=>{
  const action=b.dataset.homeAction;
  if(action==='radar'){view('radar');setTimeout(()=>q('#runRadar')?.focus(),100)}
  if(action==='studio')view('studio');
  if(action==='instagram'){view('social');setTimeout(()=>window.PLUGInstagram?.open?.('feed'),120)}
  if(action==='crm')view('crm');
});

function setGreeting(){
  const el=q('#homeGreeting');if(!el)return;
  const now=new Date(),hour=now.getHours();
  const part=hour<12?'Ce matin':hour<18?'Cet après-midi':'Ce soir';
  el.textContent=part+' · '+now.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'});
}

function syncPlugyHero(){
  const anchor=q('#plugyHeroAnchor'),float=q('#plugyFloat');if(!anchor||!float)return;
  const mode=float.dataset.mode;
  if(mode!=='hero')return;
  const r=anchor.getBoundingClientRect();
  const size=Math.min(innerWidth<=920?172:224,Math.max(150,r.width*.58));
  const left=r.left+r.width/2-size/2;
  const top=r.top+r.height/2-size/2-2;
  document.documentElement.style.setProperty('--v89-plugy-left',Math.round(left)+'px');
  document.documentElement.style.setProperty('--v89-plugy-top',Math.round(top)+'px');
}
let heroRAF=0;
function scheduleHero(){
  if(heroRAF)return;
  heroRAF=requestAnimationFrame(()=>{heroRAF=0;syncPlugyHero()});
}
addEventListener('resize',scheduleHero,{passive:true});
addEventListener('scroll',scheduleHero,{passive:true});
new MutationObserver(scheduleHero).observe(q('#plugyFloat')||document.body,{attributes:true,attributeFilter:['data-mode']});

function setupReveal(){
  const els=qa('.v89-reveal');
  if(!('IntersectionObserver'in window)){els.forEach(x=>x.classList.add('is-visible'));return}
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -7% 0px'});
  els.forEach((el,i)=>{el.style.transitionDelay=Math.min(i*28,140)+'ms';io.observe(el)});
}

function syncScroll(){
  const y=scrollY||0;
  document.body.dataset.scrolled=y>16?'1':'0';
  const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
  document.documentElement.style.setProperty('--v89-scroll',Math.min(100,y/max*100).toFixed(2)+'%');
}
addEventListener('scroll',syncScroll,{passive:true});

function refreshHomeContext(){
  const home=q('#view-dashboard');if(!home)return;
  const crmDue=(state.crm||[]).filter(x=>x.next_date&&x.status!=='partner'&&x.next_date<=new Date().toISOString().slice(0,10)).length;
  const instagram=state.instagram?.status?.connected;
  const brief=q('#homeDailyBrief');
  if(brief)brief.title=(crmDue?crmDue+' relance'+(crmDue>1?'s':'')+' CRM · ':'')+(instagram?'Instagram connecté':'Instagram à connecter');
}

function onView(e){
  syncPageChrome();
  setTimeout(()=>{decorateSectionBars();syncPlugyHero();refreshHomeContext()},40);
}
addEventListener('plugart:view',onView);

function enhancePointer(){
  const hero=q('.home-command');if(!hero||matchMedia('(pointer:coarse)').matches)return;
  hero.addEventListener('pointermove',e=>{
    const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    hero.style.setProperty('--hero-x',(x*100).toFixed(1)+'%');
    hero.style.setProperty('--hero-y',(y*100).toFixed(1)+'%');
  },{passive:true});
}

decorateSectionBars();
setupSidebar();
setupReveal();
setGreeting();
syncScroll();
syncPageChrome();
enhancePointer();
setTimeout(()=>{syncPlugyHero();refreshHomeContext()},180);
window.addEventListener('plugart:hydrated',()=>{refreshHomeContext();renderCommands('')});
})();
;

/* ===== static/dashboard_v100.js ===== */
(function(){
'use strict';

function init(){
  const P=window.PLUG65;
  if(!P)return;
  const q=P.q||((s,r=document)=>r.querySelector(s));
  const qa=P.qa||((s,r=document)=>[...r.querySelectorAll(s)]);
  const view=P.view||(()=>{});

  document.body.classList.add('v89-ui');
  document.body.classList.add('v100-ui');
  document.documentElement.dataset.plugartUi='v100';
  document.title='PLUG ART OS — Workspace';

  const footer=q('.sidebar-footer small');
  if(footer)footer.textContent='V100 · PLUG ART OS';

  const eyebrow=q('#pageEyebrow');
  if(eyebrow && (document.body.dataset.view||'dashboard')==='dashboard')eyebrow.textContent='PLUG ART OS';

  const hero=q('.home-command');
  if(hero){
    const eye=hero.querySelector('.home-eyebrow');
    if(eye)eye.innerHTML='<span></span> PLUG ART · CREATIVE OPERATING SYSTEM';

    const h1=hero.querySelector('h1');
    if(h1)h1.innerHTML='Créer. Repérer.<br><em>Connecter.</em>';

    const p=hero.querySelector('.home-command-copy > p');
    if(p)p.textContent='Un seul espace de travail pour trouver des opportunités, produire du contenu, développer le réseau et publier sans perdre le fil.';

    const input=q('#homePlugyPrompt');
    if(input)input.placeholder='Demande une action à PLUGY : chercher, créer, comparer, organiser…';

    const daily=q('#homeDailyBrief');
    if(daily)daily.textContent='Brief du jour →';
  }

  const tools=[
    {view:'radar',icon:'◎',title:'Radar',sub:'Chercher et qualifier'},
    {view:'opencalls',icon:'◇',title:'Opportunités',sub:'Décider et préparer'},
    {view:'studio',icon:'✦',title:'Studio',sub:'Créer les contenus'},
    {view:'social',icon:'◉',title:'Instagram',sub:'Publier et analyser'},
    {view:'artists',icon:'◌',title:'Artistes',sub:'Développer le réseau'},
    {view:'crm',icon:'▦',title:'CRM',sub:'Relancer et suivre'},
    {view:'map',icon:'⌖',title:'Carte',sub:'Explorer les territoires'}
  ];

  const workspace=q('.home-workspace');
  if(workspace && !q('.v100-tool-deck')){
    const deck=document.createElement('section');
    deck.className='v100-tool-deck v89-reveal is-visible';
    deck.setAttribute('aria-label','Outils PLUG ART');
    deck.innerHTML=tools.map(x=>
      '<button class="v100-tool" data-v100-view="'+x.view+'">'+
      '<i>'+x.icon+'</i><strong>'+x.title+'</strong><span>'+x.sub+'</span></button>'
    ).join('');
    workspace.parentNode.insertBefore(deck,workspace);
    qa('[data-v100-view]',deck).forEach(btn=>btn.addEventListener('click',()=>view(btn.dataset.v100View)));
  }

  const topRight=q('.top-right');
  if(topRight && !q('.v100-build-tag')){
    const tag=document.createElement('span');
    tag.className='v100-build-tag';
    tag.innerHTML='<i></i> V100 NEXT UI';
    topRight.insertBefore(tag,topRight.firstChild);
  }

  const builderIntro=q('.builder-intro');
  if(builderIntro){
    const small=builderIntro.querySelector('small');
    const title=builderIntro.querySelector('h2');
    const desc=builderIntro.querySelector('p');
    if(small)small.textContent='PLUG ART · PRODUCT LAB';
    if(title)title.textContent='Refondre l’application sans casser ses moteurs.';
    if(desc)desc.textContent='Navigation, densité, surfaces, typographie, responsive et présence de PLUGY restent réglables depuis ce laboratoire interne.';
  }

  qa('.nav-group-label').forEach(el=>{
    const t=el.textContent.trim().toLowerCase();
    if(t==='explorer')el.textContent='Découvrir';
    if(t==='créer')el.textContent='Produire';
    if(t==='gérer')el.textContent='Réseau';
    if(t==='système')el.textContent='Produit';
  });

  const updateChrome=()=>{
    const id=document.body.dataset.view||'dashboard';
    const meta={
      dashboard:['PLUG ART OS','Accueil'],
      radar:['DISCOVERY ENGINE','Radar'],
      opencalls:['DECISION SPACE','Opportunités'],
      map:['TERRITORY VIEW','Carte'],
      studio:['CONTENT SYSTEM','Studio'],
      social:['DISTRIBUTION','Instagram'],
      artists:['NETWORK','Artistes'],
      crm:['RELATIONSHIPS','CRM'],
      builder:['PRODUCT LAB','Interface Lab']
    }[id]||['PLUG ART OS','Workspace'];
    const e=q('#pageEyebrow'),t=q('#pageTitle');
    if(e)e.textContent=meta[0];
    if(t)t.textContent=meta[1];
  };
  addEventListener('plugart:view',()=>requestAnimationFrame(updateChrome));
  updateChrome();

  const search=q('#v89GlobalSearch strong');
  if(search)search.textContent='Chercher une action, un artiste, une opportunité…';

  const create=q('#v89CreateButton');
  if(create)create.textContent='＋ Nouveau';

  const mapHead=q('#view-map .section-bar h1');
  if(mapHead)mapHead.textContent='Carte';

  qa('.home-section-head button').forEach(b=>{
    b.textContent=b.textContent.replace('Toutes les opportunités','Voir tout').replace('Explorer la carte','Ouvrir').replace('Organiser','Ouvrir');
  });

  const observer=new MutationObserver(()=>{
    document.body.classList.add('v89-ui');
    document.body.classList.add('v100-ui');
    updateChrome();
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['data-view','class']});

  window.PLUGART_V100={
    version:'100.0',
    design:'editorial-application-shell',
    tools:tools.map(x=>x.title),
    activate:()=>document.body.classList.add('v100-ui')
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
;

/* ===== static/dashboard_v101.js ===== */
(function(){
'use strict';

const ready=fn=>document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',fn,{once:true})
  :fn();

ready(()=>{
  const P=window.PLUG65||{};
  const q=P.q||((s,r=document)=>r.querySelector(s));
  const qa=P.qa||((s,r=document)=>Array.from(r.querySelectorAll(s)));
  const go=P.view||(()=>{});

  document.body.classList.add('v89-ui','v100-ui','v101-ui');
  document.documentElement.dataset.plugartUi='v101';

  const toast=document.createElement('div');
  toast.className='v101-toast';
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  document.body.appendChild(toast);
  let toastTimer=0;
  function notify(message){
    if(!message)return;
    toast.textContent=message;
    toast.classList.remove('show');
    requestAnimationFrame(()=>toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1800);
  }

  const topRight=q('.top-right');
  if(topRight&&!q('#v101Focus')){
    const focus=document.createElement('button');
    focus.type='button';
    focus.id='v101Focus';
    focus.className='v101-focus-toggle';
    focus.textContent='Focus';
    focus.title='Agrandir l’espace de travail';
    focus.setAttribute('aria-pressed','false');
    const create=q('#v89CreateButton');
    topRight.insertBefore(focus,create||topRight.firstChild);
  }

  const focusBtn=q('#v101Focus');
  const focusKey='plugart_v101_focus';
  function setFocus(on,announce=false){
    document.body.dataset.focus=on?'on':'off';
    if(focusBtn)focusBtn.setAttribute('aria-pressed',on?'true':'false');
    try{localStorage.setItem(focusKey,on?'on':'off')}catch{}
    if(announce)notify(on?'Mode Focus activé':'Mode Focus désactivé');
    setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
  }
  let savedFocus=false;
  try{savedFocus=localStorage.getItem(focusKey)==='on'}catch{}
  setFocus(savedFocus,false);
  focusBtn?.addEventListener('click',()=>setFocus(document.body.dataset.focus!=='on',true));

  function ensureCompat(){
    document.body.classList.add('v89-ui','v100-ui','v101-ui');
  }

  const pageNames={
    dashboard:'Accueil',radar:'Radar',opencalls:'Opportunités',map:'Carte',
    studio:'Studio',social:'Instagram',artists:'Artistes',crm:'CRM',builder:'Interface Lab'
  };

  function syncMobileDock(){
    const id=document.body.dataset.view||'dashboard';
    qa('.mobile-dock [data-view]').forEach(b=>{
      const active=b.dataset.view===id;
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
  }

  function syncTop(){
    const id=document.body.dataset.view||'dashboard';
    const title=q('#pageTitle');
    if(title&&pageNames[id])title.textContent=pageNames[id];
    syncMobileDock();
  }

  addEventListener('plugart:view',e=>{
    ensureCompat();
    syncTop();
    const id=e?.detail?.id||document.body.dataset.view;
    if(id&&pageNames[id])notify(pageNames[id]);
  });

  // Mobile viewport / virtual keyboard stabilization for iOS Safari.
  function syncViewport(){
    const vv=window.visualViewport;
    const h=vv?.height||window.innerHeight;
    const top=vv?.offsetTop||0;
    document.documentElement.style.setProperty('--v101-viewport-h',h+'px');
    document.documentElement.style.setProperty('--v101-viewport-top',top+'px');
    const keyboard=window.innerHeight-h>150;
    document.body.dataset.keyboard=keyboard?'open':'closed';
  }
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncViewport,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(syncViewport,120),{passive:true});
  addEventListener('resize',syncViewport,{passive:true});
  syncViewport();

  // Avoid invisible decorative layers stealing taps after transitions.
  const deadSelectors=[
    '.room-backdrop','.plugy-orbit','.plugy-stage-label','.v89-scroll-progress'
  ];
  deadSelectors.forEach(sel=>qa(sel).forEach(el=>el.style.pointerEvents='none'));

  // Use pointer-up semantics for the new tool deck, which is more reliable on iOS
  // when the page was just scrolled.
  qa('[data-v100-view]').forEach(btn=>{
    if(btn.dataset.v101Bound)return;
    btn.dataset.v101Bound='1';
    btn.addEventListener('pointerup',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const id=btn.dataset.v100View;
      if(id){e.preventDefault();go(id)}
    });
  });

  // Stabilise links and buttons that can accidentally be dragged on Safari.
  qa('button,a,[role="button"]').forEach(el=>{
    el.setAttribute('draggable','false');
    if(el.tagName==='BUTTON'&&!el.getAttribute('type'))el.setAttribute('type','button');
  });

  // The create sheet and command palette stay scrollable without moving the page below.
  qa('.v89-overlay').forEach(overlay=>{
    overlay.addEventListener('touchmove',e=>{
      if(!e.target.closest('.v89-command-card,.v89-create-sheet'))e.preventDefault();
    },{passive:false});
  });

  // Small, useful home status block. No vanity KPI.
  const deck=q('.v100-tool-deck');
  if(deck&&!q('#v101ContextStatus')){
    const card=document.createElement('button');
    card.type='button';
    card.id='v101ContextStatus';
    card.className='v101-status-card';
    card.innerHTML='<i>⌁</i><span><strong>PLUGY est disponible</strong><span>Actions, Radar, création et organisation</span></span><b>OUVRIR</b>';
    card.addEventListener('click',()=>q('#openPlugy')?.click());
    deck.insertAdjacentElement('afterend',card);
  }

  // Context-sensitive primary action on mobile: the plus button opens the existing create sheet.
  const create=q('#v89CreateButton');
  create?.setAttribute('aria-label','Créer un nouvel élément');

  // Focus shortcut: Cmd/Ctrl + .  (and F on non-input desktop).
  addEventListener('keydown',e=>{
    const tag=(e.target?.tagName||'').toLowerCase();
    const typing=['input','textarea','select'].includes(tag)||e.target?.isContentEditable;
    if((e.metaKey||e.ctrlKey)&&e.key==='.'){
      e.preventDefault();setFocus(document.body.dataset.focus!=='on',true);return;
    }
    if(!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key.toLowerCase()==='f'&&innerWidth>980){
      e.preventDefault();setFocus(document.body.dataset.focus!=='on',true);
    }
  },true);

  // Prevent the floating agent from sitting on the mobile dock or the keyboard.
  function syncPlugy(){
    const float=q('#plugyFloat');
    if(!float)return;
    const mobile=matchMedia('(max-width:720px)').matches;
    if(mobile&&document.body.dataset.keyboard==='open'){
      float.style.visibility='hidden';
      float.style.pointerEvents='none';
    }else{
      float.style.visibility='';
      float.style.pointerEvents='';
    }
  }
  window.visualViewport?.addEventListener('resize',syncPlugy,{passive:true});
  addEventListener('plugart:view',syncPlugy);
  syncPlugy();

  // Compatibility observer: older modules may replace body classes while applying design presets.
  new MutationObserver(()=>{
    ensureCompat();
    syncTop();
    syncPlugy();
  }).observe(document.body,{attributes:true,attributeFilter:['class','data-view']});

  // One-tap diagnostic: existing quality tool remains intact; a long press shows runtime state.
  const health=q('#layoutHealth');
  if(health){
    let timer=0;
    health.addEventListener('pointerdown',()=>{
      timer=setTimeout(()=>{
        const id=document.body.dataset.view||'dashboard';
        notify('V101 · '+(pageNames[id]||id)+' · interface tactile active');
      },650);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>health.addEventListener(ev,()=>clearTimeout(timer)));
  }

  syncTop();
  ensureCompat();

  window.PLUGART_V101={
    version:'101.0',
    focus:on=>setFocus(!!on,true),
    notify,
    repair:()=>{
      ensureCompat();syncViewport();syncTop();syncPlugy();
      notify('Interface recalée');
    }
  };
});
})();
;

/* ===== static/dashboard_v102.js ===== */
(function(){
'use strict';

const loaded=new Map();
const VERSION='102.20260923.1';
const asset=(name,legacy=false)=>'/static/'+name+'?v='+(legacy?'102.20260923.1':VERSION);
const idle=(fn,timeout=900)=>'requestIdleCallback'in window?requestIdleCallback(fn,{timeout}):setTimeout(fn,120);

function loadScript(src,opts={}){
  if(loaded.has(src))return loaded.get(src);
  const p=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.async=true;
    if(opts.module)s.type='module';
    s.onload=()=>resolve(s);
    s.onerror=()=>reject(new Error('Asset unavailable: '+src));
    document.head.appendChild(s);
  });
  loaded.set(src,p);
  return p;
}

async function loadSequence(files){
  for(const file of files)await loadScript(asset(file,true));
}

const routeModules={
  studio:['dashboard_v65_studio.js','dashboard_v86_editor.js'],
  map:['dashboard_v86_map.js'],
  artists:['dashboard_v86_people.js'],
  crm:['dashboard_v86_people.js'],
  social:['dashboard_v88_instagram.js'],
  builder:['dashboard_v90_builder.js']
};
const routeReady=new Map();

function viewNode(id){return document.getElementById('view-'+id)}
function setLoading(id,on){
  const v=viewNode(id);if(!v)return;
  v.classList.toggle('v102-loading',!!on);
  let veil=v.querySelector(':scope > .v102-module-loading');
  if(on&&!veil){
    veil=document.createElement('div');
    veil.className='v102-module-loading';
    veil.innerHTML='<span><i></i> Préparation de l’espace</span>';
    v.style.position='relative';
    v.appendChild(veil);
  }else if(!on&&veil){
    veil.remove();
  }
}
async function ensureRoute(id,quiet=false){
  const files=routeModules[id];if(!files?.length)return;
  if(routeReady.has(id))return routeReady.get(id);
  if((id==='artists'&&routeReady.has('crm'))||(id==='crm'&&routeReady.has('artists'))){
    const p=routeReady.get(id==='artists'?'crm':'artists');routeReady.set(id,p);return p;
  }
  if(!quiet)setLoading(id,true);
  const p=loadSequence(files).then(()=>{
    if(id==='artists'||id==='crm'){routeReady.set('artists',p);routeReady.set('crm',p)}
  }).catch(err=>{
    console.warn('[PLUG ART] feature module',id,err);
  }).finally(()=>setLoading(id,false));
  routeReady.set(id,p);
  return p;
}

let modelPromise=null;
function warmModel(){
  if(modelPromise)return modelPromise;
  modelPromise=fetch('/static/plugy_official_v84.glb?v=102.20260923.1',{cache:'force-cache'})
    .catch(()=>null);
  return modelPromise;
}
async function ensureModelViewer(){
  if(customElements.get('model-viewer'))return;
  const src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';
  await Promise.allSettled([loadScript(src,{module:true}),warmModel()]);
  try{await customElements.whenDefined('model-viewer')}catch{}
  document.querySelectorAll('model-viewer[data-src]').forEach(el=>{
    if(!el.getAttribute('src'))el.setAttribute('src',el.dataset.src);
  });
  document.documentElement.dataset.plugy3d='ready';
}
let plugyPromise=null;
async function ensurePlugy(){
  if(window.PlugyAssistant)return window.PlugyAssistant;
  if(plugyPromise)return plugyPromise;
  plugyPromise=Promise.all([
    ensureModelViewer(),
    loadScript(asset('plugy_assistant_v90.js',true))
  ]).then(()=>window.PlugyAssistant).catch(err=>{
    console.warn('[PLUG ART] PLUGY deferred load',err);return null;
  });
  return plugyPromise;
}


function bindRouteWarmIntent(){
  document.querySelectorAll('[data-view]').forEach(el=>{
    if(el.dataset.v102WarmBound)return;
    el.dataset.v102WarmBound='1';
    const warm=()=>ensureRoute(el.dataset.view,true);
    el.addEventListener('pointerenter',warm,{once:true,passive:true});
    el.addEventListener('focusin',warm,{once:true,passive:true});
    el.addEventListener('touchstart',warm,{once:true,passive:true});
  });
}

function bindPlugyIntent(){
  const selectors=['#openPlugy','#homePlugyForm','.orbit-action','#plugyFloat','.sidebar-agent'];
  selectors.forEach(sel=>document.querySelectorAll(sel).forEach(el=>{
    if(el.dataset.v102PlugyIntent)return;
    el.dataset.v102PlugyIntent='1';
    ['pointerdown','focusin','touchstart'].forEach(ev=>{
      el.addEventListener(ev,()=>ensurePlugy(),{once:true,passive:true,capture:true});
    });
  }));
}


let imageObserver=null;
function hydrateDeferredImages(root=document){
  const nodes=Array.from(root.querySelectorAll('img[data-v102-src]'));
  if(!nodes.length)return;
  if(!('IntersectionObserver'in window)){
    idle(()=>nodes.forEach(img=>{if(!img.src)img.src=img.dataset.v102Src||''}),350);
    return;
  }
  if(!imageObserver){
    imageObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const img=entry.target;
        if(!img.src&&img.dataset.v102Src)img.src=img.dataset.v102Src;
        imageObserver.unobserve(img);
      });
    },{rootMargin:'320px 0px'});
  }
  nodes.forEach(img=>imageObserver.observe(img));
}

function tuneImages(root=document){
  hydrateDeferredImages(root);
  root.querySelectorAll('img').forEach((img,i)=>{
    if(!img.loading)img.loading=i<2?'eager':'lazy';
    if(!img.decoding)img.decoding='async';
    if(i>1&&!img.fetchPriority)img.fetchPriority='low';
    img.addEventListener('load',()=>img.classList.add('v102-image-ready'),{once:true});
  });
}

function observeNewContent(){
  const mo=new MutationObserver(records=>{
    let imageWork=false,plugyWork=false;
    for(const r of records){
      if(r.addedNodes?.length){imageWork=true;plugyWork=true;break}
    }
    if(imageWork)tuneImages();
    if(plugyWork){bindPlugyIntent();bindRouteWarmIntent();}
  });
  mo.observe(document.body,{childList:true,subtree:true});
}

function premiumRuntime(){
  document.body.classList.add('v89-ui','v100-ui','v101-ui','v102-ui');
  document.documentElement.dataset.plugartUi='v102';
  tuneImages();bindPlugyIntent();bindRouteWarmIntent();observeNewContent();

  addEventListener('plugart:view',e=>{
    const id=e.detail?.id||document.body.dataset.view||'dashboard';
    ensureRoute(id);
  });

  const initial=document.body.dataset.view||location.hash.slice(1)||'dashboard';
  ensureRoute(initial);

  const health=document.getElementById('layoutHealth');
  health?.addEventListener('pointerdown',()=>ensureRoute('__quality'),{once:true});
  health?.addEventListener('click',async()=>{
    if(!window.PLUGQuality){
      await loadScript(asset('dashboard_v86_quality.js',true)).catch(()=>null);
    }
  },{capture:true});

  const coarse=matchMedia('(pointer:coarse)').matches;
  // PLUGY stays instant on intent, but its 3D engine no longer competes with first paint.
  idle(()=>ensurePlugy(),coarse?2200:900);


  // Runtime quality adaptation: keep visual quality, remove expensive motion on stressed mobile sessions.
  const lowMemory=Number(navigator.deviceMemory||8)<=4;
  if(coarse&&lowMemory)document.body.classList.add('v102-efficient-motion');

  // Small Web Vitals telemetry in-memory only for diagnostics.
  const perf={nav:performance.now()};
  try{
    new PerformanceObserver(list=>{
      for(const e of list.getEntries()){
        if(e.entryType==='largest-contentful-paint')perf.lcp=Math.round(e.startTime);
        if(e.entryType==='layout-shift'&&!e.hadRecentInput)perf.cls=Number(((perf.cls||0)+e.value).toFixed(4));
      }
      window.PLUGART_V102_PERF=perf;
    }).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(list=>{
      for(const e of list.getEntries())if(!e.hadRecentInput)perf.cls=Number(((perf.cls||0)+e.value).toFixed(4));
      window.PLUGART_V102_PERF=perf;
    }).observe({type:'layout-shift',buffered:true});
  }catch{}

  addEventListener('load',()=>{
    perf.load=Math.round(performance.now());
    perf.resources=performance.getEntriesByType('resource').length;
    window.PLUGART_V102_PERF=perf;
  },{once:true});
  addEventListener('pageshow',e=>{
    if(e.persisted){tuneImages();bindPlugyIntent();}
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',premiumRuntime,{once:true});
else premiumRuntime();

window.PLUGART_V102={
  version:'102.0',
  ensureRoute,
  ensurePlugy,
  ensureModelViewer,
  warmModel,
  metrics:()=>window.PLUGART_V102_PERF||{}
};
})();
;