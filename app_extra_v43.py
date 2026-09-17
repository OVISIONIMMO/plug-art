from pathlib import Path
from fastapi import Request
import hashlib,re
import app_extra_v42 as v42
from build_plugy_v56_head import build_plugy_v56_head
app=v42.app;app.version="56.0";BASE=Path(__file__).resolve().parent;GLB=BASE/"static"/"plugy.glb";INDEX=BASE/"static"/"index.html"
result=build_plugy_v56_head(GLB);raw=GLB.read_bytes();digest=hashlib.sha256(raw).hexdigest()
if INDEX.exists():
 page=INDEX.read_text(encoding="utf-8")
 remove_names=("plugy_glb_runtime_v20.js","studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js","studio_v44_ai_director.js","studio_v44_editor.js","studio_v44_editor_bridge.js","studio_v44_pro.js","studio_v44_canvas.js","studio_v44_export.js","studio_v44_layers.js","studio_v44_batch_export.js","studio_v45_clean_ui.js","studio_v45_context_actions.js","plugy_v51_force.js","plugy_v52_force.js","plugy_v53_force.js","plugy_v54_immersive.js","plugy_v55_dock.js","plugy_v56_integrated.js")
 for name in remove_names: page=re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
 active=("studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js","studio_v44_ai_director.js","studio_v44_editor.js","studio_v44_editor_bridge.js","studio_v44_pro.js","studio_v44_canvas.js","studio_v44_export.js","studio_v44_layers.js","studio_v44_batch_export.js","studio_v45_clean_ui.js","studio_v45_context_actions.js","plugy_v56_integrated.js")
 scripts='\n'.join(f'<script defer src="/static/{name}?v=56.20260917.1"></script>' for name in active);page=page.replace("</body>",scripts+"\n</body>",1);INDEX.write_text(page,encoding="utf-8")
print(f"PLUGY_V56_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(result.get('animations',[]))} design={result.get('design')} body={result.get('body')} sha256={digest}",flush=True);print("PLUG_ART_STUDIO_V56_READY plugy=head_only latest_visual=on direct_hero=on bubble=off duplicate=off immersive_motion=on",flush=True)
@app.middleware("http")
async def v56_no_cache(request:Request,call_next):
 response=await call_next(request)
 if request.url.path in ("/","/index.html","/static/plugy.glb") or "plugy_v56_integrated" in request.url.path or "studio_v44_" in request.url.path or "studio_v45_" in request.url.path: response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0";response.headers["Pragma"]="no-cache";response.headers["Expires"]="0"
 return response
@app.get("/api/v43/status")
def v43_status():
 current=GLB.read_bytes() if GLB.exists() else b"";page=INDEX.read_text(encoding="utf-8") if INDEX.exists() else "";return {"ok":bool(current and current[:4]==b"glTF"),"version":"56.0","plugy":"latest-pearl-pink-violet-head-only","design":result.get("design"),"body":False,"bytes":len(current),"sha256":hashlib.sha256(current).hexdigest() if current else "","nodes":result.get("nodes",0),"animations":result.get("animations",[]),"direct_hero_integration":"plugy_v56_integrated.js" in page,"bubble":False,"duplicate":False,"immersive_motion":True,"path":"/static/plugy.glb"}
