"""PayPal REST API helpers for subscription verification."""

import os
from functools import lru_cache

import httpx

PAYPAL_PLAN_ID = os.environ.get("PAYPAL_PLAN_ID", "P-57T49130US0841254NI3ATSY")


def _api_base() -> str:
    mode = os.environ.get("PAYPAL_MODE", "live").lower()
    if mode == "sandbox":
        return "https://api-m.sandbox.paypal.com"
    return "https://api-m.paypal.com"


@lru_cache(maxsize=1)
def _credentials() -> tuple[str, str]:
    client_id = os.environ.get("PAYPAL_CLIENT_ID", "").strip()
    client_secret = os.environ.get("PAYPAL_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set")
    return client_id, client_secret


def get_access_token() -> str:
    client_id, client_secret = _credentials()
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{_api_base()}/v1/oauth2/token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


def get_subscription(subscription_id: str) -> dict:
    token = get_access_token()
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{_api_base()}/v1/billing/subscriptions/{subscription_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        return resp.json()


def subscription_is_active(subscription_id: str) -> dict:
    """Return subscription payload if active and on the expected plan."""
    data = get_subscription(subscription_id)
    status = data.get("status", "").upper()
    if status not in {"ACTIVE", "APPROVED"}:
        raise ValueError(f"Subscription status is {status}, expected ACTIVE")

    plan_id = data.get("plan_id")
    if not plan_id:
        plan = data.get("plan") or {}
        plan_id = plan.get("id")

    if plan_id and plan_id != PAYPAL_PLAN_ID:
        raise ValueError(f"Subscription plan mismatch: {plan_id}")

    return data