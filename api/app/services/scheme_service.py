from __future__ import annotations

from typing import Any

from app.schemas.operator2 import (
    Idea,
    Profile,
    SchemeMatch,
    SchemeMatchRequest,
    SchemeMatchResponse,
)
from app.services.data_store import business_by_id, load_dataset

FALLBACK_OPTIONS = [
    "Explore DAY-NRLM SHG-bank linkage route if eligible for women group-credit.",
    "Consider an eligible co-applicant with documented income or collateral.",
    "Scale down the starting equipment/inventory to lower the funding gap into Mudra Shishu/Kishore limits.",
    "Compare regulated microfinance/NBFC options, evaluating total borrowing cost and annual percentage rate (APR).",
]


def match_schemes(
    request_or_profile: SchemeMatchRequest | Profile,
    gap: float | None = None,
    idea: Idea | None = None,
) -> SchemeMatchResponse:
    if isinstance(request_or_profile, SchemeMatchRequest):
        profile = request_or_profile.profile
        funding_gap = request_or_profile.funding_gap
        biz_idea = request_or_profile.idea
    else:
        profile = request_or_profile
        funding_gap = float(gap if gap is not None else 0.0)
        biz_idea = idea or Idea(business_id="dairy_small")

    sector = business_by_id(biz_idea.business_id)["sector"]
    if funding_gap <= 0:
        return SchemeMatchResponse(
            matches=[],
            fallback_options=["Self-funded: sufficient capital available, external loan schemes not required."],
        )

    matches: list[SchemeMatch] = []
    schemes_data = load_dataset("schemes.json")["schemes"]


    for scheme in schemes_data:
        reasons: list[str] = []
        missing: list[str] = []
        hard_failures: list[str] = []

        # 1. Sector
        if sector not in scheme.get("sectors", []):
            hard_failures.append(f"Business sector '{sector}' is not covered by this scheme.")

        # 2. Age
        min_age = scheme.get("min_age", 18)
        max_age = scheme.get("max_age", 70)
        if profile.age < min_age:
            hard_failures.append(f"Applicant age ({profile.age}) is below minimum requirement of {min_age} years.")
        if profile.age > max_age:
            hard_failures.append(f"Applicant age ({profile.age}) exceeds maximum limit of {max_age} years.")

        # 3. Funding gap bounds
        min_gap = scheme.get("min_gap", 0)
        max_gap = scheme.get("max_gap", 100_000_000)
        if funding_gap > max_gap:
            hard_failures.append(f"Funding gap of ₹{funding_gap:,.0f} exceeds maximum scheme ceiling of ₹{max_gap:,.0f}.")
        elif funding_gap < min_gap and funding_gap > 0:
            hard_failures.append(f"Funding gap of ₹{funding_gap:,.0f} is below minimum project size of ₹{min_gap:,.0f}.")

        # 4. Gender
        if getattr(profile, "gender", None) is None:
            if scheme.get("requires_woman", False):
                missing.append("Applicant gender not specified; required for woman entrepreneur verification.")
        elif scheme.get("requires_woman", False) and profile.gender != "f":
            hard_failures.append("This scheme route is dedicated exclusively to women entrepreneurs.")

        # 5. Social Category
        allowed_categories = scheme.get("categories", ["general", "obc", "sc", "st"])
        if getattr(profile, "category", None) is None:
            missing.append("Applicant category not specified; confirm eligibility for category-specific quotas.")
        elif profile.category not in allowed_categories:
            hard_failures.append(f"Category '{profile.category}' is not targeted by this specific scheme.")

        # 6. Location Type
        allowed_locations = scheme.get("location_types", ["rural", "urban", "semi_urban"])
        if getattr(profile, "location_type", None) is None:
            missing.append("Location type not specified; confirm rural or semi-urban location.")
        elif profile.location_type not in allowed_locations:
            hard_failures.append(f"Location type '{profile.location_type}' is outside target area.")

        # 7. Collateral
        if scheme.get("requires_collateral", False) and not getattr(profile, "collateral_available", False):
            missing.append("Confirm acceptable primary or collateral security with participating lender.")


        # Determine eligibility tier
        if hard_failures:
            eligibility = "no"
            reasons.extend(hard_failures)
        elif missing:
            eligibility = "maybe"
            reasons.append("Core eligibility criteria are met; branch underwriting and security confirmation needed.")
        else:
            eligibility = "yes"
            subsidy = scheme.get("subsidy_pct", 0)
            if subsidy > 0:
                reasons.append(f"Meets all criteria; eligible for up to {subsidy}% subsidy or interest subvention.")
            else:
                reasons.append("Profile satisfies all deterministic scheme rules.")

        matches.append(
            SchemeMatch(
                scheme_id=scheme["id"],
                name=scheme["name"],
                eligibility=eligibility,
                reasons=reasons,
                missing_info=missing,
                benefits=scheme["benefits"],
                interest_note=scheme["interest_note"],
                collateral_note=scheme["collateral_note"],
                source_url=scheme["source_url"],
            )
        )

    # Deterministic ranking:
    # 1. Eligibility (yes -> maybe -> no)
    # 2. Subsidy percentage (descending)
    # 3. No collateral required first
    rank_order = {"yes": 0, "maybe": 1, "no": 2}
    scheme_lookup = {s["id"]: s for s in schemes_data}

    def sort_key(item: SchemeMatch):
        s_data = scheme_lookup.get(item.scheme_id, {})
        subsidy = s_data.get("subsidy_pct", 0)
        collateral_penalty = 1 if s_data.get("requires_collateral", False) else 0
        return (rank_order[item.eligibility], -subsidy, collateral_penalty, item.scheme_id)


    matches.sort(key=sort_key)

    has_yes = any(item.eligibility == "yes" for item in matches)
    fallback = FALLBACK_OPTIONS if not has_yes else []

    return SchemeMatchResponse(matches=matches, fallback_options=fallback)


def match(profile: Profile, gap: float, idea: Idea) -> list[SchemeMatch]:
    """Operator 1 interface for scheme matching."""
    return match_schemes(profile, gap=gap, idea=idea).matches


DEFAULT_BENCHMARK_RATES = {
    "mudra": 9.5,
    "pmegp": 10.5,
    "stand_up_india": 8.5,
    "pm_svanidhi": 7.0,
    "day_nrlm": 7.0,
    "pm_fme": 9.0,
    "cgtmse": 10.0,
    "cmegp_maharashtra": 9.5,
    "annasaheb_patil": 0.0,
}


def get_scheme_default_interest_rate(scheme_id: str, override_rate: float | tuple[float, float] | None = None) -> float:
    """Return a single scalar float interest rate for EMI computation, never a tuple."""
    if isinstance(override_rate, (tuple, list)):
        return float(override_rate[0])
    if isinstance(override_rate, (int, float)):
        return float(override_rate)
    return float(DEFAULT_BENCHMARK_RATES.get(scheme_id, 9.5))

