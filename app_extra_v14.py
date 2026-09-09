from pathlib import Path
import re
import app_extra_v11 as v11

app = v11.app
app.version = "14.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

V14_ASSET = "/static/glass_v14.css?v=14.20260909.1"

# Remplacement visuel complet : retire tous les anciens thèmes Glass et charge V14.
if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    page = re.sub(
        r'<link[^>]+href=["\']/static/(?:glass_v\d+|visual_glass_v\d+)\.css[^"\']*["\'][^>]*>\s*',
        '',
        page,
        flags=re.I,
    )
    css_tag = f'<link rel="stylesheet" href="{V14_ASSET}">'
    page = page.replace("</head>", css_tag + "\n</head>", 1)
    INDEX.write_text(page, encoding="utf-8")


@app.middleware("http")
async def disable_v14_visual_cache(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or path.endswith("/glass_v14.css"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/theme/status")
def theme_status():
    return {
        "ok": True,
        "version": "14.0",
        "theme": "transparent-bubble",
        "page_background": "neutral-canvas",
        "large_opaque_surfaces": False,
        "transparent_panels": True,
        "blur": True,
        "bubble_cards": True,
        "asset": V14_ASSET,
    }
