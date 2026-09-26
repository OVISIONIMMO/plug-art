from pathlib import Path
from fastapi import Body, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse, Response
import base64, hashlib, json, os, re, time, requests

import app as core

app = core.app
OPENAI_RESPONSES = "https://api.openai.com/v1/responses"
OPENAI_SESSION = requests.Session()
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
    top = ctx.get("top_opportunities") or []
    urgent = [x for x in top if str(x.get("priority") or "").lower() in {"urgente", "très haute", "haute"}]
    if page == "opencalls":
        return f"J’ai repéré {len(urgent)} priorité(s) forte(s)." if urgent else "Je peux trier ces appels par accessibilité, coût et échéance."
    if page in {"creation","content"}:
        return "Donne-moi un sujet : je peux préparer le texte puis lancer le visuel IA."
    count = (ctx.get("stats") or {}).get("opportunities")
    return f"Le Radar contient {count} opportunités actives." if count is not None else "Je peux te donner la prochaine action utile."

def _prepare_plugy(payload: dict):
    message = re.sub(r"\s+", " ", str((payload or {}).get("message") or "")).strip()[:8000]
    if not message:
        raise HTTPException(422, "Message vide")
    page = re.sub(r"[^a-z0-9_-]", "", str((payload or {}).get("page") or "dashboard").lower())[:40] or "dashboard"
    mode = str((payload or {}).get("mode") or "fast").lower()
    if mode not in {"fast","deep"}:
        mode = "fast"
    model = DEEP_MODEL if mode == "deep" else FAST_MODEL
    standalone = page == "plugy"
    history_limit = (14 if mode == "deep" else 8) if standalone else (8 if mode == "deep" else 4)
    history = []
    for item in ((payload or {}).get("history") or [])[-history_limit:]:
        if not isinstance(item, dict):
            continue
        role = "assistant" if item.get("role") == "assistant" else "user"
        item_cap = (1800 if mode == "deep" else 1200) if standalone else (1200 if mode == "deep" else 800)
        content = re.sub(r"\s+", " ", str(item.get("content") or "")).strip()[:item_cap]
        if content:
            history.append({"role": role, "content": content})
    ctx = _context(7 if mode == "deep" else 4)
    instructions = (
        "Tu es PLUGY, l'assistant personnel de PLUG ART. Tu es proactif, naturel, précis et utile. "
        "Tu connais la page ouverte, les chiffres du Radar et les opportunités fournies. "
        "Tu aides à décider, organiser, créer des contenus et préparer les prochaines actions. "
        "N'invente jamais une date, un prix, un lieu, un lien ou un statut. Si une donnée manque, dis qu'elle doit être vérifiée. "
        "Réponds en français. "
        + (
          "Sur la page PLUGY dédiée, converse de façon fluide comme un assistant principal : réponds directement à la demande, "
          "garde le fil de la conversation, évite les listes mécaniques si elles ne sont pas utiles, et adapte naturellement la longueur. "
          "En mode fast, sois rapide mais pas télégraphique. En mode deep, développe quand cela améliore réellement la réponse."
          if standalone else
          "En mode fast, réponds en 1 à 4 phrases courtes et au maximum 2 actions. "
          "En mode deep, tu peux développer davantage pour produire un texte réellement exploitable."
        )
    )
    memory_take = (12 if mode == "deep" else 8) if standalone else (6 if mode == "deep" else 4)
    memory = "\n".join(f"{x['role'].upper()}: {x['content']}" for x in history[-memory_take:])
    user_input = (
        f"PAGE ACTIVE: {page}\n"
        f"CONTEXTE PLUG ART: {json.dumps(ctx, ensure_ascii=False, separators=(',', ':'))}\n"
        f"HISTORIQUE RÉCENT:\n{memory}\n"
        f"DEMANDE ACTUELLE: {message}"
    )
    body = {
        "model": model,
        "instructions": instructions,
        "input": user_input,
        "store": False,
        "max_output_tokens": (760 if mode == "deep" else 360) if standalone else (520 if mode == "deep" else 220),
        "text": {"verbosity": "medium" if standalone and mode == "deep" else "low"}
    }
    return message,page,mode,model,ctx,body

@app.get("/api/v32/assistant/context")
def plugy_context_v127(page: str = Query(default="dashboard", max_length=40)):
    page = re.sub(r"[^a-z0-9_-]", "", page.lower()) or "dashboard"
    ctx = _context(5)
    return {"ok": True, "page": page, "suggestion": _page_suggestion(page, ctx), **ctx}

@app.post("/api/v32/plugy")
def plugy_v127(payload: dict = Body(default={})):
    message,page,mode,model,ctx,body = _prepare_plugy(payload)
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "model": "local-radar", "page": page})
        return result
    started = time.time()
    try:
        timeout_cap = 40 if mode == "deep" else 28
        r = OPENAI_SESSION.post(
            OPENAI_RESPONSES,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=body,
            timeout=min(int(os.getenv("PLUGART_OPENAI_TIMEOUT", "32") or 32), timeout_cap)
        )
        elapsed = int((time.time() - started) * 1000)
        if not r.ok:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:240]}")
        answer = _output_text(r.json())
        if not answer:
            raise RuntimeError("réponse vide")
        print(f"PLUGY_V127_OK model={model} mode={mode} elapsed_ms={elapsed} page={page} chars={len(answer)}", flush=True)
        return {"answer": answer, "ai": True, "model": model, "latency_ms": elapsed, "page": page, "items": ctx.get("top_opportunities", [])[:4]}
    except Exception as exc:
        result = core.plugy(core.PlugyMessage(message=message))
        result.update({"ai": False, "fallback": True, "model": "local-radar", "page": page, "ai_error": str(exc)[:240]})
        print(f"PLUGY_V127_FALLBACK {type(exc).__name__}: {str(exc)[:240]}", flush=True)
        return result

@app.post("/api/v125/plugy/stream")
def plugy_stream_v127(payload: dict = Body(default={})):
    message,page,mode,model,ctx,body = _prepare_plugy(payload)
    body["stream"] = True
    body["stream_options"] = {"include_obfuscation": False}
    key = os.getenv("OPENAI_API_KEY", "").strip()

    def sse(event, data):
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, separators=(',', ':'))}\n\n"

    def generate():
        started = time.time()
        first_delta_ms = None
        answer_parts = []
        if not key:
            result = core.plugy(core.PlugyMessage(message=message))
            answer = str(result.get("answer") or result.get("message") or "").strip()
            if answer:
                yield sse("delta", {"delta": answer})
            yield sse("done", {"answer": answer, "ai": False, "model": "local-radar", "page": page, "latency_ms": int((time.time()-started)*1000)})
            return
        try:
            timeout_cap = 40 if mode == "deep" else 28
            with OPENAI_SESSION.post(
                OPENAI_RESPONSES,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "Accept": "text/event-stream"},
                json=body,
                timeout=(8, min(int(os.getenv("PLUGART_OPENAI_TIMEOUT", "32") or 32), timeout_cap)),
                stream=True
            ) as upstream:
                if not upstream.ok:
                    raise RuntimeError(f"HTTP {upstream.status_code}: {upstream.text[:240]}")
                for raw_line in upstream.iter_lines(decode_unicode=True):
                    if not raw_line or not raw_line.startswith("data:"):
                        continue
                    raw = raw_line[5:].strip()
                    if not raw or raw == "[DONE]":
                        continue
                    try:
                        event = json.loads(raw)
                    except Exception:
                        continue
                    etype = event.get("type")
                    if etype == "response.output_text.delta":
                        delta = str(event.get("delta") or "")
                        if not delta:
                            continue
                        if first_delta_ms is None:
                            first_delta_ms = int((time.time()-started)*1000)
                        answer_parts.append(delta)
                        yield sse("delta", {"delta": delta})
                    elif etype == "error":
                        err = event.get("message") or (event.get("error") or {}).get("message") or "Erreur OpenAI"
                        raise RuntimeError(str(err)[:240])
            answer = "".join(answer_parts).strip()
            elapsed = int((time.time()-started)*1000)
            print(f"PLUGY_V127_STREAM_OK model={model} mode={mode} first_delta_ms={first_delta_ms or elapsed} elapsed_ms={elapsed} page={page} chars={len(answer)}", flush=True)
            yield sse("done", {"answer": answer, "ai": True, "model": model, "mode": mode, "page": page, "first_delta_ms": first_delta_ms or elapsed, "latency_ms": elapsed})
        except Exception as exc:
            elapsed = int((time.time()-started)*1000)
            if answer_parts:
                answer = "".join(answer_parts).strip()
                yield sse("done", {"answer": answer, "ai": True, "partial": True, "model": model, "page": page, "latency_ms": elapsed})
                return
            try:
                result = core.plugy(core.PlugyMessage(message=message))
                answer = str(result.get("answer") or result.get("message") or "").strip()
            except Exception:
                answer = "Je n’arrive pas à joindre mon moteur pour le moment."
            print(f"PLUGY_V127_STREAM_FALLBACK {type(exc).__name__}: {str(exc)[:180]}", flush=True)
            if answer:
                yield sse("delta", {"delta": answer})
            yield sse("done", {"answer": answer, "ai": False, "fallback": True, "model": "local-radar", "page": page, "latency_ms": elapsed})

    return StreamingResponse(generate(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive"
    })


TTS_MODEL = os.getenv("PLUGY_TTS_MODEL", "gpt-4o-mini-tts").strip() or "gpt-4o-mini-tts"
TTS_VOICES = {"alloy","ash","ballad","coral","echo","fable","onyx","nova","sage","shimmer","verse","marin","cedar"}

@app.post("/api/v162/plugy/speech")
def plugy_speech_v162(payload: dict = Body(default={})):
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Voix naturelle indisponible")
    text = re.sub(r"\s+", " ", str((payload or {}).get("text") or "")).strip()[:4096]
    if not text:
        raise HTTPException(400, "Texte vocal vide")
    voice = str((payload or {}).get("voice") or "marin").strip().lower()
    if voice not in TTS_VOICES:
        voice = "marin"
    body = {
        "model": TTS_MODEL,
        "input": text,
        "voice": voice,
        "response_format": "mp3",
        "speed": 1.02,
        "instructions": (
            "Parle en français de France avec une voix naturelle, chaleureuse, calme et moderne. "
            "Débit fluide, articulation nette, sans ton publicitaire ni voix robotique. "
            "Marque de petites pauses naturelles aux virgules et fins de phrases. "
            "Le ton doit ressembler à un assistant personnel premium, direct et vivant."
        )
    }
    started = time.time()
    try:
        r = OPENAI_SESSION.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=body,
            timeout=(8, 75)
        )
        if not r.ok:
            try:
                detail = (r.json().get("error") or {}).get("message") or r.text[:220]
            except Exception:
                detail = r.text[:220]
            raise RuntimeError(f"HTTP {r.status_code}: {detail}")
        print(f"PLUGY_V162_TTS_OK voice={voice} model={TTS_MODEL} elapsed_ms={int((time.time()-started)*1000)} chars={len(text)}", flush=True)
        return Response(content=r.content, media_type="audio/mpeg", headers={"Cache-Control":"no-store"})
    except Exception as exc:
        print(f"PLUGY_V162_TTS_ERROR {type(exc).__name__}: {str(exc)[:220]}", flush=True)
        raise HTTPException(502, "Synthèse vocale momentanément indisponible")

IMAGE_MODELS = ("gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2")
DEFAULT_IMAGE_MODEL = os.getenv("PLUGART_IMAGE_MODEL", "").strip()
if DEFAULT_IMAGE_MODEL not in IMAGE_MODELS:
    DEFAULT_IMAGE_MODEL = "gpt-image-2.5-flare"
_db_hint = Path(os.getenv("PLUGART_DB", "/data/plugart.db"))
GENERATED_DIR = Path(os.getenv("PLUGART_GENERATED_DIR", str(_db_hint.parent / "generated-content")))
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

def _clean(v, n=1800):
    return re.sub(r"\s+", " ", str(v or "")).strip()[:n]

def _image_size(ratio):
    ratio = _clean(ratio, 12)
    if ratio == "1:1": return "1024x1024"
    if ratio in {"16:9", "3:2"}: return "1536x1024"
    return "1024x1536"

def _image_prompt(prompt, style):
    styles = {
        "photo":"premium photorealistic editorial photography",
        "gallery":"contemporary cultural campaign art direction, not necessarily a literal gallery interior",
        "portrait":"premium editorial portrait of a contemporary artist",
        "urban":"contemporary urban art and culture scene in Europe",
        "studio":"photorealistic artist studio",
        "architecture":"premium cultural architecture photography",
        "product":"premium art-object still life",
        "editorial":"high-end graphic editorial art direction for a contemporary culture magazine",
        "graphic":"abstract graphic design for an art exhibition campaign, geometric lines, fields, grids, paper, ink and negative space",
        "poster":"museum-grade contemporary exhibition poster background, abstract shapes, bold composition, restrained palette, no literal exhibition photo"
    }
    direction=styles.get(style, styles['editorial'])
    return f"{direction}. {prompt}. High-end PLUG ART social campaign visual. Prioritize composition, rhythm, negative space, graphic lines, geometry, paper or material texture when relevant. The visual must work as a designed marketing post even without any exhibition photograph. No typography, no readable letters, no logos, no watermark, no UI mockup. Clean editorial composition with deliberate space reserved for text added later by the PLUG ART editor."

def _decode_image(data):
    items = (data or {}).get("data") or []
    if not items:
        raise RuntimeError("aucune image retournée")
    item = items[0] or {}
    encoded = item.get("b64_json") or item.get("image_base64") or item.get("b64")
    if encoded:
        return base64.b64decode(encoded), "image/png"
    remote = item.get("url") or item.get("image_url")
    if remote:
        rr = requests.get(remote, timeout=90)
        rr.raise_for_status()
        return rr.content, (rr.headers.get("content-type") or "image/png").split(";")[0]
    raise RuntimeError("format image inattendu")

def _generate_image_provider(key, model, prompt, size, quality):
    body = {"model": model, "prompt": prompt, "size": size, "quality": quality, "n": 1}
    r = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json=body,
        timeout=165
    )
    if not r.ok:
        try:
            detail = (r.json().get("error") or {}).get("message") or r.text[:260]
        except Exception:
            detail = r.text[:260]
        raise RuntimeError(f"{model}: HTTP {r.status_code} — {detail[:260]}")
    return _decode_image(r.json())

@app.get("/api/v32/content/image/status")
def image_status_v127():
    return {"ok": True, "enabled": bool(os.getenv("OPENAI_API_KEY", "").strip()), "provider": "openai", "model": DEFAULT_IMAGE_MODEL, "models": list(IMAGE_MODELS)}

@app.post("/api/v32/content/image")
def image_v127(payload: dict = Body(default={})):
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "OPENAI_API_KEY absente")
    prompt = _clean((payload or {}).get("prompt"))
    if not prompt:
        raise HTTPException(400, "Décris le visuel à générer")
    style = _clean((payload or {}).get("style") or "photo", 30).lower()
    ratio = _clean((payload or {}).get("ratio") or "4:5", 12)
    quality = _clean((payload or {}).get("quality") or "medium", 20).lower()
    if quality not in {"low", "medium", "high", "xhigh", "max", "auto"}:
        quality = "medium"
    size = _image_size(ratio)
    full_prompt = _image_prompt(prompt, style)
    started = time.time()
    errors = []
    candidates = [DEFAULT_IMAGE_MODEL] + [m for m in IMAGE_MODELS if m != DEFAULT_IMAGE_MODEL]
    for model in candidates:
        try:
            raw, content_type = _generate_image_provider(key, model, full_prompt, size, quality)
            ext = ".jpg" if ("jpeg" in content_type or raw[:3] == b"\xff\xd8\xff") else (".webp" if ("webp" in content_type or raw[:4] == b"RIFF") else ".png")
            token = hashlib.sha256((prompt + model + str(time.time_ns())).encode()).hexdigest()[:24]
            name = f"plugartv32_{token}{ext}"
            (GENERATED_DIR / name).write_bytes(raw)
            elapsed = int((time.time() - started) * 1000)
            print(f"PLUG_ART_IMAGE_V127_OK model={model} elapsed_ms={elapsed} bytes={len(raw)} size={size} quality={quality}", flush=True)
            return {"ok": True, "provider": "openai", "model": model, "quality": quality, "size": size, "url": f"/api/v32/content/generated/{name}", "latency_ms": elapsed}
        except Exception as exc:
            errors.append(str(exc)[:300])
    raise HTTPException(502, "Échec génération IA : " + " | ".join(errors)[:650])

@app.get("/api/v32/content/generated/{filename}")
def image_file_v127(filename: str):
    if not re.fullmatch(r"plugartv32_[a-f0-9]{24}\.(png|jpg|webp)", filename):
        raise HTTPException(404, "Fichier introuvable")
    path = GENERATED_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Fichier introuvable")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})

@app.get("/api/v32/status")
def status_v127():
    return {
        "ok": True,
        "version": "127.0-lean",
        "assistant": "/api/v32/plugy",
        "assistant_stream": "/api/v125/plugy/stream",
        "fast_model": FAST_MODEL,
        "deep_model": DEEP_MODEL,
        "image_endpoint": "/api/v32/content/image",
        "image_model": DEFAULT_IMAGE_MODEL,
        "legacy_boot_chain": False
    }

print(f"PLUG_ART_V127_RUNTIME_READY fast_model={FAST_MODEL} image_model={DEFAULT_IMAGE_MODEL} legacy_boot_chain=off", flush=True)
