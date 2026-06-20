"""Optional Clerk JWT verification for authenticated API routes."""

import os
from functools import lru_cache
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient

_jwk_client: PyJWKClient | None = None


@lru_cache(maxsize=1)
def _jwks_url() -> str:
    url = os.environ.get("CLERK_JWKS_URL", "").strip()
    if not url:
        raise HTTPException(status_code=503, detail="CLERK_JWKS_URL not configured")
    return url


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(_jwks_url())
    return _jwk_client


def verify_clerk_token(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
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


ClerkId = Annotated[str, Depends(require_clerk_id)]
OptionalClerkId = Annotated[str | None, Depends(optional_clerk_id)]