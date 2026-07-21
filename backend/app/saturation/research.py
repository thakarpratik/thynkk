"""Lightweight market research for saturation scoring via Serper."""

from __future__ import annotations

import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field

import httpx
from dotenv import load_dotenv

load_dotenv()

SERPER_URL = "https://google.serper.dev/search"

# Common product-ish tokens in SERP titles (rough competitor signal)
_PRODUCT_HINTS = re.compile(
    r"\b(app|software|tool|platform|saas|crm|api|ai|bot|extension|plugin|"
    r"dashboard|suite|system|service|solution|product|startup)\b",
    re.I,
)
_BRANDISH = re.compile(r"\b([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]+)?)\b")


@dataclass
class OrganicHit:
    title: str
    link: str
    snippet: str
    query: str


@dataclass
class ResearchSignals:
    idea: str
    competitor_hits: list[OrganicHit] = field(default_factory=list)
    reddit_hits: list[OrganicHit] = field(default_factory=list)
    directory_hits: list[OrganicHit] = field(default_factory=list)
    competitor_count_est: int = 0
    reddit_thread_count: int = 0
    directory_count: int = 0
    named_tools: list[str] = field(default_factory=list)
    serper_ok: bool = False
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "idea": self.idea,
            "competitor_count_est": self.competitor_count_est,
            "reddit_thread_count": self.reddit_thread_count,
            "directory_count": self.directory_count,
            "named_tools": self.named_tools[:12],
            "serper_ok": self.serper_ok,
            "error": self.error,
            "sample_competitors": [
                {"title": h.title[:120], "link": h.link, "snippet": h.snippet[:160]}
                for h in self.competitor_hits[:6]
            ],
            "sample_reddit": [
                {"title": h.title[:120], "link": h.link, "snippet": h.snippet[:160]}
                for h in self.reddit_hits[:6]
            ],
        }


def _serper_search(api_key: str, query: str, *, num: int = 10) -> list[dict]:
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    with httpx.Client(timeout=20) as client:
        resp = client.post(SERPER_URL, headers=headers, json={"q": query, "num": num})
        resp.raise_for_status()
        return resp.json().get("organic", []) or []


def _to_hits(organic: list[dict], query: str) -> list[OrganicHit]:
    out: list[OrganicHit] = []
    for item in organic:
        title = (item.get("title") or "").strip()
        link = (item.get("link") or "").strip()
        if not title or not link:
            continue
        out.append(
            OrganicHit(
                title=title,
                link=link,
                snippet=(item.get("snippet") or "").strip(),
                query=query,
            )
        )
    return out


def _extract_named_tools(hits: list[OrganicHit]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    skip = {
        "best",
        "top",
        "review",
        "reviews",
        "alternatives",
        "vs",
        "comparison",
        "reddit",
        "quora",
        "github",
        "product",
        "hunt",
        "g2",
        "capterra",
        "google",
        "how",
        "what",
        "why",
        "the",
        "and",
        "for",
        "with",
    }
    for h in hits:
        # Prefer first segment of title before | or -
        head = re.split(r"[|\-–—:]", h.title)[0].strip()
        tokens = _BRANDISH.findall(head) or ([head] if head and len(head) < 40 else [])
        for t in tokens[:2]:
            key = t.lower().strip()
            if key in skip or len(key) < 3:
                continue
            if key not in seen and _PRODUCT_HINTS.search(h.title + " " + h.snippet):
                seen.add(key)
                names.append(t.strip()[:40])
            elif key not in seen and any(
                d in h.link.lower()
                for d in ("g2.com", "capterra", "producthunt", "alternativeto", "getapp")
            ):
                seen.add(key)
                names.append(t.strip()[:40])
        if len(names) >= 15:
            break
    return names


def research_idea(idea: str) -> ResearchSignals:
    """Run a small Serper bundle for competitor + community density signals."""
    api_key = os.environ.get("SERPER_API_KEY", "").strip()
    signals = ResearchSignals(idea=idea)

    if not api_key:
        signals.error = "SERPER_API_KEY not configured"
        return signals

    queries = {
        "competitors": f"{idea} alternatives software tools",
        "competitors2": f"best {idea} tools 2025 OR 2026",
        "reddit": f"{idea} site:reddit.com",
        "directories": f"{idea} site:producthunt.com OR site:g2.com OR site:capterra.com",
    }

    results: dict[str, list[OrganicHit]] = {}
    try:
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {
                pool.submit(_serper_search, api_key, q, num=10): key
                for key, q in queries.items()
            }
            for fut in as_completed(futures):
                key = futures[fut]
                organic = fut.result()
                results[key] = _to_hits(organic, queries[key])
    except Exception as exc:  # noqa: BLE001 — surface as soft failure
        signals.error = str(exc)[:200]
        return signals

    signals.serper_ok = True
    signals.competitor_hits = (results.get("competitors") or []) + (
        results.get("competitors2") or []
    )
    # Dedupe competitor hits by link
    seen_links: set[str] = set()
    deduped: list[OrganicHit] = []
    for h in signals.competitor_hits:
        if h.link in seen_links:
            continue
        seen_links.add(h.link)
        deduped.append(h)
    signals.competitor_hits = deduped[:20]

    signals.reddit_hits = results.get("reddit") or []
    signals.directory_hits = results.get("directories") or []

    signals.competitor_count_est = len(signals.competitor_hits)
    signals.reddit_thread_count = len(
        [h for h in signals.reddit_hits if "reddit.com" in h.link.lower()]
    )
    signals.directory_count = len(signals.directory_hits)
    signals.named_tools = _extract_named_tools(
        signals.competitor_hits + signals.directory_hits
    )

    return signals
