import math

WEIGHTS = {"market": .25, "capital": .20, "repayment": .25, "breakeven": .15, "risk": .15}
assert abs(sum(WEIGHTS.values()) - 1) < 1e-9

def clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))

def capital_factor(capital, total):
    if total <= 0:
        raise ValueError("total investment must be > 0")
    return clamp(capital / total * 200)

def repayment_factor(dscr_value):
    if dscr_value is None:           # no loan needed
        return 100
    return clamp((dscr_value - 0.8) / (1.5 - 0.8) * 100)

def breakeven_factor(months):
    if months is None:               # never breaks even within horizon
        return 0
    if months <= 12:
        return 100
    if months >= 48:
        return 0
    return clamp(100 - (months - 12) / 36 * 100)

def break_even_months(total_investment, monthly_profit_12, horizon=60):
    """monthly_profit_12: list of 12 base-year monthly profits; repeats cyclically for later years."""
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

def verdict(score):
    return ("highly_feasible" if score >= 75 else "feasible_with_conditions" if score >= 55
            else "risky" if score >= 40 else "not_recommended")

def feasibility_score(f):
    missing = set(WEIGHTS) - set(f)
    if missing:
        raise KeyError(f"missing factors: {missing}")
    for k, v in f.items():
        if v is None or (isinstance(v, float) and math.isnan(v)):
            raise ValueError(f"bad factor {k}")
    s = round(sum(WEIGHTS[k] * clamp(f[k]) for k in WEIGHTS))
    return {"score": s, "verdict": verdict(s)}

