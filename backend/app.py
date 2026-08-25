"""بک‌اند پنل مدیریت صفحه‌ی اشتراک Nexora"""

import os
import json
import re as _re
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

CONFIG_PATH = Path(os.getenv("CONFIG_PATH", "../data/config.json"))
AUTH_PATH = Path(os.getenv("AUTH_PATH", str(CONFIG_PATH.parent / "auth.json")))
ADMIN_PASSWORD = os.getenv("NEXORA_SUBPAGE_ADMIN_PASSWORD", "change-me")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")


def load_password():
    """
    رمز عبور فعلی را برمی‌گرداند.
    اگر مدیر رمز را از داخل پنل عوض کرده باشد، از فایل auth.json خوانده می‌شود؛
    در غیر این‌صورت از متغیر محیطی (که هنگام نصب تنظیم شده) استفاده می‌شود.
    """
    if AUTH_PATH.exists():
        try:
            with open(AUTH_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                pw = data.get("password")
                if pw:
                    return pw
        except (json.JSONDecodeError, OSError):
            pass
    return ADMIN_PASSWORD


def save_password(new_password: str):
    AUTH_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(AUTH_PATH, "w", encoding="utf-8") as f:
        json.dump({"password": new_password}, f, ensure_ascii=False, indent=2)
    # محدود کردن دسترسی فایل به مالک (فقط روی سیستم‌های یونیکسی)
    try:
        os.chmod(AUTH_PATH, 0o600)
    except OSError:
        pass

DEFAULT_CONFIG = {
    "downloadApps": {
        "android": [
            {"id": "happ", "name": "Happ", "url": "https://github.com/Happ-proxy/happ-android/releases/download/3.26.3/Happ.apk", "recommended": True, "icon": "bolt", "scheme": "happ"},
            {"id": "v2rayng", "name": "v2rayNG", "url": "https://github.com/2dust/v2rayNG/releases/download/2.2.6/v2rayNG_2.2.6_arm64-v8a.apk", "recommended": False, "icon": "paper-plane", "scheme": "v2rayng"}
        ],
        "ios": [
            {"id": "happ", "name": "Happ", "url": "https://apps.apple.com/us/app/happ-proxy-utility/id6504287215", "recommended": True, "icon": "bolt", "scheme": "happ"},
            {"id": "v2box", "name": "V2Box", "url": "https://apps.apple.com/us/app/v2box-v2ray-client/id6446814690", "recommended": False, "icon": "shield-halved", "scheme": "v2box"}
        ],
        "desktop": [
            {"id": "happ", "name": "Happ (Windows)", "url": "https://github.com/Happ-proxy/happ-desktop/releases/download/3.3.6/setup-Happ.x64.exe", "recommended": True, "icon": "bolt", "scheme": "happ"},
            {"id": "v2rayn", "name": "v2rayN (Windows)", "url": "https://github.com/2dust/v2rayN/releases/download/7.24.1/v2rayN-windows-arm64.zip", "recommended": False, "icon": "box-open", "scheme": "none"}
        ]
    },
    "faq": {
        "fa": [
            {"q": "چرا نمی‌توانم وصل شوم؟", "a": "اول مطمئن شوید آخرین نسخه‌ی اپ پیشنهادی (Happ) را نصب کرده‌اید و کانفیگ را درست وارد کرده‌اید."},
            {"q": "چطور اشتراکم را تمدید کنم؟", "a": "روی دکمه‌ی «تمدید ساب» در داشبورد بزنید یا مستقیم به پشتیبانی پیام دهید."}
        ],
        "en": [{"q": "Why can't I connect?", "a": "Make sure you've installed the latest version of our recommended app (Happ)."}],
        "tr": [], "ar": []
    },
    "banners": {
        "enabled": True,
        "lowQuotaDaysThreshold": 3,
        "lowQuotaPercentThreshold": 15,
        "disabledTitle": "",
        "disabledDesc": "",
        "disabledButtonText": "",
        "lowQuotaTitle": "",
        "lowQuotaDescDays": "",
        "lowQuotaDescVolume": "",
        "lowQuotaButtonText": "",
        "lowQuotaButtonUrl": ""
    },
    "referral": {"enabled": True},
    "links": {"supportUsername": "crm_nexoravpn", "channelUsername": "yanexoravpn"},
    "videoTutorialUrl": None,
    "videos": [],
    "advanced": {
        "brandName": "NEXORA",
        "pageTitle": "Nexora | مدیریت اشتراک",
        "accentColor": "#2B7FD6",
        "accentColor2": "#5AA9E6",
        "defaultLanguage": "fa",
        "defaultTheme": "dark",
        "showNotificationPopup": True,
        "notificationDelaySeconds": 10,
        "showBrandStrip": True,
        "showReferralCard": True,
        "showFaqSection": True,
        "customCss": "",
        "customFooterText": "",
        "allowThemeToggle": True,
        "allowLanguageToggle": True,
        "hideConfigsList": False
    },
    "popup": {
        "enabled": True,
        "delaySeconds": 10,
        "icon": "🔔",
        "title": "آیا مشکلی در اتصال کانفیگ دارید؟",
        "description": "پیشنهاد می‌کنیم از برنامه‌ی Happ استفاده کنید؛ در غیر این صورت به پشتیبانی پیام بدهید",
        "primaryButtonText": "پشتیبانی",
        "primaryButtonUrl": "",
        "dismissButtonText": "خیر",
        "autoCloseSeconds": 15
    },
    "bot": {
        "enabled": False,
        "token": "",
        "adminChatId": "",
        "welcomeMessage": "سلام! به ربات Nexora خوش آمدید 👋",
        "notifyOnPurchase": True,
        "notifyOnExpiry": True,
        "expiryReminderDays": 3
    },
    "resellers": [],
    "template": "classic",
    "palette": "ocean",
    "customPalettes": []
}


# ---------------------------------------------------------------
# قالب‌های داخلی صفحه‌ی اشتراک
# ---------------------------------------------------------------
# هر قالب فقط ظاهر را عوض می‌کند؛ داده و منطق یکسان می‌ماند.
# layout مشخص می‌کند کدام چیدمان استفاده شود:
#   standard = حلقه پیشرفت + کارت‌ها
#   compact  = نوار افقی فشرده
#   glass    = کارت‌های شیشه‌ای با عدد درشت
# ═══════════════════════════════════════════════════════════
#  سیستم قالب: ساختار (template) × طیف رنگی (palette)
#  جدا نگه داشتن این دو یعنی با ۴ ساختار و ۸ پالت،
#  ۳۲ ترکیب در اختیار کاربر است — و افزودن یک پالت جدید
#  خودکار ۴ ترکیب تازه می‌سازد.
# ═══════════════════════════════════════════════════════════

TEMPLATES = [
    {"id": "classic", "name": "Classic", "fa": "کلاسیک",
     "desc": "ظاهر پیش‌فرض — ساده و آشنا"},
    {"id": "analytics", "name": "Analytics", "fa": "تحلیلی",
     "desc": "کارت‌های آماری برجسته با حاشیه‌های رنگی"},
    {"id": "wallet", "name": "Wallet", "fa": "کیف پول",
     "desc": "کارت اصلی گرادینتی + دکمه‌های گرد"},
    {"id": "console", "name": "Console", "fa": "کنسول",
     "desc": "حس ترمینال — مونواسپیس و گوشه‌های تیز"},
]

PALETTES = [
    {"id": "ocean", "name": "Ocean", "fa": "اقیانوس", "builtin": True, "vars": {
        "accent": "#2B7FD6", "accent2": "#5AA9E6", "bg": "#06090F",
        "surface": "#0D1420", "surfaceAlt": "#0A0E17",
        "border": "rgba(255,255,255,0.06)", "text": "#E8EEF7", "textMuted": "#5A6880"}},
    {"id": "violet", "name": "Violet", "fa": "بنفش", "builtin": True, "vars": {
        "accent": "#8B5CF6", "accent2": "#C084FC", "bg": "#0A0713",
        "surface": "#150F26", "surfaceAlt": "#0F0A1C",
        "border": "rgba(255,255,255,0.07)", "text": "#EDE9F7", "textMuted": "#6B6188"}},
    {"id": "ember", "name": "Ember", "fa": "آتشین", "builtin": True, "vars": {
        "accent": "#F97316", "accent2": "#FB923C", "bg": "#0C0906",
        "surface": "#181109", "surfaceAlt": "#120C07",
        "border": "rgba(255,255,255,0.07)", "text": "#FBEDE6", "textMuted": "#8F7365"}},
    {"id": "forest", "name": "Forest", "fa": "جنگل", "builtin": True, "vars": {
        "accent": "#10B981", "accent2": "#34D399", "bg": "#04100C",
        "surface": "#0A1D16", "surfaceAlt": "#071711",
        "border": "rgba(255,255,255,0.06)", "text": "#E4F7EF", "textMuted": "#5A806F"}},
    {"id": "rose", "name": "Rose", "fa": "رز", "builtin": True, "vars": {
        "accent": "#EC4899", "accent2": "#F472B6", "bg": "#0E060B",
        "surface": "#1B0D16", "surfaceAlt": "#150A11",
        "border": "rgba(255,255,255,0.07)", "text": "#FDF2FA", "textMuted": "#8B6F80"}},
    {"id": "gold", "name": "Gold", "fa": "طلایی", "builtin": True, "vars": {
        "accent": "#D4AF37", "accent2": "#E8C766", "bg": "#0C0A07",
        "surface": "#171310", "surfaceAlt": "#110E0B",
        "border": "rgba(212,175,55,0.16)", "text": "#F5EFE2", "textMuted": "#8F8371"}},
    {"id": "cyan", "name": "Cyan", "fa": "فیروزه‌ای", "builtin": True, "vars": {
        "accent": "#06B6D4", "accent2": "#22D3EE", "bg": "#04121A",
        "surface": "#0A2029", "surfaceAlt": "#071821",
        "border": "rgba(255,255,255,0.07)", "text": "#E0F5FA", "textMuted": "#6E96A3"}},
    {"id": "slate", "name": "Slate", "fa": "خاکستری", "builtin": True, "vars": {
        "accent": "#94A3B8", "accent2": "#CBD5E1", "bg": "#0B0C0F",
        "surface": "#14161B", "surfaceAlt": "#101216",
        "border": "rgba(255,255,255,0.09)", "text": "#F1F5F9", "textMuted": "#6B7480"}},
]


def get_template(tpl_id=None):
    for t in TEMPLATES:
        if t["id"] == tpl_id:
            return t
    return TEMPLATES[0]


def get_palette(cfg, pal_id=None):
    for p in PALETTES:
        if p["id"] == pal_id:
            return p
    for p in cfg.get("customPalettes", []):
        if p.get("id") == pal_id:
            return p
    return PALETTES[0]


def resolve_theme(cfg, template_id=None, palette_id=None):
    """ترکیب ساختار و رنگ — چیزی که صفحه‌ی اشتراک برای رندر لازم دارد."""
    tpl = get_template(template_id or cfg.get("template"))
    pal = get_palette(cfg, palette_id or cfg.get("palette"))
    return {
        "template": tpl["id"], "templateName": tpl["name"],
        "palette": pal["id"], "paletteName": pal["name"],
        "vars": pal.get("vars", {}),
    }


def deep_merge(base: dict, override: dict) -> dict:
    """ادغام عمیق: مقادیر override روی base می‌نشینند، بقیه دست‌نخورده می‌مانند."""
    result = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def find_reseller(cfg: dict, email: str = None, host: str = None):
    """
    واسطه‌ی مربوطه را پیدا می‌کند. اولویت با دامنه است (دقیق‌تر)،
    بعد پیشوند ایمیل. اگر هیچ‌کدام نخورد، None برمی‌گرداند
    (یعنی برند اصلی خودتان نمایش داده می‌شود).
    """
    resellers = [r for r in cfg.get("resellers", []) if r.get("enabled", True)]

    # ۱. تطبیق دامنه (دقیق‌تر، اولویت بالاتر)
    if host:
        clean_host = host.split(":")[0].lower().strip()
        # حذف www. برای تطبیق راحت‌تر
        if clean_host.startswith("www."):
            clean_host = clean_host[4:]
        for r in resellers:
            for d in (r.get("domains") or []):
                d_clean = d.lower().strip().replace("https://", "").replace("http://", "").split("/")[0]
                if d_clean.startswith("www."):
                    d_clean = d_clean[4:]
                if d_clean and (clean_host == d_clean or clean_host.endswith("." + d_clean)):
                    return r

    # ۲. تطبیق پیشوند ایمیل
    if email:
        e = email.lower().strip()
        for r in resellers:
            prefix = (r.get("emailPrefix") or "").lower().strip()
            if prefix and (e.startswith(prefix + "_") or e.startswith(prefix + "-") or e.startswith(prefix + ".")):
                return r

    return None

app = FastAPI(title="Nexora Sub Page Config API")
app.add_middleware(CORSMiddleware, allow_origins=[ALLOWED_ORIGIN], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def load_config():
    """
    تنظیمات را می‌خواند و همیشه یک ساختار کامل برمی‌گرداند.

    نکته‌ی مهم: اگر فایل ذخیره‌شده از نسخه‌ی قدیمی‌تر باشد و فیلدهای جدید
    (مثل videos، popup، bot، resellers) را نداشته باشد، آن‌ها از مقادیر
    پیش‌فرض پر می‌شوند. بدون این کار، پنل مدیریت هنگام دسترسی به فیلد
    ناموجود کرش می‌کند.
    """
    if not CONFIG_PATH.exists():
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        save_config(DEFAULT_CONFIG)
        return json.loads(json.dumps(DEFAULT_CONFIG))

    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            stored = json.load(f)
    except (json.JSONDecodeError, OSError):
        # فایل خراب است — از پیش‌فرض استفاده می‌کنیم تا سرویس از کار نیفتد
        return json.loads(json.dumps(DEFAULT_CONFIG))

    if not isinstance(stored, dict):
        return json.loads(json.dumps(DEFAULT_CONFIG))

    # ادغام: مقادیر ذخیره‌شده روی پیش‌فرض می‌نشینند،
    # ولی هر فیلدی که در ذخیره‌شده نباشد از پیش‌فرض می‌آید
    merged = deep_merge(json.loads(json.dumps(DEFAULT_CONFIG)), stored)

    # تضمین اینکه کلیدهای زبان FAQ همیشه وجود دارند
    faq = merged.setdefault("faq", {})
    # اگر faq خودش دیکشنری نباشد (فایل دستی خراب شده)، بازش می‌سازیم.
    # setdefault فقط وقتی کلید نباشد کمک می‌کند — نه وقتی مقدارش نوع اشتباه دارد.
    if not isinstance(faq, dict):
        faq = merged["faq"] = {}
    for lang in ("fa", "en", "tr", "ar"):
        if not isinstance(faq.get(lang), list):
            faq[lang] = []

    # تضمین اینکه کلیدهای پلتفرم اپ‌ها همیشه وجود دارند
    apps = merged.setdefault("downloadApps", {})
    if not isinstance(apps, dict):
        apps = merged["downloadApps"] = {}
    for os_key in ("android", "ios", "desktop"):
        if not isinstance(apps.get(os_key), list):
            apps[os_key] = []

    for key in ("videos", "resellers", "customPalettes"):
        if not isinstance(merged.get(key), list):
            merged[key] = []

    # دیکشنری‌های تودرتو — اگر نوعشان خراب باشد، فرانت‌اند روی
    # خواندن فیلدهایشان کرش می‌کند
    for key in ("advanced", "links", "banners", "popup", "referral", "bot"):
        if not isinstance(merged.get(key), dict):
            merged[key] = dict(DEFAULT_CONFIG.get(key) or {})

    # مهاجرت از سیستم قدیمی (theme واحد) به سیستم ترکیبی.
    # نکته: چون DEFAULT_CONFIG خودش template دارد، باید بررسی کنیم که
    # کاربر در فایل ذخیره‌شده‌اش template نداشته — نه در نسخه‌ی ادغام‌شده.
    if stored.get("theme") and not stored.get("template"):
        old_map = {
            "aurora": ("classic", "ocean"), "midnight": ("classic", "violet"),
            "emerald": ("classic", "forest"), "sunset": ("wallet", "ember"),
            "carbon": ("console", "slate"), "neon": ("console", "rose"),
            "ocean": ("analytics", "cyan"), "royal": ("wallet", "gold"),
            "minimal": ("classic", "slate"),
        }
        tpl, pal = old_map.get(stored.get("theme"), ("classic", "ocean"))
        merged["template"] = tpl
        merged["palette"] = pal
    merged.setdefault("template", "classic")
    merged.setdefault("palette", "ocean")

    return merged


def save_config(data):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def check_auth(x_admin_password: str = Header(...)):
    if x_admin_password != load_password():
        raise HTTPException(status_code=401, detail="رمز عبور نادرست است")


@app.get("/api/public/config")
def get_public_config(request: Request, response: Response, email: str = None, host: str = None):
    """
    تنظیمات را برمی‌گرداند. اگر مشتری متعلق به یک واسطه باشد،
    تنظیمات همان واسطه (ادغام‌شده روی تنظیمات پایه) برگردانده می‌شود.

    تشخیص واسطه:
      - پارامتر host یا هدر Origin/Referer (تطبیق دامنه)
      - پارامتر email (تطبیق پیشوند ایمیل کلاینت)
    """
    # جلوگیری از کش شدن توسط مرورگر، کلودفلر یا هر CDN دیگری.
    # بدون این، مشتری ممکن است ساعت‌ها تنظیمات قدیمی را ببیند.
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    cfg = load_config()

    # اگر host به‌صراحت داده نشده، از Origin یا Referer استخراج می‌کنیم
    if not host:
        origin = request.headers.get("origin") or request.headers.get("referer") or ""
        if origin:
            host = origin.replace("https://", "").replace("http://", "").split("/")[0]

    reseller = find_reseller(cfg, email=email, host=host)

    # اطلاعات حساس هرگز نباید به بیرون درز کند:
    # - resellers: لیست واسطه‌ها و شرایطشان (اطلاعات تجاری)
    # - bot: توکن ربات و آیدی ادمین (اگر لو برود، کنترل ربات از دست می‌رود)
    SENSITIVE_KEYS = {"resellers", "bot"}
    public_cfg = {k: v for k, v in cfg.items() if k not in SENSITIVE_KEYS}

    if reseller:
        public_cfg = deep_merge(public_cfg, reseller.get("overrides", {}))
        public_cfg["_resellerId"] = reseller.get("id")

    # قالب فعال را به‌صورت کامل ضمیمه می‌کنیم تا صفحه‌ی اشتراک
    # بتواند مستقیم متغیرهای رنگ و چیدمان را اعمال کند.
    # واسطه می‌تواند قالب متفاوتی داشته باشد (theme در overrides).
    # ترکیب ساختار و رنگ — واسطه می‌تواند هر دو را متفاوت داشته باشد
    public_cfg["_theme"] = resolve_theme(
        cfg, public_cfg.get("template"), public_cfg.get("palette")
    )

    return public_cfg


@app.get("/api/admin/themes")
def list_themes(x_admin_password: str = Header(...)):
    """ساختارها و پالت‌ها برای انتخاب در پنل."""
    check_auth(x_admin_password)
    cfg = load_config()
    return {
        "currentTemplate": cfg.get("template", "classic"),
        "currentPalette": cfg.get("palette", "ocean"),
        "templates": TEMPLATES,
        "palettes": PALETTES,
        "customPalettes": cfg.get("customPalettes", []),
    }


@app.post("/api/admin/palettes")
def add_custom_palette(payload: dict, x_admin_password: str = Header(...)):
    """افزودن پالت رنگی سفارشی."""
    check_auth(x_admin_password)
    cfg = load_config()

    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="نام پالت الزامی است")

    customs = cfg.setdefault("customPalettes", [])
    if len(customs) >= 20:
        raise HTTPException(status_code=400, detail="حداکثر ۲۰ پالت سفارشی مجاز است")

    pal_id = payload.get("id") or f"pal-{int(datetime.now().timestamp())}"
    if any(p.get("id") == pal_id for p in customs) or any(p["id"] == pal_id for p in PALETTES):
        raise HTTPException(status_code=400, detail="پالتی با این شناسه وجود دارد")

    allowed = {"accent", "accent2", "bg", "surface", "surfaceAlt", "border", "text", "textMuted"}
    raw = payload.get("vars") or {}
    pal = {
        "id": pal_id,
        "name": name,
        "fa": (payload.get("fa") or name).strip(),
        "builtin": False,
        "vars": {k: str(v)[:60] for k, v in raw.items() if k in allowed},
    }

    customs.append(pal)
    save_config(cfg)
    return {"ok": True, "palette": pal}


@app.delete("/api/admin/palettes/{palette_id}")
def delete_custom_palette(palette_id: str, x_admin_password: str = Header(...)):
    """حذف پالت سفارشی. پالت‌های داخلی حذف نمی‌شوند."""
    check_auth(x_admin_password)
    cfg = load_config()

    customs = cfg.get("customPalettes", [])
    if not any(p.get("id") == palette_id for p in customs):
        raise HTTPException(status_code=404, detail="پالت پیدا نشد")

    cfg["customPalettes"] = [p for p in customs if p.get("id") != palette_id]

    if cfg.get("palette") == palette_id:
        cfg["palette"] = "ocean"
    for r in cfg.get("resellers", []):
        if r.get("overrides", {}).get("palette") == palette_id:
            r["overrides"].pop("palette", None)

    save_config(cfg)
    return {"ok": True}


@app.post("/api/login")
def login(payload: dict):
    if payload.get("password") != load_password():
        raise HTTPException(status_code=401, detail="رمز عبور نادرست است")
    return {"ok": True}


@app.get("/api/admin/config")
def get_admin_config(x_admin_password: str = Header(...)):
    check_auth(x_admin_password)
    return load_config()


@app.put("/api/admin/config")
def update_config(payload: dict, x_admin_password: str = Header(...)):
    check_auth(x_admin_password)
    save_config(payload)
    return {"ok": True}


@app.post("/api/admin/reset-defaults")
def reset_defaults(x_admin_password: str = Header(...)):
    check_auth(x_admin_password)
    save_config(DEFAULT_CONFIG)
    return DEFAULT_CONFIG


@app.get("/api/admin/stats")
def get_stats(x_admin_password: str = Header(...)):
    """آمار خلاصه برای نمایش در داشبورد."""
    check_auth(x_admin_password)
    cfg = load_config()

    apps = cfg.get("downloadApps", {})
    faq = cfg.get("faq", {})
    videos = cfg.get("videos", [])
    advanced = cfg.get("advanced", {})

    apps_count = sum(len(v or []) for v in apps.values())
    faq_count = sum(len(v or []) for v in faq.values())

    # شمارش اپ‌های پیشنهادی تعیین‌شده
    recommended = {}
    for os_key, lst in apps.items():
        rec = next((a for a in (lst or []) if a.get("recommended")), None)
        recommended[os_key] = rec.get("name") if rec else None

    active_features = {
        "banners": cfg.get("banners", {}).get("enabled", False),
        "referral": cfg.get("referral", {}).get("enabled", False),
        "faqSection": advanced.get("showFaqSection", True),
        "notificationPopup": advanced.get("showNotificationPopup", True),
        "brandStrip": advanced.get("showBrandStrip", True),
    }

    return {
        "appsCount": apps_count,
        "faqCount": faq_count,
        "videosCount": len(videos),
        "appsPerPlatform": {k: len(v or []) for k, v in apps.items()},
        "faqPerLanguage": {k: len(v or []) for k, v in faq.items()},
        "recommendedApps": recommended,
        "activeFeatures": active_features,
        "activeFeaturesCount": sum(1 for v in active_features.values() if v),
    }


def render_preview_html(raw: str) -> str:
    """
    فایل قالب را برای پیش‌نمایش آماده می‌کند.

    چون فایل یک قالب Go template است (که فقط پنل 3x-ui می‌تواند رندرش کند)،
    برای نمایش در پنل مدیریت، متغیرهای {{ .xxx }} را با داده‌ی نمونه
    جایگزین می‌کنیم — دقیقاً همان کاری که پنل واقعی با داده‌ی واقعی می‌کند.
    """

    now = int(datetime.now().timestamp())
    sample = {
        "sId": "preview-sample-id",
        "enabled": "true",
        "expire": str(now + 15 * 86400),
        "downloadByte": "3221225472",
        "uploadByte": "536870912",
        "totalByte": "32212254720",
        "subUrl": "https://example.com/sub/preview-sample",
        "subJsonUrl": "https://example.com/json/preview-sample",
        "subClashUrl": "https://example.com/clash/preview-sample",
        "subTitle": "NexoraVpn",
        "subSupportUrl": "https://t.me/crm_nexoravpn",
        "datepicker": "gregorian",
        "lastOnline": str((now - 300) * 1000),
        "download": "3.0 GB",
        "upload": "512 MB",
        "total": "30 GB",
        "used": "3.5 GB",
        "remained": "26.5 GB",
    }

    out = raw

    # ۱. حلقه‌ی emails
    # نکته: از lambda استفاده می‌کنیم چون رشته‌ی جایگزین ممکن است شامل
    # کاراکترهایی مثل \u باشد که re.sub آن‌ها را به‌عنوان escape تفسیر می‌کند.
    out = _re.sub(
        r"\[\s*\{\{\s*range\s+\$i,\s*\$e\s*:=\s*\.emails\s*\}\}.*?\{\{\s*end\s*\}\}\s*\]",
        lambda m: '["preview@nexora"]',
        out, flags=_re.DOTALL,
    )

    # ۲. حلقه‌ی links
    sample_links = (
        '["vless://11111111-2222-3333-4444-555555555555@example.com:443'
        '?type=ws&security=tls&path=%2Fpreview#FR-Nexora-Sample-1",'
        '"vless://11111111-2222-3333-4444-555555555555@example.com:2053'
        '?type=ws&security=tls&path=%2Fpreview#TR-Nexora-Sample-2"]'
    )
    out = _re.sub(
        r"\[\s*\{\{\s*range\s+\$i,\s*\$l\s*:=\s*\.links\s*\}\}.*?\{\{\s*end\s*\}\}\s*\]",
        lambda m: sample_links,
        out, flags=_re.DOTALL,
    )

    # ۳. متغیرهای ساده
    for key, val in sample.items():
        out = _re.sub(r"\{\{\s*\." + key + r"\s*\}\}", lambda m, v=val: v, out)

    # ۴. هر متغیر باقی‌مانده‌ی ناشناخته → رشته‌ی خالی (تا JS نشکند)
    out = _re.sub(r"\{\{[^}]*\}\}", lambda m: "", out)

    return out


@app.get("/api/preview", response_class=HTMLResponse)
def preview_subpage():
    """صفحه‌ی اشتراک را با داده‌ی نمونه برای مشاهده در پنل مدیریت سرو می‌کند."""
    html_path = Path(os.getenv("SUBPAGE_HTML_PATH", "../sub-page-index.html"))
    if not html_path.exists():
        return HTMLResponse(
            "<div style='font-family:sans-serif;padding:40px;text-align:center;"
            "color:#888;background:#06090f;height:100vh'>فایل قالب پیدا نشد.<br>"
            f"مسیر مورد انتظار: {html_path.resolve()}</div>",
            status_code=404,
        )

    raw = html_path.read_text(encoding="utf-8")
    return HTMLResponse(render_preview_html(raw))


@app.post("/api/admin/change-password")
def change_password(payload: dict, x_admin_password: str = Header(...)):
    """
    تغییر رمز عبور مدیریت.
    نیازمند رمز فعلی است تا اگر کسی به مرورگر باز شما دسترسی پیدا کرد،
    نتواند بدون دانستن رمز فعلی آن را عوض کند.
    """
    check_auth(x_admin_password)

    current = payload.get("currentPassword", "")
    new = payload.get("newPassword", "")

    if current != load_password():
        raise HTTPException(status_code=400, detail="رمز عبور فعلی نادرست است")

    if len(new) < 8:
        raise HTTPException(status_code=400, detail="رمز جدید باید حداقل ۸ کاراکتر باشد")

    if new == current:
        raise HTTPException(status_code=400, detail="رمز جدید نباید با رمز فعلی یکسان باشد")

    save_password(new)
    return {"ok": True, "message": "رمز عبور با موفقیت تغییر کرد"}


@app.get("/api/admin/export")
def export_config(x_admin_password: str = Header(...)):
    """خروجی کامل تنظیمات برای پشتیبان‌گیری (بدون رمز عبور)."""
    check_auth(x_admin_password)
    cfg = load_config()
    return {
        "_exportedAt": datetime.now().isoformat(),
        "_version": "1.0",
        "config": cfg,
    }


@app.post("/api/admin/import")
def import_config(payload: dict, x_admin_password: str = Header(...)):
    """بازیابی تنظیمات از فایل پشتیبان."""
    check_auth(x_admin_password)

    cfg = payload.get("config") or payload
    if not isinstance(cfg, dict) or "downloadApps" not in cfg:
        raise HTTPException(status_code=400, detail="فایل پشتیبان معتبر نیست")

    # پشتیبان از نسخه‌ی فعلی قبل از بازنویسی (برای بازگشت در صورت اشتباه)
    try:
        backup_path = CONFIG_PATH.parent / f"config.backup.{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as src, open(backup_path, "w", encoding="utf-8") as dst:
                dst.write(src.read())
    except OSError:
        pass

    save_config(cfg)
    return {"ok": True, "message": "تنظیمات با موفقیت بازیابی شد"}


def _frontend_build_info():
    """
    وضعیت بیلد فرانت‌اند.

    اگر بیلد قدیمی‌تر از کد باشد، یعنی آخرین به‌روزرسانی بیلد نشده و
    کاربر دارد نسخه‌ی قبلی پنل را می‌بیند — دقیقاً همان حالتی که
    گیج‌کننده است چون VERSION جدید نشان می‌دهد.
    """
    root = _root_dir()
    dist = root / "frontend" / "dist" / "index.html"
    src = root / "frontend" / "src" / "App.jsx"

    if not dist.exists():
        return {"built": False, "stale": True,
                "note": "پنل هنوز ساخته نشده — nexora rebuild را اجرا کنید"}

    try:
        d_time = dist.stat().st_mtime
        s_time = src.stat().st_mtime if src.exists() else 0
        stale = s_time > d_time + 5
        return {
            "built": True,
            "stale": stale,
            "builtAt": datetime.fromtimestamp(d_time).isoformat(timespec="seconds"),
            "note": ("کد جدیدتر از بیلد است — nexora rebuild را اجرا کنید"
                     if stale else None),
        }
    except OSError:
        return {"built": True, "stale": False}


@app.get("/api/admin/system")
def system_info(x_admin_password: str = Header(...)):
    """اطلاعات نسخه و وضعیت سیستم برای نمایش در پنل."""
    check_auth(x_admin_password)

    version = "unknown"
    version_file = Path(__file__).resolve().parent.parent / "VERSION"
    if version_file.exists():
        try:
            version = version_file.read_text(encoding="utf-8").strip()
        except OSError:
            pass

    html_path = Path(os.getenv("SUBPAGE_HTML_PATH", "../sub-page-index.html"))
    template_ok = html_path.exists()
    template_size = html_path.stat().st_size if template_ok else 0

    # آدرس API تنظیم‌شده داخل قالب
    api_url = None
    if template_ok:
        try:
            content = html_path.read_text(encoding="utf-8")
            m = _re.search(r'const SUBPAGE_CONFIG_API = "([^"]*)"', content)
            if m:
                api_url = m.group(1)
        except OSError:
            pass

    cfg = load_config()
    return {
        "build": _frontend_build_info(),
        "version": version,
        "template": {
            "path": str(html_path),
            "exists": template_ok,
            "size": template_size,
            "apiUrl": api_url,
        },
        "counts": {
            "apps": sum(len(v or []) for v in cfg.get("downloadApps", {}).values()),
            "faq": sum(len(v or []) for v in cfg.get("faq", {}).values()),
            "videos": len(cfg.get("videos", [])),
            "resellers": len(cfg.get("resellers", [])),
        },
        "configPath": str(CONFIG_PATH),
        "configExists": CONFIG_PATH.exists(),
    }


@app.get("/api/admin/check-update")
def check_update(x_admin_password: str = Header(...)):
    """
    بررسی وجود نسخه‌ی جدید در گیت‌هاب.
    فقط چک می‌کند — چیزی نصب نمی‌کند.
    """
    check_auth(x_admin_password)

    root = Path(__file__).resolve().parent.parent
    current = "unknown"
    vf = root / "VERSION"
    if vf.exists():
        try:
            current = vf.read_text(encoding="utf-8").strip()
        except OSError:
            pass

    # خواندن مخزن از فایل .github (اگر نصب‌کننده آن را ساخته باشد)
    repo, token = None, None
    gh = root / ".github"
    if gh.exists():
        try:
            for line in gh.read_text(encoding="utf-8").splitlines():
                if line.startswith("GITHUB_REPO="):
                    repo = line.split("=", 1)[1].strip().strip('"').strip("'")
                elif line.startswith("GITHUB_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"').strip("'")
        except OSError:
            pass

    if not repo:
        return {
            "currentVersion": current,
            "latestVersion": None,
            "updateAvailable": False,
            "configured": False,
            "message": "به‌روزرسانی خودکار تنظیم نشده است",
        }

    try:
        import urllib.request

        req = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/releases/latest",
            headers={"Accept": "application/vnd.github+json", "User-Agent": "nexora-panel"},
        )
        if token:
            req.add_header("Authorization", f"token {token}")

        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.load(resp)

        latest = (data.get("tag_name") or "").lstrip("v")
        notes = data.get("body") or ""
        published = data.get("published_at")

        def parse(v):
            try:
                return tuple(int(x) for x in v.split("."))
            except (ValueError, AttributeError):
                return (0,)

        available = bool(latest) and parse(latest) > parse(current)

        return {
            "currentVersion": current,
            "latestVersion": latest,
            "updateAvailable": available,
            "configured": True,
            "releaseNotes": notes[:2000],
            "publishedAt": published,
            "repo": repo,
        }
    except Exception as e:
        return {
            "currentVersion": current,
            "latestVersion": None,
            "updateAvailable": False,
            "configured": True,
            "error": str(e)[:200],
            "message": "ارتباط با گیت‌هاب برقرار نشد",
        }


@app.post("/api/admin/run-update")
def run_update(x_admin_password: str = Header(...)):
    """
    اجرای به‌روزرسانی در پس‌زمینه.

    نکته: این عملیات سرویس را ری‌استارت می‌کند، پس نمی‌توانیم منتظر
    نتیجه‌اش بمانیم. اسکریپت جدا (detached) اجرا می‌شود تا بعد از
    قطع شدن این پروسه هم ادامه پیدا کند.
    """
    check_auth(x_admin_password)

    root = Path(__file__).resolve().parent.parent
    if not (root / ".github").exists():
        raise HTTPException(status_code=400, detail="به‌روزرسانی خودکار تنظیم نشده است")

    cli = Path("/usr/local/bin/nexora")
    if not cli.exists():
        cli = root / "nexora-cli.sh"
    if not cli.exists():
        raise HTTPException(status_code=400, detail="اسکریپت به‌روزرسانی پیدا نشد")

    log_path = "/tmp/nexora-update.log"
    try:
        import subprocess

        subprocess.Popen(
            f"nohup bash {cli} update > {log_path} 2>&1 &",
            shell=True,
            start_new_session=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"اجرای به‌روزرسانی ناموفق بود: {e}")

    return {
        "ok": True,
        "message": "به‌روزرسانی شروع شد. حدود ۲ تا ۵ دقیقه طول می‌کشد.",
        "logPath": log_path,
    }


@app.get("/api/admin/update-log")
def update_log(x_admin_password: str = Header(...)):
    """خواندن لاگ آخرین به‌روزرسانی."""
    check_auth(x_admin_password)
    p = Path("/tmp/nexora-update.log")
    if not p.exists():
        return {"exists": False, "lines": []}
    try:
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        # حذف کدهای رنگ ترمینال برای نمایش تمیز در مرورگر
        clean = [_re.sub(r"\x1b\[[0-9;]*m", "", ln) for ln in lines[-60:]]
        # نشانه‌های پایان کار — چند حالت مختلف را پوشش می‌دهیم چون
        # اسکریپت ممکن است با پیام‌های متفاوتی تمام شود
        end_markers = ("UPDATE COMPLETE", "Already on the latest",
                       "Version did not change", "ROLLBACK COMPLETE")
        done = any(any(m in ln for m in end_markers) for ln in clean)
        failed = any(ln.strip().startswith("✗") for ln in clean)
        return {"exists": True, "lines": clean, "finished": done, "failed": failed}
    except OSError as e:
        return {"exists": False, "lines": [], "error": str(e)}


# ═══════════════════════════════════════════════════════════
#  مدیریت ربات — ماژول جدا (bot/)
#  پنل فقط به دیتابیس ربات نگاه می‌کند؛ اگر ربات نصب نباشد،
#  این endpointها پاسخ خالی می‌دهند و پنل مثل قبل کار می‌کند.
# ═══════════════════════════════════════════════════════════

BOT_DB = Path(os.getenv("BOT_DB_PATH", str(CONFIG_PATH.parent / "bot.db")))


def _bot_conn():
    """اتصال فقط‌خواندنی به دیتابیس ربات. اگر نبود، None."""
    if not BOT_DB.exists():
        return None
    try:
        import sqlite3
        con = sqlite3.connect(f"file:{BOT_DB}?mode=ro", uri=True, timeout=5)
        con.row_factory = sqlite3.Row
        return con
    except Exception:
        return None


@app.get("/api/admin/bot/status")
def bot_status(x_admin_password: str = Header(...)):
    """وضعیت کلی ربات — نصب شده؟ فعال است؟ چند کاربر؟"""
    check_auth(x_admin_password)

    module_exists = (_bot_dir() / "run.py").exists()
    okdb, err = _ensure_bot_db()
    con = _bot_conn()
    if not con:
        return {
            "installed": module_exists,
            "dbReady": False,
            "running": _svc_active(),
            "message": err or ("ربات هنوز راه‌اندازی نشده است" if module_exists
                               else "ماژول ربات روی سرور نیست — nexora update را اجرا کنید"),
            "botDir": str(_bot_dir()),
            "dbPath": str(BOT_DB),
        }

    try:
        stats = {}
        for key, sql in [
            ("users", "SELECT COUNT(*) c FROM users"),
            ("plans", "SELECT COUNT(*) c FROM plans WHERE is_active=1"),
            ("pendingOrders", "SELECT COUNT(*) c FROM orders WHERE status IN ('awaiting','review')"),
            ("activeSubs", "SELECT COUNT(*) c FROM subscriptions WHERE is_active=1"),
            ("openTickets", "SELECT COUNT(*) c FROM tickets WHERE status='open'"),
            ("tenants", "SELECT COUNT(*) c FROM tenants"),
        ]:
            try:
                stats[key] = con.execute(sql).fetchone()["c"]
            except Exception:
                stats[key] = 0

        try:
            revenue = con.execute(
                "SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='approved'"
            ).fetchone()["s"]
        except Exception:
            revenue = 0

        return {
            "installed": True,
            "dbReady": True,
            "running": _svc_active(),
            "stats": stats,
            "totalRevenue": revenue,
        }
    finally:
        con.close()


@app.get("/api/admin/bot/orders")
def bot_orders(status: str = "awaiting", limit: int = 50,
               x_admin_password: str = Header(...)):
    """صف سفارش‌ها — برای تایید رسید از داخل پنل."""
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        return {"orders": [], "dbReady": False}

    try:
        allowed = {"awaiting", "review", "approved", "rejected", "all"}
        if status not in allowed:
            status = "awaiting"

        if status == "all":
            rows = con.execute(
                "SELECT o.*, u.first_name, u.username, u.tg_id FROM orders o "
                "LEFT JOIN users u ON u.id=o.user_id "
                "ORDER BY o.created_at DESC LIMIT ?", (min(limit, 200),)
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT o.*, u.first_name, u.username, u.tg_id FROM orders o "
                "LEFT JOIN users u ON u.id=o.user_id "
                "WHERE o.status=? ORDER BY o.created_at DESC LIMIT ?",
                (status, min(limit, 200))
            ).fetchall()

        return {"orders": [dict(r) for r in rows], "dbReady": True}
    except Exception as e:
        return {"orders": [], "dbReady": True, "error": str(e)[:200]}
    finally:
        con.close()


@app.get("/api/admin/bot/users")
def bot_users(q: str = "", limit: int = 50, x_admin_password: str = Header(...)):
    """جستجو در کاربران ربات."""
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        return {"users": [], "dbReady": False}

    try:
        if q:
            like = f"%{q}%"
            rows = con.execute(
                "SELECT * FROM users WHERE first_name LIKE ? OR username LIKE ? "
                "OR CAST(tg_id AS TEXT) LIKE ? ORDER BY created_at DESC LIMIT ?",
                (like, like, like, min(limit, 200))
            ).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM users ORDER BY created_at DESC LIMIT ?",
                (min(limit, 200),)
            ).fetchall()
        return {"users": [dict(r) for r in rows], "dbReady": True}
    except Exception as e:
        return {"users": [], "dbReady": True, "error": str(e)[:200]}
    finally:
        con.close()


def _bot_rw():
    """اتصال نوشتنی به دیتابیس ربات (برای تنظیمات از پنل)."""
    import sqlite3
    BOT_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(BOT_DB), timeout=10)
    con.row_factory = sqlite3.Row
    return con


def _bot_dir():
    return Path(__file__).resolve().parent.parent / "bot"


def _ensure_bot_db():
    """
    اگر دیتابیس ربات نبود، می‌سازدش.

    برمی‌گرداند: (موفق, پیام خطا)
    پیام خطا دقیق است تا کاربر بداند چه کاری کند — نه یک «نصب نشده» مبهم.
    """
    if BOT_DB.exists():
        return True, None

    bd = _bot_dir()
    if not (bd / "db.py").exists():
        return False, (
            f"پوشه‌ی ربات پیدا نشد ({bd}). "
            "احتمالاً به‌روزرسانی ناقص بوده — روی سرور اجرا کنید: nexora update"
        )

    # اول تلاش مستقیم (سریع‌تر و خطای واضح‌تر می‌دهد)
    try:
        import importlib.util
        BOT_DB.parent.mkdir(parents=True, exist_ok=True)
        os.environ["BOT_DB_PATH"] = str(BOT_DB)

        spec = importlib.util.spec_from_file_location("_nexora_botdb", bd / "db.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.init_db()

        if BOT_DB.exists():
            return True, None
    except Exception as e:
        direct_err = str(e)[:200]
    else:
        direct_err = "ساخته نشد"

    # تلاش دوم: پروسه‌ی جدا
    try:
        import subprocess
        import sys as _sys
        code = (
            "import os, sys\n"
            f"os.environ['BOT_DB_PATH'] = r'{BOT_DB}'\n"
            f"sys.path.insert(0, r'{bd}')\n"
            "import db\n"
            "db.init_db()\n"
        )
        p = subprocess.run([_sys.executable, "-c", code],
                           timeout=30, capture_output=True, text=True)
        if BOT_DB.exists():
            return True, None
        err = (p.stderr or "").strip()[-250:] or direct_err
        return False, f"ساخت دیتابیس ربات ناموفق بود: {err}"
    except Exception as e:
        return False, f"ساخت دیتابیس ربات ناموفق بود: {str(e)[:200]}"


@app.get("/api/admin/bot/settings")
def bot_settings_get(x_admin_password: str = Header(...)):
    """
    تنظیمات ربات اصلی — توکن، پنل، گروه، کارت‌ها، سکه.

    این endpoint هرگز نباید ۵۰۰ بدهد: اگر داده‌ی دیتابیس خراب باشد،
    یک پاسخ خالی برمی‌گرداند تا پنل باز شود و کاربر بتواند از نو
    تنظیم کند — نه اینکه با صفحه‌ی سفید روبه‌رو شود.
    """
    check_auth(x_admin_password)
    okdb, err = _ensure_bot_db()

    con = _bot_conn()
    if not con:
        return {"ready": False, "tenant": None, "error": err,
                "botDir": str(_bot_dir()), "dbPath": str(BOT_DB)}
    try:
        try:
            row = con.execute(
                "SELECT * FROM tenants WHERE parent_id IS NULL ORDER BY id LIMIT 1"
            ).fetchone()
        except Exception as e:
            # جدول ناقص یا اسکیمای قدیمی — پنل باید باز شود
            return {"ready": False, "tenant": None,
                    "error": f"خواندن تنظیمات ناموفق: {str(e)[:150]}"}
        if not row:
            return {"ready": True, "tenant": None}

        t = dict(row)
        # توکن‌ها را ماسک می‌کنیم — در پاسخ کامل نمی‌فرستیم
        for k in ("bot_token", "panel_pass", "panel_token"):
            if t.get(k):
                t[k + "_set"] = True
                t[k] = t[k][:6] + "…" if len(str(t[k])) > 8 else "…"
            else:
                t[k + "_set"] = False
        # settings و topics باید همیشه دیکشنری باشند.
        # اگر مقدارشان "null" یا "[]" باشد، json.loads چیزی برمی‌گرداند
        # که دیکشنری نیست و فرانت‌اند روی آن کرش می‌کند.
        for k in ("topics", "settings"):
            try:
                parsed = json.loads(t.get(k) or "{}")
            except (json.JSONDecodeError, TypeError, ValueError):
                parsed = {}
            t[k] = parsed if isinstance(parsed, dict) else {}

        # فیلدهای متنی نباید None باشند — فرانت‌اند روی input می‌گذاردشان
        for k in ("name", "bot_username", "panel_url", "panel_user",
                  "owner_tg_id", "admin_group_id", "default_inbound"):
            if t.get(k) is None:
                t[k] = ""

        return {"ready": True, "tenant": t}
    except Exception as e:
        return {"ready": False, "tenant": None,
                "error": f"خطای غیرمنتظره: {str(e)[:150]}"}
    finally:
        con.close()


@app.put("/api/admin/bot/settings")
def bot_settings_put(payload: dict, x_admin_password: str = Header(...)):
    """ذخیره تنظیمات ربات اصلی."""
    check_auth(x_admin_password)
    okdb, err = _ensure_bot_db()
    if not okdb:
        raise HTTPException(status_code=400, detail=err or "ماژول ربات در دسترس نیست")

    con = _bot_rw()
    try:
        row = con.execute(
            "SELECT id FROM tenants WHERE parent_id IS NULL ORDER BY id LIMIT 1"
        ).fetchone()

        name = (payload.get("name") or "Nexora").strip()
        if not row:
            cur = con.execute(
                "INSERT INTO tenants (name, is_active, credit) VALUES (?,1,-1)", (name,)
            )
            tid = cur.lastrowid
        else:
            tid = row["id"]

        # فیلدهای ساده — فقط اگر مقدار داده شده باشد به‌روز می‌شوند
        simple = ["name", "bot_username", "owner_tg_id", "panel_url", "panel_user",
                  "default_inbound", "admin_group_id", "is_active"]
        for k in simple:
            if k in payload:
                con.execute(f"UPDATE tenants SET {k}=? WHERE id=?", (payload[k], tid))

        # فیلدهای حساس — فقط وقتی مقدار جدید و غیرخالی بیاید
        for k in ("bot_token", "panel_pass", "panel_token"):
            v = payload.get(k)
            if v and not str(v).endswith("…"):
                con.execute(f"UPDATE tenants SET {k}=? WHERE id=?", (v, tid))

        for k in ("topics", "settings"):
            if k in payload and isinstance(payload[k], (dict, list)):
                con.execute(f"UPDATE tenants SET {k}=? WHERE id=?",
                            (json.dumps(payload[k], ensure_ascii=False), tid))

        con.commit()
        return {"ok": True, "tenantId": tid}
    finally:
        con.close()


@app.get("/api/admin/bot/plans")
def bot_plans_get(x_admin_password: str = Header(...)):
    """لیست پلن‌های فروش."""
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        return {"plans": [], "ready": False}
    try:
        rows = con.execute(
            "SELECT * FROM plans ORDER BY sort_order, id"
        ).fetchall()
        return {"plans": [dict(r) for r in rows], "ready": True}
    except Exception:
        return {"plans": [], "ready": True}
    finally:
        con.close()


@app.put("/api/admin/bot/plans")
def bot_plans_put(payload: dict, x_admin_password: str = Header(...)):
    """ذخیره کامل لیست پلن‌ها (جایگزینی)."""
    check_auth(x_admin_password)
    okdb, err = _ensure_bot_db()
    if not okdb:
        raise HTTPException(status_code=400, detail=err or "ماژول ربات در دسترس نیست")

    plans = payload.get("plans")
    if not isinstance(plans, list):
        raise HTTPException(status_code=400, detail="فهرست پلن‌ها نامعتبر است")

    con = _bot_rw()
    try:
        row = con.execute(
            "SELECT id FROM tenants WHERE parent_id IS NULL ORDER BY id LIMIT 1"
        ).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="ابتدا تنظیمات ربات را ذخیره کنید")
        tid = row["id"]

        keep = [p.get("id") for p in plans if p.get("id")]
        if keep:
            ph = ",".join("?" * len(keep))
            con.execute(
                f"DELETE FROM plans WHERE tenant_id=? AND id NOT IN ({ph})",
                [tid] + keep)
        else:
            con.execute("DELETE FROM plans WHERE tenant_id=?", (tid,))

        for i, p in enumerate(plans):
            vals = (
                p.get("name", "پلن"), p.get("description", ""),
                int(p.get("gb") or 0), int(p.get("days") or 0),
                int(p.get("ip_limit") or 0), int(p.get("price") or 0),
                p.get("inbound_id"), 1 if p.get("is_active", True) else 0,
                1 if p.get("is_trial") else 0, i,
            )
            if p.get("id"):
                con.execute(
                    "UPDATE plans SET name=?,description=?,gb=?,days=?,ip_limit=?,"
                    "price=?,inbound_id=?,is_active=?,is_trial=?,sort_order=? "
                    "WHERE id=? AND tenant_id=?", vals + (p["id"], tid))
            else:
                con.execute(
                    "INSERT INTO plans (name,description,gb,days,ip_limit,price,"
                    "inbound_id,is_active,is_trial,sort_order,tenant_id) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?)", vals + (tid,))

        con.commit()
        return {"ok": True, "count": len(plans)}
    finally:
        con.close()


@app.post("/api/admin/bot/orders/{order_id}/reject-with-reason")
def bot_reject_reason(order_id: int, payload: dict,
                      x_admin_password: str = Header(...)):
    """
    رد سفارش با دلیل مشخص.

    دلیل در admin_note ذخیره می‌شود و ربات آن را برای مشتری می‌فرستد
    و سکه‌های خرج‌شده را برمی‌گرداند.
    """
    check_auth(x_admin_password)
    reason = (payload or {}).get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="دلیل رد را بنویسید")

    if not BOT_DB.exists():
        raise HTTPException(status_code=400, detail="دیتابیس ربات موجود نیست")

    con = _bot_rw()
    try:
        row = con.execute("SELECT status FROM orders WHERE id=?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="سفارش پیدا نشد")
        if row["status"] not in ("awaiting", "review"):
            raise HTTPException(status_code=400, detail="این سفارش قبلاً بررسی شده است")

        # ربات این وضعیت را می‌بیند، به مشتری خبر می‌دهد و سکه را برمی‌گرداند
        con.execute(
            "UPDATE orders SET status='panel_reject', admin_note=?, "
            "reviewed_at=CURRENT_TIMESTAMP WHERE id=?",
            (reason[:400], order_id))
        con.commit()
        return {"ok": True}
    finally:
        con.close()


@app.post("/api/admin/bot/orders/{order_id}/{action}")
def bot_order_action(order_id: int, action: str, x_admin_password: str = Header(...)):
    """
    تایید یا رد سفارش از داخل پنل.

    نکته: ساخت کانفیگ و اطلاع به مشتری کار ربات است. پنل فقط وضعیت را
    علامت‌گذاری می‌کند و ربات در چرخه‌ی بعدی‌اش آن را می‌بیند و انجام می‌دهد.
    """
    check_auth(x_admin_password)
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="عملیات نامعتبر")
    if not BOT_DB.exists():
        raise HTTPException(status_code=400, detail="دیتابیس ربات موجود نیست")

    con = _bot_rw()
    try:
        row = con.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="سفارش پیدا نشد")
        if row["status"] not in ("awaiting", "review"):
            raise HTTPException(status_code=400, detail="این سفارش قبلاً بررسی شده است")

        new_status = "panel_approve" if action == "approve" else "rejected"
        con.execute(
            "UPDATE orders SET status=?, reviewed_at=CURRENT_TIMESTAMP, admin_note=? "
            "WHERE id=?",
            (new_status, "از پنل مدیریت", order_id))
        con.commit()
        return {"ok": True, "status": new_status}
    finally:
        con.close()


# ═══════════════════════════════════════════════════════════
#  خودترمیمی هنگام راه‌اندازی
#
#  بک‌اند تنها جزئی است که بعد از هر به‌روزرسانی حتماً ری‌استارت
#  می‌شود. پس هر کاری که ممکن است در به‌روزرسانی جا بماند را
#  اینجا انجام می‌دهیم — تا کاربر هیچ‌وقت مجبور به کار دستی نشود.
# ═══════════════════════════════════════════════════════════

def _root_dir():
    return Path(__file__).resolve().parent.parent


def _selfheal_cli():
    """دستور nexora را با نسخه‌ی نصب‌شده همگام می‌کند."""
    src = _root_dir() / "nexora-cli.sh"
    dst = Path("/usr/local/bin/nexora")
    if not src.exists() or not dst.parent.exists():
        return None

    data = src.read_bytes()
    if dst.exists() and dst.read_bytes() == data:
        return None

    tmp = dst.with_suffix(".new")
    tmp.write_bytes(data)
    os.chmod(tmp, 0o755)
    os.replace(tmp, dst)   # اتمی — اگر همان لحظه اجرا شود، نصفه نمی‌ماند
    return "CLI به‌روز شد"


def _selfheal_scripts():
    """دسترسی اجرایی اسکریپت‌ها را برمی‌گرداند."""
    fixed = 0
    for p in _root_dir().glob("*.sh"):
        try:
            if not os.access(p, os.X_OK):
                os.chmod(p, 0o755)
                fixed += 1
        except OSError:
            pass
    return f"{fixed} اسکریپت اجرایی شد" if fixed else None


def _selfheal_bot_deps():
    """وابستگی‌های ربات را در صورت نبود نصب می‌کند."""
    root = _root_dir()
    req = root / "bot" / "requirements.txt"
    if not req.exists():
        return None

    try:
        import importlib
        importlib.import_module("requests")
        return None          # قبلاً هست
    except ImportError:
        pass

    pip = root / "backend" / "venv" / "bin" / "pip"
    if not pip.exists():
        return None

    try:
        import subprocess
        subprocess.run([str(pip), "install", "-r", str(req), "-q"],
                       timeout=180, capture_output=True)
        return "وابستگی‌های ربات نصب شد"
    except Exception:
        return None


def _selfheal_bot_service():
    """اگر ماژول ربات هست ولی سرویسش نیست، می‌سازدش."""
    root = _root_dir()
    if not (root / "bot" / "run.py").exists():
        return None

    svc = Path("/etc/systemd/system/nexora-bot.service")
    if svc.exists() or not svc.parent.exists():
        return None

    python = root / "backend" / "venv" / "bin" / "python"
    if not python.exists():
        return None

    try:
        svc.write_text(f"""[Unit]
Description=Nexora Telegram Bot
After=network.target nexora-panel.service

[Service]
Type=simple
WorkingDirectory={root}/bot
Environment="BOT_DB_PATH={root}/data/bot.db"
Environment="PANEL_CONFIG={root}/data/config.json"
ExecStart={python} run.py
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
""", encoding="utf-8")
        os.chmod(svc, 0o600)

        import subprocess
        subprocess.run(["systemctl", "daemon-reload"], timeout=20, capture_output=True)
        return "سرویس ربات ساخته شد"
    except Exception:
        return None


def _selfheal_backup_cron():
    """بک‌آپ روزانه را در صورت نبود تنظیم می‌کند."""
    root = _root_dir()
    cfg = root / "data" / "config.json"
    if not cfg.exists():
        return None

    try:
        import subprocess
        cur = subprocess.run(["crontab", "-l"], capture_output=True,
                             text=True, timeout=15).stdout or ""
        if "nexora" in cur and "config.json" in cur:
            return None

        line = (f"0 3 * * * cp {cfg} /root/backups/config-$(date +\\%Y\\%m\\%d).json 2>/dev/null")
        Path("/root/backups").mkdir(parents=True, exist_ok=True)
        new_tab = (cur.rstrip("\n") + "\n" + line + "\n").lstrip("\n")
        subprocess.run(["crontab", "-"], input=new_tab, text=True,
                       timeout=15, capture_output=True)
        return "بک‌آپ روزانه تنظیم شد"
    except Exception:
        return None


@app.on_event("startup")
def _selfheal():
    """
    همه‌ی ترمیم‌ها را اجرا می‌کند.

    هر مرحله جدا محافظت شده: اگر یکی شکست بخورد، بقیه ادامه می‌دهند
    و سرویس در هر حالت بالا می‌آید. اینها بهبودند، نه ضرورت.
    """
    steps = [
        ("cli", _selfheal_cli),
        ("scripts", _selfheal_scripts),
        ("bot-deps", _selfheal_bot_deps),
        ("bot-service", _selfheal_bot_service),
        ("cron", _selfheal_backup_cron),
    ]
    done = []
    for name, fn in steps:
        try:
            r = fn()
            if r:
                done.append(r)
        except Exception:
            pass

    if done:
        try:
            import logging
            logging.getLogger("uvicorn").info(
                "خودترمیمی: %s", " · ".join(done))
        except Exception:
            pass


def _svc(action, unit="nexora-bot"):
    """اجرای امن systemctl. برمی‌گرداند (موفق, پیام)."""
    import subprocess
    try:
        r = subprocess.run(["systemctl", action, unit],
                           capture_output=True, text=True, timeout=25)
        if r.returncode == 0:
            return True, ""
        return False, (r.stderr or r.stdout or "").strip()[:200]
    except FileNotFoundError:
        return False, "systemctl در دسترس نیست"
    except Exception as e:
        return False, str(e)[:200]


def _svc_active(unit="nexora-bot"):
    import subprocess
    try:
        r = subprocess.run(["systemctl", "is-active", "--quiet", unit],
                           timeout=10)
        return r.returncode == 0
    except Exception:
        return False


@app.post("/api/admin/bot/service/{action}")
def bot_service(action: str, x_admin_password: str = Header(...)):
    """کنترل سرویس ربات از پنل — بدون نیاز به ورود به سرور."""
    check_auth(x_admin_password)
    if action not in ("start", "stop", "restart"):
        raise HTTPException(status_code=400, detail="عملیات نامعتبر")

    if action in ("start", "restart"):
        if not (_bot_dir() / "run.py").exists():
            raise HTTPException(status_code=400,
                                detail="ماژول ربات روی سرور نیست — nexora update را اجرا کنید")
        # اگر سرویس نبود، بساز
        if not Path("/etc/systemd/system/nexora-bot.service").exists():
            try:
                _selfheal_bot_service()
            except Exception:
                pass

    ok, err = _svc(action)
    if not ok:
        raise HTTPException(status_code=500, detail=err or "اجرای دستور ناموفق بود")

    if action in ("start", "restart"):
        _svc("enable")

    import time
    time.sleep(2.5)
    return {"ok": True, "running": _svc_active()}


@app.get("/api/admin/bot/backup")
def bot_backup(x_admin_password: str = Header(...)):
    """دانلود بک‌آپ کامل ربات (JSON)."""
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        raise HTTPException(status_code=400, detail="دیتابیس ربات موجود نیست")

    try:
        tables = ["tenants", "users", "plans", "orders", "subscriptions",
                  "coin_tx", "wallet_tx", "discounts", "tickets"]
        dump = {}
        for t in tables:
            try:
                dump[t] = [dict(r) for r in con.execute(f"SELECT * FROM {t}")]
            except Exception:
                dump[t] = []

        return {
            "version": 1,
            "createdAt": datetime.now().isoformat(timespec="seconds"),
            "panelVersion": (Path(__file__).resolve().parent.parent / "VERSION")
                            .read_text().strip() if (Path(__file__).resolve().parent.parent / "VERSION").exists() else "?",
            "counts": {k: len(v) for k, v in dump.items()},
            "data": dump,
        }
    finally:
        con.close()


@app.post("/api/admin/bot/restore")
def bot_restore(payload: dict, x_admin_password: str = Header(...)):
    """
    بازیابی بک‌آپ ربات.

    قبل از هر کاری از وضعیت فعلی یک نسخه‌ی امن می‌گیریم — اگر بازیابی
    اشتباه بود، داده‌ی فعلی از دست نرفته باشد.
    """
    check_auth(x_admin_password)
    data = (payload or {}).get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="فایل بک‌آپ نامعتبر است")

    okdb, err = _ensure_bot_db()
    if not okdb:
        raise HTTPException(status_code=400, detail=err or "دیتابیس ربات در دسترس نیست")

    # نسخه‌ی امن قبل از بازیابی
    try:
        import shutil
        safety = BOT_DB.with_name(
            f"bot-before-restore-{datetime.now():%Y%m%d-%H%M%S}.db")
        shutil.copy2(BOT_DB, safety)
    except Exception:
        safety = None

    con = _bot_rw()
    try:
        con.execute("PRAGMA foreign_keys=OFF")
        order = ["tenants", "users", "plans", "orders", "subscriptions",
                 "coin_tx", "wallet_tx", "discounts", "tickets"]
        restored = {}

        for t in reversed(order):
            try:
                con.execute(f"DELETE FROM {t}")
            except Exception:
                pass

        for t in order:
            rows = data.get(t) or []
            if not rows:
                restored[t] = 0
                continue
            cols = [r[1] for r in con.execute(f"PRAGMA table_info({t})")]
            usable = [c for c in cols if any(c in r for r in rows)]
            if not usable:
                restored[t] = 0
                continue
            ph = ",".join("?" * len(usable))
            sql = f"INSERT OR REPLACE INTO {t} ({','.join(usable)}) VALUES ({ph})"
            n = 0
            for r in rows:
                try:
                    con.execute(sql, [r.get(c) for c in usable])
                    n += 1
                except Exception:
                    pass
            restored[t] = n

        con.commit()
        return {"ok": True, "restored": restored,
                "safetyCopy": str(safety) if safety else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"بازیابی ناموفق: {str(e)[:200]}")
    finally:
        con.close()


@app.get("/api/admin/bot/funnel")
def bot_funnel(x_admin_password: str = Header(...)):
    """آمار قیف تبدیل — از استارت تا خرید."""
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        return {"ready": False}

    def one(sql):
        try:
            return con.execute(sql).fetchone()[0] or 0
        except Exception:
            return 0

    try:
        started = one("SELECT COUNT(*) FROM users")
        with_phone = one("SELECT COUNT(*) FROM users WHERE phone IS NOT NULL AND phone<>''")
        ordered = one("SELECT COUNT(DISTINCT user_id) FROM orders")
        paid = one("SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='approved'")
        trial = one("SELECT COUNT(*) FROM users WHERE trial_used=1")
        trial_only = one(
            "SELECT COUNT(*) FROM users u WHERE u.trial_used=1 AND NOT EXISTS "
            "(SELECT 1 FROM orders o WHERE o.user_id=u.id AND o.status='approved')")
        idle = one(
            "SELECT COUNT(*) FROM users u WHERE NOT EXISTS "
            "(SELECT 1 FROM orders o WHERE o.user_id=u.id) AND u.trial_used=0")

        pct = lambda n: round(n * 100 / started, 1) if started else 0
        return {
            "ready": True,
            "started": started,
            "steps": [
                {"label": "ربات را باز کردند", "n": started, "pct": 100},
                {"label": "شماره ثبت کردند", "n": with_phone, "pct": pct(with_phone)},
                {"label": "سفارش ثبت کردند", "n": ordered, "pct": pct(ordered)},
                {"label": "خرید موفق", "n": paid, "pct": pct(paid)},
            ],
            "segments": {
                "paid": paid,
                "trialOnly": trial_only,
                "trial": trial,
                "idle": idle,
            },
        }
    finally:
        con.close()


SNAP_DIR = Path("/root/nexora-snapshots")


@app.get("/api/admin/snapshots")
def list_snapshots(x_admin_password: str = Header(...)):
    """نسخه‌های ذخیره‌شده برای بازگشت — بدون نیاز به ترمینال."""
    check_auth(x_admin_password)
    if not SNAP_DIR.exists():
        return {"snapshots": []}

    out = []
    for d in sorted(SNAP_DIR.iterdir(), reverse=True):
        if not d.is_dir():
            continue
        ver = "?"
        vf = d / "VERSION"
        if vf.exists():
            try:
                ver = vf.read_text().strip()
            except OSError:
                pass

        size = 0
        try:
            size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
        except OSError:
            pass

        out.append({
            "id": d.name,
            "version": ver,
            "createdAt": datetime.fromtimestamp(d.stat().st_mtime).isoformat(timespec="seconds"),
            "sizeMb": round(size / 1048576, 1),
            "hasSettings": (d / "config.json").exists(),
            "hasBot": (d / "bot").exists() or (d / "bot.db").exists(),
        })
    return {"snapshots": out[:20]}


@app.post("/api/admin/rollback")
def run_rollback(payload: dict, x_admin_password: str = Header(...)):
    """
    بازگشت به یک نسخه‌ی قبلی از داخل پنل.

    مثل به‌روزرسانی، در پس‌زمینه اجرا می‌شود و لاگش در همان فایل
    نوشته می‌شود تا رابط کاربری بتواند دنبالش کند.
    """
    check_auth(x_admin_password)
    snap = (payload or {}).get("id", "")
    if not snap or "/" in snap or ".." in snap:
        raise HTTPException(status_code=400, detail="شناسه نسخه نامعتبر است")

    target = SNAP_DIR / snap
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="این نسخه پیدا نشد")

    keep = "yes" if (payload or {}).get("keepSettings", True) else "no"

    try:
        import subprocess
        cmd = (f"nohup nexora rollback {snap} --yes --settings={keep} "
               f"> /tmp/nexora-update.log 2>&1 &")
        subprocess.Popen(["bash", "-lc", cmd])
        return {"ok": True, "started": snap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"اجرای بازگشت ناموفق: {str(e)[:200]}")


@app.get("/api/admin/bot/receipt/{order_id}")
def bot_receipt(order_id: int, x_admin_password: str = Header(...)):
    """
    تصویر رسید یک سفارش.

    تلگرام فایل‌ها را با file_id نگه می‌دارد. اینجا آن را به لینک
    موقت تبدیل می‌کنیم، محتوا را می‌گیریم و به‌صورت تصویر برمی‌گردانیم
    تا پنل بتواند نمایش و بزرگ‌نمایی کند.
    """
    check_auth(x_admin_password)
    con = _bot_conn()
    if not con:
        raise HTTPException(status_code=404, detail="دیتابیس ربات موجود نیست")

    try:
        row = con.execute(
            "SELECT o.receipt_type, o.receipt_file, o.receipt_text, o.tenant_id "
            "FROM orders o WHERE o.id=?", (order_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="سفارش پیدا نشد")

        if row["receipt_type"] != "photo" or not row["receipt_file"]:
            raise HTTPException(status_code=404, detail="این سفارش رسید تصویری ندارد")

        t = con.execute("SELECT bot_token FROM tenants WHERE id=?",
                        (row["tenant_id"],)).fetchone()
        token = t["bot_token"] if t else None
        if not token:
            raise HTTPException(status_code=400, detail="توکن ربات تنظیم نشده است")
    finally:
        con.close()

    try:
        import requests
        from fastapi.responses import Response as FastResponse

        r = requests.get(f"https://api.telegram.org/bot{token}/getFile",
                         params={"file_id": row["receipt_file"]}, timeout=15)
        d = r.json()
        if not d.get("ok"):
            raise HTTPException(status_code=502,
                                detail="تلگرام فایل را برنگرداند")

        path = d["result"]["file_path"]
        img = requests.get(f"https://api.telegram.org/file/bot{token}/{path}",
                           timeout=25)
        if img.status_code != 200:
            raise HTTPException(status_code=502, detail="دریافت تصویر ناموفق بود")

        ext = path.rsplit(".", 1)[-1].lower() if "." in path else "jpg"
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg",
                "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

        return FastResponse(content=img.content, media_type=mime,
                            headers={"Cache-Control": "private, max-age=600"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"خطا در دریافت رسید: {str(e)[:150]}")


@app.get("/api/admin/bot/subscriber/{tg_id}")
def bot_subscriber_detail(tg_id: int, x_admin_password: str = Header(...)):
    """
    پرونده‌ی کامل یک مشتری: اطلاعات ربات + مصرف زنده از 3x-ui.

    ترافیک از خود پنل خوانده می‌شود نه از کش، چون عددی که به ادمین
    نشان می‌دهیم باید همان چیزی باشد که مشتری می‌بیند.
    """
    check_auth(x_admin_password)

    con = _bot_conn()
    if not con:
        raise HTTPException(status_code=404, detail="دیتابیس ربات موجود نیست")

    try:
        u = con.execute("SELECT * FROM users WHERE tg_id=?", (tg_id,)).fetchone()
        if not u:
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
        user = dict(u)

        subs = [dict(r) for r in con.execute(
            "SELECT s.*, p.name AS plan_name FROM subscriptions s "
            "LEFT JOIN plans p ON p.id = s.plan_id "
            "WHERE s.user_id = ? ORDER BY s.created_at DESC", (user["id"],))]

        orders = [dict(r) for r in con.execute(
            "SELECT o.*, p.name AS plan_name FROM orders o "
            "LEFT JOIN plans p ON p.id = o.plan_id "
            "WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 20", (user["id"],))]

        coins = [dict(r) for r in con.execute(
            "SELECT * FROM coin_tx WHERE user_id=? ORDER BY created_at DESC LIMIT 15",
            (user["id"],))]

        tenant = con.execute(
            "SELECT panel_url, panel_user, panel_pass, panel_token "
            "FROM tenants WHERE id=?", (user["tenant_id"],)).fetchone()
    finally:
        con.close()

    # ترافیک زنده برای هر اشتراک فعال
    live = {}
    if tenant and tenant["panel_url"]:
        try:
            import sys as _sys
            bd = str(_bot_dir())
            if bd not in _sys.path:
                _sys.path.insert(0, bd)
            from xui import XUI  # noqa: E402

            client = XUI(tenant["panel_url"], tenant["panel_user"],
                         tenant["panel_pass"], tenant["panel_token"])
            for s in subs:
                email = s.get("client_email")
                if not email:
                    continue
                try:
                    t = client.client_traffic(email)
                    if t:
                        if isinstance(t, list):
                            t = t[0] if t else None
                        if t:
                            live[email] = {
                                "up": t.get("up", 0),
                                "down": t.get("down", 0),
                                "total": t.get("total", 0),
                                "expiryTime": t.get("expiryTime", 0),
                                "enable": t.get("enable", True),
                                "inboundId": t.get("inboundId"),
                            }
                except Exception:
                    pass
        except Exception:
            pass

    return {
        "user": user,
        "subscriptions": subs,
        "orders": orders,
        "coinHistory": coins,
        "live": live,
        "liveAvailable": bool(live),
    }


@app.post("/api/admin/bot/reload")
def bot_reload(x_admin_password: str = Header(...)):
    """
    اعلام به ربات که تنظیمات عوض شده.

    ربات تنظیمات را در هر درخواست تازه می‌خواند، پس تغییرات معمولاً
    فوری اعمال می‌شوند. این endpoint برای مواردی است که ربات چیزی را
    در حافظه نگه داشته — مثل نخِ یک مستاجر که توکنش عوض شده.

    یک فلگ در دیتابیس می‌گذاریم؛ ربات در چرخه‌ی بعدی می‌بیندش و
    خودش را همگام می‌کند. بدون قطعی سرویس.
    """
    check_auth(x_admin_password)
    if not BOT_DB.exists():
        raise HTTPException(status_code=400, detail="دیتابیس ربات موجود نیست")

    con = _bot_rw()
    try:
        con.execute(
            "CREATE TABLE IF NOT EXISTS bot_flags ("
            "  key TEXT PRIMARY KEY,"
            "  value TEXT,"
            "  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        con.execute(
            "INSERT INTO bot_flags (key, value, updated_at) VALUES ('reload', ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP",
            (str(int(datetime.now().timestamp())),))
        con.commit()
        return {"ok": True, "running": _svc_active()}
    finally:
        con.close()


@app.post("/api/admin/bot/test-connection")
def bot_test_connection(payload: dict, x_admin_password: str = Header(...)):
    """
    تست کامل اتصال به 3x-ui — مرحله به مرحله.

    فقط «وصل شد» کافی نیست. کاربر باید مطمئن شود که ربات واقعاً
    می‌تواند کانفیگ بسازد. پس یک کلاینت آزمایشی می‌سازیم، بررسی
    می‌کنیم، و بلافاصله پاکش می‌کنیم.
    """
    check_auth(x_admin_password)

    bot_dir = _bot_dir()
    if not (bot_dir / "xui.py").exists():
        raise HTTPException(status_code=400, detail="ماژول ربات روی سرور نیست")

    # اطلاعات از payload یا از تنظیمات ذخیره‌شده
    url = (payload or {}).get("panel_url")
    user = (payload or {}).get("panel_user")
    pw = (payload or {}).get("panel_pass")
    token = (payload or {}).get("panel_token")
    inbound = (payload or {}).get("default_inbound")

    if not url or (token and str(token).endswith("…")) or (pw and str(pw).endswith("…")):
        con = _bot_conn()
        if con:
            try:
                row = con.execute(
                    "SELECT * FROM tenants WHERE parent_id IS NULL ORDER BY id LIMIT 1"
                ).fetchone()
                if row:
                    r = dict(row)
                    url = url or r.get("panel_url")
                    user = user or r.get("panel_user")
                    if not pw or str(pw).endswith("…"):
                        pw = r.get("panel_pass")
                    if not token or str(token).endswith("…"):
                        token = r.get("panel_token")
                    inbound = inbound or r.get("default_inbound")
            finally:
                con.close()

    if not url:
        raise HTTPException(status_code=400, detail="آدرس پنل وارد نشده است")

    steps = []

    def step(key, title, ok, detail="", hint=""):
        steps.append({"key": key, "title": title, "ok": ok,
                      "detail": detail, "hint": hint})
        return ok

    import sys as _sys
    if str(bot_dir) not in _sys.path:
        _sys.path.insert(0, str(bot_dir))

    try:
        import importlib
        xmod = importlib.import_module("xui")
        importlib.reload(xmod)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"بارگذاری ماژول ناموفق: {str(e)[:150]}")

    client = xmod.XUI(url, user, pw, token)

    # ۱ — احراز هویت
    try:
        client.login()
        method = "توکن API" if token else "نام کاربری و رمز"
        step("auth", "احراز هویت", True, f"با {method} وارد شد")
    except Exception as e:
        step("auth", "احراز هویت", False, str(e)[:180],
             "آدرس پنل، توکن یا نام کاربری و رمز را بررسی کنید. "
             "آدرس باید شامل پورت و مسیر باشد.")
        return {"ok": False, "steps": steps}

    # ۲ — خواندن inboundها
    inbounds = []
    try:
        inbounds = client.inbounds() or []
        names = [f"#{i.get('id')} {i.get('remark') or i.get('protocol','')}"
                 for i in inbounds[:6]]
        step("inbounds", "خواندن inboundها", bool(inbounds),
             f"{len(inbounds)} inbound: " + " · ".join(names) if inbounds
             else "هیچ inbound فعالی پیدا نشد",
             "" if inbounds else "ابتدا در پنل 3x-ui یک inbound بسازید.")
        if not inbounds:
            return {"ok": False, "steps": steps}
    except Exception as e:
        step("inbounds", "خواندن inboundها", False, str(e)[:180],
             "کاربر پنل باید دسترسی خواندن داشته باشد.")
        return {"ok": False, "steps": steps}

    # ۳ — معماری پنل
    try:
        mode = client.detect_api()
        step("api", "تشخیص نسخه پنل", True,
             "معماری جدید (۳.۴ به بعد)" if mode == "modern" else "معماری کلاسیک")
    except Exception:
        step("api", "تشخیص نسخه پنل", True, "کلاسیک (پیش‌فرض)")

    # ۴ — inbound انتخاب‌شده
    target = None
    if inbound:
        try:
            target = int(inbound)
        except (TypeError, ValueError):
            target = None
    if target is None:
        target = inbounds[0].get("id")
        step("inbound", "inbound پیش‌فرض", True,
             f"#{target} (اولین inbound — در تنظیمات مشخص نشده بود)",
             "بهتر است inbound دلخواهتان را در تنظیمات مشخص کنید.")
    else:
        found = any(int(i.get("id", -1)) == target for i in inbounds)
        if not step("inbound", "inbound پیش‌فرض", found,
                    f"#{target}" if found else f"#{target} در پنل وجود ندارد",
                    "" if found else "شماره‌ی درست را از لیست بالا انتخاب کنید."):
            return {"ok": False, "steps": steps}

    # ۵ — ساخت کلاینت آزمایشی
    import uuid as _uuid
    probe = f"nexora_test_{_uuid.uuid4().hex[:8]}"
    created = False
    try:
        client.add_client(target, probe, gb=1, days=1, ip_limit=1)
        created = True
        step("create", "ساخت کانفیگ آزمایشی", True, f"کلاینت {probe} ساخته شد")
    except Exception as e:
        step("create", "ساخت کانفیگ آزمایشی", False, str(e)[:180],
             "کاربر پنل باید دسترسی نوشتن داشته باشد. "
             "اگر از توکن استفاده می‌کنید، مطمئن شوید توکن محدود نشده باشد.")
        return {"ok": False, "steps": steps}

    # ۶ — خواندن کلاینت ساخته‌شده
    try:
        found = client.find_client(probe)
        step("verify", "بازخوانی کانفیگ", bool(found),
             "کلاینت در پنل پیدا شد" if found else "ساخته شد ولی خوانده نشد",
             "" if found else "ممکن است پنل هنوز همگام نشده باشد.")
    except Exception as e:
        step("verify", "بازخوانی کانفیگ", False, str(e)[:180])

    # ۷ — پاکسازی (مهم: نباید کلاینت آشغال بماند)
    if created:
        try:
            client.delete_client(target, probe)
            step("cleanup", "پاکسازی", True, "کلاینت آزمایشی حذف شد")
        except Exception as e:
            step("cleanup", "پاکسازی", False, str(e)[:180],
                 f"کلاینت «{probe}» را دستی از پنل حذف کنید.")

    all_ok = all(s["ok"] for s in steps)
    return {
        "ok": all_ok,
        "steps": steps,
        "inbounds": [{"id": i.get("id"),
                      "remark": i.get("remark") or "",
                      "protocol": i.get("protocol") or "",
                      "port": i.get("port")}
                     for i in inbounds],
    }


@app.get("/api/admin/github")
def github_get(x_admin_password: str = Header(...)):
    """تنظیمات مخزن گیت‌هاب برای به‌روزرسانی."""
    check_auth(x_admin_password)
    f = _root_dir() / ".github"
    repo = ""
    if f.exists():
        try:
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.startswith("GITHUB_REPO="):
                    repo = line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
    return {"repo": repo, "configured": bool(repo)}


@app.put("/api/admin/github")
def github_put(payload: dict, x_admin_password: str = Header(...)):
    """
    ذخیره‌ی مخزن گیت‌هاب.

    قبل از ذخیره، وجود مخزن و داشتن Release بررسی می‌شود — تا کاربر
    یک آدرس اشتباه ذخیره نکند و بعد در به‌روزرسانی گیر کند.
    """
    check_auth(x_admin_password)
    repo = (payload or {}).get("repo", "").strip()

    # نرمال‌سازی: از URL کامل هم قبول می‌کنیم
    repo = repo.replace("https://github.com/", "").replace("http://github.com/", "")
    repo = repo.rstrip("/").removesuffix(".git")

    if not repo:
        f = _root_dir() / ".github"
        try:
            f.unlink(missing_ok=True)
        except Exception:
            pass
        return {"ok": True, "repo": "", "configured": False}

    if repo.count("/") != 1 or not all(repo.split("/")):
        raise HTTPException(status_code=400,
                            detail="قالب درست: username/repository")

    # بررسی واقعی
    try:
        import urllib.request
        req = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/releases/latest",
            headers={"Accept": "application/vnd.github+json",
                     "User-Agent": "nexora-panel"})
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.loads(r.read().decode())
        tag = data.get("tag_name", "")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(
                status_code=400,
                detail=f"مخزن «{repo}» پیدا نشد یا هیچ Release ندارد. "
                       "مطمئن شوید عمومی است و حداقل یک Release ساخته‌اید.")
        raise HTTPException(status_code=400, detail=f"گیت‌هاب پاسخ نداد: {e.code}")
    except Exception as e:
        raise HTTPException(status_code=400,
                            detail=f"بررسی مخزن ناموفق: {str(e)[:120]}")

    f = _root_dir() / ".github"
    f.write_text(f'GITHUB_REPO="{repo}"\n', encoding="utf-8")
    try:
        os.chmod(f, 0o600)
    except Exception:
        pass

    return {"ok": True, "repo": repo, "configured": True, "latestTag": tag}


# ═══════════════════════════════════════════════════════════
#  حسابداری واسطه‌ها
#
#  گروه‌ها و مصرف واقعی از x-ui.db خوانده می‌شوند (فقط‌خواندنی).
#  نرخ‌ها، پرداخت‌ها و لاگ تمدید در دیتابیس خودمان ذخیره می‌شوند.
# ═══════════════════════════════════════════════════════════

# مسیر دیتابیس x-ui.
#
# اولویت: تنظیمات پنل ← متغیر محیطی ← مسیرهای رایج.
# اگر فقط به متغیر محیطی تکیه کنیم، نصب‌های قدیمی که آن را ندارند
# حسابداری‌شان کار نمی‌کند و کاربر هم راهی برای اصلاحش ندارد.
XUI_CANDIDATES = [
    "/etc/x-ui/x-ui.db",
    "/usr/local/x-ui/x-ui.db",
    "/opt/x-ui/x-ui.db",
    "/etc/x-ui/db/x-ui.db",
]


def _xui_db_path():
    """مسیر فعلی دیتابیس x-ui را برمی‌گرداند."""
    # ۱. تنظیم دستی در پنل
    try:
        cfg = load_config()
        manual = ((cfg.get("advanced") or {}).get("xuiDbPath") or "").strip()
        if manual:
            return Path(manual)
    except Exception:
        pass

    # ۲. متغیر محیطی
    env = os.getenv("XUI_DB_PATH", "").strip()
    if env:
        return Path(env)

    # ۳. مسیرهای رایج — اولین موجود
    for p in XUI_CANDIDATES:
        if Path(p).exists():
            return Path(p)

    return Path(XUI_CANDIDATES[0])
BILLING_DB = Path(os.getenv("BILLING_DB_PATH", str(CONFIG_PATH.parent / "billing.db")))


def _xui_conn():
    """اتصال فقط‌خواندنی به دیتابیس x-ui."""
    xdb = _xui_db_path()
    if not xdb.exists():
        return None
    try:
        import sqlite3
        con = sqlite3.connect(f"file:{xdb}?mode=ro", uri=True, timeout=8)
        con.row_factory = sqlite3.Row
        return con
    except Exception:
        return None


def _billing_conn():
    """دیتابیس حسابداری — جدا از x-ui تا هرگز به آن دست نزنیم."""
    import sqlite3
    BILLING_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(BILLING_DB), timeout=10)
    con.row_factory = sqlite3.Row
    con.executescript("""
        CREATE TABLE IF NOT EXISTS group_config (
            group_key   TEXT PRIMARY KEY,
            label       TEXT,
            billable    INTEGER DEFAULT 0,
            rates       TEXT DEFAULT '[]',
            note        TEXT,
            updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS payments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            group_key   TEXT NOT NULL,
            amount      INTEGER NOT NULL,
            paid_at     TEXT NOT NULL,
            note        TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        -- لاگ تمدید: x-ui تاریخچه ندارد، پس از امروز خودمان ثبت می‌کنیم
        CREATE TABLE IF NOT EXISTS renewals (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            email       TEXT NOT NULL,
            group_key   TEXT,
            months      INTEGER DEFAULT 1,
            gb          INTEGER,
            source      TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_pay_group ON payments(group_key);
        CREATE INDEX IF NOT EXISTS idx_ren_email ON renewals(email);
    """)
    con.commit()
    return con


def _read_xui_clients():
    """
    همه‌ی کانفیگ‌ها با گروه و مصرف واقعی.

    نسخه‌ی ۳.۵ ساختار تمیزی دارد:
      clients.group_name  ← نام گروه، مستقیم روی خود کلاینت
      client_groups       ← فهرست گروه‌ها (برای نمایش گروه‌های خالی)
      client_traffics     ← مصرف واقعی

    نسخه‌های قدیمی‌تر گروه ندارند و کلاینت داخل JSON اینباند است؛
    آن حالت هم پشتیبانی می‌شود تا پنل روی هر نسخه‌ای کار کند.
    """
    con = _xui_conn()
    if not con:
        return None, None, f"دیتابیس x-ui در {_xui_db_path()} پیدا نشد"

    try:
        tables = {r["name"] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}

        # مصرف واقعی — تنها جایی که عدد درست دارد
        traffic = {}
        if "client_traffics" in tables:
            try:
                for r in con.execute(
                    "SELECT email, up, down, expiry_time, enable FROM client_traffics"
                ):
                    traffic[r["email"]] = dict(r)
            except Exception as e:
                return None, None, f"خواندن client_traffics ناموفق: {str(e)[:110]}"

        # فهرست گروه‌ها — حتی آن‌هایی که هنوز کاربری ندارند
        known_groups = []
        if "client_groups" in tables:
            try:
                known_groups = [r["name"] for r in con.execute(
                    "SELECT name FROM client_groups ORDER BY id")]
            except Exception:
                pass

        rows = []

        # ── نسخه‌ی ۳.۵: جدول مستقل clients ──
        if "clients" in tables:
            cols = {r[1] for r in con.execute("PRAGMA table_info(clients)")}
            sel = ["email", "total_gb", "expiry_time", "enable", "created_at"]
            if "group_name" in cols:
                sel.append("group_name")
            if "comment" in cols:
                sel.append("comment")
            try:
                for r in con.execute(f"SELECT {','.join(sel)} FROM clients"):
                    d = dict(r)
                    rows.append({
                        "email": d.get("email"),
                        "group": (d.get("group_name") or "").strip() or "بدون گروه",
                        "totalGB": int(d.get("total_gb") or 0),
                        "expiry": int(d.get("expiry_time") or 0),
                        "enable": bool(d.get("enable")),
                        "createdAt": d.get("created_at"),
                        "comment": d.get("comment") or "",
                    })
            except Exception as e:
                return None, None, f"خواندن clients ناموفق: {str(e)[:110]}"

        # ── نسخه‌ی کلاسیک: کلاینت داخل JSON اینباند ──
        elif "inbounds" in tables:
            try:
                for r in con.execute("SELECT id, remark, settings FROM inbounds"):
                    try:
                        st = json.loads(r["settings"] or "{}")
                    except (json.JSONDecodeError, TypeError):
                        continue
                    for cl in st.get("clients", []):
                        rows.append({
                            "email": cl.get("email"),
                            "group": (r["remark"] or "").strip() or "بدون گروه",
                            "totalGB": int(cl.get("totalGB") or 0),
                            "expiry": int(cl.get("expiryTime") or 0),
                            "enable": bool(cl.get("enable", True)),
                            "createdAt": None,
                            "comment": "",
                        })
            except Exception as e:
                return None, None, f"خواندن اینباندها ناموفق: {str(e)[:110]}"
        else:
            return None, None, "جدول کلاینت‌ها پیدا نشد — نسخه‌ی x-ui پشتیبانی نمی‌شود"

        # مصرف را می‌چسبانیم
        out = []
        for r in rows:
            em = r.get("email")
            if not em:
                continue
            t = traffic.get(em, {})
            r["used"] = int((t.get("up") or 0) + (t.get("down") or 0))
            if not r.get("expiry"):
                r["expiry"] = int(t.get("expiry_time") or 0)
            out.append(r)

        return out, known_groups, None
    finally:
        con.close()


def _months_for(cl, logged):
    """
    تعداد ماه یک کانفیگ.

    اگر تمدید در نکسورا ثبت شده باشد، همان قطعی است. وگرنه از فاصله‌ی
    ایجاد تا انقضا تخمین می‌زنیم — که کم‌شمار است، چون تمدید زودتر از
    موعد چند روز را می‌سوزاند.
    """
    if cl["email"] in logged:
        return 1 + logged[cl["email"]], "قطعی", 0

    exp, created = cl.get("expiry"), cl.get("createdAt")
    if not exp or exp <= 0 or not created:
        return 1, "پیش‌فرض", 0

    try:
        from datetime import datetime as _dt
        if isinstance(created, str):
            c0 = _dt.fromisoformat(created.replace("Z", "+00:00")).timestamp() * 1000
        else:
            c0 = float(created)
        days = (exp - c0) / 86400000.0
        if days <= 0:
            return 1, "منقضی", 0
        months = max(1, round(days / 30))
        drift = abs(days - months * 30)
        return months, ("قطعی" if drift <= 2 else "تخمینی"), round(drift)
    except Exception:
        return 1, "پیش‌فرض", 0


def _price_for(gb, rates):
    """
    قیمت یک کانفیگ. نرخ نامحدود با gb=0 مشخص می‌شود.
    اگر حجم دقیقاً پیدا نشد، نزدیک‌ترین نرخ بالاتر انتخاب می‌شود.
    """
    if not rates:
        return None
    for r in rates:
        if int(r.get("gb", -1)) == gb:
            return int(r.get("price", 0))
    if gb > 0:
        higher = sorted((r for r in rates if int(r.get("gb", 0)) > gb),
                        key=lambda r: int(r["gb"]))
        if higher:
            return int(higher[0].get("price", 0))
    return None


@app.get("/api/admin/billing/overview")
def billing_overview(x_admin_password: str = Header(...)):
    """گروه‌ها با محاسبه‌ی کامل — پایه‌ی همه‌ی صفحات حسابداری."""
    check_auth(x_admin_password)

    clients, known_groups, err = _read_xui_clients()
    if clients is None:
        return {"ready": False, "error": err, "xuiPath": str(_xui_db_path()), "groups": []}

    bcon = _billing_conn()
    try:
        cfg = {r["group_key"]: dict(r) for r in bcon.execute("SELECT * FROM group_config")}
        pays = {}
        for r in bcon.execute(
            "SELECT group_key, COALESCE(SUM(amount),0) s FROM payments GROUP BY group_key"
        ):
            pays[r["group_key"]] = r["s"]
        logged = {}
        for r in bcon.execute(
            "SELECT email, COALESCE(SUM(months),0) m FROM renewals GROUP BY email"
        ):
            logged[r["email"]] = r["m"]
    finally:
        bcon.close()

    groups = {}
    for cl in clients:
        g = cl["group"]
        conf = cfg.get(g, {})
        try:
            rates = json.loads(conf.get("rates") or "[]")
        except (json.JSONDecodeError, TypeError):
            rates = []

        if g not in groups:
            groups[g] = {
                "key": g,
                "label": conf.get("label") or g,
                "billable": bool(conf.get("billable", 0)),
                "rates": rates if isinstance(rates, list) else [],
                "configs": 0, "active": 0, "months": 0, "renewals": 0,
                "used": 0, "quota": 0, "due": 0,
                "paid": pays.get(g, 0), "unpriced": 0, "estimated": 0,
            }

        G = groups[g]
        G["configs"] += 1
        if cl["enable"]:
            G["active"] += 1
        G["used"] += cl["used"]
        G["quota"] += cl["totalGB"]

        months, kind, _ = _months_for(cl, logged)
        G["months"] += months
        G["renewals"] += months - 1
        if kind == "تخمینی":
            G["estimated"] += 1

        if G["billable"]:
            gb = cl["totalGB"] // (1024 ** 3) if cl["totalGB"] > 1024 else cl["totalGB"]
            price = _price_for(gb, G["rates"])
            if price is None:
                G["unpriced"] += 1
            else:
                G["due"] += months * price

    # گروه‌هایی که در پنل ساخته شده‌اند ولی هنوز کاربری ندارند هم
    # باید دیده شوند — وگرنه ادمین فکر می‌کند گروهش گم شده.
    for gname in (known_groups or []):
        if gname not in groups:
            conf = cfg.get(gname, {})
            try:
                rates = json.loads(conf.get("rates") or "[]")
            except (json.JSONDecodeError, TypeError):
                rates = []
            groups[gname] = {
                "key": gname,
                "label": conf.get("label") or gname,
                "billable": bool(conf.get("billable", 0)),
                "rates": rates if isinstance(rates, list) else [],
                "configs": 0, "active": 0, "months": 0, "renewals": 0,
                "used": 0, "quota": 0, "due": 0,
                "paid": pays.get(gname, 0), "unpriced": 0, "estimated": 0,
            }

    out = sorted(groups.values(), key=lambda g: (-g["billable"], -g["configs"]))
    for g in out:
        g["balance"] = g["due"] - g["paid"]
        g["usedGB"] = round(g["used"] / (1024 ** 3), 1)
        g["quotaGB"] = round(g["quota"] / (1024 ** 3), 1) if g["quota"] > 1024 else g["quota"]

    billed = [g for g in out if g["billable"]]
    return {
        "ready": True,
        "groups": out,
        "totals": {
            "due": sum(g["due"] for g in billed),
            "paid": sum(g["paid"] for g in billed),
            "balance": sum(g["balance"] for g in billed),
            "resellers": len(billed),
            "configs": sum(g["configs"] for g in billed),
        },
    }


@app.put("/api/admin/billing/group/{group_key}")
def billing_group_put(group_key: str, payload: dict, x_admin_password: str = Header(...)):
    """ذخیره‌ی نرخ و وضعیت یک گروه."""
    check_auth(x_admin_password)

    rates = (payload or {}).get("rates", [])
    if not isinstance(rates, list):
        raise HTTPException(status_code=400, detail="فهرست نرخ نامعتبر است")

    clean = []
    for r in rates:
        try:
            clean.append({"gb": max(0, int(r.get("gb", 0))),
                          "price": max(0, int(r.get("price", 0)))})
        except (TypeError, ValueError):
            continue

    con = _billing_conn()
    try:
        con.execute(
            "INSERT INTO group_config (group_key,label,billable,rates,note,updated_at) "
            "VALUES (?,?,?,?,?,CURRENT_TIMESTAMP) "
            "ON CONFLICT(group_key) DO UPDATE SET "
            "label=excluded.label, billable=excluded.billable, "
            "rates=excluded.rates, note=excluded.note, updated_at=CURRENT_TIMESTAMP",
            (group_key,
             (payload.get("label") or group_key).strip(),
             1 if payload.get("billable") else 0,
             json.dumps(clean, ensure_ascii=False),
             (payload.get("note") or "").strip()))
        con.commit()
        return {"ok": True, "rates": clean}
    finally:
        con.close()


@app.get("/api/admin/billing/payments")
def billing_payments_get(group: str = "", x_admin_password: str = Header(...)):
    """فهرست پرداخت‌ها."""
    check_auth(x_admin_password)
    con = _billing_conn()
    try:
        if group:
            rows = con.execute(
                "SELECT * FROM payments WHERE group_key=? ORDER BY paid_at DESC, id DESC",
                (group,)).fetchall()
        else:
            rows = con.execute(
                "SELECT * FROM payments ORDER BY paid_at DESC, id DESC LIMIT 200").fetchall()
        return {"payments": [dict(r) for r in rows]}
    finally:
        con.close()


@app.post("/api/admin/billing/payments")
def billing_payment_add(payload: dict, x_admin_password: str = Header(...)):
    """ثبت یک پرداخت."""
    check_auth(x_admin_password)
    g = (payload or {}).get("group_key", "").strip()
    if not g:
        raise HTTPException(status_code=400, detail="واسطه مشخص نشده است")
    try:
        amount = int(payload.get("amount", 0))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="مبلغ نامعتبر است")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="مبلغ باید بیشتر از صفر باشد")

    con = _billing_conn()
    try:
        cur = con.execute(
            "INSERT INTO payments (group_key,amount,paid_at,note) VALUES (?,?,?,?)",
            (g, amount,
             (payload.get("paid_at") or datetime.now().strftime("%Y-%m-%d")),
             (payload.get("note") or "").strip()))
        con.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        con.close()


@app.delete("/api/admin/billing/payments/{pid}")
def billing_payment_del(pid: int, x_admin_password: str = Header(...)):
    """حذف یک پرداخت."""
    check_auth(x_admin_password)
    con = _billing_conn()
    try:
        con.execute("DELETE FROM payments WHERE id=?", (pid,))
        con.commit()
        return {"ok": True}
    finally:
        con.close()


@app.get("/api/admin/billing/invoice/{group_key}")
def billing_invoice(group_key: str, x_admin_password: str = Header(...)):
    """جزئیات کامل یک واسطه — برای صورتحساب."""
    check_auth(x_admin_password)

    clients, _known, err = _read_xui_clients()
    if clients is None:
        raise HTTPException(status_code=400, detail=err)

    bcon = _billing_conn()
    try:
        row = bcon.execute("SELECT * FROM group_config WHERE group_key=?",
                           (group_key,)).fetchone()
        conf = dict(row) if row else {}
        try:
            rates = json.loads(conf.get("rates") or "[]")
        except (json.JSONDecodeError, TypeError):
            rates = []
        logged = {r["email"]: r["m"] for r in bcon.execute(
            "SELECT email, COALESCE(SUM(months),0) m FROM renewals GROUP BY email")}
        paid = bcon.execute(
            "SELECT COALESCE(SUM(amount),0) s FROM payments WHERE group_key=?",
            (group_key,)).fetchone()["s"]
    finally:
        bcon.close()

    lines, due = [], 0
    for cl in clients:
        if cl["group"] != group_key:
            continue
        months, kind, drift = _months_for(cl, logged)
        gb = cl["totalGB"] // (1024 ** 3) if cl["totalGB"] > 1024 else cl["totalGB"]
        price = _price_for(gb, rates)
        amount = (months * price) if price is not None else 0
        due += amount
        lines.append({
            "email": cl["email"],
            "gb": gb,
            "usedGB": round(cl["used"] / (1024 ** 3), 2),
            "months": months,
            "renewals": months - 1,
            "kind": kind,
            "drift": drift,
            "price": price,
            "amount": amount,
            "active": cl["enable"],
            "expiry": cl["expiry"],
        })

    lines.sort(key=lambda x: -x["amount"])
    return {
        "group": group_key,
        "label": conf.get("label") or group_key,
        "rates": rates,
        "lines": lines,
        "totals": {
            "configs": len(lines),
            "months": sum(l["months"] for l in lines),
            "renewals": sum(l["renewals"] for l in lines),
            "due": due,
            "paid": paid,
            "balance": due - paid,
            "unpriced": sum(1 for l in lines if l["price"] is None),
            "estimated": sum(1 for l in lines if l["kind"] == "تخمینی"),
        },
    }


@app.get("/api/admin/billing/backup")
def billing_backup(x_admin_password: str = Header(...)):
    """بک‌آپ کامل حسابداری — نرخ‌ها، پرداخت‌ها و لاگ تمدید."""
    check_auth(x_admin_password)
    con = _billing_conn()
    try:
        dump = {}
        for t in ("group_config", "payments", "renewals"):
            try:
                dump[t] = [dict(r) for r in con.execute(f"SELECT * FROM {t}")]
            except Exception:
                dump[t] = []
        return {
            "version": 1,
            "createdAt": datetime.now().isoformat(timespec="seconds"),
            "counts": {k: len(v) for k, v in dump.items()},
            "data": dump,
        }
    finally:
        con.close()


@app.post("/api/admin/billing/restore")
def billing_restore(payload: dict, x_admin_password: str = Header(...)):
    """
    بازیابی بک‌آپ حسابداری.

    قبل از هر کاری یک نسخه‌ی امن از وضعیت فعلی گرفته می‌شود، چون
    نرخ‌ها و پرداخت‌ها داده‌ی مالی‌اند و از دست رفتنشان گران است.
    """
    check_auth(x_admin_password)
    data = (payload or {}).get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="فایل بک‌آپ نامعتبر است")

    safety = None
    try:
        import shutil
        if BILLING_DB.exists():
            safety = BILLING_DB.with_name(
                f"billing-before-restore-{datetime.now():%Y%m%d-%H%M%S}.db")
            shutil.copy2(BILLING_DB, safety)
    except Exception:
        pass

    con = _billing_conn()
    try:
        restored = {}
        for t in ("group_config", "payments", "renewals"):
            rows = data.get(t) or []
            try:
                con.execute(f"DELETE FROM {t}")
            except Exception:
                pass
            if not rows:
                restored[t] = 0
                continue
            cols = [r[1] for r in con.execute(f"PRAGMA table_info({t})")]
            usable = [x for x in cols if any(x in r for r in rows)]
            if not usable:
                restored[t] = 0
                continue
            ph = ",".join("?" * len(usable))
            sql = f"INSERT OR REPLACE INTO {t} ({','.join(usable)}) VALUES ({ph})"
            n = 0
            for r in rows:
                try:
                    con.execute(sql, [r.get(x) for x in usable])
                    n += 1
                except Exception:
                    pass
            restored[t] = n
        con.commit()
        return {"ok": True, "restored": restored,
                "safetyCopy": str(safety) if safety else None}
    finally:
        con.close()


@app.get("/api/admin/billing/xui-path")
def billing_xui_path(x_admin_password: str = Header(...)):
    """
    وضعیت مسیر دیتابیس x-ui — برای بخش تنظیمات.

    مسیرهای رایج را هم بررسی می‌کند تا اگر جای دیگری نصب شده،
    کاربر مجبور نباشد حدس بزند.
    """
    check_auth(x_admin_password)
    cur = _xui_db_path()

    found = []
    for p in XUI_CANDIDATES:
        pp = Path(p)
        if pp.exists():
            found.append({"path": p, "readable": os.access(pp, os.R_OK),
                          "size": pp.stat().st_size})

    return {
        "current": str(cur),
        "exists": cur.exists(),
        "readable": cur.exists() and os.access(cur, os.R_OK),
        "found": found,
        "envVar": os.getenv("XUI_DB_PATH", ""),
    }


@app.get("/api/health")
def health():
    return {"ok": True}
