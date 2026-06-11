"""Subreddit discovery — find relevant subreddits for a niche keyword."""

from dataclasses import dataclass
import os

import praw
from dotenv import load_dotenv

load_dotenv()


@dataclass
class SubredditInfo:
    name: str
    title: str
    subscribers: int
    description: str
    url: str


def get_reddit_client() -> praw.Reddit:
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        user_agent=os.environ["REDDIT_USER_AGENT"],
    )


def discover_subreddits(
    keyword: str,
    reddit: praw.Reddit | None = None,
    limit: int = 10,
) -> list[SubredditInfo]:
    """Search Reddit for subreddits matching a niche keyword.

    If the keyword starts with 'r/' it is treated as a direct subreddit name
    and returned immediately without a search.
    """
    if reddit is None:
        reddit = get_reddit_client()

    # Direct subreddit reference — skip search
    if keyword.startswith("r/"):
        name = keyword[2:].strip("/")
        sub = reddit.subreddit(name)
        return [
            SubredditInfo(
                name=sub.display_name,
                title=sub.title,
                subscribers=sub.subscribers,
                description=sub.public_description[:300],
                url=f"https://reddit.com/r/{sub.display_name}",
            )
        ]

    results: list[SubredditInfo] = []
    for sub in reddit.subreddits.search(keyword, limit=limit):
        results.append(
            SubredditInfo(
                name=sub.display_name,
                title=sub.title,
                subscribers=sub.subscribers,
                description=sub.public_description[:300],
                url=f"https://reddit.com/r/{sub.display_name}",
            )
        )

    # Sort by subscriber count descending — larger communities = more signal
    results.sort(key=lambda s: s.subscribers, reverse=True)
    return results


if __name__ == "__main__":
    import sys

    keyword = sys.argv[1] if len(sys.argv) > 1 else "productivity"
    print(f"Discovering subreddits for: {keyword}\n")
    subs = discover_subreddits(keyword)
    for s in subs:
        print(f"r/{s.name} — {s.subscribers:,} subscribers")
        print(f"  {s.description[:100]}\n")
