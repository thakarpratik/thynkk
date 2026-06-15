"""Convert raw NicheResult into scored, frontend-ready TrendItem dicts."""

import re

from app.radar.analyze import NicheResult

TAG_ORDER = {"HOT": 0, "RISING": 1, "NEW": 2}


def _parse_growth_pct(growth: str) -> int:
    """Extract numeric value from strings like '+180%' or '180'."""
    match = re.search(r"(\d+)", growth)
    return int(match.group(1)) if match else 0


def score_niches(niches: list[NicheResult]) -> list[dict]:
    """Return niches sorted by tag priority then growth %, formatted for the API."""
    scored = []
    for n in niches:
        pct = _parse_growth_pct(n.growth)
        tag = n.tag if n.tag in TAG_ORDER else "RISING"
        scored.append({
            "niche": n.niche,
            "description": n.description,
            "growth": n.growth if n.growth.startswith("+") else f"+{n.growth}",
            "growth_pct": pct,
            "tag": tag,
            "posts": n.mention_count,
            "subreddit": n.top_subreddit if n.top_subreddit.startswith("r/") else f"r/{n.top_subreddit}",
        })

    scored.sort(key=lambda x: (TAG_ORDER.get(x["tag"], 9), -x["growth_pct"]))
    return scored
