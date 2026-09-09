from fastapi import HTTPException
from fastapi.responses import RedirectResponse, Response
from urllib.parse import urljoin
from html.parser import HTMLParser
from datetime import datetime
import hashlib, html, re, time

import app as core

app = core.app
app.version = "8.0"

PREVIEW_TTL_SECONDS = 60 * 60 * 24 * 7

CITY_COORDS = {
    "paris": (48.8566, 2.3522),
    "aubervilliers": (48.9123, 2.3833),
    "saint-denis": (48.9362, 2.3574),
    "pantin": (48.8966, 2.4010),
    "montreuil": (48.8638, 2.4485),
    "lyon": (45.7640, 4.8357),
    "marseille": (43.2965, 5.3698),
    "london": (51.5074, -0.1278),
    "brussels": (50.8503, 4.3517),
    "bruxelles": (50.8503, 4.3517),
    "madrid": (40.4168, -3.7038),
    "milan": (45.4642, 9.1900),
    "milano": (45.4642, 9.1900),
    "rome": (41.9028, 12.4964),
    "roma": (41.9028, 12.4964),
    "amsterdam": (52.3676, 4.9041),
    "lisbon": (38.7223, -9.1393),
    "lisbonne": (38.7223, -9.1393),
    "berlin": (52.5200, 13.4050),
    "vienna": (48.2082, 16.3738),
    "vienne": (48.2082, 16.3738),
    "zurich": (47.3769, 8.5417),
    "barcelona": (41.3874, 2.1686),
    "barcelone": (41.3874, 2.1686),
    "florence": (43.7696, 11.2558),
    "firenze": (43.7696, 11.2558),
}

class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title_parts = []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = {k.lower(): v for k, v in attrs if k}
        if tag.lower() == "meta":
            key = (attrs.get("property") or attrs.get("name") or "").lower()
            val = attrs.get("content") or ""
            if key and val and key not in self.meta:
                self.meta[key] = val.strip()
        elif tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)

def _init_preview_db():
    c = core.conn()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS source_previews(
        source_url TEXT PRIMARY KEY,
        page_title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        canonical_url TEXT DEFAULT '',
        fetched_at TEXT DEFAULT '',
        status TEXT DEFAULT 'unknown',
        http_code INTEGER,
        error TEXT DEFAULT ''
    );
    """)
    c.commit()
    c.close()

_init_preview_db()

def _safe_text(value, limit=1200):
    return re.sub(r"\s+", " ", html.unescape(str(value or ""))).strip()[:limit]

def _preview_row(url):
    c = core.conn()
    row = c.execute("SELECT * FROM source_previews WHERE source_url=?", (url,)).fetchone()
    c.close()
    return dict(row) if row else None

def _preview_fresh(row):
    if not row or not row.get("fetched_at"):
        return False
    try:
        ts = datetime.fromisoformat(row["fetched_at"]).timestamp()
        return time.time() - ts < PREVIEW_TTL_SECONDS
    except Exception:
        return False

def _extract_preview(source_url, force=False):
    cached = _preview_row(source_url)
    if cached and _preview_fresh(cached) and not force:
        return cached

    page_title = description = image_url = canonical_url = error = ""
    status = "offline"
    http_code = None
    try:
        r = core.fetch_page(source_url, 12)
        http_code = r.status_code
        if r.ok:
            status = "online"
            parser = MetaParser()
            text = r.text[:700000]
            try:
                parser.feed(text)
            except Exception:
                pass
            m = parser.meta
            page_title = _safe_text(
                m.get("og:title") or m.get("twitter:title") or " ".join(parser.title_parts),
                260,
            )
            description = _safe_text(
                m.get("og:description") or m.get("twitter:description") or m.get("description"),
                1100,
            )
            image_url = (
                m.get("og:image:secure_url")
                or m.get("og:image")
                or m.get("twitter:image")
                or m.get("twitter:image:src")
                or ""
            ).strip()
            if image_url:
                image_url = urljoin(r.url, image_url)
            canonical_match = re.search(
                r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
                text,
                re.I,
            )
            canonical_url = urljoin(r.url, canonical_match.group(1)) if canonical_match else r.url
        else:
            error = f"HTTP {r.status_code}"
    except Exception as exc:
        error = str(exc)[:240]

    now = datetime.now().isoformat(timespec="seconds")
    c = core.conn()
    c.execute(
        """INSERT INTO source_previews(
            source_url,page_title,description,image_url,canonical_url,fetched_at,status,http_code,error
        ) VALUES(?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_url) DO UPDATE SET
            page_title=excluded.page_title,
            description=excluded.description,
            image_url=excluded.image_url,
            canonical_url=excluded.canonical_url,
            fetched_at=excluded.fetched_at,
            status=excluded.status,
            http_code=excluded.http_code,
            error=excluded.error
        """,
        (source_url,page_title,description,image_url,canonical_url,now,status,http_code,error),
    )
    c.commit()
    c.close()
    return _preview_row(source_url) or {
        "source_url": source_url,
        "page_title": page_title,
        "description": description,
        "image_url": image_url,
        "canonical_url": canonical_url,
        "fetched_at": now,
        "status": status,
        "http_code": http_code,
        "error": error,
    }

def _fallback_svg(title, domain_name=""):
    title = _safe_text(title, 70) or "PLUG ART"
    domain_name = _safe_text(domain_name, 50)
    safe_title = html.escape(title)
    safe_domain = html.escape(domain_name)
    digest = hashlib.sha1((title + domain_name).encode("utf-8", "ignore")).hexdigest()
    a = f"#{digest[:6]}"
    b = f"#{digest[6:12]}"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".55" stop-color="{b}"/><stop offset="1" stop-color="#eef4ff"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="36"/></filter></defs>
    <rect width="1200" height="720" rx="48" fill="#f8fbff"/><circle cx="200" cy="170" r="230" fill="{a}" opacity=".32" filter="url(#blur)"/><circle cx="980" cy="540" r="280" fill="{b}" opacity=".30" filter="url(#blur)"/><rect x="70" y="70" width="1060" height="580" rx="38" fill="url(#g)" opacity=".17"/>
    <text x="90" y="150" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="38" fill="#101828">PLUG ART</text><text x="90" y="360" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="58" fill="#101828">{safe_title}</text><text x="90" y="430" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="#667085">{safe_domain}</text><text x="90" y="585" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#667085">Aperçu source non disponible · vignette PLUG ART</text></svg>"""

def _opportunity(oid):
    item = core.one("select * from opportunities where id=?", (oid,))
    if not item:
        raise HTTPException(404, "Opportunité introuvable")
    return item

def _exhibition(eid):
    item = core.one("select * from exhibitions where id=?", (eid,))
    if not item:
        raise HTTPException(404, "Événement introuvable")
    return item

@app.get("/api/opportunities/{oid}/details")
def opportunity_details(oid: int, refresh: bool = False):
    item = _opportunity(oid)
    preview = _extract_preview(item.get("source_url") or "", force=refresh) if item.get("source_url") else {}
    return {**item,"source_preview":preview,"detail_summary":preview.get("description") or item.get("summary") or "","thumbnail_url":preview.get("image_url") or f"/api/opportunities/{oid}/thumbnail"}

@app.get("/api/opportunities/{oid}/thumbnail")
def opportunity_thumbnail(oid: int, refresh: bool = False):
    item = _opportunity(oid)
    preview = _extract_preview(item.get("source_url") or "", force=refresh) if item.get("source_url") else {}
    image_url = (preview or {}).get("image_url")
    if image_url and image_url.startswith(("http://","https://")):
        return RedirectResponse(image_url, status_code=307)
    svg = _fallback_svg(item.get("title"), core.domain(item.get("source_url") or ""))
    return Response(svg, media_type="image/svg+xml", headers={"Cache-Control":"public, max-age=21600"})

@app.get("/api/exhibitions/{eid}/details")
def exhibition_details(eid: int, refresh: bool = False):
    item = _exhibition(eid)
    preview = _extract_preview(item.get("source_url") or "", force=refresh) if item.get("source_url") else {}
    return {**item,"source_preview":preview,"detail_summary":preview.get("description") or item.get("notes") or "","thumbnail_url":preview.get("image_url") or f"/api/exhibitions/{eid}/thumbnail"}

@app.get("/api/exhibitions/{eid}/thumbnail")
def exhibition_thumbnail(eid: int, refresh: bool = False):
    item = _exhibition(eid)
    preview = _extract_preview(item.get("source_url") or "", force=refresh) if item.get("source_url") else {}
    image_url = (preview or {}).get("image_url")
    if image_url and image_url.startswith(("http://","https://")):
        return RedirectResponse(image_url, status_code=307)
    svg = _fallback_svg(item.get("title"), core.domain(item.get("source_url") or ""))
    return Response(svg, media_type="image/svg+xml", headers={"Cache-Control":"public, max-age=21600"})

@app.get("/api/map/enhanced")
def enhanced_map():
    out = []
    for o in core.rows("""select id,title,city,country,lat,lon,deadline,fee,coalesce(radar_score,score,0) score,source_url,'opportunity' kind from opportunities where status in ('open','rolling')"""):
        lat, lon = o.get("lat"), o.get("lon")
        if lat is None or lon is None:
            coords = CITY_COORDS.get((o.get("city") or "").strip().lower())
            if coords:
                lat, lon = coords
        if lat is not None and lon is not None:
            o["lat"], o["lon"] = float(lat), float(lon)
            o["thumbnail_url"] = f"/api/opportunities/{o['id']}/thumbnail"
            out.append(o)
    for e in core.rows("""select id,title,city,country,lat,lon,start deadline,source_url,'event' kind from exhibitions"""):
        lat, lon = e.get("lat"), e.get("lon")
        if lat is None or lon is None:
            coords = CITY_COORDS.get((e.get("city") or "").strip().lower())
            if coords:
                lat, lon = coords
        if lat is not None and lon is not None:
            e["lat"], e["lon"] = float(lat), float(lon)
            e["score"] = 0
            e["thumbnail_url"] = f"/api/exhibitions/{e['id']}/thumbnail"
            out.append(e)
    return out

@app.get("/api/source-previews/status")
def preview_status():
    return {"cached":core.one("select count(*) c from source_previews")["c"],"with_images":core.one("select count(*) c from source_previews where image_url<>''")["c"],"online":core.one("select count(*) c from source_previews where status='online'")["c"]}
