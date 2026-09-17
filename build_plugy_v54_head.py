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


def _arc(scene, cx, cy, z, width, height, radius, material, prefix):
    xs=np.linspace(-width/2,width/2,9)
    pts=[]
    for x in xs:
        # rounded inverted-U expression, softer than the old square robot eyes
        yy=cy + height*(1-(2*x/width)**2)
        pts.append((cx+x,yy,z))
    for i in range(len(pts)-1):
        mesh=tube_between(pts[i],pts[i+1],radius,material,14)
        # tube_between is already positioned in world coordinates, so parent with identity transform
        _child(scene, mesh, f'{prefix}_{i}')


def build_plugy_v54_head(output_path):
    """PLUGY V54 — official immersive head-only mascot. No body."""
    white=mat((250,247,250),'PLUGY V54 Pearl White',metallic=.035,rough=.19)
    blush=mat((246,222,242),'PLUGY V54 Rose Pearl',metallic=.04,rough=.24)
    navy=mat((18,17,48),'PLUGY V54 Deep Violet Navy',metallic=.20,rough=.24)
    violet=mat((119,69,255),'PLUGY V54 Violet Glow',emissive=(88,35,235),metallic=.04,rough=.15)
    pink=mat((255,87,190),'PLUGY V54 Pink Glow',emissive=(225,35,145),metallic=.03,rough=.14)
    cyan=mat((63,221,255),'PLUGY V54 Cyan Glow',emissive=(22,158,255),metallic=.03,rough=.13)
    eye=mat((6,8,25),'PLUGY V54 Eye Core',metallic=.22,rough=.10)
    metal=mat((232,218,227),'PLUGY V54 Rose Satin Metal',metallic=.78,rough=.20)

    scene=trimesh.Scene()
    scene.graph.update(frame_to='PlugyRoot',matrix=np.eye(4))

    # Softer robot silhouette: wider than tall, rounded like a friendly capsule rather than a square block.
    _child(scene,superellipsoid((1.98,1.34,.82),3.65,navy,46,28),'RearShell',(0,.72,-.22))
    _child(scene,superellipsoid((1.93,1.30,.75),3.65,violet,44,26),'VioletRim',(0,.72,-.13))
    _child(scene,superellipsoid((1.89,1.27,.70),3.65,pink,44,26),'PinkRim',(0,.72,-.07))
    _child(scene,superellipsoid((1.82,1.22,.66),3.55,white,46,28),'Head',(0,.72,.09))
    _child(scene,superellipsoid((1.69,1.08,.045),3.55,blush,36,20),'FaceSoftInset',(0,.69,.433))

    # Rounded prongs with a warm metallic finish.
    for x,side in [(-.36,'L'),(.36,'R')]:
        _child(scene,capsule_y(.112,.70,white,24),f'Prong{side}',(x,1.56,0))
        _child(scene,cyl(.109,.16,metal,24),f'ProngTip{side}',(x,1.875,0),r=(math.pi/2,0,0))

    # Corrected eyes: dark core + cyan inner glow + pink/violet outer accents, all parented to the head root.
    for cx,side in [(-.38,'L'),(.38,'R')]:
        _arc(scene,cx,.68,.473,.48,.175,.052,eye,f'Eye{side}Core')
        _arc(scene,cx,.68,.486,.39,.135,.030,cyan,f'Eye{side}Cyan')
        _arc(scene,cx-.025,.672,.493,.30,.102,.018,pink,f'Eye{side}Pink')

    # Side halos/status lights for the pink-violet identity.
    for x,side in [(-.925,'L'),(.925,'R')]:
        _child(scene,sph(.074,violet,2),f'SideHalo{side}',(x,.72,-.03))
        _child(scene,sph(.050,pink,2),f'SidePink{side}',(x,.72,-.025))
        _child(scene,sph(.029,cyan,2),f'SideCore{side}',(x,.72,-.018))

    # Subtle rear central light. Keeps the back as refined as the front.
    _child(scene,sph(.060,violet,2),'RearSignal',(0,.72,-.655))
    _child(scene,sph(.035,pink,2),'RearSignalInner',(0,.72,-.682))

    anims=[
        {'name':'Idle','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.8,1.6,2.4,3.2],'values':[[0,0,0],[0,.038,0],[0,0,0],[0,-.022,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,1.0,2.0,3.2],'values':[quat((0,0,1),0),quat((0,0,1),.022),quat((0,0,1),-.018),quat((0,0,1),0)]}
        ]},
        {'name':'Think','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.45,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.15),quat((0,1,0),.08),quat((0,0,1),0)]}
        ]},
        {'name':'Curious','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.40,.85,1.3],'values':[quat((0,0,1),0),quat((0,0,1),.17),quat((0,1,0),-.07),quat((0,0,1),0)]}
        ]},
        {'name':'Present','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.35,.75,1.15],'values':[quat((0,1,0),0),quat((0,1,0),.22),quat((0,1,0),-.12),quat((0,1,0),0)]}
        ]},
        {'name':'Bounce','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.18,.38,.60,.86],'values':[[0,0,0],[0,.11,0],[0,0,0],[0,.050,0],[0,0,0]]}
        ]},
        {'name':'Happy','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.18,.36,.68],'values':[[0,0,0],[0,.09,0],[0,.025,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,.34,.68],'values':[quat((0,0,1),0),quat((0,0,1),.055),quat((0,0,1),0)]}
        ]},
        {'name':'Attentive','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.36,.78],'values':[quat((1,0,0),0),quat((1,0,0),-.06),quat((1,0,0),0)]}
        ]},
        {'name':'Wave','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.22,.44,.66,.88,1.16],'values':[quat((0,0,1),0),quat((0,0,1),.10),quat((0,0,1),-.085),quat((0,0,1),.09),quat((0,0,1),-.055),quat((0,0,1),0)]}
        ]},
        {'name':'Point','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.38,.82,1.18],'values':[quat((0,1,0),0),quat((0,1,0),-.18),quat((0,1,0),-.18),quat((0,1,0),0)]}
        ]},
        {'name':'Dance','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.28,.56,.84,1.12,1.40],'values':[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),0)]}
        ]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    return {'path':str(p),'bytes':len(raw),'nodes':len(scene.geometry),'animations':[a['name'] for a in anims],'sha256':hashlib.sha256(raw).hexdigest(),'design':'plugy-head-immersive-pink-violet-v54','body':False}
