from pathlib import Path
import re
from fastapi import Request
from starlette.middleware.gzip import GZipMiddleware
import app_extra_v33 as v33

app=v33.app
app.version='34.0'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'
SRC_JS=BASE/'static'/'site_v33.js'
SRC_CSS=BASE/'static'/'site_v33.css'
PATCH_CSS=BASE/'static'/'site_v34.css'
RUNTIME_JS=BASE/'static'/'site_v34_runtime.js'
RUNTIME_CSS=BASE/'static'/'site_v34_runtime.css'
VERSION='34.20260913.1'
REMOVE=('glass_v15.css','visual_v16.css','site_v24.css','site_v30.css','studio_v26.css','studio_v28.css','studio_v26.js','studio_v32.js','thumbnail_v16.js','site_v33.css','site_v33.js','site_v34.css','site_v34_runtime.css','site_v34_runtime.js')

def remove_asset(page,name):
    e=re.escape(name)
    page=re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
    page=re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*','',page,flags=re.I)
    return page

def build_assets():
    css=SRC_CSS.read_text(encoding='utf-8')+'\n'+PATCH_CSS.read_text(encoding='utf-8')
    css+='\n#plugyFree33{filter:drop-shadow(0 20px 28px rgba(67,68,160,.16));will-change:auto}#plugyModel33{transform:translateZ(0)}@media(max-width:820px){#plugyFree33{filter:drop-shadow(0 14px 20px rgba(67,68,160,.14))}.v33-agent-space:before{filter:blur(14px)}}\n'
    RUNTIME_CSS.write_text(css,encoding='utf-8')
    js=SRC_JS.read_text(encoding='utf-8')
    js=js.replace("sleep(2800)","sleep(1900)")
    js=js.replace("buildDashboard();buildAgent();syncPage();loadContext('explorer');","buildDashboard();buildAgent();syncPage();")
    js+='''\n;(()=>{let p;const css=['/static/studio_v26.css?v=26.20260910.1','/static/studio_v28.css?v=28.20260911.1'],scripts=['/static/studio_v26.js?v=26.20260910.1','/static/studio_v32.js?v=32.20260911.1'];const style=h=>new Promise(r=>{const l=document.createElement('link');l.rel='stylesheet';l.href=h;l.onload=l.onerror=r;document.head.appendChild(l)});const script=s=>new Promise((r,j)=>{const e=document.createElement('script');e.src=s;e.defer=true;e.onload=r;e.onerror=j;document.body.appendChild(e)});window.__plugEnsureStudio=()=>p||(p=(async()=>{await Promise.all(css.map(style));for(const s of scripts){try{await script(s)}catch{}}document.documentElement.classList.add('v34-studio-loaded')})());document.addEventListener('click',e=>{if(e.target.closest('[data-page="content"]'))window.__plugEnsureStudio()},{capture:true});if(location.hash==='#content')window.__plugEnsureStudio();const run=()=>{try{window.__plugBaseLoad?.()}catch{}};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:850});else setTimeout(run,220)})();\n'''
    RUNTIME_JS.write_text(js,encoding='utf-8')

def inject():
    build_assets()
    page=INDEX.read_text(encoding='utf-8')
    for name in REMOVE: page=remove_asset(page,name)
    page=re.sub(r'<link[^>]+rel=["\']preload["\'][^>]+plugy_head_v(?:26|33)\.glb[^>]*>\s*','',page,flags=re.I)
    page=page.replace('<script>window.__PLUG_V33=true;window.__PLUG_HEAD_ONLY=true;</script>','')
    page=page.replace('renderDrafts();load();','renderDrafts();window.__plugBaseLoad=load;')
    page=page.replace('</head>',f'<script>window.__PLUG_V34=true;window.__PLUG_HEAD_ONLY=true;</script>\n<link rel="stylesheet" href="/static/site_v34_runtime.css?v={VERSION}">\n</head>',1)
    page=page.replace('</body>',f'<script defer src="/static/site_v34_runtime.js?v={VERSION}"></script>\n</body>',1)
    INDEX.write_text(page,encoding='utf-8')
    return [x for x in REMOVE if x in page]

LEGACY=inject()
try: app.add_middleware(GZipMiddleware,minimum_size=1200,compresslevel=5)
except Exception: pass

@app.middleware('http')
async def cache_v34(request:Request,call_next):
    response=await call_next(request); p=request.url.path
    if p in ('/static/site_v34_runtime.css','/static/site_v34_runtime.js','/static/plugy_head_v33.glb'):
        response.headers['Cache-Control']='public, max-age=31536000, immutable'
    elif p.startswith('/api/opportunities/') and p.endswith('/thumbnail'):
        response.headers['Cache-Control']='public, max-age=3600, stale-while-revalidate=86400'
    elif p in ('/','/index.html'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
    return response

@app.get('/api/v34/status')
def status_v34():
    page=INDEX.read_text(encoding='utf-8')
    return {'ok':True,'version':'34.0','legacy_refs':LEGACY,'runtime_css_bytes':RUNTIME_CSS.stat().st_size,'runtime_js_bytes':RUNTIME_JS.stat().st_size,'studio_lazy':True,'gzip':True,'base_load_deferred':'window.__plugBaseLoad=load' in page}

print(f'PLUG_ART_V34_READY legacy={len(LEGACY)} css={RUNTIME_CSS.stat().st_size} js={RUNTIME_JS.stat().st_size}',flush=True)
