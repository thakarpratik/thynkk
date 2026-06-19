"""Admin stats endpoint — internal use only.

Protected by ADMIN_SECRET env var. Pass as:
  Authorization: Bearer <ADMIN_SECRET>

Exposes:
  GET /admin/stats   — aggregate counts + recent activity
"""

import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

router = APIRouter(prefix="/admin", tags=["admin"])


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def _require_secret(request: Request) -> None:
    secret = os.environ.get("ADMIN_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Admin not configured")
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _ensure_scan_log(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scan_log (
                id          BIGSERIAL PRIMARY KEY,
                ip          TEXT NOT NULL,
                query       TEXT NOT NULL,
                from_cache  BOOLEAN NOT NULL DEFAULT FALSE,
                status      TEXT NOT NULL DEFAULT 'done',
                themes_count INTEGER NOT NULL DEFAULT 0,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))


# ── Models ────────────────────────────────────────────────────────────────────

class ScanLogEntry(BaseModel):
    id: int
    ip: str
    query: str
    from_cache: bool
    status: str
    themes_count: int
    created_at: datetime


class AdminStats(BaseModel):
    total_scans: int
    scans_today: int
    scans_this_week: int
    cache_hit_rate_pct: int
    total_unique_ips: int
    free_users: int
    paid_users: int
    quota_exhausted_free: int
    top_queries: list[dict]
    recent_scans: list[ScanLogEntry]


# ── Helpers ───────────────────────────────────────────────────────────────────

def log_scan(
    ip: str,
    query: str,
    from_cache: bool,
    status: str,
    themes_count: int,
    engine: Engine,
) -> None:
    """Called from runner after each scan completes."""
    _ensure_scan_log(engine)
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO scan_log (ip, query, from_cache, status, themes_count)
            VALUES (:ip, :query, :from_cache, :status, :themes_count)
        """), {
            "ip": ip,
            "query": query,
            "from_cache": from_cache,
            "status": status,
            "themes_count": themes_count,
        })


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
def admin_stats(
    request: Request,
    engine: Engine = Depends(get_engine),
    _: None = Depends(_require_secret),
) -> AdminStats:
    _ensure_scan_log(engine)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    with engine.connect() as conn:
        # Scan counts
        total_scans = conn.execute(text("SELECT COUNT(*) FROM scan_log")).scalar() or 0
        scans_today = conn.execute(
            text("SELECT COUNT(*) FROM scan_log WHERE created_at >= :d"),
            {"d": today_start},
        ).scalar() or 0
        scans_week = conn.execute(
            text("SELECT COUNT(*) FROM scan_log WHERE created_at >= :d"),
            {"d": week_start},
        ).scalar() or 0

        # Cache hit rate
        cache_hits = conn.execute(
            text("SELECT COUNT(*) FROM scan_log WHERE from_cache = TRUE")
        ).scalar() or 0
        cache_hit_rate = int(cache_hits * 100 / total_scans) if total_scans else 0

        # Unique IPs
        unique_ips = conn.execute(
            text("SELECT COUNT(DISTINCT ip) FROM scan_log")
        ).scalar() or 0

        # Quota table stats (may not exist yet)
        try:
            free_users = conn.execute(
                text("SELECT COUNT(*) FROM scan_quotas WHERE is_paid = FALSE")
            ).scalar() or 0
            paid_users = conn.execute(
                text("SELECT COUNT(*) FROM scan_quotas WHERE is_paid = TRUE")
            ).scalar() or 0
            quota_exhausted_free = conn.execute(
                text("SELECT COUNT(*) FROM scan_quotas WHERE is_paid = FALSE AND scan_count >= 1")
            ).scalar() or 0
        except Exception:
            free_users = paid_users = quota_exhausted_free = 0

        # Top queries
        top_rows = conn.execute(text("""
            SELECT query, COUNT(*) as cnt
            FROM scan_log
            GROUP BY query
            ORDER BY cnt DESC
            LIMIT 10
        """)).fetchall()
        top_queries = [{"query": r[0], "count": r[1]} for r in top_rows]

        # Recent scans
        recent_rows = conn.execute(text("""
            SELECT id, ip, query, from_cache, status, themes_count, created_at
            FROM scan_log
            ORDER BY created_at DESC
            LIMIT 50
        """)).fetchall()
        recent_scans = [
            ScanLogEntry(
                id=r[0],
                ip=r[1],
                query=r[2],
                from_cache=r[3],
                status=r[4],
                themes_count=r[5],
                created_at=r[6],
            )
            for r in recent_rows
        ]

    return AdminStats(
        total_scans=total_scans,
        scans_today=scans_today,
        scans_this_week=scans_week,
        cache_hit_rate_pct=cache_hit_rate,
        total_unique_ips=unique_ips,
        free_users=free_users,
        paid_users=paid_users,
        quota_exhausted_free=quota_exhausted_free,
        top_queries=top_queries,
        recent_scans=recent_scans,
    )
