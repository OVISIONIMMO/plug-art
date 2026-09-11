from pathlib import Path
from fastapi import Body, HTTPException, Query, Request
from fastapi.responses import FileResponse
import base64, hashlib, json, os, re, time, requests

import app_extra_v31 as v31
import app as core

app = v31.app
app.version = "32.0"
BASE = Path(__file__).resolve().parent
INDEX = BASE / "static" / "index.html"
V30_CSS = "/static/site_v30.css?v=30.20260911.1"
V32_CSS = "/static/site_v32.css?v=32.20260911.1"
V32_JS = "/static/site_v32.js?v=32.20260911.1"
V32_STUDIO_JS = "/static/studio_v32.js?v=32.20260911.1"
HEAD = BASE / "static" / "plugy_head_v26.glb"


def _remove_asset(page: str, filename: str):
    e = re.escape(filename)
    page = re.sub(rf'<script[^>]+src=["\'][^"\']*{e}[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = re.sub(rf'<link[^>]+href=["\'][^"\']*{e}[^"\']*["\'][^>]*>\s*', '', page, flags=re.I)
    return page


def _inject_v32():
    if not INDEX.exists():
        return []
    page = INDEX.read_text(encoding="utf-8")
    # Nettoyage final: un seul moteur PLUGY et un seul pont image Studio.
    remove = (
        "site_v24.js", "site_v25.js", "site_v26.js", "site_v29.js", "site_v30.js",
        "plugy_ai_v17.js", "plugy_experience_v18.js", "plugy_glb_runtime_v19.js", "plugy_glb_runtime_v20.js", "plugy_runtime_v23.js",
        "studio_v28_patch.js", "studio_v30.js", "site_v32.js", "studio_v32.js", "site_v32.css",
        "site_v25.css", "site_v26.css", "site_v29.css", "plugy_experience_v18.css", "plugy_v20.css", "plugy_v23.css",
    )
    for name in remove:
        page = _remove_asset(page, name)
    # Le viewer V17 était chargé globalement; V32 le charge à la demande avec fallback.
    page = re.sub(r'<script[^>]+src=["\'][^"\']*model-viewer[^"\']*["\'][^>]*></script>\s*', '', page, flags=re.I)
    page = page.replace('<script>window.__PLUG_V30=true;window.__PLUG_HEAD_ONLY=true;</script>', '')
    boot = '<script>window.__PLUG_V32=true;window.__PLUG_HEAD_ONLY=true;</script>'
    preload = '<link rel="preload" href="/static/plugy_head_v26.glb?v=32.20260911.1" as="fetch" type="model/gltf-binary" crossorigin>'
    # site_v30.css reste le socle visuel de V32; toutes les couches runtime précédentes sont supprimées.
    if "site_v30.css" not in page:
        page = page.replace("</head>", f'<link rel="stylesheet" href="{V30_CSS}">\n</head>', 1)
    page = page.replace("</head>", f'{boot}\n{preload}\n<link rel="stylesheet" href="{V32_CSS}">\n</head>', 1)
    page = page.replace("</body>", f'<script src="{V32_JS}"></script>\n<script src="{V32_STUDIO_JS}"></script>\n</body>', 1)
    INDEX.write_text(page, encoding="utf-8")
    forbidden = [x for x in remove if x not in ("site_v32.js", "studio_v32.js", "site_v32.css") and x in page]
    return forbidden


LEGACY_REFS = _inject_v32()

# ---------------- PLUGY V32 ----------------
OPENAI_RESPONSES = "https://api.openai.com/v1/responses"
FAST_MODEL = os.getenv("PLUGY_FAST_MODEL", "gpt-5.6-luna").strip() or "gpt-5.6-luna"
DEEP_MODEL = os.getenv("PLUGY_DEEP_MODEL", "gpt-5.6-terra").strip() or "gpt-5.6-terra"


def _context(limit=7):
    try:
        opp = core.rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,radar_reason,source_url from opportunities where status in ('open','rolling') order by coalesce(radar_score,score,0) desc limit ?", (limit,))
    except Exception:
        opp = []
    try:
        stats = core.stats()
    except Exception:
        stats = {}
    return {"stats": stats, "top_opportunities": opp}


def _output_text(data):
    if isinstance((data or {}).get("output_text"), str) and data["output_text"].strip():
        return data["output_text"].strip()
    out = []
    for item in (data or {}).get("output") or []:
        for c in item.get("content") or []:
            if c.get("type") == "output_text" and c.get("text"):
                out.append(c["text"])
    return "\n".join(out).strip()


def _page_suggestion(page: str, ctx: dict):
    top = (ctx.get("top_opportunities") or [])
    urgent = [x for x in top if str(x.get("priority") or "").lower() in {"urgente", "très haute", "haute"}]
    if page == "opencalls":
        if urgent:
            return f"J’ai repéré {len(urgent)} priorité(s) forte(s). Ouvre-moi et je te dis laquelle vérifier en premier."
        return "Je peux trier ces appels par accessibilité, coût et échéance."
    if page == "content": return "Donne-moi un sujet : je peux préparer le texte puis lancer le visuel IA dans le Studio."
    if page == "workspace": return "Je peux transformer tes notes et relances en prochaines actions prioritaires."
    if page == "artists": return "Je peux t’aider à structurer le suivi d’un artiste et préparer sa présentation."
    if page == "events": return "Je peux repérer les événements les plus utiles pour PLUG ART."
    if page in {"mapview", "resources"}: return "Je peux t’aider à cibler les zones et ressources les plus utiles au projet."
    count = (ctx.get("stats") or {}).get("opportunities")
    return f"Le Radar contient {count} opportunités actives. Je peux te donner la meilleure prochaine action." if count is not None else "Je peux te donner la meilleure prochaine action sur PLUG ART."


@app.get("/api/v32/assistant/context")
def plugy_context_v32(page: str = Query(default="explorer", max_length=40)):
    page = re.sub(r"[^a-z0-9_-]", "", page.lower()) or "explorer"
    ctx = _context(5)
    return {"ok": True, "page": page, "suggestion": _page_suggestion(page, ctx), **ctx}


@app.post("/api/v32/plugy")
def plugy_v32(payload: dict = Body(default={})):
    message = re.sub(r"\s+", " ", str((payload or {}).get("message") or "")).strip()[:8000]
    if not message:
        raise HTTPException(422, "Message vide")
    page = re.sub(r"[^a-z0-9_-]", "", str((payload or {}).get("page") or "explorer").lower())[:40] or "explorer"
    mode = str((payload or {}).get("mode") or "fast").lower()
    model = DEEP_MODEL if mode == "deep" else FAST_MODEL
    history = []
    for item in ((payload or {}).get("history") or [])[-8:]:
        if not isinstance(item, dict):
            continue
        role = "assistant" if item.get("role") == "assistant" else "user"
        content = re.sub(r"\s+", " ", str(item.get("content") or "")).strip()[:1200]
        if content:
            history.append({"role": role, "content": content})
    ctx = _context(7)
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "model": "local-radar", "page": page, "suggestion": _page_suggestion(page, ctx)})
        return result
    instructions = (
        "Tu es PLUGY, l'assistant personnel de PLUG ART. Tu es proactif, très concis et utile. "
        "Tu connais la page ouverte, les chiffres du Radar et les opportunités fournies. "
        "Tu aides à décider, organiser, créer des contenus et préparer les prochaines actions. "
        "N'invente jamais une date, un prix, un lieu, un lien ou un statut. Si une donnée manque, dis qu'elle doit être vérifiée. "
        "Réponds en français. Donne d'abord la réponse utile, puis au maximum 3 prochaines actions si cela apporte quelque chose."
    )
    memory = "\n".join(f"{x['role'].upper()}: {x['content']}" for x in history[-6:])
    user_input = (
        f"PAGE ACTIVE: {page}\n"
        f"CONTEXTE PLUG ART: {json.dumps(ctx, ensure_ascii=False, separators=(',', ':'))}\n"
        f"HISTORIQUE RÉCENT:\n{memory}\n"
        f"DEMANDE ACTUELLE: {message}"
    )
    body = {"model": model, "instructions": instructions, "input": user_input, "store": False, "max_output_tokens": 520, "text": {"verbosity": "low"}}
    started = time.time()
    try:
        r = requests.post(OPENAI_RESPONSES, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=body, timeout=min(int(os.getenv("PLUGART_OPENAI_TIMEOUT", "32") or 32), 40))
        elapsed = int((time.time() - started) * 1000)
        if not r.ok:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:240]}")
        answer = _output_text(r.json())
        if not answer:
            raise RuntimeError("réponse vide")
        print(f"PLUGY_V32_OK model={model} elapsed_ms={elapsed} page={page} chars={len(answer)}", flush=True)
        return {"answer": answer, "ai": True, "model": model, "latency_ms": elapsed, "page": page, "items": ctx.get("top_opportunities", [])[:4], "suggestion": _page_suggestion(page, ctx)}
    except Exception as exc:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "fallback": True, "model": "local-radar", "page": page, "suggestion": _page_suggestion(page, ctx), "ai_error": str(exc)[:240]})
        print(f"PLUGY_V32_FALLBACK {type(exc).__name__}: {str(exc)[:240]}", flush=True)
        return result


# ---------------- IMAGE V32 ----------------
# Flare est priorisé pour la fluidité; Sunburst reste le fallback qualité.
IMAGE_MODELS = ("gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2")
DEFAULT_IMAGE_MODEL = os.getenv("PLUGART_IMAGE_MODEL", "").strip()
if DEFAULT_IMAGE_MODEL not in IMAGE_MODELS:
    DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare"
_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
GENERATED_DIR = Path(os.getenv("PLUGART_GENERATED_DIR", str(_db_hint.parent / "generated-content")))
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _clean(v, n=1800): return re.sub(r"\s+", " ", str(v or "")).strip()[:n]
def _image_size(ratio):
    ratio = _clean(ratio, 12)
    if ratio == "1:1": return "1024x1024"
    if ratio in {"16:9", "3:2"}: return "1536x1024"
    return "1024x1536"

def _image_prompt(prompt, style):
    styles = {"photo":"premium photorealistic editorial photography","gallery":"photorealistic contemporary art gallery","portrait":"premium editorial portrait of a contemporary artist","urban":"contemporary urban art and culture scene in Europe","studio":"photorealistic artist studio","architecture":"premium cultural architecture photography","product":"premium art-object still life"}
    return f"{styles.get(style, styles['photo'])}. {prompt}. High-end PLUG ART social visual. No typography, no letters, no logos, no watermark, no UI mockup. Refined lighting, believable materials, clean editorial composition."

def _decode_image(data):
    items = (data or {}).get("data") or []
    if not items: raise RuntimeError("aucune image retournée")
    item = items[0] or {}
    encoded = item.get("b64_json") or item.get("image_base64") or item.get("b64")
    if encoded: return base64.b64decode(encoded), "image/png"
    remote = item.get("url") or item.get("image_url")
    if remote:
        rr = requests.get(remote, timeout=90); rr.raise_for_status()
        return rr.content, (rr.headers.get("content-type") or "image/png").split(";")[0]
    raise RuntimeError("format image inattendu")


def _generate_image_provider(key, model, prompt, size, quality):
    body = {"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}
    r = requests.post("https://api.openai.com/v1/images/generations", headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=body, timeout=165)
    if not r.ok:
        try: detail = (r.json().get("error") or {}).get("message") or r.text[:260]
        except Exception: detail = r.text[:260]
        raise RuntimeError(f"{model}: HTTP {r.status_code} — {detail[:260]}")
    return _decode_image(r.json())


@app.get("/api/v32/content/image/status")
def image_status_v32():
    return {"ok": True, "enabled": bool(os.getenv("OPENAI_API_KEY", "").strip()), "provider": "openai", "model": DEFAULT_IMAGE_MODEL, "models": list(IMAGE_MODELS), "fallback": "/api/content/visual"}


@app.post("/api/v32/content/image")
def image_v32(payload: dict = Body(default={})):
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key: raise HTTPException(503, "OPENAI_API_KEY absente")
    prompt = _clean((payload or {}).get("prompt"))
    if not prompt: raise HTTPException(400, "Décris le visuel à générer")
    style = _clean((payload or {}).get("style") or "photo", 30).lower()
    ratio = _clean((payload or {}).get("ratio") or "4:5", 12)
    quality = _clean((payload or {}).get("quality") or "medium", 20).lower()
    if quality not in {"low", "medium", "high", "xhigh", "max", "auto"}: quality = "medium"
    size = _image_size(ratio)
    full_prompt = _image_prompt(prompt, style)
    started = time.time(); errors = []
    candidates = [DEFAULT_IMAGE_MODEL] + [m for m in IMAGE_MODELS if m != DEFAULT_IMAGE_MODEL]
    for model in candidates:
        try:
            raw, content_type = _generate_image_provider(key, model, full_prompt, size, quality)
            ext = ".jpg" if ("jpeg" in content_type or raw[:3] == b"\xff\xd8\xff") else (".webp" if ("webp" in content_type or raw[:4] == b"RIFF") else ".png")
            token = hashlib.sha256((prompt + model + str(time.time_ns())).encode()).hexdigest()[:24]
            name = f"plugartv32_{token}{ext}"; (GENERATED_DIR / name).write_bytes(raw)
            elapsed = int((time.time() - started) * 1000)
            print(f"PLUG_ART_IMAGE_V32_OK model={model} elapsed_ms={elapsed} bytes={len(raw)} size={size} quality={quality}", flush=True)
            return {"ok": True, "provider": "openai", "model": model, "quality": quality, "size": size, "url": f"/api/v32/content/generated/{name}", "latency_ms": elapsed}
        except Exception as exc:
            errors.append(str(exc)[:300])
    print("PLUG_ART_IMAGE_V32_ERROR " + " | ".join(errors)[:900], flush=True)
    raise HTTPException(502, "Échec génération IA : " + " | ".join(errors)[:650])


@app.get("/api/v32/content/generated/{filename}")
def image_file_v32(filename: str):
    if not re.fullmatch(r"plugartv32_[a-f0-9]{24}\.(png|jpg|webp)", filename): raise HTTPException(404, "Fichier introuvable")
    path = GENERATED_DIR / filename
    if not path.exists() or not path.is_file(): raise HTTPException(404, "Fichier introuvable")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


# Smoke test option: activé temporairement en production pour valider réellement le fournisseur image.
def _image_smoke_if_requested():
    if os.getenv("PLUGART_IMAGE_SMOKE", "0") != "1": return
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        print("PLUG_ART_IMAGE_V32_SMOKE skipped=no-key", flush=True); return
    try:
        started = time.time(); raw, _ = _generate_image_provider(key, DEFAULT_IMAGE_MODEL, "Minimal abstract blue and violet gradient sphere on white background. No text.", "1024x1024", "low")
        print(f"PLUG_ART_IMAGE_V32_SMOKE_OK model={DEFAULT_IMAGE_MODEL} elapsed_ms={int((time.time()-started)*1000)} bytes={len(raw)}", flush=True)
    except Exception as exc:
        print(f"PLUG_ART_IMAGE_V32_SMOKE_ERROR {type(exc).__name__}: {str(exc)[:500]}", flush=True)

_image_smoke_if_requested()

@app.middleware("http")
async def v32_cache(request: Request, call_next):
    response = await call_next(request)
    p = request.url.path
    if p in ("/", "/index.html") or "v32" in p:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"; response.headers["Expires"] = "0"
    elif p == "/static/plugy_head_v26.glb":
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


@app.get("/api/v32/status")
def v32_status():
    page = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    forbidden = ("site_v24.js", "site_v25.js", "site_v26.js", "site_v29.js", "site_v30.js", "plugy_ai_v17.js", "plugy_experience_v18.js", "plugy_glb_runtime_v19.js", "plugy_glb_runtime_v20.js", "plugy_runtime_v23.js", "studio_v28_patch.js", "studio_v30.js")
    return {"ok": True, "version": "32.0", "profile": "event-driven-free-plugy", "plugy_free_roaming": True, "plugy_model": "/static/plugy_head_v26.glb", "plugy_model_bytes": HEAD.stat().st_size if HEAD.exists() else 0, "assistant": "/api/v32/plugy", "fast_model": FAST_MODEL, "deep_model": DEEP_MODEL, "image_endpoint": "/api/v32/content/image", "image_model": DEFAULT_IMAGE_MODEL, "legacy_runtime_refs": [x for x in forbidden if x in page], "startup_legacy_refs": LEGACY_REFS, "assets": [V30_CSS, V32_CSS, V32_JS, V32_STUDIO_JS]}

print(f"PLUG_ART_V32_READY legacy_refs={len(LEGACY_REFS)} fast_model={FAST_MODEL} image_model={DEFAULT_IMAGE_MODEL} head_bytes={HEAD.stat().st_size if HEAD.exists() else 0}", flush=True)
