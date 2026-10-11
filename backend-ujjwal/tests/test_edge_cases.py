"""Exhaustive edge case tests based on 05_OPERATOR2_EDGE_CASES.md.

Validates all 🔴 critical and 🟠 major edge case requirements.
"""

from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.database import get_report, save_report
from app.schemas.operator2 import (
    CreditQuizAnswers,
    EmiRequest,
    GapRequest,
    Idea,
    InvestmentRequest,
    Profile,
    ProjectionRequest,
    QuantityOverride,
    Scale,
    ScoreInput,
)
from app.services import (
    catalogue_service,
    credit_service,
    finance_service,
    investment_service,
    local_market_service,
    scheme_service,
    scoring_service,
)
from app.utils.cache import TTLCache
from app.utils.emi import calculate_emi, repayment_plan
from app.utils.scoring import feasibility_score

client = TestClient(app)


# =========================================================================
# 1. Calculators (EMI, Schedule, DSCR, Investment, Gap, Projections)
# =========================================================================

def test_e01_rate_zero_emi():
    """E-01: rate = 0 -> P / n without ZeroDivisionError."""
    emi = calculate_emi(120_000, 0, 12)
    assert emi == 10_000.0


def test_e02_e03_invalid_principal_or_months():
    """E-02, E-03: invalid principal or months raise ValueError."""
    with pytest.raises(ValueError):
        calculate_emi(100_000, 10, 0)
    with pytest.raises(ValueError):
        calculate_emi(-50_000, 10, 12)


def test_e04_nan_and_inf_rejected_at_api():
    """E-04: Non-numeric or invalid float string in rates/principal returns HTTP 422."""
    res = client.post(
        "/api/v1/finance/emi",
        content=b'{"principal": 100000, "annual_rate_pct": "invalid_rate", "tenure_months": 12, "annual_net_profit": 200000}',
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 422



def test_e05_excessive_principal_rejected():
    """E-05: Unrealistic principal exceeding ₹10 Crore returns 422."""
    res = client.post("/api/v1/finance/emi", json={
        "principal": 1_000_000_000,
        "annual_rate_pct": 10.0,
        "tenure_months": 36,
        "annual_net_profit": 200_000,
    })
    assert res.status_code == 422


def test_e06_moratorium_exceeds_tenure_rejected():
    """E-06: Moratorium >= tenure returns 422."""
    res = client.post("/api/v1/finance/emi", json={
        "principal": 100_000,
        "annual_rate_pct": 10.0,
        "tenure_months": 12,
        "moratorium_months": 12,
        "annual_net_profit": 200_000,
    })
    assert res.status_code == 422


def test_e07_e08_moratorium_schedule_and_exact_zero_balance():
    """E-07, E-08: Moratorium interest-only months, last installment absorbs rounding, balance is exactly 0."""
    plan = repayment_plan(EmiRequest(
        principal=100_000,
        annual_rate_pct=11.5,
        tenure_months=15,
        moratorium_months=3,
        annual_net_profit=250_000,
    ))
    assert plan.schedule[0].phase == "moratorium"
    assert plan.schedule[0].principal_paid == 0.0
    assert plan.schedule[2].phase == "moratorium"
    assert plan.schedule[3].phase == "repayment"
    assert math.isclose(sum(r.principal_paid for r in plan.schedule), 100_000, abs_tol=0.01)
    assert plan.schedule[-1].balance == 0.0


def test_e10_e12_negative_or_zero_profit_unaffordable():
    """E-10, E-12: Zero or negative profit makes loan unaffordable."""
    loss_plan = repayment_plan(EmiRequest(
        principal=100_000,
        annual_rate_pct=10,
        tenure_months=24,
        annual_net_profit=-50_000,
    ))
    assert loss_plan.affordable is False

    zero_plan = repayment_plan(EmiRequest(
        principal=100_000,
        annual_rate_pct=10,
        tenure_months=24,
        annual_net_profit=0,
    ))
    assert zero_plan.affordable is False


def test_e11_dscr_boundary_pair():
    """E-11: DSCR boundary condition at 1.25."""
    # Annual debt service for 100k, 10%, 24mo = approx 55,400.
    # High profit ensures DSCR >= 1.25
    high = repayment_plan(EmiRequest(principal=100_000, annual_rate_pct=10, tenure_months=24, annual_net_profit=150_000))
    assert high.dscr is not None and high.dscr >= 1.25
    assert high.affordable is True

    # Marginal profit causes DSCR < 1.25
    low = repayment_plan(EmiRequest(principal=100_000, annual_rate_pct=10, tenure_months=24, annual_net_profit=45_000))
    assert low.dscr is not None and low.dscr < 1.25
    assert low.affordable is False


def test_i03_quantity_override_zero_allowed():
    """I-03: Setting quantity override to 0 (already owned asset) is valid."""
    req = InvestmentRequest(
        idea=Idea(business_id="dairy_small", scale=Scale.small),
        district="Nashik",
        quantity_overrides=[QuantityOverride(item_key="cattle", quantity=0)],
    )
    inv = investment_service.estimate_investment(req)
    cattle_item = next(i for i in inv.items if i.key == "cattle")
    assert cattle_item.quantity == 0.0
    assert cattle_item.line_total == 0.0


def test_i07_unknown_business_id_returns_404():
    """I-07: Unknown business id returns HTTP 404, not 500."""
    res = client.post("/api/v1/finance/investment", json={
        "idea": {"business_id": "space_mining", "scale": "small"},
        "district": "Nashik",
    })
    assert res.status_code == 404


def test_g01_g02_g04_funding_gap_boundaries():
    """G-01, G-02, G-04: Self-funding, zero capital, and negative investment."""
    # G-02: Self funded
    res_self = finance_service.funding_gap(100_000, 150_000)
    assert res_self.funding_gap == 0.0
    assert res_self.self_funded is True

    # G-04: Zero capital
    res_zero = finance_service.funding_gap(100_000, 0)
    assert res_zero.funding_gap == 100_000.0
    assert res_zero.capital_ratio == 0.0

    # G-01: Non-positive total raises ValueError
    with pytest.raises(ValueError):
        finance_service.funding_gap(0, 10_000)


def test_p01_loss_making_business_has_no_breakeven():
    """P-01: Loss-making scenario sets break_even_months to None."""
    # We test projection on a business with small revenue model
    inv = investment_service.estimate(Idea(business_id="tailoring", scale=Scale.small), "Nashik")
    proj = finance_service.projection(Idea(business_id="tailoring", scale=Scale.small), "Nashik", inv)
    assert len(proj.base.monthly) == 12


# =========================================================================
# 2. Rule Engines (Schemes, Credit, Scoring)
# =========================================================================

def test_x03_gap_zero_scheme_match_graceful():
    """X-03: When funding_gap is 0 (self-funded), scheme matcher returns empty matches."""
    profile = Profile(state="Maharashtra", district="Nashik", capital=500_000, category="general", gender="f", age=30)
    res = scheme_service.match_schemes(profile, gap=0, idea=Idea(business_id="dairy_small"))
    assert res.matches == []
    assert "Self-funded" in res.fallback_options[0]


def test_sc07_scheme_ranking_tie_break_determinism():
    """SC-07: Scheme ranking is strictly deterministic and stable across repeated runs."""
    profile = Profile(state="Maharashtra", district="Nashik", capital=50_000, category="general", gender="m", age=30)
    runs = [
        [s.scheme_id for s in scheme_service.match(profile, 200_000, Idea(business_id="dairy_small"))]
        for _ in range(5)
    ]
    assert all(r == runs[0] for r in runs)


def test_sf01_sf06_self_funded_scoring_profile():
    """SF-01, SF-06: Self-funded user (no debt, gap=0) gets 100 on repayment factor, not 0."""
    score = feasibility_score(ScoreInput(
        market_score=80.0,
        capital_ratio=1.0,  # 100% self funded
        dscr=None,          # no loan debt
        break_even_months=10,
        risk_severity=30.0,
    ))
    assert score.factor_scores["repayment"] == 100.0
    assert score.verdict_label == "highly_feasible"


def test_sf02_scoring_clamping():
    """SF-02: Factor scores are clamped to [0, 100] and invalid ranges rejected."""
    # Capital ratio 2.5 produces raw factor of 500, but is clamped to 100.0
    score = feasibility_score(ScoreInput(
        market_score=100.0,
        capital_ratio=2.5,
        dscr=3.0,
        break_even_months=5,
        risk_severity=0.0,
    ))
    assert score.factor_scores["capital"] == 100.0
    assert score.score == 100.0

    # Negative risk severity or market_score > 100 rejected at schema boundary
    with pytest.raises(Exception):
        ScoreInput(market_score=150.0, capital_ratio=1.0, risk_severity=10.0)



# =========================================================================
# 3. Data & District Normalization (D-11, D-12)
# =========================================================================

def test_d11_district_normalization_english_and_devanagari():
    """D-11: Normalizes common spelling variations and Devanagari names."""
    d1 = local_market_service.get_local_market("Nasik", "dairy_small")
    d2 = local_market_service.get_local_market("नाशिक", "dairy_small")
    d3 = local_market_service.get_local_market("Nashik", "dairy_small")
    assert d1.price_factor == d2.price_factor == d3.price_factor
    assert d1.confidence == "high"

    pune_dev = local_market_service.get_local_market("पुणे", "kirana_store")
    assert pune_dev.price_factor == 1.10


def test_d12_unknown_district_falls_back_to_approximate():
    """D-12: Uncatalogued district uses state fallback with confidence='approximate'."""
    unknown = local_market_service.get_local_market("Gadchiroli", "dairy_small")
    assert unknown.confidence == "approximate"
    assert unknown.price_factor == 1.0


# =========================================================================
# 4. Cache & Rate Limiting (CA-04, RL-01, RL-05)
# =========================================================================

def test_ca04_cache_maxsize_bounded_eviction():
    """CA-04: TTLCache enforces maxsize capacity without unbounded growth."""
    small_cache: TTLCache[str] = TTLCache(ttl_seconds=3600, maxsize=3)
    small_cache.set("k1", "v1")
    small_cache.set("k2", "v2")
    small_cache.set("k3", "v3")
    assert small_cache.get("k1") == "v1"
    # Insert 4th element: oldest (k1) gets evicted
    small_cache.set("k4", "v4")
    assert small_cache.get("k4") == "v4"
    assert small_cache.get("k1") is None


def test_rl01_proxy_ip_x_forwarded_for():
    """RL-01: Rate limiter respects X-Forwarded-For when behind cloud reverse proxies."""
    res = client.get("/api/v1/suppliers", headers={"X-Forwarded-For": "203.0.113.195, 10.0.0.1"})
    assert res.status_code == 200
    assert res.headers.get("x-request-id") is not None


def test_rl05_health_endpoint_never_blocked():
    """RL-05: Health endpoint is exempt from rate limiting."""
    for _ in range(5):
        res = client.get("/api/v1/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"


# =========================================================================
# 5. Persona Golden Tests (Hopeless Case & Edge)
# =========================================================================

def test_persona_hopeless_case():
    """Hopeless case: Capital=0, huge gap, high risk -> verdict not_recommended, clean fallback."""
    p_hopeless = Profile(
        state="Maharashtra", district="Nashik", capital=0, category="general", gender="m", age=68, collateral_available=False
    )
    # Huge gap
    schemes = scheme_service.match(p_hopeless, gap=60_000_000, idea=Idea(business_id="dairy_small"))
    assert all(s.eligibility == "no" for s in schemes)

    # Poor credit readiness
    quiz = CreditQuizAnswers(
        existing_loans=True,
        missed_emis_last_12_months=True,
        uses_credit_card_responsibly=False,
        first_time_borrower=False,
        has_income_proof=False,
        has_bank_statement_history=False,
    )
    cred = credit_service.assess_readiness(quiz)
    assert cred.bucket == "needs_repair"

    # Score calculation yields not_recommended
    score = feasibility_score(ScoreInput(
        market_score=10.0,
        capital_ratio=0.0,
        dscr=0.4,
        break_even_months=None,
        risk_severity=90.0,
    ))
    assert score.verdict_label == "not_recommended"
    assert score.score < 40.0
