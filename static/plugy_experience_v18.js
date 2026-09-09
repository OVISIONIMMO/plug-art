(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function renderRichText(text){
    const safe=escapeHtml(text);
    return safe
      .replace(/^### (.*)$/gm,'<h4>$1</h4>')
      .replace(/^## (.*)$/gm,'<h3>$1</h3>')
      .replace(/^# (.*)$/gm,'<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/^[-•] (.*)$/gm,'<li>$1</li>')
      .replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>')
      .replace(/\n{2,}/g,'</p><p>')
      .replace(/\n/g,'<br>');
  }

  function enhanceExistingMessages(){
    $$('.msg.bot').forEach(el=>{
      if(el.dataset.v18==='1')return;
      const raw=el.textContent.trim();
      if(!raw)return;
      el.dataset.v18='1';
      el.innerHTML=`<div class="plugy-meta"><b>PLUGY</b><span class="plugy-ai-badge">IA</span></div><div class="plugy-rich"><p>${renderRichText(raw)}</p></div>`;
      const actions=document.createElement('div');
      actions.className='plugy-message-actions';
      actions.innerHTML='<button data-act="copy">Copier</button><button data-act="studio">Envoyer au Studio</button><button data-act="carousel">Transformer en carrousel</button><button data-act="caption">Créer une légende</button>';
      el.appendChild(actions);
    });
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('.plugy-message-actions button');
    if(!b)return;
    const msg=b.closest('.msg.bot');
    const text=msg?.querySelector('.plugy-rich')?.innerText||msg?.innerText||'';
    const act=b.dataset.act;
    if(act==='copy')navigator.clipboard?.writeText(text);
    if(act==='studio')openStudio(text);
    if(act==='carousel')window.ask?.(`Transforme ce contenu en carrousel Instagram PLUG ART clair et prêt à publier :\n\n${text}`);
    if(act==='caption')window.ask?.(`Crée une légende Instagram PLUG ART à partir de ce contenu, avec accroche, infos essentielles et CTA :\n\n${text}`);
  });

  function setFieldByLabel(words,value){
    const labels=$$('.field label');
    for(const label of labels){
      const t=label.textContent.toLowerCase();
      if(words.some(w=>t.includes(w))){
        const wrap=label.closest('.field');
        const input=wrap?.querySelector('input,textarea,select');
        if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;}
      }
    }
    return false;
  }

  function activateView(name){
    const btn=$$('[data-view],.nav button').find(x=>(x.dataset.view||x.textContent).toLowerCase().includes(name));
    btn?.click();
  }

  function openStudio(seed=''){
    activateView('studio');
    setTimeout(()=>{
      if(seed){setFieldByLabel(['description','texte','contenu'],seed);}
      document.querySelector('.plug-studio-boost')?.scrollIntoView({behavior:'smooth',block:'start'});
    },180);
  }

  function addStudioBoost(){
    const shell=$('.studio-shell');
    if(!shell||$('.plug-studio-boost'))return;
    const box=document.createElement('section');
    box.className='plug-studio-boost';
    box.innerHTML=`
      <div class="plug-studio-boost-head">
        <div><h2>Studio de création PLUG ART</h2><p>Un workflow simple : choisis, remplis, stylise, génère.</p></div>
        <button class="plug-studio-chip active" data-engine="balanced">IA · Équilibré</button>
      </div>
      <div class="plug-studio-steps">
        <div class="plug-step"><b>1 · Format</b><span>Open Call, expo, story, affiche…</span></div>
        <div class="plug-step"><b>2 · Contenu</b><span>Titre, date, lieu, CTA</span></div>
        <div class="plug-step"><b>3 · Style</b><span>DA PLUG ART ou éditoriale</span></div>
        <div class="plug-step"><b>4 · Générer</b><span>Slides, légende, variantes</span></div>
      </div>
      <div class="plug-studio-row" aria-label="Modèles de publication">
        ${['Open Call Radar','Dernier jour','Top opportunités','Exposition','Artiste émergent','Projet / lieu','Story','Affiche','Carrousel éducatif','Institutionnel'].map(x=>`<button class="plug-studio-chip" data-template="${x}">${x}</button>`).join('')}
      </div>
      <div class="plug-studio-row" aria-label="Styles visuels">
        ${[
          ['PLUG ART bleu clean','plug'],['Minimal épuré',''],['Éditorial magazine',''],['Galerie contemporaine',''],['Noir & blanc premium',''],['Urbain artistique','art'],['Peinture / matière','art'],['Urgence impactante','urgent'],['Instagram moderne','']
        ].map(([x,t])=>`<button class="plug-studio-chip" data-style="${x}" data-tone="${t}">${x}</button>`).join('')}
      </div>
      <div class="plug-studio-row" aria-label="Moteurs IA">
        ${['Rapide','Équilibré','Créatif','Stratégique','Premium'].map(x=>`<button class="plug-studio-chip" data-engine="${x}">${x}</button>`).join('')}
      </div>
      <div class="plug-studio-quick">
        <button data-quick="generate">Générer avec PLUGY</button>
        <button class="secondary" data-quick="urgent">Version plus urgente</button>
        <button class="secondary" data-quick="premium">Version plus premium</button>
        <button class="secondary" data-quick="caption">Créer la légende</button>
      </div>`;
    shell.parentNode.insertBefore(box,shell);

    box.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.template){
        $$('.plug-studio-chip[data-template]',box).forEach(x=>x.classList.toggle('active',x===b));
        setFieldByLabel(['type','format'],b.dataset.template);
        setFieldByLabel(['titre'],b.dataset.template);
      }
      if(b.dataset.style){
        $$('.plug-studio-chip[data-style]',box).forEach(x=>x.classList.toggle('active',x===b));
        setFieldByLabel(['style'],b.dataset.style);
      }
      if(b.dataset.engine){
        $$('.plug-studio-chip[data-engine]',box).forEach(x=>x.classList.toggle('active',x===b));
        localStorage.setItem('plugy-engine-ui',b.dataset.engine);
      }
      if(b.dataset.quick){
        const studioText=$$('.studio-panel input,.studio-panel textarea,.studio-panel select').map(x=>`${x.closest('.field')?.querySelector('label')?.textContent||'Champ'}: ${x.value}`).filter(x=>!x.endsWith(': ')).join('\n');
        const map={
          generate:`Prépare la meilleure publication PLUG ART possible à partir de ces informations. Structure les slides, propose une accroche et un CTA :\n${studioText}`,
          urgent:`Rends cette publication plus urgente et plus impactante sans la surcharger :\n${studioText}`,
          premium:`Rends cette publication plus premium, éditoriale et culturelle :\n${studioText}`,
          caption:`Crée la légende Instagram PLUG ART correspondante avec CTA :\n${studioText}`
        };
        window.ask?.(map[b.dataset.quick]);
      }
    });
  }

  function addCompanion(){
    if($('#plugyCompanion'))return;
    const mini=localStorage.getItem('plugy-mini')==='1';
    const companion=document.createElement('div');
    companion.id='plugyCompanion';
    companion.className=mini?'is-mini':'';
    companion.innerHTML=`
      <button class="plugy-companion-hit" aria-label="Ouvrir PLUGY"></button>
      <div class="plugy-cloud3d">
        <div class="plugy-orbit18"></div><div class="plugy-lobe18 plugy-l1"></div><div class="plugy-lobe18 plugy-l2"></div><div class="plugy-lobe18 plugy-l3"></div><div class="plugy-lobe18 plugy-l4"></div><div class="plugy-core18"></div><i class="plugy-eye18 left"></i><i class="plugy-eye18 right"></i>
      </div>
      <button class="plugy-mini-toggle" aria-label="Réduire PLUGY">${mini?'+':'−'}</button>
      <div class="plugy-tooltip18">PLUGY · ton agent créatif</div>`;
    document.body.appendChild(companion);

    const dock=document.createElement('aside');
    dock.id='plugyQuickDock';
    dock.innerHTML=`<div class="plugy-dock-title"><b>PLUGY</b><span>● En ligne</span></div><div class="plugy-dock-grid">
      <button data-plug-act="chat">Parler à PLUGY</button><button data-plug-act="studio">Ouvrir le Studio</button><button data-plug-act="radar">Meilleures opportunités</button><button data-plug-act="carousel">Créer un carrousel</button><button data-plug-act="caption">Créer une légende</button><button data-plug-act="idea">Trouver 3 idées de post</button>
    </div>`;
    document.body.appendChild(dock);

    $('.plugy-companion-hit',companion).onclick=()=>dock.classList.toggle('open');
    $('.plugy-mini-toggle',companion).onclick=e=>{e.stopPropagation();companion.classList.toggle('is-mini');const m=companion.classList.contains('is-mini');localStorage.setItem('plugy-mini',m?'1':'0');e.currentTarget.textContent=m?'+':'−';dock.classList.remove('open');};

    dock.onclick=e=>{
      const b=e.target.closest('button[data-plug-act]');if(!b)return;
      dock.classList.remove('open');
      const a=b.dataset.plugAct;
      if(a==='studio')return openStudio();
      if(a==='chat'){activateView('accueil');$('#floatChat')?.classList.add('open');$('#desktopInput')?.focus();return;}
      const q={radar:'Analyse les meilleures opportunités actuelles du Radar PLUG ART et donne-moi les 3 priorités.',carousel:'Aide-moi à créer un carrousel Instagram PLUG ART efficace.',caption:'Aide-moi à créer une légende Instagram PLUG ART.',idea:'Propose-moi 3 idées de publication pertinentes pour PLUG ART aujourd’hui.'}[a];
      window.ask?.(q);
    };

    let tx=0,ty=0,cx=0,cy=0,raf=0;
    document.addEventListener('pointermove',e=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=companion.getBoundingClientRect();const mx=r.left+r.width/2,my=r.top+r.height/2;tx=Math.max(-5,Math.min(5,(e.clientX-mx)/80));ty=Math.max(-5,Math.min(5,(e.clientY-my)/80));if(!raf)raf=requestAnimationFrame(tick);});
    function tick(){cx+=(tx-cx)*.08;cy+=(ty-cy)*.08;$('.plugy-cloud3d',companion).style.transform=`rotateY(${cx}deg) rotateX(${-cy}deg)`;raf=requestAnimationFrame(()=>{raf=0;if(Math.abs(tx-cx)>.08||Math.abs(ty-cy)>.08)tick();});}
  }

  function hookThinkingState(){
    const orig=window.ask;
    if(typeof orig!=='function'||orig.__v18)return;
    const wrapped=async(...args)=>{
      $('#plugyCompanion')?.classList.add('thinking');
      try{return await orig(...args);}finally{setTimeout(()=>$('#plugyCompanion')?.classList.remove('thinking'),600);}
    };
    wrapped.__v18=true;window.ask=wrapped;
  }

  const observer=new MutationObserver(()=>{enhanceExistingMessages();addStudioBoost();hookThinkingState();});
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function boot(){addCompanion();addStudioBoost();enhanceExistingMessages();hookThinkingState();console.info('[PLUG ART] PLUGY Experience v18 loaded');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
