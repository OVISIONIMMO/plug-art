(function(){
'use strict';
const VERSION='146.20260925.1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const state={view:'dashboard',bootstrap:null,dataLoaded:{opportunities:false,artists:false,map:false,bureau:false,bureauMeta:false,leads:false,workflow:false,drafts:false},dataPromises:{},bureau:[],bureauTemplates:[],bureauPackages:[],bureauSources:[],bureauMode:'documents',bureauFolderFilter:'',activePackage:null,activeTemplate:null,leads:[],workflow:[],drafts:[],currentDraft:null,activeDoc:null,activeLead:null,activeOpportunity:null,history:[],voice:false,voiceReply:false,voiceConversation:false,recognition:null,plugyBusy:false,creationMode:'text',creationDirty:false,radarPreset:'all',mapFilter:'all',mapSearch:'',uiConfig:null,carousel:{slides:[],active:0,format:'4:5'},visual:{url:'',prompt:''},canvasLayer:null,canvasTool:'templates',studioGuides:true,studioSafe:true,studioSnap:true};

const viewMeta={
 dashboard:['WORKSPACE','Dashboard','Idle'],
 radar:['VEILLE ACTIVE','Radar','Attentive'],
 opencalls:['SÉLECTION DE TRAVAIL','Open Calls','Curious'],
 creation:['CRÉATION','Studio de contenu','Present'],
 bureau:['ÉCRITURE & DOCUMENTS','Bureau','Think'],
 prospection:['CONTACTS & PROSPECTION','Suivi des démarches','Attentive'],
 agenda:['AGENDA','Deadlines & relances','Attentive'],
 network:['RÉSEAU','Artistes','Happy'],
 social:['INSTAGRAM','Social Studio','Present'],
 map:['CARTE','Opportunités & expositions','Travel']
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
 social:{label:'Instagram',suggestions:['Prépare une légende','Analyse mon feed','Propose le prochain post']},
 map:{label:'Carte',suggestions:['Trouve autour de Paris','Compare les villes','Montre les opportunités proches']}
};

async function api(url,opt={}){
  const timeoutMs=Number(opt.timeout||(
    url.includes('/content/image')?90000:
    url.includes('/plugy')?60000:
    url.includes('/radar/run')?120000:15000
  ));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const {timeout,...fetchOpt}=opt;
  try{
    const r=await fetch(url,{cache:'no-store',...fetchOpt,signal:controller.signal,headers:{'Accept':'application/json',...(fetchOpt.body?{'Content-Type':'application/json'}:{}),...(fetchOpt.headers||{})}});
    if(!r.ok)throw new Error((await r.text())||('HTTP '+r.status));
    const ct=r.headers.get('content-type')||'';
    return ct.includes('json')?r.json():r.text();
  }catch(e){
    if(e?.name==='AbortError')throw new Error('Délai dépassé');
    throw e;
  }finally{clearTimeout(timer)}
}
function toast(msg){
  const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200);
}
const viewDataFamilies={
  radar:['opportunities','workflow'],
  opencalls:['opportunities','workflow'],
  creation:['opportunities','drafts'],
  agenda:['opportunities','workflow','leads'],
  bureau:['bureau','bureauMeta'],
  prospection:['leads'],
  network:['artists'],
  social:[],
  map:['map','opportunities']
};
function requiredFamilies(id){return viewDataFamilies[id]||[]}
const routeRuntimeReady=new Set();
function ensureRouteRuntime(id){
  if(routeRuntimeReady.has(id))return;
  if(id==='agenda')installAgenda();
  if(id==='radar'){installRadarPresets();installMobileRadarControls()}
  if(id==='opencalls')installOpenWorkflowFilters();
  if(id==='creation')installCreationModes();
  if(id==='bureau'){installBureauWorkspace();ensureBureauBridge()}
  routeRuntimeReady.add(id);
}
async function ensureDataFamily(name,force=false){
  if(state.dataLoaded[name]&&!force)return true;
  if(state.dataPromises[name])return state.dataPromises[name];
  const endpoints={opportunities:'/api/opportunities',artists:'/api/artists',map:'/api/map',bureau:'/api/v107/bureau',bureauMeta:'/api/v120/bureau/bootstrap',leads:'/api/v86/crm',workflow:'/api/v107/open-calls/workflow',drafts:'/api/v108/drafts'};
  const endpoint=endpoints[name];if(!endpoint)return true;
  state.dataPromises[name]=api(endpoint,{timeout:22000}).then(data=>{
    state.bootstrap=state.bootstrap||{stats:{},opportunities:[],artists:[],map:[]};
    if(name==='opportunities'){
      state.bootstrap.opportunities=Array.isArray(data)?data:[];
      populateCountry($('#radarCountry'),state.bootstrap.opportunities);
      populateCountry($('#openCountry'),state.bootstrap.opportunities);
    }
    if(name==='artists')state.bootstrap.artists=Array.isArray(data)?data:[];
    if(name==='map')state.bootstrap.map=Array.isArray(data)?data:[];
    if(name==='bureau')state.bureau=Array.isArray(data)?data:[];
    if(name==='bureauMeta'){state.bureauTemplates=Array.isArray(data?.templates)?data.templates:[];state.bureauPackages=Array.isArray(data?.packages)?data.packages:[];state.bureauSources=Array.isArray(data?.opportunities)?data.opportunities:[]}
    if(name==='leads')state.leads=Array.isArray(data)?data:[];
    if(name==='workflow')state.workflow=Array.isArray(data)?data:[];
    if(name==='drafts')state.drafts=Array.isArray(data)?data:[];
    state.dataLoaded[name]=true;
    return true;
  }).finally(()=>{delete state.dataPromises[name]});
  return state.dataPromises[name];
}
async function ensureViewData(id,force=false){
  const families=requiredFamilies(id);if(!families.length)return true;
  saveStatus('Chargement '+viewMeta[id][1]+'…','saving');
  try{
    await Promise.all(families.map(name=>ensureDataFamily(name,force)));
    saveStatus('Données chargées','saved');return true;
  }catch(err){
    saveStatus('Données indisponibles','error');throw err;
  }
}

function renderRouteView(id=state.view){
  if(id==='dashboard')return renderDashboard();
  if(id==='radar')return renderRadar();
  if(id==='opencalls')return renderOpenCalls();
  if(id==='creation'){renderContentSources();fillCreationSources();renderDraftPicker();if(typeof refreshQuickSources==='function')refreshQuickSources();return}
  if(id==='bureau'){installBureauWorkspace();setBureauMode(state.bureauMode||'documents');return}
  if(id==='prospection')return renderLeads();
  if(id==='agenda')return renderAgenda();
  if(id==='network')return renderArtists();
  if(id==='social')return renderInstagramStudio();
  if(id==='map')return renderMap();
}

function route(id,push=true){
  if(!viewMeta[id])id='dashboard';
  ensureRouteRuntime(id);
  state.view=id;document.body.dataset.view=id;
  $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+id));
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===id));
  $('#pageEyebrow').textContent=viewMeta[id][0];$('#pageTitle').textContent=viewMeta[id][1];
  document.title='PLUG ART · '+viewMeta[id][1];
  $('#plugyContext').textContent='Contexte : '+contexts[id].label;
  renderSuggestions();playMotion(viewMeta[id][2],id==='dashboard');
  if(push&&location.hash!=='#'+id)history.pushState({view:id},'','#'+id);
  const mobileMore=$('#mobileMoreButton'),mobileSheet=$('#mobileMoreSheet');
  if(mobileMore)mobileMore.classList.toggle('active',['creation','agenda','network','map','social'].includes(id));
  mobileSheet?.classList.remove('open');
  $('.workspace')?.scrollTo({top:0,behavior:'auto'});
  if(id!=='bureau')document.body.classList.remove('mobile-bureau-editing');
  if(id!=='prospection')$('#leadDetail')?.classList.remove('mobile-open');
  const missing=requiredFamilies(id).some(name=>!state.dataLoaded[name]);
  setTimeout(syncPlugyHomeMount,0);
  if(missing&&state.bootstrap){
    renderRouteView(id);
    ensureViewData(id).then(()=>{if(state.view===id)renderRouteView(id)}).catch(()=>{if(state.view===id)toast('Données momentanément indisponibles')});
  }else renderRouteView(id);
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
    try{
      mv.setAttribute('animation-crossfade-duration',(name==='Blink'||name==='DoubleBlink'||name==='Wink'||name==='SoftEyes')?'35':'80');
      if(mv.animationName!==target){try{mv.pause();mv.currentTime=0}catch{}}
      mv.animationName=target;
      mv.timeScale=(name==='Blink'||name==='DoubleBlink'||name==='Wink')?1.12:(name==='Think'||name==='Charge'||name==='ArmThink')?.94:(name==='Speak'?1.08:1);
      mv.play({repetitions:loop?Infinity:1});
    }catch{}
  };
  if(mv.loaded)run();else mv.addEventListener('load',run,{once:true});
  clearTimeout(playMotion.t);
  if(!loop&&name!=='Idle')playMotion.t=setTimeout(()=>playMotion('Idle',true),(['Blink','Wink'].includes(name)?340:name==='DoubleBlink'?520:['Think','Charge','ArmThink'].includes(name)?1650:Math.max(900,1050+Math.random()*380)));
}
function tunePlugyMaterials(){
  const mv=$('#plugyModel');if(!mv)return;
  try{
    const materials=mv.model?.materials||[];
    materials.forEach(mat=>{
      const name=String(mat?.name||'').toLowerCase();
      const pbr=mat?.pbrMetallicRoughness;
      const isMetal=/(metal|chrome|prong|pin|antenna|steel|silver)/.test(name);
      const isFace=/(glass|screen|visor|face|black|display)/.test(name);
      const metallic=isMetal?.34:0;
      const roughness=isMetal?.64:(isFace?.98:1);
      try{pbr?.setMetallicFactor?.(metallic)}catch{}
      try{pbr?.setRoughnessFactor?.(roughness)}catch{}
      try{mat?.clearcoat?.setClearcoatFactor?.(0)}catch{}
      try{mat?.clearcoat?.setClearcoatRoughnessFactor?.(1)}catch{}
      try{mat?.specular?.setSpecularFactor?.(isMetal?.18:0)}catch{}
      try{mat?.iridescence?.setIridescenceFactor?.(0)}catch{}
    });
    mv.setAttribute('exposure','.70');
    mv.setAttribute('shadow-intensity','.12');
    mv.setAttribute('shadow-softness','1');
    mv.dataset.finish='reflectionless-baked-v138';
  }catch(e){console.warn('[PLUGY finish]',e)}
}
$('#plugyModel')?.addEventListener('load',()=>{tunePlugyMaterials();if($('#plugyState span'))$('#plugyState span').textContent='Prêt';playMotion('Idle',true)},{once:true});
$('#plugyModel')?.addEventListener('pointerenter',()=>{
  const hello=choosePlugyMotion(['ArmHello','Curious','Happy']);
  if(hello)playMotion(hello);
  plugySoftGaze();
});
$('#plugyModel')?.addEventListener('pointermove',e=>{
  const mv=$('#plugyModel'),r=mv?.getBoundingClientRect();if(!mv||!r||state.voice)return;
  const nx=((e.clientX-r.left)/Math.max(1,r.width)-.5),ny=((e.clientY-r.top)/Math.max(1,r.height)-.5);
  mv.style.setProperty('--plugy-gaze-x',(nx*5).toFixed(1)+'px');mv.style.setProperty('--plugy-gaze-y',(ny*3).toFixed(1)+'px');
});
$('#plugyModel')?.addEventListener('dblclick',()=>{
  openPlugy();
  const react=choosePlugyMotion(['ArmExplain','Attentive','Happy']);
  if(react)playMotion(react);
});


let plugyWarmPromise=null,plugy3DRequested=false;
function warmPlugy3D(reason='intent'){
  plugy3DRequested=true;
  const mv=$('#plugyModel');if(mv)mv.setAttribute('loading','eager');
  if(plugyWarmPromise)return plugyWarmPromise;
  plugyWarmPromise=ensureModelViewer()
    .then(()=>true)
    .catch(err=>{plugyWarmPromise=null;plugy3DRequested=false;throw err});
  return plugyWarmPromise;
}
function scheduleSmartPlugyWarm(){
  const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(conn?.saveData||['slow-2g','2g'].includes(String(conn?.effectiveType||'')))return;
  const warm=()=>{if(document.visibilityState==='visible')warmPlugy3D('idle').catch(()=>{})};
  if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:2800});
  else setTimeout(warm,1600);
}
function bindPlugyWarmIntent(){
  const targets=[$('#sidebarPlugy'),$('#topPlugy'),...$$('[data-open-plugy]')].filter(Boolean);
  targets.forEach(el=>{
    el.addEventListener('pointerenter',()=>warmPlugy3D('hover').catch(()=>{}),{passive:true});
    el.addEventListener('pointerdown',()=>warmPlugy3D('press').catch(()=>{}),{passive:true});
    el.addEventListener('focus',()=>warmPlugy3D('focus').catch(()=>{}),{passive:true});
  });
}


function plugyDrawerStage(){return $('#plugyDrawer .plugy-stage')}
function plugyDashboardStage(){return $('#dashboardPlugyMount')}
function ensurePlugyFollower(){
  let host=$('#plugyFollower');if(host)return host;
  host=document.createElement('div');host.id='plugyFollower';host.className='plugy-follower';host.setAttribute('role','button');host.setAttribute('tabindex','0');host.setAttribute('aria-label','Ouvrir PLUGY');
  host.innerHTML='<span class="plugy-follower-aura" aria-hidden="true"></span><i class="plugy-follower-spark s1"></i><i class="plugy-follower-spark s2"></i><span class="plugy-follower-status"><i></i>PLUGY</span>';
  host.addEventListener('click',()=>openPlugy());
  host.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPlugy()}});
  document.body.appendChild(host);
  return host;
}
function plugyFollowerStage(){return ensurePlugyFollower()}
function plugyFramingFor(target){
  const follower=$('#plugyFollower');
  if(target&&follower&&target===follower)return{orbit:'0deg 76deg 4.92m',fov:'32deg'};
  if(target&&target===plugyDashboardStage())return{orbit:'0deg 76deg 3.42m',fov:'28deg'};
  return{orbit:'0deg 76deg 3.08m',fov:'27deg'};
}
function applyPlugyFraming(target){
  const mv=$('#plugyModel');if(!mv)return;
  const f=plugyFramingFor(target||mv.parentElement);
  try{mv.setAttribute('camera-orbit',f.orbit);mv.setAttribute('field-of-view',f.fov)}catch{}
}
function movePlugyModel(target){
  const mv=$('#plugyModel');if(!mv||!target)return;
  if(mv.parentElement!==target){
    const stateEl=target.querySelector('#plugyState');
    if(stateEl)target.insertBefore(mv,stateEl);else target.appendChild(mv);
  }
  applyPlugyFraming(target);
}
function syncPlugyHomeMount(){
  const drawer=$('#plugyDrawer'),open=drawer?.classList.contains('open'),hero=state.view==='dashboard'&&dashboardSlideIndex===0&&plugyDashboardStage();
  const follower=ensurePlugyFollower();
  if(open){follower.classList.remove('visible');movePlugyModel(plugyDrawerStage());return}
  if(hero){
    follower.classList.remove('visible');movePlugyModel(plugyDashboardStage());
    if(plugy3DRequested||customElements.get('model-viewer'))warmPlugy3D('dashboard').then(()=>playMotion('Idle',true)).catch(()=>{});
  }else{
    follower.classList.add('visible');movePlugyModel(follower);
    warmPlugy3D('follow').then(()=>{if(!['Think','Charge','Listen','Speak'].includes(document.body.dataset.plugyMotion||''))playMotion('Idle',true)}).catch(()=>{});
  }
}

function openPlugy(seed=''){
  movePlugyModel(plugyDrawerStage());
  $('#plugyDrawer')?.classList.add('open');
  const mv=$('#plugyModel');if(mv&&!mv.loaded)$('#plugyState span').textContent='Chargement 3D…';
  warmPlugy3D('open').then(()=>{
    const hello=choosePlugyMotion(['ArmHello','Wave','Attentive','Curious']);
    playMotion(hello||'Attentive');setTimeout(()=>{if($('#plugyDrawer')?.classList.contains('open')&&!state.voice)playMotion('Idle',true)},1180);
  }).catch(()=>{$('#plugyState span').textContent='Mode texte'});
  if(seed)$('#plugyInput').value=seed;
  renderPlugyActions();
  setTimeout(()=>$('#plugyInput')?.focus(),160);
}
function closePlugy(){
  $('#plugyDrawer')?.classList.remove('open');
  try{if(state.voice)state.recognition?.stop()}catch{}
  try{if('speechSynthesis' in window)speechSynthesis.cancel()}catch{}
  state.voice=false;state.voiceReply=false;state.voiceConversation=false;
  updateConversationButton();
  if($('#plugyState span'))$('#plugyState span').textContent='Prêt';
  setTimeout(syncPlugyHomeMount,120);
}
$('#sidebarPlugy')?.addEventListener('click',()=>openPlugy());
$('#topPlugy')?.addEventListener('click',()=>openPlugy());
$('#plugyClose')?.addEventListener('click',closePlugy);
$$('[data-open-plugy]').forEach(b=>b.addEventListener('click',()=>openPlugy()));
bindPlugyWarmIntent();
function plugyEntityContext(){
  const bits=['Rubrique : '+(contexts[state.view]?.label||state.view)];
  if(state.activeOpportunity){
    const o=opportunityById(state.activeOpportunity),f=workflowFor(state.activeOpportunity);
    if(o)bits.push('Open Call actif : '+[o.title,o.city,o.country,o.deadline?'deadline '+o.deadline:'',f?'suivi '+workflowLabel(f.workflow_status):''].filter(Boolean).join(' · '));
  }
  if(state.view==='prospection'&&state.activeLead){
    const l=state.leads.find(x=>Number(x.id)===Number(state.activeLead));
    if(l)bits.push('Contact actif : '+[l.organization||l.name,l.kind,l.status?leadStatusLabel(l.status):'',l.next_action?'prochaine action '+l.next_action:''].filter(Boolean).join(' · '));
  }
  if(state.view==='bureau'&&state.activeDoc){
    const n=state.bureau.find(x=>Number(x.id)===Number(state.activeDoc));
    if(n)bits.push('Document actif : '+[n.title,n.folder,n.tags].filter(Boolean).join(' · '));
  }
  if(state.view==='creation'){
    const source=opportunityById($('#contentSource')?.value||$('#carouselSource')?.value);
    if(source)bits.push('Source Création : '+[source.title,source.deadline?'deadline '+source.deadline:''].filter(Boolean).join(' · '));
  }
  return bits.join('. ')+'. ';
}
function createCarouselForOpportunity(id){
  const o=opportunityById(id);if(!o)return false;
  route('creation');setCreationMode('carousel');state.currentDraft=null;
  setTimeout(()=>{
    if($('#carouselSource')){$('#carouselSource').value=String(id);syncCarouselBrief()}
    if($('#carouselBrief')&&!$('#carouselBrief').value)$('#carouselBrief').value=[o.title,o.summary||o.radar_reason,o.deadline?'Deadline : '+o.deadline:''].filter(Boolean).join('\n');
  },60);
  return true;
}
async function setActiveLeadStatus(status){
  const l=state.leads.find(x=>Number(x.id)===Number(state.activeLead));if(!l)return false;
  try{
    const saved=await api('/api/v86/crm/'+l.id,{method:'PATCH',body:JSON.stringify({status})});
    Object.assign(l,saved);renderLeads();renderDashboard();selectLead(l.id);renderPlugyActions();toast('Statut contact mis à jour');return true;
  }catch{return false}
}

function ensurePlugyActions(){
  let box=$('#plugyActions');if(box)return box;
  const suggestions=$('#plugySuggestions');if(!suggestions)return null;
  box=document.createElement('div');box.id='plugyActions';box.className='plugy-actions';suggestions.insertAdjacentElement('afterend',box);
  if(!$('#plugyActionStyles')){const st=document.createElement('style');st.id='plugyActionStyles';st.textContent='.plugy-actions{display:flex;gap:6px;flex-wrap:wrap;padding:0 14px 10px}.plugy-actions button{border:1px solid rgba(103,87,207,.18);background:#f8f6ff;color:#5d50b0;border-radius:999px;padding:8px 10px;font-size:8px;font-weight:800}.plugy-actions button.primary{background:#111318;color:#fff;border-color:#111318}.plugy-actions:empty{display:none}';document.head.appendChild(st)}
  return box;
}
function plugyActionList(){
  const actions=[];
  if(state.view==='radar'){
    actions.push(['Paris / IDF',()=>applyRadarPreset('paris')],['Urgents',()=>applyRadarPreset('urgent')],['Lancer le Radar',()=>$('#radarRun')?.click(),'primary']);
  }
  if(state.view==='opencalls'){
    const id=state.activeOpportunity,o=opportunityById(id);
    if(id&&o){
      actions.push([o.favorite?'★ Retirer favori':'☆ Favori',()=>toggleFavorite(id)]);
      actions.push(['▤ Note',()=>opportunityToBureau()]);
      actions.push(['▤ Dossier',()=>createPackageForOpportunity(id)]);
      actions.push(['✦ Carrousel',()=>createCarouselForOpportunity(id),'primary']);
      actions.push(['✓ Envoyé',()=>persistWorkflow(id,{workflow_status:'submitted',next_action:'Suivre la réponse'}).then(()=>renderPlugyActions())]);
      actions.push(['↻ Relance',()=>persistWorkflow(id,{workflow_status:'followup',next_action:'Relancer la structure'}).then(()=>renderPlugyActions())]);
    }else{
      actions.push(['Favoris',()=>{$('#openStatus').value='favorites';renderOpenCalls()}],['En rédaction',()=>{$('#openStatus').value='drafting';renderOpenCalls()}],['À relancer',()=>{$('#openStatus').value='followup';renderOpenCalls()}]);
    }
  }
  if(state.view==='bureau'&&state.bureauMode==='packages'&&state.activePackage){
    actions.push(['Documents',()=>setBureauMode('documents')]);
    actions.push(['Modèles',()=>setBureauMode('templates')]);
    actions.push(['✦ Générer dossier',()=>generatePackageWithPlugy(),'primary']);
    actions.push(['Créer document',()=>createDocumentFromPackage()]);
  }
  if(state.view==='bureau'&&state.bureauMode==='templates'){
    actions.push(['Nouveau modèle',()=>newBureauTemplate()]);
    if(state.activeTemplate)actions.push(['Créer document',()=>useActiveTemplateAsDocument(),'primary']);
  }
  if(state.view==='bureau'&&state.bureauMode==='documents'&&state.activeDoc){
    actions.push(['Réécrire',()=>$('#bureauBody')?.value&&askPlugy('Réécris ce document de façon plus fluide et professionnelle sans inventer de faits : '+$('#bureauBody').value,'#bureauBody')]);
    actions.push(['Candidature',()=>$('#bureauBody')?.value&&askPlugy('Transforme ce document en candidature artistique claire, convaincante et factuelle : '+$('#bureauBody').value,'#bureauBody')]);
    actions.push(['✦ Vers Création',()=>sendCurrentBureauToCreation(),'primary']);
  }
  if(state.view==='prospection'&&state.activeLead){
    actions.push(['✦ Préparer relance',()=>$('#leadPlugy')?.click(),'primary']);
    actions.push(['▤ Bureau',()=>$('#leadToBureau')?.click()]);
    actions.push(['✓ Contacté',()=>setActiveLeadStatus('contacted')]);
    actions.push(['↻ Relance',()=>setActiveLeadStatus('followup')]);
    actions.push(['🔥 Chaud',()=>setActiveLeadStatus('hot')]);
  }
  if(state.view==='creation'){
    actions.push(['Nouveau carrousel',()=>{setCreationMode('carousel');state.currentDraft=null}],['Nouveau visuel',()=>{setCreationMode('visual');state.currentDraft=null}],['Enregistrer',()=>saveDraft(false),'primary']);
    if(state.creationMode==='carousel'&&state.carousel.slides.length)actions.push(['Légende Instagram',()=>prepareInstagramCaption()]);
  }
  if(state.view==='agenda')actions.push(['Urgences',()=>{route('opencalls');setTimeout(()=>{$('#openStatus').value='urgent';renderOpenCalls()},40)}]);
  return actions;
}
function renderPlugyActions(){
  const box=ensurePlugyActions();if(!box)return;
  const actions=plugyActionList();box.innerHTML=actions.map((a,i)=>'<button data-plugy-action="'+i+'" class="'+(a[2]||'')+'">'+esc(a[0])+'</button>').join('');
  $$('[data-plugy-action]',box).forEach((b,i)=>b.onclick=()=>{const fn=actions[i]?.[1];if(fn)fn()});
}
function renderSuggestions(){
  const box=$('#plugySuggestions');if(!box)return;
  box.innerHTML=(contexts[state.view]?.suggestions||[]).map(x=>'<button>'+esc(x)+'</button>').join('');
  $$('button',box).forEach(b=>b.onclick=()=>askPlugy(b.textContent));
  renderPlugyActions();
}
function addMsg(text,role='bot'){
  const box=$('#plugyStream');if(!box)return;const d=document.createElement('div');d.className='msg '+role;d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight;return d;
}
function setPlugyBusy(on){
  state.plugyBusy=!!on;
  const form=$('#plugyForm'),submit=form?.querySelector('button[type="submit"]');
  if(form)form.setAttribute('aria-busy',on?'true':'false');
  if(submit)submit.disabled=!!on;
}
async function streamPlugyRequest(payload,onDelta){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),payload.mode==='deep'?45000:30000);
  try{
    const r=await fetch('/api/v125/plugy/stream',{
      method:'POST',cache:'no-store',signal:controller.signal,
      headers:{'Accept':'text/event-stream','Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!r.ok||!r.body)throw new Error((await r.text())||('HTTP '+r.status));
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',meta=null;
    const consume=block=>{
      let event='message',data='';
      block.replace(/\r/g,'').split('\n').forEach(line=>{
        if(line.startsWith('event:'))event=line.slice(6).trim();
        else if(line.startsWith('data:'))data+=(data?'\n':'')+line.slice(5).trim();
      });
      if(!data)return;
      let parsed;try{parsed=JSON.parse(data)}catch{return}
      if(event==='delta'&&parsed.delta)onDelta(String(parsed.delta));
      if(event==='done')meta=parsed;
    };
    while(true){
      const {value,done}=await reader.read();
      if(value)buffer+=decoder.decode(value,{stream:!done});
      buffer=buffer.replace(/\r\n/g,'\n');
      let cut;
      while((cut=buffer.indexOf('\n\n'))>=0){consume(buffer.slice(0,cut));buffer=buffer.slice(cut+2)}
      if(done)break;
    }
    if(buffer.trim())consume(buffer);
    return meta||{};
  }finally{clearTimeout(timer)}
}
function createProgressiveSpeaker(){
  if(!state.voiceReply||!('speechSynthesis' in window))return null;
  try{speechSynthesis.cancel()}catch{}
  let spoken=0,queued=0,finished=false;
  const finish=()=>{if(!finished||queued>0)return;state.voiceReply=false;$('#plugyState span').textContent='Prêt';playMotion('Idle',true);resumeConversationListening(430)};
  const enqueue=text=>{
    text=clean(text);if(!text)return;
    queued++;const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=1.12;u.pitch=1;
    u.onstart=()=>{$('#plugyState span').textContent='Parle…';playMotion('Speak',true)};
    const done=()=>{queued=Math.max(0,queued-1);finish()};u.onend=done;u.onerror=done;speechSynthesis.speak(u);
  };
  return {
    push(full,final=false){
      const pending=String(full||'').slice(spoken);if(!pending&&!final)return;
      if(final){spoken=String(full||'').length;enqueue(pending);finished=true;finish();return}
      if(pending.length<28)return;
      let cut=-1,m;const re=/[.!?…](?:\s|$)/g;while((m=re.exec(pending)))cut=m.index+m[0].length;
      if(cut>0){const chunk=pending.slice(0,cut);spoken+=cut;enqueue(chunk)}
    }
  };
}
async function askPlugy(message,injectTarget=null){
  message=clean(message);if(!message)return;
  const local=handleLocalPlugy(message);if(local){openPlugy();addMsg(message,'user');addMsg(local,'bot');playMotion('Happy');if(state.voiceReply)speakPlugy(local);return local;}
  if(state.plugyBusy){toast('PLUGY répond déjà');return}
  openPlugy();setPlugyBusy(true);addMsg(message,'user');state.history.push({role:'user',content:message});
  $('#plugyState span').textContent='Réflexion…';playMotion('Charge',true);
  const wait=addMsg('…','bot'),ctx='Contexte PLUG ART. '+plugyEntityContext(),mode=injectTarget?'deep':'fast';
  const payload={message:ctx+message,page:state.view,mode,history:state.history.slice(-4)};
  let answer='',received=false;const progressiveVoice=mode==='fast'?createProgressiveSpeaker():null;
  const append=delta=>{
    if(!received){received=true;wait.textContent='';$('#plugyState span').textContent='Répond…';playMotion('Present',true)}
    answer+=delta;wait.textContent=answer;wait.parentElement&&(wait.parentElement.scrollTop=wait.parentElement.scrollHeight);
    progressiveVoice?.push(answer,false);
  };
  try{
    let meta={};
    try{meta=await streamPlugyRequest(payload,append)}
    catch(streamErr){
      if(received&&answer)meta={answer,partial:true};
      else{
        const data=await api('/api/v32/plugy',{method:'POST',timeout:mode==='deep'?42000:28000,body:JSON.stringify(payload)});
        answer=clean(data.answer||data.message||'Je suis prêt.');wait.textContent=answer;meta=data;
      }
    }
    answer=clean(answer||meta.answer||wait.textContent||'Je suis prêt.');wait.textContent=answer;
    state.history.push({role:'assistant',content:answer});
    if(injectTarget){const el=$(injectTarget);if(el)el.value=answer}
    if(progressiveVoice)progressiveVoice.push(answer,true);else if(state.voiceReply)speakPlugy(answer);
    if(!state.voiceReply){$('#plugyState span').textContent='Prêt';playMotion('Present')}
    return answer;
  }catch(e){
    wait.textContent='Je n’arrive pas à joindre mon moteur pour le moment.';
    $('#plugyState span').textContent='Connexion interrompue';state.voiceReply=false;playMotion('SoftTurn');
  }finally{setPlugyBusy(false)}
}
$('#plugyForm')?.addEventListener('submit',e=>{e.preventDefault();const i=$('#plugyInput'),m=clean(i?.value||'');if(!m){i?.focus();return}i.value='';askPlugy(m)});
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
  try{const saved=await api('/api/opportunities/'+id,{method:'PATCH',body:JSON.stringify({favorite:next})});Object.assign(o,saved);renderDashboard();renderRadar();renderOpenCalls();if(state.activeOpportunity===Number(id))renderOpenCallFavorite();renderPlugyActions();toast(next?'Ajouté aux favoris':'Retiré des favoris')}catch{toast('Favori impossible à mettre à jour')}
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
  const drafts=$('#statArtists')?.parentElement;
  if(drafts){
    const label=drafts.querySelector('span');if(label)label.textContent='Brouillons';
    drafts.dataset.metricAction='drafts';drafts.tabIndex=0;
    drafts.onclick=async()=>{route('creation');try{await ensureViewData('creation');if(state.drafts[0])loadDraft(state.drafts[0].id)}catch{}};
  }
  const opps=$('#statOpp')?.parentElement;
  if(opps){opps.dataset.metricAction='calls';opps.tabIndex=0;opps.onclick=()=>route('opencalls')}
  const urgent=$('#statUrgent')?.parentElement;
  if(urgent){urgent.dataset.metricAction='urgent';urgent.tabIndex=0;urgent.onclick=()=>{route('opencalls');setTimeout(()=>{if($('#openStatus')){$('#openStatus').value='urgent';renderOpenCalls()}},50)}}
  const contacts=$('#statContacts')?.parentElement;
  if(contacts){contacts.dataset.metricAction='contacts';contacts.tabIndex=0;contacts.onclick=()=>route('prospection')}
  $$('[data-metric-action]').forEach(el=>el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}});
}


let dashboardSlideIndex=0;
const dashboardSlideNames=['Cockpit','Opportunités','Créer','Prospection','Réseau'];
function installSlideDashboard(){
  if($('#slideDashboard'))return;
  const view=$('#view-dashboard'),legacy=view?.querySelector('.dashboard-grid');if(!view||!legacy)return;
  legacy.hidden=true;legacy.setAttribute('aria-hidden','true');

  const deck=document.createElement('div');deck.id='slideDashboard';deck.className='slide-dashboard';
  deck.innerHTML=
    '<div class="slide-dashboard-nav">'+
      '<div class="slide-nav-copy"><small>PLUG ART WORKSPACE</small><strong id="slideDashboardTitle">Cockpit</strong></div>'+
      '<div class="slide-tabs">'+dashboardSlideNames.map((n,i)=>'<button data-dash-slide="'+i+'" class="'+(i===0?'active':'')+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+n+'</button>').join('')+'</div>'+
      '<div class="slide-arrows"><button id="slidePrev" aria-label="Slide précédente">←</button><button id="slideNext" aria-label="Slide suivante">→</button></div>'+
    '</div>'+
    '<div class="slide-rail" id="slideRail">'+
      '<section class="dash-slide dash-slide-hero" data-slide-index="0">'+
        '<div class="slide-hero-copy">'+
          '<span class="slide-kicker">ASSISTANT & PRIORITÉS</span>'+
          '<h2>Ton workspace.<br><em>Avec PLUGY au centre.</em></h2>'+
          '<p id="slideHeroSummary">Je rassemble ce qui mérite ton attention aujourd’hui et je peux agir directement dans chaque outil.</p>'+
          '<div class="slide-hero-actions"><button class="slide-primary" data-slide-plugy>Parler à PLUGY</button><button data-route="radar">Lancer le Radar</button><button data-route="creation">Créer</button></div>'+
          '<div class="slide-metrics" id="slideMetrics"></div>'+
        '</div>'+
        '<div class="slide-plugy-zone">'+
          '<div class="slide-plugy-glow"></div>'+
          '<div class="slide-plugy-mount" id="dashboardPlugyMount"></div>'+
          '<div class="slide-plugy-label"><i></i><span>PLUGY · assistant actif</span></div>'+
        '</div>'+
        '<div class="slide-today-card"><div class="slide-card-head"><span>AUJOURD’HUI</span><button data-dash-jump="1">Voir les priorités →</button></div><div id="slideTodayList"></div></div>'+
      '</section>'+
      '<section class="dash-slide dash-slide-opps" data-slide-index="1">'+
        '<div class="slide-section-head"><span class="slide-kicker">TROUVER & TRAITER</span><h2>Opportunités</h2><p>Radar, Open Calls et deadlines au même endroit.</p></div>'+
        '<div class="slide-tool-grid three">'+
          '<button class="slide-tool-card accent-a" data-route="radar"><span>◉</span><small>RADAR</small><strong>Trouver de nouveaux appels</strong><p>Paris, Europe, collectifs, accessibles et urgents.</p></button>'+
          '<button class="slide-tool-card accent-b" data-route="opencalls"><span>◇</span><small>OPEN CALLS</small><strong>Suivre les candidatures</strong><p>Favoris, rédaction, envoyés et relances.</p></button>'+
          '<button class="slide-tool-card accent-c" data-route="agenda"><span>◷</span><small>AGENDA</small><strong>Voir les échéances</strong><p>Deadlines et prochaines actions.</p></button>'+
        '</div>'+
        '<div class="slide-data-panel"><div class="slide-card-head"><span>PRIORITÉS</span><button data-route="opencalls">Tout voir →</button></div><div class="slide-opportunity-list" id="slideOpportunityList"></div></div>'+
      '</section>'+
      '<section class="dash-slide dash-slide-create" data-slide-index="2">'+
        '<div class="slide-create-intro"><span class="slide-kicker">PRODUIRE</span><h2>Créer <em>&</em><br>rédiger</h2><p>Un espace de production continu. Choisis une intention, pas une case.</p><button class="create-main-action" data-route="creation"><i>✦</i><span><small>COMMENCER</small><strong>Ouvrir le Studio</strong></span><b>↗</b></button></div>'+
        '<div class="create-flow" aria-label="Outils de création">'+
          '<button class="create-orbit create-orbit-studio" data-route="creation"><i>✦</i><span><small>STUDIO</small><strong>Composer</strong><em>Texte · carrousel · visuel</em></span></button>'+
          '<button class="create-orbit create-orbit-docs" data-route="bureau"><i>▤</i><span><small>BUREAU</small><strong>Écrire</strong><em>Documents & notes</em></span></button>'+
          '<button class="create-orbit create-orbit-pack" data-bureau-slide="packages"><i>◫</i><span><small>DOSSIERS</small><strong>Assembler</strong><em>Candidatures avec PLUGY</em></span></button>'+
          '<button class="create-orbit create-orbit-models" data-bureau-slide="templates"><i>≡</i><span><small>MODÈLES</small><strong>Réutiliser</strong><em>Bases & structures</em></span></button>'+
          '<div class="create-flow-line" aria-hidden="true"></div>'+
        '</div>'+
        '<div class="create-resume-stream"><div class="create-resume-head"><span>À REPRENDRE</span><button data-route="bureau">Tout le Bureau ↗</button></div><div id="slideWorkResume"></div></div>'+
      '</section>'+
      '<section class="dash-slide dash-slide-crm" data-slide-index="3">'+
        '<div class="slide-section-head"><span class="slide-kicker">DÉMARCHES</span><h2>Prospection</h2><p>Voir qui contacter, relancer et faire avancer.</p></div>'+
        '<div class="slide-crm-layout">'+
          '<button class="slide-crm-main" data-route="prospection"><span>◎</span><div><small>CONTACTS & PROSPECTION</small><strong>Ouvrir le pipeline</strong><p>Messages PLUGY, historique, relances et prochaines actions.</p></div><b>→</b></button>'+
          '<div class="slide-data-panel"><div class="slide-card-head"><span>PROCHAINES RELANCES</span><button data-route="prospection">Tout voir →</button></div><div id="slideLeadList"></div></div>'+
        '</div>'+
      '</section>'+
      '<section class="dash-slide dash-slide-network" data-slide-index="4">'+
        '<div class="slide-section-head"><span class="slide-kicker">ÉCOSYSTÈME</span><h2>Réseau & territoire</h2><p>Artistes, lieux et opportunités géographiques sans surcharger le cockpit.</p></div>'+
        '<div class="slide-network-grid">'+
          '<button class="slide-network-card artists" data-route="network"><span>◌</span><small>ARTISTES</small><strong>Explorer le réseau</strong><p>Profils, pratiques, coordonnées et parcours.</p><b>Ouvrir →</b></button>'+
          '<button class="slide-network-card map" data-route="map"><span>⌖</span><small>CARTE</small><strong>Voir les opportunités</strong><p>Repérer les appels et expositions par territoire.</p><b>Ouvrir →</b></button>'+
          '<button class="slide-network-card plugy" data-slide-plugy><span>⌁</span><small>PLUGY</small><strong>Demander une prochaine action</strong><p>PLUGY garde le contexte de la rubrique où tu travailles.</p><b>Parler →</b></button>'+
        '</div>'+
      '</section>'+
    '</div>'+
    '<button class="slide-plugy-companion" id="slidePlugyCompanion" data-slide-plugy aria-label="Ouvrir PLUGY"><i></i><span><small>PLUGY</small><strong id="slidePlugyHint">Je reste avec toi</strong></span><b>↗</b></button>'+
    '<div class="slide-mobile-dots">'+dashboardSlideNames.map((_,i)=>'<button data-dash-slide="'+i+'" class="'+(i===0?'active':'')+'" aria-label="Slide '+(i+1)+'"></button>').join('')+'</div>';
  view.insertBefore(deck,legacy);

  const rail=$('#slideRail');
  $$('[data-dash-slide]',deck).forEach(b=>b.onclick=()=>goDashboardSlide(Number(b.dataset.dashSlide)));
  $$('[data-dash-jump]',deck).forEach(b=>b.onclick=()=>goDashboardSlide(Number(b.dataset.dashJump)));
  $$('[data-slide-plugy]',deck).forEach(b=>b.onclick=()=>openPlugy());
  $$('[data-route]',deck).forEach(b=>b.onclick=()=>route(b.dataset.route));
  $$('[data-bureau-slide]',deck).forEach(b=>b.onclick=async()=>{
    route('bureau');try{await ensureViewData('bureau');setBureauMode(b.dataset.bureauSlide)}catch{}
  });
  $('#slidePrev').onclick=()=>goDashboardSlide(dashboardSlideIndex-1);
  $('#slideNext').onclick=()=>goDashboardSlide(dashboardSlideIndex+1);
  rail.addEventListener('scroll',()=>{
    clearTimeout(rail._slideTimer);rail._slideTimer=setTimeout(()=>{
      const i=Math.max(0,Math.min(dashboardSlideNames.length-1,Math.round(rail.scrollLeft/Math.max(1,rail.clientWidth))));
      setDashboardSlideState(i,false);
    },70);
  },{passive:true});
  rail.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)||Math.abs(e.deltaY)<8)return;
    const scroller=e.target.closest('.slide-data-panel,.slide-today-card,.dash-slide');
    if(scroller&&scroller.scrollHeight>scroller.clientHeight+2){
      const down=e.deltaY>0,atTop=scroller.scrollTop<=1,atBottom=scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-1;
      if((down&&!atBottom)||(!down&&!atTop))return;
    }
    e.preventDefault();
    goDashboardSlide(dashboardSlideIndex+(e.deltaY>0?1:-1));
  },{passive:false});
  const plugyZone=$('.slide-plugy-zone',deck);
  if(plugyZone){
    plugyZone.addEventListener('pointermove',e=>{
      const r=plugyZone.getBoundingClientRect();
      const x=((e.clientX-r.left)/Math.max(1,r.width)-.5)*18;
      const y=((e.clientY-r.top)/Math.max(1,r.height)-.5)*14;
      plugyZone.style.setProperty('--plugy-x',x.toFixed(2)+'px');
      plugyZone.style.setProperty('--plugy-y',y.toFixed(2)+'px');
    },{passive:true});
    plugyZone.addEventListener('pointerleave',()=>{
      plugyZone.style.setProperty('--plugy-x','0px');
      plugyZone.style.setProperty('--plugy-y','0px');
    },{passive:true});
  }
  syncPlugyHomeMount();renderSlideDashboard();
}
document.addEventListener('keydown',e=>{
  if(state.view!=='dashboard'||$('#plugyDrawer')?.classList.contains('open'))return;
  const tag=e.target?.tagName?.toLowerCase?.()||'';
  if(['input','textarea','select'].includes(tag)||e.target?.isContentEditable)return;
  if(e.key==='ArrowRight'){e.preventDefault();goDashboardSlide(dashboardSlideIndex+1)}
  if(e.key==='ArrowLeft'){e.preventDefault();goDashboardSlide(dashboardSlideIndex-1)}
});

function setDashboardSlideState(index,animate=true){
  dashboardSlideIndex=Math.max(0,Math.min(dashboardSlideNames.length-1,index));
  const deck=$('#slideDashboard');if(!deck)return;
  $$('[data-dash-slide]',deck).forEach(b=>b.classList.toggle('active',Number(b.dataset.dashSlide)===dashboardSlideIndex));
  $('#slideDashboardTitle').textContent=dashboardSlideNames[dashboardSlideIndex];
  $('#slidePrev').disabled=dashboardSlideIndex===0;$('#slideNext').disabled=dashboardSlideIndex===dashboardSlideNames.length-1;
  deck.dataset.slide=String(dashboardSlideIndex);
  const plugyHints=[
    'Je rassemble tes priorités',
    'Je peux trier les appels',
    'Je peux rédiger avec toi',
    'Je peux préparer la relance',
    'Je peux croiser réseau et opportunités'
  ];
  const hint=$('#slidePlugyHint');
  if(hint)hint.textContent=plugyHints[dashboardSlideIndex]||'Je reste avec toi';
  const companion=$('#slidePlugyCompanion');
  if(companion)companion.classList.toggle('hero-hidden',dashboardSlideIndex===0);
  const motions=['Idle','Attentive','Present','Curious','Travel'];
  if(state.view==='dashboard'&&!$('#plugyDrawer')?.classList.contains('open'))playMotion(motions[dashboardSlideIndex]||'Idle',dashboardSlideIndex===0);
  requestAnimationFrame(syncPlugyHomeMount);
}
function goDashboardSlide(index){
  const rail=$('#slideRail');if(!rail)return;
  const next=Math.max(0,Math.min(dashboardSlideNames.length-1,index));setDashboardSlideState(next);
  rail.scrollTo({left:next*rail.clientWidth,behavior:'smooth'});
}
function renderSlideDashboard(){
  const deck=$('#slideDashboard');if(!deck)return;
  const stats=state.bootstrap?.stats||{},opps=(state.bootstrap?.opportunities||[]).slice();
  const tracked=new Set(state.workflow.filter(w=>w.workflow_status!=='closed').map(w=>String(w.opportunity_id)));
  const priorities=opps.sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||Number(tracked.has(String(b.id)))-Number(tracked.has(String(a.id)))||Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,4);
  const urgent=opps.filter(o=>{const d=daysLeft(o);return d>=0&&d<=7}).length;
  $('#slideMetrics').innerHTML=[
    ['Open Calls',stats.opportunities??opps.length,'opencalls'],
    ['Urgents',stats.urgent??urgent,'urgent'],
    ['Brouillons',stats.drafts??state.drafts.length,'creation'],
    ['Contacts',stats.contacts??state.leads.length,'prospection']
  ].map(([label,val,action])=>'<button data-slide-metric="'+action+'"><strong>'+esc(val)+'</strong><span>'+label+'</span></button>').join('');
  $$('[data-slide-metric]',deck).forEach(b=>b.onclick=()=>{
    if(b.dataset.slideMetric==='urgent'){route('opencalls');setTimeout(()=>{if($('#openStatus')){$('#openStatus').value='urgent';renderOpenCalls()}},60)}
    else route(b.dataset.slideMetric);
  });

  const today=[];
  state.workflow.filter(w=>w.workflow_status!=='closed').forEach(w=>{const o=opportunityById(w.opportunity_id);if(!o)return;const due=w.next_date||o.deadline||'';today.push({title:o.title,sub:w.next_action||workflowLabel(w.workflow_status),date:due,id:o.id,kind:'call'})});
  state.leads.filter(l=>l.status!=='closed').forEach(l=>{if(l.next_date)today.push({title:l.organization||l.name||'Contact',sub:l.next_action||'Relance',date:l.next_date,id:l.id,kind:'lead'})});
  today.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  $('#slideTodayList').innerHTML=today.slice(0,4).map(x=>'<button data-slide-today-kind="'+x.kind+'" data-slide-today-id="'+x.id+'"><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span><b>'+esc(x.date||'À traiter')+'</b></button>').join('')||'<div class="slide-empty">Aucune urgence immédiate.</div>';
  $$('[data-slide-today-kind]',deck).forEach(b=>b.onclick=async()=>{
    const id=Number(b.dataset.slideTodayId);
    if(b.dataset.slideTodayKind==='lead'){route('prospection');try{await ensureViewData('prospection');selectLead(id)}catch{}}
    else openOpportunity(id);
  });

  $('#slideOpportunityList').innerHTML=priorities.map(o=>'<button data-slide-opp="'+o.id+'"><span class="slide-opp-thumb"><img src="/api/v67/opportunities/'+o.id+'/thumbnail" alt="" loading="lazy"></span><span><strong>'+esc(o.title)+'</strong><small>'+esc([o.city,o.country,deadline(o.deadline)].filter(Boolean).join(' · '))+'</small></span><b>'+Number(o.radar_score??o.score??0)+'</b></button>').join('')||'<div class="slide-empty">Aucune opportunité active.</div>';
  $$('[data-slide-opp]',deck).forEach(b=>b.onclick=()=>openOpportunity(Number(b.dataset.slideOpp)));

  const work=[
    ...state.drafts.slice(0,2).map(d=>({kind:'draft',id:d.id,title:d.title||'Brouillon',sub:'Brouillon · '+(d.kind||'contenu')})),
    ...state.bureau.slice(0,2).map(n=>({kind:'doc',id:n.id,title:n.title||'Document',sub:n.folder||'Bureau'}))
  ].slice(0,4);
  $('#slideWorkResume').innerHTML=work.map(x=>'<button data-slide-work="'+x.kind+'" data-slide-work-id="'+x.id+'"><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.sub)+'</small></span><b>→</b></button>').join('')||'<div class="slide-empty">Aucun travail en cours.</div>';
  $$('[data-slide-work]',deck).forEach(b=>b.onclick=async()=>{
    const id=Number(b.dataset.slideWorkId);
    if(b.dataset.slideWork==='draft'){route('creation');try{await ensureViewData('creation');loadDraft(id)}catch{}}
    else{route('bureau');try{await ensureViewData('bureau');selectDoc(id)}catch{}}
  });

  const leads=state.leads.slice().filter(l=>l.status!=='closed').sort((a,b)=>(a.next_date||'9999').localeCompare(b.next_date||'9999')).slice(0,5);
  $('#slideLeadList').innerHTML=leads.map(l=>'<button data-slide-lead="'+l.id+'"><span><strong>'+esc(l.organization||l.name||'Contact')+'</strong><small>'+esc(l.next_action||leadStatusLabel(l.status))+'</small></span><b>'+esc(l.next_date||'À suivre')+'</b></button>').join('')||'<div class="slide-empty">Aucune relance planifiée.</div>';
  $$('[data-slide-lead]',deck).forEach(b=>b.onclick=async()=>{route('prospection');try{await ensureViewData('prospection');selectLead(Number(b.dataset.slideLead))}catch{}});
  setDashboardSlideState(dashboardSlideIndex,false);
}

let dashboardResumeTab='drafts';
function installCompactDashboard(){
  if($('#dashboardResumePanel'))return;
  const grid=$('#view-dashboard .dashboard-grid'),quick=$('#view-dashboard .quick-panel'),plugy=$('#view-dashboard .plugy-home');
  if(!grid||!quick)return;
  quick.classList.remove('span-2');quick.classList.add('span-3','dashboard-commandbar');
  if(plugy)plugy.hidden=true;

  const metric=$('#statOpp')?.closest('.metric-grid'),activity=metric?.closest('.panel');
  if(metric){metric.classList.add('dashboard-metric-strip');quick.appendChild(metric)}
  if(activity)activity.hidden=true;

  const bureauPanel=$('#dashboardBureau')?.closest('.panel'),prospectPanel=$('#dashboardProspection')?.closest('.panel');
  if(bureauPanel)bureauPanel.hidden=true;if(prospectPanel)prospectPanel.hidden=true;

  const today=$('#todayPanel');if(today)today.classList.add('dashboard-today');
  const calls=$('#dashboardCalls')?.closest('.panel');
  if(calls){calls.classList.remove('span-2');calls.classList.add('span-3','dashboard-calls-panel')}

  const resume=document.createElement('section');resume.id='dashboardResumePanel';resume.className='panel dashboard-resume';
  resume.innerHTML='<div class="panel-head"><div><small>À REPRENDRE</small><h2>Travail en cours</h2></div></div><div class="dashboard-resume-tabs"><button data-resume-tab="drafts" class="active">Brouillons</button><button data-resume-tab="bureau">Bureau</button><button data-resume-tab="leads">Relances</button></div><div id="dashboardResumeList" class="compact-list"></div>';
  if(today)today.insertAdjacentElement('afterend',resume);else quick.insertAdjacentElement('afterend',resume);
  $$('[data-resume-tab]',resume).forEach(b=>b.onclick=()=>{dashboardResumeTab=b.dataset.resumeTab;$$('[data-resume-tab]',resume).forEach(x=>x.classList.toggle('active',x===b));renderDashboardResume()});

  if(!$('#compactDashboardStyles')){const st=document.createElement('style');st.id='compactDashboardStyles';st.textContent=`
  #view-dashboard .span-3{grid-column:1/-1}
  .dashboard-commandbar{padding:14px!important}
  .dashboard-commandbar .panel-head{margin-bottom:8px!important}
  .dashboard-commandbar .quick-grid{gap:7px}
  .dashboard-commandbar .quick-grid button{min-height:68px!important;padding:10px 11px!important;display:grid;grid-template-columns:28px 1fr;grid-template-rows:auto auto;column-gap:8px;align-content:center}
  .dashboard-commandbar .quick-grid b{grid-row:1/3;align-self:center;margin:0}
  .dashboard-commandbar .quick-grid strong{align-self:end}
  .dashboard-commandbar .quick-grid span{align-self:start;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
  .dashboard-metric-strip{margin-top:8px;grid-template-columns:repeat(4,1fr);gap:6px}
  .dashboard-metric-strip div{padding:8px 10px!important;background:#f8f9fb;border-radius:12px;cursor:pointer;transition:background .18s,transform .18s}.dashboard-metric-strip div:hover{background:#fff;transform:translateY(-1px)}.dashboard-metric-strip div:focus-visible{outline:2px solid rgba(118,87,255,.35);outline-offset:2px}
  .dashboard-metric-strip strong{font-size:18px!important}
  .dashboard-metric-strip span{font-size:8px!important}
  .dashboard-resume{min-height:150px}
  .dashboard-resume-tabs{display:flex;gap:5px;margin:-2px 0 8px}
  .dashboard-resume-tabs button{border:1px solid #e3e5ea;background:#fafbfc;border-radius:999px;padding:7px 9px;font-size:8px;font-weight:800;color:#737784}
  .dashboard-resume-tabs button.active{background:#111318;color:#fff;border-color:#111318}
  .dashboard-resume .compact-row{padding:8px!important}
  .dashboard-resume .compact-row strong{font-size:10px}
  .dashboard-resume .compact-row span{font-size:8px}
  .dashboard-calls-panel .priority-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .dashboard-calls-panel .priority-row{border:1px solid #eef0f3;border-radius:13px}
  @media(max-width:1200px){.dashboard-today{grid-column:1/-1}.dashboard-resume{grid-column:1/-1}}
  @media(max-width:820px){
    .dashboard-commandbar .quick-grid{grid-template-columns:1fr 1fr}
    .dashboard-commandbar .quick-grid button{min-height:64px!important}
    .dashboard-commandbar .quick-grid span{display:none}
    .dashboard-metric-strip{grid-template-columns:repeat(4,1fr)}
    .dashboard-calls-panel .priority-list{grid-template-columns:1fr}
    .dashboard-today,.dashboard-resume{grid-column:auto}
  }
  `;document.head.appendChild(st)}
  renderDashboardResume();
}
function renderDashboardResume(){
  const box=$('#dashboardResumeList');if(!box)return;
  let rows=[];
  if(dashboardResumeTab==='drafts'){
    rows=state.drafts.slice(0,4).map(d=>({id:d.id,title:d.title||'Brouillon',sub:(d.kind||'contenu')+' · '+String(d.updated_at||'').replace('T',' '),kind:'draft'}));
  }else if(dashboardResumeTab==='bureau'){
    rows=state.bureau.slice(0,4).map(n=>({id:n.id,title:n.title||'Sans titre',sub:(n.folder||'Notes')+' · '+String(n.updated_at||'').replace('T',' '),kind:'doc'}));
  }else{
    rows=state.leads.slice().filter(l=>l.status!=='closed').sort((a,b)=>(a.next_date||'9999').localeCompare(b.next_date||'9999')).slice(0,4).map(l=>({id:l.id,title:l.organization||l.name||'Contact',sub:(l.next_action||'À suivre')+(l.next_date?' · '+l.next_date:''),kind:'lead'}));
  }
  box.innerHTML=rows.map(r=>'<button class="compact-row" data-resume-kind="'+r.kind+'" data-resume-id="'+r.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(r.title)+'</strong><span>'+esc(r.sub)+'</span></button>').join('')||'<div class="empty">Rien à reprendre.</div>';
  $$('[data-resume-kind]',box).forEach(b=>b.onclick=async()=>{
    const id=Number(b.dataset.resumeId),kind=b.dataset.resumeKind;
    try{
      if(kind==='draft'){route('creation');await ensureViewData('creation');loadDraft(id)}
      if(kind==='doc'){route('bureau');await ensureViewData('bureau');selectDoc(id)}
      if(kind==='lead'){route('prospection');await ensureViewData('prospection');selectLead(id)}
    }catch{}
  });
}

function renderDashboard(){
  const b=state.bootstrap||{},stats=b.stats||{};
  const trackedIds=new Set(state.workflow.filter(x=>x.workflow_status!=='closed').map(x=>String(x.opportunity_id)));
  const opps=(b.opportunities||[]).slice().sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||Number(trackedIds.has(String(b.id)))-Number(trackedIds.has(String(a.id)))||Number(b.radar_score??b.score??0)-Number(a.radar_score??a.score??0)).slice(0,4);
  $('#statOpp').textContent=stats.opportunities??opps.length;$('#statUrgent').textContent=stats.urgent??0;$('#statArtists').textContent=stats.drafts??state.drafts.length;$('#statContacts').textContent=stats.contacts??state.leads.length;
  const box=$('#dashboardCalls');box.innerHTML=opps.length?opps.map(o=>'<div class="priority-row"><div class="priority-thumb"><img src="/api/v67/opportunities/'+o.id+'/thumbnail" alt="" loading="lazy"></div><button data-dashboard-opp="'+o.id+'" style="border:0;background:transparent;text-align:left"><h3>'+esc(o.title)+'</h3><p>'+esc([o.city,o.country,deadline(o.deadline)].filter(Boolean).join(' · '))+'</p></button><span class="score">'+Number(o.radar_score??o.score??0)+'/100</span></div>').join(''):'<div class="empty">Aucune opportunité active.</div>';
  $$('[data-dashboard-opp]').forEach(x=>x.onclick=()=>openOpportunity(Number(x.dataset.dashboardOpp)));
  $('#dashboardBureau').innerHTML=state.bureau.slice(0,4).map(n=>'<button class="compact-row" data-dash-doc="'+n.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-dash-doc]').forEach(b=>b.onclick=async()=>{const id=Number(b.dataset.dashDoc);route('bureau');try{await ensureViewData('bureau');selectDoc(id)}catch{}});
  const leads=state.leads.slice().sort((a,b)=>(a.next_date||'9999').localeCompare(b.next_date||'9999')).slice(0,4);
  $('#dashboardProspection').innerHTML=leads.map(l=>'<button class="compact-row" data-dash-lead="'+l.id+'" style="border:0;background:transparent;text-align:left;width:100%"><strong>'+esc(l.organization||l.name||'Contact')+'</strong><span>'+esc(l.next_action||'À suivre')+(l.next_date?' · '+esc(l.next_date):'')+'</span></button>').join('')||'<div class="empty">Aucune relance.</div>';
  $$('[data-dash-lead]').forEach(b=>b.onclick=async()=>{const id=Number(b.dataset.dashLead);route('prospection');try{await ensureViewData('prospection');selectLead(id)}catch{}});
  renderToday();renderDashboardResume();renderSlideDashboard();
}
function populateCountry(select,items){
  if(!select)return;const cur=select.value;const countries=[...new Set(items.map(x=>x.country).filter(Boolean))].sort();select.innerHTML='<option value="">Tous</option>'+countries.map(c=>'<option>'+esc(c)+'</option>').join('');select.value=cur;
}


function installMobileRadarControls(){
  if($('#mobileRadarFilters'))return;
  const view=$('#view-radar'),layout=view?.querySelector('.tool-layout'),filters=view?.querySelector('.filter-panel');
  if(!view||!layout||!filters)return;
  const b=document.createElement('button');b.id='mobileRadarFilters';b.className='mobile-radar-filter-toggle';b.innerHTML='<span>Filtres avancés</span><b>＋</b>';
  layout.insertAdjacentElement('beforebegin',b);
  b.onclick=()=>{
    const open=filters.classList.toggle('mobile-expanded');
    b.classList.toggle('active',open);
    b.querySelector('span').textContent=open?'Masquer les filtres':'Filtres avancés';
    b.querySelector('b').textContent=open?'−':'＋';
  };
}

function installRadarPresets(){
  if($('#radarPresets'))return;const view=$('#view-radar'),layout=view?.querySelector('.tool-layout');if(!view||!layout)return;
  const bar=document.createElement('div');bar.id='radarPresets';bar.className='radar-presets';
  bar.innerHTML='<button data-radar-preset="all">Tout</button><button data-radar-preset="paris">Paris / IDF</button><button data-radar-preset="europe">Europe</button><button data-radar-preset="collective">Collectif / émergent</button><button data-radar-preset="accessible">Accessible</button><button data-radar-preset="venues">Petits lieux</button><button data-radar-preset="urgent">Urgent</button>';
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
  if(preset==='venues'&&type)type.value='venue';
  $$('[data-radar-preset]').forEach(b=>b.classList.toggle('active',b.dataset.radarPreset===preset));renderRadar();
}

function venueRadarMatch(hay,kind='venue'){
  const all=/restaurant|brasserie|café|cafe|hotel|hôtel|mairie|hôtel de ville|centre commercial|shopping (?:centre|center)|médiathèque|mediatheque|tiers-lieu|concept store|boutique|centre culturel|lieu de vie|pop-up|popup|galerie|gallery/i;
  const food=/restaurant|brasserie|café|cafe|hotel|hôtel/i;
  const pub=/mairie|hôtel de ville|médiathèque|mediatheque|centre culturel|bibliothèque|bibliotheque/i;
  const mall=/centre commercial|shopping (?:centre|center)|pop-up|popup|boutique|concept store/i;
  if(kind==='restaurant')return food.test(hay);
  if(kind==='public')return pub.test(hay);
  if(kind==='mall')return mall.test(hay);
  return all.test(hay);
}
function renderRadar(){
  const all=state.bootstrap?.opportunities||[],term=clean($('#radarSearch')?.value).toLowerCase(),country=$('#radarCountry')?.value||'',min=Number($('#radarScore')?.value||0),type=$('#radarType')?.value||'';
  const europe=['france','belgium','belgique','netherlands','pays-bas','spain','espagne','italy','italie','portugal','germany','allemagne','switzerland','suisse','austria','autriche','united kingdom','uk','royaume-uni','ireland','irlande','denmark','danemark','sweden','suède','norway','norvège','finland','finlande','poland','pologne','czech republic','tchéquie','greece','grèce'];
  const idf=/paris|saint[- ]denis|aubervilliers|montreuil|pantin|bagnolet|rosny|ivry|vitry|clichy|neuilly|nanterre|boulogne|versailles|créteil|creteil|noisy|vincennes|saint-ouen/i;
  const rows=all.filter(o=>{
    const hay=[o.title,o.organizer,o.city,o.country,o.type,o.summary,o.eligibility,o.radar_reason,o.source_name].join(' ').toLowerCase(),d=daysLeft(o),c=String(o.country||'').toLowerCase();
    const presetOk=state.radarPreset==='paris'?idf.test([o.city,o.title,o.summary].join(' ')):state.radarPreset==='europe'?europe.some(x=>c.includes(x)):true;
    const typeOk=!type||(type==='urgent'&&d>=0&&d<=14)||(type==='accessible'&&accessible(o))||(type==='collective'&&collective(o))||(['venue','restaurant','public','mall'].includes(type)&&venueRadarMatch(hay,type));
    return presetOk&&(!term||hay.includes(term))&&(!country||o.country===country)&&Number(o.radar_score??o.score??0)>=min&&typeOk;
  });
  $('#radarCount').textContent=rows.length+' piste'+(rows.length>1?'s':'');
  $('#radarGrid').innerHTML=rows.map(o=>oppCard(o,'radar')).join('')||'<div class="empty">Aucun résultat. Lance le Radar pour élargir la recherche.</div>';
  bindOppActions($('#radarGrid'));
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


function bureauPackageStatusLabel(v){return({preparing:'En préparation',ready:'Prêt',submitted:'Envoyé',followup:'Relance',closed:'Clos'})[v]||v||'En préparation'}
function bureauChecklistLabel(k){return({source_checked:'Source vérifiée',letter:'Lettre',bio:'Bio',artist_statement:'Note artistique',portfolio:'Portfolio',visuals:'Visuels',links:'Liens',submitted:'Envoyé'})[k]||k}
const BUREAU_PACKAGE_KEYS=['source_checked','letter','bio','artist_statement','portfolio','visuals','links','submitted'];
const bureauPackageReconciled=new Set();
function packageProgress(p){
  const check=p?.checklist||{},done=BUREAU_PACKAGE_KEYS.filter(k=>!!check[k]).length;
  const missing=BUREAU_PACKAGE_KEYS.filter(k=>!check[k]);
  return {done,total:BUREAU_PACKAGE_KEYS.length,missing,ratio:BUREAU_PACKAGE_KEYS.length?Math.round(done/BUREAU_PACKAGE_KEYS.length*100):0};
}
function packageNextAction(p){
  if(p?.progress?.next_action)return p.progress.next_action;
  const key=packageProgress(p).missing[0];
  return ({source_checked:'Vérifier la source officielle',letter:'Finaliser la lettre de candidature',bio:'Finaliser la bio',artist_statement:'Finaliser la note artistique',portfolio:'Ajouter le portfolio',visuals:'Ajouter les visuels',links:'Vérifier les liens',submitted:'Envoyer la candidature'})[key]||'Dossier complet';
}
async function reconcileBureauPackage(id,{render=true,silent=true}={}){
  try{
    const saved=await api('/api/v140/bureau/packages/'+id+'/reconcile',{method:'POST'});
    const i=state.bureauPackages.findIndex(x=>Number(x.id)===Number(saved.id));
    if(i>=0)state.bureauPackages[i]=saved;else state.bureauPackages.unshift(saved);
    bureauPackageReconciled.add(Number(id));
    if(render)renderBureauPackages();
    if(!silent)toast('Dossier synchronisé');
    return saved;
  }catch(e){
    bureauPackageReconciled.delete(Number(id));
    if(!silent)toast('Synchronisation du dossier impossible');
    throw e;
  }
}
async function markActivePackageReady(){
  const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));if(!p)return;
  let saved=await reconcileBureauPackage(p.id,{render:false,silent:true}).catch(()=>p);
  const missing=packageProgress(saved).missing.filter(k=>k!=='submitted');
  if(missing.length)return toast('Il reste '+missing.length+' élément'+(missing.length>1?'s':'')+' à finaliser avant de marquer le dossier prêt');
  await patchActivePackage({status:'ready'});toast('Dossier prêt');
}

function installBureauWorkspace(){
  if($('#bureauModeBar'))return;
  const view=$('#view-bureau'),toolbar=view?.querySelector('.page-toolbar'),layout=view?.querySelector('.bureau-layout');
  if(!view||!toolbar||!layout)return;
  layout.id='bureauDocumentsMode';
  const bar=document.createElement('div');bar.id='bureauModeBar';bar.className='bureau-mode-bar';
  bar.innerHTML='<button class="active" data-bureau-mode="documents">Documents</button><button data-bureau-mode="packages">Dossiers</button><button data-bureau-mode="templates">Modèles</button><button class="hub-mode-tab" data-bureau-mode="hub">HUB</button><span></span><button id="bureauQuickNewPackage">＋ Dossier</button><button id="bureauQuickNewTemplate">＋ Modèle</button>';
  toolbar.insertAdjacentElement('afterend',bar);

  const folders=document.createElement('div');folders.id='bureauFolderBar';folders.className='bureau-folder-bar';
  layout.querySelector('.bureau-list-panel')?.insertAdjacentElement('afterbegin',folders);

  const packages=document.createElement('section');packages.id='bureauPackagesMode';packages.className='bureau-mode-panel bureau-packages-mode';
  packages.innerHTML='<aside class="panel bureau-package-list-panel"><div class="bureau-package-create"><select id="packageOpportunitySelect"><option value="">Dossier libre</option></select><button id="packageCreate">＋ Créer</button></div><div id="bureauPackageList" class="bureau-package-list"></div></aside><section class="panel bureau-package-detail" id="bureauPackageDetail"><div class="empty">Sélectionne un dossier de candidature.</div></section>';
  view.appendChild(packages);

  const templates=document.createElement('section');templates.id='bureauTemplatesMode';templates.className='bureau-mode-panel bureau-templates-mode';
  templates.innerHTML='<aside class="panel bureau-template-list-panel"><div class="bureau-template-search"><input id="templateSearch" placeholder="Rechercher un modèle…"></div><div id="bureauTemplateList" class="bureau-template-list"></div></aside><section class="panel bureau-template-editor" id="bureauTemplateEditor"><div class="empty">Sélectionne un modèle.</div></section>';
  view.appendChild(templates);

  const hub=document.createElement('section');hub.id='bureauHubMode';hub.className='bureau-mode-panel bureau-hub-mode';
  hub.innerHTML='<section class="hub-hero panel"><div><small>PLUG ART HUB</small><h3>Les lieux deviennent des projets.</h3><p>Millénaire, Aubervilliers, programmation, aménagement, images, dossiers et prochaines actions au même endroit.</p></div><div class="hub-hero-actions"><button id="hubExportPdf">Exporter la synthèse PDF</button><button class="primary-btn" id="hubPlugy">✦ Travailler avec PLUGY</button></div></section>'+
    '<div class="hub-project-grid">'+
      '<article class="hub-project-card millenaire"><div class="hub-project-visual" id="hubMillenaireVisual"><span>LE MILLÉNAIRE</span></div><div class="hub-project-copy"><small>AUBERVILLIERS · CANAL</small><h3>Le Millénaire</h3><p>Galerie des Docks + HUB créatif dans les cellules vacantes. Galerie côté canal, ateliers, coworking, studio contenu et programmation.</p><div class="hub-tags"><span>Galerie</span><span>Ateliers</span><span>Studio</span><span>Canal</span></div><div class="hub-card-actions"><button data-hub-project="millenaire">Ouvrir le projet</button><button data-hub-create="millenaire">＋ Note projet</button></div></div></article>'+
      '<article class="hub-project-card aubervilliers"><div class="hub-project-visual hub-industrial"><span>AUBERVILLIERS</span></div><div class="hub-project-copy"><small>PIERRE CURIE · BÂTIMENT INDUSTRIEL</small><h3>HUB Aubervilliers</h3><p>Réhabilitation légère et réversible : galerie, ateliers individuels, espace expérimental, studio contenu et organisation par niveaux.</p><div class="hub-tags"><span>Industriel</span><span>Galerie</span><span>Ateliers</span><span>3D</span></div><div class="hub-card-actions"><button data-hub-project="aubervilliers">Ouvrir le projet</button><button data-hub-create="aubervilliers">＋ Note projet</button></div></div></article>'+
    '</div>'+
    '<section class="hub-project-detail panel" id="hubProjectDetail"></section>';
  view.appendChild(hub);

  if(!$('#bureauWorkspaceStyles')){
    const st=document.createElement('style');st.id='bureauWorkspaceStyles';st.textContent=`
      .bureau-mode-bar{display:flex;align-items:center;gap:6px;margin:0 0 12px}.bureau-mode-bar>span{flex:1}.bureau-mode-bar button{border:1px solid #e0e2e8;background:#fff;border-radius:999px;padding:8px 11px;font-size:9px;font-weight:800;color:#666b77}.bureau-mode-bar button.active{background:#111318;color:#fff;border-color:#111318}
      .bureau-mode-panel{display:none}.bureau-mode-panel.active{display:grid}
      .bureau-folder-bar{display:flex;gap:5px;flex-wrap:wrap;padding:0 0 9px}.bureau-folder-bar button{border:1px solid #e3e5ea;background:#fafbfc;border-radius:999px;padding:7px 9px;font-size:8px;font-weight:800}.bureau-folder-bar button.active{background:#111318;color:#fff;border-color:#111318}
      .bureau-packages-mode,.bureau-templates-mode{grid-template-columns:300px minmax(0,1fr);gap:12px}
      .bureau-package-create{display:grid;grid-template-columns:1fr auto;gap:7px;margin-bottom:10px}.bureau-package-create select,.bureau-package-create button,.bureau-template-search input{padding:9px;border:1px solid #dfe2e8;border-radius:10px;background:#fff;font-size:9px}
      .bureau-package-list,.bureau-template-list{display:grid;gap:6px}.bureau-package-item,.bureau-template-item{border:1px solid #e6e8ed;background:#fafbfc;border-radius:13px;padding:10px;text-align:left}.bureau-package-item.active,.bureau-template-item.active{border-color:#c7bff2;background:#faf8ff}.bureau-package-item strong,.bureau-package-item span,.bureau-template-item strong,.bureau-template-item span{display:block}.bureau-package-item small{display:block;font-size:7px;color:#9a9da7;margin-top:4px}.package-mini-progress{height:3px;background:#eceef2;border-radius:999px;margin-top:7px;overflow:hidden}.package-mini-progress i{display:block;height:100%;background:linear-gradient(90deg,#7560df,#57cfd8);border-radius:999px}.package-progress-card{margin:10px 0;padding:12px;border:1px solid #e5e7ec;background:linear-gradient(135deg,#fbfaff,#f7fbfc);border-radius:14px}.package-progress-top{display:grid;grid-template-columns:1fr 1fr;gap:10px}.package-progress-top small,.package-progress-top strong{display:block}.package-progress-top small{font-size:7px;color:#979aa5;letter-spacing:.7px}.package-progress-top strong{font-size:10px;margin-top:3px}.package-progress-track{height:6px;background:#e8eaf0;border-radius:999px;overflow:hidden;margin:10px 0}.package-progress-track i{display:block;height:100%;background:linear-gradient(90deg,#7657ff,#59d3d4);border-radius:999px}.package-missing{display:flex;gap:5px;flex-wrap:wrap}.package-missing span{font-size:7px;padding:5px 7px;border-radius:999px;background:#fff;border:1px solid #e5e7ec;color:#737784}.package-complete{font-size:8px;font-weight:800;color:#438268}.package-doc-row.incomplete span{color:#c87842}.package-doc-row.complete span{color:#55856b}.bureau-package-item strong,.bureau-template-item strong{font-size:10px}.bureau-package-item span,.bureau-template-item span{font-size:8px;color:#8e929d;margin-top:3px}
      .package-detail-head,.template-editor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid #eceef2}.package-detail-head h3,.template-editor-head h3{margin:2px 0 0;font-size:18px}.package-detail-head small,.template-editor-head small{font-size:8px;color:#969aa5;letter-spacing:.8px}.package-detail-actions{display:flex;gap:6px;flex-wrap:wrap}.package-detail-actions button,.template-editor-actions button{border:1px solid #dfe2e8;background:#fff;border-radius:9px;padding:8px 9px;font-size:8px;font-weight:800}.package-detail-actions .primary,.template-editor-actions .primary{background:#111318;color:#fff;border-color:#111318}
      .package-source{margin:10px 0;padding:10px;border-radius:12px;background:#f7f8fa}.package-source strong,.package-source span{display:block}.package-source strong{font-size:10px}.package-source span{font-size:8px;color:#8e929d;margin-top:3px}
      .package-status-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.package-status-row label,.template-editor-grid label{display:grid;gap:5px;font-size:8px;color:#90949f;font-weight:800;text-transform:uppercase}.package-status-row select,.package-status-row textarea,.template-editor-grid input,.template-editor-grid select,.template-editor-grid textarea{padding:9px;border:1px solid #dfe2e8;border-radius:10px;background:#fff;font-size:10px;text-transform:none}
      .package-checklist{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}.package-check{border:1px solid #e2e4e9;background:#fafbfc;border-radius:11px;padding:9px;text-align:left;font-size:8px;font-weight:800}.package-check.done{background:#f0faf5;border-color:#cce8d9;color:#40775b}
      .package-docs{display:grid;gap:6px;margin:10px 0}.package-doc-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #eceef2;border-radius:11px;padding:8px 10px}.package-doc-row button{border:0;background:transparent;text-align:left;font-size:9px;font-weight:800}.package-create-doc{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:10px}.package-create-doc select,.package-create-doc button{padding:9px;border:1px solid #dfe2e8;border-radius:10px;background:#fff;font-size:9px}
      .template-editor-grid{display:grid;gap:9px}.template-editor-grid textarea{min-height:360px;resize:vertical;line-height:1.5}.template-editor-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.template-editor-actions .spacer{flex:1}
      @media(max-width:820px){.bureau-mode-bar{overflow:auto;padding-bottom:2px}.bureau-mode-bar>span{display:none}.bureau-mode-bar button{white-space:nowrap;min-height:34px}.bureau-packages-mode,.bureau-templates-mode{grid-template-columns:1fr}.bureau-package-detail,.bureau-template-editor{min-height:380px}.package-checklist{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(st);
  }

  $$('[data-bureau-mode]',bar).forEach(b=>b.onclick=()=>setBureauMode(b.dataset.bureauMode));
  $('#bureauQuickNewPackage').onclick=()=>{setBureauMode('packages');setTimeout(()=>$('#packageOpportunitySelect')?.focus(),30)};
  $('#bureauQuickNewTemplate').onclick=()=>{setBureauMode('templates');newBureauTemplate()};
  $('#packageCreate').onclick=createBureauPackage;
  $('#templateSearch').oninput=renderBureauTemplates;
  setBureauMode(state.bureauMode||'documents');
}
function setBureauMode(mode){
  state.bureauMode=mode;
  $$('[data-bureau-mode]').forEach(b=>b.classList.toggle('active',b.dataset.bureauMode===mode));
  const docs=$('#bureauDocumentsMode'),packages=$('#bureauPackagesMode'),templates=$('#bureauTemplatesMode'),hub=$('#bureauHubMode');
  if(docs)docs.style.display=mode==='documents'?'grid':'none';
  packages?.classList.toggle('active',mode==='packages');
  templates?.classList.toggle('active',mode==='templates');hub?.classList.toggle('active',mode==='hub');
  if($('#bureauNew'))$('#bureauNew').style.display=mode==='documents'?'':'none';
  if(mode==='documents'){renderBureauFolders();renderBureau()}
  if(mode==='packages')renderBureauPackages();
  if(mode==='templates')renderBureauTemplates();
  if(mode==='hub')renderHubWorkspace();
  renderPlugyActions();
}
const HUB_PROJECTS={
  millenaire:{title:'PLUG ART HUB · Le Millénaire',eyebrow:'CENTRE COMMERCIAL · AUBERVILLIERS',summary:'Transformer des cellules vacantes en destination culturelle active, avec une galerie publique côté canal et un HUB de production dans une seconde cellule.',areas:['Galerie des Docks','Terrasse canal','Ateliers individuels','Coworking','Studio image & contenu','Plug Talk','Atelier collectif'],documents:[['Dossier Projet Le Millénaire','33 pages'],['Dossier final écosystème 2026','11 pages']]},
  aubervilliers:{title:'PLUG ART HUB · Aubervilliers',eyebrow:'BÂTIMENT INDUSTRIEL · PIERRE CURIE',summary:'Un HUB artistique dans une enveloppe industrielle, organisé entre galerie, expérimentation, ateliers, bureau et production de contenus.',areas:['Galerie industrielle','Salle expérimentation','Ateliers artistes','Bureau / coordination','Studio contenu','Circulation / accueil'],documents:[['Dossier complet Aubervilliers 2026','38 pages']]}
};
function hubImage(key='millenaire_gallery'){
  return window.PLUG_HUB_ASSETS?.[key]||'';
}
function renderHubWorkspace(project='millenaire'){
  const img=hubImage('millenaire_gallery'),visual=$('#hubMillenaireVisual');if(visual&&img){visual.style.backgroundImage='url("'+img+'")';visual.classList.add('has-image')}
  const aub=$('.hub-project-card.aubervilliers .hub-project-visual'),aubImg=hubImage('aubervilliers_workshop');if(aub&&aubImg){aub.style.backgroundImage='url("'+aubImg+'")';aub.classList.add('has-image')}
  $$('[data-hub-project]').forEach(b=>b.onclick=()=>renderHubProjectDetail(b.dataset.hubProject));
  $$('[data-hub-create]').forEach(b=>b.onclick=()=>createHubNote(b.dataset.hubCreate));
  $('#hubExportPdf')?.addEventListener('click',exportHubPdf,{once:true});
  $('#hubPlugy')?.addEventListener('click',()=>openPlugy('Travaille avec moi sur le projet PLUG ART HUB. Compare Le Millénaire et Aubervilliers, puis propose les prochaines actions concrètes.'),{once:true});
  renderHubProjectDetail(project);
}
function renderHubProjectDetail(key){
  const p=HUB_PROJECTS[key],box=$('#hubProjectDetail');if(!p||!box)return;
  box.innerHTML='<div class="hub-detail-head"><div><small>'+esc(p.eyebrow)+'</small><h3>'+esc(p.title)+'</h3><p>'+esc(p.summary)+'</p></div><button data-hub-create="'+esc(key)+'">＋ Ajouter une note</button></div>'+
    '<div class="hub-detail-grid"><div><small>ESPACES / PROGRAMME</small><div class="hub-area-list">'+p.areas.map(a=>'<span>'+esc(a)+'</span>').join('')+'</div></div><div><small>DOSSIERS SOURCE</small><div class="hub-doc-list">'+p.documents.map(d=>'<div><b>PDF</b><span><strong>'+esc(d[0])+'</strong><small>'+esc(d[1])+' · source projet</small></span></div>').join('')+'</div></div><div><small>PROCHAINE ÉTAPE</small><p>Centraliser les visuels, décisions, interlocuteurs et versions du dossier avant présentation aux structures.</p><button class="plugy-inline" id="hubDetailPlugy">✦ Préparer la prochaine étape</button></div></div>';
  $$('[data-hub-create]',box).forEach(b=>b.onclick=()=>createHubNote(b.dataset.hubCreate));
  $('#hubDetailPlugy')?.addEventListener('click',()=>openPlugy('Projet HUB : '+p.title+'. '+p.summary+' Prépare une liste courte des prochaines actions et documents à finaliser.'));
}
async function createHubNote(key){
  const p=HUB_PROJECTS[key];if(!p)return;
  try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:p.title+' · Note',body:p.summary+'\n\nEspaces :\n- '+p.areas.join('\n- ')+'\n\nProchaine action :',folder:'HUB',tags:'HUB, projet, '+key})});state.bureau.unshift(n);toast('Note HUB créée');setBureauMode('documents');state.bureauFolderFilter='HUB';renderBureauFolders();renderBureau();selectDoc(n.id)}catch{toast('Création de la note impossible')}
}
async function loadJsPdf(){
  if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  return window.jspdf?.jsPDF;
}
async function exportHubPdf(){
  const b=$('#hubExportPdf'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Préparation PDF…'}
  try{
    const PDF=await loadJsPdf();if(!PDF)throw new Error('pdf');const doc=new PDF({unit:'mm',format:'a4'}),margin=18;
    doc.setFont('helvetica','bold');doc.setFontSize(22);doc.text('PLUG ART HUB',margin,25);doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text('Synthèse projets · Le Millénaire & Aubervilliers',margin,33);
    let y=48;for(const p of Object.values(HUB_PROJECTS)){doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(p.title,margin,y);y+=8;doc.setFont('helvetica','normal');doc.setFontSize(9);const lines=doc.splitTextToSize(p.summary,170);doc.text(lines,margin,y);y+=lines.length*4.5+4;doc.setFont('helvetica','bold');doc.text('Espaces',margin,y);y+=6;doc.setFont('helvetica','normal');for(const a of p.areas){doc.text('• '+a,margin+2,y);y+=5}y+=5;if(y>245){doc.addPage();y=25}}
    doc.save('plug-art-hub-synthese.pdf');toast('PDF HUB exporté');
  }catch{toast('Export PDF indisponible')}finally{if(b){b.disabled=false;b.textContent=old}}
}

function renderBureauFolders(){
  const box=$('#bureauFolderBar');if(!box)return;
  const counts={};state.bureau.forEach(n=>counts[n.folder||'Notes']=(counts[n.folder||'Notes']||0)+1);
  const folders=['',...Object.keys(counts).sort()];
  box.innerHTML=folders.map(f=>'<button class="'+(state.bureauFolderFilter===f?'active':'')+'" data-bureau-folder="'+esc(f)+'">'+(f||'Tous')+(f?' · '+counts[f]:'')+'</button>').join('');
  $$('[data-bureau-folder]',box).forEach(b=>b.onclick=()=>{state.bureauFolderFilter=b.dataset.bureauFolder||'';renderBureauFolders();renderBureau()});
}
function renderBureauSources(){
  const sel=$('#packageOpportunitySelect');if(!sel)return;const cur=sel.value;
  sel.innerHTML='<option value="">Dossier libre</option>'+state.bureauSources.map(o=>'<option value="'+o.id+'">'+esc(o.title)+'</option>').join('');if(cur)sel.value=cur;
}
async function createBureauPackage(){
  const source=$('#packageOpportunitySelect')?.value||'';const b=$('#packageCreate'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Création…'}
  try{
    let pkg;if(source)pkg=await api('/api/v120/bureau/packages/from-opportunity/'+source,{method:'POST'});else pkg=await api('/api/v120/bureau/packages',{method:'POST',body:JSON.stringify({title:'Nouveau dossier'})});
    state.bureauPackages=state.bureauPackages.filter(x=>Number(x.id)!==Number(pkg.id));state.bureauPackages.unshift(pkg);state.activePackage=pkg.id;renderBureauPackages();toast('Dossier créé');
  }catch{toast('Création du dossier impossible')}finally{if(b){b.disabled=false;b.textContent=old}}
}
function renderBureauPackages(){
  renderBureauSources();const list=$('#bureauPackageList'),detail=$('#bureauPackageDetail');if(!list||!detail)return;
  if(state.activePackage&&!state.bureauPackages.some(x=>Number(x.id)===Number(state.activePackage)))state.activePackage=null;
  if(!state.activePackage&&state.bureauPackages[0])state.activePackage=state.bureauPackages[0].id;
  list.innerHTML=state.bureauPackages.map(p=>{
    const prog=packageProgress(p);
    return '<button class="bureau-package-item '+(Number(p.id)===Number(state.activePackage)?'active':'')+'" data-package="'+p.id+'">'+
      '<strong>'+esc(p.title||'Dossier')+'</strong>'+
      '<span>'+esc(bureauPackageStatusLabel(p.status))+(p.opportunity?.deadline?' · '+esc(p.opportunity.deadline):'')+'</span>'+
      '<div class="package-mini-progress"><i style="width:'+prog.ratio+'%"></i></div>'+
      '<small>'+prog.done+' / '+prog.total+' éléments prêts</small>'+
    '</button>';
  }).join('')||'<div class="empty">Aucun dossier.</div>';
  $$('[data-package]',list).forEach(b=>b.onclick=()=>{state.activePackage=Number(b.dataset.package);renderBureauPackages();reconcileBureauPackage(state.activePackage,{render:true,silent:true}).catch(()=>{})});
  renderBureauPackageDetail();
  const active=Number(state.activePackage);
  if(active&&!bureauPackageReconciled.has(active)){bureauPackageReconciled.add(active);reconcileBureauPackage(active,{render:true,silent:true}).catch(()=>{})}
}
function renderBureauPackageDetail(){
  const box=$('#bureauPackageDetail');if(!box)return;const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));
  if(!p){box.innerHTML='<div class="empty">Sélectionne un dossier de candidature.</div>';return}
  const opp=p.opportunity||{},check=p.checklist||{},docs=(p.document_ids||[]).map(id=>state.bureau.find(n=>Number(n.id)===Number(id))).filter(Boolean),prog=packageProgress(p),next=packageNextAction(p);
  const missingNames=prog.missing.filter(k=>k!=='submitted').slice(0,4).map(bureauChecklistLabel);
  box.innerHTML=
    '<div class="package-detail-head"><div><small>DOSSIER DE CANDIDATURE</small><h3>'+esc(p.title||'Dossier')+'</h3></div><div class="package-detail-actions">'+
      '<button id="packageOpenCall" '+(!opp.id?'disabled':'')+'>Open Call ↗</button>'+
      '<button id="packageSync">↻ Synchroniser</button>'+
      '<button id="packageStarterPack">Créer les pièces manquantes</button>'+
      '<button class="primary" id="packageGenerateAI">✦ Générer avec PLUGY</button>'+
      '<button id="packageToCreation">Vers Création</button><button id="packageExportPdf">Exporter PDF</button>'+
      (opp.id?'<button id="packageToCarousel">Carrousel</button>':'')+
      '<button id="packageReady">Marquer prêt</button>'+
    '</div></div>'+
    '<div class="package-progress-card"><div class="package-progress-top"><div><small>PROGRESSION</small><strong>'+prog.done+' / '+prog.total+' éléments prêts</strong></div><div><small>PROCHAINE ACTION</small><strong>'+esc(next)+'</strong></div></div><div class="package-progress-track"><i style="width:'+prog.ratio+'%"></i></div>'+(missingNames.length?'<div class="package-missing">'+missingNames.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>':'<div class="package-complete">Dossier complet · prêt pour envoi</div>')+'</div>'+
    (opp.id?'<div class="package-source"><strong>'+esc(opp.title||'Open Call')+'</strong><span>'+esc([opp.city,opp.country,opp.deadline?'Deadline '+opp.deadline:''].filter(Boolean).join(' · '))+'</span></div>':'')+
    '<div class="package-status-row"><label>Statut<select id="packageStatus">'+['preparing','ready','submitted','followup','closed'].map(v=>'<option value="'+v+'" '+(p.status===v?'selected':'')+'>'+bureauPackageStatusLabel(v)+'</option>').join('')+'</select></label><label>Notes<textarea id="packageNotes" rows="3">'+esc(p.notes||'')+'</textarea></label></div>'+
    '<div class="package-checklist">'+BUREAU_PACKAGE_KEYS.map(k=>'<button class="package-check '+(check[k]?'done':'')+'" data-package-check="'+k+'">'+(check[k]?'✓ ':'○ ')+esc(bureauChecklistLabel(k))+'</button>').join('')+'</div>'+
    '<div class="package-docs">'+(docs.length?docs.map(n=>{const incomplete=/\[[^\]]{3,}\]|\[À COMPLÉTER\]|\[A COMPLETER\]/i.test(String(n.body||''));return '<div class="package-doc-row '+(incomplete?'incomplete':'complete')+'"><button data-package-doc="'+n.id+'">'+esc(n.title||'Document')+'</button><span>'+(incomplete?'À compléter':esc(n.folder||'Candidatures'))+'</span></div>'}).join(''):'<div class="empty">Aucun document lié.</div>')+'</div>'+
    '<div class="package-create-doc"><select id="packageTemplateSelect">'+state.bureauTemplates.map(t=>'<option value="'+t.id+'">'+esc(t.category+' · '+t.name)+'</option>').join('')+'</select><button id="packageCreateDoc">＋ Créer le document</button></div>'+
    '<div class="template-editor-actions"><button id="packageSent">Marquer envoyé</button><span class="spacer"></span><button class="danger-text" id="packageDelete">Supprimer le dossier</button></div>';
  $('#packageStatus').onchange=e=>patchActivePackage({status:e.target.value});
  let noteT=0;$('#packageNotes').oninput=e=>{clearTimeout(noteT);noteT=setTimeout(()=>patchActivePackage({notes:e.target.value},true),700)};
  $$('[data-package-check]',box).forEach(b=>b.onclick=()=>{const nextCheck={...(p.checklist||{})};nextCheck[b.dataset.packageCheck]=!nextCheck[b.dataset.packageCheck];patchActivePackage({checklist:nextCheck})});
  $$('[data-package-doc]',box).forEach(b=>b.onclick=()=>{setBureauMode('documents');selectDoc(Number(b.dataset.packageDoc))});
  $('#packageCreateDoc').onclick=createDocumentFromPackage;
  $('#packageStarterPack').onclick=createPackageStarterPack;
  $('#packageGenerateAI').onclick=generatePackageWithPlugy;
  $('#packageSync').onclick=()=>reconcileBureauPackage(p.id,{render:true,silent:false});
  $('#packageOpenCall').onclick=()=>{if(opp.id){route('opencalls');setTimeout(()=>openOpportunity(Number(opp.id)),40)}};
  $('#packageToCreation').onclick=()=>packageToCreation(p);
  $('#packageExportPdf').onclick=()=>exportPackagePdf(p);
  $('#packageToCarousel')?.addEventListener('click',()=>{if(opp.id)createCarouselForOpportunity(Number(opp.id))});
  $('#packageReady').onclick=markActivePackageReady;
  $('#packageSent').onclick=async()=>{const nextCheck={...(p.checklist||{}),submitted:true};await patchActivePackage({status:'submitted',checklist:nextCheck});if(p.opportunity_id)persistWorkflow(p.opportunity_id,{workflow_status:'submitted',next_action:'Suivre la réponse'}).catch(()=>{});toast('Dossier marqué envoyé')};
  $('#packageDelete').onclick=deleteActivePackage;
}

function bureauArtistContext(excludeIds=[]){
  const excluded=new Set((excludeIds||[]).map(Number));
  const sourceDocs=state.bureau.filter(n=>{
    if(!n?.body||excluded.has(Number(n.id)))return false;
    const hay=[n.title,n.tags,n.folder].join(' ');
    return /bio|artiste|artist|d[eé]marche|statement|parcours|pratique|technique|portfolio/i.test(hay);
  }).slice(0,6);
  let total='';
  for(const n of sourceDocs){
    const part='SOURCE · '+(n.title||'Document')+'\n'+String(n.body||'').slice(0,4500);
    if((total+'\n\n'+part).length>14000)break;
    total+=(total?'\n\n':'')+part;
  }
  return total.trim();
}
function packageDocRole(doc){
  const t=String(doc?.title||'').toLowerCase();
  if(t.includes('lettre'))return 'letter';
  if(t.includes('bio'))return 'bio';
  if(t.includes('note')||t.includes('artist'))return 'statement';
  return 'other';
}
async function generatePackageDocWithPlugy(doc,pkg,artistContext){
  const role=packageDocRole(doc),opp=pkg.opportunity||{};
  const facts={
    title:opp.title||'',
    city:opp.city||'',
    country:opp.country||'',
    deadline:opp.deadline||'',
    fee:opp.fee||'',
    summary:opp.summary||opp.radar_reason||''
  };
  let instruction='';
  if(role==='letter'){
    instruction='Rédige une lettre de candidature artistique claire et concise pour cet Open Call. Utilise uniquement les faits fournis. Tu peux t’appuyer sur le contexte artiste s’il existe. Ne fabrique aucune exposition, date, prix, parcours ou motivation personnelle. Si une information indispensable manque, écris [À COMPLÉTER].';
  }else if(role==='bio'){
    if(!artistContext)return {...doc,body:String(doc.body||'')+'\n\n[À COMPLÉTER — ajoute une bio ou un document de parcours dans le Bureau avant la génération.]',_incomplete:true};
    instruction='Rédige une bio artistique courte, professionnelle et factuelle uniquement à partir du CONTEXTE ARTISTE fourni. N’ajoute aucune information absente. Si une donnée essentielle manque, écris [À COMPLÉTER].';
  }else if(role==='statement'){
    if(!artistContext)return {...doc,body:String(doc.body||'')+'\n\n[À COMPLÉTER — ajoute une note artistique, une démarche ou un document source dans le Bureau avant la génération.]',_incomplete:true};
    instruction='Rédige une note artistique claire et crédible uniquement à partir du CONTEXTE ARTISTE fourni. Tu peux relier la démarche au contexte de l’Open Call sans inventer d’intention. Si une information manque, écris [À COMPLÉTER].';
  }else{
    instruction='Améliore ce document de candidature en restant strictement factuel. N’invente rien. Conserve [À COMPLÉTER] lorsqu’une information manque.';
  }
  const prompt=instruction+'\n\nOPEN CALL : '+JSON.stringify(facts)+'\n\nCONTEXTE ARTISTE :\n'+(artistContext||'[Aucun contexte artiste enregistré]')+'\n\nSTRUCTURE ACTUELLE :\n'+String(doc.body||'');
  const out=await api('/api/v32/plugy',{method:'POST',timeout:70000,body:JSON.stringify({message:prompt,page:'bureau',mode:'deep'})});
  const answer=String(out.answer||'').trim();
  if(!answer)throw new Error('Réponse PLUGY vide');
  return {...doc,body:answer,_incomplete:/\[À COMPLÉTER\]/i.test(answer)};
}
async function generatePackageWithPlugy(){
  let pkg=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));if(!pkg)return toast('Sélectionne un dossier');
  const b=$('#packageGenerateAI'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Préparation…'}
  try{
    const wanted=['Lettre de candidature','Bio courte','Note artistique'];
    let existing=new Set((pkg.document_ids||[]).map(id=>state.bureau.find(n=>Number(n.id)===Number(id))?.title).filter(Boolean));
    const missing=wanted.filter(name=>!existing.has(name));
    if(missing.length){
      if(b)b.textContent='Création du pack…';
      for(const name of missing){
        const t=state.bureauTemplates.find(x=>x.name===name);if(!t)continue;
        const out=await api('/api/v120/bureau/packages/'+pkg.id+'/document',{method:'POST',body:JSON.stringify({template_id:t.id,title:t.name})});
        if(out.document&&!state.bureau.some(x=>Number(x.id)===Number(out.document.id)))state.bureau.unshift(out.document);
        if(out.package){const i=state.bureauPackages.findIndex(x=>Number(x.id)===Number(out.package.id));if(i>=0)state.bureauPackages[i]=out.package;pkg=out.package}
      }
    }
    pkg=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage))||pkg;
    const packageIds=(pkg.document_ids||[]).map(Number),artistContext=bureauArtistContext(packageIds);
    const docs=packageIds.map(id=>state.bureau.find(n=>Number(n.id)===id)).filter(Boolean).filter(n=>['letter','bio','statement'].includes(packageDocRole(n)));
    let incomplete=0,generated=0;const roleState={};
    for(let i=0;i<docs.length;i++){
      const doc=docs[i];if(b)b.textContent='PLUGY · '+(i+1)+'/'+docs.length;
      let result=await generatePackageDocWithPlugy(doc,pkg,artistContext);
      if(result._incomplete)incomplete++;
      roleState[packageDocRole(doc)]=!result._incomplete;
      const saved=await api('/api/v107/bureau/'+doc.id,{method:'PATCH',body:JSON.stringify({body:result.body})});
      const idx=state.bureau.findIndex(x=>Number(x.id)===Number(saved.id));if(idx>=0)state.bureau[idx]=saved;
      generated++;
    }
    const checklist={...(pkg.checklist||{})};
    if('letter' in roleState)checklist.letter=!!roleState.letter;
    if('bio' in roleState)checklist.bio=!!roleState.bio;
    if('statement' in roleState)checklist.artist_statement=!!roleState.statement;
    const savedPkg=await api('/api/v120/bureau/packages/'+pkg.id,{method:'PATCH',body:JSON.stringify({checklist,notes:pkg.notes||''})});
    const pi=state.bureauPackages.findIndex(x=>Number(x.id)===Number(savedPkg.id));if(pi>=0)state.bureauPackages[pi]=savedPkg;
    if(pkg.opportunity_id)persistWorkflow(pkg.opportunity_id,{workflow_status:'drafting',next_action:incomplete?'Compléter puis relire le dossier':'Relire et finaliser le dossier'}).catch(()=>{});
    renderBureauPackages();renderDashboard();
    toast(incomplete?generated+' documents générés · '+incomplete+' à compléter':generated+' documents générés avec PLUGY');
  }catch(e){
    console.warn('[PLUG ART package AI]',e);toast('Génération du dossier interrompue');
  }finally{if(b){b.disabled=false;b.textContent=old}}
}

async function patchActivePackage(patch,silent=false){
  const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));if(!p)return;
  try{const saved=await api('/api/v120/bureau/packages/'+p.id,{method:'PATCH',body:JSON.stringify(patch)});const i=state.bureauPackages.findIndex(x=>Number(x.id)===Number(saved.id));if(i>=0)state.bureauPackages[i]=saved;renderBureauPackages();if(!silent)toast('Dossier mis à jour')}catch{if(!silent)toast('Mise à jour impossible')}
}
async function deleteActivePackage(){
  const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));if(!p)return;
  try{await api('/api/v120/bureau/packages/'+p.id,{method:'DELETE'});state.bureauPackages=state.bureauPackages.filter(x=>Number(x.id)!==Number(p.id));state.activePackage=null;renderBureauPackages();toast('Dossier supprimé')}catch{toast('Suppression impossible')}
}
async function createDocumentFromPackage(){
  const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage)),tid=Number($('#packageTemplateSelect')?.value||0);if(!p||!tid)return;
  const b=$('#packageCreateDoc'),old=b.textContent;b.disabled=true;b.textContent='Création…';
  try{
    const out=await api('/api/v120/bureau/packages/'+p.id+'/document',{method:'POST',body:JSON.stringify({template_id:tid})});
    if(out.document){
      if(!state.bureau.some(x=>Number(x.id)===Number(out.document.id)))state.bureau.unshift(out.document);
      if(out.package){const i=state.bureauPackages.findIndex(x=>Number(x.id)===Number(out.package.id));if(i>=0)state.bureauPackages[i]=out.package}
      bureauPackageReconciled.delete(Number(p.id));await reconcileBureauPackage(p.id,{render:false,silent:true}).catch(()=>{});
      state.activeDoc=out.document.id;setBureauMode('documents');selectDoc(out.document.id);toast('Document créé depuis le modèle');
    }
  }catch{toast('Création du document impossible')}finally{b.disabled=false;b.textContent=old}
}

async function createPackageStarterPack(){
  const p=state.bureauPackages.find(x=>Number(x.id)===Number(state.activePackage));if(!p)return;
  const wanted=['Lettre de candidature','Bio courte','Note artistique'];
  const existingTitles=new Set((p.document_ids||[]).map(id=>state.bureau.find(n=>Number(n.id)===Number(id))?.title).filter(Boolean));
  const templates=wanted.map(name=>state.bureauTemplates.find(t=>t.name===name)).filter(Boolean).filter(t=>!existingTitles.has(t.name));
  if(!templates.length)return toast('Les pièces de base existent déjà');
  const b=$('#packageStarterPack'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Création…'}
  try{
    for(const t of templates){
      if(b)b.textContent='Création · '+t.name;
      const out=await api('/api/v120/bureau/packages/'+p.id+'/document',{method:'POST',body:JSON.stringify({template_id:t.id,title:t.name})});
      if(out.document&&!state.bureau.some(x=>Number(x.id)===Number(out.document.id)))state.bureau.unshift(out.document);
      if(out.package){const i=state.bureauPackages.findIndex(x=>Number(x.id)===Number(out.package.id));if(i>=0)state.bureauPackages[i]=out.package}
    }
    bureauPackageReconciled.delete(Number(p.id));await reconcileBureauPackage(p.id,{render:true,silent:true});
    toast('Pièces de base créées · elles restent à compléter');
  }catch{toast('Création des pièces impossible')}
  finally{if(b){b.disabled=false;b.textContent=old}}
}

async function packageToCreation(p){
  const docs=(p.document_ids||[]).map(id=>state.bureau.find(n=>Number(n.id)===Number(id))).filter(Boolean);
  if(!docs.length)return toast('Crée d’abord au moins un document dans ce dossier');
  route('creation');setCreationMode('text');
  try{await ensureViewData('creation')}catch{}
  const opp=p.opportunity||{},combined=docs.map(n=>'### '+(n.title||'Document')+'\n'+String(n.body||'')).join('\n\n---\n\n');
  setTimeout(()=>{
    if($('#contentTitle'))$('#contentTitle').value=p.title||'Dossier de candidature';
    if($('#contentObjective'))$('#contentObjective').value='Finaliser, adapter ou décliner ce dossier de candidature.';
    if($('#contentBrief'))$('#contentBrief').value=['OPEN CALL : '+(opp.title||''),opp.deadline?'Deadline : '+opp.deadline:'',p.notes?'Notes : '+p.notes:'',combined].filter(Boolean).join('\n\n');
    if($('#contentSource')&&opp.id){$('#contentSource').value=String(opp.id);$('#contentSource').dispatchEvent(new Event('change'))}
    if($('#contentStatus'))$('#contentStatus').textContent='Dossier importé';
    toast('Dossier complet chargé dans Création');
  },60);
}

async function exportPackagePdf(p){
  const docs=(p.document_ids||[]).map(id=>state.bureau.find(n=>Number(n.id)===Number(id))).filter(Boolean);
  if(!docs.length)return toast('Ajoute au moins un document au dossier');
  const b=$('#packageExportPdf'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Préparation PDF…'}
  try{
    const PDF=await loadJsPdf();if(!PDF)throw new Error('pdf');
    const doc=new PDF({unit:'mm',format:'a4'}),margin=17,pageW=210,pageH=297,maxW=pageW-margin*2;
    const opp=p.opportunity||{},check=p.checklist||{};
    let y=22;
    const ensure=(need=12)=>{if(y+need>pageH-18){doc.addPage();y=20}};
    const text=(value,size=9,bold=false,space=5)=>{
      const str=String(value||'').trim();if(!str)return;
      doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
      const lines=doc.splitTextToSize(str,maxW);
      for(const line of lines){ensure(size*.45+2);doc.text(line,margin,y);y+=size*.42+1.5}
      y+=space;
    };
    doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('PLUG ART · DOSSIER DE CANDIDATURE',margin,y);y+=10;
    text(p.title||'Dossier',15,true,4);
    if(opp.title)text('Open Call · '+opp.title,10,true,2);
    text([opp.city,opp.country,opp.deadline?'Deadline '+opp.deadline:'',opp.fee||''].filter(Boolean).join(' · '),8,false,6);

    const done=BUREAU_PACKAGE_KEYS.filter(k=>!!check[k]).length;
    text('Avancement · '+done+' / '+BUREAU_PACKAGE_KEYS.length+' éléments prêts',9,true,2);
    const checklistLines=BUREAU_PACKAGE_KEYS.map(k=>(check[k]?'✓ ':'○ ')+bureauChecklistLabel(k));
    text(checklistLines.join('   ·   '),8,false,6);

    if(p.notes){text('NOTES',9,true,2);text(p.notes,9,false,7)}

    for(const item of docs){
      ensure(24);
      doc.setDrawColor(225,227,233);doc.line(margin,y,pageW-margin,y);y+=7;
      text(item.title||'Document',13,true,4);
      text(item.body||'',9,false,7);
    }

    const base=String(p.title||'dossier-candidature').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'dossier-candidature';
    doc.save(base+'.pdf');toast('Dossier PDF exporté');
  }catch(e){console.warn('[PLUG ART package PDF]',e);toast('Export PDF indisponible')}
  finally{if(b){b.disabled=false;b.textContent=old}}
}

function renderBureauTemplates(){
  const list=$('#bureauTemplateList'),editor=$('#bureauTemplateEditor');if(!list||!editor)return;
  const term=clean($('#templateSearch')?.value).toLowerCase(),rows=state.bureauTemplates.filter(t=>!term||[t.name,t.category,t.tags,t.body].join(' ').toLowerCase().includes(term));
  if(state.activeTemplate&&!state.bureauTemplates.some(x=>Number(x.id)===Number(state.activeTemplate)))state.activeTemplate=null;
  if(!state.activeTemplate&&rows[0])state.activeTemplate=rows[0].id;
  list.innerHTML=rows.map(t=>'<button class="bureau-template-item '+(Number(t.id)===Number(state.activeTemplate)?'active':'')+'" data-template="'+t.id+'"><strong>'+esc(t.name||'Modèle')+'</strong><span>'+esc(t.category||'Général')+(t.built_in?' · système':'')+'</span></button>').join('')||'<div class="empty">Aucun modèle.</div>';
  $$('[data-template]',list).forEach(b=>b.onclick=()=>{state.activeTemplate=Number(b.dataset.template);renderBureauTemplates()});
  renderBureauTemplateEditor();
}
function renderBureauTemplateEditor(){
  const box=$('#bureauTemplateEditor'),t=state.bureauTemplates.find(x=>Number(x.id)===Number(state.activeTemplate));if(!box)return;
  if(!t){box.innerHTML='<div class="empty">Sélectionne un modèle.</div>';return}
  box.innerHTML='<div class="template-editor-head"><div><small>MODÈLE '+(t.built_in?'SYSTÈME':'PERSONNALISÉ')+'</small><h3>'+esc(t.name||'Modèle')+'</h3></div></div><div class="template-editor-grid"><label>Nom<input id="templateName" value="'+esc(t.name||'')+'"></label><label>Catégorie<select id="templateCategory">'+['Candidature','Artiste','Contenu','Prospection','Général'].map(x=>'<option '+(t.category===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Tags<input id="templateTags" value="'+esc(t.tags||'')+'"></label><label>Contenu<textarea id="templateBody">'+esc(t.body||'')+'</textarea></label></div><div class="template-editor-actions"><button id="templateUse">Créer un document</button><button id="templateDuplicate">Dupliquer</button><span class="spacer"></span>'+(t.built_in?'':'<button class="danger-text" id="templateDelete">Supprimer</button>')+'<button class="primary" id="templateSave">Enregistrer</button></div>';
  $('#templateSave').onclick=saveActiveTemplate;$('#templateDuplicate').onclick=duplicateActiveTemplate;$('#templateUse').onclick=useActiveTemplateAsDocument;$('#templateDelete')?.addEventListener('click',deleteActiveTemplate);
}
function newBureauTemplate(){
  state.activeTemplate=null;const box=$('#bureauTemplateEditor');if(!box)return;
  box.innerHTML='<div class="template-editor-head"><div><small>NOUVEAU MODÈLE</small><h3>Créer un modèle</h3></div></div><div class="template-editor-grid"><label>Nom<input id="templateName" value="Nouveau modèle"></label><label>Catégorie<select id="templateCategory"><option>Candidature</option><option>Artiste</option><option>Contenu</option><option>Prospection</option><option selected>Général</option></select></label><label>Tags<input id="templateTags"></label><label>Contenu<textarea id="templateBody" placeholder="Structure réutilisable…"></textarea></label></div><div class="template-editor-actions"><span class="spacer"></span><button class="primary" id="templateSave">Créer le modèle</button></div>';
  $('#templateSave').onclick=saveActiveTemplate;
}
async function saveActiveTemplate(){
  const body={name:$('#templateName')?.value||'Modèle',category:$('#templateCategory')?.value||'Général',tags:$('#templateTags')?.value||'',body:$('#templateBody')?.value||''};
  try{let t;if(state.activeTemplate)t=await api('/api/v120/bureau/templates/'+state.activeTemplate,{method:'PATCH',body:JSON.stringify(body)});else t=await api('/api/v120/bureau/templates',{method:'POST',body:JSON.stringify(body)});state.bureauTemplates=state.bureauTemplates.filter(x=>Number(x.id)!==Number(t.id));state.bureauTemplates.push(t);state.activeTemplate=t.id;renderBureauTemplates();toast('Modèle enregistré')}catch{toast('Enregistrement du modèle impossible')}
}
async function duplicateActiveTemplate(){
  const t=state.bureauTemplates.find(x=>Number(x.id)===Number(state.activeTemplate));if(!t)return;
  try{const copy=await api('/api/v120/bureau/templates',{method:'POST',body:JSON.stringify({name:(t.name||'Modèle')+' · copie',category:t.category,body:t.body,tags:t.tags})});state.bureauTemplates.push(copy);state.activeTemplate=copy.id;renderBureauTemplates();toast('Modèle dupliqué')}catch{toast('Duplication impossible')}
}
async function deleteActiveTemplate(){
  const t=state.bureauTemplates.find(x=>Number(x.id)===Number(state.activeTemplate));if(!t||t.built_in)return;
  try{await api('/api/v120/bureau/templates/'+t.id,{method:'DELETE'});state.bureauTemplates=state.bureauTemplates.filter(x=>Number(x.id)!==Number(t.id));state.activeTemplate=null;renderBureauTemplates();toast('Modèle supprimé')}catch{toast('Suppression impossible')}
}
async function useActiveTemplateAsDocument(){
  const t=state.bureauTemplates.find(x=>Number(x.id)===Number(state.activeTemplate));if(!t)return;
  try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:t.name,body:t.body,folder:t.category==='Candidature'?'Candidatures':'Notes',tags:t.tags})});state.bureau.unshift(n);state.activeDoc=n.id;setBureauMode('documents');selectDoc(n.id);toast('Document créé depuis le modèle')}catch{toast('Création impossible')}
}
async function createPackageForOpportunity(id){
  try{
    await ensureViewData('bureau');
    const pkg=await api('/api/v120/bureau/packages/from-opportunity/'+id,{method:'POST'});
    state.bureauPackages=state.bureauPackages.filter(x=>Number(x.id)!==Number(pkg.id));state.bureauPackages.unshift(pkg);state.activePackage=pkg.id;
    route('bureau');setBureauMode('packages');renderBureauPackages();$('#callDrawer')?.classList.remove('open');
    if(id)persistWorkflow(id,{workflow_status:'drafting',next_action:'Préparer le dossier de candidature'}).catch(()=>{});
    toast('Dossier de candidature ouvert');
  }catch{toast('Création du dossier impossible')}
}

function renderBureau(){
  const term=clean($('#bureauSearch')?.value).toLowerCase(),rows=state.bureau.filter(n=>(!state.bureauFolderFilter||(n.folder||'Notes')===state.bureauFolderFilter)&&(!term||[n.title,n.body,n.folder,n.tags].join(' ').toLowerCase().includes(term)));
  $('#bureauList').innerHTML=rows.map(n=>'<button class="bureau-item '+(state.activeDoc===n.id?'active':'')+'" data-doc="'+n.id+'"><strong>'+(n.pinned?'★ ':'')+esc(n.title||'Sans titre')+'</strong><span>'+esc(n.folder||'Notes')+' · '+esc((n.updated_at||'').replace('T',' '))+'</span></button>').join('')||'<div class="empty">Aucun document.</div>';
  $$('[data-doc]').forEach(b=>b.onclick=()=>selectDoc(Number(b.dataset.doc)));renderBureauFolders();
}
function clearDoc(){state.activeDoc=null;$('#bureauTitle').value='';$('#bureauBody').value='';$('#bureauFolder').value='Notes';$('#bureauTags').value='';$('#bureauPinned').checked=false;renderBureau();renderBureauSource(null)}
function selectDoc(id){
  const n=state.bureau.find(x=>Number(x.id)===Number(id));if(!n)return;
  state.activeDoc=n.id;renderPlugyActions();$('#bureauTitle').value=n.title||'';$('#bureauBody').value=n.body||'';$('#bureauFolder').value=n.folder||'Notes';$('#bureauTags').value=n.tags||'';$('#bureauPinned').checked=!!n.pinned;renderBureau();renderBureauSource(n);openBureauMobileEditor();
}
function ensureBureauBridge(){
  if($('#bureauSourceBar'))return;
  const editor=$('.bureau-editor');if(!editor)return;
  const bar=document.createElement('div');bar.id='bureauSourceBar';bar.className='bureau-source-bar';bar.innerHTML='<span id="bureauSourceLabel">Document libre</span><div><button id="bureauOpenSource" hidden>Ouvrir la source</button><button id="bureauAsTemplate">＋ Modèle</button><button id="bureauToCreation">✦ Envoyer vers Création</button></div>';
  editor.insertBefore(bar,editor.firstChild);
  const st=document.createElement('style');st.textContent='.bureau-source-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 0 10px;border-bottom:1px solid #eceef2;margin-bottom:4px}.bureau-source-bar>span{font-size:9px;color:#8d909b}.bureau-source-bar div{display:flex;gap:6px}.bureau-source-bar button{border:1px solid #e1e3e8;background:#fff;border-radius:9px;padding:7px 9px;font-size:8px;font-weight:800}.bureau-source-bar button:last-child{background:#f8f6ff;border-color:#ded9fb;color:#5f50c2}';document.head.appendChild(st);
  $('#bureauOpenSource').onclick=openCurrentBureauSource;
  $('#bureauAsTemplate').onclick=saveCurrentDocAsTemplate;
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
async function saveCurrentDocAsTemplate(){
  const n=state.bureau.find(x=>Number(x.id)===Number(state.activeDoc));if(!n)return toast('Sélectionne un document');
  const category=n.folder==='Candidatures'?'Candidature':n.folder==='Prospection'?'Prospection':n.folder==='Contenus'?'Contenu':'Général';
  try{
    const t=await api('/api/v120/bureau/templates',{method:'POST',body:JSON.stringify({name:n.title||'Modèle',category,body:n.body||'',tags:n.tags||''})});
    state.bureauTemplates.push(t);state.activeTemplate=t.id;setBureauMode('templates');renderBureauTemplates();toast('Document enregistré comme modèle');
  }catch{toast('Création du modèle impossible')}
}

function sendCurrentBureauToCreation(){
  const n=state.bureau.find(x=>Number(x.id)===Number(state.activeDoc));if(!n)return;
  route('creation');setCreationMode('text');
  setTimeout(()=>{if($('#contentTitle'))$('#contentTitle').value=n.title||'';if($('#contentBrief'))$('#contentBrief').value=n.body||'';if(n.source_type==='opportunity'&&n.source_id&&$('#contentSource')){$('#contentSource').value=String(n.source_id);$('#contentSource').dispatchEvent(new Event('change'))}toast('Document chargé dans Création')},50);
}
function ensureBureauMobileBack(){
  if($('#bureauMobileBack'))return;
  const editor=$('.bureau-editor');if(!editor)return;
  const b=document.createElement('button');b.id='bureauMobileBack';b.className='mobile-editor-back';b.innerHTML='‹ Documents';b.onclick=()=>{document.body.classList.remove('mobile-bureau-editing');$('.workspace')?.scrollTo({top:0,behavior:'smooth'})};editor.insertBefore(b,editor.firstChild);
}
function openBureauMobileEditor(){
  ensureBureauMobileBack();
  if(matchMedia('(max-width:820px)').matches){document.body.classList.add('mobile-bureau-editing');setTimeout(()=>$('#bureauTitle')?.focus({preventScroll:true}),80)}
}
$('#bureauNew')?.addEventListener('click',()=>{clearDoc();openBureauMobileEditor()});$('#bureauSearch')?.addEventListener('input',renderBureau);

function ensureSaveStatus(){
  if($('#workspaceSaveStatus'))return;
  const top=$('.top-actions');if(!top)return;
  const s=document.createElement('span');s.id='workspaceSaveStatus';s.className='save-status';s.textContent='Synchronisé';top.insertBefore(s,top.firstChild);
  if(!$('#saveStatusStyles')){const st=document.createElement('style');st.id='saveStatusStyles';st.textContent='.save-status{font-size:8px;color:#8c8f99;white-space:nowrap}.save-status.saving{color:#725ad1}.save-status.saved{color:#4e9d78}.save-status.error{color:#ca5a67}@media(max-width:820px){.save-status{display:none}}';document.head.appendChild(st)}
}
function saveStatus(text,stateName=''){ensureSaveStatus();const s=$('#workspaceSaveStatus');if(!s)return;s.textContent=text;s.className='save-status '+stateName}
function syncNetworkState(){
  const online=navigator.onLine!==false;document.body.dataset.network=online?'online':'offline';
  if(!online)saveStatus('Hors ligne','error');
  else if($('#workspaceSaveStatus')?.textContent==='Hors ligne')saveStatus('Connexion rétablie','saved');
}
addEventListener('offline',syncNetworkState);
addEventListener('online',()=>{syncNetworkState();loadAll()});

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
function openLeadMobileSheet(){
  const panel=$('#leadDetail');if(!panel)return;
  if(!$('#leadMobileClose',panel)){
    const close=document.createElement('button');close.id='leadMobileClose';close.className='mobile-lead-close';close.textContent='×';close.onclick=()=>panel.classList.remove('mobile-open');panel.prepend(close);
  }
  if(matchMedia('(max-width:820px)').matches)panel.classList.add('mobile-open');
}
async function selectLead(id){
  const l=state.leads.find(x=>Number(x.id)===Number(id));if(!l)return;state.activeLead=l.id;renderPlugyActions();$('#leadDetail').innerHTML=leadForm(l);bindLeadForm(l);openLeadMobileSheet();
  try{const hist=await api('/api/v86/crm/'+l.id+'/history');$('#leadHistory').innerHTML='<h4>Historique</h4>'+hist.slice(0,15).map(h=>'<div class="history-item"><strong>'+esc(h.action)+'</strong> · '+esc(h.created_at)+'<br>'+esc(h.details||'')+'</div>').join('')}catch{}
}

function leadCurrentName(){
  return clean($('#lfOrg')?.value||$('#lfName')?.value||'ce contact');
}
async function logLeadActivity(lid,payload){
  const out=await api('/api/v119/crm/'+lid+'/activity',{method:'POST',body:JSON.stringify(payload)});
  const saved=out.lead;
  if(saved){
    const i=state.leads.findIndex(x=>Number(x.id)===Number(saved.id));
    if(i>=0)state.leads[i]=saved;else state.leads.unshift(saved);
  }
  renderLeads();renderDashboard();renderPlugyActions();
  if(Array.isArray(out.history)&&$('#leadHistory')){
    $('#leadHistory').innerHTML='<h4>Historique</h4>'+out.history.slice(0,15).map(h=>'<div class="history-item"><strong>'+esc(h.action)+'</strong> · '+esc(h.created_at)+'<br>'+esc(h.details||'')+'</div>').join('');
  }
  return out;
}
function installLeadOutreach(l={}){
  if(!l.id||$('#leadOutreach'))return;
  const hist=$('#leadHistory'),form=$('.lead-form');if(!form)return;
  const section=document.createElement('section');section.id='leadOutreach';section.className='lead-outreach';
  section.innerHTML='<div class="lead-outreach-head"><div><small>RELANCE RAPIDE</small><h4>Préparer et suivre le contact</h4></div><span id="leadOutreachState">Prêt</span></div>'+
    '<textarea id="leadMessageDraft" rows="6" placeholder="Le message préparé par PLUGY apparaîtra ici…"></textarea>'+
    '<div class="lead-outreach-actions">'+
      '<button id="leadMessageGenerate">✦ Générer</button>'+
      '<button id="leadMessageCopy">Copier</button>'+
      '<button id="leadMessageEmail">Email ↗</button>'+
      '<button id="leadMessageInstagram">Instagram ↗</button>'+
      '<button class="primary" id="leadMessageSent">Marquer envoyé</button>'+
    '</div>'+
    '<div class="lead-schedule"><span>Relancer</span><button data-lead-delay="1">Demain</button><button data-lead-delay="3">+3 j</button><button data-lead-delay="7">+7 j</button></div>';
  if(hist)hist.insertAdjacentElement('beforebegin',section);else form.appendChild(section);

  if(!$('#leadOutreachStyles')){
    const st=document.createElement('style');st.id='leadOutreachStyles';st.textContent=`
      .lead-outreach{margin-top:14px;padding:13px;border:1px solid #e3e5ea;border-radius:16px;background:#fafbfc}
      .lead-outreach-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}
      .lead-outreach-head small{font-size:7px;letter-spacing:1px;color:#9599a5;font-weight:800}
      .lead-outreach-head h4{margin:2px 0 0;font-size:11px}
      .lead-outreach-head>span{font-size:8px;color:#8d919c}
      .lead-outreach textarea{width:100%;min-height:110px;padding:10px;border:1px solid #dfe2e8;border-radius:12px;background:#fff;font-size:10px;line-height:1.5;resize:vertical}
      .lead-outreach-actions,.lead-schedule{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .lead-outreach-actions button,.lead-schedule button{border:1px solid #dfe2e8;background:#fff;border-radius:9px;padding:8px 9px;font-size:8px;font-weight:800}
      .lead-outreach-actions button.primary{background:#111318;color:#fff;border-color:#111318}
      .lead-schedule{align-items:center}.lead-schedule span{font-size:8px;color:#8e929d;margin-right:2px}
      @media(max-width:820px){.lead-outreach-actions,.lead-schedule{overflow:auto;flex-wrap:nowrap}.lead-outreach-actions button,.lead-schedule button{white-space:nowrap;min-height:36px}}
    `;document.head.appendChild(st);
  }

  const stateEl=$('#leadOutreachState');
  $('#leadMessageGenerate').onclick=async()=>{
    const b=$('#leadMessageGenerate'),old=b.textContent;b.disabled=true;b.textContent='PLUGY…';if(stateEl)stateEl.textContent='Rédaction…';
    const context=[clean($('#lfNotes')?.value),clean($('#lfAction')?.value)].filter(Boolean).join(' · ');
    try{
      await askPlugy('Rédige un message de prise de contact ou de relance professionnel, naturel et concis pour '+leadCurrentName()+'. Contexte : '+context+'. Évite le ton commercial agressif. Le message doit être directement envoyable et rester factuel.','#leadMessageDraft');
      if(stateEl)stateEl.textContent='Message prêt';
    }catch{if(stateEl)stateEl.textContent='Erreur'}
    finally{b.disabled=false;b.textContent=old}
  };
  $('#leadMessageCopy').onclick=async()=>{
    const msg=$('#leadMessageDraft')?.value||'';if(!msg)return toast('Prépare d’abord un message');
    try{await navigator.clipboard.writeText(msg);toast('Message copié');if(stateEl)stateEl.textContent='Copié'}catch{toast('Copie impossible')}
  };
  $('#leadMessageEmail').onclick=()=>{
    const email=clean($('#lfEmail')?.value),msg=$('#leadMessageDraft')?.value||'';if(!email)return toast('Aucune adresse email');
    const subject='PLUG ART · '+leadCurrentName();location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(msg);
  };
  $('#leadMessageInstagram').onclick=()=>{
    const raw=clean($('#lfInstagram')?.value);if(!raw)return toast('Aucun Instagram');
    const handle=raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/^@/,'').split(/[/?#]/)[0];
    if(handle)window.open('https://www.instagram.com/'+encodeURIComponent(handle)+'/','_blank','noopener');
  };
  $('#leadMessageSent').onclick=async()=>{
    const msg=$('#leadMessageDraft')?.value||'';const b=$('#leadMessageSent'),old=b.textContent;b.disabled=true;b.textContent='Enregistrement…';
    try{
      await logLeadActivity(l.id,{action:'Message envoyé',details:msg||'Contact marqué comme envoyé',status:'waiting',next_action:'Relancer si aucune réponse',next_date:isoAfterDays(3),touch_contact:true});
      if(stateEl)stateEl.textContent='Envoyé · relance +3 j';toast('Démarche enregistrée');
    }catch{toast('Historique impossible à enregistrer')}
    finally{b.disabled=false;b.textContent=old}
  };
  $$('[data-lead-delay]',section).forEach(b=>b.onclick=async()=>{
    const days=Number(b.dataset.leadDelay||3);
    try{
      await logLeadActivity(l.id,{action:'Relance planifiée',details:'Relance programmée dans '+days+' jour'+(days>1?'s':''),status:'followup',next_action:'Relancer la structure',next_date:isoAfterDays(days)});
      if(stateEl)stateEl.textContent='Relance '+(days===1?'demain':'+'+days+' j');toast('Relance planifiée');
    }catch{toast('Planification impossible')}
  });
}

function bindLeadForm(l={}){
  $('#leadSave').onclick=async()=>{try{const data=leadPayload();let saved;if(l.id)saved=await api('/api/v86/crm/'+l.id,{method:'PATCH',body:JSON.stringify(data)});else saved=await api('/api/v86/crm',{method:'POST',body:JSON.stringify(data)});const i=state.leads.findIndex(x=>x.id===saved.id);if(i>=0)state.leads[i]=saved;else state.leads.unshift(saved);state.activeLead=saved.id;renderLeads();renderDashboard();selectLead(saved.id);toast('Contact enregistré')}catch(e){toast('Erreur CRM')}};
  $('#leadDelete')?.addEventListener('click',async()=>{try{await api('/api/v86/crm/'+l.id,{method:'DELETE'});state.leads=state.leads.filter(x=>x.id!==l.id);state.activeLead=null;$('#leadDetail').innerHTML='<div class="lead-empty"><b>◎</b><strong>Sélectionne un contact</strong><span>Sa fiche apparaîtra ici.</span></div>';renderLeads();renderDashboard();toast('Contact supprimé')}catch{}});
  $('#leadPlugy').onclick=()=>{const d=leadPayload();askPlugy('Prépare un message de relance professionnel et concis pour '+clean(d.organization||d.name)+'. Contexte : '+clean(d.notes)+'. Prochaine action : '+clean(d.next_action))};
  $('#leadToBureau').onclick=async()=>{const d=leadPayload();try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Prospection · '+clean(d.organization||d.name||'Contact'),body:[d.notes,d.next_action?'Prochaine action : '+d.next_action:'',d.email?'Email : '+d.email:'',d.instagram?'Instagram : '+d.instagram:''].filter(Boolean).join('\n\n'),folder:'Prospection',tags:'prospection, contact',source_type:l.id?'crm':'',source_id:l.id?String(l.id):''})});state.bureau.unshift(n);renderDashboard();toast('Contact envoyé au Bureau')}catch{toast('Envoi au Bureau impossible')}};
  installLeadOutreach(l);
}
$('#leadNew')?.addEventListener('click',()=>{state.activeLead=null;$('#leadDetail').innerHTML=leadForm({status:'lead',kind:'Galerie'});bindLeadForm({});openLeadMobileSheet()});

function renderArtists(){
  const box=$('#artistGrid'),rows=state.bootstrap?.artists||[],grad=['#6757cf','#d56a9e','#58aab4','#8c6d50'];
  box.innerHTML=rows.map((a,i)=>'<article class="artist-card"><div class="artist-visual" style="background:linear-gradient(145deg,'+grad[i%4]+',#e7d8f4)">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><div class="artist-body"><h3>'+esc(a.name||'Artiste')+'</h3><p>'+esc(a.discipline||a.city||'Artiste émergent')+'</p><div class="card-actions"><button data-artist-plugy="'+a.id+'">Analyser avec PLUGY</button></div></div></article>').join('')||'<div class="empty">Aucun artiste.</div>';
  $$('[data-artist-plugy]').forEach(b=>b.onclick=()=>{const a=rows.find(x=>String(x.id)===b.dataset.artistPlugy);askPlugy('Analyse le profil de '+clean(a?.name)+'. Discipline : '+clean(a?.discipline)+'. Propose les prochaines actions utiles.')});
}
let instagramStudioLoaded=false;
function instagramMediaCard(m){
  const media=m.thumbnail_url||m.media_url||'',caption=clean(m.caption||''),kind=String(m.media_type||'').toLowerCase();
  return '<article class="ig-media-card"><a href="'+esc(m.permalink||'#')+'" target="_blank" rel="noopener"><div class="ig-media-visual">'+(media?'<img src="'+esc(media)+'" loading="lazy" alt="">':'<span>◎</span>')+(kind.includes('video')||kind.includes('reel')?'<b>▶</b>':'')+'</div></a><div class="ig-media-meta"><p>'+esc(caption.slice(0,120)||'Sans légende')+'</p><span>♥ '+Number(m.like_count||0)+' · ◌ '+Number(m.comments_count||0)+'</span></div></article>';
}
async function renderInstagramStudio(force=false){
  const statusBox=$('#igConnectionState');if(!statusBox)return;
  try{
    const status=await api('/api/v88/instagram/status',{timeout:16000});
    const connected=!!status.connected;
    statusBox.textContent=connected?'Connecté':'Non connecté';
    $('#igUsername').textContent=status.username?'@'+status.username:'@plugart';
    $('#igFollowers').textContent=connected?Number(status.followers_count||0).toLocaleString('fr-FR'):'—';
    $('#igMediaCount').textContent=connected?Number(status.media_count||0).toLocaleString('fr-FR'):'—';
    const avatar=$('#igAvatar');if(avatar)avatar.innerHTML=status.profile_picture_url?'<img src="'+esc(status.profile_picture_url)+'" alt="">':'<span>IG</span>';
    const connect=$('#igConnect');if(connect){connect.textContent=connected?'Compte connecté':'Connecter Instagram';connect.disabled=connected}
    if(!connected){
      $('#igFeedGrid').innerHTML='<div class="ig-connect-empty"><strong>Connecte ton compte Instagram professionnel.</strong><span>Le feed et les outils de publication apparaîtront ici.</span></div>';
      $('#igFeedStatus').textContent=status.configured?'Prêt à connecter':'Configuration Meta requise';instagramStudioLoaded=true;return;
    }
    if(force||!instagramStudioLoaded){
      const media=await api('/api/v88/instagram/media?limit=24',{timeout:22000}),items=Array.isArray(media.items)?media.items:[];
      $('#igFeedGrid').innerHTML=items.map(instagramMediaCard).join('')||'<div class="empty">Aucune publication.</div>';
      $('#igFeedStatus').textContent=items.length+' publication'+(items.length>1?'s':'');
    }
    instagramStudioLoaded=true;
  }catch(e){
    statusBox.textContent='Indisponible';$('#igFeedStatus').textContent='Erreur de connexion';console.warn('[Instagram Studio]',e);
  }
}
async function runInstagramDiagnostic(){
  const box=$('#igDiagnosticList');if(!box)return;box.innerHTML='<div class="empty">Vérification…</div>';
  try{
    const d=await api('/api/v88/instagram/diagnostic',{timeout:18000});
    box.innerHTML=(d.checks||[]).map(x=>'<div class="ig-check '+(x.ok?'ok':'bad')+'"><i></i><span>'+esc(x.label)+'</span><b>'+(x.ok?'OK':'À régler')+'</b></div>').join('');
  }catch{box.innerHTML='<div class="empty">Diagnostic indisponible.</div>'}
}
async function publishInstagramSingle(){
  const url=clean($('#igMediaUrl')?.value),caption=String($('#igCaption')?.value||'').trim(),b=$('#igPublish');
  if(!url)return toast('Ajoute une URL média publique');
  if(!caption)return toast('Ajoute une légende');
  const old=b.textContent;b.disabled=true;b.textContent='Publication…';
  try{
    await api('/api/v88/instagram/publish',{method:'POST',timeout:120000,body:JSON.stringify({caption,media_urls:[url]})});
    toast('Publié sur Instagram');instagramStudioLoaded=false;renderInstagramStudio(true);
  }catch(e){toast(String(e.message||'').toLowerCase().includes('connect')?'Instagram n’est pas connecté':'Publication impossible')}
  finally{b.disabled=false;b.textContent=old}
}
$('#igRefresh')?.addEventListener('click',()=>{instagramStudioLoaded=false;renderInstagramStudio(true)});
$('#igConnect')?.addEventListener('click',()=>{location.href='/api/v88/instagram/login'});
$('#igDiagnostics')?.addEventListener('click',runInstagramDiagnostic);
$('#igOpenCreation')?.addEventListener('click',()=>{route('creation');setCreationMode('carousel')});
$('#igPublish')?.addEventListener('click',publishInstagramSingle);
$('#igCaptionPlugy')?.addEventListener('click',async()=>{
  const current=String($('#igCaption')?.value||'').trim();
  const prompt=current?'Améliore cette légende Instagram PLUG ART sans inventer de faits, garde un ton naturel et clair : '+current:'Propose une légende Instagram PLUG ART concise pour présenter une exposition ou opportunité artistique. Termine par le CTA PLUG habituel.';
  const out=await askPlugy(prompt,'#igCaption');if(out)$('#igCaption').value=out;
});

let plugArtLeafletPromise=null,plugArtMap=null,plugArtMapLayer=null,plugArtMapRows=[],plugArtMapMarkers=new Map();

function ensureLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(plugArtLeafletPromise)return plugArtLeafletPromise;
  plugArtLeafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-plugart-leaflet]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.crossOrigin='';link.dataset.plugartLeaflet='1';document.head.appendChild(link);
    }
    const existing=document.querySelector('script[data-plugart-leaflet]');
    if(existing){existing.addEventListener('load',()=>resolve(window.L),{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.crossOrigin='';s.dataset.plugartLeaflet='1';
    s.onload=()=>window.L?resolve(window.L):reject(new Error('Leaflet indisponible'));
    s.onerror=()=>reject(new Error('Leaflet indisponible'));
    document.head.appendChild(s);
  }).catch(err=>{plugArtLeafletPromise=null;throw err});
  return plugArtLeafletPromise;
}
const MAP_CITY_COORDS={
  paris:[48.8566,2.3522],aubervilliers:[48.9137,2.3833],'saint-denis':[48.9362,2.3574],montreuil:[48.8638,2.4485],pantin:[48.8966,2.4017],
  marseille:[43.2965,5.3698],lyon:[45.764,4.8357],madrid:[40.4168,-3.7038],barcelona:[41.3874,2.1686],barcelone:[41.3874,2.1686],
  milan:[45.4642,9.19],milano:[45.4642,9.19],florence:[43.7696,11.2558],firenze:[43.7696,11.2558],rome:[41.9028,12.4964],
  london:[51.5072,-.1276],londres:[51.5072,-.1276],amsterdam:[52.3676,4.9041],brussels:[50.8503,4.3517],bruxelles:[50.8503,4.3517],
  lisbon:[38.7223,-9.1393],lisbonne:[38.7223,-9.1393],porto:[41.1579,-8.6291],berlin:[52.52,13.405],geneva:[46.2044,6.1432],genève:[46.2044,6.1432]
};
function mapCityCoords(city){
  const key=clean(city).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const hit=Object.entries(MAP_CITY_COORDS).find(([k])=>key===k.normalize('NFD').replace(/[\u0300-\u036f]/g,'')||key.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  return hit?.[1]||null;
}
function mergedMapRows(){
  const direct=(state.bootstrap?.map||[]).map(p=>({...p}));
  const seen=new Set(direct.filter(p=>p.kind==='opportunity').map(p=>String(p.id)));
  for(const o of state.bootstrap?.opportunities||[]){
    if(seen.has(String(o.id)))continue;
    const c=mapCityCoords(o.city);if(!c)continue;
    direct.push({...o,lat:c[0],lon:c[1],kind:'opportunity',approximate_location:true});
  }
  return direct;
}
function filteredMapRows(){
  const q=clean(state.mapSearch||'').toLowerCase(),filter=state.mapFilter||'all';
  return mergedMapRows().filter(p=>{
    if(!Number.isFinite(Number(p.lat))||!Number.isFinite(Number(p.lon)))return false;
    const kind=String(p.kind||p.type||'opportunity').toLowerCase();
    if(filter==='exhibition'&&!kind.includes('exhibition')&&!kind.includes('expo'))return false;
    if(filter==='opportunity'&&(kind.includes('exhibition')||kind.includes('expo')))return false;
    if(q){
      const hay=[p.title,p.city,p.country,p.kind,p.type,p.summary,p.organizer].filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  }).slice(0,220);
}
function mapKind(p){
  const k=String(p?.kind||p?.type||'opportunity').toLowerCase();
  return (k.includes('exhibition')||k.includes('expo'))?'exhibition':'opportunity';
}
function mapPointKey(p,i=0){return String(p?.id??p?.opportunity_id??([p?.title,p?.city,p?.lat,p?.lon,i].join('|')))}
function renderMapList(rows){
  const list=$('#mapList');if(!list)return;
  list.innerHTML=rows.map((p,i)=>{
    const kind=mapKind(p),loc=[p.city,p.country].filter(Boolean).join(' · ');
    return '<button class="map-list-item" data-map-row="'+i+'"><i class="'+kind+'"></i><span><strong>'+esc(p.title||p.city||'Point')+'</strong><small>'+esc(loc||p.kind||'')+'</small></span><b>→</b></button>';
  }).join('')||'<div class="map-empty"><strong>Aucun point ici.</strong><span>Élargis le filtre ou actualise le Radar.</span></div>';
  $$('[data-map-row]',list).forEach(b=>b.onclick=()=>selectMapPoint(rows[Number(b.dataset.mapRow)],Number(b.dataset.mapRow)));
}
function renderMapFallback(rows){
  const box=$('#mapWorkspace');if(!box)return;
  let fallback=$('#mapFallback');
  if(!fallback){fallback=document.createElement('div');fallback.id='mapFallback';fallback.className='map-fallback';box.appendChild(fallback)}
  fallback.innerHTML='<div class="map-grid-lines"></div>';
  const bounds={minLon:-12,maxLon:30,minLat:34,maxLat:60};
  rows.forEach((p,i)=>{
    const lon=Math.max(bounds.minLon,Math.min(bounds.maxLon,Number(p.lon))),lat=Math.max(bounds.minLat,Math.min(bounds.maxLat,Number(p.lat)));
    const x=4+(lon-bounds.minLon)/(bounds.maxLon-bounds.minLon)*92,y=5+(bounds.maxLat-lat)/(bounds.maxLat-bounds.minLat)*90;
    const pin=document.createElement('button');pin.className='map-pin '+mapKind(p);pin.style.left=x+'%';pin.style.top=y+'%';pin.onclick=()=>selectMapPoint(p,i);fallback.appendChild(pin);
  });
  $('#realMap')?.classList.add('unavailable');$('#mapLoading')?.classList.add('hidden');
}
function renderLeafletMap(rows){
  const L=window.L,host=$('#realMap');if(!L||!host)return renderMapFallback(rows);
  $('#mapFallback')?.remove();host.classList.remove('unavailable');
  if(!plugArtMap){
    plugArtMap=L.map(host,{zoomControl:false,preferCanvas:true,worldCopyJump:true,minZoom:3,maxZoom:18,attributionControl:true}).setView([48.6,5.5],5);
    L.control.zoom({position:'bottomright'}).addTo(plugArtMap);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(plugArtMap);
  }
  if(plugArtMapLayer)plugArtMap.removeLayer(plugArtMapLayer);
  plugArtMapLayer=L.layerGroup().addTo(plugArtMap);plugArtMapMarkers.clear();
  const bounds=[];
  rows.forEach((p,i)=>{
    const lat=Number(p.lat),lon=Number(p.lon),kind=mapKind(p),key=mapPointKey(p,i);
    const icon=L.divIcon({className:'plugart-leaflet-icon',html:'<span class="'+kind+'"></span>',iconSize:[22,22],iconAnchor:[11,11]});
    const marker=L.marker([lat,lon],{icon,keyboard:true,title:p.title||p.city||'PLUG ART'}).addTo(plugArtMapLayer);
    marker.on('click',()=>selectMapPoint(p,i));plugArtMapMarkers.set(key,marker);bounds.push([lat,lon]);
  });
  setTimeout(()=>plugArtMap?.invalidateSize?.(),60);
  if(bounds.length>1)plugArtMap.fitBounds(bounds,{padding:[48,48],maxZoom:7,animate:true});
  else if(bounds.length===1)plugArtMap.setView(bounds[0],7,{animate:true});
  else plugArtMap.setView([48.6,5.5],5,{animate:true});
  $('#mapLoading')?.classList.add('hidden');
}
function selectMapPoint(p,index=0){
  if(!p)return;
  const key=mapPointKey(p,index),marker=plugArtMapMarkers.get(key),lat=Number(p.lat),lon=Number(p.lon);
  if(plugArtMap&&Number.isFinite(lat)&&Number.isFinite(lon))plugArtMap.flyTo([lat,lon],Math.max(7,plugArtMap.getZoom()),{duration:.65});
  if(marker)marker.openTooltip?.();
  $$('.map-list-item').forEach(b=>b.classList.toggle('active',Number(b.dataset.mapRow)===index));
  const detail=$('#mapDetail');if(!detail)return;
  const loc=[p.city,p.country].filter(Boolean).join(' · '),kind=mapKind(p);
  detail.hidden=false;
  detail.innerHTML='<button class="map-detail-close" id="mapDetailClose">×</button><small>'+esc(kind==='exhibition'?'EXPOSITION':'OPPORTUNITÉ')+'</small><h3>'+esc(p.title||p.city||'Point')+'</h3><p class="map-detail-loc">'+esc(loc||'Localisation disponible')+(p.approximate_location?' · position ville':'')+'</p><p>'+esc(p.summary||p.description||'Aucune description supplémentaire.')+'</p><div class="map-detail-actions">'+(p.source_url?'<a href="'+esc(p.source_url)+'" target="_blank" rel="noopener">Source officielle</a>':'')+'<button id="mapDetailPlugy">✦ Analyser avec PLUGY</button></div>';
  $('#mapDetailClose').onclick=()=>{detail.hidden=true};
  $('#mapDetailPlugy').onclick=()=>openPlugy('Analyse cette opportunité sur la carte : '+clean(p.title||p.city)+'. Lieu : '+clean(loc)+'. Donne-moi les informations utiles et la prochaine action.');
}
function renderMap(){
  const rows=filteredMapRows();plugArtMapRows=rows;
  $('#mapCount').textContent=rows.length+' point'+(rows.length>1?'s':'');renderMapList(rows);
  $('#mapLoading')?.classList.remove('hidden');
  ensureLeaflet().then(()=>renderLeafletMap(rows)).catch(()=>renderMapFallback(rows));
}
$('#mapSearch')?.addEventListener('input',e=>{state.mapSearch=e.target.value;renderMap()});
$$('[data-map-filter]').forEach(b=>b.addEventListener('click',()=>{
  state.mapFilter=b.dataset.mapFilter;$$('[data-map-filter]').forEach(x=>x.classList.toggle('active',x===b));renderMap();
}));
$('#mapReset')?.addEventListener('click',()=>{state.mapFilter='all';state.mapSearch='';if($('#mapSearch'))$('#mapSearch').value='';$$('[data-map-filter]').forEach(x=>x.classList.toggle('active',x.dataset.mapFilter==='all'));renderMap()});
$('#mapRefresh')?.addEventListener('click',()=>ensureDataFamily('map',true).then(renderMap).catch(()=>toast('Carte momentanément indisponible')));

const UI_DEFAULT={accent:'mono',surface:'editorial',density:'airy',radius:26,fontScale:1,motion:'subtle',sidebar:'standard',plugyConcept:'pearl'};
const UI_PRESETS={
  ultra:{accent:'mono',surface:'editorial',density:'airy',radius:28,fontScale:1.04,motion:'subtle',sidebar:'standard',plugyConcept:'pearl'},
  editorial:{accent:'violet',surface:'editorial',density:'balanced',radius:24,fontScale:1,motion:'subtle',sidebar:'standard',plugyConcept:'pearl'},
  minimal:{accent:'mono',surface:'flat',density:'airy',radius:18,fontScale:.98,motion:'subtle',sidebar:'compact',plugyConcept:'pearl'},
  night:{accent:'cobalt',surface:'glass',density:'balanced',radius:26,fontScale:1,motion:'expressive',sidebar:'standard',plugyConcept:'halo'}
};
function applyInterfaceConfig(raw){
  const cfg={...UI_DEFAULT,...(raw||{})};state.uiConfig=cfg;
  const accents={
    violet:['#7657ff','#57dce6','#f15ba8'],cyan:['#38bfcf','#62dfe7','#8d78ff'],coral:['#e66caa','#7edce4','#ff8bbd'],cobalt:['#416df2','#6fdce5','#9c72ff'],lime:['#70b56d','#78ddd5','#9a7bea'],mono:['#111318','#8b8f99','#b4b7c0']
  },a=accents[cfg.accent]||accents.mono,root=document.documentElement;
  root.style.setProperty('--violet',a[0]);root.style.setProperty('--cyan',a[1]);root.style.setProperty('--pink',a[2]);root.style.setProperty('--r',(Number(cfg.radius)||26)+'px');root.style.setProperty('--ui-font-scale',String(Number(cfg.fontScale)||1));
  document.body.dataset.uiSurface=cfg.surface;document.body.dataset.uiDensity=cfg.density;document.body.dataset.uiMotion=cfg.motion;document.body.dataset.uiAccent=cfg.accent;
  document.body.classList.toggle('sidebar-small',cfg.sidebar==='compact');
}
function syncInterfaceLab(cfg=state.uiConfig||UI_DEFAULT,versions=[]){
  const set=(id,v)=>{const el=$('#'+id);if(el)el.value=String(v)};
  set('uiAccent',cfg.accent);set('uiSurface',cfg.surface);set('uiDensity',cfg.density);set('uiRadius',cfg.radius);set('uiFontScale',Math.round(Number(cfg.fontScale||1)*100));set('uiMotion',cfg.motion);set('uiSidebar',cfg.sidebar);
  if($('#uiRadiusOut'))$('#uiRadiusOut').textContent=cfg.radius;if($('#uiFontScaleOut'))$('#uiFontScaleOut').textContent=Math.round(Number(cfg.fontScale||1)*100)+'%';
  const p=$('#uiVersionPicker');if(p){const cur=p.value;p.innerHTML='<option value="">Historique</option>'+versions.slice(0,12).map(v=>'<option value="'+v.id+'">'+esc(v.name||('Version '+v.id))+(v.published?' · publiée':'')+'</option>').join('');if(cur)p.value=cur}
}
function collectInterfaceLab(){
  return{accent:$('#uiAccent')?.value||'mono',surface:$('#uiSurface')?.value||'editorial',density:$('#uiDensity')?.value||'airy',radius:Number($('#uiRadius')?.value||26),fontScale:Number($('#uiFontScale')?.value||100)/100,motion:$('#uiMotion')?.value||'subtle',sidebar:$('#uiSidebar')?.value||'standard',plugyConcept:state.uiConfig?.plugyConcept||'pearl'};
}
async function loadInterfaceDesign(silent=false){
  try{const out=await api('/api/v90/builder/config',{timeout:12000});applyInterfaceConfig(out.config||UI_DEFAULT);syncInterfaceLab(state.uiConfig,out.versions||[]);return out}catch(e){if(!silent)toast('Réglages visuels indisponibles');applyInterfaceConfig(UI_DEFAULT);return null}
}
function previewInterfaceLab(){const cfg=collectInterfaceLab();applyInterfaceConfig(cfg);syncInterfaceLab(cfg);if($('#uiDesignStatus'))$('#uiDesignStatus').textContent='Aperçu non enregistré'}
async function saveInterfaceLab(){
  const cfg=collectInterfaceLab(),b=$('#uiSaveDesign'),old=b?.textContent;if(b){b.disabled=true;b.textContent='Enregistrement…'}
  try{const out=await api('/api/v90/builder/config',{method:'PATCH',body:JSON.stringify({config:cfg,name:'V129 · Interface Lab',publish:true})});applyInterfaceConfig(out.config||cfg);syncInterfaceLab(state.uiConfig,out.versions||[]);if($('#uiDesignStatus'))$('#uiDesignStatus').textContent='Enregistré sur le site';toast('Design de l’interface enregistré')}catch{toast('Enregistrement du design impossible')}finally{if(b){b.disabled=false;b.textContent=old}}
}
function openInterfaceLab(){loadInterfaceDesign(true).finally(()=>$('#designLabOverlay')?.classList.add('open'))}
function installInterfaceLab(){
  $('#designLabButton')?.addEventListener('click',openInterfaceLab);$('#designLabClose')?.addEventListener('click',()=>$('#designLabOverlay')?.classList.remove('open'));
  ['uiAccent','uiSurface','uiDensity','uiMotion','uiSidebar'].forEach(id=>$('#'+id)?.addEventListener('change',previewInterfaceLab));
  ['uiRadius','uiFontScale'].forEach(id=>$('#'+id)?.addEventListener('input',previewInterfaceLab));
  $$('[data-ui-preset]').forEach(b=>b.onclick=()=>{const cfg={...UI_DEFAULT,...UI_PRESETS[b.dataset.uiPreset]};applyInterfaceConfig(cfg);syncInterfaceLab(cfg);if($('#uiDesignStatus'))$('#uiDesignStatus').textContent='Preset '+b.textContent+' · non enregistré'});
  $('#uiResetDesign')?.addEventListener('click',()=>{applyInterfaceConfig(UI_DEFAULT);syncInterfaceLab(UI_DEFAULT);if($('#uiDesignStatus'))$('#uiDesignStatus').textContent='Réinitialisé · non enregistré'});
  $('#uiSaveDesign')?.addEventListener('click',saveInterfaceLab);
  $('#uiRestoreVersion')?.addEventListener('click',async()=>{const id=Number($('#uiVersionPicker')?.value||0);if(!id)return toast('Choisis une version');try{const out=await api('/api/v90/builder/versions/'+id+'/restore',{method:'POST'});applyInterfaceConfig(out.config||UI_DEFAULT);syncInterfaceLab(state.uiConfig);toast('Version restaurée')}catch{toast('Restauration impossible')}});
}

function openSearch(){
  $('#searchOverlay').classList.add('open');const i=$('#commandInput');i.value='';renderCommand('');setTimeout(()=>i.focus(),60)
}
function renderCommand(term){
  term=clean(term).toLowerCase();const pages=Object.entries(viewMeta).map(([id,m])=>({type:'Page',title:m[1],id}));const opps=(state.bootstrap?.opportunities||[]).slice(0,40).map(o=>({type:'Open Call',title:o.title,id:o.id,route:'opencalls'}));const leads=state.leads.slice(0,30).map(l=>({type:'Contact',title:l.organization||l.name,id:l.id,route:'prospection'}));const docs=state.bureau.slice(0,30).map(n=>({type:'Bureau',title:n.title,id:n.id,route:'bureau'}));const drafts=state.drafts.slice(0,30).map(d=>({type:'Brouillon',title:d.title,id:d.id,route:'creation'}));const all=[...pages,...opps,...leads,...docs,...drafts].filter(x=>!term||String(x.title).toLowerCase().includes(term)).slice(0,18);$('#commandResults').innerHTML=all.map((x,i)=>'<button class="command-result" data-cmd="'+i+'"><strong>'+esc(x.title)+'</strong><span>'+esc(x.type)+'</span></button>').join('');$$('[data-cmd]').forEach((b,i)=>b.onclick=async()=>{const x=all[i];$('#searchOverlay').classList.remove('open');route(x.route||x.id);try{if(x.type==='Contact'){await ensureViewData('prospection');selectLead(x.id)}if(x.type==='Bureau'){await ensureViewData('bureau');selectDoc(x.id)}if(x.type==='Open Call'){await ensureViewData('opencalls');openOpportunity(x.id)}if(x.type==='Brouillon'){await ensureViewData('creation');loadDraft(x.id)}}catch{}})
}
$('#globalSearch')?.addEventListener('click',openSearch);$('#commandInput')?.addEventListener('input',e=>renderCommand(e.target.value));
$('#refreshData')?.addEventListener('click',loadAll);
$('#newAction')?.addEventListener('click',()=>$('#newOverlay').classList.add('open'));
$$('[data-close-overlay]').forEach(b=>b.onclick=()=>b.closest('.overlay').classList.remove('open'));
$$('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open')}));
$$('[data-create]').forEach(b=>b.onclick=()=>{const a=b.dataset.create;$('#newOverlay').classList.remove('open');if(a==='content')route('creation');if(a==='bureau'){route('bureau');clearDoc()}if(a==='lead'){route('prospection');$('#leadNew').click()}if(a==='radar'){route('radar');$('#radarRun').click()}});

$('#sidebarCollapse')?.addEventListener('click',()=>document.body.classList.toggle('sidebar-small'));
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}if(e.key==='Escape'){$$('.overlay.open').forEach(o=>o.classList.remove('open'));closePlugy()}});

function updateConversationButton(){
  const b=$('#plugyConversation');if(!b)return;
  b.classList.toggle('active',!!state.voiceConversation);
  b.setAttribute('aria-pressed',state.voiceConversation?'true':'false');
  b.title=state.voiceConversation?'Conversation continue activée':'Activer la conversation continue';
}
function installConversationButton(){
  if($('#plugyConversation'))return;
  const form=$('#plugyForm');if(!form)return;
  const b=document.createElement('button');b.type='button';b.id='plugyConversation';b.className='plugy-conversation';b.textContent='∞';b.setAttribute('aria-label','Conversation continue');b.setAttribute('aria-pressed','false');
  form.insertBefore(b,$('#plugyVoice'));
  b.onclick=()=>{
    state.voiceConversation=!state.voiceConversation;updateConversationButton();
    if(state.voiceConversation&&!state.voice&&!state.voiceReply)initVoice();
    if(!state.voiceConversation&&state.voice)try{state.recognition?.stop()}catch{}
    toast(state.voiceConversation?'Conversation continue activée':'Conversation continue désactivée');
  };
  if(!$('#plugyConversationStyle')){const st=document.createElement('style');st.id='plugyConversationStyle';st.textContent='.plugy-conversation{border:0;background:transparent;color:#9195a1;font-size:17px;font-weight:800}.plugy-conversation.active{color:#6d59d5;text-shadow:0 0 14px rgba(109,89,213,.35)}';document.head.appendChild(st)}
  updateConversationButton();
}
function resumeConversationListening(delay=360){
  if(!state.voiceConversation||state.voice||state.voiceReply||!$('#plugyDrawer')?.classList.contains('open'))return;
  setTimeout(()=>{if(state.voiceConversation&&!state.voice&&!state.voiceReply) initVoice()},delay);
}


let plugySpeechVoice=null;
function resolvePlugySpeechVoice(){
  if(!('speechSynthesis' in window))return null;
  const voices=speechSynthesis.getVoices?.()||[];
  const fr=voices.filter(v=>/^fr([-_]|$)/i.test(v.lang||''));
  plugySpeechVoice=(fr.find(v=>v.localService)||fr[0]||voices.find(v=>/^fr/i.test(v.lang||''))||null);
  return plugySpeechVoice;
}
function primePlugySpeech(){
  if(!('speechSynthesis' in window))return;
  try{speechSynthesis.resume();resolvePlugySpeechVoice()}catch{}
}
if('speechSynthesis' in window){
  resolvePlugySpeechVoice();
  try{speechSynthesis.addEventListener?.('voiceschanged',resolvePlugySpeechVoice)}catch{}
}

function speakPlugy(text){
  text=clean(text);if(!text||!('speechSynthesis' in window)){state.voiceReply=false;return}
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='fr-FR';u.rate=1.12;u.pitch=1;u.volume=1;const voice=plugySpeechVoice||resolvePlugySpeechVoice();if(voice)u.voice=voice;u.onstart=()=>{$('#plugyState span').textContent='Parle…';playMotion('Speak',true)};u.onend=()=>{$('#plugyState span').textContent='Prêt';state.voiceReply=false;playMotion('Idle',true);resumeConversationListening(420)};u.onerror=()=>{state.voiceReply=false;playMotion('Idle',true);resumeConversationListening(650)};speechSynthesis.speak(u)}catch{state.voiceReply=false}
}

async function initVoice(){
  primePlugySpeech();
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){toast('Reconnaissance vocale indisponible');return}
  if(state.voice){state.recognition?.stop();return}
  let accepted=false;const rec=new R();state.recognition=rec;rec.lang='fr-FR';rec.interimResults=false;rec.continuous=false;rec.maxAlternatives=3;state.voice=true;state.voiceReply=true;try{speechSynthesis?.cancel?.()}catch{}$('#plugyState span').textContent='Écoute…';playMotion('Listen',true);
  rec.onresult=e=>{
    const last=e.results?.[e.results.length-1];if(!last)return;
    const alternatives=Array.from(last),alt=alternatives.sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0]||last[0];
    const text=clean(alt?.transcript||''),confidence=Number(alt?.confidence||0);
    if(text)$('#plugyInput').value=text;
    if(!last.isFinal)return;
    const noise=/^(euh|heu|hum+|hmm+|ah+|oh+|hein|mm+)$/i.test(text);
    const lowConfidence=confidence>0&&confidence<.35;
    if(text.length>1&&!noise&&!lowConfidence){
      accepted=true;state.voice=false;askPlugy(text);return;
    }
    state.voice=false;state.voiceReply=false;$('#plugyState span').textContent='Je réécoute…';playMotion('SoftTurn');resumeConversationListening(650);
  };
  rec.onend=()=>{state.voice=false;if(!accepted){state.voiceReply=false;$('#plugyState span').textContent='Prêt';playMotion('Idle',true);resumeConversationListening(650)}};
  rec.onerror=e=>{
    state.voice=false;state.voiceReply=false;
    const fatal=['not-allowed','service-not-allowed','audio-capture'].includes(e?.error);
    if(fatal){state.voiceConversation=false;updateConversationButton()}
    const retryDelay=['no-speech','aborted'].includes(e?.error)?750:1000;
    $('#plugyState span').textContent=fatal?'Micro indisponible':'Je réécoute…';playMotion('SoftTurn');
    setTimeout(()=>{if($('#plugyState span'))$('#plugyState span').textContent='Prêt';if(!fatal)resumeConversationListening(retryDelay)},450);
  };
  try{rec.start()}catch{state.voice=false;state.voiceReply=false;resumeConversationListening(800)}
}
$('#plugyVoice')?.addEventListener('click',()=>{primePlugySpeech();initVoice()});
installConversationButton();

const DASH_BOOT_CACHE='plugart:v124:dashboard-bootstrap';
function applyDashboardBoot(boot){
  if(!boot||typeof boot!=='object')return false;
  state.bootstrap=boot;
  state.bureau=Array.isArray(boot.bureau)?boot.bureau:[];
  state.leads=Array.isArray(boot.leads)?boot.leads:[];
  state.workflow=Array.isArray(boot.workflow)?boot.workflow:[];
  state.drafts=Array.isArray(boot.drafts)?boot.drafts:[];
  return true;
}
function readDashboardBootCache(){
  try{
    const raw=sessionStorage.getItem(DASH_BOOT_CACHE);if(!raw)return null;
    const payload=JSON.parse(raw);
    if(!payload?.savedAt||Date.now()-payload.savedAt>120000||!payload.boot)return null;
    return payload.boot;
  }catch{return null}
}
function writeDashboardBootCache(boot){
  try{sessionStorage.setItem(DASH_BOOT_CACHE,JSON.stringify({savedAt:Date.now(),boot}))}catch{}
}
async function loadAll(){
  state.dataLoaded={opportunities:false,artists:false,map:false,bureau:false,bureauMeta:false,leads:false,workflow:false,drafts:false};state.dataPromises={};
  const cached=readDashboardBootCache();
  if(cached&&applyDashboardBoot(cached)){renderDashboard();renderNavBadges()}
  try{
    const boot=await api('/api/v124/dashboard-bootstrap',{timeout:8000,cache:'default'});
    applyDashboardBoot(boot);writeDashboardBootCache(boot);
    renderDashboard();renderNavBadges();
    if(requiredFamilies(state.view).length){
      await ensureViewData(state.view,true);
      renderRouteView(state.view);
    }else if(state.view!=='dashboard')renderRouteView(state.view);
    toast(cached?'Workspace actualisé':'Workspace synchronisé');
  }catch(e){
    console.warn('[PLUG ART V124]',e);
    renderNavBadges();renderRouteView(state.view);toast(cached?'Mode instantané · actualisation différée':'Synchronisation partielle');
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
  if(prospect&&!$('.nav-item[data-route="agenda"]')){
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

const creationHistory=[],creationRedo=[];
function creationSnapshotLocal(){
  try{return JSON.parse(JSON.stringify(draftSnapshot()))}catch{return null}
}
function pushCreationHistory(){
  const snap=creationSnapshotLocal();if(!snap)return;
  const raw=JSON.stringify(snap),last=creationHistory.length?JSON.stringify(creationHistory[creationHistory.length-1]):'';
  if(raw===last)return;
  creationHistory.push(snap);if(creationHistory.length>30)creationHistory.shift();creationRedo.length=0;syncCreationHistoryButtons();
}
function restoreCreationHistory(snap){
  if(!snap)return;
  const draft=state.currentDraft;applyCreationSnapshot(JSON.parse(JSON.stringify(snap)));state.currentDraft=draft;state.creationDirty=true;renderDraftPicker();syncCreationHistoryButtons();
}
function undoCreation(){
  if(!creationHistory.length)return toast('Rien à annuler');
  const current=creationSnapshotLocal();if(current)creationRedo.push(current);
  restoreCreationHistory(creationHistory.pop());
}
function redoCreation(){
  if(!creationRedo.length)return toast('Rien à rétablir');
  const current=creationSnapshotLocal();if(current)creationHistory.push(current);
  restoreCreationHistory(creationRedo.pop());
}
function syncCreationHistoryButtons(){
  const u=$('#creationUndo'),r=$('#creationRedo');if(u)u.disabled=!creationHistory.length;if(r)r.disabled=!creationRedo.length;
}
function setCreationPreviewZoom(){
  const scale=Number($('#creationZoom')?.value||1);
  const target=state.creationMode==='carousel'?$('#carouselCanvas'):state.creationMode==='visual'?$('#visualImage'):$('#textCreationPanel');
  [$('#carouselCanvas'),$('#visualImage'),$('#textCreationPanel')].forEach(el=>{if(el){el.style.transform='';el.style.transformOrigin='center top'}});
  if(target){target.style.transform='scale('+scale+')';target.style.transformOrigin='center top'}
}

function slideLayers(s){
  if(!s)return[];
  if(!Array.isArray(s.layers))s.layers=[];
  return s.layers;
}
function activeCanvasLayer(){
  const s=state.carousel.slides[state.carousel.active];if(!s)return null;
  return slideLayers(s).find(l=>String(l.id)===String(state.canvasLayer))||null;
}
function newLayerId(){return 'ly-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)}

function renderStudioCanvasAids(){
  const canvas=$('#carouselCanvas');if(!canvas)return;
  canvas.classList.toggle('show-guides',!!state.studioGuides);
  canvas.classList.toggle('show-safe',!!state.studioSafe);
  canvas.classList.toggle('snap-enabled',!!state.studioSnap);
  const g=$('#stageGuidesToggle'),s=$('#stageSafeToggle'),n=$('#stageSnapToggle');
  if(g)g.classList.toggle('active',!!state.studioGuides);
  if(s)s.classList.toggle('active',!!state.studioSafe);
  if(n)n.classList.toggle('active',!!state.studioSnap);
}
function snapLayerPosition(l,x,y){
  if(!state.studioSnap)return{x,y,snapX:false,snapY:false};
  const w=Number(l.w||20),h=Number(l.h||12);let sx=false,sy=false;
  const safe=5,threshold=1.6;
  const cx=x+w/2,cy=y+h/2;
  if(Math.abs(cx-50)<threshold){x=50-w/2;sx=true}
  else if(Math.abs(x-safe)<threshold){x=safe;sx=true}
  else if(Math.abs((x+w)-(100-safe))<threshold){x=100-safe-w;sx=true}
  if(Math.abs(cy-50)<threshold){y=50-h/2;sy=true}
  else if(Math.abs(y-safe)<threshold){y=safe;sy=true}
  else if(Math.abs((y+h)-(100-safe))<threshold){y=100-safe-h;sy=true}
  return{x:Math.max(0,Math.min(100-w,x)),y:Math.max(0,Math.min(100-h,y)),snapX:sx,snapY:sy};
}
function setCanvasSnapIndicators(x=false,y=false){
  const canvas=$('#carouselCanvas');if(!canvas)return;
  canvas.classList.toggle('snap-x',!!x);canvas.classList.toggle('snap-y',!!y);
}
function layerLabel(l){
  if(!l)return'Élément';
  if(l.type==='text')return clean(l.text||'Texte').slice(0,28)||'Texte';
  if(l.type==='image')return'Image';
  return l.shape==='circle'?'Cercle':l.shape==='pill'?'Pill':l.shape==='line'?'Ligne':'Forme';
}
function renderLayerList(){
  const box=$('#studioLayerList');if(!box)return;
  const s=state.carousel.slides[state.carousel.active],layers=slideLayers(s);
  const ordered=layers.map((l,i)=>({l,i})).reverse();
  box.innerHTML=ordered.map(({l,i})=>'<div class="studio-layer-row '+(String(l.id)===String(state.canvasLayer)?'active':'')+'" draggable="true" data-layer-row="'+esc(l.id)+'" data-layer-index="'+i+'"><button class="layer-row-main" data-layer-select="'+esc(l.id)+'"><i>'+(l.type==='text'?'T':l.type==='image'?'▧':'◯')+'</i><span><strong>'+esc(layerLabel(l))+'</strong><small>'+esc(l.type)+'</small></span></button><button data-layer-visible="'+esc(l.id)+'" title="Afficher/masquer">'+(l.hidden?'○':'●')+'</button><button data-layer-lock="'+esc(l.id)+'" title="Verrouiller">'+(l.locked?'🔒':'🔓')+'</button></div>').join('')||'<div class="studio-layer-empty">Ajoute du texte, une image ou une forme.</div>';
  $$('[data-layer-select]',box).forEach(b=>b.onclick=()=>{state.canvasLayer=b.dataset.layerSelect;renderCanvasLayers();openStudioRailPane('style')});
  $$('[data-layer-visible]',box).forEach(b=>b.onclick=e=>{e.stopPropagation();const l=layers.find(x=>String(x.id)===String(b.dataset.layerVisible));if(!l)return;pushCreationHistory();l.hidden=!l.hidden;renderCanvasLayers();scheduleDraftAutosave()});
  $$('[data-layer-lock]',box).forEach(b=>b.onclick=e=>{e.stopPropagation();const l=layers.find(x=>String(x.id)===String(b.dataset.layerLock));if(!l)return;pushCreationHistory();l.locked=!l.locked;renderCanvasLayers();scheduleDraftAutosave()});
  $$('[data-layer-row]',box).forEach(row=>{
    row.ondragstart=e=>{e.dataTransfer.setData('text/plain',row.dataset.layerRow);e.dataTransfer.effectAllowed='move'};
    row.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
    row.ondrop=e=>{e.preventDefault();const fromId=e.dataTransfer.getData('text/plain'),toId=row.dataset.layerRow;if(!fromId||fromId===toId)return;const from=layers.findIndex(x=>String(x.id)===String(fromId)),to=layers.findIndex(x=>String(x.id)===String(toId));if(from<0||to<0)return;pushCreationHistory();const moved=layers.splice(from,1)[0];layers.splice(to,0,moved);state.canvasLayer=moved.id;renderCanvasLayers();scheduleDraftAutosave()};
  });
}
function alignLayerToPage(mode){
  const l=activeCanvasLayer();if(!l||l.locked)return;
  pushCreationHistory();
  const w=Number(l.w||20),h=Number(l.h||12);
  if(mode==='left')l.x=5;if(mode==='center')l.x=(100-w)/2;if(mode==='right')l.x=95-w;
  if(mode==='top')l.y=5;if(mode==='middle')l.y=(100-h)/2;if(mode==='bottom')l.y=95-h;
  renderCanvasLayers();scheduleDraftAutosave();
}
function syncCanvasContextToolbar(){
  const bar=$('#canvasContextToolbar'),l=activeCanvasLayer();if(!bar)return;
  bar.hidden=!l;
  bar.classList.toggle('locked',!!l?.locked);
  const lock=bar.querySelector('[data-canvas-action="lock"]');if(lock)lock.textContent=l?.locked?'Déverrouiller':'Verrou';
}
function runCanvasAction(action){
  const l=activeCanvasLayer();if(!l&&action!=='none')return;
  if(['left','center','middle','right','top','bottom'].includes(action))return alignLayerToPage(action);
  if(action==='duplicate')return duplicateCanvasLayer();
  if(action==='back')return moveCanvasLayer('back');
  if(action==='front')return moveCanvasLayer('front');
  if(action==='lock'){pushCreationHistory();l.locked=!l.locked;renderCanvasLayers();scheduleDraftAutosave();return}
  if(action==='delete')return deleteCanvasLayer();
}
function installStudioKeyboard(){
  if(installStudioKeyboard.done)return;installStudioKeyboard.done=true;
  addEventListener('keydown',e=>{
    if(state.view!=='creation'||state.creationMode!=='carousel')return;
    const tag=String(e.target?.tagName||'').toLowerCase(),editing=['input','textarea','select'].includes(tag)||e.target?.isContentEditable;
    const l=activeCanvasLayer(),meta=e.metaKey||e.ctrlKey;
    if(meta&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redoCreation():undoCreation();return}
    if(meta&&e.key.toLowerCase()==='d'&&l&&!editing){e.preventDefault();duplicateCanvasLayer();return}
    if(meta&&e.key===']'&&l&&!editing){e.preventDefault();moveCanvasLayer('front');return}
    if(meta&&e.key==='['&&l&&!editing){e.preventDefault();moveCanvasLayer('back');return}
    if(editing||!l)return;
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteCanvasLayer();return}
    if(e.key==='Escape'){state.canvasLayer=null;renderCanvasLayers();return}
    const step=e.shiftKey?2:.5;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))pushCreationHistory();
    if(e.key==='ArrowLeft'){e.preventDefault();l.x=Math.max(0,Number(l.x||0)-step)}
    else if(e.key==='ArrowRight'){e.preventDefault();l.x=Math.min(100-Number(l.w||20),Number(l.x||0)+step)}
    else if(e.key==='ArrowUp'){e.preventDefault();l.y=Math.max(0,Number(l.y||0)-step)}
    else if(e.key==='ArrowDown'){e.preventDefault();l.y=Math.min(100-Number(l.h||12),Number(l.y||0)+step)}
    else return;
    updateCanvasLayerVisual(l);syncLayerInspector();renderLayerList();scheduleDraftAutosave();
  });
}

function addCanvasLayer(type,payload={}){
  const s=state.carousel.slides[state.carousel.active];if(!s)return toast('Crée ou charge une slide');
  pushCreationHistory();
  const defaults=type==='text'
    ?{type:'text',text:'Nouveau texte',x:12,y:14,w:62,h:12,size:26,weight:700,color:'#111318',opacity:1,align:'left',fontFamily:'Inter',lineHeight:1.05,letterSpacing:0,rotate:0,locked:false}
    :type==='image'
      ?{type:'image',src:state.visual.url||'',x:18,y:18,w:52,h:38,opacity:1,radius:18,rotate:0,locked:false}
      :{type:'shape',shape:'rect',x:18,y:20,w:34,h:18,opacity:.92,color:'#7657ff',radius:22,rotate:0,locked:false};
  const layer={id:newLayerId(),...defaults,...payload};
  slideLayers(s).push(layer);state.canvasLayer=layer.id;renderCarousel();scheduleDraftAutosave();
}
function duplicateCanvasLayer(){
  const s=state.carousel.slides[state.carousel.active],l=activeCanvasLayer();if(!s||!l)return;
  pushCreationHistory();const copy=JSON.parse(JSON.stringify(l));copy.id=newLayerId();copy.x=Math.min(90,(copy.x||0)+4);copy.y=Math.min(90,(copy.y||0)+4);slideLayers(s).push(copy);state.canvasLayer=copy.id;renderCarousel();scheduleDraftAutosave();
}
function deleteCanvasLayer(){
  const s=state.carousel.slides[state.carousel.active];if(!s||!state.canvasLayer)return;
  pushCreationHistory();s.layers=slideLayers(s).filter(l=>String(l.id)!==String(state.canvasLayer));state.canvasLayer=null;renderCarousel();scheduleDraftAutosave();
}
function moveCanvasLayer(dir){
  const s=state.carousel.slides[state.carousel.active],layers=slideLayers(s),idx=layers.findIndex(l=>String(l.id)===String(state.canvasLayer));if(idx<0)return;
  pushCreationHistory();const [l]=layers.splice(idx,1);if(dir==='front')layers.push(l);else layers.unshift(l);renderCarousel();scheduleDraftAutosave();
}
function layerStyle(l){
  const families={Inter:'Inter, sans-serif',Space:'"Space Grotesk", sans-serif',Serif:'Georgia, serif',Mono:'ui-monospace, SFMono-Regular, Menlo, monospace'};
  return (l.hidden?'display:none;':'')+'left:'+Number(l.x||0)+'%;top:'+Number(l.y||0)+'%;width:'+Number(l.w||20)+'%;height:'+Number(l.h||12)+'%;opacity:'+Number(l.opacity??1)+';transform:rotate('+Number(l.rotate||0)+'deg);'+
    (l.type==='text'?'color:'+esc(l.color||'#111318')+';font-size:'+Number(l.size||24)+'px;font-weight:'+Number(l.weight||700)+';text-align:'+(l.align||'left')+';font-family:'+(families[l.fontFamily]||families.Inter)+';line-height:'+Number(l.lineHeight||1.05)+';letter-spacing:'+Number(l.letterSpacing||0)+'px;':'')+
    (l.type==='shape'?'background:'+esc(l.color||'#7657ff')+';border-radius:'+Number(l.radius||18)+'px;':'')+
    (l.type==='image'?'border-radius:'+Number(l.radius||18)+'px;':'');
}
function renderCanvasLayers(){
  const box=$('#canvasLayers');if(!box)return;
  const s=state.carousel.slides[state.carousel.active],layers=slideLayers(s);
  box.innerHTML=layers.map(l=>{
    const selected=String(l.id)===String(state.canvasLayer)?' selected':'';
    const inner=l.type==='text'?'<span contenteditable="true" spellcheck="false">'+esc(l.text||'Texte')+'</span>':l.type==='image'?(l.src?'<img src="'+esc(l.src)+'" alt="">':'<span class="layer-placeholder">Image</span>'):'';
    return '<div class="canvas-layer layer-'+esc(l.type)+selected+(l.locked?' locked':'')+'" data-layer-id="'+esc(l.id)+'" style="'+layerStyle(l)+'">'+inner+'<i class="layer-resize"></i></div>';
  }).join('');
  $$$('[data-layer-id]',box).forEach(el=>{
    const id=el.dataset.layerId,l=layers.find(x=>String(x.id)===String(id));if(!l)return;
    el.addEventListener('pointerdown',e=>{
      if(e.target.classList.contains('layer-resize'))return;
      if(l.locked){state.canvasLayer=id;syncLayerInspector();if(!matchMedia('(max-width:820px)').matches)openStudioRailPane('style');return;}
      state.canvasLayer=id;$$('[data-layer-id]',box).forEach(x=>x.classList.toggle('selected',x===el));syncLayerInspector();if(!matchMedia('(max-width:820px)').matches)openStudioRailPane('style');
      pushCreationHistory();const canvas=$('#carouselCanvas'),r=canvas.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=Number(l.x||0),oy=Number(l.y||0);el.setPointerCapture?.(e.pointerId);
      const move=ev=>{const rawX=ox+(ev.clientX-sx)/r.width*100,rawY=oy+(ev.clientY-sy)/r.height*100,snap=snapLayerPosition(l,rawX,rawY);l.x=snap.x;l.y=snap.y;el.style.left=l.x+'%';el.style.top=l.y+'%';setCanvasSnapIndicators(snap.snapX,snap.snapY)};
      const up=()=>{setCanvasSnapIndicators(false,false);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);renderLayerList();scheduleDraftAutosave()};
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);
    });
    el.querySelector('.layer-resize')?.addEventListener('pointerdown',e=>{
      e.stopPropagation();state.canvasLayer=id;syncLayerInspector();if(!matchMedia('(max-width:820px)').matches)openStudioRailPane('style');if(l.locked)return;pushCreationHistory();const canvas=$('#carouselCanvas'),r=canvas.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ow=Number(l.w||20),oh=Number(l.h||12);el.setPointerCapture?.(e.pointerId);
      const move=ev=>{l.w=Math.max(8,Math.min(94,ow+(ev.clientX-sx)/r.width*100));l.h=Math.max(5,Math.min(94,oh+(ev.clientY-sy)/r.height*100));el.style.width=l.w+'%';el.style.height=l.h+'%'};
      const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);scheduleDraftAutosave()};
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);
    });
    const editable=el.querySelector('[contenteditable="true"]');
    editable?.addEventListener('input',()=>{l.text=editable.innerText;scheduleDraftAutosave()});
    editable?.addEventListener('pointerdown',e=>e.stopPropagation());
  });
  syncLayerInspector();renderLayerList();syncCanvasContextToolbar();renderStudioCanvasAids();
}
function updateCanvasLayerVisual(l){
  if(!l)return;
  const el=$$('[data-layer-id]').find(x=>String(x.dataset.layerId)===String(l.id));
  if(!el)return;
  el.setAttribute('style',layerStyle(l));
  el.classList.toggle('locked',!!l.locked);
}
function syncLayerInspector(){
  const l=activeCanvasLayer(),box=$('#layerInspector');if(!box)return;
  box.classList.toggle('empty',!l);
  if(!l){box.innerHTML='<span>Sélectionne un élément sur le canvas.</span>';return}
  const range=(id,label,min,max,value,step='1',unit='')=>'<label class="layer-control"><span>'+label+' <output id="'+id+'Out">'+value+unit+'</output></span><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></label>';
  box.innerHTML='<div class="layer-inspector-head"><strong>'+esc(l.type==='text'?'Texte':l.type==='image'?'Image':'Élément')+'</strong><div><button id="layerLock" title="Verrouiller">'+(l.locked?'🔒':'🔓')+'</button><button id="layerDelete" title="Supprimer">×</button></div></div>'+
    '<div class="layer-control-grid">'+
      range('layerX','X',0,92,Math.round(Number(l.x||0)),1,'%')+
      range('layerY','Y',0,92,Math.round(Number(l.y||0)),1,'%')+
      range('layerW','Largeur',8,94,Math.round(Number(l.w||20)),1,'%')+
      range('layerH','Hauteur',5,94,Math.round(Number(l.h||12)),1,'%')+
    '</div>'+
    range('layerRotate','Rotation',-180,180,Math.round(Number(l.rotate||0)),1,'°')+
    range('layerOpacity','Opacité',10,100,Math.round(Number(l.opacity??1)*100),1,'%')+
    (l.type==='text'
      ?'<div class="layer-typography">'+
        '<label>Police<select id="layerFontFamily"><option value="Inter">Inter</option><option value="Space">Space Grotesk</option><option value="Serif">Serif</option><option value="Mono">Mono</option></select></label>'+
        '<label>Graisse<select id="layerWeight"><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi Bold</option><option value="700">Bold</option><option value="800">Extra Bold</option><option value="900">Black</option></select></label>'+
        range('layerSize','Taille',10,110,Number(l.size||26),1,' px')+
        range('layerLineHeight','Interligne',0.8,2,Number(l.lineHeight||1.05),0.05,'×')+
        range('layerLetterSpacing','Espacement',-2,10,Number(l.letterSpacing||0),0.25,' px')+
        '<label>Alignement<select id="layerAlign"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label>'+
        '<label>Couleur<input id="layerColor" type="color" value="'+esc(l.color||'#111318')+'"></label>'+
       '</div>'
      :l.type==='shape'
        ?'<label>Couleur<input id="layerColor" type="color" value="'+esc(l.color||'#7657ff')+'"></label>'+range('layerRadius','Arrondis',0,80,Number(l.radius||18),1,' px')
        :range('layerRadius','Arrondis',0,80,Number(l.radius||18),1,' px'))+
    '<div class="layer-position-actions"><small>POSITION SUR LA PAGE</small><div><button data-layer-align="left">Gauche</button><button data-layer-align="center">Centre</button><button data-layer-align="right">Droite</button><button data-layer-align="top">Haut</button><button data-layer-align="middle">Milieu</button><button data-layer-align="bottom">Bas</button></div></div>'+
    '<div class="layer-order-actions"><button id="layerBack">Arrière</button><button id="layerDuplicate">Dupliquer</button><button id="layerFront">Avant</button></div>';
  const bind=(id,key,transform=v=>Number(v),unit='')=>$('#'+id)?.addEventListener('input',e=>{
    l[key]=transform(e.target.value);const o=$('#'+id+'Out');if(o)o.textContent=String(e.target.value)+unit;updateCanvasLayerVisual(l);scheduleDraftAutosave()
  });
  bind('layerX','x',v=>Number(v),'%');bind('layerY','y',v=>Number(v),'%');bind('layerW','w',v=>Number(v),'%');bind('layerH','h',v=>Number(v),'%');
  bind('layerRotate','rotate',v=>Number(v),'°');bind('layerOpacity','opacity',v=>Number(v)/100,'%');bind('layerSize','size',v=>Number(v),' px');bind('layerRadius','radius',v=>Number(v),' px');
  bind('layerLineHeight','lineHeight',v=>Number(v),'×');bind('layerLetterSpacing','letterSpacing',v=>Number(v),' px');
  if($('#layerFontFamily')){$('#layerFontFamily').value=l.fontFamily||'Inter';$('#layerFontFamily').onchange=e=>{l.fontFamily=e.target.value;updateCanvasLayerVisual(l);scheduleDraftAutosave()}}
  if($('#layerWeight')){$('#layerWeight').value=String(l.weight||700);$('#layerWeight').onchange=e=>{l.weight=Number(e.target.value);updateCanvasLayerVisual(l);scheduleDraftAutosave()}}
  if($('#layerAlign')){$('#layerAlign').value=l.align||'left';$('#layerAlign').onchange=e=>{l.align=e.target.value;updateCanvasLayerVisual(l);scheduleDraftAutosave()}}
  $('#layerColor')?.addEventListener('input',e=>{l.color=e.target.value;updateCanvasLayerVisual(l);scheduleDraftAutosave()});
  $('#layerLock')?.addEventListener('click',()=>{l.locked=!l.locked;renderCanvasLayers();scheduleDraftAutosave()});
  $$('[data-layer-align]',box).forEach(b=>b.onclick=()=>alignLayerToPage(b.dataset.layerAlign));
  $('#layerDelete')?.addEventListener('click',deleteCanvasLayer);$('#layerDuplicate')?.addEventListener('click',duplicateCanvasLayer);$('#layerBack')?.addEventListener('click',()=>moveCanvasLayer('back'));$('#layerFront')?.addEventListener('click',()=>moveCanvasLayer('front'));
}
function setStudioTool(tool){
  state.canvasTool=tool;$$('[data-studio-tool]').forEach(b=>b.classList.toggle('active',b.dataset.studioTool===tool));$$('[data-tool-panel]').forEach(p=>p.classList.toggle('active',p.dataset.toolPanel===tool));
}

function ensureUnifiedStudioRail(){
  const panel=$('#carouselCreationPanel'),library=panel?.querySelector('.studio-library'),inspector=panel?.querySelector('.studio-inspector'),stage=panel?.querySelector('.studio-stage');
  if(!panel||!library||!inspector||!stage||$('#studioUnifiedTabs'))return;
  const nav=document.createElement('div');nav.id='studioUnifiedTabs';nav.className='studio-unified-tabs';
  nav.innerHTML='<button class="active" data-studio-pane="templates"><b>▦</b><span>Modèles</span></button><button data-studio-pane="images"><b>▧</b><span>Médias</span></button><button data-studio-pane="text"><b>Aa</b><span>Texte</span></button><button data-studio-pane="elements"><b>◯</b><span>Éléments</span></button><button data-studio-pane="layers"><b>≡</b><span>Calques</span></button><button data-studio-pane="style"><b>⌁</b><span>Style</span></button>';
  panel.insertBefore(nav,library);
  library.classList.add('rail-active');inspector.classList.remove('rail-active');
  $$('[data-studio-pane]',nav).forEach(b=>b.onclick=()=>openStudioRailPane(b.dataset.studioPane));
}
function openStudioRailPane(pane,mobile=false){
  const panel=$('#carouselCreationPanel'),library=panel?.querySelector('.studio-library'),inspector=panel?.querySelector('.studio-inspector'),dock=$('#mobileStudioDock');
  if(!library||!inspector)return;
  const style=pane==='style'||pane==='inspector';
  library.classList.toggle('rail-active',!style);
  inspector.classList.toggle('rail-active',style);
  $$('[data-studio-pane]').forEach(b=>b.classList.toggle('active',b.dataset.studioPane===(style?'style':pane)));
  if(!style)setStudioTool(pane);
  if(matchMedia('(max-width:820px)').matches||mobile){
    library.classList.toggle('mobile-open',!style);
    inspector.classList.toggle('mobile-open',style);
    dock?.classList.add('sheet-open');
    $$('[data-mobile-studio]',dock).forEach(b=>b.classList.toggle('active',(style?'style':pane)===b.dataset.mobileStudio));
  }
}

function processCanvasUpload(file){
  if(!file)return;
  const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{
    const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    addCanvasLayer('image',{src:c.toDataURL('image/jpeg',.82),w:55,h:Math.max(22,55*c.height/c.width)});
  };img.src=String(reader.result)};reader.readAsDataURL(file);
}
function renderStudioImages(){
  const box=$('#studioImageLibrary');if(!box)return;
  const urls=[];if(state.visual.url)urls.push({url:state.visual.url,label:'Dernier visuel'});
  state.carousel.slides.forEach((s,i)=>{if(s.image)urls.push({url:s.image,label:'Slide '+(i+1)})});
  box.innerHTML=urls.slice(0,12).map((x,i)=>'<button data-studio-image="'+i+'" style="background-image:url(&quot;'+esc(x.url).replace(/"/g,'%22')+'&quot;)"><span>'+esc(x.label)+'</span></button>').join('')||'<div class="studio-image-empty">Tes images générées apparaîtront ici.</div>';
  $$('[data-studio-image]',box).forEach(b=>b.onclick=()=>{const x=urls[Number(b.dataset.studioImage)];if(x)addCanvasLayer('image',{src:x.url})});
}

const MARKETING_TEMPLATES={
  'open-call':{label:'Open Call',count:5,theme:'ultra',accent:'black',layout:'editorial',slides:[
    ['OPEN CALL','Titre de l’opportunité','Lieu · deadline · discipline','Découvrir →'],
    ['POUR QUI','À qui s’adresse cet appel ?','Résume les critères importants.','Vérifier →'],
    ['LE PROJET','Pourquoi c’est intéressant','Explique la proposition sans surcharger.','Voir plus →'],
    ['INFOS','Les détails à retenir','Deadline · frais · lieu · format','Enregistrer'],
    ['ACTION','Prêt à candidater ?','Vérifie la source officielle avant envoi.','PLUG 🔌']
  ]},
  event:{label:'Événement',count:5,theme:'editorial',accent:'violet',layout:'split',slides:[
    ['ÉVÉNEMENT','Nom de l’exposition','Date · lieu · artistes','Découvrir →'],
    ['À VOIR','Une raison de venir','Mets en avant l’expérience ou le thème.','Explorer →'],
    ['PROGRAMME','Temps forts','Vernissage · rencontres · programmation','Voir le programme'],
    ['PRATIQUE','Prépare ta visite','Adresse · horaires · accès','Enregistrer'],
    ['RENDEZ-VOUS','On s’y retrouve ?','Une conclusion courte et claire.','Partager →']
  ]},
  'last-call':{label:'Dernier appel',count:4,theme:'night',accent:'pink',layout:'poster',slides:[
    ['DERNIER APPEL','Deadline imminente','L’essentiel immédiatement visible.','Candidater →'],
    ['À SAVOIR','Les critères clés','Discipline · lieu · frais · éligibilité','Vérifier →'],
    ['POURQUOI','Pourquoi regarder maintenant','Une raison concrète et factuelle.','Découvrir →'],
    ['ACTION','Dernière vérification','Consulte la source officielle avant envoi.','PLUG 🔌']
  ]},
  artist:{label:'Focus artiste',count:5,theme:'soft',accent:'pink',layout:'editorial',slides:[
    ['FOCUS ARTISTE','Nom de l’artiste','Discipline · ville · univers','Découvrir →'],
    ['PRATIQUE','Sa démarche','Une idée forte, pas une biographie entière.','Explorer →'],
    ['ŒUVRE','Ce qui distingue son travail','Matière · geste · sujet · technique','Voir →'],
    ['PARCOURS','Repères','Expositions · projets · collaborations','En savoir plus'],
    ['À SUIVRE','Retrouver l’artiste','Lien, exposition ou prochaine actualité.','Suivre →']
  ]},
  partnership:{label:'Partenariat',count:4,theme:'ultra',accent:'cyan',layout:'minimal',slides:[
    ['PARTENARIAT','Une collaboration qui a du sens','Présente la valeur commune.','Découvrir →'],
    ['OBJECTIF','Ce que le projet apporte','Audience · lieu · expérience · visibilité','Comprendre →'],
    ['FORMAT','Comment ça fonctionne','Activation · exposition · contenu · événement','Voir le projet'],
    ['CONTACT','Construisons la suite','CTA simple et professionnel.','Nous contacter →']
  ]}
};
const VISUAL_PRESETS={
  campaign:{label:'Campagne',style:'editorial',ratio:'4:5',prompt:'Campagne artistique premium, composition publicitaire contemporaine, espace négatif maîtrisé, lumière éditoriale, sujet central fort, esthétique galerie et direction artistique haut de gamme.'},
  event:{label:'Événement',style:'gallery',ratio:'4:5',prompt:'Visuel d’annonce pour exposition contemporaine, image forte adaptée à une affiche et à Instagram, composition éditoriale, matière artistique, lumière de galerie, espace réservé pour une future titraille.'},
  artist:{label:'Portrait artiste',style:'photo',ratio:'4:5',prompt:'Portrait éditorial d’artiste contemporain, lumière studio premium, environnement atelier ou galerie, naturel, crédible, magazine culturel haut de gamme.'},
  story:{label:'Story',style:'editorial',ratio:'9:16',prompt:'Visuel vertical Instagram Story pour art contemporain, composition dynamique mais élégante, profondeur, espace négatif pour interface et titrage, esthétique premium.'},
  partnership:{label:'Partenariat',style:'editorial',ratio:'1:1',prompt:'Visuel de partenariat culturel premium, deux univers qui se rencontrent, composition sobre et institutionnelle, esthétique contemporaine, espace négatif, rendu haut de gamme.'},
  launch:{label:'Lancement',style:'art',ratio:'4:5',prompt:'Key visual de lancement créatif, art contemporain, impact immédiat, composition campagne, profondeur, matière et lumière contrôlées, premium et mémorable.'}
};
function makeMarketingSlides(key){
  const t=MARKETING_TEMPLATES[key]||MARKETING_TEMPLATES['open-call'];
  return t.slides.map(([kicker,title,body,cta])=>({kicker,title,body,cta,image:'',image_prompt:'',design:{theme:t.theme,layout:t.layout,accent:t.accent,align:'left',fontScale:100,imageOpacity:t.layout==='split'?82:60,radius:28}}));
}
function applyMarketingTemplate(key){
  const t=MARKETING_TEMPLATES[key];if(!t)return;
  pushCreationHistory();setCreationMode('carousel');
  state.carousel.slides=makeMarketingSlides(key);state.carousel.active=0;
  if($('#carouselCount'))$('#carouselCount').value=String(t.count);
  if($('#carouselBrief'))$('#carouselBrief').value='Template '+t.label+' · Remplace les textes par les informations réelles ou demande à PLUGY de générer depuis une source.';
  renderCarousel();scheduleDraftAutosave();toast('Template '+t.label+' chargé');
}
function applyVisualPreset(key){
  const p=VISUAL_PRESETS[key];if(!p)return;
  setCreationMode('visual');
  if($('#visualUseCase'))$('#visualUseCase').value=key;
  if($('#visualStyle'))$('#visualStyle').value=p.style;
  if($('#visualRatio'))$('#visualRatio').value=p.ratio;
  if($('#visualPrompt'))$('#visualPrompt').value=p.prompt;
  $$('[data-visual-preset]').forEach(b=>b.classList.toggle('active',b.dataset.visualPreset===key));
  scheduleDraftAutosave();
}

function installMobileStudioDock(){
  if($('#mobileStudioDock'))return;
  const panel=$('#carouselCreationPanel'),library=panel?.querySelector('.studio-library'),inspector=panel?.querySelector('.studio-inspector'),stage=panel?.querySelector('.studio-stage');
  if(!panel||!library||!inspector||!stage)return;
  const dock=document.createElement('div');dock.id='mobileStudioDock';dock.className='studio-mobile-dock';
  dock.innerHTML='<button data-mobile-studio="templates"><b>▦</b><span>Modèles</span></button><button data-mobile-studio="images"><b>▧</b><span>Médias</span></button><button data-mobile-studio="text"><b>Aa</b><span>Texte</span></button><button data-mobile-studio="elements"><b>◯</b><span>Éléments</span></button><button data-mobile-studio="layers"><b>≡</b><span>Calques</span></button><button data-mobile-studio="style"><b>⌁</b><span>Style</span></button>';
  panel.appendChild(dock);
  [library,inspector].forEach(box=>{if(!box.querySelector('.studio-sheet-close')){const b=document.createElement('button');b.className='studio-sheet-close';b.type='button';b.textContent='×';b.setAttribute('aria-label','Fermer');b.onclick=()=>{library.classList.remove('mobile-open');inspector.classList.remove('mobile-open');dock.classList.remove('sheet-open')};box.prepend(b)}});
  $$('[data-mobile-studio]',dock).forEach(b=>b.onclick=()=>openStudioRailPane(b.dataset.mobileStudio,true));
}

function installCreationModes(){
  const view=$('#view-creation');if(!view||$('#creationModeBar'))return;
  const mount=$('#creationModeMount'),carouselMount=$('#carouselMount'),visualMount=$('#visualMount');if(!mount||!carouselMount||!visualMount)return;

  const bar=document.createElement('div');bar.id='creationModeBar';bar.className='creation-mode-bar studio-switcher';
  bar.innerHTML='<div class="studio-switcher-main"><button class="active" data-create-mode="text">Texte</button><button data-create-mode="carousel">Mise en page</button><button data-create-mode="visual">Visuel</button></div><div class="studio-switcher-tools"><button id="creationUndo" title="Annuler">↶</button><button id="creationRedo" title="Rétablir">↷</button><select id="creationZoom" title="Zoom aperçu"><option value="0.8">80%</option><option value="1" selected>100%</option><option value="1.2">120%</option></select><select id="draftPicker"><option value="">Brouillons</option></select><button id="draftRecover" hidden>Récupérer</button><button id="draftSave">Enregistrer</button><button id="draftDelete" title="Supprimer">×</button></div>';
  mount.appendChild(bar);

  const quick=document.createElement('section');quick.id='creationQuickFlow';quick.className='creation-quick-flow';
  quick.innerHTML=
    '<div class="quick-flow-intro"><small>CRÉATION RAPIDE</small><strong>Une source. Un format. Créer.</strong><span>Choisis une opportunité du Radar ou pars d’une idée libre. Le Studio prépare la publication puis ouvre seulement les réglages utiles.</span></div>'+
    '<div class="quick-flow-steps">'+
      '<label><b>1</b><span>Source</span><select id="quickContentSource"><option value="">Idée libre</option></select></label>'+
      '<label><b>2</b><span>Format</span><select id="quickContentFormat"><option value="carousel">Carrousel · 5 slides</option><option value="post">Post · 1:1</option><option value="story">Story · 9:16</option></select></label>'+
      '<label class="quick-flow-idea"><b>3</b><span>Angle / idée</span><input id="quickContentIdea" placeholder="Ex. mettre en avant la deadline et l’accessibilité"></label>'+
      '<button class="quick-flow-generate" id="quickContentGenerate"><i>✦</i><span><strong>Créer la publication</strong><small id="quickContentStatus">Prêt à générer</small></span></button>'+
    '</div>'+
    '<div class="quick-flow-foot"><button id="quickAdvancedToggle">Réglages avancés</button><span>Le contenu reste entièrement modifiable après génération.</span></div>';
  mount.insertAdjacentElement('beforebegin',quick);

  const carousel=document.createElement('section');carousel.id='carouselCreationPanel';carousel.className='creation-mode-panel studio-designer';
  carousel.innerHTML=
    '<aside class="studio-library panel">'+
      '<div class="studio-tool-tabs"><button class="active" data-studio-tool="templates">Templates</button><button data-studio-tool="images">Images</button><button data-studio-tool="text">Texte</button><button data-studio-tool="elements">Éléments</button><button data-studio-tool="layers">Calques</button></div>'+
      '<div class="studio-tool-panel active" data-tool-panel="templates"><div class="studio-panel-title"><small>TEMPLATES</small><strong>Design marketing</strong></div>'+
      '<div class="marketing-template-grid">'+
        '<button data-marketing-template="open-call"><i class="mk-open"></i><span><b>Open Call</b><small>Éditorial clair</small></span></button>'+
        '<button data-marketing-template="event"><i class="mk-event"></i><span><b>Événement</b><small>Galerie / expo</small></span></button>'+
        '<button data-marketing-template="last-call"><i class="mk-last"></i><span><b>Dernier appel</b><small>Urgence premium</small></span></button>'+
        '<button data-marketing-template="artist"><i class="mk-artist"></i><span><b>Artiste</b><small>Portrait / focus</small></span></button>'+
        '<button data-marketing-template="partnership"><i class="mk-partner"></i><span><b>Partenariat</b><small>Pro / institutionnel</small></span></button>'+
      '</div></div>'+
      '<div class="studio-tool-panel" data-tool-panel="images"><div class="studio-panel-title"><small>IMAGES</small><strong>Médias</strong></div><label class="studio-upload">Importer une image<input id="canvasImageUpload" type="file" accept="image/*"></label><button class="secondary-btn wide" id="canvasUseGenerated">Utiliser le dernier visuel généré</button><div class="studio-image-library" id="studioImageLibrary"></div></div>'+
      '<div class="studio-tool-panel" data-tool-panel="text"><div class="studio-panel-title"><small>TEXTE</small><strong>Ajouter</strong></div><button class="studio-add-item" data-add-text="heading"><b>Aa</b><span>Titre</span></button><button class="studio-add-item" data-add-text="body"><b>Ag</b><span>Paragraphe</span></button><button class="studio-add-item" data-add-text="label"><b>TAG</b><span>Label</span></button></div>'+
      '<div class="studio-tool-panel" data-tool-panel="elements"><div class="studio-panel-title"><small>ÉLÉMENTS</small><strong>Formes</strong></div><div class="studio-element-grid"><button data-add-shape="rect"><i></i><span>Bloc</span></button><button data-add-shape="pill"><i class="pill"></i><span>Pill</span></button><button data-add-shape="circle"><i class="circle"></i><span>Cercle</span></button><button data-add-shape="line"><i class="line"></i><span>Ligne</span></button></div></div>'+
      '<div class="studio-tool-panel" data-tool-panel="layers"><div class="studio-panel-title"><small>CALQUES</small><strong>Ordre & visibilité</strong></div><div class="studio-layer-list" id="studioLayerList"></div></div>'+
      '<div class="studio-library-divider"></div>'+
      '<label>Source<select id="carouselSource"><option value="">Brief libre</option></select></label>'+
      '<label>Slides<select id="carouselCount"><option>4</option><option selected>5</option><option>6</option><option>7</option></select></label>'+
      '<label>Format<select id="carouselFormat"><option value="4:5">Portrait 4:5</option><option value="1:1">Carré 1:1</option><option value="9:16">Story 9:16</option></select></label>'+
      '<label>Brief<textarea id="carouselBrief" rows="6" placeholder="Sujet, angle, données obligatoires…"></textarea></label>'+
      '<div class="studio-generate-actions"><button class="primary-btn wide" id="carouselGenerate">✦ Générer avec PLUGY</button><button class="secondary-btn wide" id="carouselGenerateAll">Générer toutes les images</button></div>'+
    '</aside>'+
    '<section class="studio-stage panel">'+
      '<div class="studio-stage-head"><div><small>CANVAS</small><strong>Aperçu temps réel</strong></div><div class="stage-actions"><button id="stageGuidesToggle" class="active" title="Afficher les guides">Guides</button><button id="stageSafeToggle" class="active" title="Afficher la zone sûre">Safe</button><button id="stageSnapToggle" class="active" title="Activer le snapping">Aimant</button><button id="carouselGenerateImage">✦ Image</button><button id="carouselExport">PNG</button><button id="carouselExportAll">Tout exporter</button></div></div>'+
      '<div class="canvas-context-toolbar" id="canvasContextToolbar" hidden><button data-canvas-action="left">←</button><button data-canvas-action="center">↔</button><button data-canvas-action="middle">↕</button><button data-canvas-action="back">Arrière</button><button data-canvas-action="front">Avant</button><button data-canvas-action="duplicate">Dupliquer</button><button data-canvas-action="lock">Verrou</button><button data-canvas-action="delete">×</button></div>'+
      '<div class="studio-canvas-frame"><div class="carousel-canvas free-canvas show-guides show-safe" id="carouselCanvas"><div class="canvas-safe-zone" aria-hidden="true"></div><div class="canvas-guide guide-x" aria-hidden="true"></div><div class="canvas-guide guide-y" aria-hidden="true"></div><div class="carousel-image" id="carouselImage"></div><div class="carousel-copy"><small id="carouselKicker">PLUG ART</small><h3 id="carouselTitle">Choisis un template ou génère un carrousel</h3><p id="carouselBody">Le canvas reste entièrement modifiable.</p><b id="carouselCta">Découvrir →</b></div><div class="canvas-layers" id="canvasLayers"></div></div></div>'+
      '<div class="carousel-strip premium-strip"><div class="strip-head"><span id="carouselCounter">0 slide</span><div><button id="slideAdd">＋</button><button id="slideDuplicate">Dupliquer</button><button id="slideDeleteManual">Supprimer</button></div></div><div id="carouselSlides"></div></div>'+
      '<div class="instagram-export-row"><textarea id="carouselCaption" rows="3" placeholder="Légende Instagram…"></textarea><div><button id="carouselCaptionGenerate">✦ Légende</button><button class="primary-btn" id="carouselPublishInstagram">Publier Instagram</button><button id="carouselToBureau">Bureau</button></div></div>'+
    '</section>'+
    '<aside class="studio-inspector panel">'+
      '<div class="studio-panel-title"><small>INSPECTEUR</small><strong>Slide active</strong></div>'+
      '<div class="carousel-edit"><label>Kicker<input id="slideKicker" placeholder="PLUG ART"></label><label>Titre<textarea id="slideTitle" rows="3" placeholder="Titre"></textarea></label><label>Texte<textarea id="slideBody" rows="5" placeholder="Texte"></textarea></label><label>CTA<input id="slideCta" placeholder="CTA"></label></div>'+
      '<div class="inspector-section"><small>STYLE</small><div class="design-preset-row"><button data-slide-preset="ultra">Ultra</button><button data-slide-preset="editorial">Éditorial</button><button data-slide-preset="soft">Soft</button><button data-slide-preset="night">Sombre</button></div></div>'+
      '<label>Mise en page<select id="slideLayout"><option value="editorial">Éditorial</option><option value="split">Split</option><option value="poster">Poster</option><option value="minimal">Minimal</option></select></label>'+
      '<label>Accent<select id="slideAccent"><option value="black">Noir</option><option value="violet">Violet</option><option value="cyan">Cyan</option><option value="pink">Rose</option><option value="blue">Bleu</option><option value="orange">Orange</option><option value="green">Vert</option></select></label>'+
      '<label>Fond de slide<input id="slideBackground" type="color" value="#f4f3ef"></label>'+
      '<div class="studio-bg-swatches"><button data-bg-swatch="#f4f3ef" style="--sw:#f4f3ef"></button><button data-bg-swatch="#efeaff" style="--sw:#efeaff"></button><button data-bg-swatch="#e8f8fa" style="--sw:#e8f8fa"></button><button data-bg-swatch="#fff0f6" style="--sw:#fff0f6"></button><button data-bg-swatch="#171820" style="--sw:#171820"></button></div>'+
      '<label>Alignement<select id="slideAlign"><option value="left">Gauche</option><option value="center">Centre</option></select></label>'+
      '<div class="studio-color-swatches" aria-label="Couleur accent"><button data-accent-swatch="black" style="--sw:#111318"></button><button data-accent-swatch="violet" style="--sw:#735cff"></button><button data-accent-swatch="cyan" style="--sw:#45cbd7"></button><button data-accent-swatch="pink" style="--sw:#e96cae"></button><button data-accent-swatch="orange" style="--sw:#f2944b"></button><button data-accent-swatch="green" style="--sw:#55b982"></button></div>'+
      '<div class="studio-scale-section"><small>TYPOGRAPHIE</small>'+
      '<label>Échelle générale <output id="slideFontScaleOut">100%</output><input id="slideFontScale" type="range" min="80" max="135" value="100"></label>'+
      '<label>Titre <output id="slideTitleScaleOut">100%</output><input id="slideTitleScale" type="range" min="65" max="165" value="100"></label>'+
      '<label>Texte <output id="slideBodyScaleOut">100%</output><input id="slideBodyScale" type="range" min="65" max="155" value="100"></label>'+
      '<label>Label <output id="slideLabelScaleOut">100%</output><input id="slideLabelScale" type="range" min="65" max="150" value="100"></label>'+
      '<label>CTA <output id="slideCtaScaleOut">100%</output><input id="slideCtaScale" type="range" min="65" max="150" value="100"></label>'+
      '<label>Espacement <output id="slideSpacingOut">100%</output><input id="slideSpacing" type="range" min="70" max="150" value="100"></label>'+
      '</div>'+
      '<label>Présence image <output id="slideImageOpacityOut">64%</output><input id="slideImageOpacity" type="range" min="0" max="100" value="64"></label>'+
      '<label>Image<input id="slideImageUrl" placeholder="URL du visuel"></label>'+
      '<button class="secondary-btn wide" id="slideUseVisual">Utiliser le dernier visuel généré</button>'+
      '<div class="design-help-row"><button data-slide-help="hierarchy">✦ Hiérarchie</button><button data-slide-help="premium">✦ Premium</button><button data-slide-help="direct">✦ Direct</button></div>'+
      '<div class="inspector-section layer-inspector-section"><small>ÉLÉMENT SÉLECTIONNÉ</small><div class="layer-inspector empty" id="layerInspector"><span>Sélectionne un élément sur le canvas.</span></div></div>'+
    '</aside>';
  carouselMount.appendChild(carousel);

  const visual=document.createElement('section');visual.id='visualCreationPanel';visual.className='creation-mode-panel visual-lab';
  visual.innerHTML=
    '<aside class="visual-preset-panel panel">'+
      '<div class="studio-panel-title"><small>DIRECTION ARTISTIQUE</small><strong>Design marketing</strong></div>'+
      '<div class="visual-preset-grid">'+
        '<button data-visual-preset="campaign"><i class="vp-campaign"></i><b>Campagne</b><small>Key visual</small></button>'+
        '<button data-visual-preset="event"><i class="vp-event"></i><b>Événement</b><small>Expo / affiche</small></button>'+
        '<button data-visual-preset="artist"><i class="vp-artist"></i><b>Artiste</b><small>Portrait éditorial</small></button>'+
        '<button data-visual-preset="story"><i class="vp-story"></i><b>Story</b><small>Vertical 9:16</small></button>'+
        '<button data-visual-preset="partnership"><i class="vp-partner"></i><b>Partenariat</b><small>Institutionnel</small></button>'+
        '<button data-visual-preset="launch"><i class="vp-launch"></i><b>Lancement</b><small>Impact</small></button>'+
      '</div>'+
    '</aside>'+
    '<section class="visual-generator panel">'+
      '<div class="studio-stage-head"><div><small>GÉNÉRATEUR</small><strong>Visuel de campagne</strong></div><span>PLUG ART IMAGE</span></div>'+
      '<label>Cas d’usage<select id="visualUseCase"><option value="campaign">Campagne</option><option value="event">Événement</option><option value="artist">Portrait artiste</option><option value="story">Story</option><option value="partnership">Partenariat</option><option value="launch">Lancement</option></select></label>'+
      '<label>Prompt<textarea id="visualPrompt" rows="9" placeholder="Décris l’image, l’ambiance, le sujet, la composition…"></textarea></label>'+
      '<div class="visual-settings-row"><label>Direction<select id="visualStyle"><option value="editorial">Éditorial premium</option><option value="gallery">Galerie / culturel</option><option value="art">Art contemporain</option><option value="photo">Photographique</option></select></label><label>Format<select id="visualRatio"><option value="4:5">Portrait 4:5</option><option value="1:1">Carré 1:1</option><option value="9:16">Story 9:16</option></select></label></div>'+
      '<div class="visual-prompt-tools"><button data-visual-help="art-direction">✦ Direction artistique</button><button data-visual-help="marketing">✦ Plus marketing</button><button data-visual-help="premium">✦ Plus premium</button></div>'+
      '<button class="primary-btn wide visual-generate-main" id="visualGenerate">✦ Générer le visuel</button>'+
    '</section>'+
    '<section class="visual-preview panel"><div class="visual-preview-head"><small>APERÇU</small><div><button id="visualDownload">Télécharger</button><button id="visualToBureau">Bureau</button></div></div><div id="visualImage"><span>Choisis une direction ou écris ton prompt.</span></div></section>';
  visualMount.appendChild(visual);

  $$('[data-create-mode]').forEach(b=>b.onclick=()=>setCreationMode(b.dataset.createMode));
  $('#draftPicker').onchange=e=>{if(e.target.value)loadDraft(Number(e.target.value))};
  $('#draftRecover').onclick=restoreLocalCreationBackup;$('#draftSave').onclick=saveDraft;$('#draftDelete').onclick=deleteDraft;
  $('#creationUndo').onclick=undoCreation;$('#creationRedo').onclick=redoCreation;$('#creationZoom').onchange=setCreationPreviewZoom;syncCreationHistoryButtons();

  $('#carouselSource').onchange=syncCarouselBrief;$('#carouselGenerate').onclick=generateCarousel;
  $('#carouselGenerateImage').onclick=()=>generateCarouselImage(state.carousel.active);$('#carouselGenerateAll').onclick=generateAllCarouselImages;
  $('#carouselExport').onclick=()=>exportCarouselSlide(state.carousel.active);$('#carouselExportAll').onclick=exportAllCarouselSlides;
  $('#carouselCaptionGenerate').onclick=prepareInstagramCaption;$('#carouselPublishInstagram').onclick=publishCarouselInstagram;$('#carouselToBureau').onclick=carouselToBureau;
  $('#carouselFormat').onchange=e=>{state.carousel.format=e.target.value;renderCarousel()};
  ['slideKicker','slideTitle','slideBody','slideCta'].forEach(id=>$('#'+id).addEventListener('input',syncActiveSlideEdit));
  ['slideLayout','slideAccent','slideAlign','slideBackground'].forEach(id=>$('#'+id)?.addEventListener('change',updateSlideDesignFromControls));
  ['slideFontScale','slideTitleScale','slideBodyScale','slideLabelScale','slideCtaScale','slideSpacing','slideImageOpacity','slideImageUrl'].forEach(id=>$('#'+id)?.addEventListener('input',updateSlideDesignFromControls));
  $$('[data-slide-preset]').forEach(b=>b.onclick=()=>setSlideDesignPreset(b.dataset.slidePreset));$$('[data-accent-swatch]').forEach(b=>b.onclick=()=>{if($('#slideAccent'))$('#slideAccent').value=b.dataset.accentSwatch;updateSlideDesignFromControls()});$$('[data-bg-swatch]').forEach(b=>b.onclick=()=>{if($('#slideBackground'))$('#slideBackground').value=b.dataset.bgSwatch;updateSlideDesignFromControls()});
  $$('[data-slide-help]').forEach(b=>b.onclick=()=>assistSlideDesign(b.dataset.slideHelp));
  $$('[data-marketing-template]').forEach(b=>b.onclick=()=>applyMarketingTemplate(b.dataset.marketingTemplate));
  $$('[data-studio-tool]').forEach(b=>b.onclick=()=>setStudioTool(b.dataset.studioTool));
  $$('[data-add-text]').forEach(b=>b.onclick=()=>{const kind=b.dataset.addText;addCanvasLayer('text',kind==='heading'?{text:'Nouveau titre',size:38,w:70,h:16}:kind==='label'?{text:'PLUG ART',size:15,weight:800,w:30,h:8,color:'#7657ff'}:{text:'Ajoute ton texte ici.',size:22,weight:500,w:68,h:18})});
  $$('[data-add-shape]').forEach(b=>b.onclick=()=>{const shape=b.dataset.addShape;addCanvasLayer('shape',shape==='circle'?{shape,color:'#7657ff',w:18,h:18,radius:60}:shape==='pill'?{shape,color:'#111318',w:34,h:10,radius:60}:shape==='line'?{shape,color:'#111318',w:46,h:1.2,radius:0}:{shape,color:'#7657ff'})});
  $('#canvasImageUpload')?.addEventListener('change',e=>{processCanvasUpload(e.target.files?.[0]);e.target.value=''});
  $('#canvasUseGenerated')?.addEventListener('click',()=>state.visual.url?addCanvasLayer('image',{src:state.visual.url}):toast('Génère d’abord un visuel'));
  $('#slideUseVisual')?.addEventListener('click',()=>{const s=state.carousel.slides[state.carousel.active];if(!s)return;if(!state.visual.url)return toast('Aucun visuel généré à utiliser');pushCreationHistory();s.image=state.visual.url;renderCarousel();scheduleDraftAutosave()});
  $('#slideAdd')?.addEventListener('click',addCarouselSlide);$('#slideDuplicate')?.addEventListener('click',duplicateCarouselSlide);$('#slideDeleteManual')?.addEventListener('click',deleteCarouselSlideManual);
  $('#stageGuidesToggle')?.addEventListener('click',()=>{state.studioGuides=!state.studioGuides;renderStudioCanvasAids()});$('#stageSafeToggle')?.addEventListener('click',()=>{state.studioSafe=!state.studioSafe;renderStudioCanvasAids()});$('#stageSnapToggle')?.addEventListener('click',()=>{state.studioSnap=!state.studioSnap;renderStudioCanvasAids()});
  $$('[data-canvas-action]').forEach(b=>b.onclick=()=>runCanvasAction(b.dataset.canvasAction));installStudioKeyboard();renderStudioCanvasAids();

  $('#visualGenerate').onclick=generateVisual;$('#visualDownload').onclick=downloadVisual;$('#visualToBureau').onclick=visualToBureau;
  $$('[data-visual-preset]').forEach(b=>b.onclick=()=>applyVisualPreset(b.dataset.visualPreset));
  $('#visualUseCase').onchange=e=>applyVisualPreset(e.target.value);
  $$('[data-visual-help]').forEach(b=>b.onclick=()=>improveVisualPrompt(b.dataset.visualHelp));

  $$('[data-studio-start]').forEach(b=>b.onclick=()=>{const mode=b.dataset.studioStart;setCreationMode(mode);if(b.dataset.marketingTemplate)applyMarketingTemplate(b.dataset.marketingTemplate);if(b.dataset.visualUsecase)applyVisualPreset(b.dataset.visualUsecase);document.querySelector('.creation-studio-shell')?.scrollIntoView({behavior:'smooth',block:'start'})});
  $$('[data-creative-prompt]').forEach(b=>b.onclick=()=>{const brief=clean($('#contentBrief')?.value),body=clean($('#contentBody')?.value);askPlugy(b.dataset.creativePrompt+' Contexte : '+(brief||body||'aucun brief encore'),'#contentBody')});
  $$('[data-copy-action]').forEach(b=>b.onclick=()=>improveTextContent(b.dataset.copyAction));

  function refreshQuickSources(){
    const sel=$('#quickContentSource');if(!sel)return;const cur=sel.value,opps=state.bootstrap?.opportunities||[];
    sel.innerHTML='<option value="">Idée libre</option>'+opps.slice(0,120).map(o=>'<option value="'+o.id+'">'+esc(o.title)+'</option>').join('');
    if(cur&&opportunityById(cur))sel.value=cur;
  }
  async function quickCreatePublication(){
    const b=$('#quickContentGenerate'),status=$('#quickContentStatus'),sourceId=$('#quickContentSource')?.value||'',format=$('#quickContentFormat')?.value||'carousel',idea=clean($('#quickContentIdea')?.value||'');
    if(b.disabled)return;b.disabled=true;status.textContent='Préparation…';playMotion(plugyAvailable('ArmThink')?'ArmThink':'Think',true);
    try{
      await ensureViewData('creation').catch(()=>{});
      fillCreationSources();refreshQuickSources();
      const source=opportunityById(sourceId);
      if(!source&&!idea){toast('Choisis une opportunité ou écris une idée');status.textContent='Ajoute une source ou une idée';return}
      setCreationMode('carousel');
      const count=format==='carousel'?5:1,ratio=format==='story'?'9:16':format==='post'?'1:1':'4:5';
      $('#carouselCount').value=String(count);$('#carouselFormat').value=ratio;state.carousel.format=ratio;
      $('#carouselSource').value=sourceId;
      if(source){syncCarouselBrief();$('#carouselBrief').value+=(idea?'\nAngle : '+idea:'');applyMarketingTemplate('open-call')}
      else{$('#carouselBrief').value=idea;applyMarketingTemplate('event')}
      status.textContent='PLUGY compose…';
      await generateCarousel();
      $('#view-creation')?.classList.add('quick-generated');$('#view-creation')?.classList.remove('advanced-studio');
      status.textContent='Publication créée · clique pour régénérer';
      document.querySelector('#carouselCreationPanel .studio-stage')?.scrollIntoView({behavior:'smooth',block:'center'});
      toast(source?'Publication créée depuis le Radar':'Publication créée');
    }catch(err){
      console.error('[Quick Studio V143]',err);status.textContent='Création locale prête';
      const source=opportunityById(sourceId),count=format==='carousel'?5:1;
      state.carousel.slides=fallbackCarousel(count,source,idea);state.carousel.active=0;state.carousel.format=format==='story'?'9:16':format==='post'?'1:1':'4:5';
      setCreationMode('carousel');renderCarousel();$('#view-creation')?.classList.add('quick-generated');toast('Publication créée en mode de secours');
    }finally{b.disabled=false;playMotion(plugyAvailable('Happy')?'Happy':'Idle')}
  }
  $('#quickContentGenerate')?.addEventListener('click',quickCreatePublication);
  $('#quickContentSource')?.addEventListener('change',e=>{const o=opportunityById(e.target.value);if(o&&$('#quickContentIdea')&&!$('#quickContentIdea').value)$('#quickContentIdea').placeholder='Angle suggéré · '+(o.deadline?'deadline '+o.deadline:'présenter les points clés')});
  $('#quickAdvancedToggle')?.addEventListener('click',()=>{
    const v=$('#view-creation'),advanced=!v.classList.contains('advanced-studio');v.classList.toggle('advanced-studio',advanced);v.classList.add('quick-generated');
    $('#quickAdvancedToggle').textContent=advanced?'Masquer les réglages avancés':'Réglages avancés';
  });
  refreshQuickSources();
  $('#view-creation')?.classList.add('simple-studio');

  // V137: fail-safe binding audit. Any interactive Studio control left without a handler
  // is surfaced in the console instead of silently pretending to be a button.
  const creationInteractive=$('#view-creation button, #view-creation select, #view-creation input, #view-creation textarea');
  const inert=creationInteractive.filter(el=>el.tagName==='BUTTON'&&!el.onclick&&!el.dataset.bound&&
    !el.matches('[data-route],[data-create-mode],[data-studio-start],[data-creative-prompt],[data-copy-action],[data-marketing-template],[data-studio-tool],[data-add-text],[data-add-shape],[data-slide-preset],[data-slide-help],[data-visual-preset],[data-visual-help]'));
  inert.forEach(el=>{
    el.dataset.bound='fallback';
    el.addEventListener('click',()=>toast('Commande indisponible : '+clean(el.textContent||el.id||'outil')));
  });
  if(inert.length)console.warn('[Creation V137] controls with fallback binding',inert.map(x=>x.id||clean(x.textContent)));

  setCreationMode('text');fillCreationSources();bindDraftAutosave();ensureUnifiedStudioRail();installMobileStudioDock();refreshLocalDraftRecovery();
}



const LOCAL_CREATION_KEY='plugart.creation.backup.v113';
function readLocalCreationBackup(){
  try{
    const raw=localStorage.getItem(LOCAL_CREATION_KEY);if(!raw)return null;
    const data=JSON.parse(raw);if(!data?.snapshot||Date.now()-Number(data.at||0)>7*86400000){localStorage.removeItem(LOCAL_CREATION_KEY);return null}
    return data;
  }catch{return null}
}
function refreshLocalDraftRecovery(){
  const b=$('#draftRecover');if(!b)return;const backup=readLocalCreationBackup();
  b.hidden=!backup;
  if(backup){const d=new Date(Number(backup.at||Date.now()));b.textContent='Récupérer local · '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
}
function saveLocalCreationBackup(){
  try{
    const snapshot=draftSnapshot();
    localStorage.setItem(LOCAL_CREATION_KEY,JSON.stringify({at:Date.now(),mode:snapshot.kind||state.creationMode,snapshot}));
    refreshLocalDraftRecovery();
  }catch{}
}
function clearLocalCreationBackup(){
  try{localStorage.removeItem(LOCAL_CREATION_KEY)}catch{}
  refreshLocalDraftRecovery();
}
function applyCreationSnapshot(snap){
  if(!snap)return;
  const mode=snap.kind||'text',p=snap.payload||{};state.currentDraft=null;state.creationDirty=true;setCreationMode(mode);
  if(mode==='carousel'){
    state.carousel={slides:Array.isArray(p.slides)?p.slides:[],active:Number(p.active||0),format:p.format||'4:5'};
    if($('#carouselSource'))$('#carouselSource').value=snap.source_opportunity_id||'';
    if($('#carouselBrief'))$('#carouselBrief').value=p.brief||'';
    if($('#carouselCaption'))$('#carouselCaption').value=p.instagram_caption||'';
    if($('#carouselFormat'))$('#carouselFormat').value=state.carousel.format;
    renderCarousel();
  }else if(mode==='visual'){
    state.visual={url:p.url||'',prompt:p.prompt||''};
    $('#visualPrompt').value=p.prompt||'';$('#visualStyle').value=p.style||'gallery';$('#visualRatio').value=p.ratio||'4:5';
    $('#visualImage').style.backgroundImage=p.url?'url("'+String(p.url).replace(/"/g,'%22')+'")':'none';
    if(p.url)$('#visualImage').innerHTML='';
  }else{
    $('#contentTitle').value=snap.title||'';
    $('#contentSource').value=snap.source_opportunity_id||'';
    $('#contentType').value=p.type||$('#contentType').value;
    $('#contentObjective').value=p.objective||'';
    $('#contentBrief').value=p.brief||'';
    $('#contentBody').value=p.body||'';
  }
}
function restoreLocalCreationBackup(){
  const backup=readLocalCreationBackup();if(!backup)return toast('Aucun brouillon local');
  applyCreationSnapshot(backup.snapshot);toast('Brouillon local récupéré');
}

function renderDraftPicker(){
  const p=$('#draftPicker');if(!p)return;const cur=state.currentDraft||'';
  p.innerHTML='<option value="">Brouillons</option>'+state.drafts.map(d=>'<option value="'+d.id+'">'+esc((d.title||'Brouillon')+' · '+d.kind)+'</option>').join('');p.value=String(cur||'');
}
function draftSnapshot(){
  if(state.creationMode==='carousel')return{kind:'carousel',title:state.carousel.slides[0]?.title||'Carrousel PLUG ART',source_opportunity_id:$('#carouselSource')?.value||'',payload:{slides:state.carousel.slides,active:state.carousel.active,format:state.carousel.format,brief:$('#carouselBrief')?.value||'',instagram_caption:$('#carouselCaption')?.value||''}};
  if(state.creationMode==='visual')return{kind:'visual',title:'Visuel PLUG ART',source_opportunity_id:'',payload:{url:state.visual.url,prompt:$('#visualPrompt')?.value||state.visual.prompt||'',style:$('#visualStyle')?.value||'gallery',ratio:$('#visualRatio')?.value||'4:5'}};
  return{kind:'text',title:$('#contentTitle')?.value||$('#contentType')?.value||'Texte PLUG ART',source_opportunity_id:$('#contentSource')?.value||'',payload:{type:$('#contentType')?.value||'',objective:$('#contentObjective')?.value||'',brief:$('#contentBrief')?.value||'',body:$('#contentBody')?.value||''}};
}
async function saveDraft(silent=false){
  const snap=draftSnapshot();saveStatus('Sauvegarde brouillon…','saving');
  try{
    let d;if(state.currentDraft)d=await api('/api/v108/drafts/'+state.currentDraft,{method:'PATCH',body:JSON.stringify(snap)});
    else d=await api('/api/v108/drafts',{method:'POST',body:JSON.stringify(snap)});
    state.drafts=state.drafts.filter(x=>x.id!==d.id);state.drafts.unshift(d);state.currentDraft=d.id;state.creationDirty=false;renderDraftPicker();clearLocalCreationBackup();saveStatus('Brouillon enregistré','saved');if(!silent)toast('Brouillon enregistré');
  }catch{saveStatus('Erreur brouillon','error');if(!silent)toast('Enregistrement du brouillon impossible')}
}
function loadDraft(id){
  const d=state.drafts.find(x=>Number(x.id)===Number(id));if(!d)return;state.currentDraft=d.id;state.creationDirty=false;setCreationMode(d.kind||'text');
  const p=d.payload||{};
  if(d.kind==='carousel'){state.carousel={slides:Array.isArray(p.slides)?p.slides:[],active:Number(p.active||0),format:p.format||'4:5'};if($('#carouselSource'))$('#carouselSource').value=d.source_opportunity_id||'';if($('#carouselBrief'))$('#carouselBrief').value=p.brief||'';if($('#carouselCaption'))$('#carouselCaption').value=p.instagram_caption||'';if($('#carouselFormat'))$('#carouselFormat').value=state.carousel.format;renderCarousel()}
  else if(d.kind==='visual'){state.visual={url:p.url||'',prompt:p.prompt||''};$('#visualPrompt').value=p.prompt||'';$('#visualStyle').value=p.style||'gallery';$('#visualRatio').value=p.ratio||'4:5';$('#visualImage').style.backgroundImage=p.url?'url("'+String(p.url).replace(/"/g,'%22')+'")':'none';if(p.url)$('#visualImage').innerHTML=''}
  else{$('#contentTitle').value=d.title||'';$('#contentSource').value=d.source_opportunity_id||'';$('#contentType').value=p.type||$('#contentType').value;$('#contentObjective').value=p.objective||'';$('#contentBrief').value=p.brief||'';$('#contentBody').value=p.body||''}
  clearLocalCreationBackup();renderDraftPicker();toast('Brouillon chargé');
}
async function deleteDraft(){
  if(!state.currentDraft)return toast('Aucun brouillon sélectionné');
  try{await api('/api/v108/drafts/'+state.currentDraft,{method:'DELETE'});state.drafts=state.drafts.filter(x=>x.id!==state.currentDraft);state.currentDraft=null;clearLocalCreationBackup();renderDraftPicker();toast('Brouillon supprimé')}catch{toast('Suppression impossible')}
}

let draftAutosaveTimer=0;
function scheduleDraftAutosave(){
  state.creationDirty=true;saveLocalCreationBackup();
  if(!state.currentDraft)return;
  clearTimeout(draftAutosaveTimer);draftAutosaveTimer=setTimeout(()=>saveDraft(true),1600);
}
function bindDraftAutosave(){
  ['contentTitle','contentObjective','contentBrief','contentBody','carouselBrief','carouselCaption','slideKicker','slideTitle','slideBody','slideCta','visualPrompt'].forEach(id=>$('#'+id)?.addEventListener('input',scheduleDraftAutosave));
  ['contentType','contentSource','carouselSource','carouselFormat','visualStyle','visualRatio'].forEach(id=>$('#'+id)?.addEventListener('change',scheduleDraftAutosave));
}

function setCreationMode(mode){
  state.creationMode=mode;
  $$('[data-create-mode]').forEach(b=>b.classList.toggle('active',b.dataset.createMode===mode));
  $('#textCreationPanel')?.style.setProperty('display',mode==='text'?'grid':'none');
  $('#carouselCreationPanel')?.classList.toggle('active',mode==='carousel');
  $('#visualCreationPanel')?.classList.toggle('active',mode==='visual');
  setTimeout(setCreationPreviewZoom,0);
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
function slideDesign(s){
  if(!s)return{theme:'ultra',layout:'editorial',accent:'black',align:'left',fontScale:100,titleScale:100,bodyScale:100,labelScale:100,ctaScale:100,spacing:100,imageOpacity:64,radius:26,backgroundColor:'#f4f3ef'};
  s.design={theme:'ultra',layout:'editorial',accent:'black',align:'left',fontScale:100,titleScale:100,bodyScale:100,labelScale:100,ctaScale:100,spacing:100,imageOpacity:64,radius:26,backgroundColor:'#f4f3ef',...(s.design||{})};
  return s.design;
}
function slideAccentColor(name){return({black:'#111318',violet:'#735cff',cyan:'#45cbd7',pink:'#e96cae',blue:'#4b7cff',orange:'#f2944b',green:'#55b982'})[name]||'#111318'}
function setSlideDesignPreset(name){
  pushCreationHistory();
  const s=state.carousel.slides[state.carousel.active];if(!s)return toast('Génère d’abord une slide');
  const presets={
    ultra:{theme:'ultra',layout:'editorial',accent:'black',align:'left',fontScale:105,titleScale:112,bodyScale:94,labelScale:92,ctaScale:96,spacing:102,imageOpacity:58,radius:28,backgroundColor:'#f4f3ef'},
    editorial:{theme:'editorial',layout:'split',accent:'violet',align:'left',fontScale:98,titleScale:104,bodyScale:98,labelScale:90,ctaScale:94,spacing:108,imageOpacity:84,radius:24,backgroundColor:'#efeaff'},
    soft:{theme:'soft',layout:'editorial',accent:'pink',align:'left',fontScale:100,titleScale:102,bodyScale:96,labelScale:96,ctaScale:96,spacing:112,imageOpacity:67,radius:30,backgroundColor:'#fff0f6'},
    night:{theme:'night',layout:'poster',accent:'cyan',align:'left',fontScale:108,titleScale:118,bodyScale:92,labelScale:90,ctaScale:98,spacing:96,imageOpacity:72,radius:24,backgroundColor:'#171820'}
  };
  s.design={...slideDesign(s),...(presets[name]||presets.ultra)};renderCarousel();scheduleDraftAutosave();
}
function updateSlideDesignFromControls(){
  pushCreationHistory();
  const s=state.carousel.slides[state.carousel.active];if(!s)return;
  const d=slideDesign(s);d.layout=$('#slideLayout')?.value||d.layout;d.accent=$('#slideAccent')?.value||d.accent;d.align=$('#slideAlign')?.value||d.align;
  d.backgroundColor=$('#slideBackground')?.value||d.backgroundColor;d.fontScale=Number($('#slideFontScale')?.value||d.fontScale);d.titleScale=Number($('#slideTitleScale')?.value||d.titleScale);d.bodyScale=Number($('#slideBodyScale')?.value||d.bodyScale);d.labelScale=Number($('#slideLabelScale')?.value||d.labelScale);d.ctaScale=Number($('#slideCtaScale')?.value||d.ctaScale);d.spacing=Number($('#slideSpacing')?.value||d.spacing);d.imageOpacity=Number($('#slideImageOpacity')?.value||d.imageOpacity);
  const url=String($('#slideImageUrl')?.value||'').trim();if(url!==String(s.image||''))s.image=url;
  renderCarousel();scheduleDraftAutosave();
}
async function assistSlideDesign(kind){
  const s=state.carousel.slides[state.carousel.active];if(!s)return toast('Aucune slide active');
  const instructions={
    hierarchy:'Améliore la hiérarchie éditoriale. Raccourcis si nécessaire, garde un titre très lisible et un texte utile.',
    premium:'Rends cette slide plus premium, sobre et éditoriale. Peu de mots, aucune formule creuse.',
    direct:'Rends cette slide plus directe et immédiate, sans perdre les faits ni inventer.'
  };
  const prompt=(instructions[kind]||instructions.premium)+' Réponds uniquement en JSON valide {"kicker":"","title":"","body":"","cta":""}. Données : '+JSON.stringify({kicker:s.kicker,title:s.title,body:s.body,cta:s.cta});
  try{
    const out=await api('/api/v32/plugy',{method:'POST',body:JSON.stringify({message:prompt,page:'content',mode:'fast'})});
    const parsed=parseLooseJSON(out.answer);['kicker','title','body','cta'].forEach(k=>{if(typeof parsed[k]==='string')s[k]=parsed[k]});
    renderCarousel();scheduleDraftAutosave();toast('Slide affinée');
  }catch{toast('PLUGY n’a pas pu modifier la slide')}
}
function addCarouselSlide(){
  pushCreationHistory();
  const at=Math.max(0,state.carousel.active+1),base={kicker:'PLUG ART',title:'Nouvelle slide',body:'Ajoute ton message.',cta:'Découvrir →',image:'',image_prompt:'',design:{theme:'ultra',layout:'editorial',accent:'black',align:'left',fontScale:100,titleScale:100,bodyScale:100,labelScale:100,ctaScale:100,spacing:100,imageOpacity:64,radius:26}};
  state.carousel.slides.splice(at,0,base);state.carousel.active=at;renderCarousel();scheduleDraftAutosave();
}
function duplicateCarouselSlide(){
  pushCreationHistory();
  const s=state.carousel.slides[state.carousel.active];if(!s)return;
  const copy=JSON.parse(JSON.stringify(s)),at=state.carousel.active+1;state.carousel.slides.splice(at,0,copy);state.carousel.active=at;renderCarousel();scheduleDraftAutosave();
}
function deleteCarouselSlideManual(){
  pushCreationHistory();
  if(!state.carousel.slides.length)return;if(state.carousel.slides.length===1)return toast('Garde au moins une slide');
  state.carousel.slides.splice(state.carousel.active,1);state.carousel.active=Math.max(0,Math.min(state.carousel.active,state.carousel.slides.length-1));renderCarousel();scheduleDraftAutosave();
}

function renderCarousel(){
  const slides=state.carousel.slides,s=slides[state.carousel.active]||{},d=slideDesign(s);$('#carouselCounter').textContent=slides.length+' slide'+(slides.length>1?'s':'');
  $('#carouselSlides').innerHTML=slides.map((x,i)=>'<button class="carousel-slide-thumb '+(i===state.carousel.active?'active':'')+'" draggable="true" data-carousel-slide="'+i+'"><b>'+esc(x.kicker||'PLUG ART')+'</b><span>'+esc((x.title||'Sans titre').slice(0,50))+'</span></button>').join('')||'<div class="empty">Aucune slide.</div>';
  $$('[data-carousel-slide]').forEach(b=>{
    b.onclick=()=>{state.carousel.active=Number(b.dataset.carouselSlide);renderCarousel()};
    b.ondragstart=e=>{e.dataTransfer.setData('text/plain',b.dataset.carouselSlide);e.dataTransfer.effectAllowed='move';b.classList.add('dragging')};
    b.ondragend=()=>b.classList.remove('dragging');
    b.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
    b.ondrop=e=>{e.preventDefault();pushCreationHistory();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(b.dataset.carouselSlide);if(!Number.isFinite(from)||from===to)return;const moved=state.carousel.slides.splice(from,1)[0];state.carousel.slides.splice(to,0,moved);state.carousel.active=to;renderCarousel();scheduleDraftAutosave()};
  });
  $('#carouselKicker').textContent=s.kicker||'PLUG ART';$('#carouselTitle').textContent=s.title||'Ton carrousel apparaîtra ici';$('#carouselBody').textContent=s.body||'Choisis une source ou écris un brief.';$('#carouselCta').textContent=s.cta||'Découvrir →';
  const img=$('#carouselImage');img.style.backgroundImage=s.image?'url("'+String(s.image).replace(/"/g,'%22')+'")':'none';img.style.opacity=String(Math.max(0,Math.min(100,Number(d.imageOpacity||0)))/100);
  const canvas=$('#carouselCanvas');canvas.style.aspectRatio=state.carousel.format==='1:1'?'1/1':state.carousel.format==='9:16'?'9/16':'4/5';canvas.dataset.theme=d.theme||'ultra';canvas.dataset.layout=d.layout||'editorial';canvas.dataset.align=d.align||'left';canvas.style.setProperty('--slide-accent',slideAccentColor(d.accent));const globalScale=Number(d.fontScale||100)/100;canvas.style.setProperty('--slide-font-scale',String(globalScale));canvas.style.setProperty('--slide-title-size',(46*globalScale*Number(d.titleScale||100)/100).toFixed(2)+'px');canvas.style.setProperty('--slide-body-size',(15*globalScale*Number(d.bodyScale||100)/100).toFixed(2)+'px');canvas.style.setProperty('--slide-label-size',(11*globalScale*Number(d.labelScale||100)/100).toFixed(2)+'px');canvas.style.setProperty('--slide-cta-size',(12*globalScale*Number(d.ctaScale||100)/100).toFixed(2)+'px');canvas.style.setProperty('--slide-copy-gap',(14*Number(d.spacing||100)/100).toFixed(2)+'px');canvas.style.setProperty('--slide-radius',(d.radius||26)+'px');canvas.style.background=d.backgroundColor||'#f4f3ef';
  $('#slideKicker').value=s.kicker||'';$('#slideTitle').value=s.title||'';$('#slideBody').value=s.body||'';$('#slideCta').value=s.cta||'';
  if($('#slideLayout'))$('#slideLayout').value=d.layout;if($('#slideAccent'))$('#slideAccent').value=d.accent;if($('#slideAlign'))$('#slideAlign').value=d.align;if($('#slideBackground'))$('#slideBackground').value=d.backgroundColor||'#f4f3ef';
  if($('#slideFontScale'))$('#slideFontScale').value=d.fontScale;if($('#slideFontScaleOut'))$('#slideFontScaleOut').textContent=d.fontScale+'%';[['Title',d.titleScale],['Body',d.bodyScale],['Label',d.labelScale],['Cta',d.ctaScale],['Spacing',d.spacing]].forEach(([k,v])=>{const el=$('#slide'+k+'Scale'),out=$('#slide'+k+'ScaleOut');if(el)el.value=v;if(out)out.textContent=v+'%'});if($('#slideSpacing'))$('#slideSpacing').value=d.spacing;if($('#slideSpacingOut'))$('#slideSpacingOut').textContent=d.spacing+'%';
  if($('#slideImageOpacity'))$('#slideImageOpacity').value=d.imageOpacity;if($('#slideImageOpacityOut'))$('#slideImageOpacityOut').textContent=d.imageOpacity+'%';
  if($('#slideImageUrl'))$('#slideImageUrl').value=s.image||'';
  $$$('[data-slide-preset]').forEach(b=>b.classList.toggle('active',b.dataset.slidePreset===d.theme));
  renderCanvasLayers();renderStudioImages();
}

function syncActiveSlideEdit(){
  pushCreationHistory();
  const s=state.carousel.slides[state.carousel.active];if(!s)return;s.kicker=$('#slideKicker').value;s.title=$('#slideTitle').value;s.body=$('#slideBody').value;s.cta=$('#slideCta').value;renderCarousel();
}
async function generateCarouselImage(index){
  const s=state.carousel.slides[index];if(!s)return toast('Génère d’abord les slides');
  const source=opportunityById($('#carouselSource').value),ratio=state.carousel.format||'4:5',btn=$('#carouselGenerateImage'),old=btn.textContent;btn.disabled=true;btn.textContent='Image…';
  const prompt=clean((s.image_prompt||'Illustration éditoriale contemporaine pour '+s.title+'. '+s.body)+' Univers PLUG ART, art contemporain émergent, galerie, matière, photographie ou peinture selon le sujet. Aucun texte lisible, aucun logo, aucun watermark.'+(source?' Contexte : '+source.title+'.':''));
  try{const r=await api('/api/v32/content/image',{method:'POST',body:JSON.stringify({prompt,style:'gallery',ratio,quality:'medium'})});if(r.url){s.image=r.url;renderCarousel();scheduleDraftAutosave();toast('Image générée')}}catch(e){console.error('[Image Studio]',e);toast('Image : '+String(e?.message||'génération indisponible').replace(/^\{"detail":"?|"?\}$/g,'').slice(0,150))}finally{btn.disabled=false;btn.textContent=old}
}
async function generateAllCarouselImages(){
  if(!state.carousel.slides.length)return toast('Génère d’abord les slides');const b=$('#carouselGenerateAll'),old=b.textContent;b.disabled=true;
  for(let i=0;i<state.carousel.slides.length;i++){b.textContent='Image '+(i+1)+'/'+state.carousel.slides.length;state.carousel.active=i;renderCarousel();await generateCarouselImage(i)}
  b.disabled=false;b.textContent=old;state.carousel.active=0;renderCarousel();
}

function exportDimensions(format){
  if(format==='1:1')return[1080,1080];
  if(format==='9:16')return[1080,1920];
  return[1080,1350];
}
function canvasTextLines(ctx,text,maxWidth,maxLines=6){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){
    const test=line?line+' '+word:word;
    if(ctx.measureText(test).width<=maxWidth||!line)line=test;
    else{lines.push(line);line=word;if(lines.length>=maxLines-1)break}
  }
  if(line&&lines.length<maxLines)lines.push(line);
  if(lines.length===maxLines&&words.length){
    let last=lines[lines.length-1];
    while(ctx.measureText(last+'…').width>maxWidth&&last.length>3)last=last.slice(0,-1);
    lines[lines.length-1]=last.replace(/[\s,.!?;:]+$/,'')+'…';
  }
  return lines;
}
function loadCanvasImage(url,timeout=8500){
  return new Promise(resolve=>{
    if(!url)return resolve(null);
    const img=new Image();let done=false;
    const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};
    const timer=setTimeout(()=>finish(null),timeout);
    img.crossOrigin='anonymous';img.onload=()=>finish(img);img.onerror=()=>finish(null);img.src=url;
  });
}
function drawCoverImage(ctx,img,w,h){
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
}
function triggerBlobDownload(blob,filename){
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
async function renderCarouselSlideBlob(index){
  const s=state.carousel.slides[index];if(!s)return null;const d=slideDesign(s);
  const [w,h]=exportDimensions(state.carousel.format||'4:5'),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
  const themes={
    ultra:['#f7f7f5','#ffffff','#111318'],editorial:['#eef1ff','#f4e9ff','#17181e'],soft:['#fbf7f8','#f2eaf3','#17181e'],night:['#111318','#242631','#ffffff']
  },theme=themes[d.theme]||themes.ultra;
  const base=ctx.createLinearGradient(0,0,w,h);base.addColorStop(0,theme[0]);base.addColorStop(1,theme[1]);ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  const img=await loadCanvasImage(s.image),opacity=Math.max(0,Math.min(1,Number(d.imageOpacity||0)/100));
  if(img&&d.layout!=='minimal'){
    ctx.save();ctx.globalAlpha=opacity;
    if(d.layout==='split'){
      const iw=Math.round(w*.48),scale=Math.max(iw/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
      ctx.beginPath();ctx.rect(0,0,iw,h);ctx.clip();ctx.drawImage(img,(iw-dw)/2,(h-dh)/2,dw,dh);
    }else drawCoverImage(ctx,img,w,h);
    ctx.restore();
  }
  if(d.layout!=='split'){
    const veil=ctx.createLinearGradient(0,h*.16,0,h);veil.addColorStop(0,'rgba(255,255,255,0)');veil.addColorStop(.54,d.theme==='night'?'rgba(17,19,24,.10)':'rgba(255,255,255,.12)');veil.addColorStop(1,d.theme==='night'?'rgba(17,19,24,.94)':'rgba(255,255,255,.96)');ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
  }
  const scaleText=Math.max(.85,Math.min(1.25,Number(d.fontScale||100)/100)),ink=theme[2],accent=slideAccentColor(d.accent);
  let x=Math.round(w*.075),maxW=Math.round(w*.85),titleY=Math.round(h*.61),align=d.align==='center'?'center':'left';
  if(d.layout==='split'){x=Math.round(w*.55);maxW=Math.round(w*.38);titleY=Math.round(h*.22)}
  if(d.layout==='minimal'){titleY=Math.round(h*.34)}
  if(align==='center'&&d.layout!=='split'){x=Math.round(w/2);maxW=Math.round(w*.82)}
  ctx.textAlign=align;ctx.textBaseline='top';ctx.fillStyle=accent;ctx.fillRect(align==='center'?Math.round(w*.45):x,Math.max(40,titleY-Math.round(58*scaleText)),align==='center'?Math.round(w*.1):Math.round(w*.075),Math.max(7,Math.round(8*scaleText)));
  ctx.fillStyle=ink;ctx.font='800 '+Math.max(22,Math.round(27*scaleText))+'px Arial, sans-serif';ctx.fillText(String(s.kicker||'PLUG ART').toUpperCase(),x,titleY-Math.round(42*scaleText),maxW);
  ctx.font='800 '+Math.max(48,Math.round(76*scaleText))+'px Arial, sans-serif';
  const titleLines=canvasTextLines(ctx,s.title||'Sans titre',maxW,d.layout==='split'?6:4),titleLH=Math.round(Math.max(54,84*scaleText));
  titleLines.forEach((line,i)=>ctx.fillText(line,x,titleY+i*titleLH,maxW));
  const bodyY=titleY+titleLines.length*titleLH+Math.round(28*scaleText);
  ctx.font='400 '+Math.max(22,Math.round(30*scaleText))+'px Arial, sans-serif';ctx.fillStyle=d.theme==='night'?'#d7d9e1':'#343741';
  const bodyLines=canvasTextLines(ctx,s.body||'',maxW,5),bodyLH=Math.round(Math.max(31,42*scaleText));
  bodyLines.forEach((line,i)=>ctx.fillText(line,x,bodyY+i*bodyLH,maxW));
  ctx.fillStyle=ink;ctx.font='800 '+Math.max(22,Math.round(27*scaleText))+'px Arial, sans-serif';
  ctx.fillText(s.cta||'Découvrir →',x,Math.min(h-Math.round(h*.075)-Math.round(30*scaleText),bodyY+bodyLines.length*bodyLH+Math.round(28*scaleText)),maxW);
  for(const l of slideLayers(s)){
    const lx=w*Number(l.x||0)/100,ly=h*Number(l.y||0)/100,lw=w*Number(l.w||20)/100,lh=h*Number(l.h||12)/100;
    ctx.save();ctx.globalAlpha=Number(l.opacity??1);
    if(l.type==='shape'){ctx.fillStyle=l.color||'#7657ff';const r=Math.min(Number(l.radius||0)/100*Math.min(lw,lh),Math.min(lw,lh)/2);ctx.beginPath();if(ctx.roundRect)ctx.roundRect(lx,ly,lw,lh,r);else ctx.rect(lx,ly,lw,lh);ctx.fill()}
    if(l.type==='text'){ctx.fillStyle=l.color||'#111318';ctx.textAlign=l.align||'left';ctx.textBaseline='top';ctx.font=String(l.weight||700)+' '+Math.max(12,Number(l.size||24)*w/1080)+'px Arial, sans-serif';const lines=canvasTextLines(ctx,l.text||'',lw,6);lines.forEach((line,i)=>ctx.fillText(line,lx+(l.align==='center'?lw/2:0),ly+i*Math.max(18,Number(l.size||24)*1.18*w/1080),lw))}
    if(l.type==='image'&&l.src){const im=await loadCanvasImage(l.src,7000);if(im){ctx.beginPath();ctx.rect(lx,ly,lw,lh);ctx.clip();const scale=Math.max(lw/im.naturalWidth,lh/im.naturalHeight),dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;ctx.drawImage(im,lx+(lw-dw)/2,ly+(lh-dh)/2,dw,dh)}}
    ctx.restore();
  }
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',.96));
}

async function exportCarouselSlide(index,quiet=false){
  const blob=await renderCarouselSlideBlob(index);
  if(!blob){if(!quiet)toast('Export PNG impossible');return false}
  triggerBlobDownload(blob,'plug-art-slide-'+String(index+1).padStart(2,'0')+'.png');
  if(!quiet)toast('Slide PNG exportée');
  return true;
}

let zipLibPromise=null;
async function getZipLib(){
  if(!zipLibPromise)zipLibPromise=import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm').then(m=>m.default||m);
  return zipLibPromise;
}
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(blob)});
}
async function renderedCarouselItems(){
  const items=[];
  for(let i=0;i<state.carousel.slides.length;i++){
    const blob=await renderCarouselSlideBlob(i);if(!blob)throw new Error('Rendu slide impossible');
    items.push({filename:'plug-art-slide-'+String(i+1).padStart(2,'0')+'.png',data_url:await blobToDataUrl(blob)});
  }
  return items;
}
async function exportAllCarouselSlides(){
  if(!state.carousel.slides.length)return toast('Aucune slide à exporter');
  const b=$('#carouselExportAll'),old=b.textContent;b.disabled=true;
  try{
    b.textContent='Préparation des slides…';
    const items=await renderedCarouselItems();
    b.textContent='Création ZIP…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
    const r=await fetch('/api/v115/exports/carousel/zip',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','Accept':'application/zip'},body:JSON.stringify({title:'plug-art-carousel',items})});
    clearTimeout(timer);
    if(!r.ok)throw new Error('server-zip');
    triggerBlobDownload(await r.blob(),'plug-art-carousel.zip');toast('Carrousel ZIP exporté');
  }catch(serverErr){
    try{
      const JSZip=await getZipLib(),zip=new JSZip();
      for(let i=0;i<state.carousel.slides.length;i++){
        b.textContent='Prépare '+(i+1)+'/'+state.carousel.slides.length;
        const blob=await renderCarouselSlideBlob(i);
        if(blob)zip.file('plug-art-slide-'+String(i+1).padStart(2,'0')+'.png',blob);
      }
      b.textContent='ZIP local…';
      const archive=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      triggerBlobDownload(archive,'plug-art-carousel.zip');toast('Carrousel ZIP exporté');
    }catch(err){
      for(let i=0;i<state.carousel.slides.length;i++){
        b.textContent='Export '+(i+1)+'/'+state.carousel.slides.length;
        await exportCarouselSlide(i,true);await new Promise(r=>setTimeout(r,160));
      }
      toast('Carrousel exporté en PNG');
    }
  }finally{b.disabled=false;b.textContent=old}
}
async function downloadVisual(){
  if(!state.visual.url)return toast('Génère d’abord un visuel');
  try{
    const r=await fetch(state.visual.url,{mode:'cors'});if(!r.ok)throw new Error('download');
    const blob=await r.blob();triggerBlobDownload(blob,'plug-art-visual.'+((blob.type||'').includes('jpeg')?'jpg':'png'));toast('Visuel téléchargé');
  }catch{
    window.open(state.visual.url,'_blank','noopener');toast('Visuel ouvert pour téléchargement');
  }
}

async function saveRenderedCarouselPublic(){
  if(!state.carousel.slides.length)throw new Error('Aucune slide');
  const items=await renderedCarouselItems();
  const out=await api('/api/v115/exports/carousel/public',{method:'POST',timeout:120000,body:JSON.stringify({items})});
  if(!Array.isArray(out.urls)||!out.urls.length)throw new Error('Aucun média public');
  return out.urls.map(u=>new URL(u,location.origin).href);
}
async function prepareInstagramCaption(){
  if(!state.carousel.slides.length)return toast('Génère d’abord le carrousel');
  const b=$('#carouselCaptionGenerate'),old=b.textContent;b.disabled=true;b.textContent='PLUGY écrit…';
  const source=opportunityById($('#carouselSource')?.value);
  const slides=state.carousel.slides.map((s,i)=>({slide:i+1,title:s.title,body:s.body,cta:s.cta}));
  const prompt='Rédige une légende Instagram PLUG ART claire, naturelle et concise à partir de ces informations. N’invente aucun fait. Termine exactement par : Commente PLUG 🔌 pour être branché et recevoir le lien de candidature. Ajoute 4 à 7 hashtags pertinents maximum. Données : '+JSON.stringify({source:source?.title||'',deadline:source?.deadline||'',slides});
  try{
    const out=await api('/api/v32/plugy',{method:'POST',timeout:60000,body:JSON.stringify({message:prompt,page:'content',mode:'deep'})});
    const caption=String(out.answer||'').trim();if(!caption)throw new Error('Légende vide');
    $('#carouselCaption').value=caption;scheduleDraftAutosave();toast('Légende préparée');
  }catch(e){console.warn('[PLUG ART caption]',e);toast('PLUGY n’a pas pu préparer la légende')}
  finally{b.disabled=false;b.textContent=old}
}
async function publishCarouselInstagram(){
  if(!state.carousel.slides.length)return toast('Aucun carrousel à publier');
  const caption=String($('#carouselCaption')?.value||'').trim();if(!caption)return toast('Ajoute ou génère une légende');
  const b=$('#carouselPublishInstagram'),old=b.textContent;b.disabled=true;b.textContent='Vérification Instagram…';
  try{
    const status=await api('/api/v88/instagram/status',{timeout:15000});
    if(!status.connected)throw new Error('instagram-not-connected');
    b.textContent='Préparation des slides…';
    const urls=await saveRenderedCarouselPublic();
    b.textContent='Publication…';
    const out=await api('/api/v88/instagram/publish',{method:'POST',timeout:120000,body:JSON.stringify({caption,media_urls:urls})});
    toast(out.permalink?'Publié sur Instagram':'Publication Instagram confirmée');
  }catch(e){
    console.warn('[PLUG ART Instagram]',e);
    toast(String(e.message||e).includes('instagram-not-connected')?'Instagram n’est pas connecté':'Publication Instagram impossible');
  }finally{b.disabled=false;b.textContent=old}
}

async function carouselToBureau(){
  if(!state.carousel.slides.length)return;const sourceId=$('#carouselSource').value,source=opportunityById(sourceId);
  const body=state.carousel.slides.map((s,i)=>'SLIDE '+(i+1)+'\n'+[s.kicker,s.title,s.body,s.cta,s.image?'Visuel : '+s.image:''].filter(Boolean).join('\n')).join('\n\n');
  try{const n=await api('/api/v107/bureau',{method:'POST',body:JSON.stringify({title:'Carrousel · '+(source?.title||state.carousel.slides[0].title||'PLUG ART'),body,folder:'Contenus',tags:'carrousel, instagram, PLUG ART',source_type:sourceId?'opportunity':'',source_id:sourceId||''})});state.bureau.unshift(n);if(sourceId)await persistWorkflow(sourceId,{workflow_status:'drafting',next_action:'Finaliser le carrousel dans le Bureau'});toast('Carrousel envoyé au Bureau')}catch{toast('Enregistrement impossible')}
}
async function improveTextContent(kind){
  const current=clean($('#contentBody')?.value),brief=clean($('#contentBrief')?.value);if(!current&&!brief)return toast('Ajoute un texte ou un brief');
  const rules={
    shorten:'Raccourcis ce contenu de 30 à 40 % tout en gardant toutes les informations utiles.',
    premium:'Réécris ce contenu dans une direction premium, éditoriale et naturelle, sans jargon creux.',
    instagram:'Adapte ce contenu pour Instagram avec une accroche forte, une lecture mobile fluide et un CTA clair.',
    direct:'Rends ce contenu plus direct, plus lisible et plus concret. Supprime les répétitions.'
  };
  const out=await askPlugy((rules[kind]||rules.premium)+' N’invente aucun fait. Contenu : '+(current||brief),'#contentBody');if(out)$('#contentStatus').textContent='Affiné';
}
async function improveVisualPrompt(kind){
  const current=clean($('#visualPrompt')?.value);if(!current)return toast('Choisis un preset ou écris un prompt');
  const rules={
    'art-direction':'Transforme ce brief en prompt de direction artistique précis pour une image marketing premium : composition, lumière, matière, profondeur et sujet. Aucun texte lisible dans l’image.',
    marketing:'Renforce ce prompt pour obtenir un vrai key visual de campagne : point focal clair, impact immédiat, espace négatif utile, composition publicitaire contemporaine. Aucun texte lisible.',
    premium:'Rends ce prompt plus haut de gamme, plus éditorial et moins générique. Contrôle lumière, matière, palette et profondeur. Aucun texte lisible.'
  };
  try{
    const out=await api('/api/v32/plugy',{method:'POST',body:JSON.stringify({message:(rules[kind]||rules['art-direction'])+' Brief : '+current,page:'content',mode:'fast'})});
    if(out.answer){$('#visualPrompt').value=String(out.answer).trim();scheduleDraftAutosave()}
  }catch{toast('PLUGY n’a pas pu affiner le prompt')}
}

async function generateVisual(){
  const prompt=clean($('#visualPrompt').value);if(!prompt)return toast('Ajoute un prompt');const b=$('#visualGenerate'),old=b.textContent,usecase=$('#visualUseCase')?.value||'campaign',preset=VISUAL_PRESETS[usecase];b.disabled=true;b.textContent='Génération…';playMotion('Think',true);
  const productionPrompt=prompt+' '+(preset?.prompt||'')+' Direction PLUG ART : image marketing contemporaine, premium, crédible, composition forte. Aucun texte lisible, aucun logo, aucun watermark.';
  try{const r=await api('/api/v32/content/image',{method:'POST',body:JSON.stringify({prompt:productionPrompt,style:$('#visualStyle').value||preset?.style||'editorial',ratio:$('#visualRatio').value||preset?.ratio||'4:5',quality:'medium'})});if(r.url){state.visual={url:r.url,prompt};scheduleDraftAutosave();$('#visualImage').style.backgroundImage='url("'+r.url.replace(/"/g,'%22')+'")';$('#visualImage').innerHTML='';playMotion('Happy')}}catch(e){console.error('[Visual Studio]',e);toast('Visuel : '+String(e?.message||'génération indisponible').replace(/^\{"detail":"?|"?\}$/g,'').slice(0,150))}finally{b.disabled=false;b.textContent=old}
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
  drawer.innerHTML='<div class="call-head"><div><small>OPEN CALL</small><strong id="callTitle">Détail</strong></div><button id="callClose">×</button></div><div class="call-scroll"><div class="call-meta" id="callMeta"></div><p class="call-summary" id="callSummary"></p><div class="call-fields"><label>Suivi<select id="callStatus"><option value="saved">À lire</option><option value="working">À traiter</option><option value="drafting">En rédaction</option><option value="submitted">Envoyé</option><option value="followup">Relance</option><option value="closed">Clos</option></select></label><label>Prochaine action<input id="callNextAction" placeholder="Ex. préparer le dossier"></label><label>Date<input id="callNextDate" type="date"></label><label>Notes<textarea id="callNotes" rows="7" placeholder="Notes de travail…"></textarea></label></div><div class="call-actions"><button id="callFavorite">☆ Favori</button><button id="callPlugy">✦ PLUGY</button><button id="callBureau">▤ Note</button><button id="callPackage">▤ Dossier</button><button class="primary-btn" id="callCreate">Créer</button></div><a class="call-source" id="callSource" target="_blank" rel="noopener">Ouvrir la source ↗</a></div>';
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
  $('#callPackage').onclick=()=>{if(state.activeOpportunity)createPackageForOpportunity(state.activeOpportunity)};
  const st=document.createElement('style');st.id='v107OperationalStyles';st.textContent=`
  .today-panel{min-height:150px}.today-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.today-row{border:1px solid #eceef2;background:#fafbfc;border-radius:15px;padding:10px 11px;display:grid;grid-template-columns:8px 1fr auto;gap:9px;align-items:center;text-align:left}.today-row i{width:8px;height:8px;border-radius:50%;background:#7657ff}.today-row.crm i{background:#57cfcf}.today-row.urgent i{background:#ef6b7a}.today-row strong,.today-row span{display:block}.today-row strong{font-size:10px}.today-row span{font-size:9px;color:#90939d;margin-top:3px}.today-row b{font-size:9px;color:#707480;font-weight:700}.call-drawer{position:fixed;z-index:310;top:12px;right:12px;bottom:12px;width:min(430px,calc(100vw - 24px));background:rgba(255,255,255,.98);border:1px solid #e2e4ea;border-radius:26px;box-shadow:0 30px 90px rgba(20,23,36,.23);transform:translateX(calc(100% + 30px));transition:transform .3s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;overflow:hidden;backdrop-filter:blur(22px)}.call-drawer.open{transform:none}.call-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px;border-bottom:1px solid #eceef2}.call-head small,.call-head strong{display:block}.call-head small{font-size:8px;letter-spacing:1px;color:#999ca7}.call-head strong{font-size:17px;line-height:1.15;margin-top:4px;max-width:330px}.call-head button{border:0;background:#f2f3f6;width:34px;height:34px;border-radius:10px;font-size:18px}.call-scroll{padding:16px;overflow:auto}.call-meta{font-size:9px;color:#777b87;text-transform:uppercase;letter-spacing:.65px}.call-summary{font-size:11px;line-height:1.55;color:#646875;padding:12px 0;margin:0}.call-fields{display:grid;gap:10px}.call-fields label{display:grid;gap:5px;font-size:8px;font-weight:800;color:#91949f;text-transform:uppercase;letter-spacing:.65px}.call-fields input,.call-fields select,.call-fields textarea{padding:10px;font-size:10px;text-transform:none;letter-spacing:0}.call-fields textarea{resize:vertical}.call-actions{display:flex;gap:7px;margin-top:14px;flex-wrap:wrap}.call-actions button{flex:1 1 72px;border:1px solid #e1e3e9;background:#fff;border-radius:11px;padding:10px;font-size:9px;font-weight:800}.call-actions .primary-btn{background:#111318;color:#fff;border-color:#111318}.call-source{display:block;margin-top:12px;font-size:9px;color:#686c77;text-decoration:none}.call-source:hover{text-decoration:underline}@media(max-width:820px){.today-list{grid-template-columns:1fr}} `;
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
  state.activeOpportunity=id;injectOperationalUI();renderPlugyActions();
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
function isoAfterDays(days=1){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);
}
async function quickUpdateLead(id,patch={}){
  const l=state.leads.find(x=>Number(x.id)===Number(id));if(!l)return false;
  try{
    const saved=await api('/api/v86/crm/'+id,{method:'PATCH',body:JSON.stringify({...l,...patch})});
    Object.assign(l,saved);renderDashboard();renderLeads();renderPlugyActions();return true;
  }catch{toast('Mise à jour du contact impossible');return false}
}
async function openTodayItem(item){
  if(item.kind==='crm'){
    route('prospection');
    try{await ensureViewData('prospection');selectLead(item.id)}catch{}
  }else openOpportunity(item.id);
}
async function handleTodayAction(item,action){
  if(!item)return;
  if(item.kind==='call'){
    if(action==='draft'){await persistWorkflow(item.id,{workflow_status:'drafting',next_action:'Finaliser la candidature'});toast('Passé en rédaction')}
    if(action==='sent'){await persistWorkflow(item.id,{workflow_status:'submitted',next_action:'Suivre la réponse'});toast('Marqué envoyé')}
    if(action==='tomorrow'){await persistWorkflow(item.id,{workflow_status:item.workflow_status||'working',next_date:isoAfterDays(1)});toast('Reporté à demain')}
  }else{
    if(action==='contacted'){await quickUpdateLead(item.id,{status:'contacted',next_action:'Attendre le retour'});toast('Contact marqué contacté')}
    if(action==='followup'){await quickUpdateLead(item.id,{status:'followup',next_action:'Relancer la structure',next_date:isoAfterDays(3)});toast('Relance programmée dans 3 jours')}
    if(action==='tomorrow'){await quickUpdateLead(item.id,{next_date:isoAfterDays(1)});toast('Reporté à demain')}
  }
}
function ensureTodayActionStyles(){
  if($('#todayActionStyles'))return;
  const st=document.createElement('style');st.id='todayActionStyles';st.textContent=`
    .today-task{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 4px;border-bottom:1px solid #eef0f3}
    .today-task>i{width:7px;height:7px;border-radius:50%;background:#8c91a0}
    .today-task.urgent>i{background:#e05d68;box-shadow:0 0 0 5px rgba(224,93,104,.08)}
    .today-task.crm>i{background:#5aaab4}
    .today-task-copy{min-width:0}
    .today-task-copy button{display:block;width:100%;border:0;background:transparent;text-align:left;padding:0}
    .today-task-copy strong,.today-task-copy span{display:block}
    .today-task-copy strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .today-task-copy span{font-size:8px;color:#9295a0;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .today-task-side{display:flex;align-items:center;gap:5px}
    .today-task-date{font-size:8px;color:#8c909c;white-space:nowrap}
    .today-task-actions{display:flex;gap:4px}
    .today-task-actions button{border:1px solid #e3e5ea;background:#fff;border-radius:8px;padding:6px 7px;font-size:8px;font-weight:800;color:#5f6370}
    .today-task-actions button.primary{background:#111318;color:#fff;border-color:#111318}
    .today-task-actions button:hover{background:#f7f8fa}
    @media(max-width:820px){
      .today-task{grid-template-columns:9px minmax(0,1fr)}
      .today-task-side{grid-column:2;justify-content:space-between;overflow:auto;padding-bottom:1px}
      .today-task-actions{flex:0 0 auto}
      .today-task-actions button{min-height:32px;white-space:nowrap}
    }
  `;document.head.appendChild(st);
}
function renderToday(){
  const box=$('#todayList');if(!box)return;ensureTodayActionStyles();
  const now=new Date(),today=now.toISOString().slice(0,10),soon=new Date(now.getTime()+7*86400000).toISOString().slice(0,10),items=[];
  state.workflow.filter(w=>w.workflow_status!=='closed').forEach(w=>{
    const o=opportunityById(w.opportunity_id);if(!o)return;
    const due=w.next_date||o.deadline||'';
    if(!due||due<=soon)items.push({kind:'call',id:o.id,title:o.title,sub:w.next_action||workflowLabel(w.workflow_status),date:due,urgent:due&&due<=today,workflow_status:w.workflow_status||'saved'});
  });
  state.leads.filter(l=>l.status!=='closed'&&l.next_date&&l.next_date<=soon).forEach(l=>items.push({kind:'crm',id:l.id,title:l.organization||l.name||'Contact',sub:l.next_action||'Relance',date:l.next_date,urgent:l.next_date<=today,status:l.status||'lead'}));
  (state.bootstrap?.opportunities||[]).filter(o=>{const d=daysLeft(o);return d>=0&&d<=4&&!workflowFor(o.id)}).slice(0,4).forEach(o=>items.push({kind:'call',id:o.id,title:o.title,sub:'Deadline proche',date:o.deadline,urgent:true,workflow_status:'saved'}));
  items.sort((a,b)=>Number(!!b.urgent)-Number(!!a.urgent)||(a.date||'9999').localeCompare(b.date||'9999'));
  const visible=items.slice(0,6);
  box.innerHTML=visible.map((x,i)=>{
    const actions=x.kind==='crm'
      ?'<button data-today-action="contacted" data-today-index="'+i+'">Contacté</button><button data-today-action="followup" data-today-index="'+i+'" class="primary">Relance +3j</button><button data-today-action="tomorrow" data-today-index="'+i+'">Demain</button>'
      :'<button data-today-action="draft" data-today-index="'+i+'">Rédiger</button><button data-today-action="sent" data-today-index="'+i+'" class="primary">Envoyé</button><button data-today-action="tomorrow" data-today-index="'+i+'">Demain</button>';
    return '<div class="today-task '+(x.kind==='crm'?'crm ':'')+(x.urgent?'urgent':'')+'"><i></i><div class="today-task-copy"><button data-today-open="'+i+'"><strong>'+esc(x.title)+'</strong><span>'+esc(x.sub)+'</span></button></div><div class="today-task-side"><span class="today-task-date">'+esc(x.date||'À traiter')+'</span><div class="today-task-actions">'+actions+'</div></div></div>';
  }).join('')||'<div class="empty">Rien d’urgent. Pour une fois, le système n’invente pas du travail.</div>';
  $$('[data-today-open]',box).forEach(b=>b.onclick=()=>openTodayItem(visible[Number(b.dataset.todayOpen)]));
  $$('[data-today-action]',box).forEach(b=>b.onclick=async e=>{e.stopPropagation();b.disabled=true;try{await handleTodayAction(visible[Number(b.dataset.todayIndex)],b.dataset.todayAction)}finally{b.disabled=false}});
}
function handleLocalPlugy(message){
  const m=message.toLowerCase();
  const go=(id,reply)=>{route(id);return reply};

  if(state.view==='opencalls'&&state.activeOpportunity){
    const id=state.activeOpportunity,o=opportunityById(id);
    if(/favori/.test(m)&&!/(affiche|ouvre|liste)/.test(m)){
      toggleFavorite(id);return o?.favorite?'Je retire cet Open Call des favoris.':'Je mets cet Open Call en favori.';
    }
    if(/(dossier|candidature)/.test(m)&&/(crée|cree|ouvre|prépare|prepare|fais)/.test(m)){
      createPackageForOpportunity(id);return 'Je crée le dossier de candidature pour cet Open Call.';
    }
    if(/(bureau|document|note)/.test(m)&&/(envoie|ajoute|mets|transf)/.test(m)){
      opportunityToBureau();return 'J’envoie cet Open Call au Bureau.';
    }
    if(/carrousel/.test(m)&&/(crée|cree|fais|transforme|prépare|prepare)/.test(m)){
      createCarouselForOpportunity(id);return 'Je prépare un carrousel à partir de cet Open Call.';
    }
    if(/(marque|passe|mets).*(envoy|soumis|submit)/.test(m)){
      persistWorkflow(id,{workflow_status:'submitted',next_action:'Suivre la réponse'}).then(()=>renderPlugyActions());return 'Je le marque comme envoyé.';
    }
    if(/(marque|passe|mets|prépare|prepare).*(relance|relancer)/.test(m)){
      persistWorkflow(id,{workflow_status:'followup',next_action:'Relancer la structure'}).then(()=>renderPlugyActions());return 'Je le passe en relance.';
    }
  }

  if(state.view==='prospection'&&state.activeLead){
    if(/(prépare|prepare|écris|ecris|rédige|redige).*(relance|message)/.test(m)){
      $('#leadPlugy')?.click();return 'Je prépare la relance pour ce contact.';
    }
    if(/(bureau|document|note)/.test(m)&&/(envoie|ajoute|mets|transf)/.test(m)){
      $('#leadToBureau')?.click();return 'J’envoie ce contact au Bureau.';
    }
    if(/(marque|passe|mets).*(contacté|contacte)/.test(m)){
      setActiveLeadStatus('contacted');return 'Je marque ce contact comme contacté.';
    }
    if(/(marque|passe|mets).*(relance|relancer)/.test(m)){
      setActiveLeadStatus('followup');return 'Je passe ce contact en relance.';
    }
    if(/(marque|passe|mets).*(chaud|prioritaire)/.test(m)){
      setActiveLeadStatus('hot');return 'Je passe ce contact en opportunité chaude.';
    }
  }

  if(state.view==='bureau'&&state.bureauMode==='packages'&&state.activePackage){
    if(/(génère|genere|prépare|prepare|rédige|redige|complète|complete).*(dossier|candidature|pack)/.test(m)){
      generatePackageWithPlugy();return 'Je génère le dossier de candidature avec les sources disponibles dans le Bureau.';
    }
  }
  if(state.view==='bureau'&&state.activeDoc){
    if(/(création|creation|studio)/.test(m)&&/(envoie|ouvre|transf|mets)/.test(m)){
      sendCurrentBureauToCreation();return 'J’envoie ce document vers Création.';
    }
  }

  if(state.view==='creation'&&state.creationMode==='carousel'&&state.carousel.slides.length){
    if(/(prépare|prepare|génère|genere|écris|ecris).*(légende|legende).*(instagram)?/.test(m)){
      prepareInstagramCaption();return 'Je prépare la légende Instagram.';
    }
  }
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
  if(/(ouvre|va|aller|affiche|montre).*(carte|map|opportunités sur la carte|opportunites sur la carte)/.test(m))return go('map','J’ouvre la Map des opportunités.');
  if(/(ouvre|va|aller|affiche).*(instagram|insta|feed)/.test(m))return go('social','J’ouvre Instagram.');
  if(/(ouvre|va|aller|affiche).*(hub|millénaire|millenaire|aubervilliers)/.test(m)){route('bureau');setTimeout(()=>setBureauMode('hub'),40);return 'J’ouvre le HUB dans le Bureau.';}
  if(/(plein écran|plein ecran|page plugy|mode plugy)/.test(m)){location.href='/plugy';return 'J’ouvre mon espace dédié.';}
  if(/(nouveau|crée|cree).*(document|note)/.test(m)){route('bureau');clearDoc();return 'Nouveau document prêt dans le Bureau.'}
  if(/(nouveau|ajoute|crée|cree).*(contact)/.test(m)){route('prospection');setTimeout(()=>$('#leadNew')?.click(),20);return 'Nouvelle fiche contact ouverte.'}
  if(/(lance|actualise|démarre|demarre).*(radar|recherche)/.test(m)){route('radar');setTimeout(()=>$('#radarRun')?.click(),30);return 'Je lance le Radar.'}
  return '';
}


function installMobileViewportBehavior(){
  const vv=window.visualViewport;
  const sync=()=>{
    const mobile=matchMedia('(max-width:820px)').matches;
    const keyboard=!!(mobile&&vv&&vv.height<window.innerHeight*.74);
    document.body.classList.toggle('mobile-keyboard',keyboard);
    if(keyboard)$('#mobileMoreSheet')?.classList.remove('open');
  };
  sync();
  vv?.addEventListener('resize',sync);
  vv?.addEventListener('scroll',sync);
  addEventListener('orientationchange',()=>setTimeout(sync,180));
}

function installMobileShell(){
  if($('#mobileDock'))return;
  const dock=document.createElement('nav');
  dock.className='mobile-dock';dock.id='mobileDock';dock.setAttribute('aria-label','Navigation mobile');
  dock.innerHTML=
    '<button data-route="dashboard"><b>⌂</b><span>Accueil</span></button>'+
    '<button data-route="radar"><b>◉</b><span>Radar</span></button>'+
    '<button data-route="creation" class="mobile-creation-direct"><b>✦</b><span>Créer</span></button>'+
    '<button data-route="social" class="mobile-instagram-direct"><b>◎</b><span>Insta</span></button>'+
    '<button data-route="map" class="mobile-map-direct"><b>⌖</b><span>Map</span></button>'+
    '<button class="mobile-more" id="mobileMoreButton"><b>•••</b><span>Plus</span></button>';
  document.body.appendChild(dock);

  const sheet=document.createElement('div');
  sheet.className='mobile-more-sheet';sheet.id='mobileMoreSheet';
  sheet.innerHTML='<div class="mobile-more-grid">'+
    '<button data-mobile-route="opencalls"><b>◇</b><span>Open Calls</span></button>'+
    '<button data-mobile-route="bureau"><b>▤</b><span>Bureau</span></button>'+
    '<button data-mobile-route="prospection"><b>◎</b><span>Contacts</span></button>'+
    '<button data-mobile-route="agenda"><b>◷</b><span>Agenda</span></button>'+
    '<button data-mobile-route="network"><b>◌</b><span>Artistes</span></button>'+
    '<button data-mobile-route="map"><b>⌖</b><span>Carte</span></button>'+
    '<button data-mobile-action="search"><b>⌕</b><span>Recherche</span></button>'+
    '<button data-mobile-action="plugy"><b>⌁</b><span>PLUGY</span></button>'+
    '<a class="mobile-plugy-full" href="/plugy"><b>◉</b><span>PLUGY plein écran</span></a>'+
  '</div>';
  document.body.appendChild(sheet);

  $$('[data-route]',dock).forEach(b=>b.onclick=()=>route(b.dataset.route));
  $$('[data-mobile-route]',sheet).forEach(b=>b.onclick=()=>route(b.dataset.mobileRoute));
  $$('[data-mobile-action]',sheet).forEach(b=>b.onclick=()=>{
    sheet.classList.remove('open');
    if(b.dataset.mobileAction==='search')openSearch();
    if(b.dataset.mobileAction==='plugy')openPlugy();
  });
  $('#mobileMoreButton').onclick=()=>{
    const open=!sheet.classList.contains('open');
    sheet.classList.toggle('open',open);
    $('#mobileMoreButton').classList.toggle('active',open||['opencalls','bureau','prospection','agenda','network'].includes(state.view));
  };
  document.addEventListener('pointerdown',e=>{
    if(!sheet.classList.contains('open'))return;
    if(sheet.contains(e.target)||dock.contains(e.target))return;
    sheet.classList.remove('open');
    $('#mobileMoreButton')?.classList.toggle('active',['opencalls','bureau','prospection','agenda','network'].includes(state.view));
  });
}

installMobileShell();
installMobileViewportBehavior();
ensureSaveStatus();syncNetworkState();
adaptDashboardForDrafts();
injectOperationalUI();
installSlideDashboard();

// PLUGY V107.1 interaction layer: one model, richer behavior.
let plugyAmbientTimer=0,plugyPressTimer=0,plugyGazeTimer=0;
function plugyAvailable(name){
  const mv=$('#plugyModel');return !!(mv?.availableAnimations||[]).includes(name);
}
function plugySoftGaze(){
  const mv=$('#plugyModel');if(!mv||state.voice)return;
  const base=plugyFramingFor(mv.parentElement),distance=(base.orbit.match(/([0-9.]+)m$/)||[])[1]||'3.08';
  const yaw=(Math.random()*4-2).toFixed(1),pitch=(75+Math.random()*2).toFixed(1);
  mv.style.setProperty('--plugy-gaze-x',(Math.random()*2.4-1.2).toFixed(1)+'px');
  mv.style.setProperty('--plugy-gaze-y',(Math.random()*1.6-.8).toFixed(1)+'px');
  try{mv.setAttribute('camera-orbit',yaw+'deg '+pitch+'deg '+distance+'m')}catch{}
  clearTimeout(plugyGazeTimer);
  plugyGazeTimer=setTimeout(()=>{applyPlugyFraming(mv.parentElement);mv.style.setProperty('--plugy-gaze-x','0px');mv.style.setProperty('--plugy-gaze-y','0px')},2600+Math.random()*1800);
}
function plugyIsVisible(){
  const mv=$('#plugyModel');return !!(mv&&(plugyDrawerStage()?.contains(mv)||plugyDashboardStage()?.contains(mv)||$('#plugyFollower')?.contains(mv)));
}
let plugyRecentMotions=[];
function choosePlugyMotion(pool){
  const available=pool.filter(x=>plugyAvailable(x)&&!plugyRecentMotions.includes(x));
  const candidates=available.length?available:pool.filter(plugyAvailable);
  if(!candidates.length)return '';
  const pick=candidates[Math.floor(Math.random()*candidates.length)];
  plugyRecentMotions=[pick,...plugyRecentMotions.filter(x=>x!==pick)].slice(0,3);
  return pick;
}
function schedulePlugyBlink(){
  clearTimeout(schedulePlugyBlink.t);
  schedulePlugyBlink.t=setTimeout(()=>{
    const busy=['Think','Charge','Listen','Speak','ArmThink','ArmHello','ArmExplain','ArmShrug','ArmStretch'].includes(document.body.dataset.plugyMotion||'');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const miniVisible=$('#plugyFollower')?.classList.contains('visible')&&!$('#plugyDrawer')?.classList.contains('open');
    if(!reduced&&!miniVisible&&!state.voice&&!busy&&document.visibilityState==='visible'&&plugyIsVisible()&&plugyAvailable('Blink'))playMotion('Blink');
    schedulePlugyBlink();
  },38000+Math.random()*26000);
}
function schedulePlugyAmbient(){
  clearTimeout(plugyAmbientTimer);
  plugyAmbientTimer=setTimeout(()=>{
    if(!state.voice&&document.visibilityState==='visible'&&plugyIsVisible()){
      const busy=['Think','Charge','Listen','Speak','ArmThink'].includes(document.body.dataset.plugyMotion||'');
      if(!busy){
        const motion=choosePlugyMotion(['ArmExplain','ArmShrug','ArmStretch','ArmHello','SoftTurn','Curious','Attentive','Present','Happy']);
        if(motion)playMotion(motion);
        if(Math.random()<.72)plugySoftGaze();
      }
    }
    schedulePlugyAmbient();
  },7600+Math.random()*7200);
}
function startPlugyAmbient(){
  schedulePlugyAmbient();schedulePlugyBlink();
  const scroller=$('.workspace');let raf=0,release=0;
  scroller?.addEventListener('scroll',()=>{
    if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const f=$('#plugyFollower');if(!f?.classList.contains('visible'))return;f.classList.add('travelling');clearTimeout(release);release=setTimeout(()=>f.classList.remove('travelling'),150)});
  },{passive:true});
}
const pm=$('#plugyModel');
pm?.addEventListener('click',()=>{
  const react=choosePlugyMotion(['ArmHello','Happy','ArmExplain','Curious']);
  if(react)playMotion(react);
  plugySoftGaze();
});
pm?.addEventListener('pointerdown',()=>{clearTimeout(plugyPressTimer);plugyPressTimer=setTimeout(()=>{initVoice();playMotion('Attentive',true)},650)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>pm?.addEventListener(ev,()=>clearTimeout(plugyPressTimer)));
startPlugyAmbient();

addEventListener('beforeunload',()=>{if(state.view==='creation'&&state.creationDirty)saveLocalCreationBackup()});
const initial=location.hash.slice(1)||'dashboard';history.replaceState({view:initial},'','#'+initial);route(initial,false);renderSuggestions();loadAll().finally(scheduleSmartPlugyWarm);
})();