"""Transparent feasibility scoring engine.

Formula:
  score = Σ(re-normalized weight_i × factor_score_i) where each factor_score_i ∈ [0, 100].
Weights:
  - market (25%): Local demand and competitor density factor from local_market.json.
  - capital (20%): capital_ratio clamped to [0, 1], score = ratio * 100.
  - repayment (25%): Linear interpolation of DSCR from 0.8 (0%) to 1.5 (100%).
                    If self-funded (gap == 0 or capital_ratio >= 1.0):
                      base annual net profit <= 0 -> 0;
                      base > 0 but pessimistic <= 0 -> 50;
                      both > 0 -> 100.
  - breakeven (15%): 100 if <= 12 months, 0 if >= 48 months or never, linear between 12 and 48.
  - risk (15%): severity low=1, medium=2, high=3.
                risk_score = 100 - ((weighted_avg_severity - 1) / 2) * 100.
                (For 0-100 scale, risk_score = 100 - risk_severity).

Any factor that is None or NaN is dropped and remaining weights are re-normalised
to sum to 1.0, with factors_missing reported in the result.

Verdicts:
  ≥ 75: highly_feasible
  55–74.99: feasible_with_conditions
  40–54.99: risky
  < 40: not_recommended
"""

from __future__ import annotations

import math
from typing import Any, Union

from app.schemas.operator2 import ScoreInput, ScoreResult
from app.utils.errors import CalcInputError

WEIGHTS = {
    "market": 0.25,
    "capital": 0.20,
    "repayment": 0.25,
    "breakeven": 0.15,
    "risk": 0.15,
}


def clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, val))


_clamp = clamp


def _linear(value: float, low: float, high: float) -> float:
    if high <= low:
        return 0.0
    return _clamp((value - low) * 100.0 / (high - low))


def _is_none_or_nan(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, (int, float)) and math.isnan(val):
        return True
    return False


# Operator 1 functional helpers:
def capital_factor(capital: float, total: float) -> float:
    if total <= 0:
        raise ValueError("total investment must be > 0")
    return _clamp(capital / total * 200.0)


def repayment_factor(dscr_value: float | None) -> float:
    if dscr_value is None:
        return 100.0
    return _clamp((dscr_value - 0.8) / (1.5 - 0.8) * 100.0)


def breakeven_factor(months: float | None) -> float:
    if months is None:
        return 0.0
    if months <= 12:
        return 100.0
    if months >= 48:
        return 0.0
    return _clamp(100.0 - (months - 12.0) / 36.0 * 100.0)


def break_even_months(total_investment: float, monthly_profit_12: list[float], horizon: int = 60) -> int | None:
    if len(monthly_profit_12) != 12:
        raise ValueError("need 12 monthly values")
    if all(p <= 0 for p in monthly_profit_12):
        return None
    cum = 0.0
    for m in range(horizon):
        cum += monthly_profit_12[m % 12]
        if cum >= total_investment:
            return m + 1
    return None


def verdict(score: float) -> str:
    if score >= 75.0:
        return "highly_feasible"
    if score >= 55.0:
        return "feasible_with_conditions"
    if score >= 40.0:
        return "risky"
    return "not_recommended"


def feasibility_score(data: Union[ScoreInput, dict[str, Any]]) -> Union[ScoreResult, dict[str, Any]]:
    """Map explainable financial factors to the published weighted score.
    
    Accepts either Operator 2's ScoreInput Pydantic model (returning ScoreResult)
    or Operator 1's dict of factors {market, capital, repayment, breakeven, risk} (returning dict).
    """
    if isinstance(data, dict):
        missing = set(WEIGHTS) - set(data)
        if missing:
            raise KeyError(f"missing factors: {missing}")
        for k, v in data.items():
            if v is None or (isinstance(v, float) and math.isnan(v)):
                raise ValueError(f"bad factor {k}")
        s = round(sum(WEIGHTS[k] * _clamp(data[k]) for k in WEIGHTS))
        return {"score": s, "verdict": verdict(s)}

    # Pydantic ScoreInput path
    factor_scores: dict[str, float] = {}
    factors_missing: list[str] = []

    # 1. Market factor
    if _is_none_or_nan(data.market_score):
        factors_missing.append("market")
    else:
        factor_scores["market"] = round(_clamp(float(data.market_score)), 2)

    # 2. Capital adequacy factor (capital_ratio clamped to [0,1], score = ratio * 100)
    if _is_none_or_nan(data.capital_ratio):
        factors_missing.append("capital")
    else:
        clamped_ratio = min(1.0, max(0.0, float(data.capital_ratio)))
        factor_scores["capital"] = round(clamped_ratio * 100.0, 2)

    # 3. Repayment strength factor
    if not _is_none_or_nan(data.dscr):
        factor_scores["repayment"] = round(_linear(float(data.dscr), 0.8, 1.5), 2)
    elif data.capital_ratio is not None and data.capital_ratio >= 1.0:
        # Self-funded path
        base_p = getattr(data, "base_annual_net_profit", None)
        pess_p = getattr(data, "pessimistic_annual_net_profit", None)
        if base_p is not None:
            if base_p <= 0:
                factor_scores["repayment"] = 0.0
            elif (pess_p is not None and pess_p <= 0) or (pess_p is None and base_p * 0.8 <= 0):
                factor_scores["repayment"] = 50.0
            else:
                factor_scores["repayment"] = 100.0
        else:
            factor_scores["repayment"] = 100.0
    else:
        # Loan needed but debt service profile not established
        factors_missing.append("repayment")

    # 4. Break-even speed factor
    if _is_none_or_nan(data.break_even_months):
        factors_missing.append("breakeven")
    else:
        b_val = float(data.break_even_months)
        if b_val <= 0 or b_val >= 48:
            factor_scores["breakeven"] = 0.0
        elif b_val <= 12:
            factor_scores["breakeven"] = 100.0
        else:
            factor_scores["breakeven"] = round(_clamp(100.0 - ((b_val - 12.0) * 100.0 / 36.0)), 2)

    # 5. Risk mitigation factor
    if _is_none_or_nan(data.risk_severity):
        factors_missing.append("risk")
    else:
        s = float(data.risk_severity)
        if s <= 3.0:
            # Low=1, Medium=2, High=3
            r_score = 100.0 - ((s - 1.0) / 2.0) * 100.0
        else:
            # 0-100 severity scale
            r_score = 100.0 - s
        factor_scores["risk"] = round(_clamp(r_score), 2)

    # Re-normalize remaining weights to sum to 1
    active_weights_sum = sum(WEIGHTS[name] for name in factor_scores)
    if active_weights_sum > 0:
        raw_score = sum((WEIGHTS[name] / active_weights_sum) * factor_scores[name] for name in factor_scores)
    else:
        raw_score = 0.0

    score = round(_clamp(raw_score), 2)
    verdict_label = verdict(score)

    return ScoreResult(
        score=score,
        verdict_label=verdict_label,
        factor_scores=factor_scores,
        factors_missing=factors_missing,
    )
