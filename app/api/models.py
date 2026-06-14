from enum import Enum
from pydantic import BaseModel


class ScanStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class ScanRequest(BaseModel):
    query: str
    post_limit: int = 100


class ScanCreated(BaseModel):
    scan_id: str


class ScanStatusResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    query: str
    error: str | None = None


class QuoteOut(BaseModel):
    excerpt: str
    permalink: str


class ThemeOut(BaseModel):
    name: str
    summary: str
    opportunity: str
    severity_score: int
    mention_count: int
    demand_score: float
    verdict: str = "Unknown"
    willingness_to_pay: str = "Unknown"
    willingness_reason: str = ""
    competition: str = ""
    next_step: str = ""
    quotes: list[QuoteOut]


class ScanReport(BaseModel):
    scan_id: str
    query: str
    themes: list[ThemeOut]
    from_cache: bool = False
