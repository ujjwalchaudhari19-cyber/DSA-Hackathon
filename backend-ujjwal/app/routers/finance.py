from fastapi import APIRouter, HTTPException

from app.schemas.operator2 import (
    EmiRequest,
    FundingGap,
    GapRequest,
    Investment,
    InvestmentRequest,
    Projection,
    ProjectionRequest,
    Repayment,
)
from app.services.finance_service import funding_gap, projection
from app.services.investment_service import estimate_investment
from app.utils.emi import repayment_plan

from app.utils.errors import CalcInputError

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


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
