from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse, Response, RedirectResponse
from urllib.parse import urljoin, urlencode
import hashlib,re,time,html as html_lib,requests,json,threading,os,secrets,base64,hmac
import app as core
import app_extra_v43 as v43
from build_plugy_official_v84 import build_plugy_official_v84

app=v43.app
app.version='101.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'dashboard_v101.html'
GLB=BASE/'static'/'plugy_official_v84.glb'
RESULT=build_plugy_official_v84(GLB)
PLUGY_REFERENCE_ANIMATIONS=[RESULT.get('animation','IdleBlink')]
PLUGY_REFERENCE_SHA256=hashlib.sha256(GLB.read_bytes()).hexdigest() if GLB.exists() else ''
VERSION='101.20260923.1'
MEDIA_CACHE={}
MEDIA_BYTES_CACHE={}

for route in list(app.router.routes):
    if getattr(route,'path',None)=='/' and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v65():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART workspace unavailable.</body></html>'
    return HTMLResponse(html,headers={
      'Cache-Control':'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma':'no-cache',
      'Expires':'0',
      'X-Plug-Art-Version':'101.0',
      'X-Plug-Art-UI':'plug-art-os-v101'
    })

from fastapi.middleware.gzip import GZipMiddleware
try:
    app.add_middleware(GZipMiddleware, minimum_size=900)
except Exception:
    pass

@app.middleware('http')
async def v85_headers(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p=='/':
        response.headers['Cache-Control']='no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma']='no-cache'
    elif p.startswith('/static/') and any(p.endswith(ext) for ext in ('.css','.js','.glb','.png','.jpg','.jpeg','.webp','.svg')):
        response.headers['Cache-Control']='public, max-age=31536000, immutable'
    elif p.startswith('/api/'):
        response.headers.setdefault('Cache-Control','no-store')
    return response


def _attr(tag,name):
    m=re.search(rf'\b{name}\s*=\s*["\']([^"\']+)["\']',tag,re.I)
    return html_lib.unescape(m.group(1).strip()) if m else ''

def _media_score(url,context='',base=35):
    low=(url+' '+context).lower();score=base
    if any(k in low for k in ('hero','banner','open-call','opencall','exhibition','exposition','artwork','gallery','event','artist')):score+=18
    if any(k in low for k in ('logo','favicon','sprite','avatar','icon','emoji','pixel','tracking','placeholder','loader')):score-=90
    if any(k in low for k in ('thumb','thumbnail','small','150x','200x')):score-=16
    if any(k in low for k in ('1200','1600','1920','2048','large','original')):score+=8
    return score

def _official_media(url:str):
    now=time.time();hit=MEDIA_CACHE.get(url)
    if hit and now-hit[0] < 3600:return hit[1]
    found={}
    try:
        r=requests.get(url,timeout=10,headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/2.0','Accept':'text/html,application/xhtml+xml'},allow_redirects=True);r.raise_for_status();text=r.text[:1400000]
        def add(raw,source,context='',base=35):
            if not raw:return
            u=urljoin(r.url,html_lib.unescape(raw).strip())
            if not u.startswith(('http://','https://')) or u.lower().endswith(('.svg','.gif')):return
            score=_media_score(u,context,base);old=found.get(u)
            if not old or score>old['score']:found[u]={'url':u,'score':score,'source':source,'context':re.sub(r'\s+',' ',context or '').strip()[:140]}
        for pat in (r'<meta[^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\'][^>]+content=["\']([^"\']+)["\']',r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image|twitter:image:src)["\']',r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']'):
            for raw in re.findall(pat,text,re.I):add(raw,'meta','official hero image',100)
        for raw in re.findall(r'["\']image["\']\s*:\s*["\']([^"\']+)["\']',text,re.I):add(raw,'json-ld','structured image',82)
        for tag in re.findall(r'<img\b[^>]*>',text,re.I):
            src=_attr(tag,'src') or _attr(tag,'data-src') or _attr(tag,'data-lazy-src') or _attr(tag,'data-original');alt=_attr(tag,'alt');cls=_attr(tag,'class');w=_attr(tag,'width');h=_attr(tag,'height');penalty=-24 if (w.isdigit() and int(w)<280) or (h.isdigit() and int(h)<220) else 0
            add(src,'img',alt+' '+cls,48+penalty);srcset=_attr(tag,'srcset') or _attr(tag,'data-srcset')
            if srcset:
                parts=[p.strip().split(' ')[0] for p in srcset.split(',') if p.strip()]
                if parts:add(parts[-1],'srcset',alt+' '+cls,58+penalty)
        ranked=sorted((v for v in found.values() if v['score']>0),key=lambda x:x['score'],reverse=True)[:18];MEDIA_CACHE[url]=(now,ranked);return ranked
    except Exception:MEDIA_CACHE[url]=(now,[]);return []

def _opportunity_media(oid:int):
    item=core.one('select id,title,source_url from opportunities where id=?',(oid,))
    if not item:raise HTTPException(404,'Opportunity not found')
    url=item.get('source_url') or '';return item,url,_official_media(url) if url else []

@app.get('/api/v66/opportunities/{oid}/media')
@app.get('/api/v67/opportunities/{oid}/media')
def opportunity_media_v67(oid:int):
    item,url,media=_opportunity_media(oid);return {'id':oid,'title':item.get('title'),'source_url':url,'images':[x['url'] for x in media],'media':media,'engine':'official-media-v2'}

@app.get('/api/v67/opportunities/{oid}/thumbnail')
def opportunity_thumbnail_v67(oid:int):
    item,url,media=_opportunity_media(oid);key=str(oid);now=time.time();cached=MEDIA_BYTES_CACHE.get(key)
    if cached and now-cached[0]<1800:return Response(content=cached[1],media_type=cached[2],headers={'Cache-Control':'public,max-age=1800'})
    headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/2.0','Referer':url or 'https://plug-art-live-production.up.railway.app/'}
    for candidate in media[:6]:
        try:
            rr=requests.get(candidate['url'],timeout=9,headers=headers,allow_redirects=True);ct=(rr.headers.get('content-type') or '').split(';')[0].lower()
            if rr.ok and ct.startswith('image/') and 1200<len(rr.content)<9000000:
                MEDIA_BYTES_CACHE[key]=(now,rr.content,ct)
                if len(MEDIA_BYTES_CACHE)>40:MEDIA_BYTES_CACHE.pop(next(iter(MEDIA_BYTES_CACHE)))
                return Response(content=rr.content,media_type=ct,headers={'Cache-Control':'public,max-age=1800','X-PLUG-Image-Source':candidate['source']})
        except Exception:pass
    return Response(status_code=404)


# V85 internal control center.
_c=core.conn()
_c.executescript("""
CREATE TABLE IF NOT EXISTS crm_leads(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  kind TEXT DEFAULT 'Galerie',
  city TEXT DEFAULT '',
  country TEXT DEFAULT '',
  email TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  website TEXT DEFAULT '',
  status TEXT DEFAULT 'lead',
  priority TEXT DEFAULT 'normal',
  next_action TEXT DEFAULT '',
  next_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_crm_status_priority ON crm_leads(status,priority,updated_at DESC);
""")
_c.commit()
_c.close()

def _now_v85():
    return time.strftime('%Y-%m-%dT%H:%M:%S')

@app.get('/api/v85/map')
def map_v85():
    return core.rows("""select id,title,'' venue,city,country,lat,lon,deadline date,deadline,coalesce(radar_score,score,0) score,source_url,'opportunity' kind from opportunities where lat is not null and lon is not null and status in ('open','rolling')""") + core.rows("""select id,title,venue,city,country,lat,lon,start date,start deadline,0 score,source_url,'exhibition' kind from exhibitions where lat is not null and lon is not null""")

@app.get('/api/v85/crm')
def crm_list_v85():
    return core.rows("""select * from crm_leads order by case priority when 'high' then 0 when 'normal' then 1 else 2 end, updated_at desc, id desc""")

@app.post('/api/v85/crm')
def crm_create_v85(body:dict):
    allowed=['name','organization','kind','city','country','email','instagram','website','status','priority','next_action','next_date','notes']
    data={k:str(body.get(k,'')).strip() for k in allowed}
    if not data['name'] and not data['organization']:raise HTTPException(400,'Nom ou structure requis')
    now=_now_v85();cols=allowed+['created_at','updated_at'];vals=[data[k] for k in allowed]+[now,now]
    c=core.conn();cur=c.execute(f"insert into crm_leads ({','.join(cols)}) values ({','.join('?' for _ in cols)})",vals);c.commit();lid=cur.lastrowid;c.close()
    return core.one('select * from crm_leads where id=?',(lid,))

@app.patch('/api/v85/crm/{lid}')
def crm_update_v85(lid:int,body:dict):
    allowed={'name','organization','kind','city','country','email','instagram','website','status','priority','next_action','next_date','notes'}
    data={k:str(v).strip() for k,v in body.items() if k in allowed}
    if not data:return core.one('select * from crm_leads where id=?',(lid,))
    data['updated_at']=_now_v85();sets=','.join(f"{k}=?" for k in data)
    c=core.conn();cur=c.execute(f"update crm_leads set {sets} where id=?",(*data.values(),lid));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Contact introuvable')
    return core.one('select * from crm_leads where id=?',(lid,))

@app.delete('/api/v85/crm/{lid}')
def crm_delete_v85(lid:int):
    c=core.conn();cur=c.execute('delete from crm_leads where id=?',(lid,));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Contact introuvable')
    return {'ok':True}

@app.post('/api/v85/artists')
def artist_create_v85(body:dict):
    name=str(body.get('name','')).strip()
    if not name:raise HTTPException(400,'Nom requis')
    allowed=['real_name','city','country','discipline','bio','website','instagram','email','notes']
    slug=core.slugify(name+'-'+str(int(time.time())))
    cols=['slug','name']+allowed+['tags','milestones']
    vals=[slug,name]+[str(body.get(k,'')).strip() for k in allowed]+[json.dumps(body.get('tags') or [],ensure_ascii=False),json.dumps(body.get('milestones') or [],ensure_ascii=False)]
    c=core.conn();cur=c.execute(f"insert into artists ({','.join(cols)}) values ({','.join('?' for _ in cols)})",vals);c.commit();aid=cur.lastrowid;c.close()
    return core.one('select * from artists where id=?',(aid,))

@app.patch('/api/v85/artists/{aid}')
def artist_update_v85(aid:int,body:dict):
    allowed={'name','real_name','city','country','discipline','bio','website','instagram','email','notes'}
    data={k:str(v).strip() for k,v in body.items() if k in allowed}
    if 'tags' in body:data['tags']=json.dumps(body.get('tags') or [],ensure_ascii=False)
    if 'milestones' in body:data['milestones']=json.dumps(body.get('milestones') or [],ensure_ascii=False)
    if not data:return core.one('select * from artists where id=?',(aid,))
    sets=','.join(f"{k}=?" for k in data);c=core.conn();cur=c.execute(f"update artists set {sets} where id=?",(*data.values(),aid));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Artiste introuvable')
    a=core.one('select * from artists where id=?',(aid,));a['tags']=json.loads(a.get('tags') or '[]');a['milestones']=json.loads(a.get('milestones') or '[]');return a

@app.delete('/api/v85/artists/{aid}')
def artist_delete_v85(aid:int):
    c=core.conn();cur=c.execute('delete from artists where id=?',(aid,));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Artiste introuvable')
    return {'ok':True}


# V86 operational layer: geographic completion, CRM history/reminders and artist portfolios.
_c=core.conn()
core.addcol(_c,'crm_leads','last_contact',"TEXT DEFAULT ''")
core.addcol(_c,'artists','portfolio_url',"TEXT DEFAULT ''")
core.addcol(_c,'artists','featured_image',"TEXT DEFAULT ''")
core.addcol(_c,'artists','statement',"TEXT DEFAULT ''")
core.addcol(_c,'artists','updated_at',"TEXT DEFAULT ''")
_c.executescript("""
CREATE TABLE IF NOT EXISTS crm_history(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  action TEXT DEFAULT '',
  details TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_crm_history_lead ON crm_history(lead_id,id DESC);
CREATE TABLE IF NOT EXISTS artist_works(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id INTEGER,
  title TEXT DEFAULT '',
  year TEXT DEFAULT '',
  medium TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_artist_works_artist ON artist_works(artist_id,id DESC);
""")
_c.commit()
_c.close()

_GEOCODE_LOCK=threading.Lock()
_GEOCODE_STATE={'running':False,'last_run':'','updated':0,'errors':0}

def _missing_geo_v86(limit=60):
    opp=core.rows("""select 'opportunity' kind,id,title,'' venue,city,country from opportunities
                     where status in ('open','rolling') and (lat is null or lon is null)
                     and (coalesce(city,'')!='' or coalesce(country,'')!='') limit ?""",(limit,))
    expo=core.rows("""select 'exhibition' kind,id,title,venue,city,country from exhibitions
                      where (lat is null or lon is null)
                      and (coalesce(city,'')!='' or coalesce(country,'')!='') limit ?""",(limit,))
    return opp+expo

def _geocode_worker_v86():
    if not _GEOCODE_LOCK.acquire(blocking=False):
        return
    _GEOCODE_STATE.update({'running':True,'updated':0,'errors':0})
    try:
        for row in _missing_geo_v86(12):
            query=', '.join(x for x in (row.get('venue'),row.get('city'),row.get('country')) if x)
            if not query:
                continue
            try:
                rr=requests.get(
                    'https://nominatim.openstreetmap.org/search',
                    params={'q':query,'format':'jsonv2','limit':1},
                    headers={'User-Agent':'PLUG-ART-internal-map/1.0'},
                    timeout=8
                )
                arr=rr.json() if rr.ok else []
                if arr:
                    lat=float(arr[0]['lat'])
                    lon=float(arr[0]['lon'])
                    table='opportunities' if row['kind']=='opportunity' else 'exhibitions'
                    c=core.conn()
                    c.execute(f'update {table} set lat=?,lon=? where id=?',(lat,lon,row['id']))
                    c.commit()
                    c.close()
                    _GEOCODE_STATE['updated']+=1
                else:
                    _GEOCODE_STATE['errors']+=1
            except Exception:
                _GEOCODE_STATE['errors']+=1
            time.sleep(1.05)
    finally:
        _GEOCODE_STATE['running']=False
        _GEOCODE_STATE['last_run']=time.strftime('%Y-%m-%dT%H:%M:%S')
        _GEOCODE_LOCK.release()

@app.get('/api/v86/map')
def map_v86(refresh:int=0):
    return core.rows("""select id,title,'' venue,city,country,lat,lon,deadline date,deadline,
                        coalesce(radar_score,score,0) score,source_url,'opportunity' kind
                        from opportunities where lat is not null and lon is not null
                        and status in ('open','rolling')""") + core.rows("""select id,title,venue,city,country,lat,lon,start date,start deadline,
                        0 score,source_url,'exhibition' kind from exhibitions
                        where lat is not null and lon is not null""")

@app.get('/api/v86/geocode/status')
def geocode_status_v86():
    return {**_GEOCODE_STATE,'missing':len(_missing_geo_v86(500))}

@app.post('/api/v86/geocode/run')
def geocode_run_v86():
    if _GEOCODE_STATE['running']:
        return {'started':False,**_GEOCODE_STATE}
    threading.Thread(target=_geocode_worker_v86,daemon=True).start()
    return {'started':True,'missing':len(_missing_geo_v86(500))}

def _crm_history_v86(lead_id,action,details=''):
    c=core.conn()
    c.execute('insert into crm_history(lead_id,action,details,created_at) values(?,?,?,?)',
              (lead_id,action,str(details or '')[:900],_now_v85()))
    c.commit()
    c.close()

@app.get('/api/v86/crm')
def crm_list_v86():
    return core.rows("""select * from crm_leads
                        order by case priority when 'high' then 0 when 'normal' then 1 else 2 end,
                        case when next_date!='' then next_date else '9999-12-31' end,
                        updated_at desc,id desc""")

@app.get('/api/v86/crm/{lid}/history')
def crm_history_list_v86(lid:int):
    return core.rows('select * from crm_history where lead_id=? order by id desc limit 80',(lid,))

@app.post('/api/v86/crm')
def crm_create_v86(body:dict):
    allowed=['name','organization','kind','city','country','email','instagram','website',
             'status','priority','next_action','next_date','last_contact','notes']
    data={k:str(body.get(k,'')).strip() for k in allowed}
    if not data['name'] and not data['organization']:
        raise HTTPException(400,'Nom ou structure requis')
    now=_now_v85()
    cols=allowed+['created_at','updated_at']
    vals=[data[k] for k in allowed]+[now,now]
    c=core.conn()
    cur=c.execute(f"insert into crm_leads ({','.join(cols)}) values ({','.join('?' for _ in cols)})",vals)
    c.commit()
    lid=cur.lastrowid
    c.close()
    _crm_history_v86(lid,'Création','Contact ajouté au CRM')
    return core.one('select * from crm_leads where id=?',(lid,))

@app.patch('/api/v86/crm/{lid}')
def crm_update_v86(lid:int,body:dict):
    old=core.one('select * from crm_leads where id=?',(lid,))
    if not old:
        raise HTTPException(404,'Contact introuvable')
    allowed={'name','organization','kind','city','country','email','instagram','website',
             'status','priority','next_action','next_date','last_contact','notes'}
    data={k:str(v).strip() for k,v in body.items() if k in allowed}
    if not data:
        return old
    data['updated_at']=_now_v85()
    sets=','.join(f"{k}=?" for k in data)
    c=core.conn()
    c.execute(f"update crm_leads set {sets} where id=?",(*data.values(),lid))
    c.commit()
    c.close()
    changed=[]
    for k,v in data.items():
        if k!='updated_at' and str(old.get(k) or '')!=str(v):
            changed.append(f"{k}: {str(old.get(k) or '')[:70]} -> {str(v)[:70]}")
    _crm_history_v86(lid,'Mise à jour',' · '.join(changed[:8]) or 'Informations mises à jour')
    return core.one('select * from crm_leads where id=?',(lid,))

@app.delete('/api/v86/crm/{lid}')
def crm_delete_v86(lid:int):
    c=core.conn()
    cur=c.execute('delete from crm_leads where id=?',(lid,))
    c.execute('delete from crm_history where lead_id=?',(lid,))
    c.commit()
    c.close()
    if not cur.rowcount:
        raise HTTPException(404,'Contact introuvable')
    return {'ok':True}

def _artist_out_v86(a):
    if not a:
        return a
    a['tags']=json.loads(a.get('tags') or '[]')
    a['milestones']=json.loads(a.get('milestones') or '[]')
    return a

@app.post('/api/v86/artists')
def artist_create_v86(body:dict):
    name=str(body.get('name','')).strip()
    if not name:
        raise HTTPException(400,'Nom requis')
    allowed=['real_name','city','country','discipline','bio','website','instagram','email','notes',
             'portfolio_url','featured_image','statement']
    slug=core.slugify(name+'-'+str(int(time.time())))
    cols=['slug','name']+allowed+['tags','milestones','updated_at']
    vals=[slug,name]+[str(body.get(k,'')).strip() for k in allowed]+[
        json.dumps(body.get('tags') or [],ensure_ascii=False),
        json.dumps(body.get('milestones') or [],ensure_ascii=False),
        _now_v85()
    ]
    c=core.conn()
    cur=c.execute(f"insert into artists ({','.join(cols)}) values ({','.join('?' for _ in cols)})",vals)
    c.commit()
    aid=cur.lastrowid
    c.close()
    return _artist_out_v86(core.one('select * from artists where id=?',(aid,)))

@app.patch('/api/v86/artists/{aid}')
def artist_update_v86(aid:int,body:dict):
    allowed={'name','real_name','city','country','discipline','bio','website','instagram','email','notes',
             'portfolio_url','featured_image','statement'}
    data={k:str(v).strip() for k,v in body.items() if k in allowed}
    if 'tags' in body:
        data['tags']=json.dumps(body.get('tags') or [],ensure_ascii=False)
    if 'milestones' in body:
        data['milestones']=json.dumps(body.get('milestones') or [],ensure_ascii=False)
    data['updated_at']=_now_v85()
    sets=','.join(f"{k}=?" for k in data)
    c=core.conn()
    cur=c.execute(f"update artists set {sets} where id=?",(*data.values(),aid))
    c.commit()
    c.close()
    if not cur.rowcount:
        raise HTTPException(404,'Artiste introuvable')
    return _artist_out_v86(core.one('select * from artists where id=?',(aid,)))

@app.delete('/api/v86/artists/{aid}')
def artist_delete_v86(aid:int):
    c=core.conn()
    cur=c.execute('delete from artists where id=?',(aid,))
    c.execute('delete from artist_works where artist_id=?',(aid,))
    c.commit()
    c.close()
    if not cur.rowcount:
        raise HTTPException(404,'Artiste introuvable')
    return {'ok':True}

@app.get('/api/v86/artists/{aid}/works')
def artist_works_v86(aid:int):
    return core.rows('select * from artist_works where artist_id=? order by id desc',(aid,))

@app.post('/api/v86/artists/{aid}/works')
def artist_work_create_v86(aid:int,body:dict):
    if not core.one('select id from artists where id=?',(aid,)):
        raise HTTPException(404,'Artiste introuvable')
    allowed=['title','year','medium','dimensions','image_url','notes']
    vals=[str(body.get(k,'')).strip() for k in allowed]
    c=core.conn()
    cur=c.execute(
        f"insert into artist_works(artist_id,{','.join(allowed)},created_at) values(?,{','.join('?' for _ in allowed)},?)",
        [aid,*vals,_now_v85()]
    )
    c.commit()
    wid=cur.lastrowid
    c.close()
    return core.one('select * from artist_works where id=?',(wid,))

@app.delete('/api/v86/artists/{aid}/works/{wid}')
def artist_work_delete_v86(aid:int,wid:int):
    c=core.conn()
    cur=c.execute('delete from artist_works where id=? and artist_id=?',(wid,aid))
    c.commit()
    c.close()
    if not cur.rowcount:
        raise HTTPException(404,'Œuvre introuvable')
    return {'ok':True}


# V87 Instagram bridge. Uses Meta Graph API with Facebook Login for Instagram professional accounts.
SOCIAL_RENDER_DIR=Path(os.getenv('PLUGART_SOCIAL_RENDER_DIR',str(Path(os.getenv('PLUGART_DB','/data/plugart.db')).parent/'instagram-renders')))
SOCIAL_RENDER_DIR.mkdir(parents=True,exist_ok=True)

@app.post('/api/v87/instagram/upload-render')
def instagram_upload_render_v87(body:dict):
    data_url=str((body or {}).get('data_url') or '')
    if ',' not in data_url or not data_url.startswith('data:image/png;base64,'):
        raise HTTPException(400,'Rendu PNG invalide.')
    encoded=data_url.split(',',1)[1]
    if len(encoded)>18_000_000:
        raise HTTPException(413,'Rendu trop volumineux.')
    try:
        raw=base64.b64decode(encoded,validate=True)
    except Exception:
        raise HTTPException(400,'Rendu PNG illisible.')
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
        raise HTTPException(400,'Le fichier généré n’est pas un PNG valide.')
    token=hashlib.sha256(raw+str(time.time_ns()).encode()).hexdigest()[:24]
    name=f'plugart_instagram_{token}.png'
    (SOCIAL_RENDER_DIR/name).write_bytes(raw)
    cutoff=time.time()-14*86400
    try:
        for old in SOCIAL_RENDER_DIR.glob('plugart_instagram_*.png'):
            if old.stat().st_mtime<cutoff:
                old.unlink(missing_ok=True)
    except Exception:
        pass
    return {'ok':True,'url':'/api/v87/instagram/rendered/'+name,'bytes':len(raw)}

@app.get('/api/v87/instagram/rendered/{filename}')
def instagram_rendered_v87(filename:str):
    if not re.fullmatch(r'plugart_instagram_[a-f0-9]{24}\.png',filename):
        raise HTTPException(404,'Fichier introuvable')
    path=SOCIAL_RENDER_DIR/filename
    if not path.exists() or not path.is_file():
        raise HTTPException(404,'Fichier introuvable')
    return Response(path.read_bytes(),media_type='image/png',headers={'Cache-Control':'public, max-age=1209600, immutable'})

_igc=core.conn()
_igc.executescript("""
CREATE TABLE IF NOT EXISTS instagram_connection(
  id INTEGER PRIMARY KEY CHECK(id=1),
  ig_user_id TEXT DEFAULT '',
  username TEXT DEFAULT '',
  profile_picture_url TEXT DEFAULT '',
  followers_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  page_id TEXT DEFAULT '',
  page_name TEXT DEFAULT '',
  page_access_token TEXT DEFAULT '',
  connected_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS instagram_oauth_state(
  state TEXT PRIMARY KEY,
  created_at INTEGER DEFAULT 0
);
""")
_igc.commit()
_igc.close()

def _ig_graph_version():
    raw=os.getenv('META_GRAPH_VERSION','v26.0').strip() or 'v26.0'
    return raw if raw.startswith('v') else 'v'+raw

def _ig_redirect_uri(request:Request):
    override=os.getenv('META_REDIRECT_URI','').strip()
    if override:
        return override
    host=os.getenv('RAILWAY_PUBLIC_DOMAIN','').strip()
    if host:
        return f"https://{host}/api/v88/instagram/callback"
    return str(request.base_url).rstrip('/')+'/api/v88/instagram/callback'

def _ig_configured():
    return bool(os.getenv('META_APP_ID','').strip() and os.getenv('META_APP_SECRET','').strip())

def _ig_row():
    return core.one('select * from instagram_connection where id=1') or {}

def _ig_error(response):
    try:
        data=response.json()
        err=data.get('error') or {}
        return err.get('message') or data.get('error_message') or response.text[:400]
    except Exception:
        return response.text[:400]

def _ig_request(method,path,token,params=None,data=None,timeout=30):
    url=f"https://graph.facebook.com/{_ig_graph_version()}/{path.lstrip('/')}"
    params=dict(params or {})
    params['access_token']=token
    rr=requests.request(method,url,params=params,data=data,timeout=timeout)
    if not rr.ok:
        raise HTTPException(rr.status_code if rr.status_code<500 else 502,_ig_error(rr))
    return rr.json()

@app.get('/api/v87/instagram/status')
def instagram_status_v87(request:Request):
    row=_ig_row()
    return {
      'ok':True,
      'configured':_ig_configured(),
      'connected':bool(row.get('ig_user_id') and row.get('page_access_token')),
      'username':row.get('username',''),
      'profile_picture_url':row.get('profile_picture_url',''),
      'followers_count':row.get('followers_count',0) or 0,
      'media_count':row.get('media_count',0) or 0,
      'page_name':row.get('page_name',''),
      'connected_at':row.get('connected_at',''),
      'graph_version':_ig_graph_version(),
      'redirect_uri':_ig_redirect_uri(request),
      'required_variables':['META_APP_ID','META_APP_SECRET','META_GRAPH_VERSION'],
      'required_permissions':['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement','instagram_manage_comments'],
      'connection_mode':'facebook-login-professional-account'
    }

@app.get('/api/v87/instagram/login')
def instagram_login_v87(request:Request):
    app_id=os.getenv('META_APP_ID','').strip()
    if not _ig_configured():
        raise HTTPException(503,'Configuration Meta incomplète : ajoute META_APP_ID et META_APP_SECRET sur Railway.')
    state=secrets.token_urlsafe(28)
    now=int(time.time())
    c=core.conn()
    c.execute('delete from instagram_oauth_state where created_at<?',(now-1800,))
    c.execute('insert or replace into instagram_oauth_state(state,created_at) values(?,?)',(state,now))
    c.commit()
    c.close()
    params={
      'client_id':app_id,
      'redirect_uri':_ig_redirect_uri(request),
      'state':state,
      'response_type':'code',
      'scope':'pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,instagram_manage_comments'
    }
    return RedirectResponse('https://www.facebook.com/'+_ig_graph_version()+'/dialog/oauth?'+urlencode(params),status_code=302)

@app.get('/api/v87/instagram/callback')
def instagram_callback_v87(request:Request,code:str='',state:str='',error:str='',error_description:str=''):
    if error:
        return RedirectResponse('/?instagram_error='+urlencode({'e':error_description or error})[2:]+'#social',status_code=302)
    saved=core.one('select state,created_at from instagram_oauth_state where state=?',(state,))
    if not saved or int(saved.get('created_at') or 0)<int(time.time())-1800:
        raise HTTPException(400,'Session de connexion Instagram expirée. Relance la connexion.')
    app_id=os.getenv('META_APP_ID','').strip()
    secret=os.getenv('META_APP_SECRET','').strip()
    redirect=_ig_redirect_uri(request)
    if not code or not app_id or not secret:
        raise HTTPException(400,'Code OAuth ou configuration Meta manquante.')
    token_url='https://graph.facebook.com/'+_ig_graph_version()+'/oauth/access_token'
    rr=requests.get(token_url,params={'client_id':app_id,'client_secret':secret,'redirect_uri':redirect,'code':code},timeout=20)
    if not rr.ok:
        raise HTTPException(400,'Échange OAuth Meta impossible : '+_ig_error(rr))
    short_token=(rr.json() or {}).get('access_token','')
    if not short_token:
        raise HTTPException(400,'Meta n’a pas retourné de jeton.')
    lr=requests.get(token_url,params={'grant_type':'fb_exchange_token','client_id':app_id,'client_secret':secret,'fb_exchange_token':short_token},timeout=20)
    user_token=(lr.json() or {}).get('access_token') if lr.ok else short_token
    pages=_ig_request('GET','me/accounts',user_token,params={'fields':'id,name,access_token,tasks,instagram_business_account'})
    candidates=[p for p in (pages.get('data') or []) if (p.get('instagram_business_account') or {}).get('id') and p.get('access_token')]
    if not candidates:
        raise HTTPException(400,'Aucun compte Instagram professionnel lié à une Page Facebook n’a été trouvé pour ce compte Meta.')
    page=candidates[0]
    ig_id=str((page.get('instagram_business_account') or {}).get('id') or '')
    page_token=page.get('access_token','')
    profile=_ig_request('GET',ig_id,page_token,params={'fields':'id,username,name,profile_picture_url,followers_count,media_count'})
    now_txt=time.strftime('%Y-%m-%dT%H:%M:%S')
    c=core.conn()
    c.execute("""insert or replace into instagram_connection
      (id,ig_user_id,username,profile_picture_url,followers_count,media_count,page_id,page_name,page_access_token,connected_at,updated_at)
      values(1,?,?,?,?,?,?,?,?,?,?)""",
      (ig_id,profile.get('username',''),profile.get('profile_picture_url',''),int(profile.get('followers_count') or 0),
       int(profile.get('media_count') or 0),str(page.get('id') or ''),page.get('name',''),page_token,now_txt,now_txt))
    c.execute('delete from instagram_oauth_state where state=?',(state,))
    c.commit()
    c.close()
    return RedirectResponse('/#social',status_code=302)

@app.post('/api/v87/instagram/disconnect')
def instagram_disconnect_v87():
    c=core.conn()
    c.execute('delete from instagram_connection where id=1')
    c.commit()
    c.close()
    return {'ok':True}

@app.get('/api/v87/instagram/media')
def instagram_media_v87(limit:int=12):
    row=_ig_row()
    token=row.get('page_access_token','')
    ig_id=row.get('ig_user_id','')
    if not token or not ig_id:
        raise HTTPException(409,'Instagram n’est pas connecté.')
    limit=max(1,min(int(limit or 12),24))
    data=_ig_request('GET',f"{ig_id}/media",token,params={
      'fields':'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
      'limit':limit
    })
    return {'ok':True,'items':data.get('data') or []}

def _ig_wait_container(container_id,token,seconds=28):
    end=time.time()+seconds
    last={}
    while time.time()<end:
        last=_ig_request('GET',container_id,token,params={'fields':'status_code,status'},timeout=15)
        code=str(last.get('status_code') or '').upper()
        if code=='FINISHED':
            return last
        if code in {'ERROR','EXPIRED'}:
            raise HTTPException(502,'Instagram n’a pas pu préparer le média : '+str(last.get('status') or code))
        time.sleep(1.4)
    raise HTTPException(504,'Instagram prépare encore le média. Réessaie dans quelques instants.')

def _ig_create_container(ig_id,token,url,caption='',carousel_item=False):
    low=url.lower().split('?')[0]
    is_video=low.endswith(('.mp4','.mov','.m4v'))
    payload={'is_carousel_item':'true'} if carousel_item else {}
    if is_video:
        payload.update({'media_type':'VIDEO' if carousel_item else 'REELS','video_url':url})
    else:
        payload['image_url']=url
    if caption and not carousel_item:
        payload['caption']=caption
    data=_ig_request('POST',f"{ig_id}/media",token,data=payload,timeout=35)
    cid=str(data.get('id') or '')
    if not cid:
        raise HTTPException(502,'Instagram n’a pas créé le conteneur média.')
    if is_video:
        _ig_wait_container(cid,token)
    return cid

@app.post('/api/v87/instagram/publish')
def instagram_publish_v87(body:dict):
    row=_ig_row()
    token=row.get('page_access_token','')
    ig_id=row.get('ig_user_id','')
    if not token or not ig_id:
        raise HTTPException(409,'Instagram n’est pas connecté.')
    caption=str((body or {}).get('caption') or '').strip()[:2200]
    urls=[]
    for u in ((body or {}).get('media_urls') or []):
        u=str(u or '').strip()
        if u.startswith(('https://','http://')) and u not in urls:
            urls.append(u)
    urls=urls[:10]
    if not urls:
        raise HTTPException(400,'Ajoute au moins un média public au brouillon.')
    if len(urls)==1:
        creation_id=_ig_create_container(ig_id,token,urls[0],caption,False)
    else:
        children=[_ig_create_container(ig_id,token,u,'',True) for u in urls]
        parent=_ig_request('POST',f"{ig_id}/media",token,data={
          'media_type':'CAROUSEL',
          'children':','.join(children),
          'caption':caption
        },timeout=35)
        creation_id=str(parent.get('id') or '')
        if not creation_id:
            raise HTTPException(502,'Instagram n’a pas créé le carrousel.')
    published=_ig_request('POST',f"{ig_id}/media_publish",token,data={'creation_id':creation_id},timeout=35)
    media_id=str(published.get('id') or '')
    if not media_id:
        raise HTTPException(502,'Instagram n’a pas confirmé la publication.')
    permalink=''
    try:
        permalink=(_ig_request('GET',media_id,token,params={'fields':'permalink'},timeout=15) or {}).get('permalink','')
    except Exception:
        pass
    return {'ok':True,'media_id':media_id,'permalink':permalink,'count':len(urls)}


# V88 Instagram control center: setup diagnostics, comments and Meta webhooks.
_ig88=core.conn()
_ig88.execute("""CREATE TABLE IF NOT EXISTS instagram_webhook_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_type TEXT DEFAULT '',
  event_json TEXT DEFAULT '',
  received_at TEXT DEFAULT ''
)""")
_ig88.commit()
_ig88.close()

def _ig_app_domain(request:Request):
    host=os.getenv('RAILWAY_PUBLIC_DOMAIN','').strip()
    if host:
        return host
    return request.url.hostname or ''

def _ig_webhook_url(request:Request):
    host=os.getenv('RAILWAY_PUBLIC_DOMAIN','').strip()
    if host:
        return f"https://{host}/api/v88/meta/webhook"
    return str(request.base_url).rstrip('/')+'/api/v88/meta/webhook'

def _ig_webhook_token():
    return os.getenv('META_WEBHOOK_VERIFY_TOKEN','').strip()

@app.get('/api/v88/instagram/status')
def instagram_status_v88(request:Request):
    row=_ig_row()
    app_id=bool(os.getenv('META_APP_ID','').strip())
    app_secret=bool(os.getenv('META_APP_SECRET','').strip())
    webhook=bool(_ig_webhook_token())
    return {
      'ok':True,
      'configured':bool(app_id and app_secret),
      'connected':bool(row.get('ig_user_id') and row.get('page_access_token')),
      'app_id_configured':app_id,
      'app_secret_configured':app_secret,
      'webhook_token_configured':webhook,
      'username':row.get('username',''),
      'profile_picture_url':row.get('profile_picture_url',''),
      'followers_count':row.get('followers_count',0) or 0,
      'media_count':row.get('media_count',0) or 0,
      'page_name':row.get('page_name',''),
      'connected_at':row.get('connected_at',''),
      'graph_version':_ig_graph_version(),
      'app_domain':_ig_app_domain(request),
      'redirect_uri':_ig_redirect_uri(request),
      'webhook_url':_ig_webhook_url(request),
      'webhook_verify_token':_ig_webhook_token(),
      'required_variables':['META_APP_ID','META_APP_SECRET','META_GRAPH_VERSION','META_WEBHOOK_VERIFY_TOKEN'],
      'required_permissions':['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement','instagram_manage_comments'],
      'optional_permissions':['instagram_manage_insights'],
      'connection_mode':'facebook-login-professional-account'
    }

@app.get('/api/v88/instagram/login')
def instagram_login_v88(request:Request):
    return instagram_login_v87(request)

@app.get('/api/v88/instagram/callback')
def instagram_callback_v88(request:Request,code:str='',state:str='',error:str='',error_description:str=''):
    return instagram_callback_v87(request,code,state,error,error_description)

@app.post('/api/v88/instagram/disconnect')
def instagram_disconnect_v88():
    return instagram_disconnect_v87()

@app.get('/api/v88/instagram/media')
def instagram_media_v88(limit:int=30):
    return instagram_media_v87(limit)

@app.post('/api/v88/instagram/publish')
def instagram_publish_v88(body:dict):
    return instagram_publish_v87(body)

@app.get('/api/v88/instagram/media/{media_id}/comments')
def instagram_comments_v88(media_id:str):
    row=_ig_row()
    token=row.get('page_access_token','')
    if not token:
        raise HTTPException(409,'Instagram n’est pas connecté.')
    data=_ig_request('GET',f"{media_id}/comments",token,params={
      'fields':'id,text,username,timestamp,like_count',
      'limit':50
    })
    return {'ok':True,'items':data.get('data') or []}

@app.post('/api/v88/instagram/comments/{comment_id}/reply')
def instagram_reply_comment_v88(comment_id:str,body:dict):
    row=_ig_row()
    token=row.get('page_access_token','')
    if not token:
        raise HTTPException(409,'Instagram n’est pas connecté.')
    message=str((body or {}).get('message') or '').strip()
    if not message:
        raise HTTPException(400,'Réponse vide.')
    result=_ig_request('POST',f"{comment_id}/replies",token,data={'message':message[:1000]},timeout=25)
    return {'ok':True,'id':result.get('id','')}

@app.get('/api/v88/instagram/diagnostic')
def instagram_diagnostic_v88(request:Request):
    row=_ig_row()
    checks=[
      {'label':'META_APP_ID','ok':bool(os.getenv('META_APP_ID','').strip())},
      {'label':'META_APP_SECRET','ok':bool(os.getenv('META_APP_SECRET','').strip())},
      {'label':'OAuth Redirect URI','ok':bool(_ig_redirect_uri(request))},
      {'label':'Webhook Verify Token','ok':bool(_ig_webhook_token())},
      {'label':'Compte Instagram autorisé','ok':bool(row.get('ig_user_id') and row.get('page_access_token'))}
    ]
    profile_ok=False
    if checks[-1]['ok']:
        try:
            _ig_request('GET',str(row.get('ig_user_id')),row.get('page_access_token'),params={'fields':'id,username'},timeout=12)
            profile_ok=True
        except Exception:
            profile_ok=False
        checks.append({'label':'Jeton Meta valide','ok':profile_ok})
    return {'ok':all(x['ok'] for x in checks[:4]),'checks':checks,'graph_version':_ig_graph_version()}

@app.get('/api/v88/meta/webhook')
def meta_webhook_verify_v88(request:Request):
    mode=request.query_params.get('hub.mode','')
    token=request.query_params.get('hub.verify_token','')
    challenge=request.query_params.get('hub.challenge','')
    expected=_ig_webhook_token()
    if mode=='subscribe' and expected and hmac.compare_digest(token,expected):
        return Response(content=challenge,media_type='text/plain')
    raise HTTPException(403,'Webhook Meta non vérifié.')

@app.post('/api/v88/meta/webhook')
async def meta_webhook_receive_v88(request:Request):
    raw=await request.body()
    secret=os.getenv('META_APP_SECRET','').encode()
    signature=request.headers.get('x-hub-signature-256','')
    if secret and signature.startswith('sha256='):
        expected='sha256='+hmac.new(secret,raw,hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature,expected):
            raise HTTPException(403,'Signature Meta invalide.')
    try:
        payload=json.loads(raw.decode('utf-8') or '{}')
    except Exception:
        raise HTTPException(400,'Payload webhook invalide.')
    c=core.conn()
    c.execute('insert into instagram_webhook_events(object_type,event_json,received_at) values(?,?,?)',
              (str(payload.get('object') or ''),json.dumps(payload,ensure_ascii=False)[:120000],time.strftime('%Y-%m-%dT%H:%M:%S')))
    c.commit()
    c.close()
    return {'ok':True}

@app.get('/api/v88/meta/webhook/events')
def meta_webhook_events_v88(limit:int=40):
    limit=max(1,min(int(limit or 40),100))
    return core.rows('select id,object_type,event_json,received_at from instagram_webhook_events order by id desc limit ?',(limit,))


# V90 Interface Lab: persistent design-system configuration and version history.
_v90c=core.conn()
_v90c.executescript("""
CREATE TABLE IF NOT EXISTS interface_builder_config(
  id INTEGER PRIMARY KEY CHECK(id=1),
  config_json TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS interface_builder_versions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  config_json TEXT DEFAULT '{}',
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT ''
);
""")
_v90c.commit()
_v90c.close()

_V90_DEFAULT_CONFIG={
  'accent':'violet',
  'surface':'editorial',
  'density':'balanced',
  'radius':22,
  'fontScale':1.0,
  'motion':'subtle',
  'sidebar':'standard',
  'plugyConcept':'monolith'
}
_V90_ALLOWED={
  'accent':{'violet','cyan','coral','cobalt','lime','mono'},
  'surface':{'editorial','glass','flat'},
  'density':{'compact','balanced','airy'},
  'motion':{'off','subtle','expressive'},
  'sidebar':{'compact','standard'},
  'plugyConcept':{'pearl','monolith','halo','flux','prism','orbit','fold','softmodule','totem','pixel','lens','ribbon','capsule','magnetic','void'}
}

def _v90_normalize_config(raw):
    raw=raw if isinstance(raw,dict) else {}
    out=dict(_V90_DEFAULT_CONFIG)
    for key,allowed in _V90_ALLOWED.items():
        val=str(raw.get(key,out[key])).strip()
        if val in allowed:
            out[key]=val
    try:
        out['radius']=max(10,min(34,int(float(raw.get('radius',out['radius'])))))
    except Exception:
        pass
    try:
        out['fontScale']=max(.88,min(1.16,round(float(raw.get('fontScale',out['fontScale'])),2)))
    except Exception:
        pass
    return out

def _v90_config_row():
    row=core.one('select config_json,updated_at from interface_builder_config where id=1') or {}
    try:
        cfg=json.loads(row.get('config_json') or '{}')
    except Exception:
        cfg={}
    return _v90_normalize_config(cfg),row.get('updated_at','')

def _v90_versions():
    rows=core.rows('select id,name,published,created_at,config_json from interface_builder_versions order by id desc limit 20')
    out=[]
    for row in rows:
        try:
            config=json.loads(row.get('config_json') or '{}')
        except Exception:
            config={}
        out.append({
          'id':row.get('id'),
          'name':row.get('name',''),
          'published':bool(row.get('published')),
          'created_at':row.get('created_at',''),
          'config':_v90_normalize_config(config)
        })
    return out

@app.get('/api/v90/builder/config')
def builder_config_v90():
    cfg,updated=_v90_config_row()
    return {'ok':True,'config':cfg,'updated_at':updated,'versions':_v90_versions()}

@app.patch('/api/v90/builder/config')
def builder_config_update_v90(body:dict):
    cfg=_v90_normalize_config((body or {}).get('config') or {})
    name=str((body or {}).get('name') or 'Interface Lab').strip()[:120]
    publish=bool((body or {}).get('publish'))
    now=time.strftime('%Y-%m-%dT%H:%M:%S')
    payload=json.dumps(cfg,ensure_ascii=False)
    c=core.conn()
    c.execute("""insert into interface_builder_config(id,config_json,updated_at) values(1,?,?)
                 on conflict(id) do update set config_json=excluded.config_json,updated_at=excluded.updated_at""",(payload,now))
    if publish:
        c.execute('update interface_builder_versions set published=0')
    cur=c.execute('insert into interface_builder_versions(name,config_json,published,created_at) values(?,?,?,?)',
                  (name,payload,1 if publish else 0,now))
    c.commit()
    c.close()
    return {'ok':True,'config':cfg,'version_id':cur.lastrowid,'published':publish,'versions':_v90_versions()}

@app.get('/api/v90/builder/versions')
def builder_versions_v90():
    return {'ok':True,'items':_v90_versions()}

@app.post('/api/v90/builder/versions/{version_id}/restore')
def builder_restore_v90(version_id:int):
    row=core.one('select config_json from interface_builder_versions where id=?',(version_id,))
    if not row:
        raise HTTPException(404,'Version introuvable')
    try:
        cfg=_v90_normalize_config(json.loads(row.get('config_json') or '{}'))
    except Exception:
        cfg=dict(_V90_DEFAULT_CONFIG)
    now=time.strftime('%Y-%m-%dT%H:%M:%S')
    c=core.conn()
    c.execute("""insert into interface_builder_config(id,config_json,updated_at) values(1,?,?)
                 on conflict(id) do update set config_json=excluded.config_json,updated_at=excluded.updated_at""",
              (json.dumps(cfg,ensure_ascii=False),now))
    c.commit();c.close()
    return {'ok':True,'config':cfg}

@app.get('/api/v65/status')
@app.get('/api/v66/status')
@app.get('/api/v67/status')
@app.get('/api/v68/status')
@app.get('/api/v69/status')
@app.get('/api/v70/status')
@app.get('/api/v71/status')
@app.get('/api/v72/status')
@app.get('/api/v73/status')
@app.get('/api/v74/status')
@app.get('/api/v75/status')
@app.get('/api/v77/status')
@app.get('/api/v78/status')
@app.get('/api/v79/status')
@app.get('/api/v80/status')
@app.get('/api/v81/status')
@app.get('/api/v82/status')
@app.get('/api/v83/status')
@app.get('/api/v84/status')
@app.get('/api/v85/status')
@app.get('/api/v86/status')
@app.get('/api/v87/status')
@app.get('/api/v88/status')
@app.get('/api/v89/status')
@app.get('/api/v90/status')
@app.get('/api/v100/status')
@app.get('/api/v101/status')
def status_v90():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'101.0',
      'ui':'plug-art-os-v101',
      'reference_direction':'V101 PLUG ART OS: stabilized iPhone interactions, safe-area layout, reliable touch targets, focus workspace and preserved production engines',
      'marketing_blocks':False,
      'internal_workspace':True,
      'runtime_split':True,
      'navigation_fixed':True,
      'typography':'Archivo + Inter Tight + IBM Plex Mono',
      'legacy_index_served':False,
      'single_mascot':True,
      'plugy_reference':'official-v84-master-strict',
      'plugy_expected_sha256':PLUGY_REFERENCE_SHA256,
      'plugy_reference_match':hashlib.sha256(raw).hexdigest()==PLUGY_REFERENCE_SHA256 if raw else False,
      'plugy_model_path':'/static/plugy_official_v84.glb',
      'plugy_material':RESULT.get('material'),
      'plugy_official_base':RESULT.get('official_base','V26'),
      'plugy_profile':RESULT.get('profile'),
      'legacy_model_refs_in_dashboard':sum(DASH.read_text(encoding='utf-8').count(x) for x in ('PLUGY_final_animated.glb','/static/plugy.glb')) if DASH.exists() else -1,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_animations':RESULT.get('animations',[]),
      'studio':'XXL typography + multi-frame + text-only + PLUG ART art generation',
      'layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'background':'premium responsive PLUG ART Control Room with agent-centered command workspace and refined editorial surfaces'
    }

print(f"PLUG_ART_V101_READY ui=control_room builder=interface_lab plugy2=15_concepts plugy=hero_centered instagram=control_center command_palette=on sidebar=adaptive graph={_ig_graph_version()} instagram_configured={_ig_configured()} studio=instagram_queue voice=streaming internal=on plugy_bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
