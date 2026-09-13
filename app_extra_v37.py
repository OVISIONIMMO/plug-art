from pathlib import Path
import re
from fastapi import Request
import app_extra_v36 as v36

app = v36.app
app.version = '37.2'
BASE = Path(__file__).resolve().parent
INDEX = BASE / 'static' / 'index.html'

# Safari/iOS conservait parfois #workspace. On corrige avant l'exécution du
# routeur inline historique de index.html, donc le premier rendu utilise
# directement #content.
page = INDEX.read_text(encoding='utf-8')
page = re.sub(r'<link[^>]+site_v37\.css[^>]*>\s*', '', page, flags=re.I)
page = re.sub(r'<script[^>]*data-plug-v37-route[^>]*>.*?</script>\s*', '', page, flags=re.I | re.S)
route_boot = '''<script data-plug-v37-route>
(function(){
  try {
    var q = new URLSearchParams(location.search);
    var version = q.get('v') || '';
    if (version.indexOf('37') === 0 || q.get('studio') === '1' || q.get('routefixed') === '1') {
      history.replaceState(null, '', location.pathname + location.search + '#content');
      document.documentElement.setAttribute('data-plug-route','content');
    }
  } catch(e) {}
})();
</script>'''
page = page.replace('</head>', route_boot + '\n<link rel="stylesheet" href="/static/site_v37.css?v=37.2">\n</head>', 1)
INDEX.write_text(page, encoding='utf-8')

@app.middleware('http')
async def route_v37(request: Request, call_next):
    response = await call_next(request)
    if request.url.path == '/static/site_v37.css':
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    if request.url.path in ('/', '/index.html'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Clear-Site-Data'] = '"cache"'
    return response

@app.get('/api/v37/status')
def status_v37():
    page_now = INDEX.read_text(encoding='utf-8') if INDEX.exists() else ''
    return {
        'ok': True,
        'version': '37.2',
        'forced_route': 'content',
        'head_boot': 'data-plug-v37-route' in page_now,
        'studio': 'v36-approved-visual',
        'cache_bust': True,
    }

print('PLUG_ART_V37_2_READY forced_route=content ios_hash_fix=on cache_bust=on', flush=True)
