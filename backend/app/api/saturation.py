"""Saturation Score API — validate niche ideas and return go / no-go reports."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.saturation.score import compute_saturation_report
from app.saturation.validate import validate_saturation_input

router = APIRouter(prefix="/saturation", tags=["saturation"])


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
    confirm_broad_theme: bool = False


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


@router.post("/validate", response_model=ValidateResponse)
def validate_idea(body: ValidateRequest) -> ValidateResponse:
    result = validate_saturation_input(
        body.input,
        confirm_broad_theme=body.confirm_broad_theme,
    )
    return ValidateResponse(**result.to_dict())


@router.post("/score", response_model=ScoreResponse)
def score_idea(body: ScoreRequest) -> ScoreResponse:
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

    return ScoreResponse(**report.to_dict())
