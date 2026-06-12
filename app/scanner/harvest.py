"""Harvest posts and top comments from a subreddit.

Uses SourceProvider abstraction — currently PublicJsonProvider (no credentials).
Caches everything in Postgres by (subreddit, reddit_id) so same post is never fetched twice.
Returns only pain-point-matched posts for AI analysis.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.scanner.filters import matches_pain_point
from app.scanner.source_provider import SourceProvider
from app.scanner.providers.pullpush_provider import PullPushProvider

load_dotenv()


@dataclass
class HarvestedPost:
    reddit_id: str
    subreddit: str
    title: str
    body: str
    score: int
    num_comments: int
    created_utc: datetime
    permalink: str
    matched_filter: bool
    top_comments: list[str]


def get_engine() -> Engine:
    return create_engine(os.environ["DATABASE_URL"])


def ensure_tables(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS subreddits (
                name TEXT PRIMARY KEY,
                subscribers INTEGER,
                last_fetched_at TIMESTAMPTZ
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS posts (
                reddit_id TEXT PRIMARY KEY,
                subreddit TEXT NOT NULL,
                title TEXT,
                body TEXT,
                score INTEGER,
                num_comments INTEGER,
                created_utc TIMESTAMPTZ,
                permalink TEXT,
                fetched_at TIMESTAMPTZ,
                matched_filter BOOLEAN
            )
        """))


def _post_cached(engine: Engine, reddit_id: str) -> bool:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT 1 FROM posts WHERE reddit_id = :id"),
            {"id": reddit_id},
        ).fetchone()
    return row is not None


def _save_post(engine: Engine, post: HarvestedPost) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO posts
                    (reddit_id, subreddit, title, body, score, num_comments,
                     created_utc, permalink, fetched_at, matched_filter)
                VALUES
                    (:reddit_id, :subreddit, :title, :body, :score, :num_comments,
                     :created_utc, :permalink, :fetched_at, :matched_filter)
                ON CONFLICT (reddit_id) DO NOTHING
            """),
            {
                "reddit_id": post.reddit_id,
                "subreddit": post.subreddit,
                "title": post.title,
                "body": post.body,
                "score": post.score,
                "num_comments": post.num_comments,
                "created_utc": post.created_utc,
                "permalink": f"https://reddit.com{post.permalink}",
                "fetched_at": datetime.now(timezone.utc),
                "matched_filter": post.matched_filter,
            },
        )


def _update_subreddit(engine: Engine, name: str, subscribers: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO subreddits (name, subscribers, last_fetched_at)
                VALUES (:name, :subscribers, :now)
                ON CONFLICT (name) DO UPDATE
                SET subscribers = :subscribers, last_fetched_at = :now
            """),
            {"name": name, "subscribers": subscribers, "now": datetime.now(timezone.utc)},
        )


def harvest(
    subreddit_name: str,
    engine: Engine,
    provider: SourceProvider | None = None,
    post_limit: int = 100,
) -> list[HarvestedPost]:
    """Fetch posts from a subreddit, cache in Postgres, return pain-point matches."""
    if provider is None:
        provider = PullPushProvider()

    ensure_tables(engine)

    sub_info = provider.get_subreddit(subreddit_name)
    _update_subreddit(engine, subreddit_name, sub_info.subscribers)

    matched: list[HarvestedPost] = []
    seen: set[str] = set()
    per_feed = post_limit // 3

    feeds = [
        ("hot", "month"),
        ("new", "month"),
        ("top", "month"),
    ]

    for sort, time_filter in feeds:
        posts = provider.fetch_posts(
            subreddit_name, sort=sort, time_filter=time_filter, limit=per_feed
        )
        for raw in posts:
            if raw.reddit_id in seen:
                continue
            seen.add(raw.reddit_id)

            full_text = f"{raw.title} {raw.body}"
            is_match = matches_pain_point(full_text)

            top_comments: list[str] = []
            if is_match:
                try:
                    comments = provider.fetch_comments(subreddit_name, raw.reddit_id, limit=5)
                    top_comments = [c for c in comments if matches_pain_point(c)][:3]
                except Exception:
                    pass

            post = HarvestedPost(
                reddit_id=raw.reddit_id,
                subreddit=subreddit_name,
                title=raw.title,
                body=raw.body,
                score=raw.score,
                num_comments=raw.num_comments,
                created_utc=raw.created_utc,
                permalink=raw.permalink,
                matched_filter=is_match,
                top_comments=top_comments,
            )

            if not _post_cached(engine, raw.reddit_id):
                _save_post(engine, post)

            if is_match:
                matched.append(post)

    return matched


if __name__ == "__main__":
    import sys

    subreddit = sys.argv[1].lstrip("r/") if len(sys.argv) > 1 else "smallbusiness"
    print(f"Harvesting r/{subreddit}...\n")

    engine = get_engine()
    posts = harvest(subreddit, engine)

    print(f"Found {len(posts)} pain-point posts\n")
    for p in posts[:5]:
        print(f"  [{p.score}↑] {p.title[:80]}")
        print(f"  https://reddit.com{p.permalink}\n")
