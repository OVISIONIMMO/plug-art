from fastapi.testclient import TestClient
import app_extra_v32 as v32

client = TestClient(v32.app)


def test_v32_status_clean_runtime():
    r = client.get('/api/v32/status')
    assert r.status_code == 200
    d = r.json()
    assert d['version'] == '32.0'
    assert d['plugy_free_roaming'] is True
    assert d['plugy_model_bytes'] > 400000
    assert d['legacy_runtime_refs'] == []
    assert d['image_model'] in {'gpt-image-2.5-flare','gpt-image-2.5-sunburst','gpt-image-2'}


def test_v32_assets_in_index_and_no_legacy_runtime():
    page = client.get('/')
    assert page.status_code == 200
    text = page.text
    assert 'site_v32.css?v=32.20260911.1' in text
    assert 'site_v32.js?v=32.20260911.1' in text
    assert 'studio_v32.js?v=32.20260911.1' in text
    for old in ('site_v24.js','site_v25.js','site_v26.js','site_v29.js','site_v30.js','plugy_ai_v17.js','studio_v30.js'):
        assert old not in text


def test_v32_image_status():
    r = client.get('/api/v32/content/image/status')
    assert r.status_code == 200
    d = r.json()
    assert d['ok'] is True
    assert d['model'] in d['models']
    assert d['fallback'] == '/api/content/visual'
