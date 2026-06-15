"""Trend Radar API endpoint."""

import threading
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    result, usage = analyze_trends(posts)
    print(f"[radar] tokens: {usage.input_tokens} in / {usage.output_tokens} out")
    niches = score_niches(result.niches)
    return {
        "niches": niches,
        "as_of": datetime.now(timezone.utc),
        "window_days": WINDOW_DAYS,
    }


@router.get("/trends", response_model=TrendRadarResponse)
def get_trends(refresh: bool = False) -> TrendRadarResponse:
    global _cached_result, _cached_at, _running

    with _cache_lock:
        if _running:
            raise HTTPException(status_code=503, detail="Trend Radar scan in progress. Try again in ~60s.")

        if not refresh and _cached_result and not _is_stale():
            return TrendRadarResponse(**_cached_result, from_cache=True)

        _running = True

    try:
        data = _run_pipeline()
        with _cache_lock:
            _cached_result = data
            _cached_at = data["as_of"]
        return TrendRadarResponse(**data, from_cache=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Radar pipeline failed: {e}")
    finally:
        with _cache_lock:
            _running = False
