"""Discover community threads via Serper Google search."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv

load_dotenv()

SERPER_URL = "https://google.serper.dev/search"
_COMMUNITY_DOMAINS = ("reddit.com", "quora.com")
# Prefer fresh hits; only drop recency filters when pool is thin
_MIN_HITS_MONTH = 8
_MIN_HITS_YEAR = 10
_MIN_HITS_BEFORE_BROAD = 6


@dataclass
class DiscoveredThread:
    title: str
    url: str
    snippet: str
    source: str  # reddit | quora | other
    query: str
    date: str = ""


def _source_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "reddit.com" in host:
        return "reddit"
    if "quora.com" in host:
        return "quora"
    return "other"


def _normalize_url(url: str) -> str:
    parsed = urlparse(url)
    if "reddit.com" in parsed.netloc:
        path = parsed.path.rstrip("/")
        if path.endswith(".json"):
            path = path[:-5]
        return f"https://www.reddit.com{path}"
    return url.split("?")[0].rstrip("/")


def _is_community_thread(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    if not any(d in host for d in _COMMUNITY_DOMAINS):
        return False
    if "reddit.com" in host:
        return "/comments/" in url or "/r/" in url
    if "quora.com" in host:
        return "/answer/" in url or re.search(r"quora\.com/[^/]+$", url)
    return True


def _dedupe_queries(queries: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for q in queries:
        key = q.lower()
        if key not in seen:
            seen.add(key)
            out.append(q)
        if len(out) >= limit:
            break
    return out


def build_queries(
    product_name: str,
    niche: str,
    keywords: list[str],
    *,
    product_summary: str = "",
) -> list[str]:
    """Generate Serper queries — niche/problem first (works for unknown brands)."""
    kw = [k.strip() for k in keywords if k and k.strip()][:6]
    queries: list[str] = []

    # Niche pain queries (primary for sites nobody has heard of)
    if niche:
        niche_core = niche.split("+")[0].strip()[:80]
        queries.extend([
            f"{niche_core} recommendation site:reddit.com",
            f"best {niche_core} site:reddit.com",
            f"looking for {niche_core} site:reddit.com",
            f"help with {niche_core} site:reddit.com",
        ])

    for k in kw:
        queries.extend([
            f"{k} site:reddit.com",
            f"recommend {k} site:reddit.com",
            f"what {k} do you use site:reddit.com",
            f"frustrated with {k} site:reddit.com",
        ])

    # Pull extra terms from summary (first few meaningful phrases)
    if product_summary:
        for term in _summary_terms(product_summary):
            queries.append(f"{term} site:reddit.com")

    # Brand queries last — usually empty for indie sites
    brand = (product_name or "").strip()
    if brand and len(brand) > 2:
        queries.append(f"{brand} site:reddit.com")
        if brand.lower() not in (niche or "").lower():
            queries.append(f'"{brand}" alternative site:reddit.com')

    return _dedupe_queries(queries, 14)


def build_broad_fallback_queries(niche: str, keywords: list[str]) -> list[str]:
    """Broader queries when recent search returns too few hits."""
    kw = [k.strip() for k in keywords if k and k.strip()][:4]
    queries: list[str] = []

    if niche:
        token = niche.split()[0][:40] if niche.split() else niche[:40]
        queries.extend([
            f"site:reddit.com {token}",
            f"site:reddit.com {token} tool",
            f"site:reddit.com {token} app",
        ])

    for k in kw:
        queries.extend([
            f"site:reddit.com {k}",
            f"site:reddit.com {k} advice",
        ])

    return _dedupe_queries(queries, 8)


def _summary_terms(summary: str) -> list[str]:
    """Extract short searchable phrases from product summary."""
    cleaned = re.sub(r"[^\w\s&+-]", " ", summary.lower())
    words = [w for w in cleaned.split() if len(w) > 3][:12]
    terms: list[str] = []
    if len(words) >= 2:
        terms.append(" ".join(words[:3]))
    if len(words) >= 4:
        terms.append(" ".join(words[2:5]))
    return terms[:2]


def _serper_search(
    client: httpx.Client,
    headers: dict[str, str],
    query: str,
    *,
    per_query: int,
    tbs: str | None,
) -> list[dict]:
    payload: dict = {"q": query, "num": per_query}
    if tbs:
        payload["tbs"] = tbs
    resp = client.post(SERPER_URL, headers=headers, json=payload)
    resp.raise_for_status()
    return resp.json().get("organic", [])


def _collect_hits(
    organic: list[dict],
    query: str,
    seen_urls: set[str],
) -> list[DiscoveredThread]:
    found: list[DiscoveredThread] = []
    for item in organic:
        url = item.get("link", "")
        if not url or not _is_community_thread(url):
            continue
        norm = _normalize_url(url)
        if norm in seen_urls:
            continue
        seen_urls.add(norm)
        found.append(
            DiscoveredThread(
                title=item.get("title", ""),
                url=norm,
                snippet=item.get("snippet", ""),
                source=_source_from_url(norm),
                query=query,
                date=item.get("date", "") or "",
            )
        )
    return found


def parse_thread_date(date_str: str) -> datetime | None:
    """Parse Serper date labels like '2 months ago' or 'Mar 12, 2025'."""
    raw = (date_str or "").strip()
    if not raw:
        return None
    now = datetime.now(timezone.utc)
    lower = raw.lower()

    m = re.match(r"(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago", lower)
    if m:
        n = int(m.group(1))
        unit = m.group(2)
        delta = {
            "second": timedelta(seconds=n),
            "minute": timedelta(minutes=n),
            "hour": timedelta(hours=n),
            "day": timedelta(days=n),
            "week": timedelta(weeks=n),
            "month": timedelta(days=30 * n),
            "year": timedelta(days=365 * n),
        }.get(unit)
        if delta is not None:
            return now - delta

    for fmt in ("%b %d, %Y", "%B %d, %Y", "%Y-%m-%d", "%b %d %Y", "%d %b %Y"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def thread_recency_score(date_str: str) -> float:
    """Higher = newer. Unknown dates score low so known-recent wins."""
    dt = parse_thread_date(date_str)
    if not dt:
        return 0.0
    age_days = max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0)
    # 0 days → 100, ~30 days → ~70, ~180 days → ~25, 365+ → ~5
    return round(max(0.0, 100.0 * (0.5 ** (age_days / 90.0))), 2)


def sort_hits_by_recency(hits: list[DiscoveredThread]) -> list[DiscoveredThread]:
    return sorted(
        hits,
        key=lambda h: (thread_recency_score(h.date), h.date or ""),
        reverse=True,
    )


def search_threads(
    queries: list[str],
    api_key: str | None = None,
    per_query: int = 10,
    *,
    niche: str = "",
    keywords: list[str] | None = None,
) -> list[DiscoveredThread]:
    """Run Serper queries — past month first, then year, only then unfiltered."""
    key = api_key or os.environ.get("SERPER_API_KEY", "")
    if not key:
        raise RuntimeError("SERPER_API_KEY is not configured.")

    headers = {"X-API-KEY": key, "Content-Type": "application/json"}
    seen_urls: set[str] = set()
    results: list[DiscoveredThread] = []

    with httpx.Client(timeout=30) as client:
        # Pass 1: past month (fresh conversations)
        for query in queries:
            organic = _serper_search(client, headers, query, per_query=per_query, tbs="qdr:m")
            results.extend(_collect_hits(organic, query, seen_urls))

        # Pass 2: past year if month was thin
        if len(results) < _MIN_HITS_MONTH:
            for query in queries:
                organic = _serper_search(client, headers, query, per_query=per_query, tbs="qdr:y")
                results.extend(_collect_hits(organic, query, seen_urls))

        # Pass 3: broader niche queries still within past year
        if len(results) < _MIN_HITS_YEAR:
            fallback = build_broad_fallback_queries(niche, keywords or [])
            for query in fallback:
                organic = _serper_search(client, headers, query, per_query=per_query, tbs="qdr:y")
                results.extend(_collect_hits(organic, query, seen_urls))

        # Pass 4: only if still sparse — drop recency filter (last resort)
        if len(results) < _MIN_HITS_BEFORE_BROAD:
            for query in queries[:6]:
                organic = _serper_search(client, headers, query, per_query=per_query, tbs=None)
                results.extend(_collect_hits(organic, f"{query} (broad)", seen_urls))

    return sort_hits_by_recency(results)