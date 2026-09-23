(function(){
'use strict';
const VERSION='109.20260923.4';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const state={view:'dashboard',bootstrap:null,bureau:[],leads:[],workflow:[],drafts:[],currentDraft:null,activeDoc:null,activeLead:null,activeOpportunity:null,history:[],voice:false,voiceReply:false,recognition:null,creationMode:'text',radarPreset:'all',carousel:{slides:[],active:0,format:'4:5'},visual:{url:'',prompt:''}};

const viewMeta={
 dashboard:['WORKSPACE','Dashboard','Idle'],
 radar:['VEILLE ACTIVE','Radar','Attentive'],
 opencalls:['SÉLECTION DE TRAVAIL','Open Calls','Curious'],
 creation:['CRÉATION','Studio de contenu','Present'],
 bureau:['ÉCRITURE & DOCUMENTS','Bureau','Think'],
 prospection:['CONTACTS & PROSPECTION','Suivi des démarches','Attentive'],
 agenda:['AGENDA','Deadlines & relances','Attentive'],
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
 agenda:{label:'Agenda',suggestions:['Montre les urgences','Quelles deadlines arrivent ?','Quelles relances sont dues ?']},
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

function renderRouteView(id=state.view){
  if(id==='dashboard')return renderDashboard();
  if(id==='radar')return renderRadar();
  if(id==='opencalls')return renderOpenCalls();
  if(id==='creation'){renderContentSources();fillCreationSources();renderDraftPicker();return}
  if(id==='bureau')return renderBureau();
  if(id==='prospection')return renderLeads();
  if(id==='agenda')return renderAgenda();
  if(id==='network')return renderArtists();
  if(id==='map')return renderMap();
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
  renderRouteView(id);
}
$$('[data-route]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();route(b.dataset.route)}));
addEventListener('popstate',()=>route(location.hash.slice(1)||'dashboard',false));


let modelViewerPromise=null;
function ensureModelViewer(){
  if(customElements.get('model-viewer'))return Promise.resolve(true);
  if(modelViewerPromise)return modelViewerPromise;
  modelViewerPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.type='module';s.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js';
    s.onload=()=>customElements.whenDefined('model-viewer').then(()=>resolve(true)).catch(()=>resolve(true));
    s.onerror=()=>{modelViewerPromise=null;reject(new Error('3D indisponible'))};
    document.head.appendChild(s);
  });
  return modelViewerPromise;
}

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
  $('#plugyDrawer')?.classList.add('open');
  ensureModelViewer().then(()=>playMotion('Attentive')).catch(()=>{$('#plugyState span').textContent='Mode texte'});

  if(seed)$('#plugyInput').value=seed;
  setTimeout(()=>$('#plugyInput')?.focus(),160);
}
function closePlugy(){
  $('#plugyDrawer')?.classList.remove('open');
  try{if(state.voice)state.recognition?.stop()}catch{}
  try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch{}
  state.voice=false;state.voiceReply=false;
  if($('#plugyState span'))$('#plugyState span').textContent='Prêt';
}
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
  const local=handleLocalPlugy(message);if(local){openPlugy();addMsg(message,'user');addMsg(local,'bot');playMotion('Happy');if(state.voiceReply)speakPlugy(local);return local;}
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
    if(state.voiceReply)speakPlugy(answer);
    return answer;
  }catch(e){wait.textContent='Je n’arrive pas à joindre mon moteur pour le moment.';$('#plugyState span').textContent='Connexion interrompue';state.voiceReply=false;playMotion('SoftTurn');}
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
function opportunityFavorite(id){return !!Number(opportunityById(id)?.favorite||0)}
async function toggleFavorite(id){
  const o=opportunityById(id);if(!o)return;
  const next=o.favorite?0:1;
  try{const saved=await api('/api/opportunities/'+id,{method:'PATCH',body:JSON.stringify({favorite:next})});Object.assign(o,saved);renderDashboard();renderRadar();renderOpenCalls();if(state.activeOpportunity===Number(id))renderOpenCallFavorite();toast(next?'Ajouté aux favoris':'Retiré des favoris')}catch{toast('Favori impossible à mettre à jour')}
}
function workflowLabel(s){return({saved:'À lire',working:'À traiter',drafting:'En rédaction',submitted:'Envoyé',followup:'Relance',closed:'Clos'})[s]||'Non suivi'}
function oppCard(o,mode='radar'){
  const score=Number(o.radar_score??o.score??0),meta=[o.city,o.country].filter(Boolean).join(' · ')||o.type||'Open Call',flow=workflowFor(o.id);
  const cls=mode==='open'?'open-card':'opp-card',media=mode==='open'?'open-media':'opp-media',body=mode==='open'?'open-body':'opp-body';
  return '<article class="'+cls+'"><div class="'+media+'"><img src="/api/v67/opportunities/'+encodeURIComponent(o.id)+'/thumbnail" alt="" loading="lazy"></div><div class="'+body+'"><small>'+esc(deadline(o.deadline))+'</small><h3>'+esc(o.title||'Opportunité')+'</h3><p>'+esc(meta)+(o.fee?' · '+esc(o.fee):'')+'</p><div class="card-actions"><span class="score">'+score+'/100</span><button class="favorite-btn '+(o.favorite?'active':'')+'" data-opp-fav="'+esc(o.id)+'" title="Favori">'+(o.favorite?'★':'☆')+'</button><button class="dark" data-opp-create="'+esc(o.id)+'">Créer</button><button data-opp-detail="'+esc(o.id)+'">Détails</button><button data-opp-plugy="'+esc(o.id)+'">PLUGY</button>'+(o.source_url?'<a href="'+esc(o.source_url)+'" target="_blank" rel="noopener">Source ↗</a>':'')+'</div>'+(mode==='open'?'<select class="workflow-select" data-opp-workflow="'+esc(o.id)+'"><option value="">Non suivi</option><option value="saved">À lire</option><option value="working">À traiter</option><option value="drafting">En rédaction</option><option value="submitted">Envoyé</option><option value="followup">Relance</option><option value="closed">Clos</option></select>':(flow?'<button class="workflow-mini" data-route="opencalls">Suivi · '+esc(workflowLabel(flow.workflow_status))+'</button>':'<button class="workflow-mini" data-opp-follow="'+esc(o.id)+'">＋ Suivre</button>'))+'</div></article>';
}
function bindOppActions(root=document){
  $$('[data-opp-fav]',root).forEach(b=>b.onclick=()=>toggleFavorite(Number(b.dataset.oppFav)));
  $$('[data-opp-create]',root).forEach(b=>b.onclick=()=>{route('creation');setTimeout(()=>{const s=$('#contentSource');s.value=String(b.dataset.oppCreate);s.dispatchEvent(new Event('change'))},60)});
  $$('[data-opp-detail]',root).forEach(b=>b.onclick=()=>openOpportunity(Number(b.dataset.oppDetail)));
  $$('[data-opp-plugy]',root).forEach(b=>{b.onclick=()=>{const o=(state.bootstrap?.opportunities||[]).find(x=>String(x.id)===String(b.dataset.oppPlugy));askPlugy('Analyse cet Open Call : '+clean(o?.title)+'. Donne-moi les points clés, risques, deadline et prochaine action.')}});
  $$('[data-opp-follow]',root).forEach(b=>b.onclick=async()=>{try{const row=await api('/api/v107/open-calls/'+b.dataset.oppFollow+'/workflow',{method:'PUT',body:JSON.stringify({workflow_status:'saved'})});state.workflow=state.workflow.filter(x=>String(x.opportunity_id)!==String(row.opportunity_id));state.workflow.push(row);renderRadar();renderOpenCalls();renderDashboard();toast('Open Call ajouté au suivi')}catch{toast('Suivi impossible')}});
  $$('[data-route]',root).forEach(b=>b.onclick=()=>route(b.dataset.route));
  $$('.workflow-select',root).forEach(sel=>{
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

function adaptDashboardForDrafts(){
  const stat=$('#statArtists')?.parentElement;if(stat){const label=stat.querySelector('span');if(label)label.textContent='Brouillons';stat.style.cursor='pointer';stat.onclick=()=>{route('creation');if(state.drafts[0])setTimeout(()=>loadDraft(state.drafts[0].id),40)}}
}

function renderDashboard(){
  const b=state.bootstrap||{},stats=b.stats||{};
  const trackedIds=new Set(state.workflow.filter(x=>x.workflow_status!=='closed').map(x=>String(x.opportunity_id)));
  const opps=(b.opportunities||[]).slice().sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||Number(trackedIds.has(String(b.id)))-Number(trackedIds.has(String(a.id)))||Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,4);
  $('#statOpp').textContent=stats.opportunities??opps.length;$('#statUrgent').textContent=stats.urgent??0;$('#statArtists').textContent=state.drafts.length;$('#statContacts').textContent=state.leads.length;
  const box=$('#dashboardCalls');box.innerHTML=opps.length?opps.map(o=>'<div class="priority-row"><div class="priority-thumb"><img src="/api/v67/opportunities/'+o.id+'/thumbnail" alt="" loading="lazy"></div><button data-dashboard-opp="'+o.id+'" style="border:0;background:transparent;text-align:left"><h3>'+esc(o.title)+'</h3><p>'+esc([o.city,o.country,deadline(o.deadline)].filter(Boolean).join(' · '))+'</p></button><span class="score">'+Number(o.radar_score??o.score??0)+'/100</span></div>').join(''):'<div class="empty">Aucune opportunité active.</div>';
  $$('[data-dashboard-opp]').forEach(x=>x.onclick=()=>openOpportunity(Number(x.dataset.dashboardOpp)));
  $('#dashboardBureau').innerHTML=state.bureau.slice(0,4).map(n=>'<button class="compact-row" data-dash-doc="'+n.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-dash-doc]').forEach(b=>b.onclick=()=>{route('bureau');selectDoc(Number(b.dataset.dashDoc))});
  const leads=state.leads.slice().sort((a,b)=>(a.next_date||'9999').localeCompare(b.next_date||'9999')).slice(0,4);
  $('#dashboardProspection').innerHTML=leads.map(l=>'<button class="compact-row" data-dash-lead="'+l.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(l.organization||l.name||'Contact')+'</strong><span>'+esc(l.next_action||'À suivre')+(l.next_date?' · '+esc(l.next_date):'')+'</span></button>').join('')||'<div class="empty">Aucune relance.</div>';
  $$('[data-dash-lead]').forEach(b=>b.onclick=()=>{route('prospection');selectLead(Number(b.dataset.dashLead))});
  renderToday();
}
function populateCountry(select,items){
  if(!select)return;const cur=select.value;const countries=[...new Set(items.map(x=>x.country).filter(Boolean))].sort();select.innerHTML='<option value="">Tous</option>'+countries.map(c=>'<option>'+esc(c)+'</option>').join('');select.value=cur;
}

function installRadarPresets(){
  if($('#radarPresets'))return;const view=$('#view-radar'),layout=view?.querySelector('.tool-layout');if(!view||!layout)return;
  const bar=document.createElement('div');bar.id='radarPresets';bar.className='radar-presets';
  bar.innerHTML='<button data-radar-preset="all">Tout</button><button data-radar-preset="paris">Paris / IDF</button><button data-radar-preset="europe">Europe</button><button data-radar-preset="collective">Collectif / émergent</button><button data-radar-preset="accessible">Accessible</button><button data-radar-preset="urgent">Urgent</button>';
  layout.insertAdjacentElement('beforebegin',bar);
  const st=document.createElement('style');st.textContent='.radar-presets{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 11px}.radar-presets button{border:1px solid #e1e3e8;background:#fff;border-radius:999px;padding:8px 10px;font-size:9px;font-weight:800;color:#5f636f}.radar-presets button.active{background:#111318;color:#fff;border-color:#111318}';document.head.appendChild(st);
  $$('[data-radar-preset]',bar).forEach(b=>b.onclick=()=>applyRadarPreset(b.dataset.radarPreset));
}
function applyRadarPreset(preset){
  state.radarPreset=preset||'all';
  const search=$('#radarSearch'),country=$('#radarCountry'),score=$('#radarScore'),type=$('#radarType');
  if(search)search.value='';if(country)country.value='';if(score)score.value='0';if(type)type.value='';
  if(preset==='collective'&&type)type.value='collective';
  if(preset==='accessible'&&type)type.value='accessible';
  if(preset==='urgent'&&type)type.value='urgent';
  $$('[data-radar-preset]').forEach(b=>b.classList.toggle('active',b.dataset.radarPreset===preset));renderRadar();
}

function renderRadar(){
  const all=state.bootstrap?.opportunities||[],term=clean($('#radarSearch')?.value).toLowerCase(),country=$('#radarCountry')?.value||'',min=Number($('#radarScore')?.value||0),type=$('#radarType')?.value||'';
  const europe=['france','belgium','belgique','netherlands','pays-bas','spain','espagne','italy','italie','portugal','germany','allemagne','switzerland','suisse','austria','autriche','united kingdom','uk','royaume-uni','ireland','irlande','denmark','danemark','sweden','suède','norway','norvège','finland','finlande','poland','pologne','czech republic','tchéquie','greece','grèce'];
  const idf=/paris|saint[- ]denis|aubervilliers|montreuil|pantin|bagnolet|rosny|ivry|vitry|clichy|neuilly|nanterre|boulogne|versailles|créteil|creteil|noisy|vincennes|saint-ouen/i;
  const rows=all.filter(o=>{const hay=[o.title,o.city,o.country,o.type,o.summary,o.eligibility].join(' ').toLowerCase(),d=daysLeft(o),c=String(o.country||'').toLowerCase();const presetOk=state.radarPreset==='paris'?idf.test([o.city,o.title,o.summary].join(' ')):state.radarPreset==='europe'?europe.some(x=>c.includes(x)):true;return presetOk&&(!term||hay.includes(term))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min&&(!type||(type==='urgent'&&d>=0&&d<=14)||(type==='accessible'&&accessible(o))||(type==='collective'&&collective(o)))});
  $('#radarCount').textContent=rows.length+' opportunité'+(rows.length>1?'s':'');$('#radarGrid').innerHTML=rows.map(o=>oppCard(o,'radar')).join('')||'<div class="empty">Aucun résultat.</div>';bindOppActions($('#radarGrid'));
}

function installOpenWorkflowFilters(){
  const s=$('#openStatus');if(!s||s.dataset.workflowReady)return;s.dataset.workflowReady='1';
  const extra=[
    ['favorites','Favoris'],['tracked','Suivis'],['drafting','En rédaction'],['submitted','Envoyés'],['followup','À relancer'],['closed','Clos']
  ];
  extra.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;s.appendChild(o)});
}

function renderOpenCalls(){
  const all=state.bootstrap?.opportunities||[],term=clean($('#openSearch')?.value).toLowerCase(),country=$('#openCountry')?.value||'',status=$('#openStatus')?.value||'';
  const rows=all.filter(o=>{const hay=[o.title,o.city,o.country,o.type,o.summary].join(' ').toLowerCase(),d=daysLeft(o),flow=workflowFor(o.id);const statusOk=!status||(status==='urgent'&&d>=0&&d<=14)||(status==='accessible'&&accessible(o))||(status==='collective'&&collective(o))||(status==='favorites'&&!!o.favorite)||(status==='tracked'&&!!flow)||(['drafting','submitted','followup','closed'].includes(status)&&flow?.workflow_status===status);return(!term||hay.includes(term))&&(!country||o.country===country)&&statusOk});
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
  const target=mode==='improve'?'#contentBrief':'#contentBody';const answer=await askPlugy(prompt,target);if(answer&&mode!=='improve'&&!$('#contentTitle').value)$('#contentTitle').value=(state.bootstrap?.opportunities||[]).find(x=>String(x.id)===$('#contentSource').value)?.title||type;$('#contentStatus').textContent='Généré';const sourceId=$('#contentSource').value;if(answer&&sourceId)persistWorkflow(sourceId,{workflow_status:'drafting',next_action:'Finaliser le contenu / la candidature'}).catch(()=>{});
}
$('#contentGenerate')?.addEventListener('click',()=>generateContent('generate'));$('#contentImprove')?.addEventListener('click',()=>generateContent('improve'));$('#contentRegenerate')?.addEventListener('click',()=>generateContent('regenerate'));
$('#contentClear')?.addEventListener('click',()=>{['contentObjective','contentBrief','contentTitle','contentBody'].forEach(id=>$('#'+id).value='');$('#contentSource').value='';$('#contentStatus').textContent='Brouillon'});
$('#contentCopy')?.addEventListener('click',async()=>{await navigator.clipboard.writeText($('#contentBody').value);toast('Copié')});
$('#contentToBureau')?.addEventListener('click',async()=>{const sourceId=$('#contentSource').value;const body={title:$('#contentTitle').value||$('#contentType').value,body:$('#contentBody').value,folder:'Contenus',tags:'création, PLUG ART',source_type:sourceId?'opportunity':'',source_id:sourceId||''};try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify(body)});state.bureau.unshift(n);if(sourceId)await persistWorkflow(sourceId,{workflow_status:'drafting',next_action:'Finaliser le document dans le Bureau'});toast('Ajouté au Bureau');route('bureau');selectDoc(n.id)}catch{toast('Enregistrement impossible')}});

function renderBureau(){
  const term=clean($('#bureauSearch')?.value).toLowerCase(),rows=state.bureau.filter(n=>!term||[n.title,n.body,n.folder,n.tags].join(' ').toLowerCase().includes(term));
  $('#bureauList').innerHTML=rows.map(n=>'<button class="bureau-item '+(state.activeDoc===n.id?'active':'')+'" data-doc="'+n.id+'"><strong>'+(n.pinned?'★ ':'')+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-doc]').forEach(b=>b.onclick=()=>selectDoc(Number(b.dataset.doc)));
}
function clearDoc(){state.activeDoc=null;$('#bureauTitle').value='';$('#bureauBody').value='';$('#bureauFolder').value='Notes';$('#bureauTags').value='';$('#bureauPinned').checked=false;renderBureau();renderBureauSource(null)}
function selectDoc(id){
  const n=state.bureau.find(x=>Number(x.id)===Number(id));if(!n)return;
  state.activeDoc=n.id;$('#bureauTitle').value=n.title||'';$('#bureauBody').value=n.body||'';$('#bureauFolder').value=n.folder||'Notes';$('#bureauTags').value=n.tags||'';$('#bureauPinned').checked=!!n.pinned;renderBureau();renderBureauSource(n);
}
function ensureBureauBridge(){
  if($('#bureauSourceBar'))return;
  const editor=$('.bureau-editor');if(!editor)return;
  const bar=document.createElement('div');bar.id='bureauSourceBar';bar.className='bureau-source-bar';bar.innerHTML='<span id="bureauSourceLabel">Document libre</span><div><button id="bureauOpenSource" hidden>Ouvrir la source</button><button id="bureauToCreation">✦ Envoyer vers Création</button></div>';
  editor.insertBefore(bar,editor.firstChild);
  const st=document.createElement('style');st.textContent='.bureau-source-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 0 10px;border-bottom:1px solid #eceef2;margin-bottom:4px}.bureau-source-bar>span{font-size:9px;color:#8d909b}.bureau-source-bar div{display:flex;gap:6px}.bureau-source-bar button{border:1px solid #e1e3e8;background:#fff;border-radius:9px;padding:7px 9px;font-size:8px;font-weight:800}.bureau-source-bar button:last-child{background:#f8f6ff;border-color:#ded9fb;color:#5f50c2}';document.head.appendChild(st);
  $('#bureauOpenSource').onclick=openCurrentBureauSource;
  $('#bureauToCreation').onclick=sendCurrentBureauToCreation;
}
function renderBureauSource(n){
  ensureBureauBridge();const label=$('#bureauSourceLabel'),btn=$('#bureauOpenSource');if(!label||!btn)return;
  if(n?.source_type==='opportunity'&&n.source_id){const o=opportunityById(n.source_id);label.textContent='Source · Open Call'+(o?' · '+o.title:'');btn.hidden=false;btn.textContent='Ouvrir l’Open Call'}
  else if(n?.source_type==='crm'&&n.source_id){const l=state.leads.find(x=>String(x.id)===String(n.source_id));label.textContent='Source · Prospection'+(l?' · '+(l.organization||l.name||'Contact'):'');btn.hidden=false;btn.textContent='Ouvrir le contact'}
  else{label.textContent='Document libre';btn.hidden=true}
}
function openCurrentBureauSource(){
  const n=state.bureau.find(x=>Number(x.id)===Number(state.activeDoc));if(!n)return;
  if(n.source_type==='opportunity'&&n.source_id)openOpportunity(Number(n.source_id));
  if(n.source_type==='crm'&&n.source_id){route('prospection');setTimeout(()=>selectLead(Number(n.source_id)),30)}
}
function sendCurrentBureauToCreation(){
  const n=state.bureau.find(x=>Number(x.id)===Number(state.activeDoc));if(!n)return;
  route('creation');setCreationMode('text');
  setTimeout(()=>{if($('#contentTitle'))$('#contentTitle').value=n.title||'';if($('#contentBrief'))$('#contentBrief').value=n.body||'';if(n.source_type==='opportunity'&&n.source_id&&$('#contentSource')){$('#contentSource').value=String(n.source_id);$('#contentSource').dispatchEvent(new Event('change'))}toast('Document chargé dans Création')},50);
}
$('#bureauNew')?.addEventListener('click',clearDoc);$('#bureauSearch')?.addEventListener('input',renderBureau);

function ensureSaveStatus(){
  if($('#workspaceSaveStatus'))return;
  const top=$('.top-actions');if(!top)return;
  const s=document.createElement('span');s.id='workspaceSaveStatus';s.className='save-status';s.textContent='Synchronisé';top.insertBefore(s,top.firstChild);
  const st=document.createElement('style');st.textContent='.save-status{font-size:8px;color:#8c8f99;white-space:nowrap}.save-status.saving{color:#725ad1}.save-status.saved{color:#4e9d78}.save-status.error{color:#ca5a67}@media(max-width:820px){.save-status{display:none}}';document.head.appendChild(st);
}
function saveStatus(text,stateName=''){
  ensureSaveStatus();const s=$('#workspaceSaveStatus');if(!s)return;s.textContent=text;s.className='save-status '+stateName;
}

async function saveBureau(silent=false){
  saveStatus('Sauvegarde…','saving');
  const body={title:$('#bureauTitle').value||'Sans titre',body:$('#bureauBody').value,folder:$('#bureauFolder').value,tags:$('#bureauTags').value,pinned:$('#bureauPinned').checked?1:0};
  try{
    let n;if(state.activeDoc)n=await api('/api/v107/bureau/'+state.activeDoc,{method:'PATCH',body:JSON.stringify(body)});else n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify(body)});
    const idx=state.bureau.findIndex(x=>x.id===n.id);if(idx>=0)state.bureau[idx]=n;else state.bureau.unshift(n);state.activeDoc=n.id;renderBureau();renderDashboard();saveStatus('Enregistré','saved');if(!silent)toast('Document enregistré');return n;
  }catch(e){saveStatus('Erreur de sauvegarde','error');if(!silent)toast('Erreur d’enregistrement')}
}
$('#bureauSave')?.addEventListener('click',()=>saveBureau(false));
let bureauAutosaveTimer=0;
['bureauTitle','bureauBody','bureauTags'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{if(!state.activeDoc)return;clearTimeout(bureauAutosaveTimer);bureauAutosaveTimer=setTimeout(()=>saveBureau(true),1400)}));
['bureauFolder','bureauPinned'].forEach(id=>$('#'+id)?.addEventListener('change',()=>{if(state.activeDoc)saveBureau(true)}));
$('#bureauDelete')?.addEventListener('click',async()=>{if(!state.activeDoc)return;try{await api('/api/v107/bureau/'+state.activeDoc,{method:'DELETE'});state.bureau=state.bureau.filter(x=>x.id!==state.activeDoc);clearDoc();renderDashboard();toast('Document supprimé')}catch{toast('Suppression impossible')}});
$$('[data-bureau-ai]').forEach(b=>b.onclick=async()=>{const text=$('#bureauBody').value;if(!text)return;const prompts={rewrite:'Réécris ce texte de façon plus fluide, professionnelle et claire sans ajouter de faits : ',shorten:'Résume ce texte en gardant les informations essentielles : ',application:'Transforme ce texte en candidature artistique convaincante mais factuelle : ',social:'Transforme ce texte en publication PLUG ART concise et claire : '};await askPlugy(prompts[b.dataset.bureauAi]+text,'#bureauBody')});

function leadStatusLabel(s){return({lead:'À contacter',contacted:'Contacté',waiting:'En attente',followup:'Relance',active:'Échange en cours',hot:'Opportunité chaude',closed:'Clos'})[s]||s||'À contacter'}
function ensureLeadPipeline(){
  if($('#leadPipeline'))return;
  const view=$('#view-prospection'),toolbar=view?.querySelector('.page-toolbar');if(!view||!toolbar)return;
  const pipe=document.createElement('div');pipe.id='leadPipeline';pipe.className='lead-pipeline';toolbar.insertAdjacentElement('afterend',pipe);
  const st=document.createElement('style');st.textContent='.lead-pipeline{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin:0 0 12px}.lead-pipe{border:1px solid #e2e4ea;background:#fff;border-radius:14px;padding:10px;text-align:left}.lead-pipe.active{border-color:#bfb6f4;background:#f8f6ff}.lead-pipe strong,.lead-pipe span{display:block}.lead-pipe strong{font-size:17px;letter-spacing:-.5px}.lead-pipe span{font-size:8px;color:#8d909b;margin-top:3px}@media(max-width:980px){.lead-pipeline{grid-template-columns:repeat(4,1fr)}}@media(max-width:560px){.lead-pipeline{grid-template-columns:repeat(2,1fr)}}';document.head.appendChild(st);
}
function renderLeadPipeline(){
  ensureLeadPipeline();const pipe=$('#leadPipeline');if(!pipe)return;
  const statuses=[['lead','À contacter'],['contacted','Contacté'],['waiting','En attente'],['followup','Relance'],['active','En cours'],['hot','Chaud'],['closed','Clos']];
  const current=$('#leadStatusFilter')?.value||'';
  pipe.innerHTML=statuses.map(([v,l])=>'<button class="lead-pipe '+(current===v?'active':'')+'" data-pipe="'+v+'"><strong>'+state.leads.filter(x=>(x.status||'lead')===v).length+'</strong><span>'+l+'</span></button>').join('');
  $$('[data-pipe]',pipe).forEach(b=>b.onclick=()=>{const sel=$('#leadStatusFilter');sel.value=sel.value===b.dataset.pipe?'':b.dataset.pipe;renderLeads()});
}
function renderLeads(){
  renderLeadPipeline();
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
  $('#leadToBureau').onclick=async()=>{const d=leadPayload();try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Prospection · '+clean(d.organization||d.name||'Contact'),body:[d.notes,d.next_action?'Prochaine action : '+d.next_action:'',d.email?'Email : '+d.email:'',d.instagram?'Instagram : '+d.instagram:''].filter(Boolean).join('\n\n'),folder:'Prospection',tags:'prospection, contact',source_type:l.id?'crm':'',source_id:l.id?String(l.id):''})});state.bureau.unshift(n);renderDashboard();toast('Contact envoyé au Bureau')}catch{toast('Envoi au Bureau impossible')}};
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
  term=clean(term).toLowerCase();const pages=Object.entries(viewMeta).map(([id,m])=>({type:'Page',title:m[1],id}));const opps=(state.bootstrap?.opportunities||[]).slice(0,40).map(o=>({type:'Open Call',title:o.title,id:o.id,route:'opencalls'}));const leads=state.leads.slice(0,30).map(l=>({type:'Contact',title:l.organization||l.name,id:l.id,route:'prospection'}));const docs=state.bureau.slice(0,30).map(n=>({type:'Bureau',title:n.title,id:n.id,route:'bureau'}));const drafts=state.drafts.slice(0,30).map(d=>({type:'Brouillon',title:d.title,id:d.id,route:'creation'}));const all=[...pages,...opps,...leads,...docs,...drafts].filter(x=>!term||String(x.title).toLowerCase().includes(term)).slice(0,18);$('#commandResults').innerHTML=all.map((x,i)=>'<button class="command-result" data-cmd="'+i+'"><strong>'+esc(x.title)+'</strong><span>'+esc(x.type)+'</span></button>').join('');$$('[data-cmd]').forEach((b,i)=>b.onclick=()=>{const x=all[i];$('#searchOverlay').classList.remove('open');route(x.route||x.id);if(x.type==='Contact')setTimeout(()=>selectLead(x.id),60);if(x.type==='Bureau')setTimeout(()=>selectDoc(x.id),60);if(x.type==='Open Call')setTimeout(()=>openOpportunity(x.id),60);if(x.type==='Brouillon')setTimeout(()=>loadDraft(x.id),60)})
}
$('#globalSearch')?.addEventListener('click',openSearch);$('#commandInput')?.addEventListener('input',e=>renderCommand(e.target.value));
$('#refreshData')?.addEventListener('click',loadAll);
$('#newAction')?.addEventListener('click',()=>$('#newOverlay').classList.add('open'));
$$('[data-close-overlay]').forEach(b=>b.onclick=()=>b.closest('.overlay').classList.remove('open'));
$$('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open')}));
$$('[data-create]').forEach(b=>b.onclick=()=>{const a=b.dataset.create;$('#newOverlay').classList.remove('open');if(a==='content')route('creation');if(a==='bureau'){route('bureau');clearDoc()}if(a==='lead'){route('prospection');$('#leadNew').click()}if(a==='radar'){route('radar');$('#radarRun').click()}});

$('#sidebarCollapse')?.addEventListener('click',()=>document.body.classList.toggle('sidebar-small'));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){$$('.overlay.open').forEach(o=>o.classList.remove('open'));closePlugy()}});

function speakPlugy(text){
  text=clean(text);if(!text||!('speechSynthesis' in window)){state.voiceReply=false;return}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=1.08;u.pitch=1;u.onstart=()=>{$('#plugyState span').textContent='Parle…';playMotion('Present',true)};u.onend=()=>{$('#plugyState span').textContent='Prêt';state.voiceReply=false;playMotion('Idle',true)};u.onerror=()=>{state.voiceReply=false;playMotion('Idle',true)};speechSynthesis.speak(u)}catch{state.voiceReply=false}
}

async function initVoice(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast('Reconnaissance vocale indisponible');return}
  if(state.voice){state.recognition?.stop();return}
  const rec=new R();state.recognition=rec;rec.lang='fr-FR';rec.interimResults=false;rec.continuous=false;rec.maxAlternatives=1;state.voice=true;state.voiceReply=true;$('#plugyState span').textContent='Écoute…';playMotion('Attentive',true);
  rec.onresult=e=>{
    const last=e.results?.[e.results.length-1],alt=last?.[0],text=clean(alt?.transcript||'');
    if(text)$('#plugyInput').value=text;
    if(last?.isFinal&&text.length>1){state.voice=false;askPlugy(text)}
    else if(last?.isFinal){state.voice=false;state.voiceReply=false;$('#plugyState span').textContent='Prêt';playMotion('Idle',true)}
  };
  rec.onend=()=>{state.voice=false;if(!state.voiceReply){$('#plugyState span').textContent='Prêt';playMotion('Idle',true)}};
  rec.onerror=()=>{state.voice=false;state.voiceReply=false;$('#plugyState span').textContent='Micro interrompu';playMotion('SoftTurn');setTimeout(()=>{if($('#plugyState span'))$('#plugyState span').textContent='Prêt'},900)};
  rec.start()
}
$('#plugyVoice')?.addEventListener('click',initVoice);

async function loadAll(){
  const bureauP=api('/api/v107/bureau').catch(()=>[]);
  const leadsP=api('/api/v86/crm').catch(()=>[]);
  const workflowP=api('/api/v107/open-calls/workflow').catch(()=>[]);
  const draftsP=api('/api/v108/drafts').catch(()=>[]);
  try{
    const boot=await api('/api/v102/bootstrap');
    state.bootstrap=boot;
    populateCountry($('#radarCountry'),boot.opportunities||[]);populateCountry($('#openCountry'),boot.opportunities||[]);
    renderDashboard();if(state.view!=='dashboard')renderRouteView(state.view);
    const [bureau,leads,workflow,drafts]=await Promise.all([bureauP,leadsP,workflowP,draftsP]);
    state.bureau=Array.isArray(bureau)?bureau:[];state.leads=Array.isArray(leads)?leads:[];state.workflow=Array.isArray(workflow)?workflow:[];state.drafts=Array.isArray(drafts)?drafts:[];
    renderDashboard();renderNavBadges();if(state.view!=='dashboard')renderRouteView(state.view);
    toast('Workspace synchronisé');
  }catch(e){
    console.warn('[PLUG ART V110]',e);
    const [bureau,leads,workflow,drafts]=await Promise.all([bureauP,leadsP,workflowP,draftsP]);
    state.bureau=Array.isArray(bureau)?bureau:[];state.leads=Array.isArray(leads)?leads:[];state.workflow=Array.isArray(workflow)?workflow:[];state.drafts=Array.isArray(drafts)?drafts:[];
    renderNavBadges();renderRouteView(state.view);toast('Le Radar est momentanément indisponible');
  }
}






/* V108 · compact creation studio */


function setNavBadge(routeName,count){
  const item=$('.nav-item[data-route="'+routeName+'"]');if(!item)return;
  let badge=item.querySelector('.nav-attention');
  if(!badge){badge=document.createElement('em');badge.className='nav-attention';item.appendChild(badge)}
  badge.textContent=String(count||0);badge.hidden=!count;
}
function renderNavBadges(){
  const today=new Date().toISOString().slice(0,10);
  const urgentCalls=(state.bootstrap?.opportunities||[]).filter(o=>{const d=daysLeft(o);return d>=0&&d<=4}).length;
  const dueLeads=state.leads.filter(l=>l.status!=='closed'&&l.next_date&&l.next_date<=today).length;
  const agendaUrgent=agendaEntries().filter(x=>x.urgent).length;
  setNavBadge('opencalls',urgentCalls);setNavBadge('prospection',dueLeads);setNavBadge('agenda',agendaUrgent);
  if(!$('#navBadgeStyles')){const st=document.createElement('style');st.id='navBadgeStyles';st.textContent='.nav-item{position:relative}.nav-attention{margin-left:auto;min-width:18px;height:18px;border-radius:999px;background:#111318;color:#fff;font-size:8px;font-style:normal;display:grid;place-items:center;padding:0 5px}.nav-attention[hidden]{display:none}body.sidebar-small .nav-attention{position:absolute;right:3px;top:3px;min-width:14px;height:14px;font-size:7px;padding:0 3px}';document.head.appendChild(st)}
}

function installAgenda(){
  if($('#view-agenda'))return;
  const navGroups=$$('.nav-group');const organize=navGroups[1]||navGroups[0];const prospect=organize?.querySelector('[data-route="prospection"]');
  if(prospect){
    const b=document.createElement('button');b.className='nav-item';b.dataset.route='agenda';b.innerHTML='<b>◷</b><span>Agenda</span>';prospect.insertAdjacentElement('afterend',b);b.onclick=()=>route('agenda');
  }
  const section=document.createElement('section');section.className='view';section.id='view-agenda';
  section.innerHTML='<div class="page-toolbar"><div><small>AGENDA</small><h2>Deadlines & relances</h2><p>Les prochaines actions importantes dans une seule timeline.</p></div><div class="toolbar-actions"><select id="agendaFilter"><option value="">Tout</option><option value="call">Open Calls</option><option value="crm">Prospection</option></select><button class="secondary-btn" id="agendaRefresh">Actualiser</button></div></div><div class="agenda-board panel"><div id="agendaList"></div></div>';
  $('.workspace').appendChild(section);
  $('#agendaFilter').onchange=renderAgenda;$('#agendaRefresh').onclick=loadAll;
  const st=document.createElement('style');st.textContent='.agenda-board{min-height:620px}.agenda-day{display:grid;grid-template-columns:92px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid #eef0f3}.agenda-day:last-child{border-bottom:0}.agenda-date strong,.agenda-date span{display:block}.agenda-date strong{font-size:12px}.agenda-date span{font-size:9px;color:#9295a0;margin-top:3px}.agenda-items{display:grid;gap:7px}.agenda-item{border:1px solid #e7e8ed;background:#fafbfc;border-radius:14px;padding:10px 12px;display:grid;grid-template-columns:8px 1fr auto;gap:9px;align-items:center;text-align:left}.agenda-item i{width:8px;height:8px;border-radius:50%;background:#7657ff}.agenda-item.crm i{background:#56cfd8}.agenda-item.urgent{border-color:#efc8ce;background:#fff8f9}.agenda-item.urgent i{background:#e95f71}.agenda-item strong,.agenda-item span{display:block}.agenda-item strong{font-size:10px}.agenda-item span{font-size:9px;color:#8c8f9a;margin-top:3px}.agenda-item b{font-size:8px;color:#767a86;text-transform:uppercase}@media(max-width:700px){.agenda-day{grid-template-columns:1fr}.agenda-date{display:flex;gap:7px;align-items:baseline}}';document.head.appendChild(st);
}
function agendaEntries(){
  const out=[],seen=new Set(),today=new Date().toISOString().slice(0,10),limit=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
  (state.bootstrap?.opportunities||[]).forEach(o=>{if(o.deadline&&o.deadline>=today&&o.deadline<=limit){const f=workflowFor(o.id);out.push({date:o.deadline,kind:'call',id:o.id,title:o.title,sub:f?.next_action||(f?workflowLabel(f.workflow_status):'Deadline'),urgent:o.deadline<=new Date(Date.now()+5*86400000).toISOString().slice(0,10)});seen.add('call-'+o.id+'-'+o.deadline)}});
  state.workflow.forEach(w=>{if(w.next_date&&w.next_date>=today&&w.next_date<=limit&&!seen.has('call-'+w.opportunity_id+'-'+w.next_date)){const o=opportunityById(w.opportunity_id);if(o)out.push({date:w.next_date,kind:'call',id:o.id,title:o.title,sub:w.next_action||workflowLabel(w.workflow_status),urgent:w.next_date<=new Date(Date.now()+3*86400000).toISOString().slice(0,10)})}});
  state.leads.forEach(l=>{if(l.next_date&&l.next_date>=today&&l.next_date<=limit)out.push({date:l.next_date,kind:'crm',id:l.id,title:l.organization||l.name||'Contact',sub:l.next_action||'Relance',urgent:l.next_date<=new Date(Date.now()+2*86400000).toISOString().slice(0,10)})});
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
function renderAgenda(){
  const box=$('#agendaList');if(!box)return;const filter=$('#agendaFilter')?.value||'',rows=agendaEntries().filter(x=>!filter||x.kind===filter),groups={};
  rows.forEach(x=>(groups[x.date]||(groups[x.date]=[])).push(x));
  box.innerHTML=Object.entries(groups).map(([date,items])=>{const d=new Date(date+'T12:00:00');return '<div class="agenda-day"><div class="agenda-date"><strong>'+d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})+'</strong><span>'+d.toLocaleDateString('fr-FR',{weekday:'long'})+'</span></div><div class="agenda-items">'+items.map((x,i)=>'<button class="agenda-item '+x.kind+(x.urgent?' urgent':'')+'" data-agenda="'+esc(x.kind)+'-'+esc(x.id)+'"><i></i><span><strong>'+esc(x.title)+'</strong><span>'+esc(x.sub)+'</span></span><b>'+(x.kind==='crm'?'Prospection':'Open Call')+'</b></button>').join('')+'</div></div>'}).join('')||'<div class="empty">Aucune échéance dans les 45 prochains jours.</div>';
  $$('[data-agenda]',box).forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.agenda.split('-');if(kind==='crm'){route('prospection');setTimeout(()=>selectLead(Number(id)),30)}else openOpportunity(Number(id))});
}

function installCreationModes(){
  const view=$('#view-creation');if(!view||$('#creationModeBar'))return;
  const toolbar=view.querySelector('.page-toolbar'),textPanel=view.querySelector('.creation-layout');
  if(textPanel)textPanel.id='textCreationPanel';
  const bar=document.createElement('div');bar.id='creationModeBar';bar.className='creation-mode-bar';
  bar.innerHTML='<button class="active" data-create-mode="text">Texte</button><button data-create-mode="carousel">Carrousel</button><button data-create-mode="visual">Visuel</button><span class="mode-spacer"></span><select id="draftPicker"><option value="">Brouillons</option></select><button id="draftSave">Enregistrer</button><button id="draftDelete" title="Supprimer le brouillon">×</button>';
  toolbar.insertAdjacentElement('afterend',bar);
  const carousel=document.createElement('section');carousel.id='carouselCreationPanel';carousel.className='creation-mode-panel';
  carousel.innerHTML='<div class="carousel-controls panel"><div class="panel-head"><div><small>CARROUSEL</small><h2>Structure éditoriale</h2></div></div><label>Source<select id="carouselSource"><option value="">Brief libre</option></select></label><label>Nombre de slides<select id="carouselCount"><option>4</option><option selected>5</option><option>6</option><option>7</option></select></label><label>Format<select id="carouselFormat"><option value="4:5">Portrait 4:5</option><option value="1:1">Carré 1:1</option><option value="9:16">Story 9:16</option></select></label><label>Brief<textarea id="carouselBrief" rows="7" placeholder="Angle, informations essentielles, CTA…"></textarea></label><button class="primary-btn wide" id="carouselGenerate">✦ Générer la structure</button><button class="secondary-btn wide" id="carouselGenerateImage">Générer l’image de la slide</button><button class="secondary-btn wide" id="carouselGenerateAll">Générer toutes les images</button><button class="secondary-btn wide" id="carouselToBureau">▤ Envoyer au Bureau</button></div><div class="carousel-preview panel"><div class="carousel-canvas" id="carouselCanvas"><div class="carousel-image" id="carouselImage"></div><div class="carousel-copy"><small id="carouselKicker">PLUG ART</small><h3 id="carouselTitle">Ton carrousel apparaîtra ici</h3><p id="carouselBody">Choisis une source ou écris un brief.</p><b id="carouselCta">Découvrir →</b></div></div><div class="carousel-edit"><input id="slideKicker" placeholder="Kicker"><input id="slideTitle" placeholder="Titre"><textarea id="slideBody" rows="4" placeholder="Texte"></textarea><input id="slideCta" placeholder="CTA"></div></div><aside class="carousel-strip panel"><div class="panel-head"><div><small>SLIDES</small><h2 id="carouselCounter">0 slide</h2></div></div><div id="carouselSlides"></div></aside>';
  view.appendChild(carousel);
  const visual=document.createElement('section');visual.id='visualCreationPanel';visual.className='creation-mode-panel';
  visual.innerHTML='<div class="visual-controls panel"><div class="panel-head"><div><small>VISUEL</small><h2>Génération d’image</h2></div></div><label>Prompt<textarea id="visualPrompt" rows="9" placeholder="Décris le visuel à créer…"></textarea></label><label>Style<select id="visualStyle"><option value="gallery">Galerie / éditorial</option><option value="editorial">Éditorial</option><option value="art">Art contemporain</option><option value="photo">Photographique</option></select></label><label>Format<select id="visualRatio"><option value="4:5">Portrait 4:5</option><option value="1:1">Carré 1:1</option><option value="9:16">Story 9:16</option></select></label><button class="primary-btn wide" id="visualGenerate">✦ Générer le visuel</button><button class="secondary-btn wide" id="visualToBureau">▤ Envoyer au Bureau</button></div><div class="visual-preview panel"><div id="visualImage"><span>Le visuel apparaîtra ici.</span></div></div>';
  view.appendChild(visual);
  const st=document.createElement('style');st.textContent=`
  .creation-mode-bar{display:flex;gap:6px;margin:0 0 12px;align-items:center}.creation-mode-bar .mode-spacer{flex:1}.creation-mode-bar select{border:1px solid #e0e2e8;background:#fff;border-radius:999px;padding:8px 11px;font-size:9px;max-width:220px}.creation-mode-bar button{border:1px solid #e0e2e8;background:#fff;border-radius:999px;padding:9px 13px;font-size:10px;font-weight:800}.creation-mode-bar button.active{background:#111318;color:#fff;border-color:#111318}.creation-mode-panel{display:none}.creation-mode-panel.active{display:grid}.carouselCreationPanel{}.carousel-controls,.visual-controls{display:grid;gap:11px;align-self:start}.carousel-controls label,.visual-controls label{display:grid;gap:5px;font-size:8px;color:#90939e;font-weight:800;text-transform:uppercase;letter-spacing:.65px}.carousel-controls input,.carousel-controls select,.carousel-controls textarea,.visual-controls select,.visual-controls textarea{padding:10px;font-size:10px;text-transform:none;letter-spacing:0}.wide{width:100%}#carouselCreationPanel{grid-template-columns:260px minmax(0,1fr) 210px;gap:14px}.carousel-preview{min-height:650px;display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:14px;align-items:center}.carousel-canvas{position:relative;overflow:hidden;aspect-ratio:4/5;border-radius:24px;background:linear-gradient(145deg,#eef1ff,#e4dcff 48%,#f3d2e3);box-shadow:0 25px 60px rgba(30,34,56,.12)}.carousel-image{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.72}.carousel-image:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.88) 70%)}.carousel-copy{position:absolute;z-index:2;left:7%;right:7%;bottom:6%;color:#17181e}.carousel-copy small{font-size:9px;font-weight:900;letter-spacing:1.1px}.carousel-copy h3{font-size:clamp(28px,3vw,50px);line-height:.95;letter-spacing:-2px;margin:10px 0 13px}.carousel-copy p{font-size:11px;line-height:1.45;max-width:85%}.carousel-copy b{font-size:10px}.carousel-edit{display:grid;gap:8px}.carousel-edit input,.carousel-edit textarea{padding:10px;font-size:10px}.carousel-strip{align-self:start;max-height:650px;overflow:auto}.carousel-slide-thumb{width:100%;border:1px solid #e4e5ea;background:#f8f9fa;border-radius:13px;padding:10px;text-align:left;margin-bottom:7px}.carousel-slide-thumb.active{border-color:#bfb6f4;background:#f8f6ff}.carousel-slide-thumb b,.carousel-slide-thumb span{display:block}.carousel-slide-thumb b{font-size:9px}.carousel-slide-thumb span{font-size:8px;color:#9295a0;margin-top:3px}#visualCreationPanel{grid-template-columns:300px 1fr;gap:14px}.visual-preview{min-height:660px;display:grid;place-items:center}.visual-preview #visualImage{width:min(540px,100%);aspect-ratio:4/5;border-radius:24px;background:#f0f2f6 center/cover no-repeat;display:grid;place-items:center;color:#9295a0;font-size:10px;box-shadow:0 24px 60px rgba(30,34,50,.08)}@media(max-width:1100px){#carouselCreationPanel{grid-template-columns:240px 1fr}.carousel-strip{grid-column:1/-1;display:flex;gap:7px;overflow:auto}.carousel-slide-thumb{min-width:150px}.carousel-preview{grid-template-columns:1fr}}@media(max-width:760px){#carouselCreationPanel,#visualCreationPanel{grid-template-columns:1fr}.carousel-preview{min-height:auto}.carousel-canvas{max-width:440px;margin:auto}.visual-preview{min-height:430px}}
  `;document.head.appendChild(st);
  $$('[data-create-mode]',bar).forEach(b=>b.onclick=()=>setCreationMode(b.dataset.createMode));
  $('#draftPicker').onchange=e=>{if(e.target.value)loadDraft(Number(e.target.value))};
  $('#draftSave').onclick=saveDraft;
  $('#draftDelete').onclick=deleteDraft;
  $('#carouselSource').onchange=syncCarouselBrief;$('#carouselGenerate').onclick=generateCarousel;$('#carouselGenerateImage').onclick=()=>generateCarouselImage(state.carousel.active);$('#carouselGenerateAll').onclick=generateAllCarouselImages;$('#carouselToBureau').onclick=carouselToBureau;
  $('#carouselFormat').onchange=e=>{state.carousel.format=e.target.value;renderCarousel()};
  ['slideKicker','slideTitle','slideBody','slideCta'].forEach(id=>$('#'+id).addEventListener('input',syncActiveSlideEdit));
  $('#visualGenerate').onclick=generateVisual;$('#visualToBureau').onclick=visualToBureau;
  setCreationMode('text');fillCreationSources();bindDraftAutosave();
}

function renderDraftPicker(){
  const p=$('#draftPicker');if(!p)return;const cur=state.currentDraft||'';
  p.innerHTML='<option value="">Brouillons</option>'+state.drafts.map(d=>'<option value="'+d.id+'">'+esc((d.title||'Brouillon')+' · '+d.kind)+'</option>').join('');p.value=String(cur||'');
}
function draftSnapshot(){
  if(state.creationMode==='carousel')return{kind:'carousel',title:state.carousel.slides[0]?.title||'Carrousel PLUG ART',source_opportunity_id:$('#carouselSource')?.value||'',payload:{slides:state.carousel.slides,active:state.carousel.active,format:state.carousel.format,brief:$('#carouselBrief')?.value||''}};
  if(state.creationMode==='visual')return{kind:'visual',title:'Visuel PLUG ART',source_opportunity_id:'',payload:{url:state.visual.url,prompt:$('#visualPrompt')?.value||state.visual.prompt||'',style:$('#visualStyle')?.value||'gallery',ratio:$('#visualRatio')?.value||'4:5'}};
  return{kind:'text',title:$('#contentTitle')?.value||$('#contentType')?.value||'Texte PLUG ART',source_opportunity_id:$('#contentSource')?.value||'',payload:{type:$('#contentType')?.value||'',objective:$('#contentObjective')?.value||'',brief:$('#contentBrief')?.value||'',body:$('#contentBody')?.value||''}};
}
async function saveDraft(silent=false){
  const snap=draftSnapshot();saveStatus('Sauvegarde brouillon…','saving');
  try{
    let d;if(state.currentDraft)d=await api('/api/v108/drafts/'+state.currentDraft,{method:'PATCH',body:JSON.stringify(snap)});
    else d=await api('/api/v108/drafts',{method:'POST',body:JSON.stringify(snap)});
    state.drafts=state.drafts.filter(x=>x.id!==d.id);state.drafts.unshift(d);state.currentDraft=d.id;renderDraftPicker();saveStatus('Brouillon enregistré','saved');if(!silent)toast('Brouillon enregistré');
  }catch{saveStatus('Erreur brouillon','error');if(!silent)toast('Enregistrement du brouillon impossible')}
}
function loadDraft(id){
  const d=state.drafts.find(x=>Number(x.id)===Number(id));if(!d)return;state.currentDraft=d.id;setCreationMode(d.kind||'text');
  const p=d.payload||{};
  if(d.kind==='carousel'){state.carousel={slides:Array.isArray(p.slides)?p.slides:[],active:Number(p.active||0),format:p.format||'4:5'};if($('#carouselSource'))$('#carouselSource').value=d.source_opportunity_id||'';if($('#carouselBrief'))$('#carouselBrief').value=p.brief||'';if($('#carouselFormat'))$('#carouselFormat').value=state.carousel.format;renderCarousel()}
  else if(d.kind==='visual'){state.visual={url:p.url||'',prompt:p.prompt||''};$('#visualPrompt').value=p.prompt||'';$('#visualStyle').value=p.style||'gallery';$('#visualRatio').value=p.ratio||'4:5';$('#visualImage').style.backgroundImage=p.url?'url("'+String(p.url).replace(/"/g,'%22')+'")':'none';if(p.url)$('#visualImage').innerHTML=''}
  else{$('#contentTitle').value=d.title||'';$('#contentSource').value=d.source_opportunity_id||'';$('#contentType').value=p.type||$('#contentType').value;$('#contentObjective').value=p.objective||'';$('#contentBrief').value=p.brief||'';$('#contentBody').value=p.body||''}
  renderDraftPicker();toast('Brouillon chargé');
}
async function deleteDraft(){
  if(!state.currentDraft)return toast('Aucun brouillon sélectionné');
  try{await api('/api/v108/drafts/'+state.currentDraft,{method:'DELETE'});state.drafts=state.drafts.filter(x=>x.id!==state.currentDraft);state.currentDraft=null;renderDraftPicker();toast('Brouillon supprimé')}catch{toast('Suppression impossible')}
}


let draftAutosaveTimer=0;
function scheduleDraftAutosave(){
  if(!state.currentDraft)return;
  clearTimeout(draftAutosaveTimer);
  draftAutosaveTimer=setTimeout(()=>saveDraft(true),1600);
}
function bindDraftAutosave(){
  ['contentTitle','contentObjective','contentBrief','contentBody','carouselBrief','slideKicker','slideTitle','slideBody','slideCta','visualPrompt'].forEach(id=>$('#'+id)?.addEventListener('input',scheduleDraftAutosave));
  ['contentType','contentSource','carouselSource','carouselFormat','visualStyle','visualRatio'].forEach(id=>$('#'+id)?.addEventListener('change',scheduleDraftAutosave));
}

function setCreationMode(mode){
  state.creationMode=mode;
  $$('[data-create-mode]').forEach(b=>b.classList.toggle('active',b.dataset.createMode===mode));
  $('#textCreationPanel')?.style.setProperty('display',mode==='text'?'grid':'none');
  $('#carouselCreationPanel')?.classList.toggle('active',mode==='carousel');
  $('#visualCreationPanel')?.classList.toggle('active',mode==='visual');
}
function fillCreationSources(){
  const sel=$('#carouselSource');if(!sel)return;const cur=sel.value;
  sel.innerHTML='<option value="">Brief libre</option>'+(state.bootstrap?.opportunities||[]).slice(0,100).map(o=>'<option value="'+o.id+'">'+esc(o.title)+'</option>').join('');if(cur)sel.value=cur;
}
function syncCarouselBrief(){
  const o=opportunityById($('#carouselSource').value);if(!o)return;
  $('#carouselBrief').value=[o.title,o.summary||o.radar_reason,[o.city,o.country].filter(Boolean).join(' · '),o.deadline?'Deadline : '+o.deadline:'',o.fee?'Frais : '+o.fee:''].filter(Boolean).join('\n');
}
function parseLooseJSON(txt){
  txt=String(txt||'').replace(/\`\`\`json|\`\`\`/gi,'').trim();const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a<0||b<a)throw new Error('Réponse non structurée');return JSON.parse(txt.slice(a,b+1));
}
function fallbackCarousel(count,source,brief){
  const title=source?.title||brief.split('\n')[0]||'Nouvelle opportunité',summary=source?.summary||source?.radar_reason||brief||'Informations à compléter.',loc=[source?.city,source?.country].filter(Boolean).join(' · ');
  const base=[{kicker:'OPEN CALL',title,body:loc||summary,cta:'Découvrir →'},{kicker:'POURQUOI',title:'À regarder de près',body:summary,cta:'Voir plus →'},{kicker:'LE PROJET',title:source?.type||'Exposition / appel à projets',body:summary,cta:'Comprendre →'},{kicker:'INFOS',title:loc||'Informations pratiques',body:[source?.deadline?'Deadline · '+source.deadline:'',source?.fee||''].filter(Boolean).join(' · '),cta:'Enregistrer'},{kicker:'ACTION',title:'À toi de jouer.',body:'Vérifie les critères et la source officielle avant de candidater.',cta:'PLUG 🔌'}];
  while(base.length<count)base.splice(base.length-1,0,{kicker:'À SAVOIR',title:'Point clé '+base.length,body:summary,cta:'Continuer →'});return base.slice(0,count).map(x=>({...x,image:'',image_prompt:''}));
}
async function generateCarousel(){
  const btn=$('#carouselGenerate'),old=btn.textContent,count=Number($('#carouselCount').value||5),source=opportunityById($('#carouselSource').value),brief=clean($('#carouselBrief').value);
  btn.disabled=true;btn.textContent='PLUGY structure…';playMotion('Think',true);
  const facts=source?{title:source.title,summary:source.summary||source.radar_reason,city:source.city,country:source.country,deadline:source.deadline,fee:source.fee,type:source.type,eligibility:source.eligibility}:{brief};
  const prompt='Crée un carrousel PLUG ART de '+count+' slides. N’invente aucun fait. Réponds uniquement en JSON valide : {"slides":[{"kicker":"","title":"","body":"","cta":"","image_prompt":""}]}. Chaque slide doit être concise, éditoriale et utile. Faits : '+JSON.stringify(facts);
  try{const r=await api('/api/v32/plugy',{method:'POST',body:JSON.stringify({message:prompt,page:'content',mode:'deep'})});const parsed=parseLooseJSON(r.answer);if(!Array.isArray(parsed.slides)||!parsed.slides.length)throw new Error('Aucune slide');state.carousel.slides=parsed.slides.slice(0,count).map(x=>({kicker:x.kicker||'PLUG ART',title:x.title||'',body:x.body||'',cta:x.cta||'Découvrir →',image_prompt:x.image_prompt||'',image:''}));}
  catch{state.carousel.slides=fallbackCarousel(count,source,brief)}
  state.carousel.active=0;state.carousel.format=$('#carouselFormat').value||'4:5';renderCarousel();scheduleDraftAutosave();if(source)persistWorkflow(source.id,{workflow_status:'drafting',next_action:'Finaliser le carrousel'}).catch(()=>{});playMotion('Happy');btn.disabled=false;btn.textContent=old;
}
function renderCarousel(){
  const slides=state.carousel.slides,s=slides[state.carousel.active]||{};$('#carouselCounter').textContent=slides.length+' slide'+(slides.length>1?'s':'');
  $('#carouselSlides').innerHTML=slides.map((x,i)=>'<button class="carousel-slide-thumb '+(i===state.carousel.active?'active':'')+'" data-carousel-slide="'+i+'"><b>'+String(i+1).padStart(2,'0')+' · '+esc(x.kicker||'PLUG ART')+'</b><span>'+esc((x.title||'Sans titre').slice(0,50))+'</span></button>').join('')||'<div class="empty">Aucune slide.</div>';
  $$('[data-carousel-slide]').forEach(b=>b.onclick=()=>{state.carousel.active=Number(b.dataset.carouselSlide);renderCarousel()});
  $('#carouselKicker').textContent=s.kicker||'PLUG ART';$('#carouselTitle').textContent=s.title||'Ton carrousel apparaîtra ici';$('#carouselBody').textContent=s.body||'Choisis une source ou écris un brief.';$('#carouselCta').textContent=s.cta||'Découvrir →';
  const img=$('#carouselImage');img.style.backgroundImage=s.image?'url("'+s.image.replace(/"/g,'%22')+'")':'none';
  const canvas=$('#carouselCanvas');canvas.style.aspectRatio=state.carousel.format==='1:1'?'1/1':state.carousel.format==='9:16'?'9/16':'4/5';
  $('#slideKicker').value=s.kicker||'';$('#slideTitle').value=s.title||'';$('#slideBody').value=s.body||'';$('#slideCta').value=s.cta||'';
}
function syncActiveSlideEdit(){
  const s=state.carousel.slides[state.carousel.active];if(!s)return;s.kicker=$('#slideKicker').value;s.title=$('#slideTitle').value;s.body=$('#slideBody').value;s.cta=$('#slideCta').value;renderCarousel();
}
async function generateCarouselImage(index){
  const s=state.carousel.slides[index];if(!s)return toast('Génère d’abord les slides');
  const source=opportunityById($('#carouselSource').value),ratio=state.carousel.format||'4:5',btn=$('#carouselGenerateImage'),old=btn.textContent;btn.disabled=true;btn.textContent='Image…';
  const prompt=clean((s.image_prompt||'Illustration éditoriale contemporaine pour '+s.title+'. '+s.body)+' Univers PLUG ART, art contemporain émergent, galerie, matière, photographie ou peinture selon le sujet. Aucun texte lisible, aucun logo, aucun watermark.'+(source?' Contexte : '+source.title+'.':''));
  try{const r=await api('/api/v32/content/image',{method:'POST',body:JSON.stringify({prompt,style:'gallery',ratio,quality:'medium'})});if(r.url){s.image=r.url;renderCarousel();scheduleDraftAutosave();toast('Image générée')}}catch(e){toast('Génération image indisponible')}finally{btn.disabled=false;btn.textContent=old}
}
async function generateAllCarouselImages(){
  if(!state.carousel.slides.length)return toast('Génère d’abord les slides');const b=$('#carouselGenerateAll'),old=b.textContent;b.disabled=true;
  for(let i=0;i<state.carousel.slides.length;i++){b.textContent='Image '+(i+1)+'/'+state.carousel.slides.length;state.carousel.active=i;renderCarousel();await generateCarouselImage(i)}
  b.disabled=false;b.textContent=old;state.carousel.active=0;renderCarousel();
}
async function carouselToBureau(){
  if(!state.carousel.slides.length)return;const sourceId=$('#carouselSource').value,source=opportunityById(sourceId);
  const body=state.carousel.slides.map((s,i)=>'SLIDE '+(i+1)+'\n'+[s.kicker,s.title,s.body,s.cta,s.image?'Visuel : '+s.image:''].filter(Boolean).join('\n')).join('\n\n');
  try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Carrousel · '+(source?.title||state.carousel.slides[0].title||'PLUG ART'),body,folder:'Contenus',tags:'carrousel, instagram, PLUG ART',source_type:sourceId?'opportunity':'',source_id:sourceId||''})});state.bureau.unshift(n);if(sourceId)await persistWorkflow(sourceId,{workflow_status:'drafting',next_action:'Finaliser le carrousel dans le Bureau'});toast('Carrousel envoyé au Bureau')}catch{toast('Enregistrement impossible')}
}
async function generateVisual(){
  const prompt=clean($('#visualPrompt').value);if(!prompt)return toast('Ajoute un prompt');const b=$('#visualGenerate'),old=b.textContent;b.disabled=true;b.textContent='Génération…';playMotion('Think',true);
  try{const r=await api('/api/v32/content/image',{method:'POST',body:JSON.stringify({prompt:prompt+' Aucun texte lisible, aucun logo, aucun watermark.',style:$('#visualStyle').value||'gallery',ratio:$('#visualRatio').value||'4:5',quality:'medium'})});if(r.url){state.visual={url:r.url,prompt};scheduleDraftAutosave();$('#visualImage').style.backgroundImage='url("'+r.url.replace(/"/g,'%22')+'")';$('#visualImage').innerHTML='';playMotion('Happy')}}catch{toast('Génération image indisponible')}finally{b.disabled=false;b.textContent=old}
}
async function visualToBureau(){
  if(!state.visual.url)return toast('Génère d’abord un visuel');try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Visuel PLUG ART',body:'Prompt : '+state.visual.prompt+'\n\nVisuel : '+state.visual.url,folder:'Contenus',tags:'visuel, image, PLUG ART'})});state.bureau.unshift(n);toast('Visuel envoyé au Bureau')}catch{toast('Enregistrement impossible')}
}

/* V107.5 · operational layer */
function injectOperationalUI(){
  if($('#todayPanel'))return;
  const grid=$('.dashboard-grid');
  const quick=$('.quick-panel');
  if(grid&&quick){
    const panel=document.createElement('section');
    panel.className='panel today-panel span-2';panel.id='todayPanel';
    panel.innerHTML='<div class="panel-head"><div><small>AUJOURD’HUI</small><h2>Ce qui mérite ton attention</h2></div><button class="text-btn" id="todayRefresh">Actualiser →</button></div><div class="today-list" id="todayList"></div>';
    quick.insertAdjacentElement('afterend',panel);
    $('#todayRefresh').onclick=loadAll;
  }
  const drawer=document.createElement('aside');
  drawer.className='call-drawer';drawer.id='callDrawer';
  drawer.innerHTML='<div class="call-head"><div><small>OPEN CALL</small><strong id="callTitle">Détail</strong></div><button id="callClose">×</button></div><div class="call-scroll"><div class="call-meta" id="callMeta"></div><p class="call-summary" id="callSummary"></p><div class="call-fields"><label>Suivi<select id="callStatus"><option value="saved">À lire</option><option value="working">À traiter</option><option value="drafting">En rédaction</option><option value="submitted">Envoyé</option><option value="followup">Relance</option><option value="closed">Clos</option></select></label><label>Prochaine action<input id="callNextAction" placeholder="Ex. préparer le dossier"></label><label>Date<input id="callNextDate" type="date"></label><label>Notes<textarea id="callNotes" rows="7" placeholder="Notes de travail…"></textarea></label></div><div class="call-actions"><button id="callFavorite">☆ Favori</button><button id="callPlugy">✦ PLUGY</button><button id="callBureau">▤ Bureau</button><button class="primary-btn" id="callCreate">Créer</button></div><a class="call-source" id="callSource" target="_blank" rel="noopener">Ouvrir la source ↗</a></div>';
  document.body.appendChild(drawer);
  $('#callClose').onclick=()=>drawer.classList.remove('open');
  $('#callStatus').onchange=saveOpportunityDrawer;
  $('#callNextAction').onchange=saveOpportunityDrawer;
  $('#callNextDate').onchange=saveOpportunityDrawer;
  let noteTimer=0;$('#callNotes').oninput=()=>{clearTimeout(noteTimer);noteTimer=setTimeout(saveOpportunityDrawer,900)};
  $('#callFavorite').onclick=()=>{if(state.activeOpportunity)toggleFavorite(state.activeOpportunity)};
  $('#callCreate').onclick=()=>{if(!state.activeOpportunity)return;route('creation');setTimeout(()=>{const s=$('#contentSource');s.value=String(state.activeOpportunity);s.dispatchEvent(new Event('change'))},60);drawer.classList.remove('open')};
  $('#callPlugy').onclick=()=>{const o=opportunityById(state.activeOpportunity);if(o)askPlugy('Analyse cet Open Call et prépare la prochaine action concrète : '+clean(o.title)+'. Deadline : '+clean(o.deadline)+'.')};
  $('#callBureau').onclick=opportunityToBureau;
  const st=document.createElement('style');st.id='v107OperationalStyles';st.textContent=`
  .today-panel{min-height:150px}.today-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.today-row{border:1px solid #eceef2;background:#fafbfc;border-radius:15px;padding:10px 11px;display:grid;grid-template-columns:8px 1fr auto;gap:9px;align-items:center;text-align:left}.today-row i{width:8px;height:8px;border-radius:50%;background:#7657ff}.today-row.crm i{background:#57cfcf}.today-row.urgent i{background:#ef6b7a}.today-row strong,.today-row span{display:block}.today-row strong{font-size:10px}.today-row span{font-size:9px;color:#90939d;margin-top:3px}.today-row b{font-size:9px;color:#707480;font-weight:700}.call-drawer{position:fixed;z-index:310;top:12px;right:12px;bottom:12px;width:min(430px,calc(100vw - 24px));background:rgba(255,255,255,.98);border:1px solid #e2e4ea;border-radius:26px;box-shadow:0 30px 90px rgba(20,23,36,.23);transform:translateX(calc(100% + 30px));transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(22px)}.call-drawer.open{transform:none}.call-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px;border-bottom:1px solid #eceef2}.call-head small,.call-head strong{display:block}.call-head small{font-size:8px;letter-spacing:1px;color:#999ca7}.call-head strong{font-size:17px;line-height:1.15;margin-top:4px;max-width:330px}.call-head button{border:0;background:#f2f3f6;width:34px;height:34px;border-radius:10px;font-size:18px}.call-scroll{padding:16px;overflow:auto}.call-meta{font-size:9px;color:#777b87;text-transform:uppercase;letter-spacing:.65px}.call-summary{font-size:11px;line-height:1.55;color:#646875;padding:12px 0;margin:0}.call-fields{display:grid;gap:10px}.call-fields label{display:grid;gap:5px;font-size:8px;font-weight:800;color:#91949f;text-transform:uppercase;letter-spacing:.65px}.call-fields input,.call-fields select,.call-fields textarea{padding:10px;font-size:10px;text-transform:none;letter-spacing:0}.call-fields textarea{resize:vertical}.call-actions{display:flex;gap:7px;margin-top:14px}.call-actions button{flex:1;border:1px solid #e1e3e9;background:#fff;border-radius:11px;padding:10px;font-size:9px;font-weight:800}.call-actions .primary-btn{background:#111318;color:#fff;border-color:#111318}.call-source{display:block;margin-top:12px;font-size:9px;color:#686c77;text-decoration:none}.call-source:hover{text-decoration:underline}@media(max-width:820px){.today-list{grid-template-columns:1fr}} `;
  document.head.appendChild(st);
}
function opportunityById(id){return (state.bootstrap?.opportunities||[]).find(x=>String(x.id)===String(id))}
function mergeWorkflow(id,patch={}){
  const current=workflowFor(id)||{};
  return {workflow_status:patch.workflow_status??current.workflow_status??'saved',notes:patch.notes??current.notes??'',next_action:patch.next_action??current.next_action??'',next_date:patch.next_date??current.next_date??''};
}
async function persistWorkflow(id,patch={}){
  const row=await api('/api/v107/open-calls/'+id+'/workflow',{method:'PUT',body:JSON.stringify(mergeWorkflow(id,patch))});
  state.workflow=state.workflow.filter(x=>String(x.opportunity_id)!==String(row.opportunity_id));state.workflow.push(row);renderDashboard();renderRadar();renderOpenCalls();return row;
}
function renderOpenCallFavorite(){const b=$('#callFavorite');if(!b||!state.activeOpportunity)return;const fav=opportunityFavorite(state.activeOpportunity);b.textContent=fav?'★ Favori':'☆ Favori';b.classList.toggle('active',fav)}
function openOpportunity(id){
  const o=opportunityById(id);if(!o)return;
  state.activeOpportunity=id;injectOperationalUI();
  $('#callTitle').textContent=o.title||'Open Call';
  $('#callMeta').textContent=[o.city,o.country,deadline(o.deadline),o.fee].filter(Boolean).join(' · ');
  $('#callSummary').textContent=o.summary||o.radar_reason||'Aucun résumé enregistré.';
  const f=workflowFor(id)||{};$('#callStatus').value=f.workflow_status||'saved';$('#callNextAction').value=f.next_action||'';$('#callNextDate').value=f.next_date||'';$('#callNotes').value=f.notes||'';
  const a=$('#callSource');a.href=o.source_url||'#';a.style.display=o.source_url?'block':'none';
  renderOpenCallFavorite();$('#callDrawer').classList.add('open');playMotion('Curious');
  if(!workflowFor(id))persistWorkflow(id,{workflow_status:'saved'}).catch(()=>{});
}
async function saveOpportunityDrawer(){
  if(!state.activeOpportunity)return;
  try{await persistWorkflow(state.activeOpportunity,{workflow_status:$('#callStatus').value,notes:$('#callNotes').value,next_action:$('#callNextAction').value,next_date:$('#callNextDate').value});toast('Open Call enregistré')}catch{toast('Enregistrement impossible')}
}
async function opportunityToBureau(){
  const o=opportunityById(state.activeOpportunity);if(!o)return;const f=workflowFor(o.id)||{};
  const body=[o.summary||o.radar_reason||'',o.deadline?'Deadline : '+o.deadline:'',o.fee?'Frais : '+o.fee:'',f.next_action?'Prochaine action : '+f.next_action:'',f.notes||''].filter(Boolean).join('\n\n');
  try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Open Call · '+o.title,body,folder:'Candidatures',tags:'open call, candidature',source_type:'opportunity',source_id:String(o.id)})});state.bureau.unshift(n);await persistWorkflow(o.id,{workflow_status:'drafting'});toast('Envoyé au Bureau');route('bureau');selectDoc(n.id);$('#callDrawer').classList.remove('open')}catch{toast('Envoi au Bureau impossible')}
}
function renderToday(){
  const box=$('#todayList');if(!box)return;
  const now=new Date(),today=now.toISOString().slice(0,10),soon=new Date(now.getTime()+7*86400000).toISOString().slice(0,10),items=[];
  state.workflow.filter(w=>w.workflow_status!=='closed').forEach(w=>{const o=opportunityById(w.opportunity_id);if(!o)return;const due=w.next_date||o.deadline||'';if(!due||due<=soon)items.push({kind:'call',id:o.id,title:o.title,sub:w.next_action||workflowLabel(w.workflow_status),date:due,urgent:due&&due<=today})});
  state.leads.filter(l=>l.status!=='closed'&&l.next_date&&l.next_date<=soon).forEach(l=>items.push({kind:'crm',id:l.id,title:l.organization||l.name||'Contact',sub:l.next_action||'Relance',date:l.next_date,urgent:l.next_date<=today}));
  (state.bootstrap?.opportunities||[]).filter(o=>{const d=daysLeft(o);return d>=0&&d<=4&&!workflowFor(o.id)}).slice(0,4).forEach(o=>items.push({kind:'call',id:o.id,title:o.title,sub:'Deadline proche',date:o.deadline,urgent:true}));
  items.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  box.innerHTML=items.slice(0,6).map((x,i)=>'<button class="today-row '+(x.kind==='crm'?'crm ':'')+(x.urgent?'urgent':'')+'" data-today="'+i+'"><i></i><span><strong>'+esc(x.title)+'</strong><span>'+esc(x.sub)+'</span></span><b>'+esc(x.date||'À traiter')+'</b></button>').join('')||'<div class="empty">Rien d’urgent. Le calme, cette fonctionnalité rare.</div>';
  $$('[data-today]',box).forEach((b,i)=>b.onclick=()=>{const x=items[i];if(x.kind==='crm'){route('prospection');setTimeout(()=>selectLead(x.id),30)}else openOpportunity(x.id)});
}
function handleLocalPlugy(message){
  const m=message.toLowerCase();
  const go=(id,reply)=>{route(id);return reply};
  if(/(ouvre|va|aller|affiche).*(radar)/.test(m))return go('radar','J’ouvre le Radar.');
  if(/(nouveau|crée|cree).*(carrousel)/.test(m)){route('creation');setCreationMode('carousel');state.currentDraft=null;return 'Nouveau carrousel prêt.'}
  if(/(nouveau|crée|cree).*(visuel|image)/.test(m)){route('creation');setCreationMode('visual');state.currentDraft=null;return 'Nouveau visuel prêt.'}
  if(/(brouillons?|drafts?)/.test(m)){route('creation');if(state.drafts[0])setTimeout(()=>loadDraft(state.drafts[0].id),30);return state.drafts.length?'J’ouvre le dernier brouillon.':'Il n’y a pas encore de brouillon.'}
  if(/(favoris|favorites)/.test(m)){route('opencalls');setTimeout(()=>{$('#openStatus').value='favorites';renderOpenCalls()},30);return 'J’affiche tes Open Calls favoris.'}
  if(/(ouvre|va|aller|affiche).*(open ?calls?|appels?)/.test(m))return go('opencalls','J’ouvre les Open Calls.');
  if(/(ouvre|va|aller|affiche).*(bureau|notes?)/.test(m))return go('bureau','J’ouvre le Bureau.');
  if(/(ouvre|va|aller|affiche).*(prospection|contacts?|crm)/.test(m))return go('prospection','J’ouvre Contacts & Prospection.');
  if(/(ouvre|va|aller|affiche).*(agenda|calendrier|deadlines?|échéances?)/.test(m))return go('agenda','J’ouvre l’Agenda.');
  if(/(ouvre|va|aller|affiche).*(création|creation|studio|contenu)/.test(m))return go('creation','J’ouvre le Studio de contenu.');
  if(/(ouvre|va|aller|affiche).*(carte|map)/.test(m))return go('map','J’ouvre la Carte.');
  if(/(nouveau|crée|cree).*(document|note)/.test(m)){route('bureau');clearDoc();return 'Nouveau document prêt dans le Bureau.'}
  if(/(nouveau|ajoute|crée|cree).*(contact)/.test(m)){route('prospection');setTimeout(()=>$('#leadNew')?.click(),20);return 'Nouvelle fiche contact ouverte.'}
  if(/(lance|actualise|démarre|demarre).*(radar|recherche)/.test(m)){route('radar');setTimeout(()=>$('#radarRun')?.click(),30);return 'Je lance le Radar.'}
  return '';
}
ensureSaveStatus();
installAgenda();
installOpenWorkflowFilters();
adaptDashboardForDrafts();
installRadarPresets();
installCreationModes();
ensureBureauBridge();
injectOperationalUI();

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