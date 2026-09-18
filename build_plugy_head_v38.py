from __future__ import annotations
from pathlib import Path
import json, struct
from build_plugy_head_v33 import build_plugy_head_v33

def _pad4(raw: bytes, pad=b' '):
    return raw + pad * ((4 - len(raw) % 4) % 4)

def build_plugy_head_v38(output_path: str|Path):
    output_path=Path(output_path)
    tmp=output_path.with_suffix('.base.glb')
    build_plugy_head_v33(tmp)
    raw=tmp.read_bytes()
    magic,version,total=struct.unpack_from('<4sII',raw,0)
    if magic!=b'glTF' or version!=2: raise RuntimeError('GLB invalide')
    jlen,jtype=struct.unpack_from('<I4s',raw,12)
    jstart=20; jend=jstart+jlen
    doc=json.loads(raw[jstart:jend].decode('utf-8').rstrip(' \x00'))
    blen,btype=struct.unpack_from('<I4s',raw,jend)
    binary=raw[jend+8:jend+8+blen]

    mats=doc['materials']
    # Référence canonique: coque blanche nacrée, yeux bleu nuit, halo cyan/rose.
    mats[0].update({
      'name':'PLUGY V38 Pearl White',
      'pbrMetallicRoughness':{'baseColorFactor':[0.965,0.975,1.0,1.0],'metallicFactor':0.025,'roughnessFactor':0.16},
      'emissiveFactor':[0.012,0.018,0.045],
      'extensions':{
        'KHR_materials_clearcoat':{'clearcoatFactor':0.92,'clearcoatRoughnessFactor':0.055},
        'KHR_materials_specular':{'specularFactor':0.96,'specularColorFactor':[1.0,1.0,1.0]}
      }
    })
    mats[1].update({
      'name':'PLUGY V38 White Prongs',
      'pbrMetallicRoughness':{'baseColorFactor':[0.94,0.965,1.0,1.0],'metallicFactor':0.035,'roughnessFactor':0.13},
      'emissiveFactor':[0.018,0.035,0.085],
      'extensions':{
        'KHR_materials_clearcoat':{'clearcoatFactor':0.94,'clearcoatRoughnessFactor':0.05},
        'KHR_materials_specular':{'specularFactor':0.98,'specularColorFactor':[1.0,1.0,1.0]}
      }
    })
    mats[2].update({
      'name':'PLUGY V38 Deep Blue Eyes',
      'pbrMetallicRoughness':{'baseColorFactor':[0.012,0.055,0.32,1.0],'metallicFactor':0.24,'roughnessFactor':0.085},
      'emissiveFactor':[0.012,0.055,0.34],
      'extensions':{
        'KHR_materials_clearcoat':{'clearcoatFactor':0.96,'clearcoatRoughnessFactor':0.035},
        'KHR_materials_emissive_strength':{'emissiveStrength':1.45}
      }
    })
    mats[3].update({
      'name':'PLUGY V38 Cyan Rim',
      'pbrMetallicRoughness':{'baseColorFactor':[0.02,0.82,1.0,0.72],'metallicFactor':0.0,'roughnessFactor':0.16},
      'emissiveFactor':[0.02,0.74,1.0],'alphaMode':'BLEND','doubleSided':True,
      'extensions':{'KHR_materials_emissive_strength':{'emissiveStrength':1.55}}
    })
    mats[4].update({
      'name':'PLUGY V38 Pink Rim',
      'pbrMetallicRoughness':{'baseColorFactor':[0.88,0.10,0.95,0.68],'metallicFactor':0.0,'roughnessFactor':0.16},
      'emissiveFactor':[0.74,0.055,0.88],'alphaMode':'BLEND','doubleSided':True,
      'extensions':{'KHR_materials_emissive_strength':{'emissiveStrength':1.48}}
    })
    doc['asset']['generator']='PLUG ART · PLUGY V38 · reference matched'
    doc['scene']=0
    jc=_pad4(json.dumps(doc,separators=(',',':')).encode(),b' ')
    bc=_pad4(binary,b'\x00')
    out=bytearray(struct.pack('<4sII',b'glTF',2,12+8+len(jc)+8+len(bc)))
    out.extend(struct.pack('<I4s',len(jc),b'JSON')); out.extend(jc)
    out.extend(struct.pack('<I4s',len(bc),b'BIN\x00')); out.extend(bc)
    output_path.parent.mkdir(parents=True,exist_ok=True)
    output_path.write_bytes(out)
    try: tmp.unlink()
    except OSError: pass
    return {'path':str(output_path),'bytes':len(out),'animations':[a['name'] for a in doc.get('animations',[])],
            'materials':[m.get('name') for m in mats]}

if __name__=='__main__':
    print(build_plugy_head_v38(Path(__file__).resolve().parent/'static'/'plugy_head_v38.glb'))
