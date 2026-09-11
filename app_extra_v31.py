import asyncio
from fastapi import Request
from fastapi.responses import JSONResponse
import app_extra_v30 as v30

app = v30.app
app.version = "31.0"

@app.middleware("http")
async def v31_fast_legacy_plugy(request: Request, call_next):
    if request.url.path == "/api/plugy" and request.method == "POST":
        try:
            body = await request.json()
            payload = {
                "message": str((body or {}).get("message") or ""),
                "page": str((body or {}).get("page") or "content"),
                "mode": str((body or {}).get("mode") or "fast"),
            }
            result = await asyncio.to_thread(v30.plugy_v30, payload)
            return JSONResponse(result, headers={"Cache-Control": "no-store", "X-PLUGY-Runtime": "v31-fast"})
        except Exception as exc:
            return JSONResponse({"detail": f"PLUGY indisponible: {str(exc)[:180]}"}, status_code=503)
    return await call_next(request)

@app.get("/api/v31/status")
def v31_status():
    return {
        "ok": True,
        "version": "31.0",
        "plugy_runtime": "v30-fast-contextual",
        "legacy_api_accelerated": True,
        "fast_model": v30.FAST_MODEL,
        "deep_model": v30.DEEP_MODEL,
        "free_roaming": True,
        "image_endpoint": "/api/v30/content/image",
        "image_model": v30.DEFAULT_IMAGE_MODEL,
    }

print(f"PLUG_ART_V31_READY fast_model={v30.FAST_MODEL} image_model={v30.DEFAULT_IMAGE_MODEL}", flush=True)
