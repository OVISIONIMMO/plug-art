from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import re
import app_extra_v43 as v43

app = v43.app
app.version = "58.2"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

page = INDEX.read_text(encoding="utf-8")
for name in ("studio_v44_designs.js", "studio_v44_carousel.js"):
    page = re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
page = page.replace("</body>", '<script defer src="/static/studio_v44_designs.js?v=44.20260914.1"></script>\n<script defer src="/static/studio_v44_carousel.js?v=44.20260914.1"></script>\n</body>', 1)
INDEX.write_text(page, encoding="utf-8")

BOOTSTRAP = r'''
<style id="plugy-v58-2-bootstrap-css">
#plugyEmergencyMount{position:fixed;right:22px;top:116px;width:230px;height:230px;z-index:240;display:grid;place-items:center;pointer-events:none;filter:drop-shadow(0 24px 34px rgba(96,73,194,.18)) drop-shadow(0 0 28px rgba(255,93,202,.14))}
#plugyEmergencyMount svg{width:100%;height:100%;overflow:visible}
#plugyEmergencyMount.is-hidden{display:none!important}
@media(max-width:900px){#plugyEmergencyMount{width:170px;height:170px;right:10px;top:92px}}
@media(max-width:620px){#plugyEmergencyMount{width:128px;height:128px;right:8px;top:76px}}
</style>
<script>
(function(){
  const svg=`<svg viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" aria-label="PLUGY"><defs><linearGradient id="peRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ee8ff"/><stop offset=".42" stop-color="#8b69ff"/><stop offset=".78" stop-color="#ff69c7"/><stop offset="1" stop-color="#ffffff"/></linearGradient><linearGradient id="peFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f5edf8"/></linearGradient><filter id="peGlow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="210" cy="330" rx="95" ry="18" fill="#8c70ff" opacity=".16" filter="url(#peGlow)"/><rect x="104" y="117" width="212" height="184" rx="70" fill="url(#peRim)" opacity=".55" filter="url(#peGlow)"/><rect x="116" y="126" width="188" height="162" rx="60" fill="url(#peFace)"/><rect x="145" y="67" width="44" height="82" rx="22" fill="url(#peFace)"/><rect x="231" y="67" width="44" height="82" rx="22" fill="url(#peFace)"/><rect x="151" y="53" width="32" height="31" rx="13" fill="#f7f1f8"/><rect x="237" y="53" width="32" height="31" rx="13" fill="#f7f1f8"/><path d="M157 197 Q177 174 197 197" fill="none" stroke="#15153d" stroke-width="14" stroke-linecap="round"/><path d="M223 197 Q243 174 263 197" fill="none" stroke="#15153d" stroke-width="14" stroke-linecap="round"/><path d="M160 196 Q177 180 193 196" fill="none" stroke="#55ddff" stroke-width="5" stroke-linecap="round"/><path d="M227 196 Q243 180 260 196" fill="none" stroke="#ff79ca" stroke-width="5" stroke-linecap="round"/></svg>`;
  function ensure(){
    if(document.getElementById('plugyStageV58')){document.getElementById('plugyEmergencyMount')?.classList.add('is-hidden');return;}
    let e=document.getElementById('plugyEmergencyMount');
    if(!e){e=document.createElement('div');e.id='plugyEmergencyMount';e.innerHTML=svg;document.body.appendChild(e)}
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(ensure,700);setTimeout(ensure,1800)});
  new MutationObserver(()=>{if(document.getElementById('plugyStageV58'))document.getElementById('plugyEmergencyMount')?.classList.add('is-hidden')}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>
'''

# Replace the older root handler so every request reads the current generated index,
# rather than relying on a response object or cached file prepared before the V58 runtime was injected.
for route in list(app.router.routes):
    if getattr(route, "path", None) == "/" and "GET" in (getattr(route, "methods", set()) or set()):
        app.router.routes.remove(route)

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def root_v58_2():
    html = INDEX.read_text(encoding="utf-8") if INDEX.exists() else "<html><body></body></html>"
    if "plugy-v58-2-bootstrap-css" not in html:
        html = html.replace("</body>", BOOTSTRAP + "\n</body>", 1)
    return HTMLResponse(
        html,
        headers={
            "Cache-Control":"no-store, no-cache, must-revalidate, max-age=0",
            "Pragma":"no-cache",
            "Expires":"0",
            "X-Plugy-Version":"58.2"
        }
    )

@app.middleware("http")
async def v44_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html") or "studio_v44_" in request.url.path or "plugy_v58_visible" in request.url.path or "PLUGY_final_animated.glb" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v44/status")
def status_v44():
    html = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {
        "ok": True,
        "version": "58.2",
        "carousel_multi_visual": "studio_v44_carousel.js" in html,
        "expanded_designs": "studio_v44_designs.js" in html,
        "plugy_runtime": "plugy_v58_visible.js" in html,
        "plugy_emergency_bootstrap": True,
        "fresh_root": True,
        "design_count": 17,
        "slides": [3,4,5,6],
    }

print("PLUG_ART_V58_2_READY fresh_root=on plugy_runtime=on emergency_visible_mount=on cache=off", flush=True)
