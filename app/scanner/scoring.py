"""Demand score calculation for pain-point themes."""

import math
from datetime import datetime, timezone

from app.scanner.analyze import AnalysisResult, Theme
from app.scanner.harvest import HarvestedPost


def recency_weight(posts: list[HarvestedPost]) -> float:
    """Average recency weight across posts. Decays linearly over 12 months."""
    if not posts:
        return 1.0
    now = datetime.now(timezone.utc)
    weights = []
    for p in posts:
        age_days = (now - p.created_utc).days
        # 0 days old → weight 1.0; 365 days old → weight 0.0; older → clamp at 0.1
        w = max(0.1, 1.0 - (age_days / 365.0))
        weights.append(w)
    return sum(weights) / len(weights)


def demand_score(
    mention_count: int,
    total_upvotes: int,
    total_comments: int,
    r_weight: float = 1.0,
) -> float:
    """
    demand_score = mention_count × log(1 + upvotes + comments) × recency_weight
    """
    engagement = math.log(1 + total_upvotes + total_comments)
    return round(mention_count * engagement * r_weight, 2)


def score_themes(
    result: AnalysisResult,
    posts: list[HarvestedPost],
) -> list[dict]:
    """Attach demand scores to themes and return sorted list."""
    post_map = {p.reddit_id: p for p in posts}
    r_weight = recency_weight(posts)

    scored = []
    for theme in result.themes:
        # Gather posts referenced in this theme's quotes
        theme_posts = [
            post_map[q.post_id]
            for q in theme.quotes
            if q.post_id in post_map
        ]

        total_upvotes = sum(p.score for p in theme_posts)
        total_comments = sum(p.num_comments for p in theme_posts)

        score = demand_score(
            mention_count=theme.mention_count,
            total_upvotes=total_upvotes,
            total_comments=total_comments,
            r_weight=r_weight,
        )

        scored.append({
            "name": theme.name,
            "summary": theme.summary,
            "opportunity": theme.opportunity,
            "severity_score": theme.severity_score,
            "mention_count": theme.mention_count,
            "demand_score": score,
            "quotes": [q.model_dump() for q in theme.quotes],
        })

    scored.sort(key=lambda t: t["demand_score"], reverse=True)
    return scored


if __name__ == "__main__":
    # Quick smoke test with dummy data
    from app.scanner.analyze import Quote, Theme, AnalysisResult
    from app.scanner.harvest import HarvestedPost
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    dummy_posts = [
        HarvestedPost(
            reddit_id="abc123", subreddit="test", title="Test", body="",
            score=150, num_comments=40,
            created_utc=now - timedelta(days=30),
            permalink="/r/test/abc123", matched_filter=True, top_comments=[],
        ),
    ]
    dummy_result = AnalysisResult(themes=[
        Theme(
            name="Manual invoicing pain",
            summary="Freelancers waste hours on manual invoicing.",
            opportunity="Automated invoicing tool for freelancers.",
            severity_score=8,
            mention_count=15,
            quotes=[Quote(excerpt="I hate doing invoices manually", post_id="abc123", permalink="/r/test/abc123")],
        )
    ])

    scores = score_themes(dummy_result, dummy_posts)
    for s in scores:
        print(f"{s['name']} — demand score: {s['demand_score']}")
