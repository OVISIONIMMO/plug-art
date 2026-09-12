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
    # Le profil final peut remplacer le boot V29 par un runtime head-only plus récent.
    page = v29.INDEX.read_text(encoding='utf-8')
    assert data['legacy_full_body_boot_disabled'] is True or any(x in page for x in ('window.__PLUG_V32=true','window.__PLUG_V33=true'))
    assert data['photo_overlay_guard'] is True
    assert data['single_model_guard'] is True


def test_v29_assets_and_final_page_guards():
    css_text = Path('static/site_v29.css').read_text(encoding='utf-8')
    js_text = Path('static/site_v29.js').read_text(encoding='utf-8')
    page = client.get('/')
    assert page.status_code == 200
    assert 'v29-plugy-id' in js_text
    assert "$$('model-viewer',host)" in js_text
    assert 'plugy-v29' in css_text
    assert any(x in page.text for x in (
        'site_v29.js?v=29.20260911.1',
        'site_v30.js?v=30.20260911.1',
        'site_v32.js?v=32.20260911.1',
        'site_v33.js?v=33.20260912.1',
    ))
    assert any(x in page.text for x in ('window.__PLUG_V26=true','window.__PLUG_V30=true','window.__PLUG_V32=true','window.__PLUG_V33=true'))
