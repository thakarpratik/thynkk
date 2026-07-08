#!/usr/bin/env python3
"""Validate Reddit public .json access before swapping off Apify.

Run from your laptop AND from production (same IP your API uses):

    python scripts/validate_reddit_json.py
    python scripts/validate_reddit_json.py --thread-url "https://www.reddit.com/r/SaaS/comments/..."

Exit 0 = all checks passed. Exit 1 = blocked or malformed responses.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import httpx

# Allow `python scripts/validate_reddit_json.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.scanner.source_provider import PublicJsonProvider  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
WARN = "\033[33mWARN\033[0m"

DEFAULT_UA_APP = "thynkk/0.1 (validation; contact@thynkk.co)"
DEFAULT_UA_BROWSER = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


def _is_json_response(response: httpx.Response) -> bool:
    ct = response.headers.get("content-type", "")
    return response.status_code == 200 and "json" in ct


def _blocked_preview(response: httpx.Response) -> str:
    text = response.text[:200].lower()
    if "blocked by network security" in text:
        return "Reddit network security block (403)"
    if response.status_code == 429:
        return "Rate limited (429)"
    if "<html" in text:
        return f"HTML response instead of JSON (status {response.status_code})"
    return f"Unexpected status {response.status_code}"


def check_raw_endpoint(
    client: httpx.Client,
    label: str,
    url: str,
    *,
    expect_list: bool = False,
) -> dict | list | None:
    print(f"\n--- {label} ---")
    print(f"GET {url}")
    try:
        response = client.get(url)
    except httpx.HTTPError as exc:
        print(f"{FAIL}  request error: {exc}")
        return None

    if not _is_json_response(response):
        print(f"{FAIL}  {_blocked_preview(response)}")
        return None

    data = response.json()
    if expect_list:
        if not isinstance(data, list) or len(data) < 2:
            print(f"{FAIL}  expected [post_listing, comment_listing]")
            return None
        post = data[0]["data"]["children"][0]["data"]
        comments = data[1]["data"]["children"]
        print(f"{PASS}  thread title: {post.get('title', '')[:70]}")
        print(f"       body chars: {len(post.get('selftext', ''))}")
        print(f"       top-level comments: {len(comments)}")
        return data

    children = data.get("data", {}).get("children", [])
    if not children:
        print(f"{FAIL}  JSON ok but no children in listing")
        return None

    post = children[0]["data"]
    required = ("id", "title", "permalink", "score", "num_comments", "created_utc")
    missing = [k for k in required if k not in post]
    if missing:
        print(f"{FAIL}  missing fields: {missing}")
        return None

    print(f"{PASS}  post id={post['id']} score={post['score']} comments={post['num_comments']}")
    print(f"       title: {post['title'][:70]}")
    return data


def check_public_json_provider() -> bool:
    print("\n=== PublicJsonProvider (app code path) ===")
    try:
        provider = PublicJsonProvider()
        subs = provider.search_subreddits("saas", limit=3)
        if not subs:
            print(f"{FAIL}  search_subreddits returned empty")
            return False
        print(f"{PASS}  search_subreddits → {len(subs)} subs (top: r/{subs[0].name})")

        posts = provider.fetch_posts("SaaS", sort="new", limit=5)
        if not posts:
            print(f"{FAIL}  fetch_posts returned empty")
            return False
        print(f"{PASS}  fetch_posts → {len(posts)} posts")

        comments = provider.fetch_comments(posts[0].subreddit, posts[0].reddit_id, limit=3)
        print(f"{PASS}  fetch_comments → {len(comments)} comments")
        if comments:
            print(f"       sample: {comments[0][:100]}...")
        return True
    except Exception as exc:
        print(f"{FAIL}  PublicJsonProvider raised: {exc}")
        return False


def check_oauth_readonly() -> bool | None:
    client_id = os.environ.get("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        print(f"\n=== Reddit OAuth (optional) ===")
        print(f"{WARN}  REDDIT_CLIENT_ID/SECRET not set — skip")
        return None

    print("\n=== Reddit OAuth read-only ===")
    ua = os.environ.get("REDDIT_USER_AGENT", DEFAULT_UA_APP)
    try:
        with httpx.Client(timeout=20) as client:
            token_resp = client.post(
                "https://www.reddit.com/api/v1/access_token",
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"},
                headers={"User-Agent": ua},
            )
            if token_resp.status_code != 200:
                print(f"{FAIL}  token request: {token_resp.status_code} {token_resp.text[:120]}")
                return False
            token = token_resp.json().get("access_token")
            if not token:
                print(f"{FAIL}  no access_token in response")
                return False

            listing = client.get(
                "https://oauth.reddit.com/r/SaaS/new",
                params={"limit": 2},
                headers={"Authorization": f"Bearer {token}", "User-Agent": ua},
            )
            if listing.status_code != 200:
                print(f"{FAIL}  oauth listing: {listing.status_code}")
                return False
            children = listing.json().get("data", {}).get("children", [])
            if not children:
                print(f"{FAIL}  oauth listing empty")
                return False
            print(f"{PASS}  oauth.reddit.com/r/SaaS/new → {len(children)} posts")
            return True
    except Exception as exc:
        print(f"{FAIL}  OAuth check error: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Reddit JSON endpoints")
    parser.add_argument(
        "--thread-url",
        help="Full Reddit thread URL to test comment enrichment",
    )
    parser.add_argument(
        "--ua",
        default=DEFAULT_UA_BROWSER,
        help="User-Agent for raw endpoint checks",
    )
    args = parser.parse_args()

    print("Reddit JSON validation")
    print(f"User-Agent: {args.ua[:60]}...")

    results: list[bool] = []

    with httpx.Client(
        headers={"User-Agent": args.ua},
        timeout=20,
        follow_redirects=True,
    ) as client:
        for base in ("https://www.reddit.com", "https://old.reddit.com"):
            label = f"Subreddit feed ({base})"
            url = f"{base}/r/SaaS/new.json?limit=3"
            ok = check_raw_endpoint(client, label, url) is not None
            results.append(ok)
            time.sleep(1.5)

        if args.thread_url:
            path = args.thread_url.split("reddit.com", 1)[-1].rstrip("/")
            if not path.endswith(".json"):
                path = f"{path}.json"
            url = f"https://www.reddit.com{path}"
            ok = check_raw_endpoint(client, "Thread + comments", url, expect_list=True) is not None
            results.append(ok)

    results.append(check_public_json_provider())
    oauth = check_oauth_readonly()
    if oauth is not None:
        results.append(oauth)

    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"\n{'=' * 40}")
    print(f"Result: {passed}/{total} checks passed")

    if passed < total:
        print(
            f"\n{WARN} If you see 403/HTML blocks:\n"
            "  • Run this script on your laptop (residential IP)\n"
            "  • Run again from production host IP (Railway/Fly/Vercel egress)\n"
            "  • Use a descriptive User-Agent with contact email\n"
            "  • Fall back to Reddit OAuth (client_credentials) for server-side\n"
            "  • Or enrich Serper URLs via Firecrawl per-thread (no bulk scrape)\n"
        )
        return 1

    print(f"\n{PASS} Reddit JSON is usable from this environment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())