
(function(){
'use strict';
const P=window.PLUG65;if(!P)return;
const {q,qa,state}=P;
let selectedId=null,freeMode=true;
const current=()=>state.slides?.[state.slide]||null;
function layers(){const s=current();if(!s)return[];if(!Array.isArray(s.layers))s.layers=[];return s.layers}
function selected(){return layers().find(x=>String(x.id)===String(selectedId))}
function add(type,extra={}){
  const l={id:Date.now()+Math.random(),type:type,x:20,y:20,w:type==='text'?48:28,h:type==='text'?16:22,color:type==='text'?'#111111':'#2255ff',opacity:1,fontSize:64,text:type==='text'?'Nouveau texte':'',...extra};
  layers().push(l);selectedId=l.id;render();
}
function editorSync(){
  const l=selected();if(!l)return;const set=(id,v)=>{const e=q('#'+id);if(e)e.value=v};
  set('layerText',l.type==='text'?l.text:(l.type==='image'?'Image':l.type));set('layerColor',l.color||'#111111');set('layerFontSize',l.fontSize||64);set('layerWidth',l.w||30);set('layerHeight',l.h||20);set('layerOpacity',Math.round((l.opacity??1)*100));
}
function clean(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){
  const board=q('#freeLayerBoard');if(!board)return;board.classList.toggle('disabled',!freeMode);
  board.innerHTML=layers().map((l,i)=>{
    const sel=String(l.id)===String(selectedId)?' selected':'';
    const common='left:'+Number(l.x)+'%;top:'+Number(l.y)+'%;width:'+Number(l.w)+'%;height:'+Number(l.h)+'%;opacity:'+Number(l.opacity??1)+';z-index:'+(20+i)+';';
    if(l.type==='text')return '<div class="free-layer text'+sel+'" data-layer="'+l.id+'" style="'+common+'color:'+String(l.color||'#111111')+';font-size:calc('+Number(l.fontSize||64)+'px * var(--layer-scale,.38));">'+clean(l.text||'Texte')+'</div>';
    if(l.type==='image')return '<div class="free-layer image'+sel+'" data-layer="'+l.id+'" style="'+common+'background-image:url(&quot;'+String(l.src||'').replace(/"/g,'&quot;')+'&quot;)"></div>';
    return '<div class="free-layer shape '+l.type+sel+'" data-layer="'+l.id+'" style="'+common+'background:'+String(l.color||'#2255ff')+'"></div>';
  }).join('');
  const list=q('#layerList');if(list)list.innerHTML=layers().slice().reverse().map(l=>'<button class="'+(String(l.id)===String(selectedId)?'active':'')+'" data-layer-select="'+l.id+'"><span>'+({text:'T',image:'▧',rect:'▭',circle:'○'}[l.type]||'•')+'</span>'+clean(l.type==='text'?(l.text||'Texte'):(l.type==='image'?'Image':l.type))+'</button>').join('')||'<div class="empty-line">Aucun calque libre.</div>';
  qa('[data-layer-select]').forEach(b=>b.onclick=()=>{selectedId=b.dataset.layerSelect;render()});
  qa('#freeLayerBoard [data-layer]').forEach(el=>{
    el.onclick=()=>{selectedId=el.dataset.layer;render()};
    el.onpointerdown=e=>{
      if(!freeMode)return;e.preventDefault();selectedId=el.dataset.layer;editorSync();
      const l=selected();if(!l)return;const rect=board.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=Number(l.x),oy=Number(l.y);el.setPointerCapture?.(e.pointerId);
      const move=ev=>{l.x=Math.max(0,Math.min(100-Number(l.w),ox+(ev.clientX-sx)/rect.width*100));l.y=Math.max(0,Math.min(100-Number(l.h),oy+(ev.clientY-sy)/rect.height*100));el.style.left=l.x+'%';el.style.top=l.y+'%'};
      const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);render()};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);
    };
  });
  editorSync();
}
q('#freeModeToggle')?.addEventListener('click',e=>{freeMode=!freeMode;e.currentTarget.classList.toggle('active',freeMode);render()});
q('#addTextLayer')?.addEventListener('click',()=>add('text'));q('#addRectLayer')?.addEventListener('click',()=>add('rect'));q('#addCircleLayer')?.addEventListener('click',()=>add('circle',{w:22,h:22}));
q('#addImageLayer')?.addEventListener('click',()=>q('#freeImageUpload')?.click());
q('#freeImageUpload')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>add('image',{src:r.result,w:38,h:30});r.readAsDataURL(f);e.target.value=''});
[['layerText','text',v=>v],['layerColor','color',v=>v],['layerFontSize','fontSize',v=>Number(v)],['layerWidth','w',v=>Number(v)],['layerHeight','h',v=>Number(v)],['layerOpacity','opacity',v=>Number(v)/100]].forEach(([id,key,fn])=>q('#'+id)?.addEventListener('input',()=>{const l=selected();if(!l)return;if(key==='text'&&l.type!=='text')return;l[key]=fn(q('#'+id).value);render()}));
q('#layerDelete')?.addEventListener('click',()=>{const a=layers(),i=a.findIndex(x=>String(x.id)===String(selectedId));if(i>=0)a.splice(i,1);selectedId=null;render()});
q('#layerFront')?.addEventListener('click',()=>{const a=layers(),i=a.findIndex(x=>String(x.id)===String(selectedId));if(i>=0){a.push(a.splice(i,1)[0]);render()}});
q('#layerBack')?.addEventListener('click',()=>{const a=layers(),i=a.findIndex(x=>String(x.id)===String(selectedId));if(i>=0){a.unshift(a.splice(i,1)[0]);render()}});
const counter=q('#studioCounter');if(counter)new MutationObserver(render).observe(counter,{childList:true,subtree:true});window.addEventListener('resize',render,{passive:true});P.ready.then(()=>setTimeout(render,80));
})();
