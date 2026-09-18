from pathlib import Path
from fastapi import Request
import hashlib, re
import app_extra_v43 as v58
from build_plugy_final_v57 import build_plugy_final_v57

app=v58.app
app.version='59.0'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='59.20260918.1'

# V59 garde le dashboard interne et remplace seulement PLUGY par la référence simple.
# On retire l'ancien bootstrap V37 qui pouvait encore forcer une vue héritée.
if INDEX.exists():
    page=INDEX.read_text(encoding='utf-8')
    page=re.sub(r'<script[^>]*data-plug-v37-route[^>]*>.*?</script>\s*','',page,flags=re.I|re.S)
    page=page.replace('v=58.1.20260917.2','v=59.20260918.1')
    INDEX.write_text(page,encoding='utf-8')

@app.middleware('http')
async def v59_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/index.html','/static/PLUGY_final_animated.glb') or 'plugy_v58_visible' in p:
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response

@app.get('/api/v59/status')
def status_v59():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF'),'version':'59.0',
      'design':RESULT.get('design'),'body':False,'bytes':len(raw),
      'sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'nodes':RESULT.get('nodes',0),'animations':RESULT.get('animations',[]),
      'reference':'white pearl plug head + deep blue closed eyes + cyan/pink lower rim',
      'single_mascot':True
    }

print(f"PLUG_ART_V59_READY bytes={GLB.stat().st_size if GLB.exists() else 0} design={RESULT.get('design')} animations={','.join(RESULT.get('animations',[]))}",flush=True)
