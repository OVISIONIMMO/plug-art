from pathlib import Path
from fastapi import Request

import app_extra_v16 as v16

app = v16.app
app.version = "19.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V18_CSS = "/static/plugy_experience_v18.css?v=19.20260910.1"
V18_JS = "/static/plugy_experience_v18.js?v=19.20260910.1"


def _inject_v19_assets():
    if not INDEX.exists():
        return
    page = INDEX.read_text(encoding="utf-8")
    if "plugy_experience_v18.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{V18_CSS}">\n</head>', 1)
    if "plugy_experience_v18.js" not in page:
        page = page.replace("</body>", f'<script src="{V18_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


_inject_v19_assets()


@app.middleware("http")
async def plugy_v19_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or "plugy_experience_v18" in path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v19/status")
def v19_status():
    return {
        "ok": True,
        "version": "19.0",
        "plugy_chat_readability": True,
        "studio_boost": True,
        "plugy_global_companion": True,
        "plugy_3d_mode": "procedural-fallback-glb-ready",
        "glb_expected_path": "/static/plugy.glb",
        "mini_mode": True,
        "blink_animation": True,
        "pointer_follow": True,
        "studio_templates": [
            "Open Call Radar", "Dernier jour", "Top opportunités", "Exposition",
            "Artiste émergent", "Projet / lieu", "Story", "Affiche",
            "Carrousel éducatif", "Institutionnel"
        ],
        "studio_styles": [
            "PLUG ART bleu clean", "Minimal épuré", "Éditorial magazine",
            "Galerie contemporaine", "Noir & blanc premium", "Urbain artistique",
            "Peinture / matière", "Urgence impactante", "Instagram moderne"
        ],
        "ai_profiles": ["Rapide", "Équilibré", "Créatif", "Stratégique", "Premium"],
        "css": V18_CSS,
        "js": V18_JS,
    }
