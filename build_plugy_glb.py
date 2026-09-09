from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def _material(rgb, name, emissive=None):
    kw = {
        "baseColorFactor": [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1.0],
        "metallicFactor": 0.05,
        "roughnessFactor": 0.45,
        "name": name,
    }
    if emissive:
        kw["emissiveFactor"] = [c / 255 for c in emissive]
    return PBRMaterial(**kw)


def _mat(mesh, material):
    mesh.visual = TextureVisuals(material=material)
    return mesh


def _cyl(p1, p2, radius, material, sections=6):
    p1 = np.array(p1, dtype=float)
    p2 = np.array(p2, dtype=float)
    delta = p2 - p1
    length = np.linalg.norm(delta)
    mesh = trimesh.creation.cylinder(radius=radius, height=length, sections=sections)
    mesh.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], delta / length))
    mesh.apply_translation((p1 + p2) / 2)
    return _mat(mesh, material)


def build_plugy_glb(output_path: str | Path):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    white = _material((242, 244, 248), "White")
    navy = _material((13, 20, 36), "Navy")
    navy2 = _material((24, 35, 58), "Navy2")
    blue = _material((45, 110, 255), "Blue", (30, 90, 255))
    cyan = _material((75, 215, 255), "Cyan", (30, 140, 255))
    metal = _material((205, 212, 225), "Metal")
    sole = _material((160, 172, 192), "Sole")

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

    def sphere(radius, material):
        return _mat(trimesh.creation.icosphere(subdivisions=1, radius=radius), material)

    # Head / plug silhouette
    add(box((1.55, 1.05, 0.72), white), "Head", (0, 1.55, 0))
    for i, (x, y) in enumerate([(-0.72, 1.98), (0.72, 1.98), (-0.72, 1.12), (0.72, 1.12)]):
        add(sphere(0.15, white), f"HeadCorner{i}", (x, y, 0))
    for x, side in [(-0.32, "L"), (0.32, "R")]:
        add(_cyl((x, 2.06, 0), (x, 2.72, 0), 0.09, metal), f"Prong{side}")

    # Closed smiling blue eyes
    for cx, side in [(-0.34, "L"), (0.34, "R")]:
        points = [(cx - 0.20, 1.55, 0.375), (cx, 1.72, 0.375), (cx + 0.20, 1.55, 0.375)]
        add(_cyl(points[0], points[1], 0.055, cyan), f"Eye{side}A")
        add(_cyl(points[1], points[2], 0.055, cyan), f"Eye{side}B")

    # Dark PLUG outfit with electric-blue accents
    add(box((1.0, 1.05, 0.58), navy), "Torso", (0, 0.35, -0.02))
    add(box((0.12, 0.65, 0.38), blue), "PackL", (-0.54, 0.42, -0.08))
    add(box((0.12, 0.65, 0.38), blue), "PackR", (0.54, 0.42, -0.08))
    add(box((0.50, 0.12, 0.05), white), "ChestMark", (0, 0.43, 0.31))
    add(box((0.86, 0.12, 0.60), blue), "Waist", (0, -0.14, -0.02))

    # Friendly pointing pose inspired by the supplied screenshot
    add(_cyl((-0.48, 0.55, 0), (-0.88, 0.55, 0.10), 0.12, navy2), "UpperArmL")
    add(_cyl((-0.88, 0.55, 0.10), (-1.02, 0.83, 0.24), 0.11, navy2), "ForeArmL")
    add(sphere(0.15, white), "HandL", (-1.06, 0.87, 0.26))
    add(_cyl((-1.15, 0.90, 0.29), (-1.33, 1.02, 0.33), 0.035, white), "Finger")
    add(_cyl((0.48, 0.55, 0), (0.74, 0.18, 0.08), 0.12, navy2), "UpperArmR")
    add(_cyl((0.74, 0.18, 0.08), (0.80, -0.10, 0.20), 0.11, navy2), "ForeArmR")
    add(sphere(0.15, white), "HandR", (0.81, -0.16, 0.21))

    for x, side in [(-0.27, "L"), (0.27, "R")]:
        add(_cyl((x, -0.15, 0), (x, -0.66, 0.02), 0.15, navy2), f"Leg{side}")
        add(box((0.40, 0.18, 0.62), navy2), f"Shoe{side}", (x, -0.92, 0.13))
        add(box((0.42, 0.08, 0.64), sole), f"Sole{side}", (x, -1.04, 0.13))
        add(box((0.10, 0.10, 0.38), blue), f"ShoeAccent{side}", (x, -0.90, 0.46))

    data = scene.export(file_type="glb")
    output_path.write_bytes(data)
    return {"path": str(output_path), "bytes": len(data), "nodes": len(scene.geometry)}


if __name__ == "__main__":
    print(build_plugy_glb(Path(__file__).resolve().parent / "static" / "plugy.glb"))
