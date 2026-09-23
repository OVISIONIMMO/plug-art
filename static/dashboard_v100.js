
(function(){
'use strict';

function init(){
  const P=window.PLUG65;
  if(!P)return;
  const q=P.q||((s,r=document)=>r.querySelector(s));
  const qa=P.qa||((s,r=document)=>[...r.querySelectorAll(s)]);
  const view=P.view||(()=>{});

  document.body.classList.remove('v89-ui');
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
