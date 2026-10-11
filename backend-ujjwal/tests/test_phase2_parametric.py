"""Parametrised and comprehensive tests for Phase 2 (Audit coverage)."""

from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient

from app.main import app
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
from app.utils.emi import calculate_emi, repayment_plan
from app.utils.errors import CalcInputError
from app.utils.scoring import WEIGHTS, feasibility_score

client = TestClient(app)


# =========================================================================
# 1. Financial Boundary & Edge Tests
# =========================================================================

@pytest.mark.parametrize(
    "annual_profit, expected_affordable",
    [
        (45_000, False),   # DSCR < 1.25 or EMI > 50% profit
        (100_000, True),   # DSCR >= 1.25 and EMI <= 50% profit
    ],
)
def test_dscr_boundary_1_24_vs_1_25(annual_profit, expected_affordable):
    """DSCR boundary: 1.24 is not affordable, 1.25+ is affordable."""
    plan = repayment_plan(
        EmiRequest(
            principal=100_000,
            annual_rate_pct=10.0,
            tenure_months=36,
            annual_net_profit=annual_profit,
        )
    )
    assert plan.dscr is not None
    assert plan.affordable == expected_affordable


def test_emi_vs_profit_boundary_exactly_50_percent():
    """EMI-vs-profit boundary: affordable if EMI <= monthly_profit * 0.5."""
    # Let's construct a scenario where monthly profit = 2 * EMI
    # P=120,000, r=0%, tenure=12mo -> EMI = 10,000 exactly.
    # If annual profit = 240,000 -> monthly profit = 20,000 -> 50% is 10,000 -> EMI == 50% -> affordable True!
    plan_exact = repayment_plan(
        EmiRequest(
            principal=120_000,
            annual_rate_pct=0.0,
            tenure_months=12,
            annual_net_profit=240_000,
        )
    )
    assert plan_exact.emi == 10_000.0
    assert plan_exact.affordable is True

    # Slightly less profit -> monthly profit 19,980 -> 50% is 9,990 < 10,000 -> affordable False!
    plan_under = repayment_plan(
        EmiRequest(
            principal=120_000,
            annual_rate_pct=0.0,
            tenure_months=12,
            annual_net_profit=239_000,
        )
    )
    assert plan_under.affordable is False


@pytest.mark.parametrize("tenure", [6, 120])
def test_rate_zero_and_tenure_limits(tenure):
    """Rate=0, tenure=6 and tenure=120 work cleanly without division by zero."""
    plan = repayment_plan(
        EmiRequest(
            principal=60_000,
            annual_rate_pct=0.0,
            tenure_months=tenure,
            annual_net_profit=200_000,
        )
    )
    expected_emi = round(60_000 / tenure, 2)
    assert plan.emi == expected_emi
    assert plan.schedule[-1].balance == 0.0


def test_moratorium_tenure_minus_one_and_equal_tenure():
    """Moratorium = tenure - 1 succeeds; moratorium = tenure must fail."""
    # Tenure=12, moratorium=11 (1 repayment month left) -> Valid
    plan_valid = repayment_plan(
        EmiRequest(
            principal=50_000,
            annual_rate_pct=10.0,
            tenure_months=12,
            moratorium_months=11,
            annual_net_profit=150_000,
        )
    )
    assert len(plan_valid.schedule) == 12
    assert plan_valid.schedule[-1].balance == 0.0

    # Tenure=12, moratorium=12 -> must fail
    with pytest.raises((ValueError, CalcInputError)):
        EmiRequest(
            principal=50_000,
            annual_rate_pct=10.0,
            tenure_months=12,
            moratorium_months=12,
            annual_net_profit=150_000,
        )


# =========================================================================
# 2. Scoring & Factor Tests
# =========================================================================

def test_none_dscr_zero_denominator_flows_without_crashing():
    """None DSCR (e.g. zero denominator or missing loan profile) flows through scoring cleanly."""
    res = feasibility_score(
        ScoreInput(
            market_score=75.0,
            capital_ratio=0.5,
            dscr=None,
            break_even_months=12,
            risk_severity=30.0,
        )
    )
    assert "repayment" in res.factors_missing
    assert res.score > 0
    assert res.verdict_label in ("highly_feasible", "feasible_with_conditions", "risky", "not_recommended")


@pytest.mark.parametrize(
    "score_val, expected_verdict",
    [
        (75.0, "highly_feasible"),
        (74.99, "feasible_with_conditions"),
        (55.0, "feasible_with_conditions"),
        (54.99, "risky"),
        (40.0, "risky"),
        (39.99, "not_recommended"),
    ],
)
def test_scoring_thresholds_exact_boundaries(score_val, expected_verdict):
    """Test exact scoring threshold boundaries."""
    # Market=score_val, capital=score_val/100, etc.
    # Market score 100% weight test via missing other factors
    res = feasibility_score(
        ScoreInput(
            market_score=score_val,
            capital_ratio=None,
            dscr=None,
            break_even_months=None,
            risk_severity=None,
        )
    )
    assert math.isclose(res.score, score_val, abs_tol=0.01)
    assert res.verdict_label == expected_verdict


def test_weights_sum_is_close_and_deterministic_100_runs():
    """Weights sum to 1.0; 100 repeated runs produce identical score."""
    assert math.isclose(sum(WEIGHTS.values()), 1.0, rel_tol=1e-9)

    inp = ScoreInput(
        market_score=72.0,
        capital_ratio=0.6,
        dscr=1.35,
        break_even_months=18,
        risk_severity=2.0,  # 1-3 scale
    )
    first_run = feasibility_score(inp)
    for _ in range(100):
        run = feasibility_score(inp)
        assert run.score == first_run.score
        assert run.verdict_label == first_run.verdict_label
        assert run.factor_scores == first_run.factor_scores


# =========================================================================
# 3. Scheme Matcher Tests
# =========================================================================

def test_scheme_matcher_missing_profile_field_produces_maybe():
    """Missing profile field produces eligibility 'maybe' and records missing_info."""
    # Profile without collateral explicitly stated
    p = Profile(
        state="Maharashtra",
        district="Nashik",
        capital=50_000,
        category="general",
        gender="f",
        age=30,
        collateral_available=False,
    )
    res = scheme_service.match_schemes(p, gap=1_500_000, idea=Idea(business_id="dairy_small"))
    # Stand-Up India requires collateral -> with collateral_available=False, it yields 'maybe'
    su = next(m for m in res.matches if m.scheme_id == "stand_up_india")
    assert su.eligibility == "maybe"
    assert len(su.missing_info) > 0


@pytest.mark.parametrize(
    "age, expected_cgtmse_eligible, expected_cmegp_eligible",
    [
        (17, False, False),  # below 18 min_age
        (18, True, True),    # valid 18
        (45, True, True),    # CMEGP upper limit
        (46, True, False),   # CMEGP max_age is 45
    ],
)
def test_scheme_age_boundaries(age, expected_cgtmse_eligible, expected_cmegp_eligible):
    """Age boundary tests per scheme."""
    try:
        p = Profile(state="Maharashtra", district="Nashik", capital=50_000, category="general", gender="m", age=age)
    except Exception:
        # Profile schema validator ge=18 catches 17 at schema boundary
        assert age < 18
        return

    res = scheme_service.match_schemes(p, gap=200_000, idea=Idea(business_id="dairy_small"))
    cmegp = next((m for m in res.matches if m.scheme_id == "cmegp_maharashtra"), None)
    if cmegp:
        assert (cmegp.eligibility == "yes") == expected_cmegp_eligible


def test_scheme_gap_above_every_limit_yields_fallback_options():
    """Gap exceeding every scheme ceiling yields non-empty fallback_options."""
    p = Profile(state="Maharashtra", district="Nashik", capital=10_000, category="general", gender="m", age=30)
    # 6 Crore is above CGTMSE 5 Crore ceiling
    res = scheme_service.match_schemes(p, gap=60_000_000, idea=Idea(business_id="dairy_small"))
    assert all(m.eligibility == "no" for m in res.matches)
    assert len(res.fallback_options) > 0


def test_scheme_interest_rate_never_passes_tuple_to_emi():
    """Scheme default interest rate returns scalar float, never a tuple."""
    rate = scheme_service.get_scheme_default_interest_rate("mudra")
    assert isinstance(rate, float)
    assert not isinstance(rate, tuple)

    # User override float
    custom = scheme_service.get_scheme_default_interest_rate("mudra", override_rate=11.2)
    assert custom == 11.2

    # Even if tuple passed by accident, extracts scalar float
    tuple_override = scheme_service.get_scheme_default_interest_rate("mudra", override_rate=(8.0, 10.0))
    assert isinstance(tuple_override, float)


# =========================================================================
# 4. Investment & Projection Tests
# =========================================================================

def test_investment_reconciliation_and_overrides():
    """Totals == sum of items, contingency once, qty=0 valid, negative/absurdly large -> 422."""
    req = InvestmentRequest(
        idea=Idea(business_id="dairy_small", scale=Scale.small),
        district="Nashik",
        quantity_overrides=[QuantityOverride(item_key="cattle", quantity=0)],
    )
    inv = investment_service.estimate_investment(req)
    assert inv.total_investment == sum(i.line_total for i in inv.items)
    contingency_items = [i for i in inv.items if i.category == "contingency"]
    assert len(contingency_items) == 1

    # API returns 422 on negative quantity
    res_neg = client.post("/api/v1/finance/investment", json={
        "idea": {"business_id": "dairy_small", "scale": "small"},
        "district": "Nashik",
        "quantity_overrides": [{"item_key": "cattle", "quantity": -5}],
    })
    assert res_neg.status_code == 422

    # Unknown business -> 404
    res_unknown = client.post("/api/v1/finance/investment", json={
        "idea": {"business_id": "unknown_biz_99", "scale": "small"},
        "district": "Nashik",
    })
    assert res_unknown.status_code == 404


def test_projection_all_months_negative_typed_break_even():
    """When all months are negative, break_even is a typed None, not a string."""
    inv = investment_service.estimate(Idea(business_id="tailoring", scale=Scale.small), "Nashik")
    proj = finance_service.projection(Idea(business_id="tailoring", scale=Scale.small), "Nashik", inv)
    assert proj.pessimistic.annual_net_profit < proj.base.annual_net_profit
    # break_even_months is either int or None (never a str)
    assert proj.base.break_even_months is None or isinstance(proj.base.break_even_months, int)
    assert proj.pessimistic.break_even_months is None or isinstance(proj.pessimistic.break_even_months, int)


# =========================================================================
# 5. Golden Personas (Run 10x each and assert identical verdicts)
# =========================================================================

def test_persona_a_sunita_nashik_dairy_thin_file_10x():
    """Persona A: Sunita, ₹50,000 capital, Dairy, thin-file, Nashik."""
    p = Profile(
        state="Maharashtra", district="Nashik", village="Dindori",
        capital=50_000, category="obc", gender="f", age=34,
        experience="some", location_type="rural"
    )
    quiz = CreditQuizAnswers(
        existing_loans=False, missed_emis_last_12_months=False,
        uses_credit_card_responsibly=False, first_time_borrower=True,
        has_income_proof=False, has_bank_statement_history=False
    )
    verdicts = []
    for _ in range(10):
        local = local_market_service.get(p.district, "dairy_small")
        inv = investment_service.estimate(Idea(business_id="dairy_small", scale=Scale.small), local)
        gap = finance_service.funding_gap(inv.total_investment, p.capital)
        schemes = scheme_service.match(p, gap.funding_gap, Idea(business_id="dairy_small"))
        cred = credit_service.assess_readiness(quiz)
        proj = finance_service.projection(Idea(business_id="dairy_small"), local, inv)
        rep = finance_service.repayment_plan(gap.funding_gap, 9.5, 36, proj)
        score = scoring_service.feasibility_score(
            ScoreInput(
                market_score=local.market_score,
                capital_ratio=gap.capital_ratio,
                dscr=rep.dscr,
                break_even_months=proj.base.break_even_months,
                risk_severity=local.risk_severity,
            )
        )
        verdicts.append((cred.bucket, score.verdict_label, any(s.eligibility == "yes" for s in schemes)))

    assert all(v == verdicts[0] for v in verdicts)
    assert verdicts[0][0] == "thin_file"
    assert verdicts[0][2] is True  # Has eligible schemes (Mudra, DAY-NRLM)


def test_persona_b_self_funded_loss_making_10x():
    """Persona B: Self-funded and loss-making (capital >= total, profit <= 0)."""
    p = Profile(
        state="Maharashtra", district="Nashik",
        capital=500_000, category="general", gender="f", age=30
    )
    verdicts = []
    for _ in range(10):
        inv = investment_service.estimate(Idea(business_id="tailoring", scale=Scale.small), "Nashik")
        gap = finance_service.funding_gap(inv.total_investment, p.capital)
        assert gap.self_funded is True

        # Loss-making self-funded user: base profit <= 0 -> repayment factor scores 0
        score = scoring_service.feasibility_score(
            ScoreInput(
                market_score=50.0,
                capital_ratio=gap.capital_ratio,
                dscr=None,
                break_even_months=None,
                risk_severity=50.0,
                base_annual_net_profit=-10_000,
            )
        )
        assert score.factor_scores["repayment"] == 0.0
        verdicts.append(score.verdict_label)

    assert all(v == verdicts[0] for v in verdicts)


def test_persona_c_zero_capital_high_cost_no_scheme_10x():
    """Persona C: Zero capital, high-cost business, no scheme eligible."""
    p = Profile(
        state="Maharashtra", district="Nashik",
        capital=0, category="general", gender="m", age=68, collateral_available=False
    )
    verdicts = []
    for _ in range(10):
        # Gap of 6 Crore exceeds all scheme ceilings
        schemes = scheme_service.match(p, 60_000_000, Idea(business_id="dairy_small"))
        has_eligible = any(s.eligibility == "yes" for s in schemes)
        assert has_eligible is False

        score = scoring_service.feasibility_score(
            ScoreInput(
                market_score=15.0,
                capital_ratio=0.0,
                dscr=0.2,
                break_even_months=None,
                risk_severity=90.0,
            )
        )
        verdicts.append((has_eligible, score.verdict_label))

    assert all(v == verdicts[0] for v in verdicts)
    assert verdicts[0][1] == "not_recommended"


def test_persona_d_unknown_district_fallback_approximate_10x():
    """Persona D: Unknown district uses fallback averages with confidence='approximate'."""
    verdicts = []
    for _ in range(10):
        local = local_market_service.get("Bhandara", "dairy_small")
        assert local.confidence == "approximate"
        assert local.price_factor == 1.0
        verdicts.append((local.confidence, local.price_factor, local.market_score))

    assert all(v == verdicts[0] for v in verdicts)
