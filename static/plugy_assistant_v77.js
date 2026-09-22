(()=>{
'use strict';
const P=window.PLUG65;if(!P)return;
const q=P.q;
const A={state:'idle',mode:'hero',conversation:false,recognition:null,micStream:null,audioContext:null,analyser:null,raf:0,speaking:false,busy:false,longPress:0,history:[],voice:null};
const anim={idle:'Idle',hover:'Curious',moving:'SoftTurn',listening:'Attentive',transcribing:'Think',thinking:'Think',speaking:'Idle',minimized:'Idle',expanding:'Present',sleep:'Idle'};
const wrappers=()=>[q('.plugy-stage'),q('#plugyFloatVisual')].filter(Boolean);

function setState(s){
  A.state=s;document.body.dataset.plugyState=s;wrappers().forEach(x=>x.dataset.plugyState=s);
  const el=q('#plugyVoiceStatus'),names={idle:'Disponible',hover:'Présent',moving:'Déplacement',listening:'Écoute…',transcribing:'Transcription…',thinking:'Réflexion…',speaking:'Réponse…',minimized:'Disponible',expanding:'Ouverture…',sleep:'Veille'};
  if(el)el.textContent=names[s]||s;
  if(anim[s])P.playPlugy(anim[s],s==='hover'||s==='expanding');
}
function setMode(m){A.mode=m;document.body.dataset.plugyMode=m;const f=q('#plugyFloat');if(f)f.dataset.mode=m}
function syncMode(){const v=document.body.dataset.view||location.hash.slice(1)||'dashboard';setMode(A.conversation?'assistant':v==='dashboard'?'hero':'mini')}
new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['data-view']});syncMode();

try{A.history=JSON.parse(sessionStorage.getItem('plugy_v77_history')||'[]').slice(-8)}catch{}
function remember(role,text){A.history.push({role,text:String(text).slice(0,1600)});A.history=A.history.slice(-8);try{sessionStorage.setItem('plugy_v77_history',JSON.stringify(A.history))}catch{}}
function addChat(text,who='bot'){const b=q('#chatStream');if(!b)return;const d=document.createElement('div');d.className=who==='user'?'user-msg':'bot-msg';d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight}
function openPanel(){q('#plugyChat')?.classList.add('open');A.conversation=true;setMode('assistant');setState('expanding');setTimeout(()=>setState('idle'),480)}
function closePanel(){q('#plugyChat')?.classList.remove('open');stopConversation(false);A.conversation=false;syncMode();setState(A.mode==='mini'?'minimized':'idle')}

function chooseVoice(){
  if(!('speechSynthesis'in window))return;
  const vs=speechSynthesis.getVoices()||[];
  A.voice=vs.find(v=>/^fr-FR$/i.test(v.lang)&&/natural|enhanced|premium|siri|audrey|thomas|amélie|amelie/i.test(v.name))||vs.find(v=>/^fr/i.test(v.lang))||vs[0]||null;
}
if('speechSynthesis'in window){chooseVoice();speechSynthesis.addEventListener?.('voiceschanged',chooseVoice)}
function speak(text){
  return new Promise(resolve=>{
    if(!('speechSynthesis'in window)||!text){resolve();return}
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(String(text).replace(/\[\[[\s\S]*?\]\]/g,'').trim().slice(0,520));
    u.lang='fr-FR';u.rate=1.10;u.pitch=1.02;if(A.voice)u.voice=A.voice;
    u.onstart=()=>{A.speaking=true;setState('speaking')};u.onend=()=>{A.speaking=false;resolve()};u.onerror=()=>{A.speaking=false;resolve()};
    speechSynthesis.speak(u);
  });
}

async function startMeter(){
  if(A.micStream||!navigator.mediaDevices?.getUserMedia)return;
  try{
    A.micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    A.audioContext=new C();const src=A.audioContext.createMediaStreamSource(A.micStream);A.analyser=A.audioContext.createAnalyser();A.analyser.fftSize=256;src.connect(A.analyser);
    const data=new Uint8Array(A.analyser.fftSize);
    const tick=()=>{if(!A.analyser)return;A.analyser.getByteTimeDomainData(data);let sum=0;for(const x of data){const v=(x-128)/128;sum+=v*v}const level=Math.min(1,Math.sqrt(sum/data.length)*4.2);document.documentElement.style.setProperty('--plugy-voice',level.toFixed(3));A.raf=requestAnimationFrame(tick)};tick();
  }catch{}
}
function stopMeter(){if(A.raf)cancelAnimationFrame(A.raf);A.raf=0;A.analyser=null;if(A.audioContext){try{A.audioContext.close()}catch{}A.audioContext=null}if(A.micStream){A.micStream.getTracks().forEach(t=>t.stop());A.micStream=null}document.documentElement.style.setProperty('--plugy-voice','0')}

const RC=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
function createRecognition(){
  const C=RC();if(!C)return null;const r=new C();r.lang='fr-FR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  r.onstart=()=>{setState('listening');const x=q('#plugyLiveTranscript');if(x)x.textContent='Je t’écoute…'};
  r.onresult=e=>{let interim='',final='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=t;else interim+=t}const shown=(final||interim).trim();if(q('#plugyLiveTranscript')&&shown)q('#plugyLiveTranscript').textContent=shown;if(final.trim()){try{r.stop()}catch{}handle(final.trim())}};
  r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){addChat('Autorise le microphone dans Safari puis relance PLUGY.');stopConversation(false)}};
  r.onend=()=>{if(A.conversation&&!A.speaking&&!A.busy&&A.state==='listening')setTimeout(()=>startListening(false),420)};
  return r;
}
async function startListening(userGesture=true){
  if(A.busy||A.speaking)return;openPanel();if(userGesture)await startMeter();
  if(!RC()){addChat('La reconnaissance vocale native n’est pas disponible ici. Continue par texte.');setState('idle');q('#chatInput')?.focus();return}
  if(A.recognition){try{A.recognition.abort()}catch{}}A.recognition=createRecognition();
  try{A.recognition.start()}catch{setTimeout(()=>{try{A.recognition?.start()}catch{}},300)}
}
function stopConversation(close=true){
  A.conversation=false;if(A.recognition){try{A.recognition.abort()}catch{}A.recognition=null}
  if('speechSynthesis'in window)speechSynthesis.cancel();stopMeter();if(close)q('#plugyChat')?.classList.remove('open');setState('idle');syncMode();
}

function localAction(message){
  const m=message.toLowerCase(),has=re=>re.test(m);
  if(has(/(?:lance|relance|démarre|demarre).{0,20}radar/)){P.view('radar');setTimeout(()=>q('#runRadar')?.click(),250);return 'Je lance le Radar.'}
  let v=null;
  if(has(/\b(?:accueil|dashboard|vue générale|vue generale)\b/))v='dashboard';
  else if(has(/\bradar\b/))v='radar';
  else if(has(/\b(?:open ?calls?|opportunit(?:é|e)s?)\b/))v='opencalls';
  else if(has(/\b(?:contenu|studio|carrousel)\b/))v='studio';
  else if(has(/\b(?:instagram|publication)\b/))v='social';
  else if(has(/\b(?:réseau|reseau|artistes?|événements?|evenements?)\b/))v='network';
  else if(has(/\b(?:suivi|contacts?|notes?)\b/))v='workspace';
  if(!v)return '';
  P.view(v);
  if(v==='opencalls'&&has(/\bparis\b/)){setTimeout(()=>{const i=q('#searchOppOpen');if(i){i.value='Paris';i.dispatchEvent(new Event('input',{bubbles:true}))}},400);return 'J’ouvre les Open Calls et je filtre Paris.'}
  const label={dashboard:'l’accueil',radar:'le Radar',opencalls:'les Open Calls',studio:'Contenu',social:'Instagram',network:'Réseau',workspace:'Suivi'}[v];
  return 'J’ouvre '+label+'.';
}
async function askAI(msg){
  const ctx=A.history.slice(-6).map(x=>(x.role==='user'?'Utilisateur':'PLUGY')+': '+x.text).join('\n');
  const prompt=['Tu es PLUGY, assistant interne de PLUG ART.','Réponds en français, naturellement, de façon concise et opérationnelle.','Pour la voix, donne l’essentiel en 1 à 3 phrases quand cela suffit.','Ne prétends jamais avoir effectué une action du site si elle n’a pas été réellement déclenchée par l’interface.',ctx?'Contexte récent:\n'+ctx:'','Nouvelle demande: '+msg].filter(Boolean).join('\n\n');
  return P.api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:prompt,page:document.body.dataset.view||location.hash.slice(1)||'dashboard',mode:'fast'})});
}
async function handle(msg){
  msg=String(msg||'').trim();if(!msg||A.busy)return;
  if(/^(stop|arrête|arrete|tais-toi|tais toi)$/i.test(msg)){stopConversation(false);return}
  A.busy=true;addChat(msg,'user');remember('user',msg);if(q('#plugyLiveTranscript'))q('#plugyLiveTranscript').textContent=msg;setState('transcribing');
  const local=localAction(msg);
  if(local){addChat(local);remember('assistant',local);await speak(local);A.busy=false;if(A.conversation)setTimeout(()=>startListening(false),360);else setState('idle');return}
  setState('thinking');
  try{const r=await askAI(msg),answer=String(r.answer||'Analyse terminée.').trim();addChat(answer);remember('assistant',answer);await speak(answer)}
  catch{const fail='Je n’arrive pas à joindre mon moteur pour le moment.';addChat(fail);await speak(fail)}
  finally{A.busy=false;if(A.conversation)setTimeout(()=>startListening(false),420);else setState('idle')}
}

q('#openPlugy')?.addEventListener('click',openPanel);q('#askPlugy')?.addEventListener('click',openPanel);q('#closeChat')?.addEventListener('click',closePanel);
q('#plugyVoiceBtn')?.addEventListener('click',()=>A.conversation?stopConversation(false):startListening(true));
q('#plugyFloatVoice')?.addEventListener('click',e=>{e.stopPropagation();A.conversation?stopConversation(false):startListening(true)});
q('#chatForm')?.addEventListener('submit',e=>{e.preventDefault();const i=q('#chatInput'),m=i?.value.trim();if(!m)return;i.value='';handle(m)});

function bind(el){
  if(!el)return;el.addEventListener('dblclick',e=>{e.preventDefault();startListening(true)});
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;clearTimeout(A.longPress);A.longPress=setTimeout(()=>startListening(true),560)});
  ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>clearTimeout(A.longPress)));
  el.addEventListener('mouseenter',()=>{if(!A.conversation)setState('hover')});el.addEventListener('mouseleave',()=>{if(!A.conversation)setState(A.mode==='mini'?'minimized':'idle')});
}
bind(q('.plugy-stage'));bind(q('#plugyFloatVisual'));
q('#plugyFloatVisual')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();startListening(true)}});

let px=0,py=0,tx=0,ty=0,pr=0;
function ptick(){pr=0;px+=(tx-px)*.12;py+=(ty-py)*.12;const f=q('#plugyFloat');if(f){f.style.setProperty('--plugy-x',px.toFixed(2)+'px');f.style.setProperty('--plugy-y',py.toFixed(2)+'px')}if(Math.abs(tx-px)>.1||Math.abs(ty-py)>.1)pr=requestAnimationFrame(ptick)}
addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;tx=(e.clientX/innerWidth-.5)*12;ty=(e.clientY/innerHeight-.5)*8;if(!pr)pr=requestAnimationFrame(ptick)},{passive:true});

setState('idle');window.PlugyAssistant={start:startListening,stop:stopConversation,ask:handle,setState,setMode,state:A};
})();