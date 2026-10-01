(function(){
'use strict';
var LEGACY='/static/plugart_v162.js?v=202.20261001.2';
var legacyPromise=null;
var simpleRoutes={dashboard:true,creation:true};

function qs(s,r){return (r||document).querySelector(s)}
function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function meta(route){
  var m={
    dashboard:['WORKSPACE','Dashboard'],
    creation:['LABO CRÉATION','Création'],
    radar:['VEILLE ACTIVE','Radar'],
    opencalls:['SÉLECTION DE TRAVAIL','Open Calls'],
    bureau:['BUREAU','Bureau'],
    prospection:['CRM','Prospection'],
    social:['INSTAGRAM','Social Studio'],
    map:['CARTE','Map'],
    network:['RÉSEAU','Artistes'],
    ideas:['IDÉES','Nuage à idées']
  };
  return m[route]||m.dashboard;
}
function paintRoute(route,push){
  route=route||'dashboard';
  var m=meta(route);
  document.body.dataset.view=route;
  qsa('.view').forEach(function(v){v.classList.toggle('active',v.id==='view-'+route)});
  qsa('[data-route]').forEach(function(b){b.classList.toggle('active',b.dataset.route===route)});
  var e=qs('#pageEyebrow'),t=qs('#pageTitle');if(e)e.textContent=m[0];if(t)t.textContent=m[1];
  document.title='PLUG ART · '+m[1];
  if(push!==false&&location.hash!=='#'+route)history.pushState({view:route},'','#'+route);
  var w=qs('.workspace');if(w)w.scrollTo({top:0,behavior:'auto'});
}
function loadLegacy(route){
  if(window.__PLUGART_LEGACY_READY)return Promise.resolve(true);
  if(legacyPromise)return legacyPromise;
  if(route&&location.hash!=='#'+route)history.replaceState({view:route},'','#'+route);
  legacyPromise=new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src=LEGACY;s.async=true;s.dataset.plugartLegacyV202='1';
    s.onload=function(){window.__PLUGART_LEGACY_READY=true;document.documentElement.dataset.legacyReady='1';resolve(true)};
    s.onerror=function(){legacyPromise=null;reject(new Error('Moteur complet indisponible'))};
    document.body.appendChild(s);
  });
  return legacyPromise;
}
function route(route,push){
  route=route||'dashboard';
  if(route==='vernissages'||route==='agenda')route='radar';
  if(simpleRoutes[route]){
    paintRoute(route,push);
    return Promise.resolve(true);
  }
  paintRoute(route,push);
  document.documentElement.dataset.routeLoading='1';
  return loadLegacy(route).finally(function(){delete document.documentElement.dataset.routeLoading});
}
window.PLUGART_V202_ROUTE=route;
window.PLUGART_V202_LOAD_LEGACY=loadLegacy;

document.addEventListener('click',function(e){
  var r=e.target.closest('[data-route]');
  if(r&&!window.__PLUGART_LEGACY_READY){
    e.preventDefault();e.stopImmediatePropagation();
    route(r.dataset.route,true);
    return;
  }
  var id=e.target.closest('#topPlugy,#sidebarPlugy,#globalSearch,#refreshData,#newAction,#sidebarCollapse');
  if(!id||window.__PLUGART_LEGACY_READY)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(id.id==='newAction'){route('creation',true);return}
  if(id.id==='refreshData'){location.reload();return}
  loadLegacy(location.hash.slice(1)||'dashboard').then(function(){
    requestAnimationFrame(function(){try{id.click()}catch(_){}});
  }).catch(function(){});
},true);

addEventListener('popstate',function(){
  var r=location.hash.slice(1)||'dashboard';
  if(simpleRoutes[r]&&!window.__PLUGART_LEGACY_READY)paintRoute(r,false);
  else if(!window.__PLUGART_LEGACY_READY)loadLegacy(r).catch(function(){});
});

function boot(){
  document.body.classList.add('plugart-v200','plugart-v201','plugart-v202');
  var r=location.hash.slice(1)||'dashboard';
  if(simpleRoutes[r])paintRoute(r,false);
  else{paintRoute(r,false);loadLegacy(r).catch(function(){})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();