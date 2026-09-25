(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const STORAGE='plugart:plugy:v130:history';
const state={mode:'fast',history:[],busy:false,listening:false,voiceReply:true,recognition:null,pressTimer:0,lastTap:0};
const mv=$('#plugyStandaloneModel'),chat=$('#chatScroll'),input=$('#plugyStandaloneInput'),form=$('#plugyStandaloneForm');

function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function setState(name,label){
  document.body.dataset.plugyState=name;
  $('#plugyLiveState span').textContent=label;$('#topState').textContent=label;
  const animMap={idle:'Idle',listen:'Listen',think:'ArmThink',speak:'Speak',happy:'Happy',curious:'Curious',wave:'ArmHello',charge:'Charge',blink:'Blink',doubleblink:'DoubleBlink',wink:'Wink',softeyes:'SoftEyes',softturn:'SoftTurn',explain:'ArmExplain',shrug:'ArmShrug',stretch:'ArmStretch'};
  const target=animMap[name]||'Idle',run=()=>{
    try{
      const a=mv?.availableAnimations||[],pick=a.includes(target)?target:(a.includes('Idle')?'Idle':a[0]);
      if(pick){mv.setAttribute('animation-crossfade-duration',['blink','doubleblink','wink','softeyes'].includes(name)?'35':'80');try{if(mv.animationName!==pick){mv.pause();mv.currentTime=0}}catch{}mv.animationName=pick;mv.timeScale=['blink','doubleblink','wink'].includes(name)?1.12:(name==='think'||name==='charge')?.92:1;mv.play({repetitions:['idle','listen','speak'].includes(name)?Infinity:1})}
    }catch{}
  };
  if(mv?.loaded)run();else mv?.addEventListener('load',run,{once:true});
}
function tuneMaterials(){
  try{
    (mv?.model?.materials||[]).forEach(mat=>{
      try{mat.pbrMetallicRoughness?.setMetallicFactor?.(0)}catch{}
      try{mat.pbrMetallicRoughness?.setRoughnessFactor?.(1)}catch{}
      try{mat.clearcoat?.setClearcoatFactor?.(0)}catch{}
      try{mat.clearcoat?.setClearcoatRoughnessFactor?.(1)}catch{}
      try{mat.specular?.setSpecularFactor?.(0)}catch{}
    });
    mv.setAttribute('exposure','.70');mv.setAttribute('shadow-intensity','0');mv.setAttribute('shadow-softness','1');
  }catch{}
}
function saveHistory(){try{localStorage.setItem(STORAGE,JSON.stringify(state.history.slice(-30)))}catch{}}
function loadHistory(){
  try{
    const h=JSON.parse(localStorage.getItem(STORAGE)||'[]');
    if(Array.isArray(h))state.history=h.filter(x=>x&&['user','assistant'].includes(x.role)&&x.content).slice(-30);
  }catch{}
}
function messageNode(role,text,streaming=false){
  const wrap=document.createElement('div');wrap.className='chat-message '+role;
  if(role==='assistant'){const av=document.createElement('div');av.className='avatar';av.textContent='P';wrap.appendChild(av)}
  const copy=document.createElement('div');copy.className='message-copy'+(streaming?' typing-cursor':'');copy.textContent=text||'';wrap.appendChild(copy);chat.appendChild(wrap);scrollChat();return{wrap,copy}
}
function renderHistory(){
  if(!state.history.length)return;
  chat.innerHTML='';state.history.forEach(x=>messageNode(x.role,x.content,false));
}
function scrollChat(){requestAnimationFrame(()=>{chat.scrollTop=chat.scrollHeight;window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'})})}
function autoGrow(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px'}
function speak(text){
  if(!state.voiceReply||!('speechSynthesis'in window)||!clean(text)){setState('idle','Prêt');return}
  try{
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean(text));u.lang='fr-FR';u.rate=1.13;u.pitch=1;
    u.onstart=()=>setState('speak','Je parle…');u.onend=()=>{setState('idle','Prêt');if(state.listening===false&&$('#voiceButton')?.classList.contains('conversation'))setTimeout(startVoice,380)};
    u.onerror=()=>setState('idle','Prêt');speechSynthesis.speak(u);
  }catch{setState('idle','Prêt')}
}
function parseSSEBlock(block,onDelta,onDone){
  let event='',data='';
  block.split('\n').forEach(line=>{if(line.startsWith('event:'))event=line.slice(6).trim();if(line.startsWith('data:'))data+=line.slice(5).trim()});
  if(!data)return;try{const obj=JSON.parse(data);if(event==='delta')onDelta(obj.delta||'');if(event==='done')onDone(obj)}catch{}
}
async function ask(text){
  text=clean(text);if(!text||state.busy)return;
  state.busy=true;input.value='';autoGrow();messageNode('user',text);state.history.push({role:'user',content:text});saveHistory();
  const node=messageNode('assistant','',true);setState('think','Je réfléchis…');
  let answer='',donePayload=null;
  try{
    const r=await fetch('/api/v125/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json','Accept':'text/event-stream'},body:JSON.stringify({message:text,page:'plugy',mode:state.mode,history:state.history.slice(-8)})});
    if(!r.ok||!r.body)throw new Error('stream');
    const reader=r.body.getReader(),dec=new TextDecoder();let buf='';
    while(true){
      const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});
      let idx;while((idx=buf.indexOf('\n\n'))>=0){
        const block=buf.slice(0,idx);buf=buf.slice(idx+2);
        parseSSEBlock(block,d=>{if(!d)return;answer+=d;node.copy.textContent=answer;scrollChat()},o=>{donePayload=o});
      }
    }
    if(!answer&&donePayload?.answer)answer=donePayload.answer;
    if(!answer)throw new Error('empty');
  }catch{
    try{
      const r=await fetch('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,page:'plugy',mode:state.mode,history:state.history.slice(-8)})});
      const out=await r.json();answer=String(out.answer||'');
    }catch{answer="Je n’arrive pas à répondre pour le moment."}
  }
  node.copy.textContent=answer;node.copy.classList.remove('typing-cursor');
  state.history.push({role:'assistant',content:answer});state.history=state.history.slice(-30);saveHistory();
  state.busy=false;setState('happy','Réponse prête');setTimeout(()=>speak(answer),120);
}
function startVoice(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){input.focus();$('#composerHint').textContent='La reconnaissance vocale web n’est pas disponible sur ce navigateur.';return}
  if(state.listening){try{state.recognition?.stop()}catch{};return}
  const rec=new R();state.recognition=rec;rec.lang='fr-FR';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=3;state.listening=true;
  $('#voiceButton').classList.add('listening');setState('listen','Je t’écoute…');
  rec.onresult=e=>{
    const last=e.results?.[e.results.length-1];if(!last)return;
    const alt=Array.from(last).sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0]||last[0],txt=clean(alt?.transcript||'');
    if(txt){input.value=txt;autoGrow()}
    if(last.isFinal&&txt.length>1){state.listening=false;$('#voiceButton').classList.remove('listening');ask(txt)}
  };
  rec.onend=()=>{state.listening=false;$('#voiceButton').classList.remove('listening');if(!state.busy)setState('idle','Prêt')};
  rec.onerror=()=>{state.listening=false;$('#voiceButton').classList.remove('listening');setState('idle','Prêt')};
  try{rec.start()}catch{}
}
function modelInteract(){
  const now=Date.now();
  if(now-state.lastTap<330){state.lastTap=0;setState('wave','Salut.');setTimeout(()=>setState('idle','Prêt'),1200);return}
  state.lastTap=now;
  const react=Math.random()<.52?'wink':'explain';setState(react,react==='wink'?'Présent':'Je t’écoute');
  setTimeout(()=>setState('idle','Prêt'),react==='wink'?520:1150);
}
mv?.addEventListener('load',()=>{tuneMaterials();setState('idle','Prêt')},{once:true});
mv?.addEventListener('click',modelInteract);
mv?.addEventListener('pointerenter',()=>{if(!state.busy&&!state.listening){setState(Math.random()<.55?'wave':'wink','Présent');setTimeout(()=>{if(!state.busy&&!state.listening)setState('idle','Prêt')},900)}});
mv?.addEventListener('pointerdown',()=>{clearTimeout(state.pressTimer);state.pressTimer=setTimeout(startVoice,650)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>mv?.addEventListener(ev,()=>clearTimeout(state.pressTimer)));
function hasAnim(name){return !!(mv?.availableAnimations||[]).includes(name)}
let ambientTimer=0,gazeReset=0;
function softGaze(x=null,y=null){
  if(!mv||state.busy||state.listening)return;
  const gx=x==null?(Math.random()*6-3):x,gy=y==null?(Math.random()*3.6-1.8):y;
  mv.style.setProperty('--standalone-gaze-x',gx.toFixed(1)+'px');mv.style.setProperty('--standalone-gaze-y',gy.toFixed(1)+'px');
  try{mv.setAttribute('camera-orbit',(gx*.72).toFixed(1)+'deg '+(76+gy*.35).toFixed(1)+'deg 3.05m')}catch{}
  clearTimeout(gazeReset);gazeReset=setTimeout(()=>{mv.style.setProperty('--standalone-gaze-x','0px');mv.style.setProperty('--standalone-gaze-y','0px');try{mv.setAttribute('camera-orbit','0deg 76deg 3.05m')}catch{}},2100+Math.random()*1700);
}
mv?.addEventListener('pointermove',e=>{
  const r=mv.getBoundingClientRect(),x=((e.clientX-r.left)/Math.max(r.width,1)-.5)*5,y=((e.clientY-r.top)/Math.max(r.height,1)-.5)*3;
  softGaze(x,y);
});
mv?.addEventListener('pointerleave',()=>softGaze(0,0));
let recentAmbient=[];
function pickAmbient(){
  const names=['explain','shrug','stretch','curious','softturn','happy','wave'];
  const map={explain:'ArmExplain',shrug:'ArmShrug',stretch:'ArmStretch',curious:'Curious',softturn:'SoftTurn',happy:'Happy',wave:'ArmHello'};
  const candidates=names.filter(n=>hasAnim(map[n])&&!recentAmbient.includes(n)),pool=candidates.length?candidates:names.filter(n=>hasAnim(map[n]));
  if(!pool.length)return 'curious';const pick=pool[Math.floor(Math.random()*pool.length)];recentAmbient=[pick,...recentAmbient.filter(x=>x!==pick)].slice(0,3);return pick;
}
function scheduleEye(){
  clearTimeout(scheduleEye.t);scheduleEye.t=setTimeout(()=>{
    if(!state.busy&&!state.listening){
      const r=Math.random(),eye=r<.12?'doubleblink':r<.24?'wink':r<.38?'softeyes':'blink';
      setState(eye,'Présent');setTimeout(()=>{if(!state.busy&&!state.listening)setState('idle','Prêt')},eye==='doubleblink'?520:360);
    }
    scheduleEye();
  },2800+Math.random()*3900);
}
function scheduleAmbient(){
  clearTimeout(ambientTimer);
  ambientTimer=setTimeout(()=>{
    if(!state.busy&&!state.listening){
      const motion=pickAmbient();setState(motion,'Présent');softGaze();
      setTimeout(()=>{if(!state.busy&&!state.listening)setState('idle','Prêt')},1050+Math.random()*350);
    }
    scheduleAmbient();
  },4300+Math.random()*6800);
}
scheduleAmbient();scheduleEye();

form?.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
input?.addEventListener('input',autoGrow);
input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
$('#voiceButton')?.addEventListener('click',startVoice);$('#heroVoice')?.addEventListener('click',()=>{$('#chatSection').scrollIntoView({behavior:'smooth'});setTimeout(startVoice,420)});
$('#goChat')?.addEventListener('click',()=>$('#chatSection').scrollIntoView({behavior:'smooth'}));
$('#voiceReplyToggle')?.addEventListener('click',e=>{state.voiceReply=!state.voiceReply;e.currentTarget.classList.toggle('active',state.voiceReply);e.currentTarget.textContent=state.voiceReply?'Voix activée':'Voix coupée';if(!state.voiceReply&&'speechSynthesis'in window)speechSynthesis.cancel()});
$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b))});
$$('#suggestions button').forEach(b=>b.onclick=()=>ask(b.textContent));
$('#clearChat')?.addEventListener('click',()=>{state.history=[];saveHistory();chat.innerHTML='';messageNode('assistant','Conversation effacée. On repart proprement.',false)});
loadHistory();renderHistory();autoGrow();setState('idle','Prêt');
})();