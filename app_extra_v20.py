from pathlib import Path
from fastapi import Request
from fastapi.responses import Response
import base64

import app_extra_v19 as v19
from build_plugy_glb import build_plugy_glb

app = v19.app
app.version = "20.1"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
GLB = BASE / "static" / "plugy.glb"
REF_B64 = BASE / "static" / "plugy_reference_tiny.b64"
REF_IMG = BASE / "static" / "plugy_reference.jpg"

V20_STUDIO_CSS = "/static/studio_v20.css?v=20.20260910.1"
V20_STUDIO_JS = "/static/studio_v20.js?v=20.20260910.1"
V20_PLUGY_CSS = "/static/plugy_v20.css?v=20.20260910.1"
V20_PLUGY_JS = "/static/plugy_glb_runtime_v20.js?v=20.20260910.1"


def _build_glb():
    try:
        result = build_plugy_glb(GLB)
        raw = GLB.read_bytes() if GLB.exists() else b""
        if len(raw) < 10000 or raw[:4] != b"glTF":
            raise RuntimeError("GLB invalide ou incomplet")
        print(f"PLUGY_GLB_READY bytes={len(raw)} nodes={result.get('nodes')}", flush=True)
        return True, len(raw), ""
    except Exception as exc:
        print(f"PLUGY_GLB_ERROR {type(exc).__name__}: {str(exc)[:240]}", flush=True)
        return False, GLB.stat().st_size if GLB.exists() else 0, str(exc)[:240]


def _build_reference_image():
    try:
        encoded = REF_B64.read_text(encoding="utf-8").strip()
        raw = base64.b64decode(encoded)
        if len(raw) < 2000 or raw[:2] != b"\xff\xd8":
            raise RuntimeError("image de référence JPEG invalide")
        REF_IMG.write_bytes(raw)
        print(f"PLUGY_REFERENCE_READY bytes={len(raw)}", flush=True)
        return True, len(raw)
    except Exception as exc:
        print(f"PLUGY_REFERENCE_ERROR {type(exc).__name__}: {str(exc)[:240]}", flush=True)
        return False, 0


def _inject_assets():
    if not INDEX.exists():
        return
    page = INDEX.read_text(encoding="utf-8")
    assets = [
        ("css", V20_STUDIO_CSS, "studio_v20.css"),
        ("css", V20_PLUGY_CSS, "plugy_v20.css"),
        ("js", V20_STUDIO_JS, "studio_v20.js"),
        ("js", V20_PLUGY_JS, "plugy_glb_runtime_v20.js"),
    ]
    for kind, url, marker in assets:
        if marker in page:
            continue
        if kind == "css":
            page = page.replace("</head>", f'<link rel="stylesheet" href="{url}">\n</head>', 1)
        else:
            page = page.replace("</body>", f'<script src="{url}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


GLB_READY, GLB_BYTES, GLB_ERROR = _build_glb()
REF_READY, REF_BYTES = _build_reference_image()
_inject_assets()


@app.get("/api/plugy/reference.jpg")
def plugy_reference_image():
    raw = REF_IMG.read_bytes() if REF_IMG.exists() else b""
    if not raw:
        return Response(status_code=404)
    return Response(raw, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=3600"})


@app.middleware("http")
async def plugy_v20_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if (
        path in ("/", "/index.html", "/static/plugy.glb")
        or "studio_v20" in path
        or "plugy_v20" in path
        or "plugy_glb_runtime_v20" in path
    ):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v20/status")
def v20_status():
    raw = GLB.read_bytes() if GLB.exists() else b""
    valid = len(raw) >= 10000 and raw[:4] == b"glTF"
    return {
        "ok": True,
        "version": "20.1",
        "studio_v20": True,
        "studio_radar_import": True,
        "studio_one_screen_workflow": True,
        "plugy_global_companion": True,
        "plugy_3d": valid,
        "glb_ready": valid,
        "glb_bytes": len(raw),
        "glb_path": "/static/plugy.glb",
        "reference_ready": REF_READY,
        "reference_bytes": REF_BYTES,
        "reference_path": "/api/plugy/reference.jpg",
        "blink": True,
        "mini_mode": True,
        "thinking_motion": True,
        "glb_error": GLB_ERROR if not valid else "",
        "assets": [V20_STUDIO_CSS, V20_STUDIO_JS, V20_PLUGY_CSS, V20_PLUGY_JS],
    }
