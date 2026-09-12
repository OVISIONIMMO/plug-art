from __future__ import annotations
from pathlib import Path
import json, os, re, time
import requests
from fastapi import Body, HTTPException, Request
from fastapi.responses import StreamingResponse

import app_extra_v32 as v32
from build_plugy_head_v33 import build_plugy_head_v33

app=v32.app
app.version='33.0'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'
HEAD=BASE/'static'/'plugy_head_v33.glb'
V33_CSS='/static/site_v33.css?v=33.20260912.1'
V33_JS='/static/site_v33.js?v=33.20260912.1'

PLUGY_V33_INFO=build_plugy_head_v33(HEAD)
print(f"PLUGY_V33_HEAD_READY bytes={PLUGY_V33_INFO['bytes']} animations={','.join(PLUGY_V33_INFO['animations'])}",flush=True)


def _remove_asset(page:str,filename:str):
    e=re.escape(filename)
    page=re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
    page=re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*','',page,flags=re.I)
    return page


def _inject_v33():
    if not INDEX.exists(): return
    page=INDEX.read_text(encoding='utf-8')
    for asset in ('site_v32.js','site_v32.css','site_v33.js','site_v33.css'):
        page=_remove_asset(page,asset)
    page=page.replace('<script>window.__PLUG_V32=true;window.__PLUG_HEAD_ONLY=true;</script>','')
    page=page.replace('</head>',f'<script>window.__PLUG_V33=true;window.__PLUG_HEAD_ONLY=true;</script>\n<link rel="preload" href="/static/plugy_head_v33.glb?v=33.20260912.1" as="fetch" type="model/gltf-binary" crossorigin>\n<link rel="stylesheet" href="{V33_CSS}">\n</head>',1)
    page=page.replace('</body>',f'<script src="{V33_JS}"></script>\n</body>',1)
    INDEX.write_text(page,encoding='utf-8')


_inject_v33()


def _clean_text(value,limit=5000):
    return re.sub(r'\s+',' ',str(value or '')).strip()[:limit]


def _page(value):
    return re.sub(r'[^a-z0-9_-]','',str(value or 'explorer').lower())[:40] or 'explorer'


def _history(items):
    out=[]
    for item in (items or [])[-6:]:
        if not isinstance(item,dict): continue
        content=_clean_text(item.get('content'),900)
        if content: out.append({'role':'assistant' if item.get('role')=='assistant' else 'user','content':content})
    return out


def _local_stream(message,page):
    try:
        result=v32.core.plugy(v32.core.PlugyMessage(message=message))
        answer=_clean_text(result.get('answer') or result.get('message') or 'Je suis prêt à t’aider.',3500)
    except Exception:
        answer='Je suis prêt à t’aider. Réessaie ta demande dans un instant.'
    yield json.dumps({'type':'delta','delta':answer},ensure_ascii=False)+'\n'
    yield json.dumps({'type':'done','model':'local-radar','page':page},ensure_ascii=False)+'\n'


@app.post('/api/v33/plugy/stream')
def plugy_stream_v33(payload:dict=Body(default={})):
    message=_clean_text((payload or {}).get('message'),7000)
    if not message: raise HTTPException(422,'Message vide')
    page=_page((payload or {}).get('page'))
    hist=_history((payload or {}).get('history'))
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key:
        return StreamingResponse(_local_stream(message,page),media_type='application/x-ndjson',headers={'Cache-Control':'no-store'})

    ctx=v32._context(6)
    instructions=(
        "Tu es PLUGY, l'assistant personnel interne de PLUG ART. Réponds en français, vite, clairement et de façon opérationnelle. "
        "Tu aides à prioriser le Radar, préparer les candidatures, organiser les artistes et lieux, créer du contenu et décider des prochaines actions. "
        "N'invente jamais une date, un prix, un lieu, un statut ou un lien absent du contexte. "
        "Commence par la réponse directement utile. Reste concis et propose au maximum 3 actions concrètes."
    )
    memory='\n'.join(f"{x['role'].upper()}: {x['content']}" for x in hist)
    user_input=(f"PAGE ACTIVE: {page}\nCONTEXTE PLUG ART: {json.dumps(ctx,ensure_ascii=False,separators=(',',':'))}\nHISTORIQUE:\n{memory}\nDEMANDE: {message}")
    body={'model':v32.FAST_MODEL,'instructions':instructions,'input':user_input,'store':False,'max_output_tokens':380,'text':{'verbosity':'low'},'stream':True}

    def generate():
        started=time.time(); saw=False; total=[]
        try:
            with requests.post(v32.OPENAI_RESPONSES,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},json=body,stream=True,timeout=(5,32)) as r:
                if not r.ok:
                    raise RuntimeError(f'HTTP {r.status_code}: {r.text[:220]}')
                yield json.dumps({'type':'meta','model':v32.FAST_MODEL,'page':page},ensure_ascii=False)+'\n'
                for raw in r.iter_lines(decode_unicode=True):
                    if not raw or not raw.startswith('data:'): continue
                    data=raw[5:].strip()
                    if not data or data=='[DONE]': continue
                    try: evt=json.loads(data)
                    except Exception: continue
                    et=evt.get('type')
                    if et=='response.output_text.delta':
                        delta=str(evt.get('delta') or '')
                        if delta:
                            saw=True; total.append(delta)
                            yield json.dumps({'type':'delta','delta':delta},ensure_ascii=False)+'\n'
                    elif et in {'response.completed','response.output_text.done'}:
                        if et=='response.completed': break
                    elif et in {'error','response.failed'}:
                        raise RuntimeError(str(evt.get('message') or evt.get('error') or 'stream error')[:220])
            if not saw:
                raise RuntimeError('aucun texte streamé')
            elapsed=int((time.time()-started)*1000)
            print(f"PLUGY_V33_STREAM_OK model={v32.FAST_MODEL} elapsed_ms={elapsed} page={page} chars={sum(len(x) for x in total)}",flush=True)
            yield json.dumps({'type':'done','model':v32.FAST_MODEL,'page':page,'latency_ms':elapsed,'suggestion':v32._page_suggestion(page,ctx)},ensure_ascii=False)+'\n'
        except Exception as exc:
            print(f"PLUGY_V33_STREAM_FALLBACK {type(exc).__name__}: {str(exc)[:220]}",flush=True)
            yield from _local_stream(message,page)

    return StreamingResponse(generate(),media_type='application/x-ndjson',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})


@app.middleware('http')
async def v33_cache(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/index.html') or 'v33' in p:
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'; response.headers['Expires']='0'
    elif p=='/static/plugy_head_v33.glb':
        response.headers['Cache-Control']='public, max-age=31536000, immutable'
    return response


@app.get('/api/v33/status')
def v33_status():
    page=INDEX.read_text(encoding='utf-8') if INDEX.exists() else ''
    return {
        'ok':True,'version':'33.0','profile':'internal-dashboard-streaming-plugy',
        'plugy_model':'/static/plugy_head_v33.glb','plugy_model_bytes':HEAD.stat().st_size if HEAD.exists() else 0,
        'plugy_animations':PLUGY_V33_INFO['animations'],'stream_endpoint':'/api/v33/plugy/stream',
        'dashboard_internal':True,'typewriter_stream':True,'legacy_site_v32_js':'site_v32.js' in page,
        'assets':[V33_CSS,V33_JS],
    }

print(f"PLUG_ART_V33_READY head_bytes={HEAD.stat().st_size if HEAD.exists() else 0} stream=on dashboard=internal",flush=True)
