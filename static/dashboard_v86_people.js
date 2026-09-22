
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,esc,api,state,cut}=P;
state.crm=state.crm||[];
const safeUrl=u=>/^https?:\/\//i.test(String(u||''))?String(u):'#';
function modal(html){const m=q('#simpleModal'),c=q('#modalContent');if(!m||!c)return;c.innerHTML=html;m.classList.add('open')}
function close(){q('#simpleModal')?.classList.remove('open')}

// ---------- Artists ----------
async function refreshArtists(){try{state.artists=await api('/api/artists');renderArtists()}catch{}}
function renderArtists(){
  const term=(q('#artistSearch')?.value||'').toLowerCase().trim();
  const data=(state.artists||[]).filter(a=>!term||[a.name,a.real_name,a.discipline,a.city,a.country,(a.tags||[]).join(' ')].filter(Boolean).join(' ').toLowerCase().includes(term));
  if(q('#artistCount'))q('#artistCount').textContent=data.length+' profil'+(data.length>1?'s':'');
  const g=q('#artistGridV85');if(!g)return;
  g.innerHTML=data.map(a=>{
    const img=a.featured_image?'<div class="artist-cover-v86" style="background-image:url(&quot;'+esc(a.featured_image)+'&quot;)"></div>':'';
    return '<article class="artist-card-v85 artist-card-v86" data-artist="'+a.id+'">'+img+'<div class="artist-avatar-v85">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><div><small>'+esc([a.city,a.country].filter(Boolean).join(' · ')||'Localisation à compléter')+'</small><h3>'+esc(a.name||'Artiste')+'</h3><p>'+esc(a.discipline||'Artiste visuel')+'</p><span>'+esc(cut(a.bio||a.statement||'',120))+'</span></div></article>';
  }).join('')||'<div class="empty-line">Aucun artiste.</div>';
  qa('[data-artist]').forEach(c=>c.onclick=()=>openArtistProfile((state.artists||[]).find(a=>String(a.id)===String(c.dataset.artist))));
}
async function openArtistProfile(a){
  if(!a)return;let works=[];
  try{works=await api('/api/v86/artists/'+a.id+'/works')}catch{}
  const links=[
    a.instagram?'<a href="'+esc(/^https?:\/\//i.test(a.instagram)?a.instagram:'https://instagram.com/'+String(a.instagram).replace(/^@/,''))+'" target="_blank" rel="noopener">Instagram ↗</a>':'',
    a.website?'<a href="'+esc(safeUrl(a.website))+'" target="_blank" rel="noopener">Site ↗</a>':'',
    a.portfolio_url?'<a href="'+esc(safeUrl(a.portfolio_url))+'" target="_blank" rel="noopener">Portfolio ↗</a>':''
  ].filter(Boolean).join('');
  const worksHtml=works.length?works.map(w=>'<article class="artist-work-v86"><div class="artist-work-image" style="background-image:url(&quot;'+esc(w.image_url||'')+'&quot;)"></div><strong>'+esc(w.title||'Œuvre')+'</strong><span>'+esc([w.year,w.medium,w.dimensions].filter(Boolean).join(' · '))+'</span><button data-delete-work="'+w.id+'">Supprimer</button></article>').join(''):'<div class="empty-line">Aucune œuvre ajoutée.</div>';
  modal('<div class="artist-profile-v86">'+(a.featured_image?'<div class="artist-profile-hero" style="background-image:url(&quot;'+esc(a.featured_image)+'&quot;)"></div>':'')+'<div class="artist-profile-head"><div><small>'+esc([a.city,a.country].filter(Boolean).join(' · '))+'</small><h2>'+esc(a.name||'Artiste')+'</h2><p>'+esc(a.discipline||'Artiste visuel')+'</p></div><div class="artist-profile-actions"><button id="editArtistV86">Modifier</button><button id="addWorkV86">+ Œuvre</button></div></div><p class="artist-profile-bio">'+esc(a.statement||a.bio||'')+'</p><div class="artist-profile-links">'+links+'</div><div class="artist-work-grid">'+worksHtml+'</div></div>');
  q('#editArtistV86')?.addEventListener('click',()=>openArtistEdit(a));
  q('#addWorkV86')?.addEventListener('click',()=>openWorkForm(a));
  qa('[data-delete-work]').forEach(b=>b.onclick=async()=>{await api('/api/v86/artists/'+a.id+'/works/'+b.dataset.deleteWork,{method:'DELETE'});close();await refreshArtists();const fresh=(state.artists||[]).find(x=>String(x.id)===String(a.id));openArtistProfile(fresh||a)});
}
function artistForm(a={}){
  const tags=Array.isArray(a.tags)?a.tags.join(', '):(a.tags||'');
  return '<h3>'+(a.id?'Modifier':'Nouvel')+' artiste</h3><div class="form-grid-v85">'+
    '<label>Nom<input id="aName" value="'+esc(a.name||'')+'"></label>'+
    '<label>Nom réel<input id="aReal" value="'+esc(a.real_name||'')+'"></label>'+
    '<label>Discipline<input id="aDiscipline" value="'+esc(a.discipline||'')+'"></label>'+
    '<label>Ville<input id="aCity" value="'+esc(a.city||'')+'"></label>'+
    '<label>Pays<input id="aCountry" value="'+esc(a.country||'')+'"></label>'+
    '<label>Instagram<input id="aInstagram" value="'+esc(a.instagram||'')+'"></label>'+
    '<label>Site<input id="aWebsite" value="'+esc(a.website||'')+'"></label>'+
    '<label>Email<input id="aEmail" value="'+esc(a.email||'')+'"></label>'+
    '<label class="span2">Portfolio URL<input id="aPortfolio" value="'+esc(a.portfolio_url||'')+'"></label>'+
    '<label class="span2">Image principale<input id="aFeatured" value="'+esc(a.featured_image||'')+'" placeholder="URL image"></label>'+
    '<label class="span2">Tags<input id="aTags" value="'+esc(tags)+'" placeholder="peinture, photo, émergent…"></label>'+
    '<label class="span2">Statement<textarea id="aStatement">'+esc(a.statement||'')+'</textarea></label>'+
    '<label class="span2">Bio<textarea id="aBio">'+esc(a.bio||'')+'</textarea></label>'+
    '<label class="span2">Notes internes<textarea id="aNotes">'+esc(a.notes||'')+'</textarea></label>'+
  '</div><div class="modal-actions-v85"><button class="save" id="saveArtistV86">'+(a.id?'Mettre à jour':'Créer le profil')+'</button>'+(a.id?'<button class="danger-soft" id="deleteArtistV86">Supprimer</button>':'')+'</div>';
}
function collectArtist(){return{
  name:q('#aName')?.value.trim()||'',real_name:q('#aReal')?.value.trim()||'',discipline:q('#aDiscipline')?.value.trim()||'',
  city:q('#aCity')?.value.trim()||'',country:q('#aCountry')?.value.trim()||'',instagram:q('#aInstagram')?.value.trim()||'',
  website:q('#aWebsite')?.value.trim()||'',email:q('#aEmail')?.value.trim()||'',portfolio_url:q('#aPortfolio')?.value.trim()||'',
  featured_image:q('#aFeatured')?.value.trim()||'',statement:q('#aStatement')?.value.trim()||'',
  tags:(q('#aTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),bio:q('#aBio')?.value.trim()||'',notes:q('#aNotes')?.value.trim()||''
}}
function openArtistEdit(a={}){
  modal(artistForm(a));
  q('#saveArtistV86').onclick=async()=>{const data=collectArtist();if(!data.name)return;await api(a.id?'/api/v86/artists/'+a.id:'/api/v86/artists',{method:a.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});close();await refreshArtists()};
  if(a.id)q('#deleteArtistV86').onclick=async()=>{await api('/api/v86/artists/'+a.id,{method:'DELETE'});close();await refreshArtists()}
}
function openWorkForm(a){
  modal('<h3>Ajouter une œuvre</h3><div class="form-grid-v85"><label>Titre<input id="wTitle"></label><label>Année<input id="wYear"></label><label>Médium<input id="wMedium"></label><label>Dimensions<input id="wDimensions"></label><label class="span2">Image URL<input id="wImage"></label><label class="span2">Notes<textarea id="wNotes"></textarea></label></div><div class="modal-actions-v85"><button class="save" id="saveWorkV86">Ajouter</button></div>');
  q('#saveWorkV86').onclick=async()=>{const body={title:q('#wTitle').value.trim(),year:q('#wYear').value.trim(),medium:q('#wMedium').value.trim(),dimensions:q('#wDimensions').value.trim(),image_url:q('#wImage').value.trim(),notes:q('#wNotes').value.trim()};await api('/api/v86/artists/'+a.id+'/works',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});close();openArtistProfile(a)};
}
q('#addArtistBtn')?.addEventListener('click',()=>openArtistEdit({}));
q('#artistSearch')?.addEventListener('input',renderArtists);
window.addEventListener('plugart:hydrated',renderArtists);

// ---------- CRM ----------
const stages=[['lead','À prospecter'],['contacted','Contacté'],['followup','À relancer'],['meeting','Échange / RDV'],['partner','Partenaire']];
let dueOnly=false;
async function refreshCRM(){try{state.crm=await api('/api/v86/crm')}catch{state.crm=[]}renderCRM()}
function crmFiltered(){
  const term=(q('#crmSearch')?.value||'').toLowerCase().trim(),priority=q('#crmPriority')?.value||'',today=new Date().toISOString().slice(0,10);
  return(state.crm||[]).filter(x=>(!priority||x.priority===priority)&&(!dueOnly||x.next_date&&x.next_date<=today)&&(!term||[x.name,x.organization,x.city,x.country,x.kind,x.notes,x.next_action].filter(Boolean).join(' ').toLowerCase().includes(term)));
}
function dueLabel(x){
  if(!x.next_date)return'';const d=new Date(x.next_date+'T12:00:00'),today=new Date();today.setHours(0,0,0,0);const days=Math.round((d-today)/86400000);
  if(days<0)return'<span class="crm-due overdue">En retard '+Math.abs(days)+'j</span>';
  if(days===0)return'<span class="crm-due today">Aujourd’hui</span>';
  if(days<=3)return'<span class="crm-due soon">Dans '+days+'j</span>';
  return'<span class="crm-due">'+esc(x.next_date)+'</span>';
}
function renderCRM(){
  const data=crmFiltered(),today=new Date().toISOString().slice(0,10),due=(state.crm||[]).filter(x=>x.next_date&&x.next_date<=today&&x.status!=='partner').length;
  if(q('#crmCount'))q('#crmCount').textContent=data.length+' contact'+(data.length>1?'s':'');
  if(q('#crmDueCount'))q('#crmDueCount').textContent=String(due);
  const board=q('#crmBoard');if(!board)return;
  board.innerHTML=stages.map(([key,label])=>'<section class="crm-column" data-crm-drop="'+key+'"><div class="crm-column-head"><strong>'+label+'</strong><b>'+data.filter(x=>x.status===key).length+'</b></div><div class="crm-cards">'+data.filter(x=>x.status===key).map(x=>'<article class="crm-card" draggable="true" data-lead="'+x.id+'"><div><small>'+esc(x.kind||'Contact')+' · '+esc(x.priority||'normal')+'</small><strong>'+esc(x.organization||x.name||'Contact')+'</strong><span>'+esc([x.name,x.city,x.country].filter(Boolean).join(' · '))+'</span></div>'+dueLabel(x)+(x.next_action?'<p>'+esc(x.next_action)+'</p>':'')+'</article>').join('')+'</div></section>').join('');
  qa('[data-lead]').forEach(card=>{card.ondragstart=e=>e.dataTransfer.setData('text/plain',card.dataset.lead);card.onclick=()=>openLead((state.crm||[]).find(x=>String(x.id)===String(card.dataset.lead)))});
  qa('[data-crm-drop]').forEach(col=>{col.ondragover=e=>e.preventDefault();col.ondrop=async e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!id)return;await api('/api/v86/crm/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:col.dataset.crmDrop})});await refreshCRM()}});
}
async function openLead(x={}){
  let history=[];if(x.id)history=await api('/api/v86/crm/'+x.id+'/history').catch(()=>[]);
  const opts=stages.map(([k,l])=>'<option value="'+k+'" '+(x.status===k?'selected':'')+'>'+l+'</option>').join('');
  const hist=history.length?'<div class="crm-history-v86">'+history.map(h=>'<div><i></i><span>'+esc(h.created_at||'')+'</span><strong>'+esc(h.action||'Mise à jour')+'</strong><p>'+esc(h.details||'')+'</p></div>').join('')+'</div>':'<div class="empty-line">Aucun historique.</div>';
  modal('<h3>'+(x.id?'Contact CRM':'Nouveau contact CRM')+'</h3><div class="form-grid-v85">'+
    '<label>Contact<input id="cName" value="'+esc(x.name||'')+'"></label><label>Structure<input id="cOrg" value="'+esc(x.organization||'')+'"></label>'+
    '<label>Type<select id="cKind"><option>Galerie</option><option>Centre culturel</option><option>Hôtel</option><option>Restaurant</option><option>Institution</option><option>Association</option><option>Autre</option></select></label>'+
    '<label>Ville<input id="cCity" value="'+esc(x.city||'')+'"></label><label>Pays<input id="cCountry" value="'+esc(x.country||'')+'"></label><label>Email<input id="cEmail" value="'+esc(x.email||'')+'"></label>'+
    '<label>Instagram<input id="cInstagram" value="'+esc(x.instagram||'')+'"></label><label>Site<input id="cWebsite" value="'+esc(x.website||'')+'"></label>'+
    '<label>Statut<select id="cStatus">'+opts+'</select></label><label>Priorité<select id="cPriority"><option value="high" '+(x.priority==='high'?'selected':'')+'>Haute</option><option value="normal" '+(!x.priority||x.priority==='normal'?'selected':'')+'>Normale</option><option value="low" '+(x.priority==='low'?'selected':'')+'>Basse</option></select></label>'+
    '<label class="span2">Prochaine action<input id="cNext" value="'+esc(x.next_action||'')+'" placeholder="Relancer, envoyer dossier, proposer rendez-vous…"></label>'+
    '<label>Date / rappel<input id="cNextDate" type="date" value="'+esc(x.next_date||'')+'"></label><label>Dernier contact<input id="cLastContact" type="date" value="'+esc(x.last_contact||'')+'"></label>'+
    '<label class="span2">Notes<textarea id="cNotes">'+esc(x.notes||'')+'</textarea></label></div>'+
    '<div class="modal-actions-v85"><button class="save" id="saveLeadV86">'+(x.id?'Mettre à jour':'Ajouter au CRM')+'</button>'+(x.id?'<button class="danger-soft" id="deleteLeadV86">Supprimer</button>':'')+'</div>'+
    (x.id?'<h4 class="crm-history-title">Historique</h4>'+hist:''));
  if(q('#cKind'))q('#cKind').value=x.kind||'Galerie';
  q('#saveLeadV86').onclick=async()=>{const body={name:q('#cName')?.value.trim()||'',organization:q('#cOrg')?.value.trim()||'',kind:q('#cKind')?.value||'Galerie',city:q('#cCity')?.value.trim()||'',country:q('#cCountry')?.value.trim()||'',email:q('#cEmail')?.value.trim()||'',instagram:q('#cInstagram')?.value.trim()||'',website:q('#cWebsite')?.value.trim()||'',status:q('#cStatus')?.value||'lead',priority:q('#cPriority')?.value||'normal',next_action:q('#cNext')?.value.trim()||'',next_date:q('#cNextDate')?.value||'',last_contact:q('#cLastContact')?.value||'',notes:q('#cNotes')?.value.trim()||''};if(!body.name&&!body.organization)return;await api(x.id?'/api/v86/crm/'+x.id:'/api/v86/crm',{method:x.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});close();await refreshCRM()};
  if(x.id)q('#deleteLeadV86').onclick=async()=>{await api('/api/v86/crm/'+x.id,{method:'DELETE'});close();await refreshCRM()}
}
q('#addLeadBtn')?.addEventListener('click',()=>openLead({}));
q('#crmSearch')?.addEventListener('input',renderCRM);
q('#crmPriority')?.addEventListener('change',renderCRM);
q('#crmDueOnly')?.addEventListener('click',e=>{dueOnly=!dueOnly;e.currentTarget.classList.toggle('active',dueOnly);renderCRM()});
P.ready.then(()=>{refreshCRM();renderArtists()});
})();
