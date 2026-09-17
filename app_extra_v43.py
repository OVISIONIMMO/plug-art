from pathlib import Path
from fastapi import Request
import hashlib,re
import app_extra_v42 as v42

app=v42.app
app.version="57.0"
BASE=Path(__file__).resolve().parent
GLB=BASE/"static"/"PLUGY_final_animated.glb"
INDEX=BASE/"static"/"index.html"
ANIMS=["Idle","SoftTurn","Think","Curious","Present","Bounce","Happy","Attentive","Wave","Dance","Blink"]

raw=GLB.read_bytes() if GLB.exists() else b""
digest=hashlib.sha256(raw).hexdigest() if raw else ""

if INDEX.exists():
    page=INDEX.read_text(encoding="utf-8")
    remove_names=(
        "plugy_glb_runtime_v20.js","plugy_v51_force.js","plugy_v52_force.js","plugy_v53_force.js",
        "plugy_v54_immersive.js","plugy_v55_dock.js","plugy_v56_integrated.js","plugy_v56_hero.js",
        "plugy_v57_final.js",
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
        "studio_v45_clean_ui.js","studio_v45_context_actions.js","plugy_v57_final.js"
    )
    scripts="\n".join(f'<script defer src="/static/{name}?v=57.20260917.1"></script>' for name in active)
    page=page.replace("</body>",scripts+"\n</body>",1)
    INDEX.write_text(page,encoding="utf-8")

print(f"PLUGY_V57_READY asset=PLUGY_final_animated.glb bytes={len(raw)} animations={','.join(ANIMS)} sha256={digest}",flush=True)
print("PLUG_ART_STUDIO_V57_READY plugy=final_glb direct_hero=on bubble=off duplicate=off blink=on intelligent_motion=on",flush=True)

@app.middleware("http")
async def v57_no_cache(request:Request,call_next):
    response=await call_next(request)
    p=request.url.path
    if p in ("/","/index.html","/static/PLUGY_final_animated.glb") or "plugy_v57_final" in p or "studio_v44_" in p or "studio_v45_" in p:
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
        "version":"57.0",
        "plugy":"final-animated-glb",
        "body":False,
        "bytes":len(current),
        "sha256":hashlib.sha256(current).hexdigest() if current else "",
        "animations":ANIMS,
        "direct_hero_integration":"plugy_v57_final.js" in page,
        "bubble":False,
        "duplicate":False,
        "blink":True,
        "intelligent_motion":True,
        "path":"/static/PLUGY_final_animated.glb"
    }
