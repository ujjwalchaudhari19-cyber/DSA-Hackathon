from decimal import ROUND_HALF_UP, Decimal


class FinanceError(ValueError):
    pass

def _r(x):  # round to whole rupee, half-up
    return float(Decimal(str(x)).quantize(Decimal(1), rounding=ROUND_HALF_UP))

def validate_loan(principal, annual_rate_pct, months, moratorium=0):
    if principal is None or principal <= 0:
        raise FinanceError("principal must be > 0")
    if not (0 <= annual_rate_pct <= 40):
        raise FinanceError("rate must be 0-40")
    if not (6 <= months <= 120):
        raise FinanceError("tenure must be 6-120 months")
    if not (0 <= moratorium < months):
        raise FinanceError("moratorium must be >=0 and < tenure")

def emi(principal, annual_rate_pct, months):
    r = annual_rate_pct / 12 / 100
    if r == 0:
        return principal / months
    f = (1 + r) ** months
    return principal * r * f / (f - 1)

def schedule(principal, annual_rate_pct, months, moratorium=0):
    validate_loan(principal, annual_rate_pct, months, moratorium)
    r = annual_rate_pct / 12 / 100
    repay_months = months - moratorium            # FIX: amortise only over repayment months
    e = _r(emi(principal, annual_rate_pct, repay_months))
    bal, rows = float(principal), []
    for m in range(1, months + 1):
        interest = bal * r
        if m <= moratorium:
            pay, princ = interest, 0.0
        elif m == months:                          # FIX: last instalment clears rounding drift
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
            "balance": round(max(bal, 0), 2)
        })
    return rows

def dscr(operating_profit_before_interest, annual_interest, annual_principal):
    """DSCR = cash available for debt service / debt service.
    Pass profit BEFORE interest (EBITDA-style) to avoid double-counting interest."""
    debt_service = annual_interest + annual_principal
    if debt_service <= 0:
        return None            # no loan -> caller treats as 'not applicable' (score 100)
    return operating_profit_before_interest / debt_service

def year1_debt_service(rows):
    y1 = rows[:12]
    return sum(r["interest"] for r in y1), sum(r["principal"] for r in y1)

