"""Admin stats endpoint — internal use only.

Protected by ADMIN_SECRET env var. Pass as:
  Authorization: Bearer <ADMIN_SECRET>

Exposes:
  GET /admin/stats   — aggregate counts + attribution filters + tech health
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.attribution import Attribution

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
                id           BIGSERIAL PRIMARY KEY,
                ip           TEXT NOT NULL,
                query        TEXT NOT NULL,
                from_cache   BOOLEAN NOT NULL DEFAULT FALSE,
                status       TEXT NOT NULL DEFAULT 'done',
                themes_count INTEGER NOT NULL DEFAULT 0,
                created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))
        for stmt in (
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS scan_type TEXT NOT NULL DEFAULT 'growth'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS clerk_id TEXT",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS tier TEXT",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS referrer TEXT NOT NULL DEFAULT 'direct'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS medium TEXT NOT NULL DEFAULT 'none'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS campaign TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'unknown'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT 'unknown'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS browser TEXT NOT NULL DEFAULT 'unknown'",
            "ALTER TABLE scan_log ADD COLUMN IF NOT EXISTS os TEXT NOT NULL DEFAULT 'unknown'",
        ):
            conn.execute(text(stmt))


def _mask_email(email: str) -> str:
    if not email or "@" not in email:
        return "—"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        return f"{local[0]}*@{domain}"
    return f"{local[:2]}***@{domain}"


def _mask_clerk_id(clerk_id: str | None) -> str:
    if not clerk_id:
        return "—"
    return clerk_id[:10] + "…"


# ── Models ────────────────────────────────────────────────────────────────────

class ScanLogEntry(BaseModel):
    id: int
    ip: str
    query: str
    from_cache: bool
    status: str
    themes_count: int
    scan_type: str
    clerk_id: str | None
    tier: str | None
    user_email: str | None
    referrer: str
    source: str
    medium: str
    campaign: str
    country: str
    device: str
    browser: str
    os: str
    created_at: datetime


class SourceCount(BaseModel):
    source: str
    count: int


class NamedCount(BaseModel):
    name: str
    count: int


class UrlCount(BaseModel):
    url: str
    count: int


class DayCount(BaseModel):
    date: str
    scans: int
    signups: int
    purchases: int


class UserRow(BaseModel):
    email: str
    clerk_id: str
    created_at: datetime
    scan_credits: int
    free_scan_used: bool
    growth_scans: int
    purchased: bool


class PurchaseRow(BaseModel):
    order_id: str
    clerk_id: str
    amount: str
    currency: str
    credits_granted: int
    created_at: datetime


class SaturationLeadRow(BaseModel):
    id: int
    email: str
    idea: str
    score: int | None
    decision: str | None
    data_mode: str | None
    created_at: datetime


class TechCheck(BaseModel):
    name: str
    ok: bool
    detail: str


class TechHealth(BaseModel):
    database: str
    checks: list[TechCheck]


class FilterOptions(BaseModel):
    sources: list[str]
    referrers: list[str]
    countries: list[str]
    devices: list[str]
    browsers: list[str]
    operating_systems: list[str]
    scan_types: list[str]


class AppliedFilters(BaseModel):
    range: str
    date_from: datetime | None
    date_to: datetime | None
    source: str | None = None
    referral: str | None = None
    country: str | None = None
    device: str | None = None
    browser: str | None = None
    os: str | None = None
    scan_type: str | None = None


class AdminStats(BaseModel):
    total_scans: int
    scans_today: int
    scans_this_week: int
    growth_scans: int
    pain_scans: int
    cache_hit_rate_pct: int
    total_unique_ips: int

    total_users: int
    signups_today: int
    signups_this_week: int
    users_with_scans: int
    free_scans_used: int
    users_with_credits: int
    pack_purchases: int
    pack_revenue_usd: float

    waitlist_total: int
    waitlist_sources: list[SourceCount]
    top_urls: list[UrlCount]
    tier_breakdown: dict[str, int]

    # Saturation Score leads (email-gated pre-launch tool)
    saturation_total: int = 0
    saturation_today: int = 0
    saturation_this_week: int = 0
    saturation_in_period: int = 0
    saturation_unique_emails: int = 0
    saturation_avg_score: float = 0.0
    saturation_by_decision: list[NamedCount] = []
    saturation_top_ideas: list[NamedCount] = []
    recent_saturation_leads: list[SaturationLeadRow] = []

    # Filtered-period metrics
    filtered_scans: int
    filtered_unique_ips: int
    filtered_signups: int
    filtered_purchases: int
    filtered_revenue_usd: float

    # Attribution breakdowns (respect active filters + date range)
    by_source: list[NamedCount]
    by_referral: list[NamedCount]
    by_country: list[NamedCount]
    by_device: list[NamedCount]
    by_browser: list[NamedCount]
    by_os: list[NamedCount]
    by_day: list[DayCount]

    filter_options: FilterOptions
    applied_filters: AppliedFilters

    tech: TechHealth
    recent_users: list[UserRow]
    recent_purchases: list[PurchaseRow]
    recent_scans: list[ScanLogEntry]


# ── Helpers ───────────────────────────────────────────────────────────────────

def log_scan(
    ip: str,
    query: str,
    from_cache: bool,
    status: str,
    themes_count: int,
    engine: Engine,
    *,
    scan_type: str = "growth",
    clerk_id: str | None = None,
    tier: str | None = None,
    attribution: Attribution | dict[str, str] | None = None,
) -> None:
    """Called from runners after each scan completes."""
    _ensure_scan_log(engine)
    if isinstance(attribution, Attribution):
        attr = attribution.model_dump()
    elif isinstance(attribution, dict):
        attr = {
            "referrer": attribution.get("referrer") or "direct",
            "source": attribution.get("source") or "direct",
            "medium": attribution.get("medium") or "none",
            "campaign": attribution.get("campaign") or "",
            "country": attribution.get("country") or "unknown",
            "device": attribution.get("device") or "unknown",
            "browser": attribution.get("browser") or "unknown",
            "os": attribution.get("os") or "unknown",
        }
    else:
        attr = {
            "referrer": "direct",
            "source": "direct",
            "medium": "none",
            "campaign": "",
            "country": "unknown",
            "device": "unknown",
            "browser": "unknown",
            "os": "unknown",
        }

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO scan_log (
                ip, query, from_cache, status, themes_count, scan_type, clerk_id, tier,
                referrer, source, medium, campaign, country, device, browser, os
            )
            VALUES (
                :ip, :query, :from_cache, :status, :themes_count, :scan_type, :clerk_id, :tier,
                :referrer, :source, :medium, :campaign, :country, :device, :browser, :os
            )
        """), {
            "ip": ip,
            "query": query,
            "from_cache": from_cache,
            "status": status,
            "themes_count": themes_count,
            "scan_type": scan_type,
            "clerk_id": clerk_id,
            "tier": tier,
            **attr,
        })


def _recover(conn) -> None:
    """Clear aborted Postgres transaction so later queries can run."""
    try:
        conn.rollback()
    except Exception:
        pass


def _table_exists(conn, table: str) -> bool:
    try:
        row = conn.execute(
            text("""
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = :t
                LIMIT 1
            """),
            {"t": table},
        ).fetchone()
        return row is not None
    except Exception:
        _recover(conn)
        return False


def _safe_scalar(conn, sql: str, params: dict | None = None, default: int = 0) -> int:
    try:
        return int(conn.execute(text(sql), params or {}).scalar() or default)
    except Exception:
        # Without rollback, PostgreSQL leaves the connection in failed-tx state
        # and every subsequent query raises InFailedSqlTransaction (HTTP 500).
        _recover(conn)
        return default


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def _resolve_date_range(
    range_key: str,
    date_from: str | None,
    date_to: str | None,
) -> tuple[datetime | None, datetime | None, str]:
    now = datetime.now(timezone.utc)
    key = (range_key or "7d").strip().lower()

    if key == "custom":
        start = _parse_iso(date_from)
        end = _parse_iso(date_to)
        if end is None:
            end = now
        if start and end and start > end:
            start, end = end, start
        return start, end, "custom"

    presets: dict[str, timedelta | None] = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
        "all": None,
    }
    if key not in presets:
        key = "7d"
    delta = presets[key]
    if delta is None:
        return None, None, "all"
    return now - delta, now, key


def _parse_csv_env(name: str) -> list[str]:
    raw = os.environ.get(name, "") or ""
    return [part.strip() for part in raw.split(",") if part.strip()]


def _admin_exclusions(conn) -> dict[str, list[str]]:
    """Owner/test accounts to hide from admin metrics.

    Configure via env (comma-separated):
      ADMIN_EXCLUDE_EMAILS=you@example.com,alt@example.com
      ADMIN_EXCLUDE_CLERK_IDS=user_xxx,user_yyy
    Also auto-excludes *@thynkk.co staff addresses when present in users.
    """
    emails = {e.lower() for e in _parse_csv_env("ADMIN_EXCLUDE_EMAILS")}
    clerk_ids = set(_parse_csv_env("ADMIN_EXCLUDE_CLERK_IDS"))

    try:
        # Staff domain + any env-listed emails → resolve clerk ids
        if emails:
            rows = conn.execute(text("""
                SELECT clerk_id, LOWER(email)
                FROM users
                WHERE deleted_at IS NULL
                  AND (
                        LOWER(email) = ANY(:emails)
                     OR LOWER(email) LIKE '%@thynkk.co'
                  )
            """), {"emails": list(emails)}).fetchall()
        else:
            rows = conn.execute(text("""
                SELECT clerk_id, LOWER(email)
                FROM users
                WHERE deleted_at IS NULL
                  AND LOWER(email) LIKE '%@thynkk.co'
            """)).fetchall()
        for clerk_id, email in rows:
            if clerk_id:
                clerk_ids.add(clerk_id)
            if email:
                emails.add(email)
    except Exception:
        _recover(conn)

    # If env listed clerk ids without emails, keep them
    account_keys = [f"clerk:{cid}" for cid in clerk_ids if cid]
    return {
        "emails": sorted(emails),
        "clerk_ids": sorted(clerk_ids),
        "account_keys": sorted(account_keys),
    }


def _sql_not_in(column: str, values: list[str], prefix: str) -> tuple[str, dict[str, Any]]:
    """Build `column NOT IN (...)` with bound params. Empty values → always-true."""
    if not values:
        return "TRUE", {}
    placeholders: list[str] = []
    params: dict[str, Any] = {}
    for i, val in enumerate(values):
        key = f"{prefix}_{i}"
        placeholders.append(f":{key}")
        params[key] = val
    return f"{column} NOT IN ({', '.join(placeholders)})", params


def _scan_where(
    *,
    start: datetime | None,
    end: datetime | None,
    source: str | None,
    referral: str | None,
    country: str | None,
    device: str | None,
    browser: str | None,
    os_name: str | None,
    scan_type: str | None,
    exclude_clerk_ids: list[str] | None = None,
    alias: str = "",
) -> tuple[str, dict[str, Any]]:
    col = f"{alias}." if alias else ""
    clauses: list[str] = ["1=1"]
    params: dict[str, Any] = {}

    if start is not None:
        clauses.append(f"{col}created_at >= :f_start")
        params["f_start"] = start
    if end is not None:
        clauses.append(f"{col}created_at <= :f_end")
        params["f_end"] = end
    if source:
        clauses.append(f"LOWER({col}source) = LOWER(:f_source)")
        params["f_source"] = source
    if referral:
        clauses.append(f"LOWER({col}referrer) = LOWER(:f_referral)")
        params["f_referral"] = referral
    if country:
        clauses.append(f"UPPER({col}country) = UPPER(:f_country)")
        params["f_country"] = country
    if device:
        clauses.append(f"LOWER({col}device) = LOWER(:f_device)")
        params["f_device"] = device
    if browser:
        clauses.append(f"LOWER({col}browser) = LOWER(:f_browser)")
        params["f_browser"] = browser
    if os_name:
        clauses.append(f"LOWER({col}os) = LOWER(:f_os)")
        params["f_os"] = os_name
    if scan_type:
        clauses.append(f"LOWER({col}scan_type) = LOWER(:f_scan_type)")
        params["f_scan_type"] = scan_type
    if exclude_clerk_ids:
        # Keep anonymous/ip scans; drop owner-linked ones
        excl_sql, excl_params = _sql_not_in(f"{col}clerk_id", exclude_clerk_ids, "ex_clerk")
        clauses.append(f"({col}clerk_id IS NULL OR {excl_sql})")
        params.update(excl_params)

    return " AND ".join(clauses), params


def _named_counts(conn, sql: str, params: dict[str, Any], limit: int = 15) -> list[NamedCount]:
    try:
        rows = conn.execute(text(sql), params).fetchall()
        return [NamedCount(name=str(r[0] or "unknown"), count=int(r[1])) for r in rows[:limit]]
    except Exception:
        _recover(conn)
        return []


def _distinct_values(conn, column: str, start: datetime | None, end: datetime | None) -> list[str]:
    clauses = ["1=1"]
    params: dict[str, Any] = {}
    if start is not None:
        clauses.append("created_at >= :d_start")
        params["d_start"] = start
    if end is not None:
        clauses.append("created_at <= :d_end")
        params["d_end"] = end
    where = " AND ".join(clauses)
    try:
        rows = conn.execute(text(f"""
            SELECT DISTINCT {column} FROM scan_log
            WHERE {where} AND {column} IS NOT NULL AND {column} <> ''
            ORDER BY {column} ASC
            LIMIT 100
        """), params).fetchall()
        return [str(r[0]) for r in rows]
    except Exception:
        _recover(conn)
        return []


def _build_tech_health(engine: Engine) -> TechHealth:
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unavailable ({exc.__class__.__name__})"

    checks: list[TechCheck] = [
        TechCheck(
            name="Serper API",
            ok=bool(os.environ.get("SERPER_API_KEY", "").strip()),
            detail="Configured" if os.environ.get("SERPER_API_KEY") else "Missing SERPER_API_KEY",
        ),
        TechCheck(
            name="Anthropic API",
            ok=bool(os.environ.get("ANTHROPIC_API_KEY", "").strip()),
            detail="Configured" if os.environ.get("ANTHROPIC_API_KEY") else "Missing ANTHROPIC_API_KEY",
        ),
        TechCheck(
            name="Clerk auth",
            ok=bool(os.environ.get("CLERK_JWKS_URL", "").strip()),
            detail="Configured" if os.environ.get("CLERK_JWKS_URL") else "Missing CLERK_JWKS_URL",
        ),
        TechCheck(
            name="Clerk webhooks",
            ok=bool(os.environ.get("CLERK_WEBHOOK_SECRET", "").strip()),
            detail="Configured" if os.environ.get("CLERK_WEBHOOK_SECRET") else "Missing CLERK_WEBHOOK_SECRET",
        ),
        TechCheck(
            name="PayPal",
            ok=bool(os.environ.get("PAYPAL_CLIENT_ID", "").strip()),
            detail="Configured" if os.environ.get("PAYPAL_CLIENT_ID") else "Missing PAYPAL_CLIENT_ID",
        ),
        TechCheck(
            name="Brevo email",
            ok=bool(os.environ.get("BREVO_API_KEY", "").strip()),
            detail="Configured" if os.environ.get("BREVO_API_KEY") else "Missing BREVO_API_KEY",
        ),
        TechCheck(
            name="Admin secret",
            ok=bool(os.environ.get("ADMIN_SECRET", "").strip()),
            detail="Configured" if os.environ.get("ADMIN_SECRET") else "Missing ADMIN_SECRET",
        ),
    ]

    try:
        from app.api.reddit_health import run_reddit_json_health
        reddit = run_reddit_json_health()
        for check in reddit.checks:
            checks.append(TechCheck(
                name=f"Reddit {check.name}",
                ok=check.ok,
                detail=check.detail,
            ))
    except Exception as exc:
        checks.append(TechCheck(
            name="Reddit health",
            ok=False,
            detail=str(exc)[:120],
        ))

    return TechHealth(database=db_status, checks=checks)


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
def admin_stats(
    request: Request,
    engine: Engine = Depends(get_engine),
    _: None = Depends(_require_secret),
    range: str = Query(default="7d", alias="range"),
    date_from: str | None = Query(default=None, alias="from"),
    date_to: str | None = Query(default=None, alias="to"),
    source: str | None = Query(default=None),
    referral: str | None = Query(default=None),
    country: str | None = Query(default=None),
    device: str | None = Query(default=None),
    browser: str | None = Query(default=None),
    os: str | None = Query(default=None),
    scan_type: str | None = Query(default=None),
) -> AdminStats:
    _ensure_scan_log(engine)
    try:
        from app.saturation.leads import ensure_saturation_leads_table

        ensure_saturation_leads_table(engine)
    except Exception:
        pass

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    start, end, range_key = _resolve_date_range(range, date_from, date_to)
    source_f = (source or "").strip() or None
    referral_f = (referral or "").strip() or None
    country_f = (country or "").strip() or None
    device_f = (device or "").strip() or None
    browser_f = (browser or "").strip() or None
    os_f = (os or "").strip() or None
    scan_type_f = (scan_type or "").strip() or None

    with engine.connect() as conn:
        excl = _admin_exclusions(conn)
        excl_emails = excl["emails"]
        excl_clerks = excl["clerk_ids"]
        excl_keys = excl["account_keys"]

        user_excl_sql, user_excl_params = _sql_not_in("LOWER(email)", excl_emails, "ex_email")
        clerk_excl_sql, clerk_excl_params = _sql_not_in("clerk_id", excl_clerks, "ex_uid")
        # Combine: exclude if email OR clerk_id matches owner list
        if excl_emails or excl_clerks:
            user_not_owner = f"({user_excl_sql if excl_emails else 'TRUE'}) AND ({clerk_excl_sql if excl_clerks else 'TRUE'})"
            user_not_owner_params = {**user_excl_params, **clerk_excl_params}
        else:
            user_not_owner = "TRUE"
            user_not_owner_params = {}

        key_excl_sql, key_excl_params = _sql_not_in("account_key", excl_keys, "ex_key")

        where_sql, where_params = _scan_where(
            start=start,
            end=end,
            source=source_f,
            referral=referral_f,
            country=country_f,
            device=device_f,
            browser=browser_f,
            os_name=os_f,
            scan_type=scan_type_f,
            exclude_clerk_ids=excl_clerks,
        )

        # Lifetime scan counters (owner activity excluded)
        life_sql, life_params = _scan_where(exclude_clerk_ids=excl_clerks,
            start=None, end=None, source=None, referral=None, country=None,
            device=None, browser=None, os_name=None, scan_type=None)
        total_scans = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {life_sql}", life_params,
        )
        today_sql, today_params = _scan_where(
            start=today_start, end=None, source=None, referral=None, country=None,
            device=None, browser=None, os_name=None, scan_type=None,
            exclude_clerk_ids=excl_clerks,
        )
        scans_today = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {today_sql}", today_params,
        )
        week_sql, week_params = _scan_where(
            start=week_start, end=None, source=None, referral=None, country=None,
            device=None, browser=None, os_name=None, scan_type=None,
            exclude_clerk_ids=excl_clerks,
        )
        scans_week = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {week_sql}", week_params,
        )
        growth_sql, growth_params = _scan_where(
            start=None, end=None, source=None, referral=None, country=None,
            device=None, browser=None, os_name=None, scan_type="growth",
            exclude_clerk_ids=excl_clerks,
        )
        growth_scans = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {growth_sql}", growth_params,
        )
        pain_sql, pain_params = _scan_where(
            start=None, end=None, source=None, referral=None, country=None,
            device=None, browser=None, os_name=None, scan_type="pain",
            exclude_clerk_ids=excl_clerks,
        )
        pain_scans = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {pain_sql}", pain_params,
        )

        cache_hits = _safe_scalar(
            conn,
            f"SELECT COUNT(*) FROM scan_log WHERE {life_sql} AND from_cache = TRUE",
            life_params,
        )
        cache_hit_rate = int(cache_hits * 100 / total_scans) if total_scans else 0
        unique_ips = _safe_scalar(
            conn,
            f"SELECT COUNT(DISTINCT ip) FROM scan_log WHERE {life_sql}",
            life_params,
        )

        # Filtered scan metrics
        filtered_scans = _safe_scalar(
            conn, f"SELECT COUNT(*) FROM scan_log WHERE {where_sql}", where_params,
        )
        filtered_unique_ips = _safe_scalar(
            conn, f"SELECT COUNT(DISTINCT ip) FROM scan_log WHERE {where_sql}", where_params,
        )
        total_users = signups_today = signups_week = 0
        users_with_scans = free_scans_used = users_with_credits = 0
        filtered_signups = 0
        try:
            total_users = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND {user_not_owner}",
                user_not_owner_params,
            )
            signups_today = _safe_scalar(
                conn,
                f"""
                SELECT COUNT(*) FROM users
                WHERE deleted_at IS NULL AND created_at >= :d AND {user_not_owner}
                """,
                {**user_not_owner_params, "d": today_start},
            )
            signups_week = _safe_scalar(
                conn,
                f"""
                SELECT COUNT(*) FROM users
                WHERE deleted_at IS NULL AND created_at >= :d AND {user_not_owner}
                """,
                {**user_not_owner_params, "d": week_start},
            )
            users_with_scans = _safe_scalar(
                conn,
                f"""
                SELECT COUNT(DISTINCT account_key) FROM growth_user_scans
                WHERE account_key LIKE 'clerk:%' AND {key_excl_sql}
                """,
                key_excl_params,
            )
            free_scans_used = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM scan_quotas WHERE free_scan_used = TRUE AND {key_excl_sql}",
                key_excl_params,
            )
            users_with_credits = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM scan_quotas WHERE scan_credits > 0 AND {key_excl_sql}",
                key_excl_params,
            )
            signup_clauses = [f"deleted_at IS NULL AND {user_not_owner}"]
            signup_params: dict[str, Any] = {**user_not_owner_params}
            if start is not None:
                signup_clauses.append("created_at >= :s_start")
                signup_params["s_start"] = start
            if end is not None:
                signup_clauses.append("created_at <= :s_end")
                signup_params["s_end"] = end
            filtered_signups = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM users WHERE {' AND '.join(signup_clauses)}",
                signup_params,
            )
        except Exception:
            _recover(conn)

        pack_purchases = pack_revenue = 0.0
        filtered_purchases = 0
        filtered_revenue = 0.0
        try:
            if _table_exists(conn, "paypal_orders"):
                pay_excl_sql, pay_excl_params = _sql_not_in(
                    "clerk_id", excl_clerks, "px_uid",
                )
                pay_owner = (
                    f"(clerk_id IS NULL OR {pay_excl_sql})" if excl_clerks else "TRUE"
                )
                pack_purchases = _safe_scalar(
                    conn,
                    f"SELECT COUNT(*) FROM paypal_orders WHERE {pay_owner}",
                    pay_excl_params,
                )
                rev_row = conn.execute(text(f"""
                    SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0)
                    FROM paypal_orders WHERE {pay_owner}
                """), pay_excl_params).fetchone()
                pack_revenue = float(rev_row[0]) if rev_row else 0.0

                purchase_clauses = [pay_owner]
                purchase_params: dict[str, Any] = {**pay_excl_params}
                if start is not None:
                    purchase_clauses.append("created_at >= :p_start")
                    purchase_params["p_start"] = start
                if end is not None:
                    purchase_clauses.append("created_at <= :p_end")
                    purchase_params["p_end"] = end
                purchase_where = " AND ".join(purchase_clauses)
                filtered_purchases = _safe_scalar(
                    conn,
                    f"SELECT COUNT(*) FROM paypal_orders WHERE {purchase_where}",
                    purchase_params,
                )
                frev = conn.execute(text(f"""
                    SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0)
                    FROM paypal_orders WHERE {purchase_where}
                """), purchase_params).fetchone()
                filtered_revenue = float(frev[0]) if frev else 0.0
        except Exception:
            _recover(conn)

        waitlist_total = 0
        waitlist_sources: list[SourceCount] = []
        try:
            wl_email_sql, wl_email_params = _sql_not_in(
                "LOWER(email)", excl_emails, "wl_email",
            )
            wl_owner = wl_email_sql if excl_emails else "TRUE"
            waitlist_total = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM waitlist WHERE {wl_owner}",
                wl_email_params,
            )
            wl_clauses = [wl_owner]
            wl_params: dict[str, Any] = {**wl_email_params}
            if start is not None:
                wl_clauses.append("created_at >= :w_start")
                wl_params["w_start"] = start
            if end is not None:
                wl_clauses.append("created_at <= :w_end")
                wl_params["w_end"] = end
            wl_where = " AND ".join(wl_clauses)
            wl_rows = conn.execute(text(f"""
                SELECT source, COUNT(*) AS cnt FROM waitlist
                WHERE {wl_where}
                GROUP BY source ORDER BY cnt DESC LIMIT 10
            """), wl_params).fetchall()
            waitlist_sources = [SourceCount(source=r[0], count=r[1]) for r in wl_rows]
        except Exception:
            _recover(conn)

        # ── Saturation leads ───────────────────────────────────────────────
        saturation_total = 0
        saturation_today = 0
        saturation_this_week = 0
        saturation_in_period = 0
        saturation_unique_emails = 0
        saturation_avg_score = 0.0
        saturation_by_decision: list[NamedCount] = []
        saturation_top_ideas: list[NamedCount] = []
        recent_saturation_leads: list[SaturationLeadRow] = []
        try:
            sat_email_sql, sat_email_params = _sql_not_in(
                "LOWER(email)", excl_emails, "sat_email",
            )
            sat_owner = sat_email_sql if excl_emails else "TRUE"

            saturation_total = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM saturation_leads WHERE {sat_owner}",
                sat_email_params,
            )
            sat_today_params = {**sat_email_params, "sat_today": today_start}
            saturation_today = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM saturation_leads WHERE {sat_owner} AND created_at >= :sat_today",
                sat_today_params,
            )
            sat_week_params = {**sat_email_params, "sat_week": week_start}
            saturation_this_week = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM saturation_leads WHERE {sat_owner} AND created_at >= :sat_week",
                sat_week_params,
            )

            sat_period_clauses = [sat_owner]
            sat_period_params: dict[str, Any] = {**sat_email_params}
            if start is not None:
                sat_period_clauses.append("created_at >= :sat_start")
                sat_period_params["sat_start"] = start
            if end is not None:
                sat_period_clauses.append("created_at <= :sat_end")
                sat_period_params["sat_end"] = end
            sat_period_where = " AND ".join(sat_period_clauses)

            saturation_in_period = _safe_scalar(
                conn,
                f"SELECT COUNT(*) FROM saturation_leads WHERE {sat_period_where}",
                sat_period_params,
            )
            saturation_unique_emails = _safe_scalar(
                conn,
                f"SELECT COUNT(DISTINCT LOWER(email)) FROM saturation_leads WHERE {sat_period_where}",
                sat_period_params,
            )
            avg_row = conn.execute(
                text(
                    f"""
                    SELECT COALESCE(AVG(score), 0)
                    FROM saturation_leads
                    WHERE {sat_period_where} AND score IS NOT NULL
                    """
                ),
                sat_period_params,
            ).fetchone()
            saturation_avg_score = round(float(avg_row[0]), 1) if avg_row else 0.0

            dec_rows = conn.execute(
                text(
                    f"""
                    SELECT COALESCE(NULLIF(decision, ''), 'unknown') AS d, COUNT(*) AS cnt
                    FROM saturation_leads
                    WHERE {sat_period_where}
                    GROUP BY 1
                    ORDER BY cnt DESC
                    """
                ),
                sat_period_params,
            ).fetchall()
            saturation_by_decision = [
                NamedCount(name=str(r[0]), count=int(r[1])) for r in dec_rows
            ]

            idea_rows = conn.execute(
                text(
                    f"""
                    SELECT idea, COUNT(*) AS cnt
                    FROM saturation_leads
                    WHERE {sat_period_where}
                    GROUP BY idea
                    ORDER BY cnt DESC
                    LIMIT 15
                    """
                ),
                sat_period_params,
            ).fetchall()
            saturation_top_ideas = [
                NamedCount(name=str(r[0])[:120], count=int(r[1])) for r in idea_rows
            ]

            lead_rows = conn.execute(
                text(
                    f"""
                    SELECT id, email, idea, score, decision, data_mode, created_at
                    FROM saturation_leads
                    WHERE {sat_period_where}
                    ORDER BY created_at DESC
                    LIMIT 50
                    """
                ),
                sat_period_params,
            ).fetchall()
            recent_saturation_leads = [
                SaturationLeadRow(
                    id=int(r[0]),
                    email=str(r[1] or ""),
                    idea=str(r[2] or "")[:200],
                    score=int(r[3]) if r[3] is not None else None,
                    decision=str(r[4]) if r[4] else None,
                    data_mode=str(r[5]) if r[5] else None,
                    created_at=r[6],
                )
                for r in lead_rows
            ]
        except Exception:
            _recover(conn)

        top_urls: list[UrlCount] = []
        try:
            top_url_rows = conn.execute(text(f"""
                SELECT query, COUNT(*) AS cnt FROM scan_log
                WHERE {where_sql} AND scan_type = 'growth'
                GROUP BY query ORDER BY cnt DESC LIMIT 10
            """), where_params).fetchall()
            top_urls = [UrlCount(url=r[0], count=r[1]) for r in top_url_rows]
        except Exception:
            _recover(conn)

        tier_breakdown: dict[str, int] = {"free": 0, "full": 0, "unknown": 0}
        try:
            tier_rows = conn.execute(text("""
                SELECT COALESCE(tier, 'unknown'), COUNT(*)
                FROM growth_user_scans
                GROUP BY COALESCE(tier, 'unknown')
            """)).fetchall()
            for tier, cnt in tier_rows:
                tier_breakdown[str(tier)] = int(cnt)
        except Exception:
            _recover(conn)

        by_source = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(source, ''), 'direct'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 15
        """, where_params)
        by_referral = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(referrer, ''), 'direct'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 15
        """, where_params)
        by_country = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(country, ''), 'unknown'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 15
        """, where_params)
        by_device = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(device, ''), 'unknown'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10
        """, where_params)
        by_browser = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(browser, ''), 'unknown'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10
        """, where_params)
        by_os = _named_counts(conn, f"""
            SELECT COALESCE(NULLIF(os, ''), 'unknown'), COUNT(*)
            FROM scan_log WHERE {where_sql}
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10
        """, where_params)

        # Daily series for the filtered window (cap 90 days of buckets)
        day_start = start
        day_end = end or now
        if day_start is None:
            day_start = day_end - timedelta(days=29)
        span_days = max(1, min(90, (day_end.date() - day_start.date()).days + 1))
        series_start = day_end - timedelta(days=span_days - 1)

        by_day: list[DayCount] = []
        try:
            # Dimension filters only — series_start/end own the chart window
            series_where_sql, series_where_params = _scan_where(
                start=None,
                end=None,
                source=source_f,
                referral=referral_f,
                country=country_f,
                device=device_f,
                browser=browser_f,
                os_name=os_f,
                scan_type=scan_type_f,
                exclude_clerk_ids=excl_clerks,
            )
            series_params = {
                **series_where_params,
                "series_start": series_start,
                "series_end": day_end,
            }
            scan_day_rows = conn.execute(text(f"""
                SELECT DATE(created_at AT TIME ZONE 'UTC') AS d, COUNT(*)
                FROM scan_log
                WHERE {series_where_sql}
                  AND created_at >= :series_start AND created_at <= :series_end
                GROUP BY 1 ORDER BY 1
            """), series_params).fetchall()
            scan_by_day = {str(r[0]): int(r[1]) for r in scan_day_rows}

            signup_by_day: dict[str, int] = {}
            try:
                su_rows = conn.execute(text(f"""
                    SELECT DATE(created_at AT TIME ZONE 'UTC') AS d, COUNT(*)
                    FROM users
                    WHERE deleted_at IS NULL
                      AND created_at >= :series_start AND created_at <= :series_end
                      AND {user_not_owner}
                    GROUP BY 1
                """), {
                    **user_not_owner_params,
                    "series_start": series_start,
                    "series_end": day_end,
                }).fetchall()
                signup_by_day = {str(r[0]): int(r[1]) for r in su_rows}
            except Exception:
                _recover(conn)

            purchase_by_day: dict[str, int] = {}
            try:
                if _table_exists(conn, "paypal_orders"):
                    pay_clerk_sql, pay_clerk_params = _sql_not_in(
                        "clerk_id", excl_clerks, "ex_pay",
                    )
                    pay_owner = (
                        f"(clerk_id IS NULL OR {pay_clerk_sql})" if excl_clerks else "TRUE"
                    )
                    pu_rows = conn.execute(text(f"""
                        SELECT DATE(created_at AT TIME ZONE 'UTC') AS d, COUNT(*)
                        FROM paypal_orders
                        WHERE created_at >= :series_start AND created_at <= :series_end
                          AND {pay_owner}
                        GROUP BY 1
                    """), {
                        **pay_clerk_params,
                        "series_start": series_start,
                        "series_end": day_end,
                    }).fetchall()
                    purchase_by_day = {str(r[0]): int(r[1]) for r in pu_rows}
            except Exception:
                _recover(conn)

            for i in range(span_days):
                d = (series_start + timedelta(days=i)).date().isoformat()
                by_day.append(DayCount(
                    date=d,
                    scans=scan_by_day.get(d, 0),
                    signups=signup_by_day.get(d, 0),
                    purchases=purchase_by_day.get(d, 0),
                ))
        except Exception:
            _recover(conn)
            by_day = []

        filter_options = FilterOptions(
            sources=_distinct_values(conn, "source", start, end) or [c.name for c in by_source],
            referrers=_distinct_values(conn, "referrer", start, end) or [c.name for c in by_referral],
            countries=_distinct_values(conn, "country", start, end) or [c.name for c in by_country],
            devices=_distinct_values(conn, "device", start, end) or [c.name for c in by_device],
            browsers=_distinct_values(conn, "browser", start, end) or [c.name for c in by_browser],
            operating_systems=_distinct_values(conn, "os", start, end) or [c.name for c in by_os],
            scan_types=_distinct_values(conn, "scan_type", None, None) or ["growth", "pain"],
        )

        recent_users: list[UserRow] = []
        try:
            # Re-bind user exclusion with u. prefix
            u_email_sql, u_email_params = _sql_not_in("LOWER(u.email)", excl_emails, "ru_email")
            u_clerk_sql, u_clerk_params = _sql_not_in("u.clerk_id", excl_clerks, "ru_uid")
            if excl_emails or excl_clerks:
                ru_not_owner = (
                    f"({u_email_sql if excl_emails else 'TRUE'}) "
                    f"AND ({u_clerk_sql if excl_clerks else 'TRUE'})"
                )
                ru_params = {**u_email_params, **u_clerk_params}
            else:
                ru_not_owner = "TRUE"
                ru_params = {}

            user_rows = conn.execute(text(f"""
                SELECT
                    u.email,
                    u.clerk_id,
                    u.created_at,
                    COALESCE(q.scan_credits, 0),
                    COALESCE(q.free_scan_used, FALSE),
                    (
                        SELECT COUNT(*)::int FROM growth_user_scans g
                        WHERE g.account_key = 'clerk:' || u.clerk_id
                    ),
                    EXISTS (
                        SELECT 1 FROM paypal_orders p WHERE p.clerk_id = u.clerk_id
                    )
                FROM users u
                LEFT JOIN scan_quotas q ON q.account_key = 'clerk:' || u.clerk_id
                WHERE u.deleted_at IS NULL AND {ru_not_owner}
                ORDER BY u.created_at DESC
                LIMIT 15
            """), ru_params).fetchall()
            recent_users = [
                UserRow(
                    email=_mask_email(r[0]),
                    clerk_id=_mask_clerk_id(r[1]),
                    created_at=r[2],
                    scan_credits=int(r[3]),
                    free_scan_used=bool(r[4]),
                    growth_scans=int(r[5]),
                    purchased=bool(r[6]),
                )
                for r in user_rows
            ]
        except Exception:
            _recover(conn)

        recent_purchases: list[PurchaseRow] = []
        try:
            if _table_exists(conn, "paypal_orders"):
                rp_clerk_sql, rp_clerk_params = _sql_not_in(
                    "clerk_id", excl_clerks, "rp_uid",
                )
                rp_owner = (
                    f"(clerk_id IS NULL OR {rp_clerk_sql})" if excl_clerks else "TRUE"
                )
                purchase_rows = conn.execute(text(f"""
                    SELECT order_id, clerk_id, amount, currency, credits_granted, created_at
                    FROM paypal_orders
                    WHERE {rp_owner}
                    ORDER BY created_at DESC LIMIT 10
                """), rp_clerk_params).fetchall()
                recent_purchases = [
                    PurchaseRow(
                        order_id=r[0],
                        clerk_id=_mask_clerk_id(r[1]),
                        amount=r[2],
                        currency=r[3],
                        credits_granted=int(r[4]),
                        created_at=r[5],
                    )
                    for r in purchase_rows
                ]
        except Exception:
            _recover(conn)

        email_by_clerk: dict[str, str] = {}
        try:
            email_rows = conn.execute(text(f"""
                SELECT clerk_id, email FROM users
                WHERE deleted_at IS NULL AND {user_not_owner}
            """), user_not_owner_params).fetchall()
            email_by_clerk = {r[0]: _mask_email(r[1]) for r in email_rows}
        except Exception:
            _recover(conn)

        recent_scans: list[ScanLogEntry] = []
        try:
            recent_rows = conn.execute(text(f"""
                SELECT id, ip, query, from_cache, status, themes_count,
                       scan_type, clerk_id, tier, created_at,
                       referrer, source, medium, campaign, country, device, browser, os
                FROM scan_log
                WHERE {where_sql}
                ORDER BY created_at DESC LIMIT 50
            """), where_params).fetchall()
            recent_scans = [
                ScanLogEntry(
                    id=r[0],
                    ip=r[1],
                    query=r[2],
                    from_cache=r[3],
                    status=r[4],
                    themes_count=r[5],
                    scan_type=r[6] or "growth",
                    clerk_id=r[7],
                    tier=r[8],
                    user_email=email_by_clerk.get(r[7]) if r[7] else None,
                    created_at=r[9],
                    referrer=r[10] or "direct",
                    source=r[11] or "direct",
                    medium=r[12] or "none",
                    campaign=r[13] or "",
                    country=r[14] or "unknown",
                    device=r[15] or "unknown",
                    browser=r[16] or "unknown",
                    os=r[17] or "unknown",
                )
                for r in recent_rows
            ]
        except Exception:
            _recover(conn)
            # Fallback without attribution columns (older DBs mid-migrate)
            try:
                recent_rows = conn.execute(text(f"""
                    SELECT id, ip, query, from_cache, status, themes_count,
                           scan_type, clerk_id, tier, created_at
                    FROM scan_log
                    WHERE {where_sql}
                    ORDER BY created_at DESC LIMIT 50
                """), where_params).fetchall()
                recent_scans = [
                    ScanLogEntry(
                        id=r[0],
                        ip=r[1],
                        query=r[2],
                        from_cache=r[3],
                        status=r[4],
                        themes_count=r[5],
                        scan_type=r[6] or "growth",
                        clerk_id=r[7],
                        tier=r[8],
                        user_email=email_by_clerk.get(r[7]) if r[7] else None,
                        created_at=r[9],
                        referrer="direct",
                        source="direct",
                        medium="none",
                        campaign="",
                        country="unknown",
                        device="unknown",
                        browser="unknown",
                        os="unknown",
                    )
                    for r in recent_rows
                ]
            except Exception:
                _recover(conn)

    applied = AppliedFilters(
        range=range_key,
        date_from=start,
        date_to=end,
        source=source_f,
        referral=referral_f,
        country=country_f,
        device=device_f,
        browser=browser_f,
        os=os_f,
        scan_type=scan_type_f,
    )

    return AdminStats(
        total_scans=total_scans,
        scans_today=scans_today,
        scans_this_week=scans_week,
        growth_scans=growth_scans,
        pain_scans=pain_scans,
        cache_hit_rate_pct=cache_hit_rate,
        total_unique_ips=unique_ips,
        total_users=total_users,
        signups_today=signups_today,
        signups_this_week=signups_week,
        users_with_scans=users_with_scans,
        free_scans_used=free_scans_used,
        users_with_credits=users_with_credits,
        pack_purchases=pack_purchases,
        pack_revenue_usd=round(pack_revenue, 2),
        waitlist_total=waitlist_total,
        waitlist_sources=waitlist_sources,
        top_urls=top_urls,
        tier_breakdown=tier_breakdown,
        saturation_total=saturation_total,
        saturation_today=saturation_today,
        saturation_this_week=saturation_this_week,
        saturation_in_period=saturation_in_period,
        saturation_unique_emails=saturation_unique_emails,
        saturation_avg_score=saturation_avg_score,
        saturation_by_decision=saturation_by_decision,
        saturation_top_ideas=saturation_top_ideas,
        recent_saturation_leads=recent_saturation_leads,
        filtered_scans=filtered_scans,
        filtered_unique_ips=filtered_unique_ips,
        filtered_signups=filtered_signups,
        filtered_purchases=filtered_purchases,
        filtered_revenue_usd=round(filtered_revenue, 2),
        by_source=by_source,
        by_referral=by_referral,
        by_country=by_country,
        by_device=by_device,
        by_browser=by_browser,
        by_os=by_os,
        by_day=by_day,
        filter_options=filter_options,
        applied_filters=applied,
        tech=_build_tech_health(engine),
        recent_users=recent_users,
        recent_purchases=recent_purchases,
        recent_scans=recent_scans,
    )
