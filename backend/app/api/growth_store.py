"""In-process growth scan job store."""

import threading
from dataclasses import dataclass, field
from typing import Any

from app.api.models import ScanStatus


@dataclass
class GrowthScanJob:
    scan_id: str
    url: str
    status: ScanStatus = ScanStatus.queued
    result: dict[str, Any] | None = None
    error: str | None = None
    from_cache: bool = False
    # Real progress for client UX (not pure client timers)
    stage: str = "queued"
    stage_message: str = "Queued…"
    progress_pct: int = 5
    # Partial hits after Serper, before Claude finishes drafts
    partial: dict[str, Any] | None = None
    # Email when scan completes (optional)
    notify_email: str | None = None
    notify_sent: bool = False


class GrowthScanStore:
    def __init__(self) -> None:
        self._jobs: dict[str, GrowthScanJob] = {}
        self._lock = threading.Lock()

    def create(self, scan_id: str, url: str) -> GrowthScanJob:
        job = GrowthScanJob(scan_id=scan_id, url=url)
        with self._lock:
            self._jobs[scan_id] = job
        return job

    def get(self, scan_id: str) -> GrowthScanJob | None:
        with self._lock:
            return self._jobs.get(scan_id)

    def update(self, scan_id: str, **kwargs: Any) -> None:
        with self._lock:
            job = self._jobs.get(scan_id)
            if job:
                for k, v in kwargs.items():
                    setattr(job, k, v)


growth_scan_store = GrowthScanStore()
