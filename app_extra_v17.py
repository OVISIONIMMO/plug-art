from pathlib import Path
from fastapi.responses import FileResponse
import base64
import hashlib
import lzma
import re

import app_extra_v16 as v16

app = v16.app
app.version = "17.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
MODEL_PARTS = sorted((BASE / "assets").glob("plugy_web_mascot_part_*.b64"))
MODEL_DIR = Path("/data/plugy-assets")
MODEL_FILE = MODEL_DIR / "PLUGY_web_mascot.glb"
MODEL_SHA256 = "f8438dea4931c3324854575b9ce97c7cb2747e5ae5eaa1bc34941aa219ac0f70"
MODEL_SIZE = 411480
V17_CSS = "/static/studio_v17.css?v=17.20260910.1"
V17_JS = "/static/studio_v17.js?v=17.20260910.1"
MODEL_VIEWER = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.1.0/dist/model-viewer.min.js"


def _ensure_plugy_model():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_FILE.exists():
        raw = MODEL_FILE.read_bytes()
        if len(raw) == MODEL_SIZE and hashlib.sha256(raw).hexdigest() == MODEL_SHA256:
            return
    if not MODEL_PARTS:
        return
    encoded = "".join(part.read_text(encoding="utf-8").strip() for part in MODEL_PARTS)
    compressed = base64.b64decode(encoded)
    raw = lzma.decompress(compressed)
    if len(raw) != MODEL_SIZE or hashlib.sha256(raw).hexdigest() != MODEL_SHA256:
        raise RuntimeError("PLUGY GLB V17 invalide")
    MODEL_FILE.write_bytes(raw)


_ensure_plugy_model()

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(r'<link[^>]+href=["\']/static/studio_v17\.css[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/studio_v17\.js[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    if MODEL_VIEWER not in page:
        page = page.replace("</head>", f'<script type="module" src="{MODEL_VIEWER}"></script>\n</head>', 1)
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V17_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V17_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


@app.get("/api/assets/plugy.glb")
def plugy_glb():
    _ensure_plugy_model()
    if not MODEL_FILE.exists():
        from fastapi import HTTPException
        raise HTTPException(404, "Modèle PLUGY indisponible")
    return FileResponse(
        MODEL_FILE,
        media_type="model/gltf-binary",
        filename="PLUGY_web_mascot.glb",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-PLUGY-Model": "v17-web-mascot",
            "X-PLUGY-SHA256": MODEL_SHA256,
        },
    )


@app.middleware("http")
async def v17_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or path.endswith("studio_v17.css") or path.endswith("studio_v17.js"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v17/status")
def v17_status():
    model_ok = MODEL_FILE.exists()
    return {
        "ok": True,
        "version": "17.0",
        "content_studio": "simplified-workflow",
        "plugy_3d": model_ok,
        "plugy_model": "/api/assets/plugy.glb",
        "plugy_model_size": MODEL_FILE.stat().st_size if model_ok else 0,
        "plugy_sha256": MODEL_SHA256,
        "model_parts": len(MODEL_PARTS),
        "css": V17_CSS,
        "js": V17_JS,
    }
