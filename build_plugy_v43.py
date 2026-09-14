from pathlib import Path
import json, struct, math, hashlib
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def mat(rgb,name,emissive=None,metallic=.03,rough=.42):
    kw=dict(baseColorFactor=[c/255 for c in rgb]+[1.0], metallicFactor=metallic, roughnessFactor=rough, name=name)
    if emissive: kw['emissiveFactor']=[c/255 for c in emissive]
    return PBRMaterial(**kw)

def apply(m, material):
    m.visual=TextureVisuals(material=material); return m

def box(ext, material): return apply(trimesh.creation.box(extents=ext), material)
def sph(r, material, sub=2): return apply(trimesh.creation.icosphere(subdivisions=sub,radius=r), material)
def cyl(r,h, material, sec=20): return apply(trimesh.creation.cylinder(radius=r,height=h,sections=sec),material)

def superellipsoid(ext, exponent, material, nu=32, nv=20):
    ax, ay, az = [v/2 for v in ext]
    u = np.linspace(-math.pi, math.pi, nu, endpoint=False)
    v = np.linspace(-math.pi/2, math.pi/2, nv)
    verts=[]
    p = 2.0/exponent
    def spow(x,a): return math.copysign(abs(x)**a, x)
    for vv in v:
        cv, sv = math.cos(vv), math.sin(vv)
        for uu in u:
            cu, su = math.cos(uu), math.sin(uu)
            x=ax*spow(cv,p)*spow(cu,p)
            y=ay*spow(sv,p)
            z=az*spow(cv,p)*spow(su,p)
            verts.append([x,y,z])
    faces=[]
    for j in range(nv-1):
        for i in range(nu):
            a=j*nu+i; b=j*nu+(i+1)%nu; c=(j+1)*nu+(i+1)%nu; d=(j+1)*nu+i
            faces.append([a,b,c]); faces.append([a,c,d])
    mesh=trimesh.Trimesh(vertices=np.array(verts),faces=np.array(faces),process=True)
    try: mesh.fix_normals()
    except Exception: pass
    return apply(mesh,material)

def capsule_y(radius,height,material,sec=20):
    m=apply(trimesh.creation.capsule(height=max(.001,height-2*radius), radius=radius, count=[sec,sec]),material)
    m.apply_transform(trimesh.transformations.euler_matrix(math.pi/2,0,0,'sxyz'))
    return m

def add(scene, mesh, name, t=(0,0,0), r=None, s=None):
    M=np.eye(4)
    if s is not None: M=M@trimesh.transformations.scale_matrix(s if np.isscalar(s) else 1.0)
    if r is not None: M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    M[:3,3]=np.asarray(t,dtype=float)
    scene.add_geometry(mesh, geom_name=name, node_name=name, transform=M)

def tube_between(a,b,r,material,sec=12):
    a=np.asarray(a,float); b=np.asarray(b,float); d=b-a; L=np.linalg.norm(d)
    m=cyl(r,L,material,sec)
    M=trimesh.geometry.align_vectors([0,0,1],d/L)
    m.apply_transform(M); m.apply_translation((a+b)/2)
    return m

def eye_arc(cx, cy, z, width, height, material, name_prefix, scene):
    xs=np.linspace(-width/2,width/2,7)
    pts=[]
    for x in xs:
        yy = cy + height*(1-(2*x/width)**2)
        pts.append((cx+x,yy,z))
    for i in range(len(pts)-1):
        add(scene,tube_between(pts[i],pts[i+1],.038,material,12),f'{name_prefix}_{i}')

def add_letter(scene, letter, x, y, z, scale, material, prefix):
    w=.16*scale; h=.28*scale; t=.028
    def rect(cx,cy,sx,sy,n): add(scene,box((sx,sy,t),material),f'{prefix}_{n}',(cx,cy,z))
    if letter=='P':
        rect(x,y,w*.26,h,'stem'); rect(x+w*.12,y+h*.34,w*.30,h*.14,'top'); rect(x+w*.12,y+h*.08,w*.30,h*.14,'mid'); rect(x+w*.25,y+h*.21,w*.10,h*.26,'side')
    elif letter=='L':
        rect(x,y,w*.24,h,'stem'); rect(x+w*.15,y-h*.43,w*.34,h*.14,'base')
    elif letter=='U':
        rect(x-w*.16,y+h*.08,w*.18,h*.78,'l'); rect(x+w*.16,y+h*.08,w*.18,h*.78,'r'); rect(x,y-h*.39,w*.42,h*.16,'base')
    elif letter=='G':
        rect(x,y+h*.38,w*.42,h*.14,'top'); rect(x-w*.17,y,w*.12,h*.78,'left'); rect(x,y-h*.38,w*.42,h*.14,'base'); rect(x+w*.16,y-h*.15,w*.12,h*.34,'right'); rect(x+w*.06,y,w*.22,h*.12,'mid')

def quat(axis, angle):
    axis=np.array(axis,dtype=float); axis/=np.linalg.norm(axis); s=math.sin(angle/2)
    return [axis[0]*s,axis[1]*s,axis[2]*s,math.cos(angle/2)]

def _align4(b):
    while len(b)%4: b+=b'\x00'
    return b

def _pack_glb(gltf, blob):
    js=json.dumps(gltf,separators=(',',':')).encode('utf-8'); js+=b' ' *((4-len(js)%4)%4)
    blob+=b'\x00'*((4-len(blob)%4)%4)
    total=12+8+len(js)+8+len(blob)
    return struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(blob),b'BIN\x00')+blob

def _scene_to_glb_with_anims(scene, animations):
    files=scene.export(file_type='gltf')
    gltf=json.loads(files['model.gltf'])
    merged=b''; starts={}
    for i,b in enumerate(gltf.get('buffers',[])):
        fn=b['uri']; data=files[fn]; merged=_align4(merged); starts[i]=len(merged); merged+=data
    for bv in gltf.get('bufferViews',[]):
        idx=bv.get('buffer',0); bv['byteOffset']=bv.get('byteOffset',0)+starts[idx]; bv['buffer']=0
    gltf['buffers']=[{'byteLength':len(merged)}]
    name_to_idx={n.get('name'):i for i,n in enumerate(gltf['nodes'])}
    animated_nodes={ch['node'] for a in animations for ch in a['channels']}
    for nm in animated_nodes:
        idx=name_to_idx.get(nm)
        if idx is None: continue
        n=gltf['nodes'][idx]
        if 'matrix' in n:
            M=np.array(n.pop('matrix'),dtype=float).reshape((4,4),order='F')
            sc,sh,ang,tr,per=trimesh.transformations.decompose_matrix(M)
            q=trimesh.transformations.quaternion_from_euler(*ang,'sxyz')
            n['translation']=[float(x) for x in tr]
            n['rotation']=[float(q[1]),float(q[2]),float(q[3]),float(q[0])]
            n['scale']=[float(x) for x in sc]
    gltf.setdefault('animations',[])
    for anim in animations:
        samplers=[]; channels=[]
        for ch in anim['channels']:
            node=name_to_idx.get(ch['node'])
            if node is None: continue
            times=np.asarray(ch['times'],dtype=np.float32); vals=np.asarray(ch['values'],dtype=np.float32)
            merged=_align4(merged); toff=len(merged); tb=times.tobytes(); merged+=tb
            tbv=len(gltf.setdefault('bufferViews',[])); gltf['bufferViews'].append({'buffer':0,'byteOffset':toff,'byteLength':len(tb)})
            ta=len(gltf.setdefault('accessors',[])); gltf['accessors'].append({'bufferView':tbv,'componentType':5126,'count':len(times),'type':'SCALAR','min':[float(times.min())],'max':[float(times.max())]})
            merged=_align4(merged); voff=len(merged); vb=vals.tobytes(); merged+=vb
            vbv=len(gltf['bufferViews']); gltf['bufferViews'].append({'buffer':0,'byteOffset':voff,'byteLength':len(vb)})
            typ='VEC4' if ch['path']=='rotation' else 'VEC3'
            va=len(gltf['accessors']); gltf['accessors'].append({'bufferView':vbv,'componentType':5126,'count':len(vals),'type':typ})
            si=len(samplers); samplers.append({'input':ta,'output':va,'interpolation':'LINEAR'})
            channels.append({'sampler':si,'target':{'node':node,'path':ch['path']}})
        gltf['animations'].append({'name':anim['name'],'samplers':samplers,'channels':channels})
    gltf['buffers'][0]['byteLength']=len(merged)
    return _pack_glb(gltf,merged)

def build_plugy_v43(output_path):
    ceramic=mat((248,248,250),'PLUGY Ceramic',metallic=.02,rough=.24)
    ceramic_shadow=mat((224,230,240),'Ceramic Shadow',metallic=.02,rough=.34)
    hoodie=mat((12,15,24),'Hoodie Black',rough=.76)
    hoodie2=mat((24,28,38),'Hoodie Fabric Detail',rough=.82)
    cargo=mat((18,22,31),'Cargo Black',rough=.74)
    cargo2=mat((35,41,54),'Cargo Panel',rough=.7)
    cyan=mat((54,215,255),'Electric Cyan',(20,115,255),.04,.18)
    blue=mat((45,95,255),'Electric Blue',(20,55,220),.06,.2)
    violet=mat((127,76,255),'Paint Violet',(34,10,100),.02,.32)
    pink=mat((255,73,181),'Paint Magenta',(100,10,55),.02,.32)
    orange=mat((255,151,55),'Paint Orange',(70,25,0),.02,.34)
    sole=mat((238,240,245),'Sneaker Sole',rough=.46)
    lace=mat((245,246,250),'Sneaker Lace',rough=.45)
    metal=mat((215,222,232),'Prong Tip',metallic=.7,rough=.25)
    scene=trimesh.Scene()
    add(scene,superellipsoid((1.62,1.20,1.00),4.6,ceramic,40,24),'Head',(0,1.78,0))
    add(scene,superellipsoid((1.42,1.00,.16),4.0,ceramic_shadow,28,16),'HeadBack',(0,1.77,-.49))
    for x,s in [(-.36,'L'),(.36,'R')]:
        add(scene,capsule_y(.115,.78,ceramic,22),f'Prong{s}',(x,2.63,0))
        add(scene,cyl(.112,.12,metal,22),f'ProngTip{s}',(x,3.00,0),r=(math.pi/2,0,0))
    eye_arc(-.36,1.76,.505,.42,.15,cyan,'EyeL',scene)
    eye_arc(.36,1.76,.505,.42,.15,cyan,'EyeR',scene)
    add(scene,superellipsoid((.60,.22,.58),3.0,hoodie2,24,14),'Neck',(0,1.16,-.02))
    add(scene,superellipsoid((1.18,1.16,.76),3.5,hoodie,34,22),'Torso',(0,.54,0))
    add(scene,superellipsoid((1.04,.28,.64),3.5,hoodie2,28,14),'Hood',(0,1.08,-.34))
    add(scene,tube_between((-.42,1.03,.36),(-.18,1.14,.42),.045,hoodie2), 'HoodRimL')
    add(scene,tube_between((.42,1.03,.36),(.18,1.14,.42),.045,hoodie2), 'HoodRimR')
    for x,s in [(-.20,'L'),(.20,'R')]:
        add(scene,tube_between((x,.98,.41),(x,.63,.44),.025,lace),f'Drawstring{s}')
        add(scene,sph(.04,metal,1),f'DrawstringTip{s}',(x,.60,.44))
    add(scene,superellipsoid((.70,.26,.055),3.8,hoodie2,24,12),'HoodiePocket',(0,.23,.402))
    letters='PLUG'; xs=[-.33,-.11,.11,.35]
    for ch,x in zip(letters,xs): add_letter(scene,ch,x,.66,.407,.78,ceramic,f'Chest_{ch}')
    for x,s,sgn in [(-.72,'L',1),(.72,'R',-1)]:
        add(scene,capsule_y(.16,.78,hoodie,20),f'UpperArm{s}',(x,.62,.0),r=(0,0,.12*sgn))
        add(scene,superellipsoid((.34,.20,.34),3.2,hoodie2,18,12),f'Cuff{s}',(x,.22,.01))
        add(scene,capsule_y(.145,.62,hoodie,20),f'ForeArm{s}',(x,.01,.04),r=(0,0,-.10*sgn))
        add(scene,sph(.185,ceramic,3),f'Hand{s}',(x,-.34,.08))
    add(scene,capsule_y(.055,.24,ceramic,14),'ThumbL',(-.81,-.31,.17),r=(0,0,-.72))
    add(scene,capsule_y(.055,.24,ceramic,14),'ThumbR',(.81,-.31,.17),r=(0,0,.72))
    add(scene,superellipsoid((1.00,.38,.70),3.5,cargo,28,16),'Waist',(0,-.12,0))
    for x,s in [(-.29,'L'),(.29,'R')]:
        add(scene,capsule_y(.19,.90,cargo,20),f'Leg{s}',(x,-.70,0))
        add(scene,superellipsoid((.38,.34,.22),3.8,cargo2,20,12),f'CargoPocket{s}',(x + (-.13 if s=='L' else .13),-.55,.28))
        add(scene,box((.24,.045,.035),metal),f'CargoZip{s}',(x + (-.13 if s=='L' else .13),-.49,.395))
    for x,s in [(-.31,'L'),(.31,'R')]:
        add(scene,superellipsoid((.56,.34,.86),3.8,hoodie,28,18),f'Shoe{s}',(x,-1.22,.16))
        add(scene,superellipsoid((.58,.15,.89),4.0,sole,28,12),f'Sole{s}',(x,-1.39,.16))
        add(scene,superellipsoid((.46,.16,.40),3.5,ceramic_shadow,20,12),f'ToeCap{s}',(x,-1.18,.42))
        add(scene,box((.10,.24,.055),blue),f'ShoeStripe{s}',(x + (-.16 if s=='L' else .16),-1.19,.56),r=(0,0,.35 if s=='L' else -.35))
        for j,yy in enumerate([-1.14,-1.20,-1.26]): add(scene,box((.30,.025,.025),lace),f'Lace{s}{j}',(x,yy,.59))
    splats=[(.62,.72,-.38,pink,.11),(.48,.58,-.40,violet,.10),(.34,.46,-.41,blue,.08),(.57,.40,-.41,orange,.07),(.26,.68,-.42,cyan,.06),(.73,.52,-.39,pink,.055),(-.42,.67,-.40,violet,.075),(-.30,.56,-.42,cyan,.055)]
    for i,(x,y,z,m,r) in enumerate(splats):
        blob=sph(r,m,2); blob.apply_scale([1.8,.55,.42]); add(scene,blob,f'PaintBlob{i}',(x,y,z))
    for i,(x,y,z,m) in enumerate([(0.72,.82,-.39,pink),(0.78,.72,-.39,orange),(0.58,.30,-.39,violet),(0.18,.76,-.40,cyan)]): add(scene,sph(.035,m,1),f'PaintDrop{i}',(x,y,z))
    add(scene,superellipsoid((.17,.66,.38),3.2,blue,18,12),'PackL',(-.57,.58,-.33))
    add(scene,superellipsoid((.17,.66,.38),3.2,cyan,18,12),'PackR',(.57,.58,-.33))
    anims=[
      {'name':'Idle','channels':[{'node':'Head','path':'translation','times':[0,.7,1.4,2.1,2.8],'values':[[0,1.78,0],[0,1.82,0],[0,1.78,0],[0,1.75,0],[0,1.78,0]]},{'node':'Torso','path':'rotation','times':[0,1.4,2.8],'values':[quat((0,0,1),0),quat((0,0,1),.018),quat((0,0,1),0)]}]},
      {'name':'Wave','channels':[{'node':'UpperArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((0,0,1),-.12),quat((0,0,1),-1.15),quat((0,0,1),-.68),quat((0,0,1),-1.10),quat((0,0,1),-.62),quat((0,0,1),-.12)]},{'node':'ForeArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((1,0,0),0),quat((1,0,0),-.86),quat((1,0,0),-.30),quat((1,0,0),-.82),quat((1,0,0),-.26),quat((1,0,0),0)]},{'node':'Head','path':'rotation','times':[0,.7,1.4],'values':[quat((0,0,1),0),quat((0,0,1),.10),quat((0,0,1),0)]}]},
      {'name':'Point','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),.12),quat((0,0,1),1.05),quat((0,0,1),1.05),quat((0,0,1),.12)]},{'node':'ForeArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),0),quat((0,0,1),-.45),quat((0,0,1),-.45),quat((0,0,1),0)]}]},
      {'name':'Think','channels':[{'node':'Head','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.16),quat((1,0,0),.08),quat((0,0,1),0)]},{'node':'UpperArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),-.12),quat((0,0,1),-.82),quat((0,0,1),-.82),quat((0,0,1),-.12)]},{'node':'ForeArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((1,0,0),0),quat((1,0,0),-.95),quat((1,0,0),-.95),quat((1,0,0),0)]}]},
      {'name':'Present','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),.12),quat((0,0,1),.82),quat((0,0,1),.82),quat((0,0,1),.12)]},{'node':'UpperArmR','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),-.12),quat((0,0,1),-.82),quat((0,0,1),-.82),quat((0,0,1),-.12)]}]},
      {'name':'Curious','channels':[{'node':'Head','path':'rotation','times':[0,.45,.9,1.35],'values':[quat((0,0,1),0),quat((0,0,1),.20),quat((0,0,1),.20),quat((0,0,1),0)]}]},
      {'name':'Dance','channels':[{'node':'Torso','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),0)]},{'node':'Head','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.15),quat((0,0,1),.15),quat((0,0,1),-.15),quat((0,0,1),.15),quat((0,0,1),0)]}]},
      {'name':'Bounce','channels':[{'node':'Head','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,1.78,0],[0,1.88,0],[0,1.78,0],[0,1.84,0],[0,1.78,0]]},{'node':'Torso','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,.54,0],[0,.60,0],[0,.54,0],[0,.58,0],[0,.54,0]]}]}
    ]
    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
    return {'path':str(p),'bytes':len(raw),'nodes':len(scene.geometry),'animations':[a['name'] for a in anims],'sha256':hashlib.sha256(raw).hexdigest()}

if __name__=='__main__': print(build_plugy_v43(Path(__file__).resolve().parent/'static'/'plugy.glb'))
