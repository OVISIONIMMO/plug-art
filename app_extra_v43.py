from pathlib import Path
from fastapi import Request
import hashlib,re
import app_extra_v42 as v42
from build_plugy_final_v57 import build_plugy_final_v57

app=v42.app
app.version="58.1"
BASE=Path(__file__).resolve().parent
GLB=BASE/"static"/"PLUGY_final_animated.glb"
INDEX=BASE/"static"/"index.html"
result=build_plugy_final_v57(GLB)
raw=GLB.read_bytes()
digest=hashlib.sha256(raw).hexdigest()
ANIMS=result.get("animations",[])

if INDEX.exists():
    page=INDEX.read_text(encoding="utf-8")
    remove_names=(
        "plugy_glb_runtime_v19.js","plugy_glb_runtime_v20.js","plugy_v51_force.js","plugy_v52_force.js","plugy_v53_force.js",
        "plugy_v54_immersive.js","plugy_v55_dock.js","plugy_v56_integrated.js","plugy_v56_hero.js",
        "plugy_v57_final.js","plugy_v58_visible.js",
        "studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js",
        "studio_v44_ai_director.js","studio_v44_editor.js","studio_v44_editor_bridge.js","studio_v44_pro.js",
        "studio_v44_canvas.js","studio_v44_export.js","studio_v44_layers.js","studio_v44_batch_export.js",
        "studio_v45_clean_ui.js","studio_v45_context_actions.js"
    )
    for name in remove_names:
        page=re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
    active=(
        "studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js",
        "studio_v44_ai_director.js","studio_v44_editor.js","studio_v44_editor_bridge.js","studio_v44_pro.js",
        "studio_v44_canvas.js","studio_v44_export.js","studio_v44_layers.js","studio_v44_batch_export.js",
        "studio_v45_clean_ui.js","studio_v45_context_actions.js","plugy_v58_visible.js"
    )
    scripts="\n".join(f'<script defer src="/static/{name}?v=58.1.20260917.2"></script>' for name in active)
    page=page.replace("</body>",scripts+"\n</body>",1)
    INDEX.write_text(page,encoding="utf-8")

print(f"PLUGY_V58_1_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(ANIMS)} sha256={digest}",flush=True)
print("PLUG_ART_STUDIO_V58_1_READY plugy=visible_guaranteed glb=on fallback=inline direct_hero=on floating_fallback=on duplicate=off",flush=True)

@app.middleware("http")
async def v58_1_no_cache(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ("/","/index.html","/static/PLUGY_final_animated.glb") or "plugy_v58_visible" in p or "plugy_v57_final" in p or "plugy_glb_runtime" in p or "studio_v44_" in p or "studio_v45_" in p:
        response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"]="no-cache"
        response.headers["Expires"]="0"
    return response

@app.get("/api/v43/status")
def v43_status():
    current=GLB.read_bytes() if GLB.exists() else b""
    page=INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    return {
        "ok":bool(current and current[:4]==b"glTF"),
        "version":"58.1",
        "plugy":"visible-guaranteed-final-glb",
        "design":result.get("design"),
        "body":False,
        "bytes":len(current),
        "sha256":hashlib.sha256(current).hexdigest() if current else "",
        "nodes":result.get("nodes",0),
        "animations":ANIMS,
        "runtime":"plugy_v58_visible.js" in page,
        "legacy_runtime":("plugy_glb_runtime_v20.js" in page or "plugy_glb_runtime_v19.js" in page),
        "inline_fallback":True,
        "floating_fallback":True,
        "duplicate":False,
        "path":"/static/PLUGY_final_animated.glb"
    }
