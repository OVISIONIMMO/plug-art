
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,esc,api,state,openOppDetails}=P;
let map=null,layer=null,data=[],leafletPromise=null,geoTimer=0;
function modal(html){const m=q('#simpleModal'),c=q('#modalContent');if(!m||!c)return;c.innerHTML=html;m.classList.add('open')}
function loadLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-leaflet]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.dataset.leaflet='1';document.head.appendChild(link);
    }
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.defer=true;s.onload=()=>resolve(window.L);s.onerror=()=>reject(new Error('Moteur cartographique indisponible'));document.head.appendChild(s);
  });
  return leafletPromise;
}
async function fetchData(force=false){
  if(data.length&&!force)return data;
  try{data=await api('/api/v86/map'+(force?'?refresh=1':''));state.map=data}catch{data=state.map||[]}
  return data;
}
function filters(){
  const term=(q('#geoSearch')?.value||'').toLowerCase().trim();
  const kind=q('#geoKind')?.value||'',country=q('#geoCountry')?.value||'';
  return data.filter(x=>(!kind||x.kind===kind)&&(!country||x.country===country)&&(!term||[x.title,x.venue,x.city,x.country].filter(Boolean).join(' ').toLowerCase().includes(term)));
}
function countries(){
  const sel=q('#geoCountry');if(!sel)return;const cur=sel.value;
  const list=[...new Set(data.map(x=>x.country).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
  sel.innerHTML='<option value="">Tous les pays</option>'+list.map(x=>'<option>'+esc(x)+'</option>').join('');sel.value=cur;
}
function statusLine(txt,kind=''){const el=q('#geoStatus');if(!el)return;el.textContent=txt;el.dataset.kind=kind}
function render(autoFit=false){
  if(!map||!window.L)return;
  const rows=filters();layer.clearLayers();const bounds=[];
  rows.forEach(x=>{
    const lat=Number(x.lat),lon=Number(x.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
    const color=x.kind==='exhibition'?'#8b5cf6':'#2255ff';
    const marker=L.circleMarker([lat,lon],{radius:x.kind==='exhibition'?7:6,color:'#fff',weight:2,fillColor:color,fillOpacity:.93});
    marker.bindTooltip(esc(x.title||''),{direction:'top',opacity:.96});
    marker.on('click',()=>{
      if(x.kind==='opportunity')openOppDetails?.(x.id);
      else modal('<h3>'+esc(x.title||'Exposition')+'</h3><p>'+esc([x.venue,x.city,x.country].filter(Boolean).join(' · '))+'</p><p>'+esc(x.date||'')+'</p>'+(x.source_url?'<a class="modal-source" href="'+esc(x.source_url)+'" target="_blank" rel="noopener">Source officielle ↗</a>':''));
    });
    marker.addTo(layer);bounds.push([lat,lon]);
  });
  if(q('#geoVisible'))q('#geoVisible').textContent=String(rows.length);
  if(q('#geoCountries'))q('#geoCountries').textContent=String(new Set(rows.map(x=>x.country).filter(Boolean)).size);
  const list=q('#geoResultList');
  if(list)list.innerHTML=rows.slice(0,120).map(x=>'<button class="geo-result" data-geo-kind="'+esc(x.kind)+'" data-geo-id="'+esc(x.id)+'"><i class="'+esc(x.kind)+'"></i><div><strong>'+esc((x.title||'').slice(0,76))+'</strong><span>'+esc([x.city,x.country].filter(Boolean).join(' · '))+'</span></div><b>'+esc(x.kind==='exhibition'?'EXPO':String(x.score||''))+'</b></button>').join('')||'<div class="empty-line">Aucun repère.</div>';
  qa('[data-geo-id]').forEach(b=>b.onclick=()=>{
    const x=rows.find(v=>v.kind===b.dataset.geoKind&&String(v.id)===String(b.dataset.geoId));if(!x)return;
    if(x.kind==='opportunity')openOppDetails?.(x.id);else map.flyTo([Number(x.lat),Number(x.lon)],8,{duration:.48});
  });
  if(autoFit&&bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:5});
}
async function geocodeStatus(run=false){
  try{
    const s=await api('/api/v86/geocode/status'),missing=Number(s.missing||0);
    if(s.running){statusLine('Localisation automatique en cours…','working');scheduleRefresh()}
    else if(missing>0){statusLine(missing+' lieu'+(missing>1?'x':'')+' à localiser','pending');if(run)await startGeocode()}
    else statusLine('Carte géographique complète','ready');
  }catch{statusLine('Géocodage indisponible','error')}
}
async function startGeocode(){
  const b=q('#geoGeocode');if(b){b.disabled=true;b.textContent='Localisation…'}
  try{const r=await api('/api/v86/geocode/run',{method:'POST'});statusLine(r.started===false?'Géocodage déjà actif':'Localisation lancée','working');scheduleRefresh()}
  catch{statusLine('Erreur de localisation','error')}
  finally{if(b){b.disabled=false;b.textContent='Compléter la carte'}}
}
function scheduleRefresh(){
  clearTimeout(geoTimer);geoTimer=setTimeout(async()=>{
    const s=await api('/api/v86/geocode/status').catch(()=>null);
    if(s?.running){statusLine('Localisation automatique en cours…','working');scheduleRefresh();return}
    await fetchData(true);countries();render(true);await geocodeStatus(false);
  },4200);
}
async function init(){
  if(map){setTimeout(()=>map.invalidateSize(),20);render(false);return}
  const box=q('#geoMap');if(!box)return;
  try{
    await fetchData();countries();const L=await loadLeaflet();box.innerHTML='';
    map=L.map(box,{zoomControl:true,worldCopyJump:true,minZoom:2,preferCanvas:true}).setView([38,8],3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap',updateWhenIdle:true,keepBuffer:3}).addTo(map);
    layer=L.layerGroup().addTo(map);render(true);await geocodeStatus(true);
  }catch(e){box.innerHTML='<div class="geo-loading">Carte indisponible. '+esc(e.message||'Erreur')+'</div>'}
}
['geoSearch','geoKind','geoCountry'].forEach(id=>q('#'+id)?.addEventListener(id==='geoSearch'?'input':'change',()=>render(false)));
q('#refreshGeoMap')?.addEventListener('click',async()=>{await fetchData(true);countries();render(true);await geocodeStatus(false)});
q('#fitGeoMap')?.addEventListener('click',()=>render(true));
q('#geoGeocode')?.addEventListener('click',startGeocode);
new MutationObserver(()=>{if(document.body.dataset.view==='map')setTimeout(init,15)}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
window.addEventListener('plugart:hydrated',()=>{if(document.body.dataset.view==='map')init()});
P.ready.then(()=>{if(document.body.dataset.view==='map')init()});
})();
