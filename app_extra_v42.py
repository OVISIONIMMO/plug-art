from pathlib import Path
from fastapi import Request
import hashlib
import app_extra_v38 as v38
from build_plugy_v42 import build_plugy_v42

app = v38.app
app.version = "42.0"
BASE = Path(__file__).resolve().parent
GLB = BASE / "static" / "plugy.glb"

result = build_plugy_v42(GLB)
raw = GLB.read_bytes()
digest = hashlib.sha256(raw).hexdigest()
print(f"PLUGY_V42_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(result.get('animations', []))} sha256={digest}", flush=True)

@app.middleware("http")
async def v42_no_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html", "/static/plugy.glb") or "plugy_glb_runtime_v20" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v42/status")
def v42_status():
    current = GLB.read_bytes() if GLB.exists() else b""
    return {
        "ok": bool(current and current[:4] == b"glTF"),
        "version": "42.0",
        "plugy": "full-body-animated",
        "bytes": len(current),
        "sha256": hashlib.sha256(current).hexdigest() if current else "",
        "nodes": result.get("nodes", 0),
        "animations": result.get("animations", []),
        "legacy_model_replaced": True,
        "path": "/static/plugy.glb",
    }
