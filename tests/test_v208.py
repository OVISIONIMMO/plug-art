"""V208 studio integration smoke tests. No API calls to external model providers."""
import base64
import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('PLUGART_GENERATED_DIR','/tmp/plugart-v208-test-generated')
import io
from PIL import Image
from fastapi.testclient import TestClient
import app_extra_v60 as current

client = TestClient(current.app)

def test_studio_projects_persist_and_roundtrip():
    payload = {"editor": "v208", "slides": [{"id": "slide-1", "template": "flyer", "blocks": [{"type": "text", "text": "Test Plug Art"}]}], "colors": {"primary": "#174cf6"}}
    created = client.post("/api/v208/studio/projects", json={"title": "Affiche test", "payload": payload})
    assert created.status_code == 200, created.text
    sid = created.json()["id"]
    loaded = client.get(f"/api/v208/studio/projects/{sid}")
    assert loaded.status_code == 200
    assert loaded.json()["project"]["payload"] == payload
    new = {"title": "Affiche modifiée", "payload": {**payload, "caption": "Lien officiel à vérifier"}}
    saved = client.put(f"/api/v208/studio/projects/{sid}", json=new)
    assert saved.status_code == 200
    assert client.get(f"/api/v208/studio/projects/{sid}").json()["project"]["payload"]["caption"] == "Lien officiel à vérifier"
    listing = client.get("/api/v208/studio/projects").json()
    assert any(x["id"] == sid for x in listing["items"])
    assert client.delete(f"/api/v208/studio/projects/{sid}").json()["ok"] is True
    assert client.get(f"/api/v208/studio/projects/{sid}").status_code == 404

def test_studio_validation_and_safe_flyer_sources(monkeypatch):
    too_many = [{"id": str(x)} for x in range(13)]
    assert client.post("/api/v208/studio/projects", json={"title": "x", "payload": {"slides": too_many}}).status_code == 422
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    wrong = client.post("/api/v208/studio/extract", json={"url": "http://127.0.0.1:8000/admin"})
    assert wrong.status_code == 422

def test_pdf_export_has_valid_header_and_multiple_pages():
    img = Image.new("RGB", (360, 450), "#f4efe6")
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    data = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    response = client.post("/api/v208/studio/export/pdf", json={"pages": [data, data]})
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF-")
    assert response.content.count(b"/Type /Page") >= 2
    assert client.post("/api/v208/studio/export/pdf", json={"pages": []}).status_code == 422

def test_studio_files_and_pages_are_mounted():
    html = client.get("/").text
    assert "/static/plugart_v208_studio.js?v=208.20261022.1" in html
    assert "/static/plugart_v208_studio.css?v=208.20261022.1" in html
    assert client.get("/api/v202/smoke").json()["checks"]["v202_assets"]["ok"]
