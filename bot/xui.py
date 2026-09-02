"""
کلاینت API پنل 3x-ui.

طبق مستندات رسمی، احراز هویت یا با لاگین (کوکی نشست) انجام می‌شود
یا با توکن API از مسیر Settings → Security → API Token به‌صورت Bearer.
همه‌ی endpointها زیر /panel/api/ هر دو حالت را می‌پذیرند.
"""

import re
import json
import time
import uuid as uuidlib
import logging
from datetime import datetime, timedelta

import requests

log = logging.getLogger("nexora.xui")


class XUIError(Exception):
    pass


class XUI:
    def __init__(self, base_url, username=None, password=None, token=None, timeout=20):
        self.base = (base_url or "").rstrip("/")
        self.username = username
        self.password = password
        self.token = token
        self.timeout = timeout
        self.s = requests.Session()
        self._logged_in = False
        # مسیرهایی که یک‌بار جواب داده‌اند — تا هر بار دوباره نگردیم
        self._path_cache = {}
        self._routes = None
        self._api_mode = None

    # ---------- احراز هویت ----------
    def _headers(self):
        h = {"Accept": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    def login(self):
        """اگر توکن داریم نیازی به لاگین نیست."""
        if self.token:
            self._logged_in = True
            return True
        if not (self.username and self.password):
            raise XUIError("نام کاربری یا رمز پنل تنظیم نشده است")

        r = self.s.post(f"{self.base}/login",
                        data={"username": self.username, "password": self.password},
                        timeout=self.timeout)
        try:
            data = r.json()
        except ValueError:
            raise XUIError(f"پاسخ نامعتبر از پنل (HTTP {r.status_code})")

        if not data.get("success"):
            raise XUIError(data.get("msg") or "ورود به پنل ناموفق بود")
        self._logged_in = True
        return True

    def _req(self, method, path, raw=False, **kw):
        """
        درخواست به پنل.

        raw=True برای پاسخ‌هایی که ساختار {success, obj} ندارند —
        مثل مشخصات OpenAPI که یک JSON استاندارد است.
        """
        if not self._logged_in:
            self.login()

        url = f"{self.base}{path}"
        kw.setdefault("timeout", self.timeout)
        kw["headers"] = {**self._headers(), **kw.get("headers", {})}

        r = self.s.request(method, url, **kw)

        # نشست منقضی شده — یک‌بار دوباره لاگین می‌کنیم
        if r.status_code in (401, 403) and not self.token:
            self._logged_in = False
            self.login()
            r = self.s.request(method, url, **kw)

        try:
            data = r.json()
        except ValueError:
            raise XUIError(f"پاسخ غیر JSON از {path} (HTTP {r.status_code})")

        if raw:
            return data

        if not data.get("success", False):
            raise XUIError(data.get("msg") or f"خطا در {path}")
        return data.get("obj")

    # ---------- inbound ----------
    def inbounds(self):
        return self._req("GET", "/panel/api/inbounds/list") or []

    def inbound(self, inbound_id):
        return self._req("GET", f"/panel/api/inbounds/get/{inbound_id}")

    # ---------- کلاینت ----------
    def discover(self):
        """
        خواندن فهرست واقعی مسیرها از خود پنل.

        ۳x-ui از نسخه‌ی ۳ مشخصات OpenAPI را سرو می‌کند. به‌جای
        حدس زدن اینکه کدام نسخه چه مسیری دارد، همان را می‌خوانیم.
        این تنها راهی است که با نسخه‌های آینده هم کار می‌کند.
        """
        if self._routes is not None:
            return self._routes

        for path in ("/panel/api/openapi.json", "/openapi.json",
                     "/panel/openapi.json"):
            try:
                spec = self._req("GET", path, raw=True)
                if isinstance(spec, dict) and spec.get("paths"):
                    self._routes = {
                        p: set(m.upper() for m in ms)
                        for p, ms in spec["paths"].items()
                    }
                    return self._routes
            except Exception:
                continue

        self._routes = {}
        return self._routes

    def has_route(self, path, method="POST"):
        """آیا پنل این مسیر را دارد؟"""
        routes = self.discover()
        if not routes:
            return None          # نمی‌دانیم — باید امتحان کرد
        for p, methods in routes.items():
            # مسیرهای پارامتری مثل /clients/{email}
            pattern = re.sub(r"\{[^}]+\}", "[^/]+", p)
            if re.fullmatch(pattern, path) and method.upper() in methods:
                return True
        return False

    def _try_paths(self, candidates, label):
        """
        امتحان چند مسیر تا یکی جواب دهد.

        مسیرهای API بین نسخه‌های ۳x-ui عوض شده‌اند و از بیرون
        نمی‌شود فهمید کدام نسخه کدام را دارد. به‌جای حدس زدن،
        امتحان می‌کنیم و اولین مسیری که ۴۰۴ نمی‌دهد را نگه می‌داریم.
        """
        cached = self._path_cache.get(label)
        if cached:
            for method, path, payload in candidates:
                if path == cached:
                    return self._req(method, path, **payload)

        tried = []
        for method, path, payload in candidates:
            try:
                res = self._req(method, path, **payload)
                self._path_cache[label] = path
                return res
            except XUIError as e:
                msg = str(e)
                tried.append(f"{path} → {msg[:60]}")
                # فقط وقتی مسیر نبود ادامه می‌دهیم؛ خطای واقعی را
                # نباید پنهان کنیم
                if "404" not in msg and "not found" not in msg.lower():
                    raise

        raise XUIError(
            f"هیچ مسیری برای {label} جواب نداد. امتحان شد:\n" + "\n".join(tried))

    def add_client(self, inbound_id, email, gb=0, days=0, ip_limit=0,
                   client_uuid=None, tg_id=None, sub_id=None, flow="", group=None):
        """
        افزودن کلاینت به inbound.

        gb=0 یعنی نامحدود، days=0 یعنی بدون انقضا.
        مقدار expiryTime به میلی‌ثانیه است.
        """
        client_uuid = client_uuid or str(uuidlib.uuid4())
        expiry = 0
        if days and days > 0:
            expiry = int((datetime.now() + timedelta(days=days)).timestamp() * 1000)

        client = {
            "id": client_uuid,
            "email": email,
            "enable": True,
            "totalGB": int(gb * 1024 ** 3) if gb else 0,
            "expiryTime": expiry,
            "limitIp": int(ip_limit or 0),
            "tgId": str(tg_id or ""),
            "subId": sub_id or email,
            "reset": 0,
        }
        if flow:
            client["flow"] = flow

        settings = json.dumps({"clients": [client]})

        # ── نسخه‌ی ۳: کلاینت مستقل است ──
        #
        # در معماری جدید، کلاینت جدا ساخته می‌شود و بعد به یک یا
        # چند inbound وصل می‌شود. این با مدل قدیمی که کلاینت داخل
        # JSON اینباند بود کاملاً فرق دارد.
        if self.has_route("/panel/api/clients", "POST") is not False:
            try:
                body = {
                    "email": email,
                    "id": client["id"],
                    "totalGB": client.get("totalGB", 0),
                    "expiryTime": client.get("expiryTime", 0),
                    "limitIp": client.get("limitIp", 0),
                    "enable": True,
                    "subId": client.get("subId") or "",
                }
                if group:
                    body["groupName"] = group

                self._req("POST", "/panel/api/clients", json=body)

                # وصل کردن به اینباند — بدون این، کلاینت ساخته
                # می‌شود ولی هیچ‌جا فعال نیست
                for p in (f"/panel/api/clients/{email}/attach",
                          f"/panel/api/clients/{email}/inbounds"):
                    try:
                        self._req("POST", p, json={"inboundIds": [inbound_id]})
                        break
                    except XUIError:
                        continue

                self._path_cache["افزودن کلاینت"] = "/panel/api/clients"
                return client
            except XUIError as e:
                if "404" not in str(e):
                    raise

        # ── نسخه‌های قدیمی‌تر ──
        self._try_paths([
            ("POST", "/panel/api/inbounds/addClient",
             {"data": {"id": inbound_id, "settings": settings}}),
            ("POST", "/panel/api/inbounds/addClient",
             {"json": {"id": inbound_id, "settings": settings}}),
            ("POST", "/panel/api/clients/add",
             {"json": {"inboundId": inbound_id, **client}}),
            ("POST", "/panel/api/clients",
             {"json": {"inboundId": inbound_id, **client}}),
            ("POST", f"/panel/api/inbounds/{inbound_id}/clients",
             {"json": client}),
        ], "افزودن کلاینت")
        return client

    def update_client(self, inbound_id, client_uuid, **changes):
        """
        به‌روزرسانی کلاینت. باید کل آبجکت کلاینت فرستاده شود،
        پس اول وضعیت فعلی را می‌خوانیم و تغییرات را رویش اعمال می‌کنیم.
        """
        current = self.find_client(inbound_id, client_uuid=client_uuid)
        if not current:
            raise XUIError("کلاینت پیدا نشد")

        client = dict(current)
        for k, v in changes.items():
            client[k] = v

        settings = json.dumps({"clients": [client]})
        self._try_paths([
            ("POST", f"/panel/api/inbounds/updateClient/{client_uuid}",
             {"data": {"id": inbound_id, "settings": settings}}),
            ("POST", f"/panel/api/inbounds/updateClient/{client_uuid}",
             {"json": {"id": inbound_id, "settings": settings}}),
            ("POST", f"/panel/api/clients/{client_uuid}",
             {"json": {"inboundId": inbound_id, **client}}),
            ("PUT", f"/panel/api/clients/{client_uuid}",
             {"json": {"inboundId": inbound_id, **client}}),
        ], "به‌روزرسانی کلاینت")
        return client

    def find_client(self, inbound_id, email=None, client_uuid=None):
        """
        پیدا کردن کلاینت.

        در نسخه‌های جدید کلاینت‌ها ممکن است در JSON اینباند نباشند،
        پس اگر آنجا پیدا نشد از مسیر مستقل هم می‌پرسیم.
        """
        inb = self.inbound(inbound_id)
        if not inb:
            # شاید نسخه‌ی جدید — از مسیر کلاینت مستقیم بپرسیم
            if email:
                try:
                    return self._req("GET", f"/panel/api/clients/{email}")
                except XUIError:
                    pass
            return None
        try:
            settings = json.loads(inb.get("settings") or "{}")
        except json.JSONDecodeError:
            return None
        for c in settings.get("clients", []):
            if email and c.get("email") == email:
                return c
            if client_uuid and c.get("id") == client_uuid:
                return c
        return None

    def delete_client(self, inbound_id, client_uuid):
        return self._try_paths([
            ("POST", f"/panel/api/inbounds/{inbound_id}/delClient/{client_uuid}", {}),
            ("POST", f"/panel/api/clients/{client_uuid}/delete", {}),
            ("DELETE", f"/panel/api/clients/{client_uuid}", {}),
        ], "حذف کلاینت")

    def client_traffic(self, email):
        """مصرف کلاینت بر اساس ایمیل."""
        try:
            return self._req("GET", f"/panel/api/inbounds/getClientTraffics/{email}")
        except XUIError:
            return None

    def reset_client_traffic(self, inbound_id, email):
        return self._req("POST",
                         f"/panel/api/inbounds/{inbound_id}/resetClientTraffic/{email}")

    # ---------- عملیات سطح بالا ----------
    def create_subscription(self, inbound_id, email, gb, days, ip_limit=2,
                            tg_id=None, sub_base_url=None):
        """
        ساخت اشتراک کامل و برگرداندن اطلاعات لازم برای ارسال به مشتری.
        """
        sub_id = email  # همان email به‌عنوان subId تا لینک قابل‌پیش‌بینی باشد
        client = self.add_client(inbound_id, email, gb=gb, days=days,
                                 ip_limit=ip_limit, tg_id=tg_id, sub_id=sub_id)
        sub_url = None
        if sub_base_url:
            sub_url = f"{sub_base_url.rstrip('/')}/{sub_id}"
        return {
            "email": email,
            "uuid": client["id"],
            "sub_id": sub_id,
            "sub_url": sub_url,
            "expiry_ms": client["expiryTime"],
            "gb": gb,
        }

    def extend_subscription(self, inbound_id, client_uuid, add_days, add_gb=None,
                            reset_traffic=False):
        """
        تمدید: روز اضافه می‌شود. اگر اشتراک منقضی شده باشد، از امروز
        حساب می‌شود؛ وگرنه به تاریخ فعلی اضافه می‌شود.
        """
        current = self.find_client(inbound_id, client_uuid=client_uuid)
        if not current:
            raise XUIError("کلاینت پیدا نشد")

        now_ms = int(time.time() * 1000)
        cur_exp = int(current.get("expiryTime") or 0)
        base = cur_exp if cur_exp > now_ms else now_ms
        new_exp = base + add_days * 86400 * 1000 if add_days else cur_exp

        changes = {"expiryTime": new_exp, "enable": True}
        if add_gb is not None:
            cur_gb = int(current.get("totalGB") or 0)
            changes["totalGB"] = cur_gb + int(add_gb * 1024 ** 3) if add_gb else 0

        self.update_client(inbound_id, client_uuid, **changes)

        if reset_traffic:
            try:
                self.reset_client_traffic(inbound_id, current.get("email"))
            except XUIError:
                pass

        return {"expiry_ms": new_exp}

    def set_enabled(self, inbound_id, client_uuid, enabled: bool):
        return self.update_client(inbound_id, client_uuid, enable=bool(enabled))

    def detect_api(self):
        """
        تشخیص معماری پنل.

        از نسخه‌ی ۳.۴ به بعد، 3x-ui کلاینت‌ها را در جدول مستقل نگه می‌دارد
        و endpointهای تازه‌ای دارد (/panel/api/clients/*). نسخه‌های قدیمی‌تر
        کلاینت را داخل JSON هر inbound ذخیره می‌کنند.

        برمی‌گرداند: "modern" یا "legacy"
        نتیجه کش می‌شود تا هر بار درخواست اضافه نزنیم.
        """
        if getattr(self, "_api_mode", None):
            return self._api_mode

        self._api_mode = "legacy"
        try:
            if not self._logged_in:
                self.login()
            r = self.s.get(
                f"{self.base}/panel/api/clients/list/paged",
                params={"page": 1, "pageSize": 1},
                headers=self._headers(),
                timeout=self.timeout,
            )
            if r.status_code == 200:
                try:
                    body = r.json()
                    if isinstance(body, dict) and body.get("success") is not False:
                        self._api_mode = "modern"
                except ValueError:
                    pass
        except (requests.RequestException, XUIError):
            pass

        return self._api_mode

    def ping(self):
        """تست اتصال — برای نمایش وضعیت در پنل."""
        try:
            self.login()
            inbs = self.inbounds()
            mode = self.detect_api()
            label = "معماری جدید (۳.۴+)" if mode == "modern" else "معماری کلاسیک"
            return True, f"اتصال برقرار است · {len(inbs)} inbound · {label}"
        except XUIError as e:
            return False, str(e)
        except requests.RequestException as e:
            return False, f"شبکه: {e}"
