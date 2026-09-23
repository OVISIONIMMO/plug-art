
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const q=P.q,qa=P.qa,api=P.api,esc=P.esc;
const defaults={accent:'violet',surface:'editorial',density:'balanced',radius:22,fontScale:1,motion:'subtle',sidebar:'standard',plugyConcept:'monolith',updated_at:''};
let cfg=Object.assign({},defaults),versions=[],previewMode='desktop';
const concepts=[
['pearl','Pearl Socket','Nacré · doux','Volume compact, face plane et broches courtes intégrées. Le descendant direct du PLUGY actuel, mais beaucoup plus architectural.'],
['monolith','Monolith Plug','Iconique · premium','Bloc carré-arrondi presque monolithique, deux broches géométriques très courtes, yeux noyés dans la matière.'],
['halo','Halo Plug','Léger · spatial','Une prise dessinée par un anneau lumineux épais, avec un cœur flottant. La silhouette reste lisible sans masse lourde.'],
['flux','Flux Plug','Énergie · vivant','Corps formé par une matière fluide qui remonte naturellement pour créer les deux broches, sans séparation mécanique.'],
['prism','Prism Plug','Cristal · futur','Volume translucide facetté très doux, reflets cyan/violet/rose et face sombre suspendue à l’intérieur.'],
['orbit','Orbit Plug','Agent · dynamique','Cœur compact central et deux broches satellites qui se repositionnent selon l’état de PLUGY.'],
['fold','Fold Plug','Design · sculptural','Une seule plaque épaisse pliée forme le visage, les côtés et les deux broches. Très objet de design.'],
['softmodule','Soft Module','Calme · intelligent','Petit module blanc mat-nacré aux bords généreux. Broches presque affleurantes, visage minimal et très lisible.'],
['totem','Totem Plug','Vertical · statutaire','Silhouette plus haute, prise compacte, regard bas et grandes surfaces calmes. Présence forte sans devenir un personnage.'],
['pixel','Pixel Plug','Digital · réseau','Forme de prise nette avec surface matricielle subtile. Les pixels deviennent activité, écoute et réflexion.'],
['lens','Lens Plug','Optique · observateur','Face avant légèrement vitrée comme une lentille. Les yeux vivent sous la surface et la coque reste nacrée.'],
['ribbon','Ribbon Plug','Fluide · signature','Un ruban 3D continu dessine le corps et se prolonge pour former les deux broches. Silhouette très mémorisable.'],
['capsule','Capsule Plug','Compact · mobile','Corps très court, broches intégrées, épaisseur importante. Pensé pour rester identifiable même en 70 px.'],
['magnetic','Magnetic Plug','Technique · premium','Deux demi-coques reliées par une fine ligne énergétique. Les broches semblent aimantées au volume principal.'],
['void','Void Plug','Sombre · spectaculaire','Corps graphite très doux avec intérieur lumineux rose/violet. La prise est définie par ses arêtes et son vide central.']
];
function setText(id,v){const el=q('#'+id);if(el)el.textContent=v}
function setValue(id,v){const el=q('#'+id);if(el)el.value=v}
function applyConfig(){
 document.body.dataset.v90Accent=cfg.accent;
 document.body.dataset.v90Surface=cfg.surface;
 document.body.dataset.v90Density=cfg.density;
 document.body.dataset.v90Motion=cfg.motion;
 document.body.dataset.v90Sidebar=cfg.sidebar;
 document.documentElement.style.setProperty('--v90-radius',Number(cfg.radius||22)+'px');
 document.documentElement.style.setProperty('--v90-font-scale',Number(cfg.fontScale||1));
 setValue('builderRadius',cfg.radius);setValue('builderFontScale',cfg.fontScale);setText('builderRadiusValue',cfg.radius+' px');
 qa('[data-builder-accent]').forEach(function(b){b.classList.toggle('active',b.dataset.builderAccent===cfg.accent)});
 qa('[data-builder-surface]').forEach(function(b){b.classList.toggle('active',b.dataset.builderSurface===cfg.surface)});
 qa('[data-builder-density]').forEach(function(b){b.classList.toggle('active',b.dataset.builderDensity===cfg.density)});
 qa('[data-builder-motion]').forEach(function(b){b.classList.toggle('active',b.dataset.builderMotion===cfg.motion)});
 qa('[data-builder-sidebar]').forEach(function(b){b.classList.toggle('active',b.dataset.builderSidebar===cfg.sidebar)});
 qa('[data-plugy-concept]').forEach(function(b){b.classList.toggle('active',b.dataset.plugyConcept===cfg.plugyConcept)});
 renderPreview();renderSelectedConcept();
}
function renderPreview(){
 const frame=q('#builderPreviewFrame');if(!frame)return;
 frame.dataset.preview=previewMode;frame.dataset.accent=cfg.accent;frame.dataset.surface=cfg.surface;frame.dataset.density=cfg.density;frame.dataset.sidebar=cfg.sidebar;
 frame.style.setProperty('--preview-radius',cfg.radius+'px');frame.style.setProperty('--preview-font-scale',cfg.fontScale);
 setText('builderViewportLabel',previewMode==='desktop'?'1440 × 960':previewMode==='tablet'?'820 × 1180':'390 × 844');
}
function renderConcepts(){
 const grid=q('#plugyConceptGrid');if(!grid)return;
 grid.innerHTML=concepts.map(function(c,i){
   const id=c[0],name=c[1],tone=c[2],desc=c[3];
   return '<button class="plugy-concept-card '+(id===cfg.plugyConcept?'active':'')+'" data-plugy-concept="'+id+'">'+
     '<div class="plugy-concept-visual concept-'+id+'"><i class="concept-prong p1"></i><i class="concept-prong p2"></i><span class="concept-face"><b></b><b></b></span><em>'+String(i+1).padStart(2,'0')+'</em></div>'+
     '<div><small>'+esc(tone)+'</small><strong>'+esc(name)+'</strong><p>'+esc(desc)+'</p></div></button>';
 }).join('');
 qa('[data-plugy-concept]').forEach(function(b){b.onclick=function(){cfg.plugyConcept=b.dataset.plugyConcept;applyConfig();markDirty()}});
}
function renderSelectedConcept(){
 const found=concepts.find(function(x){return x[0]===cfg.plugyConcept})||concepts[1];
 setText('plugyConceptName',found[1]);setText('plugyConceptNameLarge',found[1]);setText('plugyConceptTone',found[2]);setText('plugyConceptDescription',found[3]);
 const stage=q('#plugyConceptStage');if(stage)stage.className='plugy-concept-stage concept-'+found[0];
}
function markDirty(){const b=q('#builderSave');if(b){b.dataset.dirty='1';b.textContent='Enregistrer les réglages'}setText('builderSaveState','Modifications non enregistrées')}
async function loadConfig(){
 try{const r=await api('/api/v90/builder/config');cfg=Object.assign({},defaults,r.config||{});versions=Array.isArray(r.versions)?r.versions:[]}
 catch(e){cfg=Object.assign({},defaults)}
 applyConfig();renderConcepts();renderVersions();
}
function renderVersions(){
 const box=q('#builderVersions');if(!box)return;
 box.innerHTML=versions.slice(0,8).map(function(v){
   return '<button data-builder-version="'+v.id+'"><span>'+esc(v.name||'Version')+'</span><small>'+esc(v.created_at||'')+'</small>'+(v.published?'<b>ACTIVE</b>':'')+'</button>';
 }).join('')||'<div class="empty-line">Aucune version enregistrée.</div>';
}
async function saveConfig(publish){
 const b=publish?q('#builderPublish'):q('#builderSave'),old=b&&b.textContent;if(b){b.disabled=true;b.textContent=publish?'Publication…':'Enregistrement…'}
 try{
  const name='Interface '+new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})+' '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  const r=await api('/api/v90/builder/config',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:cfg,name:name,publish:!!publish})});
  cfg=Object.assign({},defaults,r.config||cfg);versions=r.versions||versions;setText('builderSaveState',publish?'Version publiée':'Version enregistrée');renderVersions();applyConfig();
 }catch(e){setText('builderSaveState','Erreur : '+e.message)}
 finally{if(b){b.disabled=false;b.textContent=old}}
}
function resetConfig(){cfg=Object.assign({},defaults);applyConfig();renderConcepts();markDirty()}
qa('[data-builder-accent]').forEach(function(b){b.onclick=function(){cfg.accent=b.dataset.builderAccent;applyConfig();markDirty()}});
qa('[data-builder-surface]').forEach(function(b){b.onclick=function(){cfg.surface=b.dataset.builderSurface;applyConfig();markDirty()}});
qa('[data-builder-density]').forEach(function(b){b.onclick=function(){cfg.density=b.dataset.builderDensity;applyConfig();markDirty()}});
qa('[data-builder-motion]').forEach(function(b){b.onclick=function(){cfg.motion=b.dataset.builderMotion;applyConfig();markDirty()}});
qa('[data-builder-sidebar]').forEach(function(b){b.onclick=function(){cfg.sidebar=b.dataset.builderSidebar;applyConfig();markDirty()}});
q('#builderRadius')?.addEventListener('input',function(e){cfg.radius=Number(e.target.value);applyConfig();markDirty()});
q('#builderFontScale')?.addEventListener('input',function(e){cfg.fontScale=Number(e.target.value);applyConfig();markDirty()});
qa('[data-preview-mode]').forEach(function(b){b.onclick=function(){previewMode=b.dataset.previewMode;qa('[data-preview-mode]').forEach(function(x){x.classList.toggle('active',x===b)});renderPreview()}});
q('#builderSave')?.addEventListener('click',function(){saveConfig(false)});
q('#builderPublish')?.addEventListener('click',function(){saveConfig(true)});
q('#builderReset')?.addEventListener('click',resetConfig);
q('#builderAskPlugy')?.addEventListener('click',function(){q('#openPlugy')?.click();setTimeout(function(){const c=concepts.find(function(x){return x[0]===cfg.plugyConcept});window.PlugyAssistant?.ask?.('Aide-moi à améliorer l’interface PLUG ART. Je suis dans Interface Lab avec le concept PLUGY '+((c&&c[1])||'Monolith Plug')+'. Donne-moi 3 décisions de design concrètes et prioritaires.')},120)});
q('#builderApplyCurrent')?.addEventListener('click',function(){document.body.dataset.v90PreviewApply='1';applyConfig();setText('builderSaveState','Aperçu appliqué à cette session')});
new MutationObserver(function(){if(document.body.dataset.view==='builder'&&!q('#plugyConceptGrid')?.children.length){renderConcepts();loadConfig()}}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
window.PLUGBuilder={config:function(){return cfg},load:loadConfig,apply:applyConfig,concepts:concepts};
P.ready.then(function(){renderConcepts();loadConfig()});
})();
