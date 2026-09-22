from pathlib import Path
import math, json, struct, hashlib
import numpy as np
import trimesh
from build_plugy_v43 import mat, superellipsoid, capsule_y, tube_between, quat, _scene_to_glb_with_anims, _pack_glb

def _child(scene, mesh, name, parent="PlugyRoot", t=(0,0,0), r=None):
    M=np.eye(4)
    if r is not None:
        M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    M[:3,3]=np.asarray(t,dtype=float)
    scene.add_geometry(mesh, geom_name=name, node_name=name, transform=M, parent_node_name=parent)

def _group(scene,name,parent="PlugyRoot",t=(0,0,0)):
    M=np.eye(4); M[:3,3]=np.asarray(t,dtype=float)
    scene.graph.update(frame_to=name,frame_from=parent,matrix=M)

def _arc(scene,parent,width,height,z,radius,material,prefix,segments=18):
    xs=np.linspace(-width/2,width/2,segments)
    pts=[(x,height*(1-(2*x/width)**2),z) for x in xs]
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        _child(scene,tube_between(a,b,radius,material,20),f"{prefix}_{i}",parent=parent)

def _patch_material_extensions(raw):
    if raw[:4] != b"glTF":
        return raw
    pos=12; gltf=None; blob=b""
    total=len(raw)
    while pos+8<=total:
        clen,ctype=struct.unpack_from("<I4s",raw,pos); pos+=8
        data=raw[pos:pos+clen]; pos+=clen
        if ctype==b"JSON":
            gltf=json.loads(data.rstrip(b" \x00").decode("utf-8"))
        elif ctype==b"BIN\x00":
            blob=data
    if not gltf:
        return raw
    used=set(gltf.get("extensionsUsed",[]))
    for material in gltf.get("materials",[]):
        name=(material.get("name") or "").lower()
        ext=material.setdefault("extensions",{})
        if "pearl" in name:
            used.update(("KHR_materials_clearcoat","KHR_materials_iridescence"))
            ext["KHR_materials_clearcoat"]={"clearcoatFactor":1.0,"clearcoatRoughnessFactor":0.075}
            ext["KHR_materials_iridescence"]={
                "iridescenceFactor":0.52,
                "iridescenceIor":1.32,
                "iridescenceThicknessMinimum":115.0,
                "iridescenceThicknessMaximum":420.0
            }
        elif "eye" in name:
            used.add("KHR_materials_clearcoat")
            ext["KHR_materials_clearcoat"]={"clearcoatFactor":0.82,"clearcoatRoughnessFactor":0.055}
    gltf["extensionsUsed"]=sorted(used)
    return _pack_glb(gltf,blob)

def build_plugy_canonical_v72(output_path):
    pearl=mat((253,253,255),"PLUGY Pearl White",metallic=.055,rough=.105)
    pearl_back=mat((247,246,255),"PLUGY Pearl Back",metallic=.045,rough=.14)
    eye_left=mat((13,70,196),"PLUGY Eye Blue",emissive=(2,18,68),metallic=.16,rough=.075)
    eye_right=mat((37,22,120),"PLUGY Eye Violet",emissive=(10,3,48),metallic=.18,rough=.07)
    cyan=mat((83,229,255),"PLUGY Cyan Rim",emissive=(12,102,150),metallic=.02,rough=.16)
    violet=mat((128,83,255),"PLUGY Violet Rim",emissive=(55,24,125),metallic=.02,rough=.16)
    pink=mat((255,118,223),"PLUGY Pink Rim",emissive=(145,38,105),metallic=.02,rough=.16)

    scene=trimesh.Scene()
    scene.graph.update(frame_to="PlugyRoot",matrix=np.eye(4))

    _child(scene,superellipsoid((1.78,1.10,.62),4.55,pearl_back,58,36),"RearPearl",t=(0,.58,-.055))
    _child(scene,superellipsoid((.17,.76,.48),3.7,cyan,28,20),"CyanEdge",t=(-.825,.49,-.025))
    _child(scene,superellipsoid((.17,.76,.48),3.7,pink,28,20),"PinkEdge",t=(.825,.49,-.040))
    _child(scene,superellipsoid((.82,.135,.45),3.4,violet,32,16),"VioletBottom",t=(0,.055,-.035))
    _child(scene,superellipsoid((1.72,1.08,.60),4.65,pearl,64,40),"Head",t=(0,.58,.065))

    for x,side in [(-.36,"L"),(.36,"R")]:
        _child(scene,capsule_y(.105,.62,pearl,34),f"Prong{side}",t=(x,1.375,.015))

    for x,side,material in [(-.35,"L",eye_left),(.35,"R",eye_right)]:
        root=f"Eye{side}Root"; _group(scene,root,t=(x,.56,0))
        _arc(scene,root,.43,.145,.382,.056,material,f"Eye{side}",18)

    anims=[
      {"name":"Idle","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.9,1.8,2.7,3.6],"values":[[0,0,0],[0,.035,0],[0,.008,0],[0,-.020,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,1.2,2.4,3.6],"values":[quat((0,0,1),-.018),quat((0,0,1),.012),quat((0,0,1),-.028),quat((0,0,1),-.018)]}]},
      {"name":"SoftTurn","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.75,1.5,2.25],"values":[quat((0,1,0),0),quat((0,1,0),.105),quat((0,1,0),-.085),quat((0,1,0),0)]}]},
      {"name":"Think","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.45,1.0,1.45],"values":[quat((0,0,1),0),quat((0,0,1),-.085),quat((0,1,0),.045),quat((0,0,1),0)]}]},
      {"name":"Curious","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.42,.88,1.32],"values":[quat((0,0,1),0),quat((0,0,1),.10),quat((0,1,0),-.04),quat((0,0,1),0)]}]},
      {"name":"Present","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.38,.78,1.18],"values":[quat((0,1,0),0),quat((0,1,0),.12),quat((0,1,0),-.07),quat((0,1,0),0)]}]},
      {"name":"Bounce","channels":[{"node":"PlugyRoot","path":"translation","times":[0,.20,.42,.66,.92],"values":[[0,0,0],[0,.075,0],[0,0,0],[0,.035,0],[0,0,0]]}]},
      {"name":"Happy","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.20,.42,.72],"values":[[0,0,0],[0,.055,0],[0,.015,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,.36,.72],"values":[quat((0,0,1),0),quat((0,0,1),.040),quat((0,0,1),0)]}]},
      {"name":"Attentive","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.38,.80],"values":[quat((1,0,0),0),quat((1,0,0),-.035),quat((1,0,0),0)]}]},
      {"name":"Wave","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.24,.48,.72,.96,1.22],"values":[quat((0,0,1),0),quat((0,0,1),.060),quat((0,0,1),-.050),quat((0,0,1),.050),quat((0,0,1),-.030),quat((0,0,1),0)]}]},
      {"name":"Dance","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.30,.60,.90,1.20,1.50],"values":[quat((0,0,1),0),quat((0,0,1),.075),quat((0,0,1),-.075),quat((0,0,1),.075),quat((0,0,1),-.075),quat((0,0,1),0)]}]},
      {"name":"Blink","channels":[
        {"node":"EyeLRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.18,1],[1,.045,1],[1,.18,1],[1,1,1]]},
        {"node":"EyeRRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.18,1],[1,.045,1],[1,.18,1],[1,1,1]]}]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    raw=_patch_material_extensions(raw)
    p=Path(output_path); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
    return {
      "path":str(p),"bytes":len(raw),"nodes":len(scene.geometry),
      "animations":[a["name"] for a in anims],
      "sha256":hashlib.sha256(raw).hexdigest(),
      "design":"plugy-canonical-pearl-iridescent-head-v72",
      "body":False,"material":"pearl-white-clearcoat-iridescence","canonical":True
    }
