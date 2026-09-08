from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import date, datetime
import sqlite3, json, requests

BASE=Path(__file__).resolve().parent
DB=BASE/"data"/"plugart.db"
SEED=BASE/"data"/"seed.json"
app=FastAPI(title="PLUG ART Tool", version="5.0")

def conn():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    c=conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS opportunities(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, type TEXT, organizer TEXT, city TEXT, country TEXT, lat REAL, lon REAL, deadline TEXT, fee TEXT, status TEXT, accessibility TEXT, eligibility TEXT, summary TEXT, source_url TEXT, source_name TEXT, score INTEGER, priority TEXT, verified_on TEXT, last_checked TEXT, source_status TEXT DEFAULT 'not_checked', favorite INTEGER DEFAULT 0, pipeline_status TEXT DEFAULT 'new', notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS exhibitions(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, venue TEXT, city TEXT, country TEXT, start TEXT, end TEXT, lat REAL, lon REAL, source_url TEXT, notes TEXT DEFAULT '');
    CREATE TABLE IF NOT EXISTS artists(id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, name TEXT, real_name TEXT, city TEXT, country TEXT, discipline TEXT, bio TEXT, website TEXT, instagram TEXT, email TEXT, tags TEXT, milestones TEXT, notes TEXT DEFAULT '');
    """)
    data=json.loads(SEED.read_text(encoding="utf-8"))
    for o in data["opportunities"]:
        cols=list(o.keys()); c.execute(f"INSERT OR IGNORE INTO opportunities ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[o[k] for k in cols])
    for e in data["exhibitions"]:
        cols=list(e.keys()); c.execute(f"INSERT OR IGNORE INTO exhibitions ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[e[k] for k in cols])
    for a in data["artists"]:
        a=a.copy(); a["tags"]=json.dumps(a["tags"],ensure_ascii=False); a["milestones"]=json.dumps(a["milestones"],ensure_ascii=False)
        cols=list(a.keys()); c.execute(f"INSERT OR IGNORE INTO artists ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[a[k] for k in cols])
    c.commit(); c.close()
init_db()

def rows(sql,params=()):
    c=conn(); r=[dict(x) for x in c.execute(sql,params).fetchall()]; c.close(); return r
def one(sql,params=()):
    c=conn(); x=c.execute(sql,params).fetchone(); c.close(); return dict(x) if x else None

@app.get('/api/health')
def health(): return {'ok':True,'version':'5.0','database':DB.name,'date':str(date.today())}
@app.get('/api/stats')
def stats():
    today=str(date.today()); return {'opportunities':one("select count(*) c from opportunities where status in ('open','rolling')")['c'],'urgent':one("select count(*) c from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today))['c'],'artists':one('select count(*) c from artists')['c'],'exhibitions':one('select count(*) c from exhibitions where end>=?',(today,))['c'],'favorites':one('select count(*) c from opportunities where favorite=1')['c']}
@app.get('/api/opportunities')
def get_opportunities(q:str='',country:str='',type:str='',favorites:bool=False):
    sql='select * from opportunities where 1=1'; p=[]
    if q: sql+=" and lower(title||' '||coalesce(summary,'')||' '||coalesce(city,'')||' '||coalesce(organizer,'')) like ?"; p.append('%'+q.lower()+'%')
    if country: sql+=' and country=?'; p.append(country)
    if type: sql+=' and type like ?'; p.append('%'+type+'%')
    if favorites: sql+=' and favorite=1'
    sql+=" order by case priority when 'urgente' then 0 when 'très haute' then 1 when 'haute' then 2 else 3 end, score desc, deadline"; return rows(sql,p)
@app.get('/api/opportunities/{oid}')
def get_opportunity(oid:int):
    x=one('select * from opportunities where id=?',(oid,));
    if not x: raise HTTPException(404)
    return x
class OppPatch(BaseModel):
    favorite:int|None=None; pipeline_status:str|None=None; notes:str|None=None
@app.patch('/api/opportunities/{oid}')
def patch_opportunity(oid:int,body:OppPatch):
    vals=body.model_dump(exclude_none=True)
    if not vals:return get_opportunity(oid)
    c=conn(); sets=','.join(f'{k}=?' for k in vals); c.execute(f'update opportunities set {sets} where id=?',[*vals.values(),oid]); c.commit(); c.close(); return get_opportunity(oid)
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
def map_data():return rows("select id,title,city,country,lat,lon,deadline,score,'opportunity' kind from opportunities where lat is not null and lon is not null and status in ('open','rolling')")+rows("select id,title,city,country,lat,lon,start deadline,0 score,'exhibition' kind from exhibitions where lat is not null and lon is not null")
@app.post('/api/sync')
def sync_sources():
    c=conn(); data=c.execute('select id,source_url from opportunities').fetchall(); result=[]
    for r in data:
        status='error';code=None
        try:
            resp=requests.get(r['source_url'],timeout=8,headers={'User-Agent':'Mozilla/5.0 PLUGART-Radar/1.0'},allow_redirects=True);code=resp.status_code;status='online' if resp.ok else f'http_{resp.status_code}'
        except Exception:status='offline'
        now=datetime.now().isoformat(timespec='seconds');c.execute('update opportunities set last_checked=?,source_status=? where id=?',(now,status,r['id']));result.append({'id':r['id'],'status':status,'http':code})
    c.commit();c.close();return {'checked':len(result),'results':result,'at':datetime.now().isoformat(timespec='seconds')}
class PlugyMessage(BaseModel):message:str
@app.post('/api/plugy')
def plugy(body:PlugyMessage):
    text=body.message.lower().strip();today=str(date.today());active=rows("select id,title,city,country,deadline,fee,score,priority,source_url,pipeline_status from opportunities where status in ('open','rolling') order by score desc")
    if any(k in text for k in ['urgence','urgent','deadline','échéance','proche']):
        subset=[o for o in active if o['deadline'] and o['deadline']>=today][:5];return {'answer':'Les échéances à traiter en premier sont : '+', '.join(f"{o['title']} ({o['deadline']})" for o in sorted(subset,key=lambda x:x['deadline'])),'items':subset}
    if 'paris' in text:
        subset=[o for o in active if 'Paris' in (o['city'] or '')][:6];return {'answer':f"J’ai {len(subset)} opportunités actives liées à Paris dans la base réelle actuelle.",'items':subset}
    if any(k in text for k in ['meilleur','priorit','radar','opportun']):return {'answer':'Voici les opportunités les mieux classées par le radar PLUG ART, selon accessibilité, pertinence émergente et échéance.','items':active[:5]}
    if 'favori' in text:
        subset=rows('select id,title,city,country,deadline,fee,score,priority,source_url,pipeline_status from opportunities where favorite=1 order by score desc');return {'answer':f"Tu as {len(subset)} opportunité(s) en favoris.",'items':subset}
    s=stats();return {'answer':f"Base PLUG ART active : {s['opportunities']} opportunités, {s['urgent']} échéances dans les 14 jours, {s['artists']} profil artiste interne et {s['exhibitions']} expositions à venir. Demande-moi par exemple « meilleures opportunités », « urgences », « Paris » ou « favoris ».",'items':[]}
app.mount('/static',StaticFiles(directory=BASE/'static'),name='static')
@app.get('/')
def index():return FileResponse(BASE/'static'/'index.html')
