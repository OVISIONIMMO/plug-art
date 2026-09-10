from pathlib import Path
from fastapi import Request
import base64
import hashlib
import lzma
import re

import app_extra_v21 as v21

app = v21.app
app.version = "22.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
GLB = BASE / "static" / "plugy.glb"
MODEL_PARTS = sorted((BASE / "assets").glob("plugy_v2_rigready_part_*.b64"))
MODEL_SHA256 = "834a9621418173173d391c33dc1c5785138a05fcacf43606f0a358a428be9a37"
MODEL_SIZE = 414024
V22_CSS = "/static/studio_v22.css?v=22.20260910.1"
V22_JS = "/static/studio_v22.js?v=22.20260910.1"


def _install_rigready_plugy():
    if not MODEL_PARTS:
        raise RuntimeError("Fragments PLUGY V2 rig-ready introuvables")
    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in MODEL_PARTS)
    raw = lzma.decompress(base64.b64decode(encoded))
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) != MODEL_SIZE or raw[:4] != b"glTF" or digest != MODEL_SHA256:
        raise RuntimeError(f"PLUGY V2 rig-ready invalide: bytes={len(raw)} sha={digest}")
    GLB.write_bytes(raw)
    print(f"PLUGY_V22_RIGREADY_READY bytes={len(raw)} sha256={digest}", flush=True)
    return len(raw), digest


GLB_BYTES, GLB_SHA = _install_rigready_plugy()

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(r'<link[^>]+href=["\']/static/studio_v22\.css[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/studio_v22\.js[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V22_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V22_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


@app.middleware("http")
async def v22_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy.glb") or "studio_v22" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v22/status")
def v22_status():
    raw = GLB.read_bytes() if GLB.exists() else b""
    digest = hashlib.sha256(raw).hexdigest() if raw else ""
    valid = len(raw) == MODEL_SIZE and raw[:4] == b"glTF" and digest == MODEL_SHA256
    return {
        "ok": True,
        "version": "22.0",
        "studio": "single-screen-creator",
        "legacy_editor_hidden": True,
        "advanced_editor_available": True,
        "plugy_3d": valid,
        "plugy_rig_ready": valid,
        "plugy_model": "/static/plugy.glb",
        "plugy_model_bytes": len(raw),
        "plugy_model_sha256": digest,
        "expected_sha256": MODEL_SHA256,
        "model_parts": len(MODEL_PARTS),
        "assets": [V22_CSS, V22_JS],
    }
