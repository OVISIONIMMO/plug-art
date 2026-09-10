from fastapi.testclient import TestClient
import hashlib

import app_extra_v22 as v22

client = TestClient(v22.app)


def test_v22_status_and_rigready_model():
    r = client.get('/api/v22/status')
    assert r.status_code == 200
    data = r.json()
    assert data['version'] == '22.0'
    assert data['studio'] == 'single-screen-creator'
    assert data['plugy_3d'] is True
    assert data['plugy_rig_ready'] is True
    assert data['plugy_model_bytes'] == 414024
    assert data['plugy_model_sha256'] == '834a9621418173173d391c33dc1c5785138a05fcacf43606f0a358a428be9a37'
    assert data['rebuild_source'] == 'v21-exact-glb'
    assert data['animation'] == 'Idle'
    assert data['rig_nodes'] == ['Rig_Torso', 'Rig_Head', 'Rig_Arm_L', 'Rig_Arm_R', 'Rig_Leg_L', 'Rig_Leg_R']


def test_v22_model_is_exact_glb():
    raw = v22.GLB.read_bytes()
    assert raw[:4] == b'glTF'
    assert len(raw) == 414024
    assert hashlib.sha256(raw).hexdigest() == v22.MODEL_SHA256


def test_v22_assets_and_index():
    css = client.get('/static/studio_v22.css')
    js = client.get('/static/studio_v22.js')
    page = client.get('/')
    assert css.status_code == 200
    assert js.status_code == 200
    assert page.status_code == 200
    assert 'studio_v22.css?v=22.20260910.1' in page.text
    assert 'studio_v22.js?v=22.20260910.1' in page.text
    assert 'plug-v22' in css.text
    assert 'Créer une publication' in js.text
