(()=>{
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 function el(tag,cls,html=''){const n=document.createElement(tag);if(cls)n.className=cls;if(html)n.innerHTML=html;return n}
 function move(n,to){if(n&&to&&!to.contains(n))to.appendChild(n)}
 function openStep(root,id){
  $$('.plug-v21-progress button',root).forEach(b=>b.classList.toggle('on',b.dataset.v21Step===id));
  $$('.plug-v21-pane',root).forEach(p=>p.classList.toggle('on',p.dataset.v21Pane===id));
  root.dataset.step=id;
  if(innerWidth<1050)root.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function regroupInfo(infoSection){
  const fields=$('.plug-v20-fields',infoSection); if(!fields||$('.plug-v21-essential',infoSection))return;
  const essential=el('div','plug-v21-essential');
  const detailsWrap=el('div','plug-v21-details-wrap');
  const details=el('div','plug-v21-details');detailsWrap.appendChild(details);
  ['#v20Title','#v20Context','#v20CTA'].forEach(sel=>move($(sel)?.closest('.plug-v20-field'),essential));
  ['#v20Place','#v20Deadline','#v20Source'].forEach(sel=>move($(sel)?.closest('.plug-v20-field'),details));
  const toggle=el('button','plug-v21-detail-toggle','<span>Lieu, date & source</span><span>＋</span>');toggle.type='button';
  toggle.onclick=()=>{detailsWrap.classList.toggle('open');toggle.lastElementChild.textContent=detailsWrap.classList.contains('open')?'−':'＋'};
  fields.append(essential,toggle,detailsWrap);
 }
 function collapseTools(generatePane){
  const tools=$('.plug-v20-tools',generatePane);if(!tools||$('.plug-v21-tools-toggle',generatePane))return;
  const t=el('button','plug-v21-tools-toggle','＋ Outils de retouche rapide');t.type='button';
  t.onclick=()=>{tools.classList.toggle('open');t.textContent=tools.classList.contains('open')?'− Masquer les outils':'＋ Outils de retouche rapide'};
  tools.parentNode.insertBefore(t,tools);
 }
 function reorganizeAdvanced(root){
  const studioShell=$('.studio-shell');if(!studioShell||$('.plug-v21-advanced'))return;
  const oldLabel=studioShell.previousElementSibling;
  if(oldLabel&&/RÉGLAGES AVANCÉS|APERÇU/i.test(oldLabel.textContent||''))oldLabel.remove();
  const wrap=el('section','plug-v21-advanced');
  const toggle=el('button','plug-v21-advanced-toggle','<span>Éditeur avancé <small>Calques · déplacement libre · Photo IA · export détaillé</small></span><span>＋</span>');toggle.type='button';
  const body=el('div','plug-v21-advanced-body');
  studioShell.parentNode.insertBefore(wrap,studioShell);body.appendChild(studioShell);wrap.append(toggle,body);
  toggle.onclick=()=>{wrap.classList.toggle('open');toggle.lastElementChild.textContent=wrap.classList.contains('open')?'−':'＋';if(wrap.classList.contains('open'))setTimeout(()=>window.dispatchEvent(new Event('resize')),120)};
 }
 function boot(){
  const root=$('.plug-v20');if(!root||root.classList.contains('plug-v21'))return !!root;
  const controls=$('.plug-v20-controls',root),result=$('.plug-v20-result',root);if(!controls||!result)return false;
  const sections=$(':scope > .plug-v20-section',controls); if(sections.length<6)return false;
  root.classList.add('plug-v21');
  const head=$('.plug-v20-head p',root);if(head)head.textContent='Un parcours en 3 étapes : choisis le sujet, règle le format, puis génère. L’éditeur complet reste disponible seulement si tu veux aller plus loin.';
  const progress=el('nav','plug-v21-progress',`
   <button class="on" data-v21-step="subject"><i>1</i><div><strong>Sujet</strong><span>Radar + informations</span></div></button>
   <button data-v21-step="direction"><i>2</i><div><strong>Format & style</strong><span>DA + niveau de travail</span></div></button>
   <button data-v21-step="generate"><i>3</i><div><strong>Générer</strong><span>Publication + retouches</span></div></button>`);
  const wizard=el('div','plug-v21-wizard');
  const subject=el('section','plug-v21-pane on','<div class="plug-v21-pane-head"><div><h3>Construire le sujet</h3><p>Pars du Radar ou saisis seulement les informations dont tu disposes.</p></div><em>Étape 1</em></div>');subject.dataset.v21Pane='subject';
  const direction=el('section','plug-v21-pane','<div class="plug-v21-pane-head"><div><h3>Choisir la forme</h3><p>Le format et la direction artistique se changent sans réécrire ton sujet.</p></div><em>Étape 2</em></div>');direction.dataset.v21Pane='direction';
  const generate=el('section','plug-v21-pane','<div class="plug-v21-pane-head"><div><h3>Créer avec PLUGY</h3><p>Génère tout le post, uniquement les slides ou simplement la légende.</p></div><em>Étape 3</em></div>');generate.dataset.v21Pane='generate';
  wizard.append(subject,direction,generate);controls.append(progress,wizard);

  // 1 · Sujet : Radar d'abord, type ensuite, puis les informations essentielles.
  move(sections[1],subject); move(sections[0],subject); move(sections[2],subject);regroupInfo(sections[2]);
  const hint=el('div','plug-v21-hint','<b>Conseil :</b> si tu pars d’un Open Call du Radar, les infos connues sont injectées automatiquement et PLUGY évite d’inventer les données manquantes.');subject.appendChild(hint);

  // 2 · Direction : format, DA et mode. Le bloc génération est séparé du mode.
  move(sections[3],direction);move(sections[4],direction);
  const modeSection=sections[5];
  const modeRow=$('.plug-v20-row',modeSection);const modeBlock=el('div','plug-v20-section v21-flat','<div class="plug-v20-label"><b>Mode de travail</b><span>Rapide à Premium</span></div>');move(modeRow,modeBlock);direction.appendChild(modeBlock);

  // 3 · Génération : uniquement les actions utiles, sans surcharge.
  move(modeSection,generate);modeSection.classList.add('v21-hidden-label');
  const primary=$('.plug-v20-primary',modeSection),tools=$('.plug-v20-tools',modeSection);
  const box=el('div','plug-v21-actionbox','<h4>Que veux-tu produire ?</h4><p>“Publication” crée la structure complète. Tu peux aussi demander seulement les slides ou la légende.</p>');
  if(primary)box.appendChild(primary);if(tools)box.appendChild(tools);modeSection.appendChild(box);collapseTools(generate);

  const nav1=el('div','plug-v21-nav','<span></span><button class="primary" type="button" data-v21-next="direction">Format & style →</button>');
  const nav2=el('div','plug-v21-nav','<button type="button" data-v21-next="subject">← Sujet</button><button class="primary" type="button" data-v21-next="generate">Générer →</button>');
  const nav3=el('div','plug-v21-nav','<button type="button" data-v21-next="direction">← Format</button><span></span>');subject.appendChild(nav1);direction.appendChild(nav2);generate.appendChild(nav3);

  const empty=$('.plug-v20-empty',result);if(empty&&!$('.plug-v21-result-placeholder',empty)){empty.insertAdjacentHTML('beforeend','<div class="plug-v21-result-placeholder"><span>Couverture</span><span>Slides</span><span>Légende</span><span>CTA</span></div>')}
  progress.onclick=e=>{const b=e.target.closest('[data-v21-step]');if(b)openStep(root,b.dataset.v21Step)};
  wizard.onclick=e=>{const b=e.target.closest('[data-v21-next]');if(b)openStep(root,b.dataset.v21Next)};
  reorganizeAdvanced(root);
  document.documentElement.dataset.plugStudio='21';
  return true;
 }
 let tries=0;const timer=setInterval(()=>{if(boot()||++tries>80)clearInterval(timer)},150);boot();
})();
