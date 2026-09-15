from pathlib import Path
from fastapi import Request
import hashlib
import re
import app_extra_v42 as v42
from build_plugy_v43 import build_plugy_v43

app = v42.app
app.version = "43.6"
BASE = Path(__file__).resolve().parent
GLB = BASE / "static" / "plugy.glb"
INDEX = BASE / "static" / "index.html"

result = build_plugy_v43(GLB)
raw = GLB.read_bytes()
digest = hashlib.sha256(raw).hexdigest()

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    names=("studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js","studio_v44_ai_director.js")
    for name in names:
        page = re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    scripts='\n'.join(f'<script defer src="/static/{name}?v=44.20260915.6"></script>' for name in names)
    page = page.replace("</body>", scripts+"\n</body>", 1)
    INDEX.write_text(page, encoding="utf-8")

print(f"PLUGY_V43_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(result.get('animations', []))} sha256={digest}", flush=True)
print("PLUG_ART_STUDIO_V44_6_READY ai_creative_director=on subject_aware=on concepts=3", flush=True)

@app.middleware("http")
async def v43_no_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html", "/static/plugy.glb") or "plugy_glb_runtime_v20" in request.url.path or "studio_v44_" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v43/status")
def v43_status():
    current = GLB.read_bytes() if GLB.exists() else b""
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {"ok":bool(current and current[:4]==b"glTF"),"version":"43.6","plugy":"detailed-full-body-animated","bytes":len(current),"sha256":hashlib.sha256(current).hexdigest() if current else "","nodes":result.get("nodes",0),"animations":result.get("animations",[]),"legacy_model_replaced":True,"studio_v44":"studio_v44_carousel.js" in page,"studio_quality_scoring":"studio_v44_quality.js" in page,"studio_creative_director":"studio_v44_director.js" in page,"studio_ai_creative_director":"studio_v44_ai_director.js" in page,"studio_subject_aware_concepts":True,"studio_creative_concepts":3,"path":"/static/plugy.glb"}
