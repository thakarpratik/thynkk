"""Scan quota enforcement — keyed by Clerk user when authenticated, else IP.

Free tier:  1 scan total (lifetime)
Paid tier: 50 scans per calendar month
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.clerk_auth import OptionalClerkId
from app.api.users import user_is_paid

FREE_LIMIT = 1
PAID_LIMIT = 50

router = APIRouter(prefix="/quota", tags=["quota"])


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def ensure_table(engine: Engine) -> None:
    with engine.begin() as conn:
        has_legacy = conn.execute(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'scan_quotas' AND column_name = 'ip'
            LIMIT 1
        """)).fetchone()

        if has_legacy:
            conn.execute(text("ALTER TABLE scan_quotas RENAME TO scan_quotas_legacy"))
            conn.execute(text("""
                CREATE TABLE scan_quotas (
                    account_key   TEXT PRIMARY KEY,
                    is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
                    scan_count    INTEGER NOT NULL DEFAULT 0,
                    period_start  TIMESTAMPTZ NOT NULL
                )
            """))
            conn.execute(text("""
                INSERT INTO scan_quotas (account_key, is_paid, scan_count, period_start)
                SELECT 'ip:' || ip, is_paid, scan_count, period_start
                FROM scan_quotas_legacy
                ON CONFLICT (account_key) DO NOTHING
            """))
            conn.execute(text("DROP TABLE scan_quotas_legacy"))
            return

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS scan_quotas (
                account_key   TEXT PRIMARY KEY,
                is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
                scan_count    INTEGER NOT NULL DEFAULT 0,
                period_start  TIMESTAMPTZ NOT NULL
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


def account_key_for(request: Request, clerk_id: str | None) -> str:
    if clerk_id:
        return f"clerk:{clerk_id}"
    return f"ip:{get_client_ip(request)}"


def sync_paid_status(engine: Engine, clerk_id: str, is_paid: bool) -> None:
    ensure_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO scan_quotas (account_key, is_paid, scan_count, period_start)
                VALUES (:key, :is_paid, 0, :period_start)
                ON CONFLICT (account_key) DO UPDATE SET is_paid = EXCLUDED.is_paid
            """),
            {
                "key": f"clerk:{clerk_id}",
                "is_paid": is_paid,
                "period_start": _current_period_start(),
            },
        )


def resolve_is_paid(engine: Engine, account_key: str, clerk_id: str | None) -> bool:
    if clerk_id and user_is_paid(engine, clerk_id):
        return True
    ensure_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT is_paid FROM scan_quotas WHERE account_key = :key"),
            {"key": account_key},
        ).fetchone()
    return bool(row and row[0])


def get_quota(account_key: str, engine: Engine, clerk_id: str | None = None) -> dict:
    ensure_table(engine)
    period_start = _current_period_start()
    is_paid = resolve_is_paid(engine, account_key, clerk_id)

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT is_paid, scan_count, period_start FROM scan_quotas WHERE account_key = :key"),
            {"key": account_key},
        ).fetchone()

        if row is None:
            conn.execute(
                text("""
                    INSERT INTO scan_quotas (account_key, is_paid, scan_count, period_start)
                    VALUES (:key, :is_paid, 0, :period_start)
                """),
                {"key": account_key, "is_paid": is_paid, "period_start": period_start},
            )
            return {"is_paid": is_paid, "scan_count": 0, "period_start": period_start}

        _, scan_count, stored_period = row

        if is_paid and stored_period < period_start:
            conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET scan_count = 0, period_start = :period_start, is_paid = TRUE
                    WHERE account_key = :key
                """),
                {"key": account_key, "period_start": period_start},
            )
            scan_count = 0
        elif is_paid:
            conn.execute(
                text("UPDATE scan_quotas SET is_paid = TRUE WHERE account_key = :key"),
                {"key": account_key},
            )
        else:
            conn.execute(
                text("UPDATE scan_quotas SET is_paid = FALSE WHERE account_key = :key"),
                {"key": account_key},
            )

        return {"is_paid": is_paid, "scan_count": scan_count, "period_start": stored_period}


def increment_quota(account_key: str, engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE scan_quotas SET scan_count = scan_count + 1 WHERE account_key = :key"),
            {"key": account_key},
        )


def check_quota(account_key: str, engine: Engine, clerk_id: str | None = None) -> dict:
    quota = get_quota(account_key, engine, clerk_id)
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


class QuotaStatus(BaseModel):
    is_paid: bool
    scan_count: int
    limit: int
    remaining: int
    period_start: datetime


@router.get("/status", response_model=QuotaStatus)
def quota_status(
    request: Request,
    clerk_id: OptionalClerkId = None,
    engine: Engine = Depends(get_engine),
) -> QuotaStatus:
    key = account_key_for(request, clerk_id)
    quota = get_quota(key, engine, clerk_id)
    limit = PAID_LIMIT if quota["is_paid"] else FREE_LIMIT
    return QuotaStatus(
        is_paid=quota["is_paid"],
        scan_count=quota["scan_count"],
        limit=limit,
        remaining=max(0, limit - quota["scan_count"]),
        period_start=quota["period_start"],
    )