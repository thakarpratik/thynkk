"""Lightweight site crawl — title + meta for product context."""

from __future__ import annotations

import ipaddress
import re
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

_MAX_HTML = 80_000
_UA = "Mozilla/5.0 (compatible; Thynkk/0.1; +https://thynkk.co)"


@dataclass
class SiteContext:
    url: str
    domain: str
    title: str
    description: str
    text_snippet: str


def _normalize_url(raw: str) -> str:
    raw = raw.strip()
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    if not parsed.netloc:
        raise ValueError("Invalid URL.")
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path or ''}".rstrip("/")


def _host_blocked(host: str) -> bool:
    if host in ("localhost", "127.0.0.1", "0.0.0.0"):
        return True
    if host.endswith(".local"):
        return True
    try:
        infos = socket.getaddrinfo(host, None)
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return True
    except socket.gaierror:
        pass
    return False


def _meta_content(html: str, attr: str, value: str) -> str:
    pattern = rf'<meta[^>]+{attr}=["\']{re.escape(value)}["\'][^>]+content=["\']([^"\']+)'
    m = re.search(pattern, html, re.I)
    if m:
        return m.group(1).strip()
    pattern2 = rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+{attr}=["\']{re.escape(value)}["\']'
    m2 = re.search(pattern2, html, re.I)
    return m2.group(1).strip() if m2 else ""


def _title_tag(html: str) -> str:
    m = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
    return m.group(1).strip() if m else ""


def _strip_text(html: str) -> str:
    text = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:3000]


def crawl_site(raw_url: str) -> SiteContext:
    url = _normalize_url(raw_url)
    host = urlparse(url).netloc
    if _host_blocked(host):
        raise ValueError("URL not allowed.")

    with httpx.Client(
        headers={"User-Agent": _UA},
        timeout=20,
        follow_redirects=True,
    ) as client:
        resp = client.get(url)
        resp.raise_for_status()
        html = resp.text[:_MAX_HTML]

    title = _meta_content(html, "property", "og:title") or _title_tag(html)
    description = (
        _meta_content(html, "property", "og:description")
        or _meta_content(html, "name", "description")
        or ""
    )
    body = _strip_text(html)

    return SiteContext(
        url=url,
        domain=host.replace("www.", ""),
        title=title or host,
        description=description,
        text_snippet=body[:2000],
    )