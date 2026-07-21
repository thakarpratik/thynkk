"""Scan quota — PAYG credits + 1 free lifetime scan.

Free tier:  1 full scan per account (also tracked per verified email + IP).
            Same complete report as paid — not a teaser / gated preview.
Paid tier:  $19 → 3 credits (CREDITS_PER_PACK), no subscription reset
Credits burn only on successful fresh (non-cache) paid scans.
"""

import os
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.clerk_auth import OptionalClerkId
from app.growth.cache import get_cached, normalize_url

FREE_LIMIT = 1
CREDITS_PER_PACK = int(os.environ.get("CREDITS_PER_PACK", "3"))
FREE_IP_LIMIT = int(os.environ.get("FREE_IP_LIMIT", "2"))
PAID_IP_DAILY_LIMIT = int(os.environ.get("PAID_IP_DAILY_LIMIT", "5"))

router = APIRouter(prefix="/quota", tags=["quota"])


@dataclass(frozen=True)
class ScanReservation:
    tier: str  # "free" | "full"
    charge_credit: bool
    account_key: str
    clerk_id: str | None
    email: str | None
    ip: str


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def ensure_ip_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ip_free_scans (
                ip          TEXT PRIMARY KEY,
                scan_count  INTEGER NOT NULL DEFAULT 0
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ip_paid_scans (
                ip          TEXT NOT NULL,
                day         DATE NOT NULL,
                scan_count  INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (ip, day)
            )
        """))


def ensure_email_free_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_free_scans (
                email       TEXT PRIMARY KEY,
                used_at     TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))


def ensure_growth_scans_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS growth_user_scans (
                scan_id         TEXT PRIMARY KEY,
                account_key     TEXT NOT NULL,
                url             TEXT NOT NULL,
                tier            TEXT NOT NULL,
                charge_credit   BOOLEAN NOT NULL DEFAULT FALSE,
                credit_charged  BOOLEAN NOT NULL DEFAULT FALSE,
                billing_final   BOOLEAN NOT NULL DEFAULT FALSE,
                from_cache      BOOLEAN NOT NULL DEFAULT FALSE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))


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
                    account_key     TEXT PRIMARY KEY,
                    scan_credits    INTEGER NOT NULL DEFAULT 0,
                    free_scan_used  BOOLEAN NOT NULL DEFAULT FALSE,
                    scan_count      INTEGER NOT NULL DEFAULT 0,
                    is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
                    period_start    TIMESTAMPTZ NOT NULL
                )
            """))
            conn.execute(text("""
                INSERT INTO scan_quotas (account_key, scan_credits, free_scan_used, scan_count, is_paid, period_start)
                SELECT
                    account_key,
                    CASE WHEN is_paid THEN :pack ELSE 0 END,
                    CASE WHEN is_paid THEN FALSE ELSE (scan_count >= 1) END,
                    scan_count,
                    is_paid,
                    period_start
                FROM scan_quotas_legacy
                ON CONFLICT (account_key) DO NOTHING
            """), {"pack": CREDITS_PER_PACK})
            conn.execute(text("DROP TABLE scan_quotas_legacy"))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS scan_quotas (
                    account_key     TEXT PRIMARY KEY,
                    scan_credits    INTEGER NOT NULL DEFAULT 0,
                    free_scan_used  BOOLEAN NOT NULL DEFAULT FALSE,
                    scan_count      INTEGER NOT NULL DEFAULT 0,
                    is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
                    period_start    TIMESTAMPTZ NOT NULL
                )
            """))

        conn.execute(text("""
            ALTER TABLE scan_quotas ADD COLUMN IF NOT EXISTS scan_credits INTEGER NOT NULL DEFAULT 0
        """))
        conn.execute(text("""
            ALTER TABLE scan_quotas ADD COLUMN IF NOT EXISTS free_scan_used BOOLEAN NOT NULL DEFAULT FALSE
        """))

        # Legacy subscribers → grant one launch pack of credits once
        conn.execute(text("""
            UPDATE scan_quotas
            SET scan_credits = GREATEST(scan_credits, :pack),
                is_paid = FALSE
            WHERE is_paid = TRUE AND scan_credits < :pack
        """), {"pack": CREDITS_PER_PACK})


def get_ip_free_count(engine: Engine, ip: str) -> int:
    ensure_ip_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT scan_count FROM ip_free_scans WHERE ip = :ip"),
            {"ip": ip},
        ).fetchone()
    return int(row[0]) if row else 0


def increment_ip_free_count(engine: Engine, ip: str) -> None:
    ensure_ip_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO ip_free_scans (ip, scan_count)
                VALUES (:ip, 1)
                ON CONFLICT (ip) DO UPDATE SET scan_count = ip_free_scans.scan_count + 1
            """),
            {"ip": ip},
        )


def get_ip_paid_count_today(engine: Engine, ip: str) -> int:
    ensure_ip_table(engine)
    today = datetime.now(timezone.utc).date()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT scan_count FROM ip_paid_scans WHERE ip = :ip AND day = :day"),
            {"ip": ip, "day": today},
        ).fetchone()
    return int(row[0]) if row else 0


def increment_ip_paid_count(engine: Engine, ip: str) -> None:
    ensure_ip_table(engine)
    today = datetime.now(timezone.utc).date()
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO ip_paid_scans (ip, day, scan_count)
                VALUES (:ip, :day, 1)
                ON CONFLICT (ip, day) DO UPDATE SET scan_count = ip_paid_scans.scan_count + 1
            """),
            {"ip": ip, "day": today},
        )


def email_free_used(engine: Engine, email: str) -> bool:
    if not email:
        return False
    ensure_email_free_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT 1 FROM email_free_scans WHERE email = :email"),
            {"email": email.lower()},
        ).fetchone()
    return row is not None


def mark_email_free_used(engine: Engine, email: str) -> None:
    if not email:
        return
    ensure_email_free_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO email_free_scans (email)
                VALUES (:email)
                ON CONFLICT (email) DO NOTHING
            """),
            {"email": email.lower()},
        )


def check_ip_free_quota(request: Request, engine: Engine, *, is_free_tier: bool) -> None:
    if not is_free_tier:
        return
    ip = get_client_ip(request)
    count = get_ip_free_count(engine, ip)
    if count >= FREE_IP_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "ip_quota_exceeded",
                "scan_count": count,
                "limit": FREE_IP_LIMIT,
                "message": "Free scan limit reached for this network. Buy a Launch Pack for more scans.",
            },
        )


def check_ip_paid_quota(engine: Engine, ip: str) -> None:
    count = get_ip_paid_count_today(engine, ip)
    if count >= PAID_IP_DAILY_LIMIT:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "ip_paid_quota_exceeded",
                "message": "Daily scan limit reached for this network. Try again tomorrow.",
            },
        )


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


def _period_start() -> datetime:
    return datetime.now(timezone.utc)


def get_quota(account_key: str, engine: Engine) -> dict:
    ensure_table(engine)
    period_start = _period_start()

    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT scan_credits, free_scan_used, scan_count, is_paid, period_start
                FROM scan_quotas WHERE account_key = :key
            """),
            {"key": account_key},
        ).fetchone()

        if row is None:
            conn.execute(
                text("""
                    INSERT INTO scan_quotas (account_key, scan_credits, free_scan_used, scan_count, is_paid, period_start)
                    VALUES (:key, 0, FALSE, 0, FALSE, :period_start)
                """),
                {"key": account_key, "period_start": period_start},
            )
            return {
                "scan_credits": 0,
                "free_scan_used": False,
                "scan_count": 0,
                "period_start": period_start,
            }

        credits, free_used, scan_count, _, stored_period = row
        return {
            "scan_credits": int(credits),
            "free_scan_used": bool(free_used),
            "scan_count": int(scan_count),
            "period_start": stored_period,
        }


def add_credits(account_key: str, amount: int, engine: Engine) -> int:
    ensure_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO scan_quotas (account_key, scan_credits, free_scan_used, scan_count, is_paid, period_start)
                VALUES (:key, :amount, FALSE, 0, FALSE, :period_start)
                ON CONFLICT (account_key) DO UPDATE
                SET scan_credits = scan_quotas.scan_credits + :amount
            """),
            {"key": account_key, "amount": amount, "period_start": _period_start()},
        )
        row = conn.execute(
            text("SELECT scan_credits FROM scan_quotas WHERE account_key = :key"),
            {"key": account_key},
        ).fetchone()
    return int(row[0]) if row else amount


def reserve_scan(
    request: Request,
    account_key: str,
    clerk_id: str | None,
    email: str | None,
    url: str,
    engine: Engine,
) -> ScanReservation:
    quota = get_quota(account_key, engine)
    credits = quota["scan_credits"]
    free_used = quota["free_scan_used"]
    ip = get_client_ip(request)
    cached = get_cached(engine, url) is not None

    if cached:
        if credits > 0:
            return ScanReservation("full", False, account_key, clerk_id, email, ip)
        if not free_used and not email_free_used(engine, email or ""):
            check_ip_free_quota(request, engine, is_free_tier=True)
            return ScanReservation("free", False, account_key, clerk_id, email, ip)
        if not free_used and email_free_used(engine, email or ""):
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "quota_exceeded",
                    "message": "Free scan already used on this email. Buy a Launch Pack for more full scans.",
                },
            )
        return ScanReservation("free", False, account_key, clerk_id, email, ip)

    if credits > 0:
        check_ip_paid_quota(engine, ip)
        return ScanReservation("full", True, account_key, clerk_id, email, ip)

    if not free_used and not email_free_used(engine, email or ""):
        check_ip_free_quota(request, engine, is_free_tier=True)
        return ScanReservation("free", False, account_key, clerk_id, email, ip)

    raise HTTPException(
        status_code=429,
        detail={
            "error": "quota_exceeded",
            "scan_credits": credits,
            "free_scan_used": free_used,
            "message": "No scans left. Buy a Launch Pack ($19) for 3 more full scans.",
        },
    )


def record_scan_start(
    engine: Engine,
    scan_id: str,
    reservation: ScanReservation,
    url: str,
) -> None:
    ensure_growth_scans_table(engine)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO growth_user_scans
                    (scan_id, account_key, url, tier, charge_credit, credit_charged, billing_final, from_cache)
                VALUES
                    (:scan_id, :account_key, :url, :tier, :charge_credit, FALSE, FALSE, FALSE)
            """),
            {
                "scan_id": scan_id,
                "account_key": reservation.account_key,
                "url": normalize_url(url),
                "tier": reservation.tier,
                "charge_credit": reservation.charge_credit,
            },
        )


def finalize_scan_billing(
    engine: Engine,
    scan_id: str,
    *,
    success: bool,
    from_cache: bool,
    ip: str,
) -> None:
    ensure_growth_scans_table(engine)
    ensure_table(engine)

    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT account_key, tier, charge_credit, credit_charged, billing_final
                FROM growth_user_scans WHERE scan_id = :scan_id
            """),
            {"scan_id": scan_id},
        ).fetchone()

    if not row or row.billing_final:
        return

    account_key, tier, charge_credit, credit_charged, _ = row

    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE growth_user_scans
                SET from_cache = :from_cache, billing_final = TRUE
                WHERE scan_id = :scan_id
            """),
            {"scan_id": scan_id, "from_cache": from_cache},
        )

        if not success:
            return

        conn.execute(
            text("""
                UPDATE scan_quotas
                SET scan_count = scan_count + 1
                WHERE account_key = :key
            """),
            {"key": account_key},
        )

        if tier == "full" and charge_credit and not credit_charged:
            updated = conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET scan_credits = scan_credits - 1
                    WHERE account_key = :key AND scan_credits > 0
                    RETURNING scan_credits
                """),
                {"key": account_key},
            ).fetchone()
            if updated:
                conn.execute(
                    text("""
                        UPDATE growth_user_scans
                        SET credit_charged = TRUE
                        WHERE scan_id = :scan_id
                    """),
                    {"scan_id": scan_id},
                )
                ensure_ip_table(engine)
                today = datetime.now(timezone.utc).date()
                conn.execute(
                    text("""
                        INSERT INTO ip_paid_scans (ip, day, scan_count)
                        VALUES (:ip, :day, 1)
                        ON CONFLICT (ip, day) DO UPDATE SET scan_count = ip_paid_scans.scan_count + 1
                    """),
                    {"ip": ip, "day": today},
                )

        if tier == "free":
            conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET free_scan_used = TRUE
                    WHERE account_key = :key
                """),
                {"key": account_key},
            )
            if account_key.startswith("clerk:"):
                email_row = conn.execute(
                    text("SELECT email FROM users WHERE clerk_id = :cid AND deleted_at IS NULL"),
                    {"cid": account_key.removeprefix("clerk:")},
                ).fetchone()
                if email_row and email_row[0]:
                    ensure_email_free_table(engine)
                    conn.execute(
                        text("""
                            INSERT INTO email_free_scans (email)
                            VALUES (:email)
                            ON CONFLICT (email) DO NOTHING
                        """),
                        {"email": email_row[0].lower()},
                    )
            ensure_ip_table(engine)
            conn.execute(
                text("""
                    INSERT INTO ip_free_scans (ip, scan_count)
                    VALUES (:ip, 1)
                    ON CONFLICT (ip) DO UPDATE SET scan_count = ip_free_scans.scan_count + 1
                """),
                {"ip": ip},
            )


def get_scan_tier(engine: Engine, scan_id: str, account_key: str) -> str | None:
    ensure_growth_scans_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT tier FROM growth_user_scans
                WHERE scan_id = :scan_id AND account_key = :key
            """),
            {"scan_id": scan_id, "key": account_key},
        ).fetchone()
    return row[0] if row else None


# Legacy no-op for old billing webhook imports
def sync_paid_status(engine: Engine, clerk_id: str, is_paid: bool) -> None:
    if is_paid:
        add_credits(f"clerk:{clerk_id}", CREDITS_PER_PACK, engine)


def check_quota(
    account_key: str,
    engine: Engine,
    clerk_id: str | None = None,
    request: Request | None = None,
) -> dict:
    """Legacy pain-scanner quota check."""
    quota = get_quota(account_key, engine)
    credits = quota["scan_credits"]
    free_used = quota["free_scan_used"]
    is_paid = credits > 0
    if request is not None:
        check_ip_free_quota(request, engine, is_free_tier=not is_paid and not free_used)
    if credits <= 0 and free_used:
        raise HTTPException(
            status_code=429,
            detail={"error": "quota_exceeded", "is_paid": False, "message": "No scans left."},
        )
    return {**quota, "is_paid": is_paid, "remaining": credits + (0 if free_used else 1)}


def increment_quota(account_key: str, engine: Engine) -> None:
    """Legacy — pain scanner increments immediately (growth scans use finalize_scan_billing)."""
    quota = get_quota(account_key, engine)
    with engine.begin() as conn:
        if quota["scan_credits"] > 0:
            conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET scan_credits = scan_credits - 1, scan_count = scan_count + 1
                    WHERE account_key = :key AND scan_credits > 0
                """),
                {"key": account_key},
            )
        else:
            conn.execute(
                text("""
                    UPDATE scan_quotas
                    SET free_scan_used = TRUE, scan_count = scan_count + 1
                    WHERE account_key = :key
                """),
                {"key": account_key},
            )


class QuotaStatus(BaseModel):
    scan_credits: int
    free_scan_used: bool
    free_available: bool
    remaining: int
    pack_credits: int
    # Legacy fields for gradual frontend migration
    is_paid: bool
    scan_count: int
    limit: int
    period_start: datetime


@router.get("/status", response_model=QuotaStatus)
def quota_status(
    request: Request,
    clerk_id: OptionalClerkId = None,
    engine: Engine = Depends(get_engine),
) -> QuotaStatus:
    key = account_key_for(request, clerk_id)
    quota = get_quota(key, engine)
    credits = quota["scan_credits"]
    free_used = quota["free_scan_used"]
    free_available = not free_used
    remaining = credits + (1 if free_available else 0)

    return QuotaStatus(
        scan_credits=credits,
        free_scan_used=free_used,
        free_available=free_available,
        remaining=remaining,
        pack_credits=CREDITS_PER_PACK,
        is_paid=credits > 0,
        scan_count=quota["scan_count"],
        limit=remaining,
        period_start=quota["period_start"],
    )