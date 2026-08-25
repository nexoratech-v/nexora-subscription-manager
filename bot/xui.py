"""
کلاینت API پنل 3x-ui.

طبق مستندات رسمی، احراز هویت یا با لاگین (کوکی نشست) انجام می‌شود
یا با توکن API از مسیر Settings → Security → API Token به‌صورت Bearer.
همه‌ی endpointها زیر /panel/api/ هر دو حالت را می‌پذیرند.
"""

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

    def _req(self, method, path, **kw):
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

        if not data.get("success", False):
            raise XUIError(data.get("msg") or f"خطا در {path}")
        return data.get("obj")

    # ---------- inbound ----------
    def inbounds(self):
        return self._req("GET", "/panel/api/inbounds/list") or []

    def inbound(self, inbound_id):
        return self._req("GET", f"/panel/api/inbounds/get/{inbound_id}")

    # ---------- کلاینت ----------
    def add_client(self, inbound_id, email, gb=0, days=0, ip_limit=0,
                   client_uuid=None, tg_id=None, sub_id=None, flow=""):
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

        self._req("POST", "/panel/api/inbounds/addClient",
                  data={"id": inbound_id,
                        "settings": json.dumps({"clients": [client]})})
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

        self._req("POST", f"/panel/api/inbounds/updateClient/{client_uuid}",
                  data={"id": inbound_id,
                        "settings": json.dumps({"clients": [client]})})
        return client

    def find_client(self, inbound_id, email=None, client_uuid=None):
        inb = self.inbound(inbound_id)
        if not inb:
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
        return self._req("POST",
                         f"/panel/api/inbounds/{inbound_id}/delClient/{client_uuid}")

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
