"""Persist completed growth scans so users can revisit reports after server restarts."""

import json

from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_saved_growth_scans_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS saved_growth_scans (
                scan_id       TEXT PRIMARY KEY,
                account_key   TEXT NOT NULL,
                clerk_id      TEXT,
                url           TEXT NOT NULL,
                product_name  TEXT NOT NULL DEFAULT '',
                report_json   TEXT NOT NULL,
                tier          TEXT NOT NULL,
                total_threads INTEGER NOT NULL DEFAULT 0,
                from_cache    BOOLEAN NOT NULL DEFAULT FALSE,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_saved_growth_scans_clerk
            ON saved_growth_scans (clerk_id, created_at DESC)
            WHERE clerk_id IS NOT NULL
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_saved_growth_scans_account
            ON saved_growth_scans (account_key, created_at DESC)
        """))


def save_growth_scan(
    engine: Engine,
    *,
    scan_id: str,
    account_key: str,
    clerk_id: str | None,
    url: str,
    product_name: str,
    report: dict,
    tier: str,
    from_cache: bool,
) -> None:
    ensure_saved_growth_scans_table(engine)
    threads = report.get("threads") or []
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO saved_growth_scans (
                    scan_id, account_key, clerk_id, url, product_name,
                    report_json, tier, total_threads, from_cache, created_at
                )
                VALUES (
                    :scan_id, :account_key, :clerk_id, :url, :product_name,
                    :report_json, :tier, :total_threads, :from_cache, now()
                )
                ON CONFLICT (scan_id) DO UPDATE SET
                    account_key = EXCLUDED.account_key,
                    clerk_id = COALESCE(EXCLUDED.clerk_id, saved_growth_scans.clerk_id),
                    url = EXCLUDED.url,
                    product_name = EXCLUDED.product_name,
                    report_json = EXCLUDED.report_json,
                    tier = EXCLUDED.tier,
                    total_threads = EXCLUDED.total_threads,
                    from_cache = EXCLUDED.from_cache
            """),
            {
                "scan_id": scan_id,
                "account_key": account_key,
                "clerk_id": clerk_id,
                "url": url,
                "product_name": product_name,
                "report_json": json.dumps(report),
                "tier": tier,
                "total_threads": len(threads),
                "from_cache": from_cache,
            },
        )


def get_saved_growth_scan(engine: Engine, scan_id: str) -> dict | None:
    ensure_saved_growth_scans_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT scan_id, account_key, clerk_id, url, product_name,
                       report_json, tier, total_threads, from_cache, created_at
                FROM saved_growth_scans
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
        "url": row[3],
        "product_name": row[4],
        "report": json.loads(row[5]),
        "tier": row[6],
        "total_threads": row[7],
        "from_cache": row[8],
        "created_at": row[9],
    }


def can_access_growth_scan(
    saved: dict,
    *,
    clerk_id: str | None,
    account_key: str,
) -> bool:
    if saved.get("clerk_id") and clerk_id:
        return saved["clerk_id"] == clerk_id
    return saved.get("account_key") == account_key


def list_growth_scans(
    engine: Engine,
    *,
    clerk_id: str,
    limit: int = 20,
) -> list[dict]:
    ensure_saved_growth_scans_table(engine)
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT scan_id, url, product_name, tier, total_threads, from_cache, created_at
                FROM saved_growth_scans
                WHERE clerk_id = :clerk_id
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"clerk_id": clerk_id, "limit": limit},
        ).fetchall()

    return [
        {
            "scan_id": row[0],
            "url": row[1],
            "product_name": row[2],
            "tier": row[3],
            "total_threads": row[4],
            "from_cache": row[5],
            "created_at": row[6],
        }
        for row in rows
    ]