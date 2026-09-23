(function(){
'use strict';
const VERSION='106.20260923.1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const home=q('#view-dashboard'); if(!home)return;

function loadModelViewer(){
  if(customElements.get('model-viewer'))return Promise.resolve();
  if(window.__plugV105MV)return window.__plugV105MV;
  window.__plugV105MV=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';
    s.onload=()=>customElements.whenDefined('model-viewer').then(resolve).catch(resolve);s.onerror=reject;document.head.appendChild(s);
  });
  return window.__plugV105MV;
}
function model(tagClass='v105-plugy-model',kind='animated'){
  const saveData=!!navigator.connection?.saveData||innerWidth<760;
  const realistic=kind==='realistic'&&!saveData;
  const src=realistic?'/assets/plugy-v106-realistic.glb?v='+VERSION:'/static/PLUGY_final_animated.glb?v='+VERSION;
  const poster=realistic?' poster="https://storage.to3d.app/generated-3d/images/2026-09-23/task_1833847e-a573-482a-9410-2433496158d4_image.png"':'';
  const autoplay=realistic?'':' autoplay';
  const orbit=realistic?'8deg 76deg 3.15m':'-7deg 77deg 2.95m';
  return '<model-viewer class="'+tagClass+(realistic?' is-realistic':' is-animated')+'" src="'+src+'"'+poster+' camera-controls'+autoplay+' auto-rotate auto-rotate-delay="900" rotation-per-second="'+(realistic?'.8':'1.35')+'deg" camera-orbit="'+orbit+'" camera-target="0m .18m 0m" field-of-view="25deg" interaction-prompt="none" disable-pan disable-zoom shadow-intensity=".24" shadow-softness=".96" environment-image="neutral" exposure="'+(realistic?'1.08':'1.16')+'" tone-mapping="commerce" loading="lazy" reveal="auto"></model-viewer>';
}
home.classList.add('v105-home');
home.innerHTML=`
<section class="v105-section v105-hero" id="v105Hero" data-plugy-label="Accueil">
  <div class="v105-wrap v105-hero-grid">
    <div class="v105-hero-copy v105-reveal">
      <div class="v105-kicker"><i></i> PLUGAR · PLUG ART</div>
      <h1>L’art se<br><em>branche.</em><br>Enfin.</h1>
      <p>Un seul espace pour repérer les opportunités, créer, candidater, rencontrer et avancer. PLUGY garde le fil entre chaque rubrique.</p>
      <div class="v105-actions"><button class="v105-btn dark" data-v105-view="opencalls">Explorer les opportunités</button><button class="v105-btn" data-v105-plugy="Aide-moi à découvrir PLUGAR et dis-moi par quoi commencer.">Parler à PLUGY</button></div>
    </div>
    <div class="v105-hero-stage v105-reveal">
      <div class="v105-glow"></div><div class="v105-rings"><i></i><i></i><i></i></div>
      ${model('v105-plugy-model v105-plugy-realistic','realistic')}
      <div class="v105-hero-note">PLUGY · modèle 3D réaliste / agent contextuel</div>
    </div>
  </div>
</section>

<section class="v105-section v105-brief" id="v105Brief" data-plugy-label="Découverte">
  <div class="v105-wrap">
    <div class="v105-eyebrow v105-reveal">En bref</div>
    <h2 class="v105-display v105-reveal">Tout ce qu’il faut pour passer <span>de l’idée à l’exposition.</span></h2>
    <div class="v105-feature-grid">
      <button class="v105-feature v105-reveal" data-v105-view="radar"><small>01 · RADAR</small><h3>Les bons appels.<br>Pas le bruit.</h3><p>Opportunités triées, accessibles et vérifiées.</p><b>→</b></button>
      <button class="v105-feature v105-reveal" data-v105-view="studio"><small>02 · STUDIO</small><h3>Créer sans quitter le flux.</h3><p>Carrousels, candidatures, dossiers et contenus.</p><b>→</b></button>
      <button class="v105-feature v105-reveal" data-v105-view="map"><small>03 · MAP</small><h3>L’Europe créative en un regard.</h3><p>Les opportunités deviennent géographiques.</p><b>→</b></button>
      <button class="v105-feature v105-reveal" data-v105-plugy="Explique-moi comment tu peux m'aider sur PLUGAR selon la rubrique où je me trouve."><small>04 · PLUGY</small><h3>Un agent qui comprend le contexte.</h3><p>Il change de rôle selon l’endroit où tu travailles.</p><b>⌁</b></button>
    </div>
  </div>
</section>

<section class="v105-section v105-intelligence" id="v105Intelligence" data-plugy-label="Intelligence">
  <div class="v105-wrap v105-intel-grid">
    <div class="v105-intel-copy v105-reveal"><div class="v105-eyebrow">PLUGY · CONTEXT ENGINE</div><h2 class="v105-display">Il ne te suit pas.<br><span>Il comprend où tu es.</span></h2><p>Dans le Radar il filtre. Dans le Studio il structure. Sur une fiche artiste il analyse. Dans une opportunité il prépare la candidature.</p><div class="v105-context-pills"><span>Radar actif</span><span>Paris / Europe</span><span>Peinture</span><span>Collectif</span><span>Budget accessible</span></div></div>
    <div class="v105-intel-stack">
      <article class="v105-intel-card v105-reveal"><div><small>RADAR</small><h3>« Montre-moi uniquement les appels encore ouverts et adaptés aux émergents. »</h3></div><b>01</b></article>
      <article class="v105-intel-card v105-reveal"><div><small>STUDIO</small><h3>« Transforme cette opportunité en carrousel PLUG ART. »</h3></div><b>02</b></article>
      <article class="v105-intel-card v105-reveal"><div><small>ARTISTES</small><h3>« Analyse ce profil et propose les prochaines opportunités pertinentes. »</h3></div><b>03</b></article>
    </div>
  </div>
</section>

<section class="v105-section v105-radar" id="v105Radar" data-plugy-label="Radar">
  <div class="v105-wrap"><div class="v105-split-head"><div><div class="v105-eyebrow v105-reveal">RADAR</div><h2 class="v105-display v105-reveal">Les bonnes opportunités.<br><span>Pas le bruit autour.</span></h2></div><p class="v105-reveal">Le moteur classe l’accessibilité, la discipline, le coût, la deadline, la zone et la fiabilité de la source avant de te montrer une piste.</p></div><div class="v105-opp-grid" id="v105OppGrid"></div><div class="v105-actions" style="margin-top:34px"><button class="v105-btn dark" data-v105-view="opencalls">Ouvrir toutes les opportunités</button><button class="v105-btn" data-v105-view="radar">Ouvrir le Radar complet</button></div></div>
</section>

<section class="v105-section v105-map" id="v105Map" data-plugy-label="Map">
  <div class="v105-wrap v105-map-grid"><div class="v105-map-copy v105-reveal"><div class="v105-eyebrow">PLUGAR MAP</div><h2 class="v105-display">L’Europe créative,<br><span>en un seul regard.</span></h2><p>Paris, Bruxelles, Londres, Amsterdam, Madrid, Milan, Lisbonne. PLUGY peut croiser ta zone, ton médium et tes contraintes.</p><div class="v105-actions"><button class="v105-btn" data-v105-view="map">Explorer la carte</button></div></div><div class="v105-map-board v105-reveal" id="v105MapBoard"><span class="v105-map-label">LIVE OPPORTUNITY MAP · EUROPE</span></div></div>
</section>

<section class="v105-section v105-studio" id="v105Studio" data-plugy-label="Studio">
  <div class="v105-wrap v105-studio-grid"><div class="v105-studio-copy v105-reveal"><div class="v105-eyebrow">STUDIO</div><h2 class="v105-display">Créer sans<br><span>quitter le flux.</span></h2><p>Les données du Radar deviennent directement une candidature, un carrousel, un dossier ou une publication. Pas de copier-coller médiéval entre six onglets.</p><div class="v105-actions"><button class="v105-btn dark" data-v105-view="studio">Ouvrir le Studio</button><button class="v105-btn" data-v105-plugy="Aide-moi à créer un contenu à partir de la meilleure opportunité du Radar.">Créer avec PLUGY</button></div></div><div class="v105-studio-canvas v105-reveal"><div class="v105-poster"><small>PLUG ART</small><h3>OPEN CALL<br>FOR ARTISTS</h3><div class="v105-poster-art"></div><p>Deadline · disciplines · lieu</p></div><div class="v105-tool-list"><button data-v105-view="studio">Texte <span>→</span></button><button data-v105-view="studio">Visuel <span>→</span></button><button data-v105-view="studio">Mise en page <span>→</span></button><button data-v105-view="social">Instagram <span>→</span></button><button data-v105-view="studio">Export <span>→</span></button></div></div></div>
</section>

<section class="v105-section v105-artists" id="v105Artists" data-plugy-label="Artistes">
  <div class="v105-wrap"><div class="v105-eyebrow v105-reveal">RÉSEAU</div><h2 class="v105-display v105-reveal">Des profils qui racontent <span>un parcours.</span></h2><div class="v105-artist-grid" id="v105ArtistGrid"></div><div class="v105-actions" style="margin-top:34px"><button class="v105-btn dark" data-v105-view="artists">Voir les artistes</button></div></div>
</section>

<section class="v105-section v105-voice" id="v105Voice" data-plugy-label="Conversation">
  <div class="v105-wrap v105-voice-grid"><div class="v105-voice-stage v105-reveal">${model('v105-plugy-model v105-plugy-animated','animated')}</div><div class="v105-voice-copy v105-reveal"><div class="v105-eyebrow">PLUGY VOICE</div><h2 class="v105-display">Appuie.<br>Parle.<br><span>Continue.</span></h2><p>Un appui long ou un double-clic ouvre la conversation vocale. PLUGY reprend le contexte de la section et peut ensuite naviguer ou agir dans l’outil.</p><div class="v105-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><button class="v105-btn dark" data-v105-plugy="Ouvre une conversation avec moi et aide-moi dans la section actuelle.">Parler à PLUGY</button></div></div>
</section>

<section class="v105-section v105-final" id="v105Final" data-plugy-label="Entrer">
  <div class="v105-wrap"><div class="v105-eyebrow v105-reveal">PLUGAR</div><h2 class="v105-display v105-reveal">Branche ton<br><span>prochain projet.</span></h2><p class="v105-reveal">Explore. Crée. Candidate. Expose. PLUGY garde le fil.</p><div class="v105-actions" style="justify-content:center"><button class="v105-btn" data-v105-view="radar">Entrer dans PLUGAR</button></div></div>
</section>
<footer class="v105-footer"><div class="v105-wrap v105-footer-row"><div><strong>PLUGAR · PLUG ART</strong><br>Le réseau-outil pour artistes émergents.</div><div>Radar · Map · Studio · Artistes · Instagram · CRM</div><div>Paris · Europe · 2026</div></div></footer>
`;

const nav=document.createElement('nav');nav.className='v105-site-nav';nav.innerHTML='<div class="v105-brand"><strong>PLUG</strong><span>AR</span><i></i></div><div class="v105-navlinks"><a href="#v105Radar">Radar</a><a href="#v105Map">Map</a><a href="#v105Studio">Studio</a><a href="#v105Artists">Artistes</a><button data-v105-plugy="Présente-moi PLUGAR et aide-moi à choisir ma prochaine action.">PLUGY</button><button class="v105-enter" data-v105-view="radar">Entrer</button></div>';
document.body.appendChild(nav);

const guide=document.createElement('div');guide.className='v105-guide';guide.innerHTML='<div class="v105-guide-orb"></div><div><span>PLUGY · CONTEXTE</span><strong id="v105GuideLabel">Accueil</strong></div><button id="v105GuideAsk" aria-label="Parler à PLUGY">⌁</button>';document.body.appendChild(guide);

function goView(id){ if(window.PLUG65?.view)window.PLUG65.view(id); else location.hash='#'+id; }
qa('[data-v105-view]').forEach(b=>b.addEventListener('click',()=>goView(b.dataset.v105View)));

let currentContext='Accueil';
const motionByContext={
  'Accueil':'Idle','Découverte':'Curious','Intelligence':'Think','Radar':'Attentive',
  'Map':'SoftTurn','Studio':'Present','Artistes':'Happy','Conversation':'Attentive','Entrer':'Wave'
};
let plugyResetTimer=0;
function playPlugyMotion(name='Idle',loop=false){
  document.body.dataset.plugyMotion=String(name).toLowerCase();
  qa('.v105-plugy-model').forEach(mv=>{
    const run=()=>{
      const list=mv.availableAnimations||[];
      const target=list.includes(name)?name:(list.includes('Idle')?'Idle':list[0]);
      if(!target)return;
      try{
        clearTimeout(plugyResetTimer);
        mv.animationName=target;
        mv.timeScale=target==='Think'?.82:target==='Attentive'?.92:1;
        mv.play({repetitions:loop?Infinity:1});
        if(!loop&&target!=='Idle')plugyResetTimer=setTimeout(()=>playPlugyMotion('Idle',true),1450);
      }catch{}
    };
    if(mv.loaded)run();else mv.addEventListener('load',run,{once:true});
  });
}
function contextualPrompt(prompt){
  return 'Contexte PLUGAR actuel : '+currentContext+'. '+String(prompt||'').trim();
}
async function openPlugy(prompt){
  currentContext=document.body.dataset.plugyContext||currentContext;
  playPlugyMotion('Attentive',false);
  try{await window.PLUGART_V104?.ensurePlugy?.()}catch{}
  window.PLUG65?.openChat?.();
  const full=contextualPrompt(prompt);
  const input=q('#chatInput');if(input){input.placeholder='PLUGY · '+currentContext+' · Demande…';if(prompt)input.value=prompt}
  if(prompt&&window.PlugyAssistant?.ask)setTimeout(()=>window.PlugyAssistant.ask(full),80);
}
qa('[data-v105-plugy]').forEach(b=>b.addEventListener('click',()=>openPlugy(b.dataset.v105Plugy)));
q('#v105GuideAsk')?.addEventListener('click',()=>openPlugy('Aide-moi dans la section '+currentContext+'.'));

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderData(){
  const st=window.PLUG65?.state||{};
  const opps=(st.opps||[]).slice().sort((a,b)=>Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,3);
  const og=q('#v105OppGrid');if(og)og.innerHTML=opps.map(o=>'<article class="v105-opp v105-reveal"><div class="v105-opp-media"><img src="/api/v67/opportunities/'+encodeURIComponent(o.id)+'/thumbnail" alt="" loading="lazy"></div><small>'+esc([o.city,o.country].filter(Boolean).join(' · ')||'OPEN CALL')+'</small><h3>'+esc(o.title)+'</h3><p>'+esc((o.summary||o.radar_reason||'').slice(0,145))+'</p><footer><span class="v105-score">'+Number(o.radar_score??o.score??0)+'/100</span><button class="v105-link" data-v105-open="'+esc(o.id)+'">Voir →</button></footer></article>').join('')||'<article class="v105-opp"><h3>Le Radar se synchronise…</h3></article>';
  qa('[data-v105-open]').forEach(b=>b.onclick=()=>{goView('opencalls');setTimeout(()=>window.PLUG65?.openOppDetails?.(b.dataset.v105Open),180)});
  const artists=(st.artists||[]).slice(0,4),ag=q('#v105ArtistGrid');if(ag)ag.innerHTML=artists.map((a,i)=>'<article class="v105-artist v105-reveal"><div class="v105-artist-visual">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><h3>'+esc(a.name||'Artiste')+'</h3><p>'+esc(a.discipline||a.city||'Artiste émergent')+'</p></article>').join('')||['Artiste 01','Artiste 02','Artiste 03','Artiste 04'].map(x=>'<article class="v105-artist"><div class="v105-artist-visual">✦</div><h3>'+x+'</h3><p>Profil à synchroniser</p></article>').join('');
  const mb=q('#v105MapBoard');if(mb){qa('.v105-map-pin',mb).forEach(x=>x.remove());(st.map||[]).slice(0,24).forEach((p,i)=>{const pin=document.createElement('i');pin.className='v105-map-pin';const lon=Number(p.lon),lat=Number(p.lat);pin.style.left=(Number.isFinite(lon)?Math.max(5,Math.min(95,(lon+15)/45*100)):10+(i*17)%82)+'%';pin.style.top=(Number.isFinite(lat)?Math.max(8,Math.min(92,(62-lat)/30*100)):12+(i*23)%76)+'%';pin.title=p.title||'';mb.appendChild(pin)})}
  observeReveal();
}
function observeReveal(){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});
  qa('.v105-reveal:not(.in)').forEach(el=>io.observe(el));
}
const contextObserver=new IntersectionObserver(entries=>{
  entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio).slice(0,1).forEach(e=>{
    currentContext=e.target.dataset.plugyLabel||'PLUGAR';document.body.dataset.plugyContext=currentContext;
    const l=q('#v105GuideLabel');if(l)l.textContent=currentContext;
    playPlugyMotion(motionByContext[currentContext]||'Idle',currentContext==='Accueil');
  });
},{threshold:[.34,.58]});
qa('[data-plugy-label]').forEach(s=>contextObserver.observe(s));

let ticking=false;
addEventListener('scroll',()=>{
  nav.classList.toggle('scrolled',scrollY>30);
  if(!ticking){requestAnimationFrame(()=>{const hero=q('.v105-hero-stage');if(hero)hero.style.transform='translateY('+Math.min(42,scrollY*.035)+'px)';ticking=false});ticking=true}
},{passive:true});

loadModelViewer().then(()=>{
  qa('.v105-plugy-model').forEach(mv=>{
    mv.addEventListener('load',()=>playPlugyMotion('Idle',true),{once:true});
    mv.addEventListener('pointerenter',()=>playPlugyMotion('Curious',false));
    mv.addEventListener('dblclick',()=>openPlugy('Je veux te parler depuis la section '+currentContext+'.'));
  });
}).catch(()=>{});
const heroStage=q('.v105-hero-stage');
heroStage?.addEventListener('pointermove',e=>{
  if(matchMedia('(pointer:coarse)').matches)return;
  const r=heroStage.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width-.5,dy=(e.clientY-r.top)/r.height-.5;
  heroStage.style.setProperty('--v105-px',(dx*14).toFixed(2)+'px');
  heroStage.style.setProperty('--v105-py',(dy*10).toFixed(2)+'px');
});
heroStage?.addEventListener('pointerleave',()=>{heroStage.style.setProperty('--v105-px','0px');heroStage.style.setProperty('--v105-py','0px')});
setInterval(()=>{
  if(document.body.dataset.view!=='dashboard'||window.PlugyAssistant?.state?.conversation)return;
  const idle=['Blink','SoftTurn','Curious'][Math.floor(Math.random()*3)];
  playPlugyMotion(idle,false);
},8200);
observeReveal();
renderData();
addEventListener('plugart:hydrated',renderData);
window.PLUG105={renderData,openPlugy,version:VERSION};
})();