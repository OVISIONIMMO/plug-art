from pathlib import Path
import math, hashlib
import trimesh
from build_plugy_v43 import mat, box, sph, cyl, superellipsoid, capsule_y, add, tube_between, eye_arc, add_letter, quat, _scene_to_glb_with_anims


def build_plugy_v51(output_path):
    # V51 keeps the expressive rounded plug head from the approved visual,
    # then rebuilds the body as a cleaner premium assistant for web animation.
    ceramic = mat((248, 247, 244), 'PLUGY V51 Soft Ceramic', metallic=.03, rough=.22)
    ceramic_shadow = mat((220, 226, 236), 'PLUGY V51 Ceramic Shadow', metallic=.06, rough=.30)
    shell = mat((13, 17, 27), 'PLUGY V51 Deep Shell', metallic=.10, rough=.48)
    shell2 = mat((28, 34, 48), 'PLUGY V51 Soft Shell Detail', metallic=.13, rough=.38)
    fabric = mat((18, 22, 32), 'PLUGY V51 Technical Fabric', metallic=.02, rough=.78)
    fabric2 = mat((34, 41, 57), 'PLUGY V51 Fabric Panel', metallic=.02, rough=.68)
    cyan = mat((62, 213, 255), 'PLUGY V51 Cyan', emissive=(22, 125, 255), metallic=.04, rough=.17)
    blue = mat((48, 104, 255), 'PLUGY V51 Blue', emissive=(18, 58, 210), metallic=.06, rough=.19)
    violet = mat((126, 79, 255), 'PLUGY V51 Violet', emissive=(62, 28, 180), metallic=.04, rough=.20)
    metal = mat((207, 216, 228), 'PLUGY V51 Brushed Metal', metallic=.78, rough=.24)
    sole = mat((229, 233, 241), 'PLUGY V51 Sole', metallic=.03, rough=.44)

    scene = trimesh.Scene()

    # HEAD — identity is intentionally close to the approved reference:
    # soft rounded square, two prongs, dark rear edge, luminous smiling arc eyes.
    add(scene, superellipsoid((1.56, 1.16, 1.00), 4.9, ceramic, 40, 24), 'Head', (0, 1.83, 0))
    add(scene, superellipsoid((1.40, 1.02, .18), 4.5, shell, 30, 16), 'HeadRearShell', (0, 1.83, -.49))
    add(scene, superellipsoid((1.30, .95, .055), 4.7, ceramic_shadow, 30, 16), 'FaceInset', (0, 1.82, .495))
    for x, side in [(-.36, 'L'), (.36, 'R')]:
        add(scene, capsule_y(.115, .76, ceramic, 22), f'Prong{side}', (x, 2.69, 0))
        add(scene, cyl(.112, .12, metal, 22), f'ProngTip{side}', (x, 3.03, 0), r=(math.pi/2, 0, 0))
    eye_arc(-.36, 1.77, .535, .42, .16, blue, 'EyeL', scene)
    eye_arc(.36, 1.77, .535, .42, .16, blue, 'EyeR', scene)
    add(scene, sph(.055, cyan, 2), 'SideLightR', (.78, 1.82, -.12))
    add(scene, superellipsoid((.56, .18, .50), 3.6, shell2, 22, 12), 'Neck', (0, 1.20, -.01))

    # BODY — compact, premium, character-like rather than a rigid robot.
    add(scene, superellipsoid((1.16, 1.18, .78), 3.8, fabric, 34, 22), 'Torso', (0, .55, 0))
    add(scene, superellipsoid((.96, .24, .68), 3.8, shell2, 26, 14), 'Collar', (0, 1.04, -.03))
    add(scene, tube_between((-.42, .98, .38), (-.22, .72, .43), .055, cyan, 12), 'HarnessL')
    add(scene, tube_between((.42, .98, .38), (.22, .72, .43), .055, cyan, 12), 'HarnessR')
    add(scene, superellipsoid((.72, .24, .06), 3.8, fabric2, 24, 12), 'ChestPanel', (0, .62, .410))
    for ch, x in zip('PLUG', [-.29, -.10, .10, .31]):
        add_letter(scene, ch, x, .66, .445, .70, ceramic, f'Chest_{ch}')
    add(scene, superellipsoid((.76, .22, .60), 3.7, fabric2, 24, 14), 'Waist', (0, -.04, 0))

    # Slim backpack / side modules: gives depth like the reference without clutter.
    add(scene, superellipsoid((.78, .72, .18), 4.0, shell2, 24, 14), 'BackModule', (0, .61, -.42))
    add(scene, capsule_y(.060, .48, cyan, 14), 'BackGlowL', (-.22, .60, -.52))
    add(scene, capsule_y(.060, .48, blue, 14), 'BackGlowR', (.22, .60, -.52))

    # ARMS — soft technical sleeves, articulated but visually continuous.
    for x, side, sgn in [(-.69, 'L', 1), (.69, 'R', -1)]:
        add(scene, sph(.16, shell2, 2), f'Shoulder{side}', (x, .86, 0))
        add(scene, capsule_y(.155, .70, fabric, 20), f'UpperArm{side}', (x, .54, 0), r=(0, 0, .11*sgn))
        add(scene, superellipsoid((.34, .20, .32), 3.4, shell2, 18, 12), f'Cuff{side}', (x, .18, .02))
        add(scene, capsule_y(.135, .55, fabric, 18), f'ForeArm{side}', (x, -.04, .04), r=(0, 0, -.08*sgn))
        add(scene, superellipsoid((.33, .29, .31), 3.8, ceramic, 20, 14), f'Hand{side}', (x, -.35, .09))
        add(scene, capsule_y(.045, .20, ceramic, 12), f'Thumb{side}', (x + (-.11 if side=='L' else .11), -.32, .17), r=(0,0,-.62 if side=='L' else .62))
        add(scene, box((.07, .16, .045), cyan if side=='L' else blue), f'WristLight{side}', (x, .12, .17))

    # LEGS — stylised fabric + premium sneakers, closer to the approved mascot language.
    for x, side in [(-.27, 'L'), (.27, 'R')]:
        add(scene, capsule_y(.185, .86, fabric, 20), f'Leg{side}', (x, -.67, 0))
        add(scene, superellipsoid((.36, .28, .21), 3.6, fabric2, 18, 12), f'KneePanel{side}', (x, -.82, .24))
        add(scene, superellipsoid((.55, .34, .84), 4.0, shell, 26, 16), f'Foot{side}', (x, -1.25, .16))
        add(scene, superellipsoid((.58, .13, .88), 4.0, sole, 24, 12), f'Sole{side}', (x, -1.405, .16))
        add(scene, superellipsoid((.46, .16, .42), 3.8, ceramic_shadow, 22, 12), f'ToeCap{side}', (x, -1.18, .42))
        add(scene, box((.09, .22, .05), cyan if side=='L' else blue), f'ShoeLight{side}', (x + (-.15 if side=='L' else .15), -1.20, .53), r=(0,0,.30 if side=='L' else -.30))

    # Runtime-compatible animation names. Idle is slightly richer for a more alive presence.
    anims = [
        {'name':'Idle','channels':[
            {'node':'Head','path':'translation','times':[0,.7,1.4,2.1,2.8],'values':[[0,1.83,0],[0,1.875,0],[0,1.83,0],[0,1.795,0],[0,1.83,0]]},
            {'node':'Head','path':'rotation','times':[0,1.4,2.8],'values':[quat((0,0,1),0),quat((0,0,1),.025),quat((0,0,1),0)]},
            {'node':'Torso','path':'translation','times':[0,1.4,2.8],'values':[[0,.55,0],[0,.565,0],[0,.55,0]]}
        ]},
        {'name':'Wave','channels':[
            {'node':'UpperArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((0,0,1),-.11),quat((0,0,1),-1.14),quat((0,0,1),-.68),quat((0,0,1),-1.10),quat((0,0,1),-.64),quat((0,0,1),-.11)]},
            {'node':'ForeArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((1,0,0),0),quat((1,0,0),-.84),quat((1,0,0),-.30),quat((1,0,0),-.80),quat((1,0,0),-.28),quat((1,0,0),0)]},
            {'node':'Head','path':'rotation','times':[0,.7,1.4],'values':[quat((0,0,1),0),quat((0,0,1),.10),quat((0,0,1),0)]}
        ]},
        {'name':'Point','channels':[
            {'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),.11),quat((0,0,1),1.02),quat((0,0,1),1.02),quat((0,0,1),.11)]},
            {'node':'ForeArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),0),quat((0,0,1),-.44),quat((0,0,1),-.44),quat((0,0,1),0)]}
        ]},
        {'name':'Think','channels':[
            {'node':'Head','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.16),quat((1,0,0),.08),quat((0,0,1),0)]},
            {'node':'UpperArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),-.11),quat((0,0,1),-.80),quat((0,0,1),-.80),quat((0,0,1),-.11)]},
            {'node':'ForeArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((1,0,0),0),quat((1,0,0),-.92),quat((1,0,0),-.92),quat((1,0,0),0)]}
        ]},
        {'name':'Present','channels':[
            {'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),.11),quat((0,0,1),.80),quat((0,0,1),.80),quat((0,0,1),.11)]},
            {'node':'UpperArmR','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),-.11),quat((0,0,1),-.80),quat((0,0,1),-.80),quat((0,0,1),-.11)]}
        ]},
        {'name':'Curious','channels':[
            {'node':'Head','path':'rotation','times':[0,.45,.9,1.35],'values':[quat((0,0,1),0),quat((0,0,1),.20),quat((0,0,1),.20),quat((0,0,1),0)]}
        ]},
        {'name':'Dance','channels':[
            {'node':'Torso','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),0)]},
            {'node':'Head','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.14),quat((0,0,1),.14),quat((0,0,1),-.14),quat((0,0,1),.14),quat((0,0,1),0)]}
        ]},
        {'name':'Bounce','channels':[
            {'node':'Head','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,1.83,0],[0,1.94,0],[0,1.83,0],[0,1.89,0],[0,1.83,0]]},
            {'node':'Torso','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,.55,0],[0,.61,0],[0,.55,0],[0,.59,0],[0,.55,0]]}
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
        'design': 'approved-expressive-plug-head-premium-assistant-v51'
    }
