from pathlib import Path
from fastapi import Request
from fastapi.responses import Response
import hashlib
import json
import os
import re
import time
import requests

import app_extra_v15 as v15
import app_extra as previews
import app as core

app = v15.app
app.version = "16.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V16_CSS = "/static/visual_v16.css?v=16.20260909.1"
V16_JS = "/static/thumbnail_v16.js?v=16.20260909.1"

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    if "visual_v16.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{V16_CSS}">\n</head>', 1)
    if "thumbnail_v16.js" not in page:
        page = page.replace("</body>", f'<script src="{V16_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
THUMB_CACHE_DIR = Path(os.getenv("PLUGART_THUMB_CACHE_DIR", str(_db_hint.parent / "thumbnail-cache-v16")))
THUMB_CACHE_DIR.mkdir(parents=True, exist_ok=True)
THUMB_TTL = 60 * 60 * 24 * 7
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _thumb_cache_paths(image_url: str):
    key = hashlib.sha256(image_url.encode("utf-8", "ignore")).hexdigest()
    return THUMB_CACHE_DIR / f"{key}.bin", THUMB_CACHE_DIR / f"{key}.json"


def _cached_remote_image(image_url: str, source_url: str = ""):
    data_path, meta_path = _thumb_cache_paths(image_url)
    if data_path.exists() and meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            if time.time() - float(meta.get("saved_at", 0)) < THUMB_TTL:
                raw = data_path.read_bytes()
                if raw:
                    return raw, meta.get("content_type", "image/jpeg"), "disk-cache"
        except Exception:
            pass

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/152 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        "Cache-Control": "no-cache",
    }
    if source_url:
        headers["Referer"] = source_url
    try:
        with requests.get(image_url, headers=headers, timeout=18, allow_redirects=True, stream=True) as r:
            if not r.ok:
                return None
            content_type = (r.headers.get("content-type") or "").split(";", 1)[0].strip().lower()
            if not content_type.startswith("image/"):
                return None
            content_length = int(r.headers.get("content-length") or 0)
            if content_length and content_length > MAX_IMAGE_BYTES:
                return None
            chunks = []
            total = 0
            for chunk in r.iter_content(64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_IMAGE_BYTES:
                    return None
                chunks.append(chunk)
            raw = b"".join(chunks)
            if not raw:
                return None
            try:
                data_path.write_bytes(raw)
                meta_path.write_text(json.dumps({
                    "content_type": content_type,
                    "saved_at": time.time(),
                    "source": r.url,
                }), encoding="utf-8")
            except Exception:
                pass
            return raw, content_type, "remote"
    except requests.RequestException:
        return None


def _thumbnail_for(kind: str, item_id: int, force=False):
    if kind == "opportunity":
        item = previews._opportunity(item_id)
        accent = "#6d8cff"
    else:
        item = previews._exhibition(item_id)
        accent = "#62dfe8"
    source_url = item.get("source_url") or ""
    preview = previews._extract_preview(source_url, force=force) if source_url else {}
    image_url = (preview or {}).get("image_url") or ""
    if image_url.startswith(("http://", "https://")):
        proxied = _cached_remote_image(image_url, source_url)
        if proxied:
            raw, content_type, cache_state = proxied
            return Response(
                raw,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
                    "X-PLUGART-Thumbnail": cache_state,
                    "X-Content-Type-Options": "nosniff",
                },
            )
    svg = previews._fallback_svg(item.get("title"), core.domain(source_url), accent)
    return Response(
        svg,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "public, max-age=21600, stale-while-revalidate=86400",
            "X-PLUGART-Thumbnail": "fallback",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.middleware("http")
async def thumbnail_proxy_v16(request: Request, call_next):
    path = request.url.path
    match = re.fullmatch(r"/api/(opportunities|exhibitions)/(\d+)/thumbnail", path)
    if match and request.method in {"GET", "HEAD"}:
        kind = "opportunity" if match.group(1) == "opportunities" else "event"
        try:
            response = _thumbnail_for(kind, int(match.group(2)), request.query_params.get("refresh") in {"1", "true", "yes"})
            if request.method == "HEAD":
                response.body = b""
            return response
        except Exception:
            return await call_next(request)
    response = await call_next(request)
    if path in ("/", "/index.html") or path.endswith("visual_v16.css") or path.endswith("thumbnail_v16.js"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v16/status")
def v16_status():
    cache_files = len(list(THUMB_CACHE_DIR.glob("*.bin")))
    return {
        "ok": True,
        "version": "16.0",
        "visual": "refined-transparent-glass",
        "contrast": "enhanced",
        "thumbnail_proxy": True,
        "thumbnail_disk_cache": True,
        "thumbnail_cache_files": cache_files,
        "css": V16_CSS,
        "js": V16_JS,
    }
