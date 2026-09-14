from pathlib import Path
from fastapi import Request
import re
import app_extra_v43 as v43

app = v43.app
app.version = "44.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

page = INDEX.read_text(encoding="utf-8")
for name in ("studio_v44_designs.js", "studio_v44_carousel.js"):
    page = re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
page = page.replace("</body>", '<script defer src="/static/studio_v44_designs.js?v=44.20260914.1"></script>\n<script defer src="/static/studio_v44_carousel.js?v=44.20260914.1"></script>\n</body>', 1)
INDEX.write_text(page, encoding="utf-8")

@app.middleware("http")
async def v44_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in ("/", "/index.html") or "studio_v44_" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

@app.get("/api/v44/status")
def status_v44():
    html = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {
        "ok": True,
        "version": "44.0",
        "carousel_multi_visual": "studio_v44_carousel.js" in html,
        "expanded_designs": "studio_v44_designs.js" in html,
        "design_count": 17,
        "slides": [3,4,5,6],
    }

print("PLUG_ART_V44_READY carousel_multi_visual=on expanded_designs=17", flush=True)
