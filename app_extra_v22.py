from pathlib import Path
from fastapi import Request
import hashlib
import re

import app_extra_v21 as v21
from rebuild_plugy_rigready import rebuild_plugy_rigready, TARGET_SHA256, TARGET_SIZE

app = v21.app
app.version = "22.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
GLB = BASE / "static" / "plugy.glb"
MODEL_SHA256 = TARGET_SHA256
MODEL_SIZE = TARGET_SIZE
V22_CSS = "/static/studio_v22.css?v=22.20260910.1"
V22_JS = "/static/studio_v22.js?v=22.20260910.1"


def _install_rigready_plugy():
    # app_extra_v21 reconstruit d'abord la source exacte 411 480 octets.
    # On transforme ensuite cette source de manière déterministe : pivots locaux,
    # hiérarchie articulable tête/bras/jambes et animation Idle.
    result = rebuild_plugy_rigready(GLB, GLB)
    print(
        f"PLUGY_V22_RIGREADY_READY bytes={result['bytes']} sha256={result['sha256']} nodes={result['nodes']}",
        flush=True,
    )
    return result


MODEL_RESULT = _install_rigready_plugy()

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
        "rig_nodes": ["Rig_Torso", "Rig_Head", "Rig_Arm_L", "Rig_Arm_R", "Rig_Leg_L", "Rig_Leg_R"],
        "animation": "Idle",
        "rebuild_source": "v21-exact-glb",
        "assets": [V22_CSS, V22_JS],
    }
