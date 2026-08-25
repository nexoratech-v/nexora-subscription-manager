import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Activity, AlertTriangle, Apple, ArrowUpRight, Bell, Bot, Check, CheckCircle2, ChevronLeft,
  ChevronDown, Circle, Clock, Coins, Copy, CreditCard, Database, DollarSign, Download, ExternalLink, Eye, Gift, Github, Globe,
  HardDrive, HelpCircle, History, Info, Key, Layers, LayoutGrid, Link2, Loader2, LogOut, Menu,
  MessageCircle, MessageSquare, Minus, Monitor, Package, Palette, PlayCircle, Plus, Power,
  Radio, RefreshCw, Save, Search, Send, Server, Settings, ShieldCheck, Sliders, Smartphone,
  Star, Terminal, Trash2, TrendingUp, FileText, Wallet, Type, Upload, UserPlus, Users, Video, X, XCircle, Zap,
  Palette as PaletteIcon, Plus as PlusIcon, Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8100";

const OS_TABS = [
  { key: "android", label: "اندروید", icon: Smartphone },
  { key: "ios", label: "آیفون / آیپد", icon: Apple },
  { key: "desktop", label: "ویندوز", icon: Monitor },
];
const LANG_TABS = [
  { key: "fa", label: "فارسی" }, { key: "en", label: "English" },
  { key: "tr", label: "Türkçe" }, { key: "ar", label: "العربية" },
];
const SCHEME_OPTIONS = [
  { value: "happ", label: "Happ", icon: Zap },
  { value: "v2rayng", label: "v2rayNG", icon: Send },
  { value: "v2box", label: "V2Box", icon: ShieldCheck },
  { value: "none", label: "بدون افزودن یک‌کلیک", icon: Package },
];
const SCHEME_ICON = Object.fromEntries(SCHEME_OPTIONS.map((s) => [s.value, s.icon]));

// ═══ دو حالت کاری پنل ═══
// کاربر با یک سوییچ بین «مدیریت صفحه اشتراک» و «مدیریت ربات» جابه‌جا می‌شود.
// این کار منو را کوتاه و متمرکز نگه می‌دارد.
const WORKSPACES = {
  sub: {
    key: "sub",
    label: "صفحه اشتراک",
    shortLabel: "ساب",
    icon: Layers,
    groups: [
      {
        title: "مدیریت",
        items: [
          { key: "overview", label: "داشبورد", icon: LayoutGrid },
          { key: "preview", label: "پیش‌نمایش زنده", icon: Eye },
          { key: "resellers", label: "واسطه‌ها", icon: Users },
        ],
      },
      {
        title: "محتوای صفحه",
        items: [
          { key: "apps", label: "اپلیکیشن‌ها", icon: Smartphone },
          { key: "faq", label: "سوالات متداول", icon: HelpCircle },
          { key: "videos", label: "ویدیوهای آموزشی", icon: Video },
          { key: "links", label: "لینک‌ها", icon: Link2 },
        ],
      },
      {
        title: "ظاهر و رفتار",
        items: [
          { key: "banners", label: "بنرهای هشدار", icon: Bell },
          { key: "popup", label: "پاپ‌آپ راهنما", icon: MessageSquare },
          { key: "referral", label: "رفرال", icon: Gift },
          { key: "themes", label: "قالب‌ها", icon: Layers },
          { key: "settings", label: "تنظیمات ظاهری", icon: Sliders },
        ],
      },
      {
        title: "سیستم",
        items: [
          { key: "system", label: "به‌روزرسانی", icon: Server },
        ],
      },
    ],
  },
  billing: {
    key: "billing",
    label: "حسابداری",
    shortLabel: "حساب",
    icon: Wallet,
    groups: [
      {
        title: "مدیریت مالی",
        items: [
          { key: "bill-dash", label: "داشبورد", icon: TrendingUp },
          { key: "bill-groups", label: "واسطه‌ها و نرخ", icon: Users },
          { key: "bill-invoice", label: "صورتحساب", icon: FileText },
          { key: "bill-pay", label: "پرداخت‌ها", icon: Wallet },
        ],
      },
    ],
  },
  bot: {
    key: "bot",
    label: "ربات تلگرام",
    shortLabel: "ربات",
    icon: Bot,
    groups: [
      {
        title: "پیکربندی ربات",
        items: [
          { key: "bot", label: "اتصال و تنظیمات", icon: Key },
          { key: "bot-plans", label: "پلن‌ها و قیمت", icon: Package },
          { key: "bot-orders", label: "سفارش‌ها و رسیدها", icon: CreditCard },
          { key: "bot-users", label: "کاربران ربات", icon: Users },
          { key: "bot-coins", label: "سکه و دعوت", icon: Gift },
          { key: "bot-texts", label: "متن‌ها", icon: MessageCircle },
          { key: "bot-preview", label: "پیش‌نمایش ربات", icon: Eye },
          { key: "bot-stats", label: "آمار و قیف", icon: TrendingUp },
          { key: "bot-backup", label: "بک‌آپ ربات", icon: Database },
        ],
      },
      {
        title: "سیستم",
        items: [
          { key: "system", label: "به‌روزرسانی", icon: Server },
        ],
      },
    ],
  },
};

const ALL_NAV = Object.values(WORKSPACES).flatMap((w) => w.groups.flatMap((g) => g.items));

/* ===================== اجزای پایه ===================== */

function Field({ label, hint, children }) {
  return (
    <div className="mb-3">
      <label className="text-[11.5px] mb-1.5 block" style={{ color: "var(--muted)" }}>{label}</label>
      {children}
      {hint && <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: "#475569" }}>{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked} aria-label={label}
      className="w-12 h-[26px] rounded-full transition-all relative shrink-0"
      style={{ background: checked ? "var(--accent)" : "rgba(255,255,255,0.1)" }}>
      <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all duration-200"
        style={{ [checked ? "right" : "left"]: "3px" }} />
    </button>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 100, unit }) {
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="fx-stepper">
        <button className="fx-stepper-btn" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="کم کردن"><Minus size={16} /></button>
        <input className="fx-stepper-val" type="number" value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || min))} />
        {unit && <span className="fx-stepper-unit">{unit}</span>}
        <button className="fx-stepper-btn" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="زیاد کردن"><Plus size={16} /></button>
      </div>
      <input className="fx-range" type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to left, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,.08) ${pct}%)` }} />
    </div>
  );
}

/**
 * شمارش عدد تا مقدار نهایی.
 *
 * اگر کاربر انیمیشن را در سیستم‌عاملش خاموش کرده باشد، عدد
 * مستقیم نشان داده می‌شود — این یک قابلیت دسترسی‌پذیری است.
 */
function CountUp({ value, duration = 850 }) {
  const [n, setN] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || target === 0) { setN(target); return; }

    let raf, t0;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / duration, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{n}</>;
}

function SectionHead({ title, desc, action }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-white" style={{ fontFamily: "'Chakra Petch', sans-serif" }}>{title}</h2>
        {desc && <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function Tabs({ items, active, onChange, counts }) {
  return (
    <div className="fx-tabs flex items-center gap-1.5 mb-5">
      {items.map((t) => {
        const on = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium transition-all"
            style={on ? { color: "#06090F", background: "var(--accent-2)" } : { color: "var(--dim)", border: "1px solid var(--border-2)" }}>
            {t.icon && <t.icon size={13} />} {t.label}
            {counts && <span className="opacity-60 text-[11px]">({counts[t.key] ?? 0})</span>}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="fx-card py-12 text-center fx-fade" style={{ borderStyle: "dashed" }}>
      <Icon size={24} className="mx-auto mb-3" style={{ color: "#2A3444" }} />
      <p className="text-[12px]" style={{ color: "var(--muted)" }}>{text}</p>
    </div>
  );
}

function StatusChip({ dirty }) {
  return dirty ? (
    <span className="fx-status fx-status-dirty">
      <span className="w-1.5 h-1.5 rounded-full fx-pulse" style={{ background: "var(--warn)" }} /> ذخیره نشده
    </span>
  ) : (
    <span className="fx-status fx-status-saved"><CheckCircle2 size={12} /> ذخیره شده</span>
  );
}

function InfoBox({ children, tone = "info" }) {
  const t = tone === "warn"
    ? { bg: "rgba(251,191,36,.06)", bd: "rgba(251,191,36,.25)", c: "var(--warn)", Icon: AlertTriangle }
    : { bg: "rgba(43,127,214,.06)", bd: "rgba(43,127,214,.2)", c: "var(--accent-2)", Icon: Info };
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: t.bg, border: `1px solid ${t.bd}` }}>
      <t.Icon size={16} className="shrink-0 mt-0.5" style={{ color: t.c }} />
      <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--dim)" }}>{children}</div>
    </div>
  );
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ height: 30 }} />;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / range) * 24}`).join(" ");
  return (
    <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" style={{ opacity: .85 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ConfirmModal({ title, desc, onConfirm, onCancel, confirmLabel = "حذف کن" }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fx-fade"
      style={{ background: "rgba(3,6,12,.78)", backdropFilter: "blur(6px)" }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-5 fx-scale" onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid rgba(248,113,113,.3)" }}>
        <div className="flex items-center gap-2 mb-2.5" style={{ color: "var(--danger)" }}>
          <AlertTriangle size={18} /><span className="text-[14px] font-semibold">{title}</span>
        </div>
        <p className="text-[12px] mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="fx-btn-g flex-1 py-2.5 text-[12.5px]">انصراف</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-[11px] text-[12.5px] font-semibold text-white transition-all hover:brightness-110" style={{ background: "var(--danger)" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type }) {
  return (
    <div className="fx-toast fixed bottom-[92px] lg:bottom-6 left-1/2 z-[80] px-4 py-3 rounded-xl text-[12.5px] font-medium flex items-center gap-2 shadow-2xl max-w-[90vw]"
      style={{
        background: type === "error" ? "#3F1414" : "var(--surface)",
        border: `1px solid ${type === "error" ? "var(--danger)" : "rgba(90,169,230,.4)"}`,
        color: type === "error" ? "#FCA5A5" : "var(--accent-2)",
      }}>
      {type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {message}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) throw new Error();
      onLogin(password);
    } catch { setError("رمز عبور نادرست است یا سرور در دسترس نیست."); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(43,127,214,.15), transparent), var(--bg)" }} dir="rtl">
      <div className="w-full max-w-sm rounded-2xl p-7 fx-anim" style={{ background: "var(--surface)", border: "1px solid rgba(90,169,230,.25)", boxShadow: "0 0 80px rgba(43,127,214,.18)" }}>
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-[26px] mb-4"
            style={{ background: "linear-gradient(135deg,#2B7FD6,#8FC1EE)", color: "#06090F", fontFamily: "'Chakra Petch',sans-serif" }}>N</div>
          <span className="text-white font-bold text-[17px]" style={{ fontFamily: "'Chakra Petch',sans-serif" }}>NEXORA</span>
          <span className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>پنل مدیریت صفحه اشتراک</span>
        </div>
        <Field label="رمز عبور مدیریت">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus className="fx-input" style={{ fontFamily: "'JetBrains Mono',monospace" }} />
        </Field>
        {error && <p className="text-[12px] mb-3 flex items-center gap-1.5" style={{ color: "var(--danger)" }}><AlertTriangle size={13} />{error}</p>}
        <button onClick={submit} disabled={loading} className="fx-btn w-full py-3 text-[13px] flex items-center justify-center gap-2 mt-2">
          {loading && <Loader2 size={14} className="animate-spin" />} ورود به پنل
        </button>
      </div>
    </div>
  );
}

/* ===================== داشبورد ===================== */

function OverviewSection({ config, stats, navigate, dirty }) {
  const appsCount = stats?.appsCount ?? OS_TABS.reduce((s, t) => s + (config.downloadApps?.[t.key]?.length || 0), 0);
  const faqCount = stats?.faqCount ?? LANG_TABS.reduce((s, t) => s + (config.faq?.[t.key]?.length || 0), 0);
  const videosCount = stats?.videosCount ?? (config.videos?.length || 0);
  const activeCount = stats?.activeFeaturesCount ?? 0;

  const cards = [
    { key: "apps", label: "اپلیکیشن‌های فعال", value: appsCount, icon: Smartphone, color: "var(--accent-2)", bg: "rgba(43,127,214,.12)", spark: [2, 3, 3, 4, 5, 5, appsCount || 1], sub: "روی ۳ پلتفرم" },
    { key: "faq", label: "سوالات متداول", value: faqCount, icon: HelpCircle, color: "var(--purple)", bg: "rgba(167,139,250,.12)", spark: [1, 2, 3, 4, 4, 5, faqCount || 1], sub: "در ۴ زبان" },
    { key: "videos", label: "ویدیوهای آموزشی", value: videosCount, icon: Video, color: "var(--ok)", bg: "rgba(52,211,153,.12)", spark: [0, 0, 1, 1, 2, 2, videosCount || 1], sub: videosCount ? "قابل نمایش" : "هنوز اضافه نشده" },
    { key: "resellers", label: "واسطه‌های فعال", value: (config.resellers || []).filter(r => r.enabled !== false).length, icon: Users, color: "var(--warn)", bg: "rgba(251,191,36,.12)", spark: [0, 0, 1, 1, 1, 2, (config.resellers || []).length || 1], sub: "برند اختصاصی" },
  ];

  const features = [
    { l: "بنرهای هشدار", on: config.banners?.enabled, k: "banners" },
    { l: "کارت رفرال", on: config.referral?.enabled, k: "referral" },
    { l: "سوالات متداول", on: config.advanced?.showFaqSection !== false, k: "settings" },
    { l: "پاپ‌آپ راهنما", on: config.advanced?.showNotificationPopup !== false, k: "settings" },
  ];

  const quickLinks = [
    { l: "مشاهده پیش‌نمایش زنده", i: Eye, k: "preview" },
    { l: "افزودن ویدیوی آموزشی", i: Video, k: "videos" },
    { l: "ویرایش سوالات متداول", i: HelpCircle, k: "faq" },
    { l: "تنظیمات پیشرفته", i: Settings, k: "settings" },
  ];

  const allApps = OS_TABS.flatMap((t) =>
    (config.downloadApps?.[t.key] || []).map((a) => ({ ...a, platform: t.label }))
  );

  return (
    <div className="fx-anim">
      <div className="fx-g4 grid grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <button key={c.key} onClick={() => navigate(c.key)} className="fx-card fx-card-i p-5 text-right">
            <div className="flex items-start justify-between mb-4">
              <div className="fx-ico" style={{ background: c.bg }}><c.icon size={17} style={{ color: c.color }} /></div>
              <ChevronLeft size={15} style={{ color: "#2A3444" }} />
            </div>
            <div className="flex items-end justify-between gap-2 mb-1">
              <span className="fx-stat-num text-white"><CountUp value={c.value} /></span>
            </div>
            <div className="text-[11.5px] mb-1" style={{ color: "var(--dim)" }}>{c.label}</div>
            <div className="text-[10.5px] mb-3" style={{ color: "var(--muted)" }}>{c.sub}</div>
            <Sparkline data={c.spark} color={c.color} />
          </button>
        ))}
      </div>

      <div className="fx-g2 grid gap-4">
        <div className="fx-card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-[14px] font-bold text-white" style={{ fontFamily: "'Chakra Petch',sans-serif" }}>اپلیکیشن‌های پیکربندی‌شده</h2>
              <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>لیست اپ‌های موجود در صفحه اشتراک</p>
            </div>
            <button onClick={() => navigate("apps")} className="fx-btn-g px-3 py-2 text-[11.5px] flex items-center gap-1.5">
              مدیریت <ChevronLeft size={13} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            {allApps.length === 0 ? (
              <div className="py-12 text-center text-[12px]" style={{ color: "var(--muted)" }}>هنوز اپی اضافه نشده</div>
            ) : (
              <table className="fx-table">
                <thead>
                  <tr>
                    <th>نام اپ</th>
                    <th>پلتفرم</th>
                    <th className="fx-hide-m">دیپ‌لینک</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {allApps.map((a, i) => {
                    const Icon = SCHEME_ICON[a.scheme] || Package;
                    return (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: a.recommended ? "linear-gradient(135deg,#2B7FD6,#8FC1EE)" : "rgba(255,255,255,.05)" }}>
                              <Icon size={14} color={a.recommended ? "#06090F" : "#5A6880"} />
                            </div>
                            <span className="font-semibold text-white">{a.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--dim)" }}>{a.platform}</td>
                        <td className="fx-hide-m" dir="ltr" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>
                          {a.scheme === "none" ? "—" : `${a.scheme}://`}
                        </td>
                        <td>
                          {a.recommended ? (
                            <span className="fx-pill" style={{ background: "rgba(43,127,214,.14)", color: "var(--accent-2)" }}>
                              <Star size={9} fill="var(--accent-2)" /> پیشنهادی
                            </span>
                          ) : (
                            <span className="fx-pill" style={{ background: "rgba(255,255,255,.04)", color: "var(--muted)" }}>عادی</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="fx-card p-5" style={{ background: "linear-gradient(150deg,rgba(43,127,214,.14),var(--surface))", borderColor: "rgba(90,169,230,.25)" }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="fx-ico" style={{ background: "rgba(43,127,214,.16)" }}><Activity size={17} style={{ color: "var(--accent-2)" }} /></div>
              <StatusChip dirty={dirty} />
            </div>
            <h3 className="text-[13.5px] font-bold text-white mb-1.5">وضعیت صفحه اشتراک</h3>
            <p className="text-[11px] leading-relaxed mb-4" style={{ color: "var(--dim)" }}>قابلیت‌هایی که الان به مشتریان نمایش داده می‌شوند.</p>
            <div className="flex flex-col gap-2.5">
              {features.map((x, i) => (
                <button key={i} onClick={() => navigate(x.k)} className="flex items-center justify-between w-full">
                  <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>{x.l}</span>
                  <span className="fx-pill" style={{ background: x.on ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)", color: x.on ? "var(--ok)" : "var(--muted)" }}>
                    {x.on ? "فعال" : "خاموش"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="fx-card p-5">
            <h3 className="text-[13px] font-bold text-white mb-3.5">دسترسی سریع</h3>
            <div className="flex flex-col gap-2">
              {quickLinks.map((x, i) => (
                <button key={i} onClick={() => navigate(x.k)} className="fx-btn-g flex items-center justify-between px-3 py-2.5 text-[12px] w-full">
                  <span className="flex items-center gap-2"><x.i size={14} /> {x.l}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== اپلیکیشن‌ها ===================== */

function PhonePreview({ config, os }) {
  const list = config.downloadApps?.[os] || [];
  const rec = list.find((a) => a.recommended);
  const others = list.filter((a) => !a.recommended);
  const osLabel = OS_TABS.find((t) => t.key === os)?.label;

  return (
    <div className="fx-hide-m">
      <div className="sticky top-24">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}><Eye size={13} /> پیش‌نمایش زنده</div>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(43,127,214,.12)", color: "var(--accent-2)" }}>{osLabel}</span>
        </div>
        <div className="mx-auto rounded-[2.2rem] p-2.5" style={{ width: 250, background: "linear-gradient(160deg,#1a2130,#0a0e17)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 24px 70px rgba(0,0,0,.55)" }}>
          <div className="flex items-center justify-center mb-1.5"><div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,.15)" }} /></div>
          <div className="rounded-[1.7rem] overflow-hidden" style={{ background: "var(--bg)", minHeight: 380 }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1 text-[8px]" style={{ color: "var(--muted)" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>۱۰:۳۰</span>
              <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full" style={{ background: "var(--ok)" }} /><span>Nexora</span></div>
            </div>
            <div className="px-3.5 pb-4">
              <div className="text-[10.5px] font-bold text-white text-center my-3">دانلود برنامه ها</div>
              <div className="rounded-lg px-2.5 py-2 mb-3 flex items-start gap-1.5" style={{ background: "rgba(43,127,214,.1)", border: "1px solid rgba(43,127,214,.3)" }}>
                <Star size={9} className="shrink-0 mt-0.5" style={{ color: "var(--accent-2)" }} fill="var(--accent-2)" />
                <div className="text-[8.5px] leading-relaxed" style={{ color: "var(--accent-2)" }}>پیشنهاد ما: <b>{rec?.name || "—"}</b></div>
              </div>
              {[rec, ...others].filter(Boolean).map((app, i) => {
                const Icon = SCHEME_ICON[app.scheme] || Package;
                return (
                  <div key={i} className="rounded-xl p-3 mb-2 relative" style={{ background: "var(--surface)", border: app.recommended ? "1px solid rgba(90,169,230,.45)" : "1px solid var(--border)" }}>
                    {app.recommended && <div className="absolute -top-2 right-3 text-[7px] px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#2B7FD6,#5AA9E6)", color: "#06090F", fontWeight: 700 }}>پیشنهادی</div>}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-bold text-white truncate">{app.name}</div>
                        <div className="text-[8px]" style={{ color: "var(--muted)" }}>کلاینت رسمی</div>
                      </div>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: app.recommended ? "linear-gradient(135deg,#2B7FD6,#8FC1EE)" : "rgba(255,255,255,.05)" }}>
                        <Icon size={14} color={app.recommended ? "#06090F" : "#5A6880"} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {app.scheme !== "none" && <div className="text-[8px] text-center py-1.5 rounded-lg font-bold" style={{ background: "linear-gradient(135deg,#2B7FD6,#5AA9E6)", color: "#06090F" }}>افزودن با یک کلیک</div>}
                      <div className="text-[7.5px] text-center py-1 rounded-lg" style={{ border: "1px solid var(--border-2)", color: "var(--muted)" }}>دانلود اپ</div>
                    </div>
                  </div>
                );
              })}
              {list.length === 0 && <div className="text-[9px] text-center py-12" style={{ color: "#2A3444" }}>هیچ اپی اضافه نشده</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppsSection({ config, setConfig, requestDelete }) {
  const [osTab, setOsTab] = useState("android");
  const list = config.downloadApps?.[osTab] || [];
  const counts = Object.fromEntries(OS_TABS.map((t) => [t.key, config.downloadApps?.[t.key]?.length || 0]));

  const updateApp = (i, patch) => {
    const l = [...list]; l[i] = { ...l[i], ...patch };
    setConfig({ ...config, downloadApps: { ...(config.downloadApps || {}), [osTab]: l } });
  };
  const setRec = (i) => {
    const l = list.map((a, j) => ({ ...a, recommended: j === i }));
    setConfig({ ...config, downloadApps: { ...(config.downloadApps || {}), [osTab]: l } });
  };
  const addApp = () => setConfig({ ...config, downloadApps: { ...(config.downloadApps || {}), [osTab]: [...list, { id: `app-${Date.now()}`, name: "اپ جدید", url: "", recommended: list.length === 0, scheme: "none" }] } });

  return (
    <div className="fx-g2 grid gap-6 fx-anim" style={{ gridTemplateColumns: "1fr 280px" }}>
      <div className="min-w-0">
        <SectionHead title="اپلیکیشن‌های دانلود" desc="برای هر پلتفرم، اپ‌های قابل‌دانلود و اپ پیشنهادی را مدیریت کنید." />
        <Tabs items={OS_TABS} active={osTab} onChange={setOsTab} counts={counts} />
        <div className="flex flex-col gap-3">
          {list.length === 0 && <EmptyState icon={Smartphone} text="هنوز اپی برای این پلتفرم اضافه نشده" />}
          {list.map((app, i) => {
            const Icon = SCHEME_ICON[app.scheme] || Package;
            return (
              <div key={app.id || i} className={`fx-card p-4 ${app.recommended ? "fx-card-hl" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="fx-ico" style={{ background: app.recommended ? "linear-gradient(135deg,#2B7FD6,#8FC1EE)" : "rgba(255,255,255,.05)" }}>
                      <Icon size={16} color={app.recommended ? "#06090F" : "#5A6880"} />
                    </div>
                    <button onClick={() => setRec(i)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all"
                      style={app.recommended ? { color: "#06090F", background: "linear-gradient(135deg,#2B7FD6,#5AA9E6)" } : { color: "var(--muted)", background: "rgba(255,255,255,.05)" }}>
                      <Star size={11} fill={app.recommended ? "#06090F" : "none"} /> {app.recommended ? "پیشنهادی" : "انتخاب به‌عنوان پیشنهادی"}
                    </button>
                  </div>
                  <button onClick={() => requestDelete({ type: "app", os: osTab, idx: i, name: app.name })} className="fx-ico-btn shrink-0"><Trash2 size={15} /></button>
                </div>
                <div className="fx-g3 grid grid-cols-2 gap-3">
                  <Field label="نام اپ"><input className="fx-input" value={app.name} onChange={(e) => updateApp(i, { name: e.target.value })} /></Field>
                  <Field label="نوع افزودن یک‌کلیک">
                    <select className="fx-input" value={app.scheme} onChange={(e) => updateApp(i, { scheme: e.target.value })}>
                      {SCHEME_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="لینک دانلود"><input className="fx-input" dir="ltr" value={app.url} onChange={(e) => updateApp(i, { url: e.target.value })} placeholder="https://..." /></Field>
              </div>
            );
          })}
          <button onClick={addApp} className="fx-btn-dash flex items-center justify-center gap-2 py-3.5 text-[12.5px]">
            <Plus size={15} /> افزودن اپ جدید به {OS_TABS.find((t) => t.key === osTab)?.label}
          </button>
        </div>
      </div>
      <PhonePreview config={config} os={osTab} />
    </div>
  );
}

/* ===================== ویدیوها ===================== */

function VideosSection({ config, setConfig, requestDelete }) {
  const videos = config.videos || [];
  const update = (i, patch) => { const l = [...videos]; l[i] = { ...l[i], ...patch }; setConfig({ ...config, videos: l }); };
  const add = () => setConfig({ ...config, videos: [...videos, { id: `vid-${Date.now()}`, title: "آموزش جدید", telegramUrl: "", platform: "all" }] });

  const incomplete = videos.filter((v) => !v.telegramUrl || !v.telegramUrl.trim()).length;

  return (
    <div className="fx-anim">
      <SectionHead title="ویدیوهای آموزشی" desc="ویدیوها را در کانال تلگرام خود آپلود کنید و فقط لینک پیام را اینجا بگذارید — هیچ حجمی از سرور مصرف نمی‌شود." />

      {incomplete > 0 && (
        <div className="mb-4">
          <InfoBox tone="warn">
            <b>{incomplete} ویدیو بدون لینک است</b> و در صفحه‌ی مشتری نمایش داده نمی‌شود.
            برای هر ویدیو حتماً لینک تلگرام را وارد کنید.
          </InfoBox>
        </div>
      )}

      <div className="mb-4">
        <InfoBox>
          <b>چطور لینک بگیرم؟</b> ویدیو را در کانال تلگرام‌تان بفرستید، روی پیام لمس طولانی کنید و «Copy Link» را بزنید. لینکی شبیه <span dir="ltr" style={{ fontFamily: "'JetBrains Mono',monospace" }}>t.me/yanexoravpn/42</span> می‌گیرید.
          <br /><span style={{ color: "var(--warn)" }}>توجه:</span> لینک Saved Messages شخصی برای مشتری‌ها باز نمی‌شود — حتماً از کانال عمومی استفاده کنید.
        </InfoBox>
      </div>
      <div className="flex flex-col gap-3">
        {videos.length === 0 && <EmptyState icon={Video} text="هنوز ویدیویی اضافه نشده" />}
        {videos.map((v, i) => (
          <div key={v.id || i} className="fx-card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="fx-ico" style={{ background: "rgba(43,127,214,.12)" }}><PlayCircle size={16} style={{ color: "var(--accent-2)" }} /></div>
                <span className="text-[12.5px] font-semibold text-white truncate">{v.title || "بدون عنوان"}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {v.telegramUrl && <a href={v.telegramUrl} target="_blank" rel="noreferrer" className="fx-ico-btn" style={{ color: "var(--accent-2)" }}><ExternalLink size={14} /></a>}
                <button onClick={() => requestDelete({ type: "video", idx: i, name: v.title })} className="fx-ico-btn"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="fx-g3 grid grid-cols-2 gap-3">
              <Field label="عنوان ویدیو"><input className="fx-input" value={v.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="آموزش نصب Happ در اندروید" /></Field>
              <Field label="مربوط به پلتفرم">
                <select className="fx-input" value={v.platform} onChange={(e) => update(i, { platform: e.target.value })}>
                  <option value="all">همه پلتفرم‌ها</option>
                  {OS_TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="لینک پیام تلگرام" hint="مثال: https://t.me/yanexoravpn/42">
              <input className="fx-input" dir="ltr" value={v.telegramUrl} onChange={(e) => update(i, { telegramUrl: e.target.value })} placeholder="https://t.me/..." />
            </Field>
          </div>
        ))}
        <button onClick={add} className="fx-btn-dash flex items-center justify-center gap-2 py-3.5 text-[12.5px]"><Plus size={15} /> افزودن ویدیوی آموزشی</button>
      </div>
    </div>
  );
}

/* ===================== FAQ ===================== */

function FaqSection({ config, setConfig, requestDelete }) {
  const [lang, setLang] = useState("fa");
  const list = config.faq?.[lang] || [];
  const counts = Object.fromEntries(LANG_TABS.map((t) => [t.key, config.faq?.[t.key]?.length || 0]));
  const update = (i, patch) => { const l = [...list]; l[i] = { ...l[i], ...patch }; setConfig({ ...config, faq: { ...(config.faq || {}), [lang]: l } }); };
  const add = () => setConfig({ ...config, faq: { ...(config.faq || {}), [lang]: [...list, { q: "", a: "" }] } });

  return (
    <div className="fx-anim">
      <SectionHead title="سوالات متداول" desc="این سوال‌ها به‌صورت آکاردئون در پایین صفحه‌ی اشتراک نمایش داده می‌شوند." />
      <Tabs items={LANG_TABS} active={lang} onChange={setLang} counts={counts} />
      <div className="flex flex-col gap-3">
        {list.length === 0 && <EmptyState icon={HelpCircle} text="هنوز سوالی برای این زبان اضافه نشده" />}
        {list.map((item, i) => (
          <div key={i} className="fx-card p-4">
            <div className="flex items-start justify-between mb-2.5">
              <span className="fx-pill" style={{ background: "rgba(255,255,255,.04)", color: "var(--muted)" }}>سوال {i + 1}</span>
              <button onClick={() => requestDelete({ type: "faq", lang, idx: i, name: item.q || "این سوال" })} className="fx-ico-btn"><Trash2 size={14} /></button>
            </div>
            <Field label="متن سوال"><input className="fx-input" value={item.q} onChange={(e) => update(i, { q: e.target.value })} /></Field>
            <Field label="متن پاسخ"><textarea className="fx-input" value={item.a} onChange={(e) => update(i, { a: e.target.value })} rows={2} /></Field>
          </div>
        ))}
        <button onClick={add} className="fx-btn-dash flex items-center justify-center gap-2 py-3.5 text-[12.5px]"><Plus size={15} /> افزودن سوال جدید</button>
      </div>
    </div>
  );
}

/* ===================== بنرها ===================== */

function BannersSection({ config, setConfig }) {
  const b = config.banners || {};
  const update = (patch) => setConfig({ ...config, banners: { ...b, ...patch } });
  const [tab, setTab] = useState("thresholds");

  const TABS_B = [
    { key: "thresholds", label: "آستانه‌ها", icon: Sliders },
    { key: "disabled", label: "متن بنر قطعی", icon: AlertTriangle },
    { key: "lowquota", label: "متن بنر اتمام", icon: Clock },
  ];

  return (
    <div className="fx-anim">
      <SectionHead title="بنرهای هشدار" desc="بنرهایی که بالای داشبورد صفحه‌ی اشتراک، بسته به شرایط، خودکار ظاهر می‌شوند." />

      <div className="fx-card p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="fx-ico" style={{ background: "rgba(43,127,214,.12)" }}><Bell size={16} style={{ color: "var(--accent-2)" }} /></div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white">فعال‌سازی کلی بنرها</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>اگر خاموش کنید، هیچ بنری نمایش داده نمی‌شود</div>
            </div>
          </div>
          <Toggle checked={b.enabled !== false} onChange={() => update({ enabled: !(b.enabled !== false) })} label="بنرها" />
        </div>
      </div>

      <div style={{ opacity: b.enabled !== false ? 1 : 0.45, pointerEvents: b.enabled !== false ? "auto" : "none" }}>
        <Tabs items={TABS_B} active={tab} onChange={setTab} />

        {tab === "thresholds" && (
          <div className="fx-g3 grid grid-cols-2 gap-4 fx-fade">
            <div className="fx-card p-5">
              <div className="flex items-center gap-2 mb-4"><Clock size={14} style={{ color: "var(--warn)" }} /><span className="text-[12.5px] font-semibold text-white">هشدار پایان زمان</span></div>
              <NumberStepper value={b.lowQuotaDaysThreshold ?? 3} onChange={(v) => update({ lowQuotaDaysThreshold: v })} min={1} max={30} unit="روز" />
              <p className="text-[10.5px] mt-3 leading-relaxed" style={{ color: "#475569" }}>
                از <b style={{ color: "var(--warn)" }}>{b.lowQuotaDaysThreshold ?? 3} روز</b> مانده به انقضا، بنر نمایش داده می‌شود.
              </p>
            </div>
            <div className="fx-card p-5">
              <div className="flex items-center gap-2 mb-4"><Package size={14} style={{ color: "var(--warn)" }} /><span className="text-[12.5px] font-semibold text-white">هشدار پایان حجم</span></div>
              <NumberStepper value={b.lowQuotaPercentThreshold ?? 15} onChange={(v) => update({ lowQuotaPercentThreshold: v })} min={1} max={50} unit="درصد" />
              <p className="text-[10.5px] mt-3 leading-relaxed" style={{ color: "#475569" }}>
                وقتی کمتر از <b style={{ color: "var(--warn)" }}>{b.lowQuotaPercentThreshold ?? 15}٪</b> حجم باقی باشد، بنر ظاهر می‌شود.
              </p>
            </div>
          </div>
        )}

        {tab === "disabled" && (
          <div className="fx-g2 grid gap-5 fx-fade" style={{ gridTemplateColumns: "1fr 280px" }}>
            <div className="fx-card p-5">
              <div className="text-[13px] font-semibold text-white mb-1">بنر «کانفیگ غیرفعال است»</div>
              <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
                وقتی کانفیگ مشتری غیرفعال شده باشد (مثلاً به‌خاطر تخطی از محدودیت IP) این بنر نمایش داده می‌شود.
              </p>
              <Field label="عنوان" hint="خالی بگذارید تا متن پیش‌فرض استفاده شود">
                <input className="fx-input" value={b.disabledTitle || ""} onChange={(e) => update({ disabledTitle: e.target.value })} placeholder="این کانفیگ غیرفعال است" />
              </Field>
              <Field label="متن توضیحات">
                <textarea className="fx-input" rows={3} value={b.disabledDesc || ""} onChange={(e) => update({ disabledDesc: e.target.value })}
                  placeholder="این اتفاق معمولاً به‌خاطر استفاده‌ی هم‌زمان از چند دستگاه می‌افتد..." />
              </Field>
              <Field label="متن دکمه">
                <input className="fx-input" value={b.disabledButtonText || ""} onChange={(e) => update({ disabledButtonText: e.target.value })} placeholder="تماس با پشتیبانی" />
              </Field>
            </div>
            <div className="fx-hide-m">
              <div className="sticky top-24">
                <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: "var(--muted)" }}><Eye size={13} /> پیش‌نمایش</div>
                <div className="rounded-2xl p-4" style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)" }}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(248,113,113,.18)" }}>
                      <AlertTriangle size={14} style={{ color: "var(--danger)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-white mb-1">{b.disabledTitle || "این کانفیگ غیرفعال است"}</div>
                      <div className="text-[10.5px] leading-relaxed mb-2.5" style={{ color: "var(--dim)" }}>
                        {b.disabledDesc || "این اتفاق معمولاً به‌خاطر استفاده‌ی هم‌زمان از چند دستگاه می‌افتد."}
                      </div>
                      <div className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "var(--danger)", color: "#1a0505" }}>
                        {b.disabledButtonText || "تماس با پشتیبانی"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "lowquota" && (
          <div className="fx-g2 grid gap-5 fx-fade" style={{ gridTemplateColumns: "1fr 280px" }}>
            <div className="fx-card p-5">
              <div className="text-[13px] font-semibold text-white mb-1">بنر «اشتراک رو به اتمام»</div>
              <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
                وقتی حجم یا زمان اشتراک مشتری به آستانه‌ی تعیین‌شده برسد، این بنر نمایش داده می‌شود.
              </p>
              <Field label="عنوان">
                <input className="fx-input" value={b.lowQuotaTitle || ""} onChange={(e) => update({ lowQuotaTitle: e.target.value })} placeholder="اشتراک شما رو به اتمام است" />
              </Field>
              <Field label="متن هشدار پایان زمان" hint="از {days} برای نمایش تعداد روز باقی‌مانده استفاده کنید">
                <textarea className="fx-input" rows={2} value={b.lowQuotaDescDays || ""} onChange={(e) => update({ lowQuotaDescDays: e.target.value })}
                  placeholder="فقط {days} روز از اشتراک شما باقی مانده. همین حالا تمدید کنید." />
              </Field>
              <Field label="متن هشدار پایان حجم">
                <textarea className="fx-input" rows={2} value={b.lowQuotaDescVolume || ""} onChange={(e) => update({ lowQuotaDescVolume: e.target.value })}
                  placeholder="حجم اشتراک شما رو به اتمام است. همین حالا تمدید کنید." />
              </Field>
              <div className="fx-g3 grid grid-cols-2 gap-3">
                <Field label="متن دکمه">
                  <input className="fx-input" value={b.lowQuotaButtonText || ""} onChange={(e) => update({ lowQuotaButtonText: e.target.value })} placeholder="تمدید اشتراک" />
                </Field>
                <Field label="لینک دکمه" hint="خالی = لینک پشتیبانی">
                  <input className="fx-input" dir="ltr" value={b.lowQuotaButtonUrl || ""} onChange={(e) => update({ lowQuotaButtonUrl: e.target.value })} placeholder="https://t.me/..." />
                </Field>
              </div>
            </div>
            <div className="fx-hide-m">
              <div className="sticky top-24">
                <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: "var(--muted)" }}><Eye size={13} /> پیش‌نمایش</div>
                <div className="rounded-2xl p-4" style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)" }}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,.18)" }}>
                      <Clock size={14} style={{ color: "var(--warn)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-white mb-1">{b.lowQuotaTitle || "اشتراک شما رو به اتمام است"}</div>
                      <div className="text-[10.5px] leading-relaxed mb-2.5" style={{ color: "var(--dim)" }}>
                        {(b.lowQuotaDescDays || "فقط {days} روز از اشتراک شما باقی مانده.").replace("{days}", String(b.lowQuotaDaysThreshold ?? 3))}
                      </div>
                      <div className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: "var(--warn)", color: "#2a1c02" }}>
                        {b.lowQuotaButtonText || "تمدید اشتراک"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== رفرال ===================== */

function ReferralSection({ config, setConfig }) {
  const r = config.referral || { enabled: true };
  return (
    <div className="fx-anim">
      <SectionHead title="سیستم رفرال" desc="کارت معرفی به دوستان که در داشبورد صفحه‌ی اشتراک نمایش داده می‌شود." />
      <div className="fx-card p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="fx-ico" style={{ background: "rgba(43,127,214,.12)" }}><Gift size={16} style={{ color: "var(--accent-2)" }} /></div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white">نمایش کارت رفرال</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>اگر خاموش کنید، کارت معرفی نمایش داده نمی‌شود</div>
            </div>
          </div>
          <Toggle checked={r.enabled} onChange={() => setConfig({ ...config, referral: { ...r, enabled: !r.enabled } })} label="رفرال" />
        </div>
      </div>
      <InfoBox tone="warn">
        فعلاً این کارت فقط یک لینک پیام آماده به پشتیبانی است، بدون ردیابی خودکار پاداش. برای پاداش‌دهی خودکار، باید منطق جداگانه‌ای در ربات تلگرام پیاده‌سازی شود.
      </InfoBox>
    </div>
  );
}

/* ===================== لینک‌ها ===================== */

function LinksSection({ config, setConfig }) {
  const l = config.links;
  const update = (patch) => setConfig({ ...config, links: { ...l, ...patch } });
  return (
    <div className="fx-anim">
      <SectionHead title="لینک‌های ارتباطی" desc="آدرس‌های پشتیبانی و کانال که در سراسر صفحه‌ی اشتراک استفاده می‌شوند." />
      <div className="fx-card p-5">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2"><MessageCircle size={15} style={{ color: "var(--accent-2)" }} /> پشتیبانی و کانال</div>
        <div className="fx-g3 grid grid-cols-2 gap-4">
          <Field label="یوزرنیم تلگرام پشتیبانی" hint="بدون @ وارد کنید">
            <input className="fx-input" dir="ltr" value={l.supportUsername} onChange={(e) => update({ supportUsername: e.target.value })} placeholder="crm_nexoravpn" />
          </Field>
          <Field label="یوزرنیم کانال" hint="بدون @ وارد کنید">
            <input className="fx-input" dir="ltr" value={l.channelUsername} onChange={(e) => update({ channelUsername: e.target.value })} placeholder="yanexoravpn" />
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={`https://t.me/${l.supportUsername}`} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(43,127,214,.1)", color: "var(--accent-2)" }}>
            <ExternalLink size={11} /> تست لینک پشتیبانی
          </a>
          <a href={`https://t.me/${l.channelUsername}`} target="_blank" rel="noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(43,127,214,.1)", color: "var(--accent-2)" }}>
            <ExternalLink size={11} /> تست لینک کانال
          </a>
        </div>
      </div>
    </div>
  );
}

/* ===================== تنظیمات ===================== */

function SettingsSection({ config, setConfig, password, onPasswordChanged, onRestored, wsMode, setWsMode }) {
  const a = config.advanced || {};
  const update = (patch) => setConfig({ ...config, advanced: { ...a, ...patch } });
  const vis = [
    { key: "showBrandStrip", label: "نوار برند بالای صفحه", desc: "لوگو و نام برند" },
    { key: "showReferralCard", label: "کارت رفرال", desc: "معرفی به دوستان در داشبورد" },
    { key: "showFaqSection", label: "بخش سوالات متداول", desc: "آکاردئون سوالات در پایین صفحه" },
    { key: "showNotificationPopup", label: "پاپ‌آپ راهنما", desc: "تنظیمات کامل در بخش «پاپ‌آپ راهنما»" },
    { key: "allowThemeToggle", label: "دکمه تغییر تم", desc: "اجازه‌ی سوییچ بین حالت تیره و روشن" },
    { key: "allowLanguageToggle", label: "دکمه تغییر زبان", desc: "اجازه‌ی انتخاب زبان توسط مشتری" },
  ];

  return (
    <div className="fx-anim">
      <SectionHead title="تنظیمات پیشرفته" desc="کنترل کامل روی ظاهر، رفتار و جزئیات صفحه‌ی اشتراک." />

      {/* حالت سوییچ فضای کاری — سلیقه‌ای، فقط روی همین مرورگر */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
          <LayoutGrid size={15} style={{ color: "var(--accent-2)" }} /> نمایش فضاهای کاری
        </div>
        <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
          چطور بین صفحه اشتراک، حسابداری و ربات جابه‌جا شوید. فقط روی همین مرورگر ذخیره می‌شود.
        </p>

        <div className="fx-g3 grid grid-cols-3 gap-3">
          {Object.entries(WS_MODES).map(([k, m]) => {
            const on = wsMode === k;
            return (
              <button key={k} onClick={() => setWsMode(k)}
                className="p-3.5 rounded-2xl text-right"
                style={{
                  background: on ? "var(--accent-soft)" : "var(--surface-3)",
                  border: `1px solid ${on ? "rgba(43,127,214,.45)" : "var(--border)"}`,
                  transition: "transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s, background .2s, border-color .2s",
                  transform: on ? "translateY(-2px)" : "none",
                  boxShadow: on
                    ? "0 1px 0 rgba(255,255,255,.1) inset, 0 14px 30px -14px rgba(43,127,214,.55)"
                    : "0 1px 0 rgba(255,255,255,.04) inset",
                }}>
                <WsModePreview mode={k} active={on} />
                <div className="flex items-center gap-1.5 mt-3">
                  {on && <Check size={12} style={{ color: "var(--accent-2)", flexShrink: 0 }} />}
                  <span className="text-[12px] font-bold"
                    style={{ color: on ? "var(--text)" : "var(--dim)" }}>{m.label}</span>
                </div>
                <div className="text-[10px] mt-1.5 leading-relaxed" style={{ color: "var(--muted)" }}>
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2"><Type size={15} style={{ color: "var(--accent-2)" }} /> هویت برند</div>
        <div className="fx-g3 grid grid-cols-2 gap-4">
          <Field label="نام برند"><input className="fx-input" value={a.brandName || ""} onChange={(e) => update({ brandName: e.target.value })} placeholder="NEXORA" /></Field>
          <Field label="عنوان صفحه (تب مرورگر)"><input className="fx-input" value={a.pageTitle || ""} onChange={(e) => update({ pageTitle: e.target.value })} /></Field>
        </div>
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2"><Palette size={15} style={{ color: "var(--accent-2)" }} /> رنگ‌بندی</div>
        <div className="fx-g3 grid grid-cols-2 gap-4">
          <Field label="رنگ اصلی برند">
            <div className="flex items-center gap-2">
              <input type="color" value={a.accentColor || "#2B7FD6"} onChange={(e) => update({ accentColor: e.target.value })}
                className="w-11 h-11 rounded-xl cursor-pointer shrink-0" style={{ background: "transparent", border: "1px solid var(--border-2)" }} />
              <input className="fx-input" dir="ltr" value={a.accentColor || ""} onChange={(e) => update({ accentColor: e.target.value })} />
            </div>
          </Field>
          <Field label="رنگ ثانویه (گرادینت)">
            <div className="flex items-center gap-2">
              <input type="color" value={a.accentColor2 || "#5AA9E6"} onChange={(e) => update({ accentColor2: e.target.value })}
                className="w-11 h-11 rounded-xl cursor-pointer shrink-0" style={{ background: "transparent", border: "1px solid var(--border-2)" }} />
              <input className="fx-input" dir="ltr" value={a.accentColor2 || ""} onChange={(e) => update({ accentColor2: e.target.value })} />
            </div>
          </Field>
        </div>
        <div className="mt-2 rounded-xl p-3 text-center" style={{ background: `linear-gradient(135deg, ${a.accentColor || "#2B7FD6"}, ${a.accentColor2 || "#5AA9E6"})` }}>
          <span className="text-[11.5px] font-bold" style={{ color: "#06090F" }}>پیش‌نمایش گرادینت برند</span>
        </div>
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2"><Globe size={15} style={{ color: "var(--accent-2)" }} /> پیش‌فرض‌های صفحه</div>
        <div className="fx-g3 grid grid-cols-2 gap-4">
          <Field label="زبان پیش‌فرض">
            <select className="fx-input" value={a.defaultLanguage || "fa"} onChange={(e) => update({ defaultLanguage: e.target.value })}>
              {LANG_TABS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="تم پیش‌فرض">
            <select className="fx-input" value={a.defaultTheme || "dark"} onChange={(e) => update({ defaultTheme: e.target.value })}>
              <option value="dark">تیره</option><option value="light">روشن</option>
            </select>
          </Field>
        </div>
        <Field label="تاخیر نمایش پاپ‌آپ راهنما">
          <NumberStepper value={a.notificationDelaySeconds ?? 10} onChange={(v) => update({ notificationDelaySeconds: v })} min={0} max={60} unit="ثانیه" />
        </Field>
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2"><Eye size={15} style={{ color: "var(--accent-2)" }} /> نمایش بخش‌ها</div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>هر بخشی را که نمی‌خواهید در صفحه‌ی مشتری دیده شود، خاموش کنید.</p>
        <div className="flex flex-col">
          {vis.map((v, i) => (
            <div key={v.key} className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: i < vis.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="min-w-0">
                <div className="text-[12.5px] text-white">{v.label}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>{v.desc}</div>
              </div>
              <Toggle checked={a[v.key] !== false} onChange={() => update({ [v.key]: !(a[v.key] !== false) })} label={v.label} />
            </div>
          ))}
        </div>
      </div>

      <BackupCard password={password} onRestored={onRestored} />

      <ChangePasswordCard password={password} onPasswordChanged={onPasswordChanged} />

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2"><ShieldCheck size={15} style={{ color: "var(--accent-2)" }} /> امنیت و حریم خصوصی</div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>کنترل چیزی که مشتری می‌تواند ببیند یا کپی کند.</p>
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="text-[12.5px] text-white">مخفی‌کردن لیست کانفیگ‌ها</div>
            <div className="text-[10.5px] mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>
              دکمه‌ی «کپی کانفیگ» حذف می‌شود تا مشتری نتواند کانفیگ خام را کپی و با دیگران به اشتراک بگذارد. لینک اشتراک همچنان کار می‌کند.
            </div>
          </div>
          <Toggle checked={a.hideConfigsList === true} onChange={() => update({ hideConfigsList: !a.hideConfigsList })} label="مخفی‌کردن کانفیگ‌ها" />
        </div>
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2"><Sliders size={15} style={{ color: "var(--accent-2)" }} /> سفارشی‌سازی پیشرفته</div>
        <Field label="متن پاورقی سفارشی" hint="اگر خالی بگذارید، چیزی نمایش داده نمی‌شود.">
          <input className="fx-input" value={a.customFooterText || ""} onChange={(e) => update({ customFooterText: e.target.value })} placeholder="پشتیبانی ۲۴ ساعته" />
        </Field>
        <Field label="CSS سفارشی" hint="برای کاربران حرفه‌ای — مستقیم به صفحه‌ی اشتراک تزریق می‌شود.">
          <textarea className="fx-input" dir="ltr" rows={4} value={a.customCss || ""} onChange={(e) => update({ customCss: e.target.value })}
            placeholder=".my-class { color: red; }" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 }} />
        </Field>
      </div>

      <InfoBox tone="warn">تنظیمات این بخش مستقیم روی ظاهر صفحه‌ی همه‌ی مشتری‌ها اثر می‌گذارد. بعد از تغییر، حتماً یک‌بار خودتان صفحه‌ی اشتراک را باز کنید.</InfoBox>
    </div>
  );
}

/* ===================== مدیریت واسطه‌ها (White-Label) ===================== */

function ResellersSection({ config, setConfig, requestDelete, password }) {
  const resellers = config.resellers || [];
  const [expanded, setExpanded] = useState(null);
  const [tplOptions, setTplOptions] = useState([]);
  const [palOptions, setPalOptions] = useState([]);

  // ساختارها و پالت‌ها برای انتخاب قالب اختصاصی هر واسطه
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/themes`, { headers: { "X-Admin-Password": password } });
        if (res.ok) {
          const d = await res.json();
          setTplOptions(d.templates || []);
          setPalOptions([...(d.palettes || []), ...(d.customPalettes || [])]);
        }
      } catch { /* بی‌صدا */ }
    })();
  }, [password]);

  const update = (i, patch) => {
    const l = [...resellers]; l[i] = { ...l[i], ...patch };
    setConfig({ ...config, resellers: l });
  };
  const updateOverride = (i, path, value) => {
    const l = [...resellers];
    const ov = { ...(l[i].overrides || {}) };
    ov[path[0]] = { ...(ov[path[0]] || {}), [path[1]]: value };
    l[i] = { ...l[i], overrides: ov };
    setConfig({ ...config, resellers: l });
  };
  const add = () => {
    const id = `reseller-${Date.now()}`;
    setConfig({
      ...config,
      resellers: [...resellers, {
        id, name: "واسطه جدید", enabled: true, emailPrefix: "", domains: [],
        overrides: {
          links: { supportUsername: "", channelUsername: "" },
          advanced: { brandName: "", pageTitle: "", accentColor: "#2B7FD6", accentColor2: "#5AA9E6" },
        },
      }],
    });
    setExpanded(resellers.length);
  };

  return (
    <div className="fx-anim">
      <SectionHead
        title="واسطه‌ها (فروش با برند اختصاصی)"
        desc="برای هر واسطه، برند و لینک‌های اختصاصی تعریف کنید — روی همین سرور، بدون نیاز به سرور یا پنل جدید."
      />

      <div className="mb-4">
        <InfoBox>
          <b>چطور کار می‌کند؟</b> صفحه‌ی اشتراک تشخیص می‌دهد مشتری متعلق به کدام واسطه است و برند همان واسطه را نمایش می‌دهد.
          هر چیزی که برای واسطه تعریف نکنید (مثل اپ‌های دانلود، سوالات متداول، بنرها) خودکار از تنظیمات اصلی شما به ارث می‌رسد.
          <br /><br />
          <b>دو روش تشخیص:</b>
          <br />
          ۱. <b>پیشوند ایمیل</b> — کافی است در پنل 3x-ui، ایمیل مشتریان آن واسطه را با پیشوند بسازید (مثلاً <span dir="ltr" style={{ fontFamily: "'JetBrains Mono',monospace" }}>macan_ali@nexora</span>)
          <br />
          ۲. <b>دامنه اختصاصی</b> — واسطه یک دامنه می‌خرد و به IP همین سرور اشاره می‌دهد (کاملاً white-label)
        </InfoBox>
      </div>

      <div className="flex flex-col gap-3">
        {resellers.length === 0 && <EmptyState icon={Users} text="هنوز واسطه‌ای اضافه نشده" />}

        {resellers.map((r, i) => {
          const isOpen = expanded === i;
          const ov = r.overrides || {};
          const advOv = ov.advanced || {};
          const linksOv = ov.links || {};
          return (
            <div key={r.id || i} className={`fx-card ${r.enabled === false ? "" : ""}`} style={{ opacity: r.enabled === false ? 0.6 : 1 }}>
              {/* سربرگ */}
              <div className="flex items-center justify-between gap-2 p-4">
                <button onClick={() => setExpanded(isOpen ? null : i)} className="flex items-center gap-3 min-w-0 flex-1 text-right">
                  <div className="fx-ico" style={{ background: `linear-gradient(135deg, ${advOv.accentColor || "#2B7FD6"}, ${advOv.accentColor2 || "#5AA9E6"})` }}>
                    <span className="font-bold text-[15px]" style={{ color: "#06090F", fontFamily: "'Chakra Petch',sans-serif" }}>
                      {(advOv.brandName || r.name || "?").trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">{r.name || "بدون نام"}</div>
                    <div className="text-[10.5px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                      {r.emailPrefix ? `پیشوند: ${r.emailPrefix}_` : ""}
                      {r.emailPrefix && r.domains?.length ? " · " : ""}
                      {r.domains?.length ? r.domains.join(", ") : ""}
                      {!r.emailPrefix && !r.domains?.length ? "هنوز تنظیم نشده" : ""}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={r.enabled !== false} onChange={() => update(i, { enabled: !(r.enabled !== false) })} label="فعال" />
                  <button onClick={() => requestDelete({ type: "reseller", idx: i, name: r.name })} className="fx-ico-btn"><Trash2 size={15} /></button>
                </div>
              </div>

              {/* بدنه */}
              {isOpen && (
                <div className="px-4 pb-4 fx-fade" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="pt-4">
                    <Field label="نام واسطه (فقط برای خودتان، به مشتری نمایش داده نمی‌شود)">
                      <input className="fx-input" value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="مثلاً: ماکان" />
                    </Field>

                    <div className="text-[12px] font-semibold text-white mt-4 mb-2.5 flex items-center gap-2">
                      <Search size={13} style={{ color: "var(--accent-2)" }} /> روش تشخیص مشتریان این واسطه
                    </div>

                    <div className="fx-g3 grid grid-cols-2 gap-3">
                      <Field label="پیشوند ایمیل" hint={r.emailPrefix ? `ایمیل مشتریان باید این‌طور باشد: ${r.emailPrefix}_نام@دامنه` : "مثلاً: macan"}>
                        <input className="fx-input" dir="ltr" value={r.emailPrefix || ""} onChange={(e) => update(i, { emailPrefix: e.target.value.trim() })} placeholder="macan" />
                      </Field>
                      <Field label="دامنه‌های اختصاصی" hint="با کاما جدا کنید. باید به IP همین سرور اشاره کنند.">
                        <input className="fx-input" dir="ltr" value={(r.domains || []).join(", ")}
                          onChange={(e) => update(i, { domains: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                          placeholder="macanvpn.ir" />
                      </Field>
                    </div>

                    <div className="text-[12px] font-semibold text-white mt-4 mb-2.5 flex items-center gap-2">
                      <Palette size={13} style={{ color: "var(--accent-2)" }} /> برند اختصاصی واسطه
                    </div>

                    <div className="fx-g3 grid grid-cols-2 gap-3">
                      <Field label="نام برند"><input className="fx-input" value={advOv.brandName || ""} onChange={(e) => updateOverride(i, ["advanced", "brandName"], e.target.value)} placeholder="MACAN" /></Field>
                      <Field label="عنوان صفحه"><input className="fx-input" value={advOv.pageTitle || ""} onChange={(e) => updateOverride(i, ["advanced", "pageTitle"], e.target.value)} placeholder="ماکان | اشتراک" /></Field>
                    </div>

                    <div className="fx-g3 grid grid-cols-2 gap-3">
                      <Field label="یوزرنیم پشتیبانی واسطه" hint="بدون @">
                        <input className="fx-input" dir="ltr" value={linksOv.supportUsername || ""} onChange={(e) => updateOverride(i, ["links", "supportUsername"], e.target.value)} placeholder="macan_support" />
                      </Field>
                      <Field label="یوزرنیم کانال واسطه" hint="بدون @">
                        <input className="fx-input" dir="ltr" value={linksOv.channelUsername || ""} onChange={(e) => updateOverride(i, ["links", "channelUsername"], e.target.value)} placeholder="macanvpn" />
                      </Field>
                    </div>

                    <div className="fx-g3 grid grid-cols-2 gap-3">
                      <Field label="رنگ اصلی">
                        <div className="flex items-center gap-2">
                          <input type="color" value={advOv.accentColor || "#2B7FD6"} onChange={(e) => updateOverride(i, ["advanced", "accentColor"], e.target.value)}
                            className="w-11 h-11 rounded-xl cursor-pointer shrink-0" style={{ background: "transparent", border: "1px solid var(--border-2)" }} />
                          <input className="fx-input" dir="ltr" value={advOv.accentColor || ""} onChange={(e) => updateOverride(i, ["advanced", "accentColor"], e.target.value)} />
                        </div>
                      </Field>
                      <Field label="رنگ ثانویه">
                        <div className="flex items-center gap-2">
                          <input type="color" value={advOv.accentColor2 || "#5AA9E6"} onChange={(e) => updateOverride(i, ["advanced", "accentColor2"], e.target.value)}
                            className="w-11 h-11 rounded-xl cursor-pointer shrink-0" style={{ background: "transparent", border: "1px solid var(--border-2)" }} />
                          <input className="fx-input" dir="ltr" value={advOv.accentColor2 || ""} onChange={(e) => updateOverride(i, ["advanced", "accentColor2"], e.target.value)} />
                        </div>
                      </Field>
                    </div>

                    <Field label="متن پاورقی اختصاصی (اختیاری)">
                      <input className="fx-input" value={advOv.customFooterText || ""} onChange={(e) => updateOverride(i, ["advanced", "customFooterText"], e.target.value)} placeholder="پشتیبانی ۲۴ ساعته ماکان" />
                    </Field>

                    <div className="text-[12px] font-semibold text-white mt-4 mb-2.5 flex items-center gap-2">
                      <Layers size={13} style={{ color: "var(--accent-2)" }} /> قالب اختصاصی
                    </div>
                    <div className="fx-g3 grid grid-cols-2 gap-3">
                      <Field label="ساختار" hint="خالی = ساختار اصلی شما">
                        <select className="fx-input" value={r.overrides?.template || ""}
                          onChange={(e) => {
                            const l = [...resellers];
                            const ov = { ...(l[i].overrides || {}) };
                            if (e.target.value) ov.template = e.target.value; else delete ov.template;
                            l[i] = { ...l[i], overrides: ov };
                            setConfig({ ...config, resellers: l });
                          }}>
                          <option value="">— همان ساختار اصلی —</option>
                          {tplOptions.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.fa}</option>)}
                        </select>
                      </Field>

                      <Field label="طیف رنگی" hint="خالی = پالت اصلی شما">
                        <select className="fx-input" value={r.overrides?.palette || ""}
                          onChange={(e) => {
                            const l = [...resellers];
                            const ov = { ...(l[i].overrides || {}) };
                            if (e.target.value) ov.palette = e.target.value; else delete ov.palette;
                            l[i] = { ...l[i], overrides: ov };
                            setConfig({ ...config, resellers: l });
                          }}>
                          <option value="">— همان پالت اصلی —</option>
                          {palOptions.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.fa}</option>)}
                        </select>
                      </Field>
                    </div>

                    {(r.overrides?.template || r.overrides?.palette) && (() => {
                      const pv = palOptions.find((p) => p.id === (r.overrides?.palette))?.vars;
                      const tid = r.overrides?.template || config.template || "classic";
                      return (
                        <div className="flex items-center gap-3 rounded-xl p-3 mt-1"
                          style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                          <div style={{ width: 96, flexShrink: 0 }}>
                            <TemplateThumb id={tid} vars={pv || {}} active />
                          </div>
                          <div className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                            ترکیب این واسطه:{" "}
                            <b style={{ color: "var(--text)" }}>
                              {tplOptions.find((t) => t.id === tid)?.name || tid}
                            </b>
                            {" × "}
                            <b style={{ color: pv?.accent2 || "var(--accent-2)" }}>
                              {palOptions.find((p) => p.id === r.overrides?.palette)?.name || "پالت اصلی"}
                            </b>
                          </div>
                        </div>
                      );
                    })()}

                    {/* تست زنده */}
                    {(r.emailPrefix || r.domains?.length > 0) && (
                      <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                        <div className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>تست تشخیص این واسطه:</div>
                        <div className="flex flex-wrap gap-2">
                          {r.emailPrefix && (
                            <a href={`${API_URL}/api/public/config?email=${r.emailPrefix}_test@nexora`} target="_blank" rel="noreferrer"
                              className="text-[10.5px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(43,127,214,.1)", color: "var(--accent-2)" }}>
                              <ExternalLink size={10} /> تست با ایمیل
                            </a>
                          )}
                          {r.domains?.[0] && (
                            <a href={`${API_URL}/api/public/config?host=${r.domains[0]}`} target="_blank" rel="noreferrer"
                              className="text-[10.5px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(43,127,214,.1)", color: "var(--accent-2)" }}>
                              <ExternalLink size={10} /> تست با دامنه
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={add} className="fx-btn-dash flex items-center justify-center gap-2 py-3.5 text-[12.5px]">
          <UserPlus size={15} /> افزودن واسطه جدید
        </button>
      </div>

      <div className="mt-4">
        <InfoBox tone="warn">
          <b>نکته‌ی مهم امنیتی:</b> لیست واسطه‌ها هرگز در پاسخ عمومی API فرستاده نمی‌شود — مشتری هیچ راهی برای دیدن این‌که چند واسطه دارید یا مشخصاتشان چیست ندارد.
        </InfoBox>
      </div>
    </div>
  );
}

/* ===================== پشتیبان‌گیری و بازیابی ===================== */

function BackupCard({ password, onRestored }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const exportConfig = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/export`, { headers: { "X-Admin-Password": password } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: "ok", text: "فایل پشتیبان دانلود شد" });
    } catch {
      setMsg({ type: "error", text: "دریافت پشتیبان ناموفق بود" });
    } finally { setBusy(false); }
  };

  const importConfig = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("تنظیمات فعلی با محتوای این فایل جایگزین می‌شود. مطمئن هستید؟")) {
      e.target.value = ""; return;
    }
    setBusy(true); setMsg(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch(`${API_URL}/api/admin/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "تنظیمات بازیابی شد" });
        onRestored();
      } else {
        setMsg({ type: "error", text: data.detail || "بازیابی ناموفق بود" });
      }
    } catch {
      setMsg({ type: "error", text: "فایل معتبر نیست" });
    } finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <div className="fx-card p-5 mb-4">
      <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
        <Download size={15} style={{ color: "var(--accent-2)" }} /> پشتیبان‌گیری و بازیابی
      </div>
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
        قبل از هر تغییر بزرگ، یک نسخه پشتیبان بگیرید. هنگام بازیابی، از نسخه‌ی فعلی خودکار یک کپی روی سرور نگه داشته می‌شود.
      </p>

      {msg && (
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2 text-[11.5px]"
          style={{
            background: msg.type === "error" ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
            border: `1px solid ${msg.type === "error" ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`,
            color: msg.type === "error" ? "var(--danger)" : "var(--ok)",
          }}>
          {msg.type === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {msg.text}
        </div>
      )}

      <div className="fx-g3 grid grid-cols-2 gap-3">
        <button onClick={exportConfig} disabled={busy} className="fx-btn-g flex items-center justify-center gap-2 py-3 text-[12px]">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} دریافت پشتیبان
        </button>
        <label className="fx-btn-g flex items-center justify-center gap-2 py-3 text-[12px] cursor-pointer">
          <Upload size={14} /> بازیابی از فایل
          <input type="file" accept="application/json" onChange={importConfig} className="hidden" disabled={busy} />
        </label>
      </div>
    </div>
  );
}

/* ===================== تغییر رمز عبور ===================== */

function ChangePasswordCard({ password, onPasswordChanged }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const strength = (() => {
    if (!next) return { level: 0, label: "", color: "var(--muted)" };
    let s = 0;
    if (next.length >= 8) s++;
    if (next.length >= 12) s++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) s++;
    if (/\d/.test(next)) s++;
    if (/[^A-Za-z0-9]/.test(next)) s++;
    const map = [
      { label: "خیلی ضعیف", color: "var(--danger)" },
      { label: "ضعیف", color: "var(--danger)" },
      { label: "متوسط", color: "var(--warn)" },
      { label: "خوب", color: "#84CC16" },
      { label: "قوی", color: "var(--ok)" },
      { label: "خیلی قوی", color: "var(--ok)" },
    ];
    return { level: s, ...map[s] };
  })();

  const submit = async () => {
    setMsg(null);
    if (next !== confirm) { setMsg({ type: "error", text: "رمز جدید و تکرار آن یکسان نیستند" }); return; }
    if (next.length < 8) { setMsg({ type: "error", text: "رمز جدید باید حداقل ۸ کاراکتر باشد" }); return; }

    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "رمز عبور با موفقیت تغییر کرد" });
        setCurrent(""); setNext(""); setConfirm("");
        onPasswordChanged(next);
      } else {
        setMsg({ type: "error", text: data.detail || "تغییر رمز ناموفق بود" });
      }
    } catch {
      setMsg({ type: "error", text: "اتصال به سرور برقرار نشد" });
    } finally { setBusy(false); }
  };

  return (
    <div className="fx-card p-5 mb-4">
      <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
        <Key size={15} style={{ color: "var(--accent-2)" }} /> تغییر رمز عبور
      </div>
      <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
        رمز جدید بلافاصله فعال می‌شود و در فایل امن روی سرور ذخیره می‌گردد.
      </p>

      <Field label="رمز عبور فعلی">
        <input className="fx-input" type={show ? "text" : "password"} value={current}
          onChange={(e) => setCurrent(e.target.value)} dir="ltr"
          style={{ fontFamily: "'JetBrains Mono',monospace" }} />
      </Field>

      <Field label="رمز عبور جدید" hint="حداقل ۸ کاراکتر — ترکیب حروف بزرگ/کوچک، عدد و علامت امن‌تر است">
        <input className="fx-input" type={show ? "text" : "password"} value={next}
          onChange={(e) => setNext(e.target.value)} dir="ltr"
          style={{ fontFamily: "'JetBrains Mono',monospace" }} />
      </Field>

      {next && (
        <div className="mb-3 -mt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all"
                style={{ background: i < strength.level ? strength.color : "rgba(255,255,255,.07)" }} />
            ))}
          </div>
          <span className="text-[10.5px]" style={{ color: strength.color }}>قدرت رمز: {strength.label}</span>
        </div>
      )}

      <Field label="تکرار رمز جدید">
        <input className="fx-input" type={show ? "text" : "password"} value={confirm}
          onChange={(e) => setConfirm(e.target.value)} dir="ltr"
          style={{ fontFamily: "'JetBrains Mono',monospace",
                   borderColor: confirm && next !== confirm ? "var(--danger)" : undefined }} />
      </Field>

      <label className="flex items-center gap-2 text-[11.5px] mb-4 cursor-pointer" style={{ color: "var(--dim)" }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)}
          style={{ accentColor: "var(--accent)" }} />
        نمایش رمزها
      </label>

      {msg && (
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2 text-[11.5px]"
          style={{
            background: msg.type === "error" ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
            border: `1px solid ${msg.type === "error" ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`,
            color: msg.type === "error" ? "var(--danger)" : "var(--ok)",
          }}>
          {msg.type === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {msg.text}
        </div>
      )}

      <button onClick={submit} disabled={busy || !current || !next || !confirm}
        className="fx-btn w-full py-3 text-[12.5px] flex items-center justify-center gap-2">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
        {busy ? "در حال تغییر..." : "تغییر رمز عبور"}
      </button>
    </div>
  );
}

/* ===================== پاپ‌آپ راهنما ===================== */

function PopupSection({ config, setConfig }) {
  const p = config.popup || {};
  const update = (patch) => setConfig({ ...config, popup: { ...p, ...patch } });
  const EMOJIS = ["🔔", "💡", "⚠️", "🚀", "❓", "📱", "🎁", "⚡"];

  return (
    <div className="fx-g2 grid gap-6 fx-anim" style={{ gridTemplateColumns: "1fr 300px" }}>
      <div className="min-w-0">
        <SectionHead title="پاپ‌آپ راهنما" desc="پیامی که چند ثانیه بعد از باز شدن صفحه‌ی اشتراک به مشتری نمایش داده می‌شود." />

        <div className="fx-card p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="fx-ico" style={{ background: "rgba(43,127,214,.12)" }}><MessageSquare size={16} style={{ color: "var(--accent-2)" }} /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white">نمایش پاپ‌آپ</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>اگر خاموش کنید، هیچ پاپ‌آپی نمایش داده نمی‌شود</div>
              </div>
            </div>
            <Toggle checked={p.enabled !== false} onChange={() => update({ enabled: !(p.enabled !== false) })} label="پاپ‌آپ" />
          </div>
        </div>

        <div style={{ opacity: p.enabled !== false ? 1 : 0.45, pointerEvents: p.enabled !== false ? "auto" : "none" }}>
          <div className="fx-card p-5 mb-4">
            <div className="text-[13px] font-semibold text-white mb-4">محتوای پیام</div>

            <Field label="آیکون">
              <div className="flex items-center gap-2 flex-wrap">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => update({ icon: e })}
                    className="w-11 h-11 rounded-xl text-[19px] transition-all"
                    style={p.icon === e
                      ? { background: "var(--accent-soft)", border: "1px solid var(--accent)" }
                      : { background: "var(--surface-3)", border: "1px solid var(--border-2)" }}>
                    {e}
                  </button>
                ))}
                <input className="fx-input" style={{ width: 80, textAlign: "center", fontSize: 17 }}
                  value={p.icon || ""} onChange={(e) => update({ icon: e.target.value })} maxLength={4} />
              </div>
            </Field>

            <Field label="عنوان پیام">
              <input className="fx-input" value={p.title || ""} onChange={(e) => update({ title: e.target.value })}
                placeholder="آیا مشکلی در اتصال کانفیگ دارید؟" />
            </Field>

            <Field label="متن توضیحات">
              <textarea className="fx-input" rows={2} value={p.description || ""} onChange={(e) => update({ description: e.target.value })}
                placeholder="پیشنهاد می‌کنیم از برنامه‌ی Happ استفاده کنید..." />
            </Field>
          </div>

          <div className="fx-card p-5 mb-4">
            <div className="text-[13px] font-semibold text-white mb-4">دکمه‌ها</div>
            <div className="fx-g3 grid grid-cols-2 gap-3">
              <Field label="متن دکمه‌ی اصلی">
                <input className="fx-input" value={p.primaryButtonText || ""} onChange={(e) => update({ primaryButtonText: e.target.value })} placeholder="پشتیبانی" />
              </Field>
              <Field label="متن دکمه‌ی رد کردن">
                <input className="fx-input" value={p.dismissButtonText || ""} onChange={(e) => update({ dismissButtonText: e.target.value })} placeholder="خیر" />
              </Field>
            </div>
            <Field label="لینک دکمه‌ی اصلی" hint="اگر خالی بگذارید، خودکار به لینک پشتیبانی شما (یا واسطه) وصل می‌شود.">
              <input className="fx-input" dir="ltr" value={p.primaryButtonUrl || ""} onChange={(e) => update({ primaryButtonUrl: e.target.value })} placeholder="https://t.me/..." />
            </Field>
          </div>

          <div className="fx-card p-5">
            <div className="text-[13px] font-semibold text-white mb-4">زمان‌بندی</div>
            <div className="fx-g3 grid grid-cols-2 gap-4">
              <Field label="تاخیر تا نمایش" hint="چند ثانیه بعد از باز شدن صفحه ظاهر شود">
                <NumberStepper value={p.delaySeconds ?? 10} onChange={(v) => update({ delaySeconds: v })} min={0} max={60} unit="ثانیه" />
              </Field>
              <Field label="بسته شدن خودکار" hint="بعد از چند ثانیه خودش بسته شود">
                <NumberStepper value={p.autoCloseSeconds ?? 15} onChange={(v) => update({ autoCloseSeconds: v })} min={3} max={60} unit="ثانیه" />
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* پیش‌نمایش زنده پاپ‌آپ */}
      <div className="fx-hide-m">
        <div className="sticky top-24">
          <div className="flex items-center gap-1.5 text-[11px] mb-3" style={{ color: "var(--muted)" }}>
            <Eye size={13} /> پیش‌نمایش
          </div>
          <div className="rounded-2xl p-5" style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)" }}>
            <div className="rounded-2xl p-5 text-center" style={{ background: "var(--surface)", border: "1px solid rgba(90,169,230,.3)", boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
              <div className="text-[30px] mb-2">{p.icon || "🔔"}</div>
              <div className="text-[13px] font-bold text-white mb-2 leading-relaxed">{p.title || "آیا مشکلی در اتصال دارید؟"}</div>
              <div className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--dim)" }}>{p.description || "متن توضیحات اینجا نمایش داده می‌شود"}</div>
              <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                <div className="h-full rounded-full" style={{ width: "65%", background: "var(--accent-2)" }} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 py-2 rounded-lg text-[11px]" style={{ border: "1px solid var(--border-2)", color: "var(--muted)" }}>
                  {p.dismissButtonText || "خیر"}
                </div>
                <div className="flex-1 py-2 rounded-lg text-[11px] font-bold" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#06090F" }}>
                  {p.primaryButtonText || "پشتیبانی"}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] mt-3 text-center leading-relaxed" style={{ color: "var(--muted)" }}>
            بعد از {p.delaySeconds ?? 10} ثانیه ظاهر و بعد از {p.autoCloseSeconds ?? 15} ثانیه بسته می‌شود
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== مدیریت ربات تلگرام ===================== */

function useBotApi(password) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const call = async (path, opts = {}) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "X-Admin-Password": password, ...(opts.headers || {}) },
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.detail || "خطای سرور");
    return d;
  };

  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  return { data, setData, loading, setLoading, msg, setMsg, call };
}

function BotStatusBar({ status, password, onChange, dirty, onApplied }) {
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);
  useEffect(() => { if (applied) { const t = setTimeout(() => setApplied(false), 3000); return () => clearTimeout(t); } }, [applied]);
  if (!status) return null;

  const ready = status.dbReady;
  const running = !!status.running;

  const act = async (action) => {
    setBusy(action); setErr("");
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/service/${action}`, {
        method: "POST", headers: { "X-Admin-Password": password },
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setErr(d.detail || "اجرای دستور ناموفق بود");
      onChange?.();
    } catch { setErr("اتصال به سرور برقرار نشد"); }
    finally { setBusy(null); }
  };

  const applyNow = async () => {
    setBusy("apply"); setErr("");
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/reload`, {
        method: "POST", headers: { "X-Admin-Password": password },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setApplied(true); onApplied?.(); }
      else setErr(d.detail || "اعمال ناموفق بود");
    } catch { setErr("اتصال به سرور برقرار نشد"); }
    finally { setBusy(null); }
  };

  const tone = running ? "var(--ok)" : ready ? "var(--warn)" : "var(--muted)";

  return (
    <div className="fx-card p-4 mb-4" style={{ borderColor: `${running ? "rgba(52,211,153,.3)" : "rgba(251,191,36,.28)"}` }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="fx-ico" style={{ background: running ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.12)" }}>
            <Bot size={16} style={{ color: tone }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white flex items-center gap-2">
              {running ? "ربات در حال اجراست" : ready ? "ربات متوقف است" : "ربات راه‌اندازی نشده"}
              <Circle size={7} fill={tone} strokeWidth={0} />
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
              {ready
                ? `${status.stats?.users ?? 0} کاربر · ${status.stats?.plans ?? 0} پلن فعال · ${status.stats?.pendingOrders ?? 0} رسید در انتظار`
                : (status.message || "توکن را وارد و ذخیره کنید")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {ready && status.totalRevenue > 0 && (
            <span className="fx-pill" style={{ background: "rgba(52,211,153,.1)", color: "var(--ok)" }}>
              {Number(status.totalRevenue).toLocaleString("fa-IR")} تومان
            </span>
          )}
          {running ? (
            <>
              <button onClick={() => act("restart")} disabled={!!busy}
                className="fx-btn-g px-3 py-2.5 text-[11.5px] flex items-center gap-1.5">
                {busy === "restart" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                ری‌استارت
              </button>
              <button onClick={() => act("stop")} disabled={!!busy}
                className="px-3.5 py-2.5 rounded-[10px] text-[11.5px] font-semibold flex items-center gap-1.5"
                style={{ background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", color: "var(--danger)" }}>
                {busy === "stop" ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                خاموش
              </button>
            </>
          ) : (
            <button onClick={() => act("start")} disabled={!!busy}
              className="fx-btn px-4 py-2.5 text-[12px] flex items-center gap-1.5">
              {busy === "start" ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
              روشن کردن ربات
            </button>
          )}
        </div>
      </div>

      {running && dirty && (
        <div className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.28)" }}>
          <div className="flex items-start gap-2.5">
            <RefreshCw size={15} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                تغییرات ذخیره‌نشده دارید
              </div>
              <div className="text-[10.5px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                قیمت‌ها و متن‌ها به‌محض ذخیره اعمال می‌شوند. اگر توکن یا اتصال پنل را
                عوض کرده‌اید، این دکمه را بزنید.
              </div>
            </div>
          </div>
          <button onClick={applyNow} disabled={!!busy}
            className="fx-btn px-4 py-2.5 text-[12px] flex items-center gap-1.5 shrink-0">
            {busy === "apply" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            اعمال در ربات
          </button>
        </div>
      )}

      {applied && (
        <div className="mt-3 rounded-xl p-2.5 text-[11.5px] flex items-center gap-2"
          style={{ background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)", color: "var(--ok)" }}>
          <CheckCircle2 size={13} /> اعمال شد — ربات ظرف ۳۰ ثانیه همگام می‌شود
        </div>
      )}

      {err && (
        <div className="mt-3 rounded-xl p-2.5 text-[11.5px] flex items-center gap-2"
          style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", color: "var(--danger)" }}>
          <AlertTriangle size={13} /> {err}
        </div>
      )}
    </div>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  const err = msg.t === "err";
  return (
    <div className="rounded-xl p-3 mb-4 flex items-center gap-2 text-[12px]"
      style={{
        background: err ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
        border: `1px solid ${err ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`,
        color: err ? "var(--danger)" : "var(--ok)",
      }}>
      {err ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {msg.m}
    </div>
  );
}

/* ===================== ربات: اتصال و تنظیمات ===================== */

function ConnectionTest({ password, tenant }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({
          panel_url: tenant.panel_url,
          panel_user: tenant.panel_user,
          panel_pass: tenant.panel_pass,
          panel_token: tenant.panel_token,
          default_inbound: tenant.default_inbound,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, steps: [{ key: "e", title: "تست انجام نشد",
                    ok: false, detail: d.detail || "خطای سرور", hint: "" }] });
      } else {
        setResult(d);
      }
    } catch {
      setResult({ ok: false, steps: [{ key: "e", title: "اتصال به سرور برقرار نشد",
                  ok: false, detail: "", hint: "پنل در حال اجراست؟" }] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fx-card p-5 mb-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <div className="text-[13px] font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={15} style={{ color: "var(--accent-2)" }} /> تست اتصال
          </div>
          <p className="text-[11px] mt-1.5 leading-relaxed max-w-md" style={{ color: "var(--muted)" }}>
            یک کانفیگ آزمایشی می‌سازد و بلافاصله پاک می‌کند — تا مطمئن شوید
            ربات واقعاً می‌تواند برای مشتری کانفیگ بسازد، نه فقط وصل شود.
          </p>
        </div>
        <button onClick={run} disabled={busy || !tenant.panel_url}
          className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5 shrink-0"
          style={!tenant.panel_url ? { opacity: 0.45, cursor: "not-allowed" } : {}}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {busy ? "در حال بررسی..." : "اجرای تست"}
        </button>
      </div>

      {!tenant.panel_url && (
        <p className="text-[11px] mt-3" style={{ color: "var(--warn)" }}>
          ابتدا آدرس پنل را وارد و ذخیره کنید.
        </p>
      )}

      {result && (
        <div className="mt-4">
          <div className="rounded-xl p-3 mb-3 flex items-center gap-2.5 text-[12.5px] font-semibold"
            style={{
              background: result.ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
              border: `1px solid ${result.ok ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
              color: result.ok ? "var(--ok)" : "var(--danger)",
            }}>
            {result.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {result.ok ? "همه‌چیز آماده است — ربات می‌تواند کانفیگ بسازد"
                       : "یک مرحله ناموفق بود"}
          </div>

          {(result.steps || []).map((s, i) => (
            <div key={i} className="flex gap-3 py-2.5"
              style={{ borderBottom: i < result.steps.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="shrink-0 mt-0.5">
                {s.ok ? <CheckCircle2 size={15} style={{ color: "var(--ok)" }} />
                      : <XCircle size={15} style={{ color: "var(--danger)" }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold"
                  style={{ color: s.ok ? "var(--text)" : "var(--danger)" }}>{s.title}</div>
                {s.detail && (
                  <div className="text-[11px] mt-1 leading-relaxed break-words" style={{ color: "var(--muted)" }}>
                    {s.detail}
                  </div>
                )}
                {s.hint && (
                  <div className="text-[11px] mt-1.5 leading-relaxed" style={{ color: "var(--warn)" }}>
                    {s.hint}
                  </div>
                )}
              </div>
            </div>
          ))}

          {result.inbounds?.length > 0 && (
            <div className="mt-4">
              <div className="text-[11.5px] mb-2" style={{ color: "var(--muted)" }}>
                inboundهای موجود — شماره‌ی مورد نظر را در تنظیمات بگذارید:
              </div>
              <div className="flex flex-wrap gap-2">
                {result.inbounds.map((ib) => (
                  <span key={ib.id} className="fx-pill"
                    style={{ background: "var(--surface-3)", color: "var(--dim)",
                             border: "1px solid var(--border-2)" }}>
                    <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>#{ib.id}</b>
                    {" "}{ib.remark || ib.protocol}
                    {ib.port ? ` · ${ib.port}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BotSection({ password, dirty }) {
  const [t, setT] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showTok, setShowTok] = useState(false);
  const [authMode, setAuthMode] = useState("token");

  const load = async () => {
    try {
      const [s, st] = await Promise.all([
        fetch(`${API_URL}/api/admin/bot/settings`, { headers: { "X-Admin-Password": password } }).then(r => r.json()),
        fetch(`${API_URL}/api/admin/bot/status`, { headers: { "X-Admin-Password": password } }).then(r => r.json()),
      ]);
      setStatus(st);
      // بک‌اند ممکن است tenant را null بدهد یا فیلدهایش ناقص باشند.
      // اینجا یک شکل کامل می‌سازیم تا هیچ‌جای رابط روی null نخورد.
      // اگر ماژول ربات در دسترس نیست، حالت خطا نشان می‌دهیم
      if (!s.ready && !s.tenant) {
        setT(null);
        if (s.error) setMsg({ t: "err", m: s.error });
        return;
      }

      const raw = s.tenant || {};
      const tn = {
        name: "Nexora",
        bot_username: "", owner_tg_id: "", panel_url: "", panel_user: "",
        default_inbound: "", admin_group_id: "",
        ...raw,
        settings: (raw.settings && typeof raw.settings === "object" && !Array.isArray(raw.settings))
          ? raw.settings : {},
        topics: (raw.topics && typeof raw.topics === "object" && !Array.isArray(raw.topics))
          ? raw.topics : {},
      };
      setT(tn);
      // اگر قبلاً با یوزر/رمز تنظیم شده بود، همان حالت را نشان بده
      if (tn.panel_user && !tn.panel_token_set) setAuthMode("login");
      if (s.error) setMsg({ t: "err", m: s.error });
    } catch { setMsg({ t: "err", m: "اتصال به سرور برقرار نشد" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const x = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(x); } }, [msg]);

  const up = (patch) => setT({ ...t, ...patch });
  const upS = (patch) => setT({ ...t, settings: { ...(t.settings || {}), ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify(t),
      });
      const d = await res.json();
      if (res.ok) { setMsg({ t: "ok", m: "تنظیمات ربات ذخیره شد" }); load(); }
      else setMsg({ t: "err", m: d.detail || "ذخیره ناموفق بود" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  // اگر به هر دلیلی tenant ساخته نشد، به‌جای صفحه‌ی سفید یک پیام
  // با راه‌حل نشان می‌دهیم.
  if (!t) {
    return (
      <div className="fx-anim">
        <SectionHead title="اتصال و تنظیمات ربات" desc="" />
        <div className="fx-card p-8 text-center" style={{ borderStyle: "dashed" }}>
          <AlertTriangle size={24} style={{ color: "var(--warn)" }} className="mx-auto mb-3" />
          <div className="text-[13.5px] font-semibold text-white mb-2">
            تنظیمات ربات خوانده نشد
          </div>
          <p className="text-[11.5px] mb-5 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            {msg?.m || "ماژول ربات ممکن است نصب نشده باشد."}
          </p>
          <button onClick={() => { setLoading(true); load(); }}
            className="fx-btn px-5 py-2.5 text-[12.5px] inline-flex items-center gap-2">
            <RefreshCw size={14} /> تلاش دوباره
          </button>
          <div className="text-[11px] mt-5 pt-4" style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
            اگر ادامه داشت، روی سرور اجرا کنید:{" "}
            <code dir="ltr" className="px-2 py-1 rounded-md"
              style={{ background: "var(--surface-3)", color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
              nexora doctor
            </code>
          </div>
        </div>
      </div>
    );
  }

  const s = (t.settings && typeof t.settings === "object" && !Array.isArray(t.settings))
    ? t.settings : {};
  const cards = Array.isArray(s.cards) ? s.cards : [];

  return (
    <div className="fx-anim">
      <SectionHead title="اتصال و تنظیمات ربات"
        desc="توکن ربات، اتصال به پنل 3x-ui، گروه مدیریت و شماره کارت‌ها."
        action={
          <button onClick={save} disabled={saving} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} ذخیره
          </button>
        } />

      <BotStatusBar status={status} password={password} onChange={load} dirty={dirty} />
      <Msg msg={msg} />

      {/* توکن ربات */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
          <Bot size={15} style={{ color: "var(--accent-2)" }} /> ربات تلگرام
        </div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
          توکن را از <span dir="ltr">@BotFather</span> بگیرید.
        </p>

        <div className="fx-g3 grid grid-cols-2 gap-3">
          <Field label="نام کسب‌وکار">
            <input className="fx-input" value={t.name || ""} onChange={(e) => up({ name: e.target.value })} placeholder="Nexora" />
          </Field>
          <Field label="یوزرنیم ربات" hint="بدون @">
            <input className="fx-input" dir="ltr" value={t.bot_username || ""} onChange={(e) => up({ bot_username: e.target.value })} placeholder="NexoraVpnBot" />
          </Field>
        </div>

        <Field label="توکن ربات" hint={t.bot_token_set ? "توکن ذخیره شده — برای تغییر، مقدار جدید وارد کنید" : "الزامی"}>
          <div className="flex gap-2">
            <input className="fx-input" dir="ltr" type={showTok ? "text" : "password"}
              value={t.bot_token || ""} onChange={(e) => up({ bot_token: e.target.value })}
              placeholder="123456:AAE..." style={{ fontFamily: "'JetBrains Mono',monospace" }} />
            <button onClick={() => setShowTok(!showTok)} className="fx-btn-g px-3 shrink-0">
              <Eye size={14} />
            </button>
          </div>
        </Field>

        <Field label="آیدی عددی ادمین اصلی" hint="از @userinfobot بگیرید">
          <input className="fx-input" dir="ltr" value={t.owner_tg_id || ""}
            onChange={(e) => up({ owner_tg_id: e.target.value })} placeholder="123456789"
            style={{ fontFamily: "'JetBrains Mono',monospace" }} />
        </Field>
      </div>

      {/* اتصال به پنل */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
          <Server size={15} style={{ color: "var(--accent-2)" }} /> اتصال به پنل 3x-ui
        </div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
          ربات از این اتصال برای ساخت خودکار کانفیگ استفاده می‌کند.
        </p>

        <Field label="آدرس پنل" hint="با پورت و مسیر، مثلاً https://panel.site.com:2053/abc">
          <input className="fx-input" dir="ltr" value={t.panel_url || ""}
            onChange={(e) => up({ panel_url: e.target.value })} placeholder="https://panel.example.com:2053/path" />
        </Field>

        <div className="flex gap-2 mb-4">
          {[["token", "توکن API", ShieldCheck, "امن‌تر"], ["login", "نام کاربری و رمز", Key, ""]].map(([k, l, Ico, tag]) => (
            <button key={k} onClick={() => setAuthMode(k)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-semibold transition-all"
              style={authMode === k
                ? { background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#06090F" }
                : { background: "var(--surface-3)", border: "1px solid var(--border-2)", color: "var(--muted)" }}>
              <Ico size={14} /> {l}
              {tag && authMode === k && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,.18)" }}>{tag}</span>
              )}
            </button>
          ))}
        </div>

        {authMode === "token" ? (
          <>
            <Field label="توکن API پنل" hint={t.panel_token_set ? "ذخیره شده — برای تغییر مقدار جدید وارد کنید" : "از پنل: Settings → Security → API Token"}>
              <input className="fx-input" dir="ltr" type="password" value={t.panel_token || ""}
                onChange={(e) => up({ panel_token: e.target.value })}
                placeholder="توکن را از پنل 3x-ui کپی کنید"
                style={{ fontFamily: "'JetBrains Mono',monospace" }} />
            </Field>
            <InfoBox>
              <b>چرا توکن بهتر است؟</b> رمز پنل دسترسی کامل می‌دهد و اگر لو برود
              باید کل رمز را عوض کنید. توکن را می‌توانید هر لحظه از پنل باطل کنید
              بدون این‌که چیز دیگری تغییر کند.
            </InfoBox>
          </>
        ) : (
          <div className="fx-g3 grid grid-cols-2 gap-3">
            <Field label="نام کاربری پنل">
              <input className="fx-input" dir="ltr" value={t.panel_user || ""} onChange={(e) => up({ panel_user: e.target.value })} />
            </Field>
            <Field label="رمز پنل" hint={t.panel_pass_set ? "ذخیره شده" : ""}>
              <input className="fx-input" dir="ltr" type="password" value={t.panel_pass || ""}
                onChange={(e) => up({ panel_pass: e.target.value })} />
            </Field>
          </div>
        )}

        <Field label="شناسه inbound پیش‌فرض" hint="عدد inbound که کانفیگ‌ها در آن ساخته شوند">
          <input className="fx-input" dir="ltr" value={t.default_inbound || ""}
            onChange={(e) => up({ default_inbound: e.target.value })} placeholder="1"
            style={{ fontFamily: "'JetBrains Mono',monospace" }} />
        </Field>
      </div>

      <ConnectionTest password={password} tenant={t} />

      {/* گروه مدیریت */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
          <Users size={15} style={{ color: "var(--accent-2)" }} /> گروه مدیریت
        </div>
        <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
          یک سوپرگروه خصوصی بسازید، تاپیک‌ها را فعال کنید، ربات را ادمین کنید و آیدی گروه را اینجا بگذارید.
          ربات خودش تاپیک‌های لازم را می‌سازد.
        </p>
        <Field label="آیدی گروه" hint="معمولاً با -100 شروع می‌شود">
          <input className="fx-input" dir="ltr" value={t.admin_group_id || ""}
            onChange={(e) => up({ admin_group_id: e.target.value })} placeholder="-1001234567890"
            style={{ fontFamily: "'JetBrains Mono',monospace" }} />
        </Field>
      </div>

      {/* کارت‌های بانکی */}
      <div className="fx-card p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-[13px] font-semibold text-white flex items-center gap-2">
            <CreditCard size={15} style={{ color: "var(--accent-2)" }} /> شماره کارت‌ها
          </div>
          <button onClick={() => upS({ cards: [...cards, { number: "", holder: "", bank: "", active: true }] })}
            className="fx-btn-g px-3 py-2 text-[11.5px] flex items-center gap-1.5">
            <PlusIcon size={13} /> افزودن کارت
          </button>
        </div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
          اگر چند کارت فعال باشد، ربات به‌صورت چرخشی از آن‌ها استفاده می‌کند.
        </p>

        {cards.length === 0 && (
          <div className="text-center py-6 text-[11.5px]" style={{ color: "var(--muted)" }}>
            هنوز کارتی اضافه نشده — بدون کارت، پرداخت کار نمی‌کند
          </div>
        )}

        {cards.map((cd, i) => (
          <div key={i} className="fx-card p-4 mb-3" style={{ background: "var(--surface-3)" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <Toggle checked={cd.active !== false}
                onChange={() => { const l = [...cards]; l[i] = { ...cd, active: !(cd.active !== false) }; upS({ cards: l }); }}
                label="فعال" />
              <button onClick={() => upS({ cards: cards.filter((_, x) => x !== i) })}
                className="fx-ico-btn" style={{ width: 28, height: 28 }}><Trash2 size={13} /></button>
            </div>
            <Field label="شماره کارت">
              <input className="fx-input" dir="ltr" value={cd.number || ""}
                onChange={(e) => { const l = [...cards]; l[i] = { ...cd, number: e.target.value }; upS({ cards: l }); }}
                placeholder="6037997512345678" style={{ fontFamily: "'JetBrains Mono',monospace" }} />
            </Field>
            <div className="fx-g3 grid grid-cols-2 gap-3">
              <Field label="به نام">
                <input className="fx-input" value={cd.holder || ""}
                  onChange={(e) => { const l = [...cards]; l[i] = { ...cd, holder: e.target.value }; upS({ cards: l }); }}
                  placeholder="علی محمدی" />
              </Field>
              <Field label="بانک">
                <input className="fx-input" value={cd.bank || ""}
                  onChange={(e) => { const l = [...cards]; l[i] = { ...cd, bank: e.target.value }; upS({ cards: l }); }}
                  placeholder="ملی" />
              </Field>
            </div>
          </div>
        ))}
      </div>

      {/* عضویت اجباری کانال */}
      <div className="fx-card p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Radio size={15} style={{ color: "var(--accent-2)" }} /> عضویت اجباری کانال
          </div>
          <Toggle checked={!!s.force_channel_on}
            onChange={() => upS({ force_channel_on: !s.force_channel_on })} label="فعال" />
        </div>
        <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
          اگر فعال باشد، کاربر تا در کانال عضو نشود نمی‌تواند پلن‌ها را ببیند یا تست رایگان بگیرد.
        </p>

        <div style={{ opacity: s.force_channel_on ? 1 : 0.45, pointerEvents: s.force_channel_on ? "auto" : "none" }}>
          <Field label="یوزرنیم یا لینک کانال" hint="مثلاً @yanexoravpn یا https://t.me/yanexoravpn">
            <input className="fx-input" dir="ltr" value={s.force_channel || ""}
              onChange={(e) => upS({ force_channel: e.target.value })} placeholder="@yanexoravpn" />
          </Field>

          <InfoBox tone="warn">
            <b>مهم:</b> ربات باید در کانال <b>ادمین</b> باشد، وگرنه نمی‌تواند عضویت را بررسی کند.
            اگر ربات ادمین نباشد، سیستم سخت‌گیری نمی‌کند و اجازه‌ی خرید می‌دهد —
            چون قفل‌شدن کل فروش بدتر از رد نشدن یک نفر است.
          </InfoBox>
        </div>
      </div>

      {/* راه‌اندازی */}
      <InfoBox>
        بعد از ذخیره، روی سرور این دستور را بزنید تا ربات روشن شود:
        <br />
        <code dir="ltr" className="inline-block mt-2 px-3 py-1.5 rounded-lg text-[11.5px]"
          style={{ background: "var(--surface-3)", color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
          nexora bot enable
        </code>
      </InfoBox>
    </div>
  );
}

/* ===================== قالب‌ها (ساختار × رنگ) ===================== */

// نمایش کوچک ساختار هر Template
function TemplateThumb({ id, vars, active }) {
  const v = vars || {};
  const A = active ? (v.accent || "#2B7FD6") : "#3A4453";
  const A2 = active ? (v.accent2 || "#5AA9E6") : "#2A3444";
  const bg = active ? (v.bg || "#06090F") : "#0A0E17";
  const card = active ? `${A}12` : "#141A25";
  const bar = (w, h = 3, c = "#2A3444") => ({ width: w, height: h, borderRadius: 2, background: c });

  return (
    <div style={{ background: bg, borderRadius: 10, padding: 9, height: 68, overflow: "hidden" }}>
      {id === "classic" && (
        <>
          <div style={{ background: card, borderRadius: 6, padding: 6, marginBottom: 5, display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2.5px solid ${A}`, borderRightColor: "transparent", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...bar("72%"), marginBottom: 3 }} />
              <div style={bar("46%")} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 3.5 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 9, borderRadius: 3, background: i === 0 ? A : "#1E2531" }} />)}
          </div>
        </>
      )}
      {id === "analytics" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3.5, marginBottom: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ background: card, borderRadius: 4, padding: 3.5 }}>
                <div style={{ ...bar(9, 3, i < 2 ? A : A2), marginBottom: 2.5 }} />
                <div style={bar("62%", 2.5)} />
              </div>
            ))}
          </div>
          <div style={{ background: card, borderRadius: 4, padding: 4, display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
            {[6, 11, 8, 14, 10, 6, 12].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h, borderRadius: 1, background: i === 6 ? A : `${A}55` }} />
            ))}
          </div>
        </>
      )}
      {id === "wallet" && (
        <>
          <div style={{ height: 30, borderRadius: 8, marginBottom: 6, padding: 7, background: `linear-gradient(135deg,${A},${A2})`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -10, left: -10, width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.16)" }} />
            <div style={{ ...bar(26, 6, bg), opacity: .82, marginBottom: 4 }} />
            <div style={{ ...bar(16, 3, bg), opacity: .5 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i === 0 ? A : "#1E2531" }} />
            ))}
          </div>
        </>
      )}
      {id === "console" && (
        <>
          <div style={{ background: card, borderRadius: 4, padding: 6, marginBottom: 5 }}>
            <div style={{ display: "flex", gap: 2.5, marginBottom: 5 }}>
              {["#FF5F57", "#FEBC2E", "#28C840"].map((cc, i) => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: cc, opacity: active ? .85 : .35 }} />
              ))}
            </div>
            {[0, 1].map((i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <div style={bar(20, 2.5)} />
                <div style={bar(12, 2.5, i === 1 ? A : "#2A3444")} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 1.5 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 7, borderRadius: 1, background: i < 9 ? A : `${A}2E` }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * سربرگ یک گام.
 *
 * بیرون از کامپوننت تعریف شده — اگر داخل بدنه باشد، در هر رندر
 * دوباره ساخته می‌شود و React کل زیردرختش را دور می‌ریزد. نتیجه:
 * پرش بصری و از بین رفتن انیمیشن ورود.
 */
function ThemeStep({ n, title, desc, accent, bg }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0"
        style={{
          background: accent || "var(--accent)",
          color: bg || "#06090F",
          boxShadow: `0 1px 0 rgba(255,255,255,.3) inset, 0 4px 10px -3px ${accent || "var(--accent)"}`,
        }}>{n}</div>
      <div>
        <div className="text-[13.5px] font-bold text-white leading-tight">{title}</div>
        {desc && <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{desc}</div>}
      </div>
    </div>
  );
}

function ThemesSection({ config, setConfig, password }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/themes`, { headers: { "X-Admin-Password": password } });
      if (res.ok) setData(await res.json());
    } catch { /* بی‌صدا */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  const templates = data?.templates || [];
  const palettes = [...(data?.palettes || []), ...(data?.customPalettes || [])];
  const curTpl = config.template || "classic";
  const curPal = config.palette || "ocean";
  const activePal = palettes.find((p) => p.id === curPal) || palettes[0];
  const V = activePal?.vars || {};

  const removePalette = async (id) => {
    setConfirmDel(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/palettes/${id}`, {
        method: "DELETE", headers: { "X-Admin-Password": password },
      });
      if (res.ok) { setMsg({ t: "ok", m: "پالت حذف شد" }); load(); }
      else setMsg({ t: "err", m: "حذف ناموفق بود" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
  };

  return (
    <div className="fx-anim">
      <SectionHead title="قالب صفحه اشتراک"
        desc={`ساختار و رنگ جدا هستند — ${templates.length} ساختار × ${palettes.length} پالت = ${templates.length * palettes.length} ترکیب`}
        action={
          <button onClick={() => setAddOpen(true)} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-2">
            <PlusIcon size={14} /> پالت سفارشی
          </button>
        } />

      {msg && (
        <div className="rounded-xl p-3 mb-5 flex items-center gap-2 text-[12px]"
          style={{
            background: msg.t === "err" ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
            border: `1px solid ${msg.t === "err" ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`,
            color: msg.t === "err" ? "var(--danger)" : "var(--ok)",
          }}>
          {msg.t === "err" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {msg.m}
        </div>
      )}

      {/* گام ۱ — ساختار */}
      <ThemeStep n="۱" title="ساختار قالب" desc="سبک بصری کارت‌ها و اجزای صفحه" accent={V.accent} bg={V.bg} />
      <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))" }}>
        {templates.map((t) => {
          const on = curTpl === t.id;
          return (
            <button key={t.id} onClick={() => setConfig({ ...config, template: t.id })}
              className="fx-card p-4 text-right"
              style={{
                transition: "transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease, border-color .2s ease, background .2s ease",
                ...(on ? {
                  borderColor: `${V.accent}88`,
                  background: `${V.accent}0D`,
                  transform: "translateY(-3px)",
                  boxShadow: `0 1px 0 rgba(255,255,255,.1) inset, 0 0 0 1px ${V.accent}44, 0 18px 36px -14px ${V.accent}55`,
                } : {}),
              }}>
              <div className="mb-4"><TemplateThumb id={t.id} vars={V} active={on} /></div>
              <div className="flex items-center gap-2 mb-2">
                {on && (
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    background: V.accent, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={10} style={{ color: V.bg || "#06090F" }} />
                  </div>
                )}
                <span className="text-[12.5px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{t.name}</span>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>· {t.fa}</span>
              </div>
              <div className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      {/* گام ۲ — پالت */}
      <ThemeStep n="۲" title="طیف رنگی" desc="رنگ‌بندی که روی ساختار انتخابی اعمال می‌شود" accent={V.accent} bg={V.bg} />
      <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))" }}>
        {palettes.map((p) => {
          const on = curPal === p.id;
          const pv = p.vars || {};
          return (
            <div key={p.id} className="fx-card p-3 relative"
              style={{
                transition: "transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s ease, border-color .2s ease",
                ...(on ? {
                  borderColor: `${pv.accent}99`,
                  transform: "translateY(-2px)",
                  boxShadow: `0 1px 0 rgba(255,255,255,.1) inset, 0 0 0 1px ${pv.accent}44, 0 16px 32px -14px ${pv.accent}66`,
                } : {}),
              }}>
              <button onClick={() => setConfig({ ...config, palette: p.id })} className="w-full text-right">
                <div className="rounded-xl mb-3 relative overflow-hidden" style={{
                  height: 44,
                  background: `linear-gradient(135deg,${pv.accent},${pv.accent2})`,
                  boxShadow: `0 1px 0 rgba(255,255,255,.25) inset, 0 4px 10px -3px ${pv.accent}77`,
                }}>
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent 48%, ${pv.bg}E6)` }} />
                  {on && (
                    <div style={{
                      position: "absolute", top: 7, right: 7,
                      width: 20, height: 20, borderRadius: "50%",
                      background: pv.bg, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={12} style={{ color: pv.accent }} />
                    </div>
                  )}
                </div>
                <div className="text-[11.5px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{p.name}</div>
                <div className="text-[9.5px] mt-0.5" style={{ color: "var(--muted)" }}>{p.fa}</div>
              </button>
              {p.builtin === false && (
                <button onClick={() => setConfirmDel(p)} className="fx-ico-btn absolute" style={{ width: 24, height: 24, top: 6, left: 6 }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <InfoBox>
        ترکیب فعلی: <b>{templates.find((t) => t.id === curTpl)?.name}</b> × <b>{activePal?.name}</b>
        <br />
        بعد از انتخاب، دکمه‌ی <b>«ذخیره تغییرات»</b> را بزنید، سپس در بخش
        <b> «پیش‌نمایش زنده»</b> نتیجه را ببینید. برای هر واسطه هم می‌توانید ترکیب جداگانه تعیین کنید.
      </InfoBox>

      {addOpen && <AddPaletteModal password={password} onClose={() => setAddOpen(false)}
        onAdded={(m) => { setMsg(m); load(); setAddOpen(false); }} />}

      {confirmDel && (
        <ConfirmModal title="حذف پالت؟"
          desc={`پالت «${confirmDel.name}» حذف می‌شود. اگر جایی استفاده شده باشد، به پالت پیش‌فرض برمی‌گردد.`}
          onConfirm={() => removePalette(confirmDel.id)} onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  );
}

function AddPaletteModal({ password, onClose, onAdded }) {
  const [name, setName] = useState("");
  const [fa, setFa] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [vars, setVars] = useState({
    accent: "#2B7FD6", accent2: "#5AA9E6", bg: "#06090F",
    surface: "#0D1420", surfaceAlt: "#0A0E17",
    border: "rgba(255,255,255,0.06)", text: "#E8EEF7", textMuted: "#5A6880",
  });
  const [preview, setPreview] = useState("classic");

  const setVar = (k, v) => setVars({ ...vars, [k]: v });

  const submit = async () => {
    setErr("");
    if (!name.trim()) { setErr("نام پالت را وارد کنید"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/palettes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ name, fa: fa || name, vars }),
      });
      const d = await res.json();
      if (res.ok) onAdded({ t: "ok", m: `پالت «${name}» اضافه شد` });
      else setErr(d.detail || "افزودن ناموفق بود");
    } catch { setErr("اتصال به سرور برقرار نشد"); }
    finally { setBusy(false); }
  };

  const COLORS = [
    ["accent", "رنگ اصلی"], ["accent2", "رنگ ثانویه"],
    ["bg", "پس‌زمینه"], ["surface", "کارت‌ها"], ["text", "متن"],
  ];

  return createPortal(
    <div className="nx-modal-wrap fx-fade"
      style={{ background: "rgba(3,6,12,.82)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="max-w-2xl rounded-2xl fx-scale nx-modal" onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid rgba(90,169,230,.3)" }}>

        <div className="nx-modal-head p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PaletteIcon size={17} style={{ color: "var(--accent-2)" }} />
              <span className="text-[14.5px] font-bold text-white">پالت رنگی سفارشی</span>
            </div>
            <button onClick={onClose} className="fx-ico-btn"><X size={16} /></button>
          </div>
        </div>

        <div className="nx-modal-body p-5">
          <div className="fx-g3 grid grid-cols-2 gap-3">
            <Field label="نام پالت (انگلیسی)">
              <input className="fx-input" dir="ltr" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunset" />
            </Field>
            <Field label="نام فارسی">
              <input className="fx-input" value={fa} onChange={(e) => setFa(e.target.value)} placeholder="غروب" />
            </Field>
          </div>

          <div className="text-[12px] font-semibold text-white mt-4 mb-2.5">رنگ‌ها</div>
          <div className="fx-g3 grid grid-cols-2 gap-3">
            {COLORS.map(([k, l]) => (
              <Field key={k} label={l}>
                <div className="flex items-center gap-2">
                  <input type="color" value={vars[k]} onChange={(e) => setVar(k, e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer shrink-0"
                    style={{ background: "transparent", border: "1px solid var(--border-2)" }} />
                  <input className="fx-input" dir="ltr" value={vars[k]} onChange={(e) => setVar(k, e.target.value)} />
                </div>
              </Field>
            ))}
          </div>

          <div className="text-[12px] font-semibold text-white mt-4 mb-2.5">پیش‌نمایش روی ساختارها</div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))" }}>
            {["classic", "analytics", "wallet", "console"].map((id) => (
              <button key={id} onClick={() => setPreview(id)} className="text-right p-2 rounded-xl transition-all"
                style={preview === id
                  ? { background: `${vars.accent}16`, border: `1px solid ${vars.accent}77` }
                  : { background: "var(--surface-3)", border: "1px solid var(--border-2)" }}>
                <TemplateThumb id={id} vars={vars} active={preview === id} />
                <div className="text-[10.5px] mt-1.5 font-semibold" style={{ color: preview === id ? vars.accent2 : "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {id}
                </div>
              </button>
            ))}
          </div>

          {err && (
            <div className="rounded-xl p-3 mt-4 flex items-center gap-2 text-[12px]"
              style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "var(--danger)" }}>
              <AlertTriangle size={14} /> {err}
            </div>
          )}
        </div>

        <div className="nx-modal-foot p-5 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} className="fx-btn-g flex-1 py-3 text-[12.5px]">انصراف</button>
          <button onClick={submit} disabled={busy} className="fx-btn flex-1 py-3 text-[12.5px] flex items-center justify-center gap-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <PlusIcon size={14} />} افزودن پالت
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ===================== ربات: پلن‌ها ===================== */

function BotPlansSection({ password }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/bot/plans`, { headers: { "X-Admin-Password": password } }).then(r => r.json());
      setPlans(d.plans || []);
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const x = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(x); } }, [msg]);

  const up = (i, patch) => { const l = [...plans]; l[i] = { ...l[i], ...patch }; setPlans(l); };
  const add = () => setPlans([...plans, { name: "پلن جدید", gb: 30, days: 30, ip_limit: 1, price: 150000, is_active: true }]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/plans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ plans }),
      });
      const d = await res.json();
      if (res.ok) { setMsg({ t: "ok", m: `${d.count} پلن ذخیره شد` }); load(); }
      else setMsg({ t: "err", m: d.detail || "ذخیره ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  return (
    <div className="fx-anim">
      <SectionHead title="پلن‌های فروش"
        desc="پلن‌هایی که مشتری در ربات می‌بیند. حجم صفر یعنی نامحدود."
        action={
          <div className="flex gap-2">
            <button onClick={add} className="fx-btn-g px-3 py-2.5 text-[12px] flex items-center gap-1.5"><PlusIcon size={13} /> پلن جدید</button>
            <button onClick={save} disabled={saving} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} ذخیره
            </button>
          </div>
        } />

      <Msg msg={msg} />

      {plans.length === 0 && (
        <div className="fx-card p-10 text-center" style={{ borderStyle: "dashed" }}>
          <Package size={26} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[13px] text-white mb-1">هنوز پلنی تعریف نشده</div>
          <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>
            بدون پلن، مشتری نمی‌تواند خرید کند
          </div>
        </div>
      )}

      {plans.map((p, i) => (
        <div key={i} className="fx-card p-5 mb-3">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="fx-ico" style={{ background: p.is_trial ? "rgba(52,211,153,.12)" : "rgba(43,127,214,.12)" }}>
                {p.is_trial ? <Gift size={15} style={{ color: "var(--ok)" }} /> : <Package size={15} style={{ color: "var(--accent-2)" }} />}
              </div>
              <span className="text-[13px] font-semibold text-white truncate">{p.name || "بدون نام"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Toggle checked={p.is_active !== false} onChange={() => up(i, { is_active: !(p.is_active !== false) })} label="فعال" />
              <button onClick={() => setPlans(plans.filter((_, x) => x !== i))} className="fx-ico-btn" style={{ width: 28, height: 28 }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="fx-g3 grid grid-cols-2 gap-3">
            <Field label="نام پلن">
              <input className="fx-input" value={p.name || ""} onChange={(e) => up(i, { name: e.target.value })} />
            </Field>
            <Field label="قیمت (تومان)">
              <input className="fx-input" dir="ltr" type="number" value={p.price ?? 0}
                onChange={(e) => up(i, { price: Number(e.target.value) })}
                style={{ fontFamily: "'JetBrains Mono',monospace" }} />
            </Field>
          </div>

          <div className="fx-g3 grid grid-cols-3 gap-3">
            <Field label="حجم (GB)" hint="۰ = نامحدود">
              <input className="fx-input" dir="ltr" type="number" value={p.gb ?? 0}
                onChange={(e) => up(i, { gb: Number(e.target.value) })} />
            </Field>
            <Field label="مدت (روز)" hint="۰ = بدون انقضا">
              <input className="fx-input" dir="ltr" type="number" value={p.days ?? 0}
                onChange={(e) => up(i, { days: Number(e.target.value) })} />
            </Field>
            <Field label="کاربر همزمان">
              <input className="fx-input" dir="ltr" type="number" value={p.ip_limit ?? 1}
                onChange={(e) => up(i, { ip_limit: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="توضیح کوتاه (اختیاری)">
            <input className="fx-input" value={p.description || ""}
              onChange={(e) => up(i, { description: e.target.value })} placeholder="مناسب استفاده روزمره" />
          </Field>

          <label className="flex items-center gap-2 text-[11.5px] cursor-pointer" style={{ color: "var(--dim)" }}>
            <input type="checkbox" checked={!!p.is_trial} onChange={(e) => up(i, { is_trial: e.target.checked })}
              style={{ accentColor: "var(--accent)" }} />
            این پلن، تست رایگان است (هر کاربر فقط یک‌بار)
          </label>
        </div>
      ))}
    </div>
  );
}

/* ===================== ربات: سفارش‌ها ===================== */

const REJECT_REASONS = [
  "مبلغ واریزی با مبلغ سفارش مطابقت ندارد.",
  "تصویر رسید خوانا نبود.",
  "این رسید قبلاً استفاده شده است.",
  "رسید معتبر تشخیص داده نشد.",
];

function BotOrdersSection({ password }) {
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("awaiting");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const [zoom, setZoom] = useState(null);

  const load = async (f = filter) => {
    setLoading(true);
    try {
      const d = await fetch(`${API_URL}/api/admin/bot/orders?status=${f}`, { headers: { "X-Admin-Password": password } }).then(r => r.json());
      setOrders(d.orders || []);
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(filter); }, [password, filter]);
  useEffect(() => { if (msg) { const x = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(x); } }, [msg]);

  const doReject = async () => {
    if (!reason.trim()) return;
    const id = rejecting.id;
    setRejecting(null);
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/orders/${id}/reject-with-reason`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ reason }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ t: "ok", m: "سفارش رد شد — دلیل برای مشتری فرستاده می‌شود" });
        load(filter);
      } else setMsg({ t: "err", m: d.detail || "عملیات ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setBusy(null); }
  };

  const act = async (id, action) => {
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/orders/${id}/${action}`, {
        method: "POST", headers: { "X-Admin-Password": password },
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ t: "ok", m: action === "approve" ? "تایید شد — ربات کانفیگ را می‌سازد" : "سفارش رد شد" });
        load(filter);
      } else setMsg({ t: "err", m: d.detail || "عملیات ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setBusy(null); }
  };

  const FILTERS = [
    { k: "awaiting", l: "در انتظار تایید" },
    { k: "approved", l: "تاییدشده" },
    { k: "rejected", l: "ردشده" },
    { k: "all", l: "همه" },
  ];

  return (
    <div className="fx-anim">
      <SectionHead title="سفارش‌ها و رسیدها"
        desc="رسیدهای پرداخت کارت‌به‌کارت. تایید هم از اینجا و هم از گروه تلگرام ممکن است."
        action={
          <button onClick={() => load(filter)} className="fx-btn-g px-3 py-2.5 text-[12px] flex items-center gap-1.5">
            <RefreshCw size={13} /> تازه‌سازی
          </button>
        } />

      <Msg msg={msg} />
      <Tabs items={FILTERS.map(f => ({ key: f.k, label: f.l }))} active={filter} onChange={setFilter} />

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>
      ) : orders.length === 0 ? (
        <div className="fx-card p-10 text-center" style={{ borderStyle: "dashed" }}>
          <CreditCard size={26} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {filter === "awaiting" ? "رسیدی در انتظار تایید نیست" : "موردی یافت نشد"}
          </div>
        </div>
      ) : orders.map((o) => (
        <div key={o.id} className="fx-card p-4 mb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {o.receipt_type === "photo" && (
              <button onClick={() => setZoom(o.id)}
                className="shrink-0 rounded-xl overflow-hidden relative"
                style={{ width: 84, height: 108, border: "1px solid var(--border-2)", background: "var(--surface-3)" }}
                title="بزرگ‌نمایی">
                <img src={`${API_URL}/api/admin/bot/receipt/${o.id}`}
                  alt="رسید" loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <span className="absolute bottom-1 left-1 right-1 py-0.5 rounded text-[8.5px] flex items-center justify-center gap-1"
                  style={{ background: "rgba(0,0,0,.68)", color: "#fff" }}>
                  <Search size={9} /> بزرگ‌نمایی
                </span>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-semibold text-white">{o.first_name || "بدون نام"}</span>
                {o.username && <span className="text-[11px]" dir="ltr" style={{ color: "var(--muted)" }}>@{o.username}</span>}
                <StatusPill s={o.status} />
              </div>
              <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
                مبلغ: <b style={{ color: "var(--text)" }}>{Number(o.amount || 0).toLocaleString("fa-IR")}</b> تومان
                {o.coins_used > 0 && <> · {o.coins_used} سکه ({o.discount_pct}٪ تخفیف)</>}
              </div>

              {o.receipt_type === "text" && o.receipt_text && (
                <div className="mt-2.5 rounded-xl p-3 text-[11px] leading-relaxed whitespace-pre-wrap"
                  dir="auto" style={{
                    background: "var(--surface-3)", border: "1px solid var(--border)",
                    color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace",
                    maxHeight: 130, overflowY: "auto",
                  }}>
                  {o.receipt_text}
                </div>
              )}
              <div className="text-[10.5px] mt-1.5" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                #{o.id} · {o.created_at?.slice(0, 16)}
              </div>
            </div>

            {(o.status === "awaiting" || o.status === "review") && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => act(o.id, "approve")} disabled={busy === o.id}
                  className="px-3.5 py-2.5 rounded-[10px] text-[12px] font-semibold flex items-center gap-1.5"
                  style={{ background: "rgba(52,211,153,.14)", color: "var(--ok)", border: "1px solid rgba(52,211,153,.3)" }}>
                  {busy === o.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} تایید
                </button>
                <button onClick={() => { setRejecting(o); setReason(""); }} disabled={busy === o.id}
                  className="fx-btn-g px-3.5 py-2.5 text-[12px]" style={{ color: "var(--danger)" }}>
                  رد با دلیل
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {zoom && createPortal(
        <div onClick={() => setZoom(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-6"
          style={{ background: "rgba(3,6,12,.93)", cursor: "zoom-out" }}>
          <img src={`${API_URL}/api/admin/bot/receipt/${zoom}`} alt="رسید"
            style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 14, objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoom(null)}
            className="absolute top-5 left-5 fx-ico-btn" style={{ width: 38, height: 38 }}>
            <X size={18} />
          </button>
        </div>, document.body)}

      {rejecting && createPortal(
        <div className="nx-modal-wrap fx-fade"
          style={{ background: "rgba(3,6,12,.82)", backdropFilter: "blur(6px)" }}
          onClick={() => setRejecting(null)}>
          <div className="w-full max-w-md rounded-2xl fx-scale nx-modal flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid rgba(248,113,113,.3)" }}>

            <div className="p-5 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
                <span className="text-[14px] font-bold text-white">رد سفارش #{rejecting.id}</span>
              </div>
              <p className="text-[11.5px] mt-2 leading-relaxed" style={{ color: "var(--muted)" }}>
                دلیل برای مشتری فرستاده می‌شود و سکه‌های خرج‌شده خودکار برمی‌گردند.
              </p>
            </div>

            <div className="p-5 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
              <div className="text-[11.5px] mb-2" style={{ color: "var(--dim)" }}>دلیل‌های آماده:</div>
              <div className="flex flex-col gap-2 mb-4">
                {REJECT_REASONS.map((r, ri) => (
                  <button key={ri} onClick={() => setReason(r)}
                    className="text-right p-2.5 rounded-xl text-[11.5px] transition-all"
                    style={reason === r
                      ? { background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.35)", color: "var(--text)" }
                      : { background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--dim)" }}>
                    {r}
                  </button>
                ))}
              </div>

              <Field label="یا دلیل خودتان را بنویسید">
                <textarea className="fx-input" rows={3} value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثلاً: مبلغ واریزی ۵۰ هزار تومان کمتر است" />
              </Field>
            </div>

            <div className="p-5 shrink-0 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setRejecting(null)} className="fx-btn-g flex-1 py-3 text-[12.5px]">
                انصراف
              </button>
              <button onClick={doReject} disabled={!reason.trim()}
                className="flex-1 py-3 rounded-[11px] text-[12.5px] font-bold"
                style={{ background: reason.trim() ? "var(--danger)" : "var(--surface-2)",
                         color: reason.trim() ? "#fff" : "var(--muted)" }}>
                رد کن و اطلاع بده
              </button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}

function StatusPill({ s }) {
  const map = {
    awaiting: ["در انتظار", "var(--warn)", "rgba(251,191,36,.12)"],
    review: ["بررسی", "var(--warn)", "rgba(251,191,36,.12)"],
    approved: ["تاییدشده", "var(--ok)", "rgba(52,211,153,.12)"],
    panel_approve: ["در صف ساخت", "var(--accent-2)", "rgba(43,127,214,.12)"],
    rejected: ["ردشده", "var(--danger)", "rgba(248,113,113,.12)"],
  };
  const [l, c, bg] = map[s] || [s, "var(--muted)", "rgba(255,255,255,.05)"];
  return <span className="fx-pill" style={{ background: bg, color: c }}>{l}</span>;
}

/* ===================== ربات: کاربران ===================== */

function BotUsersSection({ password }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (query = "") => {
    setLoading(true);
    try {
      const d = await fetch(`${API_URL}/api/admin/bot/users?q=${encodeURIComponent(query)}`,
        { headers: { "X-Admin-Password": password } }).then(r => r.json());
      setUsers(d.users || []);
    } catch { /* بی‌صدا */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);

  return (
    <div className="fx-anim">
      <SectionHead title="کاربران ربات" desc="جستجو در کاربرانی که با ربات تعامل داشته‌اند." />

      <div className="fx-card p-4 mb-4 flex gap-2">
        <div className="fx-search flex-1" style={{ width: "auto" }}>
          <Search size={14} style={{ color: "var(--muted)" }} />
          <input placeholder="نام، یوزرنیم یا آیدی عددی..." value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)} />
        </div>
        <button onClick={() => load(q)} className="fx-btn px-4 py-2.5 text-[12px]">جستجو</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>
      ) : users.length === 0 ? (
        <div className="fx-card p-10 text-center" style={{ borderStyle: "dashed" }}>
          <Users size={26} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>کاربری یافت نشد</div>
        </div>
      ) : (
        <div className="fx-card overflow-hidden">
          {users.map((u, i) => (
            <button key={u.id} onClick={() => setDetail(u.tg_id)}
              className="w-full flex items-center justify-between gap-3 p-4 flex-wrap text-right transition-colors hover:bg-white/[.02]"
              style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-white">{u.first_name || "بدون نام"}</span>
                  {u.username && <span className="text-[11px]" dir="ltr" style={{ color: "var(--muted)" }}>@{u.username}</span>}
                  {u.is_blocked === 1 && <span className="fx-pill" style={{ background: "rgba(248,113,113,.12)", color: "var(--danger)" }}>مسدود</span>}
                </div>
                <div className="text-[10.5px] mt-1" dir="ltr" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {u.tg_id} · {u.ref_code}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11.5px] shrink-0">
                <span style={{ color: "var(--warn)" }}>{u.coins || 0} سکه</span>
                <span style={{ color: "var(--ok)" }}>{Number(u.balance || 0).toLocaleString("fa-IR")} تومان</span>
                <ChevronLeft size={14} style={{ color: "var(--muted)" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <SubscriberModal tgId={detail} password={password} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

/* ===================== بازگشت به نسخه قبلی ===================== */

function RollbackCard({ password }) {
  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [keepSettings, setKeepSettings] = useState(true);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/snapshots`, {
        headers: { "X-Admin-Password": password } }).then((r) => r.json());
      setSnaps(d.snapshots || []);
    } catch { /* بی‌صدا */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);

  const run = async () => {
    const id = confirm.id;
    setConfirm(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ id, keepSettings }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ t: "ok", m: "بازگشت شروع شد — صفحه تا لحظاتی دیگر بارگذاری می‌شود" });
        setTimeout(() => window.location.reload(), 45000);
      } else setMsg({ t: "err", m: d.detail || "بازگشت ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
  };

  if (loading) return null;

  return (
    <div className="fx-card p-5 mt-4">
      <div className="flex items-center gap-2 mb-1">
        <History size={15} style={{ color: "var(--warn)" }} />
        <span className="text-[13px] font-semibold text-white">بازگشت به نسخه قبلی</span>
      </div>
      <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
        قبل از هر به‌روزرسانی یک نسخه ذخیره می‌شود. اگر نسخه‌ی جدید مشکل داشت، از اینجا برگردید.
      </p>

      <Msg msg={msg} />

      {snaps.length === 0 ? (
        <div className="text-center py-6 text-[11.5px]" style={{ color: "var(--muted)" }}>
          هنوز نسخه‌ی ذخیره‌شده‌ای نیست — با اولین به‌روزرسانی ساخته می‌شود
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 text-[11.5px] mb-3 cursor-pointer" style={{ color: "var(--dim)" }}>
            <input type="checkbox" checked={keepSettings} onChange={(e) => setKeepSettings(e.target.checked)}
              style={{ accentColor: "var(--accent)" }} />
            تنظیمات فعلی حفظ شود (توصیه می‌شود)
          </label>

          {snaps.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl mb-2 flex-wrap"
              style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-white">نسخه {s.version}</span>
                  {s.hasBot && <span className="fx-pill" style={{ background: "rgba(43,127,214,.12)", color: "var(--accent-2)" }}>شامل ربات</span>}
                </div>
                <div className="text-[10.5px] mt-1" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {s.createdAt?.replace("T", " ").slice(0, 16)} · {s.sizeMb} MB
                </div>
              </div>
              <button onClick={() => setConfirm(s)}
                className="fx-btn-g px-3.5 py-2.5 text-[11.5px] shrink-0" style={{ color: "var(--warn)" }}>
                بازگشت به این نسخه
              </button>
            </div>
          ))}
        </>
      )}

      {confirm && (
        <ConfirmModal
          title={`بازگشت به نسخه ${confirm.version}؟`}
          desc={`پنل به وضعیت ${confirm.createdAt?.slice(0, 10)} برمی‌گردد و حدود یک دقیقه در دسترس نخواهد بود.${keepSettings ? " تنظیمات فعلی حفظ می‌شود." : " تنظیمات هم به همان نسخه برمی‌گردد."}`}
          confirmLabel="بله، برگرد"
          onConfirm={run}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

/* ===================== ربات: متن‌ها ===================== */

const BOT_TEXTS = [
  { k: "welcome_text", label: "پیام خوش‌آمد",
    hint: "اگر خالی بماند، وضعیت زنده‌ی کاربر نمایش داده می‌شود",
    vars: ["{name}", "{brand}"],
    sample: "سلام {name} 👋\n\nبه {brand} خوش آمدید." },
  { k: "phone_prompt", label: "درخواست شماره",
    hint: "اختیاری بودن آن را حتماً بگویید", vars: [],
    sample: "📱 اگر شماره‌تان را ثبت کنید، سریع‌تر می‌توانیم کمکتان کنیم." },
  { k: "waiting_text", label: "بعد از ارسال رسید",
    hint: "", vars: ["{order_id}", "{support}"],
    sample: "✅ رسید شما دریافت شد\nکد پیگیری: {order_id}" },
  { k: "reject_text", label: "رد رسید",
    hint: "دلیل رد خودکار جایگزین می‌شود", vars: ["{order_id}", "{reason}", "{support}"],
    sample: "❌ رسید شما تایید نشد\n\nدلیل: {reason}" },
  { k: "delivered_text", label: "تحویل کانفیگ",
    hint: "", vars: ["{plan}", "{sub_url}", "{expires}"],
    sample: "🎉 اشتراک شما فعال شد!\n\n{sub_url}" },
  { k: "expiry_text", label: "یادآوری انقضا",
    hint: "", vars: ["{days}", "{plan}"],
    sample: "⏰ {days} روز تا پایان اشتراک شما باقی مانده." },
];

function BotTextsSection({ password }) {
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/bot/settings`, {
        headers: { "X-Admin-Password": password } }).then((r) => r.json());
      setT({
        settings: {}, topics: {},
        ...(d.tenant || {}),
        settings: (d.tenant?.settings && typeof d.tenant.settings === "object"
                   && !Array.isArray(d.tenant.settings)) ? d.tenant.settings : {},
      });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const x = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(x); } }, [msg]);

  const s = t?.settings || {};
  const upS = (patch) => setT({ ...t, settings: { ...s, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ settings: t.settings }),
      });
      setMsg(res.ok ? { t: "ok", m: "متن‌ها ذخیره شد — ربات فوری اعمال می‌کند" }
                    : { t: "err", m: "ذخیره ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  return (
    <div className="fx-anim">
      <SectionHead title="متن‌های ربات"
        desc="هر پیامی که ربات می‌فرستد قابل ویرایش است. خالی بگذارید تا متن پیش‌فرض استفاده شود."
        action={
          <button onClick={save} disabled={saving} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} ذخیره
          </button>
        } />

      <Msg msg={msg} />

      <InfoBox>
        تغییرات <b>بدون ری‌استارت ربات</b> اعمال می‌شوند — ربات هر بار تنظیمات را تازه می‌خواند.
      </InfoBox>

      {BOT_TEXTS.map((f) => (
        <div key={f.k} className="fx-card p-4 mt-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-[12.5px] font-semibold text-white">{f.label}</span>
            {f.vars.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {f.vars.map((v) => (
                  <code key={v} className="text-[9.5px] px-2 py-1 rounded-md"
                    style={{ background: "rgba(43,127,214,.14)", color: "var(--accent-2)",
                             fontFamily: "'JetBrains Mono',monospace" }}>{v}</code>
                ))}
              </div>
            )}
          </div>
          <textarea className="fx-input" rows={3} value={s[f.k] || ""}
            onChange={(e) => upS({ [f.k]: e.target.value })}
            placeholder={f.sample} style={{ resize: "vertical", lineHeight: 1.9 }} />
          {f.hint && <div className="text-[10.5px] mt-1.5" style={{ color: "var(--muted)" }}>{f.hint}</div>}
        </div>
      ))}
    </div>
  );
}

/* ===================== ربات: پیش‌نمایش ===================== */

const PREVIEW_FLOWS = {
  welcome: {
    label: "خوش‌آمد",
    msgs: [
      { me: true, t: "/start" },
      { t: "سلام علی 👋\n\n📦 <b>استاندارد</b>\n   ✅ <b>۱۷ روز</b> باقی مانده\n\n💎 ۴۵ سکه <i>(۲۰٪ تخفیف)</i>   ·   👛 ۱۲۰,۰۰۰",
        kb: [["🛒 خرید اشتراک", "♻️ تمدید"], ["📊 وضعیت من", "💎 سکه و دعوت"], ["👛 کیف پول", "🎓 آموزش"], ["🎧 پشتیبانی"]] },
    ],
  },
  phone: {
    label: "شماره تماس",
    msgs: [
      { t: "📱 <b>شماره تماس</b>\n\nاگر شماره‌تان را ثبت کنید، در صورت بروز مشکل سریع‌تر می‌توانیم کمکتان کنیم.\n\n<i>اختیاری است — بدون آن هم می‌توانید خرید کنید.</i>",
        contact: true, kb: [["📱 ارسال شماره من"], ["فعلاً نه"]] },
    ],
  },
  buy: {
    label: "خرید با سکه",
    msgs: [
      { me: true, t: "🥈 استاندارد · ۶۰GB" },
      { t: "<b>پلن استاندارد</b> 🥈\n\n📦 حجم: ۶۰ گیگابایت\n⏱ مدت: ۳۰ روز\n👥 کاربر همزمان: ۲\n\n💵 قیمت: ۲۵۰,۰۰۰ تومان\n\n💎 <b>سکه‌های تو: ۴۵</b>\nمی‌توانی ۴۰ سکه خرج کنی ← <b>۲۰٪ تخفیف</b>\n\n💰 قیمت نهایی: <b>۲۰۰,۰۰۰</b>",
        kb: [["✅ خرید با ۲۰٪ تخفیف"], ["💵 خرید بدون تخفیف"], ["‹ بازگشت"]] },
    ],
  },
  wait: {
    label: "انتظار تایید",
    msgs: [
      { me: true, img: true, t: "[عکس رسید]" },
      { t: "✅ <b>رسید شما دریافت شد</b>\n━━━━━━━━━━━━━━━━━━━\n\n🔢 کد پیگیری: <code>#4821</code>\n⏳ در انتظار بررسی\n\nمعمولاً کمتر از ۱۵ دقیقه طول می‌کشد.\nبه محض تایید، کانفیگتان همین‌جا ارسال می‌شود.",
        kb: [["📊 وضعیت سفارش"], ["🎧 پشتیبانی"], ["‹ منوی اصلی"]] },
    ],
  },
  reject: {
    label: "رد رسید",
    msgs: [
      { t: "❌ <b>رسید شما تایید نشد</b>\n━━━━━━━━━━━━━━━━━━━\n\n🔢 کد پیگیری: <code>#4821</code>\n\n<b>دلیل:</b>\nمبلغ واریزی با مبلغ سفارش مطابقت ندارد.\n\n💎 ۴۰ سکه‌ی شما برگردانده شد.\n\nمی‌توانید رسید درست را دوباره بفرستید.",
        kb: [["🔄 ارسال مجدد رسید"], ["🎧 پشتیبانی"], ["‹ منوی اصلی"]] },
    ],
  },
  trial: {
    label: "تست رایگان",
    msgs: [
      { me: true, t: "🎁 تست رایگان" },
      { t: "🎁 <b>اشتراک تست رایگان</b>\n\n📦 حجم: <b>۱ گیگابایت</b>\n⏱ مدت: <b>۲۴ ساعت</b>\n\n<i>هر کاربر فقط یک‌بار می‌تواند دریافت کند.</i>",
        kb: [["✅ فعال‌سازی تست"], ["‹ بازگشت"]] },
    ],
  },
  admin: {
    label: "پنل مدیریت",
    msgs: [
      { me: true, t: "⚙️ پنل مدیریت" },
      { t: "⚙️ <b>پنل مدیریت</b> · نکسورا\n━━━━━━━━━━━━━━━━━━━\n\n👥 کاربران   <b>۴۸۲</b>\n📦 اشتراک فعال   <b>۱۹۷</b>\n💳 رسید در انتظار   <b>۳</b>\n🎫 تیکت باز   <b>۲</b>\n\n💰 فروش کل   <b>۴۸,۵۰۰,۰۰۰</b>",
        kb: [["💳 رسیدها (۳)"], ["👥 کاربران", "📦 پلن‌ها"], ["📊 آمار", "📢 پیام همگانی"], ["‹ بازگشت"]] },
    ],
  },
};

function BotPreviewSection() {
  const [flow, setFlow] = useState("welcome");
  const f = PREVIEW_FLOWS[flow];

  const md = (t) => {
    const parts = t.split(/(<b>[^<]*<\/b>|<code>[^<]*<\/code>|<i>[^<]*<\/i>)/g);
    return parts.map((p, i) => {
      if (p.startsWith("<b>")) return <b key={i} style={{ color: "#fff" }}>{p.slice(3, -4)}</b>;
      if (p.startsWith("<i>")) return <i key={i} style={{ opacity: .72 }}>{p.slice(3, -4)}</i>;
      if (p.startsWith("<code>")) return <code key={i} style={{
        background: "rgba(255,255,255,.09)", padding: "1px 5px", borderRadius: 4,
        fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: "#8FC1EE" }}>{p.slice(6, -7)}</code>;
      return p;
    });
  };

  return (
    <div className="fx-anim">
      <SectionHead title="پیش‌نمایش ربات"
        desc="آنچه مشتری در تلگرام می‌بیند. روی هر مرحله بزنید." />

      <div className="fx-g2 grid gap-6" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="min-w-0">
          <div className="flex flex-col gap-2">
            {Object.entries(PREVIEW_FLOWS).map(([k, v]) => {
              const on = flow === k;
              return (
                <button key={k} onClick={() => setFlow(k)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all"
                  style={on
                    ? { background: "rgba(43,127,214,.14)", border: "1px solid rgba(43,127,214,.45)" }
                    : { background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {on ? <Check size={14} style={{ color: "var(--accent-2)" }} />
                      : <Circle size={7} fill="var(--muted)" strokeWidth={0} />}
                  <span className="text-[12.5px] font-semibold"
                    style={{ color: on ? "var(--text)" : "var(--dim)" }}>{v.label}</span>
                </button>
              );
            })}
          </div>

          <InfoBox>
            متن‌ها را در بخش <b>«متن‌ها»</b> می‌توانید تغییر دهید.
            پیش‌نمایش، حالت پیش‌فرض را نشان می‌دهد.
          </InfoBox>
        </div>

        <div className="fx-hide-m">
          <div className="sticky top-24">
            <div style={{
              borderRadius: 28, padding: 9,
              background: "linear-gradient(160deg,#232B3C,#0C1119)",
              border: "1px solid rgba(255,255,255,.13)",
              boxShadow: "0 20px 52px rgba(0,0,0,.5)",
            }}>
              <div className="flex justify-center mb-1.5">
                <div style={{ width: 46, height: 4, borderRadius: 99, background: "rgba(255,255,255,.18)" }} />
              </div>
              <div style={{
                background: "#0E1621", borderRadius: 21, padding: "12px 10px",
                height: 420, overflowY: "auto", direction: "rtl",
              }}>
                <div className="flex items-center gap-2 pb-2.5 mb-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#06090F",
                  }}>N</div>
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: "#fff" }}>ربات نکسورا</div>
                    <div className="text-[8.5px]" style={{ color: "#6B8299" }}>آنلاین</div>
                  </div>
                </div>

                {f.msgs.map((m, i) => (
                  <div key={i} className="mb-2.5 flex" style={{ justifyContent: m.me ? "flex-start" : "flex-end" }}>
                    <div style={{ maxWidth: "89%" }}>
                      <div style={{
                        background: m.me ? "#2B5278" : "#182533",
                        borderRadius: m.me ? "12px 12px 12px 4px" : "12px 12px 4px 12px",
                        padding: "8px 10px", fontSize: 10, lineHeight: 1.9,
                        color: "#E8EEF7", whiteSpace: "pre-wrap",
                      }}>
                        {m.img && (
                          <div style={{
                            height: 50, borderRadius: 7, marginBottom: 5,
                            background: "linear-gradient(135deg,#2A3A4A,#1A2530)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8.5, color: "#6B8299",
                          }}>🧾 رسید</div>
                        )}
                        {md(m.t)}
                      </div>
                      {m.kb && (
                        <div className="mt-1.5 flex flex-col gap-1">
                          {m.kb.map((row, ri) => (
                            <div key={ri} className="flex gap-1">
                              {row.map((b, bi) => (
                                <div key={bi} style={{
                                  flex: 1, borderRadius: 8, padding: "7px 5px",
                                  fontSize: 8.8, textAlign: "center", fontWeight: 600,
                                  background: m.contact && ri === 0 ? "#2F5C42" : "#1F2C3A",
                                  border: `1px solid ${m.contact && ri === 0 ? "rgba(110,231,183,.35)" : "rgba(90,169,230,.22)"}`,
                                  color: m.contact && ri === 0 ? "#6EE7B7" : "#8FC1EE",
                                }}>{b}</div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== ربات: آمار و قیف ===================== */

function BotStatsSection({ password }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/admin/bot/funnel`, {
        headers: { "X-Admin-Password": password } }).then((x) => x.json());
      setD(r);
    } catch { /* بی‌صدا */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  if (!d?.ready) {
    return (
      <div className="fx-anim">
        <SectionHead title="آمار و قیف تبدیل" desc="وقتی ربات راه بیفتد، آمار اینجا نمایش داده می‌شود." />
        <div className="fx-card p-10 text-center" style={{ borderStyle: "dashed" }}>
          <TrendingUp size={26} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>هنوز داده‌ای نیست</div>
        </div>
      </div>
    );
  }

  const seg = d.segments || {};
  const cards = [
    ["استارت‌زده", d.started, "کل کسانی که ربات را باز کردند", "var(--accent-2)"],
    ["خرید کرده", seg.paid, d.started ? `${Math.round(seg.paid * 100 / d.started)}٪ نرخ تبدیل` : "", "var(--ok)"],
    ["فقط تست گرفته", seg.trialOnly, "هدف خوبی برای پیگیری", "var(--warn)"],
    ["بدون هیچ اقدام", seg.idle, "نه خرید، نه تست", "var(--muted)"],
  ];

  return (
    <div className="fx-anim">
      <SectionHead title="آمار و قیف تبدیل"
        desc="از باز کردن ربات تا خرید — کجا مشتری را از دست می‌دهید."
        action={
          <button onClick={load} className="fx-btn-g px-3 py-2.5 text-[12px] flex items-center gap-1.5">
            <RefreshCw size={13} /> تازه‌سازی
          </button>
        } />

      <div className="fx-g4 grid grid-cols-4 gap-4 mb-5">
        {cards.map(([l, v, sub, c], i) => (
          <div key={i} className="fx-card p-5">
            <div className="fx-stat-num" style={{ color: c }}><CountUp value={v ?? 0} /></div>
            <div className="text-[11.5px] mt-2" style={{ color: "var(--dim)" }}>{l}</div>
            {sub && <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{sub}</div>}
          </div>
        ))}
      </div>

      <div className="fx-card p-5">
        <div className="text-[13px] font-semibold text-white mb-4">قیف تبدیل</div>
        {(d.steps || []).map((s, i) => {
          const colors = ["var(--accent-2)", "var(--purple)", "var(--warn)", "var(--ok)"];
          const c = colors[i] || "var(--accent-2)";
          return (
            <div key={i} className="mb-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>{s.label}</span>
                <span className="text-[11.5px] font-bold" style={{ color: c, fontFamily: "'JetBrains Mono',monospace" }}>
                  {s.n} <span style={{ color: "var(--muted)", fontSize: 10 }}>({s.pct}٪)</span>
                </span>
              </div>
              <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.05)" }}>
                <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 99, background: c, opacity: .85 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== ربات: بک‌آپ ===================== */

function BotBackupSection({ password }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);

  const download = async () => {
    setBusy("dl");
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/backup`, {
        headers: { "X-Admin-Password": password } });
      const d = await res.json();
      if (!res.ok) { setMsg({ t: "err", m: d.detail || "دریافت ناموفق" }); return; }

      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `nexora-bot-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      const total = Object.values(d.counts || {}).reduce((x, y) => x + y, 0);
      setMsg({ t: "ok", m: `بک‌آپ دانلود شد — ${total} رکورد` });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setBusy(null); }
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed.data) { setMsg({ t: "err", m: "این فایل بک‌آپ ربات نیست" }); return; }
        setConfirm(parsed);
      } catch { setMsg({ t: "err", m: "فایل خراب است" }); }
    };
    r.readAsText(f);
    e.target.value = "";
  };

  const restore = async () => {
    const payload = confirm;
    setConfirm(null); setBusy("up");
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ data: payload.data }),
      });
      const d = await res.json();
      if (res.ok) {
        const total = Object.values(d.restored || {}).reduce((x, y) => x + y, 0);
        setMsg({ t: "ok", m: `${total} رکورد بازیابی شد` });
      } else setMsg({ t: "err", m: d.detail || "بازیابی ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setBusy(null); }
  };

  return (
    <div className="fx-anim">
      <SectionHead title="بک‌آپ و بازیابی ربات"
        desc="کاربران، سفارش‌ها، اشتراک‌ها، سکه‌ها و تنظیمات ربات." />
      <Msg msg={msg} />

      <div className="fx-g2 grid grid-cols-2 gap-4 mb-4">
        <button onClick={download} disabled={!!busy} className="fx-card p-6 text-center">
          <div className="fx-ico mx-auto mb-3" style={{ width: 44, height: 44, background: "rgba(43,127,214,.12)" }}>
            {busy === "dl" ? <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent-2)" }} />
                           : <Download size={20} style={{ color: "var(--accent-2)" }} />}
          </div>
          <div className="text-[13px] font-semibold text-white mb-1">دریافت بک‌آپ</div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>یک فایل JSON دانلود می‌شود</div>
        </button>

        <label className="fx-card p-6 text-center cursor-pointer">
          <div className="fx-ico mx-auto mb-3" style={{ width: 44, height: 44, background: "rgba(251,191,36,.12)" }}>
            {busy === "up" ? <Loader2 size={20} className="animate-spin" style={{ color: "var(--warn)" }} />
                           : <Upload size={20} style={{ color: "var(--warn)" }} />}
          </div>
          <div className="text-[13px] font-semibold text-white mb-1">بازیابی از فایل</div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>فایل بک‌آپ را انتخاب کنید</div>
          <input type="file" accept=".json" onChange={pickFile} className="hidden" disabled={!!busy} />
        </label>
      </div>

      <InfoBox tone="warn">
        بازیابی، <b>همه‌ی داده‌های فعلی ربات را جایگزین می‌کند</b>.
        قبل از آن یک نسخه‌ی امن از وضعیت فعلی کنار دیتابیس ذخیره می‌شود،
        پس اگر اشتباه شد چیزی از دست نمی‌رود.
      </InfoBox>

      {confirm && (
        <ConfirmModal
          title="بازیابی بک‌آپ؟"
          desc={`این فایل شامل ${Object.entries(confirm.counts || {}).map(([k, v]) => `${v} ${k}`).join(" · ")} است. همه‌ی داده‌های فعلی ربات جایگزین می‌شوند.`}
          confirmLabel="بازیابی کن"
          onConfirm={restore}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

/* ===================== ربات: پرونده مشتری ===================== */

const fmtBytes = (n) => {
  const b = Number(n || 0);
  if (b <= 0) return "۰";
  const gb = b / 1073741824;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(b / 1048576).toFixed(0)} MB`;
};

const fmtDate = (ms) => {
  if (!ms) return "بدون انقضا";
  try {
    return new Date(Number(ms)).toLocaleDateString("fa-IR");
  } catch { return "—"; }
};

const daysLeft = (ms) => {
  if (!ms) return null;
  const d = Math.ceil((Number(ms) - Date.now()) / 86400000);
  return d;
};

function SubscriberModal({ tgId, password, onClose }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/bot/subscriber/${tgId}`, {
          headers: { "X-Admin-Password": password },
        });
        const body = await res.json();
        if (res.ok) setD(body);
        else setErr(body.detail || "دریافت اطلاعات ناموفق بود");
      } catch { setErr("اتصال به سرور برقرار نشد"); }
      finally { setLoading(false); }
    })();
  }, [tgId, password]);

  const u = d?.user || {};
  const subs = d?.subscriptions || [];
  const live = d?.live || {};

  return createPortal(
    <div className="nx-modal-wrap fx-fade"
      style={{ background: "rgba(3,6,12,.84)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl fx-scale nx-modal flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface)", border: "1px solid rgba(90,169,230,.3)" }}>

        <div className="p-5 shrink-0 flex items-start justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14.5px] font-bold text-white">
                {u.first_name || "بدون نام"}
              </span>
              {u.username && (
                <span className="text-[11.5px]" dir="ltr" style={{ color: "var(--muted)" }}>
                  @{u.username}
                </span>
              )}
              {u.is_blocked === 1 && (
                <span className="fx-pill" style={{ background: "rgba(248,113,113,.12)", color: "var(--danger)" }}>
                  مسدود
                </span>
              )}
            </div>
            <div className="text-[10.5px] mt-1.5" dir="ltr"
              style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              {u.tg_id}{u.phone ? ` · ${u.phone}` : ""}
            </div>
          </div>
          <button onClick={onClose} className="fx-ico-btn shrink-0"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex justify-center py-14">
              <Loader2 className="animate-spin" style={{ color: "var(--muted)" }} />
            </div>
          )}

          {err && (
            <div className="rounded-xl p-3 flex items-center gap-2 text-[12px]"
              style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "var(--danger)" }}>
              <AlertTriangle size={14} /> {err}
            </div>
          )}

          {d && (
            <>
              {/* خلاصه */}
              <div className="fx-g3 grid grid-cols-3 gap-3 mb-5">
                {[
                  ["سکه", u.coins || 0, "var(--warn)"],
                  ["کیف پول", Number(u.balance || 0).toLocaleString("fa-IR"), "var(--ok)"],
                  ["خرید موفق", (d.orders || []).filter((o) => o.status === "approved").length, "var(--accent-2)"],
                ].map(([l, v, c2], i) => (
                  <div key={i} className="rounded-xl p-3 text-center"
                    style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                    <div className="text-[16px] font-bold" style={{ color: c2, fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* اشتراک‌ها */}
              <div className="text-[12.5px] font-semibold text-white mb-3">
                اشتراک‌ها
                {!d.liveAvailable && subs.length > 0 && (
                  <span className="text-[10px] font-normal mr-2" style={{ color: "var(--warn)" }}>
                    · داده زنده در دسترس نیست
                  </span>
                )}
              </div>

              {subs.length === 0 && (
                <div className="text-center py-6 text-[11.5px]" style={{ color: "var(--muted)" }}>
                  اشتراکی ندارد
                </div>
              )}

              {subs.map((s) => {
                const lv = live[s.client_email];
                const used = lv ? (lv.up || 0) + (lv.down || 0) : 0;
                const total = lv?.total || 0;
                const pct = total > 0 ? Math.min(100, Math.round(used * 100 / total)) : 0;
                const dl = lv?.expiryTime ? daysLeft(lv.expiryTime) : null;
                const near = dl !== null && dl <= 3;

                return (
                  <div key={s.id} className="fx-card p-4 mb-3" style={{ background: "var(--surface-3)" }}>
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Package size={14} style={{ color: "var(--accent-2)" }} />
                        <span className="text-[12.5px] font-semibold text-white">
                          {s.plan_name || "اشتراک"}
                        </span>
                      </div>
                      <span className="fx-pill" style={{
                        background: s.is_active ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.05)",
                        color: s.is_active ? "var(--ok)" : "var(--muted)",
                      }}>
                        {s.is_active ? "فعال" : "غیرفعال"}
                      </span>
                    </div>

                    <div className="text-[10.5px] mb-3" dir="ltr"
                      style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                      {s.client_email}
                    </div>

                    {lv ? (
                      <>
                        <div className="flex justify-between mb-2">
                          <span className="text-[11px]" style={{ color: "var(--dim)" }}>مصرف حجم</span>
                          <span className="text-[11.5px] font-bold"
                            style={{ color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
                            {fmtBytes(used)} {total > 0 ? `/ ${fmtBytes(total)}` : "· نامحدود"}
                          </span>
                        </div>

                        {total > 0 && (
                          <div className="h-[8px] rounded-full overflow-hidden mb-3"
                            style={{ background: "rgba(43,127,214,.12)" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", borderRadius: 99,
                              background: pct >= 85
                                ? "linear-gradient(90deg,var(--danger),#FCA5A5)"
                                : "linear-gradient(90deg,var(--accent),var(--accent-2))",
                            }} />
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {[
                            ["دانلود", fmtBytes(lv.down), "var(--ok)"],
                            ["آپلود", fmtBytes(lv.up), "var(--warn)"],
                            ["باقی", total > 0 ? fmtBytes(Math.max(0, total - used)) : "∞", "var(--accent-2)"],
                          ].map(([l, v, c2], i) => (
                            <div key={i} className="text-center">
                              <div className="text-[9.5px]" style={{ color: "var(--muted)" }}>{l}</div>
                              <div className="text-[11px] font-bold mt-0.5"
                                style={{ color: c2, fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between text-[11px] pt-2"
                          style={{ borderTop: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--muted)" }}>انقضا</span>
                          <span style={{ color: near ? "var(--warn)" : "var(--dim)" }}>
                            {fmtDate(lv.expiryTime)}
                            {dl !== null && (dl > 0 ? ` · ${dl} روز مانده` : " · منقضی شده")}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] py-2" style={{ color: "var(--muted)" }}>
                        داده‌ی زنده از 3x-ui دریافت نشد — اتصال پنل را بررسی کنید
                      </div>
                    )}
                  </div>
                );
              })}

              {/* آخرین سفارش‌ها */}
              {(d.orders || []).length > 0 && (
                <>
                  <div className="text-[12.5px] font-semibold text-white mt-5 mb-3">آخرین سفارش‌ها</div>
                  {d.orders.slice(0, 6).map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-2 py-2.5"
                      style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="min-w-0">
                        <div className="text-[11.5px]" style={{ color: "var(--dim)" }}>
                          {o.plan_name || "—"}
                        </div>
                        <div className="text-[10px] mt-0.5"
                          style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                          #{o.id} · {String(o.created_at || "").slice(0, 10)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px]" style={{ color: "var(--dim)" }}>
                          {Number(o.amount || 0).toLocaleString("fa-IR")}
                        </span>
                        <StatusPill s={o.status} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ===================== ربات: سکه و دعوت ===================== */

function BotCoinsSection({ password }) {
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/bot/settings`, { headers: { "X-Admin-Password": password } }).then(r => r.json());
      setT({
        settings: {}, topics: {},
        ...(d.tenant || {}),
        settings: (d.tenant?.settings && typeof d.tenant.settings === "object"
                   && !Array.isArray(d.tenant.settings)) ? d.tenant.settings : {},
      });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const x = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(x); } }, [msg]);

  const s = t?.settings || {};
  const tiers = s.coin_tiers || [
    { coins: 20, pct: 10 }, { coins: 40, pct: 20 }, { coins: 60, pct: 30 },
    { coins: 80, pct: 40 }, { coins: 100, pct: 50 },
  ];
  const upS = (patch) => setT({ ...t, settings: { ...s, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/bot/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ settings: t.settings }),
      });
      if (res.ok) setMsg({ t: "ok", m: "تنظیمات سکه ذخیره شد" });
      else setMsg({ t: "err", m: "ذخیره ناموفق" });
    } catch { setMsg({ t: "err", m: "اتصال برقرار نشد" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  return (
    <div className="fx-anim">
      <SectionHead title="سکه و دعوت"
        desc="کاربران با دعوت دوستان سکه می‌گیرند و با نگه‌داشتن سکه، تخفیف بزرگ‌تری باز می‌کنند."
        action={
          <button onClick={save} disabled={saving} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} ذخیره
          </button>
        } />

      <Msg msg={msg} />

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
          <Gift size={15} style={{ color: "var(--warn)" }} /> قوانین دریافت سکه
        </div>

        <div className="fx-g3 grid grid-cols-2 gap-3">
          <Field label="سکه برای معرف" hint="وقتی دعوت‌شده اولین خریدش را کند">
            <NumberStepper value={s.coins_per_referral ?? 5} onChange={(v) => upS({ coins_per_referral: v })} min={0} max={50} unit="سکه" />
          </Field>
          <Field label="سکه برای دعوت‌شده" hint="۰ یعنی چیزی نمی‌گیرد">
            <NumberStepper value={s.coins_for_invitee ?? 2} onChange={(v) => upS({ coins_for_invitee: v })} min={0} max={50} unit="سکه" />
          </Field>
        </div>

        <Field label="حداقل مبلغ خرید برای احتساب" hint="خریدهای کمتر از این، سکه نمی‌دهند">
          <input className="fx-input" dir="ltr" type="number" value={s.min_purchase_for_coin ?? 0}
            onChange={(e) => upS({ min_purchase_for_coin: Number(e.target.value) })}
            style={{ fontFamily: "'JetBrains Mono',monospace" }} />
        </Field>

        <InfoBox tone="warn">
          سکه فقط بعد از <b>خرید واقعی</b> دعوت‌شده داده می‌شود، نه با ثبت‌نام ساده.
          این جلوی سوءاستفاده با اکانت‌های جعلی را می‌گیرد.
        </InfoBox>
      </div>

      <div className="fx-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Coins size={15} style={{ color: "var(--warn)" }} /> نردبان تخفیف
          </div>
          <button onClick={() => upS({ coin_tiers: [...tiers, { coins: 120, pct: 55 }] })}
            className="fx-btn-g px-3 py-2 text-[11.5px] flex items-center gap-1.5">
            <PlusIcon size={13} /> افزودن پله
          </button>
        </div>
        <p className="text-[11px] mb-4" style={{ color: "var(--muted)" }}>
          هرچه سکه بیشتری نگه دارد، تخفیف بزرگ‌تری می‌گیرد.
        </p>

        {tiers.map((tr, i) => (
          <div key={i} className="flex items-center gap-3 mb-2.5">
            <Coins size={14} style={{ color: "var(--warn)", flexShrink: 0 }} />
            <div className="flex-1 fx-g3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] mb-1 block" style={{ color: "var(--muted)" }}>سکه لازم</label>
                <input className="fx-input" dir="ltr" type="number" value={tr.coins}
                  onChange={(e) => { const l = [...tiers]; l[i] = { ...tr, coins: Number(e.target.value) }; upS({ coin_tiers: l }); }}
                  style={{ fontFamily: "'JetBrains Mono',monospace" }} />
              </div>
              <div>
                <label className="text-[10.5px] mb-1 block" style={{ color: "var(--muted)" }}>درصد تخفیف</label>
                <input className="fx-input" dir="ltr" type="number" value={tr.pct}
                  onChange={(e) => { const l = [...tiers]; l[i] = { ...tr, pct: Number(e.target.value) }; upS({ coin_tiers: l }); }}
                  style={{ fontFamily: "'JetBrains Mono',monospace" }} />
              </div>
            </div>
            <button onClick={() => upS({ coin_tiers: tiers.filter((_, x) => x !== i) })}
              className="fx-ico-btn shrink-0" style={{ width: 28, height: 28 }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== صفحه «به‌زودی» ===================== */

function ComingSoon({ title, desc, features }) {
  return (
    <div className="fx-anim">
      <SectionHead title={title} desc={desc} />
      <div className="fx-card p-8 text-center" style={{ borderStyle: "dashed" }}>
        <div className="fx-ico mx-auto mb-4" style={{ width: 52, height: 52, background: "rgba(251,191,36,.1)" }}>
          <Bot size={24} style={{ color: "var(--warn)" }} />
        </div>
        <div className="text-[15px] font-bold text-white mb-2">در حال توسعه</div>
        <p className="text-[12px] mb-6 max-w-md mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
          این بخش هنوز فعال نیست. تنظیماتی که در بخش «اتصال و تنظیمات» ذخیره می‌کنید،
          به‌محض آماده شدن ربات خودکار استفاده می‌شوند.
        </p>
        {features && (
          <div className="max-w-sm mx-auto text-right">
            <div className="text-[11px] mb-2.5" style={{ color: "var(--dim)" }}>قابلیت‌های برنامه‌ریزی‌شده:</div>
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Circle size={5} fill="var(--muted)" strokeWidth={0} />
                <span className="text-[11.5px]" style={{ color: "var(--muted)" }}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * مودال ساده — از React Portal روی body.
 *
 * داخل main که overflow دارد کار نمی‌کند و بریده می‌شود؛ این را
 * قبلاً یک‌بار یاد گرفتیم.
 */
/** مینیاتور کوچک هر حالت — تا بدون امتحان کردن بفهمید چه شکلی است. */
function WsModePreview({ mode, active }) {
  const line = (w, on) => (
    <div style={{
      height: 4, width: w, borderRadius: 2,
      background: on ? "var(--accent)" : "rgba(255,255,255,.13)",
    }} />
  );

  return (
    <div className="rounded-xl p-2.5 flex gap-1.5"
      style={{
        height: 58,
        background: active ? "rgba(0,0,0,.28)" : "rgba(0,0,0,.2)",
        boxShadow: "0 2px 8px rgba(0,0,0,.35) inset",
      }}>
      {mode === "rail" && (
        <div className="flex flex-col gap-1 shrink-0">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 3,
              background: i === 1 ? "var(--accent)" : "rgba(255,255,255,.13)",
            }} />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {mode === "dropdown" && (
          <>
            <div className="rounded-md flex items-center px-1.5"
              style={{ height: 13, background: "rgba(255,255,255,.09)" }}>
              {line(18, true)}
            </div>
            <div className="flex flex-col gap-1 pr-1">
              {line(26, false)}{line(20, false)}{line(23, false)}
            </div>
          </>
        )}

        {mode === "accordion" && (
          <>
            {line(24, true)}
            <div className="flex flex-col gap-1 pr-2"
              style={{ borderRight: "1px solid rgba(43,127,214,.3)" }}>
              {line(18, false)}{line(15, false)}
            </div>
            {line(22, false)}
          </>
        )}

        {mode === "rail" && (
          <div className="flex flex-col gap-1.5 pt-0.5">
            {line(26, false)}{line(20, false)}{line(23, false)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ سوییچ فضای کاری ═══════════════════ */

const WS_MODES = {
  accordion: { label: "تاشو", desc: "هر سه دیده می‌شوند، منوی فضای فعلی باز است" },
  dropdown:  { label: "کشویی", desc: "فضای فعلی بزرگ، بقیه با یک کلیک" },
  rail:      { label: "نوار آیکون", desc: "ستون باریک با آیکون و راهنمای شناور" },
};

const WS_COLOR = {
  sub: "var(--accent-2)",
  billing: "#D4AF37",
  bot: "#A78BFA",
};

/**
 * جابه‌جایی بین فضاهای کاری.
 *
 * سه حالت دارد چون سلیقه‌ها فرق می‌کند و این پنل قرار است فروخته شود.
 * حالت از تنظیمات می‌آید و در localStorage می‌ماند.
 */
function WorkspaceSwitch({ mode, workspace, onSwitch, active, setActive }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const spaces = Object.values(WORKSPACES);
  const cur = WORKSPACES[workspace];

  /* ── تاشو ── */
  if (mode === "accordion") {
    return (
      <div className="mb-2">
        {spaces.map((w) => {
          const on = workspace === w.key;
          const col = WS_COLOR[w.key] || "var(--accent-2)";
          return (
            <div key={w.key} className="mb-1">
              <button onClick={() => onSwitch(w.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-all"
                style={{
                  background: on ? `color-mix(in srgb, ${col} 10%, transparent)` : "transparent",
                  border: `1px solid ${on ? `color-mix(in srgb, ${col} 22%, transparent)` : "transparent"}`,
                }}>
                <w.icon size={15} style={{ color: on ? col : "var(--muted)", flexShrink: 0 }} />
                <span className="flex-1 text-[12px] truncate"
                  style={{ color: on ? "var(--text)" : "var(--dim)", fontWeight: on ? 700 : 500 }}>
                  {w.label}
                </span>
                <ChevronDown size={12} style={{
                  color: "var(--muted)", flexShrink: 0,
                  transform: on ? "rotate(180deg)" : "none",
                  transition: "transform .25s cubic-bezier(.22,1,.36,1)",
                }} />
              </button>

              {on && (
                <div className="mt-1 pr-2.5 mr-4"
                  style={{ borderRight: `1px solid color-mix(in srgb, ${col} 22%, transparent)` }}>
                  {w.groups.flatMap((g) => g.items).map((it) => {
                    const sel = active === it.key;
                    return (
                      <button key={it.key} onClick={() => setActive(it.key)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 text-right transition-colors"
                        style={{
                          background: sel ? "rgba(255,255,255,.04)" : "transparent",
                          color: sel ? "var(--text)" : "var(--muted)",
                          fontWeight: sel ? 600 : 400,
                        }}>
                        <it.icon size={12} style={{ flexShrink: 0 }} />
                        <span className="text-[11px] truncate">{it.label}</span>
                        {it.badge && (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: "rgba(255,255,255,.06)", color: "var(--muted)" }}>
                            {it.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── نوار آیکون ── */
  if (mode === "rail") {
    return (
      <div className="flex gap-1.5 mb-4 px-1">
        {spaces.map((w) => {
          const on = workspace === w.key;
          const col = WS_COLOR[w.key] || "var(--accent-2)";
          return (
            <div key={w.key} className="relative flex-1"
              onMouseEnter={() => setHover(w.key)} onMouseLeave={() => setHover(null)}>
              <button onClick={() => onSwitch(w.key)}
                className="w-full flex items-center justify-center rounded-xl transition-all"
                style={{
                  height: 42,
                  background: on ? `color-mix(in srgb, ${col} 14%, transparent)` : "transparent",
                  border: `1px solid ${on ? `color-mix(in srgb, ${col} 28%, transparent)` : "var(--border)"}`,
                  boxShadow: on
                    ? `0 1px 0 rgba(255,255,255,.08) inset, 0 6px 14px -6px color-mix(in srgb, ${col} 55%, transparent)`
                    : "none",
                }}>
                <w.icon size={17} style={{ color: on ? col : "var(--muted)" }} />
              </button>

              {hover === w.key && (
                <div className="absolute z-30 whitespace-nowrap rounded-xl px-3 py-2 fx-fade"
                  style={{
                    top: "calc(100% + 7px)", right: 0,
                    background: "var(--surface-2)", border: "1px solid var(--border-2)",
                    boxShadow: "0 12px 28px -8px rgba(0,0,0,.7)",
                  }}>
                  <div className="text-[11.5px] font-bold text-white">{w.label}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── کشویی (پیش‌فرض) ── */
  const col = WS_COLOR[workspace] || "var(--accent-2)";
  return (
    <div className="relative mb-4">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right"
        style={{
          background: "var(--surface-2)", border: "1px solid var(--border-2)",
          boxShadow: "0 1px 0 rgba(255,255,255,.05) inset",
        }}>
        <div className="rounded-[10px] flex items-center justify-center shrink-0"
          style={{
            width: 30, height: 30,
            background: `color-mix(in srgb, ${col} 14%, transparent)`,
            boxShadow: "0 1px 0 rgba(255,255,255,.1) inset",
          }}>
          <cur.icon size={15} style={{ color: col }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white truncate">{cur.label}</div>
          <div className="text-[9px] mt-0.5" style={{ color: "var(--muted)" }}>فضای کاری</div>
        </div>
        <ChevronDown size={14} style={{
          color: "var(--muted)", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform .22s",
        }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-0 right-0 rounded-2xl p-1.5 fx-scale"
            style={{
              top: "calc(100% + 6px)",
              background: "var(--surface)", border: "1px solid var(--border-2)",
              boxShadow: "0 18px 40px -12px rgba(0,0,0,.75)",
            }}>
            {spaces.map((w) => {
              const on = workspace === w.key;
              const c2 = WS_COLOR[w.key] || "var(--accent-2)";
              return (
                <button key={w.key}
                  onClick={() => { onSwitch(w.key); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-right transition-colors"
                  style={{ background: on ? `color-mix(in srgb, ${c2} 12%, transparent)` : "transparent" }}>
                  <w.icon size={14} style={{ color: on ? c2 : "var(--muted)", flexShrink: 0 }} />
                  <span className="flex-1 text-[11.5px] truncate"
                    style={{ color: on ? "var(--text)" : "var(--dim)", fontWeight: on ? 700 : 500 }}>
                    {w.label}
                  </span>
                  {on && <Check size={12} style={{ color: c2, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, width = "440px" }) {
  return createPortal(
    <div className="nx-modal-wrap fx-fade"
      style={{ background: "rgba(3,6,12,.82)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="rounded-2xl fx-scale nx-modal p-5" onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          width: `min(${width}, 94vw)`,
          boxShadow: "0 1px 0 rgba(255,255,255,.08) inset, 0 24px 60px -18px rgba(0,0,0,.75)",
        }}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] font-bold text-white">{title}</span>
          <button onClick={onClose} className="fx-ico-btn" style={{ width: 30, height: 30 }}>
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════ حسابداری واسطه‌ها ═══════════════════ */

const faNum = (n) => Number(n || 0).toLocaleString("fa-IR");
const RATE_STEP = 10000;
const RATE_QUICK = [90000, 120000, 150000, 190000, 250000];

/**
 * ردیف نرخ — حجم آزاد و قیمت با سه راه ورود.
 *
 * فیلدها فرورفته‌اند (پس‌زمینه‌ی تیره‌تر از کارت) تا با زبان بصری
 * بقیه‌ی پنل بخوانند و لکه‌ی روشن ایجاد نکنند.
 */
function RateRow({ rate, onChange, onDelete }) {
  const unlimited = !rate.gb;
  const bump = (d) => onChange({ price: Math.max(0, (rate.price || 0) + d) });

  return (
    <div className="rounded-2xl p-3 mb-2.5"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>

      <div className="flex items-end gap-2.5 mb-3">
        <div className="flex-1">
          <label className="text-[10px] block mb-1.5" style={{ color: "var(--muted)" }}>
            حجم ماهانه
          </label>
          <div className="flex gap-2">
            <button onClick={() => onChange({ gb: 0 })}
              className="px-3.5 py-2.5 rounded-[10px] text-[11.5px] font-semibold shrink-0"
              style={{
                background: unlimited ? "rgba(167,139,250,.14)" : "transparent",
                border: `1px solid ${unlimited ? "rgba(167,139,250,.4)" : "var(--border-2)"}`,
                color: unlimited ? "#A78BFA" : "var(--muted)",
              }}>
              نامحدود
            </button>

            <div className="flex-1 flex items-center gap-2 px-3 rounded-[10px]"
              style={{
                background: unlimited ? "transparent" : "rgba(0,0,0,.28)",
                border: "1px solid var(--border)",
                boxShadow: unlimited ? "none" : "0 2px 8px rgba(0,0,0,.35) inset",
                opacity: unlimited ? 0.42 : 1,
              }}>
              <input type="number" min="1" dir="ltr"
                value={unlimited ? "" : rate.gb}
                onFocus={() => unlimited && onChange({ gb: 30 })}
                onChange={(e) => onChange({ gb: Math.max(0, Number(e.target.value)) })}
                placeholder="مثلاً ۵۰"
                className="flex-1 bg-transparent border-0 outline-none py-2.5 text-[12.5px]"
                style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }} />
              <span className="text-[10.5px] shrink-0" style={{ color: "var(--muted)" }}>گیگابایت</span>
            </div>
          </div>
        </div>

        <button onClick={onDelete} className="fx-ico-btn shrink-0" style={{ width: 36, height: 36 }}>
          <Trash2 size={13} />
        </button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[10px]" style={{ color: "var(--muted)" }}>قیمت ماهانه</label>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {rate.price ? `${faNum(rate.price)} تومان` : "—"}
          </span>
        </div>

        <div className="flex items-center gap-0.5 rounded-xl p-1"
          style={{
            background: "rgba(0,0,0,.28)", border: "1px solid var(--border)",
            boxShadow: "0 2px 8px rgba(0,0,0,.35) inset",
          }}>
          <button onClick={() => bump(-RATE_STEP)} className="nx-step">−</button>
          <input type="number" dir="ltr" value={rate.price || ""}
            onChange={(e) => onChange({ price: Math.max(0, Number(e.target.value)) })}
            placeholder="0"
            className="flex-1 bg-transparent border-0 outline-none text-center py-2 text-[15px] font-bold"
            style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }} />
          <button onClick={() => bump(RATE_STEP)} className="nx-step">+</button>
        </div>

        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {RATE_QUICK.map((q) => {
            const on = rate.price === q;
            return (
              <button key={q} onClick={() => onChange({ price: q })}
                className="px-2.5 py-1 rounded-lg text-[10.5px]"
                style={{
                  background: on ? "rgba(43,127,214,.14)" : "transparent",
                  border: `1px solid ${on ? "rgba(43,127,214,.4)" : "var(--border)"}`,
                  color: on ? "var(--accent-2)" : "var(--muted)",
                  fontFamily: "'JetBrains Mono',monospace",
                }}>{faNum(q / 1000)}k</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function useBilling(password) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/billing/groups`, {
        headers: { "X-Admin-Password": password },
      }).then((r) => r.json());
      setData(d);
    } catch {
      setData({ ready: false, error: "اتصال به سرور برقرار نشد", groups: [] });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  return { data, loading, reload: load };
}

function BillingUnavailable({ info }) {
  return (
    <div className="fx-card p-8 text-center" style={{ borderStyle: "dashed" }}>
      <AlertTriangle size={24} style={{ color: "var(--warn)" }} className="mx-auto mb-3" />
      <div className="text-[13.5px] font-semibold text-white mb-2">
        دیتابیس ۳x-ui خوانده نشد
      </div>
      <p className="text-[11.5px] mb-4 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
        {info?.error || "مسیر دیتابیس در دسترس نیست."}
      </p>
      {info?.dbPath && (
        <code dir="ltr" className="text-[10.5px] px-3 py-1.5 rounded-lg inline-block"
          style={{ background: "var(--surface-3)", color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
          {info.dbPath}
        </code>
      )}
      <p className="text-[11px] mt-5 pt-4 max-w-sm mx-auto leading-relaxed"
        style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
        حسابداری نیاز دارد پنل روی همان سروری باشد که ۳x-ui نصب است.
        اگر مسیر دیتابیس متفاوت است، متغیر <code dir="ltr" style={{ color: "var(--accent-2)" }}>XUI_DB_PATH</code> را
        در سرویس تنظیم کنید.
      </p>
    </div>
  );
}

function BillingDash({ password }) {
  const { data, loading, reload } = useBilling(password);
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;
  if (!data?.ready) return (
    <div className="fx-anim">
      <SectionHead title="داشبورد حسابداری" desc="" />
      <BillingUnavailable info={data} />
    </div>
  );

  const billed = data.groups.filter((g) => g.billed);
  const due = billed.reduce((s, g) => s + g.amount, 0);
  const paid = billed.reduce((s, g) => s + g.paid, 0);
  const uncertain = billed.reduce((s, g) => s + (g.uncertain || 0), 0);

  return (
    <div className="fx-anim">
      <SectionHead title="داشبورد حسابداری"
        desc={`${data.totalClients} کانفیگ در ${data.groups.length} گروه`}
        action={
          <button onClick={reload} className="fx-btn-g px-3 py-2.5 text-[12px] flex items-center gap-1.5">
            <RefreshCw size={13} /> تازه‌سازی
          </button>
        } />

      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
        {[["کل بدهی دوره", due, "var(--accent-2)"],
          ["دریافت‌شده", paid, "var(--ok)"],
          ["مانده", due - paid, due - paid > 0 ? "var(--warn)" : "var(--ok)"]].map(([l, v, col], i) => (
          <div key={i} className="fx-card p-4">
            <div className="fx-stat-num text-[19px] font-extrabold leading-none"
              style={{ color: col, fontFamily: "'JetBrains Mono',monospace" }}>{faNum(v)}</div>
            <div className="text-[10.5px] mt-2" style={{ color: "var(--dim)" }}>{l} · تومان</div>
          </div>
        ))}
      </div>

      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4">وضعیت هر واسطه</div>
        {billed.length === 0 ? (
          <div className="text-center py-8 text-[11.5px]" style={{ color: "var(--muted)" }}>
            هنوز گروهی به‌عنوان واسطه علامت نخورده — از بخش «واسطه‌ها و نرخ» شروع کنید
          </div>
        ) : billed.map((g, i) => {
          const rest = g.amount - g.paid;
          const pct = g.amount ? Math.min(100, Math.round(g.paid * 100 / g.amount)) : 0;
          return (
            <div key={g.name} className="py-3.5"
              style={{ borderBottom: i < billed.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex justify-between items-start gap-3 mb-2.5 flex-wrap">
                <div>
                  <div className="text-[12.5px] font-semibold text-white">{g.label}</div>
                  <div className="text-[10px] mt-1" dir="ltr"
                    style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {g.name} · {g.configs} config · {g.months} months
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[13.5px] font-extrabold"
                    style={{ color: rest > 0 ? "var(--warn)" : "var(--ok)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {faNum(rest)}
                  </div>
                  <div className="text-[9.5px] mt-0.5" style={{ color: "var(--muted)" }}>
                    {rest > 0 ? "مانده" : "تسویه شده"}
                  </div>
                </div>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.05)" }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 99,
                  background: pct >= 100 ? "var(--ok)" : "linear-gradient(90deg,var(--accent),var(--accent-2))",
                  transition: "width .5s cubic-bezier(.22,1,.36,1)",
                }} />
              </div>
              {g.unpriced?.length > 0 && (
                <div className="text-[10.5px] mt-2" style={{ color: "var(--warn)" }}>
                  حجم بدون نرخ: {g.unpriced.map((v) => v ? `${faNum(v)}GB` : "نامحدود").join("، ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {uncertain > 0 && (
        <InfoBox tone="warn">
          <b>{faNum(uncertain)} کانفیگ تمدید تخمینی دارند.</b> پنل ۳x-ui تاریخچه‌ی تمدید
          ندارد، پس تعداد ماه از فاصله‌ی «ایجاد تا انقضا» حساب می‌شود. اگر تمدید زودتر از
          موعد انجام شده باشد، عدد کمتر از واقعیت درمی‌آید.
          <br /><br />
          از امروز هر تمدیدی که از ربات یا پنل انجام شود ثبت می‌شود و تخمین جای خودش را
          به عدد قطعی می‌دهد.
        </InfoBox>
      )}
    </div>
  );
}

function BillingGroups({ password }) {
  const { data, loading, reload } = useBilling(password);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;
  if (!data?.ready) return (
    <div className="fx-anim">
      <SectionHead title="واسطه‌ها و نرخ" desc="" />
      <BillingUnavailable info={data} />
    </div>
  );

  const get = (g) => draft[g.name] || { label: g.label, billed: g.billed, rates: g.rates };
  const set = (g, patch) => setDraft({ ...draft, [g.name]: { ...get(g), ...patch } });

  const save = async (g) => {
    setSaving(g.name);
    try {
      await fetch(`${API_URL}/api/admin/billing/group/${encodeURIComponent(g.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify(get(g)),
      });
      await reload();
      setDraft({ ...draft, [g.name]: undefined });
    } finally { setSaving(null); }
  };

  return (
    <div className="fx-anim">
      <SectionHead title="واسطه‌ها و نرخ"
        desc="گروه‌ها از ۳x-ui خوانده می‌شوند. برای هرکدام تعیین کنید واسطه است یا مشتری مستقیم." />

      {data.groups.map((g) => {
        const d = get(g);
        const isOpen = open === g.name;
        const dirty = !!draft[g.name];
        return (
          <div key={g.name} className="fx-card mb-3 overflow-hidden" style={{ padding: 0 }}>
            <div onClick={() => setOpen(isOpen ? null : g.name)}
              className="p-4 cursor-pointer flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="fx-ico" style={{ background: d.billed ? "rgba(43,127,214,.12)" : "rgba(255,255,255,.04)" }}>
                  <Users size={16} style={{ color: d.billed ? "var(--accent-2)" : "var(--muted)" }} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-white">{d.label || g.name}</div>
                  <div className="text-[10px] mt-1" dir="ltr"
                    style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {g.name} · {g.configs} configs · {g.usedGB}GB used
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {d.billed && g.amount > 0 && (
                  <span className="text-[11.5px] font-bold"
                    style={{ color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {faNum(g.amount)}
                  </span>
                )}
                <div onClick={(e) => { e.stopPropagation(); set(g, { billed: !d.billed }); }}>
                  <Toggle checked={d.billed} onChange={() => {}} />
                </div>
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                {!d.billed ? (
                  <div className="py-6 text-center text-[11.5px]" style={{ color: "var(--muted)" }}>
                    مشتری مستقیم شماست — در صورتحساب واسطه‌ها نمی‌آید.
                  </div>
                ) : (
                  <>
                    <div className="pt-4">
                      <Field label="نام نمایشی">
                        <input className="fx-input" value={d.label || ""}
                          onChange={(e) => set(g, { label: e.target.value })}
                          placeholder={g.name} />
                      </Field>
                    </div>

                    <div className="flex justify-between items-center mb-3 mt-1 flex-wrap gap-2">
                      <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>نرخ ماهانه بر اساس حجم</span>
                      <button onClick={() => set(g, { rates: [...(d.rates || []), { gb: 0, price: 190000 }] })}
                        className="fx-btn-g px-3 py-2 text-[11px] flex items-center gap-1.5">
                        <PlusIcon size={12} /> افزودن نرخ
                      </button>
                    </div>

                    {(d.rates || []).length === 0 && (
                      <div className="rounded-xl p-4 text-center mb-3"
                        style={{ background: "rgba(251,191,36,.06)", border: "1px dashed rgba(251,191,36,.3)" }}>
                        <div className="text-[11.5px] mb-1" style={{ color: "var(--warn)" }}>هنوز نرخی تعریف نشده</div>
                        <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                          بدون نرخ، این گروه صفر حساب می‌شود
                        </div>
                      </div>
                    )}

                    {(d.rates || []).map((r, i) => (
                      <RateRow key={i} rate={r}
                        onChange={(patch) => {
                          const l = [...d.rates]; l[i] = { ...l[i], ...patch };
                          set(g, { rates: l });
                        }}
                        onDelete={() => set(g, { rates: d.rates.filter((_, x) => x !== i) })} />
                    ))}

                    <div className="grid gap-2 mt-3 pt-3" style={{
                      gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
                      borderTop: "1px solid var(--border)",
                    }}>
                      {[["کانفیگ", g.configs], ["فعال", g.active],
                        ["ماه", g.months], ["تمدید", g.renewals]].map(([k, v], i) => (
                        <div key={i} className="text-center">
                          <div className="text-[15px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                            {faNum(v)}
                          </div>
                          <div className="text-[9.5px] mt-1" style={{ color: "var(--muted)" }}>{k}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {dirty && (
                  <button onClick={() => save(g)} disabled={saving === g.name}
                    className="fx-btn w-full mt-4 py-2.5 text-[12.5px] flex items-center justify-center gap-2">
                    {saving === g.name ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    ذخیره
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BillingInvoice({ password }) {
  const { data, loading } = useBilling(password);
  const [sel, setSel] = useState("");
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);

  const billed = data?.groups?.filter((g) => g.billed) || [];
  useEffect(() => { if (!sel && billed.length) setSel(billed[0].name); }, [data]);

  const gen = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const d = await fetch(`${API_URL}/api/admin/billing/invoice/${encodeURIComponent(sel)}`, {
        headers: { "X-Admin-Password": password },
      }).then((r) => r.json());
      setInv(d);
    } finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;
  if (!data?.ready) return (
    <div className="fx-anim"><SectionHead title="صورتحساب" desc="" /><BillingUnavailable info={data} /></div>
  );

  return (
    <div className="fx-anim">
      <SectionHead title="صورتحساب" desc="جزئیات کامل هر واسطه، آماده برای ارسال." />

      {billed.length === 0 ? (
        <div className="fx-card p-8 text-center" style={{ borderStyle: "dashed" }}>
          <FileText size={24} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            ابتدا حداقل یک گروه را واسطه علامت بزنید
          </div>
        </div>
      ) : (
        <>
          <div className="fx-card p-5 mb-4">
            <Field label="واسطه">
              <select className="fx-input" value={sel} onChange={(e) => { setSel(e.target.value); setInv(null); }}>
                {billed.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
              </select>
            </Field>
            <button onClick={gen} disabled={busy}
              className="fx-btn w-full py-2.5 text-[12.5px] flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              ساخت صورتحساب
            </button>
          </div>

          {inv && (
            <div className="fx-card p-5">
              <div className="text-[13px] font-semibold text-white mb-4">{inv.label}</div>

              {inv.unpricedVolumes?.length > 0 && (
                <InfoBox tone="warn">
                  حجم‌های بدون نرخ کنار گذاشته شدند:{" "}
                  {inv.unpricedVolumes.map((v) => v ? `${faNum(v)}GB` : "نامحدود").join("، ")}
                </InfoBox>
              )}

              <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                {[["کل مبلغ", inv.totalAmount, "var(--text)"],
                  ["پرداخت‌شده", inv.paid, "var(--ok)"],
                  ["مانده", inv.balance, inv.balance > 0 ? "var(--warn)" : "var(--ok)"]].map(([k, v, col], i) => (
                  <div key={i} className="flex justify-between py-1.5">
                    <span className="text-[11.5px]" style={{ color: i === 2 ? "var(--text)" : "var(--muted)" }}>{k}</span>
                    <span className="font-bold" style={{
                      color: col, fontSize: i === 2 ? 14 : 12,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>{faNum(v)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11.5px] mb-2" style={{ color: "var(--dim)" }}>
                {faNum(inv.items.length)} کانفیگ
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {inv.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 gap-3"
                    style={{ borderBottom: i < inv.items.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div className="min-w-0">
                      <div className="text-[11.5px] truncate" dir="ltr"
                        style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}>
                        {it.email}
                      </div>
                      <div className="text-[9.5px] mt-1" style={{ color: "var(--muted)" }}>
                        {it.gb ? `${faNum(it.gb)}GB` : "نامحدود"} · {faNum(it.months)} ماه
                        {it.renewals > 0 && ` · ${faNum(it.renewals)} تمدید`}
                        {!it.certain && it.drift != null && ` · ±${it.drift} روز`}
                      </div>
                    </div>
                    <span className="text-[11.5px] font-semibold shrink-0"
                      style={{
                        color: it.lineTotal == null ? "var(--warn)" : "var(--dim)",
                        fontFamily: "'JetBrains Mono',monospace",
                      }}>
                      {it.lineTotal == null ? "بدون نرخ" : faNum(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BillingPayments({ password }) {
  const { data } = useBilling(password);
  const [list, setList] = useState([]);
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ group: "", amount: "", date: "", note: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/billing/payments`, {
        headers: { "X-Admin-Password": password },
      }).then((r) => r.json());
      setList(d.payments || []);
    } catch { /* بی‌صدا */ }
  };
  useEffect(() => { load(); }, [password]);

  const billed = data?.groups?.filter((g) => g.billed) || [];

  const submit = async () => {
    if (!form.group || !form.amount) return;
    setBusy(true);
    try {
      await fetch(`${API_URL}/api/admin/billing/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setAdd(false);
      setForm({ group: "", amount: "", date: "", note: "" });
      load();
    } finally { setBusy(false); }
  };

  const del = async (id) => {
    await fetch(`${API_URL}/api/admin/billing/payment/${id}`, {
      method: "DELETE", headers: { "X-Admin-Password": password },
    });
    load();
  };

  return (
    <div className="fx-anim">
      <SectionHead title="پرداخت‌ها"
        desc="پرداخت‌های واسطه در ۳x-ui ثبت نمی‌شوند — هر دریافتی را اینجا بزنید تا مانده درست حساب شود."
        action={
          <button onClick={() => setAdd(true)} className="fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5">
            <PlusIcon size={14} /> ثبت پرداخت
          </button>
        } />

      {list.length === 0 ? (
        <div className="fx-card p-8 text-center" style={{ borderStyle: "dashed" }}>
          <Wallet size={24} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>هنوز پرداختی ثبت نشده</div>
        </div>
      ) : (
        <div className="fx-card overflow-hidden" style={{ padding: 0 }}>
          {list.map((p, i) => {
            const g = data?.groups?.find((x) => x.name === p.group_name);
            return (
              <div key={p.id} className="p-4 flex justify-between items-center gap-3 flex-wrap"
                style={{ borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <div className="text-[12.5px] font-semibold text-white">{g?.label || p.group_name}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                    {p.paid_at || p.created_at?.slice(0, 10)}{p.note && ` · ${p.note}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold" style={{ color: "var(--ok)", fontFamily: "'JetBrains Mono',monospace" }}>
                    +{faNum(p.amount)}
                  </span>
                  <button onClick={() => del(p.id)} className="fx-ico-btn" style={{ width: 28, height: 28 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {add && createPortal(
        <div className="nx-modal-wrap fx-fade" onClick={() => setAdd(false)}>
          <div className="fx-card fx-scale p-5" style={{ width: "min(400px,92vw)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[14px] font-bold text-white">ثبت پرداخت</span>
              <button onClick={() => setAdd(false)} className="fx-ico-btn" style={{ width: 28, height: 28 }}>
                <X size={14} />
              </button>
            </div>
            <Field label="واسطه">
              <select className="fx-input" value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}>
                <option value="">انتخاب کنید</option>
                {billed.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="مبلغ (تومان)">
              <input className="fx-input" dir="ltr" type="number" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ fontFamily: "'JetBrains Mono',monospace" }} />
            </Field>
            <Field label="تاریخ" hint="اختیاری">
              <input className="fx-input" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="۱۴۰۵/۰۶/۲۵" />
            </Field>
            <Field label="توضیح" hint="اختیاری">
              <input className="fx-input" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <button onClick={submit} disabled={busy || !form.group || !form.amount}
              className="fx-btn w-full py-2.5 text-[12.5px] flex items-center justify-center gap-2 mt-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              ثبت
            </button>
          </div>
        </div>, document.body)}
    </div>
  );
}


/* ===================== اتصال گیت‌هاب ===================== */

function GithubCard({ password }) {
  const [repo, setRepo] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const d = await fetch(`${API_URL}/api/admin/github`, {
        headers: { "X-Admin-Password": password },
      }).then((r) => r.json());
      setRepo(d.repo || "");
      setSaved(d.repo || "");
    } catch { /* بی‌صدا */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [password]);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 5000); return () => clearTimeout(t); } }, [msg]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/github`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify({ repo }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaved(d.repo || "");
        setRepo(d.repo || "");
        setMsg({ t: "ok", m: d.latestTag
          ? `متصل شد — آخرین نسخه: ${d.latestTag}`
          : "ذخیره شد" });
      } else {
        setMsg({ t: "err", m: d.detail || "ذخیره ناموفق بود" });
      }
    } catch { setMsg({ t: "err", m: "اتصال به سرور برقرار نشد" }); }
    finally { setBusy(false); }
  };

  if (loading) return null;

  const dirty = repo.trim() !== saved;

  return (
    <div className="fx-card p-5 mb-4">
      <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
        <Github size={15} style={{ color: "var(--accent-2)" }} /> مخزن به‌روزرسانی
      </div>
      <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
        وقتی مخزن را وصل کنید، پنل نسخه‌های جدید را از Releases گیت‌هاب می‌گیرد
        و به‌روزرسانی از همین‌جا انجام می‌شود.
      </p>

      <Field label="آدرس مخزن" hint="مثلاً username/nexora — یا لینک کامل گیت‌هاب">
        <div className="flex gap-2">
          <input className="fx-input" dir="ltr" value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="username/nexora"
            onKeyDown={(e) => e.key === "Enter" && dirty && save()}
            style={{ fontFamily: "'JetBrains Mono',monospace" }} />
          <button onClick={save} disabled={busy || !dirty}
            className="fx-btn px-4 py-2.5 text-[12.5px] shrink-0 flex items-center gap-1.5"
            style={!dirty ? { opacity: 0.45, cursor: "not-allowed" } : {}}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {busy ? "بررسی..." : "اتصال"}
          </button>
        </div>
      </Field>

      {msg && (
        <div className="rounded-xl p-3 mb-3 flex items-start gap-2 text-[11.5px] leading-relaxed"
          style={{
            background: msg.t === "err" ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
            border: `1px solid ${msg.t === "err" ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`,
            color: msg.t === "err" ? "var(--danger)" : "var(--ok)",
          }}>
          {msg.t === "err" ? <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                           : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
          <span>{msg.m}</span>
        </div>
      )}

      {saved ? (
        <div className="flex items-center gap-2 text-[11.5px]" style={{ color: "var(--ok)" }}>
          <CheckCircle2 size={13} />
          متصل به{" "}
          <a href={`https://github.com/${saved}`} target="_blank" rel="noreferrer"
            dir="ltr" className="underline"
            style={{ color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
            {saved}
          </a>
        </div>
      ) : (
        <InfoBox>
          <b>قبل از اتصال:</b> مخزن باید عمومی باشد و حداقل یک Release داشته باشد.
          پنل هنگام اتصال این را بررسی می‌کند.
        </InfoBox>
      )}
    </div>
  );
}

/* ===================== کارت به‌روزرسانی ===================== */

function UpdateCard({ password }) {
  const [info, setInfo] = useState(null);
  const [checking, setChecking] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const finishRef = React.useRef(null);
  const [log, setLog] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/check-update`, { headers: { "X-Admin-Password": password } });
      if (res.ok) setInfo(await res.json());
    } catch { /* بی‌صدا */ }
    finally { setChecking(false); }
  };

  useEffect(() => { check(); }, [password]);

  // در حین به‌روزرسانی، لاگ را دنبال می‌کنیم.
  // نکته‌ی مهم: سرویس وسط کار ری‌استارت می‌شود، پس درخواست‌ها موقتاً شکست
  // می‌خورند. برای همین چند محافظ لازم است تا صفحه گیر نکند:
  //   ۱. سقف زمانی کلی (۶ دقیقه) — بعد از آن به‌هرحال رفرش می‌کنیم
  //   ۲. تشخیص بازگشت سرویس: اگر بعد از قطعی دوباره سالم شد، یعنی تمام شده
  //   ۳. رفرش خودکار در هر حالت پایان
  useEffect(() => {
    if (!updating) return;

    let elapsed = 0;
    let sawDowntime = false;
    let quiet = 0;          // چند بار پشت سر هم لاگ بدون تغییر ماند
    let lastLen = 0;
    let done = false;

    const finish = (delay = 2200) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      setUpdating(false);
      setTimeout(() => window.location.reload(), delay);
    };
    finishRef.current = finish;

    const timer = setInterval(async () => {
      elapsed += 2000;
      setElapsedSec(Math.floor(elapsed / 1000));

      // سقف کلی — ۴ دقیقه کافی است؛ بیشتر یعنی چیزی خراب شده
      if (elapsed > 240000) {
        setLog((l) => [...l, "— زمان انتظار تمام شد —"]);
        setStuck(true);
        clearInterval(timer);
        return;
      }

      try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`${API_URL}/api/admin/update-log?_t=${Date.now()}`, {
          headers: { "X-Admin-Password": password },
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(to);

        if (res.ok) {
          const d = await res.json();
          const lines = d.lines || [];
          if (lines.length) setLog(lines);

          if (d.finished || d.failed) { finish(); return; }

          // سرویس برگشته بعد از قطعی → کار تمام است
          if (sawDowntime) {
            setLog((l) => [...l, "— سرویس بازگشت —"]);
            finish(1500);
            return;
          }

          // لاگ بی‌حرکت: اگر ۳۰ ثانیه هیچ خط تازه‌ای نیامد و سرویس هم
          // سالم است، یعنی یا تمام شده یا گیر کرده. به کاربر اختیار می‌دهیم
          // به‌جای اینکه بی‌صدا منتظر بماند.
          if (lines.length === lastLen) {
            quiet += 1;
            if (quiet >= 15) {
              setStuck(true);
              clearInterval(timer);
              return;
            }
          } else {
            quiet = 0;
            lastLen = lines.length;
          }
        }
      } catch {
        // سرویس در حال ری‌استارت — طبیعی است
        sawDowntime = true;
        quiet = 0;
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [updating, password]);

  const startUpdate = async () => {
    setConfirmOpen(false);
    setStuck(false);
    setElapsedSec(0);
    setUpdating(true);
    setLog(["در حال شروع به‌روزرسانی..."]);
    try {
      await fetch(`${API_URL}/api/admin/run-update`, {
        method: "POST",
        headers: { "X-Admin-Password": password },
      });
    } catch { /* سرویس ری‌استارت می‌شود، خطا طبیعی است */ }
  };

  const hasUpdate = info?.updateAvailable;

  return (
    <>
      <div className="fx-card p-5 mb-4" style={hasUpdate ? { borderColor: "rgba(52,211,153,.4)", boxShadow: "0 0 24px rgba(52,211,153,.08)" } : {}}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="fx-ico" style={{ background: hasUpdate ? "rgba(52,211,153,.12)" : "rgba(43,127,214,.12)" }}>
              <RefreshCw size={16} className={checking ? "animate-spin" : ""}
                style={{ color: hasUpdate ? "var(--ok)" : "var(--accent-2)" }} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white">به‌روزرسانی</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                {checking ? "در حال بررسی..." :
                 !info?.configured ? "به‌روزرسانی خودکار تنظیم نشده" :
                 info?.error ? "ارتباط با گیت‌هاب برقرار نشد" :
                 hasUpdate ? `نسخه ${info.latestVersion} در دسترس است` :
                 "شما آخرین نسخه را دارید"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="fx-pill" style={{ background: "rgba(255,255,255,.05)", color: "var(--muted)" }}>
              نسخه فعلی: {info?.currentVersion || "?"}
            </span>
            {!updating && (
              <button onClick={check} className="fx-btn-g px-3 py-2 text-[11.5px] flex items-center gap-1.5">
                <RefreshCw size={12} /> بررسی مجدد
              </button>
            )}
          </div>
        </div>

        {/* در حال به‌روزرسانی */}
        {updating && (
          <div className="rounded-xl p-4"
            style={{ background: "var(--surface-3)", border: `1px solid ${stuck ? "rgba(251,191,36,.35)" : "rgba(90,169,230,.3)"}` }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                {stuck
                  ? <AlertTriangle size={14} style={{ color: "var(--warn)" }} />
                  : <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent-2)" }} />}
                <span className="text-[12px] font-semibold"
                  style={{ color: stuck ? "var(--warn)" : "var(--accent-2)" }}>
                  {stuck ? "پاسخی از سرور نمی‌آید" : "در حال به‌روزرسانی — صفحه را نبندید"}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")}
              </span>
            </div>

            {stuck && (
              <div className="rounded-xl p-3 mb-3 text-[11.5px] leading-relaxed"
                style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.25)", color: "var(--dim)" }}>
                لاگی دریافت نمی‌شود. معمولاً یعنی به‌روزرسانی تمام شده و سرویس ری‌استارت شده،
                ولی گاهی هم یعنی چیزی خطا داده. یکی از گزینه‌های زیر را انتخاب کنید.
              </div>
            )}

            {stuck && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <button onClick={() => window.location.reload()}
                  className="fx-btn px-4 py-2.5 text-[12px] flex items-center gap-1.5">
                  <RefreshCw size={13} /> بارگذاری مجدد پنل
                </button>
                <button onClick={() => { setStuck(false); setUpdating(false); }}
                  className="fx-btn-g px-4 py-2.5 text-[12px]">
                  بستن و ادامه کار
                </button>
              </div>
            )}
            <div className="rounded-lg p-3 max-h-52 overflow-y-auto" dir="ltr"
              style={{ background: "#05070C", border: "1px solid var(--border)" }}>
              {log.length === 0 ? (
                <div className="text-[11px]" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  waiting for output...
                </div>
              ) : log.map((l, i) => (
                <div key={i} className="text-[11px] leading-relaxed"
                  style={{ color: l.includes("✓") ? "var(--ok)" : l.includes("✗") ? "var(--danger)" : "var(--dim)",
                           fontFamily: "'JetBrains Mono',monospace" }}>
                  {l}
                </div>
              ))}
            </div>
            <p className="text-[10.5px] mt-3" style={{ color: "var(--muted)" }}>
              بعد از اتمام، صفحه خودکار بارگذاری مجدد می‌شود.
            </p>
          </div>
        )}

        {/* نسخه جدید موجود است */}
        {!updating && hasUpdate && (
          <>
            <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} style={{ color: "var(--ok)" }} />
                <span className="text-[12.5px] font-semibold" style={{ color: "var(--ok)" }}>
                  نسخه {info.latestVersion} منتشر شده
                </span>
              </div>
              {info.releaseNotes && (
                <div className="text-[11px] leading-relaxed max-h-32 overflow-y-auto mt-2 whitespace-pre-line"
                  style={{ color: "var(--dim)" }}>
                  {info.releaseNotes}
                </div>
              )}
            </div>

            <button onClick={() => setConfirmOpen(true)}
              className="fx-btn w-full py-3 text-[13px] flex items-center justify-center gap-2">
              <Download size={15} /> به‌روزرسانی به نسخه {info.latestVersion}
            </button>

            <p className="text-[10.5px] mt-2.5 text-center" style={{ color: "var(--muted)" }}>
              تنظیمات، رمز عبور و واسطه‌های شما حفظ می‌شوند
            </p>
          </>
        )}

        {/* آخرین نسخه */}
        {!updating && !hasUpdate && info?.configured && !info?.error && (
          <div className="rounded-xl p-4 flex items-center gap-2.5" style={{ background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)" }}>
            <CheckCircle2 size={15} style={{ color: "var(--ok)" }} />
            <span className="text-[12px]" style={{ color: "var(--dim)" }}>
              شما آخرین نسخه ({info.currentVersion}) را دارید
            </span>
          </div>
        )}

        {/* تنظیم نشده */}
        {!updating && !info?.configured && !checking && (
          <div className="rounded-xl p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
            <p className="text-[11.5px] mb-2.5" style={{ color: "var(--dim)" }}>
              برای فعال‌سازی به‌روزرسانی خودکار، این دستور را روی سرور اجرا کنید:
            </p>
            <code dir="ltr" className="block px-3 py-2.5 rounded-lg text-[11px]"
              style={{ background: "#05070C", border: "1px solid var(--border-2)", color: "var(--accent-2)",
                       fontFamily: "'JetBrains Mono',monospace", wordBreak: "break-all" }}>
              echo 'GITHUB_REPO="nexoratech-v/nexora-subscription-manager"' &gt; /opt/nexora-panel/.github
            </code>
            <p className="text-[10.5px] mt-2" style={{ color: "var(--muted)" }}>
              سپس <span dir="ltr" style={{ fontFamily: "'JetBrains Mono',monospace" }}>nexora restart</span> را بزنید.
            </p>
          </div>
        )}

        {/* خطای اتصال */}
        {!updating && info?.error && (
          <div className="rounded-xl p-4" style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)" }}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
              <div>
                <div className="text-[12px] mb-1" style={{ color: "var(--warn)" }}>ارتباط با گیت‌هاب برقرار نشد</div>
                <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>
                  ممکن است سرور به گیت‌هاب دسترسی نداشته باشد. می‌توانید از ترمینال به‌روزرسانی کنید:
                  <span dir="ltr" style={{ fontFamily: "'JetBrains Mono',monospace" }}> nexora update</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fx-fade"
          style={{ background: "rgba(3,6,12,.78)", backdropFilter: "blur(6px)" }} onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 fx-scale" onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid rgba(90,169,230,.35)" }}>
            <div className="flex items-center gap-2 mb-2.5" style={{ color: "var(--accent-2)" }}>
              <Download size={18} />
              <span className="text-[14px] font-semibold">به‌روزرسانی به {info?.latestVersion}؟</span>
            </div>
            <p className="text-[12px] mb-3 leading-relaxed" style={{ color: "var(--muted)" }}>
              سرویس برای چند دقیقه ری‌استارت می‌شود. صفحه‌ی اشتراک مشتریان در این مدت
              با تنظیمات فعلی به کار خود ادامه می‌دهد.
            </p>
            <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)" }}>
              <div className="text-[11px] leading-relaxed" style={{ color: "var(--dim)" }}>
                قبل از شروع، یک بک‌آپ خودکار از تنظیمات گرفته می‌شود.
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="fx-btn-g flex-1 py-2.5 text-[12.5px]">انصراف</button>
              <button onClick={startUpdate} className="fx-btn flex-1 py-2.5 text-[12.5px]">شروع به‌روزرسانی</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== سیستم و به‌روزرسانی ===================== */

function SystemSection({ password }) {
  const [sys, setSys] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/system`, { headers: { "X-Admin-Password": password } });
        if (res.ok) setSys(await res.json());
      } catch { /* بی‌صدا */ }
      finally { setLoading(false); }
    })();
  }, [password]);

  const CMD = ({ children }) => (
    <code dir="ltr" className="block px-3 py-2.5 rounded-lg text-[11.5px] my-1.5"
      style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)",
               color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </code>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;
  }

  return (
    <div className="fx-anim">
      <SectionHead title="سیستم و به‌روزرسانی" desc="وضعیت نصب، نسخه‌ی فعلی و راهنمای به‌روزرسانی." />

      {/* وضعیت */}
      <div className="fx-g4 grid grid-cols-4 gap-3 mb-4">
        <div className="fx-card p-4">
          <div className="fx-ico mb-3" style={{ background: "rgba(43,127,214,.12)" }}>
            <Server size={16} style={{ color: "var(--accent-2)" }} />
          </div>
          <div className="text-[17px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            {sys?.version || "?"}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--dim)" }}>نسخه فعلی</div>
        </div>

        <div className="fx-card p-4">
          <div className="fx-ico mb-3" style={{ background: sys?.template?.exists ? "rgba(52,211,153,.12)" : "rgba(248,113,113,.12)" }}>
            <HardDrive size={16} style={{ color: sys?.template?.exists ? "var(--ok)" : "var(--danger)" }} />
          </div>
          <div className="text-[15px] font-bold" style={{ color: sys?.template?.exists ? "var(--ok)" : "var(--danger)" }}>
            {sys?.template?.exists ? "نصب شده" : "پیدا نشد"}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--dim)" }}>قالب صفحه اشتراک</div>
          {sys?.template?.size > 0 && (
            <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted)" }}>
              {(sys.template.size / 1024).toFixed(0)} KB
            </div>
          )}
        </div>

        <div className="fx-card p-4">
          <div className="fx-ico mb-3" style={{ background: "rgba(167,139,250,.12)" }}>
            <Smartphone size={16} style={{ color: "var(--purple)" }} />
          </div>
          <div className="text-[17px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            {sys?.counts?.apps ?? 0}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--dim)" }}>اپلیکیشن</div>
        </div>

        <div className="fx-card p-4">
          <div className="fx-ico mb-3" style={{ background: "rgba(251,191,36,.12)" }}>
            <Users size={16} style={{ color: "var(--warn)" }} />
          </div>
          <div className="text-[17px] font-bold text-white" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            {sys?.counts?.resellers ?? 0}
          </div>
          <div className="text-[11.5px] mt-1" style={{ color: "var(--dim)" }}>واسطه</div>
        </div>
      </div>

      {/* هشدار آدرس API */}
      {sys?.template?.apiUrl?.includes("localhost") && (
        <div className="mb-4">
          <InfoBox tone="warn">
            <b>هشدار:</b> آدرس API داخل قالب روی <span dir="ltr">localhost</span> است.
            مرورگر مشتری نمی‌تواند به آن وصل شود و تنظیمات پنل اعمال نخواهد شد.
            <br />با دستور <span dir="ltr" style={{ fontFamily: "'JetBrains Mono',monospace" }}>nexora update</span> یا اجرای مجدد نصب، آن را به دامنه‌ی واقعی تغییر دهید.
          </InfoBox>
        </div>
      )}

      {/* مسیرها */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
          <HardDrive size={15} style={{ color: "var(--accent-2)" }} /> مسیرهای نصب
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { l: "قالب صفحه اشتراک", v: sys?.template?.path },
            { l: "فایل تنظیمات", v: sys?.configPath },
            { l: "آدرس API در قالب", v: sys?.template?.apiUrl },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
              <span className="text-[12px] shrink-0" style={{ color: "var(--dim)" }}>{row.l}</span>
              <span dir="ltr" className="text-[11px] truncate" style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                {row.v || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* به‌روزرسانی */}
      {sys?.build?.stale && (
        <div className="fx-card p-4 mb-4 flex items-start gap-3"
          style={{ background: "rgba(251,191,36,.08)", borderColor: "rgba(251,191,36,.35)" }}>
          <AlertTriangle size={17} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-white mb-1">
              پنل با کد فعلی ساخته نشده
            </div>
            <div className="text-[11.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
              کد به‌روز است ولی صفحه‌ای که می‌بینید از بیلد قبلی است — به همین دلیل
              قابلیت‌های جدید ظاهر نمی‌شوند. معمولاً یعنی بیلد در آخرین به‌روزرسانی
              شکست خورده است.
              <br />
              <code dir="ltr" className="inline-block mt-2 px-3 py-1.5 rounded-lg text-[11.5px]"
                style={{ background: "var(--surface-3)", color: "var(--warn)", fontFamily: "'JetBrains Mono',monospace" }}>
                nexora rebuild
              </code>
            </div>
          </div>
        </div>
      )}

      <GithubCard password={password} />
      <UpdateCard password={password} />
      <RollbackCard password={password} />

      {/* بازگشت به نسخه قبل */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-1 flex items-center gap-2">
          <RefreshCw size={15} style={{ color: "var(--warn)" }} className="scale-x-[-1]" /> بازگشت به نسخه قبل
        </div>
        <p className="text-[11.5px] mb-4 leading-relaxed" style={{ color: "var(--muted)" }}>
          قبل از هر به‌روزرسانی، یک نسخه‌ی کامل از سیستم ذخیره می‌شود (۵ نسخه‌ی آخر نگه داشته می‌شود).
          اگر نسخه‌ی جدید مشکلی داشت، می‌توانید برگردید.
        </p>
        <div className="rounded-xl p-4" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
          <div className="text-[11.5px] mb-2" style={{ color: "var(--dim)" }}>مشاهده نسخه‌های ذخیره‌شده:</div>
          <CMD>nexora snapshots</CMD>
          <div className="text-[11.5px] mt-3 mb-2" style={{ color: "var(--dim)" }}>بازگشت به یکی از آن‌ها:</div>
          <CMD>nexora rollback</CMD>
          <p className="text-[10.5px] mt-3 leading-relaxed" style={{ color: "var(--muted)" }}>
            هنگام بازگشت می‌پرسد که تنظیمات فعلی حفظ شود یا تنظیمات همان نسخه برگردد.
            وضعیت فعلی هم قبل از بازگشت ذخیره می‌شود، پس همیشه می‌توانید دوباره جلو بروید.
          </p>
        </div>
      </div>

      {/* دستورات */}
      <div className="fx-card p-5 mb-4">
        <div className="text-[13px] font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal size={15} style={{ color: "var(--accent-2)" }} /> دستورات مدیریتی
        </div>
        {[
          { c: "nexora status", d: "وضعیت کامل سرویس‌ها" },
          { c: "nexora logs", d: "لاگ زنده (خروج با Ctrl+C)" },
          { c: "nexora restart", d: "ری‌استارت بک‌اند" },
          { c: "nexora rebuild", d: "ساخت مجدد پنل (رفع مشکل ظاهری)" },
          { c: "nexora backup", d: "بک‌آپ فوری از تنظیمات" },
          { c: "nexora snapshots", d: "لیست نسخه‌های ذخیره‌شده" },
          { c: "nexora rollback", d: "بازگشت به نسخه قبل" },
          { c: "nexora diagnose", d: "عیب‌یابی نمایش قالب" },
        ].map((x, i, arr) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <code dir="ltr" className="text-[11.5px]" style={{ color: "var(--accent-2)", fontFamily: "'JetBrains Mono',monospace" }}>{x.c}</code>
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>{x.d}</span>
          </div>
        ))}
      </div>

      <InfoBox>
        قبل از هر به‌روزرسانی، یک بک‌آپ دستی هم بگیرید: <b>تنظیمات → پشتیبان‌گیری → دریافت پشتیبان</b>
      </InfoBox>
    </div>
  );
}

/* ===================== پیش‌نمایش زنده صفحه اشتراک ===================== */

function LivePreview({ dirty, onSave, saving }) {
  const [key, setKey] = useState(0);
  const [device, setDevice] = useState("mobile");
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  const DEVICES = {
    mobile: { w: 390, label: "موبایل", icon: Smartphone, sub: "iPhone 14 Pro" },
    tablet: { w: 768, label: "تبلت", icon: Monitor, sub: "iPad" },
    desktop: { w: 1200, label: "دسکتاپ", icon: Monitor, sub: "لپ‌تاپ" },
  };
  const d = DEVICES[device];
  const scale = zoom / 100;

  const refresh = () => { setLoading(true); setKey((k) => k + 1); };

  return (
    <div className="fx-anim">
      <SectionHead
        title="پیش‌نمایش زنده"
        desc="دقیقاً همان چیزی که مشتری می‌بیند — با تنظیمات ذخیره‌شده‌ی شما و داده‌ی نمونه."
      />

      {dirty && (
        <div className="mb-4">
          <div className="rounded-2xl p-4 flex items-start gap-3 flex-wrap" style={{ background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.28)" }}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
            <div className="flex-1 min-w-[200px]">
              <div className="text-[12.5px] font-semibold mb-1" style={{ color: "var(--warn)" }}>تغییرات ذخیره‌نشده دارید</div>
              <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
                پیش‌نمایش، آخرین نسخه‌ی <b>ذخیره‌شده</b> را نشان می‌دهد. برای دیدن تغییرات جدید، اول ذخیره کنید.
              </p>
            </div>
            <button onClick={async () => { await onSave(); setTimeout(refresh, 300); }} disabled={saving}
              className="fx-btn px-3.5 py-2 text-[11.5px] flex items-center gap-1.5 shrink-0">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              ذخیره و به‌روزرسانی
            </button>
          </div>
        </div>
      )}

      {/* نوار ابزار */}
      <div className="fx-card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-[11px]" style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)" }}>
            {Object.entries(DEVICES).map(([k, v]) => (
              <button key={k} onClick={() => setDevice(k)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[11.5px] font-medium transition-all"
                style={device === k ? { background: "var(--accent-2)", color: "#06090F" } : { color: "var(--muted)" }}>
                <v.icon size={12} /> {v.label}
              </button>
            ))}
          </div>
          <span className="text-[10.5px] px-2.5 py-1.5 rounded-lg" style={{ background: "var(--surface-3)", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
            {d.w}px · {d.sub}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-1 py-1 rounded-[11px]" style={{ background: "var(--surface-3)", border: "1px solid var(--border-2)" }}>
            <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="fx-ico-btn" style={{ width: 28, height: 28 }} aria-label="کوچک‌نمایی"><Minus size={13} /></button>
            <span className="text-[11px] w-11 text-center" style={{ color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace" }}>{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(150, z + 10))} className="fx-ico-btn" style={{ width: 28, height: 28 }} aria-label="بزرگ‌نمایی"><Plus size={13} /></button>
          </div>
          <a href={`${API_URL}/api/preview`} target="_blank" rel="noreferrer" className="fx-btn-g px-3 py-2 text-[11.5px] flex items-center gap-1.5">
            <ExternalLink size={13} /> <span className="fx-hide-m">تب جدید</span>
          </a>
          <button onClick={refresh} className="fx-btn px-3.5 py-2 text-[11.5px] flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> به‌روزرسانی
          </button>
        </div>
      </div>

      {/* ناحیه پیش‌نمایش با اسکرول */}
      <div className="fx-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-3)" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
          </div>
          <div className="text-[10.5px] px-3 py-1 rounded-md flex-1 mx-3 text-center truncate" dir="ltr"
            style={{ background: "var(--surface)", color: "var(--muted)", fontFamily: "'JetBrains Mono',monospace" }}>
            {API_URL}/api/preview
          </div>
          <div className="w-14 fx-hide-m" />
        </div>

        <div className="nx-preview-scroll" style={{ background: "#05070C" }}>
          <div className="flex justify-center p-6" style={{ minWidth: device === "desktop" ? d.w * scale + 48 : "auto" }}>
            <div className="relative" style={{ width: d.w * scale, transition: "width .25s ease" }}>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[18px] z-10" style={{ background: "var(--surface-3)" }}>
                  <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent-2)" }} />
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>در حال بارگذاری...</span>
                </div>
              )}
              <iframe
                key={key}
                src={`${API_URL}/api/preview?t=${key}`}
                onLoad={() => setLoading(false)}
                title="پیش‌نمایش صفحه اشتراک"
                style={{
                  width: d.w,
                  height: 760,
                  border: "1px solid var(--border-2)",
                  borderRadius: 18,
                  background: "var(--bg)",
                  display: "block",
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  transition: "transform .25s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <InfoBox>
          داده‌های نمایش‌داده‌شده (حجم، تاریخ انقضا، کانفیگ‌ها) <b>نمونه</b> هستند و در سرور واقعی با اطلاعات هر مشتری جایگزین می‌شوند — ولی تمام تنظیماتی که در این پنل ذخیره کرده‌اید (اپ‌ها، رنگ‌ها، بنرها، متن‌ها) دقیقاً همان‌طور که اینجا می‌بینید اعمال می‌شوند.
        </InfoBox>
      </div>
    </div>
  );
}

/* ===================== اپ اصلی ===================== */

export default function App() {
  const [password, setPassword] = useState(() => localStorage.getItem("nexora_subpage_admin_pw") || "");
  const [authed, setAuthed] = useState(false);
  const [config, setConfigRaw] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [active, setActive] = useState("overview");
  const [workspace, setWorkspace] = useState(() => {
    const w = localStorage.getItem("nexora_workspace");
    return WORKSPACES[w] ? w : "sub";
  });

  // حالت نمایش سوییچ فضای کاری — سلیقه‌ای است، پس در مرورگر می‌ماند
  const [wsMode, setWsMode] = useState(() => {
    try {
      const m = localStorage.getItem("nexora-ws-mode");
      return WS_MODES[m] ? m : "accordion";
    } catch {
      return "accordion";
    }
  });

  useEffect(() => {
    try { localStorage.setItem("nexora-ws-mode", wsMode); } catch { /* بی‌صدا */ }
  }, [wsMode]);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // نسخه‌ی آخرین حالت ذخیره‌شده — مرجع برای لغو تغییرات
  const [savedConfig, setSavedConfig] = useState(null);

  const setConfig = (next) => { setConfigRaw(next); setDirty(true); };

  // بازگرداندن همه‌ی تغییرات ذخیره‌نشده به آخرین حالت ذخیره‌شده
  const discardChanges = () => {
    if (!savedConfig) return;
    setConfigRaw(JSON.parse(JSON.stringify(savedConfig)));
    setDirty(false);
    setToast({ message: "تغییرات لغو شد", type: "ok" });
  };

  const fetchAll = useCallback(async (pw) => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/config`, { headers: { "X-Admin-Password": pw } }),
        fetch(`${API_URL}/api/admin/stats`, { headers: { "X-Admin-Password": pw } }),
      ]);
      if (!cRes.ok) throw new Error();
      const loaded = await cRes.json();
      setConfigRaw(loaded);
      setSavedConfig(JSON.parse(JSON.stringify(loaded)));
      if (sRes.ok) setStats(await sRes.json());
      setAuthed(true);
    } catch { setAuthed(false); localStorage.removeItem("nexora_subpage_admin_pw"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (password) fetchAll(password); else setLoading(false); }, [password, fetchAll]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  // هنگام باز بودن کشو: بستن با Escape.
  // نکته: اسکرول body را قفل نمی‌کنیم چون خود سایدبار اسکرول داخلی دارد
  // و قفل‌کردن body در بعضی مرورگرهای موبایل باعث گیرکردن کل صفحه می‌شود.
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const navigate = (k) => { setActive(k); setOpen(false); };

  // اگر صفحه‌ی فعال در حالت کاری جاری وجود نداشت (مثلاً بعد از رفرش)،
  // خودکار به اولین صفحه‌ی همان حالت می‌رویم تا صفحه‌ی خالی نبینیم.
  useEffect(() => {
    const keys = WORKSPACES[workspace].groups.flatMap((g) => g.items).map((i) => i.key);
    if (!keys.includes(active)) {
      const first = WORKSPACES[workspace].groups.flatMap((g) => g.items).find((i) => !i.badge);
      if (first) setActive(first.key);
    }
  }, [workspace, active]);

  // تعویض حالت کاری — به اولین آیتم فعال همان حالت می‌رود
  const switchWorkspace = (wsKey) => {
    setWorkspace(wsKey);
    localStorage.setItem("nexora_workspace", wsKey);
    const first = WORKSPACES[wsKey].groups
      .flatMap((g) => g.items)
      .find((i) => !i.badge);
    if (first) setActive(first.key);
    setOpen(false);
  };
  const login = (pw) => { localStorage.setItem("nexora_subpage_admin_pw", pw); setPassword(pw); };
  const logout = () => { localStorage.removeItem("nexora_subpage_admin_pw"); setPassword(""); setAuthed(false); };

  // بعد از تغییر موفق رمز، رمز جدید را جایگزین می‌کنیم تا کاربر
  // بدون نیاز به ورود مجدد بتواند به کارش ادامه دهد.
  const handlePasswordChanged = (newPw) => {
    localStorage.setItem("nexora_subpage_admin_pw", newPw);
    setPassword(newPw);
    setToast({ message: "رمز عبور تغییر کرد — نیازی به ورود مجدد نیست", type: "ok" });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Password": password },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setDirty(false);
        setSavedConfig(JSON.parse(JSON.stringify(config)));
        setToast({ message: "تغییرات با موفقیت ذخیره شد", type: "ok" });
        const sRes = await fetch(`${API_URL}/api/admin/stats`, { headers: { "X-Admin-Password": password } });
        if (sRes.ok) setStats(await sRes.json());
      } else setToast({ message: "ذخیره‌سازی ناموفق بود", type: "error" });
    } catch { setToast({ message: "اتصال به سرور برقرار نشد", type: "error" }); }
    finally { setSaving(false); }
  };

  const confirmDelete = () => {
    const t = confirmTarget;
    if (t.type === "app") setConfig({ ...config, downloadApps: { ...(config.downloadApps || {}), [t.os]: (config.downloadApps?.[t.os] || []).filter((_, i) => i !== t.idx) } });
    else if (t.type === "faq") setConfig({ ...config, faq: { ...config.faq, [t.lang]: (config.faq?.[t.lang] || []).filter((_, i) => i !== t.idx) } });
    else if (t.type === "video") setConfig({ ...config, videos: config.videos.filter((_, i) => i !== t.idx) });
    else if (t.type === "reseller") setConfig({ ...config, resellers: config.resellers.filter((_, i) => i !== t.idx) });
    setConfirmTarget(null);
  };

  if (!password || !authed) {
    if (loading && password) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;
    return <LoginScreen onLogin={login} />;
  }
  if (loading || !config) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}><Loader2 className="animate-spin" style={{ color: "var(--muted)" }} /></div>;

  const currentNav = ALL_NAV.find((n) => n.key === active);
  const filteredNav = (items) => search ? items.filter((n) => n.label.includes(search)) : items;

  return (
    <div className="min-h-screen w-full flex" style={{ background: "var(--bg)" }} dir="rtl">
      {open && <div className="fx-backdrop fx-fade" onClick={() => setOpen(false)} />}

      <aside className={`fx-side ${open ? "open" : ""}`}>
        <div className="flex items-center justify-between gap-2 px-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[17px] shrink-0"
              style={{ background: "linear-gradient(135deg,#2B7FD6,#8FC1EE)", color: "#06090F", fontFamily: "'Chakra Petch',sans-serif" }}>N</div>
            <div className="min-w-0">
              <div className="text-[14.5px] font-bold text-white leading-none" style={{ fontFamily: "'Chakra Petch',sans-serif" }}>NEXORA</div>
              <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>پنل مدیریت</div>
            </div>
          </div>
          <button className="lg:hidden shrink-0" onClick={() => setOpen(false)} style={{ color: "var(--dim)" }}><X size={18} /></button>
        </div>

        <WorkspaceSwitch mode={wsMode} workspace={workspace} onSwitch={switchWorkspace}
          active={active} setActive={setActive} />

        {/* در حالت تاشو، منو داخل خود آکاردئون است — اینجا تکرارش نمی‌کنیم */}
        {wsMode !== "accordion" && WORKSPACES[workspace].groups.map((group) => {
          const items = filteredNav(group.items);
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <div className="fx-side-label">{group.title}</div>
              <nav className="flex flex-col gap-1">
                {items.map((n) => (
                  <button key={n.key} className={`fx-nav-item ${active === n.key ? "on" : ""}`}
                    onClick={() => navigate(n.key)} disabled={!!n.badge}
                    style={n.badge ? { opacity: 0.55, cursor: "not-allowed" } : {}}>
                    <n.icon size={16} />
                    <span className="flex-1 text-right">{n.label}</span>
                    {n.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(251,191,36,.15)", color: "var(--warn)" }}>
                        {n.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          );
        })}

        <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="fx-card p-3 mb-3" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Circle size={7} fill="var(--ok)" strokeWidth={0} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--ok)" }}>سرویس فعال</span>
            </div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }} dir="ltr">t.me/{config.links?.channelUsername}</div>
          </div>
          <button onClick={logout} className="fx-nav-item"><LogOut size={15} /> خروج</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="fx-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <button className="fx-burger" onClick={() => setOpen(true)} aria-label="منو"><Menu size={19} /></button>
            <div className="min-w-0">
              <h1 className="text-[16.5px] font-bold text-white truncate" style={{ fontFamily: "'Chakra Petch',sans-serif" }}>{currentNav?.label}</h1>
              <p className="text-[11px] mt-0.5 fx-hide-m" style={{ color: "var(--muted)" }}>مدیریت صفحه اشتراک مشتریان</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="fx-search">
              <Search size={14} style={{ color: "var(--muted)" }} />
              <input placeholder="جستجو در بخش‌ها..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="fx-hide-m"><StatusChip dirty={dirty} /></div>
            {dirty && (
              <button onClick={discardChanges} title="بازگرداندن به آخرین حالت ذخیره‌شده"
                className="fx-btn-g px-3 py-2.5 text-[12px] flex items-center gap-1.5 shrink-0">
                <RefreshCw size={13} className="scale-x-[-1]" />
                <span className="fx-hide-m">لغو تغییرات</span>
              </button>
            )}
            <button onClick={save} disabled={saving || !dirty} className="fx-desktop-save fx-btn px-4 py-2.5 text-[12.5px] flex items-center gap-1.5 shrink-0">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span className="fx-hide-m">{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
            </button>
          </div>
        </header>

        <main className="fx-main flex-1 p-7 overflow-y-auto w-full mx-auto">
          {active === "overview" && <OverviewSection config={config} stats={stats} navigate={navigate} dirty={dirty} />}
          {active === "preview" && <LivePreview dirty={dirty} onSave={save} saving={saving} />}
          {active === "apps" && <AppsSection config={config} setConfig={setConfig} requestDelete={setConfirmTarget} />}
          {active === "videos" && <VideosSection config={config} setConfig={setConfig} requestDelete={setConfirmTarget} />}
          {active === "faq" && <FaqSection config={config} setConfig={setConfig} requestDelete={setConfirmTarget} />}
          {active === "resellers" && <ResellersSection config={config} setConfig={setConfig} requestDelete={setConfirmTarget} password={password} />}
          {active === "bot" && <BotSection password={password} dirty={dirty} />}
          {active === "bot-plans" && <BotPlansSection password={password} />}
          {active === "bot-orders" && <BotOrdersSection password={password} />}
          {active === "bot-users" && <BotUsersSection password={password} />}
          {active === "bot-coins" && <BotCoinsSection password={password} />}
          {active === "bill-dash" && <BillingDash password={password} />}
          {active === "bill-groups" && <BillingGroups password={password} />}
          {active === "bill-invoice" && <BillingInvoice password={password} />}
          {active === "bill-pay" && <BillingPayments password={password} />}
          {active === "bot-texts" && <BotTextsSection password={password} />}
          {active === "bot-preview" && <BotPreviewSection />}
          {active === "bot-stats" && <BotStatsSection password={password} />}
          {active === "bot-backup" && <BotBackupSection password={password} />}
          {active === "popup" && <PopupSection config={config} setConfig={setConfig} />}
          {active === "banners" && <BannersSection config={config} setConfig={setConfig} />}
          {active === "referral" && <ReferralSection config={config} setConfig={setConfig} />}
          {active === "links" && <LinksSection config={config} setConfig={setConfig} />}
          {active === "settings" && <SettingsSection config={config} setConfig={setConfig} password={password} wsMode={wsMode} setWsMode={setWsMode} onPasswordChanged={handlePasswordChanged} onRestored={() => fetchAll(password)} />}
          {active === "themes" && <ThemesSection config={config} setConfig={setConfig} password={password} />}
          {active === "system" && <SystemSection password={password} />}
        </main>
      </div>

      <div className="fx-mobile-save">
        <div className="shrink-0"><StatusChip dirty={dirty} /></div>
        <button onClick={save} disabled={saving || !dirty} className="fx-btn flex-1 flex items-center justify-center gap-2 py-3 text-[13px]">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
      </div>

      {confirmTarget && (
        <ConfirmModal title="حذف این مورد؟"
          desc={`آیا مطمئن هستید می‌خواهید «${confirmTarget.name}» را حذف کنید؟ این عمل بعد از ذخیره‌ی تغییرات، از صفحه‌ی اشتراک هم حذف می‌شود.`}
          onConfirm={confirmDelete} onCancel={() => setConfirmTarget(null)} />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
