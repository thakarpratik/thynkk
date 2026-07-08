"""Reddit JSON reachability check — run from production (Railway) egress IP."""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.api.admin import _require_secret

router = APIRouter(prefix="/admin", tags=["admin"])

_FEED_URL = "https://www.reddit.com/r/SaaS/new.json?limit=1"
_UA_BROWSER = (
    "Mozilla/5.0 (compatible; Thynkk/0.1; +https://thynkk.co; reddit-json-health)"
)


class RedditCheckItem(BaseModel):
    name: str
    ok: bool
    status_code: int | None = None
    detail: str


class RedditJsonHealth(BaseModel):
    ok: bool
    host_role: str
    checks: list[RedditCheckItem]
    recommendation: str


def _probe_feed() -> RedditCheckItem:
    try:
        with httpx.Client(
            headers={"User-Agent": _UA_BROWSER},
            timeout=15,
            follow_redirects=True,
        ) as client:
            response = client.get(_FEED_URL)
            ct = response.headers.get("content-type", "")
            if response.status_code != 200:
                return RedditCheckItem(
                    name="subreddit_feed_json",
                    ok=False,
                    status_code=response.status_code,
                    detail=f"HTTP {response.status_code}",
                )
            if "json" not in ct:
                blocked = "blocked by network security" in response.text.lower()
                return RedditCheckItem(
                    name="subreddit_feed_json",
                    ok=False,
                    status_code=response.status_code,
                    detail="HTML block page (403)" if blocked else f"Expected JSON, got {ct}",
                )
            data = response.json()
            children = data.get("data", {}).get("children", [])
            if not children:
                return RedditCheckItem(
                    name="subreddit_feed_json",
                    ok=False,
                    status_code=200,
                    detail="JSON ok but listing empty",
                )
            post = children[0]["data"]
            title = (post.get("title") or "")[:60]
            return RedditCheckItem(
                name="subreddit_feed_json",
                ok=True,
                status_code=200,
                detail=f"OK — sample: {title}",
            )
    except Exception as exc:
        return RedditCheckItem(
            name="subreddit_feed_json",
            ok=False,
            detail=str(exc)[:200],
        )


def _probe_oauth() -> RedditCheckItem | None:
    client_id = os.environ.get("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return None

    ua = os.environ.get("REDDIT_USER_AGENT", _UA_BROWSER)
    try:
        with httpx.Client(timeout=20) as client:
            token_resp = client.post(
                "https://www.reddit.com/api/v1/access_token",
                auth=(client_id, client_secret),
                data={"grant_type": "client_credentials"},
                headers={"User-Agent": ua},
            )
            if token_resp.status_code != 200:
                return RedditCheckItem(
                    name="oauth_readonly",
                    ok=False,
                    status_code=token_resp.status_code,
                    detail=f"Token request failed: {token_resp.text[:120]}",
                )
            token = token_resp.json().get("access_token")
            if not token:
                return RedditCheckItem(
                    name="oauth_readonly",
                    ok=False,
                    detail="No access_token in response",
                )

            listing = client.get(
                "https://oauth.reddit.com/r/SaaS/new",
                params={"limit": 1},
                headers={"Authorization": f"Bearer {token}", "User-Agent": ua},
            )
            if listing.status_code != 200:
                return RedditCheckItem(
                    name="oauth_readonly",
                    ok=False,
                    status_code=listing.status_code,
                    detail=f"OAuth listing failed HTTP {listing.status_code}",
                )
            children = listing.json().get("data", {}).get("children", [])
            if not children:
                return RedditCheckItem(
                    name="oauth_readonly",
                    ok=False,
                    status_code=200,
                    detail="OAuth ok but listing empty",
                )
            return RedditCheckItem(
                name="oauth_readonly",
                ok=True,
                status_code=200,
                detail="OK — oauth.reddit.com/r/SaaS/new",
            )
    except Exception as exc:
        return RedditCheckItem(
            name="oauth_readonly",
            ok=False,
            detail=str(exc)[:200],
        )


def run_reddit_json_health() -> RedditJsonHealth:
    checks: list[RedditCheckItem] = [_probe_feed()]
    oauth = _probe_oauth()
    if oauth is not None:
        checks.append(oauth)

    feed_ok = checks[0].ok
    oauth_ok = oauth.ok if oauth else None
    all_ok = feed_ok or bool(oauth_ok)

    if feed_ok:
        recommendation = (
            "Public .json works from this host. Safe to use PublicJsonProvider for enrichment."
        )
    elif oauth_ok:
        recommendation = (
            "Public .json blocked but OAuth works. Use oauth.reddit.com for server-side enrichment."
        )
    else:
        recommendation = (
            "Both public JSON and OAuth failed from this host. "
            "Use Serper for discovery + Firecrawl per-thread URL, or keep Apify as fallback."
        )

    return RedditJsonHealth(
        ok=all_ok,
        host_role="backend_api (Railway egress — this is the IP that matters)",
        checks=checks,
        recommendation=recommendation,
    )


@router.get("/reddit-json-check", response_model=RedditJsonHealth)
def reddit_json_check(
    request: Request,
    _: None = Depends(_require_secret),
) -> RedditJsonHealth:
    """Verify Reddit JSON/OAuth from production. Requires Authorization: Bearer ADMIN_SECRET."""
    return run_reddit_json_health()