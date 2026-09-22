
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,state}=P;
let selected=new Set(),freeMode=true,history=[],future=[];
const current=()=>state.slides?.[state.slide]||null;
const layers=()=>{const s=current();if(!s)return[];if(!Array.isArray(s.layers))s.layers=[];return s.layers};
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const snap=()=>JSON.stringify(layers());
function commit(){const v=snap();if(history[history.length-1]!==v){history.push(v);if(history.length>40)history.shift();future=[]}syncButtons()}
function restore(v){if(!current())return;current().layers=JSON.parse(v);selected.clear();render()}
function undo(){if(history.length<2)return;future.push(history.pop());restore(history[history.length-1])}
function redo(){if(!future.length)return;const v=future.pop();history.push(v);restore(v)}
function syncButtons(){if(q('#layerUndo'))q('#layerUndo').disabled=history.length<2;if(q('#layerRedo'))q('#layerRedo').disabled=!future.length}
function chosen(){return layers().filter(x=>selected.has(String(x.id)))}
function primary(){const a=chosen();return a[a.length-1]||null}
function add(type,extra={}){
  commit();
  const l={id:Date.now()+Math.random(),type,x:20,y:20,w:type==='text'?46:28,h:type==='text'?14:22,color:type==='text'?'#111111':'#2255ff',opacity:1,fontSize:64,text:type==='text'?'Nouveau texte':'',rotation:0,locked:false,...extra};
  layers().push(l);selected=new Set([String(l.id)]);commit();render();
}
function updateEditor(){
  const l=primary();if(!l)return;
  const set=(id,v)=>{const e=q('#'+id);if(e)e.value=v};
  set('layerText',l.type==='text'?l.text:l.type);set('layerColor',l.color||'#111111');set('layerFontSize',l.fontSize||64);set('layerWidth',l.w||30);set('layerHeight',l.h||20);set('layerOpacity',Math.round((l.opacity??1)*100));set('layerRotation',l.rotation||0);
  if(q('#layerLock'))q('#layerLock').textContent=l.locked?'Déverrouiller':'Verrouiller';
}
function guide(x=null,y=null){
  const gx=q('#guideX'),gy=q('#guideY');
  if(gx){gx.hidden=x==null;if(x!=null)gx.style.left=x+'%'}
  if(gy){gy.hidden=y==null;if(y!=null)gy.style.top=y+'%'}
}
function snapXY(l,x,y){
  let gx=null,gy=null;
  if(Math.abs(x+l.w/2-50)<1.3){x=50-l.w/2;gx=50}
  if(Math.abs(y+l.h/2-50)<1.3){y=50-l.h/2;gy=50}
  guide(gx,gy);return[x,y];
}
function render(){
  const board=q('#freeLayerBoard');if(!board)return;
  board.style.setProperty('--layer-scale',Math.max(.18,board.clientWidth/1080).toFixed(4));
  board.classList.toggle('disabled',!freeMode);
  board.innerHTML='<i id="guideX" class="snap-guide vertical" hidden></i><i id="guideY" class="snap-guide horizontal" hidden></i>'+layers().map((l,i)=>{
    const sel=selected.has(String(l.id)),common='left:'+l.x+'%;top:'+l.y+'%;width:'+l.w+'%;height:'+l.h+'%;opacity:'+(l.opacity??1)+';z-index:'+(20+i)+';transform:rotate('+(l.rotation||0)+'deg);';
    const handles=sel&&!l.locked?'<i class="layer-resize" data-resize="'+l.id+'"></i><i class="layer-rotate" data-rotate="'+l.id+'"></i>':'';
    const cls='free-layer '+(l.type==='text'?'text':l.type==='image'?'image':'shape '+l.type)+(sel?' selected':'')+(l.locked?' locked':'');
    if(l.type==='text')return '<div class="'+cls+'" data-layer="'+l.id+'" style="'+common+'color:'+esc(l.color)+';font-size:calc('+Number(l.fontSize||64)+'px * var(--layer-scale,.38));">'+esc(l.text||'Texte')+handles+'</div>';
    if(l.type==='image')return '<div class="'+cls+'" data-layer="'+l.id+'" style="'+common+'background-image:url(&quot;'+esc(l.src||'')+'&quot;)">'+handles+'</div>';
    return '<div class="'+cls+'" data-layer="'+l.id+'" style="'+common+'background:'+esc(l.color)+'">'+handles+'</div>';
  }).join('');
  const list=q('#layerList');
  if(list)list.innerHTML=layers().slice().reverse().map(l=>'<button class="'+(selected.has(String(l.id))?'active':'')+'" data-layer-select="'+l.id+'"><span>'+({text:'T',image:'▧',rect:'▭',circle:'○'}[l.type]||'•')+'</span>'+esc(l.type==='text'?(l.text||'Texte'):(l.type==='image'?'Image':l.type))+(l.locked?' 🔒':'')+'</button>').join('')||'<div class="empty-line">Aucun calque libre.</div>';
  qa('[data-layer-select]').forEach(b=>b.onclick=e=>{const id=String(b.dataset.layerSelect);if(e.shiftKey){selected.has(id)?selected.delete(id):selected.add(id)}else selected=new Set([id]);render()});
  qa('#freeLayerBoard [data-layer]').forEach(el=>{
    el.onclick=e=>{if(e.target.closest('.layer-resize,.layer-rotate'))return;const id=String(el.dataset.layer);if(e.shiftKey){selected.has(id)?selected.delete(id):selected.add(id)}else selected=new Set([id]);render()};
    el.onpointerdown=e=>{
      if(!freeMode||e.target.closest('.layer-resize,.layer-rotate'))return;
      const l=layers().find(x=>String(x.id)===String(el.dataset.layer));if(!l||l.locked)return;
      e.preventDefault();if(!selected.has(String(l.id)))selected=new Set([String(l.id)]);
      const before=snap(),rect=board.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,items=chosen().map(x=>({x,ox:Number(x.x),oy:Number(x.y)}));el.setPointerCapture?.(e.pointerId);
      const move=ev=>{const dx=(ev.clientX-sx)/rect.width*100,dy=(ev.clientY-sy)/rect.height*100;items.forEach(it=>{let nx=Math.max(0,Math.min(100-it.x.w,it.ox+dx)),ny=Math.max(0,Math.min(100-it.x.h,it.oy+dy));if(items.length===1)[nx,ny]=snapXY(it.x,nx,ny);it.x.x=nx;it.x.y=ny;const n=board.querySelector('[data-layer="'+it.x.id+'"]');if(n){n.style.left=nx+'%';n.style.top=ny+'%'}})};
      const up=()=>{guide();el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);if(before!==snap()){if(history[history.length-1]!==before)history.push(before);commit()}render()};
      el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);
    };
  });
  qa('[data-resize]').forEach(h=>h.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();const l=layers().find(x=>String(x.id)===String(h.dataset.resize));if(!l||l.locked)return;const before=snap(),rect=board.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ow=l.w,oh=l.h;h.setPointerCapture?.(e.pointerId);
    const move=ev=>{l.w=Math.max(5,Math.min(100-l.x,ow+(ev.clientX-sx)/rect.width*100));l.h=Math.max(5,Math.min(100-l.y,oh+(ev.clientY-sy)/rect.height*100));h.parentElement.style.width=l.w+'%';h.parentElement.style.height=l.h+'%'};
    const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);if(before!==snap()){if(history[history.length-1]!==before)history.push(before);commit()}render()};h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);
  });
  qa('[data-rotate]').forEach(h=>h.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();const l=layers().find(x=>String(x.id)===String(h.dataset.rotate));if(!l||l.locked)return;const before=snap(),r=h.parentElement.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;h.setPointerCapture?.(e.pointerId);
    const move=ev=>{let d=Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI+90;if(ev.shiftKey)d=Math.round(d/15)*15;l.rotation=Math.round(d);h.parentElement.style.transform='rotate('+l.rotation+'deg)'};
    const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);if(before!==snap()){if(history[history.length-1]!==before)history.push(before);commit()}render()};h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);
  });
  updateEditor();syncButtons();
}
q('#freeModeToggle')?.addEventListener('click',e=>{freeMode=!freeMode;e.currentTarget.classList.toggle('active',freeMode);render()});
q('#addTextLayer')?.addEventListener('click',()=>add('text'));q('#addRectLayer')?.addEventListener('click',()=>add('rect'));q('#addCircleLayer')?.addEventListener('click',()=>add('circle',{w:22,h:22}));q('#addImageLayer')?.addEventListener('click',()=>q('#freeImageUpload')?.click());
q('#freeImageUpload')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>add('image',{src:r.result,w:38,h:30});r.readAsDataURL(f);e.target.value=''});
[['layerText','text',v=>v],['layerColor','color',v=>v],['layerFontSize','fontSize',Number],['layerWidth','w',Number],['layerHeight','h',Number],['layerOpacity','opacity',v=>Number(v)/100],['layerRotation','rotation',Number]].forEach(([id,key,fn])=>q('#'+id)?.addEventListener('change',()=>{const all=chosen();if(!all.length)return;commit();all.forEach(l=>{if(key==='text'&&l.type!=='text')return;l[key]=fn(q('#'+id).value)});commit();render()}));
q('#layerDelete')?.addEventListener('click',()=>{if(!selected.size)return;commit();current().layers=layers().filter(x=>!selected.has(String(x.id)));selected.clear();commit();render()});
q('#layerFront')?.addEventListener('click',()=>{const all=chosen();if(!all.length)return;commit();current().layers=[...layers().filter(x=>!selected.has(String(x.id))),...all];commit();render()});
q('#layerBack')?.addEventListener('click',()=>{const all=chosen();if(!all.length)return;commit();current().layers=[...all,...layers().filter(x=>!selected.has(String(x.id)))];commit();render()});
q('#layerDuplicate')?.addEventListener('click',()=>{const all=chosen();if(!all.length)return;commit();const copies=all.map(l=>({...JSON.parse(JSON.stringify(l)),id:Date.now()+Math.random(),x:Math.min(94,l.x+3),y:Math.min(94,l.y+3),locked:false}));layers().push(...copies);selected=new Set(copies.map(x=>String(x.id)));commit();render()});
q('#layerLock')?.addEventListener('click',()=>{const all=chosen();if(!all.length)return;commit();const next=!all.every(x=>x.locked);all.forEach(x=>x.locked=next);commit();render()});
q('#layerUndo')?.addEventListener('click',undo);q('#layerRedo')?.addEventListener('click',redo);
q('#studioTemplate')?.addEventListener('change',e=>{const name=e.target.value;if(!name||name==='none')return;commit();current().layers=[];if(name==='open'){add('rect',{x:7,y:8,w:30,h:4,color:'#2255ff'});add('text',{x:7,y:14,w:72,h:13,fontSize:82,text:'OPEN CALL'})}if(name==='deadline'){add('rect',{x:0,y:0,w:100,h:100,color:'#111111',opacity:.16});add('text',{x:8,y:12,w:82,h:18,color:'#ffffff',fontSize:108,text:'DERNIER JOUR'})}if(name==='artist'){add('circle',{x:70,y:8,w:20,h:20,color:'#a77bf3',opacity:.25});add('text',{x:8,y:12,w:66,h:14,fontSize:76,text:'FOCUS ARTISTE'})}selected.clear();commit();render()});
addEventListener('keydown',e=>{const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='d'&&!typing&&document.body.dataset.view==='studio'){e.preventDefault();q('#layerDuplicate')?.click()}});
const counter=q('#studioCounter');if(counter)new MutationObserver(()=>{selected.clear();history=[snap()];future=[];render()}).observe(counter,{childList:true,subtree:true});
const board=q('#freeLayerBoard');if(board)new ResizeObserver(render).observe(board);
P.ready.then(()=>{history=[snap()];setTimeout(render,80)});
})();
