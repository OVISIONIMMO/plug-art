from pathlib import Path
from fastapi import Body
from fastapi.responses import Response
import hashlib, html

# Preserve the repository's current Content Studio before legacy app_extra imports.
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
_saved_index = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""

import app_extra as legacy

app = legacy.app
app.version = "10.0"

# app_extra still assembles the older V8 parts at import time. Restore the newer
# Content Studio and inject V10 assets after that legacy boot step.
if _saved_index:
    page = _saved_index
    css_tag = '<link rel="stylesheet" href="/static/content_studio_v10.css?v=10">'
    js_tag = '<script src="/static/content_studio_v10.js?v=10"></script>'
    if "content_studio_v10.css" not in page:
        page = page.replace("</head>", css_tag + "\n</head>", 1)
    if "content_studio_v10.js" not in page:
        page = page.replace("</body>", js_tag + "\n</body>", 1)
    INDEX.write_text(page, encoding="utf-8")


def _safe(value, limit=300):
    return " ".join(str(value or "").split())[:limit]


def _plugy_visual_svg(prompt: str, style: str = "abstract"):
    """Generate an original editorial/abstract background from a prompt.

    This engine is local and deterministic: it does not invent factual copy and
    needs no external API key, which keeps the Content Studio usable in production.
    """
    prompt = _safe(prompt) or "PLUG ART creative visual"
    style = _safe(style, 30).lower() or "abstract"
    seed = hashlib.sha256((style + "|" + prompt).encode("utf-8", "ignore")).hexdigest()
    nums = [int(seed[i:i+2], 16) for i in range(0, 48, 2)]
    palettes = {
        "abstract": ["#315bff", "#30d8ea", "#7653ff", "#ef4fb6", "#ff9852"],
        "editorial": ["#1a1a1a", "#d2bea1", "#f4eee5", "#735d48", "#9a8d7c"],
        "cosmic": ["#07102a", "#1f3fff", "#5d2dff", "#f24fc4", "#30d8ea"],
        "street": ["#111827", "#ff4f78", "#ffb020", "#2dd4bf", "#6d5cff"],
        "minimal": ["#f8fafc", "#e5e7eb", "#111827", "#315bff", "#d8e2ff"],
    }
    pal = palettes.get(style, palettes["abstract"])
    bg = pal[0] if style in {"cosmic", "street"} else "#f8fbff"
    shapes = []
    for i in range(12):
        x = 70 + (nums[i % len(nums)] / 255) * 1060
        y = 80 + (nums[(i + 5) % len(nums)] / 255) * 1340
        r = 70 + (nums[(i + 9) % len(nums)] / 255) * 250
        rot = nums[(i + 13) % len(nums)] / 255 * 180
        color = pal[(i + nums[(i + 3) % len(nums)]) % len(pal)]
        opacity = 0.20 + (nums[(i + 17) % len(nums)] / 255) * 0.42
        if i % 3 == 0:
            shapes.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{color}" opacity="{opacity:.2f}" filter="url(#blur)"/>')
        elif i % 3 == 1:
            w, h = r * 2.1, r * .72
            shapes.append(f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h/2:.1f}" fill="{color}" opacity="{opacity:.2f}" transform="rotate({rot:.1f} {x:.1f} {y:.1f})"/>')
        else:
            x2, y2 = x + r * .75, y - r * .45
            x3, y3 = x - r * .55, y + r * .65
            shapes.append(f'<path d="M{x:.1f},{y-r:.1f} L{x2:.1f},{y2:.1f} L{x3:.1f},{y3:.1f} Z" fill="{color}" opacity="{opacity:.2f}" transform="rotate({rot:.1f} {x:.1f} {y:.1f})"/>')
    safe_prompt = html.escape(prompt[:90])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
      <defs><filter id="blur"><feGaussianBlur stdDeviation="46"/></filter>
      <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{pal[1]}" stop-opacity=".18"/><stop offset="1" stop-color="{pal[-1]}" stop-opacity=".28"/></linearGradient></defs>
      <rect width="1200" height="1500" fill="{bg}"/><rect width="1200" height="1500" fill="url(#wash)"/>
      {''.join(shapes)}
      <path d="M-80 1150 C230 980,390 1330,690 1090 S1080 870,1320 1040" fill="none" stroke="{pal[3]}" stroke-width="34" stroke-linecap="round" opacity=".42"/>
      <path d="M-60 1188 C260 1014,420 1365,720 1120 S1090 900,1300 1070" fill="none" stroke="{pal[2]}" stroke-width="9" stroke-linecap="round" opacity=".55"/>
      <rect x="58" y="58" width="1084" height="1384" rx="42" fill="none" stroke="white" stroke-opacity=".34"/>
      <metadata>{safe_prompt}</metadata></svg>'''


@app.post("/api/content/visual")
def plugy_content_visual(payload: dict = Body(default={})):
    prompt = str((payload or {}).get("prompt") or "")
    style = str((payload or {}).get("style") or "abstract")
    return Response(
        _plugy_visual_svg(prompt, style),
        media_type="image/svg+xml",
        headers={"Cache-Control": "no-store", "X-PLUGY-Visual": "local-generative"},
    )
