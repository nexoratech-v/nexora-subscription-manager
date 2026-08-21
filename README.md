<div align="center">

<br>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06090F,50:2B7FD6,100:5AA9E6&height=190&section=header&text=NEXORA&fontSize=72&fontColor=ffffff&fontAlignY=36&desc=Subscription%20Manager%20for%203x-ui&descSize=17&descAlignY=57&descAlign=50" width="100%" alt="Nexora">

<br>

**صفحه‌ی اشتراکی که مشتری دوستش دارد · رباتی که شب‌ها به‌جای شما می‌فروشد**

<br>

<img src="https://img.shields.io/badge/version-1.1.0-2B7FD6?style=for-the-badge&labelColor=06090F">
<img src="https://img.shields.io/badge/tests-143_passing-34D399?style=for-the-badge&labelColor=06090F">
<img src="https://img.shields.io/badge/license-MIT-A78BFA?style=for-the-badge&labelColor=06090F">

<br>
<br>

<a href="https://t.me/yanexoravpn"><img src="https://img.shields.io/badge/کانال-yanexoravpn-229ED9?style=for-the-badge&logo=telegram&logoColor=white&labelColor=06090F"></a>
<a href="https://t.me/crm_nexoravpn"><img src="https://img.shields.io/badge/پشتیبانی-crm__nexoravpn-229ED9?style=for-the-badge&logo=telegram&logoColor=white&labelColor=06090F"></a>

<br>
<br>

[فارسی](#-فارسی) &nbsp;•&nbsp; [English](#-english) &nbsp;•&nbsp; [نصب](#-نصب--install)

<br>

</div>

---

<div align="center">

## 🇮🇷 فارسی

</div>

ساعت سه بامداد است. مشتری پول واریز کرده و منتظر کانفیگ است.

بیدار شوید و دستی بسازید — مشتری راضی، شما خسته. نشوید — صبح یک پیام عصبانی دارید.

**نکسورا برای همین شب‌ها ساخته شد.**

<br>

| | |
|:--|:--|
| 🎨 **۳۲ ظاهر** | ۴ ساختار × ۸ طیف رنگی — برای هر واسطه جداگانه |
| ⚡ **یک ضربه** | افزودن مستقیم به Happ و v2rayNG و V2Box |
| 🤖 **فروش خودکار** | رسید ← تایید شما ← کانفیگ تحویل داده می‌شود |
| 💎 **سکه و دعوت** | نردبان تخفیف — هرچه نگه دارد، بیشتر می‌گیرد |
| 👥 **واسطه‌ها** | برند خودشان، مشتری‌شان برند شما را نمی‌بیند |
| 📊 **آمار و قیف** | از استارت تا خرید، با نرخ تبدیل |

<br>

### جریان فروش

```
مشتری  ──►  کارت‌به‌کارت  ──►  رسید
                                 │
                                 ▼
   شما  ◄──  اعلان تلگرام  ◄──  ربات
     │
     ▼  یک ضربه
   کانفیگ ساخته و تحویل می‌شود
```

<br>

### گروه مدیریت

ربات یک سوپرگروه می‌سازد و تاپیک‌ها را خودش اضافه می‌کند:

<div align="center">

`💳 رسیدها` `👥 کاربران` `📊 آمار` `💾 بکاپ` `🎫 تیکت` `⚠️ هشدار`

</div>

کل کسب‌وکار از تلگرام، بدون باز کردن پنل.

<br>

---

<div align="center">

## 🌍 English

</div>

It's 3 AM. A customer paid and is waiting for their config.

Get up and build it by hand — they're happy, you're exhausted. Stay asleep — you wake to an angry message.

**Nexora was built for those nights.**

<br>

| | |
|:--|:--|
| 🎨 **32 looks** | 4 structures × 8 palettes — per reseller |
| ⚡ **One tap** | Direct install into Happ, v2rayNG, V2Box |
| 🤖 **Sells itself** | Receipt → your tap → config delivered |
| 💎 **Coins** | Invites become discounts — holding pays off |
| 👥 **Resellers** | Own brand; their customers never see yours |
| 📊 **Funnel** | From first open to purchase, with conversion |

<br>

---

<div align="center">

## 📦 نصب · Install

</div>

```bash
git clone https://github.com/YOUR_USERNAME/nexora.git
cd nexora && sudo bash install.sh
```

SSL، nginx، systemd و بیلد پنل — همه خودکار.
<sub>SSL, nginx, systemd and the panel build — all automatic.</sub>

<br>

### اتصال ربات · Connect the bot

| | |
|:--:|:--|
| **۱** | توکن از [@BotFather](https://t.me/BotFather) |
| **۲** | پنل ← ربات ← اتصال و تنظیمات |
| **۳** | توکن API از `3x-ui → Settings → Security` |
| **۴** | دکمه‌ی **اجرای تست** |
| **۵** | یک پلن و یک شماره کارت |
| **۶** | ربات را روشن کنید |

<br>

> [!IMPORTANT]
> توکن ربات باید با ربات داخلی ۳x-ui **متفاوت** باشد.
> <sub>The bot token must differ from 3x-ui's own bot token.</sub>

<br>

### تست اتصال · Connection test

«وصل شد» یعنی رمز درست است — نه اینکه ربات می‌تواند کانفیگ بسازد.
نکسورا واقعاً یکی می‌سازد و پاک می‌کند:

```
✓  احراز هویت              با توکن API
✓  خواندن inbound ها        ۳ عدد
✓  نسخه پنل                معماری جدید ۳.۴+
✓  ساخت کانفیگ آزمایشی      nexora_test_a3f9
✓  بازخوانی                در پنل پیدا شد
✓  پاکسازی                 حذف شد
```

<br>

---

<div align="center">

## ⚙️ دستورات · Commands

</div>

| دستور | کار |
|:--|:--|
| `nexora` | وضعیت کلی |
| `nexora bot` | کنترل ربات |
| `nexora doctor` | رفع خودکار مشکلات |
| `nexora update` | به‌روزرسانی |
| `nexora rollback` | بازگشت به نسخه قبل |
| `nexora backup` | پشتیبان‌گیری |

<br>

قبل از هر به‌روزرسانی snapshot گرفته می‌شود — `nexora rollback` همیشه شما را برمی‌گرداند.

<br>

---

<div align="center">

## 🔧 زیر کاپوت · Under the hood

</div>

| | |
|:--|:--|
| **Backend** | FastAPI · 38 endpoints · SQLite + JSON |
| **Frontend** | React · Vite · Tailwind |
| **Sub page** | Go template — همان چیزی که ۳x-ui می‌خواهد |
| **Bot** | Python خالص · تنها وابستگی: `requests` |

<br>

> [!NOTE]
> **ربات ماژول جداست** — سرویس و دیتابیس مستقل.
> اگر ربات بیفتد، پنل و صفحه‌ی مشتریان دست‌نخورده کار می‌کنند.
>
> <sub>The bot is a separate module. If it stops, the panel and customer pages keep working.</sub>

<br>

```bash
cd bot
python3 test_bot.py     # ۷۱ تست
python3 test_flow.py    # ۳۸ تست جریان خرید
python3 test_admin.py   # ۳۴ تست پنل مدیریت
```

<br>

---

<div align="center">

<br>

### MIT

آزادانه استفاده کنید، تغییر دهید، بفروشید.

<br>

<a href="https://t.me/yanexoravpn"><img src="https://img.shields.io/badge/Telegram-@yanexoravpn-229ED9?style=flat-square&logo=telegram&logoColor=white&labelColor=06090F"></a>

<br>
<br>

**ساخته شده برای کسانی که ترجیح می‌دهند ساعت سه بامداد بخوابند**

<sub>Built for people who would rather be asleep at 3 AM</sub>

<br>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:5AA9E6,50:2B7FD6,100:06090F&height=90&section=footer" width="100%">

</div>
