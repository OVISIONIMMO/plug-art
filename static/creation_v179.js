(()=>{'use strict';
const VERSION='179.20261001.1';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const S={format:'Carrousel Instagram',ratio:'4:5',style:'Moderne',imageStyle:'photo',quality:'medium',text:'',image:'',busy:false,opps:[]};
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function status(t){const e=$('#create179Status');if(e)e.textContent=t}
function busy(v){S.busy=v;const b=$('#create179Generate');if(b){b.disabled=v;b.textContent=v?'PLUGY crée ton contenu…':'✦ Générer avec PLUGY'}}
function openPlugy(){($('#topPlugy')||$('[data-open-plugy]'))?.click()}
function parseSlides(text){
  const out=[];const src=String(text||'');
  for(let i=1;i<=6;i++){const m=src.match(new RegExp('SLIDE\\s*'+i+'\\s*[:\\-]\\s*([^\\n]+)','i'));if(m)out.push(m[1].replace(/[*#]/g,'').trim())}
  if(!out.length){src.split(/\n+/).map(x=>x.replace(/^[-*#\d.\s]+/,'').trim()).filter(Boolean).slice(0,4).forEach(x=>out.push(x))}
  return out.slice(0,4)
}
function render(){
  const box=$('#create179Preview');if(!box)return;
  const slides=parseSlides(S.text),subject=$('#create179Subject')?.value.trim()||'PLUG ART';
  const defaults=[subject,'Une opportunité à découvrir','Pensé pour les artistes émergents','Passe à l’action'];
  const img=S.image?'<img src="'+esc(S.image)+'" alt="Visuel PLUG ART">':'';
  box.innerHTML=defaults.map((x,i)=>'<article class="create179-slide '+(i?'small':'')+'">'+img+'<div class="create179-overlay"><small>0'+(i+1)+'/04</small><b>'+esc(slides[i]||x)+'</b></div></article>').join('');
}
async function streamText(){
  S.text='';const out=$('#create179Text');if(out)out.textContent='';
  status('PLUGY prépare la structure et le texte…');
  const subject=$('#create179Subject').value.trim(),brief=$('#create179Brief').value.trim();
  const msg='Crée un '+S.format+' pour PLUG ART. Sujet : '+subject+'. Brief : '+brief+'. Direction artistique : '+S.style+'. Donne 4 slides maximum au format SLIDE 1:, SLIDE 2:, SLIDE 3:, SLIDE 4:, puis une légende courte. Ton professionnel, culturel, moderne et utile. N’invente aucune information factuelle absente.';
  const r=await fetch('/api/v179/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,page:'creation',history:[]}),cache:'no-store'});
  if(!r.ok)throw new Error('Texte indisponible');
  const reader=r.body?.getReader();if(!reader)throw new Error('Streaming indisponible');
  const dec=new TextDecoder();let buf='';
  while(true){
    const {value,done}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
    for(const line of lines){
      if(!line.trim())continue;let evt;try{evt=JSON.parse(line)}catch{continue}
      if(evt.type==='delta'&&evt.delta){S.text+=evt.delta;if(out){out.textContent+=evt.delta;out.scrollTop=out.scrollHeight}}
      if(evt.type==='meta'&&evt.state==='thinking')status('PLUGY réfléchit…');
    }
  }
  if(!S.text.trim())throw new Error('Réponse vide');
}
async function generateImage(){
  if(S.format==='Texte seul'){S.image='';return}
  status('PLUGY génère le visuel…');
  const subject=$('#create179Subject').value.trim(),brief=$('#create179Brief').value.trim();
  const prompt=[subject,brief,'Direction '+S.style,'Visuel éditorial premium pour PLUG ART, contemporain, artistique, crédible, impactant, sans texte lisible ni logo'].filter(Boolean).join('. ');
  const r=await fetch('/api/v179/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:S.imageStyle,ratio:S.ratio,quality:S.quality}),cache:'no-store'});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.url)throw new Error(d.detail||d.error||'Image indisponible');
  S.image=d.url;
}
async function generate(){
  const subject=$('#create179Subject')?.value.trim(),brief=$('#create179Brief')?.value.trim();
  if(!subject&&!brief){status('Ajoute un sujet ou un brief.');$('#create179Subject')?.focus();return}
  if(S.busy)return;busy(true);
  $('#create179Preview').innerHTML='<div class="create179-placeholder"><b>PLUGY construit ton contenu…</b><br><br>Texte et visuel sont générés en parallèle.</div>';
  const jobs=[streamText()];if(S.format!=='Texte seul')jobs.push(generateImage());
  const results=await Promise.allSettled(jobs);render();
  const textOk=results[0]?.status==='fulfilled',imageOk=S.format==='Texte seul'||results[1]?.status==='fulfilled';
  if(textOk&&imageOk)status('Contenu prêt · texte + visuel générés');
  else if(textOk)status('Texte prêt · le visuel peut être relancé');
  else if(imageOk)status('Visuel prêt · le texte peut être relancé');
  else status('La génération a échoué. Réessaie.');
  busy(false);
}
function setFormat(btn,root){
  S.format=btn.dataset.format;S.ratio=btn.dataset.ratio||'4:5';
  $$('[data-format]',root).forEach(x=>x.classList.toggle('on',x===btn))
}
function setStyle(btn,root){S.style=btn.dataset.style;$$('[data-style]',root).forEach(x=>x.classList.toggle('on',x===btn))}
async function loadSources(){
  const sel=$('#create179Source');if(!sel)return;
  try{
    const r=await fetch('/api/opportunities',{cache:'no-store'});if(!r.ok)return;
    const d=await r.json();S.opps=Array.isArray(d)?d:(d.items||d.opportunities||[]);
    sel.innerHTML='<option value="">Brief libre</option>'+S.opps.slice(0,100).map((o,i)=>'<option value="'+i+'">'+esc(o.title||'Sans titre')+'</option>').join('');
  }catch{}
}
function applySource(){
  const i=Number($('#create179Source')?.value);const o=S.opps[i];if(!o)return;
  $('#create179Subject').value=o.title||'';
  $('#create179Brief').value=[o.summary||o.radar_reason||'',o.city||'',o.country||'',o.deadline?'Deadline : '+o.deadline:''].filter(Boolean).join(' · ');
}
function build(){
  const view=$('#view-creation');if(!view||$('#creationV179'))return false;
  const root=document.createElement('section');root.id='creationV179';root.className='create179';
  root.innerHTML=`
    <section class="create179-hero">
      <div class="create179-kicker">Studio créatif · PLUG ART</div>
      <h2>Création de <em>contenu</em></h2>
      <p>Transforme une idée, une opportunité ou un projet en contenu prêt à publier. PLUGY génère le texte et le visuel dans le même flux.</p>
      <aside class="create179-agent">
        <div class="create179-face"><span class="create179-eyes"></span></div>
        <div class="create179-agent-copy"><b>PLUGY · actif</b><span>Une idée aujourd’hui ? Je m’occupe du reste.</span><button id="create179OpenPlugy">Ouvrir la conversation</button></div>
      </aside>
    </section>
    <div class="create179-work">
      <section class="create179-card create179-builder">
        <div class="create179-step">
          <div class="create179-stephead"><span class="create179-stepnum">1</span><strong>Sujet</strong></div>
          <input class="create179-input" id="create179Subject" placeholder="Ex. Mettre en avant notre prochain Open Call">
          <textarea class="create179-textarea" id="create179Brief" placeholder="Angle, public cible, informations clés, CTA…"></textarea>
          <div class="create179-suggestions">
            <button data-suggestion="Annonce d’un Open Call pour artistes émergents">Open Call</button>
            <button data-suggestion="Portrait d’un artiste émergent">Portrait artiste</button>
            <button data-suggestion="Conseils pratiques pour candidater">Conseils candidature</button>
            <button data-suggestion="Coulisses et actualités de PLUG ART">Coulisses PLUG ART</button>
          </div>
        </div>
        <div class="create179-step">
          <div class="create179-stephead"><span class="create179-stepnum">2</span><strong>Format</strong></div>
          <div class="create179-format">
            <button class="create179-choice on" data-format="Carrousel Instagram" data-ratio="4:5"><b>Carrousel</b>1080×1350</button>
            <button class="create179-choice" data-format="Post simple" data-ratio="1:1"><b>Post simple</b>1080×1080</button>
            <button class="create179-choice" data-format="Story Instagram" data-ratio="9:16"><b>Story</b>1080×1920</button>
            <button class="create179-choice" data-format="Bannière web" data-ratio="16:9"><b>Bannière</b>1920×1080</button>
            <button class="create179-choice" data-format="Texte seul" data-ratio="4:5"><b>Texte seul</b>Sans visuel</button>
          </div>
        </div>
        <div class="create179-step">
          <div class="create179-stephead"><span class="create179-stepnum">3</span><strong>Style</strong></div>
          <div class="create179-styles">
            ${['Moderne','Minimaliste','Artistique','Coloré','Épuré','Audacieux'].map((x,i)=>'<button class="create179-choice '+(i?'':'on')+'" data-style="'+x+'">'+x+'</button>').join('')}
          </div>
        </div>
        <details class="create179-advanced">
          <summary><span>⚙ Réglages avancés</span><span>⌄</span></summary>
          <div class="create179-advanced-grid">
            <label><small>Source Radar</small><select class="create179-select" id="create179Source"><option value="">Brief libre</option></select></label>
            <label><small>Direction visuelle</small><select class="create179-select" id="create179ImageStyle"><option value="photo">Photo éditoriale</option><option value="gallery">Galerie</option><option value="portrait">Portrait artiste</option><option value="urban">Culture urbaine</option><option value="studio">Atelier</option><option value="architecture">Architecture</option></select></label>
            <label><small>Qualité</small><select class="create179-select" id="create179Quality"><option value="medium">Équilibrée</option><option value="high">Haute</option><option value="low">Rapide</option></select></label>
            <button class="create179-select" type="button" id="create179AdvancedEditor">Ouvrir l’éditeur complet</button>
          </div>
        </details>
        <button class="create179-generate" id="create179Generate">✦ Générer avec PLUGY</button>
        <div class="create179-status" id="create179Status">PLUGY générera le texte et le visuel ensemble.</div>
      </section>
      <section class="create179-card create179-result" id="create179Result" data-tab="preview">
        <div class="create179-result-head">
          <div><strong>✓ Résultat</strong><span>Prévisualisation du contenu généré</span></div>
          <div class="create179-actions"><button id="create179Copy">Copier le texte</button><button id="create179Download">↓ Télécharger</button></div>
        </div>
        <div class="create179-tabs"><button class="on" data-result-tab="preview">Prévisualisation</button><button data-result-tab="text">Texte généré</button></div>
        <div class="create179-preview" id="create179Preview"><div class="create179-placeholder"><b>Prêt à créer.</b><br><br>Renseigne un sujet puis clique sur Générer.</div></div>
        <div class="create179-textout" id="create179Text"></div>
        <div class="create179-footer"><span class="create179-online">PLUGY est en ligne</span><span>Studio V179 · génération texte + image</span></div>
      </section>
    </div>`;
  view.prepend(root);
  root.addEventListener('click',e=>{
    const sug=e.target.closest('[data-suggestion]');if(sug&&!$('#create179Subject').value)$('#create179Subject').value=sug.dataset.suggestion;
    const f=e.target.closest('[data-format]');if(f)setFormat(f,root);
    const st=e.target.closest('[data-style]');if(st)setStyle(st,root);
    const tab=e.target.closest('[data-result-tab]');if(tab){$$('[data-result-tab]',root).forEach(x=>x.classList.toggle('on',x===tab));$('#create179Result').dataset.tab=tab.dataset.resultTab}
  });
  $('#create179OpenPlugy').onclick=openPlugy;
  $('#create179Generate').onclick=generate;
  $('#create179Source').onchange=applySource;
  $('#create179ImageStyle').onchange=e=>S.imageStyle=e.target.value;
  $('#create179Quality').onchange=e=>S.quality=e.target.value;
  $('#create179Copy').onclick=async()=>{if(!S.text)return status('Aucun texte à copier');try{await navigator.clipboard.writeText(S.text);status('Texte copié')}catch{status('Copie indisponible')}};
  $('#create179Download').onclick=()=>{if(!S.image)return status('Génère d’abord un visuel');const a=document.createElement('a');a.href=S.image;a.download='PLUG_ART_visuel.png';document.body.appendChild(a);a.click();a.remove()};
  $('#create179AdvancedEditor').onclick=()=>{document.body.classList.toggle('create179-show-legacy');status(document.body.classList.contains('create179-show-legacy')?'Éditeur complet ouvert sous le Studio':'Éditeur complet masqué')};
  loadSources();return true
}
function sync(){
  if(document.body.dataset.view==='creation')document.body.classList.add('create179-active');else document.body.classList.remove('create179-active');
}
function boot(){
  if(!build()){const o=new MutationObserver(()=>{if(build())o.disconnect()});o.observe(document.body,{childList:true,subtree:true})}
  document.addEventListener('click',e=>{if(e.target.closest('[data-route]'))requestAnimationFrame(sync)},true);
  addEventListener('hashchange',sync,{passive:true});sync();
  const params=new URLSearchParams(location.search);
  if(params.get('studio')==='1'){setTimeout(()=>{if(window.PLUGART_ROUTE)window.PLUGART_ROUTE('creation');else location.hash='creation'},80)}
  console.info('[PLUG ART] Studio V179 actif',VERSION)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();