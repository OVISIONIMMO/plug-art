from __future__ import annotations
from pathlib import Path
import asyncio, base64, hashlib, io, json, os, re, time, html
import httpx
from PIL import Image, ImageOps
from urllib.parse import quote
import requests
from fastapi import Body, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
from starlette.middleware.gzip import GZipMiddleware

class SelectiveGZipMiddleware(GZipMiddleware):
    async def __call__(self, scope, receive, send):
        # NDJSON must reach the reader immediately, including small text deltas.
        if scope.get("path")=="/api/v179/plugy/stream":
            await self.app(scope,receive,send)
        else:
            await super().__call__(scope,receive,send)

import app_extra_v59 as v59

app = v59.app
app.version = '205.0'
BASE = Path(__file__).resolve().parent
app.user_middleware=[m for m in app.user_middleware if not issubclass(m.cls,GZipMiddleware)]
app.add_middleware(SelectiveGZipMiddleware, minimum_size=900, compresslevel=5)
GENERATED = Path(os.getenv('PLUGART_GENERATED_DIR', '/data/generated-content-v179'))
GENERATED.mkdir(parents=True, exist_ok=True)

OPENAI_RESPONSES = 'https://api.openai.com/v1/responses'
OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations'
FAST_MODEL = os.getenv('PLUGY_FAST_MODEL', 'gpt-5.6-luna').strip() or 'gpt-5.6-luna'
IMAGE_MODELS = ('gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-2')
IMAGE_DEADLINE_SECONDS=max(10,min(80,float(os.getenv('PLUGART_IMAGE_DEADLINE_SECONDS','75'))))
IMAGE_CONCURRENCY=asyncio.Semaphore(2)
DEFAULT_IMAGE_MODEL = os.getenv('PLUGART_IMAGE_MODEL', '').strip()
if DEFAULT_IMAGE_MODEL not in IMAGE_MODELS:
    DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare'

def _clean(value, limit=6000):
    return re.sub(r'\s+', ' ', str(value or '')).strip()[:limit]

def _local_answer(message: str):
    try:
        result = v59.core.plugy(v59.core.PlugyMessage(message=message))
        return _clean((result or {}).get('answer') or 'Je suis prêt à t’aider.', 5000)
    except Exception:
        return 'Je suis prêt à t’aider. Réessaie dans un instant.'

def _chunks(text: str, width=8):
    text = str(text or '')
    for i in range(0, len(text), width):
        yield text[i:i+width]

@app.post('/api/v179/plugy/stream')
def plugy_stream_v179(payload: dict = Body(default={})):
    payload = payload or {}
    message = _clean(payload.get('message'), 7000)
    if not message:
        raise HTTPException(422, 'Message vide')
    page = _clean(payload.get('page') or 'creation', 40).lower()
    history = []
    for item in (payload.get('history') or [])[-5:]:
        if not isinstance(item, dict):
            continue
        content = _clean(item.get('content'), 800)
        if content:
            history.append({
                'role': 'assistant' if item.get('role') == 'assistant' else 'user',
                'content': content,
            })
    key = os.getenv('OPENAI_API_KEY', '').strip()

    def local_stream():
        yield json.dumps({'type': 'meta', 'state': 'thinking', 'model': 'local'}, ensure_ascii=False) + '\n'
        answer = _local_answer(message)
        for part in _chunks(answer):
            yield json.dumps({'type': 'delta', 'delta': part}, ensure_ascii=False) + '\n'
        yield json.dumps({'type': 'done', 'model': 'local', 'fallback': True}, ensure_ascii=False) + '\n'

    if not key:
        return StreamingResponse(local_stream(), media_type='application/x-ndjson', headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

    memory = '\n'.join(f"{x['role'].upper()}: {x['content']}" for x in history)
    instructions = (
        "Tu es PLUGY, copilote créatif interne de PLUG ART. "
        "Réponds en français, de façon concise, professionnelle et immédiatement exploitable. "
        "Pour les contenus sociaux, structure clairement les slides, les angles et le CTA. "
        "N'invente aucune date, prix, lieu, lien ou information factuelle absente du brief."
    )
    user_input = f"PAGE: {page}\nHISTORIQUE:\n{memory}\nDEMANDE:\n{message}"
    body = {
        'model': FAST_MODEL,
        'instructions': instructions,
        'input': user_input,
        'store': False,
        'max_output_tokens': 1300 if page=='creation' else 520,
        'text': {'verbosity': 'low'},
        'stream': True,
    }

    def generate():
        started = time.time()
        deadline=time.monotonic()+60
        saw = False
        try:
            with requests.post(
                OPENAI_RESPONSES,
                headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
                json=body,
                stream=True,
                timeout=(5, 40),
            ) as response:
                if not response.ok:
                    raise RuntimeError(f'HTTP {response.status_code}: {response.text[:240]}')
                yield json.dumps({'type': 'meta', 'state': 'thinking', 'model': FAST_MODEL}, ensure_ascii=False) + '\n'
                for raw in response.iter_lines(chunk_size=1, decode_unicode=True):
                    if time.monotonic()>deadline:raise TimeoutError('Délai global texte dépassé')
                    if not raw or not raw.startswith('data:'):
                        continue
                    data = raw[5:].strip()
                    if not data or data == '[DONE]':
                        continue
                    try:
                        event = json.loads(data)
                    except Exception:
                        continue
                    etype = event.get('type')
                    if etype == 'response.output_text.delta' and event.get('delta'):
                        saw = True
                        yield json.dumps({'type': 'delta', 'delta': str(event['delta'])}, ensure_ascii=False) + '\n'
                    elif etype == 'response.completed':
                        break
                    elif etype in {'error', 'response.failed'}:
                        raise RuntimeError('stream error')
            if not saw:
                raise RuntimeError('aucun texte streamé')
            elapsed = int((time.time() - started) * 1000)
            print(f'PLUGY_V179_STREAM_OK model={FAST_MODEL} elapsed_ms={elapsed} page={page}', flush=True)
            yield json.dumps({'type': 'done', 'model': FAST_MODEL, 'latency_ms': elapsed}, ensure_ascii=False) + '\n'
        except Exception as exc:
            print(f'PLUGY_V179_STREAM_FALLBACK {type(exc).__name__}: {str(exc)[:220]}', flush=True)
            if saw:
                yield json.dumps({'type':'error','message':'Texte interrompu · réessaie'},ensure_ascii=False)+'\n'
                return
            answer = _local_answer(message)
            for part in _chunks(answer):
                yield json.dumps({'type': 'delta', 'delta': part}, ensure_ascii=False) + '\n'
            yield json.dumps({'type': 'done', 'model': 'local-fallback', 'fallback': True}, ensure_ascii=False) + '\n'

    return StreamingResponse(generate(), media_type='application/x-ndjson', headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

def _size_for_ratio(ratio: str):
    ratio = _clean(ratio, 12)
    if ratio == '1:1':
        return '1024x1024'
    if ratio in {'16:9', '3:2'}:
        return '1536x1024'
    return '1024x1536'

def _image_prompt(prompt: str, style: str):
    styles = {
        'photo': 'premium photorealistic editorial photography',
        'gallery': 'photorealistic contemporary art gallery',
        'portrait': 'premium editorial portrait of a contemporary artist',
        'urban': 'contemporary urban art and culture scene in Europe',
        'studio': 'photorealistic contemporary artist studio',
        'architecture': 'premium cultural architecture photography',
    }
    return (
        f"{styles.get(style, styles['photo'])}. {prompt}. "
        "High-end PLUG ART social visual. No typography, no letters, no logos, no watermark, no UI mockup. "
        "Refined lighting, believable materials, strong contemporary editorial composition."
    )

def _fallback_palette(seed: str):
    digest = hashlib.sha256(str(seed or 'PLUG ART').encode('utf-8')).hexdigest()
    colors = ['#'+digest[i:i+6] for i in (0, 6, 12)]
    return colors

def _fallback_svg(label: str, seed: str='', background: bool=False):
    safe = html.escape(_clean(label or 'PLUG ART', 90))
    c1, c2, c3 = _fallback_palette(seed or safe)
    labels = '' if background else f'''<text x="76" y="1050" fill="#ffffff" opacity=".62" font-family="Arial, Helvetica, sans-serif" font-size="28" letter-spacing="8">PLUG ART</text>
    <text x="76" y="1120" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">{safe[:42]}</text>
    <text x="76" y="1180" fill="#ffffff" opacity=".58" font-family="Arial, Helvetica, sans-serif" font-size="22">VISUEL DE SECOURS · IMAGE SOURCE OU IA À REMPLACER</text>'''
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 1024 1280">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="{c1}"/>
        <stop offset=".56" stop-color="{c2}"/>
        <stop offset="1" stop-color="{c3}"/>
      </linearGradient>
      <radialGradient id="r" cx=".72" cy=".18" r=".72">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".72"/>
        <stop offset=".42" stop-color="#ffffff" stop-opacity=".08"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="42"/></filter>
    </defs>
    <rect width="1024" height="1280" fill="#101114"/>
    <rect width="1024" height="1280" fill="url(#g)" opacity=".76"/>
    <circle cx="790" cy="230" r="390" fill="url(#r)"/>
    <circle cx="190" cy="1040" r="360" fill="#ffffff" opacity=".08" filter="url(#blur)"/>
    <path d="M-80 870 C170 720 240 980 520 830 S900 690 1120 780 L1120 1380 L-80 1380 Z" fill="#0b0c0f" opacity=".55"/>
    <g fill="none" stroke="#ffffff" stroke-opacity=".16">
      <circle cx="780" cy="330" r="210"/><circle cx="780" cy="330" r="280"/>
      <path d="M80 220H944M80 1020H944"/>
    </g>
    {labels}
    </svg>'''
    return svg.encode('utf-8')

def _fallback_url(label: str, seed: str=''):
    return '/api/v201/visual-fallback?label='+quote(_clean(label or 'PLUG ART', 90))+'&seed='+quote(_clean(seed or label or 'plug-art', 120))

def _fallback_result(prompt: str, reason: str='fallback'):
    label = _clean(prompt or 'PLUG ART', 90)
    return {
        'ok': True,
        'url': _fallback_url(label, prompt),
        'model': 'local-svg-fallback',
        'bytes': 0,
        'elapsed_ms': 0,
        'fallback': True,
        'fallback_reason': _clean(reason, 220),
    }

@app.get('/api/v201/visual-fallback')
def visual_fallback_v201(label: str='PLUG ART', seed: str='', background: bool=False):
    raw = _fallback_svg(label, seed, background)
    return Response(content=raw, media_type='image/svg+xml', headers={
        'Cache-Control':'public,max-age=604800,stale-while-revalidate=2592000',
        'X-PLUG-Image-Fallback':'v201'
    })

PREVIEW_CACHE=v59.MediaByteCache(16_000_000,96)
def _media_preview_v202(response):
    raw=response.body
    if len(raw)<150000:return response
    key=hashlib.sha256(raw).hexdigest();cached=PREVIEW_CACHE.get(key)
    if cached:
        headers=dict(response.headers);headers.pop('content-length',None);headers.pop('content-type',None)
        return Response(content=cached[1],media_type=cached[2],headers=headers)
    try:optimized,media=_raster_image_v202(raw,1600)
    except Exception:return response
    PREVIEW_CACHE[key]=(time.time(),optimized,media)
    headers=dict(response.headers);headers.pop('content-length',None);headers.pop('content-type',None)
    headers['X-PLUG-Image-Optimized']='1600'
    return Response(content=optimized,media_type=media,headers=headers)

@app.get('/api/v201/events/{event_id}/media')
def event_media_safe_v201(event_id: int):
    try:
        return _media_preview_v202(v59.event_media_asset_v167(event_id, 0))
    except Exception:
        try:
            e = v59.event_get_v167(event_id)
            label = e.get('title') or e.get('venue_name') or 'Vernissage'
        except Exception:
            label = 'Vernissage'
        return Response(content=_fallback_svg(label, f'event:{event_id}'), media_type='image/svg+xml', headers={
            'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800',
            'X-PLUG-Image-Fallback':'event-v201'
        })

@app.get('/api/v201/opportunities/{oid}/media')
def opportunity_media_safe_v201(oid: int):
    try:
        return _media_preview_v202(v59.opportunity_media_asset_v166(oid, 0))
    except Exception:
        try:
            item = v59.core.one('select title from opportunities where id=?',(oid,))
            label = (item or {}).get('title') or 'Open Call'
        except Exception:
            label = 'Open Call'
        return Response(content=_fallback_svg(label, f'opportunity:{oid}'), media_type='image/svg+xml', headers={
            'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800',
            'X-PLUG-Image-Fallback':'opportunity-v201'
        })

def _extract_image(data: dict):
    items = (data or {}).get('data') or []
    if not items:
        raise RuntimeError('aucune image retournée')
    item = items[0] or {}
    encoded = item.get('b64_json') or item.get('image_base64') or item.get('b64')
    if encoded:
        return base64.b64decode(encoded), 'image/png'
    remote = item.get('url') or item.get('image_url')
    if remote:
        rr = requests.get(remote, timeout=90)
        rr.raise_for_status()
        return rr.content, (rr.headers.get('content-type') or 'image/png').split(';')[0]
    raise RuntimeError('format image inattendu')

@app.get('/api/v179/content/image/status')
def image_status_v179():
    return {
        'ok': True,
        'enabled': bool(os.getenv('OPENAI_API_KEY', '').strip()),
        'model': DEFAULT_IMAGE_MODEL,
        'models': list(IMAGE_MODELS),
    }

async def _image_request_v202(payload, key):
    prompt=_clean(payload.get('prompt'),4500)
    if not prompt:raise HTTPException(422,'Décris le visuel à générer')
    style=_clean(payload.get('style') or 'photo',40).lower()
    ratio=_clean(payload.get('ratio') or '4:5',12)
    quality=_clean(payload.get('quality') or 'medium',20).lower()
    if quality not in {'low','medium','high','auto'}:quality='medium'
    candidates=[DEFAULT_IMAGE_MODEL]+[m for m in IMAGE_MODELS if m!=DEFAULT_IMAGE_MODEL]
    errors=[];started=time.monotonic()
    async with IMAGE_CONCURRENCY:
        async with httpx.AsyncClient(timeout=httpx.Timeout(65,connect=5)) as client:
            for model in candidates:
                try:
                    response=await client.post(OPENAI_IMAGES,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},json={'model':model,'prompt':_image_prompt(prompt,style),'size':_size_for_ratio(ratio),'quality':quality,'n':1})
                    if not response.is_success:
                        if response.status_code in {401,403,429}:
                            return _fallback_result(prompt,'Génération IA indisponible' if response.status_code!=429 else 'Quota ou limite de génération atteint')
                        errors.append(f'{model}: HTTP {response.status_code}')
                        # Retry a different model only for an unavailable/unsupported model.
                        if response.status_code in {400,404}:continue
                        return _fallback_result(prompt,'Service image temporairement indisponible')
                    items=response.json().get('data') or []
                    if not items:raise ValueError('Image absente')
                    item=items[0];encoded=item.get('b64_json') or item.get('image_base64') or item.get('b64')
                    if encoded:
                        raw=base64.b64decode(encoded,validate=True)
                    else:
                        remote=item.get('url') or item.get('image_url')
                        if not remote:raise ValueError('Image absente')
                        rr=await client.get(remote);rr.raise_for_status();raw=rr.content
                    if len(raw)>20_000_000:raise ValueError('Image trop volumineuse')
                    raw,media_type=await asyncio.to_thread(_raster_image_v202,raw,1600)
                    digest=hashlib.sha256(raw).hexdigest()[:18];name=f'plugart_{int(time.time())}_{digest}.webp'
                    await asyncio.to_thread((GENERATED/name).write_bytes,raw)
                    elapsed=int((time.monotonic()-started)*1000)
                    print(f'PLUG_ART_V202_IMAGE_OK model={model} elapsed_ms={elapsed} bytes={len(raw)}',flush=True)
                    return {'ok':True,'url':f'/api/v179/generated/{name}','model':model,'bytes':len(raw),'elapsed_ms':elapsed,'fallback':False}
                except (httpx.TimeoutException,ValueError,OSError) as exc:
                    return _fallback_result(prompt,'Délai de génération dépassé' if isinstance(exc,httpx.TimeoutException) else 'Image reçue non exploitable')
                except httpx.HTTPError:
                    return _fallback_result(prompt,'Service image momentanément inaccessible')
    return _fallback_result(prompt,'Modèle image indisponible')

@app.post('/api/v179/content/image')
async def image_v179(request:Request,payload:dict=Body(default={})):
    prompt=_clean((payload or {}).get('prompt'),4500)
    if not prompt:raise HTTPException(422,'Décris le visuel à générer')
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key:return _fallback_result(prompt,'Génération IA non configurée')
    task=asyncio.create_task(_image_request_v202(payload,key))
    deadline=time.monotonic()+IMAGE_DEADLINE_SECONDS
    try:
        while not task.done():
            remaining=deadline-time.monotonic()
            if remaining<=0:
                task.cancel();return _fallback_result(prompt,'Délai global de génération dépassé')
            if await request.is_disconnected():
                task.cancel();raise HTTPException(499,'Génération annulée')
            await asyncio.wait({task},timeout=min(.25,remaining))
        return await task
    finally:
        if not task.done():task.cancel()
        if not task.done():
            try:await task
            except asyncio.CancelledError:pass


def _raster_image_v202(raw:bytes,max_side:int):
    with Image.open(io.BytesIO(raw)) as image:
        if image.width*image.height>40_000_000:raise ValueError('Image trop grande')
        image=ImageOps.exif_transpose(image)
        image.thumbnail((max_side,max_side),Image.Resampling.LANCZOS)
        image=image.convert('RGBA' if image.mode in {'RGBA','LA'} else 'RGB')
        output=io.BytesIO();image.save(output,'WEBP',quality=86,method=4)
        return output.getvalue(),'image/webp'

@app.post('/api/v202/content/upload')
def upload_image_v202(payload:dict=Body(default={})):
    data=str((payload or {}).get('data') or '')
    if len(data)>14_000_000:raise HTTPException(413,'Image trop volumineuse')
    try:
        if not re.match(r'^data:image/(png|jpeg|webp|gif);base64,',data):raise ValueError('Type image refusé')
        raw=base64.b64decode(data.split(',',1)[1],validate=True)
        if len(raw)>10_000_000:raise HTTPException(413,'Image trop volumineuse')
        raw,_=_raster_image_v202(raw,2000)
    except HTTPException:raise
    except Exception:raise HTTPException(422,'Image PNG, JPEG ou WebP invalide')
    name='upload_'+hashlib.sha256(raw).hexdigest()[:24]+'.webp';(GENERATED/name).write_bytes(raw)
    return {'ok':True,'url':'/api/v179/generated/'+name,'bytes':len(raw)}

@app.get('/api/v179/generated/{name}')
def generated_v179(name: str):
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,180}', name):
        raise HTTPException(404, 'Image introuvable')
    path = GENERATED / name
    if not path.exists() or not path.is_file():
        raise HTTPException(404, 'Image introuvable')
    media = 'image/jpeg' if path.suffix.lower() in {'.jpg','.jpeg'} else 'image/webp' if path.suffix.lower()=='.webp' else 'image/png'
    return FileResponse(path, media_type=media, headers={'Cache-Control':'public,max-age=31536000,immutable'})

@app.get('/api/v179/status')
def status_v179():
    return {
        'ok': True,
        'version': '205.0',
        'revision': '205.20261008.1',
        'ui': 'white-liquid-glass-v205',
        'text_stream': '/api/v179/plugy/stream',
        'image_generation': '/api/v179/content/image',
        'image_enabled': bool(os.getenv('OPENAI_API_KEY', '').strip()),
        'image_deadline_seconds': IMAGE_DEADLINE_SECONDS,
        'image_concurrency': 2,
        'image_model': DEFAULT_IMAGE_MODEL,
        'local_fallback': '/api/v201/visual-fallback',
    }

@app.middleware('http')
async def headers_v179(request: Request, call_next):
    response = await call_next(request)
    if request.url.path == '/':
        response.headers['X-Plug-Art-Version'] = '205.0'
        response.headers['X-Plug-Art-UI'] = 'white-liquid-glass-v205'
        response.headers['Cache-Control'] = 'no-store, max-age=0'
    elif request.url.path.startswith('/static/') or request.url.path.startswith('/assets/'):
        response.headers['Cache-Control'] = 'public,max-age=3600,stale-while-revalidate=86400'
    elif request.url.path.startswith('/api/v179/generated/'):
        response.headers['Cache-Control']='public,max-age=31536000,immutable'
    elif request.url.path.startswith('/api/v179/') or request.url.path.startswith('/api/v202/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

print(f'PLUG_ART_V205_READY text={FAST_MODEL} image={DEFAULT_IMAGE_MODEL} generated={GENERATED}', flush=True)


@app.get('/api/v202/smoke')
def smoke_v202():
    report=v59.smoke_v172()
    files=['plugart_v162.html','plugart_v200.css','plugart_v200.js','plugart_v202_boot.js','plugart_v162.css','plugart_v162.js','plugart_v202_export.js','plugart_v204_prod.css','plugart_v204_prod.js','plugart_v205_ios.css','plugart_v205_ios.js']
    assets=[]
    for name in files:
        path=BASE/'static'/name
        raw=path.read_bytes() if path.is_file() else b''
        assets.append({'file':name,'ok':bool(raw),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest() if raw else ''})
    active={(m,getattr(r,'path','')) for r in app.router.routes for m in (getattr(r,'methods',set()) or set())}
    required=[('POST','/api/v179/content/image'),('POST','/api/v179/plugy/stream'),('POST','/api/v202/content/upload'),('GET','/api/v201/opportunities/{oid}/media'),('GET','/api/v201/events/{event_id}/media')]
    report['checks']['v202_assets']={'ok':all(x['ok'] for x in assets),'files':assets}
    report['checks']['v202_routes']={'ok':all(x in active for x in required),'missing':[m+' '+p for m,p in required if (m,p) not in active]}
    report['ok']=all(x.get('ok',True) for x in report['checks'].values())
    report['revision']='205.20261008.1'
    report['browser_runtime_validated']=False
    report['scope']='server-routes-database-assets; browser journeys run in CI'
    return report

@app.on_event('startup')
def startup_v202():
    report=smoke_v202()
    if not report['checks']['v202_assets']['ok'] or not report['checks']['v202_routes']['ok'] or not report['checks']['frontend_runtime']['asset_version']:
        raise RuntimeError('Assets ou routes V202 incomplets')
    print('PLUG_ART_V205_SELFTEST '+json.dumps(report,ensure_ascii=False,separators=(',',':')),flush=True)
