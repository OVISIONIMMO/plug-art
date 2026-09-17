from pathlib import Path
import math, hashlib
import numpy as np
import trimesh
from build_plugy_v43 import mat, sph, cyl, superellipsoid, capsule_y, tube_between, quat, _scene_to_glb_with_anims


def _child(scene, mesh, name, t=(0,0,0), r=None):
    M=np.eye(4)
    if r is not None:
        M=M@trimesh.transformations.euler_matrix(*r,'sxyz')
    M[:3,3]=np.asarray(t,dtype=float)
    scene.add_geometry(mesh, geom_name=name, node_name=name, transform=M, parent_node_name='PlugyRoot')


def _arc(scene,cx,cy,z,width,height,radius,material,prefix):
    xs=np.linspace(-width/2,width/2,11)
    pts=[]
    for x in xs:
        yy=cy+height*(1-(2*x/width)**2)
        pts.append((cx+x,yy,z))
    for i in range(len(pts)-1):
        _child(scene,tube_between(pts[i],pts[i+1],radius,material,16),f'{prefix}_{i}')


def build_plugy_v56_head(output_path):
    """Latest official PLUGY: rounded floating plug head, pearl white with cyan/pink/violet light."""
    pearl=mat((252,249,252),'PLUGY V56 Pearl White',metallic=.025,rough=.16)
    pearl2=mat((247,235,248),'PLUGY V56 Soft Rose Pearl',metallic=.03,rough=.20)
    lilac=mat((214,190,255),'PLUGY V56 Lilac Shell',emissive=(34,16,70),metallic=.08,rough=.21)
    violet=mat((113,65,255),'PLUGY V56 Violet Light',emissive=(95,34,245),metallic=.03,rough=.12)
    pink=mat((255,89,202),'PLUGY V56 Pink Light',emissive=(235,45,170),metallic=.03,rough=.11)
    cyan=mat((55,224,255),'PLUGY V56 Cyan Light',emissive=(28,185,255),metallic=.03,rough=.11)
    eye=mat((14,22,87),'PLUGY V56 Eye Indigo',emissive=(12,22,80),metallic=.16,rough=.09)
    metal=mat((238,227,238),'PLUGY V56 Pearl Metal',metallic=.74,rough=.18)

    scene=trimesh.Scene()
    scene.graph.update(frame_to='PlugyRoot',matrix=np.eye(4))

    # Uniform soft body, no dark robotic rear shell.
    _child(scene,superellipsoid((2.02,1.38,.86),3.15,lilac,52,30),'RearGlowShell',(0,.72,-.18))
    _child(scene,superellipsoid((1.98,1.35,.79),3.15,pink,50,28),'PinkEdgeShell',(0,.72,-.10))
    _child(scene,superellipsoid((1.94,1.32,.73),3.10,violet,50,28),'VioletEdgeShell',(0,.72,-.035))
    _child(scene,superellipsoid((1.89,1.27,.69),3.05,pearl,52,30),'Head',(0,.72,.075))
    _child(scene,superellipsoid((1.75,1.13,.040),3.10,pearl2,40,22),'FaceSoftInset',(0,.69,.431))

    # Soft, slightly taller plug prongs from the approved visual.
    for x,side in [(-.39,'L'),(.39,'R')]:
        _child(scene,capsule_y(.118,.78,pearl,26),f'Prong{side}',(x,1.61,0))
        _child(scene,cyl(.114,.17,metal,28),f'ProngTip{side}',(x,1.965,0),r=(math.pi/2,0,0))
        _child(scene,sph(.034,cyan if side=='L' else pink,2),f'ProngGlow{side}',(x,1.88,.10))

    # Clean happy eyes: one indigo arc with a subtle cyan/pink underglow.
    for cx,side in [(-.39,'L'),(.39,'R')]:
        _arc(scene,cx,.68,.468,.48,.176,.056,eye,f'Eye{side}Core')
        _arc(scene,cx,.67,.482,.40,.132,.024,cyan if side=='L' else violet,f'Eye{side}Glow')
        _child(scene,sph(.026,pink,2),f'Eye{side}Spark',(cx+(.13 if side=='L' else -.13),.735,.493))

    # Side and bottom light details from the latest visual.
    for x,side in [(-.96,'L'),(.96,'R')]:
        _child(scene,sph(.070,pink if side=='R' else cyan,2),f'SideGlow{side}',(x,.72,-.01))
        _child(scene,sph(.036,violet,2),f'SideCore{side}',(x,.72,.00))
    _child(scene,superellipsoid((1.20,.075,.14),3.0,cyan,28,10),'BottomCyanGlow',(0,.105,.12))
    _child(scene,superellipsoid((.90,.060,.12),3.0,pink,28,10),'BottomPinkGlow',(.23,.10,.115))

    anims=[
        {'name':'Idle','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.8,1.6,2.4,3.2],'values':[[0,0,0],[0,.045,0],[0,0,0],[0,-.024,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,1.1,2.2,3.2],'values':[quat((0,0,1),0),quat((0,0,1),.028),quat((0,0,1),-.022),quat((0,0,1),0)]}
        ]},
        {'name':'Think','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.45,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.15),quat((0,1,0),.09),quat((0,0,1),0)]}]},
        {'name':'Curious','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.38,.82,1.25],'values':[quat((0,0,1),0),quat((0,0,1),.18),quat((0,1,0),-.08),quat((0,0,1),0)]}]},
        {'name':'Present','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.34,.74,1.15],'values':[quat((0,1,0),0),quat((0,1,0),.24),quat((0,1,0),-.14),quat((0,1,0),0)]}]},
        {'name':'Bounce','channels':[{'node':'PlugyRoot','path':'translation','times':[0,.18,.38,.58,.84],'values':[[0,0,0],[0,.13,0],[0,0,0],[0,.06,0],[0,0,0]]}]},
        {'name':'Happy','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.18,.36,.68],'values':[[0,0,0],[0,.10,0],[0,.025,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,.34,.68],'values':[quat((0,0,1),0),quat((0,0,1),.065),quat((0,0,1),0)]}
        ]},
        {'name':'Attentive','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.36,.78],'values':[quat((1,0,0),0),quat((1,0,0),-.065),quat((1,0,0),0)]}]},
        {'name':'Wave','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.22,.44,.66,.88,1.16],'values':[quat((0,0,1),0),quat((0,0,1),.11),quat((0,0,1),-.09),quat((0,0,1),.10),quat((0,0,1),-.06),quat((0,0,1),0)]}]},
        {'name':'Dance','channels':[{'node':'PlugyRoot','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((0,0,1),0),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),0)]}]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    return {'path':str(p),'bytes':len(raw),'nodes':len(scene.geometry),'animations':[a['name'] for a in anims],'sha256':hashlib.sha256(raw).hexdigest(),'design':'plugy-latest-pearl-pink-violet-cyan-v56','body':False}
