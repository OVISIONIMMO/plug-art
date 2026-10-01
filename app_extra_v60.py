from __future__ import annotations
from pathlib import Path
import base64, hashlib, json, os, re, time
import requests
from fastapi import Body, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

import app_extra_v59 as v59

app = v59.app
app.version = '179.0'
BASE = Path(__file__).resolve().parent
GENERATED = Path(os.getenv('PLUGART_GENERATED_DIR', '/data/generated-content-v179'))
GENERATED.mkdir(parents=True, exist_ok=True)

OPENAI_RESPONSES = 'https://api.openai.com/v1/responses'
OPENAI_IMAGES = 'https://api.openai.com/v1/images/generations'
FAST_MODEL = os.getenv('PLUGY_FAST_MODEL', 'gpt-5.6-luna').strip() or 'gpt-5.6-luna'
IMAGE_MODELS = ('gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'gpt-image-2')
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
        yield json.dumps({'type': 'done', 'model': 'local'}, ensure_ascii=False) + '\n'

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
        'max_output_tokens': 520,
        'text': {'verbosity': 'low'},
        'stream': True,
    }

    def generate():
        started = time.time()
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
            answer = _local_answer(message)
            for part in _chunks(answer):
                yield json.dumps({'type': 'delta', 'delta': part}, ensure_ascii=False) + '\n'
            yield json.dumps({'type': 'done', 'model': 'local-fallback'}, ensure_ascii=False) + '\n'

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

@app.post('/api/v179/content/image')
def image_v179(payload: dict = Body(default={})):
    payload = payload or {}
    key = os.getenv('OPENAI_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'OPENAI_API_KEY absente')
    prompt = _clean(payload.get('prompt'), 4500)
    if not prompt:
        raise HTTPException(422, 'Décris le visuel à générer')
    style = _clean(payload.get('style') or 'photo', 40).lower()
    ratio = _clean(payload.get('ratio') or '4:5', 12)
    quality = _clean(payload.get('quality') or 'medium', 20).lower()
    if quality not in {'low', 'medium', 'high', 'auto'}:
        quality = 'medium'
    full_prompt = _image_prompt(prompt, style)
    candidates = [DEFAULT_IMAGE_MODEL] + [m for m in IMAGE_MODELS if m != DEFAULT_IMAGE_MODEL]
    errors = []
    started = time.time()
    for model in candidates:
        try:
            response = requests.post(
                OPENAI_IMAGES,
                headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
                json={'model': model, 'prompt': full_prompt, 'size': _size_for_ratio(ratio), 'quality': quality, 'n': 1},
                timeout=175,
            )
            if not response.ok:
                try:
                    detail = ((response.json().get('error') or {}).get('message') or response.text[:260])
                except Exception:
                    detail = response.text[:260]
                raise RuntimeError(f'{model}: HTTP {response.status_code} — {detail[:260]}')
            raw, media_type = _extract_image(response.json())
            if len(raw) < 1000:
                raise RuntimeError('image reçue trop petite')
            digest = hashlib.sha256(raw).hexdigest()[:18]
            ext = '.jpg' if 'jpeg' in media_type else '.webp' if 'webp' in media_type else '.png'
            name = f'plugart_{int(time.time())}_{digest}{ext}'
            path = GENERATED / name
            path.write_bytes(raw)
            elapsed = int((time.time() - started) * 1000)
            print(f'PLUG_ART_V179_IMAGE_OK model={model} elapsed_ms={elapsed} bytes={len(raw)}', flush=True)
            return {
                'ok': True,
                'url': f'/api/v179/generated/{name}',
                'model': model,
                'bytes': len(raw),
                'elapsed_ms': elapsed,
            }
        except Exception as exc:
            errors.append(str(exc))
    print('PLUG_ART_V179_IMAGE_FAIL ' + ' | '.join(errors)[:1000], flush=True)
    raise HTTPException(502, 'Génération image indisponible: ' + ' | '.join(errors)[:900])

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
        'version': '179.0',
        'ui': 'approved-creative-studio',
        'text_stream': '/api/v179/plugy/stream',
        'image_generation': '/api/v179/content/image',
        'image_enabled': bool(os.getenv('OPENAI_API_KEY', '').strip()),
        'image_model': DEFAULT_IMAGE_MODEL,
    }

@app.middleware('http')
async def headers_v179(request: Request, call_next):
    response = await call_next(request)
    if request.url.path == '/':
        response.headers['X-Plug-Art-Version'] = '179.0'
        response.headers['X-Plug-Art-UI'] = 'creative-studio-v179'
        response.headers['Cache-Control'] = 'no-store, max-age=0'
    elif request.url.path.startswith('/api/v179/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

print(f'PLUG_ART_V179_READY text={FAST_MODEL} image={DEFAULT_IMAGE_MODEL} generated={GENERATED}', flush=True)
