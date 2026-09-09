import os
from pathlib import Path

TEST_DB='/tmp/plugart_test.db'
os.environ['PLUGART_DB']=TEST_DB
os.environ['PLUGART_AUTORADAR']='0'
try: Path(TEST_DB).unlink()
except FileNotFoundError: pass

from fastapi.testclient import TestClient
import app as plugart

client=TestClient(plugart.app)

def test_health_and_persistence_path_override():
    r=client.get('/api/health')
    assert r.status_code==200
    data=r.json()
    assert data['ok'] is True
    assert data['version']=='7.0'
    assert data['database']==TEST_DB

def test_stats_shape():
    data=client.get('/api/stats').json()
    for key in ['opportunities','urgent','artists','exhibitions','favorites','candidates']:
        assert key in data
        assert isinstance(data[key],int)

def test_active_opportunities_are_ranked_and_not_expired():
    r=client.get('/api/opportunities')
    assert r.status_code==200
    items=r.json()
    assert items
    scores=[x.get('radar_score') or x.get('score') or 0 for x in items]
    assert scores==sorted(scores,reverse=True)
    assert all(x['status'] in ('open','rolling') for x in items)

def test_patch_favorite_roundtrip():
    item=client.get('/api/opportunities').json()[0]
    original=int(item.get('favorite') or 0)
    changed=0 if original else 1
    r=client.patch(f"/api/opportunities/{item['id']}",json={'favorite':changed})
    assert r.status_code==200 and r.json()['favorite']==changed
    r=client.patch(f"/api/opportunities/{item['id']}",json={'favorite':original})
    assert r.status_code==200 and r.json()['favorite']==original

def test_radar_status_contract():
    r=client.get('/api/radar/status')
    assert r.status_code==200
    data=r.json()
    for key in ['last_run','runs','sources','candidate_counts','top']:
        assert key in data
    assert len(data['sources'])>=2

def test_deadline_parser():
    assert plugart.parse_deadline('Deadline: 27/09/2026')=='2026-09-27'
    assert plugart.parse_deadline('Deadline 30 September 2026')=='2026-09-30'
    assert plugart.parse_deadline('Clôture 13 septembre 2026')=='2026-09-13'

def test_candidate_fingerprint_stable():
    a=plugart.candidate_fingerprint('https://example.com/a','Open Call Artist')
    b=plugart.candidate_fingerprint('https://example.com/a','Open Call Artist')
    assert a==b and len(a)==64

def test_candidate_endpoints():
    r=client.get('/api/radar/candidates')
    assert r.status_code==200
    assert isinstance(r.json(),list)

def test_plugy():
    r=client.post('/api/plugy',json={'message':'meilleures opportunités'})
    assert r.status_code==200
    data=r.json()
    assert 'answer' in data and 'items' in data
