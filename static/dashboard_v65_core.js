
(function(){
'use strict';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const api=async(url,opt={})=>{const r=await fetch(url,{cache:'no-store',...opt});if(!r.ok)throw new Error((await r.text())||String(r.status));const ct=r.headers.get('content-type')||'';return ct.includes('json')?r.json():r.text()};
const store={get(k,d=[]){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const state={stats:{},opps:[],artists:[],events:[],map:[],radar:{},candidates:[]};
const meta={dashboard:['Vue générale','PLUG ART interne'],radar:['Radar','Détection & plan d’action'],opencalls:['Open Calls','Opportunités vérifiées'],studio:['Création','Studio carrousel'],social:['Instagram','Contenu & publication'],network:['Réseau','Artistes, événements, lieux'],workspace:['Suivi','Actions & contacts']};
let notes=store.get('plugart_v65_notes',store.get('plugart_v64_notes',[]));
let contacts=store.get('plugart_v65_contacts',store.get('plugart_v64_contacts',[]));
let socialQueue=store.get('plugart_v66_social_queue',[]);

let currentView=null;
function view(id,opt={}){
  if(!meta[id])id='dashboard';
  const previous=currentView;currentView=id;
  qa('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+id));
  qa('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  const t=q('#pageTitle'),s=q('#pageSub'),crumb=q('#crumbCurrent');
  if(t)t.textContent=meta[id][0];if(s)s.textContent=meta[id][1];if(crumb)crumb.textContent=meta[id][0];
  document.body.dataset.view=id;
  if(!opt.fromHistory){const url='#'+id;if(location.hash!==url)history.pushState({view:id,from:previous},'',url);else if(!history.state?.view)history.replaceState({view:id,from:previous},'',url)}
  window.scrollTo({top:0,behavior:opt.instant?'auto':'smooth'});
}
qa('[data-view]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();view(b.dataset.view)}));
function goBack(){if(history.length>1)history.back();else view('dashboard')}
q('#navBack')?.addEventListener('click',goBack);q('#routePrev')?.addEventListener('click',goBack);
addEventListener('popstate',e=>view(e.state?.view||location.hash.slice(1)||'dashboard',{fromHistory:true,instant:true}));

const cut=(s,n=170)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s};
const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}catch{return String(v)}};
const oppImg=o=>'/api/v67/opportunities/'+encodeURIComponent(o.id)+'/thumbnail';
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
  qa('[data-open]').forEach(b=>b.onclick=()=>{view('opencalls');setTimeout(()=>openOppDetails(b.dataset.open),120)});
  const cand=q('#dashCandidates');if(cand)cand.innerHTML=state.candidates.slice(0,3).map(c=>'<div class="compact-row"><strong>'+esc(c.title||'Piste')+'</strong><span>'+esc(c.source_name||'À vérifier')+' · '+Number(c.candidate_score||0)+'/100</span></div>').join('')||'<div class="compact-row"><span>Aucune nouvelle piste.</span></div>';
  const ev=q('#dashEvents');if(ev)ev.innerHTML=state.events.slice(0,3).map(e=>'<div class="compact-row"><strong>'+esc(cut(e.title,60))+'</strong><span>'+esc(e.city||e.country||'')+' · '+esc(fmt(e.start))+'</span></div>').join('')||'<div class="compact-row"><span>Aucun événement.</span></div>';
  const av=q('#dashArtists');if(av)av.innerHTML=state.artists.slice(0,7).map(a=>'<span class="avatar" title="'+esc(a.name)+'">'+esc(initials(a.name))+'</span>').join('');
  const drafts=store.get('plugart_v65_drafts',store.get('plugart_v63_drafts',[])),d=drafts[0];set('dashDraftTitle',d?(d.name||d.slides?.[0]?.title||'Carrousel'):'Carrousel');set('dashDraftMeta',d?((d.slides?.length||0)+' slides · '+(d.date||'brouillon')):'aucun brouillon');
  map(q('#miniMap'),state.map.slice(0,14),'map-pin');
}
function feeAccessible(o){
  const f=String(o?.fee||'').toLowerCase();
  if(!f)return false;
  if(/gratuit|free|sans frais/.test(f))return true;
  if(/(^|\D)0\s*[€£$]/.test(f))return true;
  const eur=f.match(/(\d{1,4})\s*€/),gbp=f.match(/£\s*(\d{1,4})|(\d{1,4})\s*£/);
  if(eur&&Number(eur[1])<=400)return true;
  const g=gbp?Number(gbp[1]||gbp[2]):9999;
  return g<=350;
}
function daysLeft(o){
  if(Number.isFinite(Number(o?.days_left)))return Number(o.days_left);
  if(!o?.deadline)return 9999;
  const d=new Date(String(o.deadline)+'T12:00:00'),n=new Date();
  return Math.ceil((d-n)/86400000);
}
function isCollective(o){
  const t=[o?.type,o?.summary,o?.eligibility,o?.accessibility].join(' ').toLowerCase();
  return /collectif|collective|group|community|emerg|jeune création|young artist|open exhibition/.test(t);
}
function renderRadar(){
  const run=state.radar.last_run||{},opps=state.opps||[],set=(id,v)=>{const e=q('#'+id);if(e)e.textContent=v};
  const priority=opps.filter(o=>Number(o.radar_score??o.score??0)>=82);
  const urgent=opps.filter(o=>daysLeft(o)>=0&&daysLeft(o)<=14);
  const accessible=opps.filter(feeAccessible);
  const collective=opps.filter(isCollective);
  set('radarPriorityCount',priority.length);set('radarUrgentCount',urgent.length);set('radarAccessibleCount',accessible.length);set('radarCollectiveCount',collective.length);
  set('radarLast',run.finished_at?new Date(run.finished_at).toLocaleString('fr-FR'):'Aucun cycle');
  set('radarInfo',(run.checked??0)+' sources · '+(run.online??0)+' en ligne · '+(run.errors??0)+' erreurs');
  const drafts=store.get('plugart_v65_drafts',[]);
  const plan=q('#radarPlan');
  if(plan)plan.innerHTML=[
    ['01','Vérifier les nouvelles pistes',state.candidates.length+' à contrôler','radar'],
    ['02','Traiter les deadlines proches',urgent.length+' avant 14 jours','opencalls'],
    ['03','Sélectionner les appels accessibles',accessible.length+' compatibles budget','opencalls'],
    ['04','Transformer les meilleurs appels en contenus',drafts.length+' brouillon(s) enregistré(s)','studio']
  ].map(x=>'<button class="plan-step" data-plan-view="'+x[3]+'"><b>'+x[0]+'</b><span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></span><i>→</i></button>').join('');
  qa('[data-plan-view]').forEach(b=>b.onclick=()=>view(b.dataset.planView));
  const cand=q('#radarCandidateList');
  if(cand)cand.innerHTML=state.candidates.slice(0,8).map(c=>'<article class="verify-item"><div><strong>'+esc(c.title||'Piste')+'</strong><span>'+esc(c.source_name||'Source')+' · '+Number(c.candidate_score||0)+'/100</span></div><div><button data-promote-candidate="'+esc(c.id)+'">Valider</button><button class="ghost" data-reject-candidate="'+esc(c.id)+'">Écarter</button></div></article>').join('')||'<div class="empty-line">Aucune piste en attente.</div>';
  qa('[data-promote-candidate]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/radar/candidates/'+encodeURIComponent(b.dataset.promoteCandidate)+'/promote',{method:'POST'});await loadAll()}catch(e){alert(e.message)}});
  qa('[data-reject-candidate]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/radar/candidates/'+encodeURIComponent(b.dataset.rejectCandidate)+'/reject',{method:'POST'});await loadAll()}catch(e){alert(e.message)}});
  const sources=q('#radarSources'),srcs=Array.isArray(state.radar.sources)?state.radar.sources:[];
  if(sources)sources.innerHTML=srcs.slice(0,10).map(s=>'<div class="source-row"><div><strong>'+esc(s.name||s.domain||'Source')+'</strong><span>'+esc(s.domain||'')+'</span></div><b>'+Number(s.reliability||0)+'%</b></div>').join('')||'<div class="empty-line">Aucune source disponible.</div>';
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


function openCallCategory(o,cat){
  const score=Number(o.radar_score??o.score??0),d=daysLeft(o),country=String(o.country||'').toLowerCase();
  if(cat==='priority')return score>=82;
  if(cat==='urgent')return d>=0&&d<=14;
  if(cat==='accessible')return feeAccessible(o);
  if(cat==='collective')return isCollective(o);
  if(cat==='france')return country.includes('france');
  if(cat==='europe')return !/usa|united states|canada|australia|online only/.test(country);
  return true;
}
function renderOpenCalls(){
  const c=q('#countryFilterOpen');if(c){const cur=c.value;c.innerHTML='<option value="">Tous</option>'+Array.from(new Set(state.opps.map(o=>o.country).filter(Boolean))).sort().map(x=>'<option>'+esc(x)+'</option>').join('');if(cur)c.value=cur}
  filterOpenCalls();
}
function filterOpenCalls(){
  const box=q('#openCallGrid');if(!box)return;
  const term=String(q('#searchOppOpen')?.value||'').toLowerCase(),country=q('#countryFilterOpen')?.value||'',cat=q('#categoryFilterOpen')?.value||'',min=Number(q('#scoreFilterOpen')?.value||0);
  const rows=state.opps.filter(o=>{
    const h=[o.title,o.organizer,o.city,o.country,o.type,o.summary,o.eligibility].join(' ').toLowerCase();
    return(!term||h.includes(term))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min&&openCallCategory(o,cat);
  });
  if(q('#openCallCount'))q('#openCallCount').textContent=rows.length;
  box.innerHTML=rows.map(o=>{
    const score=Number(o.radar_score??o.score??0),d=daysLeft(o),deadline=o.deadline?fmt(o.deadline):'À vérifier';
    return '<article class="open-call-card glass" data-open-detail="'+esc(o.id)+'"><div class="open-call-media"><img src="'+oppImg(o)+'" alt="" loading="lazy"><span>'+score+'/100</span></div><div class="open-call-copy"><div class="open-call-meta">'+esc(o.type||'Open Call')+' · '+esc([o.city,o.country].filter(Boolean).join(' · ')||'International')+'</div><h3>'+esc(o.title)+'</h3><p>'+esc(cut(o.summary||o.radar_reason||'',150))+'</p><div class="open-call-facts"><span>Deadline <b>'+esc(deadline)+'</b></span><span>Frais <b>'+esc(cut(o.fee||'À vérifier',40))+'</b></span>'+(d>=0&&d<=14?'<span class="urgent-chip">'+d+' j</span>':'')+'</div><div class="open-call-actions"><button data-use="'+esc(o.id)+'">Créer</button><a href="'+esc(safe(o.source_url))+'" target="_blank" rel="noopener">Source ↗</a><button class="ghost" data-detail="'+esc(o.id)+'">Détails</button></div></div></article>';
  }).join('')||'<div class="glass empty-state">Aucun Open Call ne correspond aux filtres.</div>';
  qa('#openCallGrid img').forEach(img=>img.onerror=()=>img.closest('.open-call-media')?.classList.add('image-missing'));
  qa('#openCallGrid [data-use]').forEach(b=>b.onclick=e=>{e.stopPropagation();view('studio');const sel=q('#studioSource');if(sel){sel.value=String(b.dataset.use);sel.dispatchEvent(new Event('change'))}});
  qa('#openCallGrid [data-detail]').forEach(b=>b.onclick=e=>{e.stopPropagation();openOppDetails(b.dataset.detail)});
  qa('#openCallGrid [data-open-detail]').forEach(card=>card.onclick=e=>{if(e.target.closest('button,a'))return;openOppDetails(card.dataset.openDetail)});
}
async function openOppDetails(id){
  const o=state.opps.find(x=>String(x.id)===String(id));if(!o)return;
  modal('<div class="opp-detail"><div class="opp-detail-head"><div><small>'+esc(o.type||'OPEN CALL')+'</small><h3>'+esc(o.title)+'</h3><p>'+esc([o.organizer,o.city,o.country].filter(Boolean).join(' · '))+'</p></div><b>'+Number(o.radar_score??o.score??0)+'/100</b></div><div id="oppMediaGrid" class="opp-media-grid"><div class="media-loading">Recherche des visuels officiels…</div></div><div class="opp-detail-copy"><p>'+esc(o.summary||'')+'</p><dl><div><dt>Deadline</dt><dd>'+esc(o.deadline||'À vérifier')+'</dd></div><div><dt>Frais</dt><dd>'+esc(o.fee||'À vérifier')+'</dd></div><div><dt>Éligibilité</dt><dd>'+esc(o.eligibility||'À vérifier')+'</dd></div></dl><div class="opp-detail-actions"><button class="save" data-modal-studio="'+esc(o.id)+'">Créer le contenu</button><a href="'+esc(safe(o.source_url))+'" target="_blank" rel="noopener">Source officielle ↗</a></div></div></div>');
  q('[data-modal-studio]')?.addEventListener('click',()=>{closeModal();view('studio');const sel=q('#studioSource');if(sel){sel.value=String(id);sel.dispatchEvent(new Event('change'))}});
  try{
    const r=await api('/api/v67/opportunities/'+encodeURIComponent(id)+'/media');
    const imgs=Array.isArray(r.images)?r.images:[];
    const g=q('#oppMediaGrid');if(g)g.innerHTML=imgs.length?imgs.slice(0,8).map(u=>'<img src="'+esc(safe(u))+'" alt="" loading="lazy">').join(''):'<img src="'+oppImg(o)+'" alt="" loading="lazy">';
  }catch{const g=q('#oppMediaGrid');if(g)g.innerHTML='<img src="'+oppImg(o)+'" alt="" loading="lazy">'}
}
['searchOppOpen','countryFilterOpen','categoryFilterOpen','scoreFilterOpen'].forEach(id=>q('#'+id)?.addEventListener(id==='searchOppOpen'?'input':'change',filterOpenCalls));
q('#refreshOpenCalls')?.addEventListener('click',()=>loadAll());

function persistSocial(){store.set('plugart_v66_social_queue',socialQueue)}
function renderSocial(){
  const box=q('#socialQueue');if(!box)return;
  const set=(id,v)=>{const e=q('#'+id);if(e)e.textContent=v};
  set('socialTotal',socialQueue.length);set('socialReady',socialQueue.filter(x=>x.status==='Prêt').length);set('socialPublished',socialQueue.filter(x=>x.status==='Publié').length);
  box.innerHTML=socialQueue.map(x=>'<article class="social-item" data-social-id="'+x.id+'"><div><small>'+esc(x.format||'Instagram')+'</small><strong>'+esc(x.title||'Publication')+'</strong><p>'+esc(cut(x.caption||'',120))+'</p></div><div class="social-item-controls"><select data-social-status="'+x.id+'"><option'+(x.status==='À préparer'?' selected':'')+'>À préparer</option><option'+(x.status==='Prêt'?' selected':'')+'>Prêt</option><option'+(x.status==='À publier'?' selected':'')+'>À publier</option><option'+(x.status==='Publié'?' selected':'')+'>Publié</option></select><input type="datetime-local" value="'+esc(x.scheduled||'')+'" data-social-date="'+x.id+'"><button data-social-delete="'+x.id+'">×</button></div></article>').join('')||'<div class="empty-line">Aucune publication dans la file.</div>';
  qa('[data-social-status]').forEach(e=>e.onchange=()=>{const x=socialQueue.find(v=>String(v.id)===String(e.dataset.socialStatus));if(x){x.status=e.value;persistSocial();renderSocial()}});
  qa('[data-social-date]').forEach(e=>e.onchange=()=>{const x=socialQueue.find(v=>String(v.id)===String(e.dataset.socialDate));if(x){x.scheduled=e.value;persistSocial()}});
  qa('[data-social-delete]').forEach(b=>b.onclick=()=>{socialQueue=socialQueue.filter(v=>String(v.id)!==String(b.dataset.socialDelete));persistSocial();renderSocial()});
  const checks=store.get('plugart_v66_social_checks',{});
  qa('[data-social-check]').forEach(e=>{e.checked=!!checks[e.dataset.socialCheck];e.onchange=()=>{checks[e.dataset.socialCheck]=e.checked;store.set('plugart_v66_social_checks',checks)}});
}
function addLatestDraftToSocial(){
  const drafts=store.get('plugart_v65_drafts',store.get('plugart_v63_drafts',[])),d=drafts[0];
  if(!d){modal('<h3>Aucun brouillon</h3><p>Enregistre d’abord un contenu dans le Studio.</p>');return}
  socialQueue.unshift({id:Date.now(),title:d.name||d.slides?.[0]?.title||'Publication PLUG ART',caption:d.caption||'',status:'À préparer',scheduled:'',format:d.format||'Carrousel'});
  socialQueue=socialQueue.slice(0,40);persistSocial();renderSocial();view('social');
}
async function generateSocialKit(){
  const b=q('#socialKitBtn'),out=q('#socialKitOutput'),brief=q('#socialBrief')?.value.trim();if(!brief||!b||!out)return;
  const old=b.textContent;b.disabled=true;b.textContent='PLUGY travaille…';
  try{
    const r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Prépare un kit Instagram PLUG ART à partir de ce brief, sans inventer les faits. Donne une légende concise, 8 à 12 hashtags utiles, puis ce CTA exact : Commente PLUG 🔌 pour être branché et recevoir le lien de candidature. Brief : '+brief,page:'social',mode:'fast'})});
    out.value=r.answer||'';
  }catch(e){out.value='Erreur : '+e.message}finally{b.disabled=false;b.textContent=old}
}
q('#addLatestDraft')?.addEventListener('click',addLatestDraftToSocial);
q('#socialKitBtn')?.addEventListener('click',generateSocialKit);

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
q('#quickGo')?.addEventListener('click',()=>modal('<h3>Navigation</h3><div class="modal-nav"><button data-go="dashboard">Vue générale</button><button data-go="radar">Radar</button><button data-go="opencalls">Open Calls</button><button data-go="studio">Studio</button><button data-go="social">Instagram</button><button data-go="network">Réseau</button><button data-go="workspace">Suivi</button></div>'));
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
  renderDashboard();renderRadar();renderOpenCalls();renderSocial();renderNetwork();renderWorkspace();return state;
}
window.PLUG65={q,qa,esc,api,store,state,view,cut,fmt,oppImg,playPlugy,openChat,renderDashboard,renderSocial,loadAll};
const initialView=location.hash.slice(1)||'dashboard';history.replaceState({view:initialView},'','#'+initialView);view(initialView,{fromHistory:true,instant:true});
window.PLUG65.ready=loadAll();
})();
