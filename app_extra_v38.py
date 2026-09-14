from pathlib import Path
import re
from fastapi import Request
import app_extra_v36 as v36

app = v36.app
app.version = '42.1'
BASE = Path(__file__).resolve().parent
INDEX = BASE / 'static' / 'index.html'

# Keep the V38 route fix, and force the V42 runtime to load after legacy scripts.
page = INDEX.read_text(encoding='utf-8')
page = re.sub(r'<script[^>]*data-plug-v38-route[^>]*>.*?</script>\s*', '', page, flags=re.I | re.S)
page = re.sub(r'<script[^>]*data-plug-v42-runtime[^>]*>.*?</script>\s*', '', page, flags=re.I | re.S)
route_boot = '''<script data-plug-v38-route>
(function(){
  try {
    var q = new URLSearchParams(location.search);
    var v = q.get('v') || '';
    if (v.indexOf('38') === 0 || v.indexOf('42') === 0 || q.get('studio') === '1') {
      history.replaceState(null, '', location.pathname + location.search + '#content');
      document.documentElement.setAttribute('data-plug-route', 'content');
    }
  } catch(e) {}
})();
</script>'''
page = page.replace('</head>', route_boot + '\n</head>', 1)

# This script is injected at the very end so it can replace any legacy V33 model-viewer.
v42_boot = '''<script data-plug-v42-runtime>
(function(){
  var s=document.createElement('script');
  s.src='/static/plugy_glb_runtime_v20.js?v=42.1.20260914';
  s.defer=true;
  s.dataset.plugV42Forced='1';
  document.body.appendChild(s);
})();
</script>'''
page = page.replace('</body>', v42_boot + '\n</body>', 1)
INDEX.write_text(page, encoding='utf-8')

@app.middleware('http')
async def v42_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ('/', '/index.html') or path.endswith('/plugy.glb') or 'plugy_glb_runtime_v20.js' in path:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    if path in ('/', '/index.html'):
        response.headers['Clear-Site-Data'] = '"cache"'
    return response

@app.get('/api/v38/status')
def status_v38():
    page_now = INDEX.read_text(encoding='utf-8') if INDEX.exists() else ''
    return {
        'ok': True,
        'version': '42.1',
        'forced_route': 'content',
        'head_boot': 'data-plug-v38-route' in page_now,
        'v42_runtime_forced': 'data-plug-v42-runtime' in page_now,
        'studio_v36': 'studio_v36.js' in page_now,
        'cache_bust': True,
    }

print('PLUG_ART_V42_1_READY forced_runtime=on ios_cache_bust=on', flush=True)
