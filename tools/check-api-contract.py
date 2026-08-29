#!/usr/bin/env python3
"""
بررسی هماهنگی فرانت‌اند و بک‌اند.

ناهماهنگی نام آدرس یا نام فیلد بی‌صدا شکست می‌خورد — نه خطایی،
نه لاگی، فقط یک صفحه‌ی خالی یا دکمه‌ای که کار نمی‌کند. پس قبل از
هر انتشار این اجرا شود:

    python3 tools/check-api-contract.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
backend = (ROOT / "backend" / "app.py").read_text(encoding="utf-8")
frontend = (ROOT / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")

G = "\033[38;5;42m"
R = "\033[38;5;203m"
D = "\033[38;5;245m"
X = "\033[0m"

problems = 0

# ═══════════════════════════════════════════════
#  ۱. هر آدرسی که فرانت‌اند صدا می‌زند، مسیر دارد؟
# ═══════════════════════════════════════════════

routes = set()
for m in re.finditer(r'@app\.(\w+)\("(/api[^"]+)"', backend):
    routes.add(re.sub(r"\{[^}]+\}", "*", m.group(2)))

called = set()
for m in re.finditer(r"\$\{API_URL\}(/api/[^`\"']*)", frontend):
    p = m.group(1)
    # پارامترهای query جزو مسیر نیستند
    p = p.split("?")[0]
    p = re.sub(r"\$\{[^}]+\}", "*", p).rstrip("/")
    if p:
        called.add(p)

print(f"\n{D}Checking {len(called)} URLs against {len(routes)} routes{X}\n")


def matches(path, route):
    if path == route:
        return True
    if route.endswith("*") and path.startswith(route[:-1]):
        return True
    if path.endswith("*") and route.startswith(path[:-1]):
        return True
    return False


missing = [p for p in sorted(called)
           if not any(matches(p, r) for r in routes)]

if missing:
    for p in missing:
        problems += 1
        print(f"  {R}✗{X} URL with no route: {p}")
else:
    print(f"  {G}✓{X} every URL has a route")

# ═══════════════════════════════════════════════
#  ۲. نام فیلدهایی که هر دو طرف باید بشناسند
# ═══════════════════════════════════════════════

print()

CONTRACTS = [
    ("billing_group_put", ["billed", "billable"]),
    ("billing_payment_add", ["group", "group_key"]),
]

for fn, names in CONTRACTS:
    m = re.search(rf"def {fn}\(.*?(?=\n@app\.|\ndef |\Z)", backend, re.S)
    if not m:
        problems += 1
        print(f"  {R}✗{X} function {fn} not found")
        continue
    src = m.group(0)
    unknown = [n for n in names if f'"{n}"' not in src]
    if unknown:
        problems += 1
        print(f"  {R}✗{X} {fn} does not accept: {unknown}")
    else:
        print(f"  {G}✓{X} {fn} accepts both names")

# ═══════════════════════════════════════════════
#  ۳. فیلدهایی که فرانت‌اند از پاسخ می‌خواند
# ═══════════════════════════════════════════════

print()

# نام‌های مترادفی که بک‌اند باید بفرستد
ALIASES = ["name", "billed", "amount", "uncertain", "items", "group_name"]
sent = [a for a in ALIASES if f'"{a}"' in backend]
absent = set(ALIASES) - set(sent)

if absent:
    problems += 1
    print(f"  {R}✗{X} backend does not send these aliases: {sorted(absent)}")
else:
    print(f"  {G}✓{X} all aliases are sent")

# ═══════════════════════════════════════════════
#  ۴. سلامت CSS
#
#  اگر @tailwind حذف شود، کل ظاهر پنل از بین می‌رود
#  ولی build بدون خطا تمام می‌شود — پس باید صریح بررسی شود.
# ═══════════════════════════════════════════════

print()

css_path = ROOT / "frontend" / "src" / "index.css"
if css_path.exists():
    css = css_path.read_text(encoding="utf-8")

    tw = [d for d in ("@tailwind base", "@tailwind components", "@tailwind utilities")
          if d not in css]
    if tw:
        problems += 1
        print(f"  {R}✗{X} Tailwind directives are missing: {tw}")
        print(f"      without them the panel has no styling at all")
    else:
        print(f"  {G}✓{X} Tailwind directives present")

    # فونت باید هم تعریف و هم اعمال شود
    has_face = "@font-face" in css
    # فونت باید روی body یا html اعمال شده باشد — هر شکلی که نوشته شده
    applied = bool(re.search(r'(html|body|#root)[^{]*\{[^}]*font-family', css))
    if has_face and not applied:
        problems += 1
        print(f"  {R}✗{X} font declared but never applied to body")
    elif has_face:
        print(f"  {G}✓{X} font declared and applied")
else:
    problems += 1
    print(f"  {R}✗{X} index.css not found")

print()
if problems:
    print(f"{R}{problems} mismatches found{X}\n")
    sys.exit(1)

print(f"{G}API contract is sound{X}\n")
