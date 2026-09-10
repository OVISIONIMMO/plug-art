from pathlib import Path
from fastapi import Request
import re

import app_extra_v23 as v23

app = v23.app
app.version = "24.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V24_CSS = "/static/site_v24.css?v=24.20260910.1"
V24_JS = "/static/site_v24.js?v=24.20260910.1"

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    # V24 possède un seul moteur PLUGY. On retire le runtime compagnon V23
    # pour éviter deux instances 3D et conserver un personnage unique.
    page = re.sub(r'<link[^>]+href=["\']/static/plugy_v23\.css[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/plugy_runtime_v23\.js[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = re.sub(r'<link[^>]+href=["\']/static/site_v24\.css[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/site_v24\.js[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace("</head>", f'<link rel="stylesheet" href="{V24_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V24_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

@app.middleware("http")
async def v24_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy.glb") or "site_v24" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v24/status")
def v24_status():
    model = BASE / "static" / "plugy.glb"
    return {
        "ok": True,
        "version": "24.0",
        "home": "real-responsive-plugy-dashboard",
        "studio": "light-structured-tools",
        "single_plugy": True,
        "plugy_3d": model.exists() and model.stat().st_size > 100000,
        "plugy_model": "/static/plugy.glb",
        "plugy_pointer_reaction": True,
        "plugy_autonomous_dock": True,
        "chat_integrated": True,
        "assets": [V24_CSS, V24_JS],
    }
