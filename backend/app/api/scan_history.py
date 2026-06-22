"""Persist completed scans in Postgres so users can retrieve them after login."""

import json
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_saved_scans_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS saved_scans (
                scan_id       TEXT PRIMARY KEY,
                account_key   TEXT NOT NULL,
                clerk_id      TEXT,
                query         TEXT NOT NULL,
                themes_json   TEXT NOT NULL,
                total_themes  INTEGER NOT NULL,
                from_cache    BOOLEAN NOT NULL DEFAULT FALSE,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_saved_scans_clerk
            ON saved_scans (clerk_id, created_at DESC)
            WHERE clerk_id IS NOT NULL
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_saved_scans_account
            ON saved_scans (account_key, created_at DESC)
        """))


def save_scan(
    engine: Engine,
    *,
    scan_id: str,
    account_key: str,
    clerk_id: str | None,
    query: str,
    themes: list[dict],
    from_cache: bool,
) -> None:
    ensure_saved_scans_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO saved_scans (
                    scan_id, account_key, clerk_id, query,
                    themes_json, total_themes, from_cache, created_at
                )
                VALUES (
                    :scan_id, :account_key, :clerk_id, :query,
                    :themes_json, :total_themes, :from_cache, now()
                )
                ON CONFLICT (scan_id) DO UPDATE SET
                    account_key = EXCLUDED.account_key,
                    clerk_id = COALESCE(EXCLUDED.clerk_id, saved_scans.clerk_id),
                    query = EXCLUDED.query,
                    themes_json = EXCLUDED.themes_json,
                    total_themes = EXCLUDED.total_themes,
                    from_cache = EXCLUDED.from_cache
            """),
            {
                "scan_id": scan_id,
                "account_key": account_key,
                "clerk_id": clerk_id,
                "query": query,
                "themes_json": json.dumps(themes),
                "total_themes": len(themes),
                "from_cache": from_cache,
            },
        )


def claim_ip_scans(engine: Engine, clerk_id: str, ip_account_key: str) -> None:
    """Attach anonymous scans from this IP to the logged-in user."""
    ensure_saved_scans_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE saved_scans
                SET clerk_id = :clerk_id
                WHERE account_key = :ip_key AND clerk_id IS NULL
            """),
            {"clerk_id": clerk_id, "ip_key": ip_account_key},
        )


def get_saved_scan(engine: Engine, scan_id: str) -> dict | None:
    ensure_saved_scans_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT scan_id, account_key, clerk_id, query,
                       themes_json, total_themes, from_cache, created_at
                FROM saved_scans
                WHERE scan_id = :scan_id
            """),
            {"scan_id": scan_id},
        ).fetchone()
    if not row:
        return None
    return {
        "scan_id": row[0],
        "account_key": row[1],
        "clerk_id": row[2],
        "query": row[3],
        "themes": json.loads(row[4]),
        "total_themes": row[5],
        "from_cache": row[6],
        "created_at": row[7],
    }


def can_access_scan(
    saved: dict,
    *,
    clerk_id: str | None,
    account_key: str,
) -> bool:
    if saved.get("clerk_id") and clerk_id:
        return saved["clerk_id"] == clerk_id
    return saved.get("account_key") == account_key


def list_scans(
    engine: Engine,
    *,
    clerk_id: str,
    limit: int = 20,
) -> list[dict]:
    ensure_saved_scans_table(engine)
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT scan_id, query, themes_json, total_themes, from_cache, created_at
                FROM saved_scans
                WHERE clerk_id = :clerk_id
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"clerk_id": clerk_id, "limit": limit},
        ).fetchall()

    results: list[dict] = []
    for row in rows:
        themes = json.loads(row[2])
        results.append({
            "scan_id": row[0],
            "query": row[1],
            "themes": themes,
            "total_themes": row[3],
            "from_cache": row[4],
            "created_at": row[5],
        })
    return results