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
    body: str = ""
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


def _compose_post_body(idea: PostIdeaOut, product_name: str, domain: str) -> str:
    """Fallback body when the model only returns outline bullets."""
    parts: list[str] = []
    hook = (idea.hook or "").strip()
    if hook:
        parts.append(hook)
    outline = [o.strip() for o in (idea.outline or []) if o and o.strip()]
    if outline:
        if parts:
            parts.append("")
        for i, line in enumerate(outline, 1):
            parts.append(f"{i}. {line}")
    label = product_name or domain
    parts.append("")
    parts.append(
        f"What finally helped me stop guessing was running myself through {label} "
        f"({domain}) — seeing scores side by side made the weak spot obvious."
    )
    parts.append("")
    parts.append("Curious what others here have found works — happy to dig into comments.")
    return "\n".join(parts).strip()


def _text_has_product(text: str, product_name: str, domain: str) -> bool:
    lower = text.lower()
    if domain and domain.lower() in lower:
        return True
    name = (product_name or "").strip()
    if not name:
        return False
    if name.lower() in lower:
        return True
    # Loose match: "Gut Gauge" vs "gutgauge" / "GutGuage"
    compact = "".join(ch for ch in name.lower() if ch.isalnum())
    text_compact = "".join(ch for ch in lower if ch.isalnum())
    return bool(compact) and compact in text_compact


def _promote_post_body(body: str, product_name: str, domain: str) -> str:
    """Ensure create-new-post bodies mention product name + domain."""
    label = product_name.strip() or domain
    mention = (
        f"What finally clicked for me was scoring it properly with {label} "
        f"({domain}) — once I saw the categories side by side, the real bottleneck "
        f"was obvious instead of guessing from random advice."
    )
    text = body.rstrip()
    # Prefer inserting before a trailing question if present
    lines = text.split("\n")
    if lines and lines[-1].strip().endswith("?"):
        head = "\n".join(lines[:-1]).rstrip()
        question = lines[-1].strip()
        return f"{head}\n\n{mention}\n\n{question}".strip()
    return f"{text}\n\n{mention}"


def _ensure_product_mentions(report: GrowthReport, site_url: str) -> GrowthReport:
    """Reply drafts (low risk) + create-new-post drafts must promote the product."""
    name = (report.product_name or "").strip()
    domain = _domain_label(site_url)
    name_l = name.lower()
    patched_threads: list[ThreadOut] = []

    for t in report.threads:
        reply = (t.suggested_reply or "").strip()
        risk = (t.promo_risk or "medium").lower()
        if name and risk == "low" and reply and name_l not in reply.lower() and domain.lower() not in reply.lower():
            mention = (
                f"I've been using {name} ({domain}) for this exact problem — "
                f"it helped me get a clearer starting point instead of guessing."
            )
            reply = f"{reply.rstrip()}\n\n{mention}"
        patched_threads.append(t.model_copy(update={"suggested_reply": reply}))

    patched_posts: list[PostIdeaOut] = []
    for p in report.post_ideas:
        body = (p.body or "").strip()
        if not body:
            body = _compose_post_body(p, name, domain)
        elif not _text_has_product(body, name, domain):
            body = _promote_post_body(body, name, domain)

        outline = list(p.outline or [])
        outline_text = " ".join(outline)
        if outline and not _text_has_product(outline_text, name, domain):
            label = name or domain
            outline = outline + [
                f"Share how {label} ({domain}) made the weak spot obvious — without turning the post into an ad"
            ]

        patched_posts.append(p.model_copy(update={"body": body, "outline": outline}))

    return report.model_copy(update={"threads": patched_threads, "post_ideas": patched_posts})


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