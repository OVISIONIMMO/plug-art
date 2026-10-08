(()=>{'use strict';
const REV='205.20261008.1';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));

function forceLight(){
  const html=document.documentElement,body=document.body;
  html.dataset.plugartTheme='light';
  html.style.backgroundColor='#ffffff';
  if(!body)return;
  body.classList.add('plugart-v205');
  ['dark','dark-theme','theme-dark','theme-black','night','night-theme'].forEach(c=>{
    html.classList.remove(c);body.classList.remove(c);
  });
  body.style.backgroundColor='#f7f9fc';
  q('meta[name="theme-color"]')?.setAttribute('content','#ffffff');
}

function updateVersion(){
  const bp=q('#buildPill'),sv=q('#sidebarVersion');
  if(bp)bp.textContent='V205';
  if(sv)sv.textContent='V205';
}

function classifyControls(root=document){
  const selectors=[
    '.nav-item','.sidebar-collapse','.global-search','.icon-btn','.text-btn','.primary-btn','.secondary-btn','.plugy-btn','.plugy-inline',
    '.toolbar-actions button','.bureau-actions button','.editor-actions button','.copy-format-toolbar button',
    '.map-filter-chips button','.content-mode-tabs button','.segment button','.format-row button',
    '.c200-drafts button','.c200-mini-actions button','.c200-secondary',
    '#creationV200 [data-c200-layout]','#creationV200 [data-c200-da]',
    '.bureau-mode-bar button','[data-bureau-mode]','.pdf-project-actions-v167 button',
    '.pdf-reader-toolbar-v167 button','.pdf-inspector-actions-v167 button','.pdf-add-elements-v168 button',
    '.pdf-template-gallery-v1692 button','.command-result','.create-grid button',
    '#dashboardV200 .v200-command','#dashboardV200 .v200-section-head button','#dashboardV200 .v200-opp button'
  ];
  selectors.forEach(sel=>qa(sel,root).forEach(el=>el.classList.add('v205-glass')));
  qa('button',root).forEach(btn=>{
    btn.style.removeProperty('opacity');
    btn.style.removeProperty('visibility');
    if(!btn.getAttribute('aria-label')){
      const label=(btn.textContent||'').trim().replace(/\s+/g,' ').slice(0,90);
      if(label)btn.setAttribute('aria-label',label);
      else if(btn.title)btn.setAttribute('aria-label',btn.title);
    }
  });
}

function svgFallback(label='PLUG ART'){
  const safe=String(label||'PLUG ART').replace(/[&<>"']/g,'').slice(0,42);
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8faff"/><stop offset=".48" stop-color="#e9efff"/><stop offset="1" stop-color="#f5edff"/></linearGradient>'+
    '<radialGradient id="a" cx=".22" cy=".18" r=".6"><stop stop-color="#6384ff" stop-opacity=".42"/><stop offset="1" stop-color="#6384ff" stop-opacity="0"/></radialGradient>'+
    '<radialGradient id="b" cx=".8" cy=".78" r=".62"><stop stop-color="#8a68ff" stop-opacity=".28"/><stop offset="1" stop-color="#8a68ff" stop-opacity="0"/></radialGradient></defs>'+
    '<rect width="1200" height="800" rx="42" fill="url(#g)"/><rect width="1200" height="800" rx="42" fill="url(#a)"/><rect width="1200" height="800" rx="42" fill="url(#b)"/>'+
    '<circle cx="90" cy="90" r="20" fill="#315dff" opacity=".9"/><text x="90" y="660" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial" font-size="26" letter-spacing="7" fill="#315dff" opacity=".58">PLUG ART</text>'+
    '<text x="90" y="715" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial" font-size="38" font-weight="700" fill="#182033">'+safe+'</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

function installMediaFallback(root=document){
  qa('img',root).forEach(img=>{
    if(img.dataset.v205Watch)return;
    img.dataset.v205Watch='1';
    const fail=()=>{
      if(img.dataset.v205Fallback)return;
      img.dataset.v205Fallback='1';
      img.classList.add('v205-media-fallback');
      const label=img.alt||img.dataset.title||'Visuel PLUG ART';
      img.src=svgFallback(label);
      img.removeAttribute('srcset');
    };
    img.addEventListener('error',fail,{once:true});
    if(img.complete && img.naturalWidth===0 && img.getAttribute('src'))fail();
  });
}

function polishDashboard(){
  const root=q('#dashboardV200');if(!root)return;
  qa('.v200-note',root).forEach(el=>el.remove());
  qa('.v200-command',root).forEach((btn,i)=>{
    btn.classList.add('v205-glass');
    btn.dataset.v205Index=String(i+1);
  });
  const sections=qa('.v200-feed,.v200-radar-card',root);
  sections.forEach(el=>el.dataset.v205Surface='1');
}

function polishCreation(){
  const root=q('#creationV200');if(!root)return;
  root.dataset.v205Ready='1';
  classifyControls(root);
}

function polishBureau(){
  const root=q('#view-bureau');if(!root)return;
  root.dataset.v205Ready='1';
  classifyControls(root);
}

function makeMiniPlugyReliable(){
  const existing=q('#v204PlugyMini')||q('.v204-plugy-mini')||q('#v205PlugyMini');
  if(existing){
    existing.classList.add('v205-plugy-mini');
    existing.removeAttribute('hidden');
    existing.style.removeProperty('display');
    return;
  }
  const b=document.createElement('button');
  b.id='v205PlugyMini';b.className='v205-plugy-mini v205-glass';b.type='button';b.setAttribute('aria-label','Ouvrir PLUGY');
  b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:280;width:58px;height:58px;display:grid;place-items:center;border-radius:19px';
  b.innerHTML='<span style="width:35px;height:28px;border-radius:10px;background:linear-gradient(145deg,#fff,#edf2ff);border:1px solid #ccd5e6;position:relative;display:block"><i style="position:absolute;left:8px;top:10px;width:5px;height:5px;border-radius:50%;background:#315dff;box-shadow:14px 0 0 #315dff"></i></span>';
  b.onclick=()=>{
    const top=q('#topPlugy');
    if(top){top.click();return}
    q('[data-open-plugy]')?.click();
  };
  document.body.appendChild(b);
}

function refresh(){
  forceLight();
  updateVersion();
  classifyControls();
  installMediaFallback();
  polishDashboard();
  polishCreation();
  polishBureau();
  makeMiniPlugyReliable();
  window.__PLUGART_V205_READY=true;
  document.documentElement.dataset.plugartUi='205';
}

let scheduled=false;
function schedule(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;refresh()});
}

function boot(){
  refresh();
  setTimeout(refresh,250);
  setTimeout(refresh,900);
  const mo=new MutationObserver(schedule);
  mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
  document.addEventListener('plugart:route',()=>setTimeout(refresh,40));
  window.addEventListener('pageshow',refresh);
  console.info('[PLUG ART] V205 white liquid-glass patch active',REV);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();