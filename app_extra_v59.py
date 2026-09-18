from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import hashlib
import app_extra_v43 as v43
from build_plugy_final_v57 import build_plugy_final_v57

app=v43.app
app.version='63.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v63.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='63.20260919.1'

for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v63():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART dashboard unavailable.</body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plugy-Version':'63.0',
      'X-Plug-Art-UI':'internal-glass-workspace'
    })

@app.middleware('http')
async def v63_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/static/dashboard_v63.html','/static/dashboard_v63.css','/static/dashboard_v63.js','/static/PLUGY_final_animated.glb') or p.startswith('/api/v32/content/image'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response

@app.get('/api/v63/status')
def status_v63():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'63.0',
      'ui':'internal-glass-workspace',
      'clean_shell':True,
      'legacy_index_served':False,
      'design':RESULT.get('design'),
      'plugy_body':False,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_nodes':RESULT.get('nodes',0),
      'plugy_animations':RESULT.get('animations',[]),
      'single_mascot':True,
      'studio':'advanced-manual-editor',
      'plugy_carousel_generation':True,
      'ai_image_endpoint':'/api/v32/content/image',
      'ai_image_status':'/api/v32/content/image/status',
      'manual_layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'navigation':'rail + segmented top + mobile dock',
      'background':'light translucent'
    }

print(f"PLUG_ART_V63_READY ui=internal_glass studio=advanced plugy_carousel=on ai_images=on clean_shell=on legacy=off plugy_bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
