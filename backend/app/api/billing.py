"""PayPal subscription billing — activate, status, webhooks."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.clerk_auth import ClerkId
from app.api.paypal_client import subscription_is_active
from app.api.quota import sync_paid_status
from app.api.users import ensure_users_table, set_user_paid, user_is_paid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

FREE_THEME_LIMIT = 3
FREE_RADAR_LIMIT = 3
FREE_GROWTH_THREAD_LIMIT = 3
FREE_GROWTH_POST_IDEA_LIMIT = 1


def _demand_label(score: float) -> str:
    if score >= 80:
        return "High"
    if score >= 50:
        return "Medium"
    return "Low"


def _severity_label(score: int) -> str:
    if score >= 8:
        return "High"
    if score >= 5:
        return "Medium"
    return "Low"


def gate_theme_for_plan(theme: dict, is_paid: bool) -> dict:
    """Strip actionable fields from a single theme for free users."""
    if is_paid:
        return theme

    demand = float(theme.get("demand_score", 0))
    severity = int(theme.get("severity_score", 0))
    quotes = theme.get("quotes", [])[:1]

    return {
        **theme,
        "demand_score": 0,
        "severity_score": 0,
        "demand_label": _demand_label(demand),
        "severity_label": _severity_label(severity),
        "opportunity": "",
        "willingness_to_pay": "",
        "willingness_reason": "",
        "competition": "",
        "next_step": "",
        "quotes": quotes,
        "locked": True,
    }


def gate_themes_for_plan(themes: list, is_paid: bool) -> list:
    visible = themes if is_paid else themes[:FREE_THEME_LIMIT]
    return [gate_theme_for_plan(t, is_paid) for t in visible]


def gate_growth_report(report: dict, is_paid: bool) -> dict:
    """Gate growth scan results for free users."""
    threads = report.get("threads", [])
    post_ideas = report.get("post_ideas", [])
    total_threads = len(threads)
    total_post_ideas = len(post_ideas)

    if is_paid:
        return {
            **report,
            "threads": threads,
            "post_ideas": post_ideas,
            "total_threads": total_threads,
            "total_post_ideas": total_post_ideas,
        }

    gated_threads = []
    for i, t in enumerate(threads[:FREE_GROWTH_THREAD_LIMIT]):
        reply = t.get("suggested_reply", "")
        teaser = reply[:120] + ("…" if len(reply) > 120 else "")
        gated_threads.append({
            **t,
            "suggested_reply": teaser,
            "locked": True,
        })

    gated_posts = []
    for i, p in enumerate(post_ideas[:FREE_GROWTH_POST_IDEA_LIMIT]):
        gated_posts.append({
            **p,
            "outline": p.get("outline", [])[:1],
            "locked": True,
        })

    return {
        **report,
        "threads": gated_threads,
        "post_ideas": gated_posts,
        "total_threads": total_threads,
        "total_post_ideas": total_post_ideas,
    }


def gate_radar_niches(niches: list, is_paid: bool) -> list:
    if is_paid:
        return niches
    gated = []
    for niche in niches[:FREE_RADAR_LIMIT]:
        gated.append({
            **niche,
            "growth_pct": 0,
            "locked": True,
        })
    return gated


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


class BillingStatus(BaseModel):
    is_paid: bool
    subscription_id: str | None = None
    subscription_status: str | None = None


class ActivateRequest(BaseModel):
    subscription_id: str


class ActivateResponse(BaseModel):
    is_paid: bool
    subscription_id: str


@router.get("/status", response_model=BillingStatus)
def billing_status(
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> BillingStatus:
    ensure_users_table(engine)
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT is_paid, paypal_subscription_id, subscription_status
                FROM users
                WHERE clerk_id = :clerk_id AND deleted_at IS NULL
            """),
            {"clerk_id": clerk_id},
        ).fetchone()

    if row is None:
        return BillingStatus(is_paid=False)

    return BillingStatus(
        is_paid=bool(row[0]),
        subscription_id=row[1],
        subscription_status=row[2],
    )


@router.post("/paypal/activate", response_model=ActivateResponse)
def activate_paypal_subscription(
    body: ActivateRequest,
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> ActivateResponse:
    subscription_id = body.subscription_id.strip()
    if not subscription_id:
        raise HTTPException(status_code=400, detail="subscription_id is required")

    try:
        sub = subscription_is_active(subscription_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("PayPal verification failed")
        raise HTTPException(status_code=502, detail="Could not verify PayPal subscription") from exc

    ensure_users_table(engine)
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM users WHERE clerk_id = :clerk_id AND deleted_at IS NULL"),
            {"clerk_id": clerk_id},
        ).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail="User not found. Sign out and sign in again.")

    set_user_paid(
        engine,
        clerk_id,
        is_paid=True,
        subscription_id=subscription_id,
        status=sub.get("status"),
    )
    sync_paid_status(engine, clerk_id, True)
    logger.info("Activated PayPal subscription %s for clerk_id=%s", subscription_id, clerk_id)
    return ActivateResponse(is_paid=True, subscription_id=subscription_id)


@router.post("/paypal/webhook")
async def paypal_webhook(request: Request, engine: Engine = Depends(get_engine)) -> dict:
    body = await request.body()
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event_type", "")
    resource = event.get("resource") or {}
    subscription_id = resource.get("id") or resource.get("billing_agreement_id")

    if not subscription_id:
        return {"status": "ignored"}

    ensure_users_table(engine)

    if event_type in {
        "BILLING.SUBSCRIPTION.ACTIVATED",
        "BILLING.SUBSCRIPTION.RE-ACTIVATED",
    }:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT clerk_id FROM users WHERE paypal_subscription_id = :sid"),
                {"sid": subscription_id},
            ).fetchone()
        if row:
            set_user_paid(engine, row[0], is_paid=True, subscription_id=subscription_id, status="ACTIVE")
            sync_paid_status(engine, row[0], True)

    elif event_type in {
        "BILLING.SUBSCRIPTION.CANCELLED",
        "BILLING.SUBSCRIPTION.SUSPENDED",
        "BILLING.SUBSCRIPTION.EXPIRED",
    }:
        status = resource.get("status") or event_type.split(".")[-1]
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT clerk_id FROM users WHERE paypal_subscription_id = :sid"),
                {"sid": subscription_id},
            ).fetchone()
        if row:
            set_user_paid(engine, row[0], is_paid=False, subscription_id=subscription_id, status=status)
            sync_paid_status(engine, row[0], False)

    return {"status": "ok"}