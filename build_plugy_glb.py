from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def _material(rgb, name, emissive=None, roughness=.48, metallic=.04):
    kw = {
        "baseColorFactor": [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0],
        "metallicFactor": metallic,
        "roughnessFactor": roughness,
        "name": name,
    }
    if emissive:
        kw["emissiveFactor"] = [c / 255 for c in emissive]
    return PBRMaterial(**kw)


def _mat(mesh, material):
    mesh.visual = TextureVisuals(material=material)
    return mesh


def _cyl(p1, p2, radius, material, sections=8):
    p1 = np.array(p1, dtype=float)
    p2 = np.array(p2, dtype=float)
    delta = p2 - p1
    length = np.linalg.norm(delta)
    mesh = trimesh.creation.cylinder(radius=radius, height=length, sections=sections)
    mesh.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], delta / length))
    mesh.apply_translation((p1 + p2) / 2)
    return _mat(mesh, material)


def build_plugy_glb(output_path: str | Path):
    """Build a lightweight, web-first PLUGY GLB.

    Geometry stays deliberately separated by body part so the web runtime can
    articulate PLUGY visually without a heavy skinned rig.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    white = _material((250, 251, 255), "PLUGY_White", roughness=.34)
    soft_white = _material((225, 232, 244), "PLUGY_SoftWhite", roughness=.42)
    ink = _material((22, 29, 47), "PLUGY_Ink", roughness=.58)
    ink2 = _material((40, 50, 75), "PLUGY_Ink2", roughness=.54)
    blue = _material((79, 104, 255), "PLUGY_Blue", (38, 80, 255), roughness=.35)
    cyan = _material((59, 221, 255), "PLUGY_Cyan", (25, 160, 255), roughness=.28)
    pink = _material((255, 111, 183), "PLUGY_Pink", (150, 30, 95), roughness=.34)
    metal = _material((205, 215, 231), "PLUGY_Metal", roughness=.25, metallic=.28)
    sole = _material((175, 184, 202), "PLUGY_Sole", roughness=.68)

    scene = trimesh.Scene()

    def add(mesh, name, pos=(0, 0, 0)):
        scene.add_geometry(
            mesh,
            geom_name=name,
            node_name=name,
            transform=trimesh.transformations.translation_matrix(pos),
        )

    def box(extents, material):
        return _mat(trimesh.creation.box(extents=extents), material)

    def sphere(radius, material, sub=2):
        return _mat(trimesh.creation.icosphere(subdivisions=sub, radius=radius), material)

    # --- iconic plug head -------------------------------------------------
    # Main body + soft corners. The silhouette reads as a wall plug first,
    # then as a friendly character.
    add(box((1.60, .98, .78), white), "HeadCore", (0, 1.53, 0))
    for i, (x, y) in enumerate([(-.72, 1.93), (.72, 1.93), (-.72, 1.13), (.72, 1.13)]):
        add(sphere(.18, white), f"HeadCorner{i}", (x, y, 0))
    add(box((1.34, .09, .82), soft_white), "HeadRearBand", (0, 1.50, -.40))

    # Proper twin prongs, slightly oversized to reinforce the plug identity.
    for x, side in [(-.34, "L"), (.34, "R")]:
        add(_cyl((x, 2.01, 0), (x, 2.72, 0), .095, metal, sections=10), f"Prong{side}")
        add(sphere(.105, soft_white), f"ProngCap{side}", (x, 2.00, 0))

    # Friendly closed eyes, split in two segments for a soft curved expression.
    for cx, side in [(-.34, "L"), (.34, "R")]:
        p0, p1, p2 = (cx-.20, 1.54, .405), (cx, 1.69, .415), (cx+.20, 1.54, .405)
        add(_cyl(p0, p1, .052, cyan, sections=8), f"Eye{side}A")
        add(_cyl(p1, p2, .052, cyan, sections=8), f"Eye{side}B")

    # Side energy nodes keep PLUGY colorful without making the whole mascot busy.
    add(sphere(.10, pink), "EnergyNodeL", (-.84, 1.48, .03))
    add(sphere(.10, blue), "EnergyNodeR", (.84, 1.48, .03))

    # --- outfit / backpack ------------------------------------------------
    add(box((1.04, .94, .62), ink), "Torso", (0, .42, -.02))
    add(box((.88, .16, .64), ink2), "Hood", (0, .88, -.05))
    add(box((.72, .13, .07), white), "ChestPLUG", (0, .48, .325))
    add(box((.18, .58, .42), blue), "BackpackL", (-.57, .43, -.18))
    add(box((.18, .58, .42), cyan), "BackpackR", (.57, .43, -.18))
    add(box((.92, .11, .62), blue), "WaistGlow", (0, -.08, -.02))

    # --- articulated-looking limbs ---------------------------------------
    # Neutral asymmetrical pose. Each segment has its own node so the runtime
    # can animate the whole character cheaply through transforms/camera motion.
    add(_cyl((-.47, .63, 0), (-.82, .41, .08), .125, ink2), "UpperArmL")
    add(_cyl((-.82, .41, .08), (-.94, .13, .22), .115, ink2), "ForeArmL")
    add(sphere(.155, white), "HandL", (-.96, .08, .23))

    add(_cyl((.47, .63, 0), (.79, .69, .10), .125, ink2), "UpperArmR")
    add(_cyl((.79, .69, .10), (.96, .92, .25), .112, ink2), "ForeArmR")
    add(sphere(.155, white), "HandR", (1.00, .96, .27))
    add(_cyl((1.05, 1.02, .30), (1.22, 1.14, .34), .035, white, sections=8), "PointFingerR")

    for x, side in [(-.27, "L"), (.27, "R")]:
        add(_cyl((x, -.10, 0), (x, -.67, .02), .155, ink2), f"Leg{side}")
        add(box((.42, .18, .64), ink2), f"Shoe{side}", (x, -.93, .14))
        add(box((.44, .075, .66), sole), f"Sole{side}", (x, -1.045, .14))
        accent = cyan if side == "L" else pink
        add(box((.11, .10, .40), accent), f"ShoeAccent{side}", (x, -.91, .47))

    data = scene.export(file_type="glb")
    output_path.write_bytes(data)
    return {"path": str(output_path), "bytes": len(data), "nodes": len(scene.geometry)}


if __name__ == "__main__":
    print(build_plugy_glb(Path(__file__).resolve().parent / "static" / "plugy.glb"))
