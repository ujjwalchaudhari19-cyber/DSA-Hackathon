from math import inf


def rank_key(m):
    order = {"yes": 0, "partial": 1, "maybe": 2, "no": 3}
    return (
        order[m["eligible"]],
        -(m.get("subsidy_pct") or 0),
        m.get("interest_max") or inf,
        bool(m.get("collateral_required"))
    )

def evaluate(scheme: dict, profile: dict, gap: float, business: dict, capital: float, total: float, today_days_since_verified: int):
    reasons, missing, status, covers = [], [], "yes", None
    elig = scheme.get("eligibility", {})
    if business["sector"] not in scheme.get("sectors", []):
        return {**scheme, "eligible": "no", "reasons": ["Sector not covered"], "missing_info": []}
    if elig.get("women_only") and profile.get("gender") not in ("f", None):
        return {**scheme, "eligible": "no", "reasons": ["Scheme is for women applicants"], "missing_info": []}
    for need in elig.get("requires_fields", []):
        if profile.get(need) in (None, ""):
            missing.append(need)
    min_age = elig.get("min_age")
    if min_age and profile.get("age") is not None and profile["age"] < min_age:
        return {**scheme, "eligible": "no", "reasons": [f"Minimum age {min_age}"], "missing_info": []}
    max_loan = scheme.get("max_loan")
    if max_loan and gap > max_loan:
        status, covers = "partial", max_loan
        reasons.append("Covers only part of the gap")
    own_pct = elig.get("own_contribution_pct")
    if own_pct and total and capital < total * own_pct / 100:
        status = "maybe" if status == "yes" else status
        missing.append("own_contribution_too_low")
    if missing and status == "yes":
        status = "maybe"
    if today_days_since_verified > 90:
        reasons.append("verify_on_portal")
    return {
        **scheme,
        "eligible": status,
        "reasons": reasons,
        "missing_info": missing,
        "covers": covers,
        "uncovered_gap": (gap - covers) if covers else 0
    }

def match(schemes, profile, gap, business, capital, total, verified_age_days):
    out = [evaluate(s, profile, gap, business, capital, total, verified_age_days.get(s["id"], 0)) for s in schemes]
    out.sort(key=rank_key)
    if not any(m["eligible"] in ("yes", "partial") for m in out):
        return out, ["shg_bank_linkage", "co_applicant", "reduce_scale", "microfinance_or_nbfc", "family_support"]
    return out, []

