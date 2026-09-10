from __future__ import annotations

from pathlib import Path
from fastapi import Body, HTTPException, Request
from fastapi.responses import FileResponse
import base64
import hashlib
import json
import os
import re
import struct
import time
import requests

import app_extra_v25 as v25
from build_plugy_head_v26 import build_plugy_head_v26

app = v25.app
app.version = "26.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
PLUGY_HEAD = BASE / "static" / "plugy_head_v26.glb"
V26_SITE_CSS = "/static/site_v26.css?v=26.20260910.1"
V26_SITE_JS = "/static/site_v26.js?v=26.20260910.1"
V26_STUDIO_CSS = "/static/studio_v26.css?v=26.20260910.1"
V26_STUDIO_JS = "/static/studio_v26.js?v=26.20260910.1"


def _inspect_glb(path: Path):
    raw = path.read_bytes() if path.exists() else b""
    if len(raw) < 100_000 or raw[:4] != b"glTF":
        raise RuntimeError(f"GLB PLUGY V26 invalide: {len(raw)} octets")
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        raise RuntimeError("En-tête GLB PLUGY V26 invalide")
    json_len, json_type = struct.unpack_from("<I4s", raw, 12)
    if json_type != b"JSON":
        raise RuntimeError("Chunk JSON GLB absent")
    doc = json.loads(raw[20 : 20 + json_len].decode("utf-8").rstrip(" \x00"))
    nodes = [n.get("name", "") for n in doc.get("nodes", [])]
    animations = [a.get("name", "") for a in doc.get("animations", [])]
    if "PLUGY_HeadRig" not in nodes or "Eye_L" not in nodes or "Eye_R" not in nodes:
        raise RuntimeError("Hiérarchie tête/yeux PLUGY V26 incomplète")
    if "IdleBlink" not in animations:
        raise RuntimeError("Animation IdleBlink absente")
    if len(doc.get("meshes", [])) < 9:
        raise RuntimeError("Meshes PLUGY V26 incomplets")
    digest = hashlib.sha256(raw).hexdigest()
    return {
        "bytes": len(raw),
        "sha256": digest,
        "nodes": len(doc.get("nodes", [])),
        "meshes": len(doc.get("meshes", [])),
        "animations": animations,
        "materials": len(doc.get("materials", [])),
    }


def _build_head():
    result = build_plugy_head_v26(PLUGY_HEAD)
    info = _inspect_glb(PLUGY_HEAD)
    print(
        "PLUGY_V26_HEAD_READY "
        f"bytes={info['bytes']} sha256={info['sha256']} nodes={info['nodes']} "
        f"meshes={info['meshes']} animation=IdleBlink",
        flush=True,
    )
    return {**result, **info}


PLUGY_V26_INFO = _build_head()


def _strip(pattern: str, page: str):
    return re.sub(pattern, "", page, flags=re.I)


def _inject_v26():
    if not INDEX.exists():
        return
    page = INDEX.read_text(encoding="utf-8")

    # Une seule expérience PLUGY : V25 construit la navigation / le chat, puis
    # V26 remplace son rendu 3D par la tête de prise. Les anciens runtimes sont retirés.
    legacy_plugy = [
        "plugy_experience_v18\\.js",
        "plugy_experience_v18\\.css",
        "plugy_glb_runtime_v19\\.js",
        "plugy_glb_runtime_v20\\.js",
        "plugy_v20\\.css",
        "site_v24\\.js",
    ]
    for marker in legacy_plugy:
        page = _strip(rf'<script[^>]+src=["\'][^"\']*{marker}[^"\']*["\'][^>]*></script>\s*', page)
        page = _strip(rf'<link[^>]+href=["\'][^"\']*{marker}[^"\']*["\'][^>]*>\s*', page)

    # Le Studio V26 est autonome. On retire uniquement les anciennes couches
    # V20–V23 qui s'empilaient à l'écran. Le moteur éditeur V10/V11 reste disponible
    # dans « Éditeur complet » à la demande.
    for ver in (20, 21, 22, 23):
        page = _strip(rf'<script[^>]+src=["\']/static/studio_v{ver}\\.js[^"\']*["\'][^>]*></script>\s*', page)
        page = _strip(rf'<link[^>]+href=["\']/static/studio_v{ver}\\.css[^"\']*["\'][^>]*>\s*', page)

    # Supprime les anciennes injections V26 avant réinjection déterministe.
    for name in ("site_v26", "studio_v26"):
        page = _strip(rf'<script[^>]+src=["\'][^"\']*{name}\\.js[^"\']*["\'][^>]*></script>\s*', page)
        page = _strip(rf'<link[^>]+href=["\'][^"\']*{name}\\.css[^"\']*["\'][^>]*>\s*', page)

    # Flag chargé avant site_v25 : il empêche l'ancien GLB full-body de démarrer,
    # évitant le flash du mauvais PLUGY et une requête réseau inutile.
    if "__PLUG_V26" not in page:
        page = page.replace("</head>", '<script>window.__PLUG_V26=true;</script>\n</head>', 1)
    page = page.replace(
        "</head>",
        f'<link rel="stylesheet" href="{V26_SITE_CSS}">\n'
        f'<link rel="stylesheet" href="{V26_STUDIO_CSS}">\n</head>',
        1,
    )
    page = page.replace(
        "</body>",
        f'<script src="{V26_SITE_JS}"></script>\n'
        f'<script src="{V26_STUDIO_JS}"></script>\n</body>',
        1,
    )
    INDEX.write_text(page, encoding="utf-8")


_inject_v26()

# -----------------------
# Image generation V26
# -----------------------
_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
GENERATED_DIR = Path(os.getenv("PLUGART_GENERATED_DIR", str(_db_hint.parent / "generated-content")))
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_MODELS = ("gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "gpt-image-2")
ENV_IMAGE_MODEL = os.getenv("PLUGART_IMAGE_MODEL", "").strip()
DEFAULT_IMAGE_MODEL = ENV_IMAGE_MODEL if ENV_IMAGE_MODEL in IMAGE_MODELS else "gpt-image-2.5-sunburst"


def _clean(value, limit=1600):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _image_size(ratio: str):
    ratio = _clean(ratio, 12)
    if ratio == "1:1":
        return "1024x1024"
    if ratio in {"16:9", "3:2"}:
        return "1536x1024"
    return "1024x1536"


def _image_prompt(prompt: str, style: str):
    styles = {
        "photo": "premium photorealistic editorial photography",
        "gallery": "photorealistic contemporary art gallery, refined exhibition lighting",
        "portrait": "premium editorial portrait of a contemporary artist",
        "urban": "photorealistic contemporary urban art and culture scene in Europe",
        "studio": "photorealistic artist studio, tactile materials and authentic creative atmosphere",
        "architecture": "premium cultural architecture photography, realistic wide angle and natural light",
        "product": "premium photorealistic art-object still life",
    }
    direction = styles.get(style, styles["photo"])
    return (
        f"{direction}. {prompt}. "
        "Designed as a high-end PLUG ART social media visual. "
        "No typography, no letters, no logos, no watermarks, no UI mockup. "
        "Keep believable materials, refined lighting, realistic depth and useful negative space for editorial layout."
    )


def _decode_provider_image(data: dict):
    items = (data or {}).get("data") or []
    if not items:
        raise RuntimeError("Le fournisseur n'a retourné aucune image")
    item = items[0] or {}
    encoded = item.get("b64_json") or item.get("image_base64") or item.get("b64")
    if encoded:
        return base64.b64decode(encoded), "image/png"
    remote = item.get("url") or item.get("image_url")
    if remote:
        r = requests.get(remote, timeout=90)
        r.raise_for_status()
        return r.content, r.headers.get("content-type", "image/png").split(";")[0]
    raise RuntimeError("Format de réponse image inattendu")


def _provider_request(api_key: str, model: str, prompt: str, size: str, quality: str):
    body = {"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}
    r = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=body,
        timeout=int(os.getenv("PLUGART_OPENAI_TIMEOUT", "180") or 180),
    )
    if r.ok:
        return _decode_provider_image(r.json()), model
    try:
        detail = (r.json().get("error") or {}).get("message") or r.text[:280]
    except Exception:
        detail = r.text[:280]
    raise RuntimeError(f"{model}: HTTP {r.status_code} — {detail[:260]}")


@app.get("/api/v26/content/image/status")
def v26_content_image_status():
    enabled = bool(os.getenv("OPENAI_API_KEY", "").strip())
    return {
        "ok": True,
        "enabled": enabled,
        "provider": "openai" if enabled else "local-fallback",
        "model": DEFAULT_IMAGE_MODEL,
        "models": list(IMAGE_MODELS),
        "local_fallback": "/api/content/visual",
    }


@app.post("/api/v26/content/image")
def v26_generate_content_image(payload: dict = Body(default={})):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(503, "OPENAI_API_KEY n'est pas configurée. Utilise le fond artistique local.")
    prompt = _clean((payload or {}).get("prompt"), 1600)
    if not prompt:
        raise HTTPException(400, "Décris le visuel à générer")
    style = _clean((payload or {}).get("style") or "photo", 30).lower()
    ratio = _clean((payload or {}).get("ratio") or "4:5", 12)
    quality = _clean((payload or {}).get("quality") or "medium", 20).lower()
    if quality not in {"low", "medium", "high", "xhigh", "max", "auto"}:
        quality = "medium"
    size = _image_size(ratio)
    full_prompt = _image_prompt(prompt, style)

    # Le modèle configuré est tenté d'abord, puis un modèle de secours actuel.
    candidates = [DEFAULT_IMAGE_MODEL] + [m for m in IMAGE_MODELS if m != DEFAULT_IMAGE_MODEL]
    errors = []
    raw = None
    content_type = "image/png"
    used_model = ""
    for model in candidates:
        try:
            (raw, content_type), used_model = _provider_request(api_key, model, full_prompt, size, quality)
            break
        except Exception as exc:
            errors.append(str(exc)[:300])
    if not raw:
        raise HTTPException(502, "Échec génération image : " + " | ".join(errors)[:850])

    ext = ".png"
    if "jpeg" in content_type or raw[:3] == b"\xff\xd8\xff":
        ext = ".jpg"
    elif "webp" in content_type or raw[:4] == b"RIFF":
        ext = ".webp"
    token = hashlib.sha256((prompt + used_model + str(time.time_ns())).encode("utf-8")).hexdigest()[:24]
    filename = f"plugartv26_{token}{ext}"
    path = GENERATED_DIR / filename
    path.write_bytes(raw)
    print(
        f"PLUG_ART_IMAGE_V26_OK model={used_model} quality={quality} size={size} bytes={len(raw)} file={filename}",
        flush=True,
    )
    return {
        "ok": True,
        "provider": "openai",
        "model": used_model,
        "quality": quality,
        "size": size,
        "url": f"/api/v26/content/generated/{filename}",
    }


@app.get("/api/v26/content/generated/{filename}")
def v26_generated_content(filename: str):
    if not re.fullmatch(r"plugartv26_[a-f0-9]{24}\.(png|jpg|webp)", filename):
        raise HTTPException(404, "Fichier introuvable")
    path = GENERATED_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@app.middleware("http")
async def v26_no_cache(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if (
        path in ("/", "/index.html", "/static/plugy_head_v26.glb")
        or "site_v26" in path
        or "studio_v26" in path
        or path == "/api/v26/content/image/status"
    ):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v26/status")
def v26_status():
    info = _inspect_glb(PLUGY_HEAD)
    return {
        "ok": True,
        "version": "26.0",
        "studio": "compact-advanced-menu",
        "studio_direct_image_generation": True,
        "legacy_studio_layers_removed": True,
        "plugy": "head-only",
        "plugy_model": "/static/plugy_head_v26.glb",
        "plugy_rotatable": True,
        "plugy_reflections": True,
        "plugy_animation": "IdleBlink",
        "plugy_blinking": True,
        "plugy_model_info": info,
        "assets": [V26_SITE_CSS, V26_SITE_JS, V26_STUDIO_CSS, V26_STUDIO_JS],
    }
