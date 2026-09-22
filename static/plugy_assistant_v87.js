(()=>{
'use strict';
const P=window.PLUG65;if(!P)return;
const q=P.q;
const A={state:'idle',mode:'hero',conversation:false,recognition:null,micStream:null,audioContext:null,analyser:null,raf:0,speaking:false,busy:false,longPress:0,history:[],voice:null,lastOppId:null,sleepTimer:0,modeRAF:0,thinkRAF:0,speakRAF:0,speakPulse:0,fxReady:false,speechQueue:[],speechActive:false,speechWaiters:[],speechToken:0};
const anim={idle:'IdleBlink',hover:'IdleBlink',moving:'IdleBlink',listening:'IdleBlink',transcribing:'IdleBlink',thinking:'IdleBlink',speaking:'IdleBlink',minimized:'IdleBlink',expanding:'IdleBlink',sleep:'IdleBlink'};
const wrappers=()=>[q('.plugy-stage'),q('#plugyFloatVisual')].filter(Boolean);

function ensureFX(){
  if(A.fxReady)return;
  wrappers().forEach((wrap,wi)=>{
    if(wrap.querySelector('.plugy-energy-layer'))return;
    const layer=document.createElement('div');
    layer.className='plugy-energy-layer';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=
      '<i class="plugy-aurora"></i>'+
      '<i class="plugy-prong-glow left"></i><i class="plugy-prong-glow right"></i>'+
      '<i class="plugy-arc a1"></i><i class="plugy-arc a2"></i><i class="plugy-arc a3"></i>'+
      Array.from({length:10},(_,i)=>'<i class="plugy-particle p'+(i+1)+'"></i>').join('');
    wrap.appendChild(layer);layer.querySelectorAll('.plugy-particle').forEach((p,i)=>p.style.setProperty('--i',i));
  });
  A.fxReady=true;
}
function stopThinkEnergy(){
  if(A.thinkRAF)cancelAnimationFrame(A.thinkRAF);A.thinkRAF=0;
  document.documentElement.style.setProperty('--plugy-thinking','0');
}
function startThinkEnergy(){
  stopThinkEnergy();
  const began=performance.now();
  const tick=t=>{
    if(!['thinking','transcribing'].includes(A.state)){stopThinkEnergy();return}
    const age=Math.min(1,(t-began)/5200);
    const pulse=.48+.24*Math.sin(t/330)+age*.18;
    document.documentElement.style.setProperty('--plugy-thinking',Math.max(.25,Math.min(1,pulse)).toFixed(3));
    A.thinkRAF=requestAnimationFrame(tick);
  };
  A.thinkRAF=requestAnimationFrame(tick);
}
function stopSpeakEnergy(){
  if(A.speakRAF)cancelAnimationFrame(A.speakRAF);A.speakRAF=0;A.speakPulse=0;
  document.documentElement.style.setProperty('--plugy-speak','0');
}
function startSpeakEnergy(){
  stopSpeakEnergy();
  const tick=t=>{
    if(!A.speaking){stopSpeakEnergy();return}
    A.speakPulse*=.86;
    const base=.10+.055*Math.sin(t/105)+.035*Math.sin(t/57);
    document.documentElement.style.setProperty('--plugy-speak',Math.max(0,Math.min(1,base+A.speakPulse)).toFixed(3));
    A.speakRAF=requestAnimationFrame(tick);
  };
  A.speakRAF=requestAnimationFrame(tick);
}
function bumpSpeech(amount=.45){A.speakPulse=Math.min(1,Math.max(A.speakPulse,amount))}


function setState(s){
  ensureFX();
  A.state=s;document.body.dataset.plugyState=s;wrappers().forEach(x=>x.dataset.plugyState=s);
  if(s==='thinking'||s==='transcribing')startThinkEnergy();else stopThinkEnergy();
  if(s!=='speaking')document.documentElement.style.setProperty('--plugy-speak','0');
  const el=q('#plugyVoiceStatus'),names={idle:'Disponible',hover:'Présent',moving:'Déplacement',listening:'Écoute…',transcribing:'Transcription…',thinking:'Réflexion…',speaking:'Réponse…',minimized:'Disponible',expanding:'Ouverture…',sleep:'Veille'};
  if(el)el.textContent=names[s]||s;
  if(anim[s])P.playPlugy(anim[s],s==='hover'||s==='expanding');
}
function setMode(m){A.mode=m;document.body.dataset.plugyMode=m;const f=q('#plugyFloat');if(f)f.dataset.mode=m}
function syncMode(){
  if(A.modeRAF)return;
  A.modeRAF=requestAnimationFrame(()=>{
    A.modeRAF=0;
    const v=document.body.dataset.view||location.hash.slice(1)||'dashboard';
    const mode=A.conversation?'assistant':(v==='dashboard'&&scrollY<420?'hero':'mini');
    setMode(mode);
    if(!A.conversation&&!A.busy&&!['listening','thinking','transcribing','speaking','hover','expanding'].includes(A.state)){
      setState(mode==='mini'?'minimized':'idle');
    }
  });
}
new MutationObserver(syncMode).observe(document.body,{attributes:true,attributeFilter:['data-view']});
addEventListener('scroll',syncMode,{passive:true});addEventListener('resize',syncMode,{passive:true});syncMode();

try{A.history=JSON.parse(sessionStorage.getItem('plugy_v86_history')||sessionStorage.getItem('plugy_v77_history')||'[]').slice(-8)}catch{}
try{A.lastOppId=sessionStorage.getItem('plugy_v86_last_opp')||null}catch{}
function remember(role,text){A.history.push({role,text:String(text).slice(0,1600)});A.history=A.history.slice(-8);try{sessionStorage.setItem('plugy_v86_history',JSON.stringify(A.history))}catch{}}
function addChat(text,who='bot'){const b=q('#chatStream');if(!b)return null;const d=document.createElement('div');d.className=who==='user'?'user-msg':'bot-msg';d.textContent=text;b.appendChild(d);b.scrollTop=b.scrollHeight;return d}
function openPanel(){q('#plugyChat')?.classList.add('open');const was=A.conversation;A.conversation=true;setMode('assistant');if(!was){setState('expanding');setTimeout(()=>{if(A.conversation&&!A.busy)setState('idle')},480)}}
function closePanel(){q('#plugyChat')?.classList.remove('open');stopConversation(false);A.conversation=false;syncMode();setState(A.mode==='mini'?'minimized':'idle')}

function chooseVoice(){
  if(!('speechSynthesis'in window))return;
  const vs=speechSynthesis.getVoices()||[];
  A.voice=vs.find(v=>/^fr-FR$/i.test(v.lang)&&/natural|enhanced|premium|siri|audrey|thomas|amélie|amelie/i.test(v.name))||vs.find(v=>/^fr/i.test(v.lang))||vs[0]||null;
}
if('speechSynthesis'in window){chooseVoice();speechSynthesis.addEventListener?.('voiceschanged',chooseVoice)}
function finishSpeechQueue(){if(A.speechActive||A.speechQueue.length)return;A.speaking=false;stopSpeakEnergy();const list=A.speechWaiters.splice(0);list.forEach(r=>r())}
function pumpSpeech(){if(A.speechActive)return;const item=A.speechQueue.shift();if(!item){finishSpeechQueue();return}if(!('speechSynthesis'in window)){item.resolve();pumpSpeech();return}A.speechActive=true;A.speaking=true;setState('speaking');startSpeakEnergy();const token=A.speechToken,u=new SpeechSynthesisUtterance(String(item.text||'').replace(/\[\[[\s\S]*?\]\]/g,'').trim().slice(0,360));u.lang='fr-FR';u.rate=1.28;u.pitch=1.0;u.volume=1;if(A.voice)u.voice=A.voice;u.onstart=()=>bumpSpeech(.40);u.onboundary=e=>bumpSpeech(Math.min(.92,.28+(e.charLength||1)*.045));const done=()=>{if(token!==A.speechToken)return;A.speechActive=false;item.resolve();pumpSpeech()};u.onend=done;u.onerror=done;speechSynthesis.speak(u)}
function enqueueSpeech(text,{cancel=false}={}){text=String(text||'').trim();if(!text)return Promise.resolve();if(cancel){A.speechToken++;A.speechQueue.splice(0).forEach(x=>x.resolve());A.speechActive=false;A.speechWaiters.splice(0).forEach(x=>x());try{speechSynthesis.cancel()}catch{}}return new Promise(resolve=>{A.speechQueue.push({text,resolve});pumpSpeech()})}
function waitSpeechDrain(){if(!A.speechActive&&!A.speechQueue.length)return Promise.resolve();return new Promise(resolve=>A.speechWaiters.push(resolve))}
function speak(text){return enqueueSpeech(text,{cancel:true})}

async function startMeter(){
  if(A.micStream||!navigator.mediaDevices?.getUserMedia)return;
  try{
    A.micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    A.audioContext=new C();const src=A.audioContext.createMediaStreamSource(A.micStream);A.analyser=A.audioContext.createAnalyser();A.analyser.fftSize=256;src.connect(A.analyser);
    const data=new Uint8Array(A.analyser.fftSize);let smooth=0;
    const tick=()=>{if(!A.analyser)return;A.analyser.getByteTimeDomainData(data);let sum=0,peak=0;for(const x of data){const v=Math.abs((x-128)/128);sum+=v*v;peak=Math.max(peak,v)}const raw=Math.min(1,Math.sqrt(sum/data.length)*4.4);smooth=smooth*.72+raw*.28;document.documentElement.style.setProperty('--plugy-voice',smooth.toFixed(3));document.documentElement.style.setProperty('--plugy-peak',Math.min(1,peak*3.2).toFixed(3));A.raf=requestAnimationFrame(tick)};tick();
  }catch{}
}
function stopMeter(){if(A.raf)cancelAnimationFrame(A.raf);A.raf=0;A.analyser=null;if(A.audioContext){try{A.audioContext.close()}catch{}A.audioContext=null}if(A.micStream){A.micStream.getTracks().forEach(t=>t.stop());A.micStream=null}document.documentElement.style.setProperty('--plugy-voice','0');document.documentElement.style.setProperty('--plugy-peak','0')}

const RC=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
function createRecognition(){
  const C=RC();if(!C)return null;const r=new C();r.lang='fr-FR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  r.onstart=()=>{setState('listening');const x=q('#plugyLiveTranscript');if(x)x.textContent='Je t’écoute…'};
  r.onresult=e=>{let interim='',final='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0]?.transcript||'';if(e.results[i].isFinal)final+=t;else interim+=t}const shown=(final||interim).trim();if(q('#plugyLiveTranscript')&&shown)q('#plugyLiveTranscript').textContent=shown;if(final.trim()){try{r.stop()}catch{}handle(final.trim())}};
  r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){addChat('Autorise le microphone dans Safari puis relance PLUGY.');stopConversation(false)}};
  r.onend=()=>{if(A.conversation&&!A.speaking&&!A.busy&&A.state==='listening')setTimeout(()=>startListening(false),180)};
  return r;
}
async function startListening(userGesture=true){
  if(A.busy||A.speaking)return;if(!A.conversation)openPanel();else setMode('assistant');if(userGesture&&!A.micStream)await startMeter();
  if(!RC()){addChat('La reconnaissance vocale native n’est pas disponible ici. Continue par texte.');setState('idle');q('#chatInput')?.focus();return}
  if(A.recognition){try{A.recognition.abort()}catch{}}A.recognition=createRecognition();
  try{A.recognition.start()}catch{setTimeout(()=>{try{A.recognition?.start()}catch{}},120)}
}
function stopConversation(close=true){
  A.conversation=false;if(A.recognition){try{A.recognition.abort()}catch{}A.recognition=null}
  A.speechToken++;A.speechQueue.splice(0).forEach(x=>x.resolve());A.speechWaiters.splice(0).forEach(x=>x());A.speechActive=false;if('speechSynthesis'in window)speechSynthesis.cancel();stopMeter();if(close)q('#plugyChat')?.classList.remove('open');setState('idle');syncMode();
}


const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function rememberOpp(id){
  if(id==null)return;const found=(P.state.opps||[]).find(o=>String(o.id)===String(id));if(!found)return;
  A.lastOppId=String(found.id);try{sessionStorage.setItem('plugy_v86_last_opp',A.lastOppId)}catch{}
}
document.addEventListener('click',e=>{
  const el=e.target?.closest?.('[data-open],[data-open-detail],[data-detail],[data-use]');
  if(!el)return;rememberOpp(el.dataset.open||el.dataset.openDetail||el.dataset.detail||el.dataset.use);
},true);

function findOppFromText(message,{allowLast=true}={}){
  const m=norm(message),opps=P.state.opps||[];
  if(allowLast&&A.lastOppId&&/\b(cette|cet|celle|l opportunite|l expo|l exposition|ce call|ce open call)\b/.test(m)){
    return opps.find(o=>String(o.id)===String(A.lastOppId))||null;
  }
  let best=null,bestScore=0;
  const words=m.split(' ').filter(w=>w.length>=4&&!['ouvre','ouvrir','fiche','montre','affiche','cette','opportunite','exposition','carrousel','prepare','cree','fais','pour'].includes(w));
  for(const o of opps){
    const hay=norm([o.title,o.organizer,o.city,o.country,o.type].filter(Boolean).join(' '));
    let score=0;
    for(const w of words)if(hay.includes(w))score+=w.length>7?3:2;
    if(o.title&&m.includes(norm(o.title)))score+=12;
    if(score>bestScore){best=o;bestScore=score}
  }
  return bestScore>=4?best:null;
}
function findCity(message){
  const m=norm(message);
  const cities=Array.from(new Set((P.state.opps||[]).map(o=>o.city).filter(Boolean))).sort((a,b)=>b.length-a.length);
  return cities.find(c=>m.includes(norm(c)))||(['paris','lyon','marseille','londres','london','madrid','milan','barcelone','barcelona','amsterdam','bruxelles','brussels'].find(c=>m.includes(c))||'');
}
function flash(el){
  if(!el)return;el.classList.remove('plugy-action-focus');void el.offsetWidth;el.classList.add('plugy-action-focus');setTimeout(()=>el.classList.remove('plugy-action-focus'),1800);
}
function openOpportunity(o){
  if(!o)return false;rememberOpp(o.id);P.view('opencalls');
  setTimeout(()=>{P.openOppDetails?.(o.id);const card=document.querySelector('[data-open-detail="'+CSS.escape(String(o.id))+'"]');flash(card)},360);
  return true;
}
function filterOpenCalls(term){
  P.view('opencalls');
  setTimeout(()=>{const i=q('#searchOppOpen');if(i){i.value=term;i.dispatchEvent(new Event('input',{bubbles:true}));flash(i)}},330);
}
function createCarouselFor(o){
  if(!o)return false;rememberOpp(o.id);P.view('studio');
  setTimeout(()=>{
    const sel=q('#studioSource');if(sel){
      const exists=[...sel.options].some(x=>String(x.value)===String(o.id));
      if(exists){sel.value=String(o.id);sel.dispatchEvent(new Event('change',{bubbles:true}));flash(sel)}
    }
    setTimeout(()=>{const btn=q('#generateStudio');if(btn){flash(btn);btn.click()}},180);
  },420);
  return true;
}
function resetSleep(){
  clearTimeout(A.sleepTimer);
  if(A.state==='sleep'&&!A.conversation&&!A.busy)setState(A.mode==='mini'?'minimized':'idle');
  A.sleepTimer=setTimeout(()=>{if(!A.conversation&&!A.busy&&!A.speaking)setState('sleep')},90000);
}
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,resetSleep,{passive:true}));

function localAction(message){
  const m=norm(message),has=re=>re.test(m);
  const opp=findOppFromText(message);
  const city=findCity(message);

  if(has(/\b(ajoute|ajouter|cree|creer|nouveau)\b.{0,22}\b(artiste|profil artiste)\b/)){P.view('artists');setTimeout(()=>q('#addArtistBtn')?.click(),240);return 'J’ouvre la création d’un profil artiste.'}
  if(has(/\b(ajoute|ajouter|cree|creer|nouveau)\b.{0,24}\b(prospect|contact|galerie|lieu)\b/)){P.view('crm');setTimeout(()=>q('#addLeadBtn')?.click(),240);return 'J’ouvre le CRM pour ajouter ce contact.'}
  if(has(/\b(connecte|connecter|connexion)\b.{0,18}\b(instagram|insta)\b/)){P.view('social');setTimeout(()=>{const b=q('#instagramConnect');flash(b)},260);return 'J’ouvre la connexion Instagram. Il restera à valider l’autorisation Meta.'}
  if(has(/\b(publie|publier|poste|poster)\b.{0,20}\b(instagram|insta)\b/)){P.view('social');setTimeout(()=>{const b=document.querySelector('[data-social-publish]');flash(b)},260);return 'J’ouvre la file Instagram. Confirme la publication sur le bouton Publier pour éviter un envoi accidentel.'}
  if(has(/\b(prepare|prépare|cree|crée|creer|génère|genere)\b.{0,24}\b(post|publication|carrousel|contenu)\b.{0,18}\b(instagram|insta)\b/)){P.view('studio');setTimeout(()=>flash(q('#queueInstagramBtn')),260);return 'J’ouvre le Studio pour préparer le contenu Instagram.'}
  if(has(/\b(instagram|insta|reseaux sociaux|réseaux sociaux)\b/)){P.view('social');return 'J’ouvre Instagram et la file de publication.'}
  if(has(/\b(carte|map|international|geographie|géographie)\b/)){P.view('map');return 'J’ouvre la carte internationale.'}

  if(has(/\b(lance|relance|demarre|demarrer)\b.{0,24}\bradar\b/)){
    P.view('radar');setTimeout(()=>{const b=q('#runRadar');flash(b);b?.click()},260);return 'Je lance le Radar.';
  }

  if(has(/\b(prepare|cree|creer|fais|genere|generer)\b.{0,28}\b(carrousel|contenu|publication)\b/)){
    const target=opp||(A.lastOppId?(P.state.opps||[]).find(o=>String(o.id)===String(A.lastOppId)):null);
    if(target&&createCarouselFor(target))return 'Je prépare le carrousel à partir de cette opportunité.';
    P.view('studio');return 'J’ouvre Contenu. Choisis l’opportunité et je pourrai la structurer.';
  }

  if(has(/\b(ouvre|ouvrir|affiche|montre)\b.{0,20}\b(fiche|expo|exposition|opportunite|open call|call)\b/)&&opp){
    openOpportunity(opp);return 'J’ouvre la fiche de '+(opp.title||'cette opportunité')+'.';
  }

  if(/\b(open calls?|opportunites?)\b/.test(m)&&city){
    filterOpenCalls(city);return 'J’ouvre les Open Calls et je filtre '+city+'.';
  }

  if(has(/\b(cherche|trouve|filtre|affiche|montre)\b/)&&city&&/\b(call|opportunite|expo|exposition)\b/.test(m)){
    filterOpenCalls(city);return 'Je filtre les opportunités pour '+city+'.';
  }

  if(opp&&has(/\b(ouvre|ouvrir|affiche|montre)\b/)){
    openOpportunity(opp);return 'J’ouvre '+(opp.title||'cette opportunité')+'.';
  }

  let v=null;
  if(has(/\b(accueil|dashboard|vue generale)\b/))v='dashboard';
  else if(has(/\bradar\b/))v='radar';
  else if(has(/\b(open calls?|opportunites?)\b/))v='opencalls';
  else if(has(/\b(instagram|insta|reseaux sociaux|réseaux sociaux)\b/))v='social';
  else if(has(/\b(contenu|studio|carrousel|story|stories|publication)\b/))v='studio';
  else if(has(/\b(carte|map|geographie|géographie|international)\b/))v='map';
  else if(has(/\b(artistes?|profils?)\b/))v='artists';
  else if(has(/\b(crm|prospection|prospects?|contacts?|galeries?|lieux?)\b/))v='crm';
  if(!v)return '';

  P.view(v);
  const label={dashboard:'l’accueil',radar:'le Radar',opencalls:'les Open Calls',studio:'le Studio Social',social:'Instagram',map:'la carte internationale',artists:'les profils artistes',crm:'le CRM'}[v];
  return 'J’ouvre '+label+'.';
}

async function askAI(msg){const ui='Section '+(document.body.dataset.view||'dashboard')+' · CRM '+(P.state.crm||[]).length+' · artistes '+(P.state.artists||[]).length+'. ';return P.api('/api/v32/plugy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:ui+'Réponds en 2 phrases maximum, sans détour. '+msg,page:document.body.dataset.view||'dashboard',mode:'fast',history:A.history.slice(-4).map(x=>({role:x.role,content:x.text}))})})}
async function askAIStream(msg,bubble){const payload={message:'Réponds en français en 2 phrases maximum, environ 70 mots. '+msg,page:document.body.dataset.view||'dashboard',history:A.history.slice(-4).map(x=>({role:x.role,content:x.text}))},res=await fetch('/api/v35/plugy/stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});if(!res.ok||!res.body)throw new Error('stream indisponible');const reader=res.body.getReader(),decoder=new TextDecoder();let buf='',answer='',voiceBuf='',spoken=false;const speakReady=()=>{const m=voiceBuf.match(/^([\s\S]{38,}?[.!?…])(?:\s|$)/);if(m){const part=m[1].trim();voiceBuf=voiceBuf.slice(m[0].length);enqueueSpeech(part,{cancel:!spoken});spoken=true}else if(voiceBuf.length>125){const cut=voiceBuf.lastIndexOf(' ',110),n=cut>55?cut:110,part=voiceBuf.slice(0,n).trim();voiceBuf=voiceBuf.slice(n);enqueueSpeech(part,{cancel:!spoken});spoken=true}};while(true){const {value,done}=await reader.read();buf+=decoder.decode(value||new Uint8Array(),{stream:!done});const lines=buf.split('\n');buf=lines.pop()||'';for(const line of lines){if(!line.trim())continue;let evt;try{evt=JSON.parse(line)}catch{continue}if(evt.type==='delta'&&evt.delta){answer+=String(evt.delta);voiceBuf+=String(evt.delta);if(bubble){bubble.textContent=answer;bubble.parentElement.scrollTop=bubble.parentElement.scrollHeight}speakReady()}}if(done)break}if(voiceBuf.trim()){enqueueSpeech(voiceBuf.trim(),{cancel:!spoken});spoken=true}return{answer:answer.trim(),spoken}}
async function handle(msg){msg=String(msg||'').trim();if(!msg||A.busy)return;if(/^(stop|arrête|arrete|tais-toi|tais toi)$/i.test(msg)){stopConversation(false);return}A.busy=true;addChat(msg,'user');remember('user',msg);if(q('#plugyLiveTranscript'))q('#plugyLiveTranscript').textContent=msg;setState('transcribing');const local=localAction(msg);if(local){addChat(local);remember('assistant',local);await speak(local);A.busy=false;if(A.conversation)setTimeout(()=>startListening(false),150);else setState('idle');return}setState('thinking');const bubble=addChat('…');try{let answer='',spoken=false;try{const r=await askAIStream(msg,bubble);answer=r.answer;spoken=r.spoken}catch{const r=await askAI(msg);answer=String(r.answer||'Analyse terminée.').trim();if(bubble)bubble.textContent=answer}if(!answer)answer='Analyse terminée.';if(bubble)bubble.textContent=answer;remember('assistant',answer);if(!spoken)await speak(answer);else await waitSpeechDrain()}catch{const fail='Je n’arrive pas à joindre mon moteur pour le moment.';if(bubble)bubble.textContent=fail;await speak(fail)}finally{A.busy=false;if(A.conversation)setTimeout(()=>startListening(false),160);else setState('idle')}}

q('#openPlugy')?.addEventListener('click',openPanel);q('#askPlugy')?.addEventListener('click',openPanel);q('#closeChat')?.addEventListener('click',closePanel);
q('#plugyVoiceBtn')?.addEventListener('click',()=>A.conversation?stopConversation(false):startListening(true));
q('#plugyFloatVoice')?.addEventListener('click',e=>{e.stopPropagation();A.conversation?stopConversation(false):startListening(true)});
q('#chatForm')?.addEventListener('submit',e=>{e.preventDefault();const i=q('#chatInput'),m=i?.value.trim();if(!m)return;i.value='';handle(m)});

function bind(el){
  if(!el)return;
  let pressX=0,pressY=0,dragging=false;
  el.addEventListener('dblclick',e=>{e.preventDefault();startListening(true)});
  el.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse')return;
    pressX=e.clientX;pressY=e.clientY;dragging=false;
    clearTimeout(A.longPress);
    A.longPress=setTimeout(()=>{if(!dragging)startListening(true)},560);
  });
  el.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse')return;
    if(Math.hypot(e.clientX-pressX,e.clientY-pressY)>9){dragging=true;clearTimeout(A.longPress)}
  },{passive:true});
  ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>{clearTimeout(A.longPress);dragging=false}));
  el.addEventListener('mouseenter',()=>{if(!A.conversation)setState('hover')});el.addEventListener('mouseleave',()=>{if(!A.conversation)setState(A.mode==='mini'?'minimized':'idle')});
}
bind(q('.plugy-stage'));bind(q('#plugyFloatVisual'));
q('#plugyFloatVisual')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();startListening(true)}});

let px=0,py=0,tx=0,ty=0,pr=0;
function ptick(){pr=0;px+=(tx-px)*.12;py+=(ty-py)*.12;const f=q('#plugyFloat');if(f){f.style.setProperty('--plugy-x',px.toFixed(2)+'px');f.style.setProperty('--plugy-y',py.toFixed(2)+'px')}if(Math.abs(tx-px)>.1||Math.abs(ty-py)>.1)pr=requestAnimationFrame(ptick)}
addEventListener('pointermove',e=>{if(matchMedia('(pointer:coarse)').matches)return;tx=(e.clientX/innerWidth-.5)*8;ty=(e.clientY/innerHeight-.5)*6;if(!pr)pr=requestAnimationFrame(ptick)},{passive:true});

const anchors={dashboard:[0,0],radar:[-10,-18],opencalls:[-18,-8],studio:[-30,-16],social:[-20,-10],map:[-16,-12],artists:[-20,-10],crm:[-12,-14]};
function updateAnchor(){
  const f=q('#plugyFloat');if(!f)return;
  const v=document.body.dataset.view||'dashboard';
  const a=anchors[v]||[0,0];
  const coarse=matchMedia('(pointer:coarse)').matches;
  f.style.setProperty('--plugy-anchor-x',(coarse?0:a[0])+'px');
  f.style.setProperty('--plugy-anchor-y',(coarse?0:a[1])+'px');
  if(!A.conversation&&!A.busy&&A.mode==='mini'){setState('moving');setTimeout(()=>{if(!A.conversation&&!A.busy&&A.mode==='mini')setState('minimized')},420)}
}
new MutationObserver(updateAnchor).observe(document.body,{attributes:true,attributeFilter:['data-view']});
updateAnchor();

let scrollQuiet=0;
function markScrolling(){
  document.body.dataset.plugyScrolling='1';
  clearTimeout(scrollQuiet);
  scrollQuiet=setTimeout(()=>{delete document.body.dataset.plugyScrolling;syncMode()},320);
}
addEventListener('scroll',markScrolling,{passive:true});

function avoidFocusedContent(){
  const el=document.activeElement,f=q('#plugyFloat');
  if(!f)return;
  if(!el||!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)){delete f.dataset.avoidSide;return}
  const r=el.getBoundingClientRect();
  if(innerWidth>920 && r.right>innerWidth*.58)f.dataset.avoidSide='left';
  else delete f.dataset.avoidSide;
}
addEventListener('focusin',avoidFocusedContent,true);
addEventListener('focusout',()=>setTimeout(avoidFocusedContent,0),true);

ensureFX();resetSleep();setState('idle');window.PlugyAssistant={start:startListening,stop:stopConversation,ask:handle,setState,setMode,state:A,openOpportunity,createCarouselFor,filterOpenCalls,rememberOpp,bumpSpeech};
})();
(()=>{
const P=window.PLUG65;if(!P)return;const q=P.q;
function bindV87Viewer(mv){
  if(!mv||mv.dataset.v87Bound==='1')return;mv.dataset.v87Bound='1';
  const float=q('#plugyFloat');
  const normal=()=>{try{mv.timeScale=1;mv.setAttribute('rotation-per-second','2.7deg')}catch{}};
  mv.addEventListener('pointerenter',()=>{try{mv.timeScale=1.18;mv.setAttribute('rotation-per-second','4.2deg')}catch{}});
  mv.addEventListener('pointerleave',normal);
  mv.addEventListener('pointerdown',()=>{try{mv.timeScale=1.30}catch{}});
  mv.addEventListener('pointerup',()=>{try{mv.timeScale=1.03}catch{}});
  mv.addEventListener('load',()=>{try{if((mv.availableAnimations||[]).includes('IdleBlink')){mv.animationName='IdleBlink';mv.play({repetitions:Infinity})}}catch{};float?.classList.add('is-ready');float?.classList.remove('model-error','model-pending')},{once:true});
  mv.addEventListener('error',()=>{float?.classList.add('model-error');float?.classList.remove('is-ready')});
  setTimeout(()=>{if(!mv.loaded&&!float?.classList.contains('is-ready'))float?.classList.add('model-pending')},4500);
}
bindV87Viewer(q('#plugyModel'));bindV87Viewer(q('#plugyFloatModel'));
})();