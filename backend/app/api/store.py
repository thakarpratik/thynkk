"""In-process scan job store. Replace with Postgres/Redis when scaling."""

import threading
from dataclasses import dataclass, field
from typing import Any

from app.api.models import ScanStatus


@dataclass
class ScanJob:
    scan_id: str
    query: str
    status: ScanStatus = ScanStatus.queued
    result: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    from_cache: bool = False


class ScanStore:
    def __init__(self) -> None:
        self._jobs: dict[str, ScanJob] = {}
        self._lock = threading.Lock()

    def create(self, scan_id: str, query: str) -> ScanJob:
        job = ScanJob(scan_id=scan_id, query=query)
        with self._lock:
            self._jobs[scan_id] = job
        return job

    def get(self, scan_id: str) -> ScanJob | None:
        with self._lock:
            return self._jobs.get(scan_id)

    def update(self, scan_id: str, **kwargs: Any) -> None:
        with self._lock:
            job = self._jobs.get(scan_id)
            if job:
                for k, v in kwargs.items():
                    setattr(job, k, v)


# Singleton — one store per process
scan_store = ScanStore()
