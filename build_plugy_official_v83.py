from __future__ import annotations
from pathlib import Path
import json
import math
import struct

import numpy as np
import trimesh


def superellipsoid(a, b, c, e1=4.0, e2=4.0, n_lat=42, n_lon=84):
    """Create a smooth rounded-box/superellipsoid mesh, with Y as up axis."""
    verts = []
    for i in range(n_lat + 1):
        v = -math.pi / 2 + math.pi * i / n_lat
        cv, sv = math.cos(v), math.sin(v)
        cvp = math.copysign(abs(cv) ** (2.0 / e1), cv)
        svp = math.copysign(abs(sv) ** (2.0 / e1), sv)
        for j in range(n_lon):
            u = 2 * math.pi * j / n_lon
            cu, su = math.cos(u), math.sin(u)
            cup = math.copysign(abs(cu) ** (2.0 / e2), cu)
            sup = math.copysign(abs(su) ** (2.0 / e2), su)
            verts.append((a * cvp * cup, b * svp, c * cvp * sup))
    faces = []
    for i in range(n_lat):
        for j in range(n_lon):
            nj = (j + 1) % n_lon
            a0 = i * n_lon + j
            a1 = i * n_lon + nj
            b0 = (i + 1) * n_lon + j
            b1 = (i + 1) * n_lon + nj
            faces.extend(((a0, b0, a1), (a1, b0, b1)))
    mesh = trimesh.Trimesh(vertices=np.asarray(verts), faces=np.asarray(faces), process=False)
    try:
        mesh.update_faces(mesh.nondegenerate_faces())
        mesh.remove_unreferenced_vertices()
    except Exception:
        pass
    mesh.fix_normals()
    return mesh


def tube_arc(width=.42, height=.17, radius=.055, segments=36, sides=16):
    """Create the curved closed-eye shape as a smooth 3D tube."""
    centers = []
    for i in range(segments + 1):
        t = i / segments
        x = -width / 2 + width * t
        xn = x / (width / 2)
        y = height * (1 - xn * xn)
        centers.append(np.array([x, y, 0.0], float))
    verts = []
    for i, center in enumerate(centers):
        if i == 0:
            tangent = centers[1] - centers[0]
        elif i == len(centers) - 1:
            tangent = centers[-1] - centers[-2]
        else:
            tangent = centers[i + 1] - centers[i - 1]
        tangent /= np.linalg.norm(tangent)
        b1 = np.array([0.0, 0.0, 1.0])
        b2 = np.cross(tangent, b1)
        b2 /= np.linalg.norm(b2)
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            verts.append(center + radius * (math.cos(angle) * b1 + math.sin(angle) * b2))
    faces = []
    for i in range(len(centers) - 1):
        for j in range(sides):
            nj = (j + 1) % sides
            a = i * sides + j
            b = i * sides + nj
            c = (i + 1) * sides + j
            d = (i + 1) * sides + nj
            faces.extend(((a, c, b), (b, c, d)))
    mesh = trimesh.Trimesh(vertices=np.asarray(verts), faces=np.asarray(faces), process=False)
    mesh.fix_normals()
    return mesh


def tube_chevron(width=.34, height=.14, radius=.048, segments=18, sides=16):
    """Create a clean inverted-V/caret eye as a smooth connected tube."""
    anchors = [
        np.array([-width / 2, -height / 2, 0.0], float),
        np.array([0.0, height / 2, 0.0], float),
        np.array([width / 2, -height / 2, 0.0], float),
    ]
    centers = []
    for seg in range(2):
        a, b = anchors[seg], anchors[seg + 1]
        for i in range(segments + (0 if seg == 0 else 1)):
            t = i / segments
            if seg and i == 0:
                continue
            centers.append(a * (1 - t) + b * t)
    verts = []
    for i, center in enumerate(centers):
        if i == 0:
            tangent = centers[1] - centers[0]
        elif i == len(centers) - 1:
            tangent = centers[-1] - centers[-2]
        else:
            tangent = centers[i + 1] - centers[i - 1]
        tangent /= np.linalg.norm(tangent)
        b1 = np.array([0.0, 0.0, 1.0])
        b2 = np.cross(tangent, b1)
        b2 /= np.linalg.norm(b2)
        for j in range(sides):
            angle = 2 * math.pi * j / sides
            verts.append(center + radius * (math.cos(angle) * b1 + math.sin(angle) * b2))
    faces = []
    for i in range(len(centers) - 1):
        for j in range(sides):
            nj = (j + 1) % sides
            a = i * sides + j
            b = i * sides + nj
            c = (i + 1) * sides + j
            d = (i + 1) * sides + nj
            faces.extend(((a, c, b), (b, c, d)))
    mesh = trimesh.Trimesh(vertices=np.asarray(verts), faces=np.asarray(faces), process=False)
    mesh.fix_normals()
    return mesh


def _pad4(raw: bytes, pad=b" "):
    return raw + pad * ((4 - (len(raw) % 4)) % 4)


def build_plugy_official_v83(output_path: str | Path):
    """Build PLUGY as a standalone glossy plug head with animated blinking eyes."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    meshes = []
    body = superellipsoid(.88, .62, .27, e1=5.15, e2=5.15, n_lat=46, n_lon=92)
    meshes.append(("Body", body, 0))

    # Shorter, tighter prongs so PLUGY reads as an electrical plug rather than ears.
    prong = superellipsoid(.118, .302, .090, e1=5.8, e2=3.6, n_lat=28, n_lon=56)
    meshes.append(("ProngL", prong, 0))
    meshes.append(("ProngR", prong.copy(), 0))

    # Small blend collars visually fuse the prongs into the head.
    blend = superellipsoid(.142, .080, .116, e1=4.2, e2=3.4, n_lat=20, n_lon=40)
    meshes.append(("ProngBlendL", blend, 0))
    meshes.append(("ProngBlendR", blend.copy(), 0))

    # Dark plum inverted-V eyes, preserving V26's separate animatable eye nodes.
    eye = tube_chevron(width=.372, height=.152, radius=.055, segments=22, sides=20)
    meshes.append(("EyeL", eye, 1))
    meshes.append(("EyeR", eye.copy(), 1))

    # V26 edge-light signature, but now much finer and less strip-like.
    rim_v = superellipsoid(.020, .39, .020, e1=2.0, e2=2.0, n_lat=14, n_lon=24)
    meshes.append(("RimCyan", rim_v, 2))
    meshes.append(("RimViolet", rim_v.copy(), 3))
    rim_h = superellipsoid(.36, .018, .022, e1=2.0, e2=2.0, n_lat=10, n_lon=32)
    meshes.append(("RimBottomCyan", rim_h, 2))
    meshes.append(("RimBottomViolet", rim_h.copy(), 3))

    materials = [
        {
            "name": "PLUGY Dark Rose Violet Metal",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.79, .245, .565, 1.0],
                "metallicFactor": .30,
                "roughnessFactor": .105,
            },
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": .93, "clearcoatRoughnessFactor": .022},
                "KHR_materials_specular": {"specularFactor": .98, "specularColorFactor": [1.0, .82, .96]},
                "KHR_materials_iridescence": {
                    "iridescenceFactor": .42,
                    "iridescenceIor": 1.30,
                    "iridescenceThicknessMinimum": 155.0,
                    "iridescenceThicknessMaximum": 335.0
                },
                "KHR_materials_ior": {"ior": 1.47}
            },
        },
        {
            "name": "PLUGY Deep Gloss Black Eyes",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.0015, .0012, .0022, 1.0],
                "metallicFactor": .035,
                "roughnessFactor": .040,
            },
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": 1.0, "clearcoatRoughnessFactor": .012},
                "KHR_materials_specular": {"specularFactor": 1.0, "specularColorFactor": [1.0, .98, 1.0]},
                "KHR_materials_ior": {"ior": 1.50},
            },
        },
        {
            "name": "Cold Cyan Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.30, .46, .72, .075],
                "metallicFactor": 0.0,
                "roughnessFactor": .20,
            },
            "emissiveFactor": [.004, .010, .018],
            "alphaMode": "BLEND",
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": .10}},
        },
        {
            "name": "Soft Violet Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.30, .08, .48, .18],
                "metallicFactor": 0.0,
                "roughnessFactor": .20,
            },
            "emissiveFactor": [.020, .003, .042],
            "alphaMode": "BLEND",
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": .16}},
        },
    ]

    blob = bytearray()
    buffer_views = []
    accessors = []
    gltf_meshes = []

    def append_data(arr, target=None, component_type=5126, type_name="VEC3"):
        nonlocal blob
        arr = np.ascontiguousarray(arr)
        offset = len(blob)
        raw = arr.tobytes()
        blob.extend(raw)
        blob.extend(b"\x00" * ((4 - len(blob) % 4) % 4))
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw)}
        if target:
            view["target"] = target
        view_index = len(buffer_views)
        buffer_views.append(view)
        values = arr.reshape(-1) if type_name == "SCALAR" else arr.reshape((-1, arr.shape[-1]))
        accessor = {
            "bufferView": view_index,
            "componentType": component_type,
            "count": len(arr),
            "type": type_name,
        }
        if np.issubdtype(arr.dtype, np.floating):
            if type_name == "SCALAR":
                accessor["min"] = [float(values.min())]
                accessor["max"] = [float(values.max())]
            else:
                accessor["min"] = [float(x) for x in values.min(axis=0)]
                accessor["max"] = [float(x) for x in values.max(axis=0)]
        elif type_name == "SCALAR":
            accessor["min"] = [int(values.min())]
            accessor["max"] = [int(values.max())]
        idx = len(accessors)
        accessors.append(accessor)
        return idx

    for name, mesh, material_idx in meshes:
        positions = np.asarray(mesh.vertices, dtype=np.float32)
        normals = np.asarray(mesh.vertex_normals, dtype=np.float32)
        indices = np.asarray(mesh.faces.reshape(-1), dtype=np.uint32)
        pos_idx = append_data(positions, target=34962, component_type=5126, type_name="VEC3")
        norm_idx = append_data(normals, target=34962, component_type=5126, type_name="VEC3")
        ind_idx = append_data(indices, target=34963, component_type=5125, type_name="SCALAR")
        gltf_meshes.append({
            "name": name,
            "primitives": [{
                "attributes": {"POSITION": pos_idx, "NORMAL": norm_idx},
                "indices": ind_idx,
                "material": material_idx,
                "mode": 4,
            }],
        })

    nodes = [
        {"name": "PLUGY_Root", "children": [1]},
        {"name": "PLUGY_HeadRig", "children": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
        {"name": "Body", "mesh": 0},
        {"name": "Prong_L", "mesh": 1, "translation": [-.292, .800, -.012], "rotation": [0.0, 0.0, -.018, .99984]},
        {"name": "Prong_R", "mesh": 2, "translation": [.292, .800, -.012], "rotation": [0.0, 0.0, .018, .99984]},
        {"name": "ProngBlend_L", "mesh": 3, "translation": [-.292, .590, -.008]},
        {"name": "ProngBlend_R", "mesh": 4, "translation": [.292, .590, -.008]},
        {"name": "Eye_L", "mesh": 5, "translation": [-.292, -.010, .286]},
        {"name": "Eye_R", "mesh": 6, "translation": [.292, -.010, .286]},
        {"name": "Rim_Cyan", "mesh": 7, "translation": [-.835, -.015, .242]},
        {"name": "Rim_Violet", "mesh": 8, "translation": [.835, -.015, .242]},
        {"name": "Rim_Bottom_Cyan", "mesh": 9, "translation": [-.355, -.655, .242]},
        {"name": "Rim_Bottom_Violet", "mesh": 10, "translation": [.355, -.655, .242]},
    ]

    head_times = np.array([0.0, 1.5, 3.0, 4.5, 6.0], dtype=np.float32)

    def quat_xyz(rx, ry, rz):
        cx, sx = math.cos(rx / 2), math.sin(rx / 2)
        cy, sy = math.cos(ry / 2), math.sin(ry / 2)
        cz, sz = math.cos(rz / 2), math.sin(rz / 2)
        return [
            sx * cy * cz - cx * sy * sz,
            cx * sy * cz + sx * cy * sz,
            cx * cy * sz - sx * sy * cz,
            cx * cy * cz + sx * sy * sz,
        ]

    head_rots = np.array([
        quat_xyz(0, 0, 0),
        quat_xyz(.018, .055, -.02),
        quat_xyz(-.012, -.045, .018),
        quat_xyz(.012, .04, -.012),
        quat_xyz(0, 0, 0),
    ], dtype=np.float32)
    head_trans = np.array([
        [0, 0, 0], [0, .018, 0], [0, -.006, 0], [0, .014, 0], [0, 0, 0]
    ], dtype=np.float32)

    blink_times = np.array([0.0, 1.30, 1.38, 1.46, 2.90, 2.98, 3.06, 4.58, 4.66, 4.74, 6.0], dtype=np.float32)
    eye_scales = np.array([
        [1.0, .16 if i in {2, 5, 8} else 1.0, 1.0] for i in range(len(blink_times))
    ], dtype=np.float32)

    head_time_idx = append_data(head_times, component_type=5126, type_name="SCALAR")
    head_rot_idx = append_data(head_rots, component_type=5126, type_name="VEC4")
    head_pos_idx = append_data(head_trans, component_type=5126, type_name="VEC3")
    blink_time_idx = append_data(blink_times, component_type=5126, type_name="SCALAR")
    blink_scale_idx = append_data(eye_scales, component_type=5126, type_name="VEC3")

    prong_times = np.array([0.0, 1.4, 2.8, 4.2, 6.0], dtype=np.float32)
    prong_l_rots = np.array([quat_xyz(0, 0, x) for x in (-.018, -.006, -.023, -.010, -.018)], dtype=np.float32)
    prong_r_rots = np.array([quat_xyz(0, 0, x) for x in (.018, .007, .024, .010, .018)], dtype=np.float32)
    prong_time_idx = append_data(prong_times, component_type=5126, type_name="SCALAR")
    prong_l_idx = append_data(prong_l_rots, component_type=5126, type_name="VEC4")
    prong_r_idx = append_data(prong_r_rots, component_type=5126, type_name="VEC4")

    animations = [{
        "name": "IdleBlink",
        "samplers": [
            {"input": head_time_idx, "output": head_rot_idx, "interpolation": "LINEAR"},
            {"input": head_time_idx, "output": head_pos_idx, "interpolation": "LINEAR"},
            {"input": blink_time_idx, "output": blink_scale_idx, "interpolation": "LINEAR"},
            {"input": blink_time_idx, "output": blink_scale_idx, "interpolation": "LINEAR"},
            {"input": prong_time_idx, "output": prong_l_idx, "interpolation": "LINEAR"},
            {"input": prong_time_idx, "output": prong_r_idx, "interpolation": "LINEAR"},
        ],
        "channels": [
            {"sampler": 0, "target": {"node": 1, "path": "rotation"}},
            {"sampler": 1, "target": {"node": 1, "path": "translation"}},
            {"sampler": 2, "target": {"node": 7, "path": "scale"}},
            {"sampler": 3, "target": {"node": 8, "path": "scale"}},
            {"sampler": 4, "target": {"node": 3, "path": "rotation"}},
            {"sampler": 5, "target": {"node": 4, "path": "rotation"}},
        ],
    }]

    gltf = {
        "asset": {"version": "2.0", "generator": "PLUG ART · PLUGY Official V83"},
        "scene": 0,
        "scenes": [{"name": "PLUGY", "nodes": [0]}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "animations": animations,
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "extensionsUsed": [
            "KHR_materials_clearcoat",
            "KHR_materials_specular",
            "KHR_materials_emissive_strength",
            "KHR_materials_iridescence",
            "KHR_materials_ior",
        ],
    }

    json_chunk = _pad4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = _pad4(bytes(blob), b"\x00")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    output = bytearray(struct.pack("<4sII", b"glTF", 2, total))
    output.extend(struct.pack("<I4s", len(json_chunk), b"JSON"))
    output.extend(json_chunk)
    output.extend(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
    output.extend(bin_chunk)
    output_path.write_bytes(output)
    return {
        "path": str(output_path),
        "bytes": len(output),
        "nodes": len(nodes),
        "meshes": len(gltf_meshes),
        "animation": "IdleBlink",
        "animations": ["IdleBlink"],
        "material": "dark-rose-violet-metal-deep-black-eyes",
        "official_base": "V26",
        "profile": "metallic-finish-deep-black-eyes-real-plug-prongs",
    }


if __name__ == "__main__":
    print(build_plugy_official_v83(Path(__file__).resolve().parent / "static" / "plugy_official_v83.glb"))
