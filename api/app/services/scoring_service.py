"""Scoring service owned by Operator 2.

Exposes explainable feasibility score calculation and market factor extraction.
"""

from __future__ import annotations

from typing import Any

from app.schemas.operator2 import LocalData, ScoreInput, ScoreResult
from app.utils.scoring import WEIGHTS, feasibility_score as compute_score


def market_factor(local: LocalData | dict[str, Any]) -> float:
    """Extract or calculate normalized market score factor from local market data."""
    if isinstance(local, LocalData):
        return local.market_score
    return float(local.get("market_score", 50.0))


def feasibility_score(factors: ScoreInput | dict[str, Any]) -> ScoreResult:
    """Calculate transparent feasibility score."""
    if isinstance(factors, dict):
        score_input = ScoreInput(**factors)
    else:
        score_input = factors
    return compute_score(score_input)

