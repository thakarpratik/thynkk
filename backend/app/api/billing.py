"""PayPal PAYG billing — one-time Launch Pack purchase."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.clerk_auth import ClerkId
from app.api.paypal_client import capture_order, get_order, order_payment_completed
from app.api.quota import CREDITS_PER_PACK
from app.api.users import add_user_credits, ensure_users_table

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])

FREE_THEME_LIMIT = 3
FREE_RADAR_LIMIT = 3
FREE_GROWTH_THREAD_LIMIT = 3
FREE_GROWTH_POST_IDEA_LIMIT = 1
PACK_PRICE_USD = 19


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
    """Gate growth scan results for free-tier scans."""
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
    for t in threads[:FREE_GROWTH_THREAD_LIMIT]:
        reply = t.get("suggested_reply", "")
        teaser = reply[:120] + ("…" if len(reply) > 120 else "")
        gated_threads.append({
            **t,
            "suggested_reply": teaser,
            "locked": True,
        })

    gated_posts = []
    for p in post_ideas[:FREE_GROWTH_POST_IDEA_LIMIT]:
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


def ensure_orders_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS paypal_orders (
                order_id        TEXT PRIMARY KEY,
                clerk_id        TEXT NOT NULL,
                credits_granted INTEGER NOT NULL,
                amount          TEXT NOT NULL,
                currency        TEXT NOT NULL,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))


class BillingStatus(BaseModel):
    scan_credits: int
    pack_credits: int
    pack_price_usd: int
    # Legacy
    is_paid: bool
    subscription_id: str | None = None
    subscription_status: str | None = None


class CaptureRequest(BaseModel):
    order_id: str


class CaptureResponse(BaseModel):
    scan_credits: int
    credits_added: int
    order_id: str


def _grant_pack_once(engine: Engine, clerk_id: str, order_id: str, order: dict) -> int:
    ensure_orders_table(engine)
    with engine.connect() as conn:
        existing = conn.execute(
            text("SELECT credits_granted FROM paypal_orders WHERE order_id = :oid"),
            {"oid": order_id},
        ).fetchone()
    if existing:
        from app.api.quota import get_quota
        return int(get_quota(f"clerk:{clerk_id}", engine)["scan_credits"])

    amount, currency = order_payment_completed(order)
    credits = add_user_credits(engine, clerk_id, CREDITS_PER_PACK)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO paypal_orders (order_id, clerk_id, credits_granted, amount, currency)
                VALUES (:oid, :cid, :credits, :amount, :currency)
            """),
            {
                "oid": order_id,
                "cid": clerk_id,
                "credits": CREDITS_PER_PACK,
                "amount": amount,
                "currency": currency,
            },
        )
    return credits


@router.get("/status", response_model=BillingStatus)
def billing_status(
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> BillingStatus:
    from app.api.quota import get_quota

    ensure_users_table(engine)
    quota = get_quota(f"clerk:{clerk_id}", engine)
    credits = int(quota["scan_credits"])

    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT paypal_subscription_id, subscription_status
                FROM users
                WHERE clerk_id = :clerk_id AND deleted_at IS NULL
            """),
            {"clerk_id": clerk_id},
        ).fetchone()

    return BillingStatus(
        scan_credits=credits,
        pack_credits=CREDITS_PER_PACK,
        pack_price_usd=PACK_PRICE_USD,
        is_paid=credits > 0,
        subscription_id=row[0] if row else None,
        subscription_status=row[1] if row else None,
    )


@router.post("/paypal/capture", response_model=CaptureResponse)
def capture_paypal_order(
    body: CaptureRequest,
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> CaptureResponse:
    order_id = body.order_id.strip()
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required")

    ensure_users_table(engine)
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM users WHERE clerk_id = :clerk_id AND deleted_at IS NULL"),
            {"clerk_id": clerk_id},
        ).fetchone()
    if not exists:
        raise HTTPException(status_code=404, detail="User not found. Sign out and sign in again.")

    ensure_orders_table(engine)
    with engine.connect() as conn:
        prior = conn.execute(
            text("SELECT credits_granted FROM paypal_orders WHERE order_id = :oid"),
            {"oid": order_id},
        ).fetchone()
    if prior:
        from app.api.quota import get_quota
        credits = int(get_quota(f"clerk:{clerk_id}", engine)["scan_credits"])
        return CaptureResponse(
            scan_credits=credits,
            credits_added=0,
            order_id=order_id,
        )

    try:
        order = capture_order(order_id)
        credits = _grant_pack_once(engine, clerk_id, order_id, order)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("PayPal capture failed for order %s", order_id)
        raise HTTPException(status_code=502, detail="Could not verify PayPal payment") from exc

    logger.info("Granted %s credits for order %s clerk_id=%s", CREDITS_PER_PACK, order_id, clerk_id)
    return CaptureResponse(
        scan_credits=credits,
        credits_added=CREDITS_PER_PACK,
        order_id=order_id,
    )


@router.post("/paypal/webhook")
async def paypal_webhook(request: Request, engine: Engine = Depends(get_engine)) -> dict:
    body = await request.body()
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("event_type", "")
    resource = event.get("resource") or {}

    if event_type in {"CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"}:
        order_id = resource.get("id") or resource.get("order_id")
        if not order_id:
            return {"status": "ignored"}

        try:
            order = get_order(order_id)
            custom_id = (order.get("purchase_units") or [{}])[0].get("custom_id")
            if custom_id and custom_id.startswith("clerk:"):
                clerk_id = custom_id.removeprefix("clerk:")
                _grant_pack_once(engine, clerk_id, order_id, order)
        except Exception:
            logger.exception("PayPal webhook order grant failed for %s", order_id)

    return {"status": "ok"}