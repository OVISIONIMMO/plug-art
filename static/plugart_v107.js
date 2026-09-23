(function(){
'use strict';
const VERSION='107.20260923.1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const state={view:'dashboard',bootstrap:null,bureau:[],leads:[],workflow:[],activeDoc:null,activeLead:null,history:[],voice:false,recognition:null};

const viewMeta={
 dashboard:['WORKSPACE','Dashboard','Idle'],
 radar:['VEILLE ACTIVE','Radar','Attentive'],
 opencalls:['SÉLECTION DE TRAVAIL','Open Calls','Curious'],
 creation:['CRÉATION','Studio de contenu','Present'],
 bureau:['ÉCRITURE & DOCUMENTS','Bureau','Think'],
 prospection:['CONTACTS & PROSPECTION','Suivi des démarches','Attentive'],
 network:['RÉSEAU','Artistes','Happy'],
 map:['CARTE','Opportunités & expositions','SoftTurn']
};
const contexts={
 dashboard:{label:'Dashboard',suggestions:['Mes priorités','Que dois-je traiter aujourd’hui ?','Résume mon workspace']},
 radar:{label:'Radar',suggestions:['Trouve les meilleurs appels','Filtre Paris + collectif','Montre les urgents']},
 opencalls:{label:'Open Calls',suggestions:['Analyse cet Open Call','Prépare ma candidature','Crée un contenu']},
 creation:{label:'Création',suggestions:['Améliore ce texte','Fais une version plus concise','Transforme en carrousel']},
 bureau:{label:'Bureau',suggestions:['Réécris ce brouillon','Résume ce document','Transforme en candidature']},
 prospection:{label:'Prospection',suggestions:['Prépare une relance','Résume ce contact','Propose la prochaine action']},
 network:{label:'Artistes',suggestions:['Analyse ce profil','Propose des opportunités','Prépare une bio']},
 map:{label:'Carte',suggestions:['Trouve autour de Paris','Compare les villes','Montre les opportunités proches']}
};

async function api(url,opt={}){
  const r=await fetch(url,{cache:'no-store',...opt,headers:{'Accept':'application/json',...(opt.body?{'Content-Type':'application/json'}:{}),...(opt.headers||{})}});
  if(!r.ok)throw new Error((await r.text())||('HTTP '+r.status));
  const ct=r.headers.get('content-type')||'';
  return ct.includes('json')?r.json():r.text();
}
function toast(msg){
  const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200);
}
function route(id,push=true){
  if(!viewMeta[id])id='dashboard';
  state.view=id;document.body.dataset.view=id;
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+id));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===id));
  $('#pageEyebrow').textContent=viewMeta[id][0];$('#pageTitle').textContent=viewMeta[id][1];
  document.title='PLUG ART · '+viewMeta[id][1];
  $('#plugyContext').textContent='Contexte : '+contexts[id].label;
  renderSuggestions();playMotion(viewMeta[id][2],id==='dashboard');
  if(push&&location.hash!=='#'+id)history.pushState({view:id},'','#'+id);
  $('.workspace')?.scrollTo({top:0,behavior:'auto'});
  if(id==='bureau')renderBureau();
  if(id==='prospection')renderLeads();
  if(id==='creation')renderContentSources();
}
$$('[data-route]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();route(b.dataset.route)}));
addEventListener('popstate',()=>route(location.hash.slice(1)||'dashboard',false));

function playMotion(name='Idle',loop=false){
  document.body.dataset.plugyMotion=name;
  const mv=$('#plugyModel');if(!mv)return;
  const run=()=>{
    const a=mv.availableAnimations||[];
    const target=a.includes(name)?name:(a.includes('Idle')?'Idle':a[0]);
    if(!target)return;
    try{mv.animationName=target;mv.timeScale=name==='Think'?.84:1;mv.play({repetitions:loop?Infinity:1})}catch{}
  };
  if(mv.loaded)run();else mv.addEventListener('load',run,{once:true});
  clearTimeout(playMotion.t);
  if(!loop&&name!=='Idle')playMotion.t=setTimeout(()=>playMotion('Idle',true),name==='Think'?1900:1450);
}
$('#plugyModel')?.addEventListener('load',()=>playMotion('Idle',true),{once:true});
$('#plugyModel')?.addEventListener('pointerenter',()=>playMotion('Curious'));
$('#plugyModel')?.addEventListener('dblclick',()=>{openPlugy();playMotion('Attentive')});

function openPlugy(seed=''){
  $('#plugyDrawer')?.classList.add('open');playMotion('Attentive');
  if(seed)$('#plugyInput').value=seed;
  setTimeout(()=>$('#plugyInput')?.focus(),160);
}
function closePlugy(){$('#plugyDrawer')?.classList.remove('open')}
$('#sidebarPlugy')?.addEventListener('click',()=>openPlugy());
$('#topPlugy')?.addEventListener('click',()=>openPlugy());
$('#plugyClose')?.addEventListener('click',closePlugy);
$$('[data-open-plugy]').forEach(b=>b.addEventListener('click',()=>openPlugy()));
function renderSuggestions(){
  const box=$('#plugySuggestions');if(!box)return;
  box.innerHTML=(contexts[state.view]?.suggestions||[]).map(x=>'<button>'+esc(x)+'</button>').join('');
  $$('button',box).forEach(b=>b.onclick=()=>askPlugy(b.textContent));
}
function addMsg(text,role='bot'){
  const box=$('#plugyStream');if(!box)return;const d=document.createElement('div');d.className='msg '+role;d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight;return d;
}
async function askPlugy(message,injectTarget=null){
  message=clean(message);if(!message)return;
  openPlugy();addMsg(message,'user');state.history.push({role:'user',content:message});
  $('#plugyState span').textContent='Réflexion…';playMotion('Think',true);
  const wait=addMsg('…','bot');
  const ctx='Contexte PLUG ART : '+contexts[state.view].label+'. ';
  try{
    const data=await api('/api/v32/plugy',{method:'POST',body:JSON.stringify({message:ctx+message,page:state.view,mode:'fast',history:state.history.slice(-6)})});
    const answer=clean(data.answer||data.message||'Je suis prêt.');
    wait.textContent=answer;state.history.push({role:'assistant',content:answer});
    $('#plugyState span').textContent='Prêt';playMotion('Present');
    if(injectTarget){const el=$(injectTarget);if(el)el.value=answer}
    return answer;
  }catch(e){wait.textContent='Je n’arrive pas à joindre mon moteur pour le moment.';$('#plugyState span').textContent='Connexion interrompue';playMotion('SoftTurn');}
}
$('#plugyForm')?.addEventListener('submit',e=>{e.preventDefault();const i=$('#plugyInput'),m=i.value;i.value='';askPlugy(m)});
$$('[data-plugy-prompt]').forEach(b=>b.addEventListener('click',()=>askPlugy(b.dataset.plugyPrompt)));

function deadline(v){
  if(!v)return 'Deadline à vérifier';const d=new Date(v+'T12:00:00');if(Number.isNaN(d.getTime()))return clean(v);
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
}
function daysLeft(o){
  if(!o?.deadline)return 9999;const d=new Date(String(o.deadline)+'T12:00:00');return Math.ceil((d-new Date())/86400000);
}
function accessible(o){const f=String(o?.fee||'').toLowerCase();if(/gratuit|free|sans frais/.test(f))return true;const m=f.match(/(\d{1,4})\s*€/);return !!(m&&Number(m[1])<=400)}
function collective(o){return /collectif|collective|group|emerg|young artist|open exhibition/.test([o?.type,o?.summary,o?.eligibility].join(' ').toLowerCase())}
function workflowFor(id){return state.workflow.find(x=>String(x.opportunity_id)===String(id))}
function workflowLabel(s){return({saved:'À lire',working:'À traiter',drafting:'En rédaction',submitted:'Envoyé',followup:'Relance',closed:'Clos'})[s]||'Non suivi'}
function oppCard(o,mode='radar'){
  const score=Number(o.radar_score??o.score??0),meta=[o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call',flow=workflowFor(o.id);
  const cls=mode==='open'?'open-card':'opp-card',media=mode==='open'?'open-media':'opp-media',body=mode==='open'?'open-body':'opp-body';
  return '<article class="'+cls+'"><div class="'+media+'"><img src="/api/v67/opportunities/'+encodeURIComponent(o.id)+'/thumbnail" alt="" loading="lazy"></div><div class="'+body+'"><small>'+esc(deadline(o.deadline))+'</small><h3>'+esc(o.title||'Opportunité')+'</h3><p>'+esc(meta)+(o.fee?' · '+esc(o.fee):'')+'</p><div class="card-actions"><span class="score">'+score+'/100</span><button class="dark" data-opp-create="'+esc(o.id)+'">Créer</button><button data-opp-plugy="'+esc(o.id)+'">PLUGY</button>'+(o.source_url?'<a href="'+esc(o.source_url)+'" target="_blank" rel="noopener">Source ↗</a>':'')+'</div>'+(mode==='open'?'<select class="workflow-select" data-opp-workflow="'+esc(o.id)+'"><option value="">Non suivi</option><option value="saved">À lire</option><option value="working">À traiter</option><option value="drafting">En rédaction</option><option value="submitted">Envoyé</option><option value="followup">Relance</option><option value="closed">Clos</option></select>':(flow?'<button class="workflow-mini" data-route="opencalls">Suivi · '+esc(workflowLabel(flow.workflow_status))+'</button>':'<button class="workflow-mini" data-opp-follow="'+esc(o.id)+'">＋ Suivre</button>'))+'</div></article>';
}
function bindOppActions(root=document){
  $('[data-opp-create]',root).forEach(b=>b.onclick=()=>{route('creation');setTimeout(()=>{const s=$('#contentSource');s.value=String(b.dataset.oppCreate);s.dispatchEvent(new Event('change'))},60)});
  $('[data-opp-plugy]',root).forEach(b=>{b.onclick=()=>{const o=(state.bootstrap?.opportunities||[]).find(x=>String(x.id)===String(b.dataset.oppPlugy));askPlugy('Analyse cet Open Call : '+clean(o?.title)+'. Donne-moi les points clés, risques, deadline et prochaine action.')}});
  $('[data-opp-follow]',root).forEach(b=>b.onclick=async()=>{try{const row=await api('/api/v107/open-calls/'+b.dataset.oppFollow+'/workflow',{method:'PUT',body:JSON.stringify({workflow_status:'saved'})});state.workflow=state.workflow.filter(x=>String(x.opportunity_id)!==String(row.opportunity_id));state.workflow.push(row);renderRadar();renderOpenCalls();renderDashboard();toast('Open Call ajouté au suivi')}catch{toast('Suivi impossible')}});
  $('.workflow-select',root).forEach(sel=>{
    const flow=workflowFor(sel.dataset.oppWorkflow);sel.value=flow?.workflow_status||'';
    sel.onchange=async()=>{
      const id=sel.dataset.oppWorkflow;
      try{
        if(!sel.value){await api('/api/v107/open-calls/'+id+'/workflow',{method:'DELETE'});state.workflow=state.workflow.filter(x=>String(x.opportunity_id)!==String(id));}
        else{const row=await api('/api/v107/open-calls/'+id+'/workflow',{method:'PUT',body:JSON.stringify({workflow_status:sel.value})});state.workflow=state.workflow.filter(x=>String(x.opportunity_id)!==String(row.opportunity_id));state.workflow.push(row);}
        renderRadar();renderDashboard();toast('Suivi mis à jour')
      }catch{toast('Mise à jour impossible')}
    };
  });
}
function renderDashboard(){
  const b=state.bootstrap||{},stats=b.stats||{};
  const trackedIds=new Set(state.workflow.filter(x=>x.workflow_status!=='closed').map(x=>String(x.opportunity_id)));
  const opps=(b.opportunities||[]).slice().sort((a,b)=>Number(trackedIds.has(String(b.id)))-Number(trackedIds.has(String(a.id)))||Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,4);
  $('#statOpp').textContent=stats.opportunities??opps.length;$('#statUrgent').textContent=stats.urgent??0;$('#statArtists').textContent=stats.artists??(b.artists||[]).length;$('#statContacts').textContent=state.leads.length;
  const box=$('#dashboardCalls');box.innerHTML=opps.length?opps.map(o=>'<div class="priority-row"><div class="priority-thumb"><img src="/api/v67/opportunities/'+o.id+'/thumbnail" alt="" loading="lazy"></div><button data-dashboard-opp="'+o.id+'" style="border:0;background:transparent;text-align:left"><h3>'+esc(o.title)+'</h3><p>'+esc([o.city,o.country,deadline(o.deadline)].filter(Boolean).join(' · '))+'</p></button><span class="score">'+Number(o.radar_score??o.score??0)+'/100</span></div>').join(''):'<div class="empty">Aucune opportunité active.</div>';
  $$('[data-dashboard-opp]').forEach(x=>x.onclick=()=>{route('opencalls');setTimeout(()=>$('#openSearch').value=(b.opportunities||[]).find(o=>String(o.id)===x.dataset.dashboardOpp)?.title||'',40)});
  $('#dashboardBureau').innerHTML=state.bureau.slice(0,4).map(n=>'<button class="compact-row" data-dash-doc="'+n.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-dash-doc]').forEach(b=>b.onclick=()=>{route('bureau');selectDoc(Number(b.dataset.dashDoc))});
  const leads=state.leads.slice().sort((a,b)=>(a.next_date||'9999').localeCompare(b.next_date||'9999')).slice(0,4);
  $('#dashboardProspection').innerHTML=leads.map(l=>'<button class="compact-row" data-dash-lead="'+l.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(l.organization||l.name||'Contact')+'</strong><span>'+esc(l.next_action||'À suivre')+(l.next_date?' · '+esc(l.next_date):'')+'</span></button>').join('')||'<div class="empty">Aucune relance.</div>';
  $$('[data-dash-lead]').forEach(b=>b.onclick=()=>{route('prospection');selectLead(Number(b.dataset.dashLead))});
}
function populateCountry(select,items){
  if(!select)return;const cur=select.value;const countries=[...new Set(items.map(x=>x.country).filter(Boolean))].sort();select.innerHTML='<option value="">Tous</option>'+countries.map(c=>'<option>'+esc(c)+'</option>').join('');select.value=cur;
}
function renderRadar(){
  const all=state.bootstrap?.opportunities||[],term=clean($('#radarSearch')?.value).toLowerCase(),country=$('#radarCountry')?.value||'',min=Number($('#radarScore')?.value||0),type=$('#radarType')?.value||'';
  const rows=all.filter(o=>{const hay=[o.title,o.city,o.country,o.type,o.summary,o.eligibility].join(' ').toLowerCase();const d=daysLeft(o);return(!term||hay.includes(term))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min&&(!type||(type==='urgent'&&d>=0&&d<=14)||(type==='accessible'&&accessible(o))||(type==='collective'&&collective(o)))});
  $('#radarCount').textContent=rows.length+' opportunité'+(rows.length>1?'s':'');$('#radarGrid').innerHTML=rows.map(o=>oppCard(o,'radar')).join('')||'<div class="empty">Aucun résultat.</div>';bindOppActions($('#radarGrid'));
}
function renderOpenCalls(){
  const all=state.bootstrap?.opportunities||[],term=clean($('#openSearch')?.value).toLowerCase(),country=$('#openCountry')?.value||'',status=$('#openStatus')?.value||'';
  const rows=all.filter(o=>{const hay=[o.title,o.city,o.country,o.type,o.summary].join(' ').toLowerCase();const d=daysLeft(o);return(!term||hay.includes(term))&&(!country||o.country===country)&&(!status||(status==='urgent'&&d>=0&&d<=14)||(status==='accessible'&&accessible(o))||(status==='collective'&&collective(o)))});
  $('#openGrid').innerHTML=rows.map(o=>oppCard(o,'open')).join('')||'<div class="empty">Aucun Open Call.</div>';bindOppActions($('#openGrid'));
}
['radarSearch','radarCountry','radarScore','radarType'].forEach(id=>$('#'+id)?.addEventListener(id==='radarSearch'?'input':'change',renderRadar));
['openSearch','openCountry','openStatus'].forEach(id=>$('#'+id)?.addEventListener(id==='openSearch'?'input':'change',renderOpenCalls));
$('#radarRefresh')?.addEventListener('click',loadAll);
$('#radarRun')?.addEventListener('click',async e=>{const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='Recherche…';try{await api('/api/radar/run',{method:'POST'});await loadAll();toast('Radar actualisé')}catch(err){toast('Radar indisponible')}finally{b.disabled=false;b.textContent=old}});

function renderContentSources(){
  const sel=$('#contentSource'),cur=sel.value,opps=state.bootstrap?.opportunities||[];sel.innerHTML='<option value="">Brief libre</option>'+opps.slice(0,80).map(o=>'<option value="'+o.id+'">'+esc(o.title)+'</option>').join('');if(cur)sel.value=cur;
}
$('#contentSource')?.addEventListener('change',e=>{const o=(state.bootstrap?.opportunities||[]).find(x=>String(x.id)===e.target.value);if(o){$('#contentObjective').value='Présenter cette opportunité clairement';$('#contentBrief').value=[o.title,o.summary,o.city,o.country,o.deadline?'Deadline : '+o.deadline:'',o.fee?'Frais : '+o.fee:''].filter(Boolean).join('\n')}});
async function generateContent(mode='generate'){
  const type=$('#contentType').value,objective=$('#contentObjective').value,brief=$('#contentBrief').value,body=$('#contentBody').value;
  let prompt=mode==='improve'?'Structure et améliore ce brief sans inventer de faits : '+brief:mode==='regenerate'?'Réécris ce contenu en version plus forte et plus claire, sans inventer : '+body:'Crée un '+type+' pour PLUG ART. Objectif : '+objective+'. Brief : '+brief+'. Réponse directement exploitable, sans commentaire méta.';
  const target=mode==='improve'?'#contentBrief':'#contentBody';const answer=await askPlugy(prompt,target);if(answer&&mode!=='improve'&&!$('#contentTitle').value)$('#contentTitle').value=(state.bootstrap?.opportunities||[]).find(x=>String(x.id)===$('#contentSource').value)?.title||type;$('#contentStatus').textContent='Généré';
}
$('#contentGenerate')?.addEventListener('click',()=>generateContent('generate'));$('#contentImprove')?.addEventListener('click',()=>generateContent('improve'));$('#contentRegenerate')?.addEventListener('click',()=>generateContent('regenerate'));
$('#contentClear')?.addEventListener('click',()=>{['contentObjective','contentBrief','contentTitle','contentBody'].forEach(id=>$('#'+id).value='');$('#contentSource').value='';$('#contentStatus').textContent='Brouillon'});
$('#contentCopy')?.addEventListener('click',async()=>{await navigator.clipboard.writeText($('#contentBody').value);toast('Copié')});
$('#contentToBureau')?.addEventListener('click',async()=>{const body={title:$('#contentTitle').value||$('#contentType').value,body:$('#contentBody').value,folder:'Contenus',tags:'création, PLUG ART'};try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify(body)});state.bureau.unshift(n);toast('Ajouté au Bureau');route('bureau');selectDoc(n.id)}catch{toast('Enregistrement impossible')}});

function renderBureau(){
  const term=clean($('#bureauSearch')?.value).toLowerCase(),rows=state.bureau.filter(n=>!term||[n.title,n.body,n.folder,n.tags].join(' ').toLowerCase().includes(term));
  $('#bureauList').innerHTML=rows.map(n=>'<button class="bureau-item '+(state.activeDoc===n.id?'active':'')+'" data-doc="'+n.id+'"><strong>'+(n.pinned?'★ ':'')+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-doc]').forEach(b=>b.onclick=()=>selectDoc(Number(b.dataset.doc)));
}
function clearDoc(){state.activeDoc=null;$('#bureauTitle').value='';$('#bureauBody').value='';$('#bureauFolder').value='Notes';$('#bureauTags').value='';$('#bureauPinned').checked=false;renderBureau()}
function selectDoc(id){const n=state.bureau.find(x=>Number(x.id)===Number(id));if(!n)return;state.activeDoc=n.id;$('#bureauTitle').value=n.title||'';$('#bureauBody').value=n.body||'';$('#bureauFolder').value=n.folder||'Notes';$('#bureauTags').value=n.tags||'';$('#bureauPinned').checked=!!n.pinned;renderBureau()}
$('#bureauNew')?.addEventListener('click',clearDoc);$('#bureauSearch')?.addEventListener('input',renderBureau);
async function saveBureau(silent=false){
  const body={title:$('#bureauTitle').value||'Sans titre',body:$('#bureauBody').value,folder:$('#bureauFolder').value,tags:$('#bureauTags').value,pinned:$('#bureauPinned').checked?1:0};
  try{
    let n;if(state.activeDoc)n=await api('/api/v107/bureau/'+state.activeDoc,{method:'PATCH',body:JSON.stringify(body)});else n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify(body)});
    const idx=state.bureau.findIndex(x=>x.id===n.id);if(idx>=0)state.bureau[idx]=n;else state.bureau.unshift(n);state.activeDoc=n.id;renderBureau();renderDashboard();if(!silent)toast('Document enregistré');return n;
  }catch(e){if(!silent)toast('Erreur d’enregistrement')}
}
$('#bureauSave')?.addEventListener('click',()=>saveBureau(false));
let bureauAutosaveTimer=0;
['bureauTitle','bureauBody','bureauTags'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{if(!state.activeDoc)return;clearTimeout(bureauAutosaveTimer);bureauAutosaveTimer=setTimeout(()=>saveBureau(true),1400)}));
['bureauFolder','bureauPinned'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if(state.activeDoc)saveBureau(true)}));
$('#bureauDelete')?.addEventListener('click',async()=>{if(!state.activeDoc)return;try{await api('/api/v107/bureau/'+state.activeDoc,{method:'DELETE'});state.bureau=state.bureau.filter(x=>x.id!==state.activeDoc);clearDoc();renderDashboard();toast('Document supprimé')}catch{toast('Suppression impossible')}});
$$('[data-bureau-ai]').forEach(b=>b.onclick=async()=>{const text=$('#bureauBody').value;if(!text)return;const prompts={rewrite:'Réécris ce texte de façon plus fluide, professionnelle et claire sans ajouter de faits : ',shorten:'Résume ce texte en gardant les informations essentielles : ',application:'Transforme ce texte en candidature artistique convaincante mais factuelle : ',social:'Transforme ce texte en publication PLUG ART concise et claire : '};await askPlugy(prompts[b.dataset.bureauAi]+text,'#bureauBody')});

function leadStatusLabel(s){return({lead:'À contacter',contacted:'Contacté',waiting:'En attente',followup:'Relance',active:'Échange en cours',hot:'Opportunité chaude',closed:'Clos'})[s]||s||'À contacter'}
function renderLeads(){
  const term=clean($('#leadSearch')?.value).toLowerCase(),filter=$('#leadStatusFilter')?.value||'',rows=state.leads.filter(l=>(!term||[l.name,l.organization,l.city,l.kind,l.email,l.instagram].join(' ').toLowerCase().includes(term))&&(!filter||l.status===filter));
  $('#leadTable').innerHTML='<div class="lead-row header"><span>Contact / structure</span><span>Type</span><span>Statut</span><span>Prochaine action</span><span></span></div>'+rows.map(l=>'<div class="lead-row"><button data-lead="'+l.id+'"><strong>'+esc(l.organization||l.name||'Contact')+'</strong><span>'+esc(l.name||l.city||'')+'</span></button><span>'+esc(l.kind||'Contact')+'</span><span class="status-chip">'+esc(leadStatusLabel(l.status))+'</span><span>'+esc(l.next_action||'—')+(l.next_date?'<br>'+esc(l.next_date):'')+'</span><button data-lead="'+l.id+'">›</button></div>').join('');
  $$('[data-lead]').forEach(b=>b.onclick=()=>selectLead(Number(b.dataset.lead)));
}
$('#leadSearch')?.addEventListener('input',renderLeads);$('#leadStatusFilter')?.addEventListener('change',renderLeads);
function leadForm(l={}){
  return '<div class="lead-form"><h3>'+(l.id?'Fiche contact':'Nouveau contact')+'</h3><label>Nom<input id="lfName" value="'+esc(l.name||'')+'"></label><label>Structure<input id="lfOrg" value="'+esc(l.organization||'')+'"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>Type<select id="lfKind">'+['Galerie','Centre d’art','Média','Marque','Lieu','Partenaire','Artiste','Autre'].map(x=>'<option '+(l.kind===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Statut<select id="lfStatus">'+Object.entries({lead:'À contacter',contacted:'Contacté',waiting:'En attente',followup:'Relance',active:'Échange en cours',hot:'Opportunité chaude',closed:'Clos'}).map(([v,x])=>'<option value="'+v+'" '+((l.status||'lead')===v?'selected':'')+'>'+x+'</option>').join('')+'</select></label></div><label>Email<input id="lfEmail" value="'+esc(l.email||'')+'"></label><label>Instagram<input id="lfInstagram" value="'+esc(l.instagram||'')+'"></label><label>Site<input id="lfWebsite" value="'+esc(l.website||'')+'"></label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><label>Ville<input id="lfCity" value="'+esc(l.city||'')+'"></label><label>Pays<input id="lfCountry" value="'+esc(l.country||'')+'"></label></div><label>Prochaine action<input id="lfAction" value="'+esc(l.next_action||'')+'"></label><label>Date<input id="lfDate" type="date" value="'+esc(l.next_date||'')+'"></label><label>Notes<textarea id="lfNotes">'+esc(l.notes||'')+'</textarea></label><div class="lead-form-actions"><button class="secondary-btn" id="leadPlugy">✦ Préparer une relance</button><button class="secondary-btn" id="leadToBureau">▤ Envoyer au Bureau</button><span class="spacer"></span>'+(l.id?'<button class="danger-text secondary-btn" id="leadDelete">Supprimer</button>':'')+'<button class="primary-btn" id="leadSave">Enregistrer</button></div><div class="lead-history" id="leadHistory"></div></div>';
}
function leadPayload(){return{name:$('#lfName').value,organization:$('#lfOrg').value,kind:$('#lfKind').value,status:$('#lfStatus').value,email:$('#lfEmail').value,instagram:$('#lfInstagram').value,website:$('#lfWebsite').value,city:$('#lfCity').value,country:$('#lfCountry').value,next_action:$('#lfAction').value,next_date:$('#lfDate').value,notes:$('#lfNotes').value,priority:'normal'}}
async function selectLead(id){
  const l=state.leads.find(x=>Number(x.id)===Number(id));if(!l)return;state.activeLead=l.id;$('#leadDetail').innerHTML=leadForm(l);bindLeadForm(l);
  try{const hist=await api('/api/v86/crm/'+l.id+'/history');$('#leadHistory').innerHTML='<h4>Historique</h4>'+hist.slice(0,15).map(h=>'<div class="history-item"><strong>'+esc(h.action)+'</strong> · '+esc(h.created_at)+'<br>'+esc(h.details||'')+'</div>').join('')}catch{}
}
function bindLeadForm(l={}){
  $('#leadSave').onclick=async()=>{try{const data=leadPayload();let saved;if(l.id)saved=await api('/api/v86/crm/'+l.id,{method:'PATCH',body:JSON.stringify(data)});else saved=await api('/api/v86/crm',{method:'POST',body:JSON.stringify(data)});const i=state.leads.findIndex(x=>x.id===saved.id);if(i>=0)state.leads[i]=saved;else state.leads.unshift(saved);state.activeLead=saved.id;renderLeads();renderDashboard();selectLead(saved.id);toast('Contact enregistré')}catch(e){toast('Erreur CRM')}};
  $('#leadDelete')?.addEventListener('click',async()=>{try{await api('/api/v86/crm/'+l.id,{method:'DELETE'});state.leads=state.leads.filter(x=>x.id!==l.id);state.activeLead=null;$('#leadDetail').innerHTML='<div class="lead-empty"><b>◎</b><strong>Sélectionne un contact</strong><span>Sa fiche apparaîtra ici.</span></div>';renderLeads();renderDashboard();toast('Contact supprimé')}catch{}});
  $('#leadPlugy').onclick=()=>{const d=leadPayload();askPlugy('Prépare un message de relance professionnel et concis pour '+clean(d.organization||d.name)+'. Contexte : '+clean(d.notes)+'. Prochaine action : '+clean(d.next_action))};
  $('#leadToBureau').onclick=async()=>{const d=leadPayload();try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Prospection · '+clean(d.organization||d.name||'Contact'),body:[d.notes,d.next_action?'Prochaine action : '+d.next_action:'',d.email?'Email : '+d.email:'',d.instagram?'Instagram : '+d.instagram:''].filter(Boolean).join('\n\n'),folder:'Prospection',tags:'prospection, contact'})});state.bureau.unshift(n);renderDashboard();toast('Contact envoyé au Bureau')}catch{toast('Envoi au Bureau impossible')}};
}
$('#leadNew')?.addEventListener('click',()=>{state.activeLead=null;$('#leadDetail').innerHTML=leadForm({status:'lead',kind:'Galerie'});bindLeadForm({})});

function renderArtists(){
  const box=$('#artistGrid'),rows=state.bootstrap?.artists||[],grad=['#6757cf','#d56a9e','#58aab4','#8c6d50'];
  box.innerHTML=rows.map((a,i)=>'<article class="artist-card"><div class="artist-visual" style="background:linear-gradient(145deg,'+grad[i%4]+',#e7d8f4)">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><div class="artist-body"><h3>'+esc(a.name||'Artiste')+'</h3><p>'+esc(a.discipline||a.city||'Artiste émergent')+'</p><div class="card-actions"><button data-artist-plugy="'+a.id+'">Analyser avec PLUGY</button></div></div></article>').join('')||'<div class="empty">Aucun artiste.</div>';
  $$('[data-artist-plugy]').forEach(b=>b.onclick=()=>{const a=rows.find(x=>String(x.id)===b.dataset.artistPlugy);askPlugy('Analyse le profil de '+clean(a?.name)+'. Discipline : '+clean(a?.discipline)+'. Propose les prochaines actions utiles.')});
}
function renderMap(){
  const box=$('#mapWorkspace');$$('.map-pin',box).forEach(x=>x.remove());const rows=state.bootstrap?.map||[];const bounds={minLon:-11,maxLon:24,minLat:35,maxLat:58};let count=0;
  rows.filter(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon))).slice(0,80).forEach(p=>{const lon=Math.max(bounds.minLon,Math.min(bounds.maxLon,Number(p.lon))),lat=Math.max(bounds.minLat,Math.min(bounds.maxLat,Number(p.lat))),x=5+(lon-bounds.minLon)/(bounds.maxLon-bounds.minLon)*90,y=7+(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*86;const pin=document.createElement('button');pin.className='map-pin '+(p.kind==='exhibition'?'exhibition':'');pin.style.left=x+'%';pin.style.top=y+'%';pin.title=p.title||p.city||'';pin.onclick=()=>askPlugy('Analyse cette piste sur la carte : '+clean(p.title||p.city)+'. Donne-moi les informations utiles et la prochaine action.');box.appendChild(pin);count++});$('#mapCount').textContent=count+' point'+(count>1?'s':'');
}
$('#mapRefresh')?.addEventListener('click',loadAll);

function openSearch(){
  $('#searchOverlay').classList.add('open');const i=$('#commandInput');i.value='';renderCommand('');setTimeout(()=>i.focus(),60)
}
function renderCommand(term){
  term=clean(term).toLowerCase();const pages=Object.entries(viewMeta).map(([id,m])=>({type:'Page',title:m[1],id}));const opps=(state.bootstrap?.opportunities||[]).slice(0,40).map(o=>({type:'Open Call',title:o.title,id:o.id,route:'opencalls'}));const leads=state.leads.slice(0,30).map(l=>({type:'Contact',title:l.organization||l.name,id:l.id,route:'prospection'}));const docs=state.bureau.slice(0,30).map(n=>({type:'Bureau',title:n.title,id:n.id,route:'bureau'}));const all=[...pages,...opps,...leads,...docs].filter(x=>!term||String(x.title).toLowerCase().includes(term)).slice(0,18);$('#commandResults').innerHTML=all.map((x,i)=>'<button class="command-result" data-cmd="'+i+'"><strong>'+esc(x.title)+'</strong><span>'+esc(x.type)+'</span></button>').join('');$$('[data-cmd]').forEach((b,i)=>b.onclick=()=>{const x=all[i];$('#searchOverlay').classList.remove('open');route(x.route||x.id);if(x.type==='Contact')setTimeout(()=>selectLead(x.id),60);if(x.type==='Bureau')setTimeout(()=>selectDoc(x.id),60);if(x.type==='Open Call')setTimeout(()=>{$('#openSearch').value=x.title;renderOpenCalls()},60)})
}
$('#globalSearch')?.addEventListener('click',openSearch);$('#commandInput')?.addEventListener('input',e=>renderCommand(e.target.value));
$('#refreshData')?.addEventListener('click',loadAll);
$('#newAction')?.addEventListener('click',()=>$('#newOverlay').classList.add('open'));
$$('[data-close-overlay]').forEach(b=>b.onclick=()=>b.closest('.overlay').classList.remove('open'));
$$('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open')}));
$$('[data-create]').forEach(b=>b.onclick=()=>{const a=b.dataset.create;$('#newOverlay').classList.remove('open');if(a==='content')route('creation');if(a==='bureau'){route('bureau');clearDoc()}if(a==='lead'){route('prospection');$('#leadNew').click()}if(a==='radar'){route('radar');$('#radarRun').click()}});

$('#sidebarCollapse')?.addEventListener('click',()=>document.body.classList.toggle('sidebar-small'));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){$$('.overlay.open').forEach(o=>o.classList.remove('open'));closePlugy()}});
async function initVoice(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast('Reconnaissance vocale indisponible');return}
  if(state.voice){state.recognition?.stop();return}
  const rec=new R();state.recognition=rec;rec.lang='fr-FR';rec.interimResults=true;rec.continuous=false;state.voice=true;$('#plugyState span').textContent='Écoute…';playMotion('Attentive',true);
  rec.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript;if(text)$('#plugyInput').value=text;if(e.results[e.results.length-1].isFinal){state.voice=false;askPlugy(text)}};
  rec.onend=()=>{state.voice=false;$('#plugyState span').textContent='Prêt';playMotion('Idle',true)};rec.onerror=rec.onend;rec.start()
}
$('#plugyVoice')?.addEventListener('click',initVoice);

async function loadAll(){
  try{
    const [boot,bureau,leads,workflow]=await Promise.all([
      api('/api/v102/bootstrap'),
      api('/api/v107/bureau'),
      api('/api/v86/crm'),
      api('/api/v107/open-calls/workflow')
    ]);
    state.bootstrap=boot;state.bureau=Array.isArray(bureau)?bureau:[];state.leads=Array.isArray(leads)?leads:[];state.workflow=Array.isArray(workflow)?workflow:[];
    populateCountry($('#radarCountry'),boot.opportunities||[]);populateCountry($('#openCountry'),boot.opportunities||[]);
    renderDashboard();renderRadar();renderOpenCalls();renderContentSources();renderBureau();renderLeads();renderArtists();renderMap();
    toast('Workspace synchronisé');
  }catch(e){console.warn('[PLUG ART V107]',e);toast('Certaines données sont indisponibles')}
}


// PLUGY V107.1 interaction layer: one model, richer behavior.
let plugyAmbientTimer=0,plugyPressTimer=0;
function startPlugyAmbient(){
  clearInterval(plugyAmbientTimer);
  plugyAmbientTimer=setInterval(()=>{
    if(state.voice||$('#plugyDrawer')?.classList.contains('open')===false)return;
    const moves=['Blink','Curious','SoftTurn','Bounce'];
    playMotion(moves[Math.floor(Math.random()*moves.length)]);
  },7800);
}
const pm=$('#plugyModel');
pm?.addEventListener('click',()=>playMotion(Math.random()>.5?'Happy':'Bounce'));
pm?.addEventListener('pointerdown',()=>{clearTimeout(plugyPressTimer);plugyPressTimer=setTimeout(()=>{initVoice();playMotion('Attentive',true)},650)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>pm?.addEventListener(ev,()=>clearTimeout(plugyPressTimer)));
startPlugyAmbient();

const initial=location.hash.slice(1)||'dashboard';history.replaceState({view:initial},'','#'+initial);route(initial,false);renderSuggestions();loadAll();
})();