
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,esc,api,state,cut}=P;
state.crm=state.crm||[];
function modal(html){const m=q('#simpleModal'),c=q('#modalContent');if(!m||!c)return;c.innerHTML=html;m.classList.add('open')}
function close(){q('#simpleModal')?.classList.remove('open')}
async function refreshArtists(){try{state.artists=await api('/api/artists');renderArtists()}catch{}}
function renderArtists(){
  const term=(q('#artistSearch')?.value||'').toLowerCase().trim();
  const data=(state.artists||[]).filter(a=>!term||[a.name,a.real_name,a.discipline,a.city,a.country,(a.tags||[]).join(' ')].filter(Boolean).join(' ').toLowerCase().includes(term));
  if(q('#artistCount'))q('#artistCount').textContent=data.length+' profil'+(data.length>1?'s':'');
  const g=q('#artistGridV85');if(!g)return;
  g.innerHTML=data.map(a=>'<article class="artist-card-v85" data-artist="'+a.id+'"><div class="artist-avatar-v85">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><div><small>'+esc([a.city,a.country].filter(Boolean).join(' · ')||'Localisation à compléter')+'</small><h3>'+esc(a.name||'Artiste')+'</h3><p>'+esc(a.discipline||'Artiste visuel')+'</p><span>'+esc(cut(a.bio||'',120))+'</span></div></article>').join('')||'<div class="empty-line">Aucun artiste.</div>';
  qa('[data-artist]').forEach(c=>c.onclick=()=>openArtist((state.artists||[]).find(a=>String(a.id)===String(c.dataset.artist))));
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
    '<label class="span2">Tags<input id="aTags" value="'+esc(tags)+'" placeholder="peinture, photo, émergent…"></label>'+
    '<label class="span2">Bio<textarea id="aBio">'+esc(a.bio||'')+'</textarea></label>'+
    '<label class="span2">Notes internes<textarea id="aNotes">'+esc(a.notes||'')+'</textarea></label>'+
  '</div><div class="modal-actions-v85"><button class="save" id="saveArtistV85">'+(a.id?'Mettre à jour':'Créer le profil')+'</button>'+(a.id?'<button class="danger-soft" id="deleteArtistV85">Supprimer</button>':'')+'</div>';
}
function collectArtist(){return{name:q('#aName')?.value.trim()||'',real_name:q('#aReal')?.value.trim()||'',discipline:q('#aDiscipline')?.value.trim()||'',city:q('#aCity')?.value.trim()||'',country:q('#aCountry')?.value.trim()||'',instagram:q('#aInstagram')?.value.trim()||'',website:q('#aWebsite')?.value.trim()||'',email:q('#aEmail')?.value.trim()||'',tags:(q('#aTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),bio:q('#aBio')?.value.trim()||'',notes:q('#aNotes')?.value.trim()||''}}
function openArtist(a={}){
  modal(artistForm(a));
  q('#saveArtistV85').onclick=async()=>{const data=collectArtist();if(!data.name)return;await api(a.id?'/api/v85/artists/'+a.id:'/api/v85/artists',{method:a.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});close();await refreshArtists()};
  if(a.id)q('#deleteArtistV85').onclick=async()=>{await api('/api/v85/artists/'+a.id,{method:'DELETE'});close();await refreshArtists()}
}
q('#addArtistBtn')?.addEventListener('click',()=>openArtist({}));
q('#artistSearch')?.addEventListener('input',renderArtists);
window.addEventListener('plugart:hydrated',renderArtists);
const stages=[['lead','À prospecter'],['contacted','Contacté'],['followup','À relancer'],['meeting','Échange / RDV'],['partner','Partenaire']];
async function refreshCRM(){try{state.crm=await api('/api/v85/crm')}catch{state.crm=[]}renderCRM()}
function crmFiltered(){const term=(q('#crmSearch')?.value||'').toLowerCase().trim(),priority=q('#crmPriority')?.value||'';return(state.crm||[]).filter(x=>(!priority||x.priority===priority)&&(!term||[x.name,x.organization,x.city,x.country,x.kind,x.notes].filter(Boolean).join(' ').toLowerCase().includes(term)))}
function renderCRM(){
  const data=crmFiltered();if(q('#crmCount'))q('#crmCount').textContent=data.length+' contact'+(data.length>1?'s':'');
  const board=q('#crmBoard');if(!board)return;
  board.innerHTML=stages.map(([key,label])=>'<section class="crm-column" data-crm-drop="'+key+'"><div class="crm-column-head"><strong>'+label+'</strong><b>'+data.filter(x=>x.status===key).length+'</b></div><div class="crm-cards">'+data.filter(x=>x.status===key).map(x=>'<article class="crm-card" draggable="true" data-lead="'+x.id+'"><div><small>'+esc(x.kind||'Contact')+' · '+esc(x.priority||'normal')+'</small><strong>'+esc(x.organization||x.name||'Contact')+'</strong><span>'+esc([x.name,x.city,x.country].filter(Boolean).join(' · '))+'</span></div>'+(x.next_action?'<p>'+esc(x.next_action)+'</p>':'')+'</article>').join('')+'</div></section>').join('');
  qa('[data-lead]').forEach(card=>{card.ondragstart=e=>e.dataTransfer.setData('text/plain',card.dataset.lead);card.onclick=()=>openLead((state.crm||[]).find(x=>String(x.id)===String(card.dataset.lead)))});
  qa('[data-crm-drop]').forEach(col=>{col.ondragover=e=>e.preventDefault();col.ondrop=async e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!id)return;await api('/api/v85/crm/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:col.dataset.crmDrop})});await refreshCRM()}});
}
function leadForm(x={}){
  const opts=stages.map(([k,l])=>'<option value="'+k+'" '+(x.status===k?'selected':'')+'>'+l+'</option>').join('');
  return '<h3>'+(x.id?'Modifier':'Nouveau')+' contact CRM</h3><div class="form-grid-v85">'+
    '<label>Contact<input id="cName" value="'+esc(x.name||'')+'"></label>'+
    '<label>Structure<input id="cOrg" value="'+esc(x.organization||'')+'"></label>'+
    '<label>Type<select id="cKind"><option>Galerie</option><option>Centre culturel</option><option>Hôtel</option><option>Restaurant</option><option>Institution</option><option>Association</option><option>Autre</option></select></label>'+
    '<label>Ville<input id="cCity" value="'+esc(x.city||'')+'"></label>'+
    '<label>Pays<input id="cCountry" value="'+esc(x.country||'')+'"></label>'+
    '<label>Email<input id="cEmail" value="'+esc(x.email||'')+'"></label>'+
    '<label>Instagram<input id="cInstagram" value="'+esc(x.instagram||'')+'"></label>'+
    '<label>Site<input id="cWebsite" value="'+esc(x.website||'')+'"></label>'+
    '<label>Statut<select id="cStatus">'+opts+'</select></label>'+
    '<label>Priorité<select id="cPriority"><option value="high" '+(x.priority==='high'?'selected':'')+'>Haute</option><option value="normal" '+(!x.priority||x.priority==='normal'?'selected':'')+'>Normale</option><option value="low" '+(x.priority==='low'?'selected':'')+'>Basse</option></select></label>'+
    '<label class="span2">Prochaine action<input id="cNext" value="'+esc(x.next_action||'')+'" placeholder="Relancer, envoyer dossier, proposer rendez-vous…"></label>'+
    '<label class="span2">Notes<textarea id="cNotes">'+esc(x.notes||'')+'</textarea></label>'+
  '</div><div class="modal-actions-v85"><button class="save" id="saveLeadV85">'+(x.id?'Mettre à jour':'Ajouter au CRM')+'</button>'+(x.id?'<button class="danger-soft" id="deleteLeadV85">Supprimer</button>':'')+'</div>';
}
function collectLead(){return{name:q('#cName')?.value.trim()||'',organization:q('#cOrg')?.value.trim()||'',kind:q('#cKind')?.value||'Galerie',city:q('#cCity')?.value.trim()||'',country:q('#cCountry')?.value.trim()||'',email:q('#cEmail')?.value.trim()||'',instagram:q('#cInstagram')?.value.trim()||'',website:q('#cWebsite')?.value.trim()||'',status:q('#cStatus')?.value||'lead',priority:q('#cPriority')?.value||'normal',next_action:q('#cNext')?.value.trim()||'',notes:q('#cNotes')?.value.trim()||''}}
function openLead(x={}){
  modal(leadForm(x));if(q('#cKind'))q('#cKind').value=x.kind||'Galerie';
  q('#saveLeadV85').onclick=async()=>{const data=collectLead();if(!data.name&&!data.organization)return;await api(x.id?'/api/v85/crm/'+x.id:'/api/v85/crm',{method:x.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});close();await refreshCRM()};
  if(x.id)q('#deleteLeadV85').onclick=async()=>{await api('/api/v85/crm/'+x.id,{method:'DELETE'});close();await refreshCRM()}
}
q('#addLeadBtn')?.addEventListener('click',()=>openLead({}));
q('#crmSearch')?.addEventListener('input',renderCRM);
q('#crmPriority')?.addEventListener('change',renderCRM);
P.ready.then(()=>{refreshCRM();renderArtists()});
})();
