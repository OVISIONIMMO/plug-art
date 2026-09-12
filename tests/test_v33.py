from pathlib import Path
import json, struct, subprocess
from fastapi.testclient import TestClient

import app_extra_v33 as v33
from build_plugy_head_v33 import build_plugy_head_v33

client=TestClient(v33.app)


def _doc(raw):
    assert raw[:4]==b'glTF'
    _,version,total=struct.unpack_from('<4sII',raw,0)
    assert version==2 and total==len(raw)
    json_len,json_type=struct.unpack_from('<I4s',raw,12)
    assert json_type==b'JSON'
    return json.loads(raw[20:20+json_len].decode().rstrip(' \x00'))


def test_v33_status_and_assets():
    r=client.get('/api/v33/status'); assert r.status_code==200
    d=r.json(); assert d['version']=='33.0'; assert d['dashboard_internal'] is True; assert d['typewriter_stream'] is True
    assert d['plugy_model_bytes']>400000
    assert {'IdleBlink','Curious','React','Think'}<=set(d['plugy_animations'])
    page=client.get('/').text
    assert 'site_v33.css?v=33.20260912.1' in page
    assert 'site_v33.js?v=33.20260912.1' in page
    assert 'site_v32.js' not in page


def test_v33_glb_has_distinct_materials_and_expressive_clips(tmp_path):
    target=tmp_path/'plugy_v33.glb'; info=build_plugy_head_v33(target); raw=target.read_bytes(); doc=_doc(raw)
    assert len(raw)>400000
    assert info['materials']>=5
    mats={m.get('name') for m in doc.get('materials',[])}
    assert 'PLUGY Soft Pearl Lavender' in mats
    assert 'PLUGY Prongs Ice Violet' in mats
    assert 'PLUGY Navy Eyes' in mats
    clips={a.get('name') for a in doc.get('animations',[])}
    assert {'IdleBlink','Curious','React','Think'}<=clips


def test_v33_frontend_is_transparent_dashboard_and_streaming():
    js=Path('static/site_v33.js').read_text(encoding='utf-8')
    css=Path('static/site_v33.css').read_text(encoding='utf-8')
    app=Path('app_extra_v33.py').read_text(encoding='utf-8')
    assert '/api/v33/plugy/stream' in js and 'ReadableStream' not in js
    assert 'reader.read()' in js and 'typing' in js
    assert 'Tableau de bord interne' in js and 'Vue d\'ensemble' in js
    assert 'background:transparent!important' in css
    assert 'camera-orbit="0deg 78deg 4.35m"' in js
    assert "'stream':True" in app


def test_v33_js_syntax():
    r=subprocess.run(['node','--check','static/site_v33.js'],capture_output=True,text=True)
    assert r.returncode==0,r.stderr
