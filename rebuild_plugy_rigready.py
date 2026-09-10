import hashlib
import json
import math
import struct
from pathlib import Path

import numpy as np

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
SOURCE_SHA256 = "f8438dea4931c3324854575b9ce97c7cb2747e5ae5eaa1bc34941aa219ac0f70"
TARGET_SHA256 = "834a9621418173173d391c33dc1c5785138a05fcacf43606f0a358a428be9a37"
TARGET_SIZE = 414024


def read_glb(path: Path):
    raw = path.read_bytes()
    magic, ver, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or ver != 2 or total != len(raw):
        raise ValueError("GLB source invalide")
    off = 12
    js = None
    bin_data = bytearray()
    while off < total:
        ln, typ = struct.unpack_from("<II", raw, off)
        off += 8
        chunk = raw[off : off + ln]
        off += ln
        if typ == JSON_CHUNK:
            js = json.loads(chunk.decode("utf-8").rstrip(" \t\r\n\x00"))
        elif typ == BIN_CHUNK:
            bin_data = bytearray(chunk)
    if js is None:
        raise ValueError("Chunk JSON glTF absent")
    return js, bin_data


def write_glb(path: Path, js, bin_data):
    js_bytes = json.dumps(js, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(js_bytes) % 4:
        js_bytes += b" "
    bin_bytes = bytes(bin_data)
    while len(bin_bytes) % 4:
        bin_bytes += b"\x00"
    total = 12 + 8 + len(js_bytes) + (8 + len(bin_bytes) if bin_bytes else 0)
    out = bytearray(struct.pack("<4sII", b"glTF", 2, total))
    out += struct.pack("<II", len(js_bytes), JSON_CHUNK) + js_bytes
    if bin_bytes:
        out += struct.pack("<II", len(bin_bytes), BIN_CHUNK) + bin_bytes
    path.write_bytes(out)


def accessor_array(js, bin_data, accessor_idx):
    acc = js["accessors"][accessor_idx]
    bv = js["bufferViews"][acc["bufferView"]]
    if acc["componentType"] != 5126:
        raise ValueError("Seuls les accessors FLOAT sont supportés")
    dims = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    count = acc["count"]
    stride = bv.get("byteStride", dims * 4)
    start = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    arr = np.empty((count, dims), dtype=np.float32)
    for i in range(count):
        arr[i] = np.frombuffer(bin_data, dtype="<f4", count=dims, offset=start + i * stride)
    return arr, start, stride, acc


def write_accessor_array(bin_data, start, stride, arr):
    raw = memoryview(bin_data)
    dims = arr.shape[1]
    for i, row in enumerate(arr.astype("<f4", copy=False)):
        raw[start + i * stride : start + i * stride + dims * 4] = row.tobytes()


def mesh_position_accessor(js, mesh_idx):
    primitives = js["meshes"][mesh_idx].get("primitives", [])
    if len(primitives) != 1:
        raise ValueError("Une primitive par mesh est attendue pour PLUGY")
    return primitives[0]["attributes"]["POSITION"]


def shift_mesh(js, bin_data, mesh_idx, pivot):
    accessor_idx = mesh_position_accessor(js, mesh_idx)
    arr, start, stride, acc = accessor_array(js, bin_data, accessor_idx)
    arr = arr - np.asarray(pivot, dtype=np.float32)
    write_accessor_array(bin_data, start, stride, arr)
    acc["min"] = arr.min(axis=0).astype(float).tolist()
    acc["max"] = arr.max(axis=0).astype(float).tolist()


def quat_euler(rx=0, ry=0, rz=0):
    cx, sx = math.cos(rx / 2), math.sin(rx / 2)
    cy, sy = math.cos(ry / 2), math.sin(ry / 2)
    cz, sz = math.cos(rz / 2), math.sin(rz / 2)
    w = cx * cy * cz + sx * sy * sz
    x = sx * cy * cz - cx * sy * sz
    y = cx * sy * cz + sx * cy * sz
    z = cx * cy * sz - sx * sy * cz
    return [x, y, z, w]


def append_f32(js, bin_data, values, typ):
    arr = np.asarray(values, dtype="<f4")
    count = arr.shape[0]
    while len(bin_data) % 4:
        bin_data += b"\x00"
    offset = len(bin_data)
    payload = arr.tobytes()
    bin_data += payload
    js.setdefault("bufferViews", []).append({"buffer": 0, "byteOffset": offset, "byteLength": len(payload)})
    bv_idx = len(js["bufferViews"]) - 1
    acc = {"bufferView": bv_idx, "componentType": 5126, "count": count, "type": typ}
    if typ == "SCALAR":
        acc["min"] = [float(arr.min())]
        acc["max"] = [float(arr.max())]
    js.setdefault("accessors", []).append(acc)
    return len(js["accessors"]) - 1


def rebuild_plugy_rigready(src: Path, dst: Path):
    src = Path(src)
    dst = Path(dst)
    source_raw = src.read_bytes()
    source_sha = hashlib.sha256(source_raw).hexdigest()
    if source_sha != SOURCE_SHA256:
        raise ValueError(f"Source PLUGY inattendue: {source_sha}")

    js, bin_data = read_glb(src)
    name_to_node = {node.get("name"): i for i, node in enumerate(js["nodes"])}

    torso_pivot = np.array([0.0, 1.40, 0.0], dtype=np.float32)
    head_pivot_abs = np.array([0.0, 2.65, 0.0], dtype=np.float32)
    arm_l_pivot_abs = np.array([-0.58, 2.34, 0.0], dtype=np.float32)
    arm_r_pivot_abs = np.array([0.58, 2.34, 0.0], dtype=np.float32)
    leg_l_pivot_abs = np.array([-0.31, 1.42, 0.0], dtype=np.float32)
    leg_r_pivot_abs = np.array([0.31, 1.42, 0.0], dtype=np.float32)

    parts = {
        "torso": ["Body", "Blue_Accents", "Chest_PLUG"],
        "head": ["Head", "Head_BackShell", "Prong_L", "Prong_L_GlowRing", "Prong_R", "Prong_R_GlowRing", "Eyes", "Head_SideLight_L", "Head_SideLight_R"],
        "arm_l": ["Arm_L", "Arm_L_Cuff", "Arm_L_Hand"],
        "arm_r": ["Arm_R", "Arm_R_Cuff", "Arm_R_Hand"],
        "leg_l": ["Leg_L", "Leg_L_Shoe", "Leg_L_Sole", "Leg_L_ShoeAccent"],
        "leg_r": ["Leg_R", "Leg_R_Shoe", "Leg_R_Sole", "Leg_R_ShoeAccent"],
    }
    pivots = {
        "torso": torso_pivot,
        "head": head_pivot_abs,
        "arm_l": arm_l_pivot_abs,
        "arm_r": arm_r_pivot_abs,
        "leg_l": leg_l_pivot_abs,
        "leg_r": leg_r_pivot_abs,
    }
    for group, names in parts.items():
        pivot = pivots[group]
        for name in names:
            node_idx = name_to_node[name]
            shift_mesh(js, bin_data, js["nodes"][node_idx]["mesh"], pivot)

    nodes = js["nodes"]

    def add_group(name, translation, children):
        nodes.append({"name": name, "translation": [float(x) for x in translation], "children": children})
        return len(nodes) - 1

    head_idx = add_group("Rig_Head", head_pivot_abs - torso_pivot, [name_to_node[x] for x in parts["head"]])
    arm_l_idx = add_group("Rig_Arm_L", arm_l_pivot_abs - torso_pivot, [name_to_node[x] for x in parts["arm_l"]])
    arm_r_idx = add_group("Rig_Arm_R", arm_r_pivot_abs - torso_pivot, [name_to_node[x] for x in parts["arm_r"]])
    torso_idx = add_group("Rig_Torso", torso_pivot, [name_to_node[x] for x in parts["torso"]] + [head_idx, arm_l_idx, arm_r_idx])
    leg_l_idx = add_group("Rig_Leg_L", leg_l_pivot_abs, [name_to_node[x] for x in parts["leg_l"]])
    leg_r_idx = add_group("Rig_Leg_R", leg_r_pivot_abs, [name_to_node[x] for x in parts["leg_r"]])
    js["nodes"][name_to_node["world"]]["children"] = [torso_idx, leg_l_idx, leg_r_idx]

    times = [0.0, 1.5, 3.0, 4.5, 6.0]
    time_acc = append_f32(js, bin_data, times, "SCALAR")
    channels = []
    samplers = []

    def add_rot_channel(node_idx, quats):
        out_acc = append_f32(js, bin_data, quats, "VEC4")
        samplers.append({"input": time_acc, "output": out_acc, "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": node_idx, "path": "rotation"}})

    def add_trans_channel(node_idx, vals):
        out_acc = append_f32(js, bin_data, vals, "VEC3")
        samplers.append({"input": time_acc, "output": out_acc, "interpolation": "LINEAR"})
        channels.append({"sampler": len(samplers) - 1, "target": {"node": node_idx, "path": "translation"}})

    add_rot_channel(torso_idx, [
        quat_euler(0, 0, math.radians(-1.0)),
        quat_euler(math.radians(0.7), 0, math.radians(1.2)),
        quat_euler(0, 0, math.radians(-0.6)),
        quat_euler(math.radians(-0.5), 0, math.radians(1.0)),
        quat_euler(0, 0, math.radians(-1.0)),
    ])
    add_rot_channel(head_idx, [
        quat_euler(0, math.radians(-2.5), math.radians(0.5)),
        quat_euler(math.radians(1.2), math.radians(2.5), math.radians(-1.0)),
        quat_euler(0, 0, math.radians(0.8)),
        quat_euler(math.radians(-0.8), math.radians(-2.0), math.radians(-0.5)),
        quat_euler(0, math.radians(-2.5), math.radians(0.5)),
    ])
    add_rot_channel(arm_l_idx, [
        quat_euler(math.radians(1), 0, math.radians(-3.0)),
        quat_euler(math.radians(-2), 0, math.radians(2.5)),
        quat_euler(math.radians(1), 0, math.radians(-2.0)),
        quat_euler(math.radians(-1), 0, math.radians(2.0)),
        quat_euler(math.radians(1), 0, math.radians(-3.0)),
    ])
    add_rot_channel(arm_r_idx, [
        quat_euler(math.radians(-1), 0, math.radians(3.0)),
        quat_euler(math.radians(2), 0, math.radians(-2.5)),
        quat_euler(math.radians(-1), 0, math.radians(2.0)),
        quat_euler(math.radians(1), 0, math.radians(-2.0)),
        quat_euler(math.radians(-1), 0, math.radians(3.0)),
    ])
    base = torso_pivot
    add_trans_channel(torso_idx, [
        base.tolist(),
        (base + [0, 0.018, 0]).tolist(),
        base.tolist(),
        (base + [0, 0.012, 0]).tolist(),
        base.tolist(),
    ])

    js["animations"] = [{"name": "Idle", "samplers": samplers, "channels": channels}]
    js["asset"]["generator"] = "OpenAI PLUGY rigid-rig rebuild V2"
    js["asset"]["extras"] = {
        "plugyVersion": "2-rigready",
        "sourceSha256": source_sha,
        "notes": "Rigid articulated hierarchy with local pivots and Idle animation; geometry/materials preserved.",
    }
    js["buffers"][0]["byteLength"] = len(bin_data)
    write_glb(dst, js, bin_data)

    raw = dst.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) != TARGET_SIZE or digest != TARGET_SHA256:
        raise RuntimeError(f"Rebuild PLUGY non déterministe: bytes={len(raw)} sha={digest}")
    return {"path": str(dst), "bytes": len(raw), "sha256": digest, "nodes": len(js["nodes"]), "meshes": len(js["meshes"]), "animations": [a.get("name") for a in js.get("animations", [])]}
