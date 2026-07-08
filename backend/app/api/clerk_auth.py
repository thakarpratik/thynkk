"""Optional Clerk JWT verification for authenticated API routes."""

import os
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient

_jwk_clients: dict[str, PyJWKClient] = {}


@lru_cache(maxsize=1)
def _default_jwks_url() -> str | None:
    url = os.environ.get("CLERK_JWKS_URL", "").strip()
    return url or None


def _jwks_url_for_token(token: str) -> str:
    """Resolve JWKS URL from JWT issuer (works with Clerk custom domains)."""
    try:
        unverified = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False},
        )
        iss = (unverified.get("iss") or "").rstrip("/")
        if iss:
            return f"{iss}/.well-known/jwks.json"
    except jwt.PyJWTError:
        pass

    fallback = _default_jwks_url()
    if fallback:
        return fallback

    raise HTTPException(
        status_code=503,
        detail="CLERK_JWKS_URL not configured and token issuer missing",
    )


def _get_jwk_client(jwks_url: str) -> PyJWKClient:
    client = _jwk_clients.get(jwks_url)
    if client is None:
        client = PyJWKClient(jwks_url)
        _jwk_clients[jwks_url] = client
    return client


def verify_clerk_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    jwks_url = _jwks_url_for_token(token)

    try:
        signing_key = _get_jwk_client(jwks_url).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authorization token") from exc

    clerk_id = payload.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return payload


def optional_clerk_id(authorization: str | None = Header(None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return verify_clerk_token(authorization).get("sub")
    except HTTPException:
        return None


def require_clerk_id(authorization: str | None = Header(None)) -> str:
    return verify_clerk_token(authorization)["sub"]


def require_clerk_payload(authorization: str | None = Header(None)) -> dict:
    return verify_clerk_token(authorization)


ClerkId = Annotated[str, Depends(require_clerk_id)]
ClerkPayload = Annotated[dict, Depends(require_clerk_payload)]
OptionalClerkId = Annotated[str | None, Depends(optional_clerk_id)]