from __future__ import annotations
from pathlib import Path
import json, math, struct
import numpy as np
import trimesh


def _sgn_pow(v: float, p: float) -> float:
    return math.copysign(abs(v) ** p, v)


def superellipsoid(a, b, c, e1=4.6, e2=4.6, n_lat=46, n_lon=92):
    verts=[]
    for i in range(n_lat+1):
        v=-math.pi/2 + math.pi*i/n_lat
        cv,sv=math.cos(v),math.sin(v)
        cvp,svp=_sgn_pow(cv,2/e1),_sgn_pow(sv,2/e1)
        for j in range(n_lon):
            u=2*math.pi*j/n_lon
            cu,su=math.cos(u),math.sin(u)
            verts.append((a*cvp*_sgn_pow(cu,2/e2), b*svp, c*cvp*_sgn_pow(su,2/e2)))
    faces=[]
    for i in range(n_lat):
        for j in range(n_lon):
            nj=(j+1)%n_lon
            a0=i*n_lon+j; a1=i*n_lon+nj; b0=(i+1)*n_lon+j; b1=(i+1)*n_lon+nj
            faces.extend(((a0,b0,a1),(a1,b0,b1)))
    m=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
    m.fix_normals(); return m


def eye_arc(width=.39,height=.14,radius=.048,segments=40,sides=18):
    centers=[]
    for i in range(segments+1):
        t=i/segments; x=-width/2+width*t; xn=x/(width/2)
        centers.append(np.array([x,height*(1-xn*xn),0.0],float))
    verts=[]
    for i,c in enumerate(centers):
        tangent=(centers[min(i+1,len(centers)-1)]-centers[max(i-1,0)])
        tangent/=max(np.linalg.norm(tangent),1e-6)
        b1=np.array([0.,0.,1.]); b2=np.cross(tangent,b1); b2/=max(np.linalg.norm(b2),1e-6)
        for j in range(sides):
            a=2*math.pi*j/sides
            verts.append(c+radius*(math.cos(a)*b1+math.sin(a)*b2))
    faces=[]
    for i in range(len(centers)-1):
        for j in range(sides):
            nj=(j+1)%sides; a=i*sides+j; b=i*sides+nj; c=(i+1)*sides+j; d=(i+1)*sides+nj
            faces.extend(((a,c,b),(b,c,d)))
    m=trimesh.Trimesh(vertices=np.asarray(verts),faces=np.asarray(faces),process=False)
    m.fix_normals(); return m


def _quat(rx,ry,rz):
    cx,sx=math.cos(rx/2),math.sin(rx/2); cy,sy=math.cos(ry/2),math.sin(ry/2); cz,sz=math.cos(rz/2),math.sin(rz/2)
    return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz]


def _pad4(raw: bytes,pad=b' '):
    return raw+pad*((4-len(raw)%4)%4)


def build_plugy_head_v33(output_path: str|Path):
    output_path=Path(output_path); output_path.parent.mkdir(parents=True,exist_ok=True)

    body=superellipsoid(.92,.68,.30,e1=5.2,e2=5.0,n_lat=48,n_lon=96)
    prong=superellipsoid(.115,.40,.105,e1=2.5,e2=2.5,n_lat=28,n_lon=52)
    eye=eye_arc()
    rim_v=superellipsoid(.028,.47,.018,e1=2.1,e2=2.1,n_lat=18,n_lon=30)
    rim_h=superellipsoid(.43,.023,.018,e1=2.1,e2=2.1,n_lat=14,n_lon=38)
    meshes=[
        ('Body',body,0),('ProngL',prong,1),('ProngR',prong.copy(),1),
        ('EyeL',eye,2),('EyeR',eye.copy(),2),
        ('RimCyan',rim_v,3),('RimPink',rim_v.copy(),4),
        ('RimBottomCyan',rim_h,3),('RimBottomPink',rim_h.copy(),4),
    ]

    materials=[
        {
            'name':'PLUGY Soft Pearl Lavender',
            'pbrMetallicRoughness':{'baseColorFactor':[.87,.90,1.0,1.0],'metallicFactor':.06,'roughnessFactor':.20},
            'emissiveFactor':[.018,.025,.065],
            'extensions':{
                'KHR_materials_clearcoat':{'clearcoatFactor':.78,'clearcoatRoughnessFactor':.09},
                'KHR_materials_specular':{'specularFactor':.82,'specularColorFactor':[.92,.96,1.0]},
            },
        },
        {
            'name':'PLUGY Prongs Ice Violet',
            'pbrMetallicRoughness':{'baseColorFactor':[.68,.77,.98,1.0],'metallicFactor':.14,'roughnessFactor':.17},
            'emissiveFactor':[.025,.04,.12],
            'extensions':{
                'KHR_materials_clearcoat':{'clearcoatFactor':.84,'clearcoatRoughnessFactor':.07},
                'KHR_materials_specular':{'specularFactor':.9,'specularColorFactor':[.9,.95,1.0]},
            },
        },
        {
            'name':'PLUGY Navy Eyes',
            'pbrMetallicRoughness':{'baseColorFactor':[.018,.055,.34,1.0],'metallicFactor':.18,'roughnessFactor':.11},
            'emissiveFactor':[.015,.045,.24],
            'extensions':{
                'KHR_materials_clearcoat':{'clearcoatFactor':.88,'clearcoatRoughnessFactor':.05},
                'KHR_materials_emissive_strength':{'emissiveStrength':1.75},
            },
        },
        {
            'name':'PLUGY Cyan Edge',
            'pbrMetallicRoughness':{'baseColorFactor':[.05,.82,1.0,.88],'metallicFactor':0.0,'roughnessFactor':.20},
            'emissiveFactor':[.04,.70,.96],'alphaMode':'BLEND','doubleSided':True,
            'extensions':{'KHR_materials_emissive_strength':{'emissiveStrength':2.05}},
        },
        {
            'name':'PLUGY Pink Edge',
            'pbrMetallicRoughness':{'baseColorFactor':[.92,.10,.88,.86],'metallicFactor':0.0,'roughnessFactor':.20},
            'emissiveFactor':[.73,.05,.72],'alphaMode':'BLEND','doubleSided':True,
            'extensions':{'KHR_materials_emissive_strength':{'emissiveStrength':1.95}},
        },
    ]

    blob=bytearray(); views=[]; accessors=[]; gltf_meshes=[]
    def add(arr,target=None,component=5126,kind='VEC3'):
        nonlocal blob
        arr=np.ascontiguousarray(arr); off=len(blob); raw=arr.tobytes(); blob.extend(raw); blob.extend(b'\x00'*((4-len(blob)%4)%4))
        view={'buffer':0,'byteOffset':off,'byteLength':len(raw)}
        if target: view['target']=target
        vi=len(views); views.append(view)
        values=arr.reshape(-1) if kind=='SCALAR' else arr.reshape((-1,arr.shape[-1]))
        ac={'bufferView':vi,'componentType':component,'count':len(arr),'type':kind}
        if np.issubdtype(arr.dtype,np.floating):
            if kind=='SCALAR': ac['min']=[float(values.min())]; ac['max']=[float(values.max())]
            else: ac['min']=[float(x) for x in values.min(axis=0)]; ac['max']=[float(x) for x in values.max(axis=0)]
        else:
            ac['min']=[int(values.min())]; ac['max']=[int(values.max())]
        ai=len(accessors); accessors.append(ac); return ai

    for name,mesh,mi in meshes:
        p=add(np.asarray(mesh.vertices,dtype=np.float32),34962,5126,'VEC3')
        n=add(np.asarray(mesh.vertex_normals,dtype=np.float32),34962,5126,'VEC3')
        ind=add(np.asarray(mesh.faces.reshape(-1),dtype=np.uint32),34963,5125,'SCALAR')
        gltf_meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':p,'NORMAL':n},'indices':ind,'material':mi,'mode':4}]})

    nodes=[
        {'name':'PLUGY_Root','children':[1]},
        {'name':'PLUGY_HeadRig','children':[2,3,4,5,6,7,8,9,10]},
        {'name':'Body','mesh':0},
        {'name':'Prong_L','mesh':1,'translation':[-.385,.93,-.02],'rotation':[0,0,-.03,.99955]},
        {'name':'Prong_R','mesh':2,'translation':[.385,.93,-.02],'rotation':[0,0,.03,.99955]},
        {'name':'Eye_L','mesh':3,'translation':[-.335,.015,.307]},
        {'name':'Eye_R','mesh':4,'translation':[.335,.015,.307]},
        {'name':'Rim_Cyan','mesh':5,'translation':[-.914,-.015,.255]},
        {'name':'Rim_Pink','mesh':6,'translation':[.914,-.015,.255]},
        {'name':'Rim_Bottom_Cyan','mesh':7,'translation':[-.43,-.682,.255]},
        {'name':'Rim_Bottom_Pink','mesh':8,'translation':[.43,-.682,.255]},
    ]

    animations=[]
    def scalar(v): return add(np.asarray(v,dtype=np.float32),component=5126,kind='SCALAR')
    def vec3(v): return add(np.asarray(v,dtype=np.float32),component=5126,kind='VEC3')
    def vec4(v): return add(np.asarray(v,dtype=np.float32),component=5126,kind='VEC4')
    def clip(name,specs):
        samplers=[]; channels=[]
        for s in specs:
            ti=scalar(s['t']); oi=vec4(s['v']) if s['path']=='rotation' else vec3(s['v'])
            si=len(samplers); samplers.append({'input':ti,'output':oi,'interpolation':s.get('interp','LINEAR')})
            channels.append({'sampler':si,'target':{'node':s['node'],'path':s['path']}})
        animations.append({'name':name,'samplers':samplers,'channels':channels})

    idle_t=[0,1.4,2.8,4.2,5.6,7.0,8.4]
    blink_t=[0,.95,1.02,1.10,3.12,3.20,3.28,5.66,5.74,5.82,8.4]
    blink=[[1,.08 if i in {2,5,8} else 1,1] for i in range(len(blink_t))]
    clip('IdleBlink',[
        {'node':1,'path':'rotation','t':idle_t,'v':[_quat(0,0,0),_quat(.015,.04,-.018),_quat(-.01,-.035,.015),_quat(.012,.02,-.012),_quat(-.01,.038,.017),_quat(.006,-.028,-.01),_quat(0,0,0)]},
        {'node':1,'path':'translation','t':idle_t,'v':[[0,0,0],[0,.025,.006],[0,.004,0],[0,.032,.004],[0,.006,0],[0,.021,.004],[0,0,0]]},
        {'node':5,'path':'scale','t':blink_t,'v':blink},{'node':6,'path':'scale','t':blink_t,'v':blink},
    ])
    curious_t=[0,.34,.82,1.35,2.1]
    clip('Curious',[
        {'node':1,'path':'rotation','t':curious_t,'v':[_quat(0,0,0),_quat(-.02,.06,-.10),_quat(.02,.10,-.16),_quat(-.01,.05,-.09),_quat(0,0,0)]},
        {'node':1,'path':'translation','t':curious_t,'v':[[0,0,0],[0,.018,.01],[.015,.035,.015],[0,.015,.008],[0,0,0]]},
        {'node':5,'path':'scale','t':curious_t,'v':[[1,1,1],[1,.72,1],[1,.88,1],[1,.93,1],[1,1,1]]},
        {'node':6,'path':'scale','t':curious_t,'v':[[1,1,1],[1,.94,1],[1,.78,1],[1,.92,1],[1,1,1]]},
    ])
    react_t=[0,.18,.38,.68,1.05,1.45]
    clip('React',[
        {'node':1,'path':'rotation','t':react_t,'v':[_quat(0,0,0),_quat(.04,-.05,.08),_quat(-.025,.07,-.09),_quat(.015,-.03,.05),_quat(0,.02,-.015),_quat(0,0,0)]},
        {'node':1,'path':'translation','t':react_t,'v':[[0,0,0],[0,.055,.01],[0,.018,0],[0,.045,.008],[0,.012,0],[0,0,0]]},
        {'node':5,'path':'scale','t':react_t,'v':[[1,1,1],[1,.42,1],[1,.92,1],[1,.65,1],[1,1,1],[1,1,1]]},
        {'node':6,'path':'scale','t':react_t,'v':[[1,1,1],[1,.42,1],[1,.92,1],[1,.65,1],[1,1,1],[1,1,1]]},
    ])
    think_t=[0,.7,1.4,2.1,2.8,3.5]
    clip('Think',[
        {'node':1,'path':'rotation','t':think_t,'v':[_quat(0,0,0),_quat(-.01,-.05,.05),_quat(.012,.035,-.055),_quat(-.008,-.025,.045),_quat(.01,.03,-.035),_quat(0,0,0)]},
        {'node':1,'path':'translation','t':think_t,'v':[[0,0,0],[0,.018,0],[0,.028,.004],[0,.014,0],[0,.025,.004],[0,0,0]]},
        {'node':5,'path':'scale','t':think_t,'v':[[1,1,1],[1,.76,1],[1,.84,1],[1,.72,1],[1,.88,1],[1,1,1]]},
        {'node':6,'path':'scale','t':think_t,'v':[[1,1,1],[1,.76,1],[1,.84,1],[1,.72,1],[1,.88,1],[1,1,1]]},
    ])

    doc={
        'asset':{'version':'2.0','generator':'PLUG ART · PLUGY V33'},'scene':0,'scenes':[{'name':'PLUGY','nodes':[0]}],
        'nodes':nodes,'meshes':gltf_meshes,'materials':materials,'animations':animations,
        'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors,
        'extensionsUsed':['KHR_materials_clearcoat','KHR_materials_specular','KHR_materials_emissive_strength'],
    }
    jc=_pad4(json.dumps(doc,separators=(',',':')).encode(),b' '); bc=_pad4(bytes(blob),b'\x00')
    total=12+8+len(jc)+8+len(bc)
    out=bytearray(struct.pack('<4sII',b'glTF',2,total)); out.extend(struct.pack('<I4s',len(jc),b'JSON')); out.extend(jc); out.extend(struct.pack('<I4s',len(bc),b'BIN\x00')); out.extend(bc)
    output_path.write_bytes(out)
    return {'path':str(output_path),'bytes':len(out),'nodes':len(nodes),'meshes':len(gltf_meshes),'materials':len(materials),'animations':[a['name'] for a in animations]}


if __name__=='__main__':
    print(build_plugy_head_v33(Path(__file__).resolve().parent/'static'/'plugy_head_v33.glb'))
