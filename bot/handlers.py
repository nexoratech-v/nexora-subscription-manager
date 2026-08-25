"""
جریان‌های کاربری ربات.

هر handler یک تابع ساده است که (ctx, update) می‌گیرد.
ctx شامل bot، db، tenant و settings است.
"""

import json
import logging
from datetime import datetime

from tg import kb, esc, TelegramError, Bot, contact_kb, remove_kb
import core
import db as DB
from xui import XUI, XUIError

log = logging.getLogger("nexora.bot")


# ═══════════════════════════════════════════════════════════
#  Context — هر مستاجر یک نمونه دارد
# ═══════════════════════════════════════════════════════════

class Ctx:
    """
    زمینه‌ی یک درخواست.

    نکته‌ی مهم درباره‌ی بازخوانی زنده: تنظیمات و اطلاعات مستاجر هر بار
    تازه خوانده می‌شوند، پس تغییرات پنل بدون ری‌استارت ربات اعمال می‌شوند.
    فقط اتصال 3x-ui کش می‌شود (چون لاگین هزینه دارد) و آن هم وقتی
    اطلاعات اتصال عوض شود، خودکار دور ریخته می‌شود.
    """

    def __init__(self, bot, tenant):
        self.bot = bot
        self._tenant0 = tenant
        self.tid = tenant["id"]
        self.db = DB.TenantDB(tenant["id"])
        self._xui = None
        self._xui_sig = None

    @property
    def tenant(self):
        """اطلاعات تازه‌ی مستاجر — نه نسخه‌ی لحظه‌ی ساخت."""
        return DB.get_tenant(self.tid) or self._tenant0

    @property
    def s(self):
        """تنظیمات مستاجر (تازه خوانده می‌شود تا تغییرات پنل فوری اعمال شوند)."""
        return DB.tenant_settings(self.tid)

    @property
    def xui(self):
        t = self.tenant
        # امضای اتصال — اگر عوض شود یعنی ادمین تنظیمات پنل را تغییر داده
        sig = (t.get("panel_url"), t.get("panel_user"),
               t.get("panel_pass"), t.get("panel_token"))
        if self._xui is None or self._xui_sig != sig:
            self._xui = XUI(*sig)
            self._xui_sig = sig
        return self._xui

    def brand(self):
        return self.s.get("brand") or self.tenant.get("name") or "VPN"

    def is_admin(self, tg_id):
        """
        تشخیص ادمین.

        نکته: owner_tg_id از فرم پنل می‌آید و ممکن است رشته باشد،
        در حالی که تلگرام همیشه عدد می‌فرستد. پس هر دو را به عدد
        تبدیل می‌کنیم تا مقایسه درست انجام شود — این باگی بود که
        باعث می‌شد ادمین اصلاً شناخته نشود.
        """
        def as_int(v):
            try:
                return int(str(v).strip())
            except (TypeError, ValueError):
                return None

        me = as_int(tg_id)
        if me is None:
            return False

        t = DB.get_tenant(self.tid)
        if as_int(t.get("owner_tg_id")) == me:
            return True

        for a in (self.s.get("admins") or []):
            if as_int(a) == me:
                return True
        return False

    def notify_group(self, text, keyboard=None, topic=None):
        """ارسال به گروه مدیریت در تاپیک مشخص."""
        t = DB.get_tenant(self.tid)
        gid = t.get("admin_group_id")
        if not gid:
            return None
        try:
            topics = json.loads(t.get("topics") or "{}")
        except json.JSONDecodeError:
            topics = {}
        try:
            return self.bot.send(gid, text, keyboard=keyboard,
                                 topic_id=topics.get(topic))
        except TelegramError as e:
            log.warning("ارسال به گروه ناموفق: %s", e)
            return None


# ═══════════════════════════════════════════════════════════
#  منوها
# ═══════════════════════════════════════════════════════════

def main_menu(ctx, user):
    rows = [
        [("🛒 خرید اشتراک", "buy")],
        [("📊 اشتراک‌های من", "mysubs"), ("👛 کیف پول", "wallet")],
        [("🎁 دعوت دوستان", "ref"), ("🪙 سکه‌های من", "coins")],
    ]
    if ctx.s.get("trial_enabled") and not user.get("trial_used"):
        rows.insert(1, [("🎉 دریافت اشتراک تست رایگان", "trial")])
    rows.append([("📚 آموزش نصب", "help"), ("💬 پشتیبانی", "support")])
    if ctx.is_admin(user["tg_id"]):
        rows.append([("⚙️ پنل مدیریت", "admin")])
    return kb(rows)


def back_kb(to="menu"):
    return kb([[("‹ بازگشت", to)]])


def welcome_text(ctx, user):
    """
    پیام خوش‌آمد با وضعیت زنده.

    به‌جای یک متن ثابت، وضعیت واقعی کاربر را نشان می‌دهد: اشتراک فعال،
    روزهای باقی‌مانده، سکه و کیف پول. این‌طور کاربر با یک نگاه می‌فهمد
    کجاست و چه کاری باید بکند.
    """
    name = esc(user.get("first_name") or "دوست عزیز")
    brand = esc(ctx.brand())

    custom = ctx.s.get("welcome_text")
    if custom:
        return custom.replace("{name}", name).replace("{brand}", brand)

    subs = ctx.db.user_subs(user["id"], active_only=True)
    coins = user.get("coins", 0)
    balance = user.get("balance", 0)

    lines = [f"سلام {name} 👋", ""]

    if subs:
        s = subs[0]
        left = core.days_left(s.get("expires_at"))
        if left is None:
            status = "♾ بدون محدودیت زمانی"
        elif left <= 0:
            status = "⛔️ منقضی شده"
        elif left <= 3:
            status = f"⚠️ فقط <b>{left} روز</b> باقی مانده"
        else:
            status = f"✅ <b>{left} روز</b> باقی مانده"

        lines += [
            f"📦 <b>{esc(s.get('plan_name') or 'اشتراک شما')}</b>",
            f"   {status}",
        ]
        if len(subs) > 1:
            lines.append(f"   <i>و {len(subs) - 1} اشتراک دیگر</i>")
    else:
        lines += [
            "🔍 هنوز اشتراک فعالی ندارید.",
            "   از دکمه‌ی <b>خرید اشتراک</b> شروع کنید.",
        ]

    lines.append("")
    wallet_line = []
    if coins:
        tier = core.tier_for(coins, ctx.s)
        if tier:
            wallet_line.append(f"💎 {coins} سکه <i>({tier['percent']}٪ تخفیف)</i>")
        else:
            wallet_line.append(f"💎 {coins} سکه")
    if balance:
        wallet_line.append(f"👛 {core.toman(balance)}")
    if wallet_line:
        lines.append("   ·   ".join(wallet_line))

    return "\n".join(lines).rstrip()


# ═══════════════════════════════════════════════════════════
#  /start و ثبت‌نام + رفرال
# ═══════════════════════════════════════════════════════════

def cmd_start(ctx, msg, args=None):
    tg = msg["from"]
    user = ctx.db.get_user(tg["id"])

    if not user:
        referrer = None
        if args:
            ref = ctx.db.get_user_by_ref(args.strip())
            # جلوگیری از خودارجاعی
            if ref and ref["tg_id"] != tg["id"]:
                referrer = ref["id"]

        user = ctx.db.create_user(
            tg["id"], tg.get("username"), tg.get("first_name"),
            referred_by=referrer
        )
        ctx.db.log("signup", user["id"], {"ref": bool(referrer)})

        # پاداش خوش‌آمد به دعوت‌شده (اگر تنظیم شده باشد)
        cs = core.coin_settings(ctx.s.get("coins"))
        if referrer and cs.get("welcome_bonus"):
            ctx.db.add_coins(user["id"], int(cs["welcome_bonus"]),
                             "bonus", "هدیه ورود با لینک دعوت")

        ctx.notify_group(
            f"👤 <b>کاربر جدید</b>\n"
            f"نام: {esc(tg.get('first_name'))}\n"
            f"آیدی: <code>{tg['id']}</code>\n"
            f"یوزرنیم: @{esc(tg.get('username')) if tg.get('username') else '—'}\n"
            f"{'📎 با لینک دعوت' if referrer else ''}",
            topic="users"
        )
    else:
        ctx.db.touch_user(tg["id"])

    ctx.db.clear_state(tg["id"])
    ctx.bot.send(tg["id"], welcome_text(ctx, user), keyboard=main_menu(ctx, user))


# ═══════════════════════════════════════════════════════════
#  خرید
# ═══════════════════════════════════════════════════════════

def show_plans(ctx, user, chat_id, message_id=None):
    # عضویت اجباری کانال — قبل از دیدن پلن‌ها
    if require_membership(ctx, chat_id, message_id, user):
        return

    plans = ctx.db.plans()
    if not plans:
        text = "در حال حاضر پلنی برای فروش تعریف نشده است."
        return _reply(ctx, chat_id, message_id, text, back_kb())

    rows = [[(core.plan_line(p), f"plan:{p['id']}")] for p in plans]
    rows.append([("‹ بازگشت", "menu")])

    prog = core.coin_progress(user["coins"], ctx.s.get("coins"))
    hint = ""
    if prog["current_percent"]:
        hint = (f"\n\n🪙 شما {prog['coins']} سکه دارید — "
                f"<b>{prog['current_percent']}٪ تخفیف</b> قابل استفاده است.")
    elif prog["next"]:
        hint = (f"\n\n🪙 با {prog['next']['need']} سکه دیگر، "
                f"{prog['next']['percent']}٪ تخفیف می‌گیرید.")

    _reply(ctx, chat_id, message_id,
           f"<b>پلن مورد نظر را انتخاب کنید:</b>{hint}", kb(rows))


def show_plan_detail(ctx, user, chat_id, message_id, plan_id):
    p = ctx.db.get_plan(plan_id)
    if not p:
        return _reply(ctx, chat_id, message_id, "این پلن دیگر موجود نیست.", back_kb("buy"))

    cs = ctx.s.get("coins")
    pr = core.price_order(p["price"], coins=user["coins"], coin_cfg=cs, use_coins=True)
    has_coin_discount = pr["coin_discount"] > 0

    lines = [
        f"<b>{esc(p['name'])}</b>",
        "",
        f"📦 حجم: {core.fmt_gb(p['gb'])}",
        f"⏱ مدت: {core.fmt_days(p['days'])}",
        f"📱 کاربر همزمان: {p['ip_limit'] or 'نامحدود'}",
    ]
    if p.get("description"):
        lines += ["", esc(p["description"])]
    lines += ["", f"💰 قیمت: <b>{core.toman(p['price'])}</b> تومان"]

    rows = []
    if has_coin_discount:
        lines += [
            f"🪙 با {pr['coins_used']} سکه: <b>{core.toman(pr['final'])}</b> تومان "
            f"({pr['coin_percent']}٪ تخفیف)"
        ]
        rows.append([(f"🪙 خرید با تخفیف سکه — {core.toman(pr['final'])} تومان",
                      f"chk:{plan_id}:1")])
    rows.append([(f"💳 خرید — {core.toman(p['price'])} تومان", f"chk:{plan_id}:0")])

    if user["balance"] >= p["price"]:
        rows.append([("👛 پرداخت از کیف پول", f"wpay:{plan_id}")])

    rows.append([("‹ بازگشت", "buy")])
    _reply(ctx, chat_id, message_id, "\n".join(lines), kb(rows))


def checkout(ctx, user, chat_id, message_id, plan_id, use_coins):
    """ساخت سفارش و نمایش اطلاعات کارت."""
    p = ctx.db.get_plan(plan_id)
    if not p:
        return _reply(ctx, chat_id, message_id, "این پلن دیگر موجود نیست.", back_kb("buy"))

    cs = ctx.s.get("coins")
    pr = core.price_order(p["price"], coins=user["coins"], coin_cfg=cs,
                          use_coins=bool(use_coins))

    card = core.pick_card(ctx.s.get("cards"))
    if not card:
        return _reply(ctx, chat_id, message_id,
                      "روش پرداخت هنوز تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید.",
                      back_kb())

    ttl = int(ctx.s.get("order_ttl_minutes") or 30)
    order = ctx.db.create_order(
        user["id"], plan_id, p["price"], pr["final"],
        coins_used=pr["coins_used"], ttl_minutes=ttl
    )
    ctx.db.exec("UPDATE orders SET card_used=?, status='pending' WHERE tenant_id=? AND id=?",
                (card.get("number"), ctx.tid, order["id"]))
    ctx.db.set_state(user["tg_id"], "await_receipt", {"order_id": order["id"]})

    lines = [
        f"🧾 <b>سفارش #{order['id']}</b>",
        "",
        f"پلن: {esc(p['name'])}",
    ]
    if pr["coin_discount"]:
        lines += [
            f"قیمت اصلی: <s>{core.toman(p['price'])}</s> تومان",
            f"تخفیف سکه: {pr['coin_percent']}٪ ({pr['coins_used']} سکه)",
        ]
    lines += [
        f"<b>مبلغ قابل پرداخت: {core.toman(pr['final'])} تومان</b>",
        "",
        "💳 لطفاً مبلغ را به این کارت واریز کنید:",
        f"<code>{core.fmt_card(card['number'])}</code>",
        f"به نام: <b>{esc(card.get('holder') or '—')}</b>",
    ]
    if card.get("bank"):
        lines.append(f"بانک: {esc(card['bank'])}")
    lines += [
        "",
        f"⏳ مهلت پرداخت: {ttl} دقیقه",
        "",
        "بعد از واریز، <b>عکس رسید</b> یا <b>متن پیامک</b> را همین‌جا بفرستید.",
    ]

    _reply(ctx, chat_id, message_id, "\n".join(lines),
           kb([[("✖️ لغو سفارش", f"cancel:{order['id']}")]]))


def wallet_pay(ctx, user, chat_id, message_id, plan_id):
    """پرداخت مستقیم از کیف پول — بدون نیاز به تایید ادمین."""
    p = ctx.db.get_plan(plan_id)
    if not p:
        return _reply(ctx, chat_id, message_id, "این پلن موجود نیست.", back_kb("buy"))

    fresh = ctx.db.get_user(user["tg_id"])
    if fresh["balance"] < p["price"]:
        return _reply(ctx, chat_id, message_id,
                      "موجودی کیف پول کافی نیست.", back_kb("buy"))

    order = ctx.db.create_order(fresh["id"], plan_id, p["price"], p["price"],
                                paid_from="wallet")
    ctx.db.add_balance(fresh["id"], -p["price"], "spend",
                       f"خرید {p['name']}", order["id"])

    ok, result = provision(ctx, order["id"])
    if ok:
        _reply(ctx, chat_id, message_id,
               "✅ پرداخت از کیف پول انجام شد.", None)
        deliver(ctx, fresh, result)
    else:
        # برگرداندن پول در صورت خطا
        ctx.db.add_balance(fresh["id"], p["price"], "refund",
                           "خطا در ساخت کانفیگ", order["id"])
        _reply(ctx, chat_id, message_id,
               f"مشکلی پیش آمد و مبلغ به کیف پولتان برگشت.\n\n{esc(result)}",
               back_kb())


# ═══════════════════════════════════════════════════════════
#  دریافت رسید
# ═══════════════════════════════════════════════════════════

def handle_receipt(ctx, msg, user, state_data):
    order_id = state_data.get("order_id")
    order = ctx.db.get_order(order_id)

    if not order or order["status"] not in ("pending",):
        ctx.db.clear_state(user["tg_id"])
        return ctx.bot.send(user["tg_id"], "این سفارش دیگر معتبر نیست.",
                            keyboard=main_menu(ctx, user))

    # بررسی مهلت
    if order.get("expires_at"):
        try:
            if datetime.fromisoformat(order["expires_at"]) < datetime.now():
                ctx.db.exec("UPDATE orders SET status='expired' WHERE tenant_id=? AND id=?",
                            (ctx.tid, order_id))
                ctx.db.clear_state(user["tg_id"])
                return ctx.bot.send(user["tg_id"],
                                    "مهلت این سفارش تمام شد. لطفاً دوباره سفارش دهید.",
                                    keyboard=main_menu(ctx, user))
        except ValueError:
            pass

    rtype = rfile = rtext = None
    if msg.get("photo"):
        rtype = "photo"
        rfile = msg["photo"][-1]["file_id"]
        rtext = msg.get("caption")
    elif msg.get("text"):
        rtype = "text"
        rtext = msg["text"]
    else:
        return ctx.bot.send(user["tg_id"],
                            "لطفاً عکس رسید یا متن پیامک بانک را بفرستید.")

    ctx.db.exec(
        """UPDATE orders SET status='awaiting', receipt_type=?, receipt_file=?,
                             receipt_text=? WHERE tenant_id=? AND id=?""",
        (rtype, rfile, rtext, ctx.tid, order_id)
    )
    ctx.db.clear_state(user["tg_id"])

    plan = ctx.db.get_plan(order["plan_id"])
    ctx.bot.send(
        user["tg_id"],
        _waiting_text(ctx, order_id),
        keyboard=_waiting_kb(ctx, order_id)
    )

    # اعلان به گروه مدیریت
    info = (
        f"🧾 <b>رسید جدید — سفارش #{order_id}</b>\n\n"
        f"👤 {esc(user.get('first_name'))} "
        f"(@{esc(user.get('username')) if user.get('username') else '—'})\n"
        f"🆔 <code>{user['tg_id']}</code>\n"
        f"📦 {esc(plan['name']) if plan else '—'}\n"
        f"💰 <b>{core.toman(order['amount'])}</b> تومان"
    )
    if order["coins_used"]:
        info += f"\n🪙 {order['coins_used']} سکه ({order['discount_pct']}٪)"
    if rtext:
        info += f"\n\n<i>{esc(rtext[:400])}</i>"

    buttons = kb([
        [("✅ تایید", f"ap:{order_id}"), ("❌ رد", f"rj:{order_id}")]
    ])

    t = DB.get_tenant(ctx.tid)
    gid = t.get("admin_group_id")
    if gid and rtype == "photo":
        try:
            topics = json.loads(t.get("topics") or "{}")
            ctx.bot.send_photo(gid, rfile, caption=info, keyboard=buttons,
                               topic_id=topics.get("receipts"))
            return
        except TelegramError as e:
            log.warning("ارسال عکس رسید ناموفق: %s", e)
    ctx.notify_group(info, keyboard=buttons, topic="receipts")


# ═══════════════════════════════════════════════════════════
#  تایید/رد سفارش و تحویل
# ═══════════════════════════════════════════════════════════

def _waiting_text(ctx, order_id):
    """
    پیام انتظار تایید.

    به‌جای برگرداندن کاربر به منوی اصلی (که گیج‌کننده است و انگار
    چیزی نشده)، وضعیت را روشن می‌گوییم و راه ارتباط می‌دهیم.
    """
    tpl = ctx.s.get("waiting_text")
    support = ctx.s.get("support_username") or ""
    if tpl:
        return (tpl.replace("{order_id}", str(order_id))
                   .replace("{support}", support))

    txt = (
        f"✅ <b>رسید شما دریافت شد</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"🔢 کد پیگیری: <code>#{order_id}</code>\n"
        f"⏳ در انتظار بررسی\n\n"
        f"معمولاً کمتر از ۱۵ دقیقه طول می‌کشد.\n"
        f"به محض تایید، کانفیگتان همین‌جا ارسال می‌شود."
    )
    if support:
        txt += (f"\n\n<i>اگر بیش از یک ساعت طول کشید، با پشتیبانی "
                f"تماس بگیرید و کد پیگیری را همراه داشته باشید.</i>")
    return txt


def _waiting_kb(ctx, order_id):
    support = ctx.s.get("support_username") or ""
    rows = [[("📊 وضعیت سفارش", f"ost:{order_id}")]]
    if support:
        rows.append([("🎧 پشتیبانی", f"https://t.me/{support.lstrip('@')}", "url")])
    rows.append([("‹ منوی اصلی", "menu")])
    return kb(rows)


def show_order_status(ctx, user, chat_id, message_id, order_id):
    """وضعیت لحظه‌ای یک سفارش برای مشتری."""
    o = ctx.db.get_order(order_id)
    if not o or o["user_id"] != user["id"]:
        return _reply(ctx, chat_id, message_id, "سفارش پیدا نشد.", back_kb())

    labels = {
        "awaiting": ("⏳", "در انتظار بررسی"),
        "review": ("🔍", "در حال بررسی"),
        "panel_approve": ("⚙️", "تایید شد — در حال ساخت کانفیگ"),
        "approved": ("✅", "تایید شد"),
        "rejected": ("❌", "تایید نشد"),
        "expired": ("⌛️", "منقضی شد"),
    }
    icon, label = labels.get(o["status"], ("•", o["status"]))
    p = ctx.db.get_plan(o["plan_id"]) if o.get("plan_id") else None

    txt = (
        f"{icon} <b>سفارش #{order_id}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"وضعیت: <b>{label}</b>\n"
        f"پلن: {esc(p['name']) if p else '—'}\n"
        f"مبلغ: {core.toman(o['amount'])}\n"
        f"زمان ثبت: {str(o.get('created_at',''))[:16]}"
    )
    if o["status"] == "rejected" and o.get("admin_note"):
        txt += f"\n\n<b>دلیل:</b> {esc(o['admin_note'])}"

    return _reply(ctx, chat_id, message_id, txt, _waiting_kb(ctx, order_id))


def approve_order(ctx, order_id, admin_tg_id):
    order = ctx.db.get_order(order_id)
    if not order:
        return False, "سفارش پیدا نشد"
    if order["status"] == "approved":
        return False, "این سفارش قبلاً تایید شده"

    ctx.db.exec(
        """UPDATE orders SET status='approved', reviewed_by=?,
                             reviewed_at=CURRENT_TIMESTAMP
           WHERE tenant_id=? AND id=?""",
        (admin_tg_id, ctx.tid, order_id)
    )

    ok, result = provision(ctx, order_id)
    if not ok:
        ctx.db.exec("UPDATE orders SET admin_note=? WHERE tenant_id=? AND id=?",
                    (f"خطای ساخت: {result}", ctx.tid, order_id))
        return False, result

    user = ctx.db.get_user_by_id(order["user_id"])

    # مصرف سکه
    if order["coins_used"]:
        ctx.db.add_coins(user["id"], -order["coins_used"], "spend",
                         f"تخفیف سفارش #{order_id}", order_id=order_id)

    # پاداش معرف — فقط بعد از اولین خرید موفق
    _reward_referrer(ctx, user, order_id)

    deliver(ctx, user, result)
    return True, result


def _reward_referrer(ctx, user, order_id):
    """سکه به معرف، فقط یک‌بار و فقط بعد از اولین خرید تاییدشده."""
    if not user.get("referred_by"):
        return

    prev = ctx.db.q(
        """SELECT COUNT(*) AS c FROM orders
           WHERE tenant_id=? AND user_id=? AND status='approved' AND id<>?""",
        (ctx.tid, user["id"], order_id), one=True
    )
    if (prev or {}).get("c", 0) > 0:
        return  # خرید اولش نبوده

    cs = core.coin_settings(ctx.s.get("coins"))
    amount = int(cs.get("per_referral") or 0)
    if amount <= 0:
        return

    ref = ctx.db.get_user_by_id(user["referred_by"])
    if not ref:
        return

    ctx.db.add_coins(ref["id"], amount, "referral",
                     f"خرید زیرمجموعه {user.get('first_name') or user['tg_id']}",
                     ref_user_id=user["id"], order_id=order_id)

    prog = core.coin_progress(ref["coins"] + amount, ctx.s.get("coins"))
    text = (
        f"🎉 <b>{amount} سکه گرفتید!</b>\n\n"
        f"یکی از دوستانی که دعوت کرده بودید خرید کرد.\n"
        f"موجودی شما: <b>{prog['coins']} سکه</b>"
    )
    if prog["current_percent"]:
        text += f" — {prog['current_percent']}٪ تخفیف آماده استفاده"
    if prog["next"]:
        text += f"\n\nبا {prog['next']['need']} سکه دیگر به {prog['next']['percent']}٪ می‌رسید."

    try:
        ctx.bot.send(ref["tg_id"], text)
    except TelegramError:
        pass


def provision(ctx, order_id):
    """ساخت یا تمدید کانفیگ در 3x-ui."""
    order = ctx.db.get_order(order_id)
    plan = ctx.db.get_plan(order["plan_id"]) if order.get("plan_id") else None
    if not plan:
        return False, "پلن این سفارش پیدا نشد"

    user = ctx.db.get_user_by_id(order["user_id"])
    t = DB.get_tenant(ctx.tid)
    inbound = plan.get("inbound_id") or t.get("default_inbound")
    if not inbound:
        return False, "inbound پیش‌فرض تنظیم نشده است"

    prefix = ctx.s.get("email_prefix") or (t.get("name") or "nx")
    sub_base = ctx.s.get("sub_base_url")

    try:
        # تمدید اشتراک موجود یا ساخت جدید
        if order["kind"] == "renew":
            subs = ctx.db.user_subs(user["id"])
            if subs:
                sub = subs[0]
                ctx.xui.extend_subscription(sub["inbound_id"], sub["client_uuid"],
                                            plan["days"], plan["gb"])
                new_exp = _add_days_iso(sub["expires_at"], plan["days"])
                ctx.db.exec(
                    """UPDATE subscriptions SET expires_at=?, is_active=1,
                       notified_7d=0, notified_3d=0, notified_1d=0, notified_80p=0
                       WHERE tenant_id=? AND id=?""",
                    (new_exp, ctx.tid, sub["id"])
                )
                ctx.db.exec("UPDATE orders SET sub_id=? WHERE tenant_id=? AND id=?",
                            (sub["id"], ctx.tid, order_id))
                return True, {**sub, "expires_at": new_exp, "renewed": True}

        seq = len(ctx.db.user_subs(user["id"], active_only=False)) + 1
        email = core.make_email(prefix, user["tg_id"], seq)

        res = ctx.xui.create_subscription(
            inbound, email, plan["gb"], plan["days"],
            ip_limit=plan["ip_limit"], tg_id=user["tg_id"],
            sub_base_url=sub_base
        )

        exp_iso = None
        if res["expiry_ms"]:
            exp_iso = datetime.fromtimestamp(res["expiry_ms"] / 1000).isoformat(timespec="seconds")

        sid = ctx.db.exec(
            """INSERT INTO subscriptions (tenant_id, user_id, order_id, plan_id,
                                          client_email, client_uuid, sub_url,
                                          inbound_id, gb, expires_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (ctx.tid, user["id"], order_id, plan["id"], email, res["uuid"],
             res["sub_url"], inbound, plan["gb"], exp_iso)
        )
        ctx.db.exec("UPDATE orders SET sub_id=? WHERE tenant_id=? AND id=?",
                    (sid, ctx.tid, order_id))
        ctx.db.log("provision", user["id"], {"order": order_id, "sub": sid})

        return True, {"id": sid, "client_email": email, "sub_url": res["sub_url"],
                      "expires_at": exp_iso, "gb": plan["gb"],
                      "plan_name": plan["name"], "renewed": False}

    except XUIError as e:
        log.error("خطای ساخت کانفیگ: %s", e)
        return False, f"خطای پنل: {e}"
    except Exception as e:
        log.exception("خطای غیرمنتظره در provision")
        return False, f"خطای غیرمنتظره: {e}"


def _add_days_iso(iso, days):
    from datetime import timedelta
    base = datetime.now()
    if iso:
        try:
            cur = datetime.fromisoformat(iso)
            if cur > base:
                base = cur
        except ValueError:
            pass
    return (base + timedelta(days=days)).isoformat(timespec="seconds")


def _deliver_kb(ctx, url):
    """دکمه‌های افزودن یک‌کلیک به اپلیکیشن‌ها."""
    rows = []
    if url:
        rows.append([("📲 افزودن به Happ", f"happ://add/{url}", "url")])
        rows.append([
            ("v2rayNG", f"v2rayng://install-config?url={url}", "url"),
            ("V2Box", f"v2box://install-sub?url={url}&name={esc(ctx.brand())}", "url"),
        ])
    rows.append([("📚 راهنمای نصب", "help")])
    rows.append([("‹ منوی اصلی", "menu")])
    return kb(rows)


def deliver(ctx, user, sub):
    """ارسال کانفیگ به مشتری با دکمه‌های افزودن یک‌کلیک."""
    url = sub.get("sub_url")
    title = "تمدید شد" if sub.get("renewed") else "آماده است"

    # متن سفارشی ادمین، اگر تنظیم شده باشد
    tpl = ctx.s.get("delivered_text")
    if tpl:
        d0 = core.days_left(sub.get("expires_at"))
        custom = (tpl.replace("{plan}", esc(str(sub.get("plan_name") or "")))
                     .replace("{sub_url}", esc(url or ""))
                     .replace("{gb}", core.fmt_gb(sub.get("gb")))
                     .replace("{expires}", str(d0) if d0 is not None else "—"))
        return ctx.bot.send(user["tg_id"], custom, keyboard=_deliver_kb(ctx, url))

    lines = [
        f"✅ <b>اشتراک شما {title}</b>",
        "",
        f"📦 حجم: {core.fmt_gb(sub.get('gb'))}",
    ]
    d = core.days_left(sub.get("expires_at"))
    if d is not None:
        lines.append(f"⏱ اعتبار: {d} روز")
    if url:
        lines += ["", "🔗 لینک اشتراک:", f"<code>{esc(url)}</code>"]

    ctx.bot.send(user["tg_id"], "\n".join(lines),
                 keyboard=_deliver_kb(ctx, url))


# ═══════════════════════════════════════════════════════════
#  بخش‌های منو
# ═══════════════════════════════════════════════════════════

def show_subs(ctx, user, chat_id, message_id):
    subs = ctx.db.user_subs(user["id"])
    if not subs:
        return _reply(ctx, chat_id, message_id,
                      "هنوز اشتراکی ندارید.\n\nاز منوی خرید می‌توانید اولین اشتراکتان را بگیرید.",
                      kb([[("🛒 خرید اشتراک", "buy")], [("‹ بازگشت", "menu")]]))

    lines = ["<b>اشتراک‌های شما</b>", ""]
    rows = []
    for s in subs:
        d = core.days_left(s.get("expires_at"))
        status = "🟢" if (d is None or d > 0) else "🔴"
        lines += [
            f"{status} <b>{esc(s.get('plan_name') or 'اشتراک')}</b>",
            f"   حجم: {core.fmt_gb(s.get('gb'))}",
            f"   اعتبار: {d if d is not None else '—'} روز",
        ]
        if s.get("sub_url"):
            lines.append(f"   <code>{esc(s['sub_url'])}</code>")
        lines.append("")
        rows.append([(f"🔄 تمدید {s.get('plan_name') or ''}".strip(), f"renew:{s['id']}")])

    rows.append([("‹ بازگشت", "menu")])
    _reply(ctx, chat_id, message_id, "\n".join(lines), kb(rows))


def show_wallet(ctx, user, chat_id, message_id):
    u = ctx.db.get_user(user["tg_id"])
    txs = ctx.db.q(
        "SELECT * FROM wallet_tx WHERE tenant_id=? AND user_id=? ORDER BY id DESC LIMIT 5",
        (ctx.tid, u["id"])
    )
    lines = [
        "👛 <b>کیف پول</b>",
        "",
        f"موجودی: <b>{core.toman(u['balance'])}</b> تومان",
    ]
    if txs:
        lines += ["", "<b>آخرین تراکنش‌ها:</b>"]
        for t in txs:
            sign = "+" if t["amount"] > 0 else "−"
            lines.append(f"{sign} {core.toman(abs(t['amount']))} — {esc(t.get('note') or t['kind'])}")

    lines += ["", "با شارژ کیف پول می‌توانید سریع‌تر خرید کنید و "
              "تمدید خودکار را فعال نگه دارید."]

    # شارژ کیف پول جریان پرداخت جدا می‌خواهد که هنوز ساخته نشده؛
    # تا آن موقع کاربر را به پشتیبانی می‌فرستیم نه یک دکمه‌ی بی‌عمل.
    support = ctx.s.get("support_username") or ""
    rows = []
    if support:
        rows.append([("💵 شارژ کیف پول", f"https://t.me/{support.lstrip('@')}", "url")])
    rows.append([("‹ بازگشت", "menu")])
    _reply(ctx, chat_id, message_id, "\n".join(lines), kb(rows))


def show_coins(ctx, user, chat_id, message_id):
    u = ctx.db.get_user(user["tg_id"])
    cs = core.coin_settings(ctx.s.get("coins"))
    prog = core.coin_progress(u["coins"], ctx.s.get("coins"))

    lines = [
        "🪙 <b>سکه‌های شما</b>",
        "",
        f"موجودی: <b>{prog['coins']} سکه</b>",
    ]
    if prog["current_percent"]:
        lines.append(f"تخفیف فعلی: <b>{prog['current_percent']}٪</b> "
                     f"(با مصرف {prog['current_cost']} سکه)")
    if prog["next"]:
        lines.append(f"با <b>{prog['next']['need']} سکه</b> دیگر → "
                     f"{prog['next']['percent']}٪ تخفیف")

    lines += ["", "<b>پله‌های تخفیف:</b>"]
    for t in cs["tiers"]:
        mark = "✅" if u["coins"] >= t["coins"] else "▫️"
        lines.append(f"{mark} {t['coins']} سکه = {t['percent']}٪ تخفیف")

    lines += [
        "",
        f"💡 هر دوستی که با لینک شما بیاید و <b>خرید کند</b>، "
        f"{cs['per_referral']} سکه می‌گیرید.",
        "",
        "سکه‌ها منقضی نمی‌شوند — می‌توانید جمع کنید تا به پله‌ی بالاتر برسید."
        if not cs.get("expire_days") else "",
    ]

    _reply(ctx, chat_id, message_id, "\n".join(l for l in lines if l != ""),
           kb([[("🎁 دعوت دوستان", "ref")], [("‹ بازگشت", "menu")]]))


def show_referral(ctx, user, chat_id, message_id):
    u = ctx.db.get_user(user["tg_id"])
    cs = core.coin_settings(ctx.s.get("coins"))
    t = DB.get_tenant(ctx.tid)
    bot_user = t.get("bot_username") or ""
    link = f"https://t.me/{bot_user}?start={u['ref_code']}" if bot_user else u["ref_code"]

    invited = ctx.db.q(
        "SELECT COUNT(*) AS c FROM users WHERE tenant_id=? AND referred_by=?",
        (ctx.tid, u["id"]), one=True
    )
    bought = ctx.db.q(
        """SELECT COUNT(DISTINCT o.user_id) AS c FROM orders o
           JOIN users us ON us.id = o.user_id
           WHERE o.tenant_id=? AND us.referred_by=? AND o.status='approved'""",
        (ctx.tid, u["id"]), one=True
    )

    lines = [
        "🎁 <b>دعوت دوستان</b>",
        "",
        f"کد شما: <code>{u['ref_code']}</code>",
        "",
        "🔗 لینک اختصاصی:",
        f"<code>{esc(link)}</code>",
        "",
        f"👥 دعوت‌شده: <b>{(invited or {}).get('c', 0)}</b> نفر",
        f"✅ خرید کرده: <b>{(bought or {}).get('c', 0)}</b> نفر",
        f"🪙 سکه شما: <b>{u['coins']}</b>",
        "",
        f"هر دوستی که با این لینک بیاید و خرید کند، "
        f"<b>{cs['per_referral']} سکه</b> می‌گیرید.",
    ]

    share = (f"https://t.me/share/url?url={link}"
             f"&text=" + "با این لینک ثبت‌نام کن و اینترنت پرسرعت بگیر")

    _reply(ctx, chat_id, message_id, "\n".join(lines),
           kb([[("📤 ارسال به دوستان", share, "url")],
               [("🪙 سکه‌های من", "coins")],
               [("‹ بازگشت", "menu")]]))


def show_help(ctx, user, chat_id, message_id):
    txt = ctx.s.get("help_text") or (
        "<b>راهنمای نصب</b>\n\n"
        "۱. برنامه مناسب دستگاهتان را نصب کنید\n"
        "۲. روی دکمه «افزودن» در پیام اشتراک بزنید\n"
        "۳. کانفیگ خودکار اضافه می‌شود\n\n"
        "اگر مشکلی داشتید، از بخش پشتیبانی پیام بدهید."
    )
    rows = []
    apps = ctx.s.get("apps") or []
    for a in apps[:6]:
        if a.get("url"):
            rows.append([(f"📥 {a.get('name')}", a["url"], "url")])
    rows.append([("‹ بازگشت", "menu")])
    _reply(ctx, chat_id, message_id, txt, kb(rows))


def start_support(ctx, user, chat_id, message_id):
    ctx.db.set_state(user["tg_id"], "await_ticket", {})
    _reply(ctx, chat_id, message_id,
           "💬 <b>پشتیبانی</b>\n\nمشکل یا سوالتان را در یک پیام بنویسید. "
           "در اولین فرصت پاسخ می‌دهیم.",
           kb([[("✖️ انصراف", "menu")]]))


def handle_ticket(ctx, msg, user):
    text = msg.get("text") or msg.get("caption") or ""
    if not text.strip():
        return ctx.bot.send(user["tg_id"], "لطفاً پیامتان را بنویسید.")

    tid = ctx.db.exec(
        "INSERT INTO tickets (tenant_id, user_id, message) VALUES (?,?,?)",
        (ctx.tid, user["id"], text[:2000])
    )
    ctx.db.clear_state(user["tg_id"])
    ctx.bot.send(user["tg_id"],
                 f"✅ پیام شما ثبت شد (شماره پیگیری: <b>{tid}</b>).\n"
                 "به‌زودی پاسخ می‌دهیم.",
                 keyboard=main_menu(ctx, user))

    ctx.notify_group(
        f"🎫 <b>تیکت #{tid}</b>\n\n"
        f"👤 {esc(user.get('first_name'))} (<code>{user['tg_id']}</code>)\n\n"
        f"{esc(text[:800])}",
        keyboard=kb([[("✍️ پاسخ", f"tk:{tid}")]]),
        topic="tickets"
    )


def check_membership(ctx, u):
    """
    بررسی عضویت اجباری کانال.

    برمی‌گرداند: (مجاز, کیبورد_دعوت)
    اگر کانالی تنظیم نشده، همیشه مجاز است. اگر تلگرام خطا داد
    (مثلاً ربات در کانال ادمین نیست)، سخت‌گیری نمی‌کنیم — قفل‌شدن
    کل فروش بدتر از رد نشدن یک نفر است.
    """
    if not ctx.s.get("force_channel_on"):
        return True, None
    ch = ctx.s.get("force_channel")
    if not ch:
        return True, None
    try:
        st = ctx.bot.member_status(ch, u["tg_id"])
    except Exception:
        return True, None
    if st in ("member", "administrator", "creator"):
        return True, None

    link = ch if str(ch).startswith("http") else f"https://t.me/{str(ch).lstrip('@')}"
    return False, kb([
        [("📢 عضویت در کانال", link, "url")],
        [("✅ عضو شدم، بررسی کن", "menu")],
    ])


def require_membership(ctx, chat_id, message_id, u):
    """اگر عضو نبود پیام می‌دهد و True برمی‌گرداند (یعنی ادامه نده)."""
    allowed, invite = check_membership(ctx, u)
    if allowed:
        return False
    _reply(ctx, chat_id, message_id,
           "برای استفاده از ربات، ابتدا در کانال ما عضو شوید:", invite)
    return True


def give_trial(ctx, user, chat_id, message_id):
    u = ctx.db.get_user(user["tg_id"])
    if u.get("trial_used"):
        return _reply(ctx, chat_id, message_id,
                      "شما قبلاً اشتراک تست را دریافت کرده‌اید.", back_kb())

    plan = ctx.db.trial_plan()
    if not plan:
        return _reply(ctx, chat_id, message_id,
                      "اشتراک تست در حال حاضر فعال نیست.", back_kb())

    if require_membership(ctx, chat_id, message_id, user):
        return

    order = ctx.db.create_order(u["id"], plan["id"], 0, 0, kind="new")
    ctx.db.exec("UPDATE orders SET status='approved', reviewed_at=CURRENT_TIMESTAMP "
                "WHERE tenant_id=? AND id=?", (ctx.tid, order["id"]))

    ok, result = provision(ctx, order["id"])
    if not ok:
        return _reply(ctx, chat_id, message_id,
                      f"مشکلی پیش آمد: {esc(result)}", back_kb())

    ctx.db.exec("UPDATE users SET trial_used=1 WHERE tenant_id=? AND id=?",
                (ctx.tid, u["id"]))
    _reply(ctx, chat_id, message_id, "🎉 اشتراک تست شما فعال شد!", None)
    deliver(ctx, u, result)

    ctx.notify_group(
        f"🎉 اشتراک تست\n👤 {esc(u.get('first_name'))} (<code>{u['tg_id']}</code>)",
        topic="users"
    )


# ═══════════════════════════════════════════════════════════
#  کمکی
# ═══════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════
#  پنل مدیریت داخل ربات — فقط برای ادمین‌ها
# ═══════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════
#  دریافت شماره تلفن — اختیاری
#  اجباری نیست: کاربری که نمی‌خواهد شماره بدهد نباید از خرید
#  محروم شود. فقط یک‌بار پرسیده می‌شود.
# ═══════════════════════════════════════════════════════════

SKIP_PHONE = "فعلاً نه"


def ask_phone(ctx, user, chat_id):
    """اگر شماره نداریم و قبلاً نپرسیده‌ایم، یک‌بار می‌پرسیم."""
    if user.get("phone"):
        return False
    if not ctx.s.get("ask_phone", True):
        return False

    # اگر قبلاً پرسیده‌ایم، دوباره مزاحم نمی‌شویم
    if user.get("phone_asked"):
        return False

    ctx.db.exec("UPDATE users SET phone_asked=1 WHERE tenant_id=? AND tg_id=?",
                (ctx.tid, user["tg_id"]))
    ctx.db.set_state(user["tg_id"], "await_phone", {})
    txt = ctx.s.get("phone_prompt") or (
        "📱 <b>شماره تماس</b>\n\n"
        "اگر شماره‌تان را ثبت کنید، در صورت بروز مشکل سریع‌تر می‌توانیم "
        "کمکتان کنیم و اشتراکتان قابل بازیابی می‌شود.\n\n"
        "<i>اختیاری است — بدون آن هم می‌توانید خرید کنید.</i>"
    )
    ctx.bot.send(chat_id, txt,
                 keyboard=contact_kb("📱 ارسال شماره من", SKIP_PHONE))
    return True


def handle_phone(ctx, msg, user):
    """پردازش شماره — از دکمه‌ی تلگرام یا تایپ دستی."""
    chat_id = msg["chat"]["id"]
    contact = msg.get("contact")
    text = (msg.get("text") or "").strip()

    # کاربر رد کرد
    if text == SKIP_PHONE or text in ("رد", "بعدا", "بعداً"):
        ctx.db.clear_state(user["tg_id"])
        ctx.bot.send(chat_id, "باشه، بدون مشکل ادامه می‌دهیم 👍",
                     keyboard=remove_kb())
        return cmd_start(ctx, msg)

    phone = None
    if contact:
        # فقط شماره‌ی خود کاربر را می‌پذیریم، نه مخاطب دیگری
        if contact.get("user_id") and int(contact["user_id"]) != int(user["tg_id"]):
            ctx.bot.send(chat_id,
                         "این شماره متعلق به شما نیست. لطفاً شماره‌ی خودتان را بفرستید.",
                         keyboard=contact_kb("📱 ارسال شماره من", SKIP_PHONE))
            return
        phone = contact.get("phone_number")
    elif text:
        digits = "".join(ch for ch in text if ch.isdigit() or ch == "+")
        if len(digits) >= 10:
            phone = digits

    if not phone:
        ctx.bot.send(chat_id,
                     "شماره معتبر نبود. از دکمه‌ی زیر استفاده کنید یا شماره را "
                     "به شکل <code>09121234567</code> بفرستید.",
                     keyboard=contact_kb("📱 ارسال شماره من", SKIP_PHONE))
        return

    phone = core.normalize_phone(phone)
    ctx.db.exec("UPDATE users SET phone=? WHERE tenant_id=? AND tg_id=?",
                (phone, ctx.tid, user["tg_id"]))
    ctx.db.clear_state(user["tg_id"])

    ctx.bot.send(chat_id,
                 f"✅ شماره‌ی <code>{esc(core.pretty_phone(phone))}</code> ثبت شد.",
                 keyboard=remove_kb())
    user = ctx.db.get_user(user["tg_id"])
    return cmd_start(ctx, msg)


def show_admin(ctx, user, chat_id, message_id=None):
    """صفحه‌ی اصلی پنل مدیریت با آمار زنده."""
    if not ctx.is_admin(user["tg_id"]):
        return _reply(ctx, chat_id, message_id, "دسترسی ندارید.", back_kb())

    st = ctx.db.stats()
    pending = st.get("pending", 0)

    txt = (
        f"⚙️ <b>پنل مدیریت</b> · {esc(ctx.brand())}\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 کاربران   <b>{st.get('users', 0)}</b>\n"
        f"📦 اشتراک فعال   <b>{st.get('active_subs', 0)}</b>\n"
        f"💳 رسید در انتظار   <b>{pending}</b>\n"
        f"🎫 تیکت باز   <b>{st.get('open_tickets', 0)}</b>\n\n"
        f"💰 فروش کل   <b>{core.toman(st.get('revenue', 0))}</b>"
    )

    rows = []
    rows.append([(f"💳 رسیدها ({pending})" if pending else "💳 رسیدها", "adm:orders")])
    rows += [
        [("👥 کاربران", "adm:users"), ("📦 پلن‌ها", "adm:plans")],
        [("📊 آمار", "adm:stats"), ("📢 پیام همگانی", "adm:bc")],
        [("‹ بازگشت", "menu")],
    ]
    return _reply(ctx, chat_id, message_id, txt, kb(rows))


def admin_orders(ctx, user, chat_id, message_id=None):
    """صف رسیدهای در انتظار."""
    if not ctx.is_admin(user["tg_id"]):
        return

    orders = ctx.db.pending_orders()
    if not orders:
        return _reply(ctx, chat_id, message_id,
                      "✅ رسیدی در انتظار بررسی نیست.", back_kb("admin"))

    rows = []
    for o in orders[:10]:
        nm = (o.get("first_name") or "بدون نام")[:15]
        rows.append([(f"#{o['id']} · {nm} · {core.toman(o['amount'])}", f"adm:o:{o['id']}")])
    rows.append([("‹ بازگشت", "admin")])

    return _reply(ctx, chat_id, message_id,
                  f"💳 <b>رسیدهای در انتظار</b> ({len(orders)})\n\n"
                  "روی هر مورد بزنید تا جزئیاتش را ببینید.", kb(rows))


def admin_order_detail(ctx, user, chat_id, message_id, order_id):
    """جزئیات سفارش با دکمه تایید/رد."""
    if not ctx.is_admin(user["tg_id"]):
        return

    o = ctx.db.get_order(order_id)
    if not o:
        return _reply(ctx, chat_id, message_id, "سفارش پیدا نشد.", back_kb("adm:orders"))

    u = ctx.db.get_user_by_id(o["user_id"]) or {}
    p = ctx.db.get_plan(o["plan_id"]) if o.get("plan_id") else None

    txt = (
        f"🧾 <b>سفارش #{o['id']}</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 {esc(u.get('first_name') or 'بدون نام')}"
        + (f" · @{esc(u['username'])}" if u.get("username") else "") + "\n"
        f"🆔 <code>{u.get('tg_id', '?')}</code>\n\n"
        f"📦 {esc(p['name']) if p else 'نامشخص'}\n"
        f"💰 <b>{core.toman(o['amount'])}</b>\n"
    )
    if o.get("coins_used"):
        txt += f"💎 {o['coins_used']} سکه · {o.get('discount_pct', 0)}٪ تخفیف\n"
    txt += f"🕐 {str(o.get('created_at', ''))[:16]}"

    if o.get("receipt_text"):
        txt += f"\n\n📝 <i>{esc(str(o['receipt_text'])[:180])}</i>"

    rows = []
    if o["status"] in ("awaiting", "review"):
        rows = [
            [("✅ تایید و ساخت کانفیگ", f"ap:{o['id']}")],
            [("❌ رد", f"rj:{o['id']}"), ("💬 سوال از مشتری", f"adm:ask:{o['id']}")],
        ]
    else:
        txt += f"\n\nوضعیت: <b>{o['status']}</b>"
    rows.append([("‹ بازگشت", "adm:orders")])

    if o.get("receipt_type") == "photo" and o.get("receipt_file"):
        try:
            ctx.bot.send_photo(chat_id, o["receipt_file"], caption=txt, keyboard=kb(rows))
            return
        except TelegramError:
            pass

    return _reply(ctx, chat_id, message_id, txt, kb(rows))


def admin_users(ctx, user, chat_id, message_id=None):
    """آخرین کاربران."""
    if not ctx.is_admin(user["tg_id"]):
        return

    rows_db = ctx.db.q(
        "SELECT * FROM users WHERE tenant_id=? ORDER BY created_at DESC LIMIT 10",
        (ctx.tid,))
    if not rows_db:
        return _reply(ctx, chat_id, message_id, "کاربری نیست.", back_kb("admin"))

    lines = ["👥 <b>آخرین کاربران</b>\n"]
    rows = []
    for u in rows_db:
        nm = esc((u.get("first_name") or "بدون نام")[:16])
        un = f" @{esc(u['username'])}" if u.get("username") else ""
        lines.append(f"• {nm}{un} — 💎{u.get('coins', 0)} · 👛{core.toman(u.get('balance', 0))}")
        rows.append([(f"{nm} · {u['tg_id']}", f"adm:u:{u['tg_id']}")])

    rows.append([("🔎 جستجو", "adm:find")])
    rows.append([("‹ بازگشت", "admin")])
    return _reply(ctx, chat_id, message_id, "\n".join(lines), kb(rows))


def admin_user_detail(ctx, user, chat_id, message_id, target_id):
    """جزئیات و مدیریت یک کاربر."""
    if not ctx.is_admin(user["tg_id"]):
        return

    u = ctx.db.get_user(int(target_id))
    if not u:
        return _reply(ctx, chat_id, message_id, "کاربر پیدا نشد.", back_kb("adm:users"))

    subs = ctx.db.user_subs(u["id"], active_only=False)
    active = [s for s in subs if s.get("is_active")]

    txt = (
        f"👤 <b>{esc(u.get('first_name') or 'بدون نام')}</b>"
        + (f" · @{esc(u['username'])}" if u.get("username") else "") + "\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"🆔 <code>{u['tg_id']}</code>\n"
        f"💎 سکه   <b>{u.get('coins', 0)}</b>\n"
        f"👛 کیف پول   <b>{core.toman(u.get('balance', 0))}</b>\n"
        f"🔗 کد دعوت   <code>{u.get('ref_code', '—')}</code>\n"
        f"📦 اشتراک فعال   <b>{len(active)}</b>\n"
        f"📅 عضویت   {str(u.get('created_at', ''))[:10]}"
    )
    if u.get("is_blocked"):
        txt += "\n\n🚫 <b>مسدود است</b>"

    rows = [
        [("💎 سکه", f"adm:coin:{u['tg_id']}"), ("👛 کیف پول", f"adm:bal:{u['tg_id']}")],
        [("💬 ارسال پیام", f"adm:msg:{u['tg_id']}")],
        [("✅ رفع مسدودی" if u.get("is_blocked") else "🚫 مسدودسازی", f"adm:blk:{u['tg_id']}")],
        [("‹ بازگشت", "adm:users")],
    ]
    return _reply(ctx, chat_id, message_id, txt, kb(rows))


def admin_stats(ctx, user, chat_id, message_id=None):
    """آمار کامل."""
    if not ctx.is_admin(user["tg_id"]):
        return

    st = ctx.db.stats()
    txt = (
        f"📊 <b>آمار</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 کاربران   <b>{st.get('users', 0)}</b>\n"
        f"📦 اشتراک فعال   <b>{st.get('active_subs', 0)}</b>\n"
        f"💳 رسید در انتظار   <b>{st.get('pending', 0)}</b>\n"
        f"🎫 تیکت باز   <b>{st.get('open_tickets', 0)}</b>\n\n"
        f"💰 فروش کل   <b>{core.toman(st.get('revenue', 0))}</b>"
    )
    return _reply(ctx, chat_id, message_id, txt,
                  kb([[("🔄 تازه‌سازی", "adm:stats")], [("‹ بازگشت", "admin")]]))


def admin_plans(ctx, user, chat_id, message_id=None):
    """لیست پلن‌ها."""
    if not ctx.is_admin(user["tg_id"]):
        return

    plans = ctx.db.plans(active_only=False, include_trial=True)
    if not plans:
        return _reply(ctx, chat_id, message_id,
                      "پلنی تعریف نشده.\n\n<i>از پنل وب پلن بسازید.</i>", back_kb("admin"))

    lines = ["📦 <b>پلن‌ها</b>\n"]
    for p in plans:
        mark = "🟢" if p.get("is_active") else "⚪️"
        trial = " 🎁" if p.get("is_trial") else ""
        lines.append(f"{mark} {esc(p['name'])}{trial} — {core.toman(p['price'])} · "
                     f"{core.fmt_gb(p.get('gb'))} · {core.fmt_days(p.get('days'))}")

    lines.append("\n<i>ویرایش پلن‌ها از پنل وب انجام می‌شود.</i>")
    return _reply(ctx, chat_id, message_id, "\n".join(lines), back_kb("admin"))


def admin_ask_input(ctx, user, chat_id, message_id, kind, target=None):
    """شروع ورودی چندمرحله‌ای ادمین."""
    if not ctx.is_admin(user["tg_id"]):
        return

    prompts = {
        "bc": "📢 متن پیام همگانی را بفرستید.\n\n<i>برای همه‌ی کاربران ارسال می‌شود.</i>",
        "coin": "💎 چند سکه؟\n\n<i>عدد منفی برای کسر.</i>",
        "bal": "👛 چه مبلغی (تومان)؟\n\n<i>عدد منفی برای کسر.</i>",
        "msg": "💬 متن پیام را بفرستید.",
        "ask": "💬 سوالتان از مشتری را بفرستید.",
        "find": "🔎 نام، یوزرنیم یا آیدی عددی را بفرستید.",
    }
    ctx.db.set_state(user["tg_id"], f"adm_{kind}", {"t": target})
    return _reply(ctx, chat_id, message_id, prompts.get(kind, "مقدار را بفرستید:"),
                  kb([[("انصراف", "admin")]]))


def admin_input(ctx, user, chat_id, text, state, data):
    """پردازش ورودی ادمین."""
    if not ctx.is_admin(user["tg_id"]):
        return

    kind = state.replace("adm_", "")
    target = (data or {}).get("t")
    ctx.db.clear_state(user["tg_id"])
    txt = (text or "").strip()

    if kind == "bc":
        ids = [r["tg_id"] for r in ctx.db.q(
            "SELECT tg_id FROM users WHERE tenant_id=? AND is_blocked=0", (ctx.tid,))]
        sent = failed = 0
        for uid in ids:
            try:
                ctx.bot.send_msg(uid, txt)
                sent += 1
            except TelegramError:
                failed += 1
        return _reply(ctx, chat_id, None,
                      f"📢 ارسال شد\n\n✅ {sent} موفق\n❌ {failed} ناموفق", back_kb("admin"))

    if kind == "find":
        like = f"%{txt}%"
        found = ctx.db.q(
            "SELECT * FROM users WHERE tenant_id=? AND (first_name LIKE ? OR username LIKE ? "
            "OR CAST(tg_id AS TEXT) LIKE ?) LIMIT 8", (ctx.tid, like, like, like))
        if not found:
            return _reply(ctx, chat_id, None, "کاربری یافت نشد.", back_kb("adm:users"))
        rows = [[(f"{(u.get('first_name') or '?')[:18]} · {u['tg_id']}", f"adm:u:{u['tg_id']}")]
                for u in found]
        rows.append([("‹ بازگشت", "adm:users")])
        return _reply(ctx, chat_id, None, f"🔎 {len(found)} نتیجه:", kb(rows))

    if kind in ("coin", "bal") and target:
        try:
            amt = int(txt.replace(",", "").replace("،", ""))
        except ValueError:
            return _reply(ctx, chat_id, None, "عدد معتبر نبود.", back_kb("admin"))

        u = ctx.db.get_user(int(target))
        if not u:
            return _reply(ctx, chat_id, None, "کاربر پیدا نشد.", back_kb("adm:users"))

        if kind == "coin":
            ctx.db.add_coins(u["id"], amt, "admin", "تنظیم دستی ادمین")
            note = f"💎 {abs(amt)} سکه {'اضافه' if amt > 0 else 'کسر'} شد."
            user_msg = f"💎 موجودی سکه شما {'افزایش' if amt > 0 else 'کاهش'} یافت: {abs(amt)} سکه"
        else:
            ctx.db.add_balance(u["id"], amt, "admin", "تنظیم دستی ادمین")
            note = f"👛 {core.toman(abs(amt))} {'اضافه' if amt > 0 else 'کسر'} شد."
            user_msg = f"👛 کیف پول شما {'شارژ' if amt > 0 else 'کسر'} شد: {core.toman(abs(amt))}"

        try:
            ctx.bot.send_msg(u["tg_id"], user_msg)
        except TelegramError:
            pass
        return _reply(ctx, chat_id, None, f"✅ {note}",
                      kb([[("‹ بازگشت", f"adm:u:{target}")]]))

    if kind == "msg" and target:
        u = ctx.db.get_user(int(target))
        if u:
            try:
                ctx.bot.send_msg(u["tg_id"], f"💬 <b>پیام از پشتیبانی</b>\n\n{esc(txt)}")
                return _reply(ctx, chat_id, None, "✅ ارسال شد.",
                              kb([[("‹ بازگشت", f"adm:u:{target}")]]))
            except TelegramError:
                return _reply(ctx, chat_id, None,
                              "❌ ارسال نشد — شاید کاربر ربات را بلاک کرده.", back_kb("adm:users"))

    if kind == "reject" and target:
        do_reject(ctx, int(target), user["tg_id"], txt or "رسید تایید نشد.")
        return _reply(ctx, chat_id, None,
                      f"❌ سفارش #{target} رد شد و به مشتری اطلاع داده شد.",
                      back_kb("adm:orders"))

    if kind == "ask" and target:
        o = ctx.db.get_order(int(target))
        if o:
            u = ctx.db.get_user_by_id(o["user_id"])
            if u:
                try:
                    ctx.bot.send_msg(u["tg_id"],
                                     f"💬 <b>درباره سفارش #{o['id']}</b>\n\n{esc(txt)}")
                    return _reply(ctx, chat_id, None, "✅ ارسال شد.",
                                  kb([[("‹ بازگشت", f"adm:o:{target}")]]))
                except TelegramError:
                    pass
        return _reply(ctx, chat_id, None, "❌ ارسال نشد.", back_kb("adm:orders"))

    return _reply(ctx, chat_id, None, "دستور شناخته نشد.", back_kb("admin"))


def admin_toggle_block(ctx, user, chat_id, message_id, target_id):
    """مسدود/رفع مسدودی کاربر."""
    if not ctx.is_admin(user["tg_id"]):
        return
    u = ctx.db.get_user(int(target_id))
    if not u:
        return
    new = 0 if u.get("is_blocked") else 1
    ctx.db.exec("UPDATE users SET is_blocked=? WHERE tenant_id=? AND tg_id=?",
                (new, ctx.tid, int(target_id)))
    return admin_user_detail(ctx, user, chat_id, message_id, target_id)


def _reply(ctx, chat_id, message_id, text, keyboard):
    """اگر message_id باشد ویرایش می‌کند، وگرنه پیام جدید می‌فرستد."""
    if message_id:
        try:
            return ctx.bot.edit(chat_id, message_id, text, keyboard)
        except TelegramError:
            pass
    return ctx.bot.send(chat_id, text, keyboard=keyboard)


# ═══════════════════════════════════════════════════════════
#  مسیریاب — نقطه‌ی ورود همه‌ی آپدیت‌های تلگرام
# ═══════════════════════════════════════════════════════════

def dispatch(tenant, bot, update):
    """
    یک آپدیت تلگرام را به هندلر مناسب می‌رساند.

    این تنها نقطه‌ای است که run.py صدا می‌زند؛ بقیه‌ی توابع از این‌جا
    فراخوانی می‌شوند. خطاها این‌جا گرفته می‌شوند تا یک آپدیت خراب
    کل حلقه‌ی مستاجر را متوقف نکند.
    """
    ctx = Ctx(bot, tenant)

    if "callback_query" in update:
        return _on_callback(ctx, update["callback_query"])
    if "message" in update:
        return _on_message(ctx, update["message"])
    return None


def _get_or_create(ctx, tg_user, ref=None):
    u = ctx.db.get_user(tg_user["id"])
    if u:
        ctx.db.touch_user(tg_user["id"])
        return u
    referred_by = None
    if ref:
        inviter = ctx.db.get_user_by_ref(ref)
        # کاربر نمی‌تواند خودش را دعوت کند
        if inviter and inviter["tg_id"] != tg_user["id"]:
            referred_by = inviter["id"]
    return ctx.db.create_user(
        tg_user["id"],
        username=tg_user.get("username"),
        first_name=tg_user.get("first_name"),
        referred_by=referred_by,
    )


def _on_message(ctx, msg):
    frm = msg.get("from") or {}
    if frm.get("is_bot"):
        return None

    chat = msg.get("chat") or {}
    # پیام‌های گروه مدیریت جدا رسیدگی می‌شوند
    if chat.get("type") in ("group", "supergroup"):
        return None

    text = (msg.get("text") or "").strip()

    # /start با پارامتر کد معرف
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        ref = parts[1].strip() if len(parts) > 1 else None
        user = _get_or_create(ctx, frm, ref)
        if user.get("is_blocked"):
            return None
        if ask_phone(ctx, user, msg["chat"]["id"]):
            return None
        return cmd_start(ctx, msg, ref)

    user = ctx.db.get_user(frm["id"])
    if not user:
        user = _get_or_create(ctx, frm)
    if user.get("is_blocked"):
        return None

    # ادامه‌ی گفتگوی چندمرحله‌ای
    state = user.get("state")
    try:
        sdata = json.loads(user.get("state_data") or "{}")
    except (json.JSONDecodeError, TypeError):
        sdata = {}

    if state == "await_phone" or msg.get("contact"):
        return handle_phone(ctx, msg, user)

    # ورودی‌های پنل مدیریت
    if state and state.startswith("adm_"):
        return admin_input(ctx, user, chat.get("id"), text, state, sdata)

    if state == "await_receipt":
        return handle_receipt(ctx, msg, user, sdata)
    if state == "await_ticket":
        return handle_ticket(ctx, msg, user)

    if text == "/menu":
        return ctx.bot.send(chat["id"], welcome_text(ctx, user),
                            keyboard=main_menu(ctx, user))

    # پیام آزاد → منو
    return ctx.bot.send(chat["id"], welcome_text(ctx, user),
                        keyboard=main_menu(ctx, user))


# نگاشت callback ساده → تابع
_SIMPLE = {
    "menu":    lambda ctx, u, c, m: _reply(ctx, c, m, welcome_text(ctx, u), main_menu(ctx, u)),
    "buy":     lambda ctx, u, c, m: show_plans(ctx, u, c, m),
    "mysubs":  lambda ctx, u, c, m: show_subs(ctx, u, c, m),
    "wallet":  lambda ctx, u, c, m: show_wallet(ctx, u, c, m),
    "coins":   lambda ctx, u, c, m: show_coins(ctx, u, c, m),
    "ref":     lambda ctx, u, c, m: show_referral(ctx, u, c, m),
    "help":    lambda ctx, u, c, m: show_help(ctx, u, c, m),
    "support": lambda ctx, u, c, m: start_support(ctx, u, c, m),
    "trial":   lambda ctx, u, c, m: give_trial(ctx, u, c, m),
    "admin":   lambda ctx, u, c, m: show_admin(ctx, u, c, m),
}


def _on_callback(ctx, cq):
    frm = cq.get("from") or {}
    data = cq.get("data") or ""
    msg = cq.get("message") or {}
    chat_id = (msg.get("chat") or {}).get("id")
    mid = msg.get("message_id")

    user = ctx.db.get_user(frm["id"]) or _get_or_create(ctx, frm)
    if user.get("is_blocked"):
        return ctx.bot.answer_cb(cq["id"], "دسترسی شما مسدود است", alert=True)

    try:
        ctx.bot.answer_cb(cq["id"])
    except TelegramError:
        pass

    if data in _SIMPLE:
        return _SIMPLE[data](ctx, user, chat_id, mid)

    if ":" not in data:
        return None
    action, _, arg = data.partition(":")

    try:
        if action == "plan":
            return show_plan_detail(ctx, user, chat_id, mid, int(arg))
        if action == "chk":
            pid, _, flag = arg.partition(":")
            return checkout(ctx, user, chat_id, mid, int(pid), flag == "1")
        if action == "wpay":
            return wallet_pay(ctx, user, chat_id, mid, int(arg))
        if action == "cancel":
            ctx.db.exec("UPDATE orders SET status='expired' WHERE tenant_id=? AND id=?",
                        (ctx.tid, int(arg)))
            ctx.db.clear_state(user["tg_id"])
            return _reply(ctx, chat_id, mid, "سفارش لغو شد.", main_menu(ctx, user))

        if action == "ost":
            return show_order_status(ctx, user, chat_id, mid, int(arg))

        # ارسال مجدد رسید بعد از رد
        if action == "retry":
            o = ctx.db.get_order(int(arg))
            if not o or o["user_id"] != user["id"]:
                return ctx.bot.answer_cb(cq["id"], "سفارش پیدا نشد", alert=True)
            ctx.db.set_state(user["tg_id"], "await_receipt", {"order": int(arg)})
            return _reply(ctx, chat_id, mid,
                          "📤 رسید جدید را بفرستید — عکس یا متن پیامک بانک.",
                          kb([[("انصراف", "menu")]]))

        # ── پنل مدیریت داخل ربات ──
        if action == "adm":
            if not ctx.is_admin(frm["id"]):
                return ctx.bot.answer_cb(cq["id"], "دسترسی ندارید", alert=True)

            sub, _, param = arg.partition(":")
            routes = {
                "orders": lambda: admin_orders(ctx, user, chat_id, mid),
                "users":  lambda: admin_users(ctx, user, chat_id, mid),
                "stats":  lambda: admin_stats(ctx, user, chat_id, mid),
                "plans":  lambda: admin_plans(ctx, user, chat_id, mid),
            }
            if sub in routes:
                return routes[sub]()

            if sub == "o":
                return admin_order_detail(ctx, user, chat_id, mid, int(param))
            if sub == "u":
                return admin_user_detail(ctx, user, chat_id, mid, param)
            if sub == "blk":
                return admin_toggle_block(ctx, user, chat_id, mid, param)
            if sub in ("bc", "find"):
                return admin_ask_input(ctx, user, chat_id, mid, sub)
            if sub in ("coin", "bal", "msg", "ask"):
                return admin_ask_input(ctx, user, chat_id, mid, sub, param)
            return None

        # دکمه‌های ادمین در گروه مدیریت
        if action in ("ap", "rj"):
            if not ctx.is_admin(frm["id"]):
                return ctx.bot.answer_cb(cq["id"], "دسترسی ندارید", alert=True)
            if action == "ap":
                return approve_order(ctx, int(arg), frm["id"])
            # از ادمین دلیل می‌پرسیم — رد بدون توضیح، مشتری را سردرگم
            # و عصبانی می‌کند و بار پشتیبانی را بالا می‌برد.
            ctx.db.set_state(frm["id"], "adm_reject", {"t": str(arg)})
            ctx.bot.send(
                chat_id,
                f"❌ <b>رد سفارش #{arg}</b>\n\n"
                "دلیل رد را بنویسید تا برای مشتری فرستاده شود.\n\n"
                "<i>یا یکی از دلیل‌های آماده را انتخاب کنید:</i>",
                keyboard=kb([
                    [("مبلغ نادرست", f"rjr:{arg}:amount")],
                    [("رسید ناخوانا", f"rjr:{arg}:unclear")],
                    [("رسید تکراری", f"rjr:{arg}:dup")],
                    [("رسید نامعتبر", f"rjr:{arg}:invalid")],
                    [("انصراف", f"adm:o:{arg}")],
                ]))
            return ctx.bot.answer_cb(cq["id"], "دلیل را انتخاب یا بنویسید")

        # دلیل آماده‌ی رد
        if action == "rjr":
            if not ctx.is_admin(frm["id"]):
                return ctx.bot.answer_cb(cq["id"], "دسترسی ندارید", alert=True)
            oid, _, code = arg.partition(":")
            reasons = {
                "amount": "مبلغ واریزی با مبلغ سفارش مطابقت ندارد.",
                "unclear": "تصویر رسید خوانا نبود.",
                "dup": "این رسید قبلاً استفاده شده است.",
                "invalid": "رسید معتبر تشخیص داده نشد.",
            }
            ctx.db.clear_state(frm["id"])
            do_reject(ctx, int(oid), frm["id"], reasons.get(code, "رسید تایید نشد."))
            return ctx.bot.edit_markup(chat_id, mid, None)

    except (ValueError, TypeError):
        log.warning("callback نامعتبر: %s", data)
    return None


def do_reject(ctx, order_id, admin_tg_id, reason):
    """
    رد سفارش با دلیل مشخص و اطلاع‌رسانی به مشتری.

    مشتری باید بداند چرا رد شده و چه کاری بکند — وگرنه یا پیگیری
    نمی‌کند (فروش از دست می‌رود) یا با عصبانیت به پشتیبانی می‌زند.
    """
    ctx.db.exec(
        "UPDATE orders SET status='rejected', reviewed_by=?, admin_note=?, "
        "reviewed_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=?",
        (admin_tg_id, reason, ctx.tid, order_id))

    o = ctx.db.get_order(order_id)
    if not o:
        return False

    # سکه‌های خرج‌شده برمی‌گردند
    if o.get("coins_used"):
        ctx.db.add_coins(o["user_id"], int(o["coins_used"]), "refund",
                         f"بازگشت سکه — سفارش #{order_id} رد شد")

    u = ctx.db.get_user_by_id(o["user_id"])
    if not u:
        return False

    support = ctx.s.get("support_username") or ""
    tpl = ctx.s.get("reject_text")
    if tpl:
        txt = (tpl.replace("{order_id}", str(order_id))
                  .replace("{reason}", reason)
                  .replace("{support}", support))
    else:
        txt = (
            f"❌ <b>رسید شما تایید نشد</b>\n"
            f"━━━━━━━━━━━━━━━━━━━\n\n"
            f"🔢 کد پیگیری: <code>#{order_id}</code>\n\n"
            f"<b>دلیل:</b>\n{esc(reason)}\n\n"
        )
        if o.get("coins_used"):
            txt += f"💎 {o['coins_used']} سکه‌ی شما برگردانده شد.\n\n"
        txt += "می‌توانید رسید درست را دوباره بفرستید."

    rows = [[("🔄 ارسال مجدد رسید", f"retry:{order_id}")]]
    if support:
        rows.append([("🎧 پشتیبانی", f"https://t.me/{support.lstrip('@')}", "url")])
    rows.append([("‹ منوی اصلی", "menu")])

    try:
        ctx.bot.send(u["tg_id"], txt, keyboard=kb(rows))
    except TelegramError:
        pass
    return True


# ═══════════════════════════════════════════════════════════
#  توابع زمان‌بند
# ═══════════════════════════════════════════════════════════

def send_expiry_notice(tenant, bot, sub, days_left):
    """یادآوری نزدیک‌شدن انقضا با دکمه‌ی تمدید."""
    ctx = Ctx(bot, tenant)
    if days_left <= 0:
        head = "⛔️ اشتراک شما امروز منقضی می‌شود"
    elif days_left == 1:
        head = "⏰ فقط ۱ روز تا پایان اشتراک"
    else:
        head = f"⏰ {days_left} روز تا پایان اشتراک"

    tpl = ctx.s.get("expiry_text")
    if tpl:
        txt = (tpl.replace("{days}", str(max(days_left, 0)))
                  .replace("{plan}", esc(str(sub.get("plan_name") or ""))))
        return ctx.bot.send(
            sub["tg_id"] if "tg_id" in sub.keys() else sub.get("tg_id"),
            txt, keyboard=kb([[("♻️ تمدید اشتراک", "buy")], [("‹ منو", "menu")]]))

    txt = (f"{head}\n\n"
           f"برای قطع نشدن سرویس، همین حالا تمدید کنید.")
    try:
        bot.send(sub["tg_id"], txt,
                 keyboard=kb([[("🔄 تمدید اشتراک", "buy")],
                              [("‹ منوی اصلی", "menu")]]))
    except TelegramError as e:
        log.warning("یادآوری ارسال نشد (%s): %s", sub["tg_id"], e)


def auto_renew_subscription(tenant, bot, sub):
    """
    تمدید خودکار از کیف پول.

    اگر موجودی کافی نباشد، فقط اطلاع می‌دهیم — تمدید خودکار خاموش
    نمی‌شود تا اگر کاربر شارژ کرد، دفعه‌ی بعد انجام شود.
    """
    ctx = Ctx(bot, tenant)
    plan = ctx.db.get_plan(sub["plan_id"]) if sub["plan_id"] else None
    if not plan:
        return

    user = ctx.db.get_user_by_id(sub["user_id"])
    if not user:
        return

    if user["balance"] < plan["price"]:
        try:
            bot.send(user["tg_id"],
                     f"⚠️ تمدید خودکار انجام نشد\n\n"
                     f"موجودی کیف پول شما کافی نیست.\n"
                     f"لازم: {core.toman(plan['price'])} تومان\n"
                     f"موجودی: {core.toman(user['balance'])} تومان",
                     keyboard=kb([[("👛 شارژ کیف پول", "wallet")]]))
        except TelegramError:
            pass
        return

    ctx.db.add_balance(user["id"], -plan["price"], "renew",
                       f"تمدید خودکار اشتراک #{sub['id']}")

    order = ctx.db.create_order(user["id"], plan["id"], plan["price"], plan["price"],
                                kind="renew", paid_from="wallet")
    ctx.db.exec("UPDATE orders SET status='approved' WHERE tenant_id=? AND id=?",
                (ctx.tid, order["id"]))

    ok, result = provision(ctx, order["id"])
    if ok:
        # پرچم‌های یادآوری برای دوره‌ی جدید صفر می‌شوند
        ctx.db.exec(
            """UPDATE subscriptions
               SET notified_7d=0, notified_3d=0, notified_1d=0, notified_80p=0
               WHERE tenant_id=? AND id=?""",
            (ctx.tid, sub["id"])
        )
        try:
            bot.send(user["tg_id"],
                     f"✅ اشتراک شما خودکار تمدید شد\n\n"
                     f"مبلغ {core.toman(plan['price'])} تومان از کیف پول کسر شد.")
        except TelegramError:
            pass
        ctx.notify_group(f"🔁 تمدید خودکار\n👤 <code>{user['tg_id']}</code>\n"
                         f"💰 {core.toman(plan['price'])} تومان", topic="renewals")
    else:
        # پول برمی‌گردد تا کاربر ضرر نکند
        ctx.db.add_balance(user["id"], plan["price"], "refund",
                           "بازگشت وجه — تمدید خودکار ناموفق")
        ctx.notify_group(f"⚠️ تمدید خودکار ناموفق\n👤 <code>{user['tg_id']}</code>\n"
                         f"خطا: {esc(str(result))}", topic="alerts")


def send_daily_report(tenant):
    """گزارش روزانه در تاپیک آمار."""
    bot = Bot(tenant["bot_token"])
    ctx = Ctx(bot, tenant)
    s = ctx.db.stats()

    today = ctx.db.q(
        """SELECT COUNT(*) c, COALESCE(SUM(amount),0) sum FROM orders
           WHERE tenant_id=? AND status='approved' AND date(created_at)=date('now')""",
        (ctx.tid,), one=True
    )
    new_users = ctx.db.q(
        "SELECT COUNT(*) c FROM users WHERE tenant_id=? AND date(created_at)=date('now')",
        (ctx.tid,), one=True
    )

    txt = (f"📊 <b>گزارش امروز</b>\n\n"
           f"🛒 فروش: {today['c']} سفارش\n"
           f"💰 درآمد: {core.toman(today['sum'])} تومان\n"
           f"👥 کاربر جدید: {new_users['c']}\n\n"
           f"— مجموع —\n"
           f"👥 کاربران: {s.get('users', 0)}\n"
           f"📦 اشتراک فعال: {s.get('active_subs', 0)}")
    ctx.notify_group(txt, topic="stats")
