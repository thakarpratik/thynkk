"""Clerk webhook handler.

Events handled:
  user.created  — validate email domain, create users row
  user.deleted  — soft-delete users row

Set CLERK_WEBHOOK_SECRET in env (Signing Secret from Clerk Dashboard → Webhooks).
Install svix: pip install svix
"""

import hashlib
import hmac
import json
import logging
import os
import time

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.api.email_guard import check_email_domain

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_svix_signature(
    payload: bytes,
    svix_id: str,
    svix_timestamp: str,
    svix_signature: str,
    secret: str,
) -> None:
    """Verify Clerk webhook signature using svix format."""
    # Reject timestamps older than 5 minutes
    try:
        ts = int(svix_timestamp)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid timestamp")
    if abs(time.time() - ts) > 300:
        raise HTTPException(status_code=400, detail="Webhook timestamp too old")

    # svix secret starts with "whsec_" prefix followed by base64
    import base64
    raw_secret = base64.b64decode(secret.removeprefix("whsec_"))

    signed_content = f"{svix_id}.{svix_timestamp}.".encode() + payload
    expected = base64.b64encode(
        hmac.new(raw_secret, signed_content, hashlib.sha256).digest()  # type: ignore[attr-defined]
    ).decode()

    # svix_signature may contain multiple space-separated "v1,<hash>" values
    sigs = [s.split(",", 1)[1] for s in svix_signature.split(" ") if "," in s]
    if not any(hmac.compare_digest(expected, s) for s in sigs):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


def _get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def _ensure_users_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                clerk_id        TEXT NOT NULL UNIQUE,
                email           TEXT NOT NULL,
                is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                deleted_at      TIMESTAMPTZ
            )
        """))


@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    svix_id: str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
) -> dict:
    body = await request.body()
    secret = os.environ.get("CLERK_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("CLERK_WEBHOOK_SECRET not set — skipping signature verification")
    else:
        if not all([svix_id, svix_timestamp, svix_signature]):
            raise HTTPException(status_code=400, detail="Missing svix headers")
        _verify_svix_signature(body, svix_id, svix_timestamp, svix_signature, secret)

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("type")
    data = event.get("data", {})

    if event_type == "user.created":
        clerk_id = data.get("id")
        email_addresses = data.get("email_addresses", [])
        primary_email_id = data.get("primary_email_address_id")

        email = ""
        for ea in email_addresses:
            if ea.get("id") == primary_email_id:
                email = ea.get("email_address", "")
                break

        if not email:
            email = email_addresses[0].get("email_address", "") if email_addresses else ""

        # Block disposable domains before creating the user row
        try:
            check_email_domain(email)
        except HTTPException as e:
            logger.warning("Blocked signup from disposable email: %s", email)
            # Return 200 to Clerk so it doesn't retry, but log the block
            return {"status": "blocked", "reason": e.detail}

        engine = _get_engine()
        _ensure_users_table(engine)

        import uuid
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO users (id, clerk_id, email)
                VALUES (:id, :clerk_id, :email)
                ON CONFLICT (clerk_id) DO NOTHING
            """), {"id": str(uuid.uuid4()), "clerk_id": clerk_id, "email": email})

        logger.info("Created user: clerk_id=%s email=%s", clerk_id, email)

    elif event_type == "user.deleted":
        clerk_id = data.get("id")
        if clerk_id:
            engine = _get_engine()
            with engine.begin() as conn:
                conn.execute(text("""
                    UPDATE users SET deleted_at = now() WHERE clerk_id = :clerk_id
                """), {"clerk_id": clerk_id})
            logger.info("Soft-deleted user: clerk_id=%s", clerk_id)

    return {"status": "ok"}
