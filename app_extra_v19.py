from pathlib import Path
from fastapi import Request

import app_extra_v16 as v16

app = v16.app
app.version = "19.1"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V18_CSS = "/static/plugy_experience_v18.css?v=19.20260910.2"
V18_JS = "/static/plugy_experience_v18.js?v=19.20260910.2"
PRO_CSS = "/static/studio_pro_v19.css?v=19.20260910.2"
PRO_JS = "/static/studio_pro_v19.js?v=19.20260910.2"
GLB_JS = "/static/plugy_glb_runtime_v19.js?v=19.20260910.2"


def _inject_v19_assets():
    if not INDEX.exists():
        return
    page = INDEX.read_text(encoding="utf-8")
    if "plugy_experience_v18.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{V18_CSS}">\n</head>', 1)
    if "studio_pro_v19.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{PRO_CSS}">\n</head>', 1)
    if "plugy_experience_v18.js" not in page:
        page = page.replace("</body>", f'<script src="{V18_JS}"></script>\n</body>', 1)
    if "studio_pro_v19.js" not in page:
        page = page.replace("</body>", f'<script src="{PRO_JS}"></script>\n</body>', 1)
    if "plugy_glb_runtime_v19.js" not in page:
        page = page.replace("</body>", f'<script src="{GLB_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")


_inject_v19_assets()


@app.middleware("http")
async def plugy_v19_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path in ("/", "/index.html") or any(x in path for x in ("plugy_experience_v18", "studio_pro_v19", "plugy_glb_runtime_v19")):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v19/status")
def v19_status():
    return {
        "ok": True,
        "version": "19.1",
        "plugy_chat_readability": True,
        "studio_boost": True,
        "studio_pro": True,
        "plugy_global_companion": True,
        "plugy_3d_mode": "procedural-fallback-glb-ready",
        "glb_expected_path": "/static/plugy.glb",
        "mini_mode": True,
        "blink_animation": True,
        "pointer_follow": True,
        "studio_templates": [
            "Open Call Radar", "Dernier jour", "Top opportunités", "Exposition",
            "Artiste émergent", "Projet / lieu", "Story", "Affiche",
            "Carrousel éducatif", "Institutionnel", "Opportunité Europe", "Paris / 93",
            "Sélection hebdo PLUGY", "Focus artiste", "Lieu partenaire", "PLUG ART HUB",
            "Carrousel 3 slides", "Carrousel 5 slides", "Carrousel 6 slides",
            "Citation artiste", "Rappel candidature", "Compte à rebours"
        ],
        "studio_styles": [
            "PLUG ART bleu clean", "Minimal épuré", "Éditorial magazine",
            "Galerie contemporaine", "Noir & blanc premium", "Urbain artistique",
            "Peinture / matière", "Urgence impactante", "Instagram moderne",
            "Culture premium", "Brutaliste soft", "Europe / opportunités",
            "Photo éditoriale", "Typographie forte", "White gallery", "Pop 93",
            "Institutionnel contemporain"
        ],
        "ai_profiles": ["Rapide", "Équilibré", "Créatif", "Stratégique", "Premium"],
        "assets": {"experience_css": V18_CSS, "experience_js": V18_JS, "studio_css": PRO_CSS, "studio_js": PRO_JS, "glb_runtime": GLB_JS},
    }
