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
        if "shell" in name or "pink" in name or "lavender" in name:
            used.update(("KHR_materials_clearcoat","KHR_materials_iridescence","KHR_materials_specular","KHR_materials_ior"))
            ext["KHR_materials_clearcoat"]={"clearcoatFactor":1.0,"clearcoatRoughnessFactor":0.012}
            ext["KHR_materials_iridescence"]={
                "iridescenceFactor":0.84,
                "iridescenceIor":1.30,
                "iridescenceThicknessMinimum":180.0,
                "iridescenceThicknessMaximum":560.0
            }
            ext["KHR_materials_specular"]={
                "specularFactor":1.0,
                "specularColorFactor":[1.0,0.90,0.98]
            }
            ext["KHR_materials_ior"]={"ior":1.46}
        elif "eye" in name:
            used.update(("KHR_materials_clearcoat","KHR_materials_specular","KHR_materials_ior"))
            ext["KHR_materials_clearcoat"]={"clearcoatFactor":0.92,"clearcoatRoughnessFactor":0.012}
            ext["KHR_materials_specular"]={"specularFactor":1.0,"specularColorFactor":[0.92,0.96,1.0]}
            ext["KHR_materials_ior"]={"ior":1.50}
    gltf["extensionsUsed"]=sorted(used)
    return _pack_glb(gltf,blob)

def build_plugy_pink_v75(output_path):
    pearl=mat((255,176,214),"PLUGY Shell Pink",metallic=.018,rough=.040)
    pearl_back=mat((226,176,255),"PLUGY Shell Lavender",metallic=.018,rough=.050)
    eye_left=mat((18,18,18),"PLUGY Eye Black",metallic=.0,rough=.030)
    eye_right=mat((18,18,18),"PLUGY Eye Black",metallic=.0,rough=.030)
    cyan=mat((255,150,220),"PLUGY Pink Highlight",emissive=(60,12,42),metallic=.0,rough=.070)
    violet=mat((151,98,240),"PLUGY Violet Highlight",emissive=(34,16,70),metallic=.0,rough=.080)
    pink=mat((239,146,255),"PLUGY Lavender Highlight",emissive=(48,18,72),metallic=.0,rough=.075)

    scene=trimesh.Scene()
    scene.graph.update(frame_to="PlugyRoot",matrix=np.eye(4))

    _child(scene,superellipsoid((1.62,1.04,.72),5.15,pearl_back,64,40),"RearPearl",t=(0,.58,-.055))
    _child(scene,superellipsoid((.075,.64,.42),4.2,cyan,28,18),"CyanEdge",t=(-.847,.50,-.11))
    _child(scene,superellipsoid((.075,.64,.42),4.2,pink,28,18),"PinkEdge",t=(.847,.50,-.12))
    _child(scene,superellipsoid((.70,.060,.34),4.0,violet,30,14),"VioletBottom",t=(0,.025,-.15))
    _child(scene,superellipsoid((1.52,.98,.66),5.40,pearl,70,42),"Head",t=(0,.55,.075))

    for x,side in [(-.28,"L"),(.28,"R")]:
        _child(scene,capsule_y(.105,.43,pearl,32),f"Prong{side}",t=(x,1.165,.020))

    # Black glossy inverted-V eyes (^ ^), matching the approved visual.
    for x,side,material in [(-.29,"L",eye_left),(.29,"R",eye_right)]:
        root=f"Eye{side}Root"; _group(scene,root,t=(x,.53,0))
        z=.392
        _child(scene,tube_between((-.12,-.035,z),(0,.085,z),.040,material,18),f"Eye{side}_A",parent=root)
        _child(scene,tube_between((0,.085,z),(.12,-.035,z),.040,material,18),f"Eye{side}_B",parent=root)

    anims=[
      {"name":"Idle","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.9,1.8,2.7,3.6],"values":[[0,0,0],[0,.028,0],[0,.006,0],[0,-.016,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,1.2,2.4,3.6],"values":[quat((0,0,1),-.014),quat((0,0,1),.010),quat((0,0,1),-.020),quat((0,0,1),-.014)]}]},
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
      "design":"plugy-pink-lavender-plug-v75",
      "body":False,"material":"pink-lavender-clearcoat-iridescence-specular-ior","canonical":True
    }
