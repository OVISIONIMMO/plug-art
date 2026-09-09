from pathlib import Path
from fastapi import Request
from fastapi.responses import Response, JSONResponse
import asyncio
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
app.version = "16.2"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V16_CSS = "/static/visual_v16.css?v=16.20260909.1"
V16_JS = "/static/thumbnail_v16.js?v=16.20260909.1"
PLUGY_CHAT_JS = "/static/plugy_ai_v17.js?v=17.20260909.1"

OPENAI_API_URL = "https://api.openai.com/v1/responses"
OPENAI_MODEL = os.getenv("PLUGART_OPENAI_MODEL", "gpt-5.6-terra")
OPENAI_TIMEOUT = int(os.getenv("PLUGART_OPENAI_TIMEOUT", "35"))
PLUGY_INSTRUCTIONS = """Tu es PLUGY, l'agent IA interne de PLUG ART.
Tu réponds principalement en français, de façon claire, concrète et directement exploitable.
Tes domaines prioritaires sont : art contemporain et artistes émergents, appels à candidatures et expositions collectives, stratégie associative et culturelle, développement de lieux artistiques, partenariats, marketing digital, réseaux sociaux, création de carrousels Instagram, rédaction de candidatures et stratégie de prospection.
Quand le contexte PLUG ART contient des opportunités, utilise ces données en priorité et ne fabrique jamais de deadline, tarif, lieu ou lien. Si une donnée n'est pas confirmée, dis qu'elle doit être vérifiée sur la source.
Pour les recommandations, privilégie les opportunités accessibles aux artistes émergents, gratuites ou à coût raisonnable, avec une priorité Paris/Île-de-France puis Europe.
Quand l'utilisateur demande une publication ou un carrousel, donne une structure prête à utiliser, avec accroche, informations essentielles et CTA.
Reste concis par défaut, mais développe quand la demande nécessite une stratégie détaillée.
"""

if INDEX.exists():
    page = INDEX.read_text(encoding="utf-8")
    if "visual_v16.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{V16_CSS}">\n</head>', 1)
    if "thumbnail_v16.js" not in page:
        page = page.replace("</body>", f'<script src="{V16_JS}"></script>\n</body>', 1)
    if "plugy_ai_v17.js" not in page:
        page = page.replace("</body>", f'<script src="{PLUGY_CHAT_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")

_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
THUMB_CACHE_DIR = Path(os.getenv("PLUGART_THUMB_CACHE_DIR", str(_db_hint.parent / "thumbnail-cache-v16")))
THUMB_CACHE_DIR.mkdir(parents=True, exist_ok=True)
THUMB_TTL = 60 * 60 * 24 * 7
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def _openai_configured():
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def _compact_opportunity(row):
    return {
        "id": row.get("id"),
        "title": row.get("title"),
        "city": row.get("city"),
        "country": row.get("country"),
        "deadline": row.get("deadline"),
        "fee": row.get("fee"),
        "score": row.get("score"),
        "priority": row.get("priority"),
        "reason": row.get("radar_reason"),
        "source_url": row.get("source_url"),
    }


def _plugy_context():
    active = core.rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,radar_reason,source_url from opportunities where status in ('open','rolling') order by coalesce(radar_score,score,0) desc limit 12")
    candidates = core.rows("select id,title,city,country,deadline,fee,candidate_score score,reason,source_url from radar_candidates where state='new' order by candidate_score desc limit 8")
    return {
        "stats": core.stats(),
        "top_opportunities": [_compact_opportunity(x) for x in active],
        "new_candidates": candidates,
    }


def _extract_openai_text(data):
    text = data.get("output_text")
    if isinstance(text, str) and text.strip():
        return text.strip()
    parts = []
    for item in data.get("output") or []:
        for content in item.get("content") or []:
            if content.get("type") == "output_text" and content.get("text"):
                parts.append(content["text"])
    return "\n".join(parts).strip()


def _ask_openai(message: str):
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    context = _plugy_context()
    user_input = (
        "CONTEXTE INTERNE PLUG ART (données du Radar, à utiliser sans les inventer) :\n"
        + json.dumps(context, ensure_ascii=False, separators=(",", ":"))
        + "\n\nQUESTION / DEMANDE :\n"
        + message
    )
    payload = {
        "model": OPENAI_MODEL,
        "instructions": PLUGY_INSTRUCTIONS,
        "input": user_input,
        "store": False,
        "reasoning": {"effort": "low"},
        "max_output_tokens": 800,
    }
    started = time.time()
    print(f"PLUGY_OPENAI_START model={OPENAI_MODEL} message_chars={len(message)}", flush=True)
    response = requests.post(
        OPENAI_API_URL,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=OPENAI_TIMEOUT,
    )
    elapsed_ms = int((time.time() - started) * 1000)
    if not response.ok:
        try:
            detail = response.json().get("error", {}).get("message") or response.text
        except Exception:
            detail = response.text
        print(f"PLUGY_OPENAI_ERROR status={response.status_code} elapsed_ms={elapsed_ms} detail={detail[:220]}", flush=True)
        raise RuntimeError(f"OpenAI HTTP {response.status_code}: {detail[:240]}")
    data = response.json()
    answer = _extract_openai_text(data)
    if not answer:
        print(f"PLUGY_OPENAI_ERROR status=empty elapsed_ms={elapsed_ms}", flush=True)
        raise RuntimeError("OpenAI a renvoyé une réponse vide")
    print(f"PLUGY_OPENAI_OK elapsed_ms={elapsed_ms} answer_chars={len(answer)} model={data.get('model') or OPENAI_MODEL}", flush=True)
    return {
        "answer": answer,
        "items": context["top_opportunities"][:5],
        "ai": True,
        "fallback": False,
        "model": data.get("model") or OPENAI_MODEL,
        "latency_ms": elapsed_ms,
    }


def _legacy_plugy(message: str, error: str = ""):
    result = core.plugy(core.PlugyMessage(message=message))
    result["ai"] = False
    result["fallback"] = True
    result["model"] = "local-radar"
    if error:
        result["ai_error"] = error[:240]
    return result


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

    if path == "/api/plugy" and request.method == "POST" and _openai_configured():
        try:
            body = await request.json()
            message = str((body or {}).get("message") or "").strip()
            if not message:
                return JSONResponse({"detail": "Message vide"}, status_code=422)
            result = await asyncio.to_thread(_ask_openai, message)
            return JSONResponse(result, headers={"Cache-Control": "no-store"})
        except Exception as exc:
            message = locals().get("message", "")
            print(f"PLUGY_FALLBACK reason={type(exc).__name__}: {str(exc)[:220]}", flush=True)
            if message:
                return JSONResponse(_legacy_plugy(message, str(exc)), headers={"Cache-Control": "no-store"})
            return JSONResponse({"detail": "PLUGY indisponible"}, status_code=503)

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
    if path in ("/", "/index.html") or path.endswith("visual_v16.css") or path.endswith("thumbnail_v16.js") or path.endswith("plugy_ai_v17.js"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v16/status")
def v16_status():
    cache_files = len(list(THUMB_CACHE_DIR.glob("*.bin")))
    return {
        "ok": True,
        "version": "16.2",
        "visual": "refined-transparent-glass",
        "contrast": "enhanced",
        "thumbnail_proxy": True,
        "thumbnail_disk_cache": True,
        "thumbnail_cache_files": cache_files,
        "openai_configured": _openai_configured(),
        "plugy_ai": "openai" if _openai_configured() else "local-radar",
        "openai_model": OPENAI_MODEL,
        "plugy_chat_bridge": "v17",
        "css": V16_CSS,
        "js": V16_JS,
    }


@app.get("/api/v16/openai/status")
def openai_status():
    return {
        "ok": True,
        "configured": _openai_configured(),
        "model": OPENAI_MODEL,
        "endpoint": "responses",
        "fallback": "local-radar",
        "chat_bridge": "v17",
    }
