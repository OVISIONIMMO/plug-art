(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const STORAGE='plugart:plugy:v130:history';
const state={mode:'fast',history:[],busy:false,listening:false,voiceReply:true,recognition:null,pressTimer:0,lastTap:0};
const mv=$('#plugyStandaloneModel'),chat=$('#chatScroll'),input=$('#plugyStandaloneInput'),form=$('#plugyStandaloneForm');

function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function standaloneDistance(){
  const companion=$('#plugyModelWrap')?.classList.contains('companion-mode-v162');
  if(companion){
    if(innerWidth<=520)return '9.10';
    if(innerWidth<=900)return '9.00';
    return '8.90';
  }
  if(innerWidth<=390)return '10.00';
  if(innerWidth<=780)return '9.75';
  return '9.45';
}
function resetStandaloneFraming(){
  if(!mv)return;
  try{mv.setAttribute('camera-target','0m 0m 0m');mv.setAttribute('camera-orbit','0deg 79deg '+standaloneDistance()+'m');mv.setAttribute('field-of-view',innerWidth<=780?'52deg':'50deg')}catch{}
}
function setState(name,label){
  if(['blink','doubleblink','wink','softeyes','eyethink'].includes(String(name||'').toLowerCase()))name='idle';
  if(innerWidth<=820&&['blink','doubleblink','wink','softeyes'].includes(name))name='idle';
  document.body.dataset.plugyState=name;
  $('#plugyLiveState span').textContent=label;$('#topState').textContent=label;
  const animMap={idle:'Idle',listen:'Listen',think:'Think',speak:'Speak',happy:'Happy',curious:'Curious',wave:'ArmHello',charge:'Charge',blink:'Idle',doubleblink:'Idle',wink:'Idle',softeyes:'Idle',softturn:'SoftTurn',explain:'ArmExplain',shrug:'ArmShrug',stretch:'ArmStretch'};
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
function scrollChat(){requestAnimationFrame(()=>{chat.scrollTop=chat.scrollHeight})}
function autoGrow(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,150)+'px'}

let preferredVoice=null;
function resolvePreferredVoice(){
  if(!('speechSynthesis' in window))return null;
  const voices=speechSynthesis.getVoices?.()||[];
  const fr=voices.filter(v=>/^fr([-_]|$)/i.test(v.lang||''));
  preferredVoice=fr.find(v=>v.localService)||fr[0]||voices.find(v=>/^fr/i.test(v.lang||''))||null;
  return preferredVoice;
}
function primeVoiceOutput(){
  if(!('speechSynthesis' in window))return;
  try{
    speechSynthesis.resume();resolvePreferredVoice();
    const u=new SpeechSynthesisUtterance(' ');u.lang='fr-FR';u.volume=0;u.rate=1.05;
    const v=preferredVoice||resolvePreferredVoice();if(v)u.voice=v;
    speechSynthesis.speak(u);setTimeout(()=>{try{speechSynthesis.cancel()}catch{}},35);
  }catch{}
}
if('speechSynthesis' in window){
  resolvePreferredVoice();
  try{speechSynthesis.addEventListener?.('voiceschanged',resolvePreferredVoice)}catch{}
}

function speechChunks(text,max=190){
  const src=clean(text);if(!src)return[];
  const sentences=src.match(/[^.!?]+[.!?]?/g)||[src],out=[];let part='';
  for(const sentence of sentences){
    const s=clean(sentence);if(!s)continue;
    if((part+' '+s).trim().length<=max){part=(part+' '+s).trim();continue}
    if(part)out.push(part);part='';
    if(s.length<=max){part=s;continue}
    const words=s.split(' ');let line='';
    for(const word of words){const test=(line+' '+word).trim();if(test.length<=max)line=test;else{if(line)out.push(line);line=word}}
    if(line)part=line;
  }
  if(part)out.push(part);return out;
}
let naturalAudioV162=null;
function speakBrowserFallbackV162(text){
  if(!state.voiceReply||!('speechSynthesis'in window)||!clean(text)){setState('idle','Prêt');return}
  const chunks=speechChunks(text);if(!chunks.length){setState('idle','Prêt');return}
  try{
    speechSynthesis.cancel();let index=0;const voice=preferredVoice||resolvePreferredVoice();
    const next=()=>{if(index>=chunks.length){setState('idle','Prêt');return}
      const u=new SpeechSynthesisUtterance(chunks[index++]);u.lang='fr-FR';u.rate=1.05;u.pitch=.98;u.volume=1;if(voice)u.voice=voice;
      u.onstart=()=>setState('speak','Je parle…');u.onend=()=>setTimeout(next,55);u.onerror=()=>setState('idle','Prêt');speechSynthesis.speak(u)};
    next();
  }catch{setState('idle','Prêt')}
}
async function speak(text){
  text=clean(text);if(!state.voiceReply||!text){setState('idle','Prêt');return}
  try{
    if(naturalAudioV162){try{naturalAudioV162.pause()}catch{};naturalAudioV162=null}
    const r=await fetch('/api/v162/plugy/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,4000),voice:'marin'})});
    if(!r.ok)throw new Error('tts');
    const blob=await r.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);naturalAudioV162=audio;audio.preload='auto';
    audio.onplay=()=>setState('speak','Je parle…');
    audio.onended=()=>{URL.revokeObjectURL(url);naturalAudioV162=null;setState('idle','Prêt')};
    audio.onerror=()=>{URL.revokeObjectURL(url);naturalAudioV162=null;speakBrowserFallbackV162(text)};
    await audio.play();
  }catch{speakBrowserFallbackV162(text)}
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
  primeVoiceOutput();
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){input.focus();$('#composerHint').textContent='Le micro vocal direct n’est pas disponible ici. Tu peux écrire à PLUGY.';setState('idle','Mode texte');return}
  if(state.listening){try{state.recognition?.stop()}catch{};return}
  let accepted=false;try{speechSynthesis?.cancel?.()}catch{}const rec=new R();state.recognition=rec;rec.lang='fr-FR';rec.interimResults=false;rec.continuous=false;rec.maxAlternatives=3;state.listening=true;
  $('#voiceButton').classList.add('listening');setState('listen','Je t’écoute…');
  rec.onresult=e=>{
    const last=e.results?.[e.results.length-1];if(!last)return;
    const alt=Array.from(last).sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0]||last[0],txt=clean(alt?.transcript||'');
    if(txt){input.value=txt;autoGrow()}
    if(last.isFinal&&txt.length>1){accepted=true;state.listening=false;$('#voiceButton').classList.remove('listening');ask(txt)}
  };
  rec.onend=()=>{state.listening=false;$('#voiceButton').classList.remove('listening');if(!accepted&&!state.busy)setState('idle','Prêt')};
  rec.onerror=e=>{state.listening=false;$('#voiceButton').classList.remove('listening');const fatal=['not-allowed','service-not-allowed','audio-capture'].includes(e?.error);setState('idle',fatal?'Micro indisponible':'Je réécoute…');$('#composerHint').textContent=fatal?'Autorise le micro dans Safari pour parler à PLUGY.':'La phrase n’a pas été comprise. Réessaie ou écris ton message.'};
  try{rec.start()}catch{}
}
function modelInteract(){
  const now=Date.now();
  if(now-state.lastTap<330){state.lastTap=0;setState('wave','Salut.');setTimeout(()=>setState('idle','Prêt'),1200);return}
  state.lastTap=now;
  const react=Math.random()<.45?'wave':(Math.random()<.55?'explain':'curious');setState(react,react==='wave'?'Salut.':'Je t’écoute');
  setTimeout(()=>setState('idle','Prêt'),1100);
}
mv?.addEventListener('load',()=>{tuneMaterials();resetStandaloneFraming();setState('idle','Prêt')},{once:true});
mv?.addEventListener('click',modelInteract);
mv?.addEventListener('pointerenter',()=>{if(!state.busy&&!state.listening)mv?.classList.add('plugy-hovering')});
mv?.addEventListener('pointerdown',()=>{clearTimeout(state.pressTimer);state.pressTimer=setTimeout(startVoice,650)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>mv?.addEventListener(ev,()=>clearTimeout(state.pressTimer)));
function hasAnim(name){return !!(mv?.availableAnimations||[]).includes(name)}
let ambientTimer=0,gazeReset=0;
function softGaze(x=null,y=null){
  if(!mv||state.busy||state.listening)return;
  const gx=x==null?(Math.random()*6-3):x,gy=y==null?(Math.random()*3.6-1.8):y;
  mv.style.setProperty('--standalone-gaze-x',gx.toFixed(1)+'px');mv.style.setProperty('--standalone-gaze-y',gy.toFixed(1)+'px');
  const distance=standaloneDistance();try{mv.setAttribute('camera-orbit',(gx*.55).toFixed(1)+'deg '+(76+gy*.28).toFixed(1)+'deg '+distance+'m')}catch{}
  clearTimeout(gazeReset);gazeReset=setTimeout(()=>{mv.style.setProperty('--standalone-gaze-x','0px');mv.style.setProperty('--standalone-gaze-y','0px');resetStandaloneFraming()},2600+Math.random()*1800);
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
  clearTimeout(scheduleEye.t);
  // V156: eyes remain open and stable. No autonomous blink.
}

function scheduleAmbient(){
  clearTimeout(ambientTimer);
  ambientTimer=setTimeout(()=>{
    if(!state.busy&&!state.listening&&document.visibilityState==='visible'){
      if(hasAnim('SoftTurn'))setState('softturn','Présent');
      setTimeout(()=>{if(!state.busy&&!state.listening)setState('idle','Prêt')},900);
    }
    scheduleAmbient();
  },15000+Math.random()*9000);
}

scheduleAmbient();scheduleEye();
addEventListener('resize',()=>resetStandaloneFraming(),{passive:true});
addEventListener('orientationchange',()=>setTimeout(resetStandaloneFraming,180),{passive:true});

form?.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
input?.addEventListener('input',autoGrow);
input?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
$('#voiceButton')?.addEventListener('click',()=>{state.voiceReply=true;$('#voiceReplyToggle')?.classList.add('active');primeVoiceOutput();startVoice()});$('#heroVoice')?.addEventListener('click',()=>{state.voiceReply=true;$('#voiceReplyToggle')?.classList.add('active');primeVoiceOutput();$('#chatSection').scrollIntoView({behavior:'smooth'});setTimeout(startVoice,420)});
$('#goChat')?.addEventListener('click',()=>$('#chatSection').scrollIntoView({behavior:'smooth'}));
$('#voiceReplyToggle')?.addEventListener('click',e=>{state.voiceReply=!state.voiceReply;e.currentTarget.classList.toggle('active',state.voiceReply);e.currentTarget.textContent=state.voiceReply?'Voix activée':'Voix coupée';if(!state.voiceReply&&'speechSynthesis'in window)speechSynthesis.cancel()});
$$('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b))});
$$('#suggestions button').forEach(b=>b.onclick=()=>ask(b.textContent));
$('#clearChat')?.addEventListener('click',()=>{state.history=[];saveHistory();chat.innerHTML='';messageNode('assistant','Conversation effacée. On repart proprement.',false)});
loadHistory();renderHistory();autoGrow();setState('idle','Prêt');

let standaloneRoamV161=0;
function roamStandaloneV161(){
  clearTimeout(standaloneRoamV161);
  const wrap=$('#plugyModelWrap');if(!wrap)return;
  const mobile=innerWidth<780,range=Math.min(mobile?14:innerWidth*.035,mobile?14:48);
  wrap.style.setProperty('--plugy-standalone-x',((Math.random()-.62)*range).toFixed(0)+'px');
  wrap.style.setProperty('--plugy-standalone-y',((Math.random()-.5)*(mobile?8:16)).toFixed(0)+'px');
  if(!state.listening&&!state.busy)setState(Math.random()>.55?'softturn':'curious','Prêt');
  standaloneRoamV161=setTimeout(roamStandaloneV161,6200+Math.random()*5200);
}
addEventListener('load',()=>setTimeout(roamStandaloneV161,1800));
addEventListener('resize',()=>{resetStandaloneFraming();roamStandaloneV161()},{passive:true});

/* V162 persistent PLUGY companion */
let plugyCompanionModeV162=false,companionRafV162=0;
function syncPlugyCompanionV162(){
  const hero=$('#plugyHero'),wrap=$('#plugyModelWrap'),mount=$('#plugyCompanionMountV162'),intro=hero?.querySelector('.plugy-intro');
  if(!hero||!wrap||!mount)return;
  const shouldDock=hero.getBoundingClientRect().bottom<Math.min(300,innerHeight*.34);
  if(shouldDock&&!plugyCompanionModeV162){
    plugyCompanionModeV162=true;wrap.classList.add('companion-transition-v163');
    mount.appendChild(wrap);wrap.classList.add('companion-mode-v162');
    requestAnimationFrame(()=>{resetStandaloneFraming();wrap.classList.remove('companion-transition-v163')});
  }else if(!shouldDock&&plugyCompanionModeV162){
    plugyCompanionModeV162=false;wrap.classList.add('companion-transition-v163');
    if(intro)hero.insertBefore(wrap,intro);else hero.appendChild(wrap);
    wrap.classList.remove('companion-mode-v162');
    requestAnimationFrame(()=>{resetStandaloneFraming();wrap.classList.remove('companion-transition-v163')});
  }
}
function syncCompanionStateV162(){
  const src=$('#topState'),dst=$('#plugyCompanionStateV162');if(src&&dst)dst.textContent=src.textContent||'Prêt';
}
addEventListener('scroll',()=>{if(companionRafV162)return;companionRafV162=requestAnimationFrame(()=>{companionRafV162=0;syncPlugyCompanionV162();syncCompanionStateV162()})},{passive:true});
addEventListener('resize',()=>{syncPlugyCompanionV162();resetStandaloneFraming()},{passive:true});
setTimeout(()=>{syncPlugyCompanionV162();syncCompanionStateV162()},120);
})();