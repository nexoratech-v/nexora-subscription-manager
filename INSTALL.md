# 🔧 تعمیر به‌روزرسانی ناقص

اگر بعد از `nexora update` با یکی از این‌ها روبه‌رو شدید:

- «پوشه‌ی ربات پیدا نشد»
- `nexora bot` کار نمی‌کند یا خروجی ندارد
- نسخه عوض نشده

**علت:** دستور `nexora` نصب‌شده قدیمی‌تر از کد بوده و نتوانسته خودش را به‌روز کند.

**رفع (یک‌بار کافی است):**

```bash
cd /root
unzip -o nexora-subscription-manager.zip
cd nexora-subpage-admin
bash repair.sh
```

این اسکریپت همه‌چیز را کامل می‌کند: کد، ماژول ربات، دستور `nexora`، سرویس‌ها، وابستگی‌ها و بیلد پنل.
تنظیمات، رمز و دیتابیس ربات دست‌نخورده می‌مانند و قبلش هم بک‌آپ گرفته می‌شود.

از نسخه‌ی ۲.۱.۱ به بعد این مشکل تکرار نمی‌شود، چون بک‌اند هنگام راه‌اندازی دستور `nexora` را خودکار همگام می‌کند.

---

# ⚡ نصب سریع فقط قالب (اگر عجله دارید)

اگر فقط می‌خواهید قالب صفحه اشتراک کار کند (بدون پنل مدیریت):

```bash
# ۱. فایل zip را روی سرور آپلود و باز کنید
cd /root
unzip nexora-subpage-admin.zip
cd nexora-subpage-admin

# ۲. یک دستور — تمام
bash setup-template.sh
```

این اسکریپت خودش:
- کاربر اجراکننده‌ی پنل را تشخیص می‌دهد و مسیر امن انتخاب می‌کند
- فایل را کپی و دسترسی‌ها را درست می‌کند
- سلامت قالب را بررسی می‌کند
- **مسیر را خودکار در دیتابیس پنل ثبت می‌کند**
- پنل را ری‌استارت می‌کند

اگر بک‌اند پنل مدیریت هم دارید:
```bash
bash setup-template.sh https://panel.nexora.com
```

اگر مشکلی بود:
```bash
bash diagnose.sh
```

---

# 📘 راهنمای نصب قدم‌به‌قدم روی سرور

این راهنما فرض می‌کند شما فقط یک سرور خالی دارید و هیچ‌چیز از قبل نصب نیست.
**هر دستور را دقیقاً به همان ترتیب اجرا کنید.**

---

## 🎯 قبل از شروع — چه چیزهایی لازم دارید؟

| مورد | توضیح |
|---|---|
| یک سرور لینوکس | همان سروری که پنل 3x-ui رویش نصب است |
| دسترسی SSH با کاربر root | یعنی بتوانید با `ssh root@IP` وارد شوید |
| یک دامنه یا زیردامنه | مثلاً `panel.nexora.com` که به IP سرور اشاره کند |

### ساخت زیردامنه (اگر ندارید)

در پنل کلودفلر (یا هر جایی که DNS دامنه‌تان است):
```
Type: A
Name: panel
IPv4: <IP سرور شما>
Proxy: DNS only (ابر خاکستری) ← فعلاً خاکستری بگذارید
```

---

## 📍 مرحله ۱ — ورود به سرور

از کامپیوتر خودتان (ویندوز: PowerShell یا PuTTY):

```bash
ssh root@IP-سرور-شما
```

اگر وارد شدید، ادامه دهید.

---

## 📍 مرحله ۲ — نصب پیش‌نیازها

این دستورات را **یکی‌یکی** اجرا کنید:

```bash
apt update
```

```bash
apt install -y python3 python3-venv python3-pip nginx unzip curl
```

نصب Node.js (برای ساخت فایل‌های پنل):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

**بررسی نصب:**
```bash
python3 --version    # باید مثلاً Python 3.10.x نشان دهد
node --version       # باید مثلاً v20.x.x نشان دهد
nginx -v             # باید نسخه nginx نشان دهد
```

اگر هر سه جواب دادند، ادامه دهید.

---

## 📍 مرحله ۳ — آپلود فایل پروژه

### روش الف: با WinSCP (ساده‌تر برای ویندوز)
1. برنامه WinSCP را باز کنید
2. با IP و رمز سرور وصل شوید
3. فایل `nexora-subpage-admin.zip` را در پوشه‌ی `/root/` بکشید

### روش ب: با دستور scp (از PowerShell ویندوز)
```bash
scp nexora-subpage-admin.zip root@IP-سرور:/root/
```

### حالا در SSH سرور، فایل را باز کنید:

```bash
cd /root
unzip nexora-subpage-admin.zip
mkdir -p /opt/nexora-panel
mv nexora-subpage-admin/* /opt/nexora-panel/
mv nexora-subpage-admin/.gitignore /opt/nexora-panel/ 2>/dev/null
rmdir nexora-subpage-admin
```

**بررسی:**
```bash
ls /opt/nexora-panel
```
باید ببینید: `backend  data  frontend  README.md  sub-page-index.html`

---

## 📍 مرحله ۴ — نصب بک‌اند (بخش سرور)

```bash
cd /opt/nexora-panel/backend
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

این چند دقیقه طول می‌کشد. صبر کنید تا تمام شود.

**بررسی:**
```bash
ls venv/bin/uvicorn
```
اگر مسیر فایل را نشان داد، درست نصب شده.

---

## 📍 مرحله ۵ — ⚠️ تغییرات لازم در کد (مهم‌ترین بخش)

### ۵.۱ — آدرس بک‌اند در صفحه اشتراک

```bash
nano /opt/nexora-panel/sub-page-index.html
```

در nano، با `Ctrl+W` جستجو کنید و تایپ کنید:
```
SUBPAGE_CONFIG_API
```
سپس Enter بزنید.

خط زیر را پیدا می‌کنید:
```javascript
const SUBPAGE_CONFIG_API = "http://localhost:8100";
```

**آن را به این تغییر دهید** (دامنه‌ی خودتان را بگذارید):
```javascript
const SUBPAGE_CONFIG_API = "https://panel.nexora.com";
```

ذخیره: `Ctrl+O` → `Enter` → خروج: `Ctrl+X`

### ۵.۲ — کپی فایل به مسیر پنل 3x-ui

```bash
mkdir -p /root/sub-page
cp /opt/nexora-panel/sub-page-index.html /root/sub-page/index.html
```

⚠️ نام فایل حتماً باید `index.html` یا `sub.html` باشد — نام دیگری پذیرفته نمی‌شود.

**بررسی کنید فایل کامل کپی شده:**
```bash
ls -la /root/sub-page/index.html
```
حجم باید حدود **۱۵۰ کیلوبایت** باشد. اگر خیلی کمتر بود، کپی ناقص انجام شده.

> **نکته:** اگر پنل 3x-ui شما با کاربری غیر از `root` اجرا می‌شود (که غیرمعمول است)، ممکن است نتواند فایل را از `/root/` بخواند. در آن صورت از این مسیر جایگزین استفاده کنید:
> ```bash
> mkdir -p /etc/x-ui/sub-page
> cp /opt/nexora-panel/sub-page-index.html /etc/x-ui/sub-page/index.html
> chmod 755 /etc/x-ui /etc/x-ui/sub-page
> chmod 644 /etc/x-ui/sub-page/index.html
> ```
> برای فهمیدن اینکه پنل با چه کاربری اجرا می‌شود: `ps -o user= -C x-ui`

### ۵.۳ — تنظیم مسیر در پنل 3x-ui

وارد پنل شوید → **Settings → Subscription → Information** → فیلد **Sub Theme Directory**
(نسخه‌ی فارسی: **«پوشه قالب صفحه اشتراک»**):

```
/root/sub-page/
```

⚠️ **اسلش پایانی را فراموش نکنید.**

ذخیره کنید، سپس حتماً پنل را ری‌استارت کنید:
```bash
x-ui restart
```

### ۵.۴ — تست

لینک اشتراک یکی از مشتریان را باز کنید. اگر هنوز صفحه‌ی پیش‌فرض را می‌بینید:

```bash
bash /opt/nexora-panel/diagnose.sh
```

این اسکریپت دقیقاً می‌گوید مشکل کجاست (مسیر، دسترسی، متغیر نامعتبر، یا تنظیم نشدن در پنل).

---

## 📍 مرحله ۶ — ساخت سرویس دائمی

این کار باعث می‌شود بک‌اند **همیشه** در حال اجرا باشد، حتی بعد از ری‌استارت سرور.

```bash
nano /etc/systemd/system/nexora-panel.service
```

محتوای زیر را **کامل کپی و پیست کنید** (فقط رمز و دامنه را عوض کنید):

```ini
[Unit]
Description=Nexora Sub Page Admin Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nexora-panel/backend
Environment="NEXORA_SUBPAGE_ADMIN_PASSWORD=RamzeGhaviYeMan1234"
Environment="ALLOWED_ORIGIN=*"
Environment="CONFIG_PATH=/opt/nexora-panel/data/config.json"
Environment="AUTH_PATH=/opt/nexora-panel/data/auth.json"
Environment="SUBPAGE_HTML_PATH=/root/sub-page/index.html"
ExecStart=/opt/nexora-panel/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port 8100
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```

⚠️ **حتماً `RamzeGhaviYeMan1234` را با یک رمز قوی خودتان عوض کنید.**

ذخیره: `Ctrl+O` → `Enter` → `Ctrl+X`

### فعال‌سازی سرویس:

```bash
systemctl daemon-reload
systemctl enable nexora-panel
systemctl start nexora-panel
```

### بررسی:
```bash
systemctl status nexora-panel
```

باید سبز و `active (running)` باشد. برای خروج از این صفحه `q` بزنید.

```bash
curl http://127.0.0.1:8100/api/health
```
باید `{"ok":true}` برگرداند. اگر برگرداند، بک‌اند سالم است ✅

---

## 📍 مرحله ۷ — ساخت فایل‌های پنل مدیریت

```bash
cd /opt/nexora-panel/frontend
npm install
```

این ۲-۵ دقیقه طول می‌کشد.

سپس فایل تنظیمات بسازید (دامنه‌ی خودتان):
```bash
echo 'VITE_API_URL=https://panel.nexora.com' > .env
```

حالا بیلد کنید:
```bash
npm run build
```

**بررسی:**
```bash
ls dist/index.html
```
اگر فایل را نشان داد، بیلد موفق بوده ✅

---

## 📍 مرحله ۸ — گواهی SSL

### گرفتن گواهی از کلودفلر (ساده‌ترین راه)

1. پنل کلودفلر → دامنه‌تان → **SSL/TLS** → **Origin Server**
2. دکمه‌ی **Create Certificate** را بزنید
3. تنظیمات پیش‌فرض را قبول کنید → **Create**
4. دو کادر متن می‌بینید

روی سرور:
```bash
mkdir -p /etc/nginx/ssl
nano /etc/nginx/ssl/panel-cert.pem
```
محتوای **Origin Certificate** را پیست کنید → `Ctrl+O` → `Enter` → `Ctrl+X`

```bash
nano /etc/nginx/ssl/panel-key.pem
```
محتوای **Private Key** را پیست کنید → `Ctrl+O` → `Enter` → `Ctrl+X`

امن‌سازی فایل کلید:
```bash
chmod 600 /etc/nginx/ssl/panel-key.pem
```

---

## 📍 مرحله ۹ — تنظیم nginx

```bash
nano /etc/nginx/conf.d/nexora-panel.conf
```

محتوای زیر را کپی کنید (فقط `panel.nexora.com` را با دامنه‌ی خودتان عوض کنید):

```nginx
server {
    listen 80;
    server_name panel.nexora.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name panel.nexora.com;

    ssl_certificate     /etc/nginx/ssl/panel-cert.pem;
    ssl_certificate_key /etc/nginx/ssl/panel-key.pem;

    # فایل‌های پنل مدیریت
    root /opt/nexora-panel/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # ارتباط با بک‌اند
    location /api/ {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 60s;
    }
}
```

ذخیره: `Ctrl+O` → `Enter` → `Ctrl+X`

### تست و اعمال:
```bash
nginx -t
```

اگر پیام `test is successful` دیدید:
```bash
systemctl reload nginx
```

اگر خطا داد، **همین‌جا متوقف شوید** و خطا را برطرف کنید.

---

## 📍 مرحله ۱۰ — باز کردن فایروال

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 📍 مرحله ۱۱ — روشن کردن پروکسی کلودفلر

در پنل کلودفلر:
1. **DNS** → رکورد `panel` → ابر را **نارنجی** کنید (Proxied)
2. **SSL/TLS** → **Overview** → حالت را روی **Full (strict)** بگذارید

---

## ✅ مرحله ۱۲ — تست نهایی

مرورگر را باز کنید:
```
https://panel.nexora.com
```

باید صفحه‌ی ورود Nexora را ببینید. با همان رمزی که در مرحله ۶ گذاشتید وارد شوید.

بعد از ورود، از منو **«پیش‌نمایش زنده»** را بزنید — باید صفحه‌ی اشتراک را ببینید.

---

# 🔒 امنیت (حتماً انجام دهید)

پنل مدیریت کنترل چیزی است که **همه‌ی مشتریان** می‌بینند. حتماً یکی از این دو را انجام دهید:

## گزینه الف — محدود کردن به IP خودتان

اگر IP ثابت دارید:
```bash
nano /etc/nginx/conf.d/nexora-panel.conf
```

داخل `location / {` این دو خط را اضافه کنید:
```nginx
    location / {
        allow 1.2.3.4;     # ← IP خودتان
        deny all;
        try_files $uri /index.html;
    }
```
```bash
nginx -t && systemctl reload nginx
```

## گزینه ب — تغییر رمز به یک رمز قوی

بعد از ورود به پنل: **تنظیمات → تغییر رمز عبور**

---

# 🔄 دستورات روزمره

```bash
# ری‌استارت بک‌اند
systemctl restart nexora-panel

# دیدن لاگ زنده (برای رفع مشکل)
journalctl -u nexora-panel -f
# خروج با Ctrl+C

# ۵۰ خط آخر لاگ
journalctl -u nexora-panel -n 50

# وضعیت سرویس
systemctl status nexora-panel
```

---

# 🔧 اگر به مشکل خوردید

## پنل باز نمی‌شود (صفحه سفید یا خطای اتصال)

```bash
systemctl status nexora-panel      # سرویس بالاست؟
curl http://127.0.0.1:8100/api/health   # بک‌اند جواب می‌دهد؟
nginx -t                            # کانفیگ nginx سالم است؟
journalctl -u nexora-panel -n 30    # خطای بک‌اند چیست؟
```

## پنل باز می‌شود ولی رمز قبول نمی‌شود

```bash
# رمز فعلی چیست؟
cat /opt/nexora-panel/data/auth.json 2>/dev/null || grep PASSWORD /etc/systemd/system/nexora-panel.service
```

اگر رمز را فراموش کردید:
```bash
rm -f /opt/nexora-panel/data/auth.json
systemctl restart nexora-panel
```
حالا با رمز داخل فایل systemd وارد شوید.

## تغییرات پنل روی صفحه اشتراک اعمال نمی‌شود

```bash
# ۱. آدرس بک‌اند در فایل درست است؟
grep SUBPAGE_CONFIG_API /root/sub-page/index.html

# ۲. بک‌اند از بیرون در دسترس است؟
curl https://panel.nexora.com/api/public/config
```

اگر مورد ۲ جواب نداد، مشکل از nginx یا SSL است.

اگر جواب داد ولی هنوز اعمال نمی‌شود: در مرورگر `F12` بزنید → تب **Console** → خطاها را ببینید. اگر خطای `CORS` دیدید:
```bash
nano /etc/systemd/system/nexora-panel.service
# مقدار ALLOWED_ORIGIN را روی * بگذارید
systemctl daemon-reload && systemctl restart nexora-panel
```

## صفحه اشتراک سفید است

```bash
# آیا فایل سرجایش هست؟
ls -la /root/sub-page/index.html
```
در مرورگر `F12` → Console → اگر خطای `{{` دیدید، یعنی نسخه‌ی قدیمی فایل را کپی کرده‌اید.

---

# 📦 بعد از هر به‌روزرسانی پروژه

اگر نسخه‌ی جدید فایل zip را گرفتید:

```bash
# ۱. بک‌آپ از تنظیمات فعلی
cp /opt/nexora-panel/data/config.json /root/config-backup.json

# ۲. آپلود و باز کردن zip جدید در /root

# ۳. جایگزینی فایل‌ها (تنظیمات دست‌نخورده می‌ماند)
cd /root
unzip -o nexora-subpage-admin.zip
cp -r nexora-subpage-admin/backend/* /opt/nexora-panel/backend/
cp -r nexora-subpage-admin/frontend/src/* /opt/nexora-panel/frontend/src/
cp nexora-subpage-admin/sub-page-index.html /opt/nexora-panel/

# ۴. ⚠️ دوباره آدرس بک‌اند را تنظیم کنید
nano /opt/nexora-panel/sub-page-index.html   # SUBPAGE_CONFIG_API
cp /opt/nexora-panel/sub-page-index.html /root/sub-page/index.html

# ۵. بیلد مجدد و ری‌استارت
cd /opt/nexora-panel/frontend && npm run build
systemctl restart nexora-panel
```

---

# 📋 چک‌لیست نهایی

- [ ] پیش‌نیازها نصب شدند (python3، node، nginx)
- [ ] فایل‌ها در `/opt/nexora-panel` هستند
- [ ] بک‌اند نصب شد (`venv`)
- [ ] **`SUBPAGE_CONFIG_API` در فایل HTML تغییر کرد**
- [ ] فایل در `/root/sub-page/index.html` کپی شد
- [ ] مسیر `/root/sub-page/` در پنل 3x-ui ثبت شد
- [ ] سرویس systemd ساخته و فعال شد
- [ ] `curl http://127.0.0.1:8100/api/health` جواب `{"ok":true}` داد
- [ ] `npm run build` موفق بود
- [ ] گواهی SSL در `/etc/nginx/ssl/` قرار گرفت
- [ ] `nginx -t` بدون خطا رد شد
- [ ] پنل در مرورگر باز شد
- [ ] رمز عبور قوی تنظیم شد
- [ ] دسترسی پنل محدود شد (IP یا Cloudflare Access)
- [ ] بک‌آپ خودکار تنظیم شد
