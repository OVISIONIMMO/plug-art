# Legacy domains serve only a temporary redirect to the canonical site.
import os
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
class Canonical(BaseHTTPRequestHandler):
    def route(self):
        health=self.path.split("?",1)[0]=="/api/health"
        body=b'{"ok":true,"role":"canonical-redirect","target":"plug-art-live"}' if health else b""
        self.send_response(200 if health else 307)
        self.send_header("Cache-Control","no-store")
        if health:
            self.send_header("Content-Type","application/json")
        else:
            path=self.path if self.path.startswith("/") else "/"
            self.send_header("Location","https://plug-art-live-production.up.railway.app"+path)
        self.send_header("Content-Length",str(len(body)))
        self.end_headers()
        if self.command!="HEAD":self.wfile.write(body)
    do_GET=route
    do_HEAD=route
    do_POST=route
    do_PUT=route
    do_PATCH=route
    do_DELETE=route
    do_OPTIONS=route
ThreadingHTTPServer(("0.0.0.0",int(os.environ.get("PORT","8080"))),Canonical).serve_forever()
