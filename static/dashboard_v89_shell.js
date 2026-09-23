
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
  crm:{eyebrow:'RELATIONSHIPS',kicker:'CRM',desc:'Pilote les prospects, relances, rendez-vous et partenaires sans perdre le fil.'}
};

const cues={
  dashboard:'Je peux te faire un brief des priorités ou lancer directement une action.',
  radar:'Je peux trier le Radar par accessibilité, urgence, ville ou type d’exposition.',
  opencalls:'Donne-moi une ville, un budget ou une discipline et je peux filtrer avec toi.',
  studio:'Je peux transformer une opportunité en structure de carrousel prête à éditer.',
  social:'Je peux analyser ton feed réel, le planning et la file de publication.',
  map:'Je peux t’aider à repérer les zones actives et les opportunités par territoire.',
  artists:'Je peux préparer une fiche artiste, un résumé ou une sélection de profils.',
  crm:'Je peux résumer les relances à faire et t’aider à préparer le prochain contact.'
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
  const el=q('#v89PlugyCue');if(!el)return;
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
  const box=q('#v89CommandResults');if(!box)return;
  commandItems=dynamicItems(term);commandActive=0;
  box.innerHTML=commandItems.map((item,i)=>'<button class="v89-command-item '+(i===0?'active':'')+'" data-command-index="'+i+'"><i>'+esc(item.icon)+'</i><div><strong>'+esc(item.title)+'</strong><span>'+esc(item.sub||'')+'</span></div><em>'+esc(item.kind||'')+'</em></button>').join('')||'<div class="empty-line">Aucun résultat.</div>';
  qa('[data-command-index]',box).forEach(b=>b.onclick=()=>runCommand(Number(b.dataset.commandIndex)));
}
function runCommand(i){
  const item=commandItems[i];if(!item)return;
  closeOverlays();item.run?.();
}
function openCommand(){
  openOverlay('v89CommandPalette');
  const input=q('#v89CommandInput');
  renderCommands('');
  requestAnimationFrame(()=>{if(input){input.value='';input.focus()}});
}
q('#v89GlobalSearch')?.addEventListener('click',openCommand);
q('#quickGo')?.addEventListener('click',openCommand);
q('#v89CommandInput')?.addEventListener('input',e=>renderCommands(e.target.value));
q('#v89CommandInput')?.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    commandActive=Math.max(0,Math.min(commandItems.length-1,commandActive+(e.key==='ArrowDown'?1:-1)));
    qa('[data-command-index]',q('#v89CommandResults')).forEach((b,i)=>b.classList.toggle('active',i===commandActive));
    qa('[data-command-index]',q('#v89CommandResults'))[commandActive]?.scrollIntoView({block:'nearest'});
  }
  if(e.key==='Enter'){e.preventDefault();runCommand(commandActive)}
});
addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();openCommand()}
  if(e.key==='Escape')closeOverlays();
},true);

function openCreate(){openOverlay('v89CreateSheet')}
q('#v89CreateButton')?.addEventListener('click',openCreate);
qa('[data-create-action]').forEach(b=>b.onclick=()=>runCreate(b.dataset.createAction));
function runCreate(action){
  closeOverlays();
  if(action==='carousel'){view('studio');return}
  if(action==='instagram'){view('studio');setTimeout(()=>{const f=q('#studioFormat');if(f){f.value='portrait';f.dispatchEvent(new Event('change',{bubbles:true}))}},120);return}
  if(action==='artist'){view('artists');setTimeout(()=>q('#addArtistBtn')?.click(),140);return}
  if(action==='lead'){view('crm');setTimeout(()=>q('#addLeadBtn')?.click(),140);return}
  if(action==='radar'){view('radar');setTimeout(()=>q('#runRadar')?.click(),160);return}
  if(action==='plugy'){openPlugy();return}
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
