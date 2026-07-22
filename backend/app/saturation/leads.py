"""Persist saturation lead emails (best-effort; scoring still works if DB is down)."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

_TABLE_READY = False


def ensure_saturation_leads_table(engine: Engine) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS saturation_leads (
                    id          BIGSERIAL PRIMARY KEY,
                    email       TEXT NOT NULL,
                    idea        TEXT NOT NULL,
                    score       INTEGER,
                    decision    TEXT,
                    data_mode   TEXT,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_saturation_leads_email
                ON saturation_leads (email)
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS idx_saturation_leads_created
                ON saturation_leads (created_at DESC)
                """
            )
        )
    _TABLE_READY = True


def record_saturation_lead(
    engine: Engine,
    *,
    email: str,
    idea: str,
    score: int | None = None,
    decision: str | None = None,
    data_mode: str | None = None,
) -> None:
    """Insert a lead row. Swallows DB errors so scoring never fails on storage."""
    try:
        ensure_saturation_leads_table(engine)
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO saturation_leads (email, idea, score, decision, data_mode)
                    VALUES (:email, :idea, :score, :decision, :data_mode)
                    """
                ),
                {
                    "email": email[:254],
                    "idea": idea[:200],
                    "score": score,
                    "decision": (decision or "")[:32] or None,
                    "data_mode": (data_mode or "")[:32] or None,
                },
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("saturation lead save failed: %s", exc)


def lead_payload(
    email: str,
    idea: str,
    report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "email": email,
        "idea": idea,
        "score": report.get("score") if report else None,
        "decision": report.get("decision") if report else None,
        "data_mode": report.get("data_mode") if report else None,
    }
