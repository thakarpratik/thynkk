"""ApifyProvider — Reddit data via fatihtahta/reddit-scraper-search-fast.

Actor ID: TwqHBuZZPHJxiQrTU
Pricing: $1.19 / 1,000 results (3x cheaper than trudax/reddit-scraper-lite)
Speed: ~10-15s for 20-50 posts (5x faster)
Fields: score, num_comments, upvote_ratio, body, title, permalink, created_utc
"""

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

from app.scanner.source_provider import RawPost, RawSubreddit, SourceProvider

load_dotenv()

ACTOR_ID = "TwqHBuZZPHJxiQrTU"
BASE_URL = "https://api.apify.com/v2"
POLL_INTERVAL = 5
MAX_WAIT = 180  # per actor run


class ApifyProvider(SourceProvider):

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.environ["APIFY_API_KEY"]
        self._headers = {"Authorization": f"Bearer {self._api_key}"}

    def _new_client(self) -> httpx.Client:
        # Each call gets its own client — httpx.Client is not thread-safe.
        return httpx.Client(headers=self._headers)

    def _run_actor(self, input_payload: dict) -> list[dict]:
        with self._new_client() as client:
            resp = client.post(
                f"{BASE_URL}/acts/{ACTOR_ID}/runs",
                json=input_payload,
                timeout=httpx.Timeout(10.0, read=30.0),
            )
            resp.raise_for_status()
            run_id = resp.json()["data"]["id"]

            deadline = time.time() + MAX_WAIT
            while time.time() < deadline:
                time.sleep(POLL_INTERVAL)
                try:
                    status_resp = client.get(
                        f"{BASE_URL}/actor-runs/{run_id}",
                        timeout=httpx.Timeout(5.0, read=15.0),
                    )
                    status_resp.raise_for_status()
                    status = status_resp.json()["data"]["status"]
                except httpx.TimeoutException:
                    continue  # transient poll timeout — keep waiting
                if status == "SUCCEEDED":
                    break
                if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                    raise RuntimeError(f"Apify run {run_id} ended with status: {status}")
            else:
                raise TimeoutError(f"Apify actor run exceeded {MAX_WAIT}s")

            items = client.get(
                f"{BASE_URL}/actor-runs/{run_id}/dataset/items",
                params={"format": "json", "clean": "true"},
                timeout=httpx.Timeout(10.0, read=60.0),
            )
            items.raise_for_status()
            return items.json()

    def fetch_posts_batch(
        self,
        subreddits: list[str],
        sort: str = "top",
        time_filter: str = "month",
        limit_per_sub: int = 50,
    ) -> list[RawPost]:
        """Fetch posts from multiple subreddits — actor runs fire in parallel."""
        def _fetch_one(subreddit: str) -> list[RawPost]:
            items = self._run_actor({
                "subredditName": subreddit,
                "sort": sort,
                "maxPosts": min(limit_per_sub, 100),
                "scrapeComments": False,
            })
            return _to_raw_posts(items, subreddit)

        all_posts: list[RawPost] = []
        with ThreadPoolExecutor(max_workers=len(subreddits)) as pool:
            futures = {pool.submit(_fetch_one, sub): sub for sub in subreddits}
            for future in as_completed(futures):
                try:
                    all_posts.extend(future.result())
                except Exception:
                    continue
        return all_posts

    # --- SourceProvider interface ---

    def get_subreddit(self, name: str) -> RawSubreddit:
        return RawSubreddit(name=name, title=name, subscribers=0, description="")

    def search_subreddits(self, keyword: str, limit: int = 5) -> list[RawSubreddit]:
        """Search for posts matching keyword, extract top subreddits by frequency."""
        try:
            items = self._run_actor({
                "queries": [keyword],
                "sort": "relevance",
                "maxPosts": 50,
                "scrapeComments": False,
            })
            seen: dict[str, int] = {}
            for item in items:
                sub = item.get("subreddit", "")
                if sub:
                    seen[sub] = seen.get(sub, 0) + 1
            ranked = sorted(seen.items(), key=lambda x: x[1], reverse=True)[:limit]
            return [RawSubreddit(name=n, title=n, subscribers=0, description="") for n, _ in ranked]
        except Exception:
            return []

    def fetch_posts(
        self,
        subreddit: str,
        sort: str = "top",
        time_filter: str = "month",
        limit: int = 50,
    ) -> list[RawPost]:
        return self.fetch_posts_batch([subreddit], sort=sort, time_filter=time_filter, limit_per_sub=limit)

    def fetch_comments(self, subreddit: str, post_id: str, limit: int = 5) -> list[str]:
        return []


def _to_raw_posts(items: list[dict], subreddit: str) -> list[RawPost]:
    posts = []
    for item in items:
        if item.get("kind") not in ("post", None):
            continue
        created_ts = item.get("created_utc", 0)
        if isinstance(created_ts, (int, float)):
            created_utc = datetime.fromtimestamp(created_ts, tz=timezone.utc)
        elif isinstance(created_ts, str):
            try:
                created_utc = datetime.fromisoformat(created_ts.replace("Z", "+00:00"))
            except ValueError:
                created_utc = datetime.now(timezone.utc)
        else:
            created_utc = datetime.now(timezone.utc)

        permalink = item.get("permalink", "")
        if permalink.startswith("https://www.reddit.com"):
            permalink = permalink[len("https://www.reddit.com"):]

        posts.append(RawPost(
            reddit_id=item.get("id", ""),
            subreddit=item.get("subreddit", subreddit),
            title=item.get("title", ""),
            body=item.get("body", "")[:2000],
            score=item.get("score", 0),
            num_comments=item.get("num_comments", 0),
            created_utc=created_utc,
            permalink=permalink,
        ))
    return posts
