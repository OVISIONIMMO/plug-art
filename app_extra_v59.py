from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
from urllib.parse import urljoin
import hashlib,re,time,html as html_lib,requests
import app as core
import app_extra_v43 as v43
from build_plugy_final_v57 import build_plugy_final_v57

app=v43.app
app.version='66.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v65.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT=build_plugy_final_v57(GLB)
VERSION='66.20260921.1'
MEDIA_CACHE={}

for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v65():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART workspace unavailable.</body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plug-Art-Version':'66.0',
      'X-Plug-Art-UI':'sober-operations-dashboard'
    })

@app.middleware('http')
async def v65_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/static/dashboard_v65.html','/static/dashboard_v65.css','/static/dashboard_v65_core.js','/static/dashboard_v65_studio.js','/static/PLUGY_final_animated.glb') or p.startswith('/api/v32/content/image'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response


def _official_media(url:str):
    now=time.time()
    hit=MEDIA_CACHE.get(url)
    if hit and now-hit[0] < 3600:
        return hit[1]
    try:
        r=requests.get(url,timeout=8,headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/1.0'},allow_redirects=True)
        r.raise_for_status()
        text=r.text[:900000]
        found=[]
        patterns=[
          r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\'][^>]+content=["\']([^"\']+)["\']',
          r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\']',
          r'<img[^>]+(?:src|data-src|data-lazy-src)=["\']([^"\']+)["\']'
        ]
        for pat in patterns:
            for raw in re.findall(pat,text,re.I):
                u=urljoin(r.url,html_lib.unescape(raw).strip())
                low=u.lower()
                if not u.startswith(('http://','https://')) or low.endswith('.svg') or any(k in low for k in ('favicon','sprite','avatar','icon-')):
                    continue
                if u not in found:
                    found.append(u)
                if len(found)>=12:
                    break
            if len(found)>=12:
                break
        MEDIA_CACHE[url]=(now,found)
        return found
    except Exception:
        MEDIA_CACHE[url]=(now,[])
        return []

@app.get('/api/v66/opportunities/{oid}/media')
def opportunity_media_v66(oid:int):
    item=core.one('select id,title,source_url from opportunities where id=?',(oid,))
    if not item:
        raise HTTPException(404,'Opportunity not found')
    url=item.get('source_url') or ''
    return {'id':oid,'title':item.get('title'),'source_url':url,'images':_official_media(url) if url else []}

@app.get('/api/v65/status')
@app.get('/api/v66/status')
def status_v66():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'66.0',
      'ui':'sober-operations-dashboard',
      'reference_direction':'light operational dashboard with separated radar, open calls, studio and instagram',
      'marketing_blocks':False,
      'internal_workspace':True,
      'runtime_split':True,
      'navigation_fixed':True,
      'typography':'Syne + Space Grotesk + DM Mono',
      'legacy_index_served':False,
      'single_mascot':True,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_animations':RESULT.get('animations',[]),
      'studio':'advanced manual + PLUGY + AI images',
      'layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'background':'light neutral operational workspace'
    }

print(f"PLUG_ART_V66_READY ui=sober_operations_dashboard internal=on marketing=off studio=advanced plugy=on clean_shell=on legacy=off plugy_bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
