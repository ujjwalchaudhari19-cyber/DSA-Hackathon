from __future__ import annotations

from typing import Any

from app.schemas.operator2 import (
    EmiRequest,
    FundingGap,
    GapRequest,
    Idea,
    Investment,
    LocalData,
    Projection,
    ProjectionMonth,
    ProjectionRequest,
    ProjectionScenario,
    Repayment,
)
from app.services.data_store import business_by_id
from app.services.local_market_service import get_local_market
from app.utils.emi import repayment_plan as calculate_repayment_plan
from app.utils.errors import CalcInputError





def funding_gap(request_or_total: GapRequest | float, capital: float | None = None) -> FundingGap:
    if isinstance(request_or_total, GapRequest):
        tot = request_or_total.total_investment
        cap = request_or_total.capital
    else:
        tot = float(request_or_total)
        cap = float(capital if capital is not None else 0.0)

    if tot <= 0:
        raise CalcInputError("total_investment must be positive")


    gap = max(0.0, tot - cap)
    ratio = cap / tot
    return FundingGap(
        funding_gap=round(gap, 2),
        capital_ratio=round(ratio, 4),
        self_funded=cap >= tot,
    )


def projection(
    request_or_idea: ProjectionRequest | Idea,
    local_or_district: LocalData | dict[str, Any] | str | None = None,
    investment: Investment | None = None,
) -> Projection:
    if isinstance(request_or_idea, ProjectionRequest):
        idea = request_or_idea.idea
        district = request_or_idea.district
        inv = request_or_idea.investment
        local = get_local_market(district, idea.business_id)
    else:
        idea = request_or_idea
        if isinstance(local_or_district, LocalData):
            local = local_or_district
        elif isinstance(local_or_district, dict):
            local = LocalData(**local_or_district)
        elif isinstance(local_or_district, str):
            local = get_local_market(local_or_district, idea.business_id)
        else:
            local = get_local_market("fallback", idea.business_id)
        if investment is None:
            from app.services.investment_service import estimate_investment
            inv = estimate_investment(idea, local)
        else:
            inv = investment

    business = business_by_id(idea.business_id)
    model = business["revenue_model"]
    base_revenue = model["unit_price"] * model["units_per_month_by_scale"][idea.scale.value] * local.price_factor

    def build(name: str, multiplier: float) -> ProjectionScenario:
        monthly: list[ProjectionMonth] = []
        cumulative_profit = 0.0
        break_even: int | None = None
        for index, seasonal_factor in enumerate(business["seasonality"], start=1):
            revenue = base_revenue * seasonal_factor * multiplier
            variable_cost = revenue * model["variable_cost_pct"]
            net_profit = revenue - variable_cost - model["fixed_opex_monthly"]
            cumulative_profit += net_profit
            if break_even is None and cumulative_profit >= inv.total_investment:
                break_even = index
            monthly.append(
                ProjectionMonth(
                    month=index,
                    revenue=round(revenue, 2),
                    variable_cost=round(variable_cost, 2),
                    fixed_opex=model["fixed_opex_monthly"],
                    net_profit=round(net_profit, 2),
                )
            )
        return ProjectionScenario(
            name=name,
            monthly=monthly,
            annual_net_profit=round(sum(row.net_profit for row in monthly), 2),
            break_even_months=break_even,
        )

    return Projection(
        base=build("base", 1.0),
        pessimistic=build("pessimistic", 0.80),
        optimistic=build("optimistic", 1.15),
    )


def repayment_plan(
    request_or_loan: EmiRequest | float,
    rate: float | None = None,
    months: int | None = None,
    projection_or_profit: Projection | float | None = None,
) -> Repayment:
    if isinstance(request_or_loan, EmiRequest):
        return calculate_repayment_plan(request_or_loan)

    principal = float(request_or_loan)
    annual_rate_pct = float(rate if rate is not None else 10.0)
    tenure_months = int(months if months is not None else 60)

    if isinstance(projection_or_profit, Projection):
        annual_profit = projection_or_profit.base.annual_net_profit
    elif isinstance(projection_or_profit, (int, float)):
        annual_profit = float(projection_or_profit)
    else:
        annual_profit = 200_000.0

    req = EmiRequest(
        principal=principal,
        annual_rate_pct=annual_rate_pct,
        tenure_months=tenure_months,
        annual_net_profit=max(0.0, annual_profit),
    )
    return calculate_repayment_plan(req)
