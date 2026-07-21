"""AI analysis for growth scans — product context + community report."""

from __future__ import annotations

import json
import os
import re
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


_STOPWORDS = frozenset(
    "the a an and or for with your you our we from this that into onto about "
    "using use free best top new get how what why when where online home page "
    "welcome official site website app platform product services service "
    "com www https http".split()
)


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+-]{2,}", text.lower())
    return [w for w in words if w not in _STOPWORDS and not w.isdigit()]


def _product_name_from_site(site: SiteContext) -> str:
    title = (site.title or "").strip()
    if title:
        # "Product — tagline" / "Product | tagline" / "Product: tagline"
        for sep in (" – ", " — ", " - ", " | ", " · ", ": "):
            if sep in title:
                left = title.split(sep, 1)[0].strip()
                if 2 <= len(left) <= 60:
                    return left
        if len(title) <= 60:
            return title
        return title[:57].rsplit(" ", 1)[0] + "…"
    domain = site.domain or "Product"
    base = domain.split(".")[0]
    return base[:1].upper() + base[1:] if base else domain


def infer_product_context(
    site: SiteContext,
    client: anthropic.Anthropic | None = None,  # kept for call-site compat; unused
) -> dict[str, str]:
    """Fast product extraction from page meta — no LLM (one Claude call later for drafts)."""
    del client  # explicit: heuristic only
    name = _product_name_from_site(site)
    desc = (site.description or "").strip()
    blob = f"{site.title} {desc} {site.text_snippet[:800]}"
    tokens = _tokenize(blob)

    # Prefer multi-word phrases from description for niche
    niche = ""
    if desc:
        # First ~8 content words as niche label
        d_tokens = _tokenize(desc)[:6]
        if d_tokens:
            niche = " ".join(d_tokens)
    if not niche and tokens:
        niche = " ".join(tokens[:4])
    if not niche:
        niche = site.domain.split(".")[0] if site.domain else "saas"

    keywords: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        if t in seen or t == name.lower():
            continue
        seen.add(t)
        keywords.append(t)
        if len(keywords) >= 5:
            break

    summary = desc or (site.text_snippet[:280].strip() if site.text_snippet else "") or f"{name} — {niche}"
    audience = "indie founders and early-stage teams"
    lower = blob.lower()
    if any(w in lower for w in ("b2b", "enterprise", "sales team", "developer", "api")):
        audience = "B2B buyers and operators"
    elif any(w in lower for w in ("shop", "store", "ecommerce", "e-commerce", "buy now")):
        audience = "online shoppers and store owners"
    elif any(w in lower for w in ("health", "wellness", "fitness", "gut", "diet")):
        audience = "people researching health and wellness solutions"

    return {
        "product_name": name,
        "niche_label": niche[:80],
        "product_summary": summary[:500],
        "audience": audience,
        "keywords": keywords,
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


# Phrases Reddit automod / users treat as AI/low-effort promo voice
_SLOP_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.I)
    for p in (
        r"week\s*1\s*priority",
        r"week\s+one\s+priority",
        r"people who already have the problem",
        r"\bunderrated\b",
        r"don'?t spam",
        r"do not spam",
        r"one great reply beats",
        r"genuine help",
        r"mention your product naturally",
        r"first real users",
        r"before touching paid ads",
        r"here'?s the thing",
        r"the key is",
        r"the real question is",
        r"at the end of the day",
        r"in today'?s landscape",
        r"get in front of people",
        r"reply with genuine",
        r"naturally once",
        # Product Hunt / channel-strategy essay (2nd real AutoMod kill)
        r"worth a day,? not a week",
        r"where your buyers already hang out",
        r"highest[- ]roi",
        r"compounds fast",
        r"where intent already lives",
        r"without the manual grind",
        r"manual grind",
        r"do ph for the backlink",
        r"go where intent",
        r"hit-or-miss depending",
        r"for most saas niches",
        r"replying with actual value",
        r"it compounds",
        r"distribution channel",
        r"low[- ]hanging fruit",
        r"game[- ]changer",
        r"unlock growth",
        r"leverage reddit",
    )
]

# Soft signals: 2+ in one reply ≈ coach essay
_SLOP_SOFT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.I)
    for p in (
        r"\bproduct hunt\b",
        r"\bbacklink\b",
        r"\bROI\b",
        r"\bcompound",
        r"\baudience was already",
        r"\balready asking",
        r"\bnot a week\b",
        r"\bhang out\b",
        r"\bHN\b",
        r"\bhacker news\b",
    )
]


def _content_tokens(text: str) -> set[str]:
    return {
        w
        for w in re.findall(r"[a-z]{4,}", (text or "").lower())
        if w not in _STOPWORDS
    }


def _looks_like_slop(text: str, *, title: str = "", snippet: str = "") -> bool:
    """True when draft matches known auto-remove / coach-speak patterns."""
    raw = (text or "").strip()
    if not raw:
        return True
    if any(p.search(raw) for p in _SLOP_PATTERNS):
        return True
    soft = sum(1 for p in _SLOP_SOFT_PATTERNS if p.search(raw))
    if soft >= 2:
        return True
    # Essay structure: long + many commas
    if len(raw) > 380 and raw.count(",") >= 5:
        return True
    # Multi-paragraph strategy post (common AutoMod kill)
    paras = [p for p in re.split(r"\n\s*\n", raw) if p.strip()]
    if len(paras) >= 3 and len(raw.split()) >= 70:
        return True
    # Numbered playbook
    if re.search(r"(?m)^\s*\d+[\.\)]\s+\S", raw) and raw.count("\n") >= 2:
        return True
    # Doesn't touch the thread at all (generic channel essay)
    thread_ctx = f"{title} {snippet}".strip()
    if thread_ctx and len(raw.split()) >= 40:
        t_toks = _content_tokens(thread_ctx)
        r_toks = _content_tokens(raw)
        # Ignore product-y words when scoring overlap
        if t_toks and len(t_toks & r_toks) == 0:
            return True
    return False


def _clip_words(text: str, max_words: int = 65) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).rstrip(".,;:") + "."


def _thread_detail(title: str, snippet: str) -> str:
    """Pick a short concrete hook from title or snippet."""
    title = (title or "").strip()
    snippet = (snippet or "").strip()
    if title and len(title) > 8:
        # Drop trailing punctuation for embedding in a sentence
        t = title.rstrip("?.!").strip()
        if len(t) > 90:
            t = t[:87].rsplit(" ", 1)[0] + "…"
        return t
    if snippet:
        s = snippet[:100].rsplit(" ", 1)[0] if len(snippet) > 100 else snippet
        return s.rstrip("?.!")
    return "this"


def _fallback_reply(
    *,
    title: str,
    snippet: str,
    product_name: str,
    domain: str,
    promo_risk: str,
) -> str:
    """Human-ish safety net when the model emits banned playbook voice."""
    detail = _thread_detail(title, snippet)
    risk = (promo_risk or "medium").lower()
    # Keep it short, thread-first, slightly messy — not a channel strategy essay
    openers = [
        f'On "{detail}" - depends a lot on niche.',
        f'For "{detail}" I would not over-invest in one launch day.',
        f'Re "{detail}" - I treated big launch sites as a one-day experiment max.',
    ]
    # Stable pick from title length so same thread gets same opener
    opener = openers[len(detail) % len(openers)]
    tip = (
        f"{opener} The stuff that actually moved the needle for me was replying in "
        f"threads where people already asked the question my product answers."
    )
    if risk == "high":
        return _clip_words(
            f"{tip} I would not drop a link cold in places that hate promo."
        )
    if risk == "low" and (product_name or domain):
        label = product_name.strip() or domain
        return _clip_words(
            f"{tip} I use {label} ({domain}) to list those threads + a rough draft, "
            f"then I rewrite before posting."
        )
    return _clip_words(f"{tip} Manual search works too, just slower.")


def _humanize_reply(
    reply: str,
    *,
    title: str,
    snippet: str,
    product_name: str,
    domain: str,
    promo_risk: str,
) -> str:
    text = (reply or "").strip()
    risk = (promo_risk or "medium").lower()
    if _looks_like_slop(text, title=title, snippet=snippet):
        return _fallback_reply(
            title=title,
            snippet=snippet,
            product_name=product_name,
            domain=domain,
            promo_risk=risk,
        )
    # Soften formulaic product tack-ons without rewriting good prose
    text = re.sub(
        r"\n\nI'?ve been using .+? for this exact problem[^\n]*",
        "",
        text,
        flags=re.I,
    ).strip()
    if risk == "high":
        # Strip product/domain if model violated high-risk
        if product_name and product_name.lower() in text.lower():
            return _fallback_reply(
                title=title, snippet=snippet, product_name=product_name,
                domain=domain, promo_risk=risk,
            )
    # Second pass after soft cleanup
    if _looks_like_slop(text, title=title, snippet=snippet):
        return _fallback_reply(
            title=title,
            snippet=snippet,
            product_name=product_name,
            domain=domain,
            promo_risk=risk,
        )
    return _clip_words(text, 70)


def _build_promotional_prose(idea: PostIdeaOut, product_name: str, domain: str) -> str:
    """Real Reddit self-post: story + product promotion (not an outline dump)."""
    label = (product_name or "").strip() or domain
    hook = (idea.hook or "").strip() or (idea.title or "").strip()
    bullets = [_strip_outline_prefix(o) for o in (idea.outline or []) if o and o.strip()]
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
        for b in bullets[:2]:
            if b and b.lower() not in hook.lower():
                paras.append(b if b.endswith((".", "?", "!")) else f"{b}.")

    paras.append(
        f"What cut the noise for me was {label} ({domain}) — "
        f"not as a magic fix, just something that made the next step obvious."
    )

    for b in (bullets[2:4] if bullets else []):
        if not b:
            continue
        if domain.lower() in b.lower() or label.lower() in b.lower():
            continue
        paras.append(b if b.endswith((".", "?", "!")) else f"{b}.")

    paras.append(
        f"If you're stuck in the same loop, try {label} ({domain}) once and see if it "
        f"clears the fog — then tell me what actually moved."
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
    compact = "".join(ch for ch in name.lower() if ch.isalnum())
    text_compact = "".join(ch for ch in lower if ch.isalnum())
    return bool(compact) and compact in text_compact


def _promote_post_body(body: str, product_name: str, domain: str) -> str:
    """Append a light product mention when prose is good but brand is missing."""
    label = product_name.strip() or domain
    mention = (
        f"I ended up using {label} ({domain}) for this — "
        f"not a miracle, just made the next step clearer."
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

    # --- reply drafts: scrub AI playbook voice, light product mention only if needed ---
    new_threads = []
    for t in threads:
        if is_dict:
            reply = (t.get("suggested_reply") or "").strip()
            risk = (t.get("promo_risk") or "medium").lower()
            title = str(t.get("title") or "")
            snippet = str(t.get("snippet") or "")
            reply = _humanize_reply(
                reply,
                title=title,
                snippet=snippet,
                product_name=name,
                domain=domain,
                promo_risk=risk,
            )
            if (
                name
                and risk == "low"
                and reply
                and not _text_has_product(reply, name, domain)
                and not _looks_like_slop(reply)
            ):
                reply = _clip_words(
                    f"{reply.rstrip()} I use {name} ({domain}) when I'm hunting threads like this."
                )
            t = {**t, "suggested_reply": reply}
            new_threads.append(t)
        else:
            reply = (t.suggested_reply or "").strip()
            risk = (t.promo_risk or "medium").lower()
            reply = _humanize_reply(
                reply,
                title=t.title,
                snippet=t.snippet,
                product_name=name,
                domain=domain,
                promo_risk=risk,
            )
            if (
                name
                and risk == "low"
                and reply
                and not _text_has_product(reply, name, domain)
                and not _looks_like_slop(reply)
            ):
                reply = _clip_words(
                    f"{reply.rstrip()} I use {name} ({domain}) when I'm hunting threads like this."
                )
            new_threads.append(t.model_copy(update={"suggested_reply": reply}))

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

        if _looks_like_slop(body):
            body = _build_promotional_prose(idea, name, domain)

        outline = list(idea.outline or [])
        if outline and not _text_has_product(" ".join(outline), name, domain):
            label = name or domain
            outline = outline + [
                f"One casual line on {label} ({domain}) — not a pitch deck"
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

    # Smaller first pass (faster, less truncation) → compact retry only if needed
    attempts = [
        {"thread_count": 5, "post_idea_count": 2, "hit_limit": 12, "max_tokens": 6144},
        {"thread_count": 4, "post_idea_count": 2, "hit_limit": 10, "max_tokens": 4096},
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
                "Return SMALLER valid JSON only. Shorter replies (≤65 words). "
                "Each suggested_reply must reference THAT thread's title. "
                "Banned: Week 1 priority, underrated, don't spam, genuine help, paid ads. "
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