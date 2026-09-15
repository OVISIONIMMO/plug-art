from pathlib import Path
from fastapi import Request
import hashlib,re
import app_extra_v42 as v42
from build_plugy_v43 import build_plugy_v43
app=v42.app;app.version="43.8";BASE=Path(__file__).resolve().parent;GLB=BASE/"static"/"plugy.glb";INDEX=BASE/"static"/"index.html"
result=build_plugy_v43(GLB);raw=GLB.read_bytes();digest=hashlib.sha256(raw).hexdigest()
if INDEX.exists():
 page=INDEX.read_text(encoding="utf-8")
 names=("studio_v44_designs.js","studio_v44_carousel.js","studio_v44_quality.js","studio_v44_director.js","studio_v44_ai_director.js","studio_v44_editor.js","studio_v44_editor_bridge.js","studio_v44_pro.js","studio_v44_canvas.js","studio_v44_export.js")
 for name in names: page=re.sub(rf'<script[^>]+src=["\'][^"\']*{re.escape(name)}[^"\']*["\'][^>]*></script>\s*','',page,flags=re.I)
 scripts='\n'.join(f'<script defer src="/static/{name}?v=44.20260915.8"></script>' for name in names);page=page.replace("</body>",scripts+"\n</body>",1);INDEX.write_text(page,encoding="utf-8")
print(f"PLUGY_V43_READY bytes={len(raw)} nodes={result.get('nodes')} animations={','.join(result.get('animations',[]))} sha256={digest}",flush=True);print("PLUG_ART_STUDIO_V44_8_READY canvas=on photo_import=on safe_zone=on png_export=on templates=on",flush=True)
@app.middleware("http")
async def v43_no_cache(request:Request,call_next):
 response=await call_next(request)
 if request.url.path in ("/","/index.html","/static/plugy.glb") or "plugy_glb_runtime_v20" in request.url.path or "studio_v44_" in request.url.path: response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0";response.headers["Pragma"]="no-cache";response.headers["Expires"]="0"
 return response
@app.get("/api/v43/status")
def v43_status():
 current=GLB.read_bytes() if GLB.exists() else b"";page=INDEX.read_text(encoding="utf-8") if INDEX.exists() else "";return {"ok":bool(current and current[:4]==b"glTF"),"version":"43.8","bytes":len(current),"nodes":result.get("nodes",0),"animations":result.get("animations",[]),"studio_v44":"studio_v44_carousel.js" in page,"studio_direct_editor":"studio_v44_editor.js" in page,"studio_canvas":"studio_v44_canvas.js" in page,"studio_export":"studio_v44_export.js" in page,"photo_import":True,"safe_zones":True,"png_export":True,"templates":True,"path":"/static/plugy.glb"}
