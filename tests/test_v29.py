from pathlib import Path
from fastapi.testclient import TestClient

import app_extra_v29 as v29

client = TestClient(v29.app)


def test_v29_status_and_head_only_profile():
    r = client.get('/api/v29/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '29.0'
    assert data['plugy_head'] == '/static/plugy_head_v26.glb'
    assert data['legacy_full_body_boot_disabled'] is True
    assert data['photo_overlay_guard'] is True
    assert data['single_model_guard'] is True


def test_v29_assets_and_final_page_guards():
    # Les assets V29 restent vérifiés, mais le profil final V30 peut les
    # remplacer dans index.html quand toute la suite est importée.
    css_text = Path('static/site_v29.css').read_text(encoding='utf-8')
    js_text = Path('static/site_v29.js').read_text(encoding='utf-8')
    page = client.get('/')
    assert page.status_code == 200
    assert 'v29-plugy-id' in js_text
    assert "$$('model-viewer',host)" in js_text
    assert 'plugy-v29' in css_text
    assert ('site_v29.js?v=29.20260911.1' in page.text) or ('site_v30.js?v=30.20260911.1' in page.text)
    assert ('window.__PLUG_V26=true' in page.text) or ('window.__PLUG_V30=true' in page.text)
