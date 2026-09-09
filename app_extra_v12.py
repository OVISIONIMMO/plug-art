from pathlib import Path
import app_extra_v11 as v11

app = v11.app
app.version = "12.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

# Ajoute le thème Glass Bubble V12 au-dessus des styles existants.
if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    css_tag = '<link rel="stylesheet" href="/static/glass_v12.css?v=12">'
    if "glass_v12.css" not in page:
        page = page.replace("</head>", css_tag + "\n</head>", 1)
    INDEX.write_text(page, encoding="utf-8")


@app.get("/api/theme/status")
def theme_status():
    return {
        "ok": True,
        "version": "12.0",
        "theme": "glass-bubble",
        "transparent_panels": True,
        "blur": True,
        "bubble_cards": True,
    }
