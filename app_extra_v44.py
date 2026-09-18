from pathlib import Path
from fastapi import Request
from fastapi.responses import HTMLResponse
import re
import app_extra_v43 as v43

app=v43.app
app.version="59.0"
BASE=Path(__file__).resolve().parent
INDEX=BASE/"static"/"index.html"

page=INDEX.read_text(encoding="utf-8")
for name in ("studio_v44_designs.js","studio_v44_carousel.js"):
    page=re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
page=page.replace("</body>",'<script defer src="/static/studio_v44_designs.js?v=59.20260918.3"></script>\n<script defer src="/static/studio_v44_carousel.js?v=59.20260918.3"></script>\n</body>',1)
INDEX.write_text(page,encoding="utf-8")

# Always serve the latest generated HTML. The old emergency fixed mascot is removed:
# PLUGY now lives only inside the hero, with an inline poster until the GLB is ready.
for route in list(app.router.routes):
    if getattr(route,"path",None)=="/" and "GET" in (getattr(route,"methods",set()) or set()):
        app.router.routes.remove(route)

@app.get("/",response_class=HTMLResponse,include_in_schema=False)
def root_v59():
    html=INDEX.read_text(encoding="utf-8") if INDEX.exists() else "<html><body></body></html>"
    # Remove any bootstrap left in a previously generated index, if present.
    html=re.sub(r'<style id="plugy-v58-2-bootstrap-css">.*?</script>\s*','',html,flags=re.I|re.S)
    html=re.sub(r'<div[^>]+id=["\']plugyEmergencyMount["\'][^>]*>.*?</div>\s*','',html,flags=re.I|re.S)
    return HTMLResponse(html,headers={
        "Cache-Control":"no-store, no-cache, must-revalidate, max-age=0",
        "Pragma":"no-cache",
        "Expires":"0",
        "X-Plugy-Version":"59.1"
    })

@app.middleware("http")
async def v44_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ("/","/index.html","/static/PLUGY_final_animated.glb") or "studio_v44_" in p or "plugy_v59_polished" in p:
        response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"]="no-cache"
        response.headers["Expires"]="0"
    return response

@app.get("/api/v44/status")
def status_v44():
    html=INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {
        "ok":True,
        "version":"59.1",
        "carousel_multi_visual":"studio_v44_carousel.js" in html,
        "expanded_designs":"studio_v44_designs.js" in html,
        "plugy_runtime":"plugy_v59_polished.js" in html,
        "fresh_root":True,
        "emergency_mount":False,
        "mobile_polish":True,
        "duplicate":False,
        "design_count":17,
        "slides":[3,4,5,6]
    }

print("PLUG_ART_V59_1_READY fresh_root=on plugy=hero_integrated mobile_polish=on emergency_mount=off",flush=True)
