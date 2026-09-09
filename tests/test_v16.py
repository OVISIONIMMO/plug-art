from fastapi.testclient import TestClient
from pathlib import Path
import app_extra_v16 as v16

client = TestClient(v16.app)


def test_v16_status():
    r = client.get('/api/v16/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '16.0'
    assert data['visual'] == 'refined-transparent-glass'
    assert data['contrast'] == 'enhanced'
    assert data['thumbnail_proxy'] is True
    assert data['thumbnail_disk_cache'] is True
    assert 'visual_v16.css?v=16.20260909.1' in data['css']
    assert 'thumbnail_v16.js?v=16.20260909.1' in data['js']


def test_v16_assets_are_served():
    css = client.get('/static/visual_v16.css')
    js = client.get('/static/thumbnail_v16.js')
    assert css.status_code == 200
    assert js.status_code == 200
    assert '--v16-text' in css.text
    assert '.detail-dialog' in css.text
    assert '.thumb-placeholder-v16' in css.text
    assert 'resolveThumb = function' in js.text
    assert 'thumbHTML = function' in js.text


def test_v16_thumbnail_cache_location_is_available():
    assert isinstance(v16.THUMB_CACHE_DIR, Path)
    assert v16.THUMB_CACHE_DIR.exists()


def test_index_loads_v16_overlay_and_thumbnail_runtime():
    r = client.get('/')
    assert r.status_code == 200
    assert 'visual_v16.css?v=16.20260909.1' in r.text
    assert 'thumbnail_v16.js?v=16.20260909.1' in r.text
