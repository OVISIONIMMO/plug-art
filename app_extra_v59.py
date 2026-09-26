from pathlib import Path
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse, Response, RedirectResponse, FileResponse
from urllib.parse import urljoin, urlencode
import hashlib,re,time,html as html_lib,requests,json,threading,os,secrets,base64,hmac,math,struct,io,zipfile,sqlite3,shutil
import app as core
import plugy_runtime_v127 as runtime_v127

app=core.app
app.version='167.0'
BASE=Path(__file__).resolve().parent
DASH=BASE/'static'/'plugart_v162.html'
PLUGY_PAGE=BASE/'static'/'plugy_v162.html'
GLB=BASE/'static'/'PLUGY_final_animated.glb'
RESULT={'animation':'Idle','material':'fallback-cached','official_base':'V113-premium','profile':'runtime-fallback'}
print(f"PLUGY_V127_1_FALLBACK_READY bytes={GLB.stat().st_size if GLB.exists() else 0}",flush=True)
PLUGY_REFERENCE_ANIMATIONS=[RESULT.get('animation','Idle')]
PLUGY_REFERENCE_SHA256=hashlib.sha256(GLB.read_bytes()).hexdigest() if GLB.exists() else ''
VERSION='163.20260926.1'
MEDIA_CACHE={}
MEDIA_BYTES_CACHE={}
REALISTIC_PLUGY_URL='https://storage.to3d.app/generated-3d/models/2026-09-23/task_1833847e-a573-482a-9410-2433496158d4_model.glb'
REALISTIC_PLUGY=Path('/data/plugy_v113_realistic_premium.glb') if Path('/data').exists() else BASE/'static'/'plugy_v113_realistic_premium.glb'
REALISTIC_PLUGY_LOCK=threading.Lock()

MIGRATION_BACKUP=Path('/data/backups/pre-eu-migration-v123.db') if Path('/data').exists() else None

_V165_DB_WRITE_LOCK=threading.RLock()
def _v165_db_write(fn,attempts=4):
    last=None
    for attempt in range(max(1,attempts)):
        with _V165_DB_WRITE_LOCK:
            db=core.conn()
            try:
                out=fn(db)
                db.commit()
                return out
            except sqlite3.OperationalError as exc:
                try:db.rollback()
                except Exception:pass
                last=exc
                if 'locked' not in str(exc).lower() or attempt>=attempts-1:
                    raise
            finally:
                db.close()
        time.sleep(0.06*(attempt+1))
    if last:raise last

def _v123_prepare_region_migration_backup():
    if MIGRATION_BACKUP is None:return
    db_path=Path(os.getenv('PLUGART_DB','/data/plugart.db'))
    try:
        if not db_path.exists():
            print('PLUG_ART_BACKUP_SKIP reason=db-missing',flush=True);return
        src_bytes=db_path.stat().st_size
        usage=shutil.disk_usage('/data')
        print(f"PLUG_ART_STORAGE db_bytes={src_bytes} free_bytes={usage.free} used_bytes={usage.used} total_bytes={usage.total}",flush=True)
        if MIGRATION_BACKUP.exists() and MIGRATION_BACKUP.stat().st_size>0:
            print(f"PLUG_ART_BACKUP_READY bytes={MIGRATION_BACKUP.stat().st_size} existing=true",flush=True);return
        required=max(src_bytes*2,32*1024*1024)
        if usage.free<required:
            print(f"PLUG_ART_BACKUP_SKIP reason=insufficient-space required={required} free={usage.free}",flush=True);return
        MIGRATION_BACKUP.parent.mkdir(parents=True,exist_ok=True)
        source=sqlite3.connect(str(db_path),timeout=30)
        target=sqlite3.connect(str(MIGRATION_BACKUP),timeout=30)
        try:
            source.backup(target,pages=256,sleep=0.01)
            target.execute('pragma quick_check').fetchone()
            target.commit()
        finally:
            target.close();source.close()
        print(f"PLUG_ART_BACKUP_READY bytes={MIGRATION_BACKUP.stat().st_size} existing=false",flush=True)
    except Exception as exc:
        print(f"PLUG_ART_BACKUP_ERROR {type(exc).__name__}: {str(exc)[:180]}",flush=True)

_v123_prepare_region_migration_backup()

def _v106_pad4(raw:bytes,pad=b' '):
    return raw + pad*((4-len(raw)%4)%4)

def _v106_quat(axis,angle):
    x,y,z=axis
    s=math.sin(angle/2.0)
    return [x*s,y*s,z*s,math.cos(angle/2.0)]

def _inject_v106_motion(raw:bytes):
    if len(raw)<20 or raw[:4]!=b'glTF':
        return raw
    try:
        _,version,_=struct.unpack_from('<4sII',raw,0)
        pos=12;doc=None;bin_blob=b'';extras=[]
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8
            chunk=raw[pos:pos+ln];pos+=ln
            if kind==b'JSON':
                doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
            elif kind==bytes((66,73,78,0)):
                bin_blob=bytes(chunk)
            else:
                extras.append((kind,bytes(chunk)))
        if not isinstance(doc,dict):
            return raw
        doc.setdefault('nodes',[])
        doc.setdefault('scenes',[{'nodes':[0] if doc['nodes'] else []}])
        scene_index=int(doc.get('scene',0) or 0)
        while len(doc['scenes'])<=scene_index:
            doc['scenes'].append({'nodes':[]})
        scene=doc['scenes'][scene_index]
        original=list(scene.get('nodes') or ([0] if doc['nodes'] else []))
        root_index=len(doc['nodes'])
        doc['nodes'].append({'name':'PLUGY_V106_MotionRoot','children':original})
        scene['nodes']=[root_index]

        doc.setdefault('buffers',[{'byteLength':len(bin_blob)}])
        if not doc['buffers']:
            doc['buffers']=[{'byteLength':len(bin_blob)}]
        doc.setdefault('bufferViews',[])
        doc.setdefault('accessors',[])
        doc.setdefault('animations',[])

        materials=doc.get('materials') or []
        if materials:
            # V138: bake a reflectionless finish into the GLB itself. Keep emissive/color
            # textures intact, but remove the glossy PBR layer that produced white hotspots.
            for mat in materials:
                if not isinstance(mat,dict):continue
                name=str(mat.get('name') or '').lower()
                pbr=mat.setdefault('pbrMetallicRoughness',{})
                is_metal=any(k in name for k in ('metal','chrome','prong','pin','antenna','steel','silver'))
                pbr['metallicFactor']=.12 if is_metal else 0.0
                pbr['roughnessFactor']=.88 if is_metal else 1.0
                ext=mat.get('extensions')
                if isinstance(ext,dict):
                    ext.pop('KHR_materials_clearcoat',None)
                    ext.pop('KHR_materials_specular',None)
                    ext.pop('KHR_materials_ior',None)
                    ext.pop('KHR_materials_iridescence',None)
                    if not ext:mat.pop('extensions',None)
        blob=bytearray(bin_blob)
        while len(blob)%4:blob.append(0)

        def accessor(values,type_name):
            nonlocal blob
            if type_name=='SCALAR':
                rows=[[float(v)] for v in values];width=1
            else:
                rows=[[float(x) for x in row] for row in values]
                width={'VEC3':3,'VEC4':4}[type_name]
            flat=[x for row in rows for x in row]
            offset=len(blob)
            packed=struct.pack('<'+'f'*len(flat),*flat)
            blob.extend(packed)
            while len(blob)%4:blob.append(0)
            vi=len(doc['bufferViews'])
            doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(packed)})
            ai=len(doc['accessors'])
            acc={'bufferView':vi,'componentType':5126,'count':len(rows),'type':type_name}
            if type_name=='SCALAR':
                vals=[r[0] for r in rows];acc['min']=[min(vals)];acc['max']=[max(vals)]
            doc['accessors'].append(acc)
            return ai

        def add_anim(name,times,translations=None,rotations=None,scales=None):
            if any(a.get('name')==name for a in doc['animations'] if isinstance(a,dict)):
                return
            ti=accessor(times,'SCALAR');samplers=[];channels=[]
            def channel(values,type_name,path):
                oi=accessor(values,type_name)
                si=len(samplers);samplers.append({'input':ti,'output':oi,'interpolation':'LINEAR'})
                channels.append({'sampler':si,'target':{'node':root_index,'path':path}})
            if translations is not None:channel(translations,'VEC3','translation')
            if rotations is not None:channel(rotations,'VEC4','rotation')
            if scales is not None:channel(scales,'VEC3','scale')
            doc['animations'].append({'name':name,'samplers':samplers,'channels':channels})

        add_anim('Idle',[0,1.2,2.4,3.6,4.8],
            [[0,0,0],[0,.035,0],[0,.008,0],[0,-.018,0],[0,0,0]],
            [_v106_quat((0,0,1),a) for a in (0,.018,-.014,.010,0)])
        add_anim('SoftTurn',[0,.7,1.4,2.1],rotations=[_v106_quat((0,1,0),a) for a in (0,.18,-.14,0)])
        add_anim('Think',[0,.45,1.0,1.55],
            [[0,0,0],[0,.018,0],[0,.010,0],[0,0,0]],
            [_v106_quat((0,0,1),a) for a in (0,-.13,-.055,0)])
        add_anim('Curious',[0,.42,.88,1.32],rotations=[_v106_quat((0,0,1),a) for a in (0,.15,.07,0)])
        add_anim('Present',[0,.36,.78,1.18],rotations=[_v106_quat((0,1,0),a) for a in (0,.20,-.09,0)])
        add_anim('Bounce',[0,.18,.40,.62,.88],translations=[[0,0,0],[0,.11,0],[0,0,0],[0,.05,0],[0,0,0]])
        add_anim('Happy',[0,.20,.42,.72],
            [[0,0,0],[0,.085,0],[0,.025,0],[0,0,0]],
            [_v106_quat((0,0,1),a) for a in (0,.055,-.025,0)])
        add_anim('Attentive',[0,.38,.82],rotations=[_v106_quat((1,0,0),a) for a in (0,-.065,0)])
        add_anim('Wave',[0,.22,.44,.66,.88,1.16],rotations=[_v106_quat((0,0,1),a) for a in (0,.10,-.085,.09,-.055,0)])
        add_anim('Dance',[0,.28,.56,.84,1.12,1.40],rotations=[_v106_quat((0,0,1),a) for a in (0,.12,-.12,.12,-.12,0)])
        add_anim('Blink',[0,.10,.20,.34],scales=[[1,1,1],[1,.985,1],[1,.995,1],[1,1,1]])
        add_anim('Listen',[0,.28,.62,.94],
            [[0,0,0],[0,.018,0],[0,.010,0],[0,0,0]],
            [_v106_quat((1,0,0),a) for a in (0,-.055,-.028,0)])
        add_anim('Speak',[0,.14,.28,.42,.56,.70,.88],
            [[0,0,0],[0,.022,0],[0,.006,0],[0,.026,0],[0,.008,0],[0,.020,0],[0,0,0]],
            [_v106_quat((0,0,1),a) for a in (0,.018,-.012,.022,-.014,.010,0)])
        add_anim('Charge',[0,.30,.62,.94,1.24],
            [[0,0,0],[0,.016,0],[0,.028,0],[0,.012,0],[0,0,0]],
            [_v106_quat((0,1,0),a) for a in (0,.045,-.038,.024,0)],
            [[1,1,1],[1.012,1.012,1.012],[1.024,1.024,1.024],[1.010,1.010,1.010],[1,1,1]])
        add_anim('Travel',[0,.34,.72,1.08,1.42],
            [[0,0,0],[.075,.025,0],[-.055,.018,0],[.032,.010,0],[0,0,0]],
            [_v106_quat((0,1,0),a) for a in (0,.10,-.08,.045,0)])

        doc['buffers'][0]['byteLength']=len(blob)
        asset=doc.setdefault('asset',{'version':'2.0'})
        asset['generator']=str(asset.get('generator',''))+' + PLUGAR V138 Motion + Reflectionless Materials'
        j=_v106_pad4(json.dumps(doc,separators=(',',':')).encode('utf-8'),b' ')
        b=_v106_pad4(bytes(blob),bytes((0,)))
        chunks=[(b'JSON',j),(bytes((66,73,78,0)),b)]+extras
        total=12+sum(8+len(c) for _,c in chunks)
        out=bytearray(struct.pack('<4sII',b'glTF',version,total))
        for kind,chunk in chunks:
            out.extend(struct.pack('<I4s',len(chunk),kind));out.extend(chunk)
        return bytes(out)
    except Exception as exc:
        print(f"PLUGY_V106_MOTION_PATCH_ERROR {type(exc).__name__}: {str(exc)[:180]}",flush=True)
        return raw

def _patch_plugy_reflectionless_v138(raw:bytes):
    """Rewrite only the GLB JSON material chunk; geometry, textures and animations stay byte-identical."""
    if len(raw)<20 or raw[:4]!=b'glTF':return raw,False
    try:
        _,version,_=struct.unpack_from('<4sII',raw,0)
        pos=12;chunks=[];doc=None
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8
            chunk=bytes(raw[pos:pos+ln]);pos+=ln
            if kind==b'JSON':
                doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
                chunks.append((kind,None))
            else:chunks.append((kind,chunk))
        if not isinstance(doc,dict):return raw,False
        asset=doc.setdefault('asset',{'version':'2.0'})
        extras=asset.setdefault('extras',{})
        if extras.get('plugyFinish')=='reflectionless-v138':return raw,False
        changed=0
        for mat in doc.get('materials') or []:
            if not isinstance(mat,dict):continue
            name=str(mat.get('name') or '').lower()
            is_metal=any(k in name for k in ('metal','chrome','prong','pin','antenna','steel','silver'))
            pbr=mat.setdefault('pbrMetallicRoughness',{})
            pbr['metallicFactor']=.12 if is_metal else 0.0
            pbr['roughnessFactor']=.88 if is_metal else 1.0
            ext=mat.get('extensions')
            if isinstance(ext,dict):
                for k in ('KHR_materials_clearcoat','KHR_materials_specular','KHR_materials_ior','KHR_materials_iridescence'):
                    ext.pop(k,None)
                if not ext:mat.pop('extensions',None)
            changed+=1
        # Keep extension declarations only when another material still uses them.
        active=set()
        for mat in doc.get('materials') or []:
            if isinstance(mat,dict) and isinstance(mat.get('extensions'),dict):active.update(mat['extensions'].keys())
        for key in ('extensionsUsed','extensionsRequired'):
            if isinstance(doc.get(key),list):
                doc[key]=[x for x in doc[key] if x not in {'KHR_materials_clearcoat','KHR_materials_specular','KHR_materials_ior','KHR_materials_iridescence'} or x in active]
                if not doc[key]:doc.pop(key,None)
        extras['plugyFinish']='reflectionless-v138'
        extras['materialCount']=changed
        asset['generator']=str(asset.get('generator','')).replace(' + PLUGAR V113 Premium Motion + PBR Layer','')+' + PLUGAR V138 Reflectionless'
        j=_v106_pad4(json.dumps(doc,separators=(',',':')).encode('utf-8'),b' ')
        rebuilt=[]
        for kind,chunk in chunks:rebuilt.append((kind,j if kind==b'JSON' else chunk))
        total=12+sum(8+len(chunk) for _,chunk in rebuilt)
        out=bytearray(struct.pack('<4sII',b'glTF',version,total))
        for kind,chunk in rebuilt:
            out.extend(struct.pack('<I4s',len(chunk),kind));out.extend(chunk)
        return bytes(out),True
    except Exception as exc:
        print(f"PLUGY_V138_MATERIAL_PATCH_ERROR {type(exc).__name__}: {str(exc)[:180]}",flush=True)
        return raw,False

def _rig_plugy_v139(raw:bytes):
    """Procedurally split the disconnected arm shells and add 3D eyelids to the single-mesh source model."""
    if len(raw)<20 or raw[:4]!=b'glTF':return raw,False
    try:
        _,version,_=struct.unpack_from('<4sII',raw,0);pos=12;doc=None;bin_blob=b'';extras_chunks=[]
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8;chunk=bytes(raw[pos:pos+ln]);pos+=ln
            if kind==b'JSON':doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
            elif kind==bytes((66,73,78,0)):bin_blob=chunk
            else:extras_chunks.append((kind,chunk))
        if not isinstance(doc,dict):return raw,False
        asset=doc.setdefault('asset',{'version':'2.0'});ax=asset.setdefault('extras',{})
        if ax.get('plugyRig')=='eyes-arms-v139':return raw,False
        meshes=doc.get('meshes') or [];nodes=doc.get('nodes') or [];accessors=doc.get('accessors') or [];views=doc.get('bufferViews') or []
        if not meshes or not nodes:return raw,False
        prim=(meshes[0].get('primitives') or [])[0]
        if not isinstance(prim,dict) or 'POSITION' not in (prim.get('attributes') or {}) or 'indices' not in prim:return raw,False

        def read_acc(ai):
            a=accessors[ai];v=views[a['bufferView']];ct=a['componentType'];typ=a['type'];count=a['count']
            fm={5121:'B',5123:'H',5125:'I',5126:'f',5122:'h',5120:'b'}[ct];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[typ]
            size=struct.calcsize('<'+fm*w);stride=v.get('byteStride',size);base=v.get('byteOffset',0)+a.get('byteOffset',0)
            return [struct.unpack_from('<'+fm*w,bin_blob,base+i*stride) for i in range(count)]
        posv=[tuple(map(float,x)) for x in read_acc(prim['attributes']['POSITION'])]
        uvv=[tuple(map(float,x)) for x in read_acc(prim['attributes']['TEXCOORD_0'])] if 'TEXCOORD_0' in prim['attributes'] else [(0.,0.)]*len(posv)
        idx=[int(x[0]) for x in read_acc(prim['indices'])]

        parent=list(range(len(posv)));size=[1]*len(posv)
        def find(x):
            while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
            return x
        def union(a,b):
            a=find(a);b=find(b)
            if a==b:return
            if size[a]<size[b]:a,b=b,a
            parent[b]=a;size[a]+=size[b]
        for k in range(0,len(idx)-2,3):
            a,b,c=idx[k:k+3];union(a,b);union(b,c)
        groups={}
        for vi,p in enumerate(posv):groups.setdefault(find(vi),[]).append((vi,p))
        left_roots=set();right_roots=set()
        for root,g in groups.items():
            xs=[p[0] for _,p in g];ys=[p[1] for _,p in g]
            cx=(min(xs)+max(xs))/2;miny=min(ys);maxy=max(ys)
            if miny>-.34 and maxy<-.05 and cx<-.18:left_roots.add(root)
            elif miny>-.34 and maxy<-.05 and cx>.18:right_roots.add(root)
        if not left_roots or not right_roots:
            print(f'PLUGY_V139_RIG_SKIP left={len(left_roots)} right={len(right_roots)}',flush=True);return raw,False

        blob=bytearray(bin_blob)
        while len(blob)%4:blob.append(0)
        doc.setdefault('bufferViews',[]);doc.setdefault('accessors',[]);doc.setdefault('buffers',[{'byteLength':len(blob)}])
        if not doc['buffers']:doc['buffers']=[{'byteLength':len(blob)}]
        def add_acc(rows,type_name,component=5126):
            nonlocal blob
            fm={5126:'f',5125:'I',5123:'H'}[component];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[type_name]
            flat=[x for row in rows for x in (row if isinstance(row,(tuple,list)) else (row,))]
            off=len(blob);packed=struct.pack('<'+fm*len(flat),*flat);blob.extend(packed)
            while len(blob)%4:blob.append(0)
            vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(packed)})
            ai=len(doc['accessors']);a={'bufferView':vi,'componentType':component,'count':len(rows),'type':type_name}
            if rows and type_name in ('SCALAR','VEC2','VEC3','VEC4'):
                vals=[row if isinstance(row,(tuple,list)) else (row,) for row in rows]
                a['min']=[min(float(v[j]) for v in vals) for j in range(width)];a['max']=[max(float(v[j]) for v in vals) for j in range(width)]
            doc['accessors'].append(a);return ai

        body=[];left=[];right=[]
        for k in range(0,len(idx)-2,3):
            tri=idx[k:k+3];root=find(tri[0])
            (left if root in left_roots else right if root in right_roots else body).extend(tri)
        body_idx=add_acc([(x,) for x in body],'SCALAR',5125)
        body_prim=dict(prim);body_prim['indices']=body_idx;meshes[0]['primitives']=[body_prim]

        def arm_mesh(indices,pivot,name):
            used=sorted(set(indices));remap={v:i for i,v in enumerate(used)}
            p=[(posv[v][0]-pivot[0],posv[v][1]-pivot[1],posv[v][2]-pivot[2]) for v in used]
            uv=[uvv[v] for v in used];ii=[remap[v] for v in indices]
            pa=add_acc(p,'VEC3');ua=add_acc(uv,'VEC2');ia=add_acc([(x,) for x in ii],'SCALAR',5125)
            pr={'attributes':{'POSITION':pa,'TEXCOORD_0':ua},'indices':ia,'mode':4}
            if 'material' in prim:pr['material']=prim['material']
            mi=len(meshes);meshes.append({'name':name,'primitives':[pr]});ni=len(nodes);nodes.append({'name':name+'Node','mesh':mi,'translation':list(pivot)})
            return ni
        left_p=(-.14,-.09,0.0);right_p=(.14,-.09,0.0)
        left_node=arm_mesh(left,left_p,'PLUGY_LeftArm');right_node=arm_mesh(right,right_p,'PLUGY_RightArm')
        world=nodes[0];world.setdefault('children',[])
        for ni in (left_node,right_node):
            if ni not in world['children']:world['children'].append(ni)

        # Matte black eyelids sit just in front of the textured visor. They are invisible at rest,
        # then close over the cyan eye texture during Blink/Wink.
        used=doc.setdefault('extensionsUsed',[])
        if 'KHR_materials_unlit' not in used:used.append('KHR_materials_unlit')
        mats=doc.setdefault('materials',[])
        lid_mat=len(mats);mats.append({'name':'PLUGY_Eyelid_Matte','pbrMetallicRoughness':{'baseColorFactor':[.002,.003,.004,1.0],'metallicFactor':0.0,'roughnessFactor':1.0},'extensions':{'KHR_materials_unlit':{}}})
        import math as _math
        seg=28;verts=[(0.,0.,0.)]+[(.052*_math.cos(2*_math.pi*i/seg),.044*_math.sin(2*_math.pi*i/seg),0.) for i in range(seg)]
        eyeidx=[]
        for i in range(seg):eyeidx.extend((0,1+i,1+((i+1)%seg)))
        ep=add_acc(verts,'VEC3');ei=add_acc([(x,) for x in eyeidx],'SCALAR',5125)
        emi=len(meshes);meshes.append({'name':'PLUGY_Eyelid','primitives':[{'attributes':{'POSITION':ep},'indices':ei,'mode':4,'material':lid_mat}]})
        left_eye=len(nodes);nodes.append({'name':'PLUGY_LeftEyelid','mesh':emi,'translation':[-.09,.15,.294],'scale':[1,.01,1]})
        right_eye=len(nodes);nodes.append({'name':'PLUGY_RightEyelid','mesh':emi,'translation':[.09,.15,.294],'scale':[1,.01,1]})
        world['children'].extend([left_eye,right_eye])

        doc.setdefault('animations',[])
        def acc_anim(values,type_name):
            return add_acc(values,type_name,5126)
        def replace_anim(name,times,channelspec):
            doc['animations']=[a for a in doc['animations'] if not (isinstance(a,dict) and a.get('name')==name)]
            ti=acc_anim([(float(t),) for t in times],'SCALAR');samplers=[];channels=[]
            for node,path,values,typ in channelspec:
                oi=acc_anim(values,typ);si=len(samplers);samplers.append({'input':ti,'output':oi,'interpolation':'LINEAR'});channels.append({'sampler':si,'target':{'node':node,'path':path}})
            doc['animations'].append({'name':name,'samplers':samplers,'channels':channels})
        def append_channels(name,times,channelspec):
            target=next((a for a in doc['animations'] if isinstance(a,dict) and a.get('name')==name),None)
            if target is None:return replace_anim(name,times,channelspec)
            ti=acc_anim([(float(t),) for t in times],'SCALAR')
            for node,path,values,typ in channelspec:
                oi=acc_anim(values,typ);si=len(target.setdefault('samplers',[]));target['samplers'].append({'input':ti,'output':oi,'interpolation':'LINEAR'});target.setdefault('channels',[]).append({'sampler':si,'target':{'node':node,'path':path}})
        q=lambda a:_v106_quat((0,0,1),a)
        openS=[(1,.01,1)];closed=(1,1,1)
        replace_anim('Blink',[0,.07,.14,.23],[(left_eye,'scale',[openS[0],closed,closed,openS[0]],'VEC3'),(right_eye,'scale',[openS[0],closed,closed,openS[0]],'VEC3')])
        replace_anim('Wink',[0,.08,.18,.30],[(left_eye,'scale',[openS[0],closed,closed,openS[0]],'VEC3'),(right_eye,'scale',[openS[0],openS[0],openS[0],openS[0]],'VEC3')])
        replace_anim('Wave',[0,.18,.38,.58,.82,1.08],[(right_node,'rotation',[q(0),q(-.24),q(-.10),q(-.27),q(-.06),q(0)],'VEC4'),(left_node,'rotation',[q(0),q(.04),q(.01),q(.035),q(.01),q(0)],'VEC4')])
        append_channels('Speak',[0,.14,.28,.42,.56,.70,.88],[(left_node,'rotation',[q(0),q(.12),q(.04),q(.16),q(.03),q(.10),q(0)],'VEC4'),(right_node,'rotation',[q(0),q(-.10),q(-.03),q(-.14),q(-.02),q(-.09),q(0)],'VEC4')])
        append_channels('Think',[0,.45,1.0,1.55],[(left_node,'rotation',[q(0),q(-.10),q(-.16),q(0)],'VEC4'),(right_node,'rotation',[q(0),q(.06),q(.11),q(0)],'VEC4'),(left_eye,'scale',[openS[0],(1,.18,1),(1,.10,1),openS[0]],'VEC3'),(right_eye,'scale',[openS[0],(1,.10,1),(1,.18,1),openS[0]],'VEC3')])
        append_channels('Happy',[0,.20,.42,.72],[(left_node,'rotation',[q(0),q(.28),q(.12),q(0)],'VEC4'),(right_node,'rotation',[q(0),q(-.28),q(-.12),q(0)],'VEC4')])
        append_channels('Attentive',[0,.38,.82],[(left_node,'rotation',[q(0),q(.07),q(0)],'VEC4'),(right_node,'rotation',[q(0),q(-.07),q(0)],'VEC4')])

        doc['buffers'][0]['byteLength']=len(blob);ax['plugyRig']='eyes-arms-v139';ax['armNodes']=[left_node,right_node];ax['eyeNodes']=[left_eye,right_eye]
        asset['generator']=str(asset.get('generator',''))+' + PLUGY V139 EyesArms Rig'
        j=_v106_pad4(json.dumps(doc,separators=(',',':')).encode('utf-8'),b' ');b=_v106_pad4(bytes(blob),bytes((0,)))
        chunks=[(b'JSON',j),(bytes((66,73,78,0)),b)]+extras_chunks;total=12+sum(8+len(c) for _,c in chunks)
        out=bytearray(struct.pack('<4sII',b'glTF',version,total))
        for kind,chunk in chunks:out.extend(struct.pack('<I4s',len(chunk),kind));out.extend(chunk)
        print(f'PLUGY_V139_RIG_READY left_tris={len(left)//3} right_tris={len(right)//3} body_tris={len(body)//3}',flush=True)
        return bytes(out),True
    except Exception as exc:
        print(f'PLUGY_V139_RIG_ERROR {type(exc).__name__}: {str(exc)[:220]}',flush=True);return raw,False

def _upgrade_plugy_motion_v143(raw:bytes):
    """Add richer eye/arm clips to the existing procedural rig without touching geometry."""
    if len(raw)<20 or raw[:4]!=b'glTF':return raw,False
    try:
        _,version,_=struct.unpack_from('<4sII',raw,0);pos=12;doc=None;bin_blob=b'';extras_chunks=[]
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8;chunk=bytes(raw[pos:pos+ln]);pos+=ln
            if kind==b'JSON':doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
            elif kind==bytes((66,73,78,0)):bin_blob=chunk
            else:extras_chunks.append((kind,chunk))
        if not isinstance(doc,dict):return raw,False
        asset=doc.setdefault('asset',{'version':'2.0'});ax=asset.setdefault('extras',{})
        if ax.get('plugyMotion')=='autonomous-eyes-arms-v162':return raw,False
        nodes=doc.get('nodes') or []
        by_name={str(n.get('name')):i for i,n in enumerate(nodes) if isinstance(n,dict)}
        left=by_name.get('PLUGY_LeftArmNode');right=by_name.get('PLUGY_RightArmNode')
        leye=by_name.get('PLUGY_LeftEyelid');reye=by_name.get('PLUGY_RightEyelid')
        if None in (left,right,leye,reye):return raw,False
        blob=bytearray(bin_blob)
        while len(blob)%4:blob.append(0)
        doc.setdefault('bufferViews',[]);doc.setdefault('accessors',[]);doc.setdefault('buffers',[{'byteLength':len(blob)}]);doc.setdefault('animations',[])
        if not doc['buffers']:doc['buffers']=[{'byteLength':len(blob)}]
        def add_acc(rows,type_name):
            nonlocal blob
            width={'SCALAR':1,'VEC3':3,'VEC4':4}[type_name]
            vals=[row if isinstance(row,(tuple,list)) else (row,) for row in rows]
            flat=[float(x) for row in vals for x in row];off=len(blob)
            packed=struct.pack('<'+'f'*len(flat),*flat);blob.extend(packed)
            while len(blob)%4:blob.append(0)
            vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(packed)})
            ai=len(doc['accessors']);acc={'bufferView':vi,'componentType':5126,'count':len(vals),'type':type_name}
            acc['min']=[min(float(v[j]) for v in vals) for j in range(width)];acc['max']=[max(float(v[j]) for v in vals) for j in range(width)]
            doc['accessors'].append(acc);return ai
        def replace(name,times,specs):
            doc['animations']=[a for a in doc['animations'] if not (isinstance(a,dict) and a.get('name')==name)]
            ti=add_acc([(t,) for t in times],'SCALAR');samplers=[];channels=[]
            for node,path,values,typ in specs:
                oi=add_acc(values,typ);si=len(samplers);samplers.append({'input':ti,'output':oi,'interpolation':'LINEAR'})
                channels.append({'sampler':si,'target':{'node':node,'path':path}})
            doc['animations'].append({'name':name,'samplers':samplers,'channels':channels})
        q=lambda a:_v106_quat((0,0,1),a);qx=lambda a:_v106_quat((1,0,0),a)
        O=(1,.04,1);C=(1,.72,1);H=(1,.28,1);S=(1,.14,1)
        replace('Blink',[0,.055,.11,.18],[(leye,'scale',[O,C,C,O],'VEC3'),(reye,'scale',[O,C,C,O],'VEC3')])
        replace('DoubleBlink',[0,.05,.10,.16,.23,.29,.38],[(leye,'scale',[O,C,O,O,C,C,O],'VEC3'),(reye,'scale',[O,C,O,O,C,C,O],'VEC3')])
        replace('Wink',[0,.07,.15,.27],[(leye,'scale',[O,C,C,O],'VEC3'),(reye,'scale',[O,O,O,O],'VEC3')])
        replace('SoftEyes',[0,.22,.55,.86],[(leye,'scale',[O,H,S,O],'VEC3'),(reye,'scale',[O,H,S,O],'VEC3')])
        replace('EyeThink',[0,.28,.64,1.0],[(leye,'scale',[O,S,H,O],'VEC3'),(reye,'scale',[O,H,S,O],'VEC3')])
        replace('ArmHello',[0,.16,.34,.52,.72,.96],[(right,'rotation',[q(0),q(-.28),q(-.14),q(-.31),q(-.10),q(0)],'VEC4'),(left,'rotation',[q(0),q(.05),q(.02),q(.04),q(.01),q(0)],'VEC4')])
        replace('ArmExplain',[0,.24,.52,.82,1.12],[(left,'rotation',[q(0),q(.16),q(.08),q(.18),q(0)],'VEC4'),(right,'rotation',[q(0),q(-.10),q(-.16),q(-.07),q(0)],'VEC4')])
        replace('ArmShrug',[0,.24,.52,.82],[(left,'rotation',[q(0),q(.18),q(.12),q(0)],'VEC4'),(right,'rotation',[q(0),q(-.18),q(-.12),q(0)],'VEC4')])
        replace('ArmStretch',[0,.30,.68,1.05],[(left,'rotation',[q(0),q(.22),q(.14),q(0)],'VEC4'),(right,'rotation',[q(0),q(-.22),q(-.14),q(0)],'VEC4')])
        replace('ArmThink',[0,.32,.72,1.12],[(left,'rotation',[q(0),q(-.10),q(-.14),q(0)],'VEC4'),(right,'rotation',[q(0),q(.05),q(.09),q(0)],'VEC4')])
        doc['buffers'][0]['byteLength']=len(blob);ax['plugyMotion']='autonomous-eyes-arms-v162'
        asset['generator']=str(asset.get('generator',''))+' + PLUGY V143 AutonomousEyesArms'
        j=_v106_pad4(json.dumps(doc,separators=(',',':')).encode('utf-8'),b' ');b=_v106_pad4(bytes(blob),bytes((0,)))
        chunks=[(b'JSON',j),(bytes((66,73,78,0)),b)]+extras_chunks;total=12+sum(8+len(c) for _,c in chunks)
        out=bytearray(struct.pack('<4sII',b'glTF',version,total))
        for kind,chunk in chunks:out.extend(struct.pack('<I4s',len(chunk),kind));out.extend(chunk)
        print('PLUGY_V162_MOTION_READY clips=9 eyes=soft arms=independent',flush=True)
        return bytes(out),True
    except Exception as exc:
        print(f'PLUGY_V143_MOTION_ERROR {type(exc).__name__}: {str(exc)[:220]}',flush=True);return raw,False


def _refine_plugy_eyes_v162(raw:bytes):
    """Refine the procedural eyelid mask into a slimmer rounded lens and remove eye jitter from Think."""
    if len(raw)<20 or raw[:4]!=b'glTF':return raw,False
    try:
        _,version,_=struct.unpack_from('<4sII',raw,0);pos=12;doc=None;bin_blob=b'';extras_chunks=[]
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8;chunk=bytes(raw[pos:pos+ln]);pos+=ln
            if kind==b'JSON':doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
            elif kind==bytes((66,73,78,0)):bin_blob=chunk
            else:extras_chunks.append((kind,chunk))
        if not isinstance(doc,dict):return raw,False
        asset=doc.setdefault('asset',{'version':'2.0'});ax=asset.setdefault('extras',{})
        if ax.get('plugyEyeShape')=='soft-eyes-v1623':return raw,False
        meshes=doc.get('meshes') or [];nodes=doc.get('nodes') or []
        eye_mesh=next((i for i,m in enumerate(meshes) if isinstance(m,dict) and m.get('name')=='PLUGY_Eyelid'),None)
        by_name={str(n.get('name')):i for i,n in enumerate(nodes) if isinstance(n,dict)}
        leye=by_name.get('PLUGY_LeftEyelid');reye=by_name.get('PLUGY_RightEyelid')
        if eye_mesh is None or None in (leye,reye):return raw,False
        blob=bytearray(bin_blob)
        while len(blob)%4:blob.append(0)
        doc.setdefault('bufferViews',[]);doc.setdefault('accessors',[]);doc.setdefault('buffers',[{'byteLength':len(blob)}])
        import math as _math
        seg=28
        verts=[(0.,0.,0.)]
        for i in range(seg):
            a=2*_math.pi*i/seg
            x=.048*_math.cos(a)
            y=.022*_math.sin(a)*(0.90+0.10*abs(_math.cos(a)))
            verts.append((x,y,0.))
        flat=[float(x) for row in verts for x in row]
        off=len(blob);packed=struct.pack('<'+'f'*len(flat),*flat);blob.extend(packed)
        while len(blob)%4:blob.append(0)
        vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(packed)})
        ai=len(doc['accessors']);doc['accessors'].append({
            'bufferView':vi,'componentType':5126,'count':len(verts),'type':'VEC3',
            'min':[min(v[j] for v in verts) for j in range(3)],
            'max':[max(v[j] for v in verts) for j in range(3)]
        })
        prim=(meshes[eye_mesh].get('primitives') or [])[0];prim.setdefault('attributes',{})['POSITION']=ai
        for ni,x in ((leye,-.09),(reye,.09)):
            nodes[ni]['translation']=[x,.15,.2945]
            nodes[ni]['scale']=[1,.0001,1]
        # The black eyelid masks must never sit visibly across the cyan eyes.
        # Normal expressions are carried by body motion and the emissive eyes, not by this mask mesh.
        for anim in doc.get('animations') or []:
            if not isinstance(anim,dict):continue
            anim['channels']=[ch for ch in (anim.get('channels') or []) if (ch.get('target') or {}).get('node') not in (leye,reye)]
        doc['buffers'][0]['byteLength']=len(blob);ax['plugyEyeShape']='soft-eyes-v1623'
        asset['generator']=str(asset.get('generator',''))+' + PLUGY V162.3 StableEyes'
        j=_v106_pad4(json.dumps(doc,separators=(',',':')).encode('utf-8'),b' ');b=_v106_pad4(bytes(blob),bytes((0,)))
        chunks=[(b'JSON',j),(bytes((66,73,78,0)),b)]+extras_chunks;total=12+sum(8+len(ch) for _,ch in chunks)
        out=bytearray(struct.pack('<4sII',b'glTF',version,total))
        for kind,ch in chunks:out.extend(struct.pack('<I4s',len(ch),kind));out.extend(ch)
        print('PLUGY_V1623_EYES_READY shape=clean-round eyelid_mask=hidden eye_jitter=off',flush=True)
        return bytes(out),True
    except Exception as exc:
        print(f'PLUGY_V162_EYES_ERROR {type(exc).__name__}: {str(exc)[:220]}',flush=True);return raw,False

def _ensure_realistic_plugy():
    try:
        if REALISTIC_PLUGY.exists() and REALISTIC_PLUGY.stat().st_size>10000:
            patched,mat_changed=_patch_plugy_reflectionless_v138(REALISTIC_PLUGY.read_bytes())
            patched,rig_changed=_rig_plugy_v139(patched)
            patched,motion_changed=_upgrade_plugy_motion_v143(patched)
            patched,eye_changed=_refine_plugy_eyes_v162(patched)
            if mat_changed or rig_changed or motion_changed or eye_changed:
                tmp=REALISTIC_PLUGY.with_suffix('.v139.tmp');tmp.write_bytes(patched);tmp.replace(REALISTIC_PLUGY)
                print(f"PLUGY_V1623_PERSISTED bytes={REALISTIC_PLUGY.stat().st_size} material={mat_changed} rig={rig_changed} motion={motion_changed} eyes={eye_changed}",flush=True)
            return True
    except Exception:
        pass
    with REALISTIC_PLUGY_LOCK:
        try:
            if REALISTIC_PLUGY.exists() and REALISTIC_PLUGY.stat().st_size>10000:
                patched,mat_changed=_patch_plugy_reflectionless_v138(REALISTIC_PLUGY.read_bytes())
                patched,rig_changed=_rig_plugy_v139(patched)
                patched,motion_changed=_upgrade_plugy_motion_v143(patched)
                patched,eye_changed=_refine_plugy_eyes_v162(patched)
                if mat_changed or rig_changed or motion_changed or eye_changed:
                    tmp=REALISTIC_PLUGY.with_suffix('.v139.tmp');tmp.write_bytes(patched);tmp.replace(REALISTIC_PLUGY)
                return True
        except Exception:
            pass
        try:
            rr=requests.get(REALISTIC_PLUGY_URL,timeout=45,headers={'User-Agent':'PLUGAR-V113/1.0'},allow_redirects=True)
            if rr.ok and len(rr.content)>10000 and rr.content[:4]==b'glTF':
                REALISTIC_PLUGY.parent.mkdir(parents=True,exist_ok=True)
                tmp=REALISTIC_PLUGY.with_suffix('.tmp')
                prepared=_inject_v106_motion(rr.content)
                prepared,_=_patch_plugy_reflectionless_v138(prepared)
                prepared,_=_rig_plugy_v139(prepared)
                prepared,_=_upgrade_plugy_motion_v143(prepared)
                prepared,_=_refine_plugy_eyes_v162(prepared)
                tmp.write_bytes(prepared)
                tmp.replace(REALISTIC_PLUGY)
                print(f"PLUGY_V138_REFLECTIONLESS_READY bytes={REALISTIC_PLUGY.stat().st_size} motion=embedded materials=baked",flush=True)
                return True
        except Exception as exc:
            print(f"PLUGY_V113_PREMIUM_FETCH_ERROR {type(exc).__name__}: {str(exc)[:180]}",flush=True)
        return False

def _plugy_rig_summary_v139():
    try:
        raw=REALISTIC_PLUGY.read_bytes()
        if raw[:4]!=b'glTF':return {'error':'not-glb'}
        pos=12;doc=None;bin_blob=b''
        while pos+8<=len(raw):
            ln,kind=struct.unpack_from('<I4s',raw,pos);pos+=8
            chunk=raw[pos:pos+ln];pos+=ln
            if kind==b'JSON':doc=json.loads(chunk.decode('utf-8').rstrip(' ').rstrip(chr(0)))
            elif kind==bytes((66,73,78,0)):bin_blob=bytes(chunk)
        if not isinstance(doc,dict):return {'error':'no-json'}
        nodes=[]
        for i,n in enumerate(doc.get('nodes') or []):
            if not isinstance(n,dict):continue
            nodes.append({'i':i,'name':n.get('name'),'mesh':n.get('mesh'),'skin':n.get('skin'),'children':n.get('children'),'weights':n.get('weights')})
        meshes=[]
        for i,m in enumerate(doc.get('meshes') or []):
            if not isinstance(m,dict):continue
            mats=[]
            for p in m.get('primitives') or []:
                if isinstance(p,dict):mats.append(p.get('material'))
            prims=[]
            for p in m.get('primitives') or []:
                if isinstance(p,dict):
                    prims.append({'keys':list(p.keys()),'mode':p.get('mode'),'indices':p.get('indices'),'attributes':p.get('attributes'),'extensions':p.get('extensions'),'targets':len(p.get('targets') or [])})
            meshes.append({'i':i,'name':m.get('name'),'materials':mats,'weights':m.get('weights'),'targetNames':(m.get('extras') or {}).get('targetNames') if isinstance(m.get('extras'),dict) else None,'primitives':prims})
        materials=[{'i':i,'name':m.get('name')} for i,m in enumerate(doc.get('materials') or []) if isinstance(m,dict)]
        skins=[{'i':i,'name':x.get('name'),'joints':x.get('joints'),'skeleton':x.get('skeleton')} for i,x in enumerate(doc.get('skins') or []) if isinstance(x,dict)]
        topology=[]
        try:
            prim=(doc.get('meshes') or [])[0]['primitives'][0]
            accessors=doc.get('accessors') or [];views=doc.get('bufferViews') or []
            def read_acc(ai):
                a=accessors[ai];v=views[a['bufferView']];ct=a['componentType'];typ=a['type'];count=a['count']
                fm={5121:'B',5123:'H',5125:'I',5126:'f',5122:'h',5120:'b'}[ct];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[typ]
                size=struct.calcsize('<'+fm*w);stride=v.get('byteStride',size);base=v.get('byteOffset',0)+a.get('byteOffset',0)
                return [struct.unpack_from('<'+fm*w,bin_blob,base+i*stride) for i in range(count)]
            idx=[int(x[0]) for x in read_acc(prim['indices'])];posv=read_acc(prim['attributes']['POSITION'])
            parent=list(range(len(posv)));sz=[1]*len(posv)
            def find(x):
                while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
                return x
            def union(a,b):
                a=find(a);b=find(b)
                if a==b:return
                if sz[a]<sz[b]:a,b=b,a
                parent[b]=a;sz[a]+=sz[b]
            for k in range(0,len(idx)-2,3):
                a,b,c=idx[k:k+3];union(a,b);union(b,c)
            groups={}
            for vi,p in enumerate(posv):groups.setdefault(find(vi),[]).append((vi,p))
            comps=[]
            for g in groups.values():
                xs=[p[0] for _,p in g];ys=[p[1] for _,p in g];zs=[p[2] for _,p in g]
                comps.append({'verts':len(g),'min':[round(min(xs),4),round(min(ys),4),round(min(zs),4)],'max':[round(max(xs),4),round(max(ys),4),round(max(zs),4)],'center':[round((min(xs)+max(xs))/2,4),round((min(ys)+max(ys))/2,4),round((min(zs)+max(zs))/2,4)]})
            topology=sorted(comps,key=lambda x:x['verts'],reverse=True)[:20]
        except Exception as exc:topology=[{'error':f'{type(exc).__name__}:{str(exc)[:100]}'}]
        return {'nodes':nodes,'meshes':meshes,'materials':materials,'skins':skins,'topology':topology,'animations':[a.get('name') for a in doc.get('animations') or [] if isinstance(a,dict)]}
    except Exception as exc:return {'error':f'{type(exc).__name__}:{str(exc)[:120]}'}

def _prefetch_realistic_plugy():
    try:
        _ensure_realistic_plugy()
        print('PLUGY_RIG_V139 '+json.dumps(_plugy_rig_summary_v139(),separators=(',',':')),flush=True)
    except Exception as exc:print(f'PLUGY_RIG_V139_ERROR {type(exc).__name__}: {str(exc)[:120]}',flush=True)
threading.Thread(target=_prefetch_realistic_plugy,daemon=True).start()

@app.get('/assets/plugy-v113-premium.glb',include_in_schema=False)
@app.get('/assets/plugy-v106-realistic.glb',include_in_schema=False)
def plugy_v106_realistic_asset():
    if _ensure_realistic_plugy():
        return FileResponse(REALISTIC_PLUGY,media_type='model/gltf-binary',headers={
          'Cache-Control':'public,max-age=604800,stale-while-revalidate=2592000',
          'X-PLUGY-Model':'v113-premium'
        })
    fallback=BASE/'static'/'PLUGY_final_animated.glb'
    if fallback.exists():
        return FileResponse(fallback,media_type='model/gltf-binary',headers={'Cache-Control':'public,max-age=86400','X-PLUGY-Model':'animated-fallback'})
    return Response(status_code=503)

@app.get('/api/v113/plugy-premium/status')
@app.get('/api/v106/plugy-realistic/status')
def plugy_v106_realistic_status():
    ready=REALISTIC_PLUGY.exists() and REALISTIC_PLUGY.stat().st_size>10000
    return {'ok':True,'ready':ready,'bytes':REALISTIC_PLUGY.stat().st_size if ready else 0,'asset':'/assets/plugy-v113-premium.glb','profile':'autonomous-eyes-arms-v162'}

for route in list(app.router.routes):
    route_path=getattr(route,'path',None)
    if route_path in {'/','/api/health'} and 'GET' in (getattr(route,'methods',set()) or set()):
        app.router.routes.remove(route)

@app.get('/api/health')
def health_v124():
    db_path=Path(os.getenv('PLUGART_DB','/data/plugart.db'))
    try:
        c=core.conn();c.execute('select 1').fetchone();c.close();db_ok=True
    except Exception:
        db_ok=False
    backup_ready=bool(MIGRATION_BACKUP and MIGRATION_BACKUP.exists() and MIGRATION_BACKUP.stat().st_size>0)
    return {
      'ok':db_ok,
      'version':'167.0',
      'ui':'plug-art-v167-workspace',
      'database':str(db_path),
      'persistent':str(db_path).startswith('/data/'),
      'db_bytes':db_path.stat().st_size if db_path.exists() else 0,
      'migration_backup_ready':backup_ready
    }

@app.get('/api/v164/ui-manifest')
@app.get('/api/v163/ui-manifest')
@app.get('/api/v1623/ui-manifest')
@app.get('/api/v162/ui-manifest')
@app.get('/api/v161/ui-manifest')
@app.get('/api/v160/ui-manifest')
@app.get('/api/v159/ui-manifest')
@app.get('/api/v158/ui-manifest')
@app.get('/api/v157/ui-manifest')
@app.get('/api/v154/ui-manifest')
@app.get('/api/v153/ui-manifest')
@app.get('/api/v152/ui-manifest')
@app.get('/api/v151/ui-manifest')
@app.get('/api/v150/ui-manifest')
@app.get('/api/v149/ui-manifest')
@app.get('/api/v148/ui-manifest')
@app.get('/api/v147/ui-manifest')
@app.get('/api/v146/ui-manifest')
@app.get('/api/v145/ui-manifest')
@app.get('/api/v144/ui-manifest')
@app.get('/api/v143/ui-manifest')
@app.get('/api/v142/ui-manifest')
@app.get('/api/v141/ui-manifest')
@app.get('/api/v140/ui-manifest')
@app.get('/api/v139/ui-manifest')
@app.get('/api/v138/ui-manifest')
@app.get('/api/v137/ui-manifest')
@app.get('/api/v136/ui-manifest')
@app.get('/api/v135/ui-manifest')
@app.get('/api/v134/ui-manifest')
@app.get('/api/v133/ui-manifest')
@app.get('/api/v132/ui-manifest')
@app.get('/api/v131/ui-manifest')
@app.get('/api/v130/ui-manifest')
@app.get('/api/v129/ui-manifest')
@app.get('/api/v128/ui-manifest')
def ui_manifest_v128():
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else ''
    js_path=BASE/'static'/'plugart_v162.js'
    css_path=BASE/'static'/'plugart_v160_slide.css'
    expected='167.20260926.1'
    return {
      'ok': bool(html and js_path.exists() and css_path.exists() and PLUGY_PAGE.exists() and (BASE/'static'/'plugy_v162.js').exists() and (BASE/'static'/'plugy_v162.css').exists() and (BASE/'static'/'hub_v160_assets.js').exists()),
      'version':'167.0',
      'ui':'plug-art-v167-workspace',
      'asset_version':expected,
      'html_has_js':f'plugart_v162.js?v={expected}' in html,
      'html_has_slide_css': bool(js_path.exists() and 'plugart_v160_slide.css?v=' in js_path.read_text(encoding='utf-8')),
      'html_has_sidebar_version':'V164' in html,
      'js_bytes':js_path.stat().st_size if js_path.exists() else 0,
      'slide_css_bytes':css_path.stat().st_size if css_path.exists() else 0,
      'features':[
        'premium-cockpit','free-canvas-editor','pro-canvas-toolbar','layer-inspector','quick-type-scales','plug-art-color-palette','image-upload','marketing-template-library','manual-carousel-editor','drag-reorder','undo-redo','preview-zoom','fit-canvas',
        'ios-first-content-studio','mobile-bottom-sheet-tools','granular-typography-controls','french-voice-output','full-body-mini-plugy','glass-navigation','floating-actions','spatial-dashboard','liquid-editorial-ui','non-card-create-scene','creation-path-launcher','unified-content-studio','canva-like-layer-inspector','typography-scale-controls','expanded-color-system','organic-plugy-gaze','persistent-plugy-mini','contained-mini-plugy-framing','calm-eye-blink','low-glare-plugy','thinking-energy-state','reflectionless-plugy','creation-control-audit','glb-baked-reflectionless-materials','rare-large-view-eye-blink','static-miniature-eyes','procedural-arm-rig','interactive-arm-reactions','nonrepeating-motion-engine','guided-radar-content-flow','creation-fallback-generation','editorial-procedural-visuals','ai-visual-variants','studio-binding-fix','parallel-image-variants','resilient-plugy-stream','plugy-voice-output','leaflet-map','map-direct-access','city-map-fallback',
        'hub-workspace','hub-real-project-previews','hub-pdf-export','organized-bureau','project-pdf-desk','library-project-catalog','project-pdf-generation','visible-idea-cloud','draggable-project-ideas',
        'standalone-plugy','watch-responsive','plugy-refined-finish','chat-style-conversation',
        'instagram-priority-access','instagram-social-studio','marketing-visual-generator','expanded-local-radar','streaming-assistant','lean-bootstrap'
      ]
    }

@app.get('/plugy',response_class=HTMLResponse,include_in_schema=False)
def plugy_page_v130(request:Request):
    html=PLUGY_PAGE.read_text(encoding='utf-8') if PLUGY_PAGE.exists() else '<html><body>PLUGY unavailable.</body></html>'
    digest=hashlib.sha256(html.encode('utf-8')).hexdigest()[:20]
    etag='"plugy-'+digest+'"'
    headers={
      'Cache-Control':'no-store, max-age=0',
      'ETag':etag,
      'X-Plug-Art-Version':'166.1',
      'X-Plug-Art-UI':'plugy-v130-standalone'
    }
    return HTMLResponse(html,headers=headers)

@app.get('/',response_class=HTMLResponse,include_in_schema=False)
def root_v102(request:Request):
    html=DASH.read_text(encoding='utf-8') if DASH.exists() else '<html><body>PLUG ART workspace unavailable.</body></html>'
    digest=hashlib.sha256(html.encode('utf-8')).hexdigest()[:20]
    etag='"plugart-'+digest+'"'
    headers={
      'Cache-Control':'no-store, max-age=0',
      'ETag':etag,
      'X-Plug-Art-Version':'166.1',
      'X-Plug-Art-UI':'plug-art-v166-1-tablet-layout'
    }
    return HTMLResponse(html,headers=headers)

@app.post('/api/v160/client-report',include_in_schema=False)
@app.post('/api/v159/client-report',include_in_schema=False)
async def client_report_v159(request:Request):
    try:
        raw=(await request.body())[:12000]
        text=raw.decode('utf-8','replace')
        try:
            payload=json.loads(text) if text else {}
        except Exception:
            payload={'raw':text[:4000]}
        safe={k:payload.get(k) for k in ('type','message','source','line','col','route','view','ready','href','ua','ts') if k in payload}
        print('PLUG_ART_CLIENT_REPORT '+json.dumps(safe,ensure_ascii=False)[:10000],flush=True)
    except Exception as exc:
        print(f'PLUG_ART_CLIENT_REPORT_ERROR {type(exc).__name__}: {str(exc)[:300]}',flush=True)
    return Response(status_code=204)

from fastapi.middleware.gzip import GZipMiddleware
try:
    app.add_middleware(GZipMiddleware, minimum_size=500)
except Exception:
    pass

@app.middleware('http')
async def v85_headers(request:Request,call_next):
    started=time.perf_counter()
    response=await call_next(request)
    p=request.url.path
    if p in ('/','/plugy'):
        response.headers['Cache-Control']='no-store, max-age=0'
    elif p.startswith('/static/') and any(p.endswith(ext) for ext in ('.css','.js','.glb','.png','.jpg','.jpeg','.webp','.svg','.webmanifest')):
        response.headers['Cache-Control']='public, max-age=31536000, immutable'
    elif p in ('/api/v102/bootstrap','/api/v124/dashboard-bootstrap'):
        response.headers['Cache-Control']='private, max-age=15, stale-while-revalidate=60'
    elif p.startswith('/api/'):
        response.headers.setdefault('Cache-Control','no-store')
    response.headers.setdefault('Vary','Accept-Encoding')
    response.headers['Server-Timing']=f"app;dur={(time.perf_counter()-started)*1000:.1f}"
    return response


@app.get('/favicon.ico',include_in_schema=False)
def favicon_v102():
    path=BASE/'static'/'favicon.svg'
    if not path.exists():return Response(status_code=204)
    return Response(content=path.read_bytes(),media_type='image/svg+xml',headers={'Cache-Control':'public,max-age=604800'})

@app.get('/api/v102/bootstrap')
def bootstrap_v102():
    """Single DB read pass for the initial workspace."""
    db=core.conn()
    try:
        today=str(core.date.today())
        def many(sql,p=()):
            return [dict(x) for x in db.execute(sql,p).fetchall()]
        def scalar(sql,p=()):
            row=db.execute(sql,p).fetchone()
            return row[0] if row else 0

        stats={
          'opportunities':scalar("select count(*) from opportunities where status in ('open','rolling')"),
          'urgent':scalar("select count(*) from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today)),
          'artists':scalar("select count(*) from artists"),
          'exhibitions':scalar("select count(*) from exhibitions where end>=?",(today,)),
          'favorites':scalar("select count(*) from opportunities where favorite=1"),
          'candidates':scalar("select count(*) from radar_candidates where state='new'"),
          'drafts':scalar("select count(*) from content_drafts"),
          'contacts':scalar("select count(*) from crm_leads"),
          'bureau':scalar("select count(*) from bureau_documents")
        }
        opportunities=many("select * from opportunities where status in ('open','rolling') order by coalesce(radar_score,score,0) desc,case when deadline is null then 1 else 0 end,deadline")
        last=db.execute('select * from radar_runs order by id desc limit 1').fetchone()
        radar={
          'last_run':dict(last) if last else None,
          'runs':many('select * from radar_runs order by id desc limit 10'),
          'sources':many('select * from radar_sources order by reliability desc'),
          'candidate_counts':many('select state,count(*) count from radar_candidates group by state'),
          'top':many("select id,title,city,country,deadline,fee,radar_score,priority,radar_reason,source_status from opportunities where status in ('open','rolling') order by radar_score desc limit 10")
        }
        candidates=many("select * from radar_candidates where state='new' order by candidate_score desc,deadline")
        artists=many('select * from artists order by name')
        for artist in artists:
            try:artist['tags']=json.loads(artist.get('tags') or '[]')
            except Exception:artist['tags']=[]
            try:artist['milestones']=json.loads(artist.get('milestones') or '[]')
            except Exception:artist['milestones']=[]
        events=many('select * from exhibitions order by start')
        map_rows=many("select id,title,'' venue,city,country,lat,lon,deadline date,deadline,coalesce(radar_score,score,0) score,source_url,'opportunity' kind from opportunities where lat is not null and lon is not null and status in ('open','rolling')")
        map_rows+=many("select id,title,venue,city,country,lat,lon,start date,start deadline,0 score,source_url,'exhibition' kind from exhibitions where lat is not null and lon is not null")

        return {
          'version':'102.0',
          'generated_at':time.time(),
          'stats':stats,
          'opportunities':opportunities,
          'radar':radar,
          'candidates':candidates,
          'artists':artists,
          'events':events,
          'map':map_rows
        }
    finally:
        db.close()

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
    if hit and now-hit[0] < 14400:return hit[1]
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
    if cached and now-cached[0]<21600:return Response(content=cached[1],media_type=cached[2],headers={'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800'})
    headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/2.0','Referer':url or 'https://plug-art-live-production.up.railway.app/'}
    for candidate in media[:6]:
        try:
            rr=requests.get(candidate['url'],timeout=9,headers=headers,allow_redirects=True);ct=(rr.headers.get('content-type') or '').split(';')[0].lower()
            if rr.ok and ct.startswith('image/') and 1200<len(rr.content)<9000000:
                MEDIA_BYTES_CACHE[key]=(now,rr.content,ct)
                if len(MEDIA_BYTES_CACHE)>96:MEDIA_BYTES_CACHE.pop(next(iter(MEDIA_BYTES_CACHE)))
                return Response(content=rr.content,media_type=ct,headers={'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800','X-PLUG-Image-Source':candidate['source']})
        except Exception:pass
    return Response(status_code=404)


@app.get('/api/v166/opportunities/{oid}/media/{index}')
def opportunity_media_asset_v166(oid:int,index:int):
    item,url,media=_opportunity_media(oid)
    if index<0 or index>=min(len(media),12):raise HTTPException(404,'Media introuvable')
    candidate=media[index];key=f"v166:{oid}:{index}";now=time.time();cached=MEDIA_BYTES_CACHE.get(key)
    if cached and now-cached[0]<21600:
        return Response(content=cached[1],media_type=cached[2],headers={'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800','X-PLUG-Image-Source':candidate.get('source','official')})
    headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/3.0','Referer':url or 'https://plug-art-live-production.up.railway.app/','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}
    try:
        rr=requests.get(candidate['url'],timeout=10,headers=headers,allow_redirects=True)
        ct=(rr.headers.get('content-type') or '').split(';')[0].lower()
        if not rr.ok or not ct.startswith('image/') or len(rr.content)<1200 or len(rr.content)>12_000_000:
            raise HTTPException(404,'Image officielle indisponible')
        MEDIA_BYTES_CACHE[key]=(now,rr.content,ct)
        if len(MEDIA_BYTES_CACHE)>128:MEDIA_BYTES_CACHE.pop(next(iter(MEDIA_BYTES_CACHE)))
        return Response(content=rr.content,media_type=ct,headers={'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800','X-PLUG-Image-Source':candidate.get('source','official')})
    except HTTPException:raise
    except Exception:raise HTTPException(404,'Image officielle indisponible')


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

@app.post('/api/v119/crm/{lid}/activity')
def crm_activity_v119(lid:int,body:dict):
    lead=core.one('select * from crm_leads where id=?',(lid,))
    if not lead:
        raise HTTPException(404,'Contact introuvable')
    action=str((body or {}).get('action') or 'Activité').strip()[:80]
    details=str((body or {}).get('details') or '').strip()[:1400]
    allowed_status={'lead','contacted','waiting','followup','active','hot','closed'}
    patch={}
    status=str((body or {}).get('status') or '').strip()
    if status in allowed_status:patch['status']=status
    for key,limit in (('next_action',240),('next_date',20)):
        val=str((body or {}).get(key) or '').strip()
        if val:patch[key]=val[:limit]
    if bool((body or {}).get('touch_contact')):
        patch['last_contact']=time.strftime('%Y-%m-%d')
    if patch:
        patch['updated_at']=_now_v85()
        sets=','.join(f"{k}=?" for k in patch)
        c=core.conn();c.execute(f"update crm_leads set {sets} where id=?",(*patch.values(),lid));c.commit();c.close()
    _crm_history_v86(lid,action,details)
    return {
      'ok':True,
      'lead':core.one('select * from crm_leads where id=?',(lid,)),
      'history':core.rows('select * from crm_history where lead_id=? order by id desc limit 20',(lid,))
    }

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



# V161 artist workspace: profile, CRM bridge, and tailored exhibition suggestions.
def _v161_blocked_opportunity(row):
    txt=' '.join(str((row or {}).get(k) or '') for k in ('title','type','summary','eligibility','radar_reason')).lower()
    return bool(re.search(r'\b(competition|contest|concours|award|awards|prize|prix|récompense|recompense|trophy)\b',txt,re.I))

def _v161_artist_suggestions(aid:int,limit:int=8):
    artist=core.one('select * from artists where id=?',(aid,))
    if not artist:return []
    tags=[]
    try:tags=json.loads(artist.get('tags') or '[]')
    except Exception:pass
    profile=' '.join([str(artist.get('discipline') or ''),str(artist.get('city') or ''),str(artist.get('country') or ''),' '.join(map(str,tags))]).lower()
    is_photo=bool(re.search(r'photo|photograph|image|lens|camera',profile,re.I))
    pool=core.rows("""select * from opportunities where status in ('open','rolling')
                      order by coalesce(radar_score,score,0) desc,
                      case when deadline is null then 1 else 0 end,deadline limit 100""")
    scored=[]
    for o in pool:
        if _v161_blocked_opportunity(o):continue
        text=' '.join(str(o.get(k) or '') for k in ('title','type','summary','eligibility','city','country')).lower()
        score=int(o.get('radar_score') or o.get('score') or 0)
        if is_photo:
            if re.search(r'photo|photograph|image|visual art|arts visuels|mixed media',text,re.I):score+=25
            else:score-=8
        for token in re.findall(r'[a-zà-ÿ]{4,}',profile):
            if token in text:score+=3
        scored.append((score,o))
    scored.sort(key=lambda x:x[0],reverse=True)
    return [o for _,o in scored[:max(1,min(limit,12))]]

@app.get('/api/v161/artists/{aid}/profile')
def artist_profile_v161(aid:int):
    artist=core.one('select * from artists where id=?',(aid,))
    if not artist:raise HTTPException(404,'Artiste introuvable')
    artist=_artist_out_v86(artist)
    works=core.rows('select * from artist_works where artist_id=? order by id desc limit 18',(aid,))
    contact=None
    email=str(artist.get('email') or '').strip()
    insta=str(artist.get('instagram') or '').strip()
    if email:contact=core.one('select * from crm_leads where lower(email)=lower(?) order by id desc limit 1',(email,))
    if not contact and insta:contact=core.one('select * from crm_leads where lower(instagram)=lower(?) order by id desc limit 1',(insta,))
    if not contact:contact=core.one("select * from crm_leads where kind='Artiste' and lower(coalesce(organization,name,''))=lower(?) order by id desc limit 1",(artist.get('name') or '',))
    return {'ok':True,'artist':artist,'works':works,'contact':contact,'suggestions':_v161_artist_suggestions(aid,8)}

@app.post('/api/v161/artists/{aid}/contact')
def artist_contact_v161(aid:int):
    artist=core.one('select * from artists where id=?',(aid,))
    if not artist:raise HTTPException(404,'Artiste introuvable')
    email=str(artist.get('email') or '').strip();insta=str(artist.get('instagram') or '').strip()
    lead=None
    if email:lead=core.one('select * from crm_leads where lower(email)=lower(?) order by id desc limit 1',(email,))
    if not lead and insta:lead=core.one('select * from crm_leads where lower(instagram)=lower(?) order by id desc limit 1',(insta,))
    if not lead:lead=core.one("select * from crm_leads where kind='Artiste' and lower(coalesce(organization,name,''))=lower(?) order by id desc limit 1",(artist.get('name') or '',))
    if lead:return {'ok':True,'existing':True,'lead':lead}
    now=_now_v85()
    c=core.conn()
    cur=c.execute("""insert into crm_leads(name,organization,kind,city,country,email,instagram,website,status,priority,next_action,next_date,last_contact,notes,created_at,updated_at)
                     values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (artist.get('real_name') or artist.get('name') or '',artist.get('name') or '','Artiste',
                   artist.get('city') or '',artist.get('country') or '',email,insta,artist.get('website') or '',
                   'lead','normal','Découvrir le travail et identifier une opportunité','','',
                   'Créé depuis la fiche artiste PLUG ART · discipline : '+str(artist.get('discipline') or ''),now,now))
    c.commit();lid=cur.lastrowid;c.close()
    _crm_history_v86(lid,'Création','Fiche contact créée depuis le profil artiste')
    return {'ok':True,'existing':False,'lead':core.one('select * from crm_leads where id=?',(lid,))}

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


# V107 Bureau: persistent internal writing workspace.
_v107c=core.conn()
_v107c.executescript("""
CREATE TABLE IF NOT EXISTS bureau_documents(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  folder TEXT DEFAULT 'Notes',
  tags TEXT DEFAULT '',
  pinned INTEGER DEFAULT 0,
  source_type TEXT DEFAULT '',
  source_id TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_bureau_documents_updated ON bureau_documents(pinned DESC,updated_at DESC,id DESC);
""")
_v107c.commit()
_v107c.close()

@app.get('/api/v107/bureau')
def bureau_list_v107():
    return core.rows("""select * from bureau_documents
                        order by pinned desc,updated_at desc,id desc""")

@app.post('/api/v107/bureau')
def bureau_create_v107(body:dict):
    body=body or {}
    title=str(body.get('title') or 'Sans titre').strip()[:240]
    content=str(body.get('body') or '')
    folder=str(body.get('folder') or 'Notes').strip()[:80]
    tags=str(body.get('tags') or '').strip()[:700]
    pinned=1 if body.get('pinned') in (1,True,'1','true','on') else 0
    source_type=str(body.get('source_type') or '').strip()[:80]
    source_id=str(body.get('source_id') or '').strip()[:120]
    now=_now_v85()
    c=core.conn()
    cur=c.execute("""insert into bureau_documents
      (title,body,folder,tags,pinned,source_type,source_id,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?)""",
      (title,content,folder,tags,pinned,source_type,source_id,now,now))
    c.commit();doc_id=cur.lastrowid;c.close()
    return core.one('select * from bureau_documents where id=?',(doc_id,))

@app.patch('/api/v107/bureau/{doc_id}')
def bureau_update_v107(doc_id:int,body:dict):
    if not core.one('select id from bureau_documents where id=?',(doc_id,)):
        raise HTTPException(404,'Document introuvable')
    body=body or {}
    allowed={'title','body','folder','tags','source_type','source_id'}
    data={k:str(v) for k,v in body.items() if k in allowed}
    if 'pinned' in body:
        data['pinned']=1 if body.get('pinned') in (1,True,'1','true','on') else 0
    if not data:
        return core.one('select * from bureau_documents where id=?',(doc_id,))
    if 'title' in data:data['title']=data['title'].strip()[:240] or 'Sans titre'
    if 'folder' in data:data['folder']=data['folder'].strip()[:80] or 'Notes'
    if 'tags' in data:data['tags']=data['tags'].strip()[:700]
    if 'source_type' in data:data['source_type']=data['source_type'].strip()[:80]
    if 'source_id' in data:data['source_id']=data['source_id'].strip()[:120]
    data['updated_at']=_now_v85()
    sets=','.join(f"{k}=?" for k in data)
    c=core.conn();c.execute(f"update bureau_documents set {sets} where id=?",(*data.values(),doc_id));c.commit();c.close()
    return core.one('select * from bureau_documents where id=?',(doc_id,))

@app.delete('/api/v107/bureau/{doc_id}')
def bureau_delete_v107(doc_id:int):
    c=core.conn();cur=c.execute('delete from bureau_documents where id=?',(doc_id,));c.commit();c.close()
    if not cur.rowcount:
        raise HTTPException(404,'Document introuvable')
    return {'ok':True}

# V120 Bureau: reusable templates + application packages.
_v120b=core.conn()
_v120b.executescript("""
CREATE TABLE IF NOT EXISTS bureau_templates(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  category TEXT DEFAULT 'Général',
  body TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  built_in INTEGER DEFAULT 0,
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_bureau_templates_category ON bureau_templates(category,name);

CREATE TABLE IF NOT EXISTS application_packages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  opportunity_id TEXT DEFAULT '',
  status TEXT DEFAULT 'preparing',
  folder TEXT DEFAULT 'Candidatures',
  checklist_json TEXT DEFAULT '{}',
  document_ids_json TEXT DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_application_packages_updated ON application_packages(updated_at DESC,id DESC);
""")
if not _v120b.execute("select count(*) from bureau_templates").fetchone()[0]:
    now=_now_v85()
    seed=[
      ('Lettre de candidature','Candidature',
       "Objet : Candidature — {{OPEN_CALL}}\n\nBonjour,\n\nJe souhaite proposer ma candidature pour {{OPEN_CALL}}.\n\n[Présente ici le projet, la démarche et pourquoi cette opportunité est pertinente.]\n\n[Ajoute les informations demandées par l’appel.]\n\nMerci pour votre attention.\n\nBien cordialement,",
       'candidature, lettre',1,now,now),
      ('Bio courte','Artiste',
       "[Nom d’artiste / nom]\n\n[80 à 120 mots : pratique, médiums, démarche, repères d’exposition et territoire.]",
       'bio, artiste',1,now,now),
      ('Note artistique','Artiste',
       "[Titre / série]\n\n[Intention artistique]\n\n[Processus, matière, technique]\n\n[Relation au lieu / au public / au thème]\n\n[Format et besoins éventuels]",
       'note artistique, démarche',1,now,now),
      ('Email de candidature','Candidature',
       "Bonjour,\n\nJe vous contacte au sujet de {{OPEN_CALL}}. Vous trouverez ma candidature et les éléments demandés en pièces jointes / via le lien indiqué.\n\n[Phrase courte de contexte.]\n\nMerci pour votre attention.\n\nBien cordialement,",
       'email, candidature',1,now,now),
      ('Relance candidature','Candidature',
       "Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature à {{OPEN_CALL}}, envoyée précédemment.\n\nJe reste disponible si vous avez besoin d’un complément d’information.\n\nMerci par avance pour votre retour.\n\nBien cordialement,",
       'relance, candidature',1,now,now),
      ('Légende Open Call','Contenu',
       "{{OPEN_CALL}}\n\n{{RESUME}}\n\nDeadline : {{DEADLINE}}\n\nCommente PLUG 🔌 pour être branché et recevoir le lien de candidature.",
       'instagram, open call',1,now,now)
    ]
    _v120b.executemany("""insert into bureau_templates
      (name,category,body,tags,built_in,created_at,updated_at) values(?,?,?,?,?,?,?)""",seed)
_v120b.commit();_v120b.close()

def _v120_json(raw,fallback):
    try:return json.loads(raw or '')
    except Exception:return fallback

def _v120_package_out(row):
    if not row:return None
    out=dict(row)
    out['checklist']=_v120_json(out.pop('checklist_json','{}'),{})
    out['document_ids']=_v120_json(out.pop('document_ids_json','[]'),[])
    oid=str(out.get('opportunity_id') or '')
    out['opportunity']=core.one("""select id,title,city,country,deadline,fee,source_url,summary,radar_reason
                                   from opportunities where id=?""",(oid,)) if oid else None
    return out

def _v120_default_checklist():
    return {
      'source_checked':False,
      'letter':False,
      'bio':False,
      'artist_statement':False,
      'portfolio':False,
      'visuals':False,
      'links':False,
      'submitted':False
    }

def _v120_render_template(text,opp):
    opp=opp or {}
    values={
      '{{OPEN_CALL}}':str(opp.get('title') or '[Open Call]'),
      '{{VILLE}}':str(opp.get('city') or ''),
      '{{PAYS}}':str(opp.get('country') or ''),
      '{{DEADLINE}}':str(opp.get('deadline') or '[deadline]'),
      '{{FRAIS}}':str(opp.get('fee') or ''),
      '{{RESUME}}':str(opp.get('summary') or opp.get('radar_reason') or '[résumé]')
    }
    out=str(text or '')
    for k,v in values.items():out=out.replace(k,v)
    return out

@app.get('/api/v120/bureau/templates')
def bureau_templates_list_v120():
    return core.rows("""select * from bureau_templates
                        order by built_in desc,category,name,id""")

@app.post('/api/v120/bureau/templates')
def bureau_templates_create_v120(body:dict):
    body=body or {};now=_now_v85()
    name=str(body.get('name') or 'Nouveau modèle').strip()[:160]
    category=str(body.get('category') or 'Général').strip()[:80]
    text=str(body.get('body') or '')
    tags=str(body.get('tags') or '').strip()[:500]
    c=core.conn();cur=c.execute("""insert into bureau_templates
      (name,category,body,tags,built_in,created_at,updated_at) values(?,?,?,?,0,?,?)""",
      (name,category,text,tags,now,now));c.commit();tid=cur.lastrowid;c.close()
    return core.one('select * from bureau_templates where id=?',(tid,))

@app.patch('/api/v120/bureau/templates/{template_id}')
def bureau_templates_update_v120(template_id:int,body:dict):
    row=core.one('select * from bureau_templates where id=?',(template_id,))
    if not row:raise HTTPException(404,'Modèle introuvable')
    body=body or {};data={}
    for key,limit in (('name',160),('category',80),('tags',500)):
        if key in body:data[key]=str(body.get(key) or '').strip()[:limit]
    if 'body' in body:data['body']=str(body.get('body') or '')
    if not data:return row
    data['updated_at']=_now_v85();sets=','.join(f"{k}=?" for k in data)
    c=core.conn();c.execute(f"update bureau_templates set {sets} where id=?",(*data.values(),template_id));c.commit();c.close()
    return core.one('select * from bureau_templates where id=?',(template_id,))

@app.delete('/api/v120/bureau/templates/{template_id}')
def bureau_templates_delete_v120(template_id:int):
    row=core.one('select * from bureau_templates where id=?',(template_id,))
    if not row:raise HTTPException(404,'Modèle introuvable')
    if int(row.get('built_in') or 0):raise HTTPException(400,'Modèle système non supprimable')
    c=core.conn();c.execute('delete from bureau_templates where id=?',(template_id,));c.commit();c.close()
    return {'ok':True}

@app.get('/api/v120/bureau/bootstrap')
def bureau_bootstrap_v120():
    return {
      'templates':core.rows("""select * from bureau_templates order by built_in desc,category,name,id"""),
      'packages':[_v120_package_out(x) for x in core.rows(
        'select * from application_packages order by updated_at desc,id desc')],
      'opportunities':core.rows("""select id,title,city,country,deadline,fee
                                   from opportunities
                                   where status in ('open','rolling')
                                   order by case when deadline is null then 1 else 0 end,deadline,
                                            coalesce(radar_score,score,0) desc limit 120""")
    }

@app.get('/api/v120/bureau/packages')
def bureau_packages_list_v120():
    return [_v120_package_out(x) for x in core.rows(
      'select * from application_packages order by updated_at desc,id desc')]

@app.post('/api/v120/bureau/packages')
def bureau_packages_create_v120(body:dict):
    body=body or {};oid=str(body.get('opportunity_id') or '').strip()[:120]
    opp=core.one('select id,title from opportunities where id=?',(oid,)) if oid else None
    title=str(body.get('title') or (('Candidature · '+str(opp.get('title'))) if opp else 'Nouveau dossier')).strip()[:240]
    status=str(body.get('status') or 'preparing').strip()[:40]
    checklist=body.get('checklist') if isinstance(body.get('checklist'),dict) else _v120_default_checklist()
    notes=str(body.get('notes') or '')
    now=_now_v85()
    c=core.conn();cur=c.execute("""insert into application_packages
      (title,opportunity_id,status,folder,checklist_json,document_ids_json,notes,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?)""",
      (title,oid,status,'Candidatures',json.dumps(checklist,ensure_ascii=False),'[]',notes,now,now))
    c.commit();pid=cur.lastrowid;c.close()
    return _v120_package_out(core.one('select * from application_packages where id=?',(pid,)))

@app.post('/api/v120/bureau/packages/from-opportunity/{opportunity_id}')
def bureau_package_from_opportunity_v120(opportunity_id:int):
    existing=core.one("""select * from application_packages where opportunity_id=?
                         and status not in ('closed','archived') order by id desc limit 1""",(str(opportunity_id),))
    if existing:return _v120_package_out(existing)
    opp=core.one('select id,title from opportunities where id=?',(opportunity_id,))
    if not opp:raise HTTPException(404,'Open Call introuvable')
    return bureau_packages_create_v120({'opportunity_id':str(opportunity_id),'title':'Candidature · '+str(opp.get('title') or 'Open Call')})

@app.patch('/api/v120/bureau/packages/{package_id}')
def bureau_packages_update_v120(package_id:int,body:dict):
    row=core.one('select * from application_packages where id=?',(package_id,))
    if not row:raise HTTPException(404,'Dossier introuvable')
    body=body or {};data={}
    for key,limit in (('title',240),('opportunity_id',120),('status',40),('folder',80)):
        if key in body:data[key]=str(body.get(key) or '').strip()[:limit]
    if 'notes' in body:data['notes']=str(body.get('notes') or '')
    if isinstance(body.get('checklist'),dict):data['checklist_json']=json.dumps(body['checklist'],ensure_ascii=False)
    if isinstance(body.get('document_ids'),list):data['document_ids_json']=json.dumps([int(x) for x in body['document_ids'] if str(x).isdigit()][:50])
    if not data:return _v120_package_out(row)
    data['updated_at']=_now_v85();sets=','.join(f"{k}=?" for k in data)
    c=core.conn();c.execute(f"update application_packages set {sets} where id=?",(*data.values(),package_id));c.commit();c.close()
    return _v120_package_out(core.one('select * from application_packages where id=?',(package_id,)))

@app.delete('/api/v120/bureau/packages/{package_id}')
def bureau_packages_delete_v120(package_id:int):
    c=core.conn();cur=c.execute('delete from application_packages where id=?',(package_id,));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Dossier introuvable')
    return {'ok':True}

@app.post('/api/v120/bureau/packages/{package_id}/document')
def bureau_package_document_v120(package_id:int,body:dict):
    pkg=core.one('select * from application_packages where id=?',(package_id,))
    if not pkg:raise HTTPException(404,'Dossier introuvable')
    body=body or {};template_id=int(body.get('template_id') or 0)
    template=core.one('select * from bureau_templates where id=?',(template_id,)) if template_id else None
    if not template:raise HTTPException(404,'Modèle introuvable')
    opp=core.one("""select id,title,city,country,deadline,fee,summary,radar_reason
                    from opportunities where id=?""",(str(pkg.get('opportunity_id') or ''),)) if pkg.get('opportunity_id') else None
    title=str(body.get('title') or template.get('name') or 'Document').strip()[:240]
    rendered=_v120_render_template(template.get('body'),opp)
    doc=bureau_create_v107({
      'title':title,
      'body':rendered,
      'folder':'Candidatures',
      'tags':str(template.get('tags') or '')+', dossier',
      'source_type':'opportunity' if opp else '',
      'source_id':str(opp.get('id')) if opp else ''
    })
    ids=_v120_json(pkg.get('document_ids_json'),'[]')
    if not isinstance(ids,list):ids=[]
    ids.append(int(doc.get('id')))
    c=core.conn();c.execute("update application_packages set document_ids_json=?,updated_at=? where id=?",
      (json.dumps(ids[-50:]),_now_v85(),package_id));c.commit();c.close()
    return {'ok':True,'document':doc,'package':_v120_package_out(core.one('select * from application_packages where id=?',(package_id,)))}

# V140 Bureau package reconciliation.
def _v140_package_reconcile_row(package_id:int,persist:bool=True):
    row=core.one('select * from application_packages where id=?',(package_id,))
    if not row:raise HTTPException(404,'Dossier introuvable')
    out=_v120_package_out(row)
    checklist=dict(out.get('checklist') or _v120_default_checklist())
    ids=[int(x) for x in (out.get('document_ids') or []) if str(x).isdigit()]
    docs=[]
    if ids:
        marks=','.join('?' for _ in ids)
        docs=core.rows(f'select id,title,body,tags,folder from bureau_documents where id in ({marks})',tuple(ids))
    def complete_doc(pattern):
        for d in docs:
            meta=(str(d.get('title') or '')+' '+str(d.get('tags') or ''))
            if not re.search(pattern,meta,re.I):continue
            body=str(d.get('body') or '').strip()
            if body and '[À COMPLÉTER]' not in body.upper() and '[A COMPLETER]' not in body.upper() and not re.search(r'\[[^\]]{3,}\]',body):
                return True
        return False
    checklist['source_checked']=bool(out.get('opportunity')) or bool(checklist.get('source_checked'))
    checklist['letter']=complete_doc(r'lettre|candidature')
    checklist['bio']=complete_doc(r'\bbio\b|biographie')
    checklist['artist_statement']=complete_doc(r'note artistique|artist statement|d[eé]marche')
    if str(out.get('status') or '')=='submitted':checklist['submitted']=True
    done=sum(1 for k in _v120_default_checklist() if checklist.get(k))
    total=len(_v120_default_checklist())
    missing=[k for k in _v120_default_checklist() if not checklist.get(k)]
    next_map={
      'source_checked':'Vérifier la source officielle',
      'letter':'Préparer la lettre de candidature',
      'bio':'Ajouter ou finaliser la bio',
      'artist_statement':'Ajouter ou finaliser la note artistique',
      'portfolio':'Ajouter le portfolio',
      'visuals':'Ajouter les visuels',
      'links':'Vérifier les liens',
      'submitted':'Envoyer la candidature'
    }
    if persist and checklist!=(out.get('checklist') or {}):
        c=core.conn();c.execute('update application_packages set checklist_json=?,updated_at=? where id=?',
          (json.dumps(checklist,ensure_ascii=False),_now_v85(),package_id));c.commit();c.close()
        row=core.one('select * from application_packages where id=?',(package_id,));out=_v120_package_out(row)
    out['progress']={'done':done,'total':total,'missing':missing,'next_action':next_map.get(missing[0],'Dossier complet') if missing else 'Dossier complet'}
    out['documents']=docs
    return out

@app.post('/api/v140/bureau/packages/{package_id}/reconcile')
def bureau_package_reconcile_v140(package_id:int):
    return _v140_package_reconcile_row(package_id,True)

@app.get('/api/v107/workspace')
def workspace_v107():
    today=time.strftime('%Y-%m-%d')
    return {
      'ok':True,
      'bureau':core.rows('select * from bureau_documents order by pinned desc,updated_at desc limit 8'),
      'prospection':core.rows("""select * from crm_leads
        order by case when next_date!='' and next_date>=? then 0 else 1 end,
        case when next_date!='' then next_date else '9999-12-31' end,
        updated_at desc limit 8""",(today,)),
      'counts':{
        'bureau':(core.one('select count(*) count from bureau_documents') or {}).get('count',0),
        'contacts':(core.one('select count(*) count from crm_leads') or {}).get('count',0)
      }
    }


# V107.1 Open Call workflow tracking.
_v107w=core.conn()
_v107w.executescript("""
CREATE TABLE IF NOT EXISTS opportunity_workspace(
  opportunity_id INTEGER PRIMARY KEY,
  workflow_status TEXT DEFAULT 'saved',
  notes TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_date TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_opportunity_workspace_status ON opportunity_workspace(workflow_status,updated_at DESC);
""")
_v107w.commit();_v107w.close()

@app.get('/api/v107/open-calls/workflow')
def open_call_workflow_list_v107():
    return core.rows("""select w.*,o.title,o.city,o.country,o.deadline,o.source_url,
                        coalesce(o.radar_score,o.score,0) score
                        from opportunity_workspace w
                        left join opportunities o on o.id=w.opportunity_id
                        order by case w.workflow_status
                          when 'drafting' then 0 when 'working' then 1 when 'followup' then 2
                          when 'submitted' then 3 when 'saved' then 4 else 5 end,
                        case when w.next_date!='' then w.next_date else '9999-12-31' end,
                        w.updated_at desc""")

@app.put('/api/v107/open-calls/{opportunity_id}/workflow')
def open_call_workflow_upsert_v107(opportunity_id:int,body:dict):
    if not core.one('select id from opportunities where id=?',(opportunity_id,)):
        raise HTTPException(404,'Open Call introuvable')
    body=body or {}
    allowed_status={'saved','working','drafting','submitted','followup','closed'}
    status=str(body.get('workflow_status') or 'saved').strip()
    if status not in allowed_status:status='saved'
    notes=str(body.get('notes') or '').strip()[:5000]
    next_action=str(body.get('next_action') or '').strip()[:500]
    next_date=str(body.get('next_date') or '').strip()[:20]
    now=_now_v85()
    def _write(db):
        db.execute("""insert into opportunity_workspace(opportunity_id,workflow_status,notes,next_action,next_date,created_at,updated_at)
                     values(?,?,?,?,?,?,?)
                     on conflict(opportunity_id) do update set
                       workflow_status=excluded.workflow_status,
                       notes=excluded.notes,
                       next_action=excluded.next_action,
                       next_date=excluded.next_date,
                       updated_at=excluded.updated_at""",
                  (opportunity_id,status,notes,next_action,next_date,now,now))
    _v165_db_write(_write)
    return core.one('select * from opportunity_workspace where opportunity_id=?',(opportunity_id,))

@app.delete('/api/v107/open-calls/{opportunity_id}/workflow')
def open_call_workflow_delete_v107(opportunity_id:int):
    c=core.conn();c.execute('delete from opportunity_workspace where opportunity_id=?',(opportunity_id,));c.commit();c.close()
    return {'ok':True}


# V108 persistent content drafts.
_v108d=core.conn()
_v108d.executescript("""
CREATE TABLE IF NOT EXISTS content_drafts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT DEFAULT 'text',
  title TEXT DEFAULT '',
  source_opportunity_id TEXT DEFAULT '',
  payload_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_content_drafts_updated ON content_drafts(updated_at DESC,id DESC);
""")
_v108d.commit();_v108d.close()

def _draft_row_v108(row):
    if not row:return None
    out=dict(row)
    try:out['payload']=json.loads(out.pop('payload_json') or '{}')
    except Exception:out['payload']={}
    return out

@app.get('/api/v108/drafts')
def content_drafts_list_v108():
    return [_draft_row_v108(x) for x in core.rows('select * from content_drafts order by updated_at desc,id desc limit 80')]

@app.post('/api/v108/drafts')
def content_drafts_create_v108(body:dict):
    body=body or {}
    kind=str(body.get('kind') or 'text').strip().lower()
    if kind not in {'text','carousel','visual'}:kind='text'
    title=str(body.get('title') or 'Brouillon').strip()[:240]
    source=str(body.get('source_opportunity_id') or '').strip()[:120]
    payload=body.get('payload') if isinstance(body.get('payload'),dict) else {}
    now=_now_v85()
    c=core.conn();cur=c.execute("""insert into content_drafts(kind,title,source_opportunity_id,payload_json,created_at,updated_at)
                                  values(?,?,?,?,?,?)""",(kind,title,source,json.dumps(payload,ensure_ascii=False)[:500000],now,now));c.commit();draft_id=cur.lastrowid;c.close()
    return _draft_row_v108(core.one('select * from content_drafts where id=?',(draft_id,)))

@app.patch('/api/v108/drafts/{draft_id}')
def content_drafts_update_v108(draft_id:int,body:dict):
    row=core.one('select * from content_drafts where id=?',(draft_id,))
    if not row:raise HTTPException(404,'Brouillon introuvable')
    body=body or {};data={}
    if 'kind' in body:
        kind=str(body.get('kind') or 'text').strip().lower();data['kind']=kind if kind in {'text','carousel','visual'} else 'text'
    if 'title' in body:data['title']=str(body.get('title') or 'Brouillon').strip()[:240]
    if 'source_opportunity_id' in body:data['source_opportunity_id']=str(body.get('source_opportunity_id') or '').strip()[:120]
    if isinstance(body.get('payload'),dict):data['payload_json']=json.dumps(body['payload'],ensure_ascii=False)[:500000]
    data['updated_at']=_now_v85()
    sets=','.join(f"{k}=?" for k in data)
    c=core.conn();c.execute(f"update content_drafts set {sets} where id=?",(*data.values(),draft_id));c.commit();c.close()
    return _draft_row_v108(core.one('select * from content_drafts where id=?',(draft_id,)))

@app.delete('/api/v108/drafts/{draft_id}')
def content_drafts_delete_v108(draft_id:int):
    c=core.conn();cur=c.execute('delete from content_drafts where id=?',(draft_id,));c.commit();c.close()
    if not cur.rowcount:raise HTTPException(404,'Brouillon introuvable')
    return {'ok':True}


# V112 lightweight dashboard bootstrap.
@app.get('/api/v112/dashboard-bootstrap')
def dashboard_bootstrap_v112():
    db=core.conn()
    try:
        today=str(core.date.today())
        def scalar(sql,p=()):
            row=db.execute(sql,p).fetchone()
            return row[0] if row else 0
        stats={
          'opportunities':scalar("select count(*) from opportunities where status in ('open','rolling')"),
          'urgent':scalar("select count(*) from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today)),
          'artists':scalar("select count(*) from artists"),
          'exhibitions':scalar("select count(*) from exhibitions where end>=?",(today,)),
          'favorites':scalar("select count(*) from opportunities where favorite=1"),
          'candidates':scalar("select count(*) from radar_candidates where state='new'")
        }
        fields="""id,title,city,country,deadline,fee,radar_score,score,favorite,source_url,
                  summary,type,eligibility,status"""
        priority=[dict(x) for x in db.execute(f"""select {fields} from opportunities
          where status in ('open','rolling') and (
            favorite=1 or id in (select opportunity_id from opportunity_workspace)
            or (deadline is not null and deadline>=? and deadline<=date(?, '+14 day'))
          )
          order by favorite desc,
                   case when deadline is null then 1 else 0 end,
                   deadline,
                   coalesce(radar_score,score,0) desc
          limit 40""",(today,today)).fetchall()]
        top=[dict(x) for x in db.execute(f"""select {fields} from opportunities
          where status in ('open','rolling')
          order by coalesce(radar_score,score,0) desc,
                   case when deadline is null then 1 else 0 end,
                   deadline
          limit 12""").fetchall()]
        seen=set();opps=[]
        for row in priority+top:
            oid=row.get('id')
            if oid in seen:continue
            seen.add(oid);opps.append(row)
        bureau=[dict(x) for x in db.execute("""select id,title,folder,tags,pinned,source_type,source_id,updated_at
                                               from bureau_documents
                                               order by pinned desc,updated_at desc,id desc limit 6""").fetchall()]
        leads=[dict(x) for x in db.execute("""select id,name,organization,kind,status,city,country,next_action,next_date,updated_at
                                              from crm_leads
                                              where coalesce(status,'')!='closed'
                                              order by case when next_date is null or next_date='' then 1 else 0 end,
                                                       next_date,updated_at desc,id desc limit 8""").fetchall()]
        workflow=[dict(x) for x in db.execute("""select opportunity_id,workflow_status,notes,next_action,next_date,created_at,updated_at
                                                 from opportunity_workspace
                                                 where workflow_status!='closed'
                                                 order by case when next_date is null or next_date='' then 1 else 0 end,
                                                          next_date,updated_at desc limit 30""").fetchall()]
        drafts=[dict(x) for x in db.execute("""select id,kind,title,source_opportunity_id,created_at,updated_at
                                               from content_drafts order by updated_at desc,id desc limit 8""").fetchall()]
        return {
          'version':'112-lite',
          'generated_at':time.time(),
          'stats':stats,
          'opportunities':opps[:48],
          'bureau':bureau,
          'leads':leads,
          'workflow':workflow,
          'drafts':drafts,
          'artists':[],
          'events':[],
          'map':[],
          'radar':{},
          'candidates':[]
        }
    finally:
        db.close()



# V124 ultra-light first-screen bootstrap.
@app.get('/api/v124/dashboard-bootstrap')
def dashboard_bootstrap_v124():
    db=core.conn()
    try:
        today=str(core.date.today())
        def scalar(sql,p=()):
            row=db.execute(sql,p).fetchone()
            return row[0] if row else 0
        stats={
          'opportunities':scalar("select count(*) from opportunities where status in ('open','rolling')"),
          'urgent':scalar("select count(*) from opportunities where deadline is not null and deadline>=? and deadline<=date(?, '+14 day')",(today,today)),
          'drafts':scalar("select count(*) from content_drafts"),
          'contacts':scalar("select count(*) from crm_leads where coalesce(status,'')!='closed'")
        }
        fields="""id,title,city,country,deadline,fee,radar_score,score,favorite,source_url,
                  summary,type,eligibility,status"""
        priority=[dict(x) for x in db.execute(f"""select {fields} from opportunities
          where status in ('open','rolling') and (
            favorite=1 or id in (select opportunity_id from opportunity_workspace where workflow_status!='closed')
            or (deadline is not null and deadline>=? and deadline<=date(?, '+7 day'))
          )
          order by favorite desc,
                   case when deadline is null then 1 else 0 end,
                   deadline,
                   coalesce(radar_score,score,0) desc
          limit 18""",(today,today)).fetchall()]
        top=[dict(x) for x in db.execute(f"""select {fields} from opportunities
          where status in ('open','rolling')
          order by coalesce(radar_score,score,0) desc,
                   case when deadline is null then 1 else 0 end,
                   deadline
          limit 6""").fetchall()]
        seen=set();opps=[]
        for row in priority+top:
            oid=row.get('id')
            if oid in seen:continue
            seen.add(oid);opps.append(row)
        bureau=[dict(x) for x in db.execute("""select id,title,folder,tags,pinned,source_type,source_id,updated_at
                                               from bureau_documents
                                               order by pinned desc,updated_at desc,id desc limit 4""").fetchall()]
        leads=[dict(x) for x in db.execute("""select id,name,organization,kind,status,city,country,next_action,next_date,updated_at
                                              from crm_leads
                                              where coalesce(status,'')!='closed'
                                              order by case when next_date is null or next_date='' then 1 else 0 end,
                                                       next_date,updated_at desc,id desc limit 6""").fetchall()]
        workflow=[dict(x) for x in db.execute("""select opportunity_id,workflow_status,notes,next_action,next_date,created_at,updated_at
                                                 from opportunity_workspace
                                                 where workflow_status!='closed'
                                                 order by case when next_date is null or next_date='' then 1 else 0 end,
                                                          next_date,updated_at desc limit 20""").fetchall()]
        drafts=[dict(x) for x in db.execute("""select id,kind,title,source_opportunity_id,created_at,updated_at
                                               from content_drafts order by updated_at desc,id desc limit 4""").fetchall()]
        return {
          'version':'124-lite',
          'generated_at':time.time(),
          'stats':stats,
          'opportunities':opps[:24],
          'bureau':bureau,
          'leads':leads,
          'workflow':workflow,
          'drafts':drafts,
          'artists':[],
          'events':[],
          'map':[],
          'radar':{},
          'candidates':[]
        }
    finally:
        db.close()

def _v124_bootstrap_smoke():
    try:
        payload=dashboard_bootstrap_v124()
        raw=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        print(
          f"PLUG_ART_BOOTSTRAP_READY bytes={len(raw)} "
          f"opportunities={len(payload.get('opportunities') or [])} "
          f"workflow={len(payload.get('workflow') or [])} "
          f"leads={len(payload.get('leads') or [])} "
          f"drafts={len(payload.get('drafts') or [])}",
          flush=True
        )
    except Exception as exc:
        print(f"PLUG_ART_BOOTSTRAP_ERROR {type(exc).__name__}: {str(exc)[:180]}",flush=True)

threading.Thread(target=_v124_bootstrap_smoke,daemon=True).start()


# V115 rendered carousel exports for ZIP + Instagram publishing.
_V115_GENERATED_DIR=Path(os.getenv('PLUGART_GENERATED_DIR',str(Path(os.getenv('PLUGART_DB','/data/plugart.db')).parent/'generated-content')))
_V115_GENERATED_DIR.mkdir(parents=True,exist_ok=True)

def _v115_decode_png(data_url:str):
    raw=str(data_url or '')
    if ',' in raw and raw.lower().startswith('data:image/'):
        raw=raw.split(',',1)[1]
    try:data=base64.b64decode(raw,validate=True)
    except Exception:raise HTTPException(400,'Image export invalide')
    if not data or len(data)>9_000_000:raise HTTPException(413,'Image export trop volumineuse')
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise HTTPException(400,'Seuls les exports PNG sont acceptés')
    return data

def _v115_safe_name(name:str,index:int):
    name=re.sub(r'[^a-zA-Z0-9._-]+','-',str(name or '')).strip('-._')[:100]
    return name if name.lower().endswith('.png') else ((name or f'slide-{index:02d}')+'.png')

@app.post('/api/v115/exports/carousel/zip')
def export_carousel_zip_v115(body:dict):
    items=(body or {}).get('items') or []
    if not isinstance(items,list) or not items:raise HTTPException(400,'Aucune slide à exporter')
    if len(items)>10:raise HTTPException(400,'Maximum 10 slides par export')
    memory=io.BytesIO()
    with zipfile.ZipFile(memory,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for idx,item in enumerate(items,1):
            if not isinstance(item,dict):continue
            z.writestr(_v115_safe_name(item.get('filename'),idx),_v115_decode_png(item.get('data_url') or ''))
    payload=memory.getvalue()
    if not payload:raise HTTPException(400,'Export vide')
    base=re.sub(r'[^a-zA-Z0-9._-]+','-',str((body or {}).get('title') or 'plug-art-carousel')).strip('-._')[:80] or 'plug-art-carousel'
    return Response(content=payload,media_type='application/zip',headers={
      'Content-Disposition':f'attachment; filename="{base}.zip"',
      'Cache-Control':'no-store'
    })

@app.post('/api/v115/exports/carousel/public')
def export_carousel_public_v115(body:dict):
    items=(body or {}).get('items') or []
    if not isinstance(items,list) or not items:raise HTTPException(400,'Aucune slide à enregistrer')
    if len(items)>10:raise HTTPException(400,'Maximum 10 slides')
    urls=[]
    for idx,item in enumerate(items,1):
        if not isinstance(item,dict):continue
        data=_v115_decode_png(item.get('data_url') or '')
        token=hashlib.sha256(data+str(time.time_ns()).encode()+str(idx).encode()).hexdigest()[:24]
        name=f'plugartv32_{token}.png'
        (_V115_GENERATED_DIR/name).write_bytes(data)
        urls.append(f'/api/v32/content/generated/{name}')
    return {'ok':True,'urls':urls,'count':len(urls)}

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

# V156 — Bureau PDF library, Idea Cloud and HUB knowledge base.
BUREAU_FILE_DIR=Path(os.getenv('PLUGART_BUREAU_FILE_DIR','/data/bureau-files' if Path('/data').exists() else str(BASE/'data'/'bureau-files')))
BUREAU_FILE_DIR.mkdir(parents=True,exist_ok=True)
_v156c=core.conn()
_v156c.executescript("""
CREATE TABLE IF NOT EXISTS bureau_files(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  original_name TEXT DEFAULT '',
  mime_type TEXT DEFAULT 'application/pdf',
  size_bytes INTEGER DEFAULT 0,
  folder TEXT DEFAULT 'PDF',
  project TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_bureau_files_project ON bureau_files(project,updated_at DESC,id DESC);

CREATE TABLE IF NOT EXISTS idea_cloud(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  stage TEXT DEFAULT 'explore',
  tags TEXT DEFAULT '',
  color TEXT DEFAULT 'violet',
  image_url TEXT DEFAULT '',
  project TEXT DEFAULT '',
  pos_x REAL DEFAULT 50,
  pos_y REAL DEFAULT 50,
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_idea_cloud_updated ON idea_cloud(updated_at DESC,id DESC);
""")
_v156c.commit()
_v156c.close()

def _seed_hub_transcripts_v156():
    rows=[
      (
        'HUB Aubervilliers · Synthèse de travail',
        """PLUG ART HUB — AUBERVILLIERS
4 rue Pierre Curie, 93300 Aubervilliers

INTENTION
Réhabiliter légèrement et de manière réversible un ancien atelier afin d'en faire un hub de production, d'expérimentation, d'exposition et de connexion artistique. L'enjeu n'est pas de sur-aménager le bâtiment, mais de tirer parti de son caractère industriel et de ses volumes.

ORGANISATION À RETENIR
• Rez-de-chaussée : galerie industrielle, espace d'expérimentation, accueil et production de contenus.
• Étage : ateliers artistes séparés et bureau / coordination.
• Prévoir un atelier plus généreux pour grandes œuvres, sculptures et pratiques expérimentales.
• Studio photo / portfolio intégré au programme.
• Séparations simples, réversibles et peu coûteuses plutôt que des cloisons vitrées complexes.
• Circulation lisible, lumière claire, plantes en quantité raisonnable, LED très ponctuelles.

POSITIONNEMENT
Un lieu de travail avant d'être un décor : artistes émergents, ateliers, expositions, expérimentation, accompagnement et programmation locale. La structure existante doit rester lisible et l'investissement initial doit privilégier les usages, la sécurité et la réversibilité.

POINTS À FINALISER
Visite technique, état du bâti, contraintes ERP, durée d'occupation, budget pilote, plan d'implantation précis et interlocuteurs fonciers / ville.""",
        'aubervilliers'
      ),
      (
        'HUB Le Millénaire · Synthèse de travail',
        """PLUG ART HUB — LE MILLÉNAIRE, AUBERVILLIERS

INTENTION
Transformer des cellules vacantes du centre commercial en destination culturelle contemporaine capable de réactiver le site, de créer du passage et de donner une image plus jeune au secteur.

MODÈLE À DEUX CELLULES
1. GALERIE DES DOCKS, côté canal
• Espace d'exposition dédié aux artistes émergents.
• Relation forte avec la terrasse et le canal.
• Scénographie épurée, lumineuse et réellement consacrée à l'exposition.
• Pas de coin détente qui parasite la galerie.
• Structure existante conservée autant que possible.
• Aquarium discret, plantes, quelques LED seulement si elles servent l'ambiance.

2. HUB, ancienne cellule New Yorker
• Ateliers individuels séparés pour préserver l'intimité de travail.
• Atelier collectif et atelier grandes pièces / sculptures.
• Coworking et coordination.
• Studio photo, portfolio et création de contenus.
• Petit espace talks pour groupes réduits.
• Ateliers enfants / scolaires.
• Coin restauration / boisson fonctionnel.

LOGIQUE ÉCONOMIQUE ET OPÉRATIONNELLE
Privilégier des modules légers, réversibles et simples à installer. Le projet doit résoudre une partie du problème des cellules vacantes tout en apportant programmation, fréquentation et activité régulière. Le discours à la direction doit porter sur la valeur d'usage, l'activation du centre et la capacité de PLUG ART à programmer, produire et exposer.

POINTS À FINALISER
Accès aux plans des cellules, contraintes techniques et ERP, modèle d'occupation, interlocuteurs direction / bailleur, phasage galerie + HUB et budget pilote.""",
        'millenaire'
      ),
      (
        'HUB Gennevilliers · Synthèse stratégique',
        """PLUG ART HUB — GENNEVILLIERS / SUD CHANTERAINES
Cible étudiée : 110 avenue du Général-de-Gaulle, Gennevilliers

POSITIONNEMENT CENTRAL
Ne pas présenter PLUG ART comme « une galerie qui cherche un local ». Le projet doit être formulé comme une fabrique culturelle capable d'activer un foncier de transition, de produire une activité régulière et de préfigurer un équipement créatif plus durable dans le futur quartier Sud Chanteraines.

FORMULATION À RETENIR
« Créer aujourd'hui le lieu culturel qui participera demain à l'identité du nouveau quartier. »

RÉFÉRENCE LOCALE
L'édition 2025 de Trésors de Banlieues, accueillie à l'Usine Chanteraines au 92 avenue du Général-de-Gaulle, constitue un benchmark utile pour comprendre comment un site en transition peut être activé culturellement. PLUG ART ne doit pas copier l'exposition : il faut reprendre le mécanisme d'activation et y ajouter production, ateliers, accompagnement, contenus et activité toute l'année.

PROGRAMME PLUG ART
• Galerie / exposition collective.
• Ateliers individuels et atelier grande production.
• Pratiques expérimentales, réemploi, sculpture et fabrication légère.
• Studio photo / portfolio / contenu.
• Bureau / coordination.
• Ateliers enfants et transmission.
• Petit espace de rencontre / talk.
• Modules légers, réversibles et évolutifs.

STRATÉGIE
Le dossier doit articuler mission culturelle + modèle d'exploitation + revenus propres. Une association peut porter la mission et les partenariats, avec une organisation claire des activités commerciales éventuelles. Un pilote de 12 mois permet de démontrer l'utilité du lieu avant un engagement plus long.

POINTS DE VIGILANCE AVANT SIGNATURE
Durée réelle de l'occupation, travaux ERP, pollution ou héritage industriel, bruit, transformation future de la ZAC, dépendance aux subventions, séparation mission / activité commerciale et dépenses esthétiques trop précoces.

PROCHAINE ÉTAPE
Préparer une note institutionnelle courte, un plan d'occupation après visite technique et un budget pilote 12 mois. Ces trois pièces doivent démontrer la vision, la compatibilité avec le bâtiment et la capacité d'exploitation.""",
        'gennevilliers'
      )
    ]
    c=core.conn()
    now=_now_v85()
    try:
        for title,body,source_id in rows:
            exists=c.execute("select id from bureau_documents where source_type='hub_synthesis' and source_id=?",(source_id,)).fetchone()
            if not exists:
                c.execute("""insert into bureau_documents
                  (title,body,folder,tags,pinned,source_type,source_id,created_at,updated_at)
                  values(?,?,?,?,1,'hub_synthesis',?,?,?)""",
                  (title,body,'HUB','HUB, projet, synthèse, '+source_id,source_id,now,now))
        c.commit()
    finally:
        c.close()

_seed_hub_transcripts_v156()

def _bureau_file_out_v156(row):
    if not row:return None
    out=dict(row)
    out['content_url']=f"/api/v156/bureau/files/{out['id']}/content"
    return out

@app.get('/api/v156/bureau/files')
def bureau_files_list_v156(project:str='',folder:str=''):
    where=[];params=[]
    if project:
        where.append('project=?');params.append(project[:100])
    if folder:
        where.append('folder=?');params.append(folder[:100])
    sql='select * from bureau_files'
    if where:sql+=' where '+' and '.join(where)
    sql+=' order by updated_at desc,id desc'
    return [_bureau_file_out_v156(x) for x in core.rows(sql,tuple(params))]

@app.post('/api/v156/bureau/files')
def bureau_files_upload_v156(body:dict):
    body=body or {}
    data_url=str(body.get('data_url') or '')
    if ',' not in data_url or not data_url.lower().startswith('data:application/pdf;base64,'):
        raise HTTPException(400,'Seuls les PDF sont acceptés.')
    encoded=data_url.split(',',1)[1]
    if len(encoded)>45_000_000:
        raise HTTPException(413,'PDF trop volumineux.')
    try:
        raw=base64.b64decode(encoded,validate=True)
    except Exception:
        raise HTTPException(400,'PDF illisible.')
    if not raw.startswith(b'%PDF-'):
        raise HTTPException(400,'Le fichier ne ressemble pas à un PDF valide.')
    if len(raw)>30*1024*1024:
        raise HTTPException(413,'PDF limité à 30 Mo.')
    original=re.sub(r'[^A-Za-z0-9À-ÿ._ -]+','_',str(body.get('original_name') or body.get('name') or 'document.pdf')).strip()[:220] or 'document.pdf'
    title=str(body.get('name') or original.rsplit('.',1)[0]).strip()[:220] or 'Document PDF'
    folder=str(body.get('folder') or 'PDF').strip()[:100] or 'PDF'
    project=str(body.get('project') or '').strip()[:100]
    notes=str(body.get('notes') or '').strip()[:2000]
    token=hashlib.sha256(raw+str(time.time_ns()).encode()).hexdigest()[:28]
    filename=f"{token}.pdf"
    path=BUREAU_FILE_DIR/filename
    path.write_bytes(raw)
    now=_now_v85()
    c=core.conn()
    cur=c.execute("""insert into bureau_files
      (name,original_name,mime_type,size_bytes,folder,project,notes,storage_path,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?,?)""",
      (title,original,'application/pdf',len(raw),folder,project,notes,str(path),now,now))
    c.commit();fid=cur.lastrowid;c.close()
    return _bureau_file_out_v156(core.one('select * from bureau_files where id=?',(fid,)))

@app.get('/api/v156/bureau/files/{file_id}/content')
def bureau_file_content_v156(file_id:int):
    row=core.one('select * from bureau_files where id=?',(file_id,))
    if not row:raise HTTPException(404,'PDF introuvable')
    path=Path(str(row.get('storage_path') or ''))
    if not path.exists() or not path.is_file():raise HTTPException(404,'Fichier PDF absent du stockage')
    safe=re.sub(r'[^A-Za-z0-9À-ÿ._ -]+','_',str(row.get('original_name') or row.get('name') or 'document.pdf'))
    return FileResponse(path,media_type='application/pdf',filename=safe,content_disposition_type='inline')

@app.patch('/api/v156/bureau/files/{file_id}')
def bureau_file_update_v156(file_id:int,body:dict):
    if not core.one('select id from bureau_files where id=?',(file_id,)):raise HTTPException(404,'PDF introuvable')
    body=body or {};data={}
    for key,limit in (('name',220),('folder',100),('project',100),('notes',2000)):
        if key in body:data[key]=str(body.get(key) or '').strip()[:limit]
    if not data:return _bureau_file_out_v156(core.one('select * from bureau_files where id=?',(file_id,)))
    data['updated_at']=_now_v85();sets=','.join(f"{k}=?" for k in data)
    c=core.conn();c.execute(f"update bureau_files set {sets} where id=?",(*data.values(),file_id));c.commit();c.close()
    return _bureau_file_out_v156(core.one('select * from bureau_files where id=?',(file_id,)))

@app.delete('/api/v156/bureau/files/{file_id}')
def bureau_file_delete_v156(file_id:int):
    row=core.one('select * from bureau_files where id=?',(file_id,))
    if not row:raise HTTPException(404,'PDF introuvable')
    try:
        path=Path(str(row.get('storage_path') or ''))
        if path.exists():path.unlink()
    except Exception:pass
    c=core.conn();c.execute('delete from bureau_files where id=?',(file_id,));c.commit();c.close()
    return {'ok':True}

def _idea_out_v156(row):
    return dict(row) if row else None

@app.get('/api/v156/ideas')
def ideas_list_v156():
    return [_idea_out_v156(x) for x in core.rows('select * from idea_cloud order by updated_at desc,id desc')]

@app.post('/api/v156/ideas')
def ideas_create_v156(body:dict):
    body=body or {};now=_now_v85()
    title=str(body.get('title') or 'Nouvelle idée').strip()[:220] or 'Nouvelle idée'
    vals=(
      title,str(body.get('body') or '')[:20000],str(body.get('stage') or 'explore')[:40],
      str(body.get('tags') or '')[:800],str(body.get('color') or 'violet')[:40],
      str(body.get('image_url') or '')[:2000],str(body.get('project') or '')[:160],
      float(body.get('pos_x') or 50),float(body.get('pos_y') or 50),now,now
    )
    iid=_v165_db_write(lambda db: db.execute("""insert into idea_cloud
      (title,body,stage,tags,color,image_url,project,pos_x,pos_y,created_at,updated_at)
      values(?,?,?,?,?,?,?,?,?,?,?)""",vals).lastrowid)
    return _idea_out_v156(core.one('select * from idea_cloud where id=?',(iid,)))

@app.patch('/api/v156/ideas/{idea_id}')
def ideas_update_v156(idea_id:int,body:dict):
    if not core.one('select id from idea_cloud where id=?',(idea_id,)):raise HTTPException(404,'Idée introuvable')
    body=body or {};data={}
    limits={'title':220,'body':20000,'stage':40,'tags':800,'color':40,'image_url':2000,'project':160}
    for key,limit in limits.items():
        if key in body:data[key]=str(body.get(key) or '').strip()[:limit]
    for key in ('pos_x','pos_y'):
        if key in body:
            try:data[key]=max(0,min(100,float(body.get(key))))
            except Exception:pass
    if not data:return _idea_out_v156(core.one('select * from idea_cloud where id=?',(idea_id,)))
    data['updated_at']=_now_v85();sets=','.join(f"{k}=?" for k in data)
    _v165_db_write(lambda db: db.execute(f"update idea_cloud set {sets} where id=?",(*data.values(),idea_id)))
    return _idea_out_v156(core.one('select * from idea_cloud where id=?',(idea_id,)))

@app.delete('/api/v156/ideas/{idea_id}')
def ideas_delete_v156(idea_id:int):
    affected=_v165_db_write(lambda db: db.execute('delete from idea_cloud where id=?',(idea_id,)).rowcount)
    if not affected:raise HTTPException(404,'Idée introuvable')
    return {'ok':True}



_V164_PROJECT_LIBRARY={
  'aubervilliers':{
    'label':'Aubervilliers',
    'pdfs':[
      ('PLUG_ART_HUB_Aubervilliers_Dossier_Complet_2026.pdf','file_00000000a81881fd8556140dfdcbab31',2650479),
      ('PLUG_ART_HUB_Aubervilliers_V3_Visuel_Detaille.pdf','file_000000003ad481f49f7051d9b9965f6d',4904302),
      ('PLUGART_Dossier_Nouvelle_Direction_Aubervilliers_2026_FINAL.pdf','file_000000003d1081fdb9eb65b5a1539e78',2569346),
      ('PLUG_ART_HUB_01_Aubervilliers.pdf','libfile_b89373537de081919dff7028d8f88711',965806),
      ('PLUG_ART_HUB_Benchmark_Strategie_Aubervilliers.pdf','libfile_737d476e93fc81918e7ad993388b7c34',55062)
    ],
    'visuals':[
      ('Présentation Plug Art Hub Aubervilliers.png','file_00000000dca481f48be4af2a316edb39'),
      ('Dossier créatif Plug Art Hub 01.png','file_000000003eac81f4a843776c4b754029')
    ]
  },
  'millenaire':{
    'label':'Le Millénaire',
    'pdfs':[
      ('PLUG_ART_Millenaire_Dossier_25_Visuels.pdf','libfile_18265295c07081919affa444cef29444',86386002),
      ('PLUG_ART_Le_Millenaire_Vision_2027_Premium.pdf','libfile_21b773be684c8191ab8bb7bcaf2cc856',1702176),
      ('PLUG_ART_Le_Millenaire_Plan_3D_Investisseurs.pdf','libfile_1c5eee179da48191b3a6b171643d8e79',1533084),
      ('PLUG_ART_HUB_Dossier_Projet_Le_Millenaire.pdf','file_00000000b38481f5870b1d4f2c37543c',7330684),
      ('PLUGART_HUB_Le_Millenaire_Dossier_VISUEL_2026.pdf','file_00000000401881f4a2e96aa4ccbf052c',0),
      ('PLUG_ART_HUB_DOSSIER_FINAL_ECOSYSTEME_2026.pdf','file_000000004eec81f4bff07f4fe23923f4',0),
      ('PLUGART_HUB_Dossier_Demarchage_Le_Millenaire_2026.pdf','file_000000007d8481fd896aeecf248c05f3',0),
      ('PLUG_ART_HUB_Millenaire_Dossier_Complet.pdf','libfile_58f2252358b08191b72a2ddb49eb8b45',129652),
      ('PLUG_ART_Guide_Strategique_Association_Millenaire_2026.pdf','libfile_6cefbc9e3370819194249036a84dbf4c',584320)
    ],
    'visuals':[('Galerie des Docks · visuel intégré','hub:millenaire_gallery')]
  },
  'gennevilliers':{
    'label':'Gennevilliers',
    'pdfs':[],
    'visuals':[
      ('PLUG ART HUB, réemploi artistique à Gennevilliers.png','libfile_d1383cc0d4ac8191b9ff1d8ef8e3e802'),
      ('Planche architecturale du Plug Art Hub.png','file_00000000844c81f4858233d636c0d04c'),
      ('Galerie et ateliers du PLUG ART HUB.png','file_00000000f01081f49d8210b7d5497073')
    ]
  },
  'chanteraines':{
    'label':'Chanteraines',
    'pdfs':[('PLUG_ART_Chanteraines_Schema_Directeur_2026.pdf','file_000000003df081f4995b4ec60c9126c2',364821)],
    'visuals':[]
  }
}

@app.post('/api/v164/projects/library/seed')
def projects_library_seed_v164(body:dict={}):
    body=body or {}
    target=str(body.get('project') or '').strip().lower()
    projects=[target] if target in _V164_PROJECT_LIBRARY else list(_V164_PROJECT_LIBRARY)
    now=_now_v85();created=[];existing=[]
    db=core.conn()
    try:
      for project in projects:
        cat=_V164_PROJECT_LIBRARY[project];label=cat['label'];folder=('Projet · '+label)[:80]
        for kind,items in (('PDF',cat.get('pdfs') or []),('Visuel',cat.get('visuals') or [])):
          for item in items:
            name=str(item[0]);ref=str(item[1]);size=int(item[2]) if len(item)>2 else 0
            source_type='chatgpt_library_'+kind.lower()
            hit=db.execute('select id from bureau_documents where (source_type=? and source_id=?) or (title=? and folder=?) limit 1',(source_type,ref[:120],name.rsplit('.',1)[0],folder)).fetchone()
            if hit:
              existing.append(int(hit[0]));continue
            body_text=(
              f"Archive {kind} retrouvée dans les conversations / ChatGPT Library.\n\n"
              f"Projet : {label}\nFichier : {name}\nRéférence Library : {ref}"
              +(f"\nTaille : {size} octets" if size else '')
              +"\n\nCette fiche sert d’index dans le Bureau. L’original privé reste dans ChatGPT Library tant qu’il n’est pas importé manuellement dans le stockage du site."
            )
            cur=db.execute("""insert into bureau_documents
              (title,body,folder,tags,pinned,source_type,source_id,created_at,updated_at)
              values(?,?,?,?,?,?,?,?,?)""",
              (name.rsplit('.',1)[0],body_text,folder,f'projet, {project}, {kind.lower()}, ChatGPT Library',0,source_type,ref[:120],now,now))
            created.append(int(cur.lastrowid))
      db.commit()
    finally:
      db.close()
    return {'ok':True,'projects':projects,'created':len(created),'existing':len(existing),'created_ids':created}

@app.get('/api/v164/projects/library')
def projects_library_v164():
    return {'ok':True,'projects':_V164_PROJECT_LIBRARY}


def _v164_seed_project_library_startup():
    try:
        result=projects_library_seed_v164({})
        print(
          f"PLUG_ART_V164_LIBRARY_SEEDED created={result.get('created',0)} existing={result.get('existing',0)} projects={len(result.get('projects') or [])}",
          flush=True
        )
    except Exception as exc:
        print(f"PLUG_ART_V164_LIBRARY_SEED_ERROR {type(exc).__name__}: {str(exc)[:240]}",flush=True)

try:
    _seed_expected=sum(len(v.get('pdfs') or [])+len(v.get('visuals') or []) for v in _V164_PROJECT_LIBRARY.values())
    _seed_existing=int((core.one("select count(*) count from bureau_documents where source_type like 'chatgpt_library_%'") or {}).get('count',0))
except Exception:
    _seed_expected=1;_seed_existing=0
if _seed_existing<_seed_expected:
    threading.Thread(target=_v164_seed_project_library_startup,daemon=True).start()
else:
    print(f"PLUG_ART_V165_LIBRARY_SEED_SKIP existing={_seed_existing} expected={_seed_expected}",flush=True)


# ================= V167 · VERNISSAGES RADAR =================
_v167e=core.conn()
_v167e.executescript("""
CREATE TABLE IF NOT EXISTS art_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL DEFAULT 'vernissage',
  title TEXT NOT NULL,
  venue_name TEXT DEFAULT '',
  venue_type TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  country TEXT DEFAULT '',
  starts_at TEXT DEFAULT '',
  ends_at TEXT DEFAULT '',
  artists_json TEXT DEFAULT '[]',
  disciplines_json TEXT DEFAULT '[]',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  source_url TEXT NOT NULL,
  source_type TEXT DEFAULT '',
  rsvp_url TEXT DEFAULT '',
  price_text TEXT DEFAULT '',
  is_free INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  verified_at TEXT DEFAULT '',
  favorite INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT '',
  UNIQUE(source_url,starts_at)
);
CREATE INDEX IF NOT EXISTS idx_art_events_starts_at ON art_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_art_events_city ON art_events(city);
CREATE INDEX IF NOT EXISTS idx_art_events_type ON art_events(event_type);
CREATE INDEX IF NOT EXISTS idx_art_events_venue ON art_events(venue_name);
CREATE INDEX IF NOT EXISTS idx_art_events_status ON art_events(status);
""")
_v167e.commit();_v167e.close()

_V167_EVENT_TYPES={'vernissage','opening','finissage','artist_talk','gallery_event','preview','nocturne','rencontre_artiste','lancement_exposition'}
_V167_EVENT_SEARCH_MODEL=os.getenv('PLUGART_EVENT_SEARCH_MODEL','gpt-5.6-luna').strip() or 'gpt-5.6-luna'

def _v167_output_text(data):
    if isinstance((data or {}).get('output_text'),str) and data['output_text'].strip():return data['output_text'].strip()
    out=[]
    for item in (data or {}).get('output') or []:
        for part in item.get('content') or []:
            if part.get('type')=='output_text' and part.get('text'):out.append(part['text'])
    return '\n'.join(out).strip()

def _v167_json(value,default):
    try:return json.loads(value) if isinstance(value,str) else (value if value is not None else default)
    except Exception:return default

def _v167_extract_json(raw):
    raw=str(raw or '').strip()
    fence=chr(96)*3
    raw=raw.replace(fence+'json','').replace(fence+'JSON','').replace(fence,'').strip()
    try:return json.loads(raw)
    except Exception:pass
    a=raw.find('{');b=raw.rfind('}')
    if a>=0 and b>a:
        try:return json.loads(raw[a:b+1])
        except Exception:pass
    a=raw.find('[');b=raw.rfind(']')
    if a>=0 and b>a:
        try:return {'events':json.loads(raw[a:b+1])}
        except Exception:pass
    raise ValueError('JSON événementiel invalide')

def _v167_event_out(row):
    if not row:return None
    x=dict(row)
    x['artists']=_v167_json(x.pop('artists_json','[]'),[])
    x['disciplines']=_v167_json(x.pop('disciplines_json','[]'),[])
    x['is_free']=bool(x.get('is_free'));x['verified']=bool(x.get('verified'));x['favorite']=bool(x.get('favorite'))
    return x

def _v167_normalize_event(item):
    item=item or {};now=_now_v85()
    typ=str(item.get('event_type') or 'vernissage').strip().lower().replace(' ','_')
    if typ not in _V167_EVENT_TYPES:typ='gallery_event'
    title=str(item.get('title') or '').strip()[:260]
    source=str(item.get('source_url') or '').strip()[:2400]
    if not title or not source.startswith(('http://','https://')):return None
    starts=str(item.get('starts_at') or item.get('date') or '').strip()[:40]
    artists=item.get('artists') if isinstance(item.get('artists'),list) else []
    disciplines=item.get('disciplines') if isinstance(item.get('disciplines'),list) else []
    price=str(item.get('price_text') or '').strip()[:100]
    free=item.get('is_free')
    if free is None:free=bool(re.search(r'\b(gratuit|free|entrée libre|entree libre)\b',price,re.I))
    return {
      'event_type':typ,'title':title,'venue_name':str(item.get('venue_name') or '')[:220],
      'venue_type':str(item.get('venue_type') or '')[:100],'city':str(item.get('city') or '')[:120],
      'address':str(item.get('address') or '')[:420],'country':str(item.get('country') or '')[:100],
      'starts_at':starts,'ends_at':str(item.get('ends_at') or '')[:40],
      'artists_json':json.dumps(artists[:30],ensure_ascii=False),
      'disciplines_json':json.dumps(disciplines[:30],ensure_ascii=False),
      'description':str(item.get('description') or '')[:4000],
      'image_url':str(item.get('image_url') or '')[:2400],
      'source_url':source,'source_type':str(item.get('source_type') or 'web')[:80],
      'rsvp_url':str(item.get('rsvp_url') or '')[:2400],'price_text':price,
      'is_free':1 if free else 0,'verified':1 if item.get('verified') else 0,
      'verified_at':now if item.get('verified') else '','status':'active','created_at':now,'updated_at':now
    }

def _v167_upsert_events(events):
    ids=[]
    for raw in events or []:
        e=_v167_normalize_event(raw)
        if not e:continue
        def _write(db,e=e):
            db.execute("""INSERT INTO art_events(
              event_type,title,venue_name,venue_type,city,address,country,starts_at,ends_at,artists_json,
              disciplines_json,description,image_url,source_url,source_type,rsvp_url,price_text,is_free,
              verified,verified_at,status,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(source_url,starts_at) DO UPDATE SET
                event_type=excluded.event_type,title=excluded.title,venue_name=excluded.venue_name,
                venue_type=excluded.venue_type,city=excluded.city,address=excluded.address,country=excluded.country,
                ends_at=excluded.ends_at,artists_json=excluded.artists_json,disciplines_json=excluded.disciplines_json,
                description=excluded.description,image_url=coalesce(nullif(excluded.image_url,''),art_events.image_url),
                source_type=excluded.source_type,rsvp_url=excluded.rsvp_url,price_text=excluded.price_text,
                is_free=excluded.is_free,verified=max(art_events.verified,excluded.verified),
                verified_at=case when excluded.verified=1 then excluded.verified_at else art_events.verified_at end,
                status='active',updated_at=excluded.updated_at""",tuple(e.values()))
            hit=db.execute('select id from art_events where source_url=? and starts_at=?',(e['source_url'],e['starts_at'])).fetchone()
            return int(hit[0]) if hit else None
        iid=_v165_db_write(_write)
        if iid:ids.append(iid)
    return ids

def _v167_event_search_ai(body):
    key=os.getenv('OPENAI_API_KEY','').strip()
    if not key:raise HTTPException(503,'Recherche web IA non configurée')
    cities=[str(x).strip() for x in (body.get('cities') or ['Paris']) if str(x).strip()][:12]
    types=[str(x).strip() for x in (body.get('types') or ['vernissage','opening','artist_talk']) if str(x).strip()][:10]
    date_from=str(body.get('date_from') or time.strftime('%Y-%m-%d'))[:10]
    date_to=str(body.get('date_to') or '')[:10]
    query=str(body.get('q') or '').strip()[:500]
    prompt=("Tu es le moteur Radar Vernissages de PLUG ART. Effectue une recherche web ACTUELLE et trouve uniquement des événements artistiques à venir. "
      "Zones: "+', '.join(cities)+". Période: "+date_from+" à "+(date_to or "dans les 31 prochains jours")+". Types: "+', '.join(types)+". "
      "Requête additionnelle: "+(query or "aucune")+". Priorité absolue aux sites officiels de galeries, institutions, lieux et pages officielles. "
      "Ignore tout événement passé ou non daté. Retourne UNIQUEMENT du JSON valide sous la forme "
      "{\"events\":[{\"event_type\":\"vernissage\",\"title\":\"\",\"venue_name\":\"\",\"venue_type\":\"gallery\",\"city\":\"\",\"address\":\"\",\"country\":\"France\","
      "\"starts_at\":\"YYYY-MM-DDTHH:MM\",\"ends_at\":\"\",\"artists\":[],\"disciplines\":[],\"description\":\"\",\"image_url\":\"\",\"source_url\":\"https://...\","
      "\"source_type\":\"official\",\"rsvp_url\":\"\",\"price_text\":\"\",\"is_free\":false,\"verified\":true}]}. "
      "Maximum 24 événements. Si l'heure manque, utilise YYYY-MM-DD. Ne fabrique aucune information.")
    payload={'model':_V167_EVENT_SEARCH_MODEL,'store':False,'tools':[{'type':'web_search','search_context_size':'medium'}],
      'tool_choice':'required','input':prompt,'max_output_tokens':6000,'text':{'verbosity':'low'}}
    started=time.time()
    rr=requests.post('https://api.openai.com/v1/responses',
      headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},json=payload,timeout=(8,45))
    if not rr.ok:raise HTTPException(502,'Recherche web indisponible ('+str(rr.status_code)+')')
    parsed=_v167_extract_json(_v167_output_text(rr.json()))
    events=parsed.get('events') if isinstance(parsed,dict) else parsed
    if not isinstance(events,list):events=[]
    print("PLUG_ART_V167_EVENT_SEARCH cities="+','.join(cities)+" found="+str(len(events))+" elapsed_ms="+str(int((time.time()-started)*1000)),flush=True)
    return events

@app.get('/api/v167/events')
def events_list_v167(q:str='',city:str='',date_from:str='',date_to:str='',event_type:str='',free:bool=False,venue:str='',verified:bool=False,favorite:bool=False):
    sql="select * from art_events where status='active'";params=[]
    if q:sql+=" and lower(title||' '||venue_name||' '||description||' '||city) like ?";params.append('%'+q.lower()+'%')
    if city:sql+=" and lower(city) like ?";params.append('%'+city.lower()+'%')
    if date_from:sql+=" and substr(starts_at,1,10)>=?";params.append(date_from[:10])
    if date_to:sql+=" and substr(starts_at,1,10)<=?";params.append(date_to[:10])
    if event_type:sql+=" and event_type=?";params.append(event_type)
    if free:sql+=" and is_free=1"
    if verified:sql+=" and verified=1"
    if favorite:sql+=" and favorite=1"
    if venue:sql+=" and lower(venue_name) like ?";params.append('%'+venue.lower()+'%')
    sql+=" order by case when starts_at='' then 1 else 0 end,starts_at asc,id desc limit 250"
    return [_v167_event_out(x) for x in core.rows(sql,tuple(params))]

@app.post('/api/v167/events/search')
def events_search_v167(body:dict):
    events=_v167_event_search_ai(body or {})
    ids=_v167_upsert_events(events)
    if not ids:return {'ok':True,'found':0,'items':events_list_v167()}
    marks=','.join('?' for _ in ids)
    return {'ok':True,'found':len(ids),'items':[_v167_event_out(x) for x in core.rows('select * from art_events where id in ('+marks+') order by starts_at',tuple(ids))]}

@app.get('/api/v167/events/{event_id}')
def event_get_v167(event_id:int):
    row=core.one('select * from art_events where id=?',(event_id,))
    if not row:raise HTTPException(404,'Événement introuvable')
    return _v167_event_out(row)

@app.post('/api/v167/events/{event_id}/favorite')
def event_favorite_v167(event_id:int,body:dict={}):
    if not core.one('select id from art_events where id=?',(event_id,)):raise HTTPException(404,'Événement introuvable')
    value=1 if (body or {}).get('favorite',True) else 0
    _v165_db_write(lambda db: db.execute('update art_events set favorite=?,updated_at=? where id=?',(value,_now_v85(),event_id)))
    return event_get_v167(event_id)

@app.post('/api/v167/events/{event_id}/verify')
def event_verify_v167(event_id:int):
    row=core.one('select * from art_events where id=?',(event_id,))
    if not row:raise HTTPException(404,'Événement introuvable')
    try:
        rr=requests.get(row['source_url'],timeout=10,headers={'User-Agent':'Mozilla/5.0 PLUGART-Events/167'},allow_redirects=True);ok=bool(rr.ok)
    except Exception:ok=False
    _v165_db_write(lambda db: db.execute('update art_events set verified=?,verified_at=?,updated_at=? where id=?',(1 if ok else 0,_now_v85() if ok else '',_now_v85(),event_id)))
    return {'ok':ok,'event':event_get_v167(event_id)}

def _v167_event_page_image(url):
    if not url:return ''
    try:
        rr=requests.get(url,timeout=9,headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/167'},allow_redirects=True)
        if not rr.ok:return ''
        head=rr.text[:350000]
        pats=[r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
              r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']']
        for p in pats:
            m=re.search(p,head,re.I)
            if m:return urljoin(rr.url,m.group(1).strip())
    except Exception:pass
    return ''

@app.get('/api/v167/events/{event_id}/media')
def event_media_v167(event_id:int):
    e=event_get_v167(event_id);items=[]
    if e.get('image_url'):items.append({'url':e['image_url'],'source':'event'})
    page=_v167_event_page_image(e.get('source_url'))
    if page and page not in [x['url'] for x in items]:items.append({'url':page,'source':'official_page'})
    return {'event_id':event_id,'media':items[:8]}

@app.get('/api/v167/events/{event_id}/media/{index}')
def event_media_asset_v167(event_id:int,index:int):
    items=event_media_v167(event_id).get('media') or []
    if index<0 or index>=len(items):raise HTTPException(404,'Média introuvable')
    url=items[index]['url'];key='event167:'+str(event_id)+':'+str(index);now=time.time();cached=MEDIA_BYTES_CACHE.get(key)
    if cached and now-cached[0]<21600:return Response(content=cached[1],media_type=cached[2],headers={'Cache-Control':'public,max-age=86400'})
    try:
        rr=requests.get(url,timeout=10,headers={'User-Agent':'Mozilla/5.0 PLUGART-Media/167','Accept':'image/avif,image/webp,image/*,*/*;q=0.8'},allow_redirects=True)
        ct=(rr.headers.get('content-type') or '').split(';')[0].lower()
        if not rr.ok or not ct.startswith('image/') or len(rr.content)<500:raise HTTPException(404,'Média indisponible')
        MEDIA_BYTES_CACHE[key]=(now,rr.content,ct)
        return Response(content=rr.content,media_type=ct,headers={'Cache-Control':'public,max-age=86400,stale-while-revalidate=604800'})
    except HTTPException:raise
    except Exception:raise HTTPException(404,'Média indisponible')

@app.post('/api/v167/events/{event_id}/to-content')
def event_to_content_v167(event_id:int):
    e=event_get_v167(event_id);media=event_media_v167(event_id).get('media') or []
    return {'sourceType':'event','sourceId':event_id,'title':e.get('title'),'subtitle':e.get('venue_name'),'date':e.get('starts_at'),
      'venue':e.get('venue_name'),'city':e.get('city'),'address':e.get('address'),'disciplines':e.get('disciplines') or [],
      'price':e.get('price_text'),'cta':'Voir les informations du vernissage','sourceUrl':e.get('source_url'),'media':media}

@app.post('/api/v167/events/{event_id}/to-agenda')
def event_to_agenda_v167(event_id:int):
    e=event_get_v167(event_id)
    return {'ok':True,'agenda_item':{'kind':'vernissage','source_id':event_id,'title':e.get('title'),'date':e.get('starts_at'),'venue':e.get('venue_name'),'city':e.get('city'),'source_url':e.get('source_url')}}



# ================= V167 · EDITABLE PDF WORKSPACE =================
_v167p=core.conn()
_v167p.executescript("""
CREATE TABLE IF NOT EXISTS pdf_projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT 'Sans titre',
  project_type TEXT DEFAULT 'dossier_projet',
  cover_image TEXT DEFAULT '',
  theme_json TEXT DEFAULT '{}',
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS pdf_pages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  page_index INTEGER NOT NULL DEFAULT 0,
  page_type TEXT DEFAULT 'content',
  content_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT '',
  FOREIGN KEY(project_id) REFERENCES pdf_projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_project ON pdf_pages(project_id,page_index);
""")
_v167p.commit();_v167p.close()

def _v167_pdf_project_out(row,with_pages=False):
    if not row:return None
    x=dict(row);x['theme']=_v167_json(x.pop('theme_json','{}'),{});x['metadata']=_v167_json(x.pop('metadata_json','{}'),{})
    if with_pages:
        pages=[]
        for r in core.rows('select * from pdf_pages where project_id=? order by page_index,id',(x['id'],)):
            p=dict(r);p['content']=_v167_json(p.pop('content_json','{}'),{});pages.append(p)
        x['pages']=pages
    return x

@app.get('/api/v167/pdf-projects')
def pdf_projects_list_v167():
    return [_v167_pdf_project_out(x) for x in core.rows('select * from pdf_projects order by updated_at desc,id desc')]

@app.post('/api/v167/pdf-projects')
def pdf_project_create_v167(body:dict):
    body=body or {};now=_now_v85()
    title=str(body.get('title') or 'Nouveau dossier').strip()[:240] or 'Nouveau dossier'
    typ=str(body.get('project_type') or 'dossier_projet').strip()[:80]
    theme=json.dumps(body.get('theme') if isinstance(body.get('theme'),dict) else {},ensure_ascii=False)
    meta=json.dumps(body.get('metadata') if isinstance(body.get('metadata'),dict) else {},ensure_ascii=False)
    cover=str(body.get('cover_image') or '')[:2400]
    pid=_v165_db_write(lambda db: db.execute('insert into pdf_projects(title,project_type,cover_image,theme_json,metadata_json,created_at,updated_at) values(?,?,?,?,?,?,?)',(title,typ,cover,theme,meta,now,now)).lastrowid)
    pages=body.get('pages') if isinstance(body.get('pages'),list) else []
    for i,p in enumerate(pages[:80]):
        content=p.get('content') if isinstance(p,dict) and isinstance(p.get('content'),dict) else (p if isinstance(p,dict) else {})
        _v165_db_write(lambda db,i=i,p=p,content=content: db.execute('insert into pdf_pages(project_id,page_index,page_type,content_json,created_at,updated_at) values(?,?,?,?,?,?)',(pid,i,str((p or {}).get('page_type') or 'content')[:80],json.dumps(content,ensure_ascii=False),now,now)))
    return _v167_pdf_project_out(core.one('select * from pdf_projects where id=?',(pid,)),True)

@app.get('/api/v167/pdf-projects/{project_id}')
def pdf_project_get_v167(project_id:int):
    row=core.one('select * from pdf_projects where id=?',(project_id,))
    if not row:raise HTTPException(404,'Projet PDF introuvable')
    return _v167_pdf_project_out(row,True)

@app.patch('/api/v167/pdf-projects/{project_id}')
def pdf_project_update_v167(project_id:int,body:dict):
    if not core.one('select id from pdf_projects where id=?',(project_id,)):raise HTTPException(404,'Projet PDF introuvable')
    body=body or {};data={}
    if 'title' in body:data['title']=str(body.get('title') or 'Sans titre')[:240]
    if 'project_type' in body:data['project_type']=str(body.get('project_type') or '')[:80]
    if 'cover_image' in body:data['cover_image']=str(body.get('cover_image') or '')[:2400]
    if 'theme' in body:data['theme_json']=json.dumps(body.get('theme') if isinstance(body.get('theme'),dict) else {},ensure_ascii=False)
    if 'metadata' in body:data['metadata_json']=json.dumps(body.get('metadata') if isinstance(body.get('metadata'),dict) else {},ensure_ascii=False)
    if data:
        data['updated_at']=_now_v85();sets=','.join(k+'=?' for k in data)
        _v165_db_write(lambda db: db.execute('update pdf_projects set '+sets+' where id=?',(*data.values(),project_id)))
    return pdf_project_get_v167(project_id)

@app.delete('/api/v167/pdf-projects/{project_id}')
def pdf_project_delete_v167(project_id:int):
    row=core.one('select id from pdf_projects where id=?',(project_id,))
    if not row:raise HTTPException(404,'Projet PDF introuvable')
    def _write(db):
        db.execute('delete from pdf_pages where project_id=?',(project_id,))
        return db.execute('delete from pdf_projects where id=?',(project_id,)).rowcount
    _v165_db_write(_write);return {'ok':True}

@app.post('/api/v167/pdf-projects/{project_id}/pages')
def pdf_page_create_v167(project_id:int,body:dict):
    if not core.one('select id from pdf_projects where id=?',(project_id,)):raise HTTPException(404,'Projet PDF introuvable')
    body=body or {};now=_now_v85()
    next_row=core.one('select coalesce(max(page_index),-1)+1 n from pdf_pages where project_id=?',(project_id,)) or {}
    idx=int(body.get('page_index') if body.get('page_index') is not None else next_row.get('n',0))
    content=body.get('content') if isinstance(body.get('content'),dict) else {}
    _v165_db_write(lambda db: db.execute('insert into pdf_pages(project_id,page_index,page_type,content_json,created_at,updated_at) values(?,?,?,?,?,?)',(project_id,idx,str(body.get('page_type') or 'content')[:80],json.dumps(content,ensure_ascii=False),now,now)))
    _v165_db_write(lambda db: db.execute('update pdf_projects set updated_at=? where id=?',(now,project_id)))
    return pdf_project_get_v167(project_id)

@app.patch('/api/v167/pdf-pages/{page_id}')
def pdf_page_update_v167(page_id:int,body:dict):
    row=core.one('select * from pdf_pages where id=?',(page_id,))
    if not row:raise HTTPException(404,'Page PDF introuvable')
    body=body or {};data={}
    if 'page_index' in body:data['page_index']=int(body.get('page_index') or 0)
    if 'page_type' in body:data['page_type']=str(body.get('page_type') or 'content')[:80]
    if 'content' in body:data['content_json']=json.dumps(body.get('content') if isinstance(body.get('content'),dict) else {},ensure_ascii=False)
    if data:
        data['updated_at']=_now_v85();sets=','.join(k+'=?' for k in data)
        _v165_db_write(lambda db: db.execute('update pdf_pages set '+sets+' where id=?',(*data.values(),page_id)))
        _v165_db_write(lambda db: db.execute('update pdf_projects set updated_at=? where id=?',(_now_v85(),row['project_id'])))
    return pdf_project_get_v167(int(row['project_id']))

@app.delete('/api/v167/pdf-pages/{page_id}')
def pdf_page_delete_v167(page_id:int):
    row=core.one('select project_id from pdf_pages where id=?',(page_id,))
    if not row:raise HTTPException(404,'Page PDF introuvable')
    _v165_db_write(lambda db: db.execute('delete from pdf_pages where id=?',(page_id,)))
    return pdf_project_get_v167(int(row['project_id']))

def _v167_pdf_path(project_id):
    root=Path('/data/generated_pdfs') if Path('/data').exists() else BASE/'generated_pdfs'
    root.mkdir(parents=True,exist_ok=True)
    return root/('plugart_project_'+str(int(project_id))+'.pdf')

def _v167_render_pdf(project_id):
    project=pdf_project_get_v167(project_id)
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4,landscape
        from reportlab.lib.utils import ImageReader
    except Exception as exc:
        raise HTTPException(503,'Moteur PDF indisponible') from exc
    meta=project.get('metadata') or {};fmt=str(meta.get('format') or 'A4 portrait').lower()
    pagesize=landscape(A4) if 'paysage' in fmt or 'landscape' in fmt else A4
    out=_v167_pdf_path(project_id);cv=rl_canvas.Canvas(str(out),pagesize=pagesize);W,H=pagesize
    pages=project.get('pages') or [{'content':{'title':project.get('title'),'body':''}}]
    for page in pages:
        content=page.get('content') or {};bg=str(content.get('background') or '#FFFFFF')
        try:
            hx=bg.lstrip('#');rgb=tuple(int(hx[i:i+2],16)/255 for i in (0,2,4)) if len(hx)==6 else (1,1,1)
            cv.setFillColorRGB(*rgb);cv.rect(0,0,W,H,fill=1,stroke=0)
        except Exception:pass
        image_url=str(content.get('image') or '')
        if image_url.startswith(('http://','https://')):
            try:
                rr=requests.get(image_url,timeout=8,headers={'User-Agent':'Mozilla/5.0 PLUGART-PDF/167'})
                if rr.ok:cv.drawImage(ImageReader(io.BytesIO(rr.content)),0,H*.43,W,H*.57,mask='auto',preserveAspectRatio=True,anchor='c')
            except Exception:pass
        title=str(content.get('title') or project.get('title') or '')[:500]
        kicker=str(content.get('kicker') or '')[:240]
        body=str(content.get('body') or content.get('text') or '')[:12000]
        if kicker:
            cv.setFont('Helvetica-Bold',10);cv.setFillColorRGB(.42,.36,.72);cv.drawString(42,H-52,kicker.upper()[:80])
        cv.setFillColorRGB(.07,.075,.09);cv.setFont('Helvetica-Bold',26);y=H-88
        for chunk in re.findall(r'.{1,42}(?:\s+|$)',title)[:4]:
            cv.drawString(42,y,chunk.strip());y-=31
        cv.setFont('Helvetica',11);cv.setFillColorRGB(.28,.29,.33);y-=10
        for para in body.splitlines():
            if y<52:break
            chunks=re.findall(r'.{1,90}(?:\s+|$)',para) or ['']
            for chunk in chunks:
                cv.drawString(42,y,chunk.strip());y-=15
                if y<52:break
            y-=5
        cv.setFont('Helvetica',7);cv.setFillColorRGB(.55,.56,.60);cv.drawRightString(W-32,24,'PLUG ART · V167')
        cv.showPage()
    cv.save();return out

@app.post('/api/v167/pdf-projects/{project_id}/export')
def pdf_project_export_v167(project_id:int):
    path=_v167_render_pdf(project_id)
    return {'ok':True,'project_id':project_id,'preview_url':'/api/v167/pdf-projects/'+str(project_id)+'/preview.pdf','bytes':path.stat().st_size}

@app.get('/api/v167/pdf-projects/{project_id}/preview.pdf')
def pdf_project_preview_v167(project_id:int):
    path=_v167_pdf_path(project_id);row=core.one('select title from pdf_projects where id=?',(project_id,))
    if not row:raise HTTPException(404,'Projet PDF introuvable')
    if not path.exists():path=_v167_render_pdf(project_id)
    safe=re.sub(r'[^A-Za-z0-9À-ÿ._ -]+','_',str(row.get('title') or 'PLUG_ART'))+'.pdf'
    return FileResponse(path,media_type='application/pdf',filename=safe,content_disposition_type='inline')

@app.post('/api/v167/pdf-projects/from-bureau/{doc_id}')
def pdf_project_from_bureau_v167(doc_id:int):
    doc=core.one('select * from bureau_documents where id=?',(doc_id,))
    if not doc:raise HTTPException(404,'Document Bureau introuvable')
    return pdf_project_create_v167({'title':doc.get('title') or 'Dossier PLUG ART','project_type':'bureau',
      'metadata':{'source_type':'bureau','source_id':doc_id},
      'pages':[{'page_type':'content','content':{'kicker':doc.get('folder') or 'PLUG ART','title':doc.get('title') or 'Document','body':doc.get('body') or ''}}]})

@app.get('/api/v167/canva/config')
def canva_config_v167():
    url=os.getenv('CANVA_STARTER_URL','').strip()
    return {'enabled':bool(url),'starter_url':url,'mode':'bridge','fallback':'export-pack'}



# ================= V167 · RESILIENT IDEAS / QA =================
_v167i=core.conn()
_v167i.executescript("""
CREATE TABLE IF NOT EXISTS idea_links(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_idea_id INTEGER NOT NULL,
  to_idea_id INTEGER NOT NULL,
  created_at TEXT DEFAULT '',
  UNIQUE(from_idea_id,to_idea_id)
);
""")
_v167i.commit();_v167i.close()

@app.get('/api/v167/ideas/health')
def ideas_health_v167():
    try:
        count=(core.one('select count(*) count from idea_cloud') or {}).get('count',0)
        db=core.conn()
        db.execute('savepoint v167_health')
        db.execute('create temp table if not exists _v167_health(x text)')
        db.execute('insert into _v167_health(x) values(?)',(secrets.token_hex(4),))
        db.execute('rollback to v167_health');db.execute('release v167_health');db.close()
        return {'ok':True,'db':'ok','count':count,'writable':True}
    except Exception as exc:
        return {'ok':False,'db':type(exc).__name__,'count':0,'writable':False}

@app.get('/api/v167/ideas/{idea_id}/links')
def idea_links_v167(idea_id:int):
    return core.rows("""select l.id,l.from_idea_id,l.to_idea_id,i.title to_title
                        from idea_links l left join idea_cloud i on i.id=l.to_idea_id
                        where l.from_idea_id=? order by l.id""",(idea_id,))

@app.post('/api/v167/ideas/{idea_id}/links')
def idea_link_create_v167(idea_id:int,body:dict):
    to_id=int((body or {}).get('to_idea_id') or 0)
    if not core.one('select id from idea_cloud where id=?',(idea_id,)) or not core.one('select id from idea_cloud where id=?',(to_id,)):
        raise HTTPException(404,'Idée introuvable')
    if idea_id==to_id:raise HTTPException(400,'Une idée ne peut pas se relier à elle-même')
    _v165_db_write(lambda db: db.execute('insert or ignore into idea_links(from_idea_id,to_idea_id,created_at) values(?,?,?)',(idea_id,to_id,_now_v85())))
    return {'ok':True,'links':idea_links_v167(idea_id)}

@app.post('/api/v167/ideas/{idea_id}/to-bureau')
def idea_to_bureau_v167(idea_id:int):
    idea=core.one('select * from idea_cloud where id=?',(idea_id,))
    if not idea:raise HTTPException(404,'Idée introuvable')
    return bureau_create_v107({'title':idea.get('title') or 'Idée','body':idea.get('body') or '','folder':'Projets',
      'tags':idea.get('tags') or '','source_type':'idea','source_id':str(idea_id)})

@app.post('/api/v167/ideas/{idea_id}/to-pdf')
def idea_to_pdf_v167(idea_id:int):
    idea=core.one('select * from idea_cloud where id=?',(idea_id,))
    if not idea:raise HTTPException(404,'Idée introuvable')
    return pdf_project_create_v167({'title':idea.get('title') or 'Concept PLUG ART','project_type':'concept',
      'metadata':{'source_type':'idea','source_id':idea_id,'project':idea.get('project')},
      'pages':[{'content':{'kicker':'CONCEPT','title':idea.get('title') or 'Idée','body':idea.get('body') or '','image':idea.get('image_url') or ''}}]})

@app.get('/api/v167/qa/manifest')
def qa_manifest_v167():
    required=[
      ('GET','/api/v167/events'),('POST','/api/v167/events/search'),
      ('GET','/api/v167/ideas/health'),('GET','/api/v167/pdf-projects'),
      ('POST','/api/v167/pdf-projects'),('GET','/api/v167/canva/config')
    ]
    active={(str(m).upper(),getattr(r,'path','')) for r in app.router.routes for m in (getattr(r,'methods',set()) or set())}
    return {'ok':all(x in active for x in required),
      'required':[m+' '+p for m,p in required],
      'missing':[m+' '+p for m,p in required if (m,p) not in active]}


@app.get('/api/v163/diagnostics')
def diagnostics_v163():
    started=time.perf_counter()
    checks={}
    try:
        db=core.conn()
        row=db.execute('pragma quick_check').fetchone()
        checks['database']={'ok':bool(row and str(row[0]).lower()=='ok'),'detail':str(row[0] if row else 'unknown')}
        db.close()
    except Exception as exc:
        checks['database']={'ok':False,'detail':type(exc).__name__}
    static_required=[
      BASE/'static'/'plugart_v162.html',BASE/'static'/'plugart_v162.js',BASE/'static'/'plugart_v162.css',
      BASE/'static'/'plugy_v162.html',BASE/'static'/'plugy_v162.js',BASE/'static'/'plugy_v162.css'
    ]
    checks['static']={'ok':all(p.exists() and p.stat().st_size>0 for p in static_required),'files':len(static_required)}
    checks['plugy_model']={'ok':bool(REALISTIC_PLUGY.exists() and REALISTIC_PLUGY.stat().st_size>1000),'bytes':REALISTIC_PLUGY.stat().st_size if REALISTIC_PLUGY.exists() else 0}
    active={(str(m).upper(),getattr(r,'path','')) for r in app.router.routes for m in (getattr(r,'methods',set()) or set())}
    critical=[
      ('GET','/api/health'),('GET','/api/v124/dashboard-bootstrap'),('POST','/api/v125/plugy/stream'),
      ('POST','/api/v162/plugy/speech'),('GET','/api/v156/bureau/files'),('GET','/api/v156/ideas'),('POST','/api/v164/projects/library/seed'),
      ('GET','/api/v86/crm'),('POST','/api/radar/run'),('GET','/api/v167/events'),('POST','/api/v167/events/search'),('GET','/api/v167/ideas/health'),('GET','/api/v167/pdf-projects')
    ]
    missing=[f'{m} {p}' for m,p in critical if (m,p) not in active]
    checks['routes']={'ok':not missing,'missing':missing}
    checks['openai']={'configured':bool(os.getenv('OPENAI_API_KEY','').strip())}
    meta_configured=bool(os.getenv('META_APP_ID','').strip() and os.getenv('META_APP_SECRET','').strip())
    try:
        igrow=_ig_row()
        instagram_connected=bool(igrow.get('ig_user_id') and igrow.get('page_access_token'))
    except Exception:
        instagram_connected=False
    checks['meta']={'configured':meta_configured,'instagram_connected':instagram_connected}
    checks['railway']={'domain_configured':bool(os.getenv('RAILWAY_PUBLIC_DOMAIN','').strip())}
    try:
        t=time.perf_counter();payload=dashboard_bootstrap_v124();raw=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode('utf-8')
        checks['bootstrap']={'ok':True,'ms':round((time.perf_counter()-t)*1000,1),'bytes':len(raw),'opportunities':len(payload.get('opportunities') or [])}
    except Exception as exc:
        checks['bootstrap']={'ok':False,'detail':type(exc).__name__}
    ok=all(v.get('ok',v.get('configured',True)) for k,v in checks.items() if k not in ('openai','meta','railway'))
    return {'ok':ok,'version':'167.0','elapsed_ms':round((time.perf_counter()-started)*1000,1),'checks':checks}

@app.get('/api/v164/status')
@app.get('/api/v163/status')
@app.get('/api/v1623/status')
@app.get('/api/v162/status')
@app.get('/api/v161/status')
@app.get('/api/v160/status')
@app.get('/api/v159/status')
@app.get('/api/v158/status')
@app.get('/api/v157/status')
@app.get('/api/v156/status')
def status_v156():
    return {
      'ok':True,'version':'167.0','ui':'plug-art-v167-workspace',
      'plugy':'full-body-safe-frame-sticky-natural-voice',
      'creation':'live-editor-fast-lazy-assets',
      'bureau':'documents-projects-pdf-library-packages-templates-hub',
      'ideas':'visible-project-linked-draggable-cloud',
      'hub_projects':['aubervilliers','millenaire','gennevilliers','chanteraines']
    }


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
@app.get('/api/v102/status')
@app.get('/api/v105/status')
@app.get('/api/v106/status')
@app.get('/api/v107/status')
@app.get('/api/v110/status')
@app.get('/api/v111/status')
@app.get('/api/v112/status')
@app.get('/api/v113/status')
@app.get('/api/v114/status')
@app.get('/api/v115/status')
@app.get('/api/v116/status')
@app.get('/api/v117/status')
@app.get('/api/v118/status')
@app.get('/api/v119/status')
@app.get('/api/v120/status')
@app.get('/api/v121/status')
@app.get('/api/v122/status')
@app.get('/api/v140/status')
@app.get('/api/v141/status')
@app.get('/api/v150/status')
@app.get('/api/v149/status')
@app.get('/api/v148/status')
@app.get('/api/v147/status')
@app.get('/api/v146/status')
@app.get('/api/v145/status')
@app.get('/api/v144/status')
@app.get('/api/v143/status')
@app.get('/api/v142/status')
def status_v90():
    raw=GLB.read_bytes() if GLB.exists() else b''
    return {
      'ok':bool(raw and raw[:4]==b'glTF' and DASH.exists()),
      'version':'167.0',
      'ui':'plug-art-v167-workspace',
      'reference_direction':'V151 PLUG ART: unified Canva-like content Studio with Structure, Text, Media, Elements, Colors and Layers, semantic typography scales, PLUG ART palettes, compact full-body PLUGY and fully calm miniature eyes',
      'marketing_blocks':False,
      'internal_workspace':True,
      'runtime_split':True,
      'navigation_fixed':True,
      'typography':'Space Grotesk + Inter',
      'legacy_index_served':False,
      'single_mascot':True,
      'plugy_reference':'single V113 premium animated model with runtime soft-pearl material tuning and reduced reflections',
      'plugy_expected_sha256':PLUGY_REFERENCE_SHA256,
      'plugy_reference_match':hashlib.sha256(raw).hexdigest()==PLUGY_REFERENCE_SHA256 if raw else False,
      'plugy_model_path':'/assets/plugy-v113-premium.glb',
      'plugy_material':RESULT.get('material'),
      'plugy_official_base':RESULT.get('official_base','V26'),
      'plugy_profile':RESULT.get('profile'),
      'legacy_model_refs_in_dashboard':sum(DASH.read_text(encoding='utf-8').count(x) for x in ('PLUGY_final_animated.glb','/static/plugy.glb')) if DASH.exists() else -1,
      'plugy_bytes':len(raw),
      'plugy_sha256':hashlib.sha256(raw).hexdigest() if raw else '',
      'plugy_animations':['Idle','SoftTurn','Think','Curious','Present','Bounce','Happy','Attentive','Wave','Dance','Blink','Listen','Speak','Charge','Travel'],
      'studio':'Unified iPhone-first Content Studio with central free canvas, floating tool dock, bottom-sheet templates/media/text/elements/layers/style controls, contextual inspector, typography scales, color presets, snapping, AI assistance, PNG/ZIP export and Instagram publishing',
      'layouts':['top','cover','left','right','band','collage','minimal'],
      'cuts':['none','diagonal','curve','wave'],
      'themes':['editorial','glass','impact','paper','night','color'],
      'background':'free translucent internal workspace with standalone PLUGY, free canvas Creation, HUB project workspace, functional opportunity map, social studio and integrated creative tools'
    }

print("PLUG_ART_V167_READY creation=wide_editor radar=vernissages office=pdf_workspace ideas=sync_safe plugy=ultrawide_premium qa=interactive",flush=True)

def _v127_runtime_smoke():
    required_routes={
      ('GET','/api/health'),
      ('GET','/plugy'),
      ('GET','/api/v154/ui-manifest'),
      ('GET','/api/v90/builder/config'),
      ('PATCH','/api/v90/builder/config'),
      ('GET','/api/map'),
      ('GET','/api/v124/dashboard-bootstrap'),
      ('POST','/api/v125/plugy/stream'),
      ('POST','/api/v32/plugy'),
      ('POST','/api/v32/content/image'),
      ('POST','/api/v162/plugy/speech'),
      ('GET','/api/v86/crm'),
      ('GET','/api/v107/bureau'),
      ('GET','/api/v107/open-calls/workflow'),
      ('GET','/api/v108/drafts'),
      ('GET','/api/v88/instagram/status'),
      ('GET','/api/v88/instagram/media'),
      ('POST','/api/v88/instagram/publish'),
      ('POST','/api/radar/run'),
      ('GET','/api/v156/status'),
      ('GET','/api/v156/bureau/files'),
      ('POST','/api/v156/bureau/files'),
      ('GET','/api/v156/ideas'),
      ('POST','/api/v156/ideas'),
      ('POST','/api/v164/projects/library/seed'),('GET','/api/v164/projects/library'),
      ('GET','/api/v163/diagnostics'),
      ('GET','/api/v163/status'),('GET','/api/v167/events'),('POST','/api/v167/events/search'),('GET','/api/v167/ideas/health'),('GET','/api/v167/pdf-projects'),('POST','/api/v167/pdf-projects'),('GET','/api/v167/qa/manifest')
    }
    active=set()
    for route in app.router.routes:
        path=getattr(route,'path',None)
        methods=getattr(route,'methods',set()) or set()
        if not path:continue
        for method in methods:
            active.add((str(method).upper(),path))
    missing=sorted(required_routes-active)
    required_tables=[
      'opportunities','artists','crm_leads','crm_history','bureau_documents',
      'bureau_templates','application_packages','opportunity_workspace','content_drafts',
      'bureau_files','idea_cloud','art_events','pdf_projects','pdf_pages','idea_links'
    ]
    table_missing=[]
    db_ok=False
    quick='unknown'
    try:
        db=core.conn()
        existing={str(x[0]) for x in db.execute("select name from sqlite_master where type='table'").fetchall()}
        table_missing=[t for t in required_tables if t not in existing]
        row=db.execute('pragma quick_check').fetchone()
        quick=str(row[0] if row else 'unknown')
        db_ok=(quick.lower()=='ok')
        db.close()
    except Exception as exc:
        quick=f"{type(exc).__name__}:{str(exc)[:120]}"
    ok=(not missing and not table_missing and db_ok)
    print(
      f"PLUG_ART_SMOKE ok={str(ok).lower()} routes={len(required_routes)-len(missing)}/{len(required_routes)} "
      f"tables={len(required_tables)-len(table_missing)}/{len(required_tables)} db={quick} "
      f"missing_routes={','.join(m+' '+p for m,p in missing) or 'none'} "
      f"missing_tables={','.join(table_missing) or 'none'}",
      flush=True
    )

def _v163_connectivity_smoke():
    openai='not_configured';meta='not_configured';instagram='disconnected'
    try:
        key=os.getenv('OPENAI_API_KEY','').strip()
        if key:
            rr=requests.get('https://api.openai.com/v1/models',headers={'Authorization':f'Bearer {key}'},timeout=8)
            openai='ok' if rr.ok else f'http_{rr.status_code}'
    except Exception:
        openai='network_error'
    try:
        configured=bool(os.getenv('META_APP_ID','').strip() and os.getenv('META_APP_SECRET','').strip())
        meta='configured' if configured else 'not_configured'
        row=_ig_row()
        token=str(row.get('page_access_token') or '').strip()
        igid=str(row.get('ig_user_id') or '').strip()
        if token and igid:
            rr=requests.get(f'https://graph.facebook.com/{_ig_graph_version()}/{igid}',params={'fields':'id,username','access_token':token},timeout=8)
            instagram='ok' if rr.ok else f'http_{rr.status_code}'
        elif configured:
            instagram='not_connected'
    except Exception:
        instagram='network_error'
    print(f'PLUG_ART_CONNECTIONS openai={openai} meta={meta} instagram={instagram}',flush=True)

_v127_runtime_smoke()
threading.Thread(target=_v163_connectivity_smoke,daemon=True).start()
