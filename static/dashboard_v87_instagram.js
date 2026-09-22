
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,api,store,esc,modal,view}=P;
let status=null,media=[];
const qkey='plugart_v66_social_queue';

function accountCard(){
  const box=q('#instagramAccount');if(!box)return;
  if(!status){box.innerHTML='<div class="ig-state pending"><i></i><div><strong>Instagram</strong><span>Vérification…</span></div></div>';return}
  if(status.connected){
    box.innerHTML='<div class="ig-account-head">'+
      (status.profile_picture_url?'<img src="'+esc(status.profile_picture_url)+'" alt="">':'<div class="ig-avatar">IG</div>')+
      '<div><small>CONNECTÉ</small><strong>@'+esc(status.username||'instagram')+'</strong><span>'+esc(status.page_name||'Compte professionnel')+'</span></div>'+
      '<button id="instagramDisconnect" class="ig-soft">Déconnecter</button></div>'+
      '<div class="ig-account-kpis"><div><b>'+Number(status.followers_count||0).toLocaleString('fr-FR')+'</b><span>abonnés</span></div><div><b>'+Number(status.media_count||0).toLocaleString('fr-FR')+'</b><span>posts</span></div><div><b>Meta '+esc(status.graph_version||'v26.0')+'</b><span>API</span></div></div>';
    q('#instagramDisconnect')?.addEventListener('click',disconnect);
  }else{
    const ready=status.configured;
    box.innerHTML='<div class="ig-connect-panel"><div class="ig-state '+(ready?'ready':'pending')+'"><i></i><div><strong>'+(ready?'Prêt à connecter':'Configuration Meta requise')+'</strong><span>'+(ready?'Connexion sécurisée au compte professionnel':'Ajoute les identifiants de l’app Meta une seule fois')+'</span></div></div>'+
      '<button id="instagramConnect" class="ig-connect-btn">'+(ready?'Connecter Instagram':'Voir la configuration')+'</button>'+
      '<div class="ig-redirect"><small>URL de redirection Meta</small><code>'+esc(status.redirect_uri||'')+'</code><button id="copyIgRedirect">Copier</button></div>'+
      (!ready?'<div class="ig-vars"><code>META_APP_ID</code><code>META_APP_SECRET</code><code>META_GRAPH_VERSION=v26.0</code></div>':'')+
      '</div>';
    q('#instagramConnect')?.addEventListener('click',()=>ready?location.assign('/api/v87/instagram/login'):setupHelp());
    q('#copyIgRedirect')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(status.redirect_uri||'');q('#copyIgRedirect').textContent='Copié ✓'}catch{}});
  }
}
function setupHelp(){
  modal('<h3>Connexion Instagram</h3><p>Le pont est installé. Il manque seulement les identifiants de ton application Meta.</p><div class="ig-setup-steps"><p><b>1.</b> Crée ou utilise une app Meta Business.</p><p><b>2.</b> Ajoute cette URL OAuth exacte :</p><code>'+esc(status?.redirect_uri||'')+'</code><p><b>3.</b> Dans Railway, ajoute <code>META_APP_ID</code> et <code>META_APP_SECRET</code>.</p><p><b>4.</b> Le compte Instagram doit être professionnel et lié à une Page Facebook pour ce flux.</p></div><a class="ig-doc-link" href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">Ouvrir Meta for Developers ↗</a>');
}
async function refreshStatus(){
  try{status=await api('/api/v87/instagram/status');accountCard();syncBanner();if(status.connected)await loadMedia()}
  catch(e){status={connected:false,configured:false,error:e.message};accountCard();syncBanner()}
}
function syncBanner(){
  const b=q('#instagramConnectionBadge');if(!b)return;
  b.classList.toggle('connected',!!status?.connected);
  b.textContent=status?.connected?'@'+(status.username||'Instagram')+' connecté':status?.configured?'Instagram prêt à connecter':'Instagram à configurer';
}
async function disconnect(){
  if(!confirm('Déconnecter Instagram de PLUG ART ?'))return;
  await api('/api/v87/instagram/disconnect',{method:'POST'});status=null;media=[];q('#instagramMedia')&&(q('#instagramMedia').innerHTML='');await refreshStatus();
}
async function loadMedia(){
  const box=q('#instagramMedia');if(!box||!status?.connected)return;
  box.innerHTML='<div class="ig-media-loading">Chargement des derniers contenus…</div>';
  try{
    const r=await api('/api/v87/instagram/media?limit=12');media=Array.isArray(r.items)?r.items:[];
    box.innerHTML=media.map(m=>'<a class="ig-media-item" href="'+esc(m.permalink||'#')+'" target="_blank" rel="noopener">'+
      (m.thumbnail_url||m.media_url?'<img src="'+esc(m.thumbnail_url||m.media_url)+'" alt="">':'<div class="ig-media-placeholder">'+esc(m.media_type||'POST')+'</div>')+
      '<div><strong>'+esc((m.caption||m.media_type||'Publication').slice(0,58))+'</strong><span>♥ '+Number(m.like_count||0)+' · ◌ '+Number(m.comments_count||0)+'</span></div></a>').join('')||'<div class="empty-line">Aucune publication récupérée.</div>';
  }catch(e){box.innerHTML='<div class="empty-line">Impossible de charger les publications : '+esc(e.message)+'</div>'}
}
function publicUrl(u){
  u=String(u||'').trim();if(!u)return'';if(/^https?:\/\//i.test(u))return u;
  if(u.startsWith('/'))return location.origin+u;return'';
}
function queue(){return store.get(qkey,[])}
function saveQueue(items){store.set(qkey,items);P.renderSocial?.()}
async function publishQueueItem(id){
  const items=queue(),item=items.find(x=>String(x.id)===String(id));if(!item)return;
  if(!status?.connected){view('social');await refreshStatus();if(!status?.connected){setupHelp();return}}
  const urls=(item.media_urls||[]).map(publicUrl).filter(Boolean).slice(0,10);
  if(!urls.length){
    modal('<h3>Visuel requis</h3><p>Ce brouillon n’a pas encore de média public utilisable par Instagram. Retourne dans le Studio, génère les visuels du carrousel puis ajoute-le de nouveau à Instagram.</p>');
    return;
  }
  modal('<h3>Publier sur Instagram</h3><p><b>'+esc(item.title||'Publication PLUG ART')+'</b></p><p>'+urls.length+' média'+(urls.length>1?'s':'')+' seront publiés sur @'+esc(status.username||'Instagram')+'.</p><label>Légende<textarea id="igPublishCaption">'+esc(item.caption||'')+'</textarea></label><button class="save" id="igConfirmPublish">Publier maintenant</button>');
  q('#igConfirmPublish')?.addEventListener('click',async e=>{
    const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='Publication…';
    try{
      const r=await api('/api/v87/instagram/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caption:q('#igPublishCaption')?.value||'',media_urls:urls,title:item.title||''})});
      item.status='Publié';item.instagram_media_id=r.media_id||'';item.published_at=new Date().toISOString();saveQueue(items);P.closeModal?.();await loadMedia();
      modal('<h3>Publié ✓</h3><p>Le contenu a été envoyé sur @'+esc(status.username||'Instagram')+'.</p>');
    }catch(err){b.disabled=false;b.textContent=old;modal('<h3>Publication interrompue</h3><p>'+esc(err.message)+'</p>')}
  });
}
function bridgeFromDraft(){
  view('studio');
  setTimeout(()=>{const b=q('#queueInstagramBtn');if(b){b.classList.add('plugy-action-focus');setTimeout(()=>b.classList.remove('plugy-action-focus'),1600)}},160);
}
q('#instagramRefresh')?.addEventListener('click',async()=>{await refreshStatus();await loadMedia()});
q('#instagramStudioBridge')?.addEventListener('click',bridgeFromDraft);
window.addEventListener('plugart:social-rendered',()=>bindPublishButtons());
function bindPublishButtons(){qa('[data-social-publish]').forEach(b=>{b.onclick=()=>publishQueueItem(b.dataset.socialPublish)})}
new MutationObserver(()=>{if(document.body.dataset.view==='social'){refreshStatus();bindPublishButtons()}}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
window.PLUGInstagram={refreshStatus,publishQueueItem,loadMedia,open:()=>view('social'),status:()=>status};
P.ready.then(()=>{bindPublishButtons();if(document.body.dataset.view==='social')refreshStatus()});
})();
