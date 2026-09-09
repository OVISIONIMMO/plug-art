from pathlib import Path
import re
import app_extra_v11 as v11

app = v11.app
app.version = "13.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

# Remplacement visuel complet : supprime les anciens thèmes Glass et charge V13.
if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(
        r'<link[^>]+href=["\']/static/glass_v(?:12|13)\.css[^"\']*["\'][^>]*>\s*',
        '',
        page,
        flags=re.I,
    )
    css_tag = '<link rel="stylesheet" href="/static/glass_v13.css?v=13.20260909.1">'
    page = page.replace("</head>", css_tag + "\n</head>", 1)
    INDEX.write_text(page, encoding="utf-8")


@app.middleware("http")
async def disable_visual_cache(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or path.endswith("/glass_v13.css"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/theme/status")
def theme_status():
    return {
        "ok": True,
        "version": "13.0",
        "theme": "opaque-glass-bubble",
        "opaque_background": True,
        "transparent_panels": False,
        "blur": True,
        "bubble_cards": True,
        "asset": "/static/glass_v13.css?v=13.20260909.1",
    }
