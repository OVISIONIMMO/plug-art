from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import hashlib,re
import app_extra_v43 as v43
from build_plugy_final_v57 import build_plugy_final_v57

app=v43.app
app.version='59.1'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='59.1.20260918.3'

if INDEX.exists():
    page=INDEX.read_text(encoding='utf-8')
    page=re.sub(r'<script[^>]*data-plug-v37-route[^>]*>.*?</script>\s*','',page,flags=re.I|re.S)
    page=page.replace('v=59.20260918.1','v=59.20260918.3')
    INDEX.write_text(page,encoding='utf-8')

# The production entry point serves the freshly generated dashboard itself.
# This prevents old root responses from keeping an obsolete PLUGY layout on mobile.
for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v59_1():
    html=INDEX.read_text(encoding='utf-8') if INDEX.exists() else '<html><body></body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plugy-Version':'59.1'
    })

@app.middleware('http')
async def v59_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/index.html','/static/PLUGY_final_animated.glb') or 'plugy_v59_polished' in p:
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response

@app.get('/api/v59/status')
def status_v59():
    raw=GLB.read_bytes() if GLB.exists() else b''
    html=INDEX.read_text(encoding='utf-8') if INDEX.exists() else ''
    return {
      'ok':bool(raw and raw[:4]==b'glTF'),
      'version':'59.1',
      'design':RESULT.get('design'),
      'body':False,
      'bytes':len(raw),
      'sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'nodes':RESULT.get('nodes',0),
      'animations':RESULT.get('animations',[]),
      'runtime':'plugy_v59_polished.js' in html,
      'reference':'white pearl plug head + deep blue closed eyes + cyan/pink-violet rim',
      'mobile_layout':'integrated hero',
      'floating_mascot':False,
      'single_mascot':True,
      'fresh_root':True
    }

print(f"PLUG_ART_V59_1_READY bytes={GLB.stat().st_size if GLB.exists() else 0} design={RESULT.get('design')} animations={','.join(RESULT.get('animations',[]))} mobile=polished runtime=v59",flush=True)
