from pathlib import Path
import json, os, re, time
import requests
from fastapi import Body, HTTPException, Request
from fastapi.responses import StreamingResponse
import app_extra_v34 as v34

app=v34.app
app.version='35.0'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'
SRC=BASE/'static'/'site_v34_runtime.js'
JS=BASE/'static'/'site_v35_runtime.js'
VERSION='35.20260913.1'
LEGACY=('glass_v15.css','visual_v16.css','site_v24.css','site_v30.css','studio_v26.css','studio_v28.css','studio_v26.js','studio_v32.js','thumbnail_v16.js','site_v33.css','site_v33.js')

def _remove_tag(page,name):
    e=re.escape(name)
    page=re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
    return re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*','',page,flags=re.I)

def _build_runtime():
    js=SRC.read_text(encoding='utf-8')
    js=js.replace('/api/v33/plugy/stream','/api/v35/plugy/stream').replace('sleep(1900)','sleep(1500)')
    js+='''\n;(()=>{const files=[['/static/studio_v26.css?v=26.20260910.1','style'],['/static/studio_v28.css?v=28.20260911.1','style'],['/static/studio_v26.js?v=26.20260910.1','script'],['/static/studio_v32.js?v=32.20260911.1','script']];const warm=()=>files.forEach(([h,a])=>{if(document.querySelector(`link[data-plug-prefetch="${h}"]`))return;const l=document.createElement('link');l.rel='prefetch';l.as=a;l.href=h;l.dataset.plugPrefetch=h;document.head.appendChild(l)});if('requestIdleCallback'in window)requestIdleCallback(warm,{timeout:1400});else setTimeout(warm,400)})();\n'''
    JS.write_text(js,encoding='utf-8')
    page=INDEX.read_text(encoding='utf-8')
    for n in LEGACY: page=_remove_tag(page,n)
    page=_remove_tag(page,'site_v34_runtime.js'); page=_remove_tag(page,'site_v35_runtime.js')
    page=page.replace('</body>',f'<script defer src="/static/site_v35_runtime.js?v={VERSION}"></script>\n</body>',1)
    INDEX.write_text(page,encoding='utf-8')
    return [n for n in LEGACY if re.search(rf'<(?:script|link)[^>]+{re.escape(n)}',page,re.I)]

REMAINING=_build_runtime()

def _clean(v,limit): return re.sub(r'\s+',' ',str(v or '')).strip()[:limit]

def _history(items):
    out=[]
    for x in (items or [])[-4:]:
        if isinstance(x,dict) and _clean(x.get('content'),650): out.append({'role':'assistant' if x.get('role')=='assistant' else 'user','content':_clean(x.get('content'),650)})
    return out

@app.post('/api/v35/plugy/stream')
def plugy_stream_v35(payload:dict=Body(default={})):
    msg=_clean((payload or {}).get('message'),5000)
    if not msg: raise HTTPException(422,'Message vide')
    page=re.sub(r'[^a-z0-9_-]','',str((payload or {}).get('page') or 'explorer').lower())[:40] or 'explorer'
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key: return v34.v33.plugy_stream_v33(payload)
    ctx=v34.v33.v32._context(4)
    memory='\n'.join(f"{x['role'].upper()}: {x['content']}" for x in _history((payload or {}).get('history')))
    instructions=("Tu es PLUGY, copilote interne de PLUG ART. Réponds en français, immédiatement et de façon opérationnelle. "
                  "Sois concis: réponse utile d'abord, puis au maximum 3 actions. N'invente aucune donnée absente du contexte.")
    user_input=f"PAGE: {page}\nCONTEXTE: {json.dumps(ctx,ensure_ascii=False,separators=(',',':'))}\nHISTORIQUE:\n{memory}\nDEMANDE: {msg}"
    body={'model':v34.v33.v32.FAST_MODEL,'instructions':instructions,'input':user_input,'store':False,'max_output_tokens':260,'text':{'verbosity':'low'},'stream':True}

    def gen():
        started=time.time(); saw=False; total=[]
        yield json.dumps({'type':'meta','state':'thinking','page':page},ensure_ascii=False)+'\n'
        try:
            with requests.post(v34.v33.v32.OPENAI_RESPONSES,headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},json=body,stream=True,timeout=(4,28)) as r:
                if not r.ok: raise RuntimeError(f'HTTP {r.status_code}: {r.text[:180]}')
                for raw in r.iter_lines(chunk_size=1,decode_unicode=True):
                    if not raw or not raw.startswith('data:'): continue
                    data=raw[5:].strip()
                    if not data or data=='[DONE]': continue
                    try: evt=json.loads(data)
                    except Exception: continue
                    if evt.get('type')=='response.output_text.delta' and evt.get('delta'):
                        d=str(evt['delta']); saw=True; total.append(d); yield json.dumps({'type':'delta','delta':d},ensure_ascii=False)+'\n'
                    elif evt.get('type')=='response.completed': break
                    elif evt.get('type') in {'error','response.failed'}: raise RuntimeError('stream error')
            if not saw: raise RuntimeError('aucun texte')
            elapsed=int((time.time()-started)*1000)
            print(f'PLUGY_V35_STREAM_OK elapsed_ms={elapsed} chars={sum(map(len,total))} page={page}',flush=True)
            yield json.dumps({'type':'done','latency_ms':elapsed,'page':page},ensure_ascii=False)+'\n'
        except Exception as exc:
            print(f'PLUGY_V35_STREAM_FALLBACK {type(exc).__name__}: {str(exc)[:160]}',flush=True)
            yield from v34.v33._local_stream(msg,page)
    return StreamingResponse(gen(),media_type='application/x-ndjson',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

@app.middleware('http')
async def cache_v35(request:Request,call_next):
    response=await call_next(request)
    if request.url.path=='/static/site_v35_runtime.js': response.headers['Cache-Control']='public, max-age=31536000, immutable'
    return response

@app.get('/api/v35/status')
def status_v35():
    return {'ok':True,'version':'35.0','legacy_refs':REMAINING,'stream':'low-latency','stream_chunk_size':1,'context_items':4,'max_output_tokens':260,'studio_prefetch':True,'runtime_js_bytes':JS.stat().st_size}

print(f'PLUG_ART_V35_READY legacy={len(REMAINING)} js={JS.stat().st_size} stream=low-latency studio_prefetch=on',flush=True)
