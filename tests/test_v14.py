from pathlib import Path


def test_legacy_v14_asset_is_kept_for_compatibility():
    css_path = Path('static/glass_v14.css')
    assert css_path.exists()
    css = css_path.read_text(encoding='utf-8')
    assert '--v14-bubble' in css
    assert 'backdrop-filter:blur' in css
    assert '.header' in css
    assert '.cat' in css
    assert '.thumb' in css


def test_v14_is_not_the_active_runtime_theme():
    runtime = Path('app_extra_v15.py').read_text(encoding='utf-8')
    assert 'glass_v15.css?v=15.20260909.1' in runtime
    assert 'maximum-transparent-bubble' in runtime
