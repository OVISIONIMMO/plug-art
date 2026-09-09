from fastapi.testclient import TestClient
import app_extra_v12 as v12

client = TestClient(v12.app)


def test_theme_status():
    r = client.get('/api/theme/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '12.0'
    assert data['theme'] == 'glass-bubble'
    assert data['transparent_panels'] is True
    assert data['bubble_cards'] is True


def test_glass_asset_is_served():
    r = client.get('/static/glass_v12.css')
    assert r.status_code == 200
    css = r.text
    assert '--glass-bg' in css
    assert 'backdrop-filter:blur' in css
    assert '.cat' in css
    assert '.thumb' in css


def test_index_has_v12_stylesheet():
    r = client.get('/')
    assert r.status_code == 200
    assert 'glass_v12.css?v=12' in r.text
