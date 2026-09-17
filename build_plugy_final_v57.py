from pathlib import Path
import math, hashlib
import numpy as np
import trimesh
from build_plugy_v43 import mat, sph, cyl, superellipsoid, capsule_y, tube_between, quat, _scene_to_glb_with_anims


def _child(scene, mesh, name, parent="PlugyRoot", t=(0,0,0), r=None):
    M=np.eye(4)
    if r is not None:
        M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    M[:3,3]=np.asarray(t,dtype=float)
    scene.add_geometry(mesh,geom_name=name,node_name=name,transform=M,parent_node_name=parent)


def _group(scene,name,parent="PlugyRoot",t=(0,0,0)):
    M=np.eye(4);M[:3,3]=np.asarray(t,dtype=float)
    scene.graph.update(frame_to=name,frame_from=parent,matrix=M)


def _arc(scene,parent,width,height,z,radius,material,prefix,segments=10):
    xs=np.linspace(-width/2,width/2,segments)
    pts=[(x,height*(1-(2*x/width)**2),z) for x in xs]
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        _child(scene,tube_between(a,b,radius,material,14),f"{prefix}_{i}",parent=parent)


def build_plugy_final_v57(output_path):
    pearl=mat((250,250,253),"PLUGY Final Pearl White",metallic=.05,rough=.16)
    pearl_soft=mat((247,238,248),"PLUGY Final Soft Pearl",metallic=.04,rough=.22)
    navy=mat((14,17,58),"PLUGY Final Deep Indigo",metallic=.22,rough=.18)
    cyan=mat((66,223,255),"PLUGY Final Cyan Glow",emissive=(25,170,255),metallic=.03,rough=.12)
    violet=mat((125,73,255),"PLUGY Final Violet Glow",emissive=(85,35,235),metallic=.04,rough=.13)
    pink=mat((255,102,210),"PLUGY Final Pink Glow",emissive=(220,40,160),metallic=.03,rough=.12)
    eye_dark=mat((9,17,71),"PLUGY Final Eye Core",metallic=.20,rough=.10)
    metal=mat((236,229,240),"PLUGY Final Pearl Metal",metallic=.62,rough=.18)

    scene=trimesh.Scene()
    scene.graph.update(frame_to="PlugyRoot",matrix=np.eye(4))

    _child(scene,superellipsoid((2.02,1.38,.90),3.15,navy,44,28),"RearShell",t=(0,.72,-.23))
    _child(scene,superellipsoid((1.99,1.35,.84),3.12,violet,44,28),"VioletHalo",t=(0,.72,-.15))
    _child(scene,superellipsoid((1.96,1.32,.79),3.10,pink,44,28),"PinkHalo",t=(0,.72,-.09))
    _child(scene,superellipsoid((1.89,1.27,.72),3.00,pearl,44,28),"Head",t=(0,.72,.08))
    _child(scene,superellipsoid((1.73,1.11,.050),3.00,pearl_soft,38,22),"FaceInset",t=(0,.70,.447))
    _child(scene,superellipsoid((1.82,.18,.68),3.0,cyan,36,14),"CyanLowerAccent",t=(-.06,.145,-.01))
    _child(scene,superellipsoid((1.80,.16,.66),3.0,pink,36,14),"PinkLowerAccent",t=(.10,.12,-.04))

    for x,side in [(-.38,"L"),(.38,"R")]:
        _child(scene,capsule_y(.118,.78,pearl,28),f"Prong{side}",t=(x,1.61,0))
        _child(scene,cyl(.115,.16,metal,28),f"ProngTip{side}",t=(x,1.96,0),r=(math.pi/2,0,0))

    for x,side in [(-.39,"L"),(.39,"R")]:
        root=f"Eye{side}Root";_group(scene,root,t=(x,.68,0))
        _arc(scene,root,.50,.185,.486,.055,eye_dark,f"Eye{side}Core")
        _arc(scene,root,.41,.145,.500,.030,cyan,f"Eye{side}Cyan")
        _arc(scene,root,.31,.106,.508,.017,pink,f"Eye{side}Pink")
        _child(scene,sph(.028,violet,2),f"Eye{side}Spark",parent=root,t=(.11,.105,.515))

    for x,side in [(-.96,"L"),(.96,"R")]:
        _child(scene,sph(.072,violet,2),f"SideHalo{side}",t=(x,.72,-.06))
        _child(scene,sph(.048,pink,2),f"SidePink{side}",t=(x,.72,-.055))
        _child(scene,sph(.028,cyan,2),f"SideCore{side}",t=(x,.72,-.05))
    _child(scene,sph(.052,violet,2),"RearSignal",t=(0,.72,-.665))
    _child(scene,sph(.029,pink,2),"RearSignalInner",t=(0,.72,-.688))

    anims=[
      {"name":"Idle","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.8,1.6,2.4,3.2],"values":[[0,0,0],[0,.045,0],[0,0,0],[0,-.025,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,1.1,2.1,3.2],"values":[quat((0,0,1),0),quat((0,0,1),.024),quat((0,0,1),-.018),quat((0,0,1),0)]}]},
      {"name":"SoftTurn","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.65,1.3,1.95],"values":[quat((0,1,0),0),quat((0,1,0),.18),quat((0,1,0),-.15),quat((0,1,0),0)]}]},
      {"name":"Think","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.45,1.0,1.5],"values":[quat((0,0,1),0),quat((0,0,1),-.15),quat((0,1,0),.08),quat((0,0,1),0)]}]},
      {"name":"Curious","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.40,.85,1.30],"values":[quat((0,0,1),0),quat((0,0,1),.17),quat((0,1,0),-.07),quat((0,0,1),0)]}]},
      {"name":"Present","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.35,.75,1.15],"values":[quat((0,1,0),0),quat((0,1,0),.22),quat((0,1,0),-.12),quat((0,1,0),0)]}]},
      {"name":"Bounce","channels":[{"node":"PlugyRoot","path":"translation","times":[0,.18,.38,.60,.86],"values":[[0,0,0],[0,.12,0],[0,0,0],[0,.055,0],[0,0,0]]}]},
      {"name":"Happy","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.18,.36,.68],"values":[[0,0,0],[0,.095,0],[0,.025,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,.34,.68],"values":[quat((0,0,1),0),quat((0,0,1),.06),quat((0,0,1),0)]}]},
      {"name":"Attentive","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.36,.78],"values":[quat((1,0,0),0),quat((1,0,0),-.065),quat((1,0,0),0)]}]},
      {"name":"Wave","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.22,.44,.66,.88,1.16],"values":[quat((0,0,1),0),quat((0,0,1),.10),quat((0,0,1),-.085),quat((0,0,1),.09),quat((0,0,1),-.055),quat((0,0,1),0)]}]},
      {"name":"Dance","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.28,.56,.84,1.12,1.40],"values":[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),0)]}]},
      {"name":"Blink","channels":[
        {"node":"EyeLRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.14,1],[1,.05,1],[1,.14,1],[1,1,1]]},
        {"node":"EyeRRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.14,1],[1,.05,1],[1,.14,1],[1,1,1]]}]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    return {
      "path":str(p),"bytes":len(raw),"nodes":len(scene.geometry),
      "animations":[a["name"] for a in anims],
      "sha256":hashlib.sha256(raw).hexdigest(),
      "design":"plugy-final-pearl-cyan-pink-violet-v57","body":False
    }
