from pathlib import Path
import json, struct, math
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def mat(rgb,name,emissive=None,metallic=.04,rough=.42):
    kw=dict(baseColorFactor=[c/255 for c in rgb]+[1.0], metallicFactor=metallic, roughnessFactor=rough, name=name)
    if emissive: kw['emissiveFactor']=[c/255 for c in emissive]
    return PBRMaterial(**kw)

def apply(m, material): m.visual=TextureVisuals(material=material); return m

def box(ext, material): return apply(trimesh.creation.box(extents=ext), material)
def sph(r, material, sub=2): return apply(trimesh.creation.icosphere(subdivisions=sub,radius=r), material)
def cyl(r,h, material, sec=16): return apply(trimesh.creation.cylinder(radius=r,height=h,sections=sec),material)

def add(scene, mesh, name, t=(0,0,0), r=None):
    M=trimesh.transformations.translation_matrix(t)
    if r is not None: M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    scene.add_geometry(mesh, geom_name=name, node_name=name, transform=M)

def rounded_cube(ext, radius, material):
    x,y,z=ext
    parts=[box((x-2*radius,y,z),material),box((x,y-2*radius,z),material),box((x,y,z-2*radius),material)]
    for sx in (-1,1):
      for sy in (-1,1):
        for sz in (-1,1):
          s=sph(radius,material,2); s.apply_translation((sx*(x/2-radius),sy*(y/2-radius),sz*(z/2-radius))); parts.append(s)
    return trimesh.util.concatenate(parts)

def limb(length,radius,material): return cyl(radius,length,material,16)

def arc_eye(material, scale=1.0):
    a=box((.26*scale,.07*scale,.055*scale),material); a.apply_transform(trimesh.transformations.euler_matrix(0,0,.48)); a.apply_translation((-.105*scale,0,0))
    b=box((.26*scale,.07*scale,.055*scale),material); b.apply_transform(trimesh.transformations.euler_matrix(0,0,-.48)); b.apply_translation((.105*scale,0,0))
    return trimesh.util.concatenate([a,b])

def quat(axis, angle):
    axis=np.array(axis,dtype=float); axis/=np.linalg.norm(axis)
    s=math.sin(angle/2); return [axis[0]*s,axis[1]*s,axis[2]*s,math.cos(angle/2)]

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
    for anim in animations:
        for ch in anim['channels']:
            idx=name_to_idx.get(ch['node'])
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

def build_plugy_v42(output_path):
    white=mat((246,247,250),'Plug ceramic',metallic=.02,rough=.3)
    black=mat((14,18,28),'Hoodie black',rough=.68)
    dark=mat((27,33,47),'Cargo dark',rough=.64)
    cyan=mat((50,205,255),'Electric cyan',(18,110,255),.05,.25)
    blue=mat((42,82,255),'Electric blue',(25,65,220),.08,.22)
    pink=mat((255,70,178),'Paint magenta',(90,10,50),.02,.35)
    violet=mat((126,72,255),'Paint violet',(30,10,80),.02,.35)
    orange=mat((255,143,45),'Paint orange',(60,24,0),.02,.35)
    sole=mat((231,235,242),'Sneaker sole',rough=.5)
    metal=mat((218,224,235),'Prong metal',metallic=.72,rough=.28)
    scene=trimesh.Scene()
    add(scene,rounded_cube((1.55,1.02,.92),.18,white),'Head',(0,1.78,0))
    add(scene,cyl(.105,.72,metal,20),'ProngL',(-.34,2.62,0)); add(scene,cyl(.105,.72,metal,20),'ProngR',(.34,2.62,0))
    add(scene,arc_eye(cyan,1.0),'EyeL',(-.36,1.82,.475)); add(scene,arc_eye(cyan,1.0),'EyeR',(.36,1.82,.475))
    add(scene,rounded_cube((1.08,1.12,.70),.13,black),'Torso',(0,.55,0))
    add(scene,rounded_cube((.76,.20,.08),.04,white),'ChestPLUG',(0,.68,.40))
    add(scene,box((.18,.64,.06),violet),'PaintSlash1',(.36,.56,.395),r=(0,0,-.5)); add(scene,box((.13,.52,.06),pink),'PaintSlash2',(.48,.48,.402),r=(0,0,.35)); add(scene,box((.10,.42,.06),orange),'PaintSlash3',(.25,.38,.405),r=(0,0,.75))
    for x,s in [(-.68,'L'),(.68,'R')]:
        add(scene,limb(.72,.14,black),f'UpperArm{s}',(x,.63,0),r=(0,0,.08 if x<0 else -.08)); add(scene,limb(.62,.13,dark),f'ForeArm{s}',(x,.05,.03),r=(0,0,-.10 if x<0 else .10)); add(scene,sph(.17,white,2),f'Hand{s}',(x,-.31,.06))
    add(scene,rounded_cube((1.00,.34,.68),.08,dark),'Waist',(0,-.10,0))
    for x,s in [(-.28,'L'),(.28,'R')]:
        add(scene,limb(.82,.17,dark),f'Leg{s}',(x,-.66,0)); add(scene,rounded_cube((.46,.25,.78),.08,black),f'Shoe{s}',(x,-1.14,.14)); add(scene,box((.48,.09,.80),sole),f'Sole{s}',(x,-1.30,.14)); add(scene,box((.10,.16,.42),cyan),f'ShoeAccent{s}',(x,-1.10,.51))
    add(scene,rounded_cube((.92,.48,.18),.08,black),'Hood',(0,1.07,-.40))
    for i,(x,y,z,m,r) in enumerate([(-.46,.63,-.42,pink,.12),(-.32,.44,-.43,violet,.10),(-.12,.58,-.44,blue,.09),(.16,.38,-.44,orange,.08),(.38,.52,-.44,cyan,.07)]): add(scene,sph(r,m,1),f'BackPaint{i}',(x,y,z))
    add(scene,rounded_cube((.17,.62,.42),.05,blue),'PackL',(-.58,.62,-.26)); add(scene,rounded_cube((.17,.62,.42),.05,cyan),'PackR',(.58,.62,-.26))
    t=[0,.5,1,1.5,2]
    anims=[
      {'name':'Idle','channels':[{'node':'Head','path':'translation','times':t,'values':[[0,1.78,0],[0,1.82,0],[0,1.78,0],[0,1.75,0],[0,1.78,0]]}]},
      {'name':'Wave','channels':[{'node':'UpperArmR','path':'rotation','times':[0,.3,.6,.9,1.2],'values':[quat((0,0,1),-.2),quat((0,0,1),-1.0),quat((0,0,1),-.55),quat((0,0,1),-1.0),quat((0,0,1),-.2)]},{'node':'ForeArmR','path':'rotation','times':[0,.3,.6,.9,1.2],'values':[quat((1,0,0),0),quat((1,0,0),-.8),quat((1,0,0),-.3),quat((1,0,0),-.8),quat((1,0,0),0)]}]},
      {'name':'Point','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.5,1],'values':[quat((0,0,1),.1),quat((0,0,1),1.0),quat((0,0,1),.1)]}]},
      {'name':'Think','channels':[{'node':'Head','path':'rotation','times':[0,.55,1.1],'values':[quat((0,0,1),0),quat((0,0,1),-.16),quat((0,0,1),0)]},{'node':'UpperArmR','path':'rotation','times':[0,.55,1.1],'values':[quat((0,0,1),-.15),quat((0,0,1),-.8),quat((0,0,1),-.15)]}]},
      {'name':'Present','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.45,.9],'values':[quat((0,0,1),.1),quat((0,0,1),.8),quat((0,0,1),.1)]},{'node':'UpperArmR','path':'rotation','times':[0,.45,.9],'values':[quat((0,0,1),-.1),quat((0,0,1),-.8),quat((0,0,1),-.1)]}]},
      {'name':'Dance','channels':[{'node':'Torso','path':'rotation','times':[0,.3,.6,.9,1.2],'values':[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),.12),quat((0,0,1),0)]},{'node':'Head','path':'rotation','times':[0,.3,.6,.9,1.2],'values':[quat((0,0,1),0),quat((0,0,1),-.16),quat((0,0,1),.16),quat((0,0,1),-.16),quat((0,0,1),0)]}]},
    ]
    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
    return {'path':str(p),'bytes':len(raw),'nodes':len(scene.geometry),'animations':[a['name'] for a in anims]}

if __name__=='__main__': print(build_plugy_v42(Path(__file__).resolve().parent/'static'/'plugy.glb'))
