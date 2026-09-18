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
