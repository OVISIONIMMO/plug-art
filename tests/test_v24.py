from pathlib import Path
import py_compile

ROOT = Path(__file__).resolve().parents[1]


def test_v24_python_compiles():
    py_compile.compile(str(ROOT / "app_extra_v24.py"), doraise=True)


def test_v24_home_assets_present():
    css = (ROOT / "static" / "site_v24.css").read_text(encoding="utf-8")
    js = (ROOT / "static" / "site_v24.js").read_text(encoding="utf-8")
    assert ".v24-hero" in css
    assert ".v24-chat" in css
    assert "#v24PlugyDock" in css
    assert "v24-studio-steps" in css
    assert "/static/plugy.glb?v=24.20260910.1" in js
    assert "model-viewer" in js
    assert "pointermove" in js
    assert "data-v24-page" in js
    assert "/api/opportunities" in js


def test_v24_single_plugy_runtime():
    app = (ROOT / "app_extra_v24.py").read_text(encoding="utf-8")
    assert "single_plugy" in app
    assert "plugy_runtime_v23" in app
    assert "site_v24.css?v=24.20260910.1" in app
    assert "site_v24.js?v=24.20260910.1" in app
