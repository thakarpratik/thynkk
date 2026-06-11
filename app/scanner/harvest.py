"""Harvest posts and comments from a subreddit via PRAW.

Caches everything in Postgres by (subreddit, reddit_id) so the same post
is never fetched twice. Only pain-point-matched posts are returned for AI analysis.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
import os
import time

import praw
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.scanner.filters import matches_pain_point

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
    """Create tables if they don't exist yet (pre-Alembic bootstrap)."""
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
    reddit: praw.Reddit,
    engine: Engine,
    post_limit: int = 100,
    comment_limit: int = 5,
) -> list[HarvestedPost]:
    """Fetch posts from a subreddit, cache them, return pain-point matches."""
    ensure_tables(engine)

    sub = reddit.subreddit(subreddit_name)
    _update_subreddit(engine, subreddit_name, sub.subscribers)

    matched: list[HarvestedPost] = []

    # Pull from hot, new, and top (past year) for breadth
    feeds = [
        sub.hot(limit=post_limit // 3),
        sub.new(limit=post_limit // 3),
        sub.top(time_filter="year", limit=post_limit // 3),
    ]

    seen: set[str] = set()

    for feed in feeds:
        for submission in feed:
            if submission.id in seen:
                continue
            seen.add(submission.id)

            full_text = f"{submission.title} {submission.selftext}"
            is_match = matches_pain_point(full_text)

            # Fetch top comments only for matched posts (saves API quota)
            top_comments: list[str] = []
            if is_match:
                try:
                    submission.comments.replace_more(limit=0)
                    for comment in list(submission.comments)[:comment_limit]:
                        if hasattr(comment, "body") and len(comment.body) > 20:
                            if matches_pain_point(comment.body):
                                top_comments.append(comment.body[:500])
                except Exception:
                    pass

            post = HarvestedPost(
                reddit_id=submission.id,
                subreddit=subreddit_name,
                title=submission.title,
                body=submission.selftext[:2000],
                score=submission.score,
                num_comments=submission.num_comments,
                created_utc=datetime.fromtimestamp(submission.created_utc, tz=timezone.utc),
                permalink=submission.permalink,
                matched_filter=is_match,
                top_comments=top_comments,
            )

            if not _post_cached(engine, submission.id):
                _save_post(engine, post)

            if is_match:
                matched.append(post)

            # Polite pause to respect rate limits
            time.sleep(0.1)

    return matched


if __name__ == "__main__":
    import sys
    from app.scanner.discovery import get_reddit_client

    subreddit = sys.argv[1].lstrip("r/") if len(sys.argv) > 1 else "smallbusiness"
    print(f"Harvesting r/{subreddit}...\n")

    reddit = get_reddit_client()
    engine = get_engine()
    posts = harvest(subreddit, reddit, engine)

    print(f"Found {len(posts)} pain-point posts\n")
    for p in posts[:5]:
        print(f"  [{p.score}↑] {p.title[:80]}")
        print(f"  {p.permalink}\n")
