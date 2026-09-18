from pathlib import Path
import math, hashlib
import numpy as np
import trimesh
from build_plugy_v43 import mat, superellipsoid, capsule_y, tube_between, quat, _scene_to_glb_with_anims

def _child(scene, mesh, name, parent="PlugyRoot", t=(0,0,0), r=None):
    M=np.eye(4)
    if r is not None: M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    M[:3,3]=np.asarray(t,dtype=float)
    scene.add_geometry(mesh,geom_name=name,node_name=name,transform=M,parent_node_name=parent)

def _group(scene,name,parent="PlugyRoot",t=(0,0,0)):
    M=np.eye(4); M[:3,3]=np.asarray(t,dtype=float)
    scene.graph.update(frame_to=name,frame_from=parent,matrix=M)

def _arc(scene,parent,width,height,z,radius,material,prefix,segments=12):
    xs=np.linspace(-width/2,width/2,segments)
    pts=[(x,height*(1-(2*x/width)**2),z) for x in xs]
    for i,(a,b) in enumerate(zip(pts,pts[1:])):
        _child(scene,tube_between(a,b,radius,material,16),f"{prefix}_{i}",parent=parent)

def build_plugy_final_v57(output_path):
    # Référence canonique fournie: prise blanche nacrée, deux yeux bleu nuit fermés,
    # halo cyan en bas/gauche et rose-violet en bas/droite. Aucun corps, bouche,
    # panneau facial, sphère latérale ou détail parasite.
    pearl=mat((252,253,255),"PLUGY Reference Pearl White",metallic=.025,rough=.135)
    pearl_shadow=mat((241,244,255),"PLUGY Reference Soft White",metallic=.02,rough=.18)
    eye=mat((10,31,111),"PLUGY Reference Deep Blue Eyes",emissive=(5,20,92),metallic=.16,rough=.10)
    cyan=mat((69,224,255),"PLUGY Reference Cyan Rim",emissive=(22,154,245),metallic=.02,rough=.13)
    pink=mat((224,91,255),"PLUGY Reference Pink Violet Rim",emissive=(180,43,224),metallic=.02,rough=.13)

    scene=trimesh.Scene()
    scene.graph.update(frame_to="PlugyRoot",matrix=np.eye(4))

    # Tête volontairement simple et légèrement plus carrée, comme la référence.
    _child(scene,superellipsoid((1.90,1.30,.72),3.15,pearl,52,32),"Head",t=(0,.70,.06))
    # Très fines lèvres lumineuses, seulement sur le bas: elles donnent le volume
    # sans transformer PLUGY en objet néon surchargé.
    _child(scene,superellipsoid((1.78,.105,.655),3.0,cyan,38,14),"CyanLowerRim",t=(-.28,.105,-.015))
    _child(scene,superellipsoid((1.70,.095,.645),3.0,pink,38,14),"PinkLowerRim",t=(.34,.085,-.025))

    # Deux broches blanches, arrondies et propres.
    for x,side in [(-.43,"L"),(.43,"R")]:
        _child(scene,capsule_y(.125,.82,pearl_shadow,30),f"Prong{side}",t=(x,1.62,0))

    # Deux arcs uniques bleu nuit. Pas de deuxième œil coloré superposé.
    for x,side in [(-.40,"L"),(.40,"R")]:
        root=f"Eye{side}Root"; _group(scene,root,t=(x,.68,0))
        _arc(scene,root,.50,.185,.487,.058,eye,f"Eye{side}")

    anims=[
      {"name":"Idle","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.9,1.8,2.7,3.6],"values":[[0,0,0],[0,.035,0],[0,.006,0],[0,-.018,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,1.2,2.4,3.6],"values":[quat((0,0,1),-.035),quat((0,0,1),.012),quat((0,0,1),-.055),quat((0,0,1),-.035)]}]},
      {"name":"SoftTurn","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.7,1.4,2.1],"values":[quat((0,1,0),0),quat((0,1,0),.14),quat((0,1,0),-.11),quat((0,1,0),0)]}]},
      {"name":"Think","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.45,1.0,1.5],"values":[quat((0,0,1),-.035),quat((0,0,1),-.14),quat((0,1,0),.07),quat((0,0,1),-.035)]}]},
      {"name":"Curious","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.42,.86,1.30],"values":[quat((0,0,1),-.035),quat((0,0,1),.13),quat((0,1,0),-.06),quat((0,0,1),-.035)]}]},
      {"name":"Present","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.36,.76,1.18],"values":[quat((0,1,0),0),quat((0,1,0),.17),quat((0,1,0),-.09),quat((0,1,0),0)]}]},
      {"name":"Bounce","channels":[{"node":"PlugyRoot","path":"translation","times":[0,.18,.38,.60,.86],"values":[[0,0,0],[0,.10,0],[0,0,0],[0,.045,0],[0,0,0]]}]},
      {"name":"Happy","channels":[
        {"node":"PlugyRoot","path":"translation","times":[0,.18,.36,.68],"values":[[0,0,0],[0,.075,0],[0,.018,0],[0,0,0]]},
        {"node":"PlugyRoot","path":"rotation","times":[0,.34,.68],"values":[quat((0,0,1),-.035),quat((0,0,1),.045),quat((0,0,1),-.035)]}]},
      {"name":"Attentive","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.36,.78],"values":[quat((1,0,0),0),quat((1,0,0),-.055),quat((1,0,0),0)]}]},
      {"name":"Wave","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.22,.44,.66,.88,1.16],"values":[quat((0,0,1),-.035),quat((0,0,1),.075),quat((0,0,1),-.085),quat((0,0,1),.065),quat((0,0,1),-.055),quat((0,0,1),-.035)]}]},
      {"name":"Dance","channels":[{"node":"PlugyRoot","path":"rotation","times":[0,.28,.56,.84,1.12,1.40],"values":[quat((0,0,1),-.035),quat((0,0,1),.09),quat((0,0,1),-.10),quat((0,0,1),.09),quat((0,0,1),-.09),quat((0,0,1),-.035)]}]},
      {"name":"Blink","channels":[
        {"node":"EyeLRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.14,1],[1,.04,1],[1,.14,1],[1,1,1]]},
        {"node":"EyeRRoot","path":"scale","times":[0,.10,.18,.28,.36],"values":[[1,1,1],[1,.14,1],[1,.04,1],[1,.14,1],[1,1,1]]}]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
    return {
      "path":str(p),"bytes":len(raw),"nodes":len(scene.geometry),
      "animations":[a["name"] for a in anims],
      "sha256":hashlib.sha256(raw).hexdigest(),
      "design":"plugy-reference-pearl-cyan-pink-simple-v59","body":False
    }
