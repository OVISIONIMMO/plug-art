from pathlib import Path
from fastapi import Body, HTTPException
from fastapi.responses import FileResponse
import base64
import hashlib
import os
import re
import time
import requests

import app_extra_v10 as v10

app = v10.app
app.version = "11.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"

# Inject the V11 editor on top of V10 without rewriting the main interface.
if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    css_tag = '<link rel="stylesheet" href="/static/content_studio_v11.css?v=11">'
    js_tag = '<script src="/static/content_studio_v11.js?v=11"></script>'
    if "content_studio_v11.css" not in page:
        page = page.replace("</head>", css_tag + "\n</head>", 1)
    if "content_studio_v11.js" not in page:
        page = page.replace("</body>", js_tag + "\n</body>", 1)
    INDEX.write_text(page, encoding="utf-8")

_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
GENERATED_DIR = Path(os.getenv("PLUGART_GENERATED_DIR", str(_db_hint.parent / "generated-content")))
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_MODELS = {
    "gpt-image-2.5-sunburst",
    "gpt-image-2.5-flare",
    "gpt-image-2",
}
DEFAULT_IMAGE_MODEL = os.getenv("PLUGART_IMAGE_MODEL", "gpt-image-2.5-sunburst")
if DEFAULT_IMAGE_MODEL not in ALLOWED_IMAGE_MODELS:
    DEFAULT_IMAGE_MODEL = "gpt-image-2.5-sunburst"


def _clean(value, limit=1800):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _image_size(ratio: str):
    ratio = (ratio or "4:5").strip()
    if ratio == "1:1":
        return "1024x1024"
    if ratio in {"16:9", "3:2"}:
        return "1536x1024"
    return "1024x1536"


def _prompt(prompt: str, style: str):
    style_map = {
        "photo": "photorealistic editorial photography, premium contemporary art direction",
        "gallery": "photorealistic contemporary art gallery interior, sophisticated exhibition lighting",
        "portrait": "photorealistic creative portrait photography, editorial art magazine quality",
        "urban": "photorealistic urban cultural scene, contemporary European city, cinematic natural light",
        "studio": "photorealistic artist studio, tactile materials, authentic creative atmosphere",
        "architecture": "photorealistic cultural architecture, refined wide angle photography",
        "product": "premium photorealistic still life, art-object editorial styling",
    }
    direction = style_map.get(style, style_map["photo"])
    return (
        f"{direction}. {prompt}. "
        "Create a clean high-end visual for a PLUG ART social media carousel. "
        "No typography, no logos, no watermarks, no UI mockups. "
        "Leave useful negative space for editorial text overlay. Natural materials, believable light, realistic depth, professional composition."
    )


def _decode_image_response(data: dict):
    items = (data or {}).get("data") or []
    if not items:
        raise RuntimeError("La génération n'a retourné aucune image.")
    item = items[0] or {}
    b64 = item.get("b64_json") or item.get("image_base64") or item.get("b64")
    if b64:
        return base64.b64decode(b64), "image/png"
    remote_url = item.get("url") or item.get("image_url")
    if remote_url:
        r = requests.get(remote_url, timeout=90)
        r.raise_for_status()
        return r.content, r.headers.get("content-type", "image/png").split(";")[0]
    raise RuntimeError("Format d'image inattendu reçu du fournisseur.")


@app.get("/api/content/image/status")
def content_image_status():
    enabled = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "enabled": enabled,
        "provider": "openai" if enabled else "local-fallback",
        "default_model": DEFAULT_IMAGE_MODEL,
        "models": ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2"],
        "generated_dir": str(GENERATED_DIR),
        "message": "Génération photo IA active" if enabled else "Ajoutez OPENAI_API_KEY dans Railway pour activer la génération photoréaliste.",
    }


@app.post("/api/content/image")
def generate_content_image(payload: dict = Body(default={})):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            503,
            "La génération photo IA est prête mais OPENAI_API_KEY n'est pas encore configurée dans Railway. Le générateur artistique local reste disponible.",
        )

    prompt = _clean((payload or {}).get("prompt"), 1600)
    if not prompt:
        raise HTTPException(400, "Décris le visuel à générer.")
    style = _clean((payload or {}).get("style") or "photo", 40).lower()
    ratio = _clean((payload or {}).get("ratio") or "4:5", 12)
    quality = _clean((payload or {}).get("quality") or "medium", 20).lower()
    if quality not in {"low", "medium", "high", "xhigh", "max", "auto"}:
        quality = "medium"
    model = _clean((payload or {}).get("model") or DEFAULT_IMAGE_MODEL, 80)
    if model not in ALLOWED_IMAGE_MODELS:
        model = DEFAULT_IMAGE_MODEL

    request_body = {
        "model": model,
        "prompt": _prompt(prompt, style),
        "size": _image_size(ratio),
        "quality": quality,
        "n": 1,
    }
    try:
        r = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=request_body,
            timeout=180,
        )
    except requests.RequestException as exc:
        raise HTTPException(502, f"Le fournisseur d'images est momentanément indisponible: {str(exc)[:180]}")

    if not r.ok:
        detail = ""
        try:
            err = r.json().get("error") or {}
            detail = err.get("message") or str(err)
        except Exception:
            detail = r.text[:280]
        raise HTTPException(502, f"Erreur génération image ({r.status_code}): {detail[:260]}")

    try:
        raw, content_type = _decode_image_response(r.json())
    except Exception as exc:
        raise HTTPException(502, str(exc)[:280])

    ext = ".png"
    if "jpeg" in content_type or raw[:3] == b"\xff\xd8\xff":
        ext = ".jpg"
    elif "webp" in content_type or raw[:4] == b"RIFF":
        ext = ".webp"
    token = hashlib.sha256((prompt + model + str(time.time_ns())).encode("utf-8")).hexdigest()[:24]
    filename = f"plugart_{token}{ext}"
    path = GENERATED_DIR / filename
    path.write_bytes(raw)
    return {
        "ok": True,
        "provider": "openai",
        "model": model,
        "quality": quality,
        "size": request_body["size"],
        "url": f"/api/content/generated/{filename}",
    }


@app.get("/api/content/generated/{filename}")
def generated_content_file(filename: str):
    if not re.fullmatch(r"plugart_[a-f0-9]{24}\.(png|jpg|webp)", filename):
        raise HTTPException(404, "Fichier introuvable")
    path = GENERATED_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})
