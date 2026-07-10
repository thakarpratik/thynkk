"""Scan runner — single Apify batch call, then Claude analysis.

Flow:
  1. Cache check — return instantly if fresh results exist.
  2. If query is r/<name>, fetch that subreddit directly.
     If keyword, search for top 3 matching subreddits first (one actor run),
     then fetch posts from all 3 in one batched actor run.
  3. Filter pain-point posts, run Claude, score, cache, return.
"""

import threading

from sqlalchemy.engine import Engine

from app.api.models import ScanStatus
from app.api.scan_history import save_scan
from app.api.store import ScanStore
from app.api.admin import log_scan
from app.scanner.analyze import analyze
from app.scanner.cache import get_cached, set_cached
from app.scanner.filters import matches_pain_point
from app.scanner.harvest import HarvestedPost, ensure_tables
from app.scanner.providers.apify_provider import ApifyProvider
from app.scanner.scoring import score_themes


def _persist(
    engine: Engine,
    scan_id: str,
    query: str,
    themes: list[dict],
    from_cache: bool,
    account_key: str,
    clerk_id: str | None,
) -> None:
    try:
        save_scan(
            engine,
            scan_id=scan_id,
            account_key=account_key,
            clerk_id=clerk_id,
            query=query,
            themes=themes,
            from_cache=from_cache,
        )
    except Exception:
        pass  # persistence must not fail the scan


def _run(
    scan_id: str,
    query: str,
    post_limit: int,
    store: ScanStore,
    engine: Engine,
    ip: str = "unknown",
    account_key: str = "ip:unknown",
    clerk_id: str | None = None,
    attribution: dict | None = None,
) -> None:
    store.update(scan_id, status=ScanStatus.running)
    try:
        # 1. Cache check
        cached = get_cached(engine, query)
        if cached:
            store.update(scan_id, status=ScanStatus.done, result=cached, from_cache=True)
            log_scan(
                ip, query, from_cache=True, status="done", themes_count=len(cached), engine=engine,
                scan_type="pain", clerk_id=clerk_id, attribution=attribution,
            )
            _persist(engine, scan_id, query, cached, True, account_key, clerk_id)
            return

        ensure_tables(engine)
        provider = ApifyProvider()

        # 2. Resolve subreddits
        if query.strip().lower().startswith("r/"):
            subreddit_names = [query.strip().lstrip("r/").strip("/")]
        else:
            subs = provider.search_subreddits(query, limit=5)
            if not subs:
                store.update(scan_id, status=ScanStatus.failed, error="No subreddits found for query.")
                return
            subreddit_names = [s.name for s in subs[:3]]

        # 3. Single batch fetch across all subreddits
        # Request more than needed — the lite actor often returns fewer than asked
        limit_per_sub = max(50, post_limit // max(len(subreddit_names), 1))
        raw_posts = provider.fetch_posts_batch(
            subreddit_names,
            sort="top",
            time_filter="month",
            limit_per_sub=limit_per_sub,
        )

        # 4. Filter to pain-point posts
        matched = [
            HarvestedPost(
                reddit_id=p.reddit_id,
                subreddit=p.subreddit,
                title=p.title,
                body=p.body,
                score=p.score,
                num_comments=p.num_comments,
                created_utc=p.created_utc,
                permalink=p.permalink,
                matched_filter=True,
                top_comments=[],
            )
            for p in raw_posts
            if matches_pain_point(f"{p.title} {p.body}")
        ]

        if not matched:
            # Fall back: if filter matched nothing, use all posts (Claude will still find themes)
            matched = [
                HarvestedPost(
                    reddit_id=p.reddit_id,
                    subreddit=p.subreddit,
                    title=p.title,
                    body=p.body,
                    score=p.score,
                    num_comments=p.num_comments,
                    created_utc=p.created_utc,
                    permalink=p.permalink,
                    matched_filter=False,
                    top_comments=[],
                )
                for p in raw_posts
            ]

        if not matched:
            store.update(scan_id, status=ScanStatus.failed, error="No posts found. Try a different niche or subreddit.")
            log_scan(
                ip, query, from_cache=False, status="failed", themes_count=0, engine=engine,
                scan_type="pain", clerk_id=clerk_id, attribution=attribution,
            )
            return

        # 5. Analyze + score
        primary = subreddit_names[0]
        result, _ = analyze(primary, matched)
        scored = score_themes(result, matched)

        # 6. Cache + return
        set_cached(engine, query, scored)
        store.update(scan_id, status=ScanStatus.done, result=scored, from_cache=False)
        log_scan(
            ip, query, from_cache=False, status="done", themes_count=len(scored), engine=engine,
            scan_type="pain", clerk_id=clerk_id, attribution=attribution,
        )
        _persist(engine, scan_id, query, scored, False, account_key, clerk_id)

    except Exception as exc:
        store.update(scan_id, status=ScanStatus.failed, error=str(exc))
        log_scan(
            ip, query, from_cache=False, status="failed", themes_count=0, engine=engine,
            scan_type="pain", clerk_id=clerk_id, attribution=attribution,
        )


def start_scan(
    scan_id: str,
    query: str,
    post_limit: int,
    store: ScanStore,
    engine: Engine,
    ip: str = "unknown",
    account_key: str = "ip:unknown",
    clerk_id: str | None = None,
    attribution: dict | None = None,
) -> None:
    t = threading.Thread(
        target=_run,
        args=(scan_id, query, post_limit, store, engine, ip, account_key, clerk_id, attribution),
        daemon=True,
    )
    t.start()
