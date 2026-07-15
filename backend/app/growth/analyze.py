"""AI analysis for growth scans — product context + community report."""

from __future__ import annotations

import json
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

from app.growth.crawl import SiteContext
from app.growth.serper import DiscoveredThread

load_dotenv()

_PROMPT_PATH = Path(__file__).parent / "prompts" / "growth_report.txt"
_MODEL = "claude-sonnet-4-6"


class SubredditOut(BaseModel):
    name: str
    reason: str


class ThreadOut(BaseModel):
    title: str
    url: str
    source: str = "reddit"
    snippet: str = ""
    intent_type: str = "discussion"
    match_reason: str = ""
    relevance_score: int = Field(ge=0, le=100)
    suggested_reply: str = ""
    promo_risk: str = "low"


class PostIdeaOut(BaseModel):
    title: str
    hook: str
    outline: list[str]
    target_community: str
    based_on_trend: str


class GrowthReport(BaseModel):
    product_name: str
    niche_label: str
    product_summary: str
    audience: str
    subreddits: list[SubredditOut] = Field(default_factory=list)
    threads: list[ThreadOut] = Field(default_factory=list)
    post_ideas: list[PostIdeaOut] = Field(default_factory=list)


def _format_hits(hits: list[DiscoveredThread]) -> str:
    blocks = []
    for i, h in enumerate(hits[:30], 1):
        date_line = f"\n   Date: {h.date}" if h.date else ""
        blocks.append(
            f"{i}. [{h.source}] {h.title}\n   URL: {h.url}\n   Snippet: {h.snippet}{date_line}\n   Found via: {h.query}"
        )
    return "\n\n".join(blocks)


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)


def infer_product_context(
    site: SiteContext,
    client: anthropic.Anthropic | None = None,
) -> dict[str, str]:
    """Quick product extraction when we only have page meta."""
    if client is None:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""From this website metadata, infer product context for a growth assistant.
Return JSON only: {{"product_name","niche_label","product_summary","audience","keywords":[]}}

URL: {site.url}
Title: {site.title}
Description: {site.description}
Page text: {site.text_snippet[:1200]}"""

    response = client.messages.create(
        model=_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    data = _parse_json(response.content[0].text.strip())
    return {
        "product_name": str(data.get("product_name") or site.title),
        "niche_label": str(data.get("niche_label") or site.domain),
        "product_summary": str(data.get("product_summary") or site.description),
        "audience": str(data.get("audience") or "indie founders"),
        "keywords": [str(k) for k in data.get("keywords", [])[:6]],
    }


def _domain_label(url: str) -> str:
    try:
        host = url.split("//", 1)[-1].split("/", 1)[0].lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return url


def _ensure_product_mentions(report: GrowthReport, site_url: str) -> GrowthReport:
    """Low promo_risk drafts must name the product; patch if the model omitted it."""
    name = (report.product_name or "").strip()
    if not name:
        return report

    domain = _domain_label(site_url)
    name_l = name.lower()
    patched: list[ThreadOut] = []

    for t in report.threads:
        reply = (t.suggested_reply or "").strip()
        risk = (t.promo_risk or "medium").lower()
        if risk == "low" and reply and name_l not in reply.lower():
            mention = (
                f"I've been using {name} ({domain}) for this exact problem — "
                f"it helped me get a clearer starting point instead of guessing."
            )
            reply = f"{reply.rstrip()}\n\n{mention}"
        patched.append(t.model_copy(update={"suggested_reply": reply}))

    return report.model_copy(update={"threads": patched})


def analyze_growth(
    site: SiteContext,
    product: dict[str, str],
    hits: list[DiscoveredThread],
    client: anthropic.Anthropic | None = None,
) -> GrowthReport:
    if not hits:
        raise ValueError("No community threads found for this product. Try a different site or niche.")

    if client is None:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    template = _PROMPT_PATH.read_text()
    prompt = (
        template
        .replace("{{url}}", site.url)
        .replace("{{product_name}}", product["product_name"])
        .replace("{{niche_label}}", product["niche_label"])
        .replace("{{product_summary}}", product["product_summary"])
        .replace("{{audience}}", product["audience"])
        .replace("{{hit_count}}", str(len(hits)))
        .replace("{{hits}}", _format_hits(hits))
    )

    response = client.messages.create(
        model=_MODEL,
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        data = _parse_json(response.content[0].text.strip())
        report = GrowthReport(**data)
        return _ensure_product_mentions(report, site.url)
    except (json.JSONDecodeError, ValidationError) as exc:
        raw = response.content[0].text.strip()[:500]
        raise ValueError(f"Claude returned invalid growth JSON: {exc}\n\n{raw}") from exc