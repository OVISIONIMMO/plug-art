from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import hashlib
import app_extra_v43 as v43
from build_plugy_final_v57 import build_plugy_final_v57

app=v43.app
app.version='62.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v62.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='62.20260919.1'

# Production now serves a clean dashboard shell with no legacy index/runtime injection.
for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v62():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART dashboard unavailable.</body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plugy-Version':'62.0',
      'X-Plug-Art-UI':'signal-desk-bento'
    })

@app.middleware('http')
async def v62_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/static/dashboard_v62.html','/static/dashboard_v62.css','/static/dashboard_v62.js','/static/PLUGY_final_animated.glb'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response

@app.get('/api/v62/status')
def status_v62():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'62.0',
      'ui':'signal-desk-bento',
      'clean_shell':True,
      'legacy_index_served':False,
      'design':RESULT.get('design'),
      'plugy_body':False,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_nodes':RESULT.get('nodes',0),
      'plugy_animations':RESULT.get('animations',[]),
      'single_mascot':True,
      'studio':'maximized',
      'navigation':'rail + segmented top + mobile dock',
      'background':'immersive teal glass'
    }

print(f"PLUG_ART_V62_READY ui=signal_desk_bento clean_shell=on legacy=off plugy_bytes={GLB.stat().st_size if GLB.exists() else 0} studio=maximized",flush=True)
