
/* PLUG ART V200 — premium dashboard */
(function(){
'use strict';
var q=function(s,r){return (r||document).querySelector(s)};
var qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
function go(route){
  if(window.PLUGART_V202_ROUTE){window.PLUGART_V202_ROUTE(route,true);return}
  var el=q('.nav-item[data-route="'+route+'"]');
  if(el){el.click();return}
  try{if(typeof showView==='function')showView(route)}catch(e){}
}
function plugy(seed){
  try{if(typeof openPlugy==='function'){openPlugy(seed||'');return}}catch(e){}
  var b=q('#topPlugy');if(b)b.click();
}
function loc(o){return [o&&o.city,o&&o.country].filter(Boolean).join(' · ')||(o&&o.location)||'Lieu à confirmer'}
function dt(o){return (o&&(o.deadline||o.event_date||o.date||o.start_date))||'Date à confirmer'}
async function data(force){return window.PLUGART_DASHBOARD_DATA(force)}
var dashboardRenderSequence=0;
async function install(force){
  var renderSequence=++dashboardRenderSequence;
  document.body.classList.add('plugart-v200','plugart-v201','plugart-v202');
  var bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp)bp.textContent='V202';if(sv)sv.textContent='V202';
  var view=q('#view-dashboard');if(!view)return;
  var existing=q('#dashboardV200');
  if(!existing){
  qa('#view-dashboard > .dashboard-grid,#dashboardV176,#slideDashboard,#dashboardV175',view).forEach(function(x){x.hidden=true;x.setAttribute('aria-hidden','true')});
  var root=document.createElement('div');root.id='dashboardV200';
  root.innerHTML=
  '<section class="v202-overview">'+
   '<div class="v202-overview-copy"><div><div class="v202-kicker">PLUG ART · CREATIVE WORKSPACE</div><h2>Moins de bruit.<br><em>Plus d’action.</em></h2><p>Radar, création, dossiers et prospection restent au même endroit, avec une lecture plus simple et moins d’éléments à charger au premier affichage.</p></div><div class="v202-overview-actions"><button data-v200-go="creation">Créer une campagne</button><button data-v200-go="radar">Ouvrir le Radar</button><button data-v200-go="bureau">Accéder au Bureau</button></div></div>'+
   '<button class="v202-plugy-mini" data-v200-plugy aria-label="Ouvrir PLUGY"><span class="v202-plugy-orb" aria-hidden="true"></span><span><small>ASSISTANT</small><strong>PLUGY</strong><em>Ouvrir seulement quand nécessaire</em></span></button>'+
  '</section>'+
  '<section class="v200-commandbar">'+
   '<button class="v200-command" data-v200-go="radar"><b>◉</b><div><strong>Radar</strong><span>Open calls & vernissages</span></div></button>'+
   '<button class="v200-command" data-v200-go="creation"><b>✦</b><div><strong>Labo création</strong><span>Campagnes & carrousels</span></div></button>'+
   '<button class="v200-command" data-v200-go="bureau"><b>▤</b><div><strong>Bureau</strong><span>PDF, dossiers, textes</span></div></button>'+
   '<button class="v200-command" data-v200-go="map"><b>⌖</b><div><strong>Map</strong><span>Opportunités par lieu</span></div></button>'+
   '<button class="v200-command" data-v200-go="social"><b>◎</b><div><strong>Instagram</strong><span>Créer & publier</span></div></button>'+
  '</section>'+
  '<section class="v200-lower"><div class="v200-feed"><div class="v200-section-head"><div><small>RADAR · À REGARDER</small><strong>Opportunités actives</strong></div><button data-v200-go="opencalls">Tout voir →</button></div><div class="v200-opps" id="v200Opps"><div class="empty">Synchronisation…</div></div></div>'+
  '<div class="v200-radar-card"><div class="v200-section-head"><div><small>SIGNAL</small><strong>Vue rapide</strong></div><button data-v200-go="radar">Actualiser →</button></div><div class="v200-signal-grid" id="v200Signals"></div><div class="v200-note">PLUGY reste visible ici en entier. Sur les autres rubriques, il redevient discret pour garder le travail au premier plan.</div></div></section>';
  view.appendChild(root);
  root.addEventListener('click',function(e){
    var g=e.target.closest('[data-v200-go]');if(g)go(g.getAttribute('data-v200-go'));
    if(e.target.closest('[data-v200-plugy]'))plugy('Aide-moi à organiser mon travail PLUG ART.');
    var o=e.target.closest('[data-v200-opp]');if(o){go('creation');window.PLUGART_V200.seedOpportunity(o.getAttribute('data-v200-opp')).catch(function(){window.PLUGART_NOTICE('Source indisponible')})}
  });

  }
  var d=await data(force).catch(function(err){if(force)throw err;return {unavailable:true}}),opps=(d.opportunities||(d.data&&d.data.opportunities)||[]).slice(0,5),stats=d.stats||(d.data&&d.data.stats)||{};
  if(renderSequence!==dashboardRenderSequence)return;
  var list=q('#v200Opps');
  if(list)list.innerHTML=opps.length?opps.map(function(o,i){return '<article class="v200-opp"><div class="v200-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(o.title||'Opportunité')+'</strong><span>'+esc(loc(o))+' · '+esc(dt(o))+'</span></div><button data-v200-opp="'+esc(o.id||'')+'">Créer ↗</button></article>'}).join(''):'<div class="empty">Aucune opportunité chargée.</div>';
  var all=d.opportunities||(d.data&&d.data.opportunities)||[],urgent=all.filter(function(o){var t=Date.parse(o.deadline||'');return Number.isFinite(t)&&t>Date.now()&&t-Date.now()<604800000}).length;
  var sg=q('#v200Signals');
  if(sg)sg.innerHTML=[[stats.opportunities!=null?stats.opportunities:all.length,'Open Calls'],[stats.events!=null?stats.events:'—','Vernissages'],[stats.drafts!=null?stats.drafts:(d.drafts||[]).length,'Brouillons'],[stats.urgent!=null?stats.urgent:urgent,'À traiter vite']].map(function(x){return '<div class="v200-signal"><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div>'}).join('');
}
function boot(){
  install();
  window.PLUGART_V200=window.PLUGART_V200||{};window.PLUGART_V200.go=go;window.PLUGART_V200.refreshDashboard=function(){return install(true)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


/* PLUG ART V202 — shared campaign editor */
(function(){
'use strict';
var q=function(s,r){return (r||document).querySelector(s)};
var qa=function(s,r){return Array.from((r||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var C={da:'editorial',layout:'editorial',ratio:'4:5',slides:[],caption:'',visuals:[],visualMeta:{},visualIndex:0,opps:[],drafts:[],busy:false,source:null,draftId:null,autoMatch:true};
var oppPromise=null,oppLoadedAt=0,draftPromise=null,run=null,recoveryTimer=null;
var DA={
 editorial:{label:'Éditorial',style:'gallery',prompt:'magazine culturel contemporain, galerie européenne raffinée, lumière naturelle, composition éditoriale'},
 brutalist:{label:'Brutal chic',style:'architecture',prompt:'brutalisme chic, architecture culturelle, contrastes francs, matière béton, composition graphique'},
 chromatic:{label:'Chromatique',style:'urban',prompt:'culture contemporaine nocturne, lumière violet et cyan, photographie éditoriale sophistiquée'},
 museum:{label:'Musée minimal',style:'gallery',prompt:'minimalisme muséal, espace d’exposition calme, blanc cassé, matières nobles, composition épurée'},
 poster:{label:'Affiche mode',style:'portrait',prompt:'campagne culturelle de mode, présence humaine artistique, cadrage magazine premium'},
 studio:{label:'Atelier vivant',style:'studio',prompt:'atelier d’artiste contemporain, gestes et matières, lumière documentaire haut de gamme'}
};
var LAYOUTS={editorial:'Éditorial',split:'Split',poster:'Poster',grid:'Grille'};
function status(t,busy){
 var e=q('#c200Status');if(e){e.textContent=t;e.classList.toggle('busy',!!busy)}
 if(busy!==undefined)C.busy=!!busy;
 ['c200Generate','c200MoreVisuals'].forEach(function(id){if(q('#'+id))q('#'+id).disabled=C.busy});
 if(q('#c200Cancel'))q('#c200Cancel').hidden=!C.busy;
}
function facts(){return {name:(q('#c200Name')?.value||'').trim(),place:(q('#c200Place')?.value||'').trim(),date:(q('#c200Date')?.value||'').trim(),brief:(q('#c200Brief')?.value||'').trim()}}
async function request(url,opt,timeout){
 opt=opt||{};var ctrl=new AbortController(),timer=setTimeout(function(){ctrl.abort()},timeout||15000),signal=opt.signal;
 function abort(){ctrl.abort()}if(signal){if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true})}
 try{var r=await fetch(url,Object.assign({cache:'no-store'},opt,{signal:ctrl.signal}));if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}
 finally{clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort)}
}
async function loadOpps(force){
 if(!force&&C.opps.length&&Date.now()-oppLoadedAt<60000)return C.opps;if(oppPromise)return oppPromise;
 oppPromise=request('/api/opportunities').then(function(d){C.opps=Array.isArray(d)?d:(d.opportunities||[]);oppLoadedAt=Date.now();var sel=q('#c200Source');if(sel){sel.innerHTML='<option value="">Brief libre</option>'+C.opps.slice(0,160).map(function(o,i){return '<option value="'+i+'">'+esc(o.title||'Sans titre')+'</option>'}).join('');if(C.source){var at=C.opps.findIndex(function(o){return String(o.id)===String(C.source.id)});sel.value=at>=0?String(at):''}}return C.opps}).finally(function(){oppPromise=null});return oppPromise;
}
async function loadDrafts(){
 if(draftPromise)return draftPromise;draftPromise=request('/api/v108/drafts').then(function(d){C.drafts=Array.isArray(d)?d:[];renderDrafts();return C.drafts}).finally(function(){draftPromise=null});return draftPromise;
}
function renderDrafts(){var sel=q('#c200DraftPicker');if(sel){sel.innerHTML='<option value="">Ouvrir un brouillon</option>'+C.drafts.map(function(d){return '<option value="'+d.id+'">'+esc(d.title||'Brouillon')+'</option>'}).join('');sel.value=C.draftId?String(C.draftId):''}}
async function activate(){install();await Promise.all([loadOpps().catch(function(){status('Sources indisponibles · brief libre disponible')}),loadDrafts().catch(function(){status('Brouillons momentanément indisponibles')})]);return true}
function fallback(label){return '/api/v201/visual-fallback?label='+encodeURIComponent(String(label||facts().name||'PLUG ART').slice(0,90))}
async function sourceVisual(o){
 if(!o?.id)return;var safe='/api/v201/opportunities/'+encodeURIComponent(o.id)+'/media';
 C.visuals=[safe];C.visualIndex=0;C.visualMeta[safe]={kind:'source',pending:true};render();
 try{var ctrl=new AbortController(),timer=setTimeout(function(){ctrl.abort()},18000);try{var r=await fetch(safe,{signal:ctrl.signal,cache:'force-cache'});if(!r.ok)throw new Error('Image indisponible');await r.blob();C.visualMeta[safe]={kind:r.headers.get('X-PLUG-Image-Fallback')?'fallback':'source',fallback:!!r.headers.get('X-PLUG-Image-Fallback')}}finally{clearTimeout(timer)}}catch(_){C.visualMeta[safe]={kind:'fallback',fallback:true}}
 if(C.visuals.includes(safe))renderControls();
}
function fill(o){
 if(!o)return;cancel();C.source=o;C.draftId=null;C.slides=[];C.caption='';C.visuals=[];
 q('#c200Name').value=o.title||'';q('#c200Place').value=[o.venue,o.city,o.country].filter(Boolean).join(' · ');q('#c200Date').value=o.event_date||o.start_date||o.deadline||'';
 q('#c200Brief').value=[o.summary||o.radar_reason||o.description||'',o.source_url||o.url||''].filter(Boolean).join('\n');status('Source Radar chargée',false);render();remember();return sourceVisual(o);
}
function matchName(){var f=facts(),n=f.name.toLowerCase();if(!n||C.source||!C.autoMatch||f.brief||f.place||f.date)return;var o=C.opps.find(function(x){return String(x.title||'').trim().toLowerCase()===n});if(o)return fill(o)}
function snapshot(){var f=facts();return {id:C.draftId,kind:'carousel',title:f.name||C.slides[0]?.title||'Campagne PLUG ART',source_opportunity_id:C.source?.id||'',payload:{editor:'v202',facts:f,slides:C.slides,format:C.ratio,brief:f.brief,instagram_caption:C.caption,da:C.da,layout:C.layout,visuals:C.visuals,visualMeta:C.visualMeta,visualIndex:C.visualIndex}}}
function remember(){document.dispatchEvent(new CustomEvent('plugart:campaign',{detail:snapshot()}));clearTimeout(recoveryTimer);recoveryTimer=setTimeout(function(){try{localStorage.setItem('plugart:v202:campaign',JSON.stringify({draftId:C.draftId,snapshot:snapshot()}));q('#c200Recover').hidden=false}catch(_){status('Session trop volumineuse · enregistre le brouillon')}},300)}
async function save(){
 var button=q('#c200Save');if(button.disabled)return;button.disabled=true;var id=C.draftId;
 try{var d=await request('/api/v108/drafts'+(id?'/'+id:''),{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot())});C.draftId=d.id;C.drafts=C.drafts.filter(function(x){return x.id!==d.id});C.drafts.unshift(d);renderDrafts();remember();status('Brouillon enregistré');if(window.PLUGART_V200.refreshDashboard)window.PLUGART_V200.refreshDashboard().catch(function(){})}
 catch(_){status('Enregistrement impossible · session conservée localement');remember()}
 finally{button.disabled=false}
}
function importDraft(d){
 install();cancel();C.autoMatch=false;var p=d.payload||{},f=p.facts||{};C.source=d.source_opportunity_id?{id:d.source_opportunity_id}:null;C.draftId=d.id||null;
 C.da=DA[p.da]?p.da:'editorial';C.layout=LAYOUTS[p.layout]?p.layout:'editorial';C.ratio=['1:1','9:16','4:5'].includes(p.format)?p.format:'4:5';
 C.slides=Array.isArray(p.slides)?p.slides.map(function(x){return Object.assign({},x)}):d.kind==='text'?[{kicker:'PLUG ART',title:d.title||'',body:p.body||p.brief||''}]:[];
 C.caption=p.instagram_caption||p.caption||'';C.visuals=Array.isArray(p.visuals)?p.visuals.slice():[];if(p.url&&!C.visuals.length)C.visuals=[p.url];C.visualMeta=p.visualMeta||{};C.visualIndex=Number(p.visualIndex)||0;
 q('#c200Name').value=f.name||d.title||C.slides[0]?.title||'';q('#c200Place').value=f.place||'';q('#c200Date').value=f.date||'';q('#c200Brief').value=f.brief||p.brief||p.body||p.prompt||'';
 render();renderDrafts();remember();status('Contenu chargé',false);
}
function importSource(item,type){
 var visual=item.image_url||item.image||'';importDraft({title:item.title||item.name||'Contenu',payload:{facts:{name:item.title||item.name||'',place:[item.venue,item.city,item.country].filter(Boolean).join(' · '),date:item.starts_at||item.deadline||'',brief:item.body||item.summary||item.description||''},slides:[{kicker:type==='idea'?'IDÉE':'PLUG ART',title:item.title||item.name||'',body:item.body||item.summary||'',image:visual}],visuals:visual?[visual]:[]}});
}
function importSlides(slides,options){options=options||{};importDraft({title:options.title||slides[0]?.title||'Carrousel',source_opportunity_id:options.sourceId||'',payload:{slides:slides,format:options.format||'4:5',brief:options.brief||'',instagram_caption:options.caption||''}})}
function partialSlides(raw){
 var at=raw.indexOf('"slides"'),start=raw.indexOf('[',at),slides=[];if(at<0||start<0)return slides;
 var quoted=false,escape=false,depth=0,begin=-1;
 for(var i=start+1;i<raw.length;i++){var c=raw[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}if(c==='"'){quoted=true;continue}if(c==='{'){if(depth===0)begin=i;depth++}if(c==='}'){depth--;if(depth===0&&begin>=0){try{slides.push(JSON.parse(raw.slice(begin,i+1)))}catch(_){}begin=-1}}if(c===']'&&depth===0)break}
 return slides.slice(0,5);
}
async function stream(message,job){
 var r=await fetch('/api/v179/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:message,page:'creation',history:[]}),signal:job.controller.signal,cache:'no-store'});if(!r.ok)throw new Error('PLUGY indisponible');
 var output='',buffer='',fallbackUsed=false,reader=r.body?.getReader(),decoder=new TextDecoder();
 function line(raw){if(!raw.trim())return;var x;try{x=JSON.parse(raw)}catch(_){return}if(x.type==='error')throw new Error(x.message||'Texte interrompu');if(x.type==='delta'){output+=x.delta||'';var slides=partialSlides(output);if(slides.length&&run===job){C.slides=slides;renderSlides();status('Texte en cours · '+slides.length+' / 5 slides',true)}}if(x.type==='done'&&(x.fallback||String(x.model||'').includes('local')))fallbackUsed=true}
 if(reader){try{while(true){var part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});var lines=buffer.split('\n');buffer=lines.pop();lines.forEach(line)}buffer+=decoder.decode();if(buffer)line(buffer)}finally{reader.releaseLock()}}
 else (await r.text()).split('\n').forEach(line);
 if(!output.trim())throw new Error('Réponse vide');return {text:output.trim(),fallback:fallbackUsed};
}
function parse(raw){var t=raw.trim().replace(/^\x60\x60\x60(?:json)?/i,'').replace(/\x60\x60\x60$/,'').trim();var j=JSON.parse(t);if(!Array.isArray(j.slides)||!j.slides.length)throw new Error('Carrousel incomplet');return {slides:j.slides.slice(0,5).map(function(s){return {kicker:String(s.kicker||'PLUG ART'),title:String(s.title||''),body:String(s.body||'')}}),caption:String(j.caption||'')}}
function localCampaign(f){
 var practical=[f.place,f.date].filter(Boolean).join(' · '),context=f.brief.split('\n').filter(function(line){return !/^https?:\/\//.test(line.trim())}).join(' ').slice(0,220);
 return {fallback:true,slides:[{kicker:'EXPOSITION',title:f.name,body:practical},{kicker:'PRÉSENTATION',title:'Le projet',body:context||'Ajoute une présentation de l’exposition.'},{kicker:'REGARD ARTISTIQUE',title:'À découvrir',body:'Précise ici l’angle artistique et les œuvres présentées.'},{kicker:'INFOS PRATIQUES',title:'Préparer sa visite',body:practical||'Complète le lieu et la date avant publication.'},{kicker:'PLUG ART',title:'En savoir plus',body:'Commente PLUG 🔌 pour recevoir le lien.'}],caption:[f.name,practical,context,'Commente PLUG 🔌 pour recevoir le lien.'].filter(Boolean).join('\n\n')};
}
async function generateCopy(job){
 var f=facts(),m=['Tu es directeur éditorial de PLUG ART. Crée un carrousel Instagram de 5 slides.','Utilise uniquement les faits fournis. N’invente aucune date, lieu, artiste ou prix.','Nom : '+f.name,'Lieu : '+(f.place||'non renseigné'),'Date : '+(f.date||'non renseignée'),'Contexte : '+(f.brief||'non renseigné'),'Structure : couverture, présentation, angle artistique, informations pratiques connues, CTA.','Retourne uniquement du JSON valide sans markdown : {"slides":[{"kicker":"","title":"","body":""}],"caption":""}. Titres courts. Corps de slide sous 220 caractères.'].join('\n');
 var out=await stream(m,job);return out.fallback?localCampaign(f):parse(out.text);
}
async function makeVisual(v,job){
 var f=facts(),d=DA[C.da]||DA.editorial,prompt=['Exposition : '+f.name,f.place,f.brief.slice(0,850),d.prompt,'Variation '+v+' avec une composition distincte','Aucun texte lisible, aucun logo, aucune interface.'].filter(Boolean).join('. ');
 return request('/api/v179/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt,style:d.style,ratio:C.ratio,quality:'medium'}),signal:job.controller.signal},85000);
}
async function visualSet(n,append,job){
 var retained=C.visuals.filter(function(u){return !C.visualMeta[u]?.fallback&&!u.includes('/visual-fallback')});if(!append){C.visuals=retained;C.visualIndex=0}var next=0,done={ai:0,fallback:0,failed:0},base=C.visuals.length;
 async function worker(){while(next<n&&!job.controller.signal.aborted){var i=next++;try{var x=await makeVisual(base+i+1,job);if(run!==job)return;if(!x.url)throw new Error('Image absente');if(!x.fallback||!retained.length){C.visuals.push(x.url);C.visualMeta[x.url]={kind:x.fallback?'fallback':'ai',fallback:!!x.fallback}}done[x.fallback?'fallback':'ai']++;render();remember()}catch(err){if(job.controller.signal.aborted)return;done.failed++}if(run===job)status('Visuels : '+done.ai+' image(s) IA · '+done.fallback+' remplacement(s)',true)}}
 await Promise.all(Array.from({length:Math.min(2,n)},worker));return done;
}
function imgFor(i){var slide=C.slides[i]||{},url=slide.image||C.visuals[(C.visualIndex+i)%C.visuals.length]||fallback(slide.title);if(C.visualMeta[url]?.fallback&&!url.includes('/visual-fallback'))url=fallback(slide.title);return url.includes('/api/v201/visual-fallback')&&!/[?&]background=/.test(url)?url+(url.includes('?')?'&':'?')+'background=1':url}
function renderSlides(){
 var h=q('#c200Carousel');if(!h)return;
 if(!C.slides.length){h.innerHTML='<div class="c200-empty"><div><b>Le carrousel apparaîtra ici.</b><span>Renseigne le brief ou importe une idée. Les textes apparaissent avant la fin des visuels.</span></div></div>';return}
 h.innerHTML=C.slides.map(function(s,i){return '<article class="c200-slide" data-slide="'+i+'" style="aspect-ratio:'+C.ratio.replace(':','/')+'"><img class="c200-slide-bg" src="'+esc(imgFor(i))+'" decoding="async" alt="Visuel de la slide '+(i+1)+'"><div class="c200-slide-content"><div class="c200-slide-kicker" contenteditable="true" data-edit="kicker">'+esc(s.kicker||'PLUG ART')+'</div><div class="c200-slide-title" contenteditable="true" data-edit="title">'+esc(s.title||'')+'</div><div class="c200-slide-body" contenteditable="true" data-edit="body">'+esc(s.body||'')+'</div></div></article>'}).join('');
}
function renderControls(){
 var root=q('#creationV200');if(!root)return;root.dataset.da=C.da;root.dataset.layout=C.layout;
 qa('[data-c200-da]',root).forEach(function(b){b.classList.toggle('on',b.dataset.c200Da===C.da)});qa('[data-c200-layout]',root).forEach(function(b){b.classList.toggle('on',b.dataset.c200Layout===C.layout)});
 q('#c200Thumbs').innerHTML=C.visuals.map(function(u,i){return '<button class="c200-thumb '+(i===C.visualIndex?'on':'')+'" data-c200-visual="'+i+'" aria-label="Choisir le visuel '+(i+1)+'"><img src="'+esc(u)+'" alt="Variante '+(i+1)+'" decoding="async"><span>'+(i+1)+'</span></button>'}).join('');
 if(document.activeElement!==q('#c200Legend'))q('#c200Legend').textContent=C.caption;
 var media=Array.from(new Set(C.visuals.concat(C.slides.map(function(s){return s.image}).filter(Boolean)))),replacements=media.filter(function(u){return C.visualMeta[u]?.fallback}).length,pending=media.some(function(u){return C.visualMeta[u]?.pending});q('#c200MediaNote').textContent=pending?'Vérification de l’image source…':replacements?replacements+' visuel(s) de secours · à remplacer':C.visuals.length?'Images disponibles':'';
 q('.c200-stagebar strong').textContent='Carrousel · '+C.ratio+' · '+C.slides.length+' slide(s)';
}
function render(){renderSlides();renderControls();document.dispatchEvent(new CustomEvent('plugart:campaign',{detail:snapshot()}))}
function cancel(){if(run){run.controller.abort();clearTimeout(run.timer);run=null}status('Génération arrêtée · contenu conservé',false)}
function startJob(){var job={controller:new AbortController()};job.timer=setTimeout(function(){job.controller.abort()},100000);run=job;return job}
async function campaign(){
 if(C.busy)return;await matchName();if(!facts().name){status('Ajoute le nom de l’exposition',false);q('#c200Name').focus();return}
 var job=startJob();status('PLUGY prépare les textes et les images…',true);
 var starter=localCampaign(facts());C.slides=starter.slides;C.caption=starter.caption;render();
 var copy=generateCopy(job).then(function(x){if(run===job){C.slides=x.slides;C.caption=x.caption;render();remember()}return x});
 var outcomes=await Promise.allSettled([copy,visualSet(3,false,job)]);
 if(run!==job)return;clearTimeout(job.timer);run=null;
 var images=outcomes[1].status==='fulfilled'?outcomes[1].value:{ai:0,fallback:0,failed:3};
 var local=outcomes[0].status==='fulfilled'&&outcomes[0].value.fallback;
 status(job.controller.signal.aborted?'Délai atteint · contenu reçu conservé':outcomes[0].status==='fulfilled'?(local?'IA texte indisponible · modèle local à compléter':'Campagne prête')+' · '+images.ai+' image(s) IA · '+images.fallback+' secours · '+images.failed+' échec(s)':String(outcomes[0].reason?.message||'Texte indisponible · modèle éditable conservé'),false);
 remember();
}
async function more(){if(C.busy)return;var job=startJob();status('Création des variantes…',true);try{var out=await visualSet(2,true,job);if(run===job)status('Variantes : '+out.ai+' image(s) IA · '+out.fallback+' secours',false)}finally{if(run===job){clearTimeout(job.timer);run=null;status(q('#c200Status').textContent,false)}}}
async function exportCarousel(){
 if(!C.slides.length){status('Crée ou charge des slides à exporter');return}var b=q('#c200Download');b.disabled=true;
 try{if(!window.PLUGART_EXPORT_V202)await new Promise(function(resolve,reject){var s=document.createElement('script'),timer=setTimeout(function(){s.remove();reject(new Error('Export indisponible'))},12000);s.src='/static/plugart_v202_export.js?v=202.20261003.3';s.onload=function(){clearTimeout(timer);resolve()};s.onerror=function(){clearTimeout(timer);s.remove();reject(new Error('Export indisponible'))};document.body.appendChild(s)});await window.PLUGART_EXPORT_V202(snapshot(),C.slides.map(function(_,i){var img=q('#c200Carousel [data-slide="'+i+'"] .c200-slide-bg');return img?.currentSrc||img?.src||imgFor(i)}));status('Carrousel exporté · slides PNG et légende')}
 catch(err){status(err.message||'Export interrompu')}
 finally{b.disabled=false}
}
function install(){
 var view=q('#view-creation');if(!view||q('#creationV200'))return;
 qa(':scope > .page-toolbar,:scope > .creation-studio-shell',view).forEach(function(x){x.hidden=true;x.setAttribute('aria-hidden','true')});
 var root=document.createElement('section');root.id='creationV200';
  root.innerHTML=
   '<div class="c200-intro"><div><small>LABO CRÉATION · CAMPAIGN BUILDER</small><h2>Une exposition entre.<br>Une campagne sort.</h2><p>Donne le nom, récupère les infos du Radar si elles existent, choisis une direction artistique et laisse PLUGY construire le carrousel. Ensuite tu ajustes tout manuellement.</p></div><span class="c200-status" role="status" aria-live="polite" id="c200Status">Prêt à créer</span></div><div class="c200-drafts"><select id="c200DraftPicker" aria-label="Brouillons"><option value="">Ouvrir un brouillon</option></select><button id="c200Save">Enregistrer</button><button id="c200New">Nouvelle campagne</button><button id="c200Recover" hidden>Récupérer la session</button></div>'+
   '<div class="c200-grid">'+
    '<aside class="c200-brief"><div class="c200-panel-title"><small>01 · CONTENU</small><b>Exposition</b></div><label class="c200-field"><span>Source Radar</span><select id="c200Source"><option value="">Brief libre</option></select></label><label class="c200-field"><span>Nom de l’exposition</span><input id="c200Name" placeholder="Ex. La Nationale"></label><div class="c200-inline"><label class="c200-field"><span>Lieu</span><input id="c200Place" placeholder="Paris, galerie…"></label><label class="c200-field"><span>Date</span><input id="c200Date" placeholder="12–28 octobre"></label></div><label class="c200-field"><span>Contexte / angle</span><textarea id="c200Brief" placeholder="Informations clés, artistes, message, public…"></textarea></label><button class="c200-primary" id="c200Generate">✦ Créer toute la campagne</button><button class="c200-cancel" id="c200Cancel" hidden>Annuler la génération</button></aside>'+
    '<main class="c200-stage"><div class="c200-stagebar"><strong>Carrousel · 4:5</strong><div class="c200-mini-actions"><button id="c200CopyCaption">Copier légende</button><button id="c200Download">Exporter le carrousel (.zip)</button></div></div><div class="c200-carousel" id="c200Carousel"></div></main>'+
    '<aside class="c200-control"><div><div class="c200-panel-title"><small>02 · DIRECTION</small><b>DA</b></div><div class="c200-pills" id="c200Da">'+Object.keys(DA).map(function(k){return '<button data-c200-da="'+k+'" class="'+(k===C.da?'on':'')+'">'+esc(DA[k].label)+'</button>'}).join('')+'</div></div><div style="margin-top:18px"><div class="c200-panel-title"><small>03 · STRUCTURE</small><b>Layout</b></div><div class="c200-pills">'+Object.keys(LAYOUTS).map(function(k){return '<button data-c200-layout="'+k+'" class="'+(k===C.layout?'on':'')+'">'+esc(LAYOUTS[k])+'</button>'}).join('')+'</div></div><div style="margin-top:18px"><div class="c200-panel-title"><small>04 · VISUELS</small><b>Variantes</b></div><div class="c200-media-note" id="c200MediaNote" role="status"></div><div class="c200-thumbgrid" id="c200Thumbs"></div><label class="c200-upload">＋ Importer mon image<input type="file" id="c200Upload" accept="image/*"></label><button class="c200-secondary" id="c200MoreVisuals">Générer 2 autres variantes</button></div><div class="c200-legend" id="c200Legend" contenteditable="true" role="textbox" aria-label="Légende Instagram"></div></aside>'+
   '</div>';
 view.appendChild(root);render();
 q('#c200Source').onchange=function(e){if(e.target.value===''){C.source=null;C.autoMatch=false;status('Brief libre · contenu conservé');remember();return}var i=Number(e.target.value);if(Number.isInteger(i)&&C.opps[i])fill(C.opps[i])};
 q('#c200Generate').onclick=campaign;q('#c200MoreVisuals').onclick=more;q('#c200Cancel').onclick=cancel;
 q('#c200Save').onclick=save;q('#c200DraftPicker').onchange=function(e){var d=C.drafts.find(function(x){return String(x.id)===e.target.value});if(d)importDraft(d)};
 q('#c200New').onclick=function(){importDraft({title:'',payload:{facts:{name:''}}});q('#c200Name').value='';C.source=null;C.autoMatch=true;q('#c200Source').value='';render();status('Nouvelle campagne',false)};
 q('#c200Recover').onclick=function(){try{var r=JSON.parse(localStorage.getItem('plugart:v202:campaign')||'null');if(r)importDraft(Object.assign({id:r.draftId},r.snapshot))}catch(_){status('Session non récupérable')}};
 try{q('#c200Recover').hidden=!localStorage.getItem('plugart:v202:campaign')}catch(_){}
 q('#c200CopyCaption').onclick=async function(){if(!C.caption){status('Aucune légende générée');return}try{await navigator.clipboard.writeText(C.caption);status('Légende copiée')}catch(_){status('Copie impossible · sélectionne la légende')}};
 q('#c200Download').onclick=exportCarousel;
 root.addEventListener('click',function(e){var da=e.target.closest('[data-c200-da]');if(da){C.da=da.dataset.c200Da;renderControls();remember()}var layout=e.target.closest('[data-c200-layout]');if(layout){C.layout=layout.dataset.c200Layout;renderControls();remember()}var visual=e.target.closest('[data-c200-visual]');if(visual){C.visualIndex=Number(visual.dataset.c200Visual)||0;C.slides.forEach(function(s){delete s.image});render();remember()}});
 root.addEventListener('input',function(e){var ed=e.target.closest('[data-edit]');if(ed){var i=Number(ed.closest('[data-slide]')?.dataset.slide);if(C.slides[i])C.slides[i][ed.dataset.edit]=ed.textContent.trim()}if(e.target.id==='c200Legend')C.caption=e.target.textContent.trim();remember()});
 q('#c200Upload').onchange=async function(e){var f=e.target.files?.[0];if(!f)return;if(f.size>10000000){status('Image trop grande · limite 10 Mo');return}var button=e.target;button.disabled=true;try{var data=await new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result)};reader.onerror=reject;reader.readAsDataURL(f)}),out=await request('/api/v202/content/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:data})},20000);C.visuals.unshift(out.url);C.visualMeta[out.url]={kind:'upload'};C.visualIndex=0;C.slides.forEach(function(s){delete s.image});render();remember();status('Image importée')}catch(_){status('Import impossible · utilise une image PNG, JPEG ou WebP')}finally{button.disabled=false;button.value=''}};
}
async function seedOpportunity(id){install();var rows=await loadOpps(),o=rows.find(function(x){return String(x.id)===String(id)});if(!o)throw new Error('Source indisponible');return fill(o)}
function boot(){install();if(document.body.dataset.view==='creation')activate();}
document.addEventListener('plugart:media-fallback',function(e){var src=e.detail?.source;if(src&&(C.visuals.includes(src)||C.slides.some(function(s){return s.image===src}))){C.visualMeta[src]={kind:'fallback',fallback:true};renderControls()}});
window.PLUGART_V200=Object.assign(window.PLUGART_V200||{},{activate:activate,opportunitiesData:loadOpps,seedOpportunity:seedOpportunity,generateCampaign:campaign,importSource:importSource,importDraft:importDraft,importSlides:importSlides,snapshot:snapshot,saveDraft:save,exportCarousel:exportCarousel,cancel:cancel,newCampaign:function(){q('#c200New').click()},setCaption:function(value){C.caption=String(value||'');renderControls();remember()}});
document.addEventListener('plugart:route',function(e){if(e.detail.route==='creation')activate()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
