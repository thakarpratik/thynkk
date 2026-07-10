"""Waitlist — email capture with position and public stats."""

from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.email_guard import check_email_domain
from app.email import send_waitlist_admitted_async, send_waitlist_joined_async

router = APIRouter(prefix="/waitlist", tags=["waitlist"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Synthetic growth starts here so public counters keep drifting over time
_WAITLIST_EPOCH = datetime(2026, 6, 1, tzinfo=timezone.utc)


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def _seed_count() -> int:
    raw = os.environ.get("WAITLIST_SEED_COUNT", "1180")
    try:
        return max(0, int(raw))
    except ValueError:
        return 1180


def _invites_seed() -> int:
    raw = os.environ.get("WAITLIST_INVITES_WEEK_SEED", "312")
    try:
        return max(0, int(raw))
    except ValueError:
        return 312


def _bucket_noise(key: str, *, period_seconds: int, amplitude: int) -> int:
    """Deterministic 0..amplitude value that changes every period_seconds."""
    if amplitude <= 0:
        return 0
    bucket = int(datetime.now(timezone.utc).timestamp()) // max(1, period_seconds)
    digest = hashlib.sha256(f"{key}:{bucket}".encode()).hexdigest()
    return int(digest[:8], 16) % (amplitude + 1)


def _display_waitlist_count(real_signups: int) -> int:
    """Seed + real joins + slow synthetic growth + short-period drift."""
    now = datetime.now(timezone.utc)
    hours = max(0.0, (now - _WAITLIST_EPOCH).total_seconds() / 3600.0)
    # ~1.4 synthetic joins/hour so the counter keeps climbing
    synthetic = int(hours * 1.4)
    # Nudges every ~90s so the number visibly changes on a live page
    drift = _bucket_noise("waitlist_count", period_seconds=90, amplitude=9)
    return _seed_count() + real_signups + synthetic + drift


def _display_invites_this_week(real_invited: int) -> int:
    """Weekly admits that rise through the week and twitch during the day."""
    now = datetime.now(timezone.utc)
    weekday = now.weekday()  # 0=Mon
    hours_today = now.hour + now.minute / 60.0
    # ~42 synthetic admits/day + ~1.8/hour today
    synthetic = int(weekday * 42 + hours_today * 1.8)
    drift = _bucket_noise("invites_week", period_seconds=75, amplitude=6)
    return _invites_seed() + real_invited + synthetic + drift


def _spots_left_today() -> int:
    """Daily capacity that shrinks as the day progresses (scarcity cue)."""
    now = datetime.now(timezone.utc)
    day_key = now.date().isoformat()
    # 16–40 spots capacity for the day (stable within a day)
    capacity = 16 + _bucket_noise(f"spots_cap:{day_key}", period_seconds=86_400, amplitude=24)
    day_progress = (now.hour * 60 + now.minute) / (24 * 60)
    used = int(capacity * min(0.92, day_progress * 0.95))
    # Small live jitter every ~45s
    jitter = _bucket_noise("spots_left", period_seconds=45, amplitude=3)
    return max(2, capacity - used - jitter)


def ensure_waitlist_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS waitlist (
                id          BIGSERIAL PRIMARY KEY,
                email       TEXT NOT NULL UNIQUE,
                source      TEXT NOT NULL DEFAULT 'homepage',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                invited_at  TIMESTAMPTZ
            )
        """))


def _position_for_email(engine: Engine, email: str) -> int:
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT position FROM (
                    SELECT email,
                           ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS position
                    FROM waitlist
                ) ranked
                WHERE email = :email
            """),
            {"email": email},
        ).fetchone()
    return int(row[0]) if row else 0


def _total_signups(engine: Engine) -> int:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT COUNT(*) FROM waitlist")).fetchone()
    return int(row[0]) if row else 0


def _invites_this_week(engine: Engine) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT COUNT(*) FROM waitlist WHERE invited_at IS NOT NULL AND invited_at >= :cutoff"),
            {"cutoff": cutoff},
        ).fetchone()
    return int(row[0]) if row else 0


class WaitlistJoinRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    source: str = Field(default="homepage", max_length=64)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Invalid email address.")
        return email


class WaitlistJoinResponse(BaseModel):
    email: str
    position: int
    display_count: int
    already_joined: bool
    message: str


class WaitlistAdmitRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = v.strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Invalid email address.")
        return email


class WaitlistAdmitResponse(BaseModel):
    email: str
    admitted: bool


class WaitlistStatsResponse(BaseModel):
    display_count: int
    signups: int
    invites_sent_this_week: int
    spots_left_today: int
    next_batch_label: str


@router.get("/stats", response_model=WaitlistStatsResponse)
def waitlist_stats(engine: Engine = Depends(get_engine)) -> WaitlistStatsResponse:
    ensure_waitlist_table(engine)
    signups = _total_signups(engine)
    invited = _invites_this_week(engine)

    batch = os.environ.get("WAITLIST_NEXT_BATCH_LABEL", "Thursday")

    return WaitlistStatsResponse(
        display_count=_display_waitlist_count(signups),
        signups=signups,
        invites_sent_this_week=_display_invites_this_week(invited),
        spots_left_today=_spots_left_today(),
        next_batch_label=batch,
    )


@router.post("", response_model=WaitlistJoinResponse, status_code=201)
def join_waitlist(
    body: WaitlistJoinRequest,
    engine: Engine = Depends(get_engine),
) -> WaitlistJoinResponse:
    check_email_domain(body.email)
    ensure_waitlist_table(engine)

    existing = False
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT email FROM waitlist WHERE email = :email"),
            {"email": body.email},
        ).fetchone()

        if row:
            existing = True
        else:
            try:
                conn.execute(
                    text("""
                        INSERT INTO waitlist (email, source)
                        VALUES (:email, :source)
                    """),
                    {"email": body.email, "source": body.source},
                )
            except Exception as exc:
                if "unique" in str(exc).lower():
                    existing = True
                else:
                    raise

    position = _position_for_email(engine, body.email)
    display_count = _display_waitlist_count(_total_signups(engine))

    if existing:
        return WaitlistJoinResponse(
            email=body.email,
            position=position,
            display_count=display_count,
            already_joined=True,
            message="You're already on the list. We'll email you when your invite is ready.",
        )

    send_waitlist_joined_async(body.email, position)

    return WaitlistJoinResponse(
        email=body.email,
        position=position,
        display_count=display_count,
        already_joined=False,
        message="You're on the list.",
    )


@router.post("/admit", response_model=WaitlistAdmitResponse)
def admit_waitlist(
    body: WaitlistAdmitRequest,
    engine: Engine = Depends(get_engine),
) -> WaitlistAdmitResponse:
    ensure_waitlist_table(engine)
    now = datetime.now(timezone.utc)
    first_admit = False
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT invited_at FROM waitlist WHERE email = :email"),
            {"email": body.email},
        ).fetchone()
        if not row:
            return WaitlistAdmitResponse(email=body.email, admitted=False)
        if row[0] is None:
            first_admit = True
            conn.execute(
                text("UPDATE waitlist SET invited_at = :now WHERE email = :email"),
                {"now": now, "email": body.email},
            )

    if first_admit:
        send_waitlist_admitted_async(body.email)

    return WaitlistAdmitResponse(email=body.email, admitted=True)