from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import credit_router, finance_router, report_pdf_router, schemes_router, suppliers_router
from app.models.database import get_report, save_report
from app.schemas.operator2 import CreditQuizAnswers, Idea, Profile, SchemeMatchRequest
from app.services.credit_service import assess_readiness
from app.services.scheme_service import match_schemes


def test_each_credit_bucket_is_reachable():
    base = dict(existing_loans=False, missed_emis_last_12_months=False, uses_credit_card_responsibly=True, first_time_borrower=False, has_income_proof=True, has_bank_statement_history=True)
    assert assess_readiness(CreditQuizAnswers(**base)).bucket == "strong"
    assert assess_readiness(CreditQuizAnswers(**{**base, "first_time_borrower": True, "has_bank_statement_history": False})).bucket == "thin_file"
    assert assess_readiness(CreditQuizAnswers(**{**base, "missed_emis_last_12_months": True})).bucket == "needs_repair"
    assert assess_readiness(CreditQuizAnswers(**{**base, "has_income_proof": False})).bucket == "fair"


def test_scheme_match_has_eligibility_and_fallback_when_none_yes():
    profile = Profile(state="Maharashtra", district="Nashik", capital=10_000, category="general", gender="m", age=30)
    result = match_schemes(SchemeMatchRequest(profile=profile, idea=Idea(business_id="dairy_small"), funding_gap=99_000_000))
    assert result.fallback_options
    assert all(match.eligibility == "no" for match in result.matches)


def test_operator2_routes_are_mountable_and_validate_response_shapes():
    app = FastAPI()
    for router in (finance_router, schemes_router, credit_router, suppliers_router):
        app.include_router(router)
    client = TestClient(app)
    investment = client.post("/api/v1/finance/investment", json={"idea": {"business_id": "dairy_small", "scale": "small"}, "district": "Nashik"})
    assert investment.status_code == 200
    assert investment.json()["total_investment"] > 0
    credit = client.post("/api/v1/credit/readiness", json={"existing_loans": False, "missed_emis_last_12_months": False, "uses_credit_card_responsibly": False, "first_time_borrower": True, "has_income_proof": False, "has_bank_statement_history": False})
    assert credit.status_code == 200
    assert credit.json()["bucket"] == "thin_file"
    suppliers = client.get("/api/v1/suppliers", params={"district": "Nashik"})
    assert suppliers.status_code == 200
    assert suppliers.json()[0]["is_demo"] is True


def test_saved_report_has_a_pdf_endpoint_with_platform_safe_failure():
    report_id = save_report("test-session", {"title": "मराठी feasibility report", "sections": [{"title": "Summary", "content": "Deterministic values only."}]})
    assert get_report(report_id)["title"] == "मराठी feasibility report"
    app = FastAPI()
    app.include_router(report_pdf_router)
    response = TestClient(app).get(f"/api/v1/report/{report_id}/pdf")
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        assert response.headers["content-type"].startswith("application/pdf")
        assert response.content.startswith(b"%PDF")
    else:
        assert "PDF rendering is unavailable" in response.json()["detail"]
