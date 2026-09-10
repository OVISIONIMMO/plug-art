from pathlib import Path
import py_compile

ROOT = Path(__file__).resolve().parents[1]


def test_v25_python_compiles():
    py_compile.compile(str(ROOT / "app_extra_v25.py"), doraise=True)


def test_v25_assets_exist_and_have_guards():
    css = (ROOT / "static" / "site_v25.css").read_text(encoding="utf-8")
    js = (ROOT / "static" / "site_v25.js").read_text(encoding="utf-8")
    assert "body:not(.v25-ready) #explorer>.hero" in css
    assert "v25-model-ready" in css
    assert "window.__PLUG_V25_BOOT_OK" in js
    assert "loadModelViewer" in js
    assert "3500" in js
    assert "/static/plugy.glb?v=25.20260910.1" in js
    assert "setInterval(()=>{mirrorBot();syncPage()},650)" in js


def test_v25_cleans_conflicting_plugy_runtimes():
    app = (ROOT / "app_extra_v25.py").read_text(encoding="utf-8")
    assert "plugy_glb_runtime_v19" in app
    assert "plugy_glb_runtime_v20" in app
    assert "plugy_experience_v18" in app
    assert "site_v24" in app
    assert "site_v25.css?v=25.20260910.1" in app
    assert "site_v25.js?v=25.20260910.1" in app
