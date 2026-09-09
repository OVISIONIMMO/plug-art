from fastapi.testclient import TestClient
import app_extra_v15 as v15

client = TestClient(v15.app)


def test_theme_status_v15():
    r = client.get('/api/theme/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '15.0'
    assert data['theme'] == 'maximum-transparent-bubble'
    assert data['page_background'] == 'blurred-translucent-canvas'
    assert data['transparent_panels'] is True
    assert data['maximum_transparency'] is True
    assert data['large_opaque_surfaces'] is False
    assert 'glass_v15.css?v=15.20260909.1' in data['asset']


def test_v15_glass_asset_is_served():
    r = client.get('/static/glass_v15.css')
    assert r.status_code == 200
    css = r.text
    assert '--v15-glass' in css
    assert 'body:before' in css
    assert 'filter:blur(22px)' in css
    assert 'backdrop-filter:blur(34px)' in css
    assert '.header' in css
    assert '#detailModal' in css


def test_index_has_only_v15_glass_stylesheet():
    r = client.get('/')
    assert r.status_code == 200
    html = r.text
    assert 'glass_v15.css?v=15.20260909.1' in html
    assert 'glass_v14.css' not in html
    assert 'glass_v13.css' not in html
    assert 'glass_v12.css' not in html
