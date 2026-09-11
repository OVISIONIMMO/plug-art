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


def test_v29_assets_and_page_guards():
    page = client.get('/')
    css = client.get('/static/site_v29.css')
    js = client.get('/static/site_v29.js')
    assert page.status_code == 200
    assert css.status_code == 200
    assert js.status_code == 200
    assert 'site_v29.css?v=29.20260911.1' in page.text
    assert 'site_v29.js?v=29.20260911.1' in page.text
    assert 'window.__PLUG_V26=true' in page.text
    assert 'v29-plugy-id' in js.text
    assert "$$('model-viewer',host)" in js.text
    assert 'plugy-v29' in css.text
