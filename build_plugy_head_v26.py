from __future__ import annotations
from pathlib import Path
import json
import math
import struct

import numpy as np
import trimesh


def superellipsoid(a, b, c, e1=4.0, e2=4.0, n_lat=48, n_lon=96):
    """Rounded-box mesh. Y is the vertical axis."""
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


def tube_arc(width=.40, height=.145, radius=.050, segments=42, sides=18):
    """Closed smiling-eye arc with a round polished cross-section."""
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


def _quat_xyz(rx, ry, rz):
    cx, sx = math.cos(rx / 2), math.sin(rx / 2)
    cy, sy = math.cos(ry / 2), math.sin(ry / 2)
    cz, sz = math.cos(rz / 2), math.sin(rz / 2)
    return [
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz,
    ]


def build_plugy_head_v26(output_path: str | Path):
    """Build the production PLUGY head: refined geometry, reflections and expressive animation clips."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    meshes = []
    # Softer, thinner silhouette: closer to the visual identity and cleaner from side angles.
    body = superellipsoid(.94, .705, .295, e1=5.15, e2=5.05, n_lat=48, n_lon=96)
    meshes.append(("Body", body, 0))
    prong = superellipsoid(.118, .405, .108, e1=2.55, e2=2.55, n_lat=28, n_lon=52)
    meshes.append(("ProngL", prong, 0))
    meshes.append(("ProngR", prong.copy(), 0))
    eye = tube_arc()
    meshes.append(("EyeL", eye, 1))
    meshes.append(("EyeR", eye.copy(), 1))

    # Edge reflections are actual emissive meshes so the cyan/pink identity remains visible
    # without baking a background or a square poster around the mascot.
    rim_v = superellipsoid(.030, .485, .022, e1=2.1, e2=2.1, n_lat=18, n_lon=30)
    meshes.append(("RimCyan", rim_v, 2))
    meshes.append(("RimMagenta", rim_v.copy(), 3))
    rim_h = superellipsoid(.455, .026, .022, e1=2.1, e2=2.1, n_lat=14, n_lon=40)
    meshes.append(("RimBottomCyan", rim_h, 2))
    meshes.append(("RimBottomMagenta", rim_h.copy(), 3))

    materials = [
        {
            "name": "PLUGY Pearl White",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.975, .982, 1.0, 1.0],
                "metallicFactor": .08,
                "roughnessFactor": .115,
            },
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": .94, "clearcoatRoughnessFactor": .045},
                "KHR_materials_specular": {"specularFactor": .96, "specularColorFactor": [1.0, 1.0, 1.0]},
            },
        },
        {
            "name": "PLUGY Deep Blue Eyes",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.018, .075, .57, 1.0],
                "metallicFactor": .16,
                "roughnessFactor": .09,
            },
            "emissiveFactor": [.018, .055, .30],
            "extensions": {
                "KHR_materials_clearcoat": {"clearcoatFactor": .88, "clearcoatRoughnessFactor": .04},
                "KHR_materials_emissive_strength": {"emissiveStrength": 1.55},
            },
        },
        {
            "name": "Cyan Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.08, .92, 1.0, .62],
                "metallicFactor": 0.0,
                "roughnessFactor": .20,
            },
            "emissiveFactor": [.06, .74, .98],
            "alphaMode": "BLEND",
            "doubleSided": True,
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 1.8}},
        },
        {
            "name": "Magenta Reflection",
            "pbrMetallicRoughness": {
                "baseColorFactor": [.98, .16, .90, .62],
                "metallicFactor": 0.0,
                "roughnessFactor": .20,
            },
            "emissiveFactor": [.80, .055, .78],
            "alphaMode": "BLEND",
            "doubleSided": True,
            "extensions": {"KHR_materials_emissive_strength": {"emissiveStrength": 1.72}},
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
        accessor = {"bufferView": view_index, "componentType": component_type, "count": len(arr), "type": type_name}
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
            "primitives": [{"attributes": {"POSITION": pos_idx, "NORMAL": norm_idx}, "indices": ind_idx, "material": material_idx, "mode": 4}],
        })

    nodes = [
        {"name": "PLUGY_Root", "children": [1]},
        {"name": "PLUGY_HeadRig", "children": [2, 3, 4, 5, 6, 7, 8, 9, 10]},
        {"name": "Body", "mesh": 0},
        {"name": "Prong_L", "mesh": 1, "translation": [-.395, .955, -.018], "rotation": [0.0, 0.0, -.030, .99955]},
        {"name": "Prong_R", "mesh": 2, "translation": [.395, .955, -.018], "rotation": [0.0, 0.0, .030, .99955]},
        {"name": "Eye_L", "mesh": 3, "translation": [-.342, .018, .302]},
        {"name": "Eye_R", "mesh": 4, "translation": [.342, .018, .302]},
        {"name": "Rim_Cyan", "mesh": 5, "translation": [-.936, -.020, .252]},
        {"name": "Rim_Magenta", "mesh": 6, "translation": [.936, -.020, .252]},
        {"name": "Rim_Bottom_Cyan", "mesh": 7, "translation": [-.46, -.705, .252]},
        {"name": "Rim_Bottom_Magenta", "mesh": 8, "translation": [.46, -.705, .252]},
    ]

    animations = []

    def scalar(values):
        return append_data(np.asarray(values, dtype=np.float32), component_type=5126, type_name="SCALAR")

    def vec3(values):
        return append_data(np.asarray(values, dtype=np.float32), component_type=5126, type_name="VEC3")

    def vec4(values):
        return append_data(np.asarray(values, dtype=np.float32), component_type=5126, type_name="VEC4")

    def add_animation(name, specs):
        samplers = []
        channels = []
        for spec in specs:
            time_idx = scalar(spec["times"])
            values = spec["values"]
            path = spec["path"]
            out_idx = vec4(values) if path == "rotation" else vec3(values)
            sampler_idx = len(samplers)
            samplers.append({"input": time_idx, "output": out_idx, "interpolation": spec.get("interpolation", "LINEAR")})
            channels.append({"sampler": sampler_idx, "target": {"node": spec["node"], "path": path}})
        animations.append({"name": name, "samplers": samplers, "channels": channels})

    # Primary loop: floating, tiny personality tilts and three natural blinks.
    idle_times = [0.0, 1.8, 3.6, 5.4, 7.2]
    blink_times = [0.0, 1.56, 1.64, 1.74, 3.78, 3.86, 3.96, 6.02, 6.10, 6.20, 7.2]
    blink_values = [[1.0, .10 if i in {2, 5, 8} else 1.0, 1.0] for i in range(len(blink_times))]
    add_animation("IdleBlink", [
        {"node": 1, "path": "rotation", "times": idle_times, "values": [
            _quat_xyz(.00, .00, .00), _quat_xyz(.018, .052, -.024), _quat_xyz(-.012, -.048, .020), _quat_xyz(.012, .034, -.014), _quat_xyz(.00, .00, .00)
        ]},
        {"node": 1, "path": "translation", "times": idle_times, "values": [[0,0,0],[0,.026,.004],[0,-.005,0],[0,.020,.002],[0,0,0]]},
        {"node": 5, "path": "scale", "times": blink_times, "values": blink_values},
        {"node": 6, "path": "scale", "times": blink_times, "values": blink_values},
    ])

    # A curious lean used when the user approaches PLUGY or receives a contextual suggestion.
    curious_times = [0.0, .42, 1.35, 2.20]
    left_eye = [[1,1,1],[1,.82,1],[1,.90,1],[1,1,1]]
    right_eye = [[1,1,1],[1,.94,1],[1,.82,1],[1,1,1]]
    add_animation("Curious", [
        {"node": 1, "path": "rotation", "times": curious_times, "values": [_quat_xyz(0,0,0), _quat_xyz(-.015,.09,-.11), _quat_xyz(.006,.075,-.085), _quat_xyz(0,0,0)]},
        {"node": 1, "path": "translation", "times": curious_times, "values": [[0,0,0],[.018,.035,.012],[.012,.028,.008],[0,0,0]]},
        {"node": 5, "path": "scale", "times": curious_times, "values": left_eye},
        {"node": 6, "path": "scale", "times": curious_times, "values": right_eye},
    ])

    # Short responsive bounce for clicks / successful answers.
    react_times = [0.0, .18, .46, .82, 1.18]
    add_animation("React", [
        {"node": 1, "path": "rotation", "times": react_times, "values": [_quat_xyz(0,0,0), _quat_xyz(-.06,0,.045), _quat_xyz(.035,-.045,-.03), _quat_xyz(-.018,.025,.016), _quat_xyz(0,0,0)]},
        {"node": 1, "path": "translation", "times": react_times, "values": [[0,0,0],[0,.055,.018],[0,.010,0],[0,.030,.006],[0,0,0]]},
        {"node": 5, "path": "scale", "times": react_times, "values": [[1,1,1],[1,.72,1],[1,1,1],[1,.92,1],[1,1,1]]},
        {"node": 6, "path": "scale", "times": react_times, "values": [[1,1,1],[1,.72,1],[1,1,1],[1,.92,1],[1,1,1]]},
    ])

    # Thinking state: slower side-to-side movement and slightly narrowed eyes.
    think_times = [0.0, .8, 1.6, 2.4, 3.2]
    think_eye = [[1,.88,1],[1,.74,1],[1,.84,1],[1,.72,1],[1,.88,1]]
    add_animation("Think", [
        {"node": 1, "path": "rotation", "times": think_times, "values": [_quat_xyz(0,0,0), _quat_xyz(.018,-.065,.055), _quat_xyz(-.015,.055,-.045), _quat_xyz(.012,-.045,.038), _quat_xyz(0,0,0)]},
        {"node": 1, "path": "translation", "times": think_times, "values": [[0,0,0],[0,.018,0],[0,.004,0],[0,.016,0],[0,0,0]]},
        {"node": 5, "path": "scale", "times": think_times, "values": think_eye},
        {"node": 6, "path": "scale", "times": think_times, "values": think_eye},
    ])

    gltf = {
        "asset": {"version": "2.0", "generator": "PLUG ART · PLUGY Refined Head"},
        "scene": 0,
        "scenes": [{"name": "PLUGY", "nodes": [0]}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "animations": animations,
        "buffers": [{"byteLength": len(blob)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
        "extensionsUsed": ["KHR_materials_clearcoat", "KHR_materials_specular", "KHR_materials_emissive_strength"],
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
        "animations": [a["name"] for a in animations],
    }


if __name__ == "__main__":
    print(build_plugy_head_v26(Path(__file__).resolve().parent / "static" / "plugy_head_v26.glb"))
