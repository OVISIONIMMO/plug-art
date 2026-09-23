
(function(){
'use strict';

const ready=fn=>document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',fn,{once:true})
  :fn();

ready(()=>{
  const P=window.PLUG65||{};
  const q=P.q||((s,r=document)=>r.querySelector(s));
  const qa=P.qa||((s,r=document)=>Array.from(r.querySelectorAll(s)));
  const go=P.view||(()=>{});

  document.body.classList.add('v89-ui','v100-ui','v101-ui');
  document.documentElement.dataset.plugartUi='v101';

  const toast=document.createElement('div');
  toast.className='v101-toast';
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  document.body.appendChild(toast);
  let toastTimer=0;
  function notify(message){
    if(!message)return;
    toast.textContent=message;
    toast.classList.remove('show');
    requestAnimationFrame(()=>toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1800);
  }

  const topRight=q('.top-right');
  if(topRight&&!q('#v101Focus')){
    const focus=document.createElement('button');
    focus.type='button';
    focus.id='v101Focus';
    focus.className='v101-focus-toggle';
    focus.textContent='Focus';
    focus.title='Agrandir l’espace de travail';
    focus.setAttribute('aria-pressed','false');
    const create=q('#v89CreateButton');
    topRight.insertBefore(focus,create||topRight.firstChild);
  }

  const focusBtn=q('#v101Focus');
  const focusKey='plugart_v101_focus';
  function setFocus(on,announce=false){
    document.body.dataset.focus=on?'on':'off';
    if(focusBtn)focusBtn.setAttribute('aria-pressed',on?'true':'false');
    try{localStorage.setItem(focusKey,on?'on':'off')}catch{}
    if(announce)notify(on?'Mode Focus activé':'Mode Focus désactivé');
    setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
  }
  let savedFocus=false;
  try{savedFocus=localStorage.getItem(focusKey)==='on'}catch{}
  setFocus(savedFocus,false);
  focusBtn?.addEventListener('click',()=>setFocus(document.body.dataset.focus!=='on',true));

  function ensureCompat(){
    document.body.classList.add('v89-ui','v100-ui','v101-ui');
  }

  const pageNames={
    dashboard:'Accueil',radar:'Radar',opencalls:'Opportunités',map:'Carte',
    studio:'Studio',social:'Instagram',artists:'Artistes',crm:'CRM',builder:'Interface Lab'
  };

  function syncMobileDock(){
    const id=document.body.dataset.view||'dashboard';
    qa('.mobile-dock [data-view]').forEach(b=>{
      const active=b.dataset.view===id;
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
  }

  function syncTop(){
    const id=document.body.dataset.view||'dashboard';
    const title=q('#pageTitle');
    if(title&&pageNames[id])title.textContent=pageNames[id];
    syncMobileDock();
  }

  addEventListener('plugart:view',e=>{
    ensureCompat();
    syncTop();
    const id=e?.detail?.id||document.body.dataset.view;
    if(id&&pageNames[id])notify(pageNames[id]);
  });

  // Mobile viewport / virtual keyboard stabilization for iOS Safari.
  function syncViewport(){
    const vv=window.visualViewport;
    const h=vv?.height||window.innerHeight;
    const top=vv?.offsetTop||0;
    document.documentElement.style.setProperty('--v101-viewport-h',h+'px');
    document.documentElement.style.setProperty('--v101-viewport-top',top+'px');
    const keyboard=window.innerHeight-h>150;
    document.body.dataset.keyboard=keyboard?'open':'closed';
  }
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncViewport,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(syncViewport,120),{passive:true});
  addEventListener('resize',syncViewport,{passive:true});
  syncViewport();

  // Avoid invisible decorative layers stealing taps after transitions.
  const deadSelectors=[
    '.room-backdrop','.plugy-orbit','.plugy-stage-label','.v89-scroll-progress'
  ];
  deadSelectors.forEach(sel=>qa(sel).forEach(el=>el.style.pointerEvents='none'));

  // Use pointer-up semantics for the new tool deck, which is more reliable on iOS
  // when the page was just scrolled.
  qa('[data-v100-view]').forEach(btn=>{
    if(btn.dataset.v101Bound)return;
    btn.dataset.v101Bound='1';
    btn.addEventListener('pointerup',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      const id=btn.dataset.v100View;
      if(id){e.preventDefault();go(id)}
    });
  });

  // Stabilise links and buttons that can accidentally be dragged on Safari.
  qa('button,a,[role="button"]').forEach(el=>{
    el.setAttribute('draggable','false');
    if(el.tagName==='BUTTON'&&!el.getAttribute('type'))el.setAttribute('type','button');
  });

  // The create sheet and command palette stay scrollable without moving the page below.
  qa('.v89-overlay').forEach(overlay=>{
    overlay.addEventListener('touchmove',e=>{
      if(!e.target.closest('.v89-command-card,.v89-create-sheet'))e.preventDefault();
    },{passive:false});
  });

  // Small, useful home status block. No vanity KPI.
  const deck=q('.v100-tool-deck');
  if(deck&&!q('#v101ContextStatus')){
    const card=document.createElement('button');
    card.type='button';
    card.id='v101ContextStatus';
    card.className='v101-status-card';
    card.innerHTML='<i>⌁</i><span><strong>PLUGY est disponible</strong><span>Actions, Radar, création et organisation</span></span><b>OUVRIR</b>';
    card.addEventListener('click',()=>q('#openPlugy')?.click());
    deck.insertAdjacentElement('afterend',card);
  }

  // Context-sensitive primary action on mobile: the plus button opens the existing create sheet.
  const create=q('#v89CreateButton');
  create?.setAttribute('aria-label','Créer un nouvel élément');

  // Focus shortcut: Cmd/Ctrl + .  (and F on non-input desktop).
  addEventListener('keydown',e=>{
    const tag=(e.target?.tagName||'').toLowerCase();
    const typing=['input','textarea','select'].includes(tag)||e.target?.isContentEditable;
    if((e.metaKey||e.ctrlKey)&&e.key==='.'){
      e.preventDefault();setFocus(document.body.dataset.focus!=='on',true);return;
    }
    if(!typing&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key.toLowerCase()==='f'&&innerWidth>980){
      e.preventDefault();setFocus(document.body.dataset.focus!=='on',true);
    }
  },true);

  // Prevent the floating agent from sitting on the mobile dock or the keyboard.
  function syncPlugy(){
    const float=q('#plugyFloat');
    if(!float)return;
    const mobile=matchMedia('(max-width:720px)').matches;
    if(mobile&&document.body.dataset.keyboard==='open'){
      float.style.visibility='hidden';
      float.style.pointerEvents='none';
    }else{
      float.style.visibility='';
      float.style.pointerEvents='';
    }
  }
  window.visualViewport?.addEventListener('resize',syncPlugy,{passive:true});
  addEventListener('plugart:view',syncPlugy);
  syncPlugy();

  // Compatibility observer: older modules may replace body classes while applying design presets.
  new MutationObserver(()=>{
    ensureCompat();
    syncTop();
    syncPlugy();
  }).observe(document.body,{attributes:true,attributeFilter:['class','data-view']});

  // One-tap diagnostic: existing quality tool remains intact; a long press shows runtime state.
  const health=q('#layoutHealth');
  if(health){
    let timer=0;
    health.addEventListener('pointerdown',()=>{
      timer=setTimeout(()=>{
        const id=document.body.dataset.view||'dashboard';
        notify('V101 · '+(pageNames[id]||id)+' · interface tactile active');
      },650);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>health.addEventListener(ev,()=>clearTimeout(timer)));
  }

  syncTop();
  ensureCompat();

  window.PLUGART_V101={
    version:'101.0',
    focus:on=>setFocus(!!on,true),
    notify,
    repair:()=>{
      ensureCompat();syncViewport();syncTop();syncPlugy();
      notify('Interface recalée');
    }
  };
});
})();
