from pathlib import Path
from fastapi import Request
import re

import app_extra_v22 as v22

app = v22.app
app.version = "23.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
ASSETS = [
    "/static/studio_v23.css?v=23.20260910.1",
    "/static/studio_v23.js?v=23.20260910.1",
    "/static/plugy_v23.css?v=23.20260910.1",
    "/static/plugy_runtime_v23.js?v=23.20260910.1",
]

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(r'<link[^>]+href=["\']/static/(studio|plugy)_v23[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    page = re.sub(r'<script[^>]+src=["\']/static/(studio_v23|plugy_runtime_v23)[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace("</head>", '<link rel="stylesheet" href="/static/studio_v23.css?v=23.20260910.1">\n<link rel="stylesheet" href="/static/plugy_v23.css?v=23.20260910.1">\n</head>', 1)
    page = page.replace("</body>", '<script src="/static/studio_v23.js?v=23.20260910.1"></script>\n<script src="/static/plugy_runtime_v23.js?v=23.20260910.1"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

@app.middleware("http")
async def v23_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html", "/static/plugy.glb") or "v23" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/v23/status")
def v23_status():
    return {
        "ok": True,
        "version": "23.0",
        "studio": "clean-compact-tool-groups",
        "mobile_compact": True,
        "plugy_interactive": True,
        "plugy_pointer_reaction": True,
        "plugy_idle_animation": True,
        "plugy_model": "/static/plugy.glb",
        "assets": ASSETS,
    }
