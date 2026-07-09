"""PayPal REST API helpers — one-time order capture."""

import os
from functools import lru_cache

import httpx

PAYPAL_PACK_PRICE = os.environ.get("PAYPAL_PACK_PRICE", "19.00")
PAYPAL_PACK_CURRENCY = os.environ.get("PAYPAL_PACK_CURRENCY", "USD")

# Legacy subscription plan (deprecated — kept for old webhook events)
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


def capture_order(order_id: str) -> dict:
    token = get_access_token()
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{_api_base()}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={},
        )
        resp.raise_for_status()
        return resp.json()


def get_order(order_id: str) -> dict:
    token = get_access_token()
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(
            f"{_api_base()}/v2/checkout/orders/{order_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        return resp.json()


def order_payment_completed(order: dict) -> tuple[str, str]:
    """Return (amount, currency) if order capture succeeded with expected price."""
    status = order.get("status", "").upper()
    if status not in {"COMPLETED", "APPROVED"}:
        raise ValueError(f"Order status is {status}, expected COMPLETED")

    units = order.get("purchase_units") or []
    if not units:
        raise ValueError("Order has no purchase units")

    captures = units[0].get("payments", {}).get("captures") or []
    amount_block = None
    if captures:
        amount_block = captures[0].get("amount")
    if not amount_block:
        amount_block = units[0].get("amount")

    if not amount_block:
        raise ValueError("Order has no amount")

    value = str(amount_block.get("value", ""))
    currency = str(amount_block.get("currency_code", "")).upper()
    if currency != PAYPAL_PACK_CURRENCY:
        raise ValueError(f"Unexpected currency {currency}")
    if value != PAYPAL_PACK_PRICE:
        raise ValueError(f"Unexpected amount {value}, expected {PAYPAL_PACK_PRICE}")
    return value, currency


def get_subscription(subscription_id: str) -> dict:
    """Legacy subscription lookup."""
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
    data = get_subscription(subscription_id)
    status = data.get("status", "").upper()
    if status not in {"ACTIVE", "APPROVED"}:
        raise ValueError(f"Subscription status is {status}, expected ACTIVE")
    return data