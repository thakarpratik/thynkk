"""SourceProvider abstraction — swappable Reddit data backends.

Current: PublicJsonProvider (no credentials, public .json endpoints)
Future:  PrawProvider (OAuth, once Reddit approves the developer application)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
import time

import httpx


@dataclass
class RawPost:
    reddit_id: str
    subreddit: str
    title: str
    body: str
    score: int
    num_comments: int
    created_utc: datetime
    permalink: str


@dataclass
class RawSubreddit:
    name: str
    title: str
    subscribers: int
    description: str


class SourceProvider(ABC):
    @abstractmethod
    def search_subreddits(self, keyword: str, limit: int = 10) -> list[RawSubreddit]:
        """Find subreddits relevant to a keyword."""

    @abstractmethod
    def get_subreddit(self, name: str) -> RawSubreddit:
        """Fetch metadata for a specific subreddit."""

    @abstractmethod
    def fetch_posts(
        self,
        subreddit: str,
        sort: str = "hot",
        time_filter: str = "month",
        limit: int = 100,
    ) -> list[RawPost]:
        """Fetch posts from a subreddit feed."""

    @abstractmethod
    def fetch_comments(self, subreddit: str, post_id: str, limit: int = 5) -> list[str]:
        """Fetch top comments for a post."""


class PublicJsonProvider(SourceProvider):
    """Read-only Reddit access via public .json endpoints — no credentials needed.

    Rate limit: ~10–60 req/min. We stay well under with sleep + caching.
    """

    BASE = "https://www.reddit.com"
    HEADERS = {"User-Agent": "thynkk/0.1 (market research tool; read-only)"}
    _REQUEST_DELAY = 2.0  # seconds between requests — stay polite

    def __init__(self) -> None:
        self._client = httpx.Client(headers=self.HEADERS, timeout=15)

    def _get(self, url: str, params: dict | None = None) -> dict:
        time.sleep(self._REQUEST_DELAY)
        response = self._client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def search_subreddits(self, keyword: str, limit: int = 10) -> list[RawSubreddit]:
        data = self._get(
            f"{self.BASE}/subreddits/search.json",
            params={"q": keyword, "limit": limit},
        )
        results = []
        for child in data.get("data", {}).get("children", []):
            s = child["data"]
            results.append(RawSubreddit(
                name=s["display_name"],
                title=s.get("title", ""),
                subscribers=s.get("subscribers", 0),
                description=s.get("public_description", "")[:300],
            ))
        results.sort(key=lambda r: r.subscribers, reverse=True)
        return results

    def get_subreddit(self, name: str) -> RawSubreddit:
        data = self._get(f"{self.BASE}/r/{name}/about.json")
        s = data["data"]
        return RawSubreddit(
            name=s["display_name"],
            title=s.get("title", ""),
            subscribers=s.get("subscribers", 0),
            description=s.get("public_description", "")[:300],
        )

    def fetch_posts(
        self,
        subreddit: str,
        sort: str = "hot",
        time_filter: str = "month",
        limit: int = 100,
    ) -> list[RawPost]:
        params: dict = {"limit": min(limit, 100)}
        if sort == "top":
            params["t"] = time_filter

        data = self._get(f"{self.BASE}/r/{subreddit}/{sort}.json", params=params)
        posts = []
        for child in data.get("data", {}).get("children", []):
            p = child["data"]
            posts.append(RawPost(
                reddit_id=p["id"],
                subreddit=subreddit,
                title=p.get("title", ""),
                body=p.get("selftext", "")[:2000],
                score=p.get("score", 0),
                num_comments=p.get("num_comments", 0),
                created_utc=datetime.fromtimestamp(p["created_utc"], tz=timezone.utc),
                permalink=p.get("permalink", ""),
            ))
        return posts

    def fetch_comments(self, subreddit: str, post_id: str, limit: int = 5) -> list[str]:
        data = self._get(f"{self.BASE}/r/{subreddit}/comments/{post_id}.json")
        comments = []
        if len(data) < 2:
            return comments
        for child in data[1].get("data", {}).get("children", [])[:limit]:
            body = child.get("data", {}).get("body", "")
            if body and len(body) > 20:
                comments.append(body[:500])
        return comments


if __name__ == "__main__":
    provider = PublicJsonProvider()
    print("Searching subreddits for 'small business'...\n")
    subs = provider.search_subreddits("small business", limit=5)
    for s in subs:
        print(f"r/{s.name} — {s.subscribers:,} subscribers")
