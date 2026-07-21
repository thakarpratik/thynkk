"""Niche Saturation Score — pre-launch go / no-go analysis."""

from app.saturation.validate import validate_saturation_input
from app.saturation.score import compute_saturation_report

__all__ = [
    "validate_saturation_input",
    "compute_saturation_report",
]
