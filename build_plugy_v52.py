from pathlib import Path
import math, hashlib
import trimesh
from build_plugy_v43 import mat, box, sph, cyl, superellipsoid, capsule_y, add, tube_between, eye_arc, add_letter, quat, _scene_to_glb_with_anims


def build_plugy_v52(output_path):
    # V52 keeps the approved expressive plug head and removes the rigid robot language.
    ceramic = mat((249,248,246),'PLUGY V52 Soft Ceramic',metallic=.02,rough=.20)
    ceramic_shadow = mat((222,228,238),'PLUGY V52 Ceramic Shadow',metallic=.04,rough=.30)
    dark = mat((11,15,24),'PLUGY V52 Deep Black',metallic=.03,rough=.66)
    fabric = mat((17,21,31),'PLUGY V52 Hoodie Fabric',metallic=.01,rough=.84)
    fabric2 = mat((31,38,52),'PLUGY V52 Fabric Detail',metallic=.02,rough=.72)
    cyan = mat((61,217,255),'PLUGY V52 Cyan',emissive=(20,126,255),metallic=.03,rough=.16)
    blue = mat((49,105,255),'PLUGY V52 Blue',emissive=(18,58,215),metallic=.04,rough=.18)
    violet = mat((126,79,255),'PLUGY V52 Violet',emissive=(60,26,170),metallic=.03,rough=.20)
    metal = mat((211,220,232),'PLUGY V52 Brushed Metal',metallic=.78,rough=.23)
    sole = mat((236,238,243),'PLUGY V52 Sneaker Sole',metallic=.01,rough=.46)

    scene = trimesh.Scene()

    # APPROVED HEAD: rounded plug, dark rear edge, two prongs, smiling luminous arc eyes.
    add(scene, superellipsoid((1.58,1.18,1.02),4.9,ceramic,40,24),'Head',(0,1.86,0))
    add(scene, superellipsoid((1.42,1.04,.18),4.5,dark,30,16),'HeadRearShell',(0,1.86,-.50))
    add(scene, superellipsoid((1.32,.97,.055),4.7,ceramic_shadow,30,16),'FaceInset',(0,1.85,.505))
    for x,side in [(-.36,'L'),(.36,'R')]:
        add(scene,capsule_y(.116,.77,ceramic,22),f'Prong{side}',(x,2.73,0))
        add(scene,cyl(.113,.12,metal,22),f'ProngTip{side}',(x,3.075,0),r=(math.pi/2,0,0))
    eye_arc(-.36,1.80,.547,.42,.16,blue,'EyeL',scene)
    eye_arc(.36,1.80,.547,.42,.16,blue,'EyeR',scene)
    add(scene,sph(.052,cyan,2),'SideLightR',(.79,1.84,-.12))

    # Soft neck + hoodie body. No exposed robot joints.
    add(scene,superellipsoid((.56,.20,.48),3.5,fabric2,22,12),'Neck',(0,1.22,-.02))
    add(scene,superellipsoid((1.16,1.14,.76),3.7,fabric,34,22),'Torso',(0,.58,0))
    add(scene,superellipsoid((1.00,.28,.66),3.8,fabric2,26,14),'Hood',(0,1.06,-.28))
    add(scene,tube_between((-.39,1.03,.36),(-.18,1.13,.43),.040,fabric2),'HoodRimL')
    add(scene,tube_between((.39,1.03,.36),(.18,1.13,.43),.040,fabric2),'HoodRimR')
    for x,side in [(-.19,'L'),(.19,'R')]:
        add(scene,tube_between((x,1.00,.40),(x,.70,.44),.023,ceramic_shadow),f'Drawstring{side}')
        add(scene,sph(.034,metal,1),f'DrawstringTip{side}',(x,.68,.44))
    add(scene,superellipsoid((.72,.24,.055),3.8,fabric2,24,12),'Pocket',(0,.25,.405))
    for ch,x in zip('PLUG',[-.31,-.10,.10,.32]):
        add_letter(scene,ch,x,.67,.443,.72,ceramic,f'Chest_{ch}')
    add(scene,superellipsoid((.92,.28,.64),3.7,fabric2,26,14),'Waist',(0,-.03,0))

    # Arms: continuous sleeves + cuffs + soft hands, avoiding spherical robot shoulders/elbows.
    for x,side,sgn in [(-.67,'L',1),(.67,'R',-1)]:
        add(scene,capsule_y(.165,.76,fabric,20),f'UpperArm{side}',(x,.60,0),r=(0,0,.10*sgn))
        add(scene,superellipsoid((.34,.22,.32),3.4,fabric2,18,12),f'Cuff{side}',(x,.22,.02))
        add(scene,capsule_y(.145,.58,fabric,18),f'ForeArm{side}',(x,-.03,.04),r=(0,0,-.07*sgn))
        add(scene,superellipsoid((.34,.30,.32),3.8,ceramic,20,14),f'Hand{side}',(x,-.35,.10))
        add(scene,capsule_y(.046,.20,ceramic,12),f'Thumb{side}',(x+(-.11 if side=='L' else .11),-.32,.18),r=(0,0,-.62 if side=='L' else .62))
        add(scene,box((.07,.15,.045),cyan if side=='L' else blue),f'WristAccent{side}',(x,.14,.18))

    # Pants: connected, soft, character-like legs.
    add(scene,superellipsoid((.98,.40,.67),3.6,dark,26,16),'Hip',(0,-.18,0))
    for x,side in [(-.28,'L'),(.28,'R')]:
        add(scene,capsule_y(.19,.92,dark,20),f'Leg{side}',(x,-.70,0))
        add(scene,superellipsoid((.39,.34,.24),3.7,fabric2,20,12),f'CargoDetail{side}',(x+(-.12 if side=='L' else .12),-.60,.24))
        add(scene,box((.24,.045,.035),metal),f'CargoZip{side}',(x+(-.12 if side=='L' else .12),-.54,.37))

    # Chunky sneakers to keep the friendly mascot silhouette.
    for x,side in [(-.31,'L'),(.31,'R')]:
        add(scene,superellipsoid((.56,.35,.86),3.9,dark,28,18),f'Foot{side}',(x,-1.23,.17))
        add(scene,superellipsoid((.59,.14,.90),4.0,sole,28,12),f'Sole{side}',(x,-1.395,.17))
        add(scene,superellipsoid((.46,.16,.42),3.7,ceramic_shadow,20,12),f'ToeCap{side}',(x,-1.17,.43))
        add(scene,box((.10,.23,.055),cyan if side=='L' else blue),f'ShoeStripe{side}',(x+(-.16 if side=='L' else .16),-1.19,.57),r=(0,0,.34 if side=='L' else -.34))

    # Compact back accent, integrated rather than robotic.
    add(scene,superellipsoid((.62,.60,.12),4.0,fabric2,22,14),'BackPanel',(0,.61,-.40))
    add(scene,capsule_y(.045,.36,cyan,12),'BackGlowL',(-.18,.60,-.48))
    add(scene,capsule_y(.045,.36,violet,12),'BackGlowR',(.18,.60,-.48))

    anims=[
      {'name':'Idle','channels':[{'node':'Head','path':'translation','times':[0,.7,1.4,2.1,2.8],'values':[[0,1.86,0],[0,1.905,0],[0,1.86,0],[0,1.825,0],[0,1.86,0]]},{'node':'Head','path':'rotation','times':[0,1.4,2.8],'values':[quat((0,0,1),0),quat((0,0,1),.026),quat((0,0,1),0)]},{'node':'Torso','path':'translation','times':[0,1.4,2.8],'values':[[0,.58,0],[0,.595,0],[0,.58,0]]}]},
      {'name':'Wave','channels':[{'node':'UpperArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((0,0,1),-.10),quat((0,0,1),-1.14),quat((0,0,1),-.68),quat((0,0,1),-1.10),quat((0,0,1),-.64),quat((0,0,1),-.10)]},{'node':'ForeArmR','path':'rotation','times':[0,.28,.56,.84,1.12,1.4],'values':[quat((1,0,0),0),quat((1,0,0),-.84),quat((1,0,0),-.30),quat((1,0,0),-.80),quat((1,0,0),-.28),quat((1,0,0),0)]},{'node':'Head','path':'rotation','times':[0,.7,1.4],'values':[quat((0,0,1),0),quat((0,0,1),.10),quat((0,0,1),0)]}]},
      {'name':'Point','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),.10),quat((0,0,1),1.02),quat((0,0,1),1.02),quat((0,0,1),.10)]},{'node':'ForeArmL','path':'rotation','times':[0,.45,.9,1.25],'values':[quat((0,0,1),0),quat((0,0,1),-.44),quat((0,0,1),-.44),quat((0,0,1),0)]}]},
      {'name':'Think','channels':[{'node':'Head','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.16),quat((1,0,0),.08),quat((0,0,1),0)]},{'node':'UpperArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((0,0,1),-.10),quat((0,0,1),-.80),quat((0,0,1),-.80),quat((0,0,1),-.10)]},{'node':'ForeArmR','path':'rotation','times':[0,.5,1.0,1.5],'values':[quat((1,0,0),0),quat((1,0,0),-.92),quat((1,0,0),-.92),quat((1,0,0),0)]}]},
      {'name':'Present','channels':[{'node':'UpperArmL','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),.10),quat((0,0,1),.80),quat((0,0,1),.80),quat((0,0,1),.10)]},{'node':'UpperArmR','path':'rotation','times':[0,.45,.9,1.3],'values':[quat((0,0,1),-.10),quat((0,0,1),-.80),quat((0,0,1),-.80),quat((0,0,1),-.10)]}]},
      {'name':'Curious','channels':[{'node':'Head','path':'rotation','times':[0,.45,.9,1.35],'values':[quat((0,0,1),0),quat((0,0,1),.20),quat((0,0,1),.20),quat((0,0,1),0)]}]},
      {'name':'Dance','channels':[{'node':'Torso','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),.12),quat((0,0,1),-.12),quat((0,0,1),0)]},{'node':'Head','path':'rotation','times':[0,.3,.6,.9,1.2,1.5],'values':[quat((0,0,1),0),quat((0,0,1),-.14),quat((0,0,1),.14),quat((0,0,1),-.14),quat((0,0,1),.14),quat((0,0,1),0)]}]},
      {'name':'Bounce','channels':[{'node':'Head','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,1.86,0],[0,1.97,0],[0,1.86,0],[0,1.92,0],[0,1.86,0]]},{'node':'Torso','path':'translation','times':[0,.25,.5,.75,1.0],'values':[[0,.58,0],[0,.64,0],[0,.58,0],[0,.62,0],[0,.58,0]]}]}
    ]

    raw=_scene_to_glb_with_anims(scene,anims)
    p=Path(output_path);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    return {'path':str(p),'bytes':len(raw),'nodes':len(scene.geometry),'animations':[a['name'] for a in anims],'sha256':hashlib.sha256(raw).hexdigest(),'design':'approved-head-soft-mascot-body-v52'}
