from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import date, datetime
from urllib.parse import urlparse, urljoin
from html.parser import HTMLParser
import sqlite3, json, requests, re, hashlib, os, threading, time

BASE=Path(__file__).resolve().parent
DEFAULT_DB=Path('/data/plugart.db') if Path('/data').exists() else BASE/'data'/'plugart.db'
DB=Path(os.getenv('PLUGART_DB',str(DEFAULT_DB)))
SEED=BASE/'data'/'seed.json'
app=FastAPI(title='PLUG ART Tool',version='7.0')
RADAR_LOCK=threading.Lock()
DISCOVERY_SOURCES=[
 ('ArtConnect — Open Calls','https://www.artconnect.com/opportunities/opencalls?types=OPEN_CALL',82),
 ('ArtConnect — France','https://www.artconnect.com/opportunities/france?country=FR&sortBy=-deadline',82),
 ('ArtConnect — Paris','https://www.artconnect.com/opportunities?city=Paris&country=FR',84),
 ('CuratorSpace — Upcoming','https://www.curatorspace.com/opportunities/?orderBy=deadline&search=0',80),
 ('CuratorSpace — Latest','https://www.curatorspace.com/opportunities?orderBy=latest&search=1',80)
]
LINK_HINTS=('opportun','open-call','open_call','opencall','call-for','detail','residen','exhibition','artist')
BAD_LINK_HINTS=('login','register','privacy','terms','contact','about','newsletter','facebook','instagram')
EUROPE_WORDS=('france','italy','italie','spain','espagne','portugal','belgium','belgique','netherlands','pays-bas','united kingdom','royaume-uni','germany','allemagne','austria','autriche','switzerland','suisse')
PARIS_WORDS=('paris','aubervilliers','saint-denis','pantin','montreuil','93','seine-saint-denis')

def domain(u):
 try:return urlparse(u).netloc.lower().replace('www.','')
 except:return ''

def conn():
 DB.parent.mkdir(parents=True,exist_ok=True)
 c=sqlite3.connect(DB,timeout=20);c.row_factory=sqlite3.Row;c.execute('PRAGMA journal_mode=WAL');c.execute('PRAGMA busy_timeout=10000');return c

def addcol(c,table,col,definition):
 try:c.execute(f'ALTER TABLE {table} ADD COLUMN {col} {definition}')
 except sqlite3.OperationalError:pass

def norm(s):return re.sub(r'\s+',' ',(s or '').strip())
def slugify(s):
 x=re.sub(r'[^a-z0-9]+','-',(s or '').lower()).strip('-');return x[:80] or hashlib.sha1((s or str(time.time())).encode()).hexdigest()[:16]

def init_db():
 c=conn();c.executescript('''
 CREATE TABLE IF NOT EXISTS opportunities(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT UNIQUE,title TEXT,type TEXT,organizer TEXT,city TEXT,country TEXT,lat REAL,lon REAL,deadline TEXT,fee TEXT,status TEXT,accessibility TEXT,eligibility TEXT,summary TEXT,source_url TEXT,source_name TEXT,score INTEGER,priority TEXT,verified_on TEXT,last_checked TEXT,source_status TEXT DEFAULT 'not_checked',favorite INTEGER DEFAULT 0,pipeline_status TEXT DEFAULT 'new',notes TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS exhibitions(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT UNIQUE,title TEXT,venue TEXT,city TEXT,country TEXT,start TEXT,end TEXT,lat REAL,lon REAL,source_url TEXT,notes TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS artists(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT UNIQUE,name TEXT,real_name TEXT,city TEXT,country TEXT,discipline TEXT,bio TEXT,website TEXT,instagram TEXT,email TEXT,tags TEXT,milestones TEXT,notes TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS radar_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT DEFAULT 'verify',started_at TEXT,finished_at TEXT,checked INTEGER DEFAULT 0,online INTEGER DEFAULT 0,changed INTEGER DEFAULT 0,expired INTEGER DEFAULT 0,errors INTEGER DEFAULT 0,discovered INTEGER DEFAULT 0,notes TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS radar_sources(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,url TEXT UNIQUE,domain TEXT,reliability INTEGER DEFAULT 60,enabled INTEGER DEFAULT 1,last_seen TEXT,last_run TEXT,failures INTEGER DEFAULT 0,last_error TEXT DEFAULT '');
 CREATE TABLE IF NOT EXISTS radar_candidates(id INTEGER PRIMARY KEY AUTOINCREMENT,fingerprint TEXT UNIQUE,title TEXT,source_url TEXT UNIQUE,source_name TEXT,source_page TEXT,city TEXT,country TEXT,deadline TEXT,fee TEXT,summary TEXT,discovered_at TEXT,last_checked TEXT,confidence INTEGER DEFAULT 50,candidate_score INTEGER DEFAULT 0,state TEXT DEFAULT 'new',reason TEXT DEFAULT '',raw_excerpt TEXT DEFAULT '');
 CREATE INDEX IF NOT EXISTS idx_opp_status_score ON opportunities(status,score DESC);
 CREATE INDEX IF NOT EXISTS idx_opp_deadline ON opportunities(deadline);
 CREATE INDEX IF NOT EXISTS idx_candidate_state_score ON radar_candidates(state,candidate_score DESC);
 ''')
 for col,definition in [('discovered_at','TEXT'),('last_seen','TEXT'),('content_hash','TEXT'),('confidence','INTEGER DEFAULT 50'),('reliability','INTEGER DEFAULT 60'),('radar_score','INTEGER DEFAULT 0'),('radar_reason','TEXT DEFAULT \'\''),('days_left','INTEGER')]:addcol(c,'opportunities',col,definition)
 if SEED.exists():
  data=json.loads(SEED.read_text(encoding='utf-8'))
  for group,table in [('opportunities','opportunities'),('exhibitions','exhibitions')]:
   for x in data.get(group,[]):
    cols=list(x);c.execute(f"INSERT OR IGNORE INTO {table} ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[x[k] for k in cols])
  for a in data.get('artists',[]):
   a=a.copy();a['tags']=json.dumps(a.get('tags',[]),ensure_ascii=False);a['milestones']=json.dumps(a.get('milestones',[]),ensure_ascii=False);cols=list(a);c.execute(f"INSERT OR IGNORE INTO artists ({','.join(cols)}) VALUES ({','.join('?' for _ in cols)})",[a[k] for k in cols])
 for name,url,reliability in DISCOVERY_SOURCES:
  c.execute('INSERT INTO radar_sources(name,url,domain,reliability) VALUES(?,?,?,?) ON CONFLICT(url) DO UPDATE SET name=excluded.name,domain=excluded.domain',(name,url,domain(url),reliability))
 rescore_all(c);c.commit();c.close()

def rows(sql,p=()):
 c=conn();r=[dict(x) for x in c.execute(sql,p).fetchall()];c.close();return r
def one(sql,p=()):
 c=conn();x=c.execute(sql,p).fetchone();c.close();return dict(x) if x else None

def money_fee(f):
 s=(f or '').lower()
 if any(k in s for k in ['free','gratuit','0 €','0€','no application fee','sans frais']):return 0
 nums=re.findall(r'(?:€|£|\$)?\s*(\d{1,4})(?:[.,]\d+)?\s*(?:€|£|\$)?',s);return int(nums[0]) if nums else None

MONTHS={'january':1,'janvier':1,'february':2,'février':2,'fevrier':2,'march':3,'mars':3,'april':4,'avril':4,'may':5,'mai':5,'june':6,'juin':6,'july':7,'juillet':7,'august':8,'août':8,'aout':8,'september':9,'septembre':9,'october':10,'octobre':10,'november':11,'novembre':11,'december':12,'décembre':12,'decembre':12}
def parse_deadline(text):
 s=norm(text).lower();m=re.search(r'\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.]([0-2]?\d|3[01])\b',s)
 if m:
  try:return date(int(m.group(1)),int(m.group(2)),int(m.group(3))).isoformat()
  except ValueError:pass
 m=re.search(r'\b([0-2]?\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b',s)
 if m:
  try:return date(int(m.group(3)),int(m.group(2)),int(m.group(1))).isoformat()
  except ValueError:pass
 month_re='|'.join(sorted(MONTHS,key=len,reverse=True));m=re.search(rf'\b([0-2]?\d|3[01])\s+({month_re})\s+(20\d{{2}})\b',s)
 if m:
  try:return date(int(m.group(3)),MONTHS[m.group(2)],int(m.group(1))).isoformat()
  except ValueError:pass
 return None

def infer_place(text):
 t=norm(text);city=country=None;mc=re.search(r'(?:city|ville)\s*:\s*([^|·]{2,50})',t,re.I);mco=re.search(r'(?:country|pays)\s*:\s*([^|·]{2,50})',t,re.I)
 if mc:city=norm(mc.group(1)).strip(' -:')
 if mco:country=norm(mco.group(1)).strip(' -:')
 low=t.lower()
 if not city:
  for x in ('Paris','Aubervilliers','Saint-Denis','Pantin','Montreuil','London','Brussels','Bruxelles','Madrid','Milan','Milano','Rome','Roma','Amsterdam','Lisbon','Lisbonne','Lyon','Marseille'):
   if x.lower() in low:city=x;break
 if not country:
  mapping={'paris':'France','aubervilliers':'France','saint-denis':'France','pantin':'France','montreuil':'France','lyon':'France','marseille':'France','london':'Royaume-Uni','brussels':'Belgique','bruxelles':'Belgique','madrid':'Espagne','milan':'Italie','milano':'Italie','rome':'Italie','roma':'Italie','amsterdam':'Pays-Bas','lisbon':'Portugal','lisbonne':'Portugal'}
  if city:country=mapping.get(city.lower())
 return city,country

def infer_fee(text):
 s=norm(text);low=s.lower()
 if any(k in low for k in ['application fee: free','fees: free','no application fee','free to apply','candidature gratuite','gratuit']):return 'Gratuit'
 m=re.search(r'(?:fee|fees|cost|application fee|entry fee|frais)[^€£$]{0,45}([€£$]\s?\d{1,4}|\d{1,4}\s?[€£$])',s,re.I);return norm(m.group(0))[:100] if m else 'À vérifier'

def score_opp(o):
 today=date.today();score=42;why=[];text=' '.join(str(o.get(k) or '') for k in ['title','type','summary','accessibility','eligibility']).lower();fee=money_fee(o.get('fee'))
 if fee==0:score+=18;why.append('candidature gratuite')
 elif fee is not None and fee<=50:score+=12;why.append('coût faible')
 elif fee is not None and fee<=400:score+=5;why.append('coût compatible')
 elif fee and fee>400:score-=25;why.append('coût élevé')
 if any(k in text for k in ['emerging','émergent','young artist','early career']):score+=14;why.append('artistes émergents')
 if any(k in text for k in ['collective','group exhibition','exposition collective']):score+=8;why.append('format collectif')
 if any(k in text for k in ['open call','appel à candid']):score+=5
 if any(k in text for k in ['competition','concours']):score-=14;why.append('concours')
 if any(k in text for k in ['visual art','peinture','painting','photography','photographie','sculpture','mixed media']):score+=5
 country=(o.get('country') or '').lower();city=(o.get('city') or '').lower()
 if any(k in country for k in EUROPE_WORDS):score+=8;why.append('zone PLUG ART')
 if any(k in city for k in PARIS_WORDS):score+=10;why.append('priorité Paris/93')
 days=None
 try:
  if o.get('deadline'):days=(date.fromisoformat(o['deadline'])-today).days
 except:pass
 if days is not None:
  if days<0:score=0;why.append('échéance passée')
  elif days<=3:score+=12;why.append('urgent')
  elif days<=14:score+=9;why.append('échéance proche')
  elif days<=45:score+=5
 reliability=int(o.get('reliability') or 60);confidence=int(o.get('confidence') or 50);score+=round((reliability-60)*.15)+round((confidence-50)*.10);score=max(0,min(100,score));priority='faible'
 if score>=88:priority='urgente' if days is not None and days<=14 else 'très haute'
 elif score>=75:priority='haute'
 elif score>=60:priority='moyenne'
 return score,priority,days,' · '.join(why[:6])

def score_candidate(x):
 s,_,_,w=score_opp({'title':x.get('title'),'type':'Open Call','summary':x.get('summary'),'accessibility':'','eligibility':'','fee':x.get('fee'),'city':x.get('city'),'country':x.get('country'),'deadline':x.get('deadline'),'reliability':x.get('reliability',70),'confidence':x.get('confidence',60)});return s,w

def rescore_all(c):
 for r in c.execute('select * from opportunities').fetchall():
  o=dict(r);s,p,d,w=score_opp(o);c.execute('update opportunities set radar_score=?,score=?,priority=?,days_left=?,radar_reason=? where id=?',(s,s,p,d,w,o['id']))

class LinkParser(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.href=None;self.parts=[];self.title_parts=[];self.in_title=False
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.href=dict(attrs).get('href');self.parts=[]
  elif tag=='title':self.in_title=True
 def handle_endtag(self,tag):
  if tag=='a' and self.href:self.links.append((self.href,norm(' '.join(self.parts))));self.href=None;self.parts=[]
  elif tag=='title':self.in_title=False
 def handle_data(self,data):
  if self.href:self.parts.append(data)
  if self.in_title:self.title_parts.append(data)

def strip_html(html):return norm(re.sub(r'<[^>]+>',' ',html or ''))
def fetch_page(url,timeout=10):return requests.get(url,timeout=timeout,headers={'User-Agent':'Mozilla/5.0 PLUGART-Radar/3.0'},allow_redirects=True)
def valid_candidate_link(base,href,label):
 if not href or href.startswith(('#','mailto:','javascript:')):return False
 u=urljoin(base,href);low=(u+' '+(label or '')).lower()
 if urlparse(u).scheme not in ('http','https') or domain(u)!=domain(base) or any(b in low for b in BAD_LINK_HINTS):return False
 return any(h in low for h in LINK_HINTS)

def extract_detail(url,fallback_title=''):
 r=fetch_page(url,10)
 if not r.ok:raise RuntimeError(f'HTTP {r.status_code}')
 html=r.text[:500000];parser=LinkParser()
 try:parser.feed(html)
 except:pass
 text=strip_html(html);title=fallback_title;h1=re.search(r'<h1[^>]*>(.*?)</h1>',html,re.I|re.S)
 if h1:title=strip_html(h1.group(1))
 elif parser.title_parts:title=norm(' '.join(parser.title_parts)).split('|')[0].strip()
 title=(title or url).strip()[:220];deadline=parse_deadline(text);city,country=infer_place(text);fee=infer_fee(text);excerpt=text[:1200];confidence=72+(8 if deadline else 0)+(5 if city or country else 0)+(5 if len(title)>8 else 0)
 return {'title':title,'deadline':deadline,'city':city,'country':country,'fee':fee,'summary':excerpt[:650],'raw_excerpt':excerpt,'confidence':min(95,confidence)}

def candidate_fingerprint(url,title):return hashlib.sha256((domain(url)+'|'+re.sub(r'[^a-z0-9]','',(title or '').lower())[:120]).encode()).hexdigest()

def discover_sources(max_details=18):
 started=datetime.now().isoformat(timespec='seconds');c=conn();sources=[dict(x) for x in c.execute('select * from radar_sources where enabled=1 order by reliability desc').fetchall()];discovered=checked=online=errors=0;seen_urls=set()
 for src in sources:
  checked+=1;now=datetime.now().isoformat(timespec='seconds')
  try:
   r=fetch_page(src['url'],12)
   if not r.ok:raise RuntimeError(f'HTTP {r.status_code}')
   online+=1;parser=LinkParser();parser.feed(r.text[:650000]);links=[]
   for href,label in parser.links:
    if valid_candidate_link(src['url'],href,label):
     u=urljoin(src['url'],href).split('#')[0]
     if u not in seen_urls:seen_urls.add(u);links.append((u,label))
   rel=min(100,int(src['reliability'] or 60)+1);c.execute("update radar_sources set last_seen=?,last_run=?,failures=0,last_error='',reliability=? where id=?",(now,now,rel,src['id']))
   for u,label in links[:max_details]:
    if c.execute('select 1 from opportunities where source_url=?',(u,)).fetchone() or c.execute('select 1 from radar_candidates where source_url=?',(u,)).fetchone():continue
    try:
     d=extract_detail(u,label)
     if len(d['title'])<7 or d['title'].lower() in ('opportunities','open calls','calls for artists'):continue
     fp=candidate_fingerprint(u,d['title']);item={**d,'source_url':u,'source_name':src['name'],'source_page':src['url'],'reliability':rel};score,reason=score_candidate(item)
     before=c.total_changes;c.execute("INSERT OR IGNORE INTO radar_candidates(fingerprint,title,source_url,source_name,source_page,city,country,deadline,fee,summary,discovered_at,last_checked,confidence,candidate_score,state,reason,raw_excerpt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new',?,?)",(fp,d['title'],u,src['name'],src['url'],d['city'],d['country'],d['deadline'],d['fee'],d['summary'],now,now,d['confidence'],score,reason,d['raw_excerpt']))
     if c.total_changes>before:discovered+=1
    except Exception:errors+=1
  except Exception as e:errors+=1;c.execute('update radar_sources set last_run=?,failures=failures+1,last_error=? where id=?',(now,str(e)[:180],src['id']))
 finished=datetime.now().isoformat(timespec='seconds');c.execute("insert into radar_runs(kind,started_at,finished_at,checked,online,errors,discovered,notes) values('discover',?,?,?,?,?,?,?)",(started,finished,checked,online,errors,discovered,f'{len(seen_urls)} liens candidats'));c.commit();c.close();return {'checked_sources':checked,'online_sources':online,'discovered':discovered,'errors':errors,'links_seen':len(seen_urls),'at':finished}

def verify_existing():
 started=datetime.now().isoformat(timespec='seconds');c=conn();rescore_all(c);data=c.execute('select * from opportunities').fetchall();checked=online=changed=expired=errors=0
 for rr in data:
  o=dict(rr);checked+=1;status='offline';body='';rel=int(o.get('reliability') or 60)
  try:
   r=fetch_page(o['source_url'],8);body=r.text[:350000];status='online' if r.ok else f'http_{r.status_code}'
   if r.ok:online+=1;rel=min(100,rel+2)
   else:rel=max(10,rel-4)
  except Exception:errors+=1;rel=max(10,rel-6)
  h=hashlib.sha256(re.sub(r'\s+',' ',body).encode('utf-8','ignore')).hexdigest() if body else None
  if h and o.get('content_hash') and h!=o['content_hash']:changed+=1
  now=datetime.now().isoformat(timespec='seconds');days=None
  try:
   if o.get('deadline'):days=(date.fromisoformat(o['deadline'])-date.today()).days
  except:pass
  newstatus=o.get('status')
  if days is not None and days<0 and newstatus=='open':newstatus='expired';expired+=1
  conf=88 if status=='online' else 35;c.execute('update opportunities set last_checked=?,last_seen=?,source_status=?,content_hash=coalesce(?,content_hash),reliability=?,confidence=?,status=? where id=?',(now,now if status=='online' else o.get('last_seen'),status,h,rel,conf,newstatus,o['id']))
 rescore_all(c);finished=datetime.now().isoformat(timespec='seconds');c.execute("insert into radar_runs(kind,started_at,finished_at,checked,online,changed,expired,errors) values('verify',?,?,?,?,?,?,?)",(started,finished,checked,online,changed,expired,errors));c.commit();c.close();return {'checked':checked,'online':online,'changed':changed,'expired':expired,'errors':errors,'at':finished}

def run_full_radar():
 if not RADAR_LOCK.acquire(blocking=False):return {'ok':False,'busy':True,'message':'Un scan Radar est déjà en cours.'}
 try:return {'ok':True,'discovery':discover_sources(int(os.getenv('PLUGART_DISCOVERY_MAX_DETAILS','18'))),'verification':verify_existing()}
 finally:RADAR_LOCK.release()

def scheduler_loop():
 time.sleep(max(5,int(os.getenv('PLUGART_RADAR_START_DELAY_SECONDS','45'))));hours=float(os.getenv('PLUGART_RADAR_INTERVAL_HOURS','6'))
 while True:
  try:run_full_radar()
  except Exception as e:print('PLUGART radar scheduler error:',e,flush=True)
  time.sleep(max(3600,int(hours*3600)))

init_db()
if os.getenv('PLUGART_AUTORADAR','0')=='1':threading.Thread(target=scheduler_loop,name='plugart-radar',daemon=True).start()

@app.get('/api/health')
def health():
 try:c=conn();c.execute('select 1').fetchone();c.close();db_ok=True
 except:db_ok=False
 return {'ok':db_ok,'version':'7.0','database':str(DB),'persistent':str(DB).startswith('/data/'),'date':str(date.today())}
@app.get('/api/stats')
def stats():
 today=str(date.today());return {'opportunities':one("select count(*) c from opportunities where status in ('open','rolling')")['c'],'urgent':one("select count(*) c from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today))['c'],'artists':one('select count(*) c from artists')['c'],'exhibitions':one('select count(*) c from exhibitions where end>=?',(today,))['c'],'favorites':one('select count(*) c from opportunities where favorite=1')['c'],'candidates':one("select count(*) c from radar_candidates where state='new'")['c']}
@app.get('/api/opportunities')
def get_opportunities(q:str='',country:str='',type:str='',favorites:bool=False,min_score:int=0,pipeline:str=''):
 sql="select * from opportunities where status in ('open','rolling') and coalesce(radar_score,score,0)>=?";p=[min_score]
 if q:sql+=" and lower(title||' '||coalesce(summary,'')||' '||coalesce(city,'')||' '||coalesce(organizer,'')) like ?";p.append('%'+q.lower()+'%')
 if country:sql+=' and country=?';p.append(country)
 if type:sql+=' and type like ?';p.append('%'+type+'%')
 if favorites:sql+=' and favorite=1'
 if pipeline:sql+=' and pipeline_status=?';p.append(pipeline)
 sql+=' order by coalesce(radar_score,score,0) desc,case when deadline is null then 1 else 0 end,deadline';return rows(sql,p)
@app.get('/api/opportunities/{oid}')
def get_opportunity(oid:int):
 x=one('select * from opportunities where id=?',(oid,))
 if not x:raise HTTPException(404)
 return x
class OppPatch(BaseModel):
 favorite:int|None=None;pipeline_status:str|None=None;notes:str|None=None
@app.patch('/api/opportunities/{oid}')
def patch_opportunity(oid:int,body:OppPatch):
 vals=body.model_dump(exclude_none=True)
 if not vals:return get_opportunity(oid)
 c=conn();sets=','.join(f'{k}=?' for k in vals);cur=c.execute(f'update opportunities set {sets} where id=?',[*vals.values(),oid]);c.commit();c.close()
 if not cur.rowcount:raise HTTPException(404)
 return get_opportunity(oid)
@app.get('/api/radar/status')
def radar_status():return {'last_run':one('select * from radar_runs order by id desc limit 1'),'runs':rows('select * from radar_runs order by id desc limit 10'),'sources':rows('select * from radar_sources order by reliability desc'),'candidate_counts':rows('select state,count(*) count from radar_candidates group by state'),'top':rows("select id,title,city,country,deadline,fee,radar_score,priority,radar_reason,source_status from opportunities where status in ('open','rolling') order by radar_score desc limit 10")}
@app.get('/api/radar/candidates')
def radar_candidates(state:str='new',min_score:int=0):return rows('select * from radar_candidates where state=? and candidate_score>=? order by candidate_score desc,deadline',(state,min_score))
@app.post('/api/radar/discover')
def radar_discover():
 if not RADAR_LOCK.acquire(blocking=False):return {'ok':False,'busy':True}
 try:return {'ok':True,**discover_sources(int(os.getenv('PLUGART_DISCOVERY_MAX_DETAILS','18')))}
 finally:RADAR_LOCK.release()
@app.post('/api/radar/run')
def radar_run():return run_full_radar()
@app.post('/api/sync')
def sync_sources():
 if not RADAR_LOCK.acquire(blocking=False):return {'ok':False,'busy':True}
 try:return {'ok':True,**verify_existing()}
 finally:RADAR_LOCK.release()
@app.post('/api/radar/candidates/{cid}/promote')
def promote_candidate(cid:int):
 c=conn();r=c.execute('select * from radar_candidates where id=?',(cid,)).fetchone()
 if not r:c.close();raise HTTPException(404)
 x=dict(r)
 if x['state']=='promoted':c.close();return {'ok':True,'already':True}
 if x.get('deadline'):
  try:
   if date.fromisoformat(x['deadline'])<date.today():c.execute("update radar_candidates set state='expired' where id=?",(cid,));c.commit();c.close();raise HTTPException(409,'Candidature expirée')
  except ValueError:pass
 slug=slugify(x['title'])+'-'+hashlib.sha1(x['source_url'].encode()).hexdigest()[:7];o={'title':x['title'],'type':'Open Call','organizer':x['source_name'],'city':x['city'],'country':x['country'],'deadline':x['deadline'],'fee':x['fee'],'status':'open','accessibility':'à confirmer','eligibility':'À vérifier sur la source','summary':x['summary'],'source_url':x['source_url'],'source_name':x['source_name'],'score':x['candidate_score'],'priority':'moyenne','verified_on':str(date.today()),'confidence':x['confidence'],'discovered_at':x['discovered_at']};s,p,d,w=score_opp(o);o.update({'score':s,'priority':p,'radar_score':s,'radar_reason':w,'days_left':d});cols=['slug']+list(o.keys());vals=[slug]+[o[k] for k in o];c.execute(f"insert or ignore into opportunities ({','.join(cols)}) values ({','.join('?' for _ in cols)})",vals);c.execute("update radar_candidates set state='promoted' where id=?",(cid,));c.commit();c.close();return {'ok':True,'opportunity':one('select * from opportunities where source_url=?',(x['source_url'],))}
@app.post('/api/radar/candidates/{cid}/reject')
def reject_candidate(cid:int):
 c=conn();cur=c.execute("update radar_candidates set state='rejected' where id=?",(cid,));c.commit();c.close()
 if not cur.rowcount:raise HTTPException(404)
 return {'ok':True}
@app.get('/api/artists')
def get_artists():
 out=rows('select * from artists order by name')
 for a in out:a['tags']=json.loads(a['tags'] or '[]');a['milestones']=json.loads(a['milestones'] or '[]')
 return out
@app.get('/api/artists/{aid}')
def get_artist(aid:int):
 a=one('select * from artists where id=?',(aid,))
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
 if any(k in text for k in ['nouveau','nouveautés','candidat','à vérifier','a verifier']):subset=rows("select id,title,city,country,deadline,fee,candidate_score score,reason,source_url from radar_candidates where state='new' order by candidate_score desc limit 8");return {'answer':f"Le Radar a {len(subset)} candidat(s) prioritaires à vérifier avant promotion.",'items':subset}
 if any(k in text for k in ['urgence','urgent','deadline','échéance','proche']):subset=sorted([o for o in active if o['deadline'] and o['deadline']>=str(date.today())],key=lambda x:x['deadline'])[:6];return {'answer':'Priorités par échéance : '+', '.join(f"{o['title']} ({o['deadline']})" for o in subset),'items':subset}
 if 'paris' in text:subset=[o for o in active if 'paris' in (o['city'] or '').lower()][:8];return {'answer':f'{len(subset)} opportunités actives liées à Paris, classées par score Radar.','items':subset}
 if 'favori' in text:subset=rows("select id,title,city,country,deadline,fee,coalesce(radar_score,score,0) score,priority,radar_reason,source_url,pipeline_status from opportunities where favorite=1 order by score desc");return {'answer':f"Tu as {len(subset)} opportunité(s) en favoris.",'items':subset}
 if any(k in text for k in ['meilleur','priorit','radar','opportun']):return {'answer':'Voici les meilleures opportunités selon le Radar V7 : pertinence émergente, format collectif, coût, géographie, fiabilité et échéance.','items':active[:8]}
 s=stats();return {'answer':f"Radar V7 : {s['opportunities']} opportunités actives, {s['urgent']} urgentes et {s['candidates']} nouvelles pistes à vérifier.",'items':active[:5]}
app.mount('/static',StaticFiles(directory=BASE/'static'),name='static')
@app.get('/')
def index():return FileResponse(BASE/'static'/'index.html')
