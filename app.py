from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import date, datetime
from urllib.parse import urlparse
import sqlite3, json, requests, re, hashlib

BASE=Path(__file__).resolve().parent
DB=BASE/'data'/'plugart.db'
SEED=BASE/'data'/'seed.json'
app=FastAPI(title='PLUG ART Tool',version='6.0')

def conn():
    c=sqlite3.connect(DB,timeout=20);c.row_factory=sqlite3.Row;c.execute('PRAGMA journal_mode=WAL');return c

def addcol(c,table,col,definition):
    try:c.execute(f'ALTER TABLE {table} ADD COLUMN {col} {definition}')
    except sqlite3.OperationalError:pass

def init_db():
    DB.parent.mkdir(parents=True,exist_ok=True);c=conn()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS opportunities(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, type TEXT, organizer TEXT, city TEXT, country TEXT, lat REAL, lon REAL, deadline TEXT, fee TEXT, status TEXT, accessibility TEXT, eligibility TEXT, summary TEXT, source_url TEXT, source_name TEXT, score INTEGER, priority TEXT, verified_on TEXT, last_checked TEXT, source_status TEXT DEFAULT 'not_checked', favorite INTEGER DEFAULT 0, pipeline_status TEXT DEFAULT 'new', notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS exhibitions(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, venue TEXT, city TEXT, country TEXT, start TEXT, end TEXT, lat REAL, lon REAL, source_url TEXT, notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS artists(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, name TEXT, real_name TEXT, city TEXT, country TEXT, discipline TEXT, bio TEXT, website TEXT, instagram TEXT, email TEXT, tags TEXT, milestones TEXT, notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS radar_runs(id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT, finished_at TEXT, checked INTEGER DEFAULT 0, online INTEGER DEFAULT 0, changed INTEGER DEFAULT 0, expired INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS radar_sources(id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT UNIQUE, reliability INTEGER DEFAULT 60, enabled INTEGER DEFAULT 1, last_seen TEXT, failures INTEGER DEFAULT 0);
    ''')
    for col,definition in [('discovered_at','TEXT'),('last_seen','TEXT'),('content_hash','TEXT'),('confidence','INTEGER DEFAULT 50'),('reliability','INTEGER DEFAULT 60'),('radar_score','INTEGER DEFAULT 0'),('radar_reason','TEXT DEFAULT \'\''),('days_left','INTEGER')]:addcol(c,'opportunities',col,definition)
    data=json.loads(SEED.read_text(encoding='utf-8'))
    for group,table in [('opportunities','opportunities'),('exhibitions','exhibitions')]:
        for x in data[group]:
            cols=list(x);c.execute(f"INSERT OR IGNORE INTO {table} ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[x[k] for k in cols])
    for a in data['artists']:
        a=a.copy();a['tags']=json.dumps(a['tags'],ensure_ascii=False);a['milestones']=json.dumps(a['milestones'],ensure_ascii=False);cols=list(a);c.execute(f"INSERT OR IGNORE INTO artists ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[a[k] for k in cols])
    c.commit();c.close()
init_db()

def rows(sql,p=()):
    c=conn();r=[dict(x) for x in c.execute(sql,p).fetchall()];c.close();return r
def one(sql,p=()):
    c=conn();x=c.execute(sql,p).fetchone();c.close();return dict(x) if x else None

def domain(u):
    try:return urlparse(u).netloc.lower().replace('www.','')
    except:return ''

def money_fee(f):
    s=(f or '').lower()
    if any(k in s for k in ['free','gratuit','0 €','0€','no application fee']):return 0
    nums=re.findall(r'(?:€|£|\$)?\s*(\d{1,4})(?:[.,]\d+)?\s*(?:€|£|\$)?',s)
    return int(nums[0]) if nums else None

def score_opp(o):
    today=date.today();score=45;why=[]
    text=' '.join(str(o.get(k) or '') for k in ['title','type','summary','accessibility','eligibility']).lower()
    fee=money_fee(o.get('fee'))
    if fee==0:score+=18;why.append('candidature gratuite')
    elif fee is not None and fee<=50:score+=12;why.append('coût faible')
    elif fee is not None and fee<=400:score+=5;why.append('coût compatible')
    elif fee and fee>400:score-=25;why.append('coût élevé')
    if any(k in text for k in ['emerging','émergent','young artist','early career','collective','group exhibition','open call']):score+=15;why.append('adapté aux artistes émergents')
    if any(k in text for k in ['competition','concours']):score-=12;why.append('concours')
    country=(o.get('country') or '').lower();city=(o.get('city') or '').lower()
    if country in ['france','italy','italie','spain','espagne','portugal','belgium','belgique','netherlands','pays-bas','united kingdom','royaume-uni']:score+=8;why.append('zone PLUG ART')
    if any(k in city for k in ['paris','aubervilliers','saint-denis','pantin','montreuil']):score+=8;why.append('priorité Paris/93')
    days=None
    try:
        if o.get('deadline'):days=(date.fromisoformat(o['deadline'])-today).days
    except:pass
    if days is not None:
        if days<0:score=0;why.append('échéance passée')
        elif days<=3:score+=12;why.append('urgent')
        elif days<=14:score+=9;why.append('échéance proche')
        elif days<=45:score+=5
    reliability=int(o.get('reliability') or 60);confidence=int(o.get('confidence') or 50)
    score+=round((reliability-60)*.18)+round((confidence-50)*.12)
    score=max(0,min(100,score));priority='faible'
    if score>=88:priority='urgente' if days is not None and days<=14 else 'très haute'
    elif score>=75:priority='haute'
    elif score>=60:priority='moyenne'
    return score,priority,days,' · '.join(why[:5])

def rescore_all(c):
    for r in c.execute('select * from opportunities').fetchall():
        o=dict(r);s,p,d,w=score_opp(o);c.execute('update opportunities set radar_score=?,score=?,priority=?,days_left=?,radar_reason=? where id=?',(s,s,p,d,w,o['id']))

def radar_scan():
    started=datetime.now().isoformat(timespec='seconds');c=conn();rescore_all(c);data=c.execute('select * from opportunities').fetchall();checked=online=changed=expired=errors=0
    for rr in data:
        o=dict(rr);checked+=1;status='offline';code=None;body='';rel=int(o.get('reliability') or 60)
        try:
            r=requests.get(o['source_url'],timeout=10,headers={'User-Agent':'Mozilla/5.0 PLUGART-Radar/2.0'},allow_redirects=True);code=r.status_code;body=r.text[:350000];status='online' if r.ok else f'http_{code}';online+=1 if r.ok else 0;rel=min(100,rel+2) if r.ok else max(10,rel-5)
        except Exception:errors+=1;rel=max(10,rel-6)
        h=hashlib.sha256(re.sub(r'\s+',' ',body).encode('utf-8','ignore')).hexdigest() if body else None
        if h and o.get('content_hash') and h!=o['content_hash']:changed+=1
        now=datetime.now().isoformat(timespec='seconds');d=o.get('days_left');newstatus=o.get('status')
        if d is not None and d<0 and newstatus=='open':newstatus='expired';expired+=1
        conf=85 if status=='online' else 35
        c.execute('update opportunities set last_checked=?,last_seen=?,source_status=?,content_hash=coalesce(?,content_hash),reliability=?,confidence=?,status=? where id=?',(now,now if status=='online' else o.get('last_seen'),status,h,rel,conf,newstatus,o['id']))
        dom=domain(o['source_url']);c.execute('insert into radar_sources(domain,reliability,last_seen,failures) values(?,?,?,?) on conflict(domain) do update set reliability=excluded.reliability,last_seen=excluded.last_seen,failures=case when ?=\'online\' then 0 else failures+1 end',(dom,rel,now if status=='online' else None,0 if status=='online' else 1,status))
    rescore_all(c);finished=datetime.now().isoformat(timespec='seconds');c.execute('insert into radar_runs(started_at,finished_at,checked,online,changed,expired,errors) values(?,?,?,?,?,?,?)',(started,finished,checked,online,changed,expired,errors));c.commit();c.close();return {'checked':checked,'online':online,'changed':changed,'expired':expired,'errors':errors,'at':finished}

@app.get('/api/health')
def health():return {'ok':True,'version':'6.0','database':str(DB),'date':str(date.today())}
@app.get('/api/stats')
def stats():
    today=str(date.today());return {'opportunities':one("select count(*) c from opportunities where status in ('open','rolling')")['c'],'urgent':one("select count(*) c from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today))['c'],'artists':one('select count(*) c from artists')['c'],'exhibitions':one('select count(*) c from exhibitions where end>=?',(today,))['c'],'favorites':one('select count(*) c from opportunities where favorite=1')['c']}
@app.get('/api/opportunities')
def get_opportunities(q:str='',country:str='',type:str='',favorites:bool=False,min_score:int=0,pipeline:str=''):
    sql="select * from opportunities where status in ('open','rolling') and coalesce(radar_score,score,0)>=?";p=[min_score]
    if q:sql+=" and lower(title||' '||coalesce(summary,'')||' '||coalesce(city,'')||' '||coalesce(organizer,'')) like ?";p.append('%'+q.lower()+'%')
    if country:sql+=' and country=?';p.append(country)
    if type:sql+=' and type like ?';p.append('%'+type+'%')
    if favorites:sql+=' and favorite=1'
    if pipeline:sql+=' and pipeline_status=?';p.append(pipeline)
    sql+=' order by coalesce(radar_score,score,0) desc, deadline';return rows(sql,p)
@app.get('/api/opportunities/{oid}')
def get_opportunity(oid:int):
    x=one('select * from opportunities where id=?',(oid,));
    if not x:raise HTTPException(404)
    return x
class OppPatch(BaseModel):favorite:int|None=None;pipeline_status:str|None=None;notes:str|None=None
@app.patch('/api/opportunities/{oid}')
def patch_opportunity(oid:int,body:OppPatch):
    vals=body.model_dump(exclude_none=True)
    if not vals:return get_opportunity(oid)
    c=conn();sets=','.join(f'{k}=?' for k in vals);c.execute(f'update opportunities set {sets} where id=?',[*vals.values(),oid]);c.commit();c.close();return get_opportunity(oid)
@app.get('/api/radar/status')
def radar_status():return {'last_run':one('select * from radar_runs order by id desc limit 1'),'sources':rows('select * from radar_sources order by reliability desc'),'top':rows("select id,title,city,country,deadline,fee,radar_score,priority,radar_reason,source_status from opportunities where status in ('open','rolling') order by radar_score desc limit 10")}
@app.post('/api/radar/run')
def run_radar():return radar_scan()
@app.post('/api/sync')
def sync_sources():return radar_scan()
@app.get('/api/artists')
def get_artists():
    out=rows('select * from artists order by name')
    for a in out:a['tags']=json.loads(a['tags'] or '[]');a['milestones']=json.loads(a['milestones'] or '[]')
    return out
@app.get('/api/artists/{aid}')
def get_artist(aid:int):
    a=one('select * from artists where id=?',(aid,));
    if not a:raise HTTPException(404)
    a['tags']=json.loads(a['tags'] or '[]');a['milestones']=json.loads(a['milestones'] or '[]');return a
@app.get('/api/exhibitions')
def get_exhibitions():return rows('select * from exhibitions order by start')
@app.get('/api/map')
def map_data():return rows("select id,title,city,country,lat,lon,deadline,coalesce(radar_score,score,0) score,'opportunity' kind from opportunities where lat is not null and lon is not null and status in ('open','rolling')")+rows("select id,title,city,country,lat,lon,start deadline,0 score,'exhibition' kind from exhibitions where lat is not null and lon is not null")
class PlugyMessage(BaseModel):message:str
@app.post('/api/plugy')
def plugy(body:PlugyMessage):
    text=body.message.lower().strip();active=rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,radar_reason,source_url,pipeline_status from opportunities where status in ('open','rolling') order by score desc")
    if any(k in text for k in ['urgence','urgent','deadline','échéance','proche']):subset=sorted([o for o in active if o['deadline'] and o['deadline']>=str(date.today())],key=lambda x:x['deadline'])[:6];return {'answer':'Priorités par échéance : '+', '.join(f"{o['title']} ({o['deadline']})" for o in subset),'items':subset}
    if 'paris' in text:subset=[o for o in active if 'paris' in (o['city'] or '').lower()][:8];return {'answer':f'{len(subset)} opportunités actives liées à Paris, classées par score Radar.','items':subset}
    if any(k in text for k in ['meilleur','priorit','radar','opportun']):return {'answer':'Voici les meilleures opportunités selon le Radar V6 : coût, accessibilité émergente, zone géographique, fiabilité et échéance.','items':active[:8]}
    if 'favori' in text:subset=rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,radar_reason,source_url,pipeline_status from opportunities where favorite=1 order by score desc");return {'answer':f'Tu as {len(subset)} opportunité(s) en favoris.','items':subset}
    s=stats();return {'answer':f"Radar V6 : {s['opportunities']} opportunités actives, {s['urgent']} urgentes. Je peux les classer par priorité, échéance, Paris ou favoris.",'items':active[:5]}
app.mount('/static',StaticFiles(directory=BASE/'static'),name='static')
@app.get('/')
def index():return FileResponse(BASE/'static'/'index.html')
