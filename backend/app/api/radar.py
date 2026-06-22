"""Trend Radar API endpoint."""

import threading
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.engine import Engine

from app.api.billing import gate_radar_niches
from app.api.clerk_auth import OptionalClerkId
from app.api.users import user_is_paid

router = APIRouter(prefix="/radar", tags=["radar"])

# Simple in-process cache — refreshes after CACHE_TTL
CACHE_TTL = timedelta(hours=6)

_cache_lock = threading.Lock()
_cached_result: dict[str, Any] | None = None
_cached_at: datetime | None = None
_running = False


class TrendItemOut(BaseModel):
    niche: str
    description: str
    growth: str
    growth_pct: int
    tag: str
    posts: int
    subreddit: str
    locked: bool = False


def get_engine() -> Engine:
    from app.main import db_engine
    return db_engine


class TrendRadarResponse(BaseModel):
    niches: list[TrendItemOut]
    as_of: datetime
    window_days: int
    from_cache: bool


def _is_stale() -> bool:
    if _cached_at is None:
        return True
    return datetime.now(timezone.utc) - _cached_at > CACHE_TTL


def _run_pipeline() -> dict[str, Any]:
    from app.radar.pulse import collect_titles, WINDOW_DAYS
    from app.radar.analyze import analyze_trends
    from app.radar.scoring import score_niches

    posts = collect_titles()
    print(f"[radar] pulse collected {len(posts)} post titles")
    if not posts:
        print("[radar] WARNING: pulse returned 0 posts — Reddit may be blocking requests from this IP")

    result, usage = analyze_trends(posts)
    print(f"[radar] Claude returned {len(result.niches)} niches | tokens: {usage.input_tokens} in / {usage.output_tokens} out")
    niches = score_niches(result.niches)
    return {
        "niches": niches,
        "as_of": datetime.now(timezone.utc),
        "window_days": WINDOW_DAYS,
    }


def _respond(data: dict, from_cache: bool, is_paid: bool) -> TrendRadarResponse:
    niches = gate_radar_niches(data["niches"], is_paid)
    return TrendRadarResponse(
        niches=[TrendItemOut(**n) for n in niches],
        as_of=data["as_of"],
        window_days=data["window_days"],
        from_cache=from_cache,
    )


@router.get("/trends", response_model=TrendRadarResponse)
def get_trends(
    refresh: bool = False,
    clerk_id: OptionalClerkId = None,
    engine: Engine = Depends(get_engine),
) -> TrendRadarResponse:
    global _cached_result, _cached_at, _running
    is_paid = bool(clerk_id and user_is_paid(engine, clerk_id))

    with _cache_lock:
        if _running:
            raise HTTPException(status_code=503, detail="Trend Radar scan in progress. Try again in ~60s.")

        if not refresh and _cached_result and not _is_stale():
            return _respond(_cached_result, from_cache=True, is_paid=is_paid)

        _running = True

    try:
        data = _run_pipeline()
        with _cache_lock:
            _cached_result = data
            _cached_at = data["as_of"]
        return _respond(data, from_cache=False, is_paid=is_paid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Radar pipeline failed: {e}")
    finally:
        with _cache_lock:
            _running = False
