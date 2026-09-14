from pathlib import Path
from fastapi import Request
import hashlib
import re
import app_extra_v42 as v42
from build_plugy_v43 import build_plugy_v43

app = v42.app
app.version = "43.2"
BASE = Path(__file__).resolve().parent
GLB = BASE / "static" / "plugy.glb"
INDEX = BASE / "static" / "index.html"

result = build_plugy_v43(GLB)
raw = GLB.read_bytes()
digest = hashlib.sha256(raw).hexdigest()

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    for name in ("studio_v44_designs.js", "studio_v44_carousel.js"):
        page = re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace("</body>", '<script defer src="/static/studio_v44_designs.js?v=44.20260914.2"></script>\n<script defer src="/static/studio_v44_carousel.js?v=44.20260914.2"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

print(f"PLUGY_V43_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(result.get('animations', []))} sha256={digest}", flush=True)
print("PLUG_ART_STUDIO_V44_2_READY marketing_preview=on typography=7 parallel_images=3", flush=True)

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
    return {
        "ok": bool(current and current[:4] == b"glTF"),
        "version": "43.2",
        "plugy": "detailed-full-body-animated",
        "bytes": len(current),
        "sha256": hashlib.sha256(current).hexdigest() if current else "",
        "nodes": result.get("nodes", 0),
        "animations": result.get("animations", []),
        "legacy_model_replaced": True,
        "studio_v44": "studio_v44_carousel.js" in page and "studio_v44_designs.js" in page,
        "studio_marketing_preview": True,
        "studio_typography_presets": 7,
        "studio_parallel_images": 3,
        "path": "/static/plugy.glb",
    }
