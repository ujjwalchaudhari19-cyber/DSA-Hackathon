from __future__ import annotations

import math

from app.schemas.operator2 import EmiRequest, GapRequest, Idea, InvestmentRequest, ProjectionRequest, Scale
from app.services.finance_service import funding_gap, projection
from app.services.investment_service import estimate_investment
from app.utils.emi import repayment_plan
from app.utils.scoring import WEIGHTS, feasibility_score
from app.schemas.operator2 import ScoreInput


def dairy_investment():
    return estimate_investment(InvestmentRequest(idea=Idea(business_id="dairy_small", scale=Scale.small), district="Nashik"))


def test_investment_totals_reconcile_and_contingency_is_once():
    investment = dairy_investment()
    assert investment.total_investment == sum(item.line_total for item in investment.items)
    assert len([item for item in investment.items if item.category == "contingency"]) == 1
    assert investment.contingency == round((investment.fixed_cost + investment.working_capital) * 0.10, 2)


def test_gap_is_zero_for_self_funding():
    result = funding_gap(GapRequest(total_investment=100_000, capital=120_000))
    assert result.funding_gap == 0
    assert result.self_funded is True


def test_projection_has_three_scenarios_and_seasonality():
    investment = dairy_investment()
    report = projection(ProjectionRequest(idea=Idea(business_id="dairy_small"), district="Nashik", investment=investment))
    assert len(report.base.monthly) == 12
    assert report.pessimistic.annual_net_profit < report.base.annual_net_profit < report.optimistic.annual_net_profit
    assert report.base.monthly[0].revenue != report.base.monthly[5].revenue


def test_zero_rate_emi_and_moratorium_principal_reconcile():
    zero_rate = repayment_plan(EmiRequest(principal=120_000, annual_rate_pct=0, tenure_months=12, annual_net_profit=300_000))
    assert zero_rate.emi == 10_000
    loan = repayment_plan(EmiRequest(principal=100_000, annual_rate_pct=12, tenure_months=14, moratorium_months=2, annual_net_profit=300_000))
    assert math.isclose(sum(row.principal_paid for row in loan.schedule), 100_000, abs_tol=0.02)
    assert loan.schedule[0].phase == "moratorium"
    assert loan.schedule[-1].balance == 0


def test_scoring_weights_and_thresholds():
    assert sum(WEIGHTS.values()) == 1
    high = feasibility_score(ScoreInput(market_score=90, capital_ratio=1, dscr=1.5, break_even_months=12, risk_severity=10))
    low = feasibility_score(ScoreInput(market_score=0, capital_ratio=0, dscr=0.8, break_even_months=48, risk_severity=100))
    assert high.verdict_label == "highly_feasible"
    assert low.verdict_label == "not_recommended"
