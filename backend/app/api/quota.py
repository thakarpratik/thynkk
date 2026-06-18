"""IP-based scan quota enforcement.

Free tier:  1 scan total (lifetime — resets never until auth lands)
Paid tier: 50 scans per calendar month

Swap ip -> clerk_user_id once auth is wired.
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

FREE_LIMIT = 1
PAID_LIMIT = 50

router = APIRouter(prefix="/quota", tags=["quota"])


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def ensure_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scan_quotas (
                ip          TEXT NOT NULL,
                is_paid     BOOLEAN NOT NULL DEFAULT FALSE,
                scan_count  INTEGER NOT NULL DEFAULT 0,
                period_start TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (ip)
            )
        """))


def _current_period_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def get_client_ip(request: Request) -> str:
    for header in ("CF-Connecting-IP", "X-Real-IP"):
        val = request.headers.get(header)
        if val:
            return val.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_quota(ip: str, engine: Engine) -> dict:
    ensure_table(engine)
    period_start = _current_period_start()

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT is_paid, scan_count, period_start FROM scan_quotas WHERE ip = :ip"),
            {"ip": ip},
        ).fetchone()

        if row is None:
            conn.execute(
                text("""
                    INSERT INTO scan_quotas (ip, is_paid, scan_count, period_start)
                    VALUES (:ip, FALSE, 0, :period_start)
                """),
                {"ip": ip, "period_start": period_start},
            )
            return {"is_paid": False, "scan_count": 0, "period_start": period_start}

        is_paid, scan_count, stored_period = row

        # Paid users reset monthly; free users never reset (lifetime limit)
        if is_paid and stored_period < period_start:
            conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET scan_count = 0, period_start = :period_start
                    WHERE ip = :ip
                """),
                {"ip": ip, "period_start": period_start},
            )
            scan_count = 0

        return {"is_paid": bool(is_paid), "scan_count": scan_count, "period_start": stored_period}


def increment_quota(ip: str, engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE scan_quotas SET scan_count = scan_count + 1 WHERE ip = :ip"),
            {"ip": ip},
        )


def check_quota(ip: str, engine: Engine) -> dict:
    """Raise 429 if quota exceeded. Return quota dict if allowed."""
    quota = get_quota(ip, engine)
    limit = PAID_LIMIT if quota["is_paid"] else FREE_LIMIT
    if quota["scan_count"] >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "is_paid": quota["is_paid"],
                "scan_count": quota["scan_count"],
                "limit": limit,
            },
        )
    return quota


# ── API endpoint ──────────────────────────────────────────────────────────────

class QuotaStatus(BaseModel):
    is_paid: bool
    scan_count: int
    limit: int
    remaining: int
    period_start: datetime


@router.get("/status", response_model=QuotaStatus)
def quota_status(
    request: Request,
    engine: Engine = Depends(get_engine),
) -> QuotaStatus:
    ip = get_client_ip(request)
    quota = get_quota(ip, engine)
    limit = PAID_LIMIT if quota["is_paid"] else FREE_LIMIT
    return QuotaStatus(
        is_paid=quota["is_paid"],
        scan_count=quota["scan_count"],
        limit=limit,
        remaining=max(0, limit - quota["scan_count"]),
        period_start=quota["period_start"],
    )
