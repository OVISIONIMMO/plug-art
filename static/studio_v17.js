(() => {
  const VERSION='PLUG ART V17';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  function mountModel(){
    const stage=q('.plugy-stage')||q('.art-wrap');
    if(!stage||q('#plugyModelV17')) return;
    stage.classList.add('v17-model-stage');
    const old=[...stage.childNodes];
    const shell=document.createElement('div'); shell.className='v17-model-shell';
    const fallback=document.createElement('div'); fallback.className='v17-model-fallback';
    old.forEach(n=>fallback.appendChild(n));
    const model=document.createElement('model-viewer');
    model.id='plugyModelV17';
    model.setAttribute('src','/api/assets/plugy.glb');
    model.setAttribute('alt','PLUGY, agent 3D de PLUG ART');
    model.setAttribute('camera-controls','');
    model.setAttribute('disable-pan','');
    model.setAttribute('interaction-prompt','none');
    model.setAttribute('shadow-intensity','1.15');
    model.setAttribute('shadow-softness','.9');
    model.setAttribute('exposure','1.08');
    model.setAttribute('camera-orbit','0deg 77deg 108%');
    model.setAttribute('field-of-view','29deg');
    model.setAttribute('auto-rotate','');
    model.setAttribute('auto-rotate-delay','2200');
    model.setAttribute('rotation-per-second','10deg');
    const badge=document.createElement('div'); badge.className='v17-model-badge'; badge.textContent='PLUGY · 3D WEB';
    shell.append(fallback,model,badge); stage.appendChild(shell);
    model.addEventListener('load',()=>shell.classList.add('ready'),{once:true});
    model.addEventListener('error',()=>shell.classList.remove('ready'));
    if(window.customElements?.whenDefined){customElements.whenDefined('model-viewer').then(()=>{model.style.visibility='visible'}).catch(()=>{})}
  }
  function closestField(id){return q(id)?.closest('.field')||q(id)}
  function move(node,target){if(node&&target&&!target.contains(node))target.appendChild(node)}
  function studioReflow(){
    const root=q('#carouselStudio');
    if(!root||root.classList.contains('v17-ready')) return;
    const shell=root.querySelector('.studio-shell');
    if(!shell) return;
    const panels=[...shell.querySelectorAll(':scope > .studio-panel')];
    const brief=panels[0], preview=shell.querySelector(':scope > .studio-preview'), edit=panels[1];
    if(!brief||!preview||!edit) return;
    root.classList.add('v17-ready');
    const workflow=document.createElement('div'); workflow.className='v17-workflow';
    workflow.innerHTML=`<div class="v17-step"><b>1</b><div><strong>Choisir</strong><span>Source + objectif</span></div></div><div class="v17-step"><b>2</b><div><strong>Générer</strong><span>PLUGY structure les slides</span></div></div><div class="v17-step"><b>3</b><div><strong>Ajuster</strong><span>Texte + image + style</span></div></div><div class="v17-step"><b>4</b><div><strong>Exporter</strong><span>PNG · ZIP · PDF</span></div></div>`;
    const ideas=root.querySelector('.quick-ideas'); root.insertBefore(workflow,ideas||root.firstChild);
    const layout=document.createElement('div'); layout.className='v17-studio-layout';
    const sidebar=document.createElement('aside'); sidebar.className='v17-sidebar';
    sidebar.innerHTML=`<div class="v17-sidebar-head"><strong>Studio simplifié</strong><span>Travaille une étape à la fois. Les fonctions avancées restent disponibles sans encombrer l’interface.</span></div><div class="v17-tabs"><button class="on" data-v17-tab="brief">Brief</button><button data-v17-tab="design">Design</button><button data-v17-tab="text">Texte</button><button data-v17-tab="media">Média</button><button data-v17-tab="export">Export</button></div><div class="v17-tabpanes"></div>`;
    const panes=sidebar.querySelector('.v17-tabpanes');
    const makePane=(id,title,tag)=>{const p=document.createElement('section');p.className='v17-pane'+(id==='brief'?' on':'');p.dataset.v17Pane=id;p.innerHTML=`<div class="v17-pane-title"><h4>${title}</h4><span>${tag}</span></div>`;panes.appendChild(p);return p};
    const pBrief=makePane('brief','1. Brief essentiel','DÉPART');
    const pDesign=makePane('design','2. Format & direction','VISUEL');
    const pText=makePane('text','3. Contenu de la slide','ÉDITION');
    const pMedia=makePane('media','4. Images & outils','CRÉATION');
    const pExport=makePane('export','5. Finaliser & exporter','SORTIE');
    [closestField('#carouselSource'),closestField('#carouselObjective'),closestField('#carouselBrief'),closestField('#globalCTA')].forEach(n=>move(n,pBrief));
    move(q('#generateCarousel')?.closest('.actions'),pBrief);
    [closestField('#slideCountInput'),q('#themeButtons')?.closest('.field'),q('[data-ratio="4:5"]')?.closest('.field')].forEach(n=>move(n,pDesign));
    [closestField('#editKicker'),closestField('#editTitle'),closestField('#editBody'),closestField('#editCTA')].forEach(n=>move(n,pText));
    move(edit.querySelector('.editor-actions'),pText);
    move(closestField('#slideImageURL'),pMedia);
    [q('#alignButtons')?.closest('.field'),closestField('#titleScale'),closestField('#bodyScale'),closestField('#imageZoom'),closestField('#imageX'),closestField('#imageY'),q('.drag-toolbar')].forEach(n=>move(n,pDesign));
    const advanced=document.createElement('div'); advanced.className='v17-advanced-content';
    [q('.image-lab'),q('#v11AiLab'),q('#v11Editor')].forEach(n=>move(n,advanced));
    if(advanced.children.length){const toggle=document.createElement('button');toggle.className='ghost v17-advanced-toggle';toggle.innerHTML='<span>Outils avancés · IA & calques</span><span>＋</span>';toggle.onclick=()=>{advanced.classList.toggle('open');toggle.lastElementChild.textContent=advanced.classList.contains('open')?'−':'＋'};pMedia.append(toggle,advanced)}
    move(q('#captionText')?.closest('.caption-box'),pExport);
    move(q('#draftLibrary')?.parentElement,pExport);
    const guide=document.createElement('div');guide.className='v17-export-guide';guide.innerHTML='<b>Prêt à publier ?</b>Vérifie la slide active, génère la légende puis exporte seulement ce dont tu as besoin.';pExport.prepend(guide);
    move(q('#downloadSlide')?.closest('.studio-actions'),pExport); move(q('#exportStatus'),pExport);
    [...edit.children].forEach(n=>{if(n.tagName!=='H3')move(n,pMedia)}); [...brief.children].forEach(n=>{if(n.tagName!=='H3')move(n,pBrief)});
    const previewWrap=document.createElement('div');previewWrap.className='v17-preview-wrap';
    const toolbar=document.createElement('div');toolbar.className='v17-preview-toolbar';toolbar.innerHTML=`<div class="v17-status"><b>Aperçu en direct</b> · les changements sont immédiats</div><button class="ghost" data-v17-open="export">Exporter →</button>`;
    previewWrap.append(toolbar,preview); layout.append(sidebar,previewWrap); root.appendChild(layout);
    qa('[data-v17-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.v17Tab)); q('[data-v17-open="export"]')?.addEventListener('click',()=>openTab('export'));
    function openTab(id){qa('[data-v17-tab]').forEach(b=>b.classList.toggle('on',b.dataset.v17Tab===id));qa('[data-v17-pane]').forEach(p=>p.classList.toggle('on',p.dataset.v17Pane===id));if(window.innerWidth<1120)sidebar.scrollIntoView({behavior:'smooth',block:'start'})}
    window.PLUGART_V17_OPEN_TAB=openTab;
  }
  function updateStudioMicrocopy(){const hero=q('#content .page-hero');if(hero){const p=hero.querySelector('p');if(p)p.textContent='Choisis une source ou écris ton idée, laisse PLUGY construire les slides, ajuste le visuel puis exporte. Les outils avancés restent disponibles uniquement quand tu en as besoin.'}const gen=q('#generateCarousel');if(gen)gen.textContent='Créer mes slides';const improve=q('#improveCarousel');if(improve)improve.textContent='Optimiser avec PLUGY'}
  function init(){mountModel();studioReflow();updateStudioMicrocopy();document.documentElement.dataset.plugartUi='17'}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
