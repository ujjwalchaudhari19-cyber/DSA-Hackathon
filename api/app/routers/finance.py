from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.operator2 import (
    EmiRequest,
    FundingGap,
    GapRequest,
    Investment,
    InvestmentRequest,
    Projection,
    ProjectionRequest,
    Repayment,
    Scale,
)
from app.services.data_store import business_by_id, load_dataset
from app.services.finance_service import funding_gap, projection
from app.services.investment_service import estimate_investment
from app.services.local_market_service import get_local_market
from app.utils.emi import repayment_plan
from app.utils.errors import CalcInputError

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])

# ---------------------------------------------------------------------------
# Dynamic business-items endpoint  (replaces all hardcoded BUSINESS_ITEMS in
# the frontend – the JSON data / data_store is the single source of truth)
# ---------------------------------------------------------------------------

@router.get("/business-items")
def business_items(
    business_id: str = Query(..., description="Canonical business type key"),
    scale: str = Query("small", description="Scale: small | medium | large"),
    district: str = Query("fallback", description="District for local price factor"),
) -> dict[str, Any]:
    """
    Return the investment line-items for *any* business type at the requested
    scale, expressed in INR and ready to drop straight into the FinancePage
    investment table.  Items are sourced from businesses.json cost_template
    (or the in-code commercial_transport stub) – no front-end hardcoding
    required.
    """
    try:
        from app.schemas.operator2 import Idea
        scale_val = scale if scale in ("small", "medium", "large") else "small"
        idea = Idea(business_id=business_id, scale=Scale(scale_val))
        local_data = get_local_market(district, business_id)
        investment = estimate_investment(idea, local_data)

        business = business_by_id(business_id)
        revenue_model = business.get("revenue_model", {})
        scale_key = scale_val
        monthly_revenue = (
            revenue_model.get("unit_price", 0)
            * revenue_model.get("units_per_month_by_scale", {}).get(scale_key, 0)
            * local_data.price_factor
        )
        variable_cost_pct = revenue_model.get("variable_cost_pct", 0.5)
        fixed_opex = revenue_model.get("fixed_opex_monthly", 0)
        monthly_net_profit = round(
            monthly_revenue * (1 - variable_cost_pct) - fixed_opex
        )

        return {
            "business_id": business_id,
            "business_name": business.get("name", business_id),
            "scale": scale_val,
            "district": district,
            "items": [
                {
                    "key": it.key,
                    "name": it.item,
                    "qty": it.quantity,
                    "unit_cost": it.unit_cost,
                    "total": it.line_total,
                    "category": it.category,
                }
                for it in investment.items
            ],
            "fixed_cost": investment.fixed_cost,
            "working_capital": investment.working_capital,
            "contingency": investment.contingency,
            "total_investment": investment.total_investment,
            "local_price_factor": investment.local_price_factor,
            "monthly_net_profit_estimate": monthly_net_profit,
            "warnings": investment.warnings,
        }
    except CalcInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/monthly-profit/{business_id}")
def monthly_profit(
    business_id: str,
    scale: str = Query("small", description="Scale: small | medium | large"),
    district: str = Query("fallback", description="District for local price factor"),
) -> dict[str, Any]:
    """
    Return the expected monthly net profit for a business type at a given
    scale and district.  Used by FinancePage DSCR calculation and
    DashboardPage charts – replaces the frontend MONTHLY_PROFIT_BY_BUSINESS
    hardcoded lookup table.
    """
    try:
        scale_val = scale if scale in ("small", "medium", "large") else "small"
        business = business_by_id(business_id)
        local_data = get_local_market(district, business_id)
        revenue_model = business.get("revenue_model", {})

        monthly_revenue = (
            revenue_model.get("unit_price", 0)
            * revenue_model.get("units_per_month_by_scale", {}).get(scale_val, 0)
            * local_data.price_factor
        )
        variable_cost_pct = revenue_model.get("variable_cost_pct", 0.5)
        fixed_opex = revenue_model.get("fixed_opex_monthly", 0)
        monthly_net = round(monthly_revenue * (1 - variable_cost_pct) - fixed_opex)

        # Build 12-month seasonality projection
        seasonality = business.get("seasonality", [1.0] * 12)
        monthly_data = [
            {
                "month": i + 1,
                "net_profit": round(monthly_net * seasonality[i]),
                "revenue": round(monthly_revenue * seasonality[i]),
            }
            for i in range(12)
        ]

        return {
            "business_id": business_id,
            "business_name": business.get("name", business_id),
            "scale": scale_val,
            "district": district,
            "monthly_net_profit": monthly_net,
            "annual_net_profit": monthly_net * 12,
            "monthly_breakdown": monthly_data,
        }
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/investment")
def investment(request: InvestmentRequest) -> Investment:
    try:
        return estimate_investment(request)
    except CalcInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc



@router.post("/gap")
def gap(request: GapRequest) -> FundingGap:
    try:
        return funding_gap(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/projection")
def projections(request: ProjectionRequest) -> Projection:
    try:
        return projection(request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/emi")
def emi(request: EmiRequest) -> Repayment:
    try:
        return repayment_plan(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
