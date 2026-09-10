from pathlib import Path
from fastapi import Request
import base64
import hashlib
import lzma
import re

import app_extra_v20 as v20

app = v20.app
app.version = "21.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
GLB = BASE / "static" / "plugy.glb"
MODEL_PARTS = sorted((BASE / "assets").glob("plugy_web_mascot_part_*.b64"))
MODEL_SHA256 = "f8438dea4931c3324854575b9ce97c7cb2747e5ae5eaa1bc34941aa219ac0f70"
MODEL_SIZE = 411480
V21_CSS = "/static/studio_v21.css?v=21.20260910.1"
V21_JS = "/static/studio_v21.js?v=21.20260910.1"


def _install_new_plugy_glb():
    if not MODEL_PARTS:
        raise RuntimeError("Fragments PLUGY GLB introuvables")
    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in MODEL_PARTS)
    raw = lzma.decompress(base64.b64decode(encoded))
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) != MODEL_SIZE or raw[:4] != b"glTF" or digest != MODEL_SHA256:
        raise RuntimeError(f"PLUGY GLB invalide: bytes={len(raw)} sha={digest}")
    GLB.write_bytes(raw)
    print(f"PLUGY_V21_GLB_READY bytes={len(raw)} sha256={digest}", flush=True)
    return len(raw), digest


GLB_BYTES, GLB_SHA = _install_new_plugy_glb()

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(r'<link[^>]+href=["\']/static/studio_v21\.css[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/studio_v21\.js[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V21_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V21_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


@app.middleware("http")
async def v21_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy.glb") or "studio_v21" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v21/status")
def v21_status():
    raw = GLB.read_bytes() if GLB.exists() else b""
    digest = hashlib.sha256(raw).hexdigest() if raw else ""
    valid = len(raw) == MODEL_SIZE and raw[:4] == b"glTF" and digest == MODEL_SHA256
    return {
        "ok": True,
        "version": "21.0",
        "studio": "guided-three-step-workflow",
        "advanced_editor_collapsed": True,
        "plugy_3d": valid,
        "plugy_model": "/static/plugy.glb",
        "plugy_model_bytes": len(raw),
        "plugy_model_sha256": digest,
        "expected_sha256": MODEL_SHA256,
        "model_parts": len(MODEL_PARTS),
        "assets": [V21_CSS, V21_JS],
    }
