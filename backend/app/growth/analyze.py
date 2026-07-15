"""AI analysis for growth scans — product context + community report."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ValidationError

from app.growth.crawl import SiteContext
from app.growth.serper import (
    DiscoveredThread,
    parse_thread_date,
    sort_hits_by_recency,
    thread_recency_score,
)

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
    date: str = ""


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


def _format_hits(hits: list[DiscoveredThread], *, limit: int = 18) -> str:
    blocks = []
    for i, h in enumerate(hits[:limit], 1):
        date_line = f"\n   Date: {h.date}" if h.date else ""
        snippet = (h.snippet or "")[:160]
        title = (h.title or "")[:140]
        blocks.append(
            f"{i}. [{h.source}] {title}\n   URL: {h.url}\n   Snippet: {snippet}{date_line}\n   Found via: {h.query}"
        )
    return "\n\n".join(blocks)


def _strip_code_fences(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def _extract_json_object(text: str) -> str:
    """Best-effort slice from first {{ to last }}."""
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        return text[start : end + 1]
    return text


def _repair_truncated_json(text: str) -> str:
    """Close open strings/brackets when the model hits max_tokens mid-JSON."""
    s = text.rstrip()
    if not s:
        return s

    # If we died mid-string, close the quote
    in_string = False
    escape = False
    for ch in s:
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
    if in_string:
        s += '"'

    # Drop a trailing comma before we close structures
    s = s.rstrip()
    if s.endswith(","):
        s = s[:-1]

    # Balance braces / brackets
    opens_curly = s.count("{") - s.count("}")
    opens_square = s.count("[") - s.count("]")
    if opens_square > 0:
        s += "]" * opens_square
    if opens_curly > 0:
        s += "}" * opens_curly
    return s


def _parse_json(raw: str) -> dict:
    text = _strip_code_fences(raw)
    candidates = [text, _extract_json_object(text), _repair_truncated_json(_extract_json_object(text))]
    last_err: Exception | None = None
    for cand in candidates:
        try:
            data = json.loads(cand)
            if isinstance(data, dict):
                return data
        except Exception as exc:  # noqa: BLE001 — try next candidate
            last_err = exc
            continue
    raise json.JSONDecodeError(
        str(last_err) if last_err else "Unable to parse growth JSON",
        text,
        0,
    )


def _coerce_report_data(data: dict, product: dict[str, str]) -> dict:
    """Fill missing fields so partial / repaired JSON can still validate."""
    out = dict(data)
    out.setdefault("product_name", product.get("product_name") or "Product")
    out.setdefault("niche_label", product.get("niche_label") or "")
    out.setdefault("product_summary", product.get("product_summary") or "")
    out.setdefault("audience", product.get("audience") or "")
    out.setdefault("subreddits", [])
    out.setdefault("threads", [])
    out.setdefault("post_ideas", [])

    threads = []
    for t in out.get("threads") or []:
        if not isinstance(t, dict):
            continue
        threads.append({
            "title": str(t.get("title") or "Untitled thread")[:300],
            "url": str(t.get("url") or ""),
            "source": str(t.get("source") or "reddit"),
            "snippet": str(t.get("snippet") or "")[:500],
            "date": str(t.get("date") or ""),
            "intent_type": str(t.get("intent_type") or "discussion"),
            "match_reason": str(t.get("match_reason") or "")[:300],
            "relevance_score": max(0, min(100, int(t.get("relevance_score") or 50))),
            "suggested_reply": str(t.get("suggested_reply") or "")[:2500],
            "promo_risk": str(t.get("promo_risk") or "medium"),
        })
    out["threads"] = [t for t in threads if t["url"] or t["title"]]

    posts = []
    for p in out.get("post_ideas") or []:
        if not isinstance(p, dict):
            continue
        outline = p.get("outline") or []
        if not isinstance(outline, list):
            outline = []
        posts.append({
            "title": str(p.get("title") or "Post idea")[:300],
            "hook": str(p.get("hook") or "")[:500],
            "outline": [str(x)[:300] for x in outline][:8],
            "body": str(p.get("body") or "")[:4000],
            "target_community": str(p.get("target_community") or "r/SaaS")[:80],
            "based_on_trend": str(p.get("based_on_trend") or "")[:300],
        })
    out["post_ideas"] = posts

    subs = []
    for s in out.get("subreddits") or []:
        if not isinstance(s, dict):
            continue
        name = str(s.get("name") or "").strip()
        if name:
            subs.append({"name": name[:80], "reason": str(s.get("reason") or "")[:300]})
    out["subreddits"] = subs
    return out


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


def _norm_url(url: str) -> str:
    return (url or "").strip().lower().rstrip("/").split("?")[0]


def _attach_dates_and_prefer_recent(
    report: GrowthReport,
    hits: list[DiscoveredThread],
) -> GrowthReport:
    """Stamp Serper dates onto ranked threads and bias order toward fresher posts."""
    by_url = {_norm_url(h.url): h for h in hits}
    stamped: list[ThreadOut] = []
    for t in report.threads:
        hit = by_url.get(_norm_url(t.url))
        date = (t.date or "").strip() or (hit.date if hit else "") or ""
        stamped.append(t.model_copy(update={"date": date}))

    # Drop very old threads when we have enough fresher ones (< ~9 months)
    recent: list[ThreadOut] = []
    older: list[ThreadOut] = []
    for t in stamped:
        dt = parse_thread_date(t.date)
        if dt is None:
            older.append(t)
            continue
        age_days = (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0
        if age_days <= 270:  # ~9 months
            recent.append(t)
        else:
            older.append(t)

    # Prefer recent; only backfill older if pool is thin
    chosen = recent if len(recent) >= 5 else recent + older
    if not chosen:
        chosen = stamped

    # Default order: recency first, then relevance (UI can re-sort)
    chosen = sorted(
        chosen,
        key=lambda t: (thread_recency_score(t.date), t.relevance_score),
        reverse=True,
    )
    return report.model_copy(update={"threads": chosen})


def _build_growth_prompt(
    site: SiteContext,
    product: dict[str, str],
    hits: list[DiscoveredThread],
    *,
    thread_count: int,
    post_idea_count: int,
    hit_limit: int,
) -> str:
    template = _PROMPT_PATH.read_text()
    return (
        template
        .replace("{{url}}", site.url)
        .replace("{{product_name}}", product["product_name"])
        .replace("{{niche_label}}", product["niche_label"])
        .replace("{{product_summary}}", product["product_summary"])
        .replace("{{audience}}", product["audience"])
        .replace("{{hit_count}}", str(min(len(hits), hit_limit)))
        .replace("{{hits}}", _format_hits(hits, limit=hit_limit))
        .replace("{{thread_count}}", str(thread_count))
        .replace("{{post_idea_count}}", str(post_idea_count))
    )


def _call_growth_model(
    client: anthropic.Anthropic,
    prompt: str,
    *,
    max_tokens: int,
) -> tuple[str, str | None]:
    response = client.messages.create(
        model=_MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = ""
    if response.content:
        block = response.content[0]
        text = getattr(block, "text", None) or str(block)
    stop = getattr(response, "stop_reason", None)
    return text.strip(), stop


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

    # Feed model the freshest hits first
    hits = sort_hits_by_recency(hits)

    # Full → compact retry if JSON truncates (common with long reply/post bodies)
    attempts = [
        {"thread_count": 7, "post_idea_count": 3, "hit_limit": 16, "max_tokens": 12288},
        {"thread_count": 5, "post_idea_count": 2, "hit_limit": 12, "max_tokens": 8192},
    ]

    last_error: Exception | None = None
    last_raw = ""

    for i, cfg in enumerate(attempts):
        prompt = _build_growth_prompt(
            site,
            product,
            hits,
            thread_count=cfg["thread_count"],
            post_idea_count=cfg["post_idea_count"],
            hit_limit=cfg["hit_limit"],
        )
        if i > 0:
            prompt += (
                "\n\nIMPORTANT RETRY: Previous response was truncated/invalid JSON. "
                "Return SMALLER valid JSON only. Shorter replies (≤70 words). "
                "Post bodies ≤120 words. No markdown."
            )

        try:
            raw, stop_reason = _call_growth_model(
                client, prompt, max_tokens=cfg["max_tokens"]
            )
            last_raw = raw
            data = _coerce_report_data(_parse_json(raw), product)
            report = GrowthReport(**data)

            # Empty threads after repair → try again
            if not report.threads and i < len(attempts) - 1:
                last_error = ValueError("Parsed growth JSON had zero threads")
                continue

            report = _attach_dates_and_prefer_recent(report, hits)
            return _ensure_product_mentions(report, site.url)
        except (json.JSONDecodeError, ValidationError, ValueError, anthropic.APIError) as exc:
            last_error = exc
            # If truncated, next attempt is smaller; otherwise still retry once
            continue

    preview = (last_raw or "")[:500]
    raise ValueError(
        f"Claude returned invalid growth JSON: {last_error}\n\n{preview}"
    ) from last_error