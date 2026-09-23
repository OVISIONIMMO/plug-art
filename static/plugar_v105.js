(function(){
'use strict';

const VERSION='106.20260923.1';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const state={
  active:'hero',
  data:null,
  history:[],
  voice:false,
  recognition:null,
  speaking:false
};

const contexts={
  hero:{
    label:'accueil',
    bubble:'Je peux déjà comprendre ce que tu cherches et t’orienter vers la bonne rubrique.',
    prompt:'Aide-moi à choisir par quoi commencer dans PLUGAR.'
  },
  brief:{
    label:'fonctions',
    bubble:'Radar, Studio, Map ou réseau : je peux t’emmener directement vers l’outil utile.',
    prompt:'Explique-moi quel outil PLUGAR est le plus utile pour mon besoin.'
  },
  context:{
    label:'intelligence PLUGY',
    bubble:'Je garde le contexte de chaque rubrique et je peux agir à partir de ce que tu regardes.',
    prompt:'Explique-moi ce que tu peux faire dans cette rubrique.'
  },
  radar:{
    label:'Radar',
    bubble:'Je peux filtrer les appels ouverts par ville, discipline, coût ou type d’exposition.',
    prompt:'Montre-moi les meilleures opportunités ouvertes pour un artiste émergent.'
  },
  map:{
    label:'carte',
    bubble:'Je peux croiser territoire, deadline et type de projet sans te faire ouvrir vingt onglets.',
    prompt:'Trouve-moi les opportunités les plus pertinentes en Europe et proches de Paris.'
  },
  studio:{
    label:'Studio',
    bubble:'Je peux transformer une opportunité du Radar en carrousel, candidature ou dossier.',
    prompt:'Prépare un carrousel PLUGAR à partir d’une opportunité active.'
  },
  network:{
    label:'réseau artistes',
    bubble:'Je peux analyser un profil artiste et proposer les prochaines actions utiles.',
    prompt:'Aide-moi à structurer et valoriser un profil artiste.'
  },
  voice:{
    label:'conversation vocale',
    bubble:'Ici, tu peux me parler directement. Je garde la rubrique en contexte.',
    prompt:'Démarre une conversation avec moi sur PLUGAR.'
  },
  final:{
    label:'fin de parcours',
    bubble:'Je garde le fil. Tu peux repartir vers le Radar ou me confier la prochaine action.',
    prompt:'Donne-moi la prochaine action la plus utile à faire dans PLUGAR.'
  }
};

const motionBySection={
  hero:'Idle',
  brief:'Curious',
  context:'Think',
  radar:'Attentive',
  map:'SoftTurn',
  studio:'Present',
  network:'Happy',
  voice:'Attentive',
  final:'Wave'
};
let plugyMotionTimer=0;
let ambientTimer=0;

function animatedModels(){
  return $('.animated-model,.realistic-model');
}
function playPlugyMotion(name='Idle',loop=false){
  document.body.dataset.plugyMotion=String(name).toLowerCase();
  clearTimeout(plugyMotionTimer);
  animatedModels().forEach(mv=>{
    const run=()=>{
      const list=mv.availableAnimations||[];
      const target=list.includes(name)?name:(list.includes('Idle')?'Idle':list[0]);
      if(!target)return;
      try{
        mv.animationName=target;
        mv.timeScale=target==='Think'?.82:target==='Attentive'?.9:1;
        mv.play({repetitions:loop?Infinity:1});
      }catch(_){}
    };
    if(mv.loaded)run();
    else mv.addEventListener('load',run,{once:true});
  });
  if(!loop&&name!=='Idle'){
    plugyMotionTimer=setTimeout(()=>playPlugyMotion('Idle',true),name==='Think'?1900:1450);
  }
}
function initPlugyModels(){
  const hero=$('.realistic-model');
  const saveData=!!navigator.connection?.saveData;
  if(hero&&(saveData||innerWidth<720)){
    hero.src='/static/PLUGY_final_animated.glb?v='+VERSION;
    hero.removeAttribute('poster');
    hero.classList.remove('realistic-model');
    hero.classList.add('animated-model','hero-animated-fallback');
    hero.setAttribute('autoplay','');
  }
  animatedModels().forEach(mv=>{
    const idle=()=>playPlugyMotion('Idle',true);
    if(mv.loaded)idle(); else mv.addEventListener('load',idle,{once:true});
    mv.addEventListener('pointerenter',()=>playPlugyMotion('Curious',false));
    mv.addEventListener('dblclick',()=>{openPanel();playPlugyMotion('Attentive',false)});
  });
  const stage=$('.hero-plugy');
  stage?.addEventListener('pointermove',e=>{
    if(matchMedia('(pointer:coarse)').matches)return;
    const r=stage.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    stage.style.setProperty('--plugy-x',(x*16).toFixed(2)+'px');
    stage.style.setProperty('--plugy-y',(y*11).toFixed(2)+'px');
  },{passive:true});
  stage?.addEventListener('pointerleave',()=>{
    stage.style.setProperty('--plugy-x','0px');
    stage.style.setProperty('--plugy-y','0px');
  });
  clearInterval(ambientTimer);
  ambientTimer=setInterval(()=>{
    if(state.voice||state.speaking||$('#plugyPanel')?.classList.contains('open'))return;
    const choices=['Blink','SoftTurn','Curious'];
    playPlugyMotion(choices[Math.floor(Math.random()*choices.length)],false);
  },8500);
}

function safeText(v,fallback=''){
  return String(v==null?fallback:v).replace(/\s+/g,' ').trim();
}
function esc(v){
  return safeText(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function sectionContext(){
  return contexts[state.active]||contexts.hero;
}
function setSection(id){
  state.active=id;
  document.body.dataset.plugySection=id;
  const ctx=sectionContext();
  const bubble=$('#plugyBubbleText');
  const cc=$('#chatContext');
  if(bubble)bubble.textContent=ctx.bubble;
  if(cc)cc.textContent='Contexte : '+ctx.label;
  $$('.nav-links a').forEach(a=>{
    const href=(a.getAttribute('href')||'').slice(1);
    const match=(href===id)||(id==='context'&&href==='brief')||(id==='map'&&href==='radar');
    a.classList.toggle('active',match);
  });
  if(id!=='hero')document.body.classList.add('guide-visible');
  else if(scrollY<innerHeight*.55)document.body.classList.remove('guide-visible');
  const motion=motionBySection[id]||'Idle';
  playPlugyMotion(motion,id==='hero');
}

function initObservers(){
  const revealObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('is-visible')});
  },{threshold:.12,rootMargin:'0px 0px -5% 0px'});
  $$('.reveal').forEach(el=>revealObs.observe(el));

  const chapterObs=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)setSection(visible.target.dataset.plugyContext||visible.target.id);
  },{threshold:[.18,.35,.55,.72],rootMargin:'-18% 0px -25% 0px'});
  $$('[data-plugy-context]').forEach(el=>chapterObs.observe(el));
}

function initScroll(){
  const update=()=>{
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const pct=Math.max(0,Math.min(100,scrollY/max*100));
    document.documentElement.style.setProperty('--progress',pct+'%');
    document.body.classList.toggle('is-scrolled',scrollY>40);
    if(scrollY<innerHeight*.48 && state.active==='hero')document.body.classList.remove('guide-visible');
  };
  addEventListener('scroll',update,{passive:true});
  update();
}

function formatDeadline(v){
  if(!v)return 'Deadline à vérifier';
  const d=new Date(v+'T12:00:00');
  if(Number.isNaN(d.getTime()))return safeText(v);
  return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric'}).format(d);
}
function opportunityMeta(o){
  const bits=[];
  if(o.city)bits.push(o.city);
  if(o.country&&String(o.country).toLowerCase()!==String(o.city||'').toLowerCase())bits.push(o.country);
  if(o.fee)bits.push(o.fee);
  return bits.slice(0,3).join(' · ')||'Source à vérifier';
}
function renderRadar(){
  const root=$('#radarCards');
  if(!root||!state.data)return;
  const items=(state.data.opportunities||[]).filter(o=>o.status==='open'||o.status==='rolling'||!o.status).slice(0,3);
  if(!items.length){
    root.innerHTML='<article class="opportunity-card"><div><small>RADAR</small><h3>Aucune opportunité active chargée</h3><p>Relance le Radar ou demande à PLUGY de chercher une nouvelle piste.</p></div><button class="go" data-plugy-prompt="Relance le Radar et trouve de nouvelles opportunités.">→</button></article>';
    bindPromptButtons();
    return;
  }
  root.innerHTML=items.map(o=>{
    const title=esc(o.title||'Opportunité artistique');
    const meta=esc(opportunityMeta(o));
    const deadline=esc(formatDeadline(o.deadline));
    const url=esc(o.source_url||'');
    return '<article class="opportunity-card" data-opp-id="'+esc(o.id)+'"><div><small>'+deadline+'</small><h3>'+title+'</h3><p>'+meta+'</p></div><button class="go" data-source="'+url+'" aria-label="Ouvrir '+title+'">→</button></article>';
  }).join('');
  $$('.opportunity-card .go',root).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const url=btn.dataset.source;
      if(url&&/^https?:\/\//.test(url))window.open(url,'_blank','noopener');
      else openPlugy('Donne-moi les détails de cette opportunité et les prochaines actions.');
    });
  });
}

function renderArtists(){
  const root=$('#artistCards');
  if(!root||!state.data)return;
  const items=(state.data.artists||[]).slice(0,4);
  if(!items.length)return;
  const gradients=[
    'linear-gradient(145deg,#15172a,#7165d9 52%,#f3acd4)',
    'linear-gradient(145deg,#f7cdd7,#b66dde,#4c2f74)',
    'linear-gradient(145deg,#e7e1d6,#ffffff,#8bc6d4)',
    'linear-gradient(145deg,#182523,#4e9d92,#d8ead5)'
  ];
  root.innerHTML=items.map((a,i)=>{
    const name=esc(a.name||a.real_name||'Artiste PLUGAR');
    const discipline=esc(a.discipline||a.city||'Artiste émergent');
    return '<article class="artist-card reveal is-visible" data-artist-id="'+esc(a.id)+'"><div class="artist-art" style="background:'+gradients[i%gradients.length]+'"></div><h3>'+name+'</h3><p>'+discipline+'</p></article>';
  }).join('');
  $$('.artist-card',root).forEach(card=>card.addEventListener('click',()=>{
    const id=card.dataset.artistId;
    const a=(state.data.artists||[]).find(x=>String(x.id)===String(id));
    openPlugy('Analyse le profil artiste '+safeText(a?.name||'sélectionné')+' et propose les prochaines actions utiles.');
  }));
}

function renderMap(){
  const stage=$('#mapStage');
  if(!stage||!state.data)return;
  $$('.map-pin',stage).forEach(x=>x.remove());
  let items=(state.data.map||[]).filter(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))).slice(0,24);
  if(!items.length){
    items=[
      {lat:48.8566,lon:2.3522,title:'Paris'},
      {lat:40.4168,lon:-3.7038,title:'Madrid'},
      {lat:45.4642,lon:9.1900,title:'Milan'},
      {lat:52.3676,lon:4.9041,title:'Amsterdam'},
      {lat:51.5072,lon:-.1276,title:'Londres'}
    ];
  }
  const bounds={minLon:-11,maxLon:24,minLat:35,maxLat:58};
  items.forEach(item=>{
    const lon=Math.max(bounds.minLon,Math.min(bounds.maxLon,Number(item.lon)));
    const lat=Math.max(bounds.minLat,Math.min(bounds.maxLat,Number(item.lat)));
    const x=8+(lon-bounds.minLon)/(bounds.maxLon-bounds.minLon)*84;
    const y=8+(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*78;
    const pin=document.createElement('button');
    pin.className='map-pin';
    pin.style.left=x+'%';pin.style.top=y+'%';
    pin.title=safeText(item.title||item.city||'Opportunité');
    pin.setAttribute('aria-label',pin.title);
    pin.addEventListener('click',()=>openPlugy('Donne-moi les informations utiles sur '+safeText(item.title||item.city)+' et dis-moi si cette piste est pertinente.'));
    stage.appendChild(pin);
  });
  const lg=$('#mapLegendText');
  if(lg)lg.textContent=items.length+' points utiles dans le Radar';
}

async function loadData(){
  try{
    const r=await fetch('/api/v102/bootstrap',{cache:'no-store',headers:{'Accept':'application/json'}});
    if(!r.ok)throw new Error('bootstrap '+r.status);
    state.data=await r.json();
    renderRadar();renderArtists();renderMap();
  }catch(err){
    console.warn('[PLUGAR V106] données',err);
  }
}

function addMessage(text,role='bot'){
  const stream=$('#chatStream');
  if(!stream)return null;
  const div=document.createElement('div');
  div.className='chat-msg '+role;
  div.textContent=text;
  stream.appendChild(div);
  stream.scrollTop=stream.scrollHeight;
  return div;
}
function setStatus(text){const el=$('#plugyStatus');if(el)el.textContent=text}
function openPanel(){
  $('#plugyPanel')?.classList.add('open');
  playPlugyMotion('Attentive',false);
  setTimeout(()=>$('#chatInput')?.focus(),180);
}
function closePanel(){$('#plugyPanel')?.classList.remove('open')}
function openPlugy(seed=''){
  openPanel();
  if(seed){
    const input=$('#chatInput');
    if(input)input.value=seed;
  }
}
async function askPlugy(message,voiceReply=false){
  message=safeText(message);
  if(!message)return;
  addMessage(message,'user');
  state.history.push({role:'user',content:message});
  setStatus('Réflexion…');
  playPlugyMotion('Think',true);
  const waiting=addMessage('…','bot');
  const ctx=sectionContext();
  const contextual='Contexte PLUGAR : rubrique '+ctx.label+'. '+ctx.bubble+' Demande utilisateur : '+message;
  let data=null;
  try{
    let r=await fetch('/api/v32/plugy',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      cache:'no-store',
      body:JSON.stringify({message:contextual,page:state.active,mode:'fast',history:state.history.slice(-6)})
    });
    if(!r.ok){
      r=await fetch('/api/plugy',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        cache:'no-store',
        body:JSON.stringify({message:contextual})
      });
    }
    if(!r.ok)throw new Error('PLUGY '+r.status);
    data=await r.json();
    const answer=safeText(data.answer||data.message||'Je suis prêt.');
    waiting.textContent=answer;
    state.history.push({role:'assistant',content:answer});
    setStatus('Prêt · '+ctx.label);
    playPlugyMotion('Present',false);
    if(voiceReply)speak(answer);
    return data;
  }catch(err){
    waiting.textContent='Je n’arrive pas à joindre mon moteur maintenant. Le reste du site reste disponible.';
    setStatus('Connexion interrompue');
    playPlugyMotion('SoftTurn',false);
    console.warn('[PLUGAR V106] PLUGY',err);
  }
}
function bindPromptButtons(){
  $$('[data-open-plugy]').forEach(btn=>{
    if(btn.dataset.bound)return;btn.dataset.bound='1';
    btn.addEventListener('click',()=>openPlugy());
  });
  $$('[data-plugy-prompt]').forEach(btn=>{
    if(btn.dataset.bound)return;btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const prompt=btn.dataset.plugyPrompt||sectionContext().prompt;
      openPanel();askPlugy(prompt,false);
    });
  });
}

function speak(text){
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='fr-FR';u.rate=1.08;u.pitch=1;
  state.speaking=true;
  playPlugyMotion('Present',true);
  u.onend=()=>{state.speaking=false;playPlugyMotion('Idle',true)};
  speechSynthesis.speak(u);
}
function recognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition}
function toggleVoice(){
  const C=recognitionCtor();
  const btn=$('#chatVoice');
  if(!C){
    addMessage('La reconnaissance vocale native n’est pas disponible dans ce navigateur. Tu peux continuer par texte.','bot');
    return;
  }
  if(state.voice&&state.recognition){
    try{state.recognition.stop()}catch(_){}
    return;
  }
  const r=new C();
  r.lang='fr-FR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  state.recognition=r;
  r.onstart=()=>{state.voice=true;btn?.classList.add('listening');setStatus('Je t’écoute…');playPlugyMotion('Attentive',true)};
  r.onresult=e=>{
    let final='',interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0]?.transcript||'';
      if(e.results[i].isFinal)final+=t;else interim+=t;
    }
    const input=$('#chatInput');
    if(input)input.value=(final||interim).trim();
    if(final.trim())askPlugy(final.trim(),true);
  };
  r.onerror=()=>{setStatus('Micro indisponible');playPlugyMotion('SoftTurn',false)};
  r.onend=()=>{state.voice=false;btn?.classList.remove('listening');if(!state.speaking){setStatus('Prêt · '+sectionContext().label);playPlugyMotion('Idle',true)}};
  try{r.start()}catch(err){console.warn(err)}
}

function initChat(){
  bindPromptButtons();
  $('#chatClose')?.addEventListener('click',closePanel);
  $('#chatVoice')?.addEventListener('click',toggleVoice);
  $('#voiceCta')?.addEventListener('click',()=>{openPanel();setTimeout(toggleVoice,160)});
  $('#chatForm')?.addEventListener('submit',e=>{
    e.preventDefault();
    const input=$('#chatInput');
    const msg=input?.value?.trim();
    if(!msg)return;
    input.value='';
    askPlugy(msg,false);
  });
  addEventListener('keydown',e=>{
    if(e.key==='Escape')closePanel();
  });
}

function initStudio(){
  const modes={
    open:['OPEN CALL · PLUGAR','Une opportunité.\\nUn contenu prêt.'],
    deadline:['DERNIÈRE CHANCE · PLUGAR','La deadline\\nne t’attendra pas.'],
    artist:['ARTISTE · PLUGAR','Un parcours.\\nUne présence.'],
    event:['EXPOSITION · PLUGAR','Un lieu.\\nUne rencontre.']
  };
  $$('.tool[data-studio-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.tool[data-studio-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
    const data=modes[btn.dataset.studioMode]||modes.open;
    $('#posterKicker').textContent=data[0];
    $('#posterTitle').innerHTML=data[1].replace('\\n','<br>');
  }));
}

function initCities(){
  $$('[data-city]').forEach(btn=>btn.addEventListener('click',()=>{
    openPanel();
    askPlugy('Montre-moi les opportunités actuellement pertinentes autour de '+btn.dataset.city+'.',false);
  }));
}

function initContextDemo(){
  const lines=[
    '« Tu es dans le Radar. Je peux filtrer les appels ouverts et préparer ta shortlist. »',
    '« Tu es dans le Studio. Je peux reprendre les données du Radar et structurer le carrousel. »',
    '« Tu regardes un artiste. Je peux analyser son parcours et préparer sa prochaine candidature. »'
  ];
  let i=0;
  setInterval(()=>{
    const el=$('#contextDemo');
    if(!el||state.active!=='context')return;
    i=(i+1)%lines.length;
    el.animate([{opacity:.2,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:420,easing:'ease-out'});
    el.textContent=lines[i];
  },3500);
}

function initMobile(){
  const btn=$('#mobileMenu');
  btn?.addEventListener('click',()=>{
    const links=$('.nav-links');
    if(!links)return;
    const open=links.dataset.mobileOpen==='1';
    links.dataset.mobileOpen=open?'0':'1';
    if(!open){
      Object.assign(links.style,{display:'flex',position:'fixed',top:'72px',left:'9px',right:'9px',padding:'18px',borderRadius:'20px',background:'rgba(250,250,248,.96)',boxShadow:'0 20px 60px rgba(20,20,40,.18)',flexDirection:'column',gap:'8px',backdropFilter:'blur(24px)'});
    }else{
      links.removeAttribute('style');
    }
  });
  $$('.nav-links a').forEach(a=>a.addEventListener('click',()=>{
    if(innerWidth<=1050){
      const links=$('.nav-links');if(links){links.dataset.mobileOpen='0';links.removeAttribute('style')}
    }
  }));
}

function boot(){
  initObservers();
  initScroll();
  initPlugyModels();
  initChat();
  initStudio();
  initCities();
  initContextDemo();
  initMobile();
  loadData();
  requestAnimationFrame(()=>$$('.hero .reveal').forEach(x=>x.classList.add('is-visible')));
  window.PLUGAR_V106={state,openPlugy,askPlugy,loadData,playPlugyMotion};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();