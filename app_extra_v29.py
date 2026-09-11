from pathlib import Path
from fastapi import Request
import re

import app_extra_v28 as v28

app = v28.app
app.version = "29.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V29_CSS = "/static/site_v29.css?v=29.20260911.1"
V29_JS = "/static/site_v29.js?v=29.20260911.1"
BOOT = '<script>window.__PLUG_V26=true;window.__PLUG_HEAD_ONLY=true;</script>'


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


def _inject_v29():
    if not INDEX.exists():
        return
    page = INDEX.read_text(encoding="utf-8")
    page = page.replace(BOOT, "")
    page = _remove_asset(page, "site_v29.css")
    page = _remove_asset(page, "site_v29.js")

    # Le drapeau est installé avant site_v25.js : l'ancien modèle corps entier
    # ne peut donc jamais démarrer, même pendant les premières millisecondes.
    page = page.replace("</head>", f"{BOOT}\n<link rel=\"stylesheet\" href=\"{V29_CSS}\">\n</head>", 1)
    page = page.replace("</body>", f'<script src="{V29_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


_inject_v29()


@app.middleware("http")
async def v29_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy_head_v26.glb") or "v29" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v29/status")
def v29_status():
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {
        "ok": True,
        "version": "29.0",
        "profile": "plugy-head-only-prominent",
        "plugy_head": "/static/plugy_head_v26.glb",
        "legacy_full_body_boot_disabled": "window.__PLUG_V26=true" in page,
        "photo_overlay_guard": True,
        "single_model_guard": True,
        "home_prominence": "large-central-agent",
        "studio": "v28-performance-image-fallback",
        "assets": [V29_CSS, V29_JS],
    }
