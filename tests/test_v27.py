from pathlib import Path
import json
import py_compile
import struct

from build_plugy_head_v26 import build_plugy_head_v26

ROOT = Path(__file__).resolve().parents[1]


def _glb_json(raw: bytes):
    assert raw[:4] == b"glTF"
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    assert magic == b"glTF"
    assert version == 2
    assert total == len(raw)
    json_len, json_type = struct.unpack_from("<I4s", raw, 12)
    assert json_type == b"JSON"
    return json.loads(raw[20 : 20 + json_len].decode("utf-8").rstrip(" \x00"))


def test_v26_v27_python_compiles():
    for name in ("build_plugy_head_v26.py", "app_extra_v26.py", "app_extra_v27.py"):
        py_compile.compile(str(ROOT / name), doraise=True)


def test_plugy_v26_is_head_only_glb_with_blink(tmp_path):
    target = tmp_path / "plugy-head.glb"
    result = build_plugy_head_v26(target)
    raw = target.read_bytes()
    doc = _glb_json(raw)
    assert len(raw) > 300_000
    assert result["animation"] == "IdleBlink"
    assert len(doc.get("meshes", [])) == 9
    names = {n.get("name") for n in doc.get("nodes", [])}
    assert {"PLUGY_HeadRig", "Body", "Prong_L", "Prong_R", "Eye_L", "Eye_R"} <= names
    animation_names = {a.get("name") for a in doc.get("animations", [])}
    assert {"IdleBlink", "Curious", "React", "Think"} <= animation_names
    assert not any("Torso" in str(n) or "Arm" in str(n) or "Leg" in str(n) for n in names)
    mats = doc.get("materials", [])
    assert any("KHR_materials_clearcoat" in (m.get("extensions") or {}) for m in mats)
    assert any("emissiveFactor" in m for m in mats)


def test_v26_frontend_uses_head_and_rotatable_viewer():
    js = (ROOT / "static" / "site_v26.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "site_v26.css").read_text(encoding="utf-8")
    assert "/static/plugy_head_v26.glb" in js
    assert "camera-controls" in js
    assert "auto-rotate" in js
    assert "IdleBlink" in js
    assert "v26-head-only" in css
    assert "v25-fallback-body" in css


def test_v26_studio_is_compact_and_direct_image_enabled():
    js = (ROOT / "static" / "studio_v26.js").read_text(encoding="utf-8")
    css = (ROOT / "static" / "studio_v26.css").read_text(encoding="utf-8")
    app = (ROOT / "app_extra_v26.py").read_text(encoding="utf-8")
    assert "Réglages avancés" in js
    assert "data-v26-tab=\"visual\"" in js
    assert "/api/v26/content/image" in js
    assert "/api/content/visual" in js
    assert ".v26-advanced" in css
    assert "gpt-image-2.5-sunburst" in app
    assert "gpt-image-2.5-flare" in app
    assert "/api/v26/content/generated/" in app


def test_v27_removes_legacy_runtime_layers():
    app = (ROOT / "app_extra_v27.py").read_text(encoding="utf-8")
    for old in ("plugy_experience_v18.js", "plugy_glb_runtime_v20.js", "studio_v20.js", "studio_v23.js"):
        assert old in app
    assert "re.escape(filename)" in app
    assert "v26-head-only-clean-runtime" in app
