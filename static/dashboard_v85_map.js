
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,esc,api,state,openOppDetails}=P;
let map=null,layer=null,data=[],leafletPromise=null;
function modal(html){const m=q('#simpleModal'),c=q('#modalContent');if(!m||!c)return;c.innerHTML=html;m.classList.add('open')}
function loadLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    if(!document.querySelector('link[data-leaflet]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';link.dataset.leaflet='1';document.head.appendChild(link);
    }
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.defer=true;s.onload=()=>resolve(window.L);s.onerror=()=>reject(new Error('Leaflet indisponible'));document.head.appendChild(s);
  });
  return leafletPromise;
}
async function fetchData(force=false){
  if(data.length&&!force)return data;
  try{data=await api('/api/v85/map');state.map=data}catch{data=state.map||[]}
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
  if(list)list.innerHTML=rows.slice(0,100).map(x=>'<button class="geo-result" data-geo-kind="'+esc(x.kind)+'" data-geo-id="'+esc(x.id)+'"><i class="'+esc(x.kind)+'"></i><div><strong>'+esc((x.title||'').slice(0,72))+'</strong><span>'+esc([x.city,x.country].filter(Boolean).join(' · '))+'</span></div><b>'+esc(x.kind==='exhibition'?'EXPO':String(x.score||''))+'</b></button>').join('')||'<div class="empty-line">Aucun repère.</div>';
  qa('[data-geo-id]').forEach(b=>b.onclick=()=>{
    const x=rows.find(v=>v.kind===b.dataset.geoKind&&String(v.id)===String(b.dataset.geoId));if(!x)return;
    if(x.kind==='opportunity')openOppDetails?.(x.id);else map.flyTo([Number(x.lat),Number(x.lon)],8,{duration:.55});
  });
  if(autoFit&&bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:5});
}
async function init(){
  if(map){setTimeout(()=>map.invalidateSize(),30);render(false);return}
  const box=q('#geoMap');if(!box)return;
  try{
    await fetchData();countries();const L=await loadLeaflet();box.innerHTML='';
    map=L.map(box,{zoomControl:true,worldCopyJump:true,minZoom:2}).setView([38,8],3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
    layer=L.layerGroup().addTo(map);render(true);
  }catch(e){box.innerHTML='<div class="geo-loading">Carte indisponible. '+esc(e.message||'Erreur')+'</div>'}
}
['geoSearch','geoKind','geoCountry'].forEach(id=>q('#'+id)?.addEventListener(id==='geoSearch'?'input':'change',()=>render(false)));
q('#refreshGeoMap')?.addEventListener('click',async()=>{await fetchData(true);countries();render(true)});
q('#fitGeoMap')?.addEventListener('click',()=>render(true));
new MutationObserver(()=>{if(document.body.dataset.view==='map')setTimeout(init,20)}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
window.addEventListener('plugart:hydrated',()=>{if(document.body.dataset.view==='map')init()});
P.ready.then(()=>{if(document.body.dataset.view==='map')init()});
})();
