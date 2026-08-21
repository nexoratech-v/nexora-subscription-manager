# پنل مدیریت صفحه اشتراک Nexora

> ## 🚀 برای نصب روی سرور
>
> **روش ساده (پیشنهادی):** فایل `install.sh` را اجرا کنید — بیشتر کارها خودکار انجام می‌شود:
> ```bash
> cd /root/nexora-subpage-admin
> bash install.sh
> ```
>
> **روش دستی با توضیح کامل هر قدم:** فایل **`INSTALL.md`** را بخوانید.
>
> این README برای مرجع و توضیح بخش‌هاست، نه راهنمای نصب.

---

# بخش ۱: نصب دائمی روی سرور (Production)

## پیش‌نیازها
```bash
apt update
apt install python3 python3-venv python3-pip nginx -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y
```

## گام ۱: انتقال فایل‌ها

```bash
mkdir -p /opt/nexora-panel
cd /opt/nexora-panel
# فایل zip را اینجا آپلود و باز کنید
unzip nexora-subpage-admin.zip
mv nexora-subpage-admin/* .
rmdir nexora-subpage-admin
```

## گام ۲: نصب بک‌اند

```bash
cd /opt/nexora-panel/backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

## گام ۳: قرار دادن صفحه اشتراک در مسیر پنل

```bash
mkdir -p /root/sub-page
cp /opt/nexora-panel/sub-page-index.html /root/sub-page/index.html
```

⚠️ **قبل از این کار**، آدرس بک‌اند را در فایل ویرایش کنید:
```bash
nano /root/sub-page/index.html
```
خط زیر را پیدا و اصلاح کنید (حدود خط ۱۶۱۱):
```javascript
const SUBPAGE_CONFIG_API = "https://panel.nexora.com";  // ← آدرس واقعی بک‌اند
```

## گام ۴: سرویس دائمی بک‌اند (systemd)

```bash
nano /etc/systemd/system/nexora-panel.service
```

```ini
[Unit]
Description=Nexora Sub Page Admin Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexora-panel/backend
Environment="NEXORA_SUBPAGE_ADMIN_PASSWORD=رمز-خیلی-قوی-اینجا"
Environment="ALLOWED_ORIGIN=*"
Environment="CONFIG_PATH=/opt/nexora-panel/data/config.json"
Environment="SUBPAGE_HTML_PATH=/root/sub-page/index.html"
Environment="AUTH_PATH=/opt/nexora-panel/data/auth.json"
ExecStart=/opt/nexora-panel/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8100
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

فعال‌سازی:
```bash
systemctl daemon-reload
systemctl enable nexora-panel
systemctl start nexora-panel
systemctl status nexora-panel     # باید active (running) باشد
```

تست:
```bash
curl http://127.0.0.1:8100/api/health
# باید {"ok":true} برگرداند
```

## گام ۵: بیلد پنل مدیریت

```bash
cd /opt/nexora-panel/frontend
npm install
echo "VITE_API_URL=https://panel.nexora.com" > .env
npm run build
```

## گام ۶: تنظیم nginx

```bash
nano /etc/nginx/conf.d/nexora-panel.conf
```

```nginx
server {
    listen 443 ssl http2;
    server_name panel.nexora.com;

    ssl_certificate     /etc/nginx/ssl/panel-cert.pem;
    ssl_certificate_key /etc/nginx/ssl/panel-key.pem;

    # پنل مدیریت (فایل‌های استاتیک)
    root /opt/nexora-panel/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # API بک‌اند
    location /api/ {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

## گام ۷ (مهم برای امنیت): محدود کردن دسترسی پنل

چون این پنل کنترل چیزی است که همه‌ی مشتریان می‌بینند، حتماً یکی از این‌ها را اضافه کنید:

**روش الف — محدودیت IP** (اگر IP ثابت دارید):
```nginx
location / {
    allow 1.2.3.4;      # IP خودتان
    deny all;
    try_files $uri /index.html;
}
```

**روش ب — Cloudflare Access** (اگر دامنه پشت کلودفلر است): در پنل کلودفلر → Zero Trust → Access → یک اپلیکیشن بسازید و فقط ایمیل خودتان را مجاز کنید.

---

# بخش ۲: پاسخ به سوالات شما

## آیا می‌توانم نام `sub.html` را عوض کنم؟

**خیر.** پنل 3x-ui فقط دو نام را می‌شناسد:
- `index.html` — صفحه‌ی اصلی اشتراک
- `sub.html` — صفحه‌ی جایگزین

اگر نام دیگری بگذارید، پنل آن را پیدا نمی‌کند و صفحه‌ی پیش‌فرض خودش را نشان می‌دهد.

**ولی نگران نباشید** — نیازی به تغییر نام نیست، چون:
- سیستم واسطه‌ها با همان یک فایل `index.html` کار می‌کند
- تشخیص واسطه از **ایمیل کلاینت یا دامنه** انجام می‌شود، نه از نام فایل

## چطور واسطه اضافه کنم؟ (گام‌به‌گام)

### مرحله ۱: در پنل مدیریت (این پروژه)

بخش **«واسطه‌ها»** → دکمه‌ی «افزودن واسطه جدید»:

| فیلد | مقدار نمونه | توضیح |
|---|---|---|
| نام واسطه | `ماکان` | فقط برای خودتان، به مشتری نمایش داده نمی‌شود |
| پیشوند ایمیل | `macan` | ⚠️ این مهم‌ترین فیلد است |
| دامنه‌های اختصاصی | خالی (یا `macanvpn.ir`) | فقط اگر واسطه دامنه خریده باشد |
| نام برند | `MACAN` | چیزی که مشتری در بالای صفحه می‌بیند |
| عنوان صفحه | `ماکان \| اشتراک` | عنوان تب مرورگر |
| یوزرنیم پشتیبانی | `macan_support` | بدون @ |
| یوزرنیم کانال | `macanvpn` | بدون @ |
| رنگ‌ها | دلخواه | برند اختصاصی واسطه |

ذخیره کنید.

### مرحله ۲: در پنل 3x-ui (اینجا نام را تعریف می‌کنید)

وقتی برای مشتریان آن واسطه کلاینت می‌سازید، **در فیلد Email** پیشوند را بگذارید:

```
پنل 3x-ui → Inbounds → روی inbound کلیک → Add Client

فیلد Email:  macan_ali
فیلد Email:  macan_reza
فیلد Email:  macan_sara
```

یعنی هر مشتری این واسطه، ایمیلش باید با `macan_` شروع شود.

مشتریان خودتان را بدون پیشوند بسازید:
```
فیلد Email:  ali_direct
فیلد Email:  reza_vip
```

### مرحله ۳: تست

در بخش «واسطه‌ها»، زیر هر واسطه دکمه‌ی **«تست با ایمیل»** هست — بزنید و ببینید JSON برگشتی برند واسطه را نشان می‌دهد.

یا مستقیم:
```
https://panel.nexora.com/api/public/config?email=macan_ali@x
```
باید `"brandName": "MACAN"` ببینید.

## نکته‌ی مهم درباره‌ی جداکننده

پیشوند با یکی از این سه کاراکتر جدا می‌شود: `_` یا `-` یا `.`

```
✅ macan_ali     → تشخیص داده می‌شود
✅ macan-ali     → تشخیص داده می‌شود
✅ macan.ali     → تشخیص داده می‌شود
❌ macanali      → تشخیص داده نمی‌شود (بدون جداکننده)
❌ ali_macan     → تشخیص داده نمی‌شود (پیشوند باید اول باشد)
```

---

# بخش ۴: امنیت و پشتیبان‌گیری

## تغییر رمز عبور

از داخل پنل: **تنظیمات → تغییر رمز عبور**

- نیاز به وارد کردن رمز فعلی دارد (تا کسی که به مرورگر باز شما دسترسی پیدا کرد نتواند رمز را عوض کند)
- حداقل ۸ کاراکتر
- نشانگر قدرت رمز به‌صورت زنده
- بعد از تغییر، **نیازی به ورود مجدد نیست** — رمز جدید خودکار جایگزین می‌شود

رمز جدید در فایل `data/auth.json` با دسترسی `600` (فقط مالک) ذخیره می‌شود و بر متغیر محیطی اولویت دارد.

⚠️ **اگر رمز را فراموش کردید:** فایل `data/auth.json` را حذف کنید تا دوباره از رمز متغیر محیطی (`NEXORA_SUBPAGE_ADMIN_PASSWORD`) استفاده شود:
```bash
rm /opt/nexora-panel/data/auth.json
systemctl restart nexora-panel
```

## پشتیبان‌گیری

از داخل پنل: **تنظیمات → پشتیبان‌گیری و بازیابی**

- **دریافت پشتیبان:** یک فایل JSON با تمام تنظیمات دانلود می‌شود
- **بازیابی:** فایل را انتخاب کنید — قبل از بازنویسی، از نسخه‌ی فعلی خودکار یک کپی روی سرور نگه داشته می‌شود (`config.backup.تاریخ.json`)

### پشتیبان خودکار روزانه

```bash
mkdir -p /root/backups
crontab -e
```
```
0 3 * * * cp /opt/nexora-panel/data/config.json /root/backups/config-$(date +\%Y\%m\%d).json
0 3 * * * find /root/backups -name "config-*.json" -mtime +30 -delete
```

---

# بخش ۵: بخش‌های پنل

| بخش | کاربرد |
|---|---|
| **داشبورد** | آمار کلی، جدول اپ‌ها، وضعیت قابلیت‌ها |
| **پیش‌نمایش زنده** | مشاهده صفحه اشتراک در ۳ سایز با زوم |
| **اپلیکیشن‌ها** | افزودن **هر تعداد** اپ برای هر پلتفرم |
| **ویدیوهای آموزشی** | لینک ویدیوهای تلگرام (بدون مصرف حجم سرور) |
| **سوالات متداول** | مدیریت FAQ در ۴ زبان |
| **واسطه‌ها** | برند اختصاصی برای هر واسطه (White-Label) |
| **مدیریت ربات** | تنظیمات ربات تلگرام (آماده برای آینده) |
| **بنرها** | آستانه هشدار پایان حجم/زمان |
| **پاپ‌آپ راهنما** | متن، آیکون، دکمه‌ها و زمان‌بندی پاپ‌آپ |
| **رفرال** | فعال/غیرفعال کارت معرفی |
| **لینک‌ها** | یوزرنیم پشتیبانی و کانال |
| **تنظیمات** | برند، رنگ، زبان/تم، نمایش بخش‌ها، CSS سفارشی |

---

# بخش ۴: پشتیبان‌گیری (حتماً انجام دهید)

تمام تنظیمات در یک فایل است. یک کرون‌جاب روزانه بسازید:

```bash
crontab -e
```
```
0 3 * * * cp /opt/nexora-panel/data/config.json /root/backups/config-$(date +\%Y\%m\%d).json
```
```bash
mkdir -p /root/backups
```

---

# بخش ۵: رفع اشکال

| مشکل | راه‌حل |
|---|---|
| پنل باز نمی‌شود | `systemctl status nexora-panel` — سرویس بالاست؟ |
| تغییرات اعمال نمی‌شود | `SUBPAGE_CONFIG_API` در `/root/sub-page/index.html` درست است؟ |
| خطای CORS در کنسول | `ALLOWED_ORIGIN` را روی `*` بگذارید یا دقیقاً دامنه صفحه اشتراک |
| صفحه اشتراک سفید است | `F12` → Console را چک کنید |
| واسطه تشخیص داده نمی‌شود | ایمیل کلاینت با `پیشوند_` شروع می‌شود؟ |
| پیش‌نمایش خالی است | `SUBPAGE_HTML_PATH` را در systemd چک کنید |

### دستورات مفید

```bash
systemctl restart nexora-panel      # ری‌استارت
journalctl -u nexora-panel -f       # لاگ زنده
journalctl -u nexora-panel -n 50    # ۵۰ خط آخر لاگ
```

---

# بخش ۶: آماده‌سازی برای ربات تلگرام (آینده)

بخش «مدیریت ربات» تنظیمات را از الان ذخیره می‌کند. وقتی ربات را ساختید، کافی است آن را به همین API وصل کنید:

```python
import requests
cfg = requests.get(
    "http://127.0.0.1:8100/api/admin/config",
    headers={"X-Admin-Password": "رمز-شما"}
).json()

bot_token = cfg["bot"]["token"]
admin_id = cfg["bot"]["adminChatId"]
welcome = cfg["bot"]["welcomeMessage"]
```

⚠️ توکن ربات **هرگز** در پاسخ عمومی (`/api/public/config`) فرستاده نمی‌شود — فقط از مسیر ادمین با رمز عبور قابل‌دسترسی است.

---

## 🔄 به‌روزرسانی به نسخه جدید

فایل zip جدید را روی سرور آپلود کنید، سپس:

```bash
nexora update /root/nexora-subpage-admin.zip
```

این دستور خودکار انجام می‌دهد:
- بک‌آپ از تنظیمات و رمز عبور
- جایگزینی کد (تنظیمات دست‌نخورده)
- حفظ آدرس API و دامنه‌ی شما
- نصب مجدد قالب در همان مسیر
- بیلد و ری‌استارت + بررسی سلامت

اگر خطا داد، مسیر بک‌آپ را نشان می‌دهد تا برگردید.

## 🖥 دستورات مدیریتی

| دستور | کاربرد |
|---|---|
| `nexora status` | وضعیت کامل سرویس‌ها |
| `nexora logs` | لاگ زنده |
| `nexora restart` | ری‌استارت بک‌اند |
| `nexora backup` | بک‌آپ فوری |
| `nexora update <zip>` | به‌روزرسانی |
| `nexora password` | تغییر رمز |
| `nexora diagnose` | عیب‌یابی قالب |
