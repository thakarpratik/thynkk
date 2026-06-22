import re
from enum import Enum
from pydantic import BaseModel, field_validator

# Subreddit name or freetext keyword, no prompt-injection payloads
_QUERY_CLEAN = re.compile(r"[^\w\s/\-\.]")
_MAX_QUERY_LEN = 100


class ScanStatus(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class ScanRequest(BaseModel):
    query: str
    post_limit: int = 100

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query cannot be empty")
        if len(v) > _MAX_QUERY_LEN:
            raise ValueError(f"query too long (max {_MAX_QUERY_LEN} chars)")
        # Strip characters that have no business in a subreddit name or keyword
        cleaned = _QUERY_CLEAN.sub("", v).strip()
        if not cleaned:
            raise ValueError("query contains no valid characters")
        return cleaned

    @field_validator("post_limit")
    @classmethod
    def clamp_post_limit(cls, v: int) -> int:
        return max(10, min(v, 200))


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
    demand_label: str | None = None
    severity_label: str | None = None
    locked: bool = False


class ScanReport(BaseModel):
    scan_id: str
    query: str
    themes: list[ThemeOut]
    total_themes: int = 0
    from_cache: bool = False
