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


def _child_eye_arc(scene, cx, cy, z, width, height, material, prefix, radius=.038):
    xs=np.linspace(-width/2,width/2,7)
    pts=[]
    for x in xs:
        yy=cy + height*(1-(2*x/width)**2)
        pts.append((cx+x,yy,z))
    for i in range(len(pts)-1):
        _child(scene,tube_between(pts[i],pts[i+1],radius,material,12),f'{prefix}_{i}')


def build_plugy_v53_head(output_path):
    """Official PLUGY head-only mascot. No body, arms or legs."""
    white = mat((248,248,247), 'PLUGY V53 Matte White', metallic=.025, rough=.22)
    white_soft = mat((225,230,238), 'PLUGY V53 Soft Edge', metallic=.035, rough=.30)
    navy = mat((9,17,35), 'PLUGY V53 Deep Blue Black', metallic=.16, rough=.30)
    cyan = mat((43,220,255), 'PLUGY V53 Active Cyan', emissive=(20,150,255), metallic=.03, rough=.14)
    blue = mat((42,91,255), 'PLUGY V53 Electric Blue', emissive=(12,55,220), metallic=.05, rough=.16)
    eye_dark = mat((5,10,22), 'PLUGY V53 Eye Core', metallic=.18, rough=.12)
    metal = mat((210,216,226), 'PLUGY V53 Satin Metal', metallic=.78, rough=.22)

    scene=trimesh.Scene()
    scene.graph.update(frame_to='PlugyRoot', matrix=np.eye(4))

    # Layered shell: dark rear, luminous rim, matte white front.
    _child(scene, superellipsoid((1.94,1.42,.86),4.9,navy,42,26), 'RearShell', (0,.72,-.24))
    _child(scene, superellipsoid((1.88,1.37,.78),4.9,blue,40,24), 'BlueRim', (0,.72,-.12))
    _child(scene, superellipsoid((1.78,1.30,.68),5.0,white,42,26), 'Head', (0,.72,.10))
    _child(scene, superellipsoid((1.64,1.16,.055),5.0,white_soft,34,18), 'FaceInset', (0,.70,.452))

    # Two recognizable plug prongs, satin metal tips.
    for x,side in [(-.36,'L'),(.36,'R')]:
        _child(scene, capsule_y(.115,.72,white,22), f'Prong{side}', (x,1.60,0))
        _child(scene, cyl(.112,.15,metal,24), f'ProngTip{side}', (x,1.925,0), r=(math.pi/2,0,0))

    # Friendly arc eyes: dark core with cyan inner glow.
    _child_eye_arc(scene,-.38,.69,.495,.46,.17,eye_dark,'EyeLCore',.045)
    _child_eye_arc(scene,.38,.69,.495,.46,.17,eye_dark,'EyeRCore',.045)
    _child_eye_arc(scene,-.38,.69,.510,.34,.11,cyan,'EyeLGlow',.026)
    _child_eye_arc(scene,.38,.69,.510,.34,.11,cyan,'EyeRGlow',.026)

    # Side status lights, intentionally minimal.
    _child(scene, sph(.062,cyan,2), 'SideLightL', (-.91,.72,-.05))
    _child(scene, sph(.062,cyan,2), 'SideLightR', (.91,.72,-.05))
    _child(scene, sph(.028,blue,2), 'SideLightCoreL', (-.945,.72,-.05))
    _child(scene, sph(.028,blue,2), 'SideLightCoreR', (.945,.72,-.05))

    # Root-only animations keep every component perfectly together.
    anims=[
        {'name':'Idle','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.8,1.6,2.4,3.2],'values':[[0,0,0],[0,.045,0],[0,0,0],[0,-.025,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,1.6,3.2],'values':[quat((0,0,1),0),quat((0,0,1),.025),quat((0,0,1),0)]}
        ]},
        {'name':'Wave','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.22,.44,.66,.88,1.10,1.32],'values':[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.10),quat((0,0,1),.11),quat((0,0,1),-.08),quat((0,0,1),.05),quat((0,0,1),0)]}
        ]},
        {'name':'Point','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.4,.85,1.2],'values':[quat((0,1,0),0),quat((0,1,0),-.18),quat((0,1,0),-.18),quat((0,1,0),0)]}
        ]},
        {'name':'Think','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.45,.95,1.45],'values':[quat((0,0,1),0),quat((0,0,1),-.13),quat((0,0,1),-.13),quat((0,0,1),0)]},
            {'node':'PlugyRoot','path':'translation','times':[0,.45,.95,1.45],'values':[[0,0,0],[0,.025,0],[0,.025,0],[0,0,0]]}
        ]},
        {'name':'Present','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.4,.85,1.25],'values':[quat((0,1,0),0),quat((0,1,0),.20),quat((0,1,0),-.12),quat((0,1,0),0)]}
        ]},
        {'name':'Curious','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.38,.90,1.30],'values':[quat((0,0,1),0),quat((0,0,1),.16),quat((0,0,1),.16),quat((0,0,1),0)]}
        ]},
        {'name':'Dance','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.28,.56,.84,1.12,1.40],'values':[quat((0,0,1),0),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),0)]},
            {'node':'PlugyRoot','path':'translation','times':[0,.28,.56,.84,1.12,1.40],'values':[[0,0,0],[0,.05,0],[0,0,0],[0,.05,0],[0,0,0],[0,0,0]]}
        ]},
        {'name':'Bounce','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.20,.42,.64,.90],'values':[[0,0,0],[0,.13,0],[0,0,0],[0,.065,0],[0,0,0]]}
        ]},
        {'name':'Happy','channels':[
            {'node':'PlugyRoot','path':'translation','times':[0,.20,.40,.72],'values':[[0,0,0],[0,.10,0],[0,.025,0],[0,0,0]]},
            {'node':'PlugyRoot','path':'rotation','times':[0,.36,.72],'values':[quat((0,0,1),0),quat((0,0,1),.055),quat((0,0,1),0)]}
        ]},
        {'name':'Attentive','channels':[
            {'node':'PlugyRoot','path':'rotation','times':[0,.45,.9],'values':[quat((1,0,0),0),quat((1,0,0),-.055),quat((1,0,0),0)]}
        ]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path); p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
    return {
        'path':str(p),
        'bytes':len(raw),
        'nodes':len(scene.geometry),
        'animations':[a['name'] for a in anims],
        'sha256':hashlib.sha256(raw).hexdigest(),
        'design':'plugy-official-head-only-v53',
        'body':False
    }
