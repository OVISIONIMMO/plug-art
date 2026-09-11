from pathlib import Path
import subprocess

from fastapi.testclient import TestClient

import app_extra_v28 as v28


def test_v28_status_and_initial_profile():
    client = TestClient(v28.app)
    response = client.get('/api/v28/status')
    assert response.status_code == 200
    data = response.json()
    assert data['ok'] is True
    assert data['version'] == '28.0'
    assert data['profile'] == 'head-only-fast-studio'
    assert data['plugy_head_bytes'] > 100_000
    assert data['image_button_always_available'] is True
    assert data['advanced_editor'] == 'lazy-loaded-on-demand'
    assert data['initial_legacy_editor_refs'] == []


def test_v28_index_only_loads_patch_initially():
    page = v28.INDEX.read_text(encoding='utf-8')
    assert 'studio_v28.css?v=28.20260911.1' in page
    assert 'studio_v28_patch.js?v=28.20260911.1' in page
    for legacy in (
        'content_studio_v10.css',
        'content_studio_v10.js',
        'content_studio_v11.css',
        'content_studio_v11.js',
        'studio_pro_v19.css',
        'studio_pro_v19.js',
    ):
        assert legacy not in page


def test_v28_javascript_syntax():
    script = Path('static/studio_v28_patch.js')
    assert script.is_file() and script.stat().st_size > 2000
    result = subprocess.run(['node', '--check', str(script)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_v28_patch_has_image_fallback_and_lazy_editor():
    script = Path('static/studio_v28_patch.js').read_text(encoding='utf-8')
    assert '/api/v26/content/image' in script
    assert '/api/content/visual' in script
    assert 'loadLegacyEditor' in script
    assert 'content_studio_v10.js' in script
    assert 'content_studio_v11.js' in script
