from pathlib import Path
from fastapi import Request
import re

import app_extra_v26 as v26

app = v26.app
app.version = "27.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"


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


if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    # Nettoyage final : ces couches historiques ne doivent plus être téléchargées.
    for filename in (
        "plugy_experience_v18.js",
        "plugy_experience_v18.css",
        "plugy_glb_runtime_v19.js",
        "plugy_glb_runtime_v20.js",
        "plugy_v20.css",
        "site_v24.js",
        "studio_v20.js",
        "studio_v20.css",
        "studio_v21.js",
        "studio_v21.css",
        "studio_v22.js",
        "studio_v22.css",
        "studio_v23.js",
        "studio_v23.css",
    ):
        page = _remove_asset(page, filename)
    INDEX.write_text(page, encoding="utf-8")


@app.middleware("http")
async def v27_no_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html") or "v26" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v27/status")
def v27_status():
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    forbidden = [
        "plugy_experience_v18.js",
        "plugy_glb_runtime_v19.js",
        "plugy_glb_runtime_v20.js",
        "studio_v20.js",
        "studio_v21.js",
        "studio_v22.js",
        "studio_v23.js",
    ]
    return {
        "ok": True,
        "version": "27.0",
        "production_profile": "v26-head-only-clean-runtime",
        "legacy_runtime_refs": [x for x in forbidden if x in page],
        "plugy_head": "/static/plugy_head_v26.glb",
        "studio": "v26-compact",
        "image_generation": "/api/v26/content/image",
    }
