"""Request attribution helpers — referral, UTM source, tech, geo."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from fastapi import Request
from pydantic import BaseModel, Field, field_validator


class AttributionIn(BaseModel):
    """Client-provided first-touch / last-touch marketing fields."""

    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=256)
    referrer: str | None = Field(default=None, max_length=512)
    landing_path: str | None = Field(default=None, max_length=512)

    @field_validator(
        "utm_source", "utm_medium", "utm_campaign", "referrer", "landing_path",
        mode="before",
    )
    @classmethod
    def strip_empty(cls, v: Any) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s[:512] if s else None


class Attribution(BaseModel):
    """Normalized attribution stored on scan_log rows."""

    referrer: str = "direct"
    source: str = "direct"
    medium: str = "none"
    campaign: str = ""
    country: str = "unknown"
    device: str = "unknown"
    browser: str = "unknown"
    os: str = "unknown"


_MOBILE_RE = re.compile(r"Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini", re.I)
_TABLET_RE = re.compile(r"iPad|Tablet|Nexus 7|Nexus 9|Kindle|Silk", re.I)


def _normalize_host(value: str | None) -> str:
    if not value:
        return ""
    raw = value.strip()
    if not raw:
        return ""
    try:
        if "://" not in raw:
            raw = "https://" + raw
        host = urlparse(raw).hostname or ""
    except Exception:
        host = raw.split("/")[0]
    host = host.lower().removeprefix("www.")
    # Drop our own domains — treat as direct
    if host in {"thynkk.co", "www.thynkk.co", "localhost", "127.0.0.1"}:
        return ""
    return host[:128]


def _source_from_referrer(host: str) -> str:
    if not host:
        return "direct"
    h = host.lower()
    if "google." in h or h == "google.com":
        return "google"
    if "bing." in h or h == "bing.com":
        return "bing"
    if "duckduckgo." in h:
        return "duckduckgo"
    if "yahoo." in h:
        return "yahoo"
    if h in {"t.co", "twitter.com", "x.com"} or h.endswith(".twitter.com"):
        return "twitter"
    if "facebook." in h or h in {"fb.com", "m.facebook.com", "l.facebook.com"}:
        return "facebook"
    if "instagram." in h or h == "l.instagram.com":
        return "instagram"
    if "linkedin." in h or h == "lnkd.in":
        return "linkedin"
    if "reddit." in h or h == "redd.it":
        return "reddit"
    if "youtube." in h or h == "youtu.be":
        return "youtube"
    if "producthunt." in h:
        return "producthunt"
    if "github." in h:
        return "github"
    if "newsletter" in h or "mailchimp" in h or "substack." in h:
        return "email"
    return host


def parse_user_agent(ua: str | None) -> tuple[str, str, str]:
    """Return (device, browser, os)."""
    if not ua:
        return "unknown", "unknown", "unknown"

    if _TABLET_RE.search(ua):
        device = "tablet"
    elif _MOBILE_RE.search(ua):
        device = "mobile"
    else:
        device = "desktop"

    ua_l = ua.lower()
    if "edg/" in ua_l or "edge/" in ua_l:
        browser = "edge"
    elif "opr/" in ua_l or "opera" in ua_l:
        browser = "opera"
    elif "chrome/" in ua_l and "chromium" not in ua_l and "edg" not in ua_l:
        browser = "chrome"
    elif "firefox/" in ua_l or "fxios" in ua_l:
        browser = "firefox"
    elif "safari/" in ua_l and "chrome" not in ua_l and "chromium" not in ua_l:
        browser = "safari"
    elif "msie" in ua_l or "trident/" in ua_l:
        browser = "ie"
    else:
        browser = "other"

    if "windows" in ua_l:
        os_name = "windows"
    elif "android" in ua_l:
        os_name = "android"
    elif "iphone" in ua_l or "ipad" in ua_l or "ios" in ua_l:
        os_name = "ios"
    elif "mac os" in ua_l or "macintosh" in ua_l:
        os_name = "macos"
    elif "linux" in ua_l or "x11" in ua_l:
        os_name = "linux"
    elif "cros" in ua_l:
        os_name = "chromeos"
    else:
        os_name = "other"

    return device, browser, os_name


def country_from_request(request: Request) -> str:
    for header in (
        "CF-IPCountry",
        "cf-ipcountry",
        "X-Vercel-IP-Country",
        "x-vercel-ip-country",
        "CloudFront-Viewer-Country",
        "X-Country-Code",
        "X-Appengine-Country",
    ):
        val = request.headers.get(header)
        if val and val.strip() and val.strip().upper() not in {"XX", "T1", "ZZ"}:
            return val.strip().upper()[:8]
    return "unknown"


def extract_attribution(
    request: Request,
    client: AttributionIn | None = None,
) -> Attribution:
    """Merge client marketing fields with server-side geo/tech signals."""
    client = client or AttributionIn()

    referrer_host = _normalize_host(client.referrer)
    if not referrer_host:
        referrer_host = _normalize_host(request.headers.get("Referer") or request.headers.get("Referrer"))

    utm_source = (client.utm_source or "").strip().lower()[:128]
    utm_medium = (client.utm_medium or "").strip().lower()[:128]
    campaign = (client.utm_campaign or "").strip()[:256]

    if utm_source:
        source = utm_source
        medium = utm_medium or "campaign"
    else:
        source = _source_from_referrer(referrer_host)
        medium = utm_medium or ("referral" if referrer_host else "none")

    device, browser, os_name = parse_user_agent(request.headers.get("User-Agent"))
    country = country_from_request(request)

    return Attribution(
        referrer=referrer_host or "direct",
        source=source or "direct",
        medium=medium or "none",
        campaign=campaign,
        country=country,
        device=device,
        browser=browser,
        os=os_name,
    )


def attribution_to_dict(attr: Attribution) -> dict[str, str]:
    return attr.model_dump()
