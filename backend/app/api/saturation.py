"""Saturation Score API — validate niche ideas and return go / no-go reports."""

from __future__ import annotations

import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.api.email_guard import check_email_domain
from app.saturation.leads import record_saturation_lead
from app.saturation.score import compute_saturation_report
from app.saturation.validate import validate_saturation_input

router = APIRouter(prefix="/saturation", tags=["saturation"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Soft floor so raw API users cannot skip the intentional “research” feel.
# Client also enforces ~15s staged UI; this is a light server-side pad.
_MIN_SCORE_SECONDS = 8.0


class ValidateRequest(BaseModel):
    input: str = Field(..., min_length=0, max_length=200)
    confirm_broad_theme: bool = False


class ValidateResponse(BaseModel):
    status: str
    level: int
    code: str
    message: str
    normalized_input: str = ""
    examples: list[str] = Field(default_factory=list)
    suggested_rewrite: str | None = None
    is_theme: bool = False


class ScoreRequest(BaseModel):
    input: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=5, max_length=254)
    confirm_broad_theme: bool = False

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        email = (v or "").strip().lower()
        if not _EMAIL_RE.match(email):
            raise ValueError("Enter a valid email address.")
        return email


class FactorOut(BaseModel):
    id: str
    label: str
    weight: float
    score: int
    detail: str


class ScoreResponse(BaseModel):
    input: str
    normalized_input: str
    score: int
    decision: str
    decision_label: str
    summary: str
    insight: str
    niche_down: list[str]
    factors: list[FactorOut]
    is_theme: bool
    level: int
    research: dict
    methodology_note: str
    data_mode: str
    bands: dict
    weights: dict


def _get_engine():
    from app.main import db_engine

    return db_engine


@router.post("/validate", response_model=ValidateResponse)
def validate_idea(body: ValidateRequest) -> ValidateResponse:
    result = validate_saturation_input(
        body.input,
        confirm_broad_theme=body.confirm_broad_theme,
    )
    return ValidateResponse(**result.to_dict())


@router.post("/score", response_model=ScoreResponse)
def score_idea(body: ScoreRequest) -> ScoreResponse:
    started = time.monotonic()

    # Block disposable / +alias abuse the same way as waitlist
    try:
        check_email_domain(body.email)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
        raise HTTPException(
            status_code=exc.status_code,
            detail={
                "message": detail.get("message")
                or "Please use a real email address.",
                "code": detail.get("error") or "email_blocked",
            },
        ) from exc

    validation = validate_saturation_input(
        body.input,
        confirm_broad_theme=body.confirm_broad_theme,
    )

    if validation.status == "reject":
        raise HTTPException(
            status_code=400,
            detail={
                "message": validation.message,
                "code": validation.code,
                "examples": validation.examples,
                "suggested_rewrite": validation.suggested_rewrite,
                "status": validation.status,
                "level": validation.level,
            },
        )

    if validation.status == "needs_confirm" and not body.confirm_broad_theme:
        raise HTTPException(
            status_code=422,
            detail={
                "message": validation.message,
                "code": validation.code,
                "examples": validation.examples,
                "suggested_rewrite": validation.suggested_rewrite,
                "status": validation.status,
                "level": validation.level,
                "is_theme": validation.is_theme,
                "normalized_input": validation.normalized_input,
            },
        )

    try:
        report = compute_saturation_report(
            body.input,
            confirm_broad_theme=body.confirm_broad_theme or validation.is_theme,
            validation=validation,
            use_live_research=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"message": str(exc)}) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail={"message": f"Scoring failed: {str(exc)[:180]}"},
        ) from exc

    payload = report.to_dict()

    # Best-effort lead capture
    try:
        record_saturation_lead(
            _get_engine(),
            email=body.email,
            idea=payload.get("normalized_input") or body.input,
            score=payload.get("score"),
            decision=payload.get("decision"),
            data_mode=payload.get("data_mode"),
        )
    except Exception:  # noqa: BLE001
        pass

    # Soft minimum duration (worker held briefly on purpose for product feel)
    elapsed = time.monotonic() - started
    if elapsed < _MIN_SCORE_SECONDS:
        time.sleep(_MIN_SCORE_SECONDS - elapsed)

    return ScoreResponse(**payload)
