(function(){
'use strict';
var REV='202.20261003.1',LEGACY='/static/plugart_v162.js?v='+REV,LEGACY_CSS='/static/plugart_v162.css?v='+REV;
var legacyPromise=null,routeSequence=0,bootPromise=null;
var simpleRoutes={dashboard:true,creation:true};
var routes={dashboard:['WORKSPACE','Dashboard'],creation:['LABO CRÉATION','Création'],radar:['VEILLE ACTIVE','Radar'],opencalls:['SÉLECTION DE TRAVAIL','Open Calls'],bureau:['BUREAU','Bureau'],prospection:['CRM','Prospection'],social:['INSTAGRAM','Social Studio'],map:['CARTE','Map'],network:['RÉSEAU','Artistes'],ideas:['IDÉES','Nuage à idées']};
function qs(s,r){return (r||document).querySelector(s)}
function qsa(s,r){return Array.from((r||document).querySelectorAll(s))}
function normalize(r){if(r==='vernissages'||r==='agenda')return 'radar';return routes[r]?r:'dashboard'}
function notice(message){var el=qs('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(function(){el.classList.remove('show')},4500)}
function paintRoute(r,push){
 r=normalize(r);var m=routes[r];document.body.dataset.view=r;
 qsa('.view').forEach(function(v){v.classList.toggle('active',v.id==='view-'+r)});
 qsa('[data-route]').forEach(function(b){b.classList.toggle('active',normalize(b.dataset.route)===r)});
 var e=qs('#pageEyebrow'),t=qs('#pageTitle'),c=qs('#plugyContext');if(e)e.textContent=m[0];if(t)t.textContent=m[1];if(c)c.textContent='Contexte : '+m[1];
 document.title='PLUG ART · '+m[1];
 if(push!==false&&location.hash!=='#'+r)history.pushState({view:r},'','#'+r);
 var w=qs('.workspace');if(w&&w.scrollTo)w.scrollTo({top:0,behavior:'auto'});
 document.dispatchEvent(new CustomEvent('plugart:route',{detail:{route:r}}));
}
function asset(tag,url,mark){
 return new Promise(function(resolve,reject){
  var el=document.createElement(tag),timer=setTimeout(fail,15000);
  function fail(){clearTimeout(timer);el.remove();reject(new Error('Chargement incomplet. Réessaie pour ouvrir ce module.'))}
  el.dataset[mark]='1';el.onload=function(){clearTimeout(timer);resolve(el)};el.onerror=fail;
  if(tag==='link'){
   el.rel='stylesheet';el.href=url;var theme=qs('link[href*="plugart_v200.css"]');
   if(theme&&theme.parentNode)theme.parentNode.insertBefore(el,theme);else document.head.appendChild(el);
  }else{el.src=url;el.async=true;document.body.appendChild(el)}
 });
}
function loadLegacy(){
 if(window.__PLUGART_LEGACY_READY)return Promise.resolve(true);
 if(legacyPromise)return legacyPromise;
 window.__PLUGART_V202_MANAGED_BOOT=true;
 legacyPromise=(async function(){
  if(!qs('link[data-plugart-legacy-css-v202]'))await asset('link',LEGACY_CSS,'plugartLegacyCssV202');
  if(!window.__PLUGART_V202_RUNTIME_READY)await asset('script',LEGACY,'plugartLegacyV202');
  if(!window.__PLUGART_V202_RUNTIME_READY||typeof window.PLUGART_ROUTE!=='function')throw new Error('Initialisation du module interrompue. Recharge la page.');
  window.__PLUGART_LEGACY_READY=true;document.documentElement.dataset.legacyReady='1';return true;
 })().catch(function(err){legacyPromise=null;notice(err.message);throw err});
 return legacyPromise;
}
async function route(r,push){
 var requested=r;r=normalize(r);var sequence=++routeSequence;paintRoute(r,push);
 try{
  if(!simpleRoutes[r]||window.__PLUGART_LEGACY_READY){
   document.documentElement.dataset.routeLoading='1';await loadLegacy();
   if(sequence!==routeSequence)return false;
   await window.PLUGART_ROUTE(requested||r,false);
  }
  if(sequence===routeSequence&&r==='creation'&&window.PLUGART_V200)await window.PLUGART_V200.activate();
  return sequence===routeSequence;
 }catch(err){notice(err.message||'Module indisponible. Réessaie.');return false}
 finally{if(sequence===routeSequence)delete document.documentElement.dataset.routeLoading}
}
async function dashboardData(force){
 if(force){bootPromise=null;try{sessionStorage.removeItem('plugart:v124:dashboard-bootstrap')}catch(_){}}
 if(bootPromise)return bootPromise;
 bootPromise=(async function(){
  if(!force){try{var saved=JSON.parse(sessionStorage.getItem('plugart:v124:dashboard-bootstrap')||'null');if(saved&&saved.boot&&Date.now()-saved.savedAt<60000)return saved.boot}catch(_){}}
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
  try{var r=await fetch('/api/v124/dashboard-bootstrap',{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error('Données indisponibles');var d=await r.json();try{sessionStorage.setItem('plugart:v124:dashboard-bootstrap',JSON.stringify({savedAt:Date.now(),boot:d}))}catch(_){}return d}
  finally{clearTimeout(timer)}
 })();
 var current=bootPromise;try{return await current}finally{if(bootPromise===current)bootPromise=null}
}
function openSearch(){var box=qs('#searchOverlay');if(box){box.classList.add('open');qs('#commandInput').focus();renderSearch(qs('#commandInput').value)}}
async function renderSearch(value){
 var input=String(value||'').toLocaleLowerCase(),box=qs('#commandResults');if(!box)return;box.replaceChildren();
 Object.keys(routes).filter(function(r){return routes[r][1].toLocaleLowerCase().includes(input)}).forEach(function(r){var b=document.createElement('button');b.className='command-result';b.textContent=routes[r][1];b.onclick=function(){qs('#searchOverlay').classList.remove('open');route(r,true)};box.appendChild(b)});
 try{var d=await dashboardData();if(qs('#commandInput').value!==value)return;(d.opportunities||[]).filter(function(o){return String(o.title||'').toLocaleLowerCase().includes(input)}).slice(0,8).forEach(function(o){var b=document.createElement('button');b.className='command-result';b.textContent=o.title;b.onclick=async function(){qs('#searchOverlay').classList.remove('open');await route('creation',true);await window.PLUGART_V200.seedOpportunity(o.id)};box.appendChild(b)})}catch(_){notice('Recherche des opportunités momentanément indisponible')}
}
window.PLUGART_V202_ROUTE=route;window.PLUGART_V202_LOAD_LEGACY=loadLegacy;window.PLUGART_DASHBOARD_DATA=dashboardData;window.PLUGART_NOTICE=notice;
document.addEventListener('click',function(e){
 var nav=e.target.closest('[data-route]');
 if(nav){e.preventDefault();e.stopImmediatePropagation();route(nav.dataset.route,true);return}
 var action=e.target.closest('#topPlugy,#sidebarPlugy,#globalSearch,#refreshData,#newAction,#sidebarCollapse');if(!action)return;
 if(action.id==='topPlugy'||action.id==='sidebarPlugy'){
  if(window.__PLUGART_LEGACY_READY)return;
  e.preventDefault();e.stopImmediatePropagation();loadLegacy().then(function(){return window.PLUGART_ROUTE(document.body.dataset.view||'dashboard',false)}).then(function(){action.click()}).catch(function(){});return;
 }
 e.preventDefault();e.stopImmediatePropagation();
 if(action.id==='globalSearch')openSearch();
 if(action.id==='sidebarCollapse')document.body.classList.toggle('sidebar-small');
 if(action.id==='newAction')qs('#newOverlay').classList.add('open');
 if(action.id==='refreshData'){
  if(action.disabled)return;action.disabled=true;
  Promise.resolve(window.PLUGART_V200.refreshDashboard()).then(async function(){if(window.__PLUGART_LEGACY_READY&&window.PLUGART_REFRESH_V202)await window.PLUGART_REFRESH_V202();notice('Données actualisées')}).catch(function(){notice('Actualisation impossible. Réessaie.')}).finally(function(){action.disabled=false});
 }
},true);
document.addEventListener('click',function(e){
 var close=e.target.closest('[data-close-overlay]');if(close||e.target.classList.contains('overlay'))qsa('.overlay.open').forEach(function(o){o.classList.remove('open')});
 var create=e.target.closest('[data-create]');if(create&&!window.__PLUGART_LEGACY_READY){qs('#newOverlay').classList.remove('open');var r={content:'creation',bureau:'bureau',lead:'prospection',radar:'radar'}[create.dataset.create];route(r,true).then(function(ok){if(!ok)return;if(create.dataset.create==='lead')qs('#leadNew')?.click();if(create.dataset.create==='bureau')qs('#bureauNew')?.click()})}
});
document.addEventListener('input',function(e){if(e.target.id==='commandInput'){clearTimeout(renderSearch.timer);renderSearch.timer=setTimeout(function(){renderSearch(e.target.value)},100)}});
addEventListener('keydown',function(e){if(e.key==='Escape')qsa('.overlay.open').forEach(function(o){o.classList.remove('open')});if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();openSearch()}},true);
addEventListener('popstate',function(){route(location.hash.slice(1)||'dashboard',false)});
function media(){
 window.__PLUGART_MEDIA_V202=true;
 var observer='IntersectionObserver' in window?new IntersectionObserver(function(items){items.forEach(function(entry){if(entry.isIntersecting){observer.unobserve(entry.target);var src=entry.target.dataset.deferSrc;if(src){delete entry.target.dataset.deferSrc;entry.target.src=src}}})},{root:qs('.workspace'),rootMargin:'220px 0px',threshold:.01}):null;
 function prep(img){
  if(img.dataset.mediaV202||img.closest('.leaflet-container'))return;img.dataset.mediaV202='1';img.decoding='async';img.referrerPolicy='no-referrer';
  var src=img.getAttribute('src')||'',deferred=img.dataset.deferSrc;
  if(/^https?:/i.test(src)&&!src.startsWith(location.origin+'/'))img.src='/api/v171/image?url='+encodeURIComponent(src);
  img.addEventListener('load',function(){img.classList.add('img-ready-v171');img.classList.remove('img-failed-v171')});
  function failed(){if(img.dataset.fallbackV202)return;img.dataset.fallbackV202='1';img.classList.add('img-failed-v171');img.src='/api/v201/visual-fallback?label='+encodeURIComponent(img.alt||'PLUG ART')}
  img.addEventListener('error',failed);
  if(deferred){img.loading='lazy';if(observer)observer.observe(img);else{delete img.dataset.deferSrc;img.src=deferred}}
  else if(img.complete){if(img.naturalWidth>0)img.classList.add('img-ready-v171');else if(src)failed()}
 }
 qsa('img').forEach(prep);new MutationObserver(function(records){records.forEach(function(record){record.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.matches('img'))prep(n);qsa('img',n).forEach(prep)})})}).observe(document.body,{childList:true,subtree:true});
}
function boot(){
 document.body.classList.add('plugart-v200','plugart-v201','plugart-v202');media();
 var drawer=qs('#plugyDrawer');if(drawer){var sync=function(){drawer.inert=!drawer.classList.contains('open');drawer.setAttribute('aria-hidden',String(drawer.inert))};sync();new MutationObserver(sync).observe(drawer,{attributes:true,attributeFilter:['class']})}
 route(location.hash.slice(1)||'dashboard',false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
