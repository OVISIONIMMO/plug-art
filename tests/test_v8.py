from fastapi.testclient import TestClient
import app_extra as v8

client = TestClient(v8.app)

def first_opportunity():
    items = client.get('/api/opportunities').json()
    assert items
    return items[0]

def test_v8_routes_are_registered():
    paths = {r.path for r in v8.app.routes}
    for path in [
        '/api/opportunities/{oid}/details',
        '/api/opportunities/{oid}/thumbnail',
        '/api/exhibitions/{eid}/details',
        '/api/map/enhanced',
        '/api/source-previews/status',
    ]:
        assert path in paths

def test_enhanced_map_contract():
    r = client.get('/api/map/enhanced')
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert {'lat','lon','kind','title'} <= set(data[0])

def test_opportunity_details_with_cached_preview(monkeypatch):
    item = first_opportunity()
    monkeypatch.setattr(v8, '_extract_preview', lambda *a, **k: {
        'description':'Description source test',
        'image_url':'https://example.com/image.jpg',
        'canonical_url':'https://example.com/canonical',
        'status':'online',
        'fetched_at':'2026-09-09T12:00:00',
    })
    r = client.get(f"/api/opportunities/{item['id']}/details")
    assert r.status_code == 200
    data = r.json()
    assert data['detail_summary'] == 'Description source test'
    assert data['thumbnail_url'] == 'https://example.com/image.jpg'

def test_thumbnail_fallback_svg(monkeypatch):
    item = first_opportunity()
    monkeypatch.setattr(v8, '_extract_preview', lambda *a, **k: {'image_url':'','status':'online'})
    r = client.get(f"/api/opportunities/{item['id']}/thumbnail", follow_redirects=False)
    assert r.status_code == 200
    assert r.headers['content-type'].startswith('image/svg+xml')
    assert b'PLUG ART' in r.content
