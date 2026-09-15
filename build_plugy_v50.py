from pathlib import Path
import math, hashlib
import numpy as np
import trimesh
from build_plugy_v43 import mat, box, sph, cyl, superellipsoid, capsule_y, add, tube_between, quat, _scene_to_glb_with_anims


def build_plugy_v50(output_path):
    # Premium simple materials: easy to read, easy to animate, light for web.
    ceramic = mat((248, 249, 252), 'PLUGY V2 Ceramic', metallic=.04, rough=.20)
    ceramic_edge = mat((214, 222, 235), 'PLUGY V2 Ceramic Edge', metallic=.08, rough=.30)
    black = mat((11, 14, 22), 'PLUGY V2 Matte Shell', metallic=.12, rough=.48)
    black2 = mat((28, 34, 47), 'PLUGY V2 Joint Shell', metallic=.18, rough=.38)
    glass = mat((8, 17, 31), 'PLUGY V2 Face Glass', metallic=.25, rough=.12)
    cyan = mat((70, 222, 255), 'PLUGY V2 Cyan', emissive=(20, 145, 255), metallic=.04, rough=.16)
    violet = mat((126, 84, 255), 'PLUGY V2 Violet', emissive=(70, 30, 190), metallic=.04, rough=.18)
    magenta = mat((242, 76, 190), 'PLUGY V2 Magenta', emissive=(130, 18, 95), metallic=.03, rough=.20)
    metal = mat((198, 210, 226), 'PLUGY V2 Metal', metallic=.82, rough=.20)

    scene = trimesh.Scene()

    # HEAD — compact plug identity, less oversized than V43.
    add(scene, superellipsoid((1.34, 1.02, .94), 4.8, ceramic, 36, 22), 'Head', (0, 1.86, 0))
    add(scene, superellipsoid((1.08, .60, .075), 4.8, glass, 28, 14), 'FaceGlass', (0, 1.82, .475))
    add(scene, superellipsoid((.33, .095, .055), 4.0, cyan, 18, 10), 'EyeL', (-.28, 1.84, .520))
    add(scene, superellipsoid((.33, .095, .055), 4.0, cyan, 18, 10), 'EyeR', (.28, 1.84, .520))
    for x, side in [(-.31, 'L'), (.31, 'R')]:
        add(scene, capsule_y(.105, .66, ceramic, 18), f'Prong{side}', (x, 2.66, 0))
        add(scene, cyl(.102, .115, metal, 18), f'ProngTip{side}', (x, 2.965, 0), r=(math.pi/2, 0, 0))
    add(scene, superellipsoid((.58, .16, .48), 3.8, black2, 20, 12), 'Neck', (0, 1.27, -.01))

    # BODY — one-piece premium shell, no hoodie/cargo complexity.
    add(scene, superellipsoid((1.06, 1.22, .72), 3.8, black, 34, 22), 'Torso', (0, .58, 0))
    add(scene, superellipsoid((.72, .48, .05), 4.0, black2, 24, 12), 'ChestPanel', (0, .68, .372))
    add(scene, sph(.17, cyan, 2), 'CoreOuter', (0, .67, .405))
    add(scene, sph(.095, violet, 2), 'CoreInner', (0, .67, .452))
    add(scene, tube_between((-.34, .36, .39), (-.14, .18, .41), .035, magenta, 10), 'EnergySlashL')
    add(scene, tube_between((.34, .36, .39), (.14, .18, .41), .035, violet, 10), 'EnergySlashR')
    add(scene, superellipsoid((.76, .28, .64), 3.6, black2, 24, 14), 'Hip', (0, -.06, 0))

    # ARMS — separate simple segments for reliable animation.
    for x, side, sgn in [(-.62, 'L', 1), (.62, 'R', -1)]:
        add(scene, sph(.16, black2, 2), f'Shoulder{side}', (x, .86, 0))
        add(scene, capsule_y(.135, .66, black, 18), f'UpperArm{side}', (x, .55, 0), r=(0, 0, .10*sgn))
        add(scene, sph(.115, ceramic_edge, 2), f'Elbow{side}', (x, .22, .02))
        add(scene, capsule_y(.12, .56, black, 18), f'ForeArm{side}', (x, -.04, .03), r=(0, 0, -.08*sgn))
        add(scene, superellipsoid((.31, .27, .30), 3.6, ceramic, 18, 12), f'Hand{side}', (x, -.35, .08))
        add(scene, capsule_y(.042, .20, ceramic, 12), f'Thumb{side}', (x + (-.10 if side=='L' else .10), -.33, .15), r=(0, 0, -.60 if side=='L' else .60))

    # LEGS — compact, grounded, robotic.
    for x, side in [(-.24, 'L'), (.24, 'R')]:
        add(scene, sph(.14, black2, 2), f'HipJoint{side}', (x, -.28, 0))
        add(scene, capsule_y(.16, .75, black, 18), f'Leg{side}', (x, -.67, 0))
        add(scene, sph(.12, ceramic_edge, 2), f'Knee{side}', (x, -1.03, .04))
        add(scene, superellipsoid((.43, .28, .64), 3.9, black, 22, 14), f'Foot{side}', (x, -1.26, .15))
        add(scene, superellipsoid((.45, .11, .67), 4.0, ceramic_edge, 20, 10), f'Sole{side}', (x, -1.395, .16))
        add(scene, box((.08, .18, .05), cyan if side=='L' else violet), f'FootLight{side}', (x, -1.23, .47))

    # Back energy detail: visual life without extra silhouette complexity.
    add(scene, superellipsoid((.54, .70, .10), 4.0, black2, 22, 14), 'BackPlate', (0, .57, -.39))
    add(scene, capsule_y(.055, .42, cyan, 14), 'BackLightL', (-.16, .58, -.46))
    add(scene, capsule_y(.055, .42, violet, 14), 'BackLightR', (.16, .58, -.46))

    # Keep the same animation names as the current runtime so integration is immediate.
    anims = [
        {'name':'Idle','channels':[
            {'node':'Head','path':'translation','times':[0,.7,1.4,2.1,2.8],'values':[[0,1.86,0],[0,1.90,0],[0,1.86,0],[0,1.83,0],[0,1.86,0]]},
            {'node':'Torso','path':'rotation','times':[0,1.4,2.8],'values':[quat((0,0,1),0),quat((0,0,1),.016),quat((0,0,1),0)]}
        ]},
        {'name':'Wave','channels':[
            {'node':'UpperArmR','path':'rotation','times':[0,.25,.5,.75,1.0,1.25],'values':[quat((0,0,1),-.10),quat((0,0,1),-1.10),quat((0,0,1),-.64),quat((0,0,1),-1.05),quat((0,0,1),-.60),quat((0,0,1),-.10)]},
            {'node':'ForeArmR','path':'rotation','times':[0,.25,.5,.75,1.0,1.25],'values':[quat((1,0,0),0),quat((1,0,0),-.82),quat((1,0,0),-.28),quat((1,0,0),-.78),quat((1,0,0),-.24),quat((1,0,0),0)]},
            {'node':'Head','path':'rotation','times':[0,.62,1.25],'values':[quat((0,0,1),0),quat((0,0,1),.08),quat((0,0,1),0)]}
        ]},
        {'name':'Point','channels':[
            {'node':'UpperArmL','path':'rotation','times':[0,.42,.86,1.2],'values':[quat((0,0,1),.10),quat((0,0,1),.96),quat((0,0,1),.96),quat((0,0,1),.10)]},
            {'node':'ForeArmL','path':'rotation','times':[0,.42,.86,1.2],'values':[quat((0,0,1),0),quat((0,0,1),-.40),quat((0,0,1),-.40),quat((0,0,1),0)]}
        ]},
        {'name':'Think','channels':[
            {'node':'Head','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.14),quat((1,0,0),.07),quat((0,0,1),0)]},
            {'node':'UpperArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),-.10),quat((0,0,1),-.76),quat((0,0,1),-.76),quat((0,0,1),-.10)]},
            {'node':'ForeArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((1,0,0),0),quat((1,0,0),-.90),quat((1,0,0),-.90),quat((1,0,0),0)]}
        ]},
        {'name':'Present','channels':[
            {'node':'UpperArmL','path':'rotation','times':[0,.4,.85,1.25],'values':[quat((0,0,1),.10),quat((0,0,1),.74),quat((0,0,1),.74),quat((0,0,1),.10)]},
            {'node':'UpperArmR','path':'rotation','times':[0,.4,.85,1.25],'values':[quat((0,0,1),-.10),quat((0,0,1),-.74),quat((0,0,1),-.74),quat((0,0,1),-.10)]}
        ]},
        {'name':'Curious','channels':[
            {'node':'Head','path':'rotation','times':[0,.45,.9,1.35],'values':[quat((0,0,1),0),quat((0,0,1),.18),quat((0,0,1),.18),quat((0,0,1),0)]}
        ]},
        {'name':'Dance','channels':[
            {'node':'Torso','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),.11),quat((0,0,1),-.11),quat((0,0,1),.11),quat((0,0,1),-.11),quat((0,0,1),0)]},
            {'node':'Head','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.13),quat((0,0,1),.13),quat((0,0,1),-.13),quat((0,0,1),.13),quat((0,0,1),0)]}
        ]},
        {'name':'Bounce','channels':[
            {'node':'Head','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,1.86,0],[0,1.96,0],[0,1.86,0],[0,1.92,0],[0,1.86,0]]},
            {'node':'Torso','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,.58,0],[0,.64,0],[0,.58,0],[0,.62,0],[0,.58,0]]}
        ]}
    ]

    raw = _scene_to_glb_with_anims(scene, anims)
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(raw)
    return {
        'path': str(p),
        'bytes': len(raw),
        'nodes': len(scene.geometry),
        'animations': [a['name'] for a in anims],
        'sha256': hashlib.sha256(raw).hexdigest(),
        'design': 'plug-head-premium-robot-v2'
    }
