import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.engine import Engine

from app.api.attribution import attribution_to_dict, extract_attribution
from app.api.billing import gate_themes_for_plan
from app.api.email_guard import check_email_verified
from app.api.users import user_is_paid
from app.api.clerk_auth import ClerkId, ClerkPayload, OptionalClerkId
from app.api.models import (
    ScanCreated,
    ScanReport,
    ScanRequest,
    ScanStatus,
    ScanStatusResponse,
    ThemeOut,
    QuoteOut,
)
from app.api.runner import start_scan
from app.api.scan_history import can_access_scan, claim_ip_scans, get_saved_scan, list_scans
from app.api.store import ScanStore
from app.api.quota import (
    account_key_for,
    check_quota,
    increment_ip_free_count,
    increment_quota,
    get_client_ip,
)

router = APIRouter(prefix="/scans", tags=["scans"])


def _themes_to_out(themes: list[dict]) -> list[ThemeOut]:
    return [
        ThemeOut(
            name=t["name"],
            summary=t["summary"],
            opportunity=t["opportunity"],
            severity_score=t["severity_score"],
            mention_count=t["mention_count"],
            demand_score=t["demand_score"],
            verdict=t.get("verdict", "Unknown"),
            willingness_to_pay=t.get("willingness_to_pay", "Unknown"),
            willingness_reason=t.get("willingness_reason", ""),
            competition=t.get("competition", ""),
            next_step=t.get("next_step", ""),
            quotes=[
                QuoteOut(excerpt=q["excerpt"], permalink=q["permalink"])
                for q in t.get("quotes", [])
            ],
            demand_label=t.get("demand_label"),
            severity_label=t.get("severity_label"),
            locked=bool(t.get("locked", False)),
        )
        for t in themes
    ]


def _build_report(
    scan_id: str,
    query: str,
    themes: list[dict],
    from_cache: bool,
    is_paid: bool,
) -> ScanReport:
    total_themes = len(themes)
    visible = gate_themes_for_plan(themes, is_paid)
    return ScanReport(
        scan_id=scan_id,
        query=query,
        themes=_themes_to_out(visible),
        total_themes=total_themes,
        from_cache=from_cache,
    )


class ScanHistoryItem(BaseModel):
    scan_id: str
    query: str
    total_themes: int
    theme_count: int
    top_theme: str
    from_cache: bool
    scanned_at: datetime
    themes: list[ThemeOut]


class ScanHistoryResponse(BaseModel):
    scans: list[ScanHistoryItem]


def get_store() -> ScanStore:
    from app.api.store import scan_store
    return scan_store


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


@router.post("", response_model=ScanCreated, status_code=202)
def submit_scan(
    request: Request,
    body: ScanRequest,
    clerk_payload: ClerkPayload,
    store: ScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> ScanCreated:
    check_email_verified(clerk_payload)
    clerk_id = clerk_payload["sub"]

    ip = get_client_ip(request)
    key = account_key_for(request, clerk_id)
    quota = check_quota(key, engine, clerk_id, request=request)
    attr = attribution_to_dict(extract_attribution(request, body.attribution))

    scan_id = str(uuid.uuid4())
    store.create(scan_id, body.query)
    start_scan(
        scan_id,
        body.query,
        body.post_limit,
        store,
        engine,
        ip=ip,
        account_key=key,
        clerk_id=clerk_id,
        attribution=attr,
    )

    increment_quota(key, engine)
    if not quota["is_paid"]:
        increment_ip_free_count(engine, ip)
    return ScanCreated(scan_id=scan_id)


@router.get("/history", response_model=ScanHistoryResponse)
def scan_history(
    request: Request,
    clerk_id: ClerkId,
    engine: Engine = Depends(get_engine),
) -> ScanHistoryResponse:
    ip_key = account_key_for(request, None)
    claim_ip_scans(engine, clerk_id, ip_key)

    is_paid = user_is_paid(engine, clerk_id)
    saved = list_scans(engine, clerk_id=clerk_id)
    items: list[ScanHistoryItem] = []
    for row in saved:
        visible = gate_themes_for_plan(row["themes"], is_paid)
        top = visible[0]["name"] if visible else "—"
        items.append(
            ScanHistoryItem(
                scan_id=row["scan_id"],
                query=row["query"],
                total_themes=row["total_themes"],
                theme_count=len(visible),
                top_theme=top,
                from_cache=row["from_cache"],
                scanned_at=row["created_at"],
                themes=_themes_to_out(visible),
            )
        )
    return ScanHistoryResponse(scans=items)


@router.get("/{scan_id}/status", response_model=ScanStatusResponse)
def get_status(
    scan_id: str,
    store: ScanStore = Depends(get_store),
) -> ScanStatusResponse:
    job = store.get(scan_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan not found.")
    return ScanStatusResponse(
        scan_id=job.scan_id,
        status=job.status,
        query=job.query,
        error=job.error,
    )


@router.get("/{scan_id}/report", response_model=ScanReport)
def get_report(
    request: Request,
    scan_id: str,
    clerk_id: OptionalClerkId = None,
    store: ScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> ScanReport:
    is_paid = bool(clerk_id and user_is_paid(engine, clerk_id))
    account_key = account_key_for(request, clerk_id)

    job = store.get(scan_id)
    if job:
        if job.status == ScanStatus.running or job.status == ScanStatus.queued:
            raise HTTPException(status_code=409, detail="Scan still running.")
        if job.status == ScanStatus.failed:
            raise HTTPException(status_code=422, detail=job.error or "Scan failed.")
        return _build_report(job.scan_id, job.query, job.result, job.from_cache, is_paid)

    saved = get_saved_scan(engine, scan_id)
    if not saved:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if not can_access_scan(saved, clerk_id=clerk_id, account_key=account_key):
        raise HTTPException(status_code=404, detail="Scan not found.")

    return _build_report(
        saved["scan_id"],
        saved["query"],
        saved["themes"],
        saved["from_cache"],
        is_paid,
    )
