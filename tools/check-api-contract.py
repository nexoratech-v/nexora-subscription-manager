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

print(f"\n{D}بررسی {len(called)} آدرس در برابر {len(routes)} مسیر{X}\n")


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
        print(f"  {R}✗{X} آدرس بدون مسیر: {p}")
else:
    print(f"  {G}✓{X} همه‌ی آدرس‌ها مسیر دارند")

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
        print(f"  {R}✗{X} تابع {fn} پیدا نشد")
        continue
    src = m.group(0)
    unknown = [n for n in names if f'"{n}"' not in src]
    if unknown:
        problems += 1
        print(f"  {R}✗{X} {fn} این نام‌ها را نمی‌پذیرد: {unknown}")
    else:
        print(f"  {G}✓{X} {fn} هر دو نام را می‌پذیرد")

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
    print(f"  {R}✗{X} بک‌اند این نام‌های مترادف را نمی‌فرستد: {sorted(absent)}")
else:
    print(f"  {G}✓{X} همه‌ی نام‌های مترادف فرستاده می‌شوند")

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
        print(f"  {R}✗{X} دستورهای Tailwind حذف شده‌اند: {tw}")
        print(f"      بدون این‌ها کل ظاهر پنل از بین می‌رود")
    else:
        print(f"  {G}✓{X} دستورهای Tailwind سر جایشان هستند")

    # فونت باید هم تعریف و هم اعمال شود
    has_face = "@font-face" in css
    # فونت باید روی body یا html اعمال شده باشد — هر شکلی که نوشته شده
    applied = bool(re.search(r'(html|body|#root)[^{]*\{[^}]*font-family', css))
    if has_face and not applied:
        problems += 1
        print(f"  {R}✗{X} فونت تعریف شده ولی روی body اعمال نشده")
    elif has_face:
        print(f"  {G}✓{X} فونت تعریف و اعمال شده")
else:
    problems += 1
    print(f"  {R}✗{X} index.css پیدا نشد")

print()
if problems:
    print(f"{R}{problems} ناهماهنگی پیدا شد{X}\n")
    sys.exit(1)

print(f"{G}قرارداد API سالم است{X}\n")
