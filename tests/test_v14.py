from fastapi.testclient import TestClient
import app_extra_v14 as v14

client = TestClient(v14.app)


def test_theme_status_v14():
    r = client.get('/api/theme/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '14.0'
    assert data['theme'] == 'transparent-bubble'
    assert data['transparent_panels'] is True
    assert data['large_opaque_surfaces'] is False
    assert data['bubble_cards'] is True
    assert 'glass_v14.css?v=14.20260909.2' in data['asset']


def test_v14_glass_asset_is_served():
    r = client.get('/static/glass_v14.css')
    assert r.status_code == 200
    css = r.text
    assert '--v14-bubble' in css
    assert 'background:transparent !important' in css
    assert 'backdrop-filter:blur' in css
    assert '.header' in css
    assert '.cat' in css
    assert '.thumb' in css


def test_index_has_only_v14_glass_stylesheet():
    r = client.get('/')
    assert r.status_code == 200
    html = r.text
    assert 'glass_v14.css?v=14.20260909.2' in html
    assert 'glass_v13.css' not in html
    assert 'glass_v12.css' not in html
