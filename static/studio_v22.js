(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const STORE='plugart_studio_v22';
  const state={type:'Open Call',format:'Carrousel 5 slides',style:'PLUG ART clean',mode:'Équilibré',source:'manual',waiting:false};
  const types=['Open Call','Exposition','Top opportunités','Artiste','PLUG ART HUB','Story','Institutionnel'];
  const formats=['Carrousel 5 slides','Carrousel 3 slides','Post 4:5','Story 9:16','Carré 1:1'];
  const styles=[['PLUG ART clean','Clair, bleu, très lisible'],['Éditorial premium','Culture / galerie'],['Pop 93','Plus vif, urbain'],['Urgence','Deadline / dernier jour']];
  const modes=['Rapide','Équilibré','Premium'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function readForm(){return {
    type:$('#v22Type')?.value||state.type, title:$('#v22Title')?.value.trim()||'', context:$('#v22Context')?.value.trim()||'',
    place:$('#v22Place')?.value.trim()||'', deadline:$('#v22Deadline')?.value.trim()||'', cta:$('#v22CTA')?.value.trim()||'', sourceUrl:$('#v22Source')?.value.trim()||'',
    format:state.format, style:state.style, mode:state.mode, source:state.source
  }}
  function save(){try{localStorage.setItem(STORE,JSON.stringify(readForm()))}catch{}}
  function restore(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
  function summary(){const f=readForm(), box=$('#v22Summary');if(!box)return;box.innerHTML=`<span>${esc(f.type)}</span><span>${esc(f.format)}</span><span>${esc(f.style)}</span><span>${esc(f.mode)}</span>`}
  function setChoice(kind,value){state[kind]=value;$$(`[data-v22-${kind}]`).forEach(b=>b.classList.toggle('on',b.dataset[`v22${kind[0].toUpperCase()+kind.slice(1)}`]===value));summary();save()}
  function setStatus(text,busy=false){const s=$('#v22Status');if(s){s.textContent=text;s.classList.toggle('busy',busy)}const b=$('#v22Generate');if(b)b.disabled=busy}
  function renderResult(text){const out=$('#v22Result');if(!out)return;const raw=String(text||'').trim();if(!raw)return;out.classList.remove('empty');out.textContent=raw;try{localStorage.setItem('plug-studio-last-result',raw)}catch{}setStatus('Prêt',false);state.waiting=false}
  function latestBotText(){const nodes=$$('.msg.bot:not(.plugy-pending)');const n=nodes[nodes.length-1];return (n?.querySelector('.plugy-rich')?.innerText||n?.innerText||'').trim()}
  function ask(mission){const f=readForm();if(!f.title&&!f.context){setStatus('Ajoute un titre ou un contexte',false);$('#v22Title')?.focus();return}
    const prompt=`Tu travailles pour PLUG ART. Produis un contenu directement exploitable, court, lisible et sans information inventée.\n\nSUJET\nType : ${f.type}\nTitre : ${f.title||'À définir'}\nContexte : ${f.context||'Non renseigné'}\nLieu : ${f.place||'À vérifier'}\nDate / deadline : ${f.deadline||'À vérifier'}\nCTA : ${f.cta||'À proposer'}\nSource officielle : ${f.sourceUrl||'Non fournie'}\n\nSORTIE\nFormat : ${f.format}\nDirection artistique : ${f.style}\nNiveau : ${f.mode}\n\nRÈGLES\n- N’invente jamais une date, un tarif, un lieu ou un lien.\n- Si une donnée manque, écris « À vérifier ».\n- Évite les longs paragraphes sur les slides.\n- Hiérarchise clairement titre, sous-titre, informations et CTA.\n- Ton : média culturel actuel, crédible, accessible aux artistes émergents.\n\nMISSION\n${mission}`;
    if(typeof window.ask!=='function'){setStatus('PLUGY indisponible',false);return}
    save();state.waiting=true;setStatus('PLUGY prépare le contenu…',true);window.ask(prompt);
  }
  async function loadRadar(){const sel=$('#v22Radar');if(!sel)return;try{const r=await fetch('/api/opportunities',{cache:'no-store'});const d=await r.json();const arr=Array.isArray(d)?d:(d.items||d.opportunities||[]);sel._items=arr;sel.innerHTML='<option value="">Choisir une opportunité…</option>'+arr.slice(0,50).map((o,i)=>`<option value="${i}">${esc(o.title||'Sans titre')}</option>`).join('')}catch{sel.innerHTML='<option value="">Radar indisponible</option>'}}
  function importRadar(){const sel=$('#v22Radar'),o=sel?._items?.[Number(sel.value)];if(!o)return;$('#v22Title').value=o.title||'';$('#v22Context').value=o.radar_reason||o.description||'';$('#v22Place').value=[o.city,o.country].filter(Boolean).join(', ');$('#v22Deadline').value=o.deadline||'';$('#v22Source').value=o.source_url||'';state.source='radar';$$('[data-v22-source]').forEach(b=>b.classList.toggle('on',b.dataset.v22Source==='radar'));summary();save();setStatus('Opportunité importée',false)}
  function clearStudio(){['#v22Title','#v22Context','#v22Place','#v22Deadline','#v22CTA','#v22Source'].forEach(s=>{const e=$(s);if(e)e.value=''});const out=$('#v22Result');if(out){out.classList.add('empty');out.innerHTML='<div><strong>Le résultat apparaîtra ici</strong><span>Une seule zone de travail : sujet → format → générer.</span></div>'}try{localStorage.removeItem(STORE)}catch{}setStatus('Nouveau brouillon',false);summary()}

  function build(){
    const old=$('.plug-v20');if(!old||$('.plug-v22'))return !!old;
    const advanced=$('.plug-v21-advanced');
    const content=old.parentNode;
    const root=document.createElement('section');root.className='plug-v22';root.innerHTML=`
      <header class="v22-head"><div><span class="v22-kicker">PLUG ART · STUDIO</span><h2>Créer une publication</h2><p>Tout est regroupé sur un seul écran. Renseigne le sujet, choisis le rendu, puis génère.</p></div><div class="v22-head-actions"><button id="v22Reset">Nouveau</button><span id="v22Status">Prêt</span></div></header>
      <div class="v22-layout">
        <main class="v22-form">
          <section class="v22-block v22-subject"><div class="v22-block-head"><b>1 · Sujet</b><span>Ce que tu veux publier</span></div>
            <div class="v22-source-tabs"><button class="on" data-v22-source="manual">Saisie manuelle</button><button data-v22-source="radar">Depuis le Radar</button></div>
            <div class="v22-radar-row" id="v22RadarRow"><select id="v22Radar"><option>Chargement…</option></select><button id="v22Import">Importer</button></div>
            <div class="v22-grid2"><label><span>Type</span><select id="v22Type">${types.map(x=>`<option>${x}</option>`).join('')}</select></label><label><span>Titre / sujet</span><input id="v22Title" placeholder="Ex. 6 opportunités d’exposer en Europe"></label></div>
            <label class="v22-full"><span>Contexte essentiel</span><textarea id="v22Context" placeholder="Conditions, angle, infos importantes…"></textarea></label>
            <details class="v22-more"><summary>Informations complémentaires <small>lieu · date · CTA · source</small></summary><div class="v22-grid2"><label><span>Lieu</span><input id="v22Place" placeholder="Paris, Europe…"></label><label><span>Date / deadline</span><input id="v22Deadline" placeholder="12 sept. 2026"></label><label class="v22-full"><span>CTA</span><input id="v22CTA" placeholder="Commente PLUG pour recevoir le lien"></label><label class="v22-full"><span>Source officielle</span><input id="v22Source" placeholder="Lien officiel"></label></div></details>
          </section>
          <section class="v22-block"><div class="v22-block-head"><b>2 · Rendu</b><span>Format et direction artistique</span></div>
            <div class="v22-label">Format</div><div class="v22-pills" id="v22Formats">${formats.map((x,i)=>`<button class="${i?'':'on'}" data-v22-format="${x}">${x}</button>`).join('')}</div>
            <div class="v22-label v22-space">Direction artistique</div><div class="v22-style-grid">${styles.map(([a,b],i)=>`<button class="${i?'':'on'}" data-v22-style="${a}"><strong>${a}</strong><small>${b}</small></button>`).join('')}</div>
            <div class="v22-label v22-space">Niveau de travail</div><div class="v22-pills">${modes.map((x,i)=>`<button class="${i===1?'on':''}" data-v22-mode="${x}">${x}</button>`).join('')}</div>
          </section>
          <section class="v22-generate"><div id="v22Summary" class="v22-summary"></div><div class="v22-main-actions"><button id="v22Generate" class="primary">Générer la publication</button><button data-v22-generate="slides">Slides seules</button><button data-v22-generate="caption">Légende seule</button></div></section>
        </main>
        <aside class="v22-output"><div class="v22-output-head"><div><b>Résultat</b><span>Prêt à copier ou à retravailler avec PLUGY</span></div><div><button id="v22Copy">Copier</button><button id="v22Chat">PLUGY</button></div></div><div id="v22Result" class="v22-result empty"><div><strong>Le résultat apparaîtra ici</strong><span>Une seule zone de travail : sujet → format → générer.</span></div></div><div class="v22-refine"><button data-v22-refine="short">Plus court</button><button data-v22-refine="premium">Plus premium</button><button data-v22-refine="verify">Vérifier les infos</button><button data-v22-refine="variants">3 variantes</button></div></aside>
      </div>
      <details class="v22-advanced"><summary><span><b>Éditeur avancé</b><small>Calques · déplacement libre · Photo IA · export PNG/PDF</small></span><i>＋</i></summary><div id="v22AdvancedHost"></div></details>`;
    content.insertBefore(root,old);document.body.classList.add('plug-studio-v22-active');
    if(advanced){$('#v22AdvancedHost',root).appendChild(advanced);advanced.classList.add('v22-embedded')}
    old.classList.add('v22-legacy-hidden');

    const saved=restore();
    if(saved.type)$('#v22Type').value=saved.type;if(saved.title)$('#v22Title').value=saved.title;if(saved.context)$('#v22Context').value=saved.context;if(saved.place)$('#v22Place').value=saved.place;if(saved.deadline)$('#v22Deadline').value=saved.deadline;if(saved.cta)$('#v22CTA').value=saved.cta;if(saved.sourceUrl)$('#v22Source').value=saved.sourceUrl;
    if(saved.format)setChoice('format',saved.format);if(saved.style)setChoice('style',saved.style);if(saved.mode)setChoice('mode',saved.mode);
    root.addEventListener('input',()=>{summary();save()});root.addEventListener('change',()=>{summary();save()});
    root.onclick=e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.v22Source){state.source=b.dataset.v22Source;$$('[data-v22-source]').forEach(x=>x.classList.toggle('on',x===b));$('#v22RadarRow').classList.toggle('show',state.source==='radar');save()}
      if(b.dataset.v22Format)setChoice('format',b.dataset.v22Format);
      if(b.dataset.v22Style)setChoice('style',b.dataset.v22Style);
      if(b.dataset.v22Mode)setChoice('mode',b.dataset.v22Mode);
      if(b.id==='v22Import')importRadar();
      if(b.id==='v22Reset')clearStudio();
      if(b.id==='v22Generate')ask('Crée la publication complète : 1) couverture, 2) texte slide par slide, 3) légende Instagram, 4) CTA. Donne le texte exact, sans explication inutile.');
      if(b.dataset.v22Generate==='slides')ask('Donne uniquement le texte exact slide par slide, avec titres courts et hiérarchie claire.');
      if(b.dataset.v22Generate==='caption')ask('Donne uniquement la légende Instagram finale, structurée, naturelle et prête à publier.');
      const refine={short:'Réécris le contenu en beaucoup plus court sans perdre les informations essentielles.',premium:'Retravaille le contenu dans une tonalité culturelle plus premium et éditoriale.',verify:'Vérifie la cohérence de toutes les informations. Sépare clairement « confirmé » et « à vérifier ». N’invente rien.',variants:'Propose 3 variantes complètes : sobre, impactante et éditoriale.'};if(b.dataset.v22Refine)ask(refine[b.dataset.v22Refine]);
      if(b.id==='v22Copy'){const t=$('#v22Result')?.innerText||'';navigator.clipboard?.writeText(t);setStatus('Copié',false)}
      if(b.id==='v22Chat'){$('#floatChat')?.classList.add('open');$('#desktopInput')?.focus()}
    };
    const previous=localStorage.getItem('plug-studio-last-result');if(previous)renderResult(previous);summary();loadRadar();
    const observer=new MutationObserver(()=>{if(!state.waiting)return;setTimeout(()=>{const t=latestBotText();if(t&&!/réfléchit|n’a pas pu/i.test(t))renderResult(t)},80)});['#desktopMsgs','#floatMsgs'].forEach(sel=>{const n=$(sel);if(n)observer.observe(n,{childList:true,subtree:true,characterData:true})});
    document.documentElement.dataset.plugStudio='22';return true;
  }
  let tries=0;const timer=setInterval(()=>{if(build()||++tries>100)clearInterval(timer)},120);build();
})();
