
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
async function data(){
  try{
    var raw=sessionStorage.getItem('plugart:v124:dashboard-bootstrap');
    if(raw){
      var cached=JSON.parse(raw);
      if(cached&&cached.boot&&Date.now()-Number(cached.savedAt||0)<600000)return cached.boot;
    }
  }catch(e){}
  try{
    var r=await fetch('/api/v124/dashboard-bootstrap',{cache:'no-store'});if(!r.ok)return {};
    var d=await r.json();
    try{sessionStorage.setItem('plugart:v124:dashboard-bootstrap',JSON.stringify({savedAt:Date.now(),boot:d}))}catch(e){}
    return d;
  }catch(e){return{}}
}
async function install(){
  document.body.classList.add('plugart-v200','plugart-v201','plugart-v202');
  var bp=q('#buildPill'),sv=q('#sidebarVersion');if(bp)bp.textContent='V202';if(sv)sv.textContent='V202';
  var view=q('#view-dashboard');if(!view||q('#dashboardV200'))return;
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
    var o=e.target.closest('[data-v200-opp]');if(o){go('creation');setTimeout(function(){if(window.PLUGART_V200&&window.PLUGART_V200.seedOpportunity)window.PLUGART_V200.seedOpportunity(o.getAttribute('data-v200-opp'))},300)}
  });

  var d=await data(),opps=(d.opportunities||(d.data&&d.data.opportunities)||[]).slice(0,5),stats=d.stats||(d.data&&d.data.stats)||{};
  var list=q('#v200Opps');
  if(list)list.innerHTML=opps.length?opps.map(function(o,i){return '<article class="v200-opp"><div class="v200-index">'+String(i+1).padStart(2,'0')+'</div><div><strong>'+esc(o.title||'Opportunité')+'</strong><span>'+esc(loc(o))+' · '+esc(dt(o))+'</span></div><button data-v200-opp="'+esc(o.id||'')+'">Créer ↗</button></article>'}).join(''):'<div class="empty">Aucune opportunité chargée.</div>';
  var all=d.opportunities||(d.data&&d.data.opportunities)||[],urgent=all.filter(function(o){var t=Date.parse(o.deadline||'');return Number.isFinite(t)&&t>Date.now()&&t-Date.now()<604800000}).length;
  var sg=q('#v200Signals');
  if(sg)sg.innerHTML=[[stats.opportunities!=null?stats.opportunities:all.length,'Open Calls'],[stats.events!=null?stats.events:(d.events||[]).length,'Vernissages'],[stats.drafts!=null?stats.drafts:(d.drafts||[]).length,'Brouillons'],[stats.urgent!=null?stats.urgent:urgent,'À traiter vite']].map(function(x){return '<div class="v200-signal"><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></div>'}).join('');
}
function boot(){
  install();
  var ob=new MutationObserver(function(){document.body.classList.add('plugart-v200','plugart-v201','plugart-v202');if(q('#view-dashboard')&&!q('#dashboardV200'))install()});
  ob.observe(document.body,{childList:true,subtree:true});
  window.PLUGART_V200=window.PLUGART_V200||{};window.PLUGART_V200.go=go;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


/* PLUG ART V200 — campaign builder */
(function(){
'use strict';
var q=function(s,r){return (r||document).querySelector(s)};
var qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
var C={da:'editorial',layout:'editorial',ratio:'4:5',slides:[],caption:'',visuals:[],visualIndex:0,opps:[],busy:false,source:null};
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
  C.busy=!!busy;var b=q('#c200Generate');if(b)b.disabled=!!busy;
}
function facts(){
  return {
    name:(q('#c200Name')&&q('#c200Name').value||'').trim(),
    place:(q('#c200Place')&&q('#c200Place').value||'').trim(),
    date:(q('#c200Date')&&q('#c200Date').value||'').trim(),
    brief:(q('#c200Brief')&&q('#c200Brief').value||'').trim()
  };
}
async function loadOpps(){
  try{
    var r=await fetch('/api/opportunities',{cache:'no-store'});if(!r.ok)return;
    var d=await r.json();C.opps=Array.isArray(d)?d:(d.opportunities||d.data||[]);
    var s=q('#c200Source');
    if(s)s.innerHTML='<option value="">Brief libre</option>'+C.opps.slice(0,160).map(function(o,i){return '<option value="'+i+'">'+esc(o.title||'Sans titre')+'</option>'}).join('');
  }catch(e){}
}
async function sourceVisual(o){
  if(!o||!o.id)return;
  try{
    var r=await fetch('/api/v67/opportunities/'+encodeURIComponent(o.id)+'/media',{cache:'force-cache'});
    var d=r.ok?await r.json():null;
    if(d&&d.media&&d.media.length){
      var safe='/api/v201/opportunities/'+encodeURIComponent(o.id)+'/media';
      C.visuals=[safe].concat(C.visuals.filter(function(x){return x!==safe}));
      C.visualIndex=0;render();
    }
  }catch(e){}
}
function fill(o){
  if(!o)return;C.source=o;
  q('#c200Name').value=o.title||'';
  q('#c200Place').value=[o.venue,o.city,o.country].filter(Boolean).join(' · ');
  q('#c200Date').value=o.event_date||o.start_date||o.deadline||'';
  q('#c200Brief').value=[o.summary||o.radar_reason||o.description||'',o.url?'Source liée au Radar':''].filter(Boolean).join('\n');
  status('Source Radar chargée');
  sourceVisual(o);
}
function matchName(){
  var n=(q('#c200Name')&&q('#c200Name').value||'').trim().toLowerCase();if(!n)return;
  var o=C.opps.find(function(x){return String(x.title||'').trim().toLowerCase()===n});
  if(!o)o=C.opps.find(function(x){var t=String(x.title||'').toLowerCase();return t.indexOf(n)>=0||n.indexOf(t)>=0});
  if(o)fill(o);
}
async function stream(message){
  var r=await fetch('/api/v179/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:message,page:'creation',history:[]}),cache:'no-store'});
  if(!r.ok)throw new Error('PLUGY indisponible');
  var text=await r.text(),out='';
  text.split('\n').forEach(function(line){try{var x=JSON.parse(line);if(x.type==='delta')out+=x.delta||''}catch(e){}});
  if(!out.trim())throw new Error('Réponse vide');return out.trim();
}
function parse(raw){
  var t=raw.trim().replace(/^\x60\x60\x60(?:json)?/i,'').replace(/\x60\x60\x60$/,'').trim();
  try{
    var j=JSON.parse(t);
    if(Array.isArray(j.slides)&&j.slides.length)return {slides:j.slides.slice(0,5),caption:String(j.caption||'')};
  }catch(e){}
  var c=t.split(/SLIDE\s*\d+\s*[:\-]/i).slice(1);
  if(c.length)return {slides:c.slice(0,5).map(function(x,i){var p=x.trim().split('\n').filter(Boolean);return {kicker:'PLUG ART',title:p[0]||('Slide '+(i+1)),body:p.slice(1).join(' ').slice(0,220)}}),caption:''};
  return {slides:[{kicker:'PLUG ART',title:facts().name||'Exposition',body:t.slice(0,220)}],caption:t};
}
async function generateCopy(){
  var f=facts();if(!f.name)throw new Error("Ajoute le nom de l'exposition");
  var m=[
   'Tu es directeur éditorial de PLUG ART. Crée un carrousel Instagram marketing de 5 slides pour annoncer une exposition.',
   'Utilise uniquement les faits fournis. N’invente aucune date, lieu, artiste, prix ou information.',
   'Nom : '+f.name,'Lieu : '+(f.place||'non renseigné'),'Date : '+(f.date||'non renseignée'),'Contexte : '+(f.brief||'non renseigné'),
   'Structure : 1 couverture forte, 2 présentation de l’exposition, 3 angle artistique, 4 informations pratiques connues, 5 CTA PLUG ART.',
   'Retourne uniquement du JSON valide sans markdown : {"slides":[{"kicker":"","title":"","body":""}],"caption":""}.',
   'Titres courts. Texte de chaque slide sous 220 caractères. Ton culturel, actuel, premium et clair.'
  ].join('\n');
  return parse(await stream(m));
}
async function makeVisual(v){
  var f=facts(),d=DA[C.da]||DA.editorial;
  var prompt=[
   'Exposition : '+f.name,
   f.place?'Contexte géographique : '+f.place:'',
   f.brief?'Contexte : '+f.brief.slice(0,850):'',
   d.prompt,
   'Variation '+v+' avec cadrage et composition distincts',
   'Visuel artistique crédible pour un carrousel Instagram culturel premium. Aucun texte lisible, aucun logo, aucune interface.'
  ].filter(Boolean).join('. ');
  var r=await fetch('/api/v179/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt,style:d.style,ratio:C.ratio,quality:'medium'}),cache:'no-store'});
  var j=await r.json().catch(function(){return{}});
  if(!r.ok||!j.url)throw new Error(j.detail||'Image indisponible');return j.url;
}
async function visualSet(n,append){
  var jobs=[];for(var i=0;i<n;i++)jobs.push(makeVisual((append?C.visuals.length:0)+i+1));
  var done=await Promise.allSettled(jobs),urls=done.filter(function(x){return x.status==='fulfilled'}).map(function(x){return x.value});
  C.visuals=append?C.visuals.concat(urls):urls;if(!append)C.visualIndex=0;render();return urls.length;
}
function imgFor(i){if(C.visuals.length)return C.visuals[(C.visualIndex+i)%C.visuals.length]||C.visuals[C.visualIndex]||'';var sl=C.slides[i]||C.slides[0]||{};var label=sl.title||facts().name||'PLUG ART';return '/api/v201/visual-fallback?label='+encodeURIComponent(String(label).slice(0,90))+'&seed='+encodeURIComponent(String(facts().name||label).slice(0,120))}
function renderSlides(){
  var h=q('#c200Carousel');if(!h)return;
  if(!C.slides.length){h.innerHTML='<div class="c200-empty"><div><b>Le carrousel apparaîtra ici.</b><span>Entre simplement le nom de l’exposition. PLUGY compose ensuite le récit, les slides et les visuels.</span></div></div>';return}
  h.innerHTML=C.slides.map(function(s,i){
    var u=imgFor(i),st=u?' style="background-image:url(&quot;'+esc(u)+'&quot;)"':'';
    return '<article class="c200-slide" data-slide="'+i+'><div class="c200-slide-bg"'+st+'></div><div class="c200-slide-content"><div class="c200-slide-kicker" contenteditable="true" data-edit="kicker">'+esc(s.kicker||'PLUG ART · EXPOSITION')+'</div><div class="c200-slide-title" contenteditable="true" data-edit="title">'+esc(s.title||'')+'</div><div class="c200-slide-body" contenteditable="true" data-edit="body">'+esc(s.body||'')+'</div></div></article>';
  }).join('');
}
function renderControls(){
  var root=q('#creationV200');if(!root)return;
  root.setAttribute('data-da',C.da);root.setAttribute('data-layout',C.layout);
  qa('[data-c200-da]',root).forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c200-da')===C.da)});
  qa('[data-c200-layout]',root).forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c200-layout')===C.layout)});
  var th=q('#c200Thumbs');
  if(th)th.innerHTML=C.visuals.length?C.visuals.map(function(u,i){return '<button class="c200-thumb '+(i===C.visualIndex?'on':'')+'" data-c200-visual="'+i+'" style="background-image:url(&quot;'+esc(u)+'&quot;)"><span>'+(i+1)+'</span></button>'}).join(''):'<div style="grid-column:1/-1;color:#85827b;font-size:10px">Les variantes générées apparaîtront ici.</div>';
  var lg=q('#c200Legend');if(lg)lg.textContent=C.caption||'La légende Instagram sera générée avec le carrousel.';
}
function render(){renderSlides();renderControls()}
async function campaign(){
  if(C.busy)return;matchName();if(!facts().name){status("Ajoute le nom de l'exposition");q('#c200Name').focus();return}
  status('PLUGY construit la campagne…',true);
  try{
    var results=await Promise.all([generateCopy(),visualSet(3,false)]);
    C.slides=results[0].slides;C.caption=results[0].caption;render();
    status(results[1]?'Campagne prête · 3 directions visuelles':'Texte prêt · visuels à relancer');
  }catch(e){status((e&&e.message)||'Génération interrompue')}
  finally{C.busy=false;var b=q('#c200Generate');if(b)b.disabled=false}
}
async function more(){
  if(C.busy)return;status('Création de nouvelles variantes…',true);
  try{var n=await visualSet(2,true);status(n?'Variantes ajoutées':'Aucune nouvelle variante')}catch(e){status('Variantes indisponibles')}
  finally{C.busy=false;var b=q('#c200Generate');if(b)b.disabled=false}
}
function install(){
  var view=q('#view-creation');if(!view||q('#creationV200'))return;
  qa(':scope > .page-toolbar,:scope > .creation-studio-shell',view).forEach(function(x){x.hidden=true;x.setAttribute('aria-hidden','true')});
  var root=document.createElement('section');root.id='creationV200';root.setAttribute('data-da',C.da);root.setAttribute('data-layout',C.layout);
  root.innerHTML=
   '<div class="c200-intro"><div><small>LABO CRÉATION · CAMPAIGN BUILDER</small><h2>Une exposition entre.<br>Une campagne sort.</h2><p>Donne le nom, récupère les infos du Radar si elles existent, choisis une direction artistique et laisse PLUGY construire le carrousel. Ensuite tu ajustes tout manuellement.</p></div><span class="c200-status" id="c200Status">Prêt à créer</span></div>'+
   '<div class="c200-grid">'+
    '<aside class="c200-brief"><div class="c200-panel-title"><small>01 · CONTENU</small><b>Exposition</b></div><label class="c200-field"><span>Source Radar</span><select id="c200Source"><option value="">Brief libre</option></select></label><label class="c200-field"><span>Nom de l’exposition</span><input id="c200Name" placeholder="Ex. La Nationale"></label><div class="c200-inline"><label class="c200-field"><span>Lieu</span><input id="c200Place" placeholder="Paris, galerie…"></label><label class="c200-field"><span>Date</span><input id="c200Date" placeholder="12–28 octobre"></label></div><label class="c200-field"><span>Contexte / angle</span><textarea id="c200Brief" placeholder="Informations clés, artistes, message, public…"></textarea></label><button class="c200-primary" id="c200Generate">✦ Créer toute la campagne</button></aside>'+
    '<main class="c200-stage"><div class="c200-stagebar"><strong>Carrousel · 4:5</strong><div class="c200-mini-actions"><button id="c200CopyCaption">Copier légende</button><button id="c200Download">Télécharger visuel</button></div></div><div class="c200-carousel" id="c200Carousel"></div></main>'+
    '<aside class="c200-control"><div><div class="c200-panel-title"><small>02 · DIRECTION</small><b>DA</b></div><div class="c200-pills" id="c200Da">'+Object.keys(DA).map(function(k){return '<button data-c200-da="'+k+'" class="'+(k===C.da?'on':'')+'">'+esc(DA[k].label)+'</button>'}).join('')+'</div></div><div style="margin-top:18px"><div class="c200-panel-title"><small>03 · STRUCTURE</small><b>Layout</b></div><div class="c200-pills">'+Object.keys(LAYOUTS).map(function(k){return '<button data-c200-layout="'+k+'" class="'+(k===C.layout?'on':'')+'">'+esc(LAYOUTS[k])+'</button>'}).join('')+'</div></div><div style="margin-top:18px"><div class="c200-panel-title"><small>04 · VISUELS</small><b>Variantes</b></div><div class="c200-thumbgrid" id="c200Thumbs"></div><label class="c200-upload">＋ Importer mon image<input type="file" id="c200Upload" accept="image/*"></label><button class="c200-secondary" id="c200MoreVisuals">Générer 2 autres variantes</button></div><div class="c200-legend" id="c200Legend"></div></aside>'+
   '</div>';
  view.appendChild(root);render();loadOpps();
  q('#c200Source').onchange=function(e){var i=Number(e.target.value);if(Number.isFinite(i)&&C.opps[i])fill(C.opps[i])};
  q('#c200Name').addEventListener('blur',matchName);
  q('#c200Generate').onclick=campaign;q('#c200MoreVisuals').onclick=more;
  q('#c200CopyCaption').onclick=async function(){if(!C.caption){status('Aucune légende générée');return}try{await navigator.clipboard.writeText(C.caption);status('Légende copiée')}catch(e){status('Copie impossible')}};
  q('#c200Download').onclick=function(){var u=C.visuals[C.visualIndex];if(!u){status('Aucun visuel à télécharger');return}var a=document.createElement('a');a.href=u;a.download='PLUG_ART_'+(facts().name||'visuel').replace(/\W+/g,'_')+'.png';document.body.appendChild(a);a.click();a.remove()};
  q('#c200Da').onclick=function(e){var b=e.target.closest('[data-c200-da]');if(b){C.da=b.getAttribute('data-c200-da');renderControls()}};
  root.addEventListener('click',function(e){var b=e.target.closest('[data-c200-layout]');if(b){C.layout=b.getAttribute('data-c200-layout');renderControls()}var v=e.target.closest('[data-c200-visual]');if(v){C.visualIndex=Number(v.getAttribute('data-c200-visual'))||0;render()}});
  root.addEventListener('input',function(e){var ed=e.target.closest('[data-edit]');if(!ed)return;var s=ed.closest('[data-slide]'),i=Number(s&&s.getAttribute('data-slide'));if(C.slides[i])C.slides[i][ed.getAttribute('data-edit')]=ed.textContent.trim()});
  q('#c200Upload').onchange=function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){C.visuals.unshift(String(rd.result));C.visualIndex=0;render();status('Image importée')};rd.readAsDataURL(f)};
}
function seedOpportunity(id){
  install();
  var o=C.opps.find(function(x){return String(x.id)===String(id)});
  if(o)fill(o);else setTimeout(function(){var x=C.opps.find(function(y){return String(y.id)===String(id)});if(x)fill(x)},900);
}
function boot(){
  install();
  var ob=new MutationObserver(function(){if(q('#view-creation')&&!q('#creationV200'))install()});ob.observe(document.body,{childList:true,subtree:true});
  window.PLUGART_V200=window.PLUGART_V200||{};window.PLUGART_V200.seedOpportunity=seedOpportunity;window.PLUGART_V200.generateCampaign=campaign;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
