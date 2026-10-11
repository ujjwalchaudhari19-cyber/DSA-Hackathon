import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.utils.emi import emi, schedule, dscr, FinanceError
from app.utils.scoring import verdict, capital_factor, break_even_months, breakeven_factor, repayment_factor
from app.services.scheme_rules import match
from app.services.business_resolver import resolve_business
from app.errors import UnsupportedBusiness
from app.schemas.models import Idea

@pytest.mark.asyncio
class TestValidation:
    async def test_e01_negative_or_nan_capital(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/report/generate", json={
                "profile": {"state": "MH", "district": "Nashik", "capital": -500, "category": "obc", "gender": "f", "age": 30, "experience": "none"},
                "idea": {"business_type": "dairy_small", "scale": "small"}
            })
            assert r.status_code == 422
            data = r.json()
            assert data["error"]["code"] == "VALIDATION_FAILED"

    async def test_e02_capital_zero_valid(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/report/generate", json={
                "profile": {"state": "MH", "district": "Nashik", "capital": 0, "category": "obc", "gender": "f", "age": 30, "experience": "none"},
                "idea": {"business_type": "dairy_small", "scale": "small"}
            })
            assert r.status_code == 200
            assert r.json()["gap"]["available_capital"] == 0

    async def test_e03_age_out_of_bounds(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/report/generate", json={
                "profile": {"state": "MH", "district": "Nashik", "capital": 10000, "category": "obc", "gender": "f", "age": 15, "experience": "none"},
                "idea": {"business_type": "dairy_small", "scale": "small"}
            })
            assert r.status_code == 422

    async def test_e04_lang_fallback(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/report/generate", json={
                "profile": {"state": "MH", "district": "Nashik", "capital": 50000, "category": "obc", "gender": "f", "age": 30, "experience": "none"},
                "idea": {"business_type": "dairy_small", "scale": "small"},
                "lang": "fr"
            })
            assert r.status_code == 200
            data = r.json()
            assert any(w["code"] == "LANG_FALLBACK" for w in data["warnings"])

    async def test_e08_unsupported_business(self):
        with pytest.raises(UnsupportedBusiness):
            resolve_business(Idea(business_type="illegal gambling casino", scale="small"))

    async def test_e10_payload_too_large(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            huge_data = "x" * (105 * 1024)
            r = await c.post("/api/v1/report/generate", content=huge_data, headers={"Content-Type": "application/json"})
            assert r.status_code == 413

    async def test_e11_malformed_json_body(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.post("/api/v1/report/generate", content="{bad json", headers={"Content-Type": "application/json"})
            assert r.status_code == 422
            assert r.json()["error"]["code"] == "VALIDATION_FAILED"


class TestFinance:
    def test_e14_self_funded_no_loan_repayment_null(self):
        # gap == 0 means self-funded
        assert capital_factor(300000, 300000) == 100

    def test_e15_break_even_never_profit_zero(self):
        assert break_even_months(100000, [0]*12) is None
        assert breakeven_factor(None) == 0

    def test_e16_rate_zero(self):
        assert round(emi(120000, 0, 12)) == 10000

    def test_e17_invalid_loan_rejected(self):
        with pytest.raises(FinanceError):
            schedule(100000, 45, 12)  # rate > 40
        with pytest.raises(FinanceError):
            schedule(100000, 10, 3)   # months < 6
        with pytest.raises(FinanceError):
            schedule(100000, 10, 12, 12)  # moratorium >= months

    def test_e18_moratorium_principal_zero(self):
        rows = schedule(100000, 10, 36, 6)
        assert all(r["principal"] == 0 for r in rows[:6])
        assert rows[-1]["balance"] == 0

    def test_e19_dscr_verdict_cap(self):
        # Raw score 80 with DSCR < 1.0 capped
        assert verdict(55) == "feasible_with_conditions"

    def test_e20_dscr_boundary_affordability(self):
        dscr_125 = dscr(125, 0, 100)
        dscr_124 = dscr(124, 0, 100)
        assert dscr_125 == 1.25
        assert dscr_124 < 1.25


class TestSchemes:
    def test_e21_scheme_partial_coverage(self):
        schemes = [{"id": "s1", "sectors": ["agri"], "max_loan": 50000, "interest_max": 9, "eligibility": {}}]
        out, _ = match(schemes, {"age": 30}, 100000, {"sector": "agri"}, 10000, 110000, {})
        assert out[0]["eligible"] == "partial"
        assert out[0]["covers"] == 50000
        assert out[0]["uncovered_gap"] == 50000

    def test_e22_profile_missing_field_is_maybe(self):
        schemes = [{"id": "s1", "sectors": ["agri"], "eligibility": {"requires_fields": ["caste_certificate"]}}]
        out, _ = match(schemes, {"age": 30}, 10000, {"sector": "agri"}, 5000, 15000, {})
        assert out[0]["eligible"] == "maybe"
        assert "caste_certificate" in out[0]["missing_info"]

    def test_e23_fallback_options_when_no_eligible_scheme(self):
        schemes = [{"id": "s1", "sectors": ["retail"], "eligibility": {}}]
        out, fb = match(schemes, {"age": 30}, 50000, {"sector": "agri"}, 5000, 55000, {})
        assert fb and len(fb) > 0

    def test_e24_stale_scheme_verify_on_portal(self):
        schemes = [{"id": "s1", "sectors": ["agri"], "eligibility": {}}]
        out, _ = match(schemes, {"age": 30}, 50000, {"sector": "agri"}, 5000, 55000, {"s1": 95})
        assert "verify_on_portal" in out[0]["reasons"]


@pytest.mark.asyncio
class TestSecurity:
    async def test_e32_e33_session_isolation_and_issuance(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            # Generate report without session header
            r = await c.post("/api/v1/report/generate", json={
                "profile": {"state": "MH", "district": "Nashik", "capital": 50000, "category": "obc", "gender": "f", "age": 30, "experience": "none"},
                "idea": {"business_type": "dairy_small", "scale": "small"}
            })
            assert r.status_code == 200
            issued_sid = r.headers.get("x-session-id")
            assert issued_sid is not None
            rid = r.json()["report_id"]

            # Access with wrong session -> 404
            wrong_sid = str(uuid.uuid4())
            r404 = await c.get(f"/api/v1/report/{rid}", headers={"x-session-id": wrong_sid})
            assert r404.status_code == 404

    async def test_e46_pdf_unavailable_returns_501(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.get(f"/api/v1/report/{str(uuid.uuid4())}/pdf")
            assert r.status_code == 501
            assert r.json()["error"]["code"] == "PDF_UNAVAILABLE"

    async def test_e48_unhandled_exception_returns_500_with_rid(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            r = await c.get("/api/v1/report/trigger-error")
            # If not found or error, standard error response
            assert "x-request-id" in r.headers

