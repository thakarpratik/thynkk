"""Growth scan cache — keyed by normalized site URL."""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.engine import Engine

CACHE_TTL_HOURS = 24


def ensure_cache_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS growth_scan_cache (
                url_key     TEXT PRIMARY KEY,
                report_json TEXT NOT NULL,
                cached_at   TIMESTAMPTZ NOT NULL
            )
        """))


def normalize_url(url: str) -> str:
    return url.strip().lower().rstrip("/").replace("https://www.", "https://")


def get_cached(engine: Engine, url: str, ttl_hours: int = CACHE_TTL_HOURS) -> dict | None:
    ensure_cache_table(engine)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT report_json, cached_at FROM growth_scan_cache WHERE url_key = :k"),
            {"k": normalize_url(url)},
        ).fetchone()
    if not row or row.cached_at < cutoff:
        return None
    return json.loads(row.report_json)


def set_cached(engine: Engine, url: str, report: dict) -> None:
    ensure_cache_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO growth_scan_cache (url_key, report_json, cached_at)
                VALUES (:k, :data, :now)
                ON CONFLICT (url_key) DO UPDATE
                SET report_json = :data, cached_at = :now
            """),
            {
                "k": normalize_url(url),
                "data": json.dumps(report),
                "now": datetime.now(timezone.utc),
            },
        )