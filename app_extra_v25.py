from pathlib import Path
from fastapi import Request
import re

import app_extra_v24 as v24

app = v24.app
app.version = "25.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V25_CSS = "/static/site_v25.css?v=25.20260910.1"
V25_JS = "/static/site_v25.js?v=25.20260910.1"

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    # Retire les anciens moteurs PLUGY qui se chevauchaient et pouvaient créer
    # des conflits/ralentissements côté navigateur, notamment sur iPhone.
    legacy_patterns = [
        r'<script[^>]+src=["\']/static/plugy_experience_v18\.js[^"\']*["\'][^>]*></script>\s*',
        r'<script[^>]+src=["\']/static/plugy_glb_runtime_v19\.js[^"\']*["\'][^>]*></script>\s*',
        r'<script[^>]+src=["\']/static/plugy_glb_runtime_v20\.js[^"\']*["\'][^>]*></script>\s*',
        r'<script[^>]+src=["\']/static/site_v24\.js[^"\']*["\'][^>]*></script>\s*',
        r'<script[^>]+src=["\']/static/site_v25\.js[^"\']*["\'][^>]*></script>\s*',
        r'<link[^>]+href=["\']/static/plugy_experience_v18\.css[^"\']*["\'][^>]*>\s*',
        r'<link[^>]+href=["\']/static/plugy_v20\.css[^"\']*["\'][^>]*>\s*',
        r'<link[^>]+href=["\']/static/site_v25\.css[^"\']*["\'][^>]*>\s*',
    ]
    for pattern in legacy_patterns:
        page = re.sub(pattern, "", page, flags=re.I)
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V25_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V25_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

@app.middleware("http")
async def v25_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy.glb") or "site_v25" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v25/status")
def v25_status():
    model = BASE / "static" / "plugy.glb"
    return {
        "ok": True,
        "version": "25.0",
        "frontend_boot_guard": True,
        "legacy_plugy_runtimes_removed": True,
        "single_plugy_runtime": True,
        "original_home_fallback": True,
        "plugy_model": "/static/plugy.glb",
        "plugy_3d": model.exists() and model.stat().st_size > 100000,
        "model_viewer_timeout_fallback": True,
        "assets": [V25_CSS, V25_JS],
    }
