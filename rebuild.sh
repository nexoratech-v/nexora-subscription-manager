#!/usr/bin/env bash
#
# بازسازی اجباری پنل.
#
#   sudo bash rebuild.sh
#
# وقتی پنل با ظاهر خراب یا داده‌ی «undefined» بالا می‌آید، معمولاً
# یعنی پوشه‌ی dist قدیمی مانده — یا بیلد قبلی نیمه‌کاره تمام شده و
# فایل‌های قبلی سر جایشان مانده‌اند.
#
# این اسکریپت همه‌چیز را از صفر می‌سازد و قبل از جایگزینی بررسی
# می‌کند که خروجی واقعاً سالم است.

set -u

OK=$'\033[38;5;42m'; BAD=$'\033[38;5;203m'; WARN=$'\033[38;5;220m'
DIM=$'\033[38;5;245m'; ACC=$'\033[38;5;39m'; RS=$'\033[0m'

ok(){ echo "  ${OK}✓${RS} $1"; }
bad(){ echo "  ${BAD}✗${RS} $1"; }
warn(){ echo "  ${WARN}!${RS} $1"; }
info(){ echo "  ${DIM}$1${RS}"; }

[ "$(id -u)" -eq 0 ] || { echo "با sudo اجرا کنید"; exit 1; }

DIR="${INSTALL_DIR:-/opt/nexora-panel}"
[ -d "$DIR/frontend" ] || { bad "پنل در $DIR پیدا نشد"; exit 1; }

echo
echo "${ACC}بازسازی پنل${RS}"
echo

cd "$DIR/frontend"

# ── ۱. نگه داشتن نسخه‌ی فعلی ──
if [ -d dist ]; then
  rm -rf dist.backup
  cp -r dist dist.backup
  ok "نسخه‌ی فعلی نگه داشته شد"
fi

# ── ۲. پاکسازی کامل ──
info "پاکسازی کش بیلد..."
rm -rf dist node_modules/.vite .vite 2>/dev/null
ok "کش پاک شد"

# ── ۳. آدرس API ──
DOMAIN=$(grep -oP 'server_name\s+\K[^;]+' /etc/nginx/conf.d/nexora-panel.conf 2>/dev/null \
         | head -1 | tr -d ' ')
if [ -n "$DOMAIN" ]; then
  echo "VITE_API_URL=https://$DOMAIN" > .env
  ok "آدرس API: https://$DOMAIN"
else
  warn "دامنه پیدا نشد — .env دست‌نخورده ماند"
fi

# ── ۴. وابستگی‌ها ──
info "نصب وابستگی‌ها..."
export NODE_OPTIONS="--max-old-space-size=1536"

MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
SWP=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}')
if [ -n "$MEM" ] && [ $((MEM + SWP)) -lt 1500 ] && [ ! -f /swapfile ]; then
  warn "حافظه کم — swap موقت ساخته می‌شود"
  fallocate -l 2G /swapfile 2>/dev/null && chmod 600 /swapfile && \
    mkswap /swapfile > /dev/null 2>&1 && swapon /swapfile > /dev/null 2>&1
fi

npm install --no-fund --no-audit --loglevel=error > /tmp/nexora-rebuild.log 2>&1
ok "وابستگی‌ها نصب شدند"

# ── ۵. بیلد ──
info "ساخت پنل..."
if ! npm run build >> /tmp/nexora-rebuild.log 2>&1; then
  bad "بیلد شکست خورد — /tmp/nexora-rebuild.log"
  tail -15 /tmp/nexora-rebuild.log | sed 's/^/    /'
  [ -d dist.backup ] && mv dist.backup dist && info "نسخه‌ی قبلی برگردانده شد"
  exit 1
fi

# ── ۶. بررسی خروجی ──
echo
CSS=$(ls dist/assets/*.css 2>/dev/null | head -1)
JS=$(ls dist/assets/*.js 2>/dev/null | head -1)

if [ -z "$CSS" ]; then
  bad "هیچ فایل CSS ساخته نشد"
  [ -d dist.backup ] && rm -rf dist && mv dist.backup dist
  exit 1
fi

CSSZ=$(wc -c < "$CSS")
JSZ=$(wc -c < "$JS" 2>/dev/null || echo 0)

if [ "$CSSZ" -lt 15000 ]; then
  bad "CSS خیلی کوچک است (${CSSZ}B) — Tailwind اجرا نشده"
  info "پنل با این فایل بدون ظاهر بالا می‌آید"
  [ -d dist.backup ] && rm -rf dist && mv dist.backup dist && info "نسخه‌ی قبلی برگردانده شد"
  exit 1
fi
ok "CSS: $(basename "$CSS") — ${CSSZ} بایت"
ok "JS:  $(basename "$JS") — ${JSZ} بایت"

# محتوای واقعی
for token in "--bg" "fx-card" "IRANSansX"; do
  grep -q -- "$token" "$CSS" && ok "شامل $token" || warn "بدون $token"
done

rm -rf dist.backup

# ── ۷. nginx ──
echo
if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx && ok "nginx بارگذاری مجدد شد"
  else
    bad "پیکربندی nginx مشکل دارد:"
    nginx -t 2>&1 | sed 's/^/    /'
    info "اجرا کنید: sudo bash fix-nginx.sh"
  fi
fi

systemctl restart nexora-panel 2>/dev/null && ok "سرویس پنل ری‌استارت شد"

# ── ۸. تست از بیرون ──
echo
if [ -n "$DOMAIN" ]; then
  LIVE=$(curl -sk "https://$DOMAIN/" 2>/dev/null | grep -oP '(?<=href=")/assets/[^"]+\.css' | head -1)
  if [ -n "$LIVE" ]; then
    CT=$(curl -skI "https://$DOMAIN$LIVE" 2>/dev/null | grep -i "^content-type" | tr -d '\r')
    SZ=$(curl -sk "https://$DOMAIN$LIVE" 2>/dev/null | wc -c)
    if echo "$CT" | grep -qi "text/css" && [ "$SZ" -gt 15000 ]; then
      ok "سرور CSS را درست می‌دهد (${SZ}B)"
    else
      bad "مشکل در سرو کردن: $CT (${SZ}B)"
      info "اجرا کنید: sudo bash fix-nginx.sh"
    fi
  fi
fi

echo
ok "تمام"
echo
echo "  ${WARN}مهم:${RS} مرورگر را با ${ACC}Ctrl+Shift+R${RS} تازه کنید"
echo "  ${DIM}با F5 معمولی، فایل‌های قدیمی از کش می‌آیند${RS}"
echo
