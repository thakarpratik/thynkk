"""Growth scan API — paste a website URL, get threads + reply drafts."""

import os
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.engine import Engine

from app.api.attribution import AttributionIn, attribution_to_dict, extract_attribution
from app.api.billing import gate_growth_report
from app.api.clerk_auth import ClerkId, ClerkPayload
from app.api.email_guard import check_email_verified
from app.api.growth_runner import start_growth_scan
from app.api.growth_scan_history import (
    can_access_growth_scan,
    get_saved_growth_scan,
    list_growth_scans,
)
from app.api.growth_store import GrowthScanStore, growth_scan_store
from app.api.models import ScanStatus
from app.api.quota import (
    account_key_for,
    get_client_ip,
    get_scan_tier,
    record_scan_start,
    reserve_scan,
)
from app.api.users import get_user_email

router = APIRouter(prefix="/growth-scans", tags=["growth-scans"])

from urllib.parse import urlparse

# Host must look like a website domain (or localhost), not an email / random token
_HOST_RE = re.compile(
    r"^(?:localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})$",
    re.I,
)
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_website_url(raw: str) -> str:
    """Normalize and validate a public website URL for growth scans."""
    value = (raw or "").strip()
    if not value:
        raise ValueError("Enter a website URL (e.g. https://yourproduct.com).")

    # Bare emails are a common mistake — never treat as a site
    if _EMAIL_RE.match(value) or ("@" in value and "://" not in value and "/" not in value):
        raise ValueError("That looks like an email. Enter a website URL instead.")

    if not value.startswith(("http://", "https://")):
        value = f"https://{value}"

    try:
        parsed = urlparse(value)
    except Exception as exc:
        raise ValueError("Invalid website URL.") from exc

    if parsed.scheme not in ("http", "https"):
        raise ValueError("URL must start with http:// or https://")

    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise ValueError("Enter a website URL with a domain (e.g. yourproduct.com).")

    # user@host in the URL authority (https://user@domain) is almost always a mistake
    if parsed.username or "@" in (parsed.netloc or ""):
        raise ValueError("That looks like an email. Enter a website URL instead.")

    if not _HOST_RE.match(host):
        raise ValueError(
            "Enter a valid website domain (e.g. yourproduct.com), not an email or random text."
        )

    # Rebuild a clean URL (drop userinfo, keep path/query/port)
    path = parsed.path or ""
    query = f"?{parsed.query}" if parsed.query else ""
    netloc = host
    if parsed.port and parsed.port not in (80, 443):
        netloc = f"{host}:{parsed.port}"
    return f"{parsed.scheme}://{netloc}{path}{query}"


class GrowthScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=500)
    attribution: AttributionIn | None = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return normalize_website_url(v)


class GrowthScanCreated(BaseModel):
    scan_id: str


class GrowthScanStatusResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    url: str
    error: str | None = None


class SubredditOut(BaseModel):
    name: str
    reason: str


class ThreadOut(BaseModel):
    title: str
    url: str
    source: str
    snippet: str
    intent_type: str
    match_reason: str
    relevance_score: int
    suggested_reply: str
    promo_risk: str
    date: str = ""
    locked: bool = False


class PostIdeaOut(BaseModel):
    title: str
    hook: str
    outline: list[str]
    body: str = ""
    target_community: str
    based_on_trend: str
    locked: bool = False


class GrowthScanHistoryItem(BaseModel):
    scan_id: str
    url: str
    product_name: str
    tier: str
    total_threads: int
    from_cache: bool
    scanned_at: datetime


class GrowthScanHistoryResponse(BaseModel):
    scans: list[GrowthScanHistoryItem]


class GrowthScanReport(BaseModel):
    scan_id: str
    url: str
    product_name: str
    niche_label: str
    product_summary: str
    audience: str
    subreddits: list[SubredditOut]
    threads: list[ThreadOut]
    post_ideas: list[PostIdeaOut]
    total_threads: int
    total_post_ideas: int
    from_cache: bool
    report_tier: str


def get_store() -> GrowthScanStore:
    return growth_scan_store


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


def _require_growth_env() -> None:
    missing = []
    if not os.environ.get("SERPER_API_KEY", "").strip():
        missing.append("SERPER_API_KEY")
    if not os.environ.get("ANTHROPIC_API_KEY", "").strip():
        missing.append("ANTHROPIC_API_KEY")
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Server misconfigured: missing {', '.join(missing)}. Add them in Railway env vars.",
        )


@router.post("", response_model=GrowthScanCreated, status_code=202)
def submit_growth_scan(
    request: Request,
    body: GrowthScanRequest,
    clerk_payload: ClerkPayload,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanCreated:
    check_email_verified(clerk_payload)
    _require_growth_env()
    clerk_id = clerk_payload["sub"]
    email = get_user_email(engine, clerk_id)

    ip = get_client_ip(request)
    key = account_key_for(request, clerk_id)
    reservation = reserve_scan(request, key, clerk_id, email, body.url, engine)
    attr = attribution_to_dict(extract_attribution(request, body.attribution))

    scan_id = str(uuid.uuid4())
    record_scan_start(engine, scan_id, reservation, body.url)
    store.create(scan_id, body.url)
    start_growth_scan(
        scan_id,
        body.url,
        store,
        engine,
        account_key=key,
        clerk_id=clerk_id,
        ip=ip,
        attribution=attr,
    )

    return GrowthScanCreated(scan_id=scan_id)


@router.post("/{scan_id}/cancel", response_model=GrowthScanStatusResponse)
def cancel_growth_scan(
    scan_id: str,
    clerk_id: ClerkId,
    store: GrowthScanStore = Depends(get_store),
) -> GrowthScanStatusResponse:
    """Mark an in-flight growth scan as cancelled (stops client wait; runner exits early)."""
    job = store.get(scan_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan not found.")

    if job.status in (ScanStatus.done, ScanStatus.failed, ScanStatus.cancelled):
        return GrowthScanStatusResponse(
            scan_id=job.scan_id,
            status=job.status,
            url=job.url,
            error=job.error,
        )

    store.update(
        scan_id,
        status=ScanStatus.cancelled,
        error="Scan stopped by user.",
    )
    job = store.get(scan_id)
    assert job is not None
    return GrowthScanStatusResponse(
        scan_id=job.scan_id,
        status=job.status,
        url=job.url,
        error=job.error,
    )


@router.get("/history", response_model=GrowthScanHistoryResponse)
def growth_scan_history(
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> GrowthScanHistoryResponse:
    saved = list_growth_scans(engine, clerk_id=clerk_id)
    items = [
        GrowthScanHistoryItem(
            scan_id=row["scan_id"],
            url=row["url"],
            product_name=row["product_name"] or row["url"],
            tier=row["tier"],
            total_threads=row["total_threads"],
            from_cache=row["from_cache"],
            scanned_at=row["created_at"],
        )
        for row in saved
    ]
    return GrowthScanHistoryResponse(scans=items)


def _build_growth_report(
    scan_id: str,
    url: str,
    result: dict,
    from_cache: bool,
    tier: str,
) -> GrowthScanReport:
    is_full = tier == "full"
    gated = gate_growth_report(result, is_full)
    return GrowthScanReport(
        scan_id=scan_id,
        url=url,
        product_name=gated["product_name"],
        niche_label=gated["niche_label"],
        product_summary=gated["product_summary"],
        audience=gated["audience"],
        subreddits=gated["subreddits"],
        threads=gated["threads"],
        post_ideas=gated["post_ideas"],
        total_threads=gated["total_threads"],
        total_post_ideas=gated["total_post_ideas"],
        from_cache=from_cache,
        report_tier=tier,
    )


@router.get("/{scan_id}/status", response_model=GrowthScanStatusResponse)
def growth_status(
    scan_id: str,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanStatusResponse:
    job = store.get(scan_id)
    if job:
        return GrowthScanStatusResponse(
            scan_id=job.scan_id,
            status=job.status,
            url=job.url,
            error=job.error,
        )

    saved = get_saved_growth_scan(engine, scan_id)
    if saved:
        return GrowthScanStatusResponse(
            scan_id=saved["scan_id"],
            status=ScanStatus.done,
            url=saved["url"],
            error=None,
        )

    raise HTTPException(status_code=404, detail="Scan not found.")


@router.get("/{scan_id}/report", response_model=GrowthScanReport)
def growth_report(
    request: Request,
    scan_id: str,
    clerk_payload: ClerkPayload,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanReport:
    clerk_id = clerk_payload["sub"]
    key = account_key_for(request, clerk_id)
    tier = get_scan_tier(engine, scan_id, key)
    if tier is None:
        raise HTTPException(status_code=404, detail="Scan not found.")

    job = store.get(scan_id)
    if job:
        if job.status in (ScanStatus.running, ScanStatus.queued):
            raise HTTPException(status_code=409, detail="Scan still running.")
        if job.status == ScanStatus.failed:
            raise HTTPException(status_code=422, detail=job.error or "Scan failed.")
        if not job.result:
            raise HTTPException(status_code=422, detail="No report available.")
        return _build_growth_report(job.scan_id, job.url, job.result, job.from_cache, tier)

    saved = get_saved_growth_scan(engine, scan_id)
    if not saved or not can_access_growth_scan(saved, clerk_id=clerk_id, account_key=key):
        raise HTTPException(status_code=404, detail="Scan not found.")

    store.create(scan_id, saved["url"])
    store.update(
        scan_id,
        status=ScanStatus.done,
        result=saved["report"],
        from_cache=saved["from_cache"],
    )
    return _build_growth_report(
        saved["scan_id"],
        saved["url"],
        saved["report"],
        saved["from_cache"],
        tier,
    )