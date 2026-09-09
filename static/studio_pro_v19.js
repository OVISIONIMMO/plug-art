(()=>{
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const templates=['Opportunité Europe','Paris / 93','Sélection hebdo PLUGY','Focus artiste','Lieu partenaire','PLUG ART HUB','Carrousel 3 slides','Carrousel 5 slides','Carrousel 6 slides','Citation artiste','Rappel candidature','Compte à rebours'];
 const styles=['Culture premium','Brutaliste soft','Europe / opportunités','Photo éditoriale','Typographie forte','White gallery','Pop 93','Institutionnel contemporain'];
 const shortcuts=[
  ['cover','Créer la couverture','Crée uniquement une couverture Instagram PLUG ART très forte, lisible et épurée à partir des informations du Studio. Donne le titre principal, sous-titre et hiérarchie visuelle.'],
  ['slides','Structurer les slides','Structure le contenu du Studio slide par slide, prêt pour un carrousel Instagram PLUG ART.'],
  ['variants','3 variantes','Crée 3 variantes distinctes du contenu du Studio : sobre, impactante et éditoriale.'],
  ['cta','Optimiser le CTA','Propose 5 CTA courts et efficaces adaptés au contenu du Studio.'],
  ['verify','Vérifier les infos','Vérifie la cohérence interne des informations du Studio et signale clairement ce qui doit être confirmé avant publication.']
 ];
 function studioData(){return $$('.studio-panel input,.studio-panel textarea,.studio-panel select').map(x=>`${x.closest('.field')?.querySelector('label')?.textContent||'Champ'}: ${x.value}`).filter(x=>!x.endsWith(': ')).join('\n');}
 function boot(){
  const root=$('.plug-studio-boost'); if(!root||root.dataset.pro19)return false; root.dataset.pro19='1';
  const advanced=document.createElement('div'); advanced.className='plug-studio-pro19';
  advanced.innerHTML=`<div class="plug-pro-title"><div><b>Modèles PLUG ART avancés</b><span>Des raccourcis pensés pour les publications réelles du média</span></div></div><div class="plug-studio-row plug-pro-templates">${templates.map(x=>`<button class="plug-studio-chip" data-pro-template="${x}">${x}</button>`).join('')}</div><div class="plug-pro-title"><div><b>Directions artistiques</b><span>Change la tonalité sans reconstruire tout le post</span></div></div><div class="plug-studio-row plug-pro-styles">${styles.map(x=>`<button class="plug-studio-chip" data-pro-style="${x}">${x}</button>`).join('')}</div><div class="plug-pro-actions">${shortcuts.map(([id,label])=>`<button data-pro-action="${id}">${label}</button>`).join('')}</div>`;
  root.appendChild(advanced);
  advanced.addEventListener('click',e=>{
   const b=e.target.closest('button'); if(!b)return;
   if(b.dataset.proTemplate){$$('[data-pro-template]',advanced).forEach(x=>x.classList.toggle('active',x===b)); window.ask?.(`Prépare une publication PLUG ART au format « ${b.dataset.proTemplate} ». Utilise les informations déjà présentes dans le Studio et propose une structure directement exploitable.\n\n${studioData()}`);}
   if(b.dataset.proStyle){$$('[data-pro-style]',advanced).forEach(x=>x.classList.toggle('active',x===b)); window.ask?.(`Reformule et structure le contenu du Studio dans une direction « ${b.dataset.proStyle} », en restant cohérent avec PLUG ART.\n\n${studioData()}`);}
   if(b.dataset.proAction){const item=shortcuts.find(x=>x[0]===b.dataset.proAction); window.ask?.(`${item?.[2]||'Optimise ce contenu.'}\n\n${studioData()}`);}
  });
  return true;
 }
 let tries=0; const t=setInterval(()=>{if(boot()||++tries>40)clearInterval(t)},250); boot();
})();
