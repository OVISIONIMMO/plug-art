
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=async(url,opt={})=>{const r=await fetch(url,{cache:'no-store',...opt});if(!r.ok)throw new Error((await r.text())||String(r.status));const ct=r.headers.get('content-type')||'';return ct.includes('json')?r.json():r.text()};
const store={get(k,d=[]){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const state={stats:{},opps:[],artists:[],events:[],map:[],radar:{},candidates:[]};
const meta={dashboard:['Vue générale','PLUG ART interne'],radar:['Open Calls','Radar & vérification'],studio:['Création','Studio carrousel'],network:['Réseau','Artistes, événements, lieux'],workspace:['Suivi','Actions & contacts']};
let notes=store.get('plugart_v65_notes',store.get('plugart_v64_notes',[]));
let contacts=store.get('plugart_v65_contacts',store.get('plugart_v64_contacts',[]));

function view(id){
  if(!meta[id])id='dashboard';
  qa('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+id));
  qa('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const t=q('#pageTitle'),s=q('#pageSub');if(t)t.textContent=meta[id][0];if(s)s.textContent=meta[id][1];
  history.replaceState(null,'','#'+id);
  window.scrollTo({top:0,behavior:'smooth'});
}
qa('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
addEventListener('hashchange',()=>view(location.hash.slice(1)||'dashboard'));

const cut=(s,n=170)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s};
const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}catch{return String(v)}};
const oppImg=o=>'/api/opportunities/'+encodeURIComponent(o.id)+'/thumbnail';
const initials=n=>String(n||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const safe=u=>/^https?:\/\//i.test(String(u||''))?u:'#';

function chart(scores){
  const line=q('#signalLine'),area=q('#signalArea');if(!line||!area||scores.length<2)return;
  const w=520,h=150,p=16,pts=scores.map((v,i)=>[i*w/(scores.length-1),h-p-(Math.min(100,Math.max(0,v))/100)*(h-p*2)]);
  const d=pts.map((v,i)=>(i?'L':'M')+v[0].toFixed(1)+' '+v[1].toFixed(1)).join(' ');
  line.setAttribute('d',d);area.setAttribute('d',d+' L '+w+' '+(h-p)+' L 0 '+(h-p)+' Z');
}
function map(box,data,cls){
  if(!box)return;box.innerHTML='';
  data.forEach((p,i)=>{const pin=document.createElement('i'),lon=Number(p.lon),lat=Number(p.lat);pin.className=cls;pin.style.left=(Number.isFinite(lon)?((lon+180)/360*100):(12+i*6))+'%';pin.style.top=(Number.isFinite(lat)?((90-lat)/180*100):(30+(i%5)*12))+'%';pin.title=p.title||'';box.appendChild(pin)});
}
function renderDashboard(){
  const run=state.radar.last_run||{},scores=state.opps.map(o=>Number(o.radar_score??o.score??0)).filter(Number.isFinite);
  const set=(id,v)=>{const e=q('#'+id);if(e)e.textContent=v};
  set('dashOpp',state.stats.opportunities??state.opps.length);set('dashArtistCount',state.stats.artists??state.artists.length);set('dashRadar',run.online??run.checked??'—');set('dashCycle',run.finished_at?fmt(run.finished_at):'—');set('dashScore',scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)+'%':'—');
  chart(scores.slice(0,8));
  const calls=state.opps.slice().sort((a,b)=>Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,5);
  const dc=q('#dashCalls');if(dc)dc.innerHTML=calls.length?calls.map(o=>'<button class="priority-item" data-open="'+esc(o.id)+'"><div class="priority-thumb" style="background-image:url(\''+oppImg(o)+'\')"></div><div><h3>'+esc(o.title)+'</h3><p>'+esc([o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call')+'</p></div><b>'+Number(o.radar_score??o.score??0)+'</b></button>').join(''):'<div class="compact-row"><span>Aucune opportunité.</span></div>';
  qa('[data-open]').forEach(b=>b.onclick=()=>{view('radar');setTimeout(()=>document.querySelector('[data-opp-id="'+CSS.escape(b.dataset.open)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'}),100)});
  const cand=q('#dashCandidates');if(cand)cand.innerHTML=state.candidates.slice(0,3).map(c=>'<div class="compact-row"><strong>'+esc(c.title||'Piste')+'</strong><span>'+esc(c.source_name||'À vérifier')+' · '+Number(c.candidate_score||0)+'/100</span></div>').join('')||'<div class="compact-row"><span>Aucune nouvelle piste.</span></div>';
  const ev=q('#dashEvents');if(ev)ev.innerHTML=state.events.slice(0,3).map(e=>'<div class="compact-row"><strong>'+esc(cut(e.title,60))+'</strong><span>'+esc(e.city||e.country||'')+' · '+esc(fmt(e.start))+'</span></div>').join('')||'<div class="compact-row"><span>Aucun événement.</span></div>';
  const av=q('#dashArtists');if(av)av.innerHTML=state.artists.slice(0,7).map(a=>'<span class="avatar" title="'+esc(a.name)+'">'+esc(initials(a.name))+'</span>').join('');
  const drafts=store.get('plugart_v65_drafts',store.get('plugart_v63_drafts',[])),d=drafts[0];set('dashDraftTitle',d?(d.name||d.slides?.[0]?.title||'Carrousel'):'Carrousel');set('dashDraftMeta',d?((d.slides?.length||0)+' slides · '+(d.date||'brouillon')):'aucun brouillon');
  map(q('#miniMap'),state.map.slice(0,14),'map-pin');
}
function renderRadar(){
  const c=q('#countryFilter'),run=state.radar.last_run||{};if(c)c.innerHTML='<option value="">Tous</option>'+Array.from(new Set(state.opps.map(o=>o.country).filter(Boolean))).sort().map(x=>'<option>'+esc(x)+'</option>').join('');
  if(q('#radarLast'))q('#radarLast').textContent=run.finished_at?new Date(run.finished_at).toLocaleString('fr-FR'):'Aucun cycle';
  if(q('#radarInfo'))q('#radarInfo').textContent=(run.checked??0)+' sources · '+(run.online??0)+' en ligne · '+(run.errors??0)+' erreurs';
  filterRadar();
}
function filterRadar(){
  const s=q('#searchOpp'),c=q('#countryFilter'),sc=q('#scoreFilter'),box=q('#opportunityList');if(!s||!c||!sc||!box)return;
  const term=(s.value||'').toLowerCase(),country=c.value,min=Number(sc.value||0);
  const rows=state.opps.filter(o=>{const h=[o.title,o.city,o.country,o.type,o.summary].join(' ').toLowerCase();return(!term||h.includes(term))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min});
  box.innerHTML=rows.length?rows.map(o=>'<article class="opp-row" data-opp-id="'+esc(o.id)+'"><div class="opp-img" style="background-image:url(\''+oppImg(o)+'\')"></div><div class="opp-copy"><div class="meta">'+esc(o.type||'OPEN CALL')+' · '+esc([o.city,o.country].filter(Boolean).join(' · ')||'International')+'</div><h3>'+esc(o.title)+'</h3><p>'+esc(o.summary||o.radar_reason||'')+'</p></div><div class="opp-side"><span class="score-pill">'+Number(o.radar_score??o.score??0)+'/100</span><a class="source-link" href="'+esc(safe(o.source_url))+'" target="_blank" rel="noopener">Source ↗</a><button class="use-in-studio" data-use="'+esc(o.id)+'">Studio ✦</button></div></article>').join(''):'<div class="glass empty-state">Aucun résultat.</div>';
  qa('[data-use]').forEach(b=>b.onclick=()=>{view('studio');const sel=q('#studioSource');if(sel){sel.value=String(b.dataset.use);sel.dispatchEvent(new Event('change'))}});
}
['searchOpp','countryFilter','scoreFilter'].forEach(id=>{const e=q('#'+id);if(e)e.addEventListener(id==='searchOpp'?'input':'change',filterRadar)});
async function runRadar(btn){if(!btn)return;const old=btn.textContent;btn.disabled=true;btn.textContent='Analyse…';try{await api('/api/radar/run',{method:'POST'});await loadAll()}catch(e){alert('Radar indisponible : '+e.message)}finally{btn.disabled=false;btn.textContent=old}}
if(q('#runRadar'))q('#runRadar').onclick=()=>runRadar(q('#runRadar'));if(q('#runRadarHome'))q('#runRadarHome').onclick=()=>runRadar(q('#runRadarHome'));

function renderNetwork(){
  const a=q('#artistList'),e=q('#eventList');if(a)a.innerHTML=state.artists.map(x=>'<div class="network-item"><strong>'+esc(x.name)+'</strong><span>'+esc(x.discipline||'Artiste')+' · '+esc(x.city||x.country||'')+'</span><p>'+esc(cut(x.bio,150))+'</p></div>').join('')||'<div class="network-item">Aucun artiste.</div>';
  if(e)e.innerHTML=state.events.map(x=>'<div class="network-item"><strong>'+esc(x.title)+'</strong><span>'+esc(x.city||x.country||'')+' · '+esc(fmt(x.start))+'</span><p>'+esc(x.venue||'Lieu à confirmer')+'</p></div>').join('')||'<div class="network-item">Aucun événement.</div>';
  map(q('#worldMap'),state.map,'world-pin');
}
function renderWorkspace(){
  renderNotes();renderContacts();const box=q('#workspaceCandidates');if(box)box.innerHTML=state.candidates.map(c=>'<div class="candidate-card"><strong>'+esc(c.title||'Piste')+'</strong><p>'+esc(c.summary||'')+'</p><span>'+esc(c.source_name||'Source')+' · '+Number(c.candidate_score||0)+'/100</span></div>').join('')||'<div class="candidate-card"><p>Aucune nouvelle piste.</p></div>';
}
function renderNotes(){const box=q('#notesList');if(box)box.innerHTML=notes.map(n=>'<div class="note-card"><strong>'+esc(n.title||'Note')+'</strong><p>'+esc(n.body||'')+'</p><span>'+esc(n.date||'')+'</span></div>').join('')||'<div class="note-card"><p>Aucune note.</p></div>'}
function renderContacts(){const box=q('#contactsList');if(box)box.innerHTML=contacts.map(c=>'<div class="contact-card"><strong>'+esc(c.name||'')+'</strong><p>'+esc(c.info||'')+'</p><span>'+esc(c.status||'')+'</span></div>').join('')||'<div class="contact-card"><p>Aucun contact.</p></div>'}

function modal(html){const c=q('#modalContent'),m=q('#simpleModal');if(c&&m){c.innerHTML=html;m.classList.add('open')}}function closeModal(){q('#simpleModal')?.classList.remove('open')}
q('#modalClose')?.addEventListener('click',closeModal);q('#simpleModal')?.addEventListener('click',e=>{if(e.target===q('#simpleModal'))closeModal()});
q('#newNote')?.addEventListener('click',()=>modal('<h3>Nouvelle note</h3><label>Titre<input id="mTitle"></label><label>Note<textarea id="mBody"></textarea></label><button class="save" id="mSaveNote">Enregistrer</button>'));
q('#newContact')?.addEventListener('click',()=>modal('<h3>Nouveau contact</h3><label>Nom<input id="mName"></label><label>Information<textarea id="mInfo"></textarea></label><label>Statut<select id="mStatus"><option>À contacter</option><option>Contacté</option><option>Relance</option><option>Partenaire</option></select></label><button class="save" id="mSaveContact">Enregistrer</button>'));
q('#quickGo')?.addEventListener('click',()=>modal('<h3>Navigation</h3><div class="modal-nav"><button data-go="dashboard">Vue générale</button><button data-go="radar">Radar</button><button data-go="studio">Studio</button><button data-go="network">Réseau</button><button data-go="workspace">Suivi</button></div>'));
q('#modalContent')?.addEventListener('click',e=>{if(e.target.id==='mSaveNote'){notes.unshift({id:Date.now(),title:q('#mTitle').value,body:q('#mBody').value,date:new Date().toLocaleString('fr-FR')});store.set('plugart_v65_notes',notes);renderNotes();closeModal()}else if(e.target.id==='mSaveContact'){contacts.unshift({id:Date.now(),name:q('#mName').value,info:q('#mInfo').value,status:q('#mStatus').value});store.set('plugart_v65_contacts',contacts);renderContacts();closeModal()}else if(e.target.dataset.go){view(e.target.dataset.go);closeModal()}});

function openChat(){q('#plugyChat')?.classList.add('open');playPlugy('Happy',true)}function closeChat(){q('#plugyChat')?.classList.remove('open')}
q('#openPlugy')?.addEventListener('click',openChat);q('#askPlugy')?.addEventListener('click',openChat);q('#closeChat')?.addEventListener('click',closeChat);
const mv=q('#plugyModel');let animTimer;function playPlugy(name,once=true){if(!mv)return;const go=()=>{const a=mv.availableAnimations||[];if(!a.includes(name))return;try{mv.animationName=name;mv.play({repetitions:once?1:Infinity});if(once)setTimeout(()=>playPlugy('Idle',false),name==='Blink'?450:1250)}catch{}};if(mv.loaded)go();else mv.addEventListener('load',go,{once:true})}
mv?.addEventListener('load',()=>{playPlugy('Idle',false);schedulePlugy()},{once:true});qa('[data-anim]').forEach(b=>b.onclick=()=>playPlugy(b.dataset.anim,true));function schedulePlugy(){clearTimeout(animTimer);animTimer=setTimeout(()=>{playPlugy(['Blink','Curious','SoftTurn','Happy','Attentive'][Math.floor(Math.random()*5)],true);schedulePlugy()},7000+Math.random()*5000)}
function addChat(t,who='bot'){const box=q('#chatStream');if(!box)return;const d=document.createElement('div');d.className=who==='user'?'user-msg':'bot-msg';d.textContent=t;box.appendChild(d);box.scrollTop=box.scrollHeight}
q('#chatForm')?.addEventListener('submit',async e=>{e.preventDefault();const input=q('#chatInput'),msg=input.value.trim();if(!msg)return;input.value='';addChat(msg,'user');playPlugy('Think',false);try{const r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,page:location.hash.slice(1)||'dashboard',mode:'fast'})});addChat(r.answer||'Analyse terminée.');playPlugy('Happy',true)}catch{addChat('PLUGY est momentanément indisponible.');playPlugy('Idle',false)}});

async function loadAll(){
  const specs=[['/api/stats',{}],['/api/opportunities',[]],['/api/artists',[]],['/api/exhibitions',[]],['/api/map',[]],['/api/radar/status',{}],['/api/radar/candidates',[]]];
  const vals=await Promise.all(specs.map(async s=>{try{return await api(s[0])}catch{return s[1]}}));
  state.stats=vals[0]||{};state.opps=Array.isArray(vals[1])?vals[1]:[];state.artists=Array.isArray(vals[2])?vals[2]:[];state.events=Array.isArray(vals[3])?vals[3]:[];state.map=Array.isArray(vals[4])?vals[4]:[];state.radar=vals[5]||{};state.candidates=Array.isArray(vals[6])?vals[6]:[];
  renderDashboard();renderRadar();renderNetwork();renderWorkspace();return state;
}
window.PLUG65={q,qa,esc,api,store,state,view,cut,fmt,oppImg,playPlugy,openChat,renderDashboard,loadAll};
view(location.hash.slice(1)||'dashboard');
window.PLUG65.ready=loadAll();
})();
