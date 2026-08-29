#!/usr/bin/env python3
"""
تست بارگذاری واقعی — همان درخواست‌هایی که مرورگر می‌زند.

    cd frontend && npm run build
    python3 tools/test-serve.py

چرا لازم است: تست رندر فقط محتوای CSS را بررسی می‌کند. این یکی
بررسی می‌کند که مرورگر واقعاً بتواند فایل را بگیرد — با نوع MIME
درست و حجم منطقی.

یک‌بار یک بلوک اشتباه در nginx (types { }) نوع MIME را خراب کرد و
مرورگر CSS را رد کرد، در حالی که خود فایل کاملاً سالم بود.
"""

import http.server
import re
import socketserver
import sys
import threading
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist"

G = "\033[38;5;42m"
R = "\033[38;5;203m"
D = "\033[38;5;245m"
X = "\033[0m"

passed = 0
failed = 0


def chk(name, ok, extra=""):
    global passed, failed
    if ok:
        passed += 1
        mark = f"{G}✓{X}"
    else:
        failed += 1
        mark = f"{R}✗{X}"
    tail = f" {D}— {extra}{X}" if extra else ""
    print(f"  {mark} {name}{tail}")


def main():
    if not DIST.exists():
        print(f"\n{R}اول اجرا کنید: cd frontend && npm run build{X}\n")
        return 1

    port = 8877

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(DIST), **kw)

        def log_message(self, *a):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    time.sleep(0.4)

    base = f"http://127.0.0.1:{port}"

    def get(path):
        with urllib.request.urlopen(base + path, timeout=10) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read()

    print(f"\n{D}شبیه‌سازی درخواست‌های مرورگر{X}\n")

    try:
        st, _, body = get("/")
        html = body.decode()
        chk("index.html", st == 200, f"{len(html)} بایت")

        m = re.search(r'href="(/assets/[^"]+\.css)"', html)
        chk("لینک CSS در HTML", bool(m), m.group(1) if m else "پیدا نشد")

        if m:
            st, ct, body = get(m.group(1))
            css = body.decode()
            chk("دانلود CSS", st == 200, f"{len(css):,} بایت")
            chk("نوع MIME", "text/css" in ct, ct)
            chk("کلاس‌ها و متغیرها", ".flex" in css and "--bg" in css)
            chk("حجم منطقی", len(css) > 15000,
                "زیر ۱۵ کیلوبایت یعنی Tailwind کار نکرده"
                if len(css) <= 15000 else "")

            fonts = sorted(set(re.findall(r"url\((/assets/[^)]+\.woff2?)\)", css)))
            chk("ارجاع فونت", len(fonts) >= 2, f"{len(fonts)} فایل")
            for f in fonts:
                st, ct, body = get(f)
                chk(f"  {f.split('/')[-1][:28]}", st == 200, f"{len(body):,} بایت")

        m = re.search(r'src="(/assets/[^"]+\.js)"', html)
        if m:
            st, ct, body = get(m.group(1))
            chk("دانلود JS", st == 200, f"{len(body):,} بایت")
            chk("نوع MIME جاوااسکریپت", "javascript" in ct, ct)

    except Exception as e:
        chk("اجرای تست", False, f"{type(e).__name__}: {e}")
    finally:
        httpd.shutdown()
        httpd.server_close()

    print(f"\n{D}{'─' * 46}{X}")
    if failed:
        print(f"  {R}{passed} پاس · {failed} ناموفق{X}\n")
        return 1
    print(f"  {G}{passed} پاس — مرورگر همه‌چیز را می‌گیرد{X}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
