"""PullPushProvider — Reddit data via PullPush.io (community Pushshift successor).

Free, no auth, no approval needed. Historical data — not real-time.
API docs: https://pullpush.io

Swap to ApifyProvider or PrawProvider later without changing any other code.
"""

from datetime import datetime, timezone
import time

import httpx

from app.scanner.source_provider import RawPost, RawSubreddit, SourceProvider


class PullPushProvider(SourceProvider):
    """Fetches Reddit posts and comments from PullPush.io."""

    BASE = "https://api.pullpush.io/reddit"
    HEADERS = {"User-Agent": "thynkk/0.1 (prototype; pullpush.io)"}
    _REQUEST_DELAY = 1.0  # polite pause between requests

    def __init__(self) -> None:
        self._client = httpx.Client(headers=self.HEADERS, timeout=30)

    def _get(self, url: str, params: dict | None = None) -> dict:
        time.sleep(self._REQUEST_DELAY)
        response = self._client.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def search_subreddits(self, keyword: str, limit: int = 10) -> list[RawSubreddit]:
        """PullPush has no subreddit search — find by scanning posts with keyword."""
        params = {
            "q": keyword,
            "size": min(limit * 10, 100),
            "sort": "desc",
            "sort_type": "score",
        }
        data = self._get(f"{self.BASE}/search/submission/", params=params)
        seen: dict[str, int] = {}
        for post in data.get("data", []):
            sub = post.get("subreddit", "")
            if sub:
                seen[sub] = seen.get(sub, 0) + 1

        # Return top subreddits by post frequency for this keyword
        ranked = sorted(seen.items(), key=lambda x: x[1], reverse=True)[:limit]
        return [
            RawSubreddit(name=name, title=name, subscribers=0, description="")
            for name, _ in ranked
        ]

    def get_subreddit(self, name: str) -> RawSubreddit:
        """PullPush has no subreddit metadata — return a stub."""
        return RawSubreddit(name=name, title=name, subscribers=0, description="")

    def fetch_posts(
        self,
        subreddit: str,
        sort: str = "hot",
        time_filter: str = "month",
        limit: int = 100,
    ) -> list[RawPost]:
        """Fetch posts from a subreddit. sort/time_filter mapped to PullPush params."""
        # PullPush uses score-based sort for hot/top, created_utc for new
        sort_type = "created_utc" if sort == "new" else "score"

        params: dict = {
            "subreddit": subreddit,
            "size": min(limit, 100),
            "sort": "desc",
            "sort_type": sort_type,
        }

        # PullPush data cuts off ~May 2025. Use a fixed lookback from that point
        # so queries always return results regardless of current date.
        PULLPUSH_LATEST_TS = 1747612800  # 2025-05-19 approx
        windows = {"day": 7, "week": 30, "month": 180, "year": 365}
        days = windows.get(time_filter, 180)
        after_ts = PULLPUSH_LATEST_TS - (days * 86400)
        params["after"] = after_ts
        params["before"] = PULLPUSH_LATEST_TS

        data = self._get(f"{self.BASE}/search/submission/", params=params)
        posts = []
        for p in data.get("data", []):
            posts.append(RawPost(
                reddit_id=p.get("id", ""),
                subreddit=subreddit,
                title=p.get("title", ""),
                body=p.get("selftext", "")[:2000],
                score=p.get("score", 0),
                num_comments=p.get("num_comments", 0),
                created_utc=datetime.fromtimestamp(
                    p.get("created_utc", 0), tz=timezone.utc
                ),
                permalink=p.get("permalink", ""),
            ))
        return posts

    def fetch_comments(self, subreddit: str, post_id: str, limit: int = 5) -> list[str]:
        """Fetch top comments for a post by post ID."""
        params = {
            "link_id": f"t3_{post_id}",
            "size": min(limit * 3, 25),
            "sort": "desc",
            "sort_type": "score",
        }
        data = self._get(f"{self.BASE}/search/comment/", params=params)
        comments = []
        for c in data.get("data", [])[:limit]:
            body = c.get("body", "")
            if body and body != "[removed]" and body != "[deleted]" and len(body) > 20:
                comments.append(body[:500])
        return comments


if __name__ == "__main__":
    import sys
    from app.scanner.filters import matches_pain_point

    subreddit = sys.argv[1].lstrip("r/") if len(sys.argv) > 1 else "smallbusiness"
    print(f"Testing PullPushProvider on r/{subreddit}...\n")

    provider = PullPushProvider()
    posts = provider.fetch_posts(subreddit, sort="top", time_filter="month", limit=20)
    matched = [p for p in posts if matches_pain_point(f"{p.title} {p.body}")]

    print(f"Fetched {len(posts)} posts, {len(matched)} matched pain-point filter\n")
    for p in matched[:5]:
        print(f"  [{p.score}up] {p.title[:70]}")
        print(f"  https://reddit.com{p.permalink}\n")
