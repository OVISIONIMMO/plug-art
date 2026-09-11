from pathlib import Path
from fastapi import Request
import os
import re

import app_extra_v27 as v27

app = v27.app
app.version = "28.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V28_CSS = "/static/studio_v28.css?v=28.20260911.1"
V28_JS = "/static/studio_v28_patch.js?v=28.20260911.1"
PLUGY_HEAD = BASE / "static" / "plugy_head_v26.glb"


def _remove_asset(page: str, filename: str):
    escaped = re.escape(filename)
    page = re.sub(
        rf'<script[^>]+src=["\'][^"\']*{escaped}[^"\']*["\'][^>]*></script>\s*',
        "",
        page,
        flags=re.I,
    )
    page = re.sub(
        rf'<link[^>]+href=["\'][^"\']*{escaped}[^"\']*["\'][^>]*>\s*',
        "",
        page,
        flags=re.I,
    )
    return page


def _inject_v28():
    if not INDEX.exists():
        return []
    page = INDEX.read_text(encoding="utf-8")

    # Ces éditeurs restent disponibles mais ne doivent plus ralentir chaque page.
    # studio_v28_patch les charge uniquement lorsque l'utilisateur ouvre
    # volontairement « Éditeur complet ».
    lazy_assets = (
        "content_studio_v10.css",
        "content_studio_v10.js",
        "content_studio_v11.css",
        "content_studio_v11.js",
        "studio_pro_v19.css",
        "studio_pro_v19.js",
    )
    for filename in lazy_assets:
        page = _remove_asset(page, filename)

    # Réinjection déterministe V28.
    page = _remove_asset(page, "studio_v28.css")
    page = _remove_asset(page, "studio_v28_patch.js")
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V28_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V28_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")
    return [x for x in lazy_assets if x in page]


INITIAL_LEGACY_REFS = _inject_v28()
IMAGE_ENABLED = bool(os.getenv("OPENAI_API_KEY", "").strip())
HEAD_BYTES = PLUGY_HEAD.stat().st_size if PLUGY_HEAD.exists() else 0
print(
    f"PLUG_ART_V28_READY image_enabled={IMAGE_ENABLED} head_bytes={HEAD_BYTES} "
    f"initial_legacy_refs={len(INITIAL_LEGACY_REFS)} lazy_editor=True",
    flush=True,
)


@app.middleware("http")
async def v28_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or "v28" in path or path == "/api/v28/status":
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v28/status")
def v28_status():
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    legacy_initial = [
        x
        for x in (
            "content_studio_v10.css",
            "content_studio_v10.js",
            "content_studio_v11.css",
            "content_studio_v11.js",
            "studio_pro_v19.css",
            "studio_pro_v19.js",
        )
        if x in page
    ]
    return {
        "ok": True,
        "version": "28.0",
        "profile": "head-only-fast-studio",
        "plugy_head": "/static/plugy_head_v26.glb",
        "plugy_head_bytes": HEAD_BYTES,
        "studio": "v26-compact-v28-performance-patch",
        "image_provider_enabled": IMAGE_ENABLED,
        "image_endpoint": "/api/v26/content/image",
        "image_local_fallback": "/api/content/visual",
        "image_button_always_available": True,
        "advanced_editor": "lazy-loaded-on-demand",
        "initial_legacy_editor_refs": legacy_initial,
        "assets": [V28_CSS, V28_JS],
    }
