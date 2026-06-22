"""Email abuse protection: disposable domain blocklist + verification check."""

import os
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

_BLOCKLIST_PATH = Path(__file__).parent.parent.parent / "config" / "blocked_email_domains.txt"


@lru_cache(maxsize=1)
def _blocked_domains() -> frozenset[str]:
    if not _BLOCKLIST_PATH.exists():
        return frozenset()
    lines = _BLOCKLIST_PATH.read_text(encoding="utf-8").splitlines()
    return frozenset(
        line.strip().lower()
        for line in lines
        if line.strip() and not line.startswith("#")
    )


_ALIAS_DOMAINS = frozenset({
    "gmail.com", "googlemail.com", "outlook.com", "hotmail.com",
    "live.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com",
})


def check_email_domain(email: str) -> None:
    """Raise 403 if the email domain is on the disposable blocklist."""
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail={"error": "invalid_email"})

    local, domain = email.rsplit("@", 1)
    domain = domain.lower()

    if domain in _blocked_domains():
        raise HTTPException(
            status_code=403,
            detail={
                "error": "disposable_email",
                "message": "Disposable email addresses are not allowed. Please sign up with a real email.",
            },
        )

    if "+" in local and domain in _ALIAS_DOMAINS:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "alias_email",
                "message": "Email aliases (+address) are not allowed. Please use your primary email.",
            },
        )


def check_email_verified(clerk_payload: dict) -> None:
    """Raise 403 if the Clerk JWT shows the email is not verified.

    Clerk JWTs include `email_verified: bool` in the session claims when
    email verification is enabled in the Clerk dashboard.
    """
    # Only block when Clerk explicitly marks the email unverified.
    # Missing claim = allow (enable email verification in Clerk to enforce).
    if clerk_payload.get("email_verified") is False:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "email_not_verified",
                "message": "Please verify your email address before scanning.",
            },
        )
