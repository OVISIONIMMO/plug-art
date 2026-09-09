import base64
from fastapi.testclient import TestClient
import app_extra_v11 as v11

client = TestClient(v11.app)


def test_v11_routes_are_registered():
    paths = {r.path for r in v11.app.routes}
    for path in [
        '/api/content/image/status',
        '/api/content/image',
        '/api/content/generated/{filename}',
        '/api/content/visual',
    ]:
        assert path in paths


def test_image_status_without_key(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    r = client.get('/api/content/image/status')
    assert r.status_code == 200
    data = r.json()
    assert data['enabled'] is False
    assert data['provider'] == 'local-fallback'
    assert 'gpt-image-2.5-sunburst' in data['models']


def test_image_generation_requires_server_key(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    r = client.post('/api/content/image', json={'prompt': 'galerie contemporaine', 'ratio': '4:5'})
    assert r.status_code == 503
    assert 'OPENAI_API_KEY' in r.json()['detail']


def test_image_generation_mocked_provider(monkeypatch, tmp_path):
    monkeypatch.setenv('OPENAI_API_KEY', 'test-key')
    monkeypatch.setattr(v11, 'GENERATED_DIR', tmp_path)
    png = b'\x89PNG\r\n\x1a\nPLUGARTTEST'

    class FakeResponse:
        ok = True
        status_code = 200
        text = ''
        def json(self):
            return {'data': [{'b64_json': base64.b64encode(png).decode()}]}

    captured = {}
    def fake_post(url, headers=None, json=None, timeout=None):
        captured['url'] = url
        captured['json'] = json
        assert headers['Authorization'] == 'Bearer test-key'
        return FakeResponse()

    monkeypatch.setattr(v11.requests, 'post', fake_post)
    r = client.post('/api/content/image', json={
        'prompt': 'galerie contemporaine à Paris',
        'style': 'gallery',
        'ratio': '4:5',
        'quality': 'medium',
        'model': 'gpt-image-2.5-sunburst',
    })
    assert r.status_code == 200
    data = r.json()
    assert data['ok'] is True
    assert data['provider'] == 'openai'
    assert data['size'] == '1024x1536'
    assert captured['url'].endswith('/v1/images/generations')
    assert captured['json']['model'] == 'gpt-image-2.5-sunburst'
    assert 'No typography' in captured['json']['prompt']

    file_r = client.get(data['url'])
    assert file_r.status_code == 200
    assert file_r.content == png
