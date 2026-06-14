import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.engine import Engine

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
from app.api.store import ScanStore

router = APIRouter(prefix="/scans", tags=["scans"])


def get_store() -> ScanStore:
    from app.api.store import scan_store
    return scan_store


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


@router.post("", response_model=ScanCreated, status_code=202)
def submit_scan(
    body: ScanRequest,
    store: ScanStore = Depends(get_store),
    engine: Engine = Depends(get_engine),
) -> ScanCreated:
    scan_id = str(uuid.uuid4())
    store.create(scan_id, body.query)
    start_scan(scan_id, body.query, body.post_limit, store, engine)
    return ScanCreated(scan_id=scan_id)


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
    scan_id: str,
    store: ScanStore = Depends(get_store),
) -> ScanReport:
    job = store.get(scan_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if job.status == ScanStatus.running or job.status == ScanStatus.queued:
        raise HTTPException(status_code=409, detail="Scan still running.")
    if job.status == ScanStatus.failed:
        raise HTTPException(status_code=422, detail=job.error or "Scan failed.")

    themes = [
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
        )
        for t in job.result
    ]
    return ScanReport(scan_id=job.scan_id, query=job.query, themes=themes, from_cache=job.from_cache)
