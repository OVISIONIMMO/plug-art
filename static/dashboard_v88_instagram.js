
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,api,store,esc,modal,view,state}=P;
const qkey='plugart_v66_social_queue';
let status=null,media=[],feedMode='actual',selectedMediaId='',commentsCache={};

const num=v=>Number(v||0);
const clean=s=>String(s||'').trim();
const queue=()=>store.get(qkey,[]);
const saveQueue=items=>{store.set(qkey,items);P.setSocialQueue?.(items);renderPlanner();renderFutureFeed();};
const fmtDate=v=>{try{return new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}catch{return''}};
const feedImage=m=>m?.thumbnail_url||m?.media_url||'';
const mediaLabel=t=>t==='CAROUSEL_ALBUM'?'CARROUSEL':t==='VIDEO'?'REEL / VIDÉO':'IMAGE';

function activatePanel(name){
  name=name||'overview';
  qa('[data-ig-panel]').forEach(b=>b.classList.toggle('active',b.dataset.igPanel===name));
  qa('.instagram-panel').forEach(p=>p.classList.toggle('active',p.id==='ig-panel-'+name));
  if(name==='feed')renderFeed();
  if(name==='planner'){renderPlanner();renderFutureFeed()}
  if(name==='comments')renderCommentMedia();
  if(name==='setup')renderSetup();
}
qa('[data-ig-panel]').forEach(b=>b.onclick=()=>activatePanel(b.dataset.igPanel));
qa('[data-ig-go]').forEach(b=>b.onclick=()=>activatePanel(b.dataset.igGo));

function syncTop(){
  const badge=q('#instagramConnectionBadge'),top=q('#instagramConnectTop');
  if(badge){
    badge.classList.toggle('connected',!!status?.connected);
    badge.textContent=status?.connected?'@'+(status.username||'Instagram')+' connecté':status?.configured?'Prêt à connecter':'Configuration Meta requise';
  }
  if(top)top.textContent=status?.connected?'Compte connecté':'Connecter Meta';
}
function accountCard(){
  const box=q('#instagramAccount');if(!box)return;
  if(!status){box.innerHTML='<div class="ig-state pending"><i></i><div><strong>Instagram</strong><span>Vérification…</span></div></div>';return}
  if(status.connected){
    box.innerHTML='<div class="ig-account-head">'+
      (status.profile_picture_url?'<img src="'+esc(status.profile_picture_url)+'" alt="">':'<div class="ig-avatar">IG</div>')+
      '<div><small>CONNECTÉ</small><strong>@'+esc(status.username||'instagram')+'</strong><span>'+esc(status.page_name||'Compte professionnel')+'</span></div>'+
      '<button id="instagramDisconnect" class="ig-soft">Déconnecter</button></div>'+
      '<div class="ig-account-kpis"><div><b>'+num(status.followers_count).toLocaleString('fr-FR')+'</b><span>abonnés</span></div><div><b>'+num(status.media_count).toLocaleString('fr-FR')+'</b><span>publications</span></div><div><b>'+esc(status.graph_version||'v26.0')+'</b><span>Graph API</span></div></div>';
    q('#instagramDisconnect')?.addEventListener('click',disconnect);
  }else{
    box.innerHTML='<div class="ig-connect-panel"><div class="ig-state '+(status.configured?'ready':'pending')+'"><i></i><div><strong>'+(status.configured?'Prêt à connecter':'Meta n’est pas encore configuré')+'</strong><span>'+(status.configured?'L’autorisation du compte est la dernière étape.':'Le centre de configuration te donne toutes les valeurs à copier.')+'</span></div></div>'+
      '<button class="ig-connect-btn" id="igAccountConnect">'+(status.configured?'Connecter le compte':'Ouvrir la configuration')+'</button></div>';
    q('#igAccountConnect')?.addEventListener('click',()=>status.configured?startLogin():activatePanel('setup'));
  }
}
async function refreshStatus(){
  try{
    status=await api('/api/v88/instagram/status');
    state.instagram=state.instagram||{};state.instagram.status=status;
    accountCard();syncTop();renderSetup();
    if(status.connected)await loadMedia();
    else{media=[];renderAllMediaViews()}
  }catch(e){
    status={connected:false,configured:false,error:e.message};accountCard();syncTop();renderSetup();
  }
}
function startLogin(){
  if(!status?.configured){activatePanel('setup');return}
  location.assign('/api/v88/instagram/login');
}
async function disconnect(){
  if(!confirm('Déconnecter Instagram de PLUG ART ?'))return;
  await api('/api/v88/instagram/disconnect',{method:'POST'});status=null;media=[];selectedMediaId='';await refreshStatus();
}

async function loadMedia(){
  if(!status?.connected)return;
  try{
    const r=await api('/api/v88/instagram/media?limit=30');
    media=Array.isArray(r.items)?r.items:[];
    state.instagram=state.instagram||{};state.instagram.media=media.slice(0,18);
    state.instagram.summary=feedSummary();
    renderAllMediaViews();
  }catch(e){
    media=[];
    const msg='<div class="empty-line">Impossible de charger le feed : '+esc(e.message)+'</div>';
    if(q('#instagramFeed'))q('#instagramFeed').innerHTML=msg;
    if(q('#instagramFeedMini'))q('#instagramFeedMini').innerHTML=msg;
  }
}
function filteredMedia(){
  const type=q('#igFeedFilter')?.value||'';
  return media.filter(m=>!type||m.media_type===type);
}
function feedTile(m,planned=false){
  const img=feedImage(m);
  return '<article class="ig-feed-tile'+(planned?' planned':'')+'" data-ig-media="'+esc(m.id||'')+'">'+
    (img?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div class="ig-media-placeholder">'+esc(mediaLabel(m.media_type))+'</div>')+
    (!planned?'<span class="ig-type">'+esc(mediaLabel(m.media_type))+'</span>':'')+
    '<div class="ig-tile-meta"><span>♥ '+num(m.like_count)+'</span><span>◌ '+num(m.comments_count)+'</span></div></article>';
}
function plannedTiles(limit=6){
  return queue().filter(x=>x.status!=='Publié'&&(x.media_urls||[]).length).slice(0,limit).map(x=>({
    id:'planned-'+x.id,media_type:'PLANNED',media_url:x.media_urls[0],caption:x.caption||x.title||'',like_count:0,comments_count:0,planned:true
  }));
}
function renderFeed(){
  const box=q('#instagramFeed');if(!box)return;
  const base=filteredMedia();
  const list=feedMode==='future'?[...plannedTiles(9),...base]:base;
  box.innerHTML=list.map(m=>feedTile(m,!!m.planned)).join('')||'<div class="empty-line">Aucun contenu à afficher.</div>';
  if(q('#igFeedIdentity'))q('#igFeedIdentity').textContent=status?.connected?'@'+status.username+' · '+base.length+' contenus chargés':'Compte non connecté';
  qa('#instagramFeed [data-ig-media]').forEach(el=>el.onclick=()=>{
    const id=el.dataset.igMedia;if(id.startsWith('planned-')){activatePanel('planner');return}
    const m=media.find(x=>String(x.id)===String(id));if(m)openMediaDetail(m);
  });
}
function renderMiniFeed(){
  const box=q('#instagramFeedMini');if(!box)return;
  box.innerHTML=media.slice(0,9).map(m=>feedTile(m,false)).join('')||'<div class="empty-line">Le feed apparaîtra ici après connexion.</div>';
}
function renderFutureFeed(){
  const box=q('#instagramFutureFeed');if(!box)return;
  const list=[...plannedTiles(6),...media.slice(0,9)].slice(0,12);
  box.innerHTML=list.map(m=>feedTile(m,!!m.planned)).join('')||'<div class="empty-line">Ajoute un contenu depuis le Studio.</div>';
}
function renderAllMediaViews(){
  renderMiniFeed();renderFeed();renderFutureFeed();renderPerformance();renderCommentMedia();
  const legacy=q('#instagramMedia');if(legacy)legacy.innerHTML=media.slice(0,12).map(m=>feedTile(m,false)).join('');
}
function feedSummary(){
  const rows=media.slice(0,18),likes=rows.reduce((a,m)=>a+num(m.like_count),0),comments=rows.reduce((a,m)=>a+num(m.comments_count),0);
  const top=rows.slice().sort((a,b)=>(num(b.like_count)+num(b.comments_count))-(num(a.like_count)+num(a.comments_count)))[0];
  const types=rows.reduce((a,m)=>{a[m.media_type]=(a[m.media_type]||0)+1;return a},{});
  return{posts:rows.length,likes,comments,avg:rows.length?Math.round((likes+comments)/rows.length):0,top,types};
}
function renderPerformance(){
  const s=feedSummary();
  if(q('#igPerfPosts'))q('#igPerfPosts').textContent=s.posts;
  if(q('#igPerfLikes'))q('#igPerfLikes').textContent=s.likes.toLocaleString('fr-FR');
  if(q('#igPerfComments'))q('#igPerfComments').textContent=s.comments.toLocaleString('fr-FR');
  if(q('#igPerfAvg'))q('#igPerfAvg').textContent=s.avg.toLocaleString('fr-FR');
  const top=q('#igTopPost');
  if(top)top.innerHTML=s.top?'<strong>Post le plus interactif</strong><span>'+esc((s.top.caption||mediaLabel(s.top.media_type)).slice(0,110))+' · '+(num(s.top.like_count)+num(s.top.comments_count))+' interactions</span>':'<span>Connecte le compte pour analyser le feed.</span>';
  const a=q('#igFeedAnalysis');
  if(a&&s.posts)a.innerHTML='<div class="analysis-row"><b>'+s.posts+' contenus</b> chargés dans le tableau de bord.</div>'+
    '<div class="analysis-row"><b>'+s.avg+' interactions</b> en moyenne par contenu sur cet échantillon.</div>'+
    '<div class="analysis-row">Formats : '+esc(Object.entries(s.types).map(([k,v])=>mediaLabel(k)+' '+v).join(' · '))+'</div>';
}
function openMediaDetail(m){
  modal('<div class="ig-media-detail">'+(feedImage(m)?'<img src="'+esc(feedImage(m))+'" alt="">':'')+
    '<div><small>'+esc(mediaLabel(m.media_type))+' · '+esc(fmtDate(m.timestamp))+'</small><h3>Publication Instagram</h3><p>'+esc(m.caption||'Sans légende')+'</p><div class="ig-detail-stats"><b>♥ '+num(m.like_count)+'</b><b>◌ '+num(m.comments_count)+'</b></div>'+
    '<div class="modal-actions-v85"><a class="save" href="'+esc(m.permalink||'#')+'" target="_blank" rel="noopener">Ouvrir sur Instagram ↗</a><button id="igDetailComments">Commentaires</button></div></div></div>');
  q('#igDetailComments')?.addEventListener('click',()=>{selectedMediaId=String(m.id);P.closeModal?.();activatePanel('comments');loadComments()});
}

function renderPlanner(){
  const items=queue();
  state.instagram=state.instagram||{};state.instagram.queue=items.slice(0,20);
  const today=new Date(),days=[];
  for(let i=0;i<7;i++){const d=new Date(today);d.setDate(today.getDate()+i);days.push(d)}
  const cal=q('#instagramCalendar');
  if(cal)cal.innerHTML=days.map((d,i)=>{
    const key=d.toISOString().slice(0,10),count=items.filter(x=>String(x.scheduled||'').startsWith(key)&&x.status!=='Publié').length;
    return '<div class="ig-day '+(i===0?'today':'')+'"><strong>'+d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit'})+'</strong><span>'+d.toLocaleDateString('fr-FR',{month:'short'})+'</span>'+(count?'<i title="'+count+' publication"></i><span>'+count+' prévu'+(count>1?'s':'')+'</span>':'')+'</div>';
  }).join('');
}
function scheduleFirst(hour,minute=0){
  const items=queue(),item=items.find(x=>x.status!=='Publié');if(!item){modal('<h3>Aucun contenu à planifier</h3><p>Ajoute d’abord un contenu depuis le Studio.</p>');return}
  const d=new Date();d.setDate(d.getDate()+1);d.setHours(hour,minute,0,0);
  const pad=n=>String(n).padStart(2,'0');item.scheduled=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());item.status='À publier';saveQueue(items);
}
q('#igScheduleMorning')?.addEventListener('click',()=>scheduleFirst(9,0));
q('#igScheduleNoon')?.addEventListener('click',()=>scheduleFirst(12,30));
q('#igScheduleEvening')?.addEventListener('click',()=>scheduleFirst(18,30));

function renderCommentMedia(){
  const box=q('#igCommentMediaList');if(!box)return;
  box.innerHTML=media.slice(0,18).map(m=>'<button class="ig-comment-media '+(String(m.id)===selectedMediaId?'active':'')+'" data-comment-media="'+esc(m.id)+'">'+
    (feedImage(m)?'<img src="'+esc(feedImage(m))+'" alt="">':'<div class="ig-avatar">IG</div>')+
    '<div><strong>'+esc((m.caption||mediaLabel(m.media_type)).slice(0,55))+'</strong><span>'+num(m.comments_count)+' commentaires</span></div><b>›</b></button>').join('')||'<div class="empty-line">Connecte Instagram.</div>';
  qa('[data-comment-media]').forEach(b=>b.onclick=()=>{selectedMediaId=String(b.dataset.commentMedia);renderCommentMedia();loadComments()});
}
async function loadComments(){
  const box=q('#igCommentsList');if(!box||!selectedMediaId)return;
  box.innerHTML='<div class="empty-line">Chargement des commentaires…</div>';
  try{
    const r=commentsCache[selectedMediaId]||await api('/api/v88/instagram/media/'+encodeURIComponent(selectedMediaId)+'/comments');
    commentsCache[selectedMediaId]=r;
    const rows=Array.isArray(r.items)?r.items:[];
    box.innerHTML=rows.map(c=>'<article class="ig-comment"><div class="ig-comment-head"><strong>@'+esc(c.username||'instagram')+'</strong><span>'+esc(fmtDate(c.timestamp))+'</span></div><p>'+esc(c.text||'')+'</p><div class="ig-comment-actions"><button data-ig-reply="'+c.id+'">Répondre</button></div><div class="ig-comment-reply" data-reply-box="'+c.id+'" hidden><input placeholder="Réponse…"><button>Envoyer</button></div></article>').join('')||'<div class="empty-line">Aucun commentaire sur cette publication.</div>';
    qa('[data-ig-reply]').forEach(b=>b.onclick=()=>{const row=q('[data-reply-box="'+b.dataset.igReply+'"]');if(row)row.hidden=!row.hidden});
    qa('[data-reply-box]').forEach(row=>{const btn=row.querySelector('button'),input=row.querySelector('input');btn.onclick=async()=>{const message=clean(input.value);if(!message)return;btn.disabled=true;try{await api('/api/v88/instagram/comments/'+encodeURIComponent(row.dataset.replyBox)+'/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});input.value='';modal('<h3>Réponse envoyée ✓</h3><p>La réponse a été publiée sur Instagram.</p>')}catch(e){modal('<h3>Réponse impossible</h3><p>'+esc(e.message)+'</p>')}finally{btn.disabled=false}}});
  }catch(e){box.innerHTML='<div class="empty-line">Commentaires indisponibles : '+esc(e.message)+'</div>'}
}
q('#igRefreshComments')?.addEventListener('click',()=>{if(selectedMediaId){delete commentsCache[selectedMediaId];loadComments()}});

function renderSetup(){
  const box=q('#igSetupChecklist');if(!box||!status)return;
  const steps=[
    ['Application Meta',status.app_id_configured,'META_APP_ID'],
    ['Secret Meta',status.app_secret_configured,'META_APP_SECRET'],
    ['OAuth Redirect',!!status.redirect_uri,'URI prête'],
    ['Webhook Meta',status.webhook_token_configured,'Callback prêt'],
    ['Compte Instagram',status.connected,status.connected?'@'+status.username:'Autorisation à faire']
  ];
  const done=steps.filter(x=>x[1]).length;
  if(q('#igSetupProgress'))q('#igSetupProgress').textContent=done+'/'+steps.length;
  box.innerHTML=steps.map((s,i)=>'<div class="ig-setup-step '+(s[1]?'done':'')+'"><i>'+(s[1]?'✓':i+1)+'</i><div><strong>'+esc(s[0])+'</strong><span>'+esc(s[2])+'</span></div><b>'+(s[1]?'OK':'À FAIRE')+'</b></div>').join('');
  const vals={igAppDomain:status.app_domain||location.host,igRedirectUri:status.redirect_uri||'',igWebhookUrl:status.webhook_url||'',igWebhookToken:status.webhook_verify_token||''};
  Object.entries(vals).forEach(([id,v])=>{if(q('#'+id))q('#'+id).textContent=v||'—'});
  const perms=q('#igPermissionList');if(perms)perms.innerHTML=(status.required_permissions||[]).map(x=>'<code>'+esc(x)+'</code>').join('');
  const connect=q('#instagramConnect');if(connect){connect.disabled=!status.configured||status.connected;connect.textContent=status.connected?'Instagram connecté ✓':status.configured?'Connecter Instagram':'Ajouter APP ID + SECRET'}
}
qa('[data-copy-id]').forEach(b=>b.onclick=async()=>{const val=q('#'+b.dataset.copyId)?.textContent||'';try{await navigator.clipboard.writeText(val);const old=b.textContent;b.textContent='Copié ✓';setTimeout(()=>b.textContent=old,900)}catch{}});
q('#igTestMeta')?.addEventListener('click',async()=>{
  const box=q('#igMetaDiagnostic');if(!box)return;box.innerHTML='<span>Diagnostic…</span>';
  try{
    const r=await api('/api/v88/instagram/diagnostic');
    box.innerHTML=(r.checks||[]).map(x=>'<div class="ig-diag-row"><span>'+esc(x.label)+'</span><b class="'+(x.ok?'ok':'wait')+'">'+(x.ok?'OK':'À configurer')+'</b></div>').join('');
  }catch(e){box.innerHTML='<span>'+esc(e.message)+'</span>'}
});

function createInStudio(kind){
  view('studio');
  setTimeout(()=>{
    const format=q('#studioFormat');
    if(format){
      format.value=kind==='story'?'story':kind==='post'?'portrait':'portrait';
      format.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(kind==='plugy'){P.openChat?.();setTimeout(()=>window.PlugyAssistant?.ask?.('Aide-moi à créer une publication Instagram PLUG ART. Commence par me proposer une structure courte et visuelle à partir du contenu actuel du Studio.'),120)}
    else{const btn=q('#queueInstagramBtn');btn?.classList.add('plugy-action-focus');setTimeout(()=>btn?.classList.remove('plugy-action-focus'),1400)}
  },150);
}
qa('[data-ig-create]').forEach(b=>b.onclick=()=>createInStudio(b.dataset.igCreate));
q('#instagramQuickCreate')?.addEventListener('click',()=>createInStudio('carousel'));
q('#instagramStudioBridge')?.addEventListener('click',()=>createInStudio('carousel'));

q('#igAskPlugyFeed')?.addEventListener('click',()=>{
  const s=feedSummary();
  P.openChat?.();
  setTimeout(()=>window.PlugyAssistant?.ask?.('Analyse mon feed Instagram à partir de ces données réelles : '+JSON.stringify({posts:s.posts,likes:s.likes,comments:s.comments,avg:s.avg,formats:s.types,top_caption:s.top?.caption||''})+'. Donne-moi 3 observations et 3 actions concrètes pour les prochains contenus PLUG ART.'),120);
});
async function rewriteSocialOutput(mode){
  const out=q('#socialKitOutput'),brief=clean(q('#socialBrief')?.value),source=clean(out?.value)||brief;if(!source||!out)return;
  const prompt=mode==='short'
    ?'Réécris ce contenu Instagram PLUG ART en version plus courte, directe et naturelle. Garde uniquement les faits fournis, puis 5 à 8 hashtags utiles. Texte : '+source
    :'Améliore ce contenu Instagram PLUG ART sans inventer de faits. Texte : '+source;
  const old=out.value;out.value='PLUGY travaille…';
  try{const r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,page:'social',mode:'fast'})});out.value=r.answer||old}catch{out.value=old}
}
q('#igRewriteShort')?.addEventListener('click',()=>rewriteSocialOutput('short'));
q('#igAddCTA')?.addEventListener('click',()=>{
  const out=q('#socialKitOutput');if(!out)return;const cta='Commente PLUG 🔌 pour être branché et recevoir le lien de candidature';
  if(!out.value.includes('Commente PLUG'))out.value=(out.value.trim()?out.value.trim()+'\n\n':'')+cta;
});
q('#igCopyCaption')?.addEventListener('click',async()=>{
  const value=q('#socialKitOutput')?.value||'';if(!value)return;try{await navigator.clipboard.writeText(value);const b=q('#igCopyCaption'),old=b.textContent;b.textContent='Copié ✓';setTimeout(()=>b.textContent=old,900)}catch{}
});

q('#igCopyFeedPlan')?.addEventListener('click',async()=>{
  const upcoming=queue().filter(x=>x.status!=='Publié').slice(0,6).map((x,i)=>(i+1)+'. '+(x.title||'Publication')+(x.scheduled?' · '+x.scheduled:'')).join('\n')||'Aucune publication planifiée.';
  try{await navigator.clipboard.writeText(upcoming);q('#igCopyFeedPlan').textContent='Plan copié ✓';setTimeout(()=>q('#igCopyFeedPlan').textContent='Copier le prochain plan',900)}catch{}
});

qa('[data-feed-view]').forEach(b=>b.onclick=()=>{feedMode=b.dataset.feedView;qa('[data-feed-view]').forEach(x=>x.classList.toggle('active',x===b));renderFeed()});
q('#igFeedFilter')?.addEventListener('change',renderFeed);
q('#instagramRefresh')?.addEventListener('click',refreshStatus);
q('#instagramOpenSetup')?.addEventListener('click',()=>activatePanel('setup'));
q('#instagramConnectTop')?.addEventListener('click',()=>status?.connected?activatePanel('overview'):status?.configured?startLogin():activatePanel('setup'));
q('#instagramConnect')?.addEventListener('click',startLogin);

function bindPublishButtons(){qa('[data-social-publish]').forEach(b=>b.onclick=()=>publishQueueItem(b.dataset.socialPublish))}
async function publishQueueItem(id){
  const items=queue(),item=items.find(x=>String(x.id)===String(id));if(!item)return;
  if(!status?.connected){activatePanel('setup');return}
  const urls=(item.media_urls||[]).map(u=>/^https?:\/\//i.test(u)?u:(String(u).startsWith('/')?location.origin+u:'')).filter(Boolean).slice(0,10);
  if(!urls.length){modal('<h3>Visuel requis</h3><p>Prépare d’abord les rendus finaux dans le Studio.</p>');return}
  modal('<h3>Publier sur Instagram</h3><p><b>'+esc(item.title||'Publication PLUG ART')+'</b></p><p>'+urls.length+' média'+(urls.length>1?'s':'')+' · @'+esc(status.username||'Instagram')+'</p><label>Légende<textarea id="igPublishCaption">'+esc(item.caption||'')+'</textarea></label><button class="save" id="igConfirmPublish">Publier maintenant</button>');
  q('#igConfirmPublish')?.addEventListener('click',async e=>{
    const b=e.currentTarget,old=b.textContent;b.disabled=true;b.textContent='Publication…';
    try{
      const r=await api('/api/v88/instagram/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caption:q('#igPublishCaption')?.value||'',media_urls:urls,title:item.title||''})});
      item.status='Publié';item.instagram_media_id=r.media_id||'';item.published_at=new Date().toISOString();saveQueue(items);P.closeModal?.();await loadMedia();modal('<h3>Publié ✓</h3><p>Le contenu a été envoyé sur @'+esc(status.username||'Instagram')+'.</p>');
    }catch(err){b.disabled=false;b.textContent=old;modal('<h3>Publication interrompue</h3><p>'+esc(err.message)+'</p>')}
  });
}
window.addEventListener('plugart:social-rendered',()=>{bindPublishButtons();renderPlanner();renderFutureFeed()});

function setupOAuthResult(){
  const params=new URLSearchParams(location.search);
  if(params.get('instagram_error')){activatePanel('setup');modal('<h3>Connexion Meta interrompue</h3><p>'+esc(params.get('instagram_error'))+'</p>')}
}
new MutationObserver(()=>{if(document.body.dataset.view==='social'){refreshStatus();bindPublishButtons()}}).observe(document.body,{attributes:true,attributeFilter:['data-view']});

window.PLUGInstagram={
  refreshStatus,loadMedia,publishQueueItem,open:(panel='overview')=>{view('social');setTimeout(()=>activatePanel(panel),40)},
  status:()=>status,summary:()=>feedSummary(),context:()=>({status,summary:feedSummary(),queue:queue().slice(0,8)})
};
P.ready.then(()=>{setupOAuthResult();bindPublishButtons();renderPlanner();renderFutureFeed();if(document.body.dataset.view==='social')refreshStatus()});
})();
