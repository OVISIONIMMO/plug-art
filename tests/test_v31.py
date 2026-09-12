from fastapi.testclient import TestClient
import app_extra_v31 as v31

client = TestClient(v31.app)

def test_v31_status():
    r = client.get('/api/v31/status')
    assert r.status_code == 200
    d = r.json()
    assert d['version'] == '31.0'
    assert d['free_roaming'] is True
    assert d['legacy_api_accelerated'] is True
    assert d['fast_model'] == 'gpt-5.6-luna'
    assert d['image_model'] == 'gpt-image-2'


def test_v30_assets_replace_legacy_plugy_runtimes():
    page = client.get('/').text
    assert 'site_v30.css?v=30.20260911.1' in page
    assert any(x in page for x in ('site_v30.js?v=30.20260911.1','site_v32.js?v=32.20260911.1','site_v33.js?v=33.20260912.1'))
    assert ('studio_v30.js?v=30.20260911.1' in page) or ('studio_v32.js?v=32.20260911.1' in page)
    assert 'site_v25.js?v=25.20260910.1' not in page
    assert 'site_v26.js?v=26.20260910.1' not in page
    assert 'site_v29.js?v=29.20260911.1' not in page
    assert 'plugy_ai_v17.js?v=17.20260909.1' not in page
    assert 'studio_v28_patch.js?v=28.20260911.1' not in page
    assert any(x in page for x in ('window.__PLUG_V30=true','window.__PLUG_V32=true','window.__PLUG_V33=true'))


def test_v30_image_status_and_head_asset():
    s = client.get('/api/v30/content/image/status')
    assert s.status_code == 200
    data = s.json()
    assert data['model'] == 'gpt-image-2'
    assert 'gpt-image-1.5' in data['models']
    head = client.get('/static/plugy_head_v26.glb')
    assert head.status_code == 200
    assert head.content[:4] == b'glTF'
    assert len(head.content) > 400_000
