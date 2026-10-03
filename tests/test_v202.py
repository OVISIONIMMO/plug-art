"""Current production entry point, tested in its own process/database."""
import asyncio
import base64
import io
import os
import sqlite3
from types import SimpleNamespace
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('PLUGART_AUTORADAR','0')
os.environ.setdefault('PLUGART_EVENT_AUTORADAR','0')
os.environ.setdefault('PLUGART_GENERATED_DIR','/tmp/plugart-v202-test-generated')
import httpx
import pytest
from PIL import Image
from fastapi.testclient import TestClient
import app_extra_v60 as current

client=TestClient(current.app)

def png_bytes():
    out=io.BytesIO();Image.new('RGB',(200,250),'#786fff').save(out,'PNG');return out.getvalue()

def test_current_assets_and_endpoint_manifest():
    with TestClient(current.app) as session:
        root=session.get('/')
        assert root.status_code==200
        assert '202.20261003.4' in root.text
        assert '<script defer src="/static/plugart_v162.js' not in root.text
        health=session.get('/api/health').json()
        assert health['ok'] and health['version']=='202.0'
        smoke=session.get('/api/v202/smoke').json()
        assert smoke['ok'] and smoke['browser_runtime_validated'] is False
        for asset in smoke['checks']['v202_assets']['files']:
            served=session.get('/static/'+asset['file'])
            assert served.status_code==200 and served.content== (current.BASE/'static'/asset['file']).read_bytes()

def test_event_counter_matches_database_smoke():
    boot=client.get('/api/v124/dashboard-bootstrap').json()
    smoke=client.get('/api/v172/smoke').json()
    assert boot['stats']['events']==smoke['checks']['radar']['future_events']

def test_upload_decodes_and_draft_roundtrip_preserves_campaign():
    uploaded=client.post('/api/v202/content/upload',json={'data':'data:image/png;base64,'+base64.b64encode(png_bytes()).decode()}).json()
    assert uploaded['ok']
    response=client.get(uploaded['url'])
    Image.open(io.BytesIO(response.content)).verify()
    assert 'immutable' in response.headers['cache-control']
    snap={'kind':'carousel','title':'Régression V202','payload':{'editor':'v202','facts':{'name':'Test','brief':'À conserver'},'slides':[{'title':'Première','body':'Texte édité'}],'visuals':[uploaded['url']],'format':'4:5','instagram_caption':'Légende'}}
    draft=client.post('/api/v108/drafts',json=snap).json()
    snap['payload']['slides'][0]['title']='Après modification'
    patched=client.patch('/api/v108/drafts/'+str(draft['id']),json=snap).json()
    loaded=next(x for x in client.get('/api/v108/drafts').json() if x['id']==draft['id'])
    assert loaded['payload']==patched['payload']==snap['payload']
    assert client.delete('/api/v108/drafts/'+str(draft['id'])).status_code==200

def test_oversized_draft_is_rejected_without_corrupting_saved_json():
    assert client.post('/api/v108/drafts',json={'payload':{'brief':'a'*500001}}).status_code==413
    assert client.post('/api/v202/content/upload',json={'data':'data:image/png;base64,aW52YWxpZA=='}).status_code==422

def test_image_missing_configuration_is_explicit_and_fallback_decodes(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    response=client.post('/api/v179/content/image',json={'prompt':'Exposition test'}).json()
    assert response['fallback'] and response['model']=='local-svg-fallback'
    assert client.get(response['url']).headers['content-type'].startswith('image/svg+xml')
    assert client.post('/api/v179/content/image',json={'prompt':''}).status_code==422

def test_timeout_cancels_the_upstream_task_and_returns_fallback(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','test-only')
    monkeypatch.setattr(current,'IMAGE_DEADLINE_SECONDS',.025)
    cancelled=[]
    async def slow(payload,key):
        try:await asyncio.sleep(10)
        finally:cancelled.append(True)
    monkeypatch.setattr(current,'_image_request_v202',slow)
    result=client.post('/api/v179/content/image',json={'prompt':'Test timeout'}).json()
    assert result['fallback'] and 'global' in result['fallback_reason']
    assert cancelled==[True]

def test_image_does_not_retry_quota_or_auth_errors(monkeypatch):
    calls=[]
    class FakeClient:
        def __init__(self,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def post(self,*args,**kwargs):
            calls.append(kwargs['json']['model']);return httpx.Response(429,json={'error':{'message':'Quota'}})
    monkeypatch.setattr(current.httpx,'AsyncClient',FakeClient)
    monkeypatch.setenv('OPENAI_API_KEY','test-only')
    result=client.post('/api/v179/content/image',json={'prompt':'Test quota'}).json()
    assert result['fallback'] and len(calls)==1

def test_generated_image_is_validated_and_saved(monkeypatch):
    class FakeClient:
        def __init__(self,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def post(self,*args,**kwargs):return httpx.Response(200,json={'data':[{'b64_json':base64.b64encode(png_bytes()).decode()}]})
    monkeypatch.setattr(current.httpx,'AsyncClient',FakeClient)
    monkeypatch.setenv('OPENAI_API_KEY','test-only')
    result=client.post('/api/v179/content/image',json={'prompt':'Test image'}).json()
    assert not result['fallback']
    fetched=client.get(result['url'])
    assert fetched.headers['content-type'].startswith('image/webp')
    Image.open(io.BytesIO(fetched.content)).verify()

def test_retained_media_bytes_have_a_budget():
    cache=current.v59.MediaByteCache(100,8)
    cache['a']=(0,b'a'*80,'image/png');cache['b']=(0,b'b'*80,'image/png')
    assert cache.bytes_used<=100 and 'a' not in cache
    cache['oversized']=(0,b'x'*150,'image/png')
    assert cache.bytes_used<=100

def test_ndjson_bypasses_gzip_buffering(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    monkeypatch.setattr(current,'_local_answer',lambda _: 'Texte de secours '*100)
    response=client.post('/api/v179/plugy/stream',json={'message':'Test flux'},headers={'accept-encoding':'gzip'})
    assert 'content-encoding' not in response.headers
    assert '"fallback": true' in response.text

@pytest.mark.parametrize('scan',['discover','verify'])
def test_radar_releases_database_writer_during_network_requests(monkeypatch,tmp_path,scan):
    core=current.v59.core
    isolated=tmp_path/'radar.db'
    source=core.conn()
    with sqlite3.connect(isolated) as target:source.backup(target)
    source.close()
    monkeypatch.setattr(core,'DB',isolated)
    with core.conn() as db:
        db.execute('delete from radar_sources')
        db.execute('delete from radar_candidates')
        db.execute('delete from opportunities')
        for i in range(2):
            db.execute('insert into radar_sources(name,url,reliability,enabled) values(?,?,80,1)',('Fixture',f'https://example.test/source/{i}'))
            db.execute("insert into opportunities(title,source_url,status,summary,fee) values(?,?,'open','Exposition collective pour artistes émergents','Gratuit')",('Open Call fixture',f'https://example.test/exhibition/{i}'))
    checks=[]
    def writable():
        with sqlite3.connect(isolated,timeout=.05) as writer:
            writer.execute('begin immediate')
            writer.rollback()
        checks.append(True)
    def fetch(url,*args):
        writable()
        return SimpleNamespace(ok=True,text=f'<a href="{url}/open-call-artists">Open Call artists exhibition</a>')
    def detail(url,label):
        writable()
        return {'title':label,'deadline':None,'city':'Paris','country':'France','fee':'Gratuit','summary':'Collective exhibition for emerging artists','raw_excerpt':'Painting exhibition','confidence':90}
    monkeypatch.setattr(core,'fetch_page',fetch)
    monkeypatch.setattr(core,'extract_detail',detail)
    result=core.discover_sources() if scan=='discover' else core.verify_existing()
    assert len(checks)>=2
    assert result['errors']==0
