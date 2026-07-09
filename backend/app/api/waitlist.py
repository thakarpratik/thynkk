"""Waitlist — email capture with position and public stats."""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.email_guard import check_email_domain

router = APIRouter(prefix="/waitlist", tags=["waitlist"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
    next_batch_label: str


@router.get("/stats", response_model=WaitlistStatsResponse)
def waitlist_stats(engine: Engine = Depends(get_engine)) -> WaitlistStatsResponse:
    ensure_waitlist_table(engine)
    signups = _total_signups(engine)
    invited = _invites_this_week(engine)
    invites_display = _invites_seed() + invited

    batch = os.environ.get("WAITLIST_NEXT_BATCH_LABEL", "Thursday")

    return WaitlistStatsResponse(
        display_count=_seed_count() + signups,
        signups=signups,
        invites_sent_this_week=invites_display,
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
    display_count = _seed_count() + _total_signups(engine)

    if existing:
        return WaitlistJoinResponse(
            email=body.email,
            position=position,
            display_count=display_count,
            already_joined=True,
            message="You're already on the list. We'll email you when your invite is ready.",
        )

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
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT invited_at FROM waitlist WHERE email = :email"),
            {"email": body.email},
        ).fetchone()
        if not row:
            return WaitlistAdmitResponse(email=body.email, admitted=False)
        if row[0] is None:
            conn.execute(
                text("UPDATE waitlist SET invited_at = :now WHERE email = :email"),
                {"now": now, "email": body.email},
            )
    return WaitlistAdmitResponse(email=body.email, admitted=True)