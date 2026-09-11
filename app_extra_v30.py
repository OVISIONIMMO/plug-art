from pathlib import Path
from fastapi import Body, HTTPException, Request
from fastapi.responses import FileResponse
import base64, hashlib, json, os, re, time, requests

import app_extra_v29 as v29
import app as core

app = v29.app
app.version = "30.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V30_CSS = "/static/site_v30.css?v=30.20260911.1"
V30_JS = "/static/site_v30.js?v=30.20260911.1"
V30_STUDIO_JS = "/static/studio_v30.js?v=30.20260911.1"
PLUGY_HEAD = BASE / "static" / "plugy_head_v26.glb"


def _remove_asset(page: str, filename: str):
    e = re.escape(filename)
    page = re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    return page


def _inject_v30():
    if not INDEX.exists():
        return []
    page = INDEX.read_text(encoding="utf-8")
    # V30 remplace les runtimes PLUGY empilés et garde uniquement le socle visuel V24.
    removed = (
        "site_v25.js", "site_v26.js", "site_v29.js", "plugy_ai_v17.js",
        "site_v25.css", "site_v26.css", "site_v29.css", "studio_v28_patch.js",
        "site_v30.css", "site_v30.js", "studio_v30.js",
    )
    for name in removed:
        page = _remove_asset(page, name)
    page = page.replace('<script>window.__PLUG_V26=true;window.__PLUG_HEAD_ONLY=true;</script>', '')
    page = page.replace('<script>window.__PLUG_V26=true;</script>', '')
    preload = '<link rel="preload" href="/static/plugy_head_v26.glb?v=30.20260911.1" as="fetch" type="model/gltf-binary" crossorigin>'
    boot = '<script>window.__PLUG_V30=true;window.__PLUG_HEAD_ONLY=true;</script>'
    page = page.replace('</head>', f'{boot}\n{preload}\n<link rel="stylesheet" href="{V30_CSS}">\n</head>', 1)
    page = page.replace('</body>', f'<script src="{V30_JS}"></script>\n<script src="{V30_STUDIO_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")
    return [x for x in removed if x in page]


LEGACY_REFS = _inject_v30()

# ---------- PLUGY V30 : assistant rapide et contextuel ----------
OPENAI_RESPONSES = "https://api.openai.com/v1/responses"
FAST_MODEL = os.getenv("PLUGY_FAST_MODEL", "gpt-5.6-luna").strip() or "gpt-5.6-luna"
DEEP_MODEL = os.getenv("PLUGY_DEEP_MODEL", "gpt-5.6-terra").strip() or "gpt-5.6-terra"


def _plug_context(limit=6):
    try:
        opp = core.rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,source_url from opportunities where status in ('open','rolling') order by coalesce(radar_score,score,0) desc limit ?", (limit,))
    except Exception:
        opp = []
    try:
        stats = core.stats()
    except Exception:
        stats = {}
    return {"stats": stats, "top_opportunities": opp}


def _extract_text(data):
    text = (data or {}).get("output_text")
    if isinstance(text, str) and text.strip():
        return text.strip()
    parts = []
    for item in (data or {}).get("output") or []:
        for c in item.get("content") or []:
            if c.get("type") == "output_text" and c.get("text"):
                parts.append(c["text"])
    return "\n".join(parts).strip()


@app.post("/api/v30/plugy")
def plugy_v30(payload: dict = Body(default={})):
    message = re.sub(r"\s+", " ", str((payload or {}).get("message") or "")).strip()[:8000]
    if not message:
        raise HTTPException(422, "Message vide")
    page = re.sub(r"[^a-z0-9_-]", "", str((payload or {}).get("page") or "explorer").lower())[:40]
    mode = str((payload or {}).get("mode") or "fast").lower()
    model = DEEP_MODEL if mode == "deep" else FAST_MODEL
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "model": "local-radar", "latency_ms": 0})
        return result
    context = _plug_context(6)
    instructions = (
        "Tu es PLUGY, assistant personnel intelligent de PLUG ART. Réponds en français, vite, clairement et de façon actionnable. "
        "Tu connais la page actuellement ouverte et le Radar PLUG ART. N'invente jamais date, prix, lieu ou lien. "
        "Par défaut donne une réponse courte; développe seulement si demandé. Quand c'est utile, propose l'action suivante concrète."
    )
    user_input = "PAGE ACTIVE: " + page + "\nCONTEXTE PLUG ART: " + json.dumps(context, ensure_ascii=False, separators=(",", ":")) + "\nDEMANDE: " + message
    body = {"model": model, "instructions": instructions, "input": user_input, "store": False, "max_output_tokens": 450, "reasoning": {"effort": "none" if mode != "deep" else "low"}}
    started = time.time()
    try:
        r = requests.post(OPENAI_RESPONSES, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=body, timeout=min(int(os.getenv("PLUGART_OPENAI_TIMEOUT", "35") or 35), 45))
        elapsed = int((time.time() - started) * 1000)
        if not r.ok:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:220]}")
        answer = _extract_text(r.json())
        if not answer:
            raise RuntimeError("réponse vide")
        print(f"PLUGY_V30_OK model={model} elapsed_ms={elapsed} chars={len(answer)} page={page}", flush=True)
        return {"answer": answer, "ai": True, "model": model, "latency_ms": elapsed, "page": page, "items": context.get("top_opportunities", [])[:4]}
    except Exception as exc:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "fallback": True, "model": "local-radar", "ai_error": str(exc)[:220]})
        print(f"PLUGY_V30_FALLBACK {type(exc).__name__}: {str(exc)[:220]}", flush=True)
        return result


@app.get("/api/v30/assistant/context")
def plugy_v30_context():
    return {"ok": True, **_plug_context(4)}

# ---------- Image V30 : modèles actuels + fallback côté Studio ----------
_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
GENERATED_DIR = Path(os.getenv("PLUGART_GENERATED_DIR", str(_db_hint.parent / "generated-content")))
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_MODELS = ("gpt-image-2", "gpt-image-1.5", "gpt-image-1")
ENV_IMAGE_MODEL = os.getenv("PLUGART_IMAGE_MODEL", "").strip()
DEFAULT_IMAGE_MODEL = ENV_IMAGE_MODEL if ENV_IMAGE_MODEL in IMAGE_MODELS else "gpt-image-2"


def _clean(v, limit=1800):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:limit]


def _size(ratio):
    ratio = _clean(ratio, 12)
    if ratio == "1:1": return "1024x1024"
    if ratio in {"16:9", "3:2"}: return "1536x1024"
    return "1024x1536"


def _prompt(prompt, style):
    styles = {"photo":"premium photorealistic editorial photography","gallery":"photorealistic contemporary art gallery","portrait":"premium editorial artist portrait","urban":"contemporary urban art and culture scene in Europe","studio":"photorealistic artist studio","architecture":"premium cultural architecture photography","product":"premium art-object still life"}
    return f"{styles.get(style, styles['photo'])}. {prompt}. High-end PLUG ART social visual. No text, no letters, no logo, no watermark. Realistic depth, refined lighting, clean editorial composition."


def _decode_image(data):
    items = (data or {}).get("data") or []
    if not items: raise RuntimeError("aucune image retournée")
    item = items[0] or {}
    b64 = item.get("b64_json") or item.get("image_base64") or item.get("b64")
    if b64: return base64.b64decode(b64), "image/png"
    url = item.get("url") or item.get("image_url")
    if url:
        rr = requests.get(url, timeout=90); rr.raise_for_status()
        return rr.content, (rr.headers.get("content-type") or "image/png").split(";")[0]
    raise RuntimeError("format image inattendu")


@app.get("/api/v30/content/image/status")
def image_v30_status():
    return {"ok": True, "enabled": bool(os.getenv("OPENAI_API_KEY", "").strip()), "model": DEFAULT_IMAGE_MODEL, "models": list(IMAGE_MODELS), "fallback": "/api/content/visual"}


@app.post("/api/v30/content/image")
def image_v30(payload: dict = Body(default={})):
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key: raise HTTPException(503, "OPENAI_API_KEY absente")
    prompt = _clean((payload or {}).get("prompt"))
    if not prompt: raise HTTPException(400, "Décris le visuel à générer")
    style = _clean((payload or {}).get("style") or "photo", 30).lower()
    quality = _clean((payload or {}).get("quality") or "medium", 20).lower()
    if quality not in {"low","medium","high","auto"}: quality = "medium"
    size = _size((payload or {}).get("ratio") or "4:5")
    errors = []
    started = time.time()
    for model in [DEFAULT_IMAGE_MODEL] + [m for m in IMAGE_MODELS if m != DEFAULT_IMAGE_MODEL]:
        try:
            body = {"model": model, "prompt": _prompt(prompt, style), "size": size, "quality": quality, "n": 1}
            r = requests.post("https://api.openai.com/v1/images/generations", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=body, timeout=180)
            if not r.ok:
                errors.append(f"{model}: HTTP {r.status_code} {r.text[:180]}")
                continue
            raw, content_type = _decode_image(r.json())
            ext = ".png" if "png" in content_type else (".jpg" if "jpeg" in content_type else ".webp")
            token = hashlib.sha256((prompt + model + str(time.time_ns())).encode()).hexdigest()[:24]
            name = f"plugartv30_{token}{ext}"
            (GENERATED_DIR / name).write_bytes(raw)
            elapsed = int((time.time() - started) * 1000)
            print(f"PLUG_ART_IMAGE_V30_OK model={model} elapsed_ms={elapsed} bytes={len(raw)} size={size}", flush=True)
            return {"ok": True, "provider": "openai", "model": model, "quality": quality, "size": size, "url": f"/api/v30/content/generated/{name}", "latency_ms": elapsed}
        except Exception as exc:
            errors.append(f"{model}: {str(exc)[:220]}")
    print("PLUG_ART_IMAGE_V30_ERROR " + " | ".join(errors)[:700], flush=True)
    raise HTTPException(502, "Échec image IA. Le Studio peut basculer sur le générateur local. " + " | ".join(errors)[:500])


@app.get("/api/v30/content/generated/{filename}")
def image_v30_file(filename: str):
    if not re.fullmatch(r"plugartv30_[a-f0-9]{24}\.(png|jpg|webp)", filename):
        raise HTTPException(404, "Fichier introuvable")
    path = GENERATED_DIR / filename
    if not path.exists(): raise HTTPException(404, "Fichier introuvable")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@app.middleware("http")
async def v30_cache(request: Request, call_next):
    response = await call_next(request)
    p = request.url.path
    if p in ("/", "/index.html") or "v30" in p or p == "/static/plugy_head_v26.glb":
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/v30/status")
def v30_status():
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {"ok": True, "version": "30.0", "profile": "free-roaming-plugy-fast", "plugy_model": "/static/plugy_head_v26.glb", "plugy_free_roaming": True, "plugy_fast_model": FAST_MODEL, "plugy_deep_model": DEEP_MODEL, "image_model": DEFAULT_IMAGE_MODEL, "image_endpoint": "/api/v30/content/image", "legacy_refs": [x for x in ("site_v25.js","site_v26.js","site_v29.js","plugy_ai_v17.js","studio_v28_patch.js") if x in page], "assets": [V30_CSS, V30_JS, V30_STUDIO_JS]}

print(f"PLUG_ART_V30_READY legacy_refs={len(LEGACY_REFS)} fast_model={FAST_MODEL} image_model={DEFAULT_IMAGE_MODEL} head_bytes={PLUGY_HEAD.stat().st_size if PLUGY_HEAD.exists() else 0}", flush=True)
