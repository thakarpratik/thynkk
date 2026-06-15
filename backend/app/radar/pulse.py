"""Pulse — fetch recent post titles from tracked subreddits for trend clustering."""

from dataclasses import dataclass

from app.scanner.providers.apify_provider import ApifyProvider

TRACKED_SUBREDDITS = [
    "entrepreneur",
    "indiehackers",
    "SaaS",
    "startups",
    "smallbusiness",
    "productivity",
    "nocode",
    "AITools",
    "ChatGPT",
    "webdev",
    "freelance",
    "sales",
    "marketing",
]

WINDOW_DAYS = 7


@dataclass
class PulsedPost:
    title: str
    subreddit: str
    score: int
    num_comments: int


def collect_titles(
    subreddits: list[str] | None = None,
    provider: ApifyProvider | None = None,
    limit_per_sub: int = 30,
) -> list[PulsedPost]:
    """Fetch top post titles across tracked subreddits in parallel via Apify."""
    if subreddits is None:
        subreddits = TRACKED_SUBREDDITS
    if provider is None:
        provider = ApifyProvider()

    raw_posts = provider.fetch_posts_batch(
        subreddits,
        sort="top",
        time_filter="week",
        limit_per_sub=limit_per_sub,
    )

    return [
        PulsedPost(
            title=p.title,
            subreddit=p.subreddit,
            score=p.score,
            num_comments=p.num_comments,
        )
        for p in raw_posts
        if p.title.strip()
    ]
