"""Pulse — fetch recent post titles from a set of subreddits for trend clustering."""

from dataclasses import dataclass
import time

from app.scanner.source_provider import PublicJsonProvider, SourceProvider

# Subreddits to monitor for the Trend Radar.
# Growth-oriented communities where new ideas surface early.
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
    provider: SourceProvider | None = None,
    limit_per_sub: int = 50,
) -> list[PulsedPost]:
    """Fetch recent hot post titles across tracked subreddits."""
    if subreddits is None:
        subreddits = TRACKED_SUBREDDITS
    if provider is None:
        provider = PublicJsonProvider()

    posts: list[PulsedPost] = []
    for sub in subreddits:
        try:
            raw = provider.fetch_posts(sub, sort="hot", limit=limit_per_sub)
            for p in raw:
                posts.append(PulsedPost(
                    title=p.title,
                    subreddit=sub,
                    score=p.score,
                    num_comments=p.num_comments,
                ))
            time.sleep(1)  # gentle pacing between subreddits
        except Exception as e:
            print(f"[pulse] skipping r/{sub}: {e}")
            continue

    return posts
