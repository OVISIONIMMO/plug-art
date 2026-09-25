
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function api(url,opt={}){
  const headers={'Accept':'application/json',...(opt.body?{'Content-Type':'application/json'}:{}),...(opt.headers||{})};
  const r=await fetch(url,{cache:'no-store',...opt,headers});
  if(!r.ok)throw new Error((await r.text())||('HTTP '+r.status));
  const ct=r.headers.get('content-type')||'';
  return ct.includes('json')?r.json():r.text();
}
function toast(msg){
  let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2400);
}

/* ---------------- PLUGY V156 ---------------- */
function stabilizePlugy(){
  const mv=$('#plugyModel');if(!mv)return;
  const forbidden=new Set(['Blink','DoubleBlink','Wink','SoftEyes','EyeThink']);
  const fix=()=>{
    try{
      if(forbidden.has(String(mv.animationName||''))){
        const a=mv.availableAnimations||[];
        mv.animationName=a.includes('Idle')?'Idle':(a[0]||'');
        mv.timeScale=.78;mv.play?.({repetitions:Infinity});
      }
      mv.setAttribute('animation-crossfade-duration','120');
      mv.setAttribute('shadow-intensity','0');
      mv.setAttribute('exposure','.78');
    }catch{}
  };
  mv.addEventListener('load',fix,{once:true});
  new MutationObserver(fix).observe(document.body,{attributes:true,attributeFilter:['data-plugy-motion']});
  setInterval(fix,4500);
}
function repositionPlugyByRoute(){
  const follower=$('#plugyFollower');if(!follower)return;
  const view=document.body.dataset.view||'dashboard';
  follower.dataset.zone=view;
}
function watchPlugyFollower(){
  const obs=new MutationObserver(()=>{
    const f=$('#plugyFollower');
    if(f){
      f.classList.add('v156-integrated');
      const status=f.querySelector('.plugy-follower-status');if(status)status.innerHTML='<i></i><span>PLUGY</span>';
      repositionPlugyByRoute();
      stabilizePlugy();
    }
  });
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-view']});
  repositionPlugyByRoute();stabilizePlugy();
}

/* ---------------- CREATION / OPEN CALL CONTROL ---------------- */
function creationChecklist(){
  const source=$('#carouselSource'),brief=String($('#carouselBrief')?.value||''),slides=$$('#carouselThumbs [data-slide], .carousel-strip [data-slide], .carousel-thumb');
  const title=String($('#carouselTitle')?.textContent||''),body=String($('#carouselBody')?.textContent||'');
  const text=(brief+' '+title+' '+body).toLowerCase();
  const sourceOk=!!source?.value;
  const deadline=/deadline|clôture|cloture|candidature.*(?:avant|jusqu)/i.test(text);
  const place=/paris|france|london|londres|madrid|milano|milan|barcelona|bruxelles|brussels|lyon|marseille|gennevilliers|aubervilliers|belgique|italie|espagne|portugal|pays/i.test(text);
  const eligibility=/artiste|peint|photo|discipline|émergent|emergent|ouvert/i.test(text);
  const fee=/gratuit|free|frais|€|euro/i.test(text);
  const cta=/plug|candidater|comment/i.test(text);
  const media=!!($('#carouselImage')?.style.backgroundImage&&$('#carouselImage').style.backgroundImage!=='none') || $$('.canvas-layer.image,.free-layer.image').length>0;
  return [
    ['Source officielle',sourceOk],
    ['Deadline visible',deadline],
    ['Lieu / territoire',place],
    ['Éligibilité',eligibility],
    ['Frais / gratuité',fee],
    ['CTA PLUG',cta],
    ['Visuel prêt',media],
    ['Slides',slides.length>0]
  ];
}
function showCreationAudit(){
  let box=$('#v156CreationAudit');
  if(!box)return;
  const rows=creationChecklist(),done=rows.filter(x=>x[1]).length;
  box.innerHTML='<div class="v156-audit-head"><div><small>CONTRÔLE AVANT PUBLICATION</small><strong>'+done+' vérifications prêtes</strong></div><button id="v156AuditClose">×</button></div>'+
    '<div class="v156-audit-list">'+rows.map(([label,ok])=>'<div class="'+(ok?'ok':'todo')+'"><i>'+(ok?'✓':'○')+'</i><span>'+escapeHtml(label)+'</span></div>').join('')+'</div>'+
    '<p>Le contrôle ne remplace pas la vérification de la source officielle. Il évite surtout les oublis bêtes, cette spécialité très humaine.</p>';
  box.classList.add('open');$('#v156AuditClose')?.addEventListener('click',()=>box.classList.remove('open'));
}
function installCreationPro(){
  if($('#v156CreationTools')||!$('#view-creation'))return;
  const target=$('#creationQuickFlow')||$('#creationModeMount')||$('#view-creation .creation-studio-shell');
  if(!target)return;
  const bar=document.createElement('section');bar.id='v156CreationTools';bar.className='v156-creation-tools';
  bar.innerHTML=
    '<div class="v156-tool-intro"><small>PLUG ART · PUBLICATION KIT</small><strong>Créer sans chercher où cliquer.</strong><span>Templates, vérification Open Call, visuels et publication au même endroit.</span></div>'+
    '<div class="v156-template-row">'+
      '<button data-v156-template="open-call"><b>OPEN CALL</b><span>Annonce complète</span></button>'+
      '<button data-v156-template="last-call"><b>DEADLINE</b><span>Dernier appel</span></button>'+
      '<button data-v156-template="event"><b>EVENT</b><span>Expo / rendez-vous</span></button>'+
      '<button data-v156-template="artist"><b>ARTISTE</b><span>Focus profil</span></button>'+
      '<button data-v156-template="partnership"><b>PARTENAIRE</b><span>Institution / lieu</span></button>'+
    '</div>'+
    '<div class="v156-tool-actions">'+
      '<button id="v156GenerateMedia">✦ Générer les visuels manquants</button>'+
      '<button id="v156RepairCanvas">Réparer l’aperçu</button>'+
      '<button id="v156Audit">Vérifier avant publication</button>'+
      '<button class="primary" id="v156Instagram">◎ Préparer Instagram</button>'+
    '</div>';
  target.insertAdjacentElement('afterend',bar);
  const audit=document.createElement('aside');audit.id='v156CreationAudit';audit.className='v156-creation-audit';$('#view-creation').appendChild(audit);
  $$('[data-v156-template]',bar).forEach(b=>b.onclick=()=>{
    const key=b.dataset.v156Template;
    const real=$('[data-marketing-template="'+key+'"]');
    if(real){real.click();toast('Template '+b.querySelector('b').textContent+' chargé')}
    else toast('Le Studio termine son chargement…');
  });
  $('#v156GenerateMedia').onclick=()=>{const b=$('#carouselGenerateAll');if(b)b.click();else toast('Passe en mode Mise en page')};
  $('#v156RepairCanvas').onclick=()=>{normalizeStudioVisuals();toast('Aperçu recalibré')};
  $('#v156Audit').onclick=showCreationAudit;
  $('#v156Instagram').onclick=()=>{
    const btn=$('#queueInstagramBtn')||$('[data-route="social"]');
    if(btn)btn.click();else location.hash='social';
  };
  normalizeStudioVisuals();
}
function normalizeStudioVisuals(){
  const canvas=$('#carouselCanvas');
  if(canvas){canvas.style.overflow='hidden';canvas.style.isolation='isolate'}
  const img=$('#carouselImage');
  if(img){
    img.style.backgroundSize='cover';img.style.backgroundPosition='center';img.style.backgroundRepeat='no-repeat';
    img.style.opacity=img.style.backgroundImage&&img.style.backgroundImage!=='none'?'1':'';
  }
  $$('.canvas-layer.image,.free-layer.image,.studio-image-card,.visual-card').forEach(el=>{
    el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.style.backgroundRepeat='no-repeat';
  });
  $$('img').filter(x=>x.closest('#view-creation')).forEach(x=>{x.style.objectFit='cover';x.style.display='block'});
}

/* ---------------- BUREAU PDF ---------------- */
let pdfFiles=[],activePdf=null;
function ensurePdfMode(){
  const bar=$('#bureauModeBar'),view=$('#view-bureau');if(!bar||!view||$('#bureauPdfMode'))return;
  const span=bar.querySelector('span');
  const btn=document.createElement('button');btn.id='bureauPdfTab';btn.textContent='PDF';btn.dataset.v156BureauMode='pdf';
  bar.insertBefore(btn,span||null);
  const panel=document.createElement('section');panel.id='bureauPdfMode';panel.className='bureau-mode-panel v156-pdf-mode';
  panel.innerHTML=
   '<aside class="panel v156-pdf-nav">'+
    '<div class="v156-pdf-upload"><label>＋ Ajouter un PDF<input id="v156PdfUpload" type="file" accept="application/pdf" hidden></label></div>'+
    '<div class="v156-pdf-filters"><input id="v156PdfSearch" placeholder="Rechercher un PDF…"><select id="v156PdfProject"><option value="">Tous les projets</option><option>Aubervilliers</option><option>Le Millénaire</option><option>Gennevilliers</option><option>Open Calls</option><option>Administratif</option></select></div>'+
    '<div id="v156PdfList" class="v156-pdf-list"></div>'+
   '</aside>'+
   '<section class="panel v156-pdf-viewer">'+
    '<div class="v156-pdf-head"><div><small>DOCUMENT PDF</small><strong id="v156PdfTitle">Sélectionne un document</strong><span id="v156PdfMeta">Navigation et aperçu intégrés</span></div><div><button id="v156PdfRename" disabled>Renommer</button><button id="v156PdfDelete" disabled>Supprimer</button><a id="v156PdfOpen" target="_blank" rel="noopener" hidden>Ouvrir ↗</a></div></div>'+
    '<div class="v156-pdf-empty" id="v156PdfEmpty"><b>PDF</b><strong>Bibliothèque documentaire</strong><span>Ajoute ici dossiers, plans, présentations et documents HUB.</span></div>'+
    '<iframe id="v156PdfFrame" title="Aperçu PDF" hidden></iframe>'+
   '</section>';
  view.appendChild(panel);

  btn.onclick=()=>openPdfMode();
  $$('[data-bureau-mode]',bar).forEach(old=>old.addEventListener('click',()=>{panel.classList.remove('active');btn.classList.remove('active')},{capture:true}));
  $('#v156PdfUpload').onchange=uploadPdf;
  $('#v156PdfSearch').oninput=renderPdfList;
  $('#v156PdfProject').onchange=renderPdfList;
  $('#v156PdfDelete').onclick=deletePdf;
  $('#v156PdfRename').onclick=renamePdf;
  loadPdfs();
}
function openPdfMode(){
  const bar=$('#bureauModeBar'),panel=$('#bureauPdfMode');if(!bar||!panel)return;
  $$('.bureau-mode-panel,#bureauDocumentsMode').forEach(x=>{x.style.display='none';x.classList.remove('active')});
  $$('[data-bureau-mode]',bar).forEach(x=>x.classList.remove('active'));
  $('#bureauPdfTab')?.classList.add('active');panel.style.display='grid';panel.classList.add('active');
  $('#bureauNew')&&( $('#bureauNew').style.display='none');
  loadPdfs();
}
async function loadPdfs(){
  try{pdfFiles=await api('/api/v156/bureau/files');renderPdfList()}
  catch(e){const box=$('#v156PdfList');if(box)box.innerHTML='<div class="empty">PDF indisponibles.</div>'}
}
function renderPdfList(){
  const box=$('#v156PdfList');if(!box)return;
  const term=String($('#v156PdfSearch')?.value||'').toLowerCase(),project=$('#v156PdfProject')?.value||'';
  const rows=pdfFiles.filter(x=>(!project||x.project===project)&&(!term||[x.name,x.original_name,x.project,x.folder,x.notes].join(' ').toLowerCase().includes(term)));
  box.innerHTML=rows.map(x=>'<button class="'+(Number(activePdf)===Number(x.id)?'active':'')+'" data-pdf-id="'+x.id+'"><b>PDF</b><span><strong>'+escapeHtml(x.name||x.original_name)+'</strong><small>'+escapeHtml([x.project,x.folder,Math.max(1,Math.round((x.size_bytes||0)/1024))+' Ko'].filter(Boolean).join(' · '))+'</small></span></button>').join('')||'<div class="empty">Aucun PDF dans cette vue.</div>';
  $$('[data-pdf-id]',box).forEach(b=>b.onclick=()=>selectPdf(Number(b.dataset.pdfId)));
}
function selectPdf(id){
  const item=pdfFiles.find(x=>Number(x.id)===Number(id));if(!item)return;
  activePdf=id;renderPdfList();
  $('#v156PdfTitle').textContent=item.name||item.original_name;
  $('#v156PdfMeta').textContent=[item.project,item.folder,new Date(item.updated_at||item.created_at).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ');
  const frame=$('#v156PdfFrame'),empty=$('#v156PdfEmpty'),open=$('#v156PdfOpen');
  frame.src=item.content_url;frame.hidden=false;empty.hidden=true;
  open.href=item.content_url;open.hidden=false;
  $('#v156PdfRename').disabled=false;$('#v156PdfDelete').disabled=false;
}
async function uploadPdf(e){
  const file=e.target.files?.[0];if(!file)return;
  if(file.type!=='application/pdf'){toast('PDF uniquement');return}
  const project=prompt('Projet / dossier pour ce PDF :','Gennevilliers')||'';
  const reader=new FileReader();reader.onload=async()=>{
    try{
      toast('Import du PDF…');
      const item=await api('/api/v156/bureau/files',{method:'POST',body:JSON.stringify({name:file.name.replace(/\.pdf$/i,''),original_name:file.name,data_url:reader.result,folder:'PDF',project})});
      pdfFiles.unshift(item);renderPdfList();selectPdf(item.id);toast('PDF ajouté au Bureau');
    }catch(err){toast('Import PDF impossible')}
  };reader.readAsDataURL(file);e.target.value='';
}
async function renamePdf(){
  const item=pdfFiles.find(x=>Number(x.id)===Number(activePdf));if(!item)return;
  const name=prompt('Nouveau nom du PDF :',item.name||item.original_name);if(!name)return;
  const saved=await api('/api/v156/bureau/files/'+item.id,{method:'PATCH',body:JSON.stringify({name})});
  Object.assign(item,saved);renderPdfList();selectPdf(item.id);
}
async function deletePdf(){
  const item=pdfFiles.find(x=>Number(x.id)===Number(activePdf));if(!item||!confirm('Supprimer ce PDF du Bureau ?'))return;
  await api('/api/v156/bureau/files/'+item.id,{method:'DELETE'});pdfFiles=pdfFiles.filter(x=>Number(x.id)!==Number(item.id));activePdf=null;
  $('#v156PdfFrame').hidden=true;$('#v156PdfEmpty').hidden=false;$('#v156PdfTitle').textContent='Sélectionne un document';renderPdfList();
}

/* ---------------- HUB ---------------- */
const hubProjectCopy={
 aubervilliers:{
  title:'PLUG ART HUB · Aubervilliers',eyebrow:'4 RUE PIERRE CURIE · AUBERVILLIERS',
  summary:'Réhabilitation légère et réversible d’un ancien atelier en hub de production, expérimentation, exposition et connexion artistique.',
  key:'Le lieu doit d’abord fonctionner : produire, expérimenter, exposer et accueillir, sans masquer son caractère industriel.',
  areas:['Galerie industrielle','Expérimentation','Ateliers séparés','Grandes œuvres / sculpture','Studio photo / contenu','Bureau / coordination'],
  docs:[['Dossier complet Aubervilliers 2026','Document source',''],['Synthèse de travail','Bureau · HUB','bureau']]
 },
 millenaire:{
  title:'PLUG ART HUB · Le Millénaire',eyebrow:'CENTRE COMMERCIAL · AUBERVILLIERS · CANAL',
  summary:'Deux cellules complémentaires : une Galerie des Docks réellement dédiée à l’exposition et un HUB de production / transmission.',
  key:'La galerie reste une galerie. Le HUB concentre ateliers, grandes pièces, coworking, studio photo, petit talk et ateliers enfants.',
  areas:['Galerie des Docks','Terrasse canal','Ateliers individuels','Atelier grandes pièces','Coworking','Studio photo','Petit talk','Ateliers enfants'],
  docs:[['Dossier Projet Le Millénaire','Document source',''],['Recherche cellules Boulanger / New Yorker','Document source',''],['Synthèse de travail','Bureau · HUB','bureau']]
 },
 gennevilliers:{
  title:'PLUG ART HUB · Gennevilliers',eyebrow:'SUD CHANTERAINES · 110 AVENUE DU GÉNÉRAL-DE-GAULLE',
  summary:'Fabrique culturelle de transition : activité annuelle, production, exposition, ateliers et transmission, avec un pilote réversible avant un ancrage plus durable.',
  key:'Créer aujourd’hui le lieu culturel qui participera demain à l’identité du nouveau quartier.',
  areas:['Galerie collective','Ateliers artistes','Grande production','Réemploi / expérimentation','Studio photo / portfolio','Bureau','Transmission','Petit talk'],
  docs:[['Schéma Directeur Chanteraines 2026','Synthèse intégrée au Bureau','bureau'],['Étude réemploi artistique','Visuel','/static/hub/gennevilliers_reemploi.webp'],['Galerie et ateliers HUB','Visuel','/static/hub/gennevilliers_galerie_ateliers.webp'],['Synthèse stratégique','Bureau · HUB','bureau']]
 }
};
function enhanceHub(){
  const mode=$('#bureauHubMode');if(!mode||mode.dataset.v156==='1')return;
  mode.dataset.v156='1';
  const hero=mode.querySelector('.hub-hero p');if(hero)hero.textContent='Aubervilliers, Le Millénaire et Gennevilliers : mêmes valeurs, trois modèles d’implantation à comparer et documenter.';
  const gen=$('#hubGennevilliersVisual');if(gen){gen.style.backgroundImage='url("/static/hub/gennevilliers_reemploi.webp?v=156.20260926.1")';gen.style.backgroundSize='cover';gen.style.backgroundPosition='center';gen.classList.add('has-image')};
  mode.addEventListener('click',e=>{
    const button=e.target.closest('[data-hub-project]');if(!button)return;
    const key=button.dataset.hubProject;if(!hubProjectCopy[key])return;
    e.preventDefault();e.stopImmediatePropagation();renderHubDetailV156(key);
  },true);
}
function renderHubDetailV156(key){
  const p=hubProjectCopy[key],box=$('#hubProjectDetail');if(!p||!box)return;
  const visual=key==='gennevilliers'?'<div class="v156-hub-gallery"><img src="/static/hub/gennevilliers_reemploi.webp" alt="Étude PLUG ART HUB Gennevilliers"><img src="/static/hub/gennevilliers_galerie_ateliers.webp" alt="Galerie et ateliers PLUG ART HUB Gennevilliers"></div>':'';
  box.innerHTML='<div class="hub-detail-head"><div><small>'+escapeHtml(p.eyebrow)+'</small><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(p.summary)+'</p></div><button id="v156HubAsk">✦ Travailler avec PLUGY</button></div>'+
   '<div class="v156-hub-key"><small>À RETENIR</small><strong>'+escapeHtml(p.key)+'</strong></div>'+visual+
   '<div class="hub-detail-grid"><div><small>PROGRAMME</small><div class="hub-area-list">'+p.areas.map(x=>'<span>'+escapeHtml(x)+'</span>').join('')+'</div></div>'+
   '<div><small>DOCUMENTS / MÉMOIRE</small><div class="hub-doc-list">'+p.docs.map(d=>'<div><b>'+(d[1].includes('Visuel')?'IMG':'PDF')+'</b><span><strong>'+escapeHtml(d[0])+'</strong><small>'+escapeHtml(d[1])+'</small></span>'+(d[2]&&d[2]!=='bureau'?'<a href="'+d[2]+'" target="_blank" rel="noopener">Ouvrir ↗</a>':'')+'</div>').join('')+'</div></div>'+
   '<div><small>TRAVAIL</small><p>La synthèse détaillée est aussi enregistrée dans le Bureau, dossier HUB, pour pouvoir l’annoter et la faire évoluer.</p><button id="v156HubOpenBureau">Ouvrir les synthèses</button></div></div>';
  $('#v156HubAsk').onclick=()=>{document.querySelector('#topPlugy')?.click();setTimeout(()=>{$('#plugyInput').value='Travaille avec moi sur '+p.title+'. '+p.summary+' Point stratégique : '+p.key;$('#plugyInput').focus()},160)};
  $('#v156HubOpenBureau').onclick=()=>{$('[data-bureau-mode="documents"]')?.click();const search=$('#bureauSearch');if(search){search.value='HUB';search.dispatchEvent(new Event('input',{bubbles:true}))}};
}

/* ---------------- IDEA CLOUD ---------------- */
let ideas=[],activeIdea=null;
async function loadIdeas(){
  try{ideas=await api('/api/v156/ideas');renderIdeas()}
  catch{const b=$('#ideaCloudBoard');if(b)b.innerHTML='<div class="empty">Nuage indisponible.</div>'}
}
function renderIdeas(){
  const board=$('#ideaCloudBoard');if(!board)return;
  board.innerHTML=ideas.map((x,i)=>'<button class="idea-node color-'+escapeHtml(x.color||'violet')+'" data-idea-id="'+x.id+'" style="--ix:'+Number(x.pos_x||20+(i%4)*22)+'%;--iy:'+Number(x.pos_y||20+Math.floor(i/4)*25)+'%">'+
   (x.image_url?'<span class="idea-image" style="background-image:url(&quot;'+escapeHtml(x.image_url)+'&quot;)"></span>':'<i>✦</i>')+
   '<strong>'+escapeHtml(x.title||'Idée')+'</strong><small>'+escapeHtml(x.project||x.stage||'explorer')+'</small></button>').join('')||'<div class="idea-empty"><b>☁</b><strong>Le nuage est vide.</strong><span>Ajoute une idée brute, même mal formulée. C’est littéralement à ça que sert un brouillon.</span></div>';
  $$('[data-idea-id]',board).forEach(b=>b.onclick=()=>selectIdea(Number(b.dataset.ideaId)));
  renderIdeaList();
}
function renderIdeaList(){
  const list=$('#ideaList');if(!list)return;
  list.innerHTML=ideas.map(x=>'<button class="'+(Number(activeIdea)===Number(x.id)?'active':'')+'" data-idea-list="'+x.id+'"><i class="color-'+escapeHtml(x.color||'violet')+'"></i><span><strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml([x.project,x.stage].filter(Boolean).join(' · '))+'</small></span></button>').join('')||'<div class="empty">Aucune idée.</div>';
  $$('[data-idea-list]',list).forEach(b=>b.onclick=()=>selectIdea(Number(b.dataset.ideaList)));
}
function selectIdea(id){
  activeIdea=id;const x=ideas.find(v=>Number(v.id)===Number(id));if(!x)return;renderIdeaList();
  $('#ideaTitle').value=x.title||'';$('#ideaBody').value=x.body||'';$('#ideaStage').value=x.stage||'explore';$('#ideaTags').value=x.tags||'';$('#ideaProject').value=x.project||'';$('#ideaColor').value=x.color||'violet';$('#ideaImageUrl').value=x.image_url||'';
  $('#ideaDelete').disabled=false;$('#ideaDevelop').disabled=false;$('#ideaImagine').disabled=false;
}
async function newIdea(){
  const x=await api('/api/v156/ideas',{method:'POST',body:JSON.stringify({title:'Nouvelle idée',stage:'explore',color:'violet',pos_x:20+Math.random()*60,pos_y:18+Math.random()*58})});ideas.unshift(x);renderIdeas();selectIdea(x.id);$('#ideaTitle').focus();
}
async function saveIdea(){
  const x=ideas.find(v=>Number(v.id)===Number(activeIdea));if(!x)return newIdea();
  const body={title:$('#ideaTitle').value,body:$('#ideaBody').value,stage:$('#ideaStage').value,tags:$('#ideaTags').value,project:$('#ideaProject').value,color:$('#ideaColor').value,image_url:$('#ideaImageUrl').value};
  const saved=await api('/api/v156/ideas/'+x.id,{method:'PATCH',body:JSON.stringify(body)});Object.assign(x,saved);renderIdeas();selectIdea(x.id);toast('Idée enregistrée');
}
async function deleteIdea(){
  const x=ideas.find(v=>Number(v.id)===Number(activeIdea));if(!x||!confirm('Supprimer cette idée ?'))return;
  await api('/api/v156/ideas/'+x.id,{method:'DELETE'});ideas=ideas.filter(v=>Number(v.id)!==Number(x.id));activeIdea=null;clearIdeaForm();renderIdeas();
}
function clearIdeaForm(){
  ['ideaTitle','ideaBody','ideaTags','ideaProject','ideaImageUrl'].forEach(id=>{if($('#'+id))$('#'+id).value=''});
  if($('#ideaStage'))$('#ideaStage').value='explore';if($('#ideaColor'))$('#ideaColor').value='violet';
  $('#ideaDelete')&&( $('#ideaDelete').disabled=true);$('#ideaDevelop')&&( $('#ideaDevelop').disabled=true);$('#ideaImagine')&&( $('#ideaImagine').disabled=true);
}
async function developIdea(){
  const x=ideas.find(v=>Number(v.id)===Number(activeIdea));if(!x)return;
  const b=$('#ideaDevelop'),old=b.textContent;b.disabled=true;b.textContent='PLUGY développe…';
  try{
    const r=await api('/api/v32/plugy',{method:'POST',body:JSON.stringify({message:'Développe cette idée de projet PLUG ART de façon exploitable. Structure : intention, public, usages, ressources, partenaires possibles, risques, première expérimentation. N’invente pas de faits externes. Idée : '+x.title+'\\n'+($('#ideaBody').value||''),page:'ideas',mode:'deep'})});
    $('#ideaBody').value=String(r.answer||'');await saveIdea();
  }catch{toast('PLUGY indisponible')}finally{b.disabled=false;b.textContent=old}
}
async function imagineIdea(){
  const x=ideas.find(v=>Number(v.id)===Number(activeIdea));if(!x)return;
  const b=$('#ideaImagine'),old=b.textContent;b.disabled=true;b.textContent='Visuel…';
  try{
    const prompt='Visualisation conceptuelle premium pour un projet PLUG ART. '+x.title+'. '+($('#ideaBody').value||'').slice(0,1800)+'. Architecture ou scène crédible, direction artistique contemporaine, aucun texte lisible, aucun logo.';
    const r=await api('/api/v32/content/image',{method:'POST',body:JSON.stringify({prompt,style:'editorial',ratio:'4:5',quality:'medium'})});
    if(r.url){$('#ideaImageUrl').value=r.url;await saveIdea();toast('Visuel ajouté à l’idée')}
  }catch{toast('Génération visuelle indisponible')}finally{b.disabled=false;b.textContent=old}
}
function bindIdeaView(){
  $('#ideaNew')?.addEventListener('click',newIdea);$('#ideaSave')?.addEventListener('click',saveIdea);$('#ideaDelete')?.addEventListener('click',deleteIdea);$('#ideaDevelop')?.addEventListener('click',developIdea);$('#ideaImagine')?.addEventListener('click',imagineIdea);
  $('#ideaSearch')?.addEventListener('input',e=>{const term=e.target.value.toLowerCase();$$('[data-idea-list]').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(term))});
}

/* ---------------- BOOT ---------------- */
function observeRuntime(){
  const obs=new MutationObserver(()=>{
    if(document.body.dataset.view==='creation'){installCreationPro();normalizeStudioVisuals()}
    if(document.body.dataset.view==='bureau'){ensurePdfMode();enhanceHub()}
    if(document.body.dataset.view==='ideas'&&!ideas.length)loadIdeas();
    repositionPlugyByRoute();
  });
  obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-view','style']});
}
window.PLUGV156={renderIdeas:()=>{loadIdeas()},loadPdfs,normalizeStudioVisuals};
document.addEventListener('DOMContentLoaded',()=>{
  watchPlugyFollower();installCreationPro();ensurePdfMode();enhanceHub();bindIdeaView();observeRuntime();
  if(document.body.dataset.view==='ideas')loadIdeas();
});
})();