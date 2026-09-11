(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let busy=false,bound=false;
function setStatus(text,b=false){const e=$('#v26Status');if(e){e.textContent=text;e.classList.toggle('busy',!!b)}document.documentElement.classList.toggle('p32-image-busy',!!b)}
function ratio(){return $('[data-v26-format].on')?.dataset.ratio||'4:5'}
function prompt(){return $('#v26AiPrompt')?.value?.trim()||[$('#v26Title')?.value?.trim(),$('#v26Context')?.value?.trim()].filter(Boolean).join('. ')||'Visuel éditorial contemporain pour PLUG ART'}
function style(){return $('#v26ImageStyle')?.value||'photo'}
function quality(){return $('#v26Quality')?.value||'medium'}
function show(url,label){const stage=$('#v26ImageStage');if(!stage)return;stage.innerHTML=`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Visuel généré dans PLUG ART"><div class="v26-image-actions"><button type="button" id="v32Download">Télécharger</button></div>`;$('#v32Download')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=url;a.download='PLUG_ART_visuel.png';document.body.appendChild(a);a.click();a.remove()});try{localStorage.setItem('plugart_v32_last_image',url)}catch{}setStatus(label,false)}
async function localVisual(){setStatus('Création locale…',true);try{const r=await fetch('/api/content/visual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt(),style:'abstract'}),cache:'no-store'});if(!r.ok)throw new Error(`Erreur ${r.status}`);show(URL.createObjectURL(await r.blob()),'Fond local prêt')}catch(e){setStatus('Création visuelle indisponible',false);throw e}}
async function generate(){
  if(busy)return;busy=true;const buttons=['#v26GenerateImage','#v26GenerateImage2'].map($).filter(Boolean);buttons.forEach(b=>b.disabled=true);setStatus('Génération image IA…',true);
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),165000);
  try{
    const r=await fetch('/api/v32/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:prompt(),style:style(),ratio:ratio(),quality:quality()}),cache:'no-store',signal:ctl.signal});
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.url)throw new Error(d.detail||`Erreur ${r.status}`);show(d.url,`Visuel IA prêt · ${d.model||'GPT-Image'}`)
  }catch(e){console.warn('[PLUG ART V32] image IA indisponible, fallback local',e);try{await localVisual()}catch{setStatus(e?.name==='AbortError'?'La génération IA a expiré. Réessaie.':'Erreur de génération image',false)}}
  finally{clearTimeout(timer);busy=false;buttons.forEach(b=>b.disabled=false);document.documentElement.classList.remove('p32-image-busy')}
}
async function provider(){try{const r=await fetch('/api/v32/content/image/status',{cache:'no-store'}),d=await r.json();const p=$('#v26Provider');if(p){p.textContent=d.enabled?`Image IA active · ${d.model}`:'Mode local disponible';p.classList.toggle('off',!d.enabled)}}catch{}['#v26GenerateImage','#v26GenerateImage2'].forEach(s=>{const b=$(s);if(b)b.disabled=false})}
function bind(){if(bound||!$('#v26Studio'))return false;bound=true;document.documentElement.dataset.studio32='1';['#v26GenerateImage','#v26GenerateImage2'].forEach(s=>{const b=$(s);if(!b)return;b.disabled=false;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();generate()},true)});$('#v26LocalVisual')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();localVisual().catch(()=>{})},true);const adv=$('.v26-advanced');if(adv)adv.open=false;provider();try{const old=localStorage.getItem('plugart_v32_last_image');if(old?.startsWith('/api/v32/content/generated/'))show(old,'Dernier visuel restauré')}catch{}console.info('[PLUG ART] Studio V32 image runtime actif');return true}
if(!bind()){
  const root=$('#content')||document.body;
  const obs=new MutationObserver(()=>{if(bind())obs.disconnect()});obs.observe(root,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),15000);
}
})();
