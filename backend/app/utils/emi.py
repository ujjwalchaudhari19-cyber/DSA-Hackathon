"""Loan repayment calculations. Monetary amounts are rounded only at API boundaries."""

from __future__ import annotations

import os
from decimal import Decimal, ROUND_HALF_UP, getcontext
from typing import Any

from app.schemas.operator2 import AmortisationRow, EmiRequest, Repayment
from app.utils.errors import CalcInputError

getcontext().prec = 28


# Operator 1 Compatibility Class
class FinanceError(ValueError):
    """Raised by Operator 1 tests for loan validation errors."""
    pass


def get_max_loan_amount() -> float:
    fallback = float(os.getenv("MAX_LOAN_AMOUNT", "50000000"))
    try:
        from app.services.data_store import load_dataset
        schemes = load_dataset("schemes.json").get("schemes", [])
        max_scheme = max((s.get("max_gap", 0) for s in schemes), default=0)
        return float(max(max_scheme, fallback))
    except Exception:
        return fallback


def calculate_emi(principal: float, annual_rate_pct: float, months: int) -> float:
    if months <= 0:
        raise CalcInputError("Loan repayment months must be greater than 0.")
    if principal <= 0:
        raise CalcInputError("Principal must be greater than 0.")

    max_cap = get_max_loan_amount()
    if principal > max_cap:
        raise CalcInputError(f"Principal ₹{principal:,.0f} exceeds maximum scheme ceiling of ₹{max_cap:,.0f}.")

    P = Decimal(str(principal))
    r_annual = Decimal(str(annual_rate_pct))
    r = r_annual / Decimal("1200")

    if r == Decimal("0"):
        emi = P / Decimal(str(months))
    else:
        factor = (Decimal("1") + r) ** months
        emi = P * r * factor / (factor - Decimal("1"))

    return float(emi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


# Operator 1 aliases & functions
def _r(x: Any) -> float:  # round to whole rupee, half-up
    return float(Decimal(str(x)).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def validate_loan(principal: float, annual_rate_pct: float, months: int, moratorium: int = 0) -> None:
    if principal is None or principal <= 0:
        raise FinanceError("principal must be > 0")
    if not (0 <= annual_rate_pct <= 40):
        raise FinanceError("rate must be 0-40")
    if not (6 <= months <= 120):
        raise FinanceError("tenure must be 6-120 months")
    if not (0 <= moratorium < months):
        raise FinanceError("moratorium must be >=0 and < tenure")


def emi(principal: float, annual_rate_pct: float, months: int) -> float:
    r = annual_rate_pct / 12 / 100
    if r == 0:
        return principal / months
    f = (1 + r) ** months
    return principal * r * f / (f - 1)


def schedule(principal: float, annual_rate_pct: float, months: int, moratorium: int = 0) -> list[dict[str, Any]]:
    validate_loan(principal, annual_rate_pct, months, moratorium)
    r = annual_rate_pct / 12 / 100
    repay_months = months - moratorium
    e = _r(emi(principal, annual_rate_pct, repay_months))
    bal, rows = float(principal), []
    for m in range(1, months + 1):
        interest = bal * r
        if m <= moratorium:
            pay, princ = interest, 0.0
        elif m == months:
            princ = bal
            pay = princ + interest
        else:
            princ = e - interest
            pay = e
        bal -= princ
        rows.append({
            "month": m,
            "payment": round(pay, 2),
            "interest": round(interest, 2),
            "principal": round(princ, 2),
            "balance": round(max(bal, 0), 2),
        })
    return rows


def dscr(operating_profit_before_interest: float, annual_interest: float, annual_principal: float) -> float | None:
    debt_service = annual_interest + annual_principal
    if debt_service <= 0:
        return None
    return operating_profit_before_interest / debt_service


def year1_debt_service(rows: list[dict[str, Any]]) -> tuple[float, float]:
    y1 = rows[:12]
    return sum(r["interest"] for r in y1), sum(r["principal"] for r in y1)


def repayment_plan(request: EmiRequest) -> Repayment:
    repayment_months = request.tenure_months - request.moratorium_months
    if repayment_months <= 0:
        raise CalcInputError("tenure_months must be greater than moratorium_months.")
    if request.moratorium_months >= request.tenure_months:
        raise CalcInputError("moratorium_months must be strictly less than tenure_months.")

    max_cap = get_max_loan_amount()
    if request.principal > max_cap:
        raise CalcInputError(f"Principal ₹{request.principal:,.0f} exceeds maximum scheme ceiling of ₹{max_cap:,.0f}.")

    P = Decimal(str(request.principal))
    r_annual = Decimal(str(request.annual_rate_pct))
    r = r_annual / Decimal("1200")
    repay_m = repayment_months

    if r == Decimal("0"):
        emi_dec = P / Decimal(str(repay_m))
    else:
        factor = (Decimal("1") + r) ** repay_m
        emi_dec = P * r * factor / (factor - Decimal("1"))

    balance_dec = P
    rows: list[AmortisationRow] = []

    # Moratorium phase (interest-only)
    for month in range(1, request.moratorium_months + 1):
        interest_dec = balance_dec * r
        rows.append(
            AmortisationRow(
                month=month,
                payment=float(interest_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                principal_paid=0.0,
                interest_paid=float(interest_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                balance=float(balance_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                phase="moratorium",
            )
        )

    # Repayment phase
    emi_quantized = emi_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    for payment_number in range(1, repay_m + 1):
        month = request.moratorium_months + payment_number
        interest_dec = (balance_dec * r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if payment_number == repay_m:
            # Last installment absorbs rounding discrepancies; balance becomes exactly zero
            principal_paid_dec = balance_dec
            payment_dec = principal_paid_dec + interest_dec
            balance_dec = Decimal("0.00")
        else:
            principal_paid_dec = emi_quantized - interest_dec
            payment_dec = emi_quantized
            balance_dec = max(Decimal("0.00"), balance_dec - principal_paid_dec)

        rows.append(
            AmortisationRow(
                month=month,
                payment=float(payment_dec),
                principal_paid=float(principal_paid_dec),
                interest_paid=float(interest_dec),
                balance=float(balance_dec),
                phase="repayment",
            )
        )

    total_interest = sum(row.interest_paid for row in rows)
    first_year_rows = rows[:12]
    annual_debt_service = sum(row.payment for row in first_year_rows)
    annual_interest = sum(row.interest_paid for row in first_year_rows)

    dscr_val = None
    if annual_debt_service > 0:
        dscr_val = (request.annual_net_profit + request.annual_depreciation + annual_interest) / annual_debt_service

    emi_rounded = float(emi_dec.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    average_monthly_profit = request.annual_net_profit / 12
    affordable = bool(
        dscr_val is not None
        and dscr_val >= 1.25
        and average_monthly_profit > 0
        and emi_rounded <= (average_monthly_profit * 0.5)
    )

    # Pessimistic scenario (-20% profit)
    pessimistic_annual_profit = request.annual_net_profit * 0.80
    pessimistic_monthly_profit = pessimistic_annual_profit / 12
    dscr_pess = None
    if annual_debt_service > 0:
        dscr_pess = (pessimistic_annual_profit + request.annual_depreciation + annual_interest) / annual_debt_service

    affordable_pessimistic = bool(
        dscr_pess is not None
        and dscr_pess >= 1.25
        and pessimistic_monthly_profit > 0
        and emi_rounded <= (pessimistic_monthly_profit * 0.5)
    )

    return Repayment(
        emi=emi_rounded,
        total_interest=round(total_interest, 2),
        total_payment=round(sum(row.payment for row in rows), 2),
        annual_debt_service=round(annual_debt_service, 2),
        dscr=round(dscr_val, 2) if dscr_val is not None else None,
        affordable=affordable,
        affordable_pessimistic=affordable_pessimistic,
        schedule=rows,
    )
