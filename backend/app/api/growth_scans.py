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


class PartialThreadOut(BaseModel):
    title: str
    url: str
    source: str = "reddit"
    snippet: str = ""
    date: str = ""
    query: str = ""


class GrowthPartialOut(BaseModel):
    product_name: str = ""
    niche_label: str = ""
    product_summary: str = ""
    audience: str = ""
    threads: list[PartialThreadOut] = Field(default_factory=list)
    total_threads: int = 0
    drafts_ready: bool = False


class GrowthScanStatusResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    url: str
    error: str | None = None
    stage: str = "queued"
    stage_message: str = ""
    progress_pct: int = 0
    partial: GrowthPartialOut | None = None
    notify_email: str | None = None


class NotifyRequest(BaseModel):
    email: str | None = Field(default=None, max_length=254)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return None
        email = str(v).strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address.")
        return email


class NotifyResponse(BaseModel):
    scan_id: str
    notify_email: str
    message: str


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


def _partial_from_job(partial: dict | None) -> GrowthPartialOut | None:
    if not partial:
        return None
    threads = []
    for t in partial.get("threads") or []:
        if not isinstance(t, dict):
            continue
        threads.append(
            PartialThreadOut(
                title=str(t.get("title") or "Untitled")[:300],
                url=str(t.get("url") or ""),
                source=str(t.get("source") or "reddit"),
                snippet=str(t.get("snippet") or "")[:240],
                date=str(t.get("date") or "")[:80],
                query=str(t.get("query") or "")[:120],
            )
        )
    return GrowthPartialOut(
        product_name=str(partial.get("product_name") or ""),
        niche_label=str(partial.get("niche_label") or ""),
        product_summary=str(partial.get("product_summary") or ""),
        audience=str(partial.get("audience") or ""),
        threads=threads,
        total_threads=int(partial.get("total_threads") or len(threads)),
        drafts_ready=bool(partial.get("drafts_ready")),
    )


def _status_from_job(job) -> GrowthScanStatusResponse:
    return GrowthScanStatusResponse(
        scan_id=job.scan_id,
        status=job.status,
        url=job.url,
        error=job.error,
        stage=getattr(job, "stage", None) or "queued",
        stage_message=getattr(job, "stage_message", None) or "",
        progress_pct=int(getattr(job, "progress_pct", 0) or 0),
        partial=_partial_from_job(getattr(job, "partial", None)),
        notify_email=getattr(job, "notify_email", None),
    )


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
        return _status_from_job(job)

    store.update(
        scan_id,
        status=ScanStatus.cancelled,
        error="Scan stopped by user.",
        stage="cancelled",
        stage_message="Stopped",
        progress_pct=100,
    )
    job = store.get(scan_id)
    assert job is not None
    return _status_from_job(job)


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
    # Free lifetime scan and paid credits both get a complete report (no teaser gate).
    # Quota still limits free users to one scan; report_tier is "full" for UI unlock.
    is_full = True
    gated = gate_growth_report(result, is_full)
    report_tier = "full" if tier in ("full", "free") else tier
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
        report_tier=report_tier,
    )


@router.post("/{scan_id}/notify", response_model=NotifyResponse)
def request_scan_notify(
    scan_id: str,
    body: NotifyRequest,
    clerk_payload: ClerkPayload,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> NotifyResponse:
    """Email the user when this scan finishes (safe to leave the tab)."""
    clerk_id = clerk_payload["sub"]
    job = store.get(scan_id)
    if not job:
        # Completed scans may only live in DB — still allow a one-shot email
        saved = get_saved_growth_scan(engine, scan_id)
        if not saved:
            raise HTTPException(status_code=404, detail="Scan not found.")
        email = body.email or get_user_email(engine, clerk_id)
        if not email:
            raise HTTPException(
                status_code=400,
                detail="No email on file. Enter an email to get notified.",
            )
        from app.email.brevo import send_scan_ready_async

        send_scan_ready_async(
            email,
            url=saved["url"],
            success=True,
            product_name=saved.get("product_name") or "",
            scan_id=scan_id,
        )
        return NotifyResponse(
            scan_id=scan_id,
            notify_email=email,
            message="Scan already finished — we sent a link to your results.",
        )

    email = body.email or get_user_email(engine, clerk_id)
    if not email:
        raise HTTPException(
            status_code=400,
            detail="No email on file. Enter an email to get notified.",
        )

    if job.status == ScanStatus.done:
        from app.email.brevo import send_scan_ready_async

        product = ""
        if job.result:
            product = str(job.result.get("product_name") or "")
        send_scan_ready_async(
            email,
            url=job.url,
            success=True,
            product_name=product,
            scan_id=scan_id,
        )
        store.update(scan_id, notify_email=email, notify_sent=True)
        return NotifyResponse(
            scan_id=scan_id,
            notify_email=email,
            message="Scan already finished — we sent a link to your results.",
        )

    if job.status in (ScanStatus.failed, ScanStatus.cancelled):
        raise HTTPException(status_code=409, detail="This scan is no longer running.")

    store.update(scan_id, notify_email=email, notify_sent=False)
    return NotifyResponse(
        scan_id=scan_id,
        notify_email=email,
        message=f"We'll email {email} when your scan is ready.",
    )


@router.get("/{scan_id}/status", response_model=GrowthScanStatusResponse)
def growth_status(
    scan_id: str,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanStatusResponse:
    job = store.get(scan_id)
    if job:
        return _status_from_job(job)

    saved = get_saved_growth_scan(engine, scan_id)
    if saved:
        return GrowthScanStatusResponse(
            scan_id=saved["scan_id"],
            status=ScanStatus.done,
            url=saved["url"],
            error=None,
            stage="done",
            stage_message="Scan complete",
            progress_pct=100,
            partial=None,
            notify_email=None,
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