from pathlib import Path
import re
from fastapi import Request
import app_extra_v35 as v35
app=v35.app
app.version='36.0'
BASE=Path(__file__).resolve().parent
INDEX=BASE/'static'/'index.html'

def strip_asset(page,name):
    e=re.escape(name)
    page=re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
    return re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*','',page,flags=re.I)

page=INDEX.read_text(encoding='utf-8')
page=strip_asset(page,'studio_v36.css')
page=strip_asset(page,'studio_v36.js')
page=page.replace('</head>','<link rel="stylesheet" href="/static/studio_v36.css?v=36.1">\n</head>',1)
page=page.replace('</body>','<script defer src="/static/studio_v36.js?v=36.1"></script>\n</body>',1)
INDEX.write_text(page,encoding='utf-8')

@app.get('/api/v36/status')
def status_v36():
    return {'ok':True,'version':'36.0','studio':'approved-visual','generation':'text+image'}

@app.middleware('http')
async def cache_v36(request:Request,call_next):
    r=await call_next(request)
    if request.url.path in ('/static/studio_v36.css','/static/studio_v36.js'):
        r.headers['Cache-Control']='public, max-age=31536000, immutable'
    return r

print('PLUG_ART_V36_READY studio=approved-visual generation=text+image',flush=True)
