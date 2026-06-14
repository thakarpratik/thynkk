"""Theme cache — store and retrieve scan results from Postgres.

Keyed by normalized query string. TTL is configurable (default 24h).
A cache hit means the scan completes instantly with no Apify or Claude calls.
"""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.engine import Engine

CACHE_TTL_HOURS = 24


def ensure_cache_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scan_cache (
                query       TEXT PRIMARY KEY,
                themes_json TEXT NOT NULL,
                cached_at   TIMESTAMPTZ NOT NULL
            )
        """))


def _normalize(query: str) -> str:
    return query.strip().lower().lstrip("r/")


def get_cached(engine: Engine, query: str, ttl_hours: int = CACHE_TTL_HOURS) -> list[dict] | None:
    """Return cached themes if fresh, else None."""
    ensure_cache_table(engine)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT themes_json, cached_at FROM scan_cache WHERE query = :q"),
            {"q": _normalize(query)},
        ).fetchone()

    if not row:
        return None
    if row.cached_at < cutoff:
        return None  # stale

    return json.loads(row.themes_json)


def set_cached(engine: Engine, query: str, themes: list[dict]) -> None:
    """Upsert themes into cache."""
    ensure_cache_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO scan_cache (query, themes_json, cached_at)
                VALUES (:q, :data, :now)
                ON CONFLICT (query) DO UPDATE
                SET themes_json = :data, cached_at = :now
            """),
            {
                "q": _normalize(query),
                "data": json.dumps(themes),
                "now": datetime.now(timezone.utc),
            },
        )


def invalidate(engine: Engine, query: str) -> None:
    """Force a fresh scan next time by removing the cache entry."""
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM scan_cache WHERE query = :q"),
            {"q": _normalize(query)},
        )
