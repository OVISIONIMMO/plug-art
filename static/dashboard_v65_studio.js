
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,esc,api,store,state,view,cut,oppImg,playPlugy,openChat}=P;
state.slides=[];state.slide=0;state.preset='open';state.zoom=1;
let drafts=store.get('plugart_v65_drafts',store.get('plugart_v63_drafts',[]));

const currentOpp=()=>state.opps.find(o=>String(o.id)===String(q('#studioSource')?.value||''));
const slide=()=>state.slides[state.slide];
const mk=(k,t,b,c,img='')=>({kicker:k,title:t,body:b,cta:c,image:img,image2:'',theme:'editorial',layout:'top',cut:'none',font:'sans',align:'left',titleScale:100,position:'center',accent:'violet',prompt:''});

function fillSources(){
  const sel=q('#studioSource');if(!sel)return;const cur=sel.value;
  sel.innerHTML='<option value="">Brief libre</option>'+state.opps.map(o=>'<option value="'+esc(o.id)+'">'+esc(cut(o.title,64))+'</option>').join('');
  if(cur)sel.value=cur;
}
function syncBrief(){const o=currentOpp(),b=q('#studioBrief');if(o&&b&&!b.value.trim())b.value=o.summary||o.radar_reason||''}
function buildSlides(){
  const o=currentOpp(),brief=String(q('#studioBrief')?.value||'').replace(/\s+/g,' ').trim(),count=Number(q('#studioCount')?.value||5),goal=q('#studioObjective')?.value||'inform';
  const title=o?.title||brief||'Nouvelle opportunité',summary=cut(o?.summary||brief||'Informations à structurer.',220),loc=[o?.city,o?.country].filter(Boolean).join(' · ')||'À confirmer',deadline=o?.deadline?'Deadline · '+o.deadline:'Date à vérifier',fee=o?.fee||'Conditions à vérifier',img=o?oppImg(o):'';
  let s=[];
  if(state.preset==='urgent')s=[mk('DERNIER RAPPEL',deadline,'Une opportunité à traiter maintenant.','Voir les infos →',img),mk('À RETENIR',title,summary,'Continuer →',img),mk('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),mk('ACTION','Prépare ton dossier.','Vérifie la source officielle avant d’envoyer.','Candidater →',img)];
  else if(state.preset==='artist')s=[mk('FOCUS ARTISTE',title,'Un profil à mettre en avant.','Découvrir →',img),mk('UNIVERS',o?.type||'Création contemporaine',summary,'Explorer →',img),mk('PARCOURS','Repères utiles',cut(o?.radar_reason||summary,170),'Lire →',img),mk('À SUIVRE','Prochaines étapes','Expositions, projets et connexions à garder dans le radar.','Suivre →',img)];
  else if(state.preset==='event')s=[mk('À L’AGENDA',title,loc,'Découvrir →',img),mk('POURQUOI Y ALLER','À retenir',summary,'Voir plus →',img),mk('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),mk('ACTION','Prépare ta visite.','Repère les artistes et contacts utiles.','Organiser →',img)];
  else s=[mk(goal==='apply'?'OPPORTUNITÉ À SAISIR':'OPEN CALL',title,loc,'Découvrir →',img),mk('POURQUOI C’EST INTÉRESSANT','À regarder de près',cut(o?.radar_reason||summary,190),'Voir plus →',img),mk('LE PROJET',o?.type||'Exposition / appel à projets',summary,'Comprendre →',img),mk('INFOS PRATIQUES',loc,deadline+' · '+fee,'Enregistrer',img),mk('ACTION','À toi de jouer.','Consulte la source officielle et vérifie les critères.','PLUG →',img)];
  while(s.length<count)s.splice(s.length-1,0,mk('À SAVOIR','Point clé '+s.length,summary,'Continuer →',img));
  state.slides=s.slice(0,count);state.slide=0;smartLayout(false);renderStudio();caption();
}
function smartLayout(render=true){
  const layouts=['cover','left','top','collage','right','minimal','band'],cuts=['none','diagonal','curve','wave'],themes=['editorial','glass','impact','paper','color','night'];
  state.slides.forEach((s,i)=>{s.layout=layouts[i%layouts.length];s.cut=cuts[i%cuts.length];s.theme=themes[i%themes.length];s.align=i%3===1?'center':'left'});
  if(render)renderStudio();
}
function renderStudio(){
  if(!state.slides.length)return;
  state.slide=Math.max(0,Math.min(state.slide,state.slides.length-1));const s=slide(),art=q('#carouselArt');
  if(q('#studioCounter'))q('#studioCounter').textContent='Slide '+(state.slide+1)+' / '+state.slides.length;
  q('#artKicker').textContent=s.kicker||'';q('#artTitle').textContent=s.title||'';q('#artBody').textContent=s.body||'';q('#artCta').textContent=s.cta||'';
  q('#artPhoto').style.backgroundImage=s.image?'url("'+s.image+'")':'linear-gradient(135deg,#72c9c4,#7b70d6,#d07da9)';q('#artPhoto').style.backgroundPosition=s.position||'center';q('#artPhotoSecondary').style.backgroundImage=s.image2?'url("'+s.image2+'")':(s.image?'url("'+s.image+'")':'linear-gradient(135deg,#d07da9,#7b70d6)');
  art.className='carousel-art theme-'+(s.theme||'editorial')+' layout-'+(s.layout||'top')+' cut-'+(s.cut||'none')+' align-'+(s.align||'left')+' font-'+(s.font||'sans')+' accent-'+(s.accent||'violet');
  art.style.setProperty('--title-scale',Number(s.titleScale||100)/100);art.style.setProperty('--preview-zoom',state.zoom||1);const format=q('#studioFormat')?.value||'portrait';art.style.aspectRatio=format==='square'?'1 / 1':format==='story'?'9 / 16':'4 / 5';
  const vals={editKicker:s.kicker,editTitle:s.title,editBody:s.body,editCta:s.cta,editImage:(s.image||'').startsWith('/api/')?'':s.image||'',editImage2:s.image2||'',layoutSelect:s.layout||'top',cutSelect:s.cut||'none',fontSelect:s.font||'sans',imagePosition:s.position||'center',imagePrompt:s.prompt||'',titleSize:s.titleScale||100};
  Object.entries(vals).forEach(([id,v])=>{const e=q('#'+id);if(e)e.value=v});q('#titleSizeValue').textContent=(s.titleScale||100)+'%';
  qa('[data-align]').forEach(b=>b.classList.toggle('active',b.dataset.align===(s.align||'left')));qa('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===(s.theme||'editorial')));qa('[data-accent]').forEach(b=>b.classList.toggle('active',b.dataset.accent===(s.accent||'violet')));
  q('#slideDots').innerHTML=state.slides.map((_,i)=>'<button class="slide-dot '+(i===state.slide?'active':'')+'" data-slide="'+i+'"></button>').join('');
  q('#studioStrip').innerHTML=state.slides.map((x,i)=>'<button class="strip-slide '+(i===state.slide?'active':'')+'" data-slide="'+i+'"><b>'+String(i+1).padStart(2,'0')+'</b><br>'+esc(cut(x.title,40))+'</button>').join('');
  qa('[data-slide]').forEach(b=>b.onclick=()=>{state.slide=Number(b.dataset.slide);renderStudio()});
}
function caption(){const o=currentOpp(),title=o?.title||state.slides[0]?.title||'Nouvelle opportunité',city=[o?.city,o?.country].filter(Boolean).join(', ');q('#captionText').value='🎨 '+title+'\n\n'+cut(o?.summary||q('#studioBrief').value||state.slides[0]?.body,300)+'\n\n'+(city?'📍 '+city+'\n':'')+(o?.deadline?'⏳ '+o.deadline+'\n':'')+'\n#PlugArt #OpenCall #ArtEmergent #Exposition'}

function bind(){
  q('#studioSource').onchange=()=>{syncBrief();buildSlides()};q('#studioCount').oninput=()=>q('#studioCountValue').textContent=q('#studioCount').value;q('#studioFormat').onchange=renderStudio;
  qa('[data-preset]').forEach(b=>b.onclick=()=>{state.preset=b.dataset.preset;qa('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));buildSlides()});
  q('#generateStudio').onclick=buildSlides;q('#prevStudio').onclick=()=>{state.slide=(state.slide-1+state.slides.length)%state.slides.length;renderStudio()};q('#nextStudio').onclick=()=>{state.slide=(state.slide+1)%state.slides.length;renderStudio()};
  [['editKicker','kicker'],['editTitle','title'],['editBody','body'],['editCta','cta'],['editImage','image'],['editImage2','image2'],['layoutSelect','layout'],['cutSelect','cut'],['fontSelect','font'],['imagePosition','position'],['imagePrompt','prompt']].forEach(([id,key])=>{q('#'+id).oninput=()=>{slide()[key]=q('#'+id).value;renderStudio()}});
  q('#titleSize').oninput=()=>{slide().titleScale=Number(q('#titleSize').value);renderStudio()};qa('[data-align]').forEach(b=>b.onclick=()=>{slide().align=b.dataset.align;renderStudio()});qa('[data-theme]').forEach(b=>b.onclick=()=>{slide().theme=b.dataset.theme;renderStudio()});qa('[data-accent]').forEach(b=>b.onclick=()=>{slide().accent=b.dataset.accent;renderStudio()});
  qa('[data-editor-tab]').forEach(b=>b.onclick=()=>{qa('[data-editor-tab]').forEach(x=>x.classList.toggle('active',x===b));qa('[data-pane]').forEach(x=>x.classList.toggle('active',x.dataset.pane===b.dataset.editorTab))});
  q('#duplicateStudio').onclick=()=>{state.slides.splice(state.slide+1,0,{...slide()});state.slide++;renderStudio()};q('#deleteStudio').onclick=()=>{if(state.slides.length<=3)return;state.slides.splice(state.slide,1);state.slide=Math.min(state.slide,state.slides.length-1);renderStudio()};
  q('#imageUpload').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{slide().image=r.result;renderStudio()};r.readAsDataURL(f)};
  q('#zoomIn').onclick=()=>{state.zoom=Math.min(1.25,state.zoom+.05);q('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';renderStudio()};q('#zoomOut').onclick=()=>{state.zoom=Math.max(.75,state.zoom-.05);q('#zoomLabel').textContent=Math.round(state.zoom*100)+'%';renderStudio()};
  q('#smartLayout').onclick=()=>smartLayout(true);q('#applyLayoutAll').onclick=()=>{const s=slide();state.slides.forEach(x=>Object.assign(x,{layout:s.layout,cut:s.cut,font:s.font,align:s.align,titleScale:s.titleScale,position:s.position}));renderStudio()};q('#applyStyleAll').onclick=()=>{const s=slide();state.slides.forEach(x=>Object.assign(x,{theme:s.theme,accent:s.accent}));renderStudio()};
  q('#generateCaption').onclick=caption;q('#improveStudio').onclick=improve;q('#queueInstagramBtn').onclick=queueInstagram;q('#plugyCarouselBtn').onclick=plugyCarousel;q('#generateSlideImage').onclick=async()=>{try{await genImage(state.slide,q('#generateSlideImage'))}catch(e){alert('Génération image : '+e.message)}};q('#generateAllImagesBtn').onclick=generateAllImages;q('#saveDraftBtn').onclick=saveDraft;q('#exportSlideBtn').onclick=exportSlide;
  q('#homeAiStudio')?.addEventListener('click',()=>{view('studio');setTimeout(()=>q('#plugyCarouselBtn').click(),120)});
}
async function checkImages(){const box=q('#imageStatus');try{const r=await api('/api/v32/content/image/status');box.classList.toggle('ready',!!r.enabled);box.classList.toggle('error',!r.enabled);box.querySelector('b').textContent=r.enabled?(r.model||'disponible'):'clé API absente'}catch{box.classList.add('error');box.querySelector('b').textContent='indisponible'}}
function imagePrompt(s){const o=currentOpp(),loc=[o?.city,o?.country].filter(Boolean).join(', ');return String(s.prompt||('Visuel éditorial contemporain pour PLUG ART. Sujet: '+s.title+'. Contexte: '+s.body+'. '+(loc?'Lieu: '+loc+'. ':'')+'Sans texte, sans logo, composition premium et artistique.')).replace(/\s+/g,' ').trim()}
async function genImage(i,button){const s=state.slides[i],old=button?.textContent;if(button){button.disabled=true;button.textContent='Génération…'}try{const r=await api('/api/v32/content/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:imagePrompt(s),style:q('#imageStyle').value||'photo',ratio:'4:5',quality:q('#imageQuality').value||'medium'})});if(r.url){s.image=r.url;if(i===state.slide)renderStudio()}}finally{if(button){button.disabled=false;button.textContent=old}}}
async function generateAllImages(){const b=q('#generateAllImagesBtn'),old=b.textContent;b.disabled=true;try{for(let i=0;i<state.slides.length;i++){b.textContent='Image '+(i+1)+'/'+state.slides.length;await genImage(i)}renderStudio()}catch(e){alert('Génération interrompue : '+e.message)}finally{b.disabled=false;b.textContent=old}}
function parseJSON(txt){txt=String(txt||'').replace(/\x60\x60\x60json|\x60\x60\x60/gi,'').trim();const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a<0||b<a)throw new Error('Réponse non structurée');return JSON.parse(txt.slice(a,b+1))}
async function plugyCarousel(){const b=q('#plugyCarouselBtn'),old=b.textContent;b.disabled=true;b.textContent='PLUGY travaille…';const o=currentOpp(),count=Number(q('#studioCount').value||5),facts={title:o?.title||'',summary:o?.summary||q('#studioBrief').value||'',city:o?.city||'',country:o?.country||'',deadline:o?.deadline||'',fee:o?.fee||'',type:o?.type||'',eligibility:o?.eligibility||'',radar_reason:o?.radar_reason||''};const prompt='Crée un carrousel PLUG ART de '+count+' slides. N’invente rien. Utilise uniquement ces faits: '+JSON.stringify(facts)+'. Objectif: '+q('#studioObjective').value+'. Format: '+(q('#studioFormat')?.value||'portrait')+'. Direction artistique: '+(q('#studioBrand')?.value||'plug-clean')+'. Les visuels doivent rester sobres, éditoriaux, lisibles et utiliser des photos officielles quand elles existent. Réponds uniquement en JSON valide: {"slides":[{"kicker":"","title":"","body":"","cta":"","image_prompt":"","layout":"cover|left|top|collage|right|minimal|band","theme":"editorial|glass|impact|paper|color|night"}]}. Chaque slide doit être concise et visuelle.';try{const r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,page:'content',mode:'deep'})});const p=parseJSON(r.answer);if(!Array.isArray(p.slides)||!p.slides.length)throw new Error('Aucune slide');const base=o?oppImg(o):'';state.slides=p.slides.slice(0,count).map(x=>{const s=mk(x.kicker||'PLUG ART',x.title||'',x.body||'',x.cta||'Découvrir →',base);s.prompt=x.image_prompt||'';s.layout=['cover','left','top','collage','right','minimal','band'].includes(x.layout)?x.layout:'top';s.theme=['editorial','glass','impact','paper','color','night'].includes(x.theme)?x.theme:'editorial';return s});while(state.slides.length<count)state.slides.push(mk('À SAVOIR','Point clé '+(state.slides.length+1),'À compléter.','Continuer →',base));state.slide=0;renderStudio();caption();playPlugy('Happy',true)}catch(e){buildSlides();alert('PLUGY a utilisé la structure locale de secours : '+e.message)}finally{b.disabled=false;b.textContent=old}}
async function improve(){openChat();const box=q('#chatStream');if(box){const d=document.createElement('div');d.className='bot-msg';d.textContent='Je relis le carrousel…';box.appendChild(d)}const text=state.slides.map((s,i)=>(i+1)+'. '+s.title+' — '+s.body).join('\n');try{const r=await api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Relis ce carrousel PLUG ART sans inventer d’informations. Donne uniquement les corrections prioritaires slide par slide: '+text,page:'content',mode:'fast'})});const d=document.createElement('div');d.className='bot-msg';d.textContent=r.answer||'Analyse terminée.';box?.appendChild(d)}catch(e){alert(e.message)}}
function saveDraft(){drafts.unshift({id:Date.now(),name:currentOpp()?.title||state.slides[0]?.title||'Carrousel',slides:JSON.parse(JSON.stringify(state.slides)),caption:q('#captionText').value,format:q('#studioFormat')?.value||'portrait',brand:q('#studioBrand')?.value||'plug-clean',date:new Date().toLocaleString('fr-FR')});drafts=drafts.slice(0,15);store.set('plugart_v65_drafts',drafts);P.renderDashboard();const b=q('#saveDraftBtn'),old=b.textContent;b.textContent='Sauvegardé ✓';setTimeout(()=>b.textContent=old,900)}
function queueInstagram(){
  saveDraft();
  const qkey='plugart_v66_social_queue',queue=store.get(qkey,[]),o=currentOpp(),title=o?.title||state.slides[0]?.title||'Publication PLUG ART';
  queue.unshift({id:Date.now(),title,caption:q('#captionText')?.value||'',status:'À préparer',scheduled:'',format:q('#studioFormat')?.value||'portrait'});
  store.set(qkey,queue.slice(0,40));P.renderSocial?.();view('social');
}
async function exportSlide(){
  const s=slide(),format=q('#studioFormat')?.value||'portrait',W=1080,H=format==='square'?1080:format==='story'?1920:1350,c=document.createElement('canvas');
  c.width=W;c.height=H;
  const x=c.getContext('2d'),dark=['impact','night'].includes(s.theme),bg={editorial:['#f2efe8','#e5e1da'],glass:['#eef5f1','#eadfea'],impact:['#22282a','#3a3f42'],paper:['#f4eee3','#e9dfcf'],night:['#161b22','#25302e'],color:['#d6dcff','#edcee3']}[s.theme]||['#f2efe8','#e5e1da'];
  let g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,bg[0]);g.addColorStop(1,bg[1]);x.fillStyle=g;x.fillRect(0,0,W,H);
  const mediaH=Math.round(H*(format==='story'?.36:.385)),titleY=mediaH+Math.round(H*.09),bodyY=titleY+Math.round(H*(format==='story'?.16:.20)),footerY=H-Math.round(H*.065);
  await drawImage(x,s.image,0,0,W,mediaH);
  x.fillStyle=dark?'#f6f5f0':'#202824';x.font='900 '+Math.round((format==='story'?76:68)*(s.titleScale||100)/100)+'px Arial';wrap(x,s.title,72,titleY,936,format==='story'?82:74,format==='story'?5:4);
  x.fillStyle=dark?'#c3cbc7':'#68726f';x.font='400 '+(format==='story'?34:31)+'px Arial';wrap(x,s.body,72,bodyY,936,format==='story'?48:44,format==='story'?8:5);
  x.fillStyle=dark?'#fff':'#202824';x.font='900 25px Arial';x.textAlign='left';x.fillText('PLUG ART',72,footerY);x.textAlign='right';x.fillText(s.cta||'',1008,footerY);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='PLUG_ART_'+format+'_slide_'+String(state.slide+1).padStart(2,'0')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)
}
async function drawImage(ctx,src,x,y,w,h){if(!src){const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#72c9c4');g.addColorStop(.5,'#7b70d6');g.addColorStop(1,'#d07da9');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);return}await new Promise(res=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const r=Math.max(w/im.width,h/im.height),dw=im.width*r,dh=im.height*r;ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);res()};im.onerror=res;im.src=src})}
function wrap(ctx,t,x,y,w,lh,max){const words=String(t||'').split(/\s+/),lines=[];let line='';for(const word of words){const n=line?line+' '+word:word;if(ctx.measureText(n).width>w&&line){lines.push(line);line=word}else line=n}if(line)lines.push(line);lines.slice(0,max).forEach((l,i)=>ctx.fillText(l,x,y+i*lh))}

P.ready.then(()=>{fillSources();bind();buildSlides();checkImages()});
})();
