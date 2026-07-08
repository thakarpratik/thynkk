"""Growth scan API — paste a website URL, get threads + reply drafts."""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.engine import Engine

from app.api.billing import gate_growth_report
from app.api.clerk_auth import ClerkPayload
from app.api.email_guard import check_email_verified
from app.api.growth_runner import start_growth_scan
from app.api.growth_store import GrowthScanStore, growth_scan_store
from app.api.models import ScanStatus
from app.api.quota import (
    account_key_for,
    check_quota,
    get_client_ip,
    increment_ip_free_count,
    increment_quota,
)
from app.api.users import user_is_paid

router = APIRouter(prefix="/growth-scans", tags=["growth-scans"])

_URL_RE = re.compile(r"^https?://[^\s/]+", re.I)


class GrowthScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=500)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        raw = v.strip()
        if not raw.startswith(("http://", "https://")):
            raw = f"https://{raw}"
        if not _URL_RE.match(raw):
            raise ValueError("Invalid URL.")
        return raw


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
    locked: bool = False


class PostIdeaOut(BaseModel):
    title: str
    hook: str
    outline: list[str]
    target_community: str
    based_on_trend: str
    locked: bool = False


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


def get_store() -> GrowthScanStore:
    return growth_scan_store


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


@router.post("", response_model=GrowthScanCreated, status_code=202)
def submit_growth_scan(
    request: Request,
    body: GrowthScanRequest,
    clerk_payload: ClerkPayload,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanCreated:
    check_email_verified(clerk_payload)
    clerk_id = clerk_payload["sub"]

    ip = get_client_ip(request)
    key = account_key_for(request, clerk_id)
    quota = check_quota(key, engine, clerk_id, request=request)

    scan_id = str(uuid.uuid4())
    store.create(scan_id, body.url)
    start_growth_scan(scan_id, body.url, store, engine, ip=ip)

    increment_quota(key, engine)
    if not quota["is_paid"]:
        increment_ip_free_count(engine, ip)

    return GrowthScanCreated(scan_id=scan_id)


@router.get("/{scan_id}/status", response_model=GrowthScanStatusResponse)
def growth_status(
    scan_id: str,
    store: GrowthScanStore = Depends(get_store),
) -> GrowthScanStatusResponse:
    job = store.get(scan_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return GrowthScanStatusResponse(
        scan_id=job.scan_id,
        status=job.status,
        url=job.url,
        error=job.error,
    )


@router.get("/{scan_id}/report", response_model=GrowthScanReport)
def growth_report(
    request: Request,
    scan_id: str,
    clerk_payload: ClerkPayload,
    store: GrowthScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> GrowthScanReport:
    is_paid = user_is_paid(engine, clerk_payload["sub"])
    job = store.get(scan_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if job.status in (ScanStatus.running, ScanStatus.queued):
        raise HTTPException(status_code=409, detail="Scan still running.")
    if job.status == ScanStatus.failed:
        raise HTTPException(status_code=422, detail=job.error or "Scan failed.")
    if not job.result:
        raise HTTPException(status_code=422, detail="No report available.")

    gated = gate_growth_report(job.result, is_paid)
    return GrowthScanReport(
        scan_id=job.scan_id,
        url=job.url,
        product_name=gated["product_name"],
        niche_label=gated["niche_label"],
        product_summary=gated["product_summary"],
        audience=gated["audience"],
        subreddits=gated["subreddits"],
        threads=gated["threads"],
        post_ideas=gated["post_ideas"],
        total_threads=gated["total_threads"],
        total_post_ideas=gated["total_post_ideas"],
        from_cache=job.from_cache,
    )