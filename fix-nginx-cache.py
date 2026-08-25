#!/usr/bin/env python3
"""
Add cache-control headers to the panel's nginx config.

Why this matters: index.html points to hashed asset files. If the browser
caches index.html itself, it keeps asking for the old bundle after every
update — a bundle that no longer exists or no longer matches the new code.
The result is a blank page or errors like "useState is not defined".

Usage:
    python3 fix-nginx-cache.py [path to conf]
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT = "/etc/nginx/conf.d/nexora-panel.conf"

BLOCK = """
    # index.html must never be cached
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        expires -1;
    }
    # Asset files are content-hashed, so they can be cached forever
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
"""


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else DEFAULT)

    if not path.exists():
        print(f"!  Config not found: {path}")
        return 1

    text = path.read_text(encoding="utf-8")

    if "no-store, no-cache" in text:
        print("OK Cache headers already configured")
        return 0

    backup = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, backup)

    # Insert before each "location / {" (both http and https blocks)
    new_text, n = re.subn(r"(\n\s*location / \{)", BLOCK + r"\1", text)
    if n == 0:
        print("!  No 'location /' block found — nothing changed")
        return 1

    path.write_text(new_text, encoding="utf-8")

    # Validate; roll back if broken
    try:
        r = subprocess.run(["nginx", "-t"], capture_output=True, timeout=20)
        if r.returncode != 0:
            shutil.copy2(backup, path)
            print("X  Config was invalid — previous version restored")
            print((r.stderr or b"").decode()[:300])
            return 1
    except FileNotFoundError:
        print("!  nginx not available — change applied but not verified")
        return 0

    subprocess.run(["systemctl", "reload", "nginx"], capture_output=True, timeout=20)
    print(f"OK Cache headers added to {n} block(s), nginx reloaded")
    return 0


if __name__ == "__main__":
    sys.exit(main())
