from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.database import get_report, save_report
from app.schemas.operator2 import (
    CreditQuizAnswers,
    DiscoveryAnswers,
    EmiRequest,
    GapRequest,
    Idea,
    InvestmentRequest,
    Profile,
    ProjectionRequest,
    Scale,
    ScoreInput,
)
from app.services import (
    catalogue_service,
    credit_service,
    document_base_service,
    finance_service,
    investment_service,
    local_market_service,
    scheme_service,
    scoring_service,
    supplier_service,
)
from app.utils.emi import calculate_emi, repayment_plan
from app.utils.ratelimit import InMemoryRateLimiter
from app.utils.scoring import feasibility_score

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_all_10_businesses_estimate_investment_and_reconcile():
    all_biz = catalogue_service.list_all()
    assert len(all_biz) == 10

    for biz in all_biz:
        for scale in (Scale.small, Scale.medium, Scale.large):
            req = InvestmentRequest(
                idea=Idea(business_id=biz.id, scale=scale),
                district="Nashik",
            )
            inv = investment_service.estimate_investment(req)
            assert inv.total_investment > 0
            assert inv.fixed_cost >= 0
            assert inv.working_capital >= 0
            assert inv.contingency == round((inv.fixed_cost + inv.working_capital) * 0.10, 2)
            assert inv.total_investment == round(inv.fixed_cost + inv.working_capital + inv.contingency, 2)


def test_catalogue_filtering():
    # Budget filter: only lower budget businesses (e.g. tiffin, mobile repair)
    low_budget = catalogue_service.filter(DiscoveryAnswers(budget_range=[30_000, 150_000]))
    assert any(b.id == "tiffin_food_stall" for b in low_budget)

    # Sector filter: agri_allied
    agri = catalogue_service.filter(DiscoveryAnswers(interests=["agri_allied"]))
    assert all("agri" in b.sector for b in agri)

    # Space filter: shop_room
    shop = catalogue_service.filter(DiscoveryAnswers(space="shop_room"))
    assert all("shop_room" in b.space_needed for b in shop)

    # API route
    res = client.post("/api/v1/catalogue/filter", json={"interests": ["services"]})
    assert res.status_code == 200
    assert len(res.json()) >= 2


def test_local_market_districts_and_fallback():
    for district in ("Nashik", "Pune", "Ahmednagar"):
        local = local_market_service.get_local_market(district, "dairy_small")
        assert local.district.lower() == district.lower()
        assert local.price_factor > 0
        assert local.market_score > 0
        assert local.confidence in ("high", "medium", "approximate")
        assert local["price_factor"] == local.price_factor

    # Unknown district uses fallback
    fallback = local_market_service.get_local_market("Gadchiroli", "dairy_small")
    assert fallback.confidence == "approximate"
    assert fallback.price_factor == 1.0


def test_all_scheme_eligibility_rules():
    # 1. Mudra Kishore (3 Lakhs gap, general male 28)
    profile = Profile(state="Maharashtra", district="Nashik", capital=50_000, category="general", gender="m", age=28)
    mudra_match = scheme_service.match_schemes(profile, gap=300_000, idea=Idea(business_id="dairy_small"))
    mudra = next(m for m in mudra_match.matches if m.scheme_id == "mudra")
    assert mudra.eligibility == "yes"

    # 2. Stand-Up India requires woman or SC/ST
    male_res = scheme_service.match_schemes(profile, gap=1_500_000, idea=Idea(business_id="kirana_store"))
    su_male = next(m for m in male_res.matches if m.scheme_id == "stand_up_india")
    assert su_male.eligibility == "no"

    woman_profile = Profile(state="Maharashtra", district="Nashik", capital=200_000, category="general", gender="f", age=34, collateral_available=True)
    su_woman = next(m for m in scheme_service.match_schemes(woman_profile, gap=1_500_000, idea=Idea(business_id="kirana_store")).matches if m.scheme_id == "stand_up_india")
    assert su_woman.eligibility == "yes"

    # 3. PM SVANidhi: small gap street food / vendor
    svanidhi_res = scheme_service.match_schemes(profile, gap=20_000, idea=Idea(business_id="tiffin_food_stall"))
    sva = next(m for m in svanidhi_res.matches if m.scheme_id == "pm_svanidhi")
    assert sva.eligibility == "yes"


def test_dscr_and_affordability_boundaries():
    # DSCR boundary: threshold is 1.25
    # Loan with low net profit
    tight_loan = repayment_plan(EmiRequest(principal=200_000, annual_rate_pct=12, tenure_months=24, annual_net_profit=60_000))
    assert tight_loan.dscr is not None
    assert tight_loan.dscr < 1.25
    assert tight_loan.affordable is False

    # Healthy loan with strong net profit
    healthy_loan = repayment_plan(EmiRequest(principal=100_000, annual_rate_pct=10, tenure_months=36, annual_net_profit=350_000))
    assert healthy_loan.dscr is not None
    assert healthy_loan.dscr >= 1.25
    assert healthy_loan.affordable is True


def test_suppliers_filtering_and_lead_submission():
    # List suppliers by category
    dairy_sups = client.get("/api/v1/suppliers", params={"category": "dairy"})
    assert dairy_sups.status_code == 200
    assert len(dairy_sups.json()) >= 2
    first_id = dairy_sups.json()[0]["id"]

    # Post quote lead
    lead_res = client.post(
        f"/api/v1/suppliers/{first_id}/lead",
        json={"requester_name": "Sunita Patil", "phone": "+91 98221 23456", "message": "Interested in 4 milking cans and feeder troughs."},
    )
    assert lead_res.status_code == 201
    assert lead_res.json()["status"] == "saved"
    assert lead_res.json()["lead_id"] > 0

    # Non-existent supplier returns 404
    bad_lead = client.post(
        "/api/v1/suppliers/sup-99999/lead",
        json={"requester_name": "Test User", "phone": "+91 98221 23456", "message": "Quote request"},
    )
    assert bad_lead.status_code == 404


def test_operator1_contract_signatures():
    # 1. catalogue.filter
    biz_list = catalogue_service.filter(DiscoveryAnswers(budget_range=[50000, 300000]))
    assert len(biz_list) > 0

    # 2. local_market.get
    local = local_market_service.get("Nashik", "dairy_small")
    assert local.market_score > 0

    # 3. investment.estimate
    inv = investment_service.estimate(Idea(business_id="dairy_small"), local)
    assert inv.total_investment > 0

    # 4. finance.funding_gap
    gap = finance_service.funding_gap(inv.total_investment, 50000)
    assert gap.funding_gap > 0

    # 5. schemes.match
    profile = Profile(state="Maharashtra", district="Nashik", capital=50000, category="general", gender="f", age=32)
    matches = scheme_service.match(profile, gap.funding_gap, Idea(business_id="dairy_small"))
    assert len(matches) > 0

    # 6. finance.projection
    proj = finance_service.projection(Idea(business_id="dairy_small"), local, inv)
    assert proj.base.annual_net_profit > 0

    # 7. finance.repayment_plan
    rep = finance_service.repayment_plan(gap.funding_gap, 9.5, 36, proj)
    assert rep.emi > 0

    # 8. credit.readiness
    cred = credit_service.readiness(profile)
    assert cred.bucket in ("strong", "fair", "thin_file", "needs_repair")

    # 9. scoring.feasibility_score & market_factor
    m_factor = scoring_service.market_factor(local)
    assert m_factor == local.market_score
    score_res = scoring_service.feasibility_score(
        ScoreInput(
            market_score=m_factor,
            capital_ratio=gap.capital_ratio,
            dscr=rep.dscr,
            break_even_months=proj.base.break_even_months,
            risk_severity=local.risk_severity,
        )
    )
    assert score_res.score > 0
    assert score_res.verdict_label in ("highly_feasible", "feasible_with_conditions", "risky", "not_recommended")

    # 10. documents.base_lists
    docs = document_base_service.base_lists("dairy_small")
    assert len(docs.registration) > 0
    assert len(docs.loan) > 0

    # 11. db.save_report / db.get_report
    rep_id = save_report("session-123", {"verdict": score_res.verdict_label, "score": score_res.score})
    fetched = get_report(rep_id)
    assert fetched["score"] == score_res.score


def test_rate_limiter_logic():
    limiter = InMemoryRateLimiter(max_requests=3, window_seconds=60)
    assert limiter.allow("client-1") is True
    assert limiter.allow("client-1") is True
    assert limiter.allow("client-1") is True
    assert limiter.allow("client-1") is False
    # Different client is not blocked
    assert limiter.allow("client-2") is True


def test_three_golden_personas_flow():
    # Persona 1: Sunita, 34, Nashik rural, Dairy, ₹50,000 capital, thin-file
    p1 = Profile(state="Maharashtra", district="Nashik", village="Dindori", capital=50_000, category="obc", gender="f", age=34, experience="some", location_type="rural")
    local1 = local_market_service.get(p1.district, "dairy_small")
    inv1 = investment_service.estimate(Idea(business_id="dairy_small", scale=Scale.small), local1)
    gap1 = finance_service.funding_gap(inv1.total_investment, p1.capital)
    assert gap1.funding_gap > 100_000
    schemes1 = scheme_service.match(p1, gap1.funding_gap, Idea(business_id="dairy_small"))
    assert any(s.scheme_id == "mudra" and s.eligibility == "yes" for s in schemes1)
    assert any(s.scheme_id == "day_nrlm" and s.eligibility == "yes" for s in schemes1)

    # Persona 2: Youth, 23, Pune semi-urban, Mobile Repair, ₹20,000 capital
    p2 = Profile(state="Maharashtra", district="Pune", capital=20_000, category="general", gender="m", age=23, location_type="semi_urban")
    local2 = local_market_service.get(p2.district, "mobile_repair")
    inv2 = investment_service.estimate(Idea(business_id="mobile_repair", scale=Scale.small), local2)
    gap2 = finance_service.funding_gap(inv2.total_investment, p2.capital)
    schemes2 = scheme_service.match(p2, gap2.funding_gap, Idea(business_id="mobile_repair"))
    assert any(s.scheme_id == "mudra" and s.eligibility == "yes" for s in schemes2)
    assert any(s.scheme_id == "annasaheb_patil" and s.eligibility == "yes" for s in schemes2)
    # At medium scale (gap > ₹100,000), CMEGP is eligible
    inv2_med = investment_service.estimate(Idea(business_id="mobile_repair", scale=Scale.medium), local2)
    gap2_med = finance_service.funding_gap(inv2_med.total_investment, p2.capital)
    schemes2_med = scheme_service.match(p2, gap2_med.funding_gap, Idea(business_id="mobile_repair"))
    assert any(s.scheme_id == "cmegp_maharashtra" and s.eligibility == "yes" for s in schemes2_med)


    # Persona 3: Pooja, 38, Ahmednagar rural, Tailoring boutique, ₹15,000 capital
    p3 = Profile(state="Maharashtra", district="Ahmednagar", capital=15_000, category="sc", gender="f", age=38, location_type="rural")
    local3 = local_market_service.get(p3.district, "tailoring")
    inv3 = investment_service.estimate(Idea(business_id="tailoring", scale=Scale.small), local3)
    gap3 = finance_service.funding_gap(inv3.total_investment, p3.capital)
    schemes3 = scheme_service.match(p3, gap3.funding_gap, Idea(business_id="tailoring"))
    assert any(s.scheme_id == "day_nrlm" and s.eligibility == "yes" for s in schemes3)
    assert any(s.scheme_id == "mudra" and s.eligibility == "yes" for s in schemes3)
    # At medium scale (gap > ₹100,000), PMEGP with 35% margin money subsidy is eligible
    inv3_med = investment_service.estimate(Idea(business_id="tailoring", scale=Scale.medium), local3)
    gap3_med = finance_service.funding_gap(inv3_med.total_investment, p3.capital)
    schemes3_med = scheme_service.match(p3, gap3_med.funding_gap, Idea(business_id="tailoring"))
    assert any(s.scheme_id == "pmegp" and s.eligibility == "yes" for s in schemes3_med)


def test_database_session_and_chat_helpers():
    import uuid
    from app.models.database import (
        get_chat_history,
        get_idea,
        get_profile,
        save_chat_message,
        save_idea,
        save_profile,
        seed_suppliers_from_json,
    )

    sid = f"session-test-{uuid.uuid4().hex[:8]}"
    save_profile(sid, {"district": "Nashik", "capital": 50000})
    assert get_profile(sid)["district"] == "Nashik"

    save_idea(sid, {"business_id": "dairy_small", "scale": "small"})
    assert get_idea(sid)["business_id"] == "dairy_small"

    save_chat_message(sid, "user", "How much feed is needed monthly?")
    save_chat_message(sid, "assistant", "About 3 bags of concentrate per cow.")
    history = get_chat_history(sid, limit=5)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

    seeded = seed_suppliers_from_json()
    assert seeded >= 0



