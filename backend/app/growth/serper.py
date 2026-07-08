"""Discover community threads via Serper Google search."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv

load_dotenv()

SERPER_URL = "https://google.serper.dev/search"
_COMMUNITY_DOMAINS = ("reddit.com", "quora.com")


@dataclass
class DiscoveredThread:
    title: str
    url: str
    snippet: str
    source: str  # reddit | quora | other
    query: str


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


def build_queries(product_name: str, niche: str, keywords: list[str]) -> list[str]:
    """Generate Serper queries for community thread discovery."""
    kw = [k for k in keywords if k][:4]
    queries: list[str] = []

    if product_name:
        queries.append(f'"{product_name}" recommendation site:reddit.com')
        queries.append(f'"{product_name}" alternative site:reddit.com')

    if niche:
        queries.append(f'"{niche}" tool recommendation site:reddit.com')
        queries.append(f'how do I {niche} site:reddit.com')

    for k in kw:
        queries.append(f'"{k}" anyone know site:reddit.com')
        queries.append(f'site:reddit.com "{k}"')

    # Dedupe while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for q in queries:
        key = q.lower()
        if key not in seen:
            seen.add(key)
            out.append(q)
    return out[:8]


def search_threads(
    queries: list[str],
    api_key: str | None = None,
    per_query: int = 8,
) -> list[DiscoveredThread]:
    """Run Serper queries and return deduped community thread hits."""
    key = api_key or os.environ.get("SERPER_API_KEY", "")
    if not key:
        raise RuntimeError("SERPER_API_KEY is not configured.")

    headers = {"X-API-KEY": key, "Content-Type": "application/json"}
    seen_urls: set[str] = set()
    results: list[DiscoveredThread] = []

    with httpx.Client(timeout=30) as client:
        for query in queries:
            resp = client.post(
                SERPER_URL,
                headers=headers,
                json={"q": query, "num": per_query},
            )
            resp.raise_for_status()
            organic = resp.json().get("organic", [])
            for item in organic:
                url = item.get("link", "")
                if not url or not _is_community_thread(url):
                    continue
                norm = _normalize_url(url)
                if norm in seen_urls:
                    continue
                seen_urls.add(norm)
                results.append(
                    DiscoveredThread(
                        title=item.get("title", ""),
                        url=norm,
                        snippet=item.get("snippet", ""),
                        source=_source_from_url(norm),
                        query=query,
                    )
                )

    return results