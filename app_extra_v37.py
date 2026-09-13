from pathlib import Path
import re
from fastapi import Request
from fastapi.responses import RedirectResponse
import app_extra_v36 as v36

app = v36.app
app.version = '37.0'
BASE = Path(__file__).resolve().parent
INDEX = BASE / 'static' / 'index.html'

page = INDEX.read_text(encoding='utf-8')
page = re.sub(r'<link[^>]+site_v37\.css[^>]*>\s*', '', page, flags=re.I)
page = page.replace('</head>', '<link rel="stylesheet" href="/static/site_v37.css?v=37.1">\n</head>', 1)
INDEX.write_text(page, encoding='utf-8')

@app.middleware('http')
async def route_v37(request: Request, call_next):
    if request.url.path in ('/', '/index.html'):
        q = request.query_params
        version = str(q.get('v') or '')
        fixed = q.get('routefixed') == '1'
        if not fixed and version.startswith(('36', '37')):
            return RedirectResponse(url='/?v=37&routefixed=1#content', status_code=307)
    response = await call_next(request)
    if request.url.path == '/static/site_v37.css':
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    if request.url.path in ('/', '/index.html'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

@app.get('/api/v37/status')
def status_v37():
    return {'ok': True, 'version': '37.0', 'studio_redirect': True, 'studio': 'v36-approved-visual'}

print('PLUG_ART_V37_READY studio_redirect=on', flush=True)
