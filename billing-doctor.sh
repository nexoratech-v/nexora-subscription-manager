#!/usr/bin/env bash
#
# تشخیص مشکل اتصال حسابداری به دیتابیس ۳x-ui
#
#   bash billing-doctor.sh
#
# این اسکریپت هیچ چیزی را تغییر نمی‌دهد — فقط بررسی می‌کند و
# می‌گوید مشکل کجاست و چطور رفع شود.

set -u

C_OK=$'\033[38;5;42m'; C_BAD=$'\033[38;5;203m'; C_WARN=$'\033[38;5;220m'
C_DIM=$'\033[38;5;245m'; C_ACC=$'\033[38;5;39m'; C_R=$'\033[0m'
ok(){ echo "  ${C_OK}✓${C_R} $1"; }
bad(){ echo "  ${C_BAD}✗${C_R} $1"; }
warn(){ echo "  ${C_WARN}!${C_R} $1"; }
info(){ echo "  ${C_DIM}$1${C_R}"; }
head(){ echo; echo "${C_ACC}── $1 ──${C_R}"; }

INSTALL_DIR="${INSTALL_DIR:-/opt/nexora-panel}"
[ -d "$INSTALL_DIR" ] || INSTALL_DIR="/opt/nexora-subpage-admin"

echo
echo "${C_ACC}تشخیص حسابداری نکسورا${C_R}"
echo "${C_DIM}$(date '+%Y-%m-%d %H:%M')${C_R}"

# ─────────────────────────────────────────────
head "۱. پیدا کردن دیتابیس ۳x-ui"

FOUND=""
for p in /etc/x-ui/x-ui.db /usr/local/x-ui/x-ui.db /opt/x-ui/x-ui.db /etc/x-ui/db/x-ui.db; do
  if [ -f "$p" ]; then
    SIZE=$(du -h "$p" 2>/dev/null | cut -f1)
    PERM=$(stat -c '%a' "$p" 2>/dev/null)
    OWNER=$(stat -c '%U:%G' "$p" 2>/dev/null)
    ok "$p  (${SIZE}, مجوز ${PERM}, مالک ${OWNER})"
    [ -z "$FOUND" ] && FOUND="$p"
  fi
done

if [ -z "$FOUND" ]; then
  bad "هیچ دیتابیس ۳x-ui در مسیرهای رایج پیدا نشد"
  info "جستجوی کل سیستم..."
  DEEP=$(find / -name "x-ui.db" -not -path "*/proc/*" 2>/dev/null | head -5)
  if [ -n "$DEEP" ]; then
    warn "ولی اینجا پیدا شد:"
    echo "$DEEP" | while read -r f; do info "  $f"; done
    FOUND=$(echo "$DEEP" | head -1)
  else
    bad "۳x-ui روی این سرور نصب نیست"
    echo
    exit 1
  fi
fi

# ─────────────────────────────────────────────
head "۲. پنل چه مسیری را می‌خواند"

CFG="$INSTALL_DIR/data/config.json"
if [ -f "$CFG" ]; then
  MANUAL=$(python3 -c "
import json
try:
    d=json.load(open('$CFG'))
    print((d.get('advanced') or {}).get('xuiDbPath') or '')
except Exception: print('')
" 2>/dev/null)
  if [ -n "$MANUAL" ]; then
    ok "تنظیم دستی در پنل: $MANUAL"
    [ -f "$MANUAL" ] || bad "  ولی این فایل وجود ندارد!"
  else
    info "تنظیم دستی در پنل: ندارد"
  fi
else
  warn "فایل تنظیمات پنل پیدا نشد: $CFG"
fi

SVC="/etc/systemd/system/nexora-panel.service"
if [ -f "$SVC" ]; then
  ENVP=$(grep -oP 'XUI_DB_PATH=\K[^"]+' "$SVC" 2>/dev/null | head -1)
  if [ -n "$ENVP" ]; then
    ok "متغیر در سرویس: $ENVP"
    [ -f "$ENVP" ] || bad "  ولی این فایل وجود ندارد!"
  else
    warn "متغیر XUI_DB_PATH در سرویس تنظیم نشده"
    info "  اگر مسیر پیش‌فرض درست است، مشکلی نیست"
  fi
else
  bad "سرویس پنل پیدا نشد: $SVC"
fi

# ─────────────────────────────────────────────
head "۳. پنل با چه کاربری اجرا می‌شود"

RUNAS=$(systemctl show nexora-panel -p User --value 2>/dev/null)
[ -z "$RUNAS" ] && RUNAS="root"
ok "کاربر سرویس: $RUNAS"

if [ "$RUNAS" != "root" ]; then
  if sudo -u "$RUNAS" test -r "$FOUND" 2>/dev/null; then
    ok "این کاربر می‌تواند دیتابیس را بخواند"
  else
    bad "این کاربر اجازه‌ی خواندن ندارد — همین مشکل شماست"
    info "رفع:  chmod +r $FOUND"
    info "  یا:  chmod 755 $(dirname "$FOUND")"
  fi
else
  ok "root است — دسترسی مشکلی ندارد"
fi

# ─────────────────────────────────────────────
head "۴. فایل‌های جانبی WAL"

WALF="$FOUND-wal"
if [ -f "$WALF" ]; then
  warn "دیتابیس در حالت WAL است"
  for f in "$FOUND-wal" "$FOUND-shm"; do
    if [ -f "$f" ]; then
      if [ -r "$f" ]; then
        ok "$(basename "$f") خواندنی است"
      else
        bad "$(basename "$f") خواندنی نیست — همین مشکل شماست"
        info "رفع:  chmod +r ${FOUND}*"
      fi
    fi
  done
else
  ok "حالت WAL نیست — فقط فایل اصلی لازم است"
fi

head "۵. محتوای دیتابیس"

if command -v sqlite3 >/dev/null 2>&1; then
  TABLES=$(sqlite3 "$FOUND" ".tables" 2>&1)
  if echo "$TABLES" | grep -q "clients"; then
    ok "جدول clients دارد (نسخه ۳.۵ به بالا)"
    N=$(sqlite3 "$FOUND" "SELECT COUNT(*) FROM clients;" 2>/dev/null)
    info "  $N کانفیگ"
    G=$(sqlite3 "$FOUND" "SELECT COUNT(*) FROM client_groups;" 2>/dev/null)
    info "  $G گروه"
    if [ "${G:-0}" -gt 0 ]; then
      echo
      info "  گروه‌ها:"
      sqlite3 "$FOUND" "SELECT '   • ' || name FROM client_groups;" 2>/dev/null | while read -r l; do
        info "$l"
      done
    fi
  elif echo "$TABLES" | grep -q "inbounds"; then
    warn "نسخه‌ی قدیمی — کلاینت‌ها داخل inbounds هستند"
    info "  حسابداری کار می‌کند ولی گروه‌بندی از remark می‌آید"
  else
    bad "ساختار ناشناخته"
    info "  جدول‌ها: $(echo "$TABLES" | tr '\n' ' ' | cut -c1-90)"
  fi
else
  warn "sqlite3 نصب نیست — نمی‌توان محتوا را بررسی کرد"
  info "نصب:  apt install -y sqlite3"
fi

# ─────────────────────────────────────────────
head "۶. تست واقعی از داخل پنل"

VENV="$INSTALL_DIR/backend/venv/bin/python3"
[ -x "$VENV" ] || VENV="python3"

"$VENV" - <<PYEOF 2>&1
import sys, os
sys.path.insert(0, "$INSTALL_DIR/backend")
os.environ.setdefault("CONFIG_PATH", "$INSTALL_DIR/data/config.json")
try:
    import app as A
except Exception as e:
    print("  \033[38;5;203m✗\033[0m بارگذاری پنل ناموفق:", type(e).__name__, str(e)[:80])
    sys.exit(1)

path = A._xui_db_path()
print(f"  \033[38;5;245mمسیری که پنل انتخاب می‌کند: {path}\033[0m")

con, err = A._xui_conn()
if con:
    print("  \033[38;5;42m✓\033[0m اتصال برقرار شد")
    try:
        n = con.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
        print(f"  \033[38;5;245m  {n} کانفیگ خوانده شد\033[0m")
    except Exception as e:
        print(f"  \033[38;5;220m!\033[0m خواندن جدول: {str(e)[:60]}")
    con.close()
else:
    print(f"  \033[38;5;203m✗\033[0m {err}")

clients, groups, rerr = A._read_xui_clients()
if clients is None:
    print(f"  \033[38;5;203m✗\033[0m خواندن کامل ناموفق: {rerr}")
else:
    print(f"  \033[38;5;42m✓\033[0m {len(clients)} کانفیگ، {len(groups or [])} گروه")
PYEOF

# ─────────────────────────────────────────────
head "خلاصه"

if [ -n "$FOUND" ]; then
  echo
  echo "  اگر بالا خطایی دیدید، این را در پنل تنظیم کنید:"
  echo
  echo "    ${C_ACC}حسابداری ← تنظیمات و بک‌آپ ← مسیر دستی${C_R}"
  echo "    ${C_DIM}$FOUND${C_R}"
  echo
  echo "  یا مستقیم در سرویس:"
  echo
  echo "    ${C_DIM}nexora fix-xui $FOUND${C_R}"
fi
echo
