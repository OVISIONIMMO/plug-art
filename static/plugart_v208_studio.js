/* PLUG ART V208 · Editorial Studio. Client canvas is the source of truth for preview + export. */
(()=>{'use strict';
const VERSION='208.20261022.1';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uid=()=>Math.random().toString(36).slice(2,10);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
const schemes=[
 ['Électrique','#faf9f4','#111318','#154fff','#e3a224','#f3b6d4','#2256f8'],
 ['Rose galerie','#fdf9f8','#111216','#ef8fbd','#f9c8df','#e7a2bc','#f66cb3'],
 ['Or & cobalt','#faf9f2','#101114','#114ce9','#d89a17','#efbdd9','#1553ff'],
 ['Bleu ciel','#f9fcff','#11141c','#44beed','#a6dcff','#fbd5e3','#368df4'],
 ['Rouge manifeste','#fffaf6','#151314','#e82f40','#ffd7bd','#f7b1b5','#e33b4c'],
 ['Vert galerie','#f8fbf5','#131b16','#276854','#c8e1b1','#98cbb0','#256b59'],
 ['Lavande','#fcf9ff','#151320','#7754ce','#bca7f7','#f4c5e4','#7c5bf0'],
 ['Mono noir','#f9f9f6','#111111','#292929','#d1d1cc','#e9e9e6','#222222'],
 ['Jaune acidulé','#fffcf0','#181814','#dcc900','#f1e887','#aaccf8','#4562e7'],
 ['Orange studio','#fffaf3','#20170f','#ef742b','#efb15b','#facd9b','#e95e31'],
 ['Pistache','#f9fbf2','#20231a','#8dac43','#d9eaab','#b4d8b6','#628d3a'],
 ['Corail','#fffaf9','#1c1b1c','#eb6f69','#ffd0ca','#f8b5ab','#cf5952'],
 ['Nuit & crème','#f3eee3','#161722','#302a72','#d9bd89','#d3c5f4','#5847bc'],
 ['Fuchsia pop','#fcf9fd','#18151f','#d530aa','#feb0e4','#a8d5f9','#bd2792']
];
const templates=[
 ['city','Big City','Typographie monumentale','cover'],
 ['massive','Open Call Massive','Affiche manifeste','cover'],
 ['gallery','Gallery Editorial','Grille culturelle','info'],
 ['statement','Official Statement','Titre et visuel officiel','official'],
 ['flyer','Official Flyer Center','Affiche préservée','official'],
 ['split','Flyer Split','Source et infos en colonnes','official'],
 ['editorial','Flyer Editorial','Équilibre affiche / texte','official'],
 ['grid','Information Grid','Données structurées','info'],
 ['photo','Photo Hero','Photographie dominante','photo'],
 ['shapes','Soft Shapes','Formes organiques et image','photo'],
 ['type','Bold Minimal','Noir, couleur, espace','cover'],
 ['carousel','Carousel Story','Narration en plusieurs slides','info']
];
const backgrounds=[
 ['auto','Sélection créative','Selon la composition'],
 ['organic','Formes libres','Courbes organiques'],
 ['paper','Papier éditorial','Espace et grain subtil'],
 ['grid','Grille suisse','Quadrillage structuré'],
 ['stripes','Bandes cinétiques','Grandes diagonales'],
 ['waves','Lignes fluides','Ondulations dessinées'],
 ['halftone','Riso tramé','Points imprimés'],
 ['collage','Collage papier','Découpes géométriques'],
 ['orbit','Orbite','Arcs et trajectoires'],
 ['glow','Lumière diffuse','Dégradés lumineux'],
 ['blocks','Manifeste','Blocs graphiques'],
 ['checker','Échiquier pop','Motif damier']
];
const slots=[['paper','Fond'],['ink','Texte'],['primary','Accent 1'],['secondary','Accent 2'],['accent','Accent 3'],['line','Filet']];
const formats={'4:5':[1080,1350],'1:1':[1080,1080],'9:16':[1080,1920]};
const imageCache=new Map();
let root=null,ui=null,drag=null,paintQueued=false,autosaveTimer=null;
const defaults=()=>({id:null,title:'Nouvelle publication',format:'4:5',palette:0,colors:pal(0),template:'flyer',background:'auto',texture:42,
  count:5,facts:{title:'',city:'PARIS',venue:'',deadline:'',event_dates:'',fee:'',disciplines:'',eligibility:'',description:'',source_url:'',cta:'Commente PLUG pour recevoir le lien'},
  assets:[],activeAsset:-1,slides:[],active:0,selected:null,caption:'',legacy:false,dirty:false});
let S=defaults(),ready=false,radarRows=[];
function pal(i){const v=schemes[i]||schemes[0];return {paper:v[1],ink:v[2],primary:v[3],secondary:v[4],accent:v[5],line:v[6]};}
const canvasSize=()=>formats[S.format]||formats['4:5'];
const slide=()=>S.slides[S.active];
function notice(m){const el=q('#v208Status',root);if(el)el.textContent=m;}
function textblock(id,text,x,y,w,h,size,color='ink',align='left',weight=900){
 return {id:uid(),role:id,type:'text',text:String(text||''),x,y,w,h,size,color,align,weight,visible:true};
}
function imgblock(x,y,w,h,url='',fit='contain'){
 return {id:uid(),role:'official',type:'image',url,x,y,w,h,fit,visible:true};
}
function formValue(k){return String(S.facts[k]||'').trim();}
function safeFacts(){
 return {title:formValue('title')||'OPEN CALL',city:formValue('city')||'ART',venue:formValue('venue'),
   deadline:formValue('deadline'),event_dates:formValue('event_dates'),fee:formValue('fee'),
   disciplines:formValue('disciplines'),eligibility:formValue('eligibility'),description:formValue('description'),
   source_url:formValue('source_url'),cta:formValue('cta')||'Commente PLUG pour recevoir le lien'};
}
function contentFor(i,n){
 const f=safeFacts(),details=[f.venue,f.city,f.event_dates].filter(Boolean).join(' · ');
 if(n===1)return {kicker:'PLUG ART · OPEN CALL',title:f.title,body:[details,f.deadline?'Date limite : '+f.deadline:''].filter(Boolean).join('\n')};
 if(i===0)return {kicker:'PLUG ART · OPEN CALL',title:n>3?String(n)+' OPEN CALLS':'OPEN CALL FOR ARTISTS',body:f.city+' · '+f.title};
 if(i===1)return {kicker:'VISUEL OFFICIEL',title:f.city||f.title,body:f.title};
 if(i===n-1)return {kicker:'PLUG ART',title:'À TOI DE JOUER',body:f.cta};
 if(i===2)return {kicker:'INFOS PRATIQUES',title:'LE RENDEZ-VOUS',body:[details,f.deadline?'Date limite : '+f.deadline:'',f.fee?'Frais : '+f.fee:''].filter(Boolean).join('\n')||'Informations à confirmer auprès du lieu'};
 if(i===3)return {kicker:'ARTISTES',title:'QUI PEUT POSTULER ?',body:[f.disciplines,f.eligibility].filter(Boolean).join('\n')||'Vérifie les conditions de candidature sur la source officielle'};
 return {kicker:'À RETENIR',title:'L’ESSENTIEL',body:f.description||'Consulte les informations officielles avant de candidater.'};
}
function assetURL(){return S.assets[S.activeAsset]?.url||'';}
function blockLayout(template,i,n){
 const W=1080,H=canvasSize()[1],c=contentFor(i,n),official=assetURL(), f=safeFacts();
 const b=[];
 b.push(textblock('brand','PLUG  A R T',80,42,700,52,35,'ink','left',800));
 if(['city','massive','type'].includes(template)){
   b.push(textblock('kicker',c.kicker.toUpperCase(),85,177,900,90,42,'primary','left',780));
   b.push(textblock('title',c.title.toUpperCase(),68,305,945,455,160,template==='type'?'ink':'ink'));
   b.push(textblock('detail',c.body,88,H-385,905,210,44,'ink','left',630));
   b.push(textblock('cta',f.cta,88,H-115,900,70,33,'primary','left',730));
 }else if(template==='split'){
   b.push(textblock('title',c.title.toUpperCase(),65,142,952,240,128,'ink'));
   b.push(imgblock(68,412,590,H-650,official,'contain'));
   b.push(textblock('kicker','VISUEL OFFICIEL',686,435,316,70,35,'primary','left',820));
   b.push(textblock('detail',c.body,680,535,332,H-760,39,'ink','left',650));
   b.push(textblock('cta',f.cta,76,H-115,910,66,31,'primary','left',800));
 }else if(template==='photo'||template==='shapes'){
   b.push(imgblock(67,138,950,Math.max(420,H-510),official,'cover'));
   b.push(textblock('kicker',c.kicker,82,H-315,906,65,31,'primary'));
   b.push(textblock('title',c.title.toUpperCase(),75,H-260,938,158,103,'ink'));
   b.push(textblock('cta',f.cta,83,H-98,900,65,29,'ink','left',700));
 }else if(template==='gallery'||template==='grid'||template==='carousel'){
   b.push(textblock('kicker',c.kicker,83,153,914,63,39,'primary'));
   b.push(textblock('title',c.title.toUpperCase(),73,244,940,300,127,'ink'));
   b.push(textblock('detail',c.body,84,602,909,H-840,48,'ink','left',600));
   b.push(textblock('meta',[f.deadline?'DEADLINE  '+f.deadline:'',f.fee?'FRAIS  '+f.fee:'',f.venue].filter(Boolean).join('\n'),83,H-265,903,170,33,'ink','left',650));
   b.push(textblock('cta',f.cta,83,H-93,910,55,28,'primary','left',740));
 }else{
   b.push(textblock('title',c.title.toUpperCase(),65,135,953,235,116,'ink'));
   b.push(textblock('kicker','VISUEL OFFICIEL',70,370,940,70,45,'primary','left',850));
   b.push(imgblock(template==='editorial'?147:205,447,template==='editorial'?786:670,Math.max(380,H-785),official,'contain'));
   b.push(textblock('detail',c.body,73,H-318,941,130,43,'ink','left',630));
   b.push(textblock('meta',[f.deadline?'DATE LIMITE : '+f.deadline:'',f.venue,f.event_dates].filter(Boolean).join(' · '),73,H-178,937,55,29,'ink','left',700));
   b.push(textblock('cta',f.cta,76,H-94,932,63,29,'primary','left',750));
 }
 return b;
}
function makeSlide(i,n,t){return {id:uid(),template:t||((i===0)?'city':i===1?'flyer':i===n-1?'type':i===2?'grid':'editorial'),background:S.background,blocks:blockLayout(t||((i===0)?'city':i===1?'flyer':i===n-1?'type':i===2?'grid':'editorial'),i,n)};}
function makeSlides(){S.slides=Array.from({length:S.count},(_,i)=>makeSlide(i,S.count));S.active=0;S.selected=null;changed();refreshUI();notice('Compositions prêtes : tous les blocs sont modifiables.');}
function color(v,colors){return (colors||S.colors)[v]||v||'#14151a';}
function rng(seed){let a=(seed>>>0)||2531;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return (a>>>0)/4294967296;};}
function background(ctx,W,H,colors,requested='auto',template='flyer'){
 const select={
   city:'stripes',massive:'blocks',gallery:'grid',statement:'paper',flyer:'orbit',
   split:'collage',editorial:'waves',grid:'grid',photo:'glow',shapes:'organic',type:'paper',carousel:'halftone'
 };
 const kind=requested==='auto'?(select[template]||'paper'):requested;
 const P=k=>color(k,colors),rand=rng(91911+W+H+kind.length*101);
 ctx.fillStyle=P('paper');ctx.fillRect(0,0,W,H);ctx.save();
 const organic=(x,y,rx,ry,col,rotation)=>{
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation||0);ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(-rx,0);ctx.bezierCurveTo(-rx,-ry*.65,-rx*.55,-ry,0,-ry);
  ctx.bezierCurveTo(rx*.6,-ry*1.18,rx,-ry*.46,rx,.08*ry);
  ctx.bezierCurveTo(rx,ry*.78,rx*.35,ry*1.1,0,ry);
  ctx.bezierCurveTo(-rx*.65,ry*.9,-rx,ry*.48,-rx,0);ctx.fill();ctx.restore();
 };
 if(kind==='organic'){
  organic(-135,90,350,360,P('primary'),-.25);
  organic(W+150,H*.55,240,420,P('secondary'),.3);
  organic(100,H+120,390,240,P('accent'),.17);
 }else if(kind==='paper'){
  ctx.strokeStyle=P('line');ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(72,160);ctx.lineTo(W-72,160);ctx.moveTo(72,H-165);ctx.lineTo(W-72,H-165);ctx.stroke();
  ctx.fillStyle=P('primary');ctx.fillRect(74,193,95,8);
  ctx.globalAlpha=.14;ctx.fillStyle=P('accent');ctx.fillRect(W-170,0,170,H);ctx.globalAlpha=1;
 }else if(kind==='grid'){
  ctx.strokeStyle=P('line');ctx.globalAlpha=.24;ctx.lineWidth=1.7;
  for(let x=0;x<=W;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.globalAlpha=1;ctx.fillStyle=P('primary');ctx.fillRect(0,0,100,100);ctx.fillRect(W-180,H-180,180,180);
 }else if(kind==='stripes'){
  ctx.save();ctx.translate(W*.49,H*.50);ctx.rotate(-.27);
  ctx.fillStyle=P('primary');ctx.fillRect(-W*1.6,-H*.75,W*3.2,H*.27);
  ctx.fillStyle=P('secondary');ctx.fillRect(-W*1.6,H*.21,W*3.2,H*.22);
  ctx.globalAlpha=.38;ctx.fillStyle=P('accent');ctx.fillRect(-W*1.6,-H*.15,W*3.2,H*.11);ctx.restore();
 }else if(kind==='waves'){
  for(let j=0;j<21;j++){
   ctx.strokeStyle=j%5===0?P('primary'):P('line');ctx.globalAlpha=j%5===0?.8:.35;
   ctx.lineWidth=j%5===0?4:1.8;ctx.beginPath();
   for(let x=-20;x<=W+20;x+=18){
    const y=H*.22+j*37+Math.sin(x/155+j*.31)*48+Math.sin(x/87+j*.13)*10;
    if(x===-20)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }ctx.stroke();
  }ctx.globalAlpha=1;
 }else if(kind==='halftone'){
  ctx.fillStyle=P('primary');
  for(let y=0;y<H;y+=23){for(let x=0;x<W;x+=23){
    const d=Math.min(Math.hypot(x-W*.15,y-H*.14),Math.hypot(x-W*.9,y-H*.9));
    const rad=clamp(11-d/80,0,10);
    if(rad>1){ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();}
  }}
  ctx.fillStyle=P('secondary');ctx.fillRect(W*.63,H*.37,W*.37,33);
 }else if(kind==='collage'){
  const pieces=[[50,100,500,240,-.12,'primary'],[W*.48,40,440,620,.16,'accent'],
   [-120,H*.68,690,350,.19,'secondary'],[W*.67,H*.74,490,350,-.21,'primary']];
  for(const [x,y,w,h,rotation,col] of pieces){
   ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);
   ctx.fillStyle=P(col);ctx.fillRect(-w/2,-h/2,w,h);ctx.restore();
  }
 }else if(kind==='orbit'){
  ctx.strokeStyle=P('line');ctx.lineWidth=4;
  for(let i=0;i<5;i++){ctx.save();ctx.translate(W*.48,H*.5);ctx.rotate(-.25+i*.26);
   ctx.beginPath();ctx.ellipse(0,0,370+i*95,180+i*120,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.fillStyle=P('primary');ctx.beginPath();ctx.arc(-30,H*.31,156,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=P('secondary');ctx.beginPath();ctx.arc(W+40,H*.83,212,0,Math.PI*2);ctx.fill();
 }else if(kind==='glow'){
  for(const [x,y,r,c] of [[W*.16,H*.21,W*.65,'primary'],[W*.86,H*.56,W*.71,'accent'],[W*.27,H*.92,W*.65,'secondary']]){
   const g=ctx.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,P(c));g.addColorStop(1,'transparent');
   ctx.save();ctx.globalAlpha=.38;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
 }else if(kind==='blocks'){
  ctx.fillStyle=P('primary');ctx.fillRect(0,0,W,H*.19);
  ctx.fillStyle=P('secondary');ctx.fillRect(W*.75,H*.20,W*.25,H*.67);
  ctx.fillStyle=P('accent');ctx.fillRect(0,H*.76,W*.59,H*.24);
  ctx.fillStyle=P('ink');ctx.fillRect(0,H*.29,W*.12,18);
 }else if(kind==='checker'){
  const tile=124;ctx.globalAlpha=.85;ctx.fillStyle=P('primary');
  for(let y=0;y<H;y+=tile){for(let x=0;x<W;x+=tile){
   if((Math.floor(x/tile)+Math.floor(y/tile))%2===0 && (x<W*.32||y>H*.69))ctx.fillRect(x,y,tile,tile);
  }}
  ctx.globalAlpha=1;ctx.fillStyle=P('secondary');ctx.fillRect(W*.72,H*.03,25,H*.5);
 }
 ctx.restore();
 // Print-style grain is optional, deterministic and consistent across previews and exports.
 const grain=clamp(S.texture,0,100)/100;
 if(grain>0){
  ctx.save();ctx.fillStyle=P('ink');ctx.globalAlpha=.07*grain;
  const N=Math.floor(2200*grain);
  for(let i=0;i<N;i++){const x=rand()*W,y=rand()*H,r=rand()*1.45+.15;ctx.fillRect(x,y,r,r);}
  ctx.restore();
 }
}
function getImage(url){
 if(!url)return null;
 if(imageCache.has(url))return imageCache.get(url);
 const entry={image:null,loading:true,error:false};imageCache.set(url,entry);
 const img=new Image();img.decoding='async';
 img.onload=()=>{entry.image=img;entry.loading=false;schedulePaint();};
 img.onerror=()=>{entry.error=true;entry.loading=false;schedulePaint();};
 img.src=url;return entry;
}
function fitImage(ctx,img,b){
 const iw=img.naturalWidth,ih=img.naturalHeight;
 if(!iw||!ih)return;
 const scale=b.fit==='cover'?Math.max(b.w/iw,b.h/ih):Math.min(b.w/iw,b.h/ih);
 const sw=iw*scale,sh=ih*scale;
 ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();
 ctx.drawImage(img,b.x+(b.w-sw)/2,b.y+(b.h-sh)/2,sw,sh);ctx.restore();
}
function textLines(ctx,text,maxWidth,maxLines=10){
 let list=[];
 String(text||'').split('\n').forEach(p=>{
   let str='';
   for(const word of p.split(/\s+/).filter(Boolean)){
     const attempt=(str?str+' ':'')+word;
     if(str&&ctx.measureText(attempt).width>maxWidth){list.push(str);str=word;}else str=attempt;
   }
   if(str)list.push(str);
   if(!p.trim())list.push('');
 });
 // Character fallback for oversized words.
 let result=[];
 list.forEach(line=>{
   if(ctx.measureText(line).width<=maxWidth){result.push(line);return}
   let cur='';
   for(const char of line){if(cur&&ctx.measureText(cur+char).width>maxWidth){result.push(cur);cur=''}cur+=char;}
   if(cur)result.push(cur);
 });
 return result.slice(0,maxLines);
}
function drawBlock(ctx,b,colors){
 if(b.visible===false)return;
 ctx.save();
 if(b.type==='image'){
   ctx.shadowColor='rgba(22,25,30,.19)';ctx.shadowBlur=29;ctx.shadowOffsetY=11;
   ctx.fillStyle='#fff';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.shadowColor='transparent';
   const entry=getImage(b.url);
   if(entry?.image)fitImage(ctx,entry.image,b);
   else{ctx.fillStyle='#f6f8fc';ctx.fillRect(b.x+4,b.y+4,b.w-8,b.h-8);
     ctx.fillStyle='#77829a';ctx.textBaseline='middle';ctx.textAlign='center';
     ctx.font='700 32px Arial,sans-serif';ctx.fillText('VISUEL OFFICIEL',b.x+b.w/2,b.y+b.h/2-22);
     ctx.font='23px Arial,sans-serif';ctx.fillText(entry?.error?'Fichier indisponible':'Importer un flyer ou une photo',b.x+b.w/2,b.y+b.h/2+23);}
 }else if(b.type==='shape'){
   ctx.globalAlpha=b.opacity===undefined?1:clamp(b.opacity,0,1);
   ctx.fillStyle=color(b.color||'primary',colors);
   if(b.shape==='ellipse'){ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2,b.h/2,0,0,Math.PI*2);ctx.fill();}
   else ctx.fillRect(b.x,b.y,b.w,b.h);
 }else{
   const size=clamp(b.size||40,10,240),weight=clamp(b.weight||800,200,950);
   ctx.font=weight+' '+size+'px Impact,"Arial Narrow","Arial Black",sans-serif';
   ctx.textBaseline='top';ctx.fillStyle=color(b.color||'ink',colors);ctx.textAlign=b.align||'left';
   const lines=textLines(ctx,b.text,b.w,Math.max(1,Math.floor(b.h/(size*.86))));
   const y=b.y,x=b.align==='center'?b.x+b.w/2:b.align==='right'?b.x+b.w:b.x;
   lines.forEach((line,k)=>ctx.fillText(line,x,y+k*size*.91));
 }
 ctx.restore();
}
function draw(canvas,doc,colors=S.colors,selectedId=null){
 if(!canvas||!doc)return;
 const dims=canvasSize(),W=dims[0],H=dims[1];
 if(canvas.dataset.thumb==='1'){canvas.width=150;canvas.height=Math.round(150*H/W);}
 else{canvas.width=W;canvas.height=H;}
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const sc=canvas.width/W;ctx.save();ctx.scale(sc,sc);
 background(ctx,W,H,colors,doc.background||'auto',doc.template);
 doc.blocks.forEach(b=>drawBlock(ctx,b,colors));
 if(selectedId){
   const b=doc.blocks.find(x=>x.id===selectedId);
   if(b){ctx.save();ctx.strokeStyle='#174cf6';ctx.lineWidth=3;ctx.setLineDash([14,9]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.restore();}
 }
 ctx.restore();
}
function schedulePaint(){if(paintQueued)return;paintQueued=true;requestAnimationFrame(()=>{paintQueued=false;paint()})}
function paint(){
 if(!root)return;
 draw(q('#v208Canvas',root),slide(),S.colors,S.selected);
 qa('[data-v208-thumb]',root).forEach((el)=>{const i=Number(el.dataset.v208Thumb);draw(q('canvas',el),S.slides[i]);});
}
function changed(){S.dirty=true;clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>{try{localStorage.setItem('plugart:v208:working',JSON.stringify(snapshot()))}catch(_){}},700);schedulePaint();}
function snapshot(){return {title:S.title||'Publication PLUG ART',payload:{editor:'v208',format:S.format,count:S.count,
 palette:S.palette,colors:S.colors,template:S.template,background:S.background,texture:S.texture,facts:S.facts,assets:S.assets,
 activeAsset:S.activeAsset,slides:S.slides,caption:S.caption}};}
function setData(d){if(!d||!d.payload)return;const p=d.payload;
 S.id=d.id||null;S.title=d.title||'Publication PLUG ART';S.format=formats[p.format]?p.format:'4:5';S.count=clamp(p.count||5,1,7);
 S.palette=Number.isInteger(p.palette)?p.palette:0;S.colors={...pal(S.palette),...(p.colors||{})};
 S.template=p.template||'flyer';S.background=backgrounds.some(x=>x[0]===p.background)?p.background:'auto';S.texture=clamp(p.texture??42,0,100);S.facts={...defaults().facts,...(p.facts||{})};
 S.assets=Array.isArray(p.assets)?p.assets.filter(a=>String(a.url||'').startsWith('/api/v179/generated/')).slice(0,25):[];
 S.activeAsset=clamp(p.activeAsset??0,0,Math.max(0,S.assets.length-1));if(!S.assets.length)S.activeAsset=-1;
 S.slides=Array.isArray(p.slides)?p.slides.slice(0,12).map(d=>({...d,background:backgrounds.some(x=>x[0]===d.background)?d.background:S.background})):[];
 if(!S.slides.length)S.slides=[makeSlide(0,1,S.template)];S.active=0;S.selected=null;S.caption=p.caption||'';
 refreshUI();changed();notice('Projet ouvert.');}
function saveReq(url,options){
 return fetch(url,{cache:'no-store',...(options||{})}).then(async r=>{
   const x=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(x.detail||('Erreur '+r.status));
   return x;
 });
}
async function saveProject(){
 try{
   const payload=snapshot(),path=S.id?'/api/v208/studio/projects/'+S.id:'/api/v208/studio/projects';
   const data=await saveReq(path,{method:S.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   S.id=data.id;S.dirty=false;notice('Projet enregistré · '+new Date().toLocaleTimeString('fr-FR'));
   loadProjects();
 }catch(e){notice('Échec de sauvegarde : '+e.message);}
}
async function loadProjects(){
 try{
   const d=await saveReq('/api/v208/studio/projects');
   q('#v208Projects',root).innerHTML='<option value="">Ouvrir un projet enregistré</option>'+
     (d.items||[]).map(x=>'<option value="'+x.id+'">'+esc(x.title)+'</option>').join('');
   if(S.id)q('#v208Projects',root).value=String(S.id);
 }catch(_){notice('Stockage indisponible · sauvegarde locale conservée');}
}
async function loadRadar(){
 try{
   const d=await saveReq('/api/opportunities');
   radarRows=Array.isArray(d)?d:(d.opportunities||[]);
   const sel=q('#v208Radar',root);if(sel)sel.innerHTML='<option value="">Brief libre · choisir une source Radar</option>'+
       radarRows.slice(0,180).map((x,i)=>'<option value="'+i+'">'+esc(x.title||'Opportunité')+'</option>').join('');
 }catch(_){}
}
function fillFromRadar(v){
 const r=radarRows[Number(v)];if(!r)return;
 S.facts.title=r.title||'';S.facts.city=r.city||r.location||'';
 S.facts.venue=r.venue||r.organizer||'';S.facts.deadline=r.deadline||'';
 S.facts.event_dates=r.event_date||r.start_date||'';S.facts.fee=r.fee||'';
 S.facts.disciplines=r.eligibility||'';S.facts.description=r.summary||r.radar_reason||'';
 S.facts.source_url=r.source_url||r.url||'';
 S.title=S.facts.title||S.title;makeSlides();notice('Informations Radar récupérées · vérifie les dates et les frais.');
}
function tab(name){
 qa('.v208-tabs button',root).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.v208Tab===name)));
 qa('.v208-tab-panel',root).forEach(p=>p.hidden=p.dataset.v208Panel!==name);
}
function renderFacts(){
 qa('[data-v208-fact]',root).forEach(el=>{if(document.activeElement!==el)el.value=S.facts[el.dataset.v208Fact]||'';});
 const title=q('#v208ProjectName',root);if(title&&document.activeElement!==title)title.value=S.title;
 const fmt=q('#v208Format',root);if(fmt)fmt.value=S.format;
 const cnt=q('#v208Count',root);if(cnt)cnt.value=String(S.count);
 const c=q('#v208Caption',root);if(c&&document.activeElement!==c)c.value=S.caption;
}
function renderTemplates(){
 q('#v208Templates',root).innerHTML=templates.map(t=>
  '<button type="button" class="v208-template" data-template="'+t[0]+'" aria-pressed="'+(S.template===t[0])+'">'+
  '<span class="v208-template-art"><i></i><i></i><i></i></span><b>'+esc(t[1])+'</b><small>'+esc(t[2])+'</small></button>').join('');
}
function renderPalettes(){
 q('#v208Palettes',root).innerHTML=schemes.map((a,i)=>
  '<button type="button" class="v208-palette" data-palette="'+i+'" aria-pressed="'+(S.palette===i)+'">'+
  '<span class="v208-swatches">'+a.slice(1,6).map(c=>'<i style="background:'+c+'"></i>').join('')+'</span><b>'+esc(a[0])+'</b></button>').join('');
 q('#v208CustomColors',root).innerHTML=slots.map(s=>'<label><input type="color" aria-label="'+s[1]+'" data-color="'+s[0]+'" value="'+esc(S.colors[s[0]])+'"><span>'+s[1]+'</span></label>').join('');
}
function renderBackgrounds(){
 const host=q('#v208Backgrounds',root);
 if(!host)return;
 const active=slide()?.background||S.background;
 host.innerHTML=backgrounds.map(([id,label,detail])=>
  '<button type="button" class="v208-bg-choice" data-background="'+id+'" aria-pressed="'+(active===id)+'" title="'+esc(detail)+'">'+
  '<canvas data-background-preview="'+id+'" width="112" height="140" aria-hidden="true"></canvas>'+
  '<strong>'+esc(label)+'</strong><small>'+esc(detail)+'</small></button>').join('');
 const dims=canvasSize();
 qa('[data-background-preview]',host).forEach(el=>{
  const ctx=el.getContext('2d');if(!ctx)return;
  ctx.save();ctx.scale(el.width/dims[0],el.height/dims[1]);
  background(ctx,dims[0],dims[1],S.colors,el.dataset.backgroundPreview,slide()?.template||S.template);
  ctx.restore();
 });
 const tx=q('#v208Texture',root);if(tx)tx.value=String(S.texture);
 const txv=q('#v208TextureValue',root);if(txv)txv.textContent=String(S.texture)+' %';
}
function renderAssets(){
 q('#v208AssetList',root).innerHTML=S.assets.length?S.assets.map((a,i)=>
 '<button type="button" class="v208-asset-card" data-asset="'+i+'" aria-pressed="'+(i===S.activeAsset)+'">'+
 '<img src="'+esc(a.url)+'" alt="Image officielle importée"><span><strong>'+esc(a.name)+'</strong><small>'+esc(a.role)+'</small></span><b>↗</b></button>'
 ).join(''):'<p class="v208-note">Aucune image officielle importée. Le studio conserve des zones réservées sans inventer de visuels.</p>';
}
function renderSlideRail(){
 const rail=q('#v208SlideRail',root);
 rail.innerHTML=S.slides.map((x,i)=>'<button type="button" class="v208-thumb" aria-label="Slide '+(i+1)+'" aria-pressed="'+(i===S.active)+'" data-v208-thumb="'+i+'"><canvas data-thumb="1"></canvas><small>Slide '+(i+1)+'</small></button>').join('')+
 '<button type="button" class="v208-thumb" data-action="add-slide" title="Ajouter une slide">＋<small>Ajouter</small></button>';
 const label=q('#v208SlideInfo',root);if(label)label.textContent='Slide '+(S.active+1)+' / '+S.slides.length;
}
function renderLayers(){
 const d=slide();
 q('#v208Layers',root).innerHTML=d.blocks.map(b=>
 '<button type="button" class="v208-layer" data-layer="'+esc(b.id)+'" aria-pressed="'+(S.selected===b.id)+'"><span>'+
 (b.type==='image'?'▧':b.type==='shape'?'◯':'T')+'</span><b>'+esc(b.text||b.role||'Visuel')+'</b><small>'+esc(b.type)+'</small></button>').join('');
}
function inspector(){
 const holder=q('#v208Inspector',root);const b=slide().blocks.find(b=>b.id===S.selected);
 if(!b){holder.innerHTML='<p class="v208-note">Sélectionne un élément du visuel ou de la liste de calques. Tu pourras le déplacer sur la composition et modifier ses propriétés ici.</p>';return;}
 const isText=b.type==='text',isImage=b.type==='image';
 holder.innerHTML='<label class="v208-field">Nom du calque<input data-property="role" value="'+esc(b.role||'')+'"></label>'+
 (isText?'<label class="v208-field">Texte<textarea rows="4" data-property="text">'+esc(b.text)+'</textarea></label>':'')+
 (isImage?'<label class="v208-field">Image<select data-property="url">'+S.assets.map(a=>'<option value="'+esc(a.url)+'" '+(b.url===a.url?'selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></label><label class="v208-field">Cadrage<select data-property="fit"><option value="contain" '+(b.fit!=='cover'?'selected':'')+'>Conserver le flyer entier</option><option value="cover" '+(b.fit==='cover'?'selected':'')+'>Remplir / recadrer</option></select></label>':'')+
 '<div class="v208-property-grid">'+[['x','X'],['y','Y'],['w','Largeur'],['h','Hauteur']].map(([k,label])=>
 '<label>'+label+'<input type="number" data-property="'+k+'" value="'+Math.round(b[k]||0)+'" step="5"></label>').join('')+'</div>'+
 (isText?'<div class="v208-property-grid"><label>Taille<input type="number" min="12" max="240" data-property="size" value="'+(b.size||40)+'"></label><label>Graisse<input type="number" min="200" max="950" step="50" data-property="weight" value="'+(b.weight||800)+'"></label></div>'+
 '<label class="v208-field">Couleur<select data-property="color">'+slots.map(([k,name])=>'<option value="'+k+'" '+(b.color===k?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 '<label class="v208-field">Alignement<select data-property="align">'+['left','center','right'].map(k=>'<option value="'+k+'" '+(b.align===k?'selected':'')+'>'+({left:'Gauche',center:'Centre',right:'Droite'}[k])+'</option>').join('')+'</select></label>':'')+
 (b.type==='shape'?'<label class="v208-field">Forme<select data-property="shape"><option value="ellipse">Ellipse</option><option value="rectangle" '+(b.shape==='rectangle'?'selected':'')+'>Rectangle</option></select></label>':'')+
 '<div class="v208-bottom-actions"><button type="button" class="v208-btn" data-action="duplicate-layer">Dupliquer</button><button type="button" class="v208-btn" data-action="delete-layer">Supprimer</button></div>';
}
function refreshUI(){
 if(!root)return;
 renderFacts();renderTemplates();renderPalettes();renderBackgrounds();renderAssets();renderSlideRail();renderLayers();inspector();schedulePaint();
}
function chooseTemplate(t,onlyCurrent=true){
 if(!templates.some(x=>x[0]===t))return;
 S.template=t;
 if(onlyCurrent){const prev=slide();const old=Object.fromEntries(prev.blocks.filter(b=>b.type==='text').map(b=>[b.role,b.text]));
 const n=makeSlide(S.active,S.slides.length,t);n.background=prev.background;
 n.blocks.forEach(b=>{if(b.type==='text'&&old[b.role]!==undefined)b.text=old[b.role];});
 S.slides[S.active]=n;
 }else{S.slides=S.slides.map((d,i)=>makeSlide(i,S.slides.length,t));}
 S.selected=null;changed();refreshUI();
}
function selectLayer(id){S.selected=id;renderLayers();inspector();schedulePaint();}
function getClickPos(e){
 const canvas=q('#v208Canvas',root),box=canvas.getBoundingClientRect(),d=canvasSize();
 return {x:(e.clientX-box.left)*d[0]/box.width,y:(e.clientY-box.top)*d[1]/box.height};
}
function pointerStart(e){
 const p=getClickPos(e),blocks=slide().blocks.slice().reverse();
 const hit=blocks.find(b=>b.visible!==false&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);
 selectLayer(hit?.id||null);
 if(hit){drag={id:hit.id,dx:p.x-hit.x,dy:p.y-hit.y};q('#v208Canvas',root).setPointerCapture(e.pointerId);}
}
function pointerMove(e){
 if(!drag)return;const b=slide().blocks.find(x=>x.id===drag.id);if(!b)return;
 const p=getClickPos(e),d=canvasSize();b.x=Math.round(clamp(p.x-drag.dx,0,d[0]-Math.min(20,b.w)));
 b.y=Math.round(clamp(p.y-drag.dy,0,d[1]-Math.min(20,b.h)));schedulePaint();
}
function pointerEnd(){if(!drag)return;drag=null;changed();inspector();}
function addLayer(kind){
 if(kind==='image'&&!assetURL()){tab('sources');notice('Importe d’abord ton flyer ou ta photo officielle.');return;}
 let b;
 if(kind==='text')b=textblock('new','NOUVEAU TEXTE',160,420,760,190,90,'ink');
 else if(kind==='image')b=imgblock(200,400,680,550,assetURL());
 else b={id:uid(),role:'forme',type:'shape',shape:'ellipse',x:220,y:500,w:450,h:300,color:'primary',visible:true,opacity:.85};
 slide().blocks.push(b);S.selected=b.id;changed();renderLayers();inspector();
}
async function upload(file){
 if(!file||file.size>10_000_000){notice('Fichier trop volumineux : 10 Mo maximum.');return;}
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)){notice('Formats acceptés : PNG, JPEG et WebP.');return;}
 notice('Import du visuel officiel…');
 const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
 const out=await saveReq('/api/v202/content/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
 S.assets.push({url:out.url,name:file.name.slice(0,110),role:q('#v208AssetRole',root).value,source:'uploaded'});
 S.activeAsset=S.assets.length-1;
 S.slides.forEach(d=>d.blocks.forEach(b=>{if(b.type==='image'&&!b.url)b.url=out.url;}));
 changed();refreshUI();notice('Visuel officiel importé, sans modification de son contenu.');}
async function extractFacts(){
 const a=S.assets[S.activeAsset];if(!a){notice('Ajoute un flyer officiel.');tab('sources');return;}
 const button=q('#v208Extract',root);button.disabled=true;notice('Lecture IA du flyer…');
 try{
   const d=await saveReq('/api/v208/studio/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:a.url})});
   Object.entries(d.facts||{}).forEach(([k,v])=>{if(v&&Object.prototype.hasOwnProperty.call(S.facts,k))S.facts[k]=v;});
   if(d.facts?.title)S.title=d.facts.title;makeSlides();tab('brief');notice('Informations extraites : vérifie les dates et les informations avant publication.');
 }catch(e){notice('Analyse indisponible : '+e.message+' · saisis les informations manuellement.');}
 finally{button.disabled=false;}
}
async function generateCopy(){
 const b=q('#v208AICopy',root);if(b.disabled)return;
 const originalLabel=b.textContent;
 b.disabled=true;b.textContent='◌ IA en cours';b.setAttribute('aria-busy','true');
 notice('Création des textes IA à partir des informations du brief…');
 try{
   const d=await saveReq('/api/v208/studio/copy',{
     method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts:S.facts,count:S.slides.length})
   });
   if(!Array.isArray(d.slides)||!d.slides.length)throw Error('Aucune proposition reçue');
   // Update editorial copy only: preserve official media, custom layers, position, size and background.
   S.slides.forEach((doc,i)=>{
     const suggestion=d.slides[i];if(!suggestion)return;
     for(const [role,field] of [['title','title'],['kicker','kicker'],['detail','body']]){
       const block=doc.blocks.find(b=>b.type==='text'&&b.role===role);
       if(block&&typeof suggestion[field]==='string'&&suggestion[field].trim())block.text=suggestion[field].trim();
     }
   });
   if(typeof d.caption==='string'&&d.caption.trim())S.caption=d.caption;
   S.selected=null;changed();refreshUI();
   notice('Textes IA intégrés. Visuels, calques et arrière-plans préservés · vérifie les informations.');
 }catch(e){
   // No destructive fallback: manual work is never reset when the AI is unavailable.
   notice('IA momentanément indisponible : '+e.message+'. Les compositions et modifications sont conservées.');
 }finally{
   b.disabled=false;b.removeAttribute('aria-busy');b.textContent=originalLabel;
 }
}
function variantDoc(t,bg){const d=makeSlide(S.active,S.slides.length,t);d.background=bg||slide().background||'auto';const old=Object.fromEntries(slide().blocks.filter(b=>b.type==='text').map(b=>[b.role,b.text]));d.blocks.forEach(b=>{if(b.type==='text'&&old[b.role]!==undefined)b.text=old[b.role];});return d;}
function openVariants(){
 const m=q('#v208VariantModal',root);m.hidden=false;
 const choices=[0,1,2,3].map((x,i)=>({layout:templates[(templates.findIndex(t=>t[0]===slide().template)+i*3+1)%templates.length][0],scheme:(S.palette+i*3+1+schemes.length)%schemes.length,background:backgrounds[(backgrounds.findIndex(b=>b[0]===(slide().background||'auto'))+i*3+3)%backgrounds.length][0]}));
 q('#v208VariantGrid',root).innerHTML=choices.map((v,i)=>
 '<button type="button" class="v208-variant" data-variant="'+i+'"><canvas data-thumb="1"></canvas><span><b>'+esc(templates.find(x=>x[0]===v.layout)[1])+'</b><small>'+esc(schemes[v.scheme][0])+'</small></span></button>').join('');
 qa('[data-variant]',root).forEach(btn=>{
   const v=choices[Number(btn.dataset.variant)];draw(q('canvas',btn),variantDoc(v.layout,v.background),pal(v.scheme));
 });
 root._variantChoices=choices;
}
function applyVariant(i){
 const v=root._variantChoices[i];if(!v)return;
 S.palette=v.scheme;S.colors=pal(v.scheme);chooseTemplate(v.layout);slide().background=v.background;S.background=v.background;q('#v208VariantModal',root).hidden=true;changed();refreshUI();
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),20000);}
function blobOf(canvas,type='image/png',quality=.94){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image impossible à encoder')),type,quality));}
async function exportReady(){
 const urls=[...new Set(S.slides.flatMap(s=>s.blocks.filter(b=>b.type==='image'&&b.url).map(b=>b.url)))];
 await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{
   const cached=getImage(url);if(cached.image){resolve();return}if(cached.error){reject(Error('Image manquante'));return}
   const tmp=new Image();tmp.onload=resolve;tmp.onerror=()=>reject(Error('Image manquante : '+url));tmp.src=url;
 })));
}
function drawExport(doc){const c=document.createElement('canvas');draw(c,doc,S.colors);return c;}
async function exportSingle(type){
 try{
   notice('Export de la slide…');await exportReady();
   const c=drawExport(slide()),mime=type==='jpg'?'image/jpeg':'image/png';
   download(await blobOf(c,mime), 'PLUG_ART_slide_'+(S.active+1)+'.'+(type==='jpg'?'jpg':'png'));
   notice('Export '+type.toUpperCase()+' prêt · '+c.width+' × '+c.height);
 }catch(e){notice('Export impossible : '+e.message);}
}
function crc32(buf){
 let crc=-1;for(const byte of buf){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^(-1))>>>0;
}
function makeZip(files){
 const chunks=[],central=[];let offset=0,centralLen=0;const enc=new TextEncoder();
 for(const file of files){
  const name=enc.encode(file.name),data=file.raw,sum=crc32(data);
  const loc=new Uint8Array(30+name.length),dv=new DataView(loc.buffer);
  dv.setUint32(0,0x04034b50,true);dv.setUint16(4,20,true);dv.setUint16(6,0x800,true);
  dv.setUint32(14,sum,true);dv.setUint32(18,data.length,true);dv.setUint32(22,data.length,true);
  dv.setUint16(26,name.length,true);loc.set(name,30);chunks.push(loc,data);
  const c=new Uint8Array(46+name.length),dc=new DataView(c.buffer);dc.setUint32(0,0x02014b50,true);
  dc.setUint16(4,20,true);dc.setUint16(6,20,true);dc.setUint16(8,0x800,true);dc.setUint32(16,sum,true);
  dc.setUint32(20,data.length,true);dc.setUint32(24,data.length,true);dc.setUint16(28,name.length,true);
  dc.setUint32(42,offset,true);c.set(name,46);central.push(c);centralLen+=c.length;offset+=loc.length+data.length;
 }
 const end=new Uint8Array(22),de=new DataView(end.buffer);de.setUint32(0,0x06054b50,true);
 de.setUint16(8,files.length,true);de.setUint16(10,files.length,true);de.setUint32(12,centralLen,true);de.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type:'application/zip'});
}
async function exportAll(kind){
 const b=q(kind==='pdf'?'#v208ExportPDF':'#v208ExportZip',root);b.disabled=true;notice('Préparation des '+S.slides.length+' slides…');
 try{
   await exportReady();
   const canvases=S.slides.map(drawExport);
   if(kind==='pdf'){
     const pages=canvases.map(c=>c.toDataURL('image/jpeg',.90));
     const res=await fetch('/api/v208/studio/export/pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pages})});
     if(!res.ok){const error=await res.json().catch(()=>({}));throw Error(error.detail||'Export PDF indisponible');}
     download(await res.blob(),'PLUG_ART_'+S.slides.length+'_slides.pdf');notice('PDF exporté.');
   }else{
     const files=[];for(let i=0;i<canvases.length;i++)files.push({name:'slide_'+String(i+1).padStart(2,'0')+'.png',raw:new Uint8Array(await(await blobOf(canvases[i])).arrayBuffer())});
     const enc=new TextEncoder();files.push({name:'legende.txt',raw:enc.encode(S.caption||'')});
     files.push({name:'projet_v208.json',raw:enc.encode(JSON.stringify(snapshot(),null,2))});
     download(makeZip(files),'PLUG_ART_'+S.slides.length+'_slides.zip');notice('Carrousel ZIP exporté · PNG haute résolution + projet éditable.');
   }
 }catch(e){notice('Export interrompu : '+e.message);}finally{b.disabled=false;}
}
function html(){
 return '<div class="v208-top"><div><div class="v208-kicker">PLUG ART / Production éditoriale · V208</div><h2 class="v208-heading">CRÉATION <span style="font-weight:360;color:#2854e8">STUDIO.</span></h2><div class="v208-deck">Typographie manifeste · Flyers officiels · Palettes libres · Composition éditable.</div></div>'+
 '<div class="v208-top-actions"><span class="v208-status" id="v208Status" role="status">Prêt à composer</span><button class="v208-btn" data-action="new">＋ Nouveau</button><select id="v208Projects" class="v208-select" aria-label="Projets sauvegardés"><option>Projets…</option></select><button class="v208-btn v208-btn-primary" data-action="save">Enregistrer</button></div></div>'+
 '<div class="v208-grid"><aside class="v208-side"><div class="v208-side-title"><strong>Direction & sources</strong><small>01 / 06</small></div>'+
 '<div class="v208-tabs" role="tablist">'+[['brief','Brief'],['sources','Sources'],['styles','DA'],['colors','Couleurs'],['backgrounds','Fonds'],['format','Format']].map(([key,label])=>
 '<button type="button" data-v208-tab="'+key+'" aria-selected="'+(key==='brief')+'">'+label+'</button>').join('')+'</div>'+
 '<div class="v208-tab-panel" data-v208-panel="brief">'+
 '<label class="v208-field">Projet<input id="v208ProjectName" placeholder="Nom du projet"></label>'+
 '<label class="v208-field">Source Radar<select id="v208Radar"><option value="">Brief libre · choisir une source Radar</option></select></label>'+
 [['title','Titre / exposition'],['city','Ville'],['venue','Lieu / galerie'],['deadline','Date limite'],['event_dates','Dates de l’exposition'],['fee','Frais de candidature'],['disciplines','Disciplines'],['eligibility','Conditions'],['description','Description / faits'],['source_url','Lien officiel'],['cta','Appel à l’action']].map(([key,label])=>
 '<label class="v208-field">'+label+(key==='description'||key==='eligibility'?'<textarea data-v208-fact="'+key+'" rows="3"></textarea>':'<input data-v208-fact="'+key+'" placeholder="'+esc(label)+'">')+'</label>').join('')+
 '<button class="v208-btn v208-btn-primary" style="width:100%" data-action="regenerate">✦ Composer les slides</button>'+
 '<p class="v208-note">Les données importées doivent être vérifiées avec l’annonce officielle avant publication.</p></div>'+
 '<div class="v208-tab-panel" data-v208-panel="sources" hidden><label class="v208-field">Type de source<select id="v208AssetRole"><option>Flyer officiel</option><option>Photographie officielle</option><option>Visuel officiel secondaire</option><option>Logo du lieu</option></select></label>'+
 '<label class="v208-drop"><strong>＋ Importer les médias officiels</strong><span>PNG, JPG, WebP · 10 Mo max par image</span><input id="v208Upload" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>'+
 '<div id="v208AssetList" class="v208-assets"></div>'+
 '<div class="v208-bottom-actions"><button class="v208-btn" id="v208Extract" data-action="extract">✦ Analyser le flyer avec l’IA</button><button class="v208-btn" data-action="remove-asset">Retirer l’image</button></div>'+
 '<p class="v208-note">Images originales conservées dans leur fichier importé. Indique la source et assure-toi de disposer du droit de publication.</p></div>'+
 '<div class="v208-tab-panel" data-v208-panel="styles" hidden><p class="v208-note">12 compositions à l’esprit affiche culturelle, toutes éditables.</p><div class="v208-templates" id="v208Templates"></div></div>'+
 '<div class="v208-tab-panel" data-v208-panel="colors" hidden><p class="v208-note">14 ambiances prêtes à utiliser. Personnalise chaque couleur, puis décline une composition.</p><div class="v208-palettes" id="v208Palettes"></div>'+
 '<div class="v208-subtitle">Nuancier libre</div><div class="v208-color-editor" id="v208CustomColors"></div>'+
 '<div class="v208-bottom-actions"><button class="v208-btn" data-action="random-palette">Palette surprise</button><button class="v208-btn" data-action="variants">4 propositions</button></div></div>'+
 '<div class="v208-tab-panel" data-v208-panel="backgrounds" hidden><p class="v208-note">12 familles visuelles réellement différentes. Chaque slide peut avoir son propre arrière-plan.</p><div class="v208-background-grid" id="v208Backgrounds"></div>'+ 
  '<label class="v208-field v208-texture-label">Texture de papier <span id="v208TextureValue">42 %</span><input id="v208Texture" type="range" min="0" max="100" step="1" value="42"></label>'+ 
  '<button type="button" class="v208-btn" data-action="background-all">Appliquer ce fond à tout le carrousel</button></div>'+ 
  '<div class="v208-tab-panel" data-v208-panel="format" hidden><label class="v208-field">Format<select id="v208Format"><option value="4:5">Instagram portrait 1080 × 1350</option><option value="1:1">Carré 1080 × 1080</option><option value="9:16">Story 1080 × 1920</option></select></label>'+
 '<label class="v208-field">Nombre de slides<select id="v208Count"><option value="1">1 publication</option><option value="3">3 slides</option><option value="5">5 slides</option><option value="7">7 slides</option></select></label>'+
 '<div class="v208-bottom-actions"><button class="v208-btn v208-btn-primary" data-action="regenerate">Recomposer</button><button class="v208-btn" data-action="variants">4 variantes</button></div></div></aside>'+
 '<section class="v208-stage"><div class="v208-stage-toolbar"><strong id="v208SlideInfo">Slide 1 / 5</strong><div><button class="v208-btn" data-action="variants">◈ Variantes</button><button class="v208-btn v208-btn-primary" data-action="ai-copy" id="v208AICopy">✦ Textes IA</button></div></div>'+
 '<div class="v208-canvas-shell"><canvas id="v208Canvas" width="1080" height="1350" role="img" aria-label="Aperçu éditable de la publication"></canvas></div>'+
 '<div class="v208-stage-caption"><span>Glisse les calques directement sur le visuel.</span><span>Rendu réel · haute définition</span></div>'+
 '<div id="v208SlideRail" class="v208-slide-rail"></div></section>'+
 '<aside class="v208-side v208-inspector-side"><div class="v208-inspector-layout"><div><div class="v208-side-title"><strong>Éléments & calques</strong><small>02 / 06</small></div>'+
 '<div class="v208-bottom-actions"><button class="v208-btn" data-action="add-text">＋ Texte</button><button class="v208-btn" data-action="add-image">＋ Image</button><button class="v208-btn" data-action="add-shape">＋ Forme</button></div>'+
 '<div class="v208-subtitle">Ordre de composition</div><div class="v208-layer-list" id="v208Layers"></div></div>'+
 '<div><div class="v208-divider"></div><div class="v208-side-title"><strong>Éditeur de propriétés</strong><small>03 / 06</small></div><div class="v208-inspector" id="v208Inspector"></div>'+
 '<div class="v208-divider"></div><div class="v208-subtitle">Légende Instagram</div><label class="v208-field"><textarea id="v208Caption" rows="4" placeholder="Texte à publier…"></textarea></label>'+
 '<div class="v208-subtitle">Exporter</div><div class="v208-bottom-actions"><button class="v208-btn" data-action="png">PNG</button><button class="v208-btn" data-action="jpg">JPG</button><button class="v208-btn" id="v208ExportZip" data-action="zip">ZIP</button><button class="v208-btn" id="v208ExportPDF" data-action="pdf">PDF</button></div></div></div></aside></div>'+
 '<div class="v208-legacy-section"><div><strong>Éditeur classique V207</strong><div>Accessible pour reprendre tes anciens brouillons et carrousels.</div></div><button type="button" class="v208-btn" id="v208LegacyToggle">Afficher l’éditeur classique</button></div>'+
 '<div class="v208-modal" id="v208VariantModal" hidden><div class="v208-modal-inner"><div class="v208-modal-header"><div><div class="v208-kicker">Variantes éditoriales</div><h3>4 directions, un même contenu.</h3></div><button type="button" class="v208-btn" data-action="close-modal">Fermer</button></div><div class="v208-variant-grid" id="v208VariantGrid"></div></div></div>';
}
function install(){
 if(ready||!q('#view-creation'))return;
 root=document.createElement('section');root.id='v208Studio';root.setAttribute('aria-label','PLUG ART Création Studio V208');
 root.innerHTML=html();
 const view=q('#view-creation'),legacy=q('#creationV200');
 if(legacy)view.insertBefore(root,legacy);else view.appendChild(root);
 ready=true;S=defaults();
 try{const saved=JSON.parse(localStorage.getItem('plugart:v208:working')||'null');if(saved?.payload?.editor==='v208')setData(saved);}catch(_){}
 if(!S.slides.length)S.slides=Array.from({length:S.count},(_,i)=>makeSlide(i,S.count));
 refreshUI();
 loadProjects();loadRadar();
 root.addEventListener('click',async e=>{
   const t=e.target.closest('[data-v208-tab]');if(t){tab(t.dataset.v208Tab);return;}
   const tmpl=e.target.closest('[data-template]');if(tmpl){chooseTemplate(tmpl.dataset.template);return;}
   const palEl=e.target.closest('[data-palette]');if(palEl){S.palette=Number(palEl.dataset.palette);S.colors=pal(S.palette);changed();renderPalettes();renderBackgrounds();return;}
   const bg=e.target.closest('[data-background]');if(bg){slide().background=bg.dataset.background;S.background=bg.dataset.background;changed();renderBackgrounds();return;}
    const asset=e.target.closest('[data-asset]');if(asset){S.activeAsset=Number(asset.dataset.asset);slide().blocks.filter(b=>b.type==='image').forEach(b=>b.url=assetURL());changed();renderAssets();renderLayers();inspector();return;}
   const thumb=e.target.closest('[data-v208-thumb]');if(thumb){S.active=Number(thumb.dataset.v208Thumb);S.selected=null;refreshUI();return;}
   const layer=e.target.closest('[data-layer]');if(layer){selectLayer(layer.dataset.layer);return;}
   const v=e.target.closest('[data-variant]');if(v){applyVariant(Number(v.dataset.variant));return;}
   const a=e.target.closest('[data-action]');if(!a)return;
   switch(a.dataset.action){
     case 'new':S=defaults();makeSlides();tab('brief');notice('Nouveau projet.');break;
     case 'save':await saveProject();break;
     case 'regenerate':makeSlides();break;
     case 'extract':await extractFacts();break;
     case 'ai-copy':await generateCopy();break;
     case 'variants':openVariants();break;
     case 'close-modal':q('#v208VariantModal',root).hidden=true;break;
     case 'background-all':S.slides.forEach(d=>d.background=slide().background||S.background);changed();refreshUI();notice('Arrière-plan appliqué à toutes les slides.');break;
      case 'random-palette':S.palette=Math.floor(Math.random()*schemes.length);S.colors=pal(S.palette);changed();renderPalettes();renderBackgrounds();break;
     case 'add-text':addLayer('text');break;
     case 'add-image':addLayer('image');break;
     case 'add-shape':addLayer('shape');break;
     case 'add-slide':if(S.slides.length<12){S.slides.push(makeSlide(S.slides.length,S.slides.length+1,'editorial'));S.active=S.slides.length-1;S.selected=null;changed();refreshUI();}else notice('Maximum 12 slides.');break;
     case 'duplicate-layer':{const b=slide().blocks.find(b=>b.id===S.selected);if(b){const n=JSON.parse(JSON.stringify(b));n.id=uid();n.x+=24;n.y+=24;slide().blocks.push(n);selectLayer(n.id);changed();renderLayers();}}break;
     case 'delete-layer':if(S.selected){slide().blocks=slide().blocks.filter(b=>b.id!==S.selected);S.selected=null;changed();renderLayers();inspector();}break;
     case 'remove-asset':if(S.activeAsset>=0){const url=assetURL();S.assets.splice(S.activeAsset,1);S.activeAsset=S.assets.length?0:-1;S.slides.forEach(d=>d.blocks.filter(b=>b.type==='image'&&b.url===url).forEach(b=>b.url=assetURL()));changed();renderAssets();}break;
     case 'png':await exportSingle('png');break;
     case 'jpg':await exportSingle('jpg');break;
     case 'zip':await exportAll('zip');break;
     case 'pdf':await exportAll('pdf');break;
   }
 });
 root.addEventListener('input',e=>{
   const f=e.target.dataset.v208Fact;if(f){S.facts[f]=e.target.value;changed();return;}
   if(e.target.id==='v208ProjectName'){S.title=e.target.value;changed();return;}
   if(e.target.id==='v208Caption'){S.caption=e.target.value;changed();return;}
   if(e.target.id==='v208Texture'){S.texture=clamp(e.target.value,0,100);q('#v208TextureValue',root).textContent=S.texture+' %';changed();return;}
    const slot=e.target.dataset.color;if(slot){S.colors[slot]=e.target.value;S.palette=-1;changed();return;}
   const prop=e.target.dataset.property;
   if(prop){const b=slide().blocks.find(x=>x.id===S.selected);if(!b)return;
     if(['x','y','w','h','size','weight','opacity'].includes(prop))b[prop]=Number(e.target.value);
     else b[prop]=e.target.value;
     changed();
     if(prop==='text'||prop==='role')renderLayers();
   }
 });
 root.addEventListener('change',async e=>{
   if(e.target.id==='v208Radar'){fillFromRadar(e.target.value);return;}
   if(e.target.id==='v208Format'){S.format=e.target.value;makeSlides();return;}
   if(e.target.id==='v208Count'){S.count=Number(e.target.value);makeSlides();return;}
   if(e.target.id==='v208Projects'&&e.target.value){
     try{const d=await saveReq('/api/v208/studio/projects/'+e.target.value);setData(d.project);}catch(error){notice(error.message);}
   }
   if(e.target.id==='v208Upload'){
     for(const file of Array.from(e.target.files||[]).slice(0,6)){
       try{await upload(file)}catch(error){notice('Import impossible : '+error.message);}
     }
     e.target.value='';
   }
   if(e.target.dataset.property){renderLayers();inspector();}
 });
 const canvas=q('#v208Canvas',root);
 canvas.addEventListener('pointerdown',pointerStart);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerEnd);
 canvas.addEventListener('pointercancel',pointerEnd);
 const classic=q('#v208LegacyToggle',root);
 classic.addEventListener('click',()=>{
   const legacy=q('#creationV200');if(!legacy)return;
   const open=legacy.classList.toggle('v208-legacy-open');classic.textContent=open?'Masquer l’éditeur classique':'Afficher l’éditeur classique';
   try{localStorage.setItem('plugart:v208:legacy',open?'1':'0')}catch(_){}
 });
 try{if(localStorage.getItem('plugart:v208:legacy')==='1'){classic.click()}}catch(_){}
 document.addEventListener('plugart:campaign',e=>{
   if(!e.detail||S.facts.title||!e.detail.payload?.facts)return;
   const f=e.detail.payload.facts;
   S.facts.title=f.name||'';S.facts.venue=f.place||'';S.facts.event_dates=f.date||'';S.facts.description=f.brief||'';
   S.title=S.facts.title||S.title;makeSlides();
 });
 window.PLUGART_V208={activate:()=>{install();tab('brief')},snapshot:()=>snapshot(),applyRadar:fillFromRadar};
 console.info('[PLUG ART] V208 Studio initialized',VERSION);
}
function boot(){
 if(document.body?.dataset.view==='creation')install();
 document.addEventListener('plugart:route',e=>{if(e.detail?.route==='creation'||document.body?.dataset.view==='creation')install();});
 document.addEventListener('click',e=>{
   if(e.target.closest('[data-route="creation"],[data-v200-go="creation"]'))setTimeout(install,0);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();