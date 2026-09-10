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


def _pad4(raw: bytes, pad=b" "):
    return raw + pad * ((4 - (len(raw) % 4)) % 4)


def build_plugy_head_v26(output_path: str | Path):
    """Build PLUGY as a standalone glossy plug head with animated blinking eyes."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    meshes = []
    body = superellipsoid(.92, .72, .34, e1=4.4, e2=4.4, n_lat=42, n_lon=84)
    meshes.append(("Body", body, 0))
    prong = superellipsoid(.13, .42, .13, e1=2.2, e2=2.2, n_lat=24, n_lon=48)
    meshes.append(("ProngL", prong, 0))
    meshes.append(("ProngR", prong.copy(), 0))
    eye = tube_arc()
    meshes.append(("EyeL", eye, 1))
    meshes.append(("EyeR", eye.copy(), 1))
    rim_v = superellipsoid(.035, .50, .035, e1=2.0, e2=2.0, n_lat=16, n_lon=28)
    meshes.append(("RimCyan", rim_v, 2))
    meshes.append(("RimMagenta", rim_v.copy(), 3))
    rim_h = superellipsoid(.46, .028, .035, e1=2.0, e2=2.0, n_lat=12, n_lon=36)
    meshes.append(("RimBottomCyan", rim_h, 2))
    meshes.append(("RimBottomMagenta", rim_h.copy(), 3))

    materials = [
        {
            "name": "PLUGY Pearl White",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.965, .975, 1.0, 1.0],
                "metallicFactor": .14,
                "roughnessFactor": .16,
            },
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": .82, "clearcoatRoughnessFactor": .07},
                "KHR_materials_specular": {"specularFactor": .95, "specularColorFactor": [1.0, 1.0, 1.0]},
            },
        },
        {
            "name": "PLUGY Deep Blue Eyes",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.025, .12, .62, 1.0],
                "metallicFactor": .20,
                "roughnessFactor": .12,
            },
            "emissiveFactor": [.02, .09, .36],
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": .75, "clearcoatRoughnessFactor": .06},
                "KHR_materials_emissive_strength": {"emissiveStrength": 1.35},
            },
        },
        {
            "name": "Cyan Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.12, .90, 1.0, .72],
                "metallicFactor": 0.0,
                "roughnessFactor": .25,
            },
            "emissiveFactor": [.08, .72, .95],
            "alphaMode": "BLEND",
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 1.6}},
        },
        {
            "name": "Magenta Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.92, .18, 1.0, .72],
                "metallicFactor": 0.0,
                "roughnessFactor": .24,
            },
            "emissiveFactor": [.70, .08, .86],
            "alphaMode": "BLEND",
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 1.55}},
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
        {"name": "PLUGY_HeadRig", "children": [2, 3, 4, 5, 6, 7, 8, 9, 10]},
        {"name": "Body", "mesh": 0},
        {"name": "Prong_L", "mesh": 1, "translation": [-.39, .97, -.03], "rotation": [0.0, 0.0, -.035, .9994]},
        {"name": "Prong_R", "mesh": 2, "translation": [.39, .97, -.03], "rotation": [0.0, 0.0, .035, .9994]},
        {"name": "Eye_L", "mesh": 3, "translation": [-.34, .02, .345]},
        {"name": "Eye_R", "mesh": 4, "translation": [.34, .02, .345]},
        {"name": "Rim_Cyan", "mesh": 5, "translation": [-.915, -.02, .29]},
        {"name": "Rim_Magenta", "mesh": 6, "translation": [.915, -.02, .29]},
        {"name": "Rim_Bottom_Cyan", "mesh": 7, "translation": [-.45, -.715, .29]},
        {"name": "Rim_Bottom_Magenta", "mesh": 8, "translation": [.45, -.715, .29]},
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

    animations = [{
        "name": "IdleBlink",
        "samplers": [
            {"input": head_time_idx, "output": head_rot_idx, "interpolation": "LINEAR"},
            {"input": head_time_idx, "output": head_pos_idx, "interpolation": "LINEAR"},
            {"input": blink_time_idx, "output": blink_scale_idx, "interpolation": "LINEAR"},
            {"input": blink_time_idx, "output": blink_scale_idx, "interpolation": "LINEAR"},
        ],
        "channels": [
            {"sampler": 0, "target": {"node": 1, "path": "rotation"}},
            {"sampler": 1, "target": {"node": 1, "path": "translation"}},
            {"sampler": 2, "target": {"node": 5, "path": "scale"}},
            {"sampler": 3, "target": {"node": 6, "path": "scale"}},
        ],
    }]

    gltf = {
        "asset": {"version": "2.0", "generator": "PLUG ART · PLUGY Head V26"},
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
    }


if __name__ == "__main__":
    print(build_plugy_head_v26(Path(__file__).resolve().parent / "static" / "plugy_head_v26.glb"))
