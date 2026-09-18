from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import hashlib
import app_extra_v43 as v43
from build_plugy_final_v57 import build_plugy_final_v57

app=v43.app
app.version='64.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v64.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='64.20260919.1'

for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v64():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART workspace unavailable.</body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plug-Art-Version':'64.0',
      'X-Plug-Art-UI':'reference-glass-control-desk'
    })

@app.middleware('http')
async def v64_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/static/dashboard_v64.html','/static/dashboard_v64.css','/static/dashboard_v64.js','/static/PLUGY_final_animated.glb') or p.startswith('/api/v32/content/image'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response

@app.get('/api/v64/status')
def status_v64():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'64.0',
      'ui':'reference-glass-control-desk',
      'reference_direction':'dark translucent smart-control bento',
      'marketing_blocks':False,
      'internal_workspace':True,
      'legacy_index_served':False,
      'single_mascot':True,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_animations':RESULT.get('animations',[]),
      'studio':'advanced manual + PLUGY + AI images',
      'layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'background':'immersive room-like dark green glass'
    }

print(f"PLUG_ART_V64_READY ui=reference_glass_control_desk internal=on marketing=off studio=advanced plugy=on clean_shell=on legacy=off plugy_bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
