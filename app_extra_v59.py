from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse, Response
from urllib.parse import urljoin
import hashlib,re,time,html as html_lib,requests
import app as core
import app_extra_v43 as v43
from build_plugy_pink_v75 import build_plugy_pink_v75

app=v43.app
app.version='78.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v65.html'
GLB=BASE/'static'/'plugy_pink_v75.glb'
RESULT=build_plugy_pink_v75(GLB)
PLUGY_REFERENCE_ANIMATIONS=RESULT.get('animations',[])
PLUGY_REFERENCE_SHA256=RESULT.get('sha256','')
VERSION='78.20260922.1'
MEDIA_CACHE={}
MEDIA_BYTES_CACHE={}

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
      'X-Plug-Art-Version':'78.0',
      'X-Plug-Art-UI':'plugy-assistant-runtime-v78'
    })

@app.middleware('http')
async def v65_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/static/dashboard_v65.html','/static/dashboard_v65.css','/static/dashboard_v65_core.js','/static/dashboard_v65_studio.js','/static/plugy_assistant_v78.js','/static/plugy_pink_v75.glb') or p.startswith('/api/v32/content/image'):
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
        response.headers['Expires']='0'
    return response


def _attr(tag,name):
    m=re.search(rf'\b{name}\s*=\s*["\']([^"\']+)["\']',tag,re.I)
    return html_lib.unescape(m.group(1).strip()) if m else ''

def _media_score(url,context='',base=35):
    low=(url+' '+context).lower();score=base
    if any(k in low for k in ('hero','banner','open-call','opencall','exhibition','exposition','artwork','gallery','event','artist')):score+=18
    if any(k in low for k in ('logo','favicon','sprite','avatar','icon','emoji','pixel','tracking','placeholder','loader')):score-=90
    if any(k in low for k in ('thumb','thumbnail','small','150x','200x')):score-=16
    if any(k in low for k in ('1200','1600','1920','2048','large','original')):score+=8
    return score

def _official_media(url:str):
    now=time.time();hit=MEDIA_CACHE.get(url)
    if hit and now-hit[0] < 3600:return hit[1]
    found={}
    try:
        r=requests.get(url,timeout=10,headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/2.0','Accept':'text/html,application/xhtml+xml'},allow_redirects=True);r.raise_for_status();text=r.text[:1400000]
        def add(raw,source,context='',base=35):
            if not raw:return
            u=urljoin(r.url,html_lib.unescape(raw).strip())
            if not u.startswith(('http://','https://')) or u.lower().endswith(('.svg','.gif')):return
            score=_media_score(u,context,base);old=found.get(u)
            if not old or score>old['score']:found[u]={'url':u,'score':score,'source':source,'context':re.sub(r'\s+',' ',context or '').strip()[:140]}
        for pat in (r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\'][^>]+content=["\']([^"\']+)["\']',r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\']',r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']'):
            for raw in re.findall(pat,text,re.I):add(raw,'meta','official hero image',100)
        for raw in re.findall(r'["\']image["\']\s*:\s*["\']([^"\']+)["\']',text,re.I):add(raw,'json-ld','structured image',82)
        for tag in re.findall(r'<img\b[^>]*>',text,re.I):
            src=_attr(tag,'src') or _attr(tag,'data-src') or _attr(tag,'data-lazy-src') or _attr(tag,'data-original');alt=_attr(tag,'alt');cls=_attr(tag,'class');w=_attr(tag,'width');h=_attr(tag,'height');penalty=-24 if (w.isdigit() and int(w)<280) or (h.isdigit() and int(h)<220) else 0
            add(src,'img',alt+' '+cls,48+penalty);srcset=_attr(tag,'srcset') or _attr(tag,'data-srcset')
            if srcset:
                parts=[p.strip().split(' ')[0] for p in srcset.split(',') if p.strip()]
                if parts:add(parts[-1],'srcset',alt+' '+cls,58+penalty)
        ranked=sorted((v for v in found.values() if v['score']>0),key=lambda x:x['score'],reverse=True)[:18];MEDIA_CACHE[url]=(now,ranked);return ranked
    except Exception:MEDIA_CACHE[url]=(now,[]);return []

def _opportunity_media(oid:int):
    item=core.one('select id,title,source_url from opportunities where id=?',(oid,))
    if not item:raise HTTPException(404,'Opportunity not found')
    url=item.get('source_url') or '';return item,url,_official_media(url) if url else []

@app.get('/api/v66/opportunities/{oid}/media')
@app.get('/api/v67/opportunities/{oid}/media')
def opportunity_media_v67(oid:int):
    item,url,media=_opportunity_media(oid);return {'id':oid,'title':item.get('title'),'source_url':url,'images':[x['url'] for x in media],'media':media,'engine':'official-media-v2'}

@app.get('/api/v67/opportunities/{oid}/thumbnail')
def opportunity_thumbnail_v67(oid:int):
    item,url,media=_opportunity_media(oid);key=str(oid);now=time.time();cached=MEDIA_BYTES_CACHE.get(key)
    if cached and now-cached[0]<1800:return Response(content=cached[1],media_type=cached[2],headers={'Cache-Control':'public,max-age=1800'})
    headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/2.0','Referer':url or 'https://plug-art-live-production.up.railway.app/'}
    for candidate in media[:6]:
        try:
            rr=requests.get(candidate['url'],timeout=9,headers=headers,allow_redirects=True);ct=(rr.headers.get('content-type') or '').split(';')[0].lower()
            if rr.ok and ct.startswith('image/') and 1200<len(rr.content)<9000000:
                MEDIA_BYTES_CACHE[key]=(now,rr.content,ct)
                if len(MEDIA_BYTES_CACHE)>40:MEDIA_BYTES_CACHE.pop(next(iter(MEDIA_BYTES_CACHE)))
                return Response(content=rr.content,media_type=ct,headers={'Cache-Control':'public,max-age=1800','X-PLUG-Image-Source':candidate['source']})
        except Exception:pass
    return Response(status_code=404)

@app.get('/api/v65/status')
@app.get('/api/v66/status')
@app.get('/api/v67/status')
@app.get('/api/v68/status')
@app.get('/api/v69/status')
@app.get('/api/v70/status')
@app.get('/api/v71/status')
@app.get('/api/v72/status')
@app.get('/api/v73/status')
@app.get('/api/v74/status')
@app.get('/api/v75/status')
@app.get('/api/v77/status')
@app.get('/api/v78/status')
def status_v78():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'78.0',
      'ui':'plugy-assistant-runtime-v78',
      'reference_direction':'V75 visual identity plus PLUGY runtime with contextual UI actions, voice and mini-mode',
      'marketing_blocks':False,
      'internal_workspace':True,
      'runtime_split':True,
      'navigation_fixed':True,
      'typography':'Archivo + Inter Tight + IBM Plex Mono',
      'legacy_index_served':False,
      'single_mascot':True,
      'plugy_reference':'pink-v75-approved-plug-head',
      'plugy_expected_sha256':PLUGY_REFERENCE_SHA256,
      'plugy_reference_match':hashlib.sha256(raw).hexdigest()==PLUGY_REFERENCE_SHA256 if raw else False,
      'plugy_model_path':'/static/plugy_pink_v75.glb',
      'plugy_material':RESULT.get('material'),
      'legacy_model_refs_in_dashboard':sum(DASH.read_text(encoding='utf-8').count(x) for x in ('PLUGY_final_animated.glb','/static/plugy.glb')) if DASH.exists() else -1,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_animations':RESULT.get('animations',[]),
      'studio':'XXL typography + multi-frame + text-only + PLUG ART art generation',
      'layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'background':'responsive editorial workspace with simplified standard navigation and direct actions'
    }

print(f"PLUG_ART_V78_READY ui=plugy_assistant_runtime_v78 plugy=pink_lavender_plug_head voice=browser_stt_tts state_machine=on mini=on internal=on marketing=off studio=advanced plugy=on clean_shell=on legacy=off plugy_bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
