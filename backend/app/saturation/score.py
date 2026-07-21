"""Compute Saturation Score (0–100) and go / no-go decision.

Lower score = less saturated / higher opportunity.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from app.saturation.research import ResearchSignals, research_idea
from app.saturation.validate import ValidationResult, validate_saturation_input

Decision = Literal["go", "caution", "no_go"]

# Weights sum to 1.0
WEIGHTS = {
    "product_density": 0.25,
    "reddit_demand": 0.25,  # inverted: high demand with room → lower saturation
    "reddit_competition": 0.15,
    "seo_headroom": 0.15,
    "community_noise": 0.10,
    "barrier": 0.10,
}


@dataclass
class FactorScore:
    id: str
    label: str
    weight: float
    score: int  # 0–100 contribution to saturation (higher = more saturated)
    detail: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "weight": self.weight,
            "score": self.score,
            "detail": self.detail,
        }


@dataclass
class SaturationReport:
    input: str
    normalized_input: str
    score: int
    decision: Decision
    decision_label: str
    summary: str
    insight: str
    niche_down: list[str]
    factors: list[FactorScore]
    is_theme: bool
    level: int
    research: dict[str, Any] = field(default_factory=dict)
    methodology_note: str = ""
    data_mode: str = "live"  # live | heuristic

    def to_dict(self) -> dict:
        return {
            "input": self.input,
            "normalized_input": self.normalized_input,
            "score": self.score,
            "decision": self.decision,
            "decision_label": self.decision_label,
            "summary": self.summary,
            "insight": self.insight,
            "niche_down": self.niche_down,
            "factors": [f.to_dict() for f in self.factors],
            "is_theme": self.is_theme,
            "level": self.level,
            "research": self.research,
            "methodology_note": self.methodology_note,
            "data_mode": self.data_mode,
            "bands": {
                "go": "0–34",
                "caution": "35–60",
                "no_go": "61–100",
            },
            "weights": WEIGHTS,
        }


def decision_from_score(score: int) -> tuple[Decision, str]:
    if score <= 34:
        return "go", "Go"
    if score <= 60:
        return "caution", "Caution"
    return "no_go", "No-go (as framed)"


def _clamp(n: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, n))


def _stable_jitter(seed: str, lo: int = -4, hi: int = 4) -> int:
    """Tiny deterministic variation so similar ideas don't always tie."""
    h = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8], 16)
    span = hi - lo + 1
    return lo + (h % span)


def _score_product_density(signals: ResearchSignals) -> FactorScore:
    n = signals.competitor_count_est
    named = len(signals.named_tools)
    # 0 hits → very low density; 15+ → high
    base = _clamp(int(n * 5.5 + named * 3))
    if n == 0 and signals.serper_ok:
        detail = "Few obvious competing tools in search results."
        base = min(base, 18)
    elif n <= 4:
        detail = f"Light product density (~{n} relevant results; {named} named tools)."
    elif n <= 10:
        detail = f"Moderate product density (~{n} results; {named} named tools)."
    else:
        detail = f"Crowded SERP (~{n} results; {named} named tools)."
        base = max(base, 55)
    return FactorScore(
        id="product_density",
        label="Product density",
        weight=WEIGHTS["product_density"],
        score=_clamp(base),
        detail=detail,
    )


def _score_reddit_demand(signals: ResearchSignals) -> FactorScore:
    """High demand is opportunity — maps to LOWER saturation contribution.

    We store the factor score as saturation pressure from *lack of demand*
    inverted: many threads → low factor score.
    """
    n = signals.reddit_thread_count
    if not signals.serper_ok:
        score = 45
        detail = "Reddit demand unavailable — neutral default."
    elif n == 0:
        score = 72
        detail = "Little Reddit discussion found — demand may be weak or hard to surface."
    elif n <= 3:
        score = 48
        detail = f"Some Reddit chatter ({n} threads) — demand is early."
    elif n <= 7:
        score = 28
        detail = f"Healthy Reddit demand ({n} threads) — people are already talking."
    else:
        score = 15
        detail = f"Strong Reddit demand ({n}+ threads) — intent exists."
    return FactorScore(
        id="reddit_demand",
        label="Reddit demand (inverted)",
        weight=WEIGHTS["reddit_demand"],
        score=_clamp(score),
        detail=detail,
    )


def _score_reddit_competition(signals: ResearchSignals) -> FactorScore:
    """How dominated threads look (tools named in snippets)."""
    text = " ".join(
        f"{h.title} {h.snippet}" for h in signals.reddit_hits
    ).lower()
    tool_mentions = 0
    for name in signals.named_tools:
        if name.lower() in text:
            tool_mentions += 1
    promoish = len(
        re.findall(r"\b(i built|check out|my tool|our app|alternative to)\b", text)
    )
    raw = tool_mentions * 12 + promoish * 8 + min(signals.reddit_thread_count, 5) * 2
    score = _clamp(raw if signals.serper_ok else 40)
    if tool_mentions == 0 and signals.reddit_thread_count > 0:
        detail = "Threads exist with few named competitors — room to reply."
        score = min(score, 30)
    elif tool_mentions >= 3:
        detail = f"Multiple tools already named in Reddit results ({tool_mentions})."
    else:
        detail = "Mixed competition inside community threads."
    return FactorScore(
        id="reddit_competition",
        label="Reddit competition",
        weight=WEIGHTS["reddit_competition"],
        score=score,
        detail=detail,
    )


def _score_seo_headroom(signals: ResearchSignals) -> FactorScore:
    n = signals.competitor_count_est + signals.directory_count
    if not signals.serper_ok:
        score = 50
        detail = "SEO/SERP signal unavailable — neutral default."
    elif n <= 5:
        score = 25
        detail = "Thin SERP / directory presence — SEO headroom likely."
    elif n <= 14:
        score = 50
        detail = "Moderate search competition."
    else:
        score = 75
        detail = "Busy SERP and directories — harder organic head terms."
    return FactorScore(
        id="seo_headroom",
        label="Search / SEO pressure",
        weight=WEIGHTS["seo_headroom"],
        score=_clamp(score),
        detail=detail,
    )


def _score_community_noise(signals: ResearchSignals) -> FactorScore:
    n = signals.reddit_thread_count + signals.directory_count
    if not signals.serper_ok:
        score = 40
        detail = "Community noise unavailable — neutral default."
    elif n <= 3:
        score = 20
        detail = "Quiet community footprint."
    elif n <= 12:
        score = 45
        detail = "Moderate community + directory noise."
    else:
        score = 70
        detail = "Loud category online — harder to stand out."
    return FactorScore(
        id="community_noise",
        label="Community noise",
        weight=WEIGHTS["community_noise"],
        score=_clamp(score),
        detail=detail,
    )


def _score_barrier(idea: str, level: int, is_theme: bool) -> FactorScore:
    """Higher barriers (regulated, technical, ICP-specific) → lower saturation.

    Factor score here is saturation risk from *low* barriers (easy to copy).
    """
    lower = idea.lower()
    hard = any(
        k in lower
        for k in (
            "hipaa",
            "fda",
            "soc2",
            "compliance",
            "enterprise",
            "on-prem",
            "on prem",
            "hardware",
            "clinic",
            "dental",
            "legal",
            "law firm",
            "bank",
            "insurance agent",
            "construction",
            "manufacturing",
            "logistics",
        )
    )
    if is_theme:
        score = 70
        detail = "Theme-level idea — easy for many products to enter."
    elif hard:
        score = 22
        detail = "Niche constraints raise the barrier — fewer copycats."
    elif level >= 5:
        score = 35
        detail = "Specific ICP/use-case raises the bar vs a generic tool."
    elif level >= 4:
        score = 48
        detail = "Moderately specific — average barrier to entry."
    else:
        score = 62
        detail = "Broad framing — low barrier, more entrants expected."
    return FactorScore(
        id="barrier",
        label="Barrier to entry (inverted)",
        weight=WEIGHTS["barrier"],
        score=_clamp(score),
        detail=detail,
    )


def _heuristic_signals(idea: str) -> ResearchSignals:
    """Deterministic fallback when Serper is unavailable (dev / outage)."""
    h = int(hashlib.sha256(idea.lower().encode()).hexdigest()[:8], 16)
    signals = ResearchSignals(idea=idea, serper_ok=False, error="heuristic_fallback")
    signals.competitor_count_est = 3 + (h % 12)
    signals.reddit_thread_count = 1 + (h % 9)
    signals.directory_count = h % 6
    signals.named_tools = []
    return signals


def _niche_down_suggestions(idea: str, is_theme: bool) -> list[str]:
    core = idea.strip()
    if is_theme:
        return [
            f"Async standup tool for remote engineering teams (within “{core}”)",
            f"Time-tracking for freelancers who work from home",
            f"Client portal for solo consultants working remotely",
        ]
    words = core.split()
    anchor = words[0] if words else "niche"
    return [
        f"{core} focused on one ICP (e.g. freelancers only)",
        f"{core} for a single vertical (e.g. dentists / agencies / Shopify)",
        f"Narrow workflow: one painful job inside “{anchor}”, not the whole category",
    ]


def _build_summary(
    score: int,
    decision: Decision,
    idea: str,
    is_theme: bool,
    factors: list[FactorScore],
) -> tuple[str, str]:
    density = next(f for f in factors if f.id == "product_density")
    demand = next(f for f in factors if f.id == "reddit_demand")

    if decision == "go":
        summary = (
            f"“{idea}” looks relatively open (saturation {score}/100). "
            "Worth pursuing if you can ship a clear wedge quickly."
        )
        insight = (
            f"{density.detail} {demand.detail} "
            "Prioritize distribution (e.g. Reddit replies) before paid ads."
        )
    elif decision == "caution":
        summary = (
            f"“{idea}” is contested (saturation {score}/100). "
            "Viable only with sharp differentiation."
        )
        insight = (
            f"{density.detail} {demand.detail} "
            "Go only if you niche down hard — same category, tighter ICP."
        )
    else:
        summary = (
            f"“{idea}” looks crowded as framed (saturation {score}/100). "
            "Do not build the generic version."
        )
        insight = (
            f"{density.detail} {demand.detail} "
            "Niche down or pick a different angle before investing months."
        )

    if is_theme:
        summary = (
            f"“{idea}” scored as a demand theme (saturation {score}/100) — "
            "directional only, not a product verdict."
        )
        insight = (
            "Themes are not products. Pick a specific who + problem before a Go decision."
        )

    return summary, insight


def _weighted_score(factors: list[FactorScore], seed: str) -> int:
    total = 0.0
    for f in factors:
        total += f.score * f.weight
    raw = int(round(total + _stable_jitter(seed)))
    return _clamp(raw)


def compute_saturation_report(
    raw_input: str,
    *,
    confirm_broad_theme: bool = False,
    validation: ValidationResult | None = None,
    use_live_research: bool = True,
) -> SaturationReport:
    """Full pipeline: validate (if needed) → research → score → narrative."""
    v = validation or validate_saturation_input(
        raw_input, confirm_broad_theme=confirm_broad_theme
    )
    if v.status == "reject":
        raise ValueError(v.message)
    if v.status == "needs_confirm" and not confirm_broad_theme:
        raise ValueError(v.message)

    idea = v.normalized_input or normalize_safe(raw_input)
    data_mode = "live"

    if use_live_research:
        signals = research_idea(idea)
        if not signals.serper_ok:
            signals = _heuristic_signals(idea)
            data_mode = "heuristic"
    else:
        signals = _heuristic_signals(idea)
        data_mode = "heuristic"

    factors = [
        _score_product_density(signals),
        _score_reddit_demand(signals),
        _score_reddit_competition(signals),
        _score_seo_headroom(signals),
        _score_community_noise(signals),
        _score_barrier(idea, v.level, v.is_theme),
    ]

    score = _weighted_score(factors, idea)
    decision, decision_label = decision_from_score(score)
    summary, insight = _build_summary(score, decision, idea, v.is_theme, factors)

    methodology = (
        "Saturation is a weighted average of product density, Reddit demand "
        "(inverted), Reddit competition, search pressure, community noise, and "
        "barrier to entry. Lower = less saturated. Transparent factors below."
    )
    if data_mode == "heuristic":
        methodology += (
            " Live search was unavailable — scores used a deterministic fallback "
            "so you can still see the decision framework."
        )

    return SaturationReport(
        input=raw_input.strip(),
        normalized_input=idea,
        score=score,
        decision=decision,
        decision_label=decision_label,
        summary=summary,
        insight=insight,
        niche_down=_niche_down_suggestions(idea, v.is_theme),
        factors=factors,
        is_theme=v.is_theme,
        level=v.level,
        research=signals.to_dict(),
        methodology_note=methodology,
        data_mode=data_mode,
    )


def normalize_safe(raw: str) -> str:
    from app.saturation.validate import normalize_input

    return normalize_input(raw)
