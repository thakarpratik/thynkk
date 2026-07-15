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


def _is_outline_like(text: str) -> bool:
    """True when body is mostly numbered bullets (not paste-ready prose)."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 3:
        return False
    numbered = sum(1 for ln in lines if ln[:1].isdigit() or ln.startswith(("- ", "* ", "• ")))
    return numbered >= max(2, len(lines) // 2)


def _strip_outline_prefix(line: str) -> str:
    s = line.strip()
    # "1. foo", "1) foo", "- foo"
    i = 0
    while i < len(s) and s[i].isdigit():
        i += 1
    if i > 0 and i < len(s) and s[i] in ".)":
        s = s[i + 1 :].strip()
    elif s.startswith(("- ", "* ", "• ")):
        s = s[2:].strip()
    # "Question 1: ..."
    if s.lower().startswith("question ") and ":" in s[:20]:
        s = s.split(":", 1)[1].strip()
    return s


def _build_promotional_prose(idea: PostIdeaOut, product_name: str, domain: str) -> str:
    """Real Reddit self-post: story + product promotion (not an outline dump)."""
    label = (product_name or "").strip() or domain
    hook = (idea.hook or "").strip() or (idea.title or "").strip()
    bullets = [_strip_outline_prefix(o) for o in (idea.outline or []) if o and o.strip()]
    # Prefer outline; if body is outline-like, mine those lines too
    if not bullets and idea.body:
        bullets = [
            _strip_outline_prefix(ln)
            for ln in idea.body.splitlines()
            if ln.strip() and (ln.strip()[:1].isdigit() or ln.strip().startswith(("- ", "* ")))
        ]

    paras: list[str] = []
    if hook:
        paras.append(hook)

    if bullets:
        # First 1–2 points as story context
        lead = bullets[:2]
        for b in lead:
            if b and b.lower() not in hook.lower():
                paras.append(b if b.endswith((".", "?", "!")) else f"{b}.")

    paras.append(
        f"What actually helped me stop spinning was running myself through {label} "
        f"({domain}). It breaks things into clear categories and gives you a score per area - "
        f"so you can see whether diet is really the issue or if sleep/stress is quietly worse."
    )

    # Remaining outline points as concrete takeaways (prose, not numbered list)
    rest = bullets[2:5] if bullets else []
    for b in rest:
        if not b:
            continue
        # Skip if it already sounds like a product CTA we just wrote
        if domain.lower() in b.lower() or (label.lower() in b.lower() and "score" in b.lower()):
            continue
        sentence = b if b.endswith((".", "?", "!")) else f"{b}."
        paras.append(sentence)

    paras.append(
        f"If you're stuck in the same loop of random gut tips, try scoring yourself on "
        f"{label} ({domain}) once - then focus on the lowest pillar for a week and see what moves."
    )
    paras.append(
        "Curious where you'd score lowest right now - diet, digestion, sleep, or stress? "
        "Drop it in the comments."
    )
    return "\n\n".join(paras).strip()


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
    """Append product mention when prose is good but brand is missing."""
    label = product_name.strip() or domain
    mention = (
        f"What finally clicked for me was scoring it properly with {label} "
        f"({domain}) — once I saw the categories side by side, the real bottleneck "
        f"was obvious instead of guessing from random advice."
    )
    text = body.rstrip()
    lines = text.split("\n")
    if lines and lines[-1].strip().endswith("?"):
        head = "\n".join(lines[:-1]).rstrip()
        question = lines[-1].strip()
        return f"{head}\n\n{mention}\n\n{question}".strip()
    return f"{text}\n\n{mention}"


def ensure_promotional_post_ideas(
    report: GrowthReport | dict,
    site_url: str,
    *,
    product_name: str | None = None,
) -> GrowthReport | dict:
    """Make create-new-post drafts paste-ready prose that promotes the product.

    Works on GrowthReport models and plain cached dicts (so cache hits still upgrade).
    """
    is_dict = isinstance(report, dict)
    if is_dict:
        name = (product_name or report.get("product_name") or "").strip()
        domain = _domain_label(site_url or report.get("url") or "")
        threads = report.get("threads") or []
        post_ideas = report.get("post_ideas") or []
    else:
        name = (product_name or report.product_name or "").strip()
        domain = _domain_label(site_url)
        threads = report.threads
        post_ideas = report.post_ideas

    if not domain:
        domain = "your site"

    # --- reply drafts (low risk) ---
    new_threads = []
    for t in threads:
        if is_dict:
            reply = (t.get("suggested_reply") or "").strip()
            risk = (t.get("promo_risk") or "medium").lower()
            if name and risk == "low" and reply and not _text_has_product(reply, name, domain):
                reply = (
                    f"{reply.rstrip()}\n\n"
                    f"I've been using {name} ({domain}) for this exact problem — "
                    f"it helped me get a clearer starting point instead of guessing."
                )
                t = {**t, "suggested_reply": reply}
            new_threads.append(t)
        else:
            reply = (t.suggested_reply or "").strip()
            risk = (t.promo_risk or "medium").lower()
            if name and risk == "low" and reply and not _text_has_product(reply, name, domain):
                reply = (
                    f"{reply.rstrip()}\n\n"
                    f"I've been using {name} ({domain}) for this exact problem — "
                    f"it helped me get a clearer starting point instead of guessing."
                )
                t = t.model_copy(update={"suggested_reply": reply})
            new_threads.append(t)

    # --- create new posts ---
    new_posts = []
    for p in post_ideas:
        if is_dict:
            idea = PostIdeaOut(
                title=p.get("title") or "",
                hook=p.get("hook") or "",
                outline=list(p.get("outline") or []),
                body=(p.get("body") or "").strip(),
                target_community=p.get("target_community") or "",
                based_on_trend=p.get("based_on_trend") or "",
            )
        else:
            idea = p

        body = (idea.body or "").strip()
        # Outline dumps are not paste-ready — rewrite as promotional prose
        if (not body) or _is_outline_like(body):
            body = _build_promotional_prose(idea, name, domain)
        elif not _text_has_product(body, name, domain):
            body = _promote_post_body(body, name, domain)

        # Final hard guarantee: product name + domain must appear
        if not _text_has_product(body, name, domain):
            body = _promote_post_body(body, name, domain)

        outline = list(idea.outline or [])
        if outline and not _text_has_product(" ".join(outline), name, domain):
            label = name or domain
            outline = outline + [
                f"Mention {label} ({domain}) as what you used to score the pillars — keep it one sentence, not a pitch"
            ]

        if is_dict:
            new_posts.append({**p, "body": body, "outline": outline})
        else:
            new_posts.append(idea.model_copy(update={"body": body, "outline": outline}))

    if is_dict:
        return {**report, "threads": new_threads, "post_ideas": new_posts}
    return report.model_copy(update={"threads": new_threads, "post_ideas": new_posts})


def _ensure_product_mentions(report: GrowthReport, site_url: str) -> GrowthReport:
    return ensure_promotional_post_ideas(report, site_url)  # type: ignore[return-value]


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