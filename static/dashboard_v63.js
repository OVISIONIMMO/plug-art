const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?u:'#';
const state={stats:{},opps:[],artists:[],events:[],map:[],radar:{},slides:[],slide:0,preset:'open',theme:'editorial'};
const store={
 get(k,d=[]){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},
 set(k,v){localStorage.setItem(k,JSON.stringify(v))}
};
let notes=store.get('plugart_v62_notes',[]);
let contacts=store.get('plugart_v62_contacts',[]);

function view(id){
  const good=['dashboard','radar','studio','network','workspace'].includes(id)?id:'dashboard';
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+good));
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===good));
  history.replaceState(null,'','#'+good);
  scrollTo({top:0,behavior:'smooth'});
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
addEventListener('hashchange',()=>view(location.hash.slice(1)||'dashboard'));

async function api(url,opt){const r=await fetch(url,{cache:'no-store',...opt});if(!r.ok)throw new Error(await r.text()||r.status);const ct=r.headers.get('content-type')||'';return ct.includes('json')?r.json():r.text()}
function oppImage(o){return '/api/opportunities/'+encodeURIComponent(o.id)+'/thumbnail'}
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}catch{return v}}
function initials(name){return String(name||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}

async function loadAll(){
  try{
    const [stats,opps,artists,events,map,radar]=await Promise.all([
      api('/api/stats'),api('/api/opportunities'),api('/api/artists'),api('/api/exhibitions'),api('/api/map'),api('/api/radar/status')
    ]);
    Object.assign(state,{stats,opps,artists,events,map,radar});
    renderDashboard();renderRadar();renderNetwork();fillStudioSources();
    if(!state.slides.length)buildStudio();
  }catch(e){console.error('PLUG ART load',e)}
}
function renderDashboard(){
  $('#dashOpp').textContent=state.stats.opportunities??state.opps.length;
  $('#dashArtistCount').textContent=state.stats.artists??state.artists.length;
  const run=state.radar?.last_run||{};
  $('#dashRadar').textContent=run.online??run.checked??'LIVE';
  const scores=state.opps.map(o=>Number(o.radar_score??o.score??0)).filter(n=>Number.isFinite(n));
  const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  $('#dashScore').textContent=avg?avg+'%':'—';
  $('#dashCycle').textContent=run.finished_at?fmtDate(run.finished_at):'—';
  updateChart(scores.slice(0,9));
  const calls=state.opps.slice().sort((a,b)=>Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,3);
  $('#dashCalls').innerHTML=calls.length?calls.map(o=>`<button class="call-item" data-open-opp="${esc(o.id)}"><div class="call-thumb" style="background-image:url('${oppImage(o)}')"></div><div><b>${Number(o.radar_score??o.score??0)}/100</b><h3>${esc(o.title)}</h3><p>${esc([o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call')}</p></div></button>`).join(''):'<div class="skeleton"></div>';
  $('#teaserTitle').innerHTML=esc(calls[0]?.title||'6 opportunités d’exposer').replace(/\s+/g,' ').slice(0,46);
  const artists=state.artists.slice(0,6);
  $('#dashArtists').innerHTML=artists.map(a=>`<span class="avatar-chip" title="${esc(a.name)}">${esc(initials(a.name))}</span>`).join('')+(state.artists.length>6?`<span class="avatar-chip">+${state.artists.length-6}</span>`:'');
  renderMiniMap();
  $$('[data-open-opp]').forEach(b=>b.onclick=()=>{view('radar');setTimeout(()=>document.querySelector('[data-opp-id="'+CSS.escape(b.dataset.openOpp)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'}),80)});
}
function updateChart(scores){
  if(!scores.length)return;
  const w=520,h=160,pad=18;const vals=scores.length<4?[...scores,...scores,...scores].slice(0,7):scores;
  const pts=vals.map((v,i)=>[i*(w/(vals.length-1)),h-pad-(Math.max(0,Math.min(100,v))/100)*(h-pad*2)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  $('#signalLine').setAttribute('d',line);
  $('#signalArea').setAttribute('d',line+' L '+w+' '+(h-pad)+' L 0 '+(h-pad)+' Z');
}
function renderMiniMap(){
  const box=$('#miniMap');box.querySelectorAll('.map-pin-v62').forEach(x=>x.remove());
  state.map.slice(0,12).forEach((p,i)=>{const pin=document.createElement('i');pin.className='map-pin-v62';const lon=Number(p.lon),lat=Number(p.lat);pin.style.left=(Number.isFinite(lon)?((lon+180)/360*100):(18+i*6))+'%';pin.style.top=(Number.isFinite(lat)?((90-lat)/180*100):(35+(i%4)*11))+'%';pin.title=p.title||'';box.appendChild(pin)});
}

function renderRadar(){
  const countries=[...new Set(state.opps.map(o=>o.country).filter(Boolean))].sort();
  $('#countryFilter').innerHTML='<option value="">Tous</option>'+countries.map(c=>'<option>'+esc(c)+'</option>').join('');
  const run=state.radar?.last_run||{};
  $('#radarLast').textContent=run.finished_at?new Date(run.finished_at).toLocaleString('fr-FR'):'Aucun cycle';
  $('#radarInfo').textContent=run?`${run.checked??0} sources · ${run.online??0} en ligne · ${run.errors??0} erreurs`:'Moteur prêt';
  filterRadar();
}
function filterRadar(){
  const q=($('#searchOpp').value||'').toLowerCase(),country=$('#countryFilter').value,min=Number($('#scoreFilter').value||0);
  const list=state.opps.filter(o=>{
    const hay=[o.title,o.city,o.country,o.type,o.summary].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min;
  });
  $('#opportunityList').innerHTML=list.length?list.map(o=>{
    const score=Number(o.radar_score??o.score??0),loc=[o.city,o.country].filter(Boolean).join(' · ')||'International';
    return `<article class="opp-row" data-opp-id="${esc(o.id)}"><div class="opp-img" style="background-image:url('${oppImage(o)}')"></div><div class="opp-copy"><div class="meta">${esc(o.type||'OPEN CALL')} · ${esc(loc)}</div><h3>${esc(o.title)}</h3><p>${esc(o.summary||o.radar_reason||'Analyse en cours')}</p></div><div class="opp-side"><span class="score-pill">${score}/100</span><a class="source-link" href="${esc(safeUrl(o.source_url))}" target="_blank" rel="noopener">Source ↗</a><button class="text-btn use-in-studio" data-studio-opp="${esc(o.id)}">Studio ✦</button></div></article>`;
  }).join(''):'<div class="panel" style="padding:28px">Aucune opportunité ne correspond aux filtres.</div>';
  $$('.use-in-studio').forEach(b=>b.onclick=()=>{view('studio');$('#studioSource').value=String(b.dataset.studioOpp);syncBriefFromSource();buildStudio()});
}
['searchOpp','countryFilter','scoreFilter'].forEach(id=>$('#'+id).addEventListener(id==='searchOpp'?'input':'change',filterRadar));
async function runRadar(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='Analyse…';try{await api('/api/radar/run',{method:'POST'});await loadAll()}catch(e){alert('Radar indisponible : '+e.message)}finally{btn.disabled=false;btn.textContent=old}}
$('#runRadar').onclick=()=>runRadar($('#runRadar'));$('#runRadarHome').onclick=()=>runRadar($('#runRadarHome'));

function renderNetwork(){
  $('#artistList').innerHTML=state.artists.length?state.artists.map(a=>`<div class="network-item"><strong>${esc(a.name)}</strong><span>${esc(a.discipline||'Artiste')} · ${esc(a.city||a.country||'')}</span><p>${esc((a.bio||'').slice(0,150))}</p></div>`).join(''):'<div class="network-item">Aucun artiste.</div>';
  $('#eventList').innerHTML=state.events.length?state.events.map(e=>`<div class="network-item"><strong>${esc(e.title)}</strong><span>${esc(e.city||e.country||'')} · ${esc(fmtDate(e.start))}</span><p>${esc(e.venue||'Lieu à confirmer')}</p></div>`).join(''):'<div class="network-item">Aucun événement.</div>';
  const map=$('#worldMap');map.innerHTML='';
  state.map.forEach(p=>{const lon=Number(p.lon),lat=Number(p.lat);if(!Number.isFinite(lon)||!Number.isFinite(lat))return;const pin=document.createElement('i');pin.className='world-pin';pin.style.left=((lon+180)/360*100)+'%';pin.style.top=((90-lat)/180*100)+'%';pin.title=p.title||'';map.appendChild(pin)});
}

function fillStudioSources(){
  const cur=$('#studioSource').value;
  $('#studioSource').innerHTML='<option value="">Brief libre</option>'+state.opps.map(o=>`<option value="${esc(o.id)}">${esc((o.title||'').slice(0,68))}</option>`).join('');
  if(cur)$('#studioSource').value=cur;
}
function currentOpp(){return state.opps.find(o=>String(o.id)===String($('#studioSource').value))}
function syncBriefFromSource(){const o=currentOpp();if(o&&!$('#studioBrief').value.trim())$('#studioBrief').value=o.summary||o.radar_reason||''}
$('#studioSource').onchange=()=>{syncBriefFromSource();buildStudio()};
$('#studioCount').oninput=()=>{$('#studioCountValue').textContent=$('#studioCount').value};
$$('[data-preset]').forEach(b=>b.onclick=()=>{state.preset=b.dataset.preset;$$('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));buildStudio()});
$$('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;$$('[data-theme]').forEach(x=>x.classList.toggle('active',x===b));renderStudio()});

function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function short(s,n=170){s=clean(s);return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s}
function makeSlide(k,t,b,c,img=''){return{kicker:k,title:t,body:b,cta:c,image:img}}
function buildStudio(){
  const o=currentOpp(),brief=clean($('#studioBrief').value),count=Number($('#studioCount').value||5),obj=$('#studioObjective').value;
  const title=o?.title||brief||'Une opportunité à regarder maintenant';
  const summary=short(o?.summary||brief||'PLUG ART transforme les informations utiles en récit clair, visuel et directement exploitable.',230);
  const loc=[o?.city,o?.country].filter(Boolean).join(' · ')||'À confirmer';
  const deadline=o?.deadline?'Deadline · '+o.deadline:'Date à vérifier';
  const fee=o?.fee||'Conditions à vérifier';
  const img=o?oppImage(o):'';
  let slides=[];
  if(state.preset==='urgent'){
    slides=[makeSlide('DERNIER RAPPEL',deadline,'Une opportunité à ne pas laisser passer.','Voir les infos →',img),makeSlide('À RETENIR',title,summary,'Continuer →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('ACTION','Prépare ton dossier maintenant.','Vérifie la source officielle avant d’envoyer.','Candidater →',img)];
  }else if(state.preset==='artist'){
    slides=[makeSlide('FOCUS ARTISTE',title,'Un univers à découvrir.','Découvrir →',img),makeSlide('UNIVERS',o?.type||'Création contemporaine',summary,'Explorer →',img),makeSlide('PARCOURS','Ce qui rend ce profil singulier.',short(o?.radar_reason||summary,180),'Lire →',img),makeSlide('À SUIVRE','Les prochaines étapes.','Expositions, projets et connexions à garder dans le radar.','Suivre →',img)];
  }else if(state.preset==='event'){
    slides=[makeSlide('À L’AGENDA',title,loc,'Découvrir →',img),makeSlide('POURQUOI Y ALLER','Une scène, des artistes, des connexions.',summary,'Voir plus →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('PLUG ART','Prépare ta visite.','Repère les artistes et contacts à rencontrer.','Organiser →',img)];
  }else{
    slides=[makeSlide(obj==='apply'?'OPPORTUNITÉ À SAISIR':'OPEN CALL',title,loc,'Découvrir →',img),makeSlide('POURQUOI C’EST INTÉRESSANT','Une opportunité qui mérite ton attention.',short(o?.radar_reason||summary,200),'Voir plus →',img),makeSlide('LE PROJET',o?.type||'Exposition / appel à projets',summary,'Comprendre →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('ACTION','À toi de jouer.','Consulte la source officielle et vérifie les critères avant de candidater.','PLUG →',img)];
  }
  while(slides.length<count)slides.splice(slides.length-1,0,makeSlide('À SAVOIR','Point clé '+slides.length,summary,'Continuer →',img));
  state.slides=slides.slice(0,count);state.slide=0;renderStudio();generateCaption();
}
$('#generateStudio').onclick=buildStudio;

function renderStudio(){
  if(!state.slides.length)return;
  state.slide=Math.max(0,Math.min(state.slide,state.slides.length-1));const s=state.slides[state.slide];
  $('#studioCounter').textContent='Slide '+(state.slide+1)+' / '+state.slides.length;
  $('#artKicker').textContent=s.kicker;$('#artTitle').textContent=s.title;$('#artBody').textContent=s.body;$('#artCta').textContent=s.cta;
  $('#artPhoto').style.backgroundImage=s.image?`url("${s.image}")`:'linear-gradient(135deg,#215b59,#68608c,#b46591)';
  const art=$('#carouselArt');art.className='carousel-art '+state.theme;
  $('#editKicker').value=s.kicker;$('#editTitle').value=s.title;$('#editBody').value=s.body;$('#editCta').value=s.cta;$('#editImage').value=s.image.startsWith('/api/')?'':s.image;
  $('#slideDots').innerHTML=state.slides.map((_,i)=>`<button class="slide-dot ${i===state.slide?'active':''}" data-slide="${i}"></button>`).join('');
  $('#studioStrip').innerHTML=state.slides.map((x,i)=>`<button class="strip-slide ${i===state.slide?'active':''}" data-slide="${i}"><b>${String(i+1).padStart(2,'0')}</b><br>${esc(short(x.title,45))}</button>`).join('');
  $$('[data-slide]').forEach(b=>b.onclick=()=>{state.slide=Number(b.dataset.slide);renderStudio()});
}
$('#prevStudio').onclick=()=>{state.slide=(state.slide-1+state.slides.length)%state.slides.length;renderStudio()};
$('#nextStudio').onclick=()=>{state.slide=(state.slide+1)%state.slides.length;renderStudio()};
[['editKicker','kicker'],['editTitle','title'],['editBody','body'],['editCta','cta'],['editImage','image']].forEach(([id,key])=>$('#'+id).oninput=()=>{if(state.slides[state.slide]){state.slides[state.slide][key]=$('#'+id).value;renderStudio()}});
$('#duplicateStudio').onclick=()=>{const s=state.slides[state.slide];state.slides.splice(state.slide+1,0,{...s});state.slide++;renderStudio()};
$('#deleteStudio').onclick=()=>{if(state.slides.length<=3)return;state.slides.splice(state.slide,1);state.slide=Math.min(state.slide,state.slides.length-1);renderStudio()};
function generateCaption(){
  const o=currentOpp(),title=o?.title||state.slides[0]?.title||'Nouvelle opportunité';
  const city=[o?.city,o?.country].filter(Boolean).join(', ');
  $('#captionText').value=`🎨 ${title}\n\n${short(o?.summary||$('#studioBrief').value||state.slides[0]?.body,300)}\n\n${city?'📍 '+city+'\n':''}${o?.deadline?'⏳ '+o.deadline+'\n':''}\n👉 Retrouve les infos via PLUG ART.\n\n#PlugArt #OpenCall #ArtEmergent #Exposition`;
}
$('#generateCaption').onclick=generateCaption;
$('#saveDraftBtn').onclick=()=>{const drafts=store.get('plugart_v62_drafts',[]);drafts.unshift({id:Date.now(),slides:state.slides,theme:state.theme,caption:$('#captionText').value});store.set('plugart_v62_drafts',drafts.slice(0,12));$('#saveDraftBtn').textContent='Sauvegardé ✓';setTimeout(()=>$('#saveDraftBtn').textContent='Sauvegarder',1000)};
$('#exportSlideBtn').onclick=exportSlide;
async function exportSlide(){
  const s=state.slides[state.slide];if(!s)return;
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,W,H);
  if(state.theme==='impact'){grad.addColorStop(0,'#122221');grad.addColorStop(1,'#303c39')}else if(state.theme==='glass'){grad.addColorStop(0,'#eef5f0');grad.addColorStop(.55,'#d7e7e2');grad.addColorStop(1,'#e7d8e8')}else{grad.addColorStop(0,'#f1efe8');grad.addColorStop(1,'#e4e1da')}ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  let mediaH=520;
  if(s.image){await new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const r=Math.max(W/im.width,mediaH/im.height),dw=im.width*r,dh=im.height*r;ctx.drawImage(im,(W-dw)/2,(mediaH-dh)/2,dw,dh);resolve()};im.onerror=resolve;im.src=s.image})}
  if(!s.image){const g=ctx.createLinearGradient(0,0,W,mediaH);g.addColorStop(0,'#245b58');g.addColorStop(.5,'#6e628e');g.addColorStop(1,'#b16691');ctx.fillStyle=g;ctx.fillRect(0,0,W,mediaH)}
  const dark=state.theme==='impact';ctx.fillStyle=dark?'#74ddd4':'#6d63d5';ctx.font='800 28px Arial';ctx.fillText(s.kicker.toUpperCase(),72,585);
  ctx.fillStyle=dark?'#f4f5ef':'#182220';ctx.font='900 68px Arial';wrap(ctx,s.title,72,640,936,72,4);
  ctx.fillStyle=dark?'#b8c4bf':'#66736e';ctx.font='400 31px Arial';wrap(ctx,s.body,72,855,936,43,6);
  ctx.fillStyle=dark?'#fff':'#182220';ctx.font='900 25px Arial';ctx.fillText('PLUG ART',72,1260);ctx.textAlign='right';ctx.fillText(s.cta,1008,1260);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PLUG_ART_slide_'+String(state.slide+1).padStart(2,'0')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)
}
function wrap(ctx,text,x,y,w,lh,max){const words=String(text||'').split(/\s+/),lines=[];let line='';for(const word of words){const t=line?line+' '+word:word;if(ctx.measureText(t).width>w&&line){lines.push(line);line=word}else line=t}if(line)lines.push(line);lines.slice(0,max).forEach((l,i)=>ctx.fillText(l,x,y+i*lh))}

async function improveStudio(){
  const summary=state.slides.map((s,i)=>`${i+1}. ${s.title} — ${s.body}`).join('\n');
  openChat();addChat('Je relis ton carrousel…','bot');
  try{const r=await api('/api/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Améliore ce carrousel PLUG ART sans inventer d’informations. Donne une meilleure accroche, des corrections slide par slide et un CTA final. '+summary})});addChat(r.answer||'Analyse terminée.','bot')}catch(e){addChat('Je n’ai pas pu joindre le moteur : '+e.message,'bot')}
}
$('#improveStudio').onclick=improveStudio;

function renderNotes(){
  $('#notesList').innerHTML=notes.length?notes.map(n=>`<div class="note-card"><small>${esc(n.date)}</small><strong>${esc(n.title||'Note')}</strong><p>${esc(n.body||'')}</p></div>`).join(''):'<div class="note-card"><p>Aucune note pour le moment.</p></div>';
}
function renderContacts(){
  $('#contactsList').innerHTML=contacts.length?contacts.map(c=>`<div class="contact-card"><small>${esc(c.status||'À contacter')}</small><strong>${esc(c.name)}</strong><p>${esc(c.info||'')}</p></div>`).join(''):'<div class="contact-card"><p>Aucun contact enregistré.</p></div>';
}
function openModal(html){$('#modalContent').innerHTML=html;$('#simpleModal').classList.add('open')}
function closeModal(){$('#simpleModal').classList.remove('open')}
$('#modalClose').onclick=closeModal;$('#simpleModal').onclick=e=>{if(e.target===$('#simpleModal'))closeModal()};
$('#newNote').onclick=()=>openModal('<h3>Nouvelle note</h3><label>Titre<input id="mTitle"></label><label>Note<textarea id="mBody"></textarea></label><button class="save" id="mSave">Enregistrer</button>');
$('#newContact').onclick=()=>openModal('<h3>Nouveau contact</h3><label>Nom<input id="mName"></label><label>Information<textarea id="mInfo"></textarea></label><label>Statut<select id="mStatus"><option>À contacter</option><option>Contacté</option><option>Relance</option><option>Partenaire</option></select></label><button class="save" id="mSave">Enregistrer</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id!=='mSave')return;if($('#mTitle')){notes.unshift({id:Date.now(),title:$('#mTitle').value,body:$('#mBody').value,date:new Date().toLocaleString('fr-FR')});store.set('plugart_v62_notes',notes);renderNotes()}else if($('#mName')){contacts.unshift({id:Date.now(),name:$('#mName').value,info:$('#mInfo').value,status:$('#mStatus').value});store.set('plugart_v62_contacts',contacts);renderContacts()}closeModal()});
$('[data-work="note"]').onclick=()=>{view('workspace');setTimeout(()=>$('#newNote').click(),150)};

function openChat(){$('#plugyChat').classList.add('open');playPlugy('Happy',true)}function closeChat(){$('#plugyChat').classList.remove('open')}
$('#openPlugy').onclick=openChat;$('#askPlugy').onclick=openChat;$('#closeChat').onclick=closeChat;
function addChat(t,who='bot'){const d=document.createElement('div');d.className=who==='user'?'user-msg':'bot-msg';d.textContent=t;$('#chatStream').appendChild(d);$('#chatStream').scrollTop=$('#chatStream').scrollHeight}
$('#chatForm').onsubmit=async e=>{e.preventDefault();const q=$('#chatInput').value.trim();if(!q)return;$('#chatInput').value='';addChat(q,'user');playPlugy('Think',false);try{const r=await api('/api/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})});addChat(r.answer||'Analyse terminée.','bot');playPlugy('Happy',true)}catch(err){addChat('Connexion impossible pour le moment.','bot');playPlugy('Idle',false)}};

const mv=$('#plugyModel');let idleTimer;
function playPlugy(name,once=true){if(!mv)return;const run=()=>{const a=mv.availableAnimations||[];if(!a.includes(name))return;try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});if(once)setTimeout(()=>playPlugy('Idle',false),name==='Blink'?450:1200)}catch{}};if(mv.loaded)run();else mv.addEventListener('load',run,{once:true})}
mv?.addEventListener('load',()=>{playPlugy('Idle',false);schedulePlugy()},{once:true});
$$('[data-anim]').forEach(b=>b.onclick=()=>playPlugy(b.dataset.anim,true));
function schedulePlugy(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{playPlugy(['Blink','Curious','SoftTurn','Happy','Attentive'][Math.floor(Math.random()*5)],true);schedulePlugy()},7500+Math.random()*5000)}

$('#globalSearch').onclick=()=>openModal('<h3>Naviguer</h3><label>Rubrique<select id="mNav"><option value="dashboard">Dashboard</option><option value="radar">Radar & Open Calls</option><option value="studio">Studio contenu</option><option value="network">Réseau</option><option value="workspace">Bureau</option></select></label><button class="save" id="mGo">Ouvrir</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='mGo'){view($('#mNav').value);closeModal()}});

renderNotes();renderContacts();view(location.hash.slice(1)||'dashboard');loadAll();


/* ===== V63 INTERNAL WORKSPACE OVERRIDES ===== */
state.candidates=[]; state.zoom=1;

async function loadAll(){
  try{
    const urls=['/api/stats','/api/opportunities','/api/artists','/api/exhibitions','/api/map','/api/radar/status','/api/radar/candidates'];
    const all=await Promise.all(urls.map(async function(u){try{return await api(u)}catch(e){return u.indexOf('candidates')>=0?[]:{}}}));
    state.stats=all[0]||{}; state.opps=Array.isArray(all[1])?all[1]:[]; state.artists=Array.isArray(all[2])?all[2]:[];
    state.events=Array.isArray(all[3])?all[3]:[]; state.map=Array.isArray(all[4])?all[4]:[]; state.radar=all[5]||{}; state.candidates=Array.isArray(all[6])?all[6]:[];
    renderDashboard(); renderRadar(); renderNetwork(); renderWorkspace(); fillStudioSources();
    if(!state.slides.length) buildStudio();
    checkImageStatus();
  }catch(e){ console.error('PLUG ART V63 load',e); }
}

function renderDashboard(){
  var drafts=store.get('plugart_v63_drafts',store.get('plugart_v62_drafts',[]));
  $('#dashOpp').textContent=state.stats.opportunities??state.opps.length;
  $('#dashArtistCount').textContent=state.stats.artists??state.artists.length;
  $('#dashPending').textContent=state.candidates.length;
  $('#dashDrafts').textContent=drafts.length;
  var run=state.radar&&state.radar.last_run?state.radar.last_run:{};
  $('#dashRadar').textContent=run.online??run.checked??'—';
  $('#dashCycle').textContent=run.finished_at?fmtDate(run.finished_at):'—';
  var scores=state.opps.map(function(o){return Number(o.radar_score??o.score??0)}).filter(Number.isFinite);
  var avg=scores.length?Math.round(scores.reduce(function(a,b){return a+b},0)/scores.length):0;
  $('#dashScore').textContent=avg?avg+'%':'—';
  updateChart(scores.slice(0,9));
  var calls=state.opps.slice().sort(function(a,b){return Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)}).slice(0,5);
  $('#dashCalls').innerHTML=calls.length?calls.map(function(o){
    return '<button class="priority-item" data-open-opp="'+esc(o.id)+'"><div class="priority-thumb" style="background-image:url(\''+oppImage(o)+'\')"></div><div><h3>'+esc(o.title)+'</h3><p>'+esc([o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call')+'</p></div><b>'+Number(o.radar_score??o.score??0)+'</b></button>';
  }).join(''):'<div class="mini-row"><span>Aucune opportunité.</span></div>';
  $$('[data-open-opp]').forEach(function(b){b.onclick=function(){view('radar');setTimeout(function(){var x=document.querySelector('[data-opp-id="'+CSS.escape(b.dataset.openOpp)+'"]');if(x)x.scrollIntoView({behavior:'smooth',block:'center'})},100)}});
  $('#dashCandidates').innerHTML=state.candidates.slice(0,3).map(function(c){return '<div class="mini-row"><strong>'+esc(short(c.title,70))+'</strong><span>'+esc(c.source_name||'À vérifier')+' · '+Number(c.candidate_score||0)+'/100</span></div>'}).join('')||'<div class="mini-row"><span>Aucune nouvelle piste.</span></div>';
  $('#dashDraftList').innerHTML=drafts.slice(0,3).map(function(d){return '<div class="mini-row"><strong>'+esc(short(d.name||(d.slides&&d.slides[0]&&d.slides[0].title)||'Carrousel',65))+'</strong><span>'+((d.slides&&d.slides.length)||0)+' slides · '+esc(d.date||'Brouillon')+'</span></div>'}).join('')||'<div class="mini-row"><span>Aucun brouillon.</span></div>';
  $('#dashEvents').innerHTML=state.events.slice(0,3).map(function(e){return '<div class="mini-row"><strong>'+esc(short(e.title,65))+'</strong><span>'+esc(e.city||e.country||'')+' · '+esc(fmtDate(e.start))+'</span></div>'}).join('')||'<div class="mini-row"><span>Aucun événement.</span></div>';
  renderMiniMap();
}

function renderMiniMap(){
  var box=$('#miniMap'); if(!box)return; box.innerHTML='';
  state.map.slice(0,14).forEach(function(p,i){
    var lon=Number(p.lon),lat=Number(p.lat),pin=document.createElement('i'); pin.className='map-pin';
    pin.style.left=(Number.isFinite(lon)?((lon+180)/360*100):(12+i*6))+'%';
    pin.style.top=(Number.isFinite(lat)?((90-lat)/180*100):(28+(i%5)*12))+'%';
    pin.title=p.title||''; box.appendChild(pin);
  });
}

function renderWorkspace(){
  var box=$('#workspaceCandidates');
  if(box) box.innerHTML=state.candidates.map(function(c){return '<div class="candidate-card"><strong>'+esc(c.title)+'</strong><p>'+esc(c.summary||'')+'</p><span>'+esc(c.source_name||'Source')+' · '+Number(c.candidate_score||0)+'/100</span></div>'}).join('')||'<div class="candidate-card"><p>Aucune nouvelle piste.</p></div>';
  renderNotes(); renderContacts();
}

function makeSlide(k,t,b,c,img){
  return {kicker:k,title:t,body:b,cta:c,image:img||'',image2:'',theme:'editorial',layout:'top',cut:'none',font:'sans',align:'left',titleScale:100,position:'center',accent:'violet',prompt:''};
}

function buildStudio(){
  var o=currentOpp(),brief=cleanText($('#studioBrief').value),count=Number($('#studioCount').value||5),obj=$('#studioObjective').value;
  var title=(o&&o.title)||brief||'Une opportunité à regarder maintenant';
  var summary=sentence((o&&o.summary)||brief||'Informations à structurer.',230);
  var loc=o?[o.city,o.country].filter(Boolean).join(' · '):'À confirmer'; if(!loc)loc='À confirmer';
  var deadline=o&&o.deadline?'Deadline · '+o.deadline:'Date à vérifier',fee=o&&o.fee?o.fee:'Conditions à vérifier',img=o?oppThumb(o):'';
  var slides=[];
  if(state.preset==='urgent'){
    slides=[makeSlide('DERNIER RAPPEL',deadline,'Une opportunité à ne pas laisser passer.','Voir les infos →',img),makeSlide('À RETENIR',title,summary,'Continuer →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('ACTION','Prépare ton dossier maintenant.','Vérifie la source officielle avant d’envoyer.','Candidater →',img)];
  }else if(state.preset==='artist'){
    slides=[makeSlide('FOCUS ARTISTE',title,'Un univers à découvrir.','Découvrir →',img),makeSlide('UNIVERS',(o&&o.type)||'Création contemporaine',summary,'Explorer →',img),makeSlide('PARCOURS','Ce qui rend ce profil singulier.',sentence((o&&o.radar_reason)||summary,180),'Lire →',img),makeSlide('À SUIVRE','Les prochaines étapes.','Projets et connexions à garder dans le radar.','Suivre →',img)];
  }else if(state.preset==='event'){
    slides=[makeSlide('À L’AGENDA',title,loc,'Découvrir →',img),makeSlide('POURQUOI Y ALLER','Une scène, des artistes, des connexions.',summary,'Voir plus →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('PLUG ART','Prépare ta visite.','Repère les artistes et contacts à rencontrer.','Organiser →',img)];
  }else{
    slides=[makeSlide(obj==='apply'?'OPPORTUNITÉ À SAISIR':'OPEN CALL',title,loc,'Découvrir →',img),makeSlide('POURQUOI C’EST INTÉRESSANT','Une opportunité qui mérite ton attention.',sentence((o&&o.radar_reason)||summary,200),'Voir plus →',img),makeSlide('LE PROJET',(o&&o.type)||'Exposition / appel à projets',summary,'Comprendre →',img),makeSlide('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),makeSlide('ACTION','À toi de jouer.','Consulte la source officielle et vérifie les critères.','PLUG →',img)];
  }
  while(slides.length<count) slides.splice(slides.length-1,0,makeSlide('À SAVOIR','Point clé '+slides.length,summary,'Continuer →',img));
  state.slides=slides.slice(0,count); state.slide=0; renderStudio(); generateCaption();
}

function renderStudio(){
  if(!state.slides.length)return;
  state.slide=Math.max(0,Math.min(state.slide,state.slides.length-1));
  var s=state.slides[state.slide];
  $('#studioCounter').textContent='Slide '+(state.slide+1)+' / '+state.slides.length;
  $('#artKicker').textContent=s.kicker||''; $('#artTitle').textContent=s.title||''; $('#artBody').textContent=s.body||''; $('#artCta').textContent=s.cta||'';
  $('#artPhoto').style.backgroundImage=s.image?'url("'+s.image+'")':'linear-gradient(135deg,#71c9c7,#7970d8,#cf80ad)';
  $('#artPhoto').style.backgroundPosition=s.position||'center';
  $('#artPhotoSecondary').style.backgroundImage=s.image2?'url("'+s.image2+'")':(s.image?'url("'+s.image+'")':'linear-gradient(135deg,#cf80ad,#7970d8)');
  var art=$('#carouselArt');
  art.className='carousel-art theme-'+(s.theme||'editorial')+' layout-'+(s.layout||'top')+' cut-'+(s.cut||'none')+' align-'+(s.align||'left')+' font-'+(s.font||'sans')+' accent-'+(s.accent||'violet');
  art.style.setProperty('--title-scale',Number(s.titleScale||100)/100); art.style.setProperty('--preview-zoom',state.zoom||1);
  var vals={editKicker:s.kicker,editTitle:s.title,editBody:s.body,editCta:s.cta,editImage:(s.image&&s.image.indexOf('/api/')===0)?'':(s.image||''),editImage2:s.image2||'',layoutSelect:s.layout||'top',cutSelect:s.cut||'none',fontSelect:s.font||'sans',imagePosition:s.position||'center',imagePrompt:s.prompt||'',titleSize:s.titleScale||100};
  Object.keys(vals).forEach(function(id){var el=$('#'+id);if(el)el.value=vals[id]});
  $('#titleSizeValue').textContent=(s.titleScale||100)+'%';
  $$('[data-align]').forEach(function(b){b.classList.toggle('active',b.dataset.align===(s.align||'left'))});
  $$('[data-theme]').forEach(function(b){b.classList.toggle('active',b.dataset.theme===(s.theme||'editorial'))});
  $$('[data-accent]').forEach(function(b){b.classList.toggle('active',b.dataset.accent===(s.accent||'violet'))});
  $('#slideDots').innerHTML=state.slides.map(function(_,i){return '<button class="slide-dot '+(i===state.slide?'active':'')+'" data-slide="'+i+'"></button>'}).join('');
  $('#studioStrip').innerHTML=state.slides.map(function(x,i){return '<button class="strip-slide '+(i===state.slide?'active':'')+'" data-slide="'+i+'"><b>'+String(i+1).padStart(2,'0')+'</b><br>'+esc(sentence(x.title,42))+'</button>'}).join('');
  $$('[data-slide]').forEach(function(b){b.onclick=function(){state.slide=Number(b.dataset.slide);renderStudio()}});
}

async function checkImageStatus(){
  var box=$('#imageStatus'); if(!box)return;
  try{var r=await api('/api/v32/content/image/status');box.classList.toggle('ready',!!r.enabled);box.classList.toggle('error',!r.enabled);box.querySelector('b').textContent=r.enabled?(r.model||'Disponible'):'Clé API absente'}
  catch(e){box.classList.add('error');box.querySelector('b').textContent='Indisponible'}
}

function imagePromptFor(s){
  var o=currentOpp(),loc=o?[o.city,o.country].filter(Boolean).join(', '):'';
  return cleanText(s.prompt||('Visuel éditorial contemporain pour un carrousel PLUG ART. Sujet: '+s.title+'. Contexte: '+s.body+'. '+(loc?'Lieu: '+loc+'. ':'')+'Composition artistique premium, lisible, sans texte.'));
}

async function generateImageForSlide(index,button){
  var s=state.slides[index]; if(!s)return; var old=button&&button.textContent;
  if(button){button.disabled=true;button.textContent='Génération…'}
  try{
    var r=await api('/api/v32/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imagePromptFor(s),style:$('#imageStyle').value||'photo',ratio:'4:5',quality:$('#imageQuality').value||'medium'})});
    if(r.url){s.image=r.url;if(index===state.slide)renderStudio();return r}
  }finally{if(button){button.disabled=false;button.textContent=old}}
}

function extractJsonV63(s){
  s=String(s||'').replace(/\x60\x60\x60json|\x60\x60\x60/gi,'').trim();
  var a=s.indexOf('{'),b=s.lastIndexOf('}'); if(a<0||b<a)throw new Error('Réponse non structurée');
  return JSON.parse(s.slice(a,b+1));
}

async function plugyCarouselV63(){
  var btn=$('#plugyCarouselBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='PLUGY travaille…';
  var o=currentOpp(),count=Number($('#studioCount').value||5);
  var facts={title:o&&o.title||'',summary:o&&o.summary||$('#studioBrief').value||'',city:o&&o.city||'',country:o&&o.country||'',deadline:o&&o.deadline||'',fee:o&&o.fee||'',type:o&&o.type||'',eligibility:o&&o.eligibility||'',radar_reason:o&&o.radar_reason||''};
  var prompt='Crée un carrousel PLUG ART de '+count+' slides. N\'invente aucune information. Utilise uniquement ces faits: '+JSON.stringify(facts)+'. Objectif: '+$('#studioObjective').value+'. Réponds UNIQUEMENT en JSON valide sous cette forme {"slides":[{"kicker":"...","title":"...","body":"...","cta":"...","image_prompt":"...","layout":"top|cover|left|right|band|collage|minimal"}]}. Textes courts, visuels, utiles.';
  try{
    var r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,page:'content',mode:'deep'})});
    var parsed=extractJsonV63(r.answer); if(!Array.isArray(parsed.slides)||!parsed.slides.length)throw new Error('Slides absentes');
    var base=currentOpp()?oppThumb(currentOpp()):'';
    state.slides=parsed.slides.slice(0,count).map(function(x){var s=makeSlide(x.kicker||'PLUG ART',x.title||'',x.body||'',x.cta||'Découvrir →',base);s.prompt=x.image_prompt||'';s.layout=['top','cover','left','right','band','collage','minimal'].includes(x.layout)?x.layout:'top';return s});
    while(state.slides.length<count)state.slides.push(makeSlide('À SAVOIR','Point clé '+(state.slides.length+1),'À compléter.','Continuer →',base));
    state.slide=0;renderStudio();generateCaption();playPlugy('Happy',true);
  }catch(e){buildStudio();alert('PLUGY a utilisé la structure locale de secours : '+e.message)}
  finally{btn.disabled=false;btn.textContent=old}
}

function renderNotes(){
  $('#notesList').innerHTML=notes.length?notes.map(function(n){return '<div class="note-card"><strong>'+esc(n.title||'Note')+'</strong><p>'+esc(n.body||'')+'</p><span>'+esc(n.date||'')+'</span></div>'}).join(''):'<div class="note-card"><p>Aucune note.</p></div>';
}
function renderContacts(){
  $('#contactsList').innerHTML=contacts.length?contacts.map(function(c){return '<div class="contact-card"><strong>'+esc(c.name||'')+'</strong><p>'+esc(c.info||'')+'</p><span>'+esc(c.status||'')+'</span></div>'}).join(''):'<div class="contact-card"><p>Aucun contact.</p></div>';
}

/* Rebind V63-only controls after legacy-compatible core has booted. */
$('#generateStudio').onclick=buildStudio;
$('#plugyCarouselBtn').onclick=plugyCarouselV63;
$('#generateSlideImage').onclick=async function(){try{await generateImageForSlide(state.slide,$('#generateSlideImage'))}catch(e){alert('Génération image : '+e.message)}};
$('#generateAllImagesBtn').onclick=async function(){
  var b=$('#generateAllImagesBtn'),old=b.textContent;b.disabled=true;
  try{for(var i=0;i<state.slides.length;i++){b.textContent='Image '+(i+1)+'/'+state.slides.length;await generateImageForSlide(i)}renderStudio()}
  catch(e){alert('Génération interrompue : '+e.message)}
  finally{b.disabled=false;b.textContent=old}
};
[['editKicker','kicker'],['editTitle','title'],['editBody','body'],['editCta','cta'],['editImage','image'],['editImage2','image2'],['layoutSelect','layout'],['cutSelect','cut'],['fontSelect','font'],['imagePosition','position'],['imagePrompt','prompt']].forEach(function(pair){
  var el=$('#'+pair[0]); if(el)el.oninput=function(){if(state.slides[state.slide]){state.slides[state.slide][pair[1]]=el.value;renderStudio()}};
});
$('#titleSize').oninput=function(){state.slides[state.slide].titleScale=Number(this.value);renderStudio()};
$$('[data-align]').forEach(function(b){b.onclick=function(){state.slides[state.slide].align=b.dataset.align;renderStudio()}});
$$('[data-theme]').forEach(function(b){b.onclick=function(){state.slides[state.slide].theme=b.dataset.theme;renderStudio()}});
$$('[data-accent]').forEach(function(b){b.onclick=function(){state.slides[state.slide].accent=b.dataset.accent;renderStudio()}});
$$('[data-editor-tab]').forEach(function(b){b.onclick=function(){$$('[data-editor-tab]').forEach(function(x){x.classList.toggle('active',x===b)});$$('[data-pane]').forEach(function(x){x.classList.toggle('active',x.dataset.pane===b.dataset.editorTab)})}});
$('#applyLayoutAll').onclick=function(){var s=state.slides[state.slide];state.slides.forEach(function(x){Object.assign(x,{layout:s.layout,cut:s.cut,font:s.font,align:s.align,titleScale:s.titleScale,position:s.position})});renderStudio()};
$('#applyStyleAll').onclick=function(){var s=state.slides[state.slide];state.slides.forEach(function(x){Object.assign(x,{theme:s.theme,accent:s.accent})});renderStudio()};
$('#imageUpload').onchange=function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){state.slides[state.slide].image=r.result;renderStudio()};r.readAsDataURL(f)};
$('#zoomIn').onclick=function(){state.zoom=Math.min(1.25,(state.zoom||1)+.05);$('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';renderStudio()};
$('#zoomOut').onclick=function(){state.zoom=Math.max(.75,(state.zoom||1)-.05);$('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';renderStudio()};
$('#saveDraftBtn').onclick=function(){
  var ds=store.get('plugart_v63_drafts',[]);ds.unshift({id:Date.now(),name:(currentOpp()&&currentOpp().title)||(state.slides[0]&&state.slides[0].title)||'Carrousel',slides:JSON.parse(JSON.stringify(state.slides)),caption:$('#captionText').value,date:new Date().toLocaleString('fr-FR')});store.set('plugart_v63_drafts',ds.slice(0,15));renderDashboard();var b=this,old=b.textContent;b.textContent='Sauvegardé ✓';setTimeout(function(){b.textContent=old},900)
};
$('#newNote').onclick=function(){openModal('<h3>Nouvelle note</h3><label>Titre<input id="mTitle"></label><label>Note<textarea id="mBody"></textarea></label><button class="save" id="mSave">Enregistrer</button>')};
$('#newContact').onclick=function(){openModal('<h3>Nouveau contact</h3><label>Nom<input id="mName"></label><label>Information<textarea id="mInfo"></textarea></label><label>Statut<select id="mStatus"><option>À contacter</option><option>Contacté</option><option>Relance</option><option>Partenaire</option></select></label><button class="save" id="mSave">Enregistrer</button>')};
