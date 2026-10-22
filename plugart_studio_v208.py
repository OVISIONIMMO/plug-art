"""PLUG ART V208 editorial studio persistence and opt-in official-flyer analysis.

The module is additive: it does not alter the legacy Campaign Builder's SQLite schema.
Official image bytes remain under the existing durable generated-content directory.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests
from fastapi import APIRouter, Body, HTTPException

router = APIRouter()
_DATA_DIR: Path | None = None

def _path() -> Path:
    if _DATA_DIR is None:
        raise RuntimeError("Studio V208 storage is not configured")
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    return _DATA_DIR / "studio-v208.sqlite3"

def _db():
    conn = sqlite3.connect(str(_path()), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=10000")
    conn.execute("CREATE TABLE IF NOT EXISTS studio_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)")
    return conn

def _stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def _input(value: Any):
    if not isinstance(value, dict):
        raise HTTPException(422, "Projet JSON attendu")
    title = str(value.get("title") or "Publication PLUG ART").strip()[:160]
    payload = value.get("payload")
    if not isinstance(payload, dict):
        raise HTTPException(422, "Structure de projet manquante")
    slides = payload.get("slides")
    if not isinstance(slides, list) or len(slides) > 12:
        raise HTTPException(422, "Maximum 12 slides")
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(raw) > 300_000:
        raise HTTPException(413, "Projet trop volumineux")
    return title, raw

@router.get("/api/v208/studio/projects")
def list_studio_projects():
    with _db() as db:
        rows = db.execute("SELECT id,title,created_at,updated_at FROM studio_projects ORDER BY updated_at DESC LIMIT 70").fetchall()
        return {"ok": True, "items": [dict(row) for row in rows]}

@router.post("/api/v208/studio/projects")
def create_studio_project(body: dict = Body(default={})):
    title, raw = _input(body)
    now = _stamp()
    with _db() as db:
        cursor = db.execute("INSERT INTO studio_projects (title,payload,created_at,updated_at) VALUES (?,?,?,?)", (title, raw, now, now))
        db.commit()
        return {"ok": True, "id": cursor.lastrowid, "updated_at": now}

@router.get("/api/v208/studio/projects/{project_id}")
def get_studio_project(project_id: int):
    with _db() as db:
        row = db.execute("SELECT * FROM studio_projects WHERE id=?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Projet introuvable")
        doc = dict(row)
        doc["payload"] = json.loads(doc["payload"])
        return {"ok": True, "project": doc}

@router.put("/api/v208/studio/projects/{project_id}")
def update_studio_project(project_id: int, body: dict = Body(default={})):
    title, raw = _input(body)
    now = _stamp()
    with _db() as db:
        cursor = db.execute("UPDATE studio_projects SET title=?,payload=?,updated_at=? WHERE id=?", (title, raw, now, project_id))
        if not cursor.rowcount:
            raise HTTPException(404, "Projet introuvable")
        db.commit()
        return {"ok": True, "id": project_id, "updated_at": now}

@router.delete("/api/v208/studio/projects/{project_id}")
def delete_studio_project(project_id: int):
    with _db() as db:
        db.execute("DELETE FROM studio_projects WHERE id=?", (project_id,))
        db.commit()
    return {"ok": True}

def _response_text(result: dict) -> str:
    parts = []
    for item in result.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                parts.append(content.get("text", ""))
    return "".join(parts).strip()

def _json_object(raw: str):
    raw = str(raw).strip()
    if raw.startswith("```"):
        raw = re.sub(r"^\x60\x60\x60(?:json)?", "", raw).strip()
        raw = re.sub(r"\x60\x60\x60$", "", raw).strip()
    try:
        return json.loads(raw)
    except ValueError:
        start, end = raw.find("{"), raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start:end + 1])
        raise

@router.post("/api/v208/studio/extract")
def extract_official_flyer(body: dict = Body(default={})):
    """Opt-in image reading. Only previously uploaded local images are accepted."""
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Analyse IA non configurée")
    url = str(body.get("url") or "")
    prefix = "/api/v179/generated/"
    if not url.startswith(prefix):
        raise HTTPException(422, "Importe d'abord le flyer via le Studio")
    name = url.removeprefix(prefix)
    if not re.fullmatch(r"upload_[a-f0-9]{24}\.webp", name):
        raise HTTPException(422, "Source non autorisée")
    path = (_DATA_DIR / name) if _DATA_DIR else Path("/not-found")
    if not path.is_file() or path.stat().st_size > 5_000_000:
        raise HTTPException(404, "Flyer indisponible")
    data = "data:image/webp;base64," + base64.b64encode(path.read_bytes()).decode()
    prompt = (
        "Lis ce flyer officiel et retourne UNIQUEMENT un objet JSON ayant les clés "
        "title, venue, city, country, deadline, event_dates, fee, disciplines, "
        "eligibility, application_url, description. Chaque valeur est une chaîne. "
        "Utilise le français. Ne devine rien : écris une chaîne vide si l'information "
        "ne figure pas de manière lisible. Ne transforme pas une date d'exposition "
        "en date de candidature."
    )
    payload = {
        "model": os.getenv("PLUGART_V208_VISION_MODEL", "gpt-4.1-mini"),
        "store": False,
        "input": [{"role": "user", "content": [
            {"type": "input_text", "text": prompt},
            {"type": "input_image", "image_url": data}]}],
        "max_output_tokens": 1000
    }
    try:
        r = requests.post(
            "https://api.openai.com/v1/responses",
            json=payload,
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
            timeout=(8, 40),
        )
        if not r.ok:
            raise HTTPException(502, "Analyse du flyer indisponible")
        parsed = _json_object(_response_text(r.json()))
        keys = ("title", "venue", "city", "country", "deadline", "event_dates", "fee", "disciplines", "eligibility", "application_url", "description")
        return {"ok": True, "facts": {key: str(parsed.get(key) or "")[:1600] for key in keys}, "requires_review": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(502, "Impossible de lire ce flyer automatiquement")

@router.post("/api/v208/studio/copy")
def create_editorial_copy(body: dict = Body(default={})):
    """Grounded optional copy suggestion; design/layout generation remains local."""
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "Rédaction IA non configurée")
    brief = body.get("facts") or {}
    if not isinstance(brief, dict):
        raise HTTPException(422, "Brief invalide")
    n = min(7, max(1, int(body.get("count") or 5)))
    sanitized = {str(k)[:40]: str(v)[:900] for k, v in list(brief.items())[:18]}
    prompt = ("Agis comme un directeur éditorial pour PLUG ART, média de veille "
        "artistique. Crée " + str(n) + " slides Instagram en français, titres courts et "
        "précis, pour artistes émergents. Utilise exclusivement les faits vérifiés "
        "de ce JSON, n'invente jamais lieu, deadline, prix ou avantage. "
        "Structure: couverture, visuel officiel, informations, conditions, CTA "
        "(adapte au nombre). Retourne un objet JSON strict "
        '{"slides":[{"kicker":"","title":"","body":""}],"caption":""}. '
        "Si les données ne permettent pas un détail, invite à vérifier la source. "
        "Voici les faits: " + json.dumps(sanitized, ensure_ascii=False))
    payload = {
        "model": os.getenv("PLUGART_V208_COPY_MODEL", "gpt-4.1-mini"),
        "store": False,
        "input": prompt,
        "max_output_tokens": 1900
    }
    try:
        r = requests.post(
            "https://api.openai.com/v1/responses",
            json=payload,
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
            timeout=(8, 40),
        )
        if not r.ok:
            raise HTTPException(502, "Rédaction IA momentanément indisponible")
        obj = _json_object(_response_text(r.json()))
        slides = obj.get("slides") or []
        if not isinstance(slides, list) or not slides:
            raise ValueError("Slides missing")
        slides = [{"kicker":str(s.get("kicker") or "")[:90],
                   "title":str(s.get("title") or "")[:220],
                   "body":str(s.get("body") or "")[:700]}
                  for s in slides[:n] if isinstance(s, dict)]
        return {"ok": True, "slides": slides, "caption": str(obj.get("caption") or "")[:3500], "requires_review": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(502, "Impossible de produire le texte")

def install(app, generated_dir):
    global _DATA_DIR
    _DATA_DIR = Path(generated_dir)
    app.include_router(router)
