(() => {
  const V10='PLUG ART Content Studio V10';
  if(typeof studio==='undefined'||!document.getElementById('carouselStudio')) return;
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const deep=x=>JSON.parse(JSON.stringify(x));
  const templates=[
    ['gradient','PLUG clair','Premium & coloré','sw-gradient'],['editorial','Éditorial','Magazine culturel','sw-editorial'],['minimal','Minimal','Blanc très épuré','sw-minimal'],['dark','Impact','Sombre & premium','sw-dark'],['neon','Neon Plug','Énergie nocturne','sw-neon'],['urgent','Urgence','Deadline / last call','sw-urgent'],['gallery','Galerie','Art contemporain','sw-gallery'],['photo','Photo','Image immersive','sw-photo']
  ];
  studio.freeMove=false;studio.guides=true;

  function ensureStyle(s){
    if(!s.offsets)s.offsets={};['kicker','title','body','cta','media'].forEach(k=>{if(!s.offsets[k])s.offsets[k]={x:0,y:0}});
    if(!s.align)s.align='left';if(!s.titleScale)s.titleScale=1;if(!s.bodyScale)s.bodyScale=1;if(!s.imageZoom)s.imageZoom=1;if(s.imageX==null)s.imageX=50;if(s.imageY==null)s.imageY=50;return s;
  }
  const oldSlideTemplate=slideTemplate;
  slideTemplate=function(kicker,title,body,cta,media=''){
    const s=oldSlideTemplate(kicker,title,body,cta,media);return ensureStyle(s);
  };

  const themeBox=q('#themeButtons');
  if(themeBox){themeBox.className='template-gallery';themeBox.innerHTML=templates.map((t,i)=>`<button class="template-card ${i===0?'on':''}" data-theme="${t[0]}"><span class="template-swatch ${t[3]}"></span><b>${t[1]}</b><span>${t[2]}</span></button>`).join('')}

  const imageField=q('#slideImageURL')?.closest('.field');
  if(imageField&&!q('#generateVisual')){
    imageField.insertAdjacentHTML('beforebegin',`<div class="v10-toolbar"><span class="v10-pill">V10 · CANVAS LIBRE</span><span class="v10-pill">EXPORT PRO</span></div>
      <div class="field"><label>ALIGNEMENT</label><div class="segment" id="alignButtons"><button class="on" data-align="left">Gauche</button><button data-align="center">Centre</button><button data-align="right">Droite</button></div></div>
      <div class="control-row"><div class="field"><label>TAILLE TITRE</label><div class="range-line"><input id="titleScale" type="range" min="70" max="150" value="100"><output id="titleScaleOut">100%</output></div></div><div class="field"><label>TAILLE TEXTE</label><div class="range-line"><input id="bodyScale" type="range" min="70" max="140" value="100"><output id="bodyScaleOut">100%</output></div></div></div>`);
    imageField.insertAdjacentHTML('afterend',`<div class="control-row"><div class="field"><label>ZOOM IMAGE</label><div class="range-line"><input id="imageZoom" type="range" min="100" max="200" value="100"><output id="imageZoomOut">100%</output></div></div><div class="field"><label>FOCALE X</label><input id="imageX" type="range" min="0" max="100" value="50"></div></div><div class="field"><label>FOCALE Y</label><input id="imageY" type="range" min="0" max="100" value="50"></div>
      <div class="image-lab"><h4>✦ Générateur visuel PLUGY</h4><p>Décris l’ambiance du fond. PLUGY génère un visuel artistique original sans modifier les informations éditoriales.</p><div class="field"><input id="imagePrompt" placeholder="Ex. galerie contemporaine parisienne, bleu électrique, texture peinture"><select id="imageStyle"><option value="abstract">Abstrait PLUG</option><option value="editorial">Éditorial</option><option value="cosmic">Cosmique</option><option value="street">Street / urbain</option><option value="minimal">Minimal</option></select></div><button class="soft" id="generateVisual">Générer l’image avec PLUGY</button><span class="status" id="visualStatus"></span></div>
      <div class="drag-toolbar"><button class="ghost" id="freeMove">✥ Déplacement libre</button><button class="ghost on" id="toggleGuides">Zone sûre</button><button class="ghost" id="resetPositions">Réinitialiser positions</button><button class="ghost" id="resetStyle">Style 100%</button></div>`);
  }

  const dl=q('#downloadSlide'),all=q('#downloadAllSlides');
  if(dl)dl.textContent='PNG · cette slide';
  if(all){all.textContent='ZIP · tout le carrousel';all.className='soft'}
  if(all&&!q('#downloadPDF')){all.insertAdjacentHTML('afterend','<button class="soft" id="downloadPDF">PDF · tout le carrousel</button>')}
  const actions=dl?.closest('.studio-actions');if(actions){actions.classList.add('export-actions');if(!q('#exportStatus'))actions.insertAdjacentHTML('afterend','<div class="export-status" id="exportStatus"></div>')}

  ['previewMedia','previewKicker','previewTitle','previewBody','previewCTA'].forEach(id=>{const el=q('#'+id);if(el)el.dataset.dragKey={previewMedia:'media',previewKicker:'kicker',previewTitle:'title',previewBody:'body',previewCTA:'cta'}[id]});

  const baseRender=renderStudio;
  renderStudio=function(){
    baseRender();const s=ensureStyle(studio.slides[studio.active]),p=q('#slidePreview');if(!p)return;
    p.classList.toggle('free-move',!!studio.freeMove);p.classList.toggle('safe-guides',!!studio.guides);
    q('#previewTitle').style.fontSize=(34*s.titleScale)+'px';q('#previewBody').style.fontSize=(14*s.bodyScale)+'px';
    ['previewKicker','previewTitle','previewBody','previewCTA'].forEach(id=>{q('#'+id).style.textAlign=s.align});
    const img=q('#previewMedia img');if(img){img.style.transform=`scale(${s.imageZoom})`;img.style.objectPosition=`${s.imageX}% ${s.imageY}%`}
    const map={kicker:'previewKicker',title:'previewTitle',body:'previewBody',cta:'previewCTA',media:'previewMedia'};
    Object.entries(map).forEach(([key,id])=>{const el=q('#'+id),o=s.offsets[key];if(el)el.style.transform=`translate(${o.x/100*p.clientWidth}px,${o.y/100*p.clientHeight}px)`});
    syncControls(s);qa('#themeButtons [data-theme]').forEach(b=>b.classList.toggle('on',b.dataset.theme===(s.theme||studio.theme)));
  };
  function syncControls(s){
    if(q('#titleScale')){q('#titleScale').value=Math.round(s.titleScale*100);q('#titleScaleOut').value=Math.round(s.titleScale*100)+'%';q('#bodyScale').value=Math.round(s.bodyScale*100);q('#bodyScaleOut').value=Math.round(s.bodyScale*100)+'%';q('#imageZoom').value=Math.round(s.imageZoom*100);q('#imageZoomOut').value=Math.round(s.imageZoom*100)+'%';q('#imageX').value=s.imageX;q('#imageY').value=s.imageY;qa('#alignButtons button').forEach(b=>b.classList.toggle('on',b.dataset.align===s.align))}
  }

  qa('#themeButtons [data-theme]').forEach(b=>b.onclick=()=>{studio.theme=b.dataset.theme;studio.slides.forEach(s=>s.theme=studio.theme);renderStudio()});
  qa('#alignButtons button').forEach(b=>b.onclick=()=>{ensureStyle(studio.slides[studio.active]).align=b.dataset.align;renderStudio()});
  q('#titleScale').oninput=()=>{ensureStyle(studio.slides[studio.active]).titleScale=Number(q('#titleScale').value)/100;renderStudio()};
  q('#bodyScale').oninput=()=>{ensureStyle(studio.slides[studio.active]).bodyScale=Number(q('#bodyScale').value)/100;renderStudio()};
  q('#imageZoom').oninput=()=>{ensureStyle(studio.slides[studio.active]).imageZoom=Number(q('#imageZoom').value)/100;renderStudio()};
  q('#imageX').oninput=()=>{ensureStyle(studio.slides[studio.active]).imageX=Number(q('#imageX').value);renderStudio()};
  q('#imageY').oninput=()=>{ensureStyle(studio.slides[studio.active]).imageY=Number(q('#imageY').value);renderStudio()};
  q('#freeMove').onclick=()=>{studio.freeMove=!studio.freeMove;q('#freeMove').classList.toggle('on',studio.freeMove);renderStudio()};
  q('#toggleGuides').onclick=()=>{studio.guides=!studio.guides;q('#toggleGuides').classList.toggle('on',studio.guides);renderStudio()};
  q('#resetPositions').onclick=()=>{const s=ensureStyle(studio.slides[studio.active]);Object.keys(s.offsets).forEach(k=>s.offsets[k]={x:0,y:0});renderStudio()};
  q('#resetStyle').onclick=()=>{const s=ensureStyle(studio.slides[studio.active]);s.titleScale=1;s.bodyScale=1;s.imageZoom=1;s.imageX=50;s.imageY=50;s.align='left';renderStudio()};

  let drag=null;const preview=q('#slidePreview');
  preview?.addEventListener('pointerdown',e=>{if(!studio.freeMove)return;const t=e.target.closest('[data-drag-key]');if(!t)return;e.preventDefault();const s=ensureStyle(studio.slides[studio.active]),k=t.dataset.dragKey,o=s.offsets[k];drag={k,sx:e.clientX,sy:e.clientY,x:o.x,y:o.y};t.setPointerCapture?.(e.pointerId)});
  preview?.addEventListener('pointermove',e=>{if(!drag)return;const s=ensureStyle(studio.slides[studio.active]);s.offsets[drag.k]={x:drag.x+(e.clientX-drag.sx)/preview.clientWidth*100,y:drag.y+(e.clientY-drag.sy)/preview.clientHeight*100};renderStudio()});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>preview?.addEventListener(ev,()=>drag=null));

  q('#generateVisual').onclick=async()=>{const s=ensureStyle(studio.slides[studio.active]),prompt=q('#imagePrompt').value.trim()||s.title||q('#carouselBrief').value.trim();if(!prompt)return;q('#visualStatus').textContent='PLUGY crée le visuel…';q('#generateVisual').disabled=true;try{const r=await fetch('/api/content/visual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:q('#imageStyle').value})});if(!r.ok)throw Error('Erreur '+r.status);const blob=await r.blob(),reader=new FileReader();reader.onload=()=>{s.media=reader.result;s.imageZoom=1;s.imageX=50;s.imageY=50;q('#visualStatus').textContent='Visuel généré ✓';renderStudio()};reader.readAsDataURL(blob)}catch(e){q('#visualStatus').textContent='Génération indisponible : '+e.message}finally{q('#generateVisual').disabled=false}};

  function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=8){const paragraphs=String(text||'').split('\n');let lines=[],current='';for(const p of paragraphs){for(const word of p.split(/\s+/)){const test=current?current+' '+word:word;if(ctx.measureText(test).width>maxWidth&&current){lines.push(current);current=word}else current=test}if(current){lines.push(current);current=''}}lines=lines.slice(0,maxLines);lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));return y+lines.length*lineHeight}
  async function drawImg(ctx,src,x,y,w,h,zoom=1,fx=50,fy=50){if(!src)return false;return new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();const base=Math.max(w/im.width,h/im.height),r=base*zoom,dw=im.width*r,dh=im.height*r,ox=x+(w-dw)*(fx/100),oy=y+(h-dh)*(fy/100);ctx.drawImage(im,ox,oy,dw,dh);ctx.restore();resolve(true)};im.onerror=()=>resolve(false);im.src=src})}
  function canvasBg(theme,W,H){const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,W,H);if(theme==='dark'||theme==='photo'){g.addColorStop(0,'#08111f');g.addColorStop(1,'#1d315c')}else if(theme==='neon'){g.addColorStop(0,'#050817');g.addColorStop(.55,'#122454');g.addColorStop(1,'#4b1656')}else if(theme==='urgent'){g.addColorStop(0,'#fff');g.addColorStop(.58,'#fff');g.addColorStop(.581,'#ffedf4');g.addColorStop(1,'#ffe0ec')}else if(theme==='editorial'){g.addColorStop(0,'#f7f3eb');g.addColorStop(1,'#e4d8c8')}else if(theme==='gallery'){g.addColorStop(0,'#f2ede5');g.addColorStop(1,'#dccdb9')}else if(theme==='minimal'){g.addColorStop(0,'#fff');g.addColorStop(1,'#f3f4f7')}else{g.addColorStop(0,'#fbfdff');g.addColorStop(.55,'#e9efff');g.addColorStop(1,'#ffe8f5')}ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return {c,ctx}}
  const mediaRatio=t=>t==='photo'?.54:t==='gallery'?.50:t==='editorial'?.34:t==='minimal'?.30:.40;
  async function canvasFor(index){const s=ensureStyle(studio.slides[index]),ratio=studio.ratio;let W=1080,H=1350;if(ratio==='1:1')H=1080;if(ratio==='9:16')H=1920;const theme=s.theme||studio.theme,{c,ctx}=canvasBg(theme,W,H),dark=['dark','photo','neon'].includes(theme),warm=['editorial','gallery'].includes(theme),mH=Math.round(H*mediaRatio(theme)),mo=s.offsets.media,mx=mo.x/100*W,my=mo.y/100*H;let ok=false;if(s.media)ok=await drawImg(ctx,s.media,mx,my,W,mH,s.imageZoom,s.imageX,s.imageY);if(!ok){const mg=ctx.createLinearGradient(0,0,W,mH);mg.addColorStop(0,theme==='minimal'?'#edf1f6':'#1a2750');mg.addColorStop(.55,'#315bff');mg.addColorStop(1,'#ed4fb5');ctx.fillStyle=mg;ctx.fillRect(mx,my,W,mH)}const pad=78,baseY=mH+78,align=s.align||'left',anchor=align==='center'?W/2:align==='right'?W-pad:pad,off=k=>({x:s.offsets[k].x/100*W,y:s.offsets[k].y/100*H});ctx.textBaseline='top';ctx.textAlign=align;let o=off('kicker');ctx.fillStyle=dark?'#72e7ef':warm?'#7b5d3f':'#5743e5';ctx.font='800 28px Arial';ctx.fillText(String(s.kicker||'PLUG ART').toUpperCase(),anchor+o.x,baseY+o.y);o=off('title');ctx.fillStyle=dark?'#fff':'#0b1325';ctx.font=`900 ${Math.round(72*s.titleScale)}px Arial`;let y=wrap(ctx,s.title,anchor+o.x,baseY+60+o.y,W-pad*2,Math.round(78*s.titleScale),4);o=off('body');ctx.fillStyle=dark?'#ced7e9':warm?'#655e56':'#64708b';ctx.font=`400 ${Math.round(34*s.bodyScale)}px Arial`;y=wrap(ctx,s.body,anchor+o.x,y+32+o.y,W-pad*2,Math.round(48*s.bodyScale),7);ctx.font='900 27px Arial';ctx.fillStyle=dark?'#fff':'#0b1325';ctx.textAlign='left';ctx.fillText('PLUG ART',pad,H-110);o=off('cta');ctx.textAlign=align==='left'?'right':align;ctx.fillText(s.cta||'',(align==='left'?W-pad:anchor)+o.x,H-110+o.y);ctx.textAlign='left';const ac=ctx.createLinearGradient(0,0,W,0);ac.addColorStop(0,'#315bff');ac.addColorStop(.35,'#30d8ea');ac.addColorStop(.65,'#7653ff');ac.addColorStop(1,'#ef4fb6');ctx.fillStyle=ac;ctx.fillRect(0,H-12,W,12);return c}
  const blobOf=c=>new Promise(r=>c.toBlob(r,'image/png'));function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
  async function need(src,test){if(test())return true;return new Promise(res=>{const s=document.createElement('script');s.src=src;s.onload=()=>res(test());s.onerror=()=>res(false);document.head.appendChild(s)})}
  exportSlide=async function(index){q('#exportStatus').textContent='Rendu PNG…';const c=await canvasFor(index),b=await blobOf(c);saveBlob(b,`PLUG_ART_carrousel_slide_${String(index+1).padStart(2,'0')}.png`);q('#exportStatus').textContent='PNG prêt ✓'};
  dl.onclick=()=>exportSlide(studio.active);
  all.onclick=async()=>{all.disabled=true;q('#exportStatus').textContent='Création du ZIP…';try{if(!await need('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',()=>typeof JSZip!=='undefined'))throw Error('module ZIP indisponible');const zip=new JSZip();for(let i=0;i<studio.slides.length;i++){zip.file(`PLUG_ART_slide_${String(i+1).padStart(2,'0')}.png`,await blobOf(await canvasFor(i)));q('#exportStatus').textContent=`ZIP : slide ${i+1}/${studio.slides.length}`};zip.file('legende_instagram.txt',q('#captionText').value||'');zip.file('textes_carrousel.txt',carouselText());saveBlob(await zip.generateAsync({type:'blob'}),'PLUG_ART_carrousel.zip');q('#exportStatus').textContent='ZIP complet prêt ✓'}catch(e){q('#exportStatus').textContent='ZIP : '+e.message}finally{all.disabled=false}};
  q('#downloadPDF').onclick=async()=>{const b=q('#downloadPDF');b.disabled=true;q('#exportStatus').textContent='Création du PDF…';try{if(!await need('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',()=>!!window.jspdf?.jsPDF))throw Error('module PDF indisponible');let pdf=null;for(let i=0;i<studio.slides.length;i++){const c=await canvasFor(i),W=c.width,H=c.height,data=c.toDataURL('image/jpeg',.94);if(!pdf)pdf=new window.jspdf.jsPDF({orientation:H>=W?'portrait':'landscape',unit:'px',format:[W,H],hotfixes:['px_scaling'],compress:true});else pdf.addPage([W,H],H>=W?'portrait':'landscape');pdf.addImage(data,'JPEG',0,0,W,H,undefined,'FAST');q('#exportStatus').textContent=`PDF : slide ${i+1}/${studio.slides.length}`};pdf.save('PLUG_ART_carrousel.pdf');q('#exportStatus').textContent='PDF complet prêt ✓'}catch(e){q('#exportStatus').textContent='PDF : '+e.message}finally{b.disabled=false}};

  const saveBtn=q('#saveDraft');if(saveBtn){saveBtn.onclick=()=>{const d={id:Date.now(),name:currentOpp()?.title||studio.slides[0]?.title||'Carrousel',slides:deep(studio.slides),theme:studio.theme,ratio:studio.ratio,caption:q('#captionText').value,date:new Date().toLocaleString('fr-FR')};drafts.unshift(d);drafts=drafts.slice(0,12);LS.set('plugart_carousel_drafts',drafts);renderDrafts()}}
  renderStudio();console.info(V10,'ready');
})();
