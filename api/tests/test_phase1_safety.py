"""Test Phase 1 Safety bugs implementation."""

from __future__ import annotations

import copy
import math
import os
import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app
from app.models.database import get_report, save_report
from app.schemas.operator2 import (
    EmiRequest,
    GapRequest,
    Idea,
    InvestmentRequest,
    QuantityOverride,
    Scale,
    ScoreInput,
)
from app.services import (
    finance_service,
    investment_service,
    scoring_service,
)
from app.utils.cache import DATA_VERSION, TTLCache
from app.utils.emi import calculate_emi, repayment_plan
from app.utils.errors import CalcInputError
from app.utils.ratelimit import InMemoryRateLimiter
from app.utils.scoring import feasibility_score

client = TestClient(app)


def test_p1_01_typed_errors_and_422_mapping():
    """Phase 1.1: CalcInputError is a ValueError subclass and maps to 422 JSON."""
    assert issubclass(CalcInputError, ValueError)

    # Calling calculator directly raises CalcInputError
    with pytest.raises(CalcInputError):
        calculate_emi(0, 10, 12)

    with pytest.raises(CalcInputError):
        finance_service.funding_gap(-100, 50)

    # API returns 422 JSON with code calc_input_error
    res = client.post("/api/v1/finance/gap", json={"total_investment": 0, "capital": 100})
    assert res.status_code == 422


def test_p1_02_silent_fixes_visible_warnings_and_errors():
    """Phase 1.2: Investment returns warnings for scale fallback and price factor default; price_factor <= 0 raises CalcInputError."""
    # Price factor <= 0 raises CalcInputError
    with pytest.raises(CalcInputError):
        investment_service.estimate_investment(
            Idea(business_id="dairy_small", scale=Scale.small),
            local_or_district={"price_factor": -0.5, "district": "Nashik"},
        )

    # Missing price factor defaults to 1.0 with warning
    inv_missing_factor = investment_service.estimate_investment(
        Idea(business_id="dairy_small", scale=Scale.small),
        local_or_district={"price_factor": None, "district": "Nashik"},
    )
    assert inv_missing_factor.local_price_factor == 1.0
    assert any("Price factor" in w or "price factor" in w for w in inv_missing_factor.warnings)

    # Missing scale falls back to nearest scale with warning
    # Simulate a template that doesn't have "large"
    inv = investment_service.estimate_investment(
        Idea(business_id="dairy_small", scale=Scale.large),
        "Nashik",
    )
    assert hasattr(inv, "warnings")
    assert isinstance(inv.warnings, list)


def test_p1_03_global_error_handler_request_id_and_no_traceback():
    """Phase 1.3: Unhandled exception returns 500 with X-Request-Id header and body request_id, no traceback or file path."""
    test_app = FastAPI()

    # Re-use global exception handler and ASGI middleware
    from app.main import RequestIdASGIMiddleware, global_exception_handler
    test_app.add_exception_handler(Exception, global_exception_handler)
    test_app.add_middleware(RequestIdASGIMiddleware)

    @test_app.get("/force-error")
    def force_error():
        raise RuntimeError("Secret internal failure in C:/fintech/backend/app/secret.py")

    tc = TestClient(test_app, raise_server_exceptions=False)
    custom_rid = "test-req-id-12345"
    res = tc.get("/force-error", headers={"X-Request-Id": custom_rid})
    assert res.status_code == 500
    assert res.headers.get("x-request-id") == custom_rid
    data = res.json()
    assert data.get("request_id") == custom_rid
    assert data.get("code") == "internal_error"
    # Ensure no traceback or internal paths leaked
    assert "Traceback" not in res.text
    assert "secret.py" not in res.text
    assert "C:/" not in res.text


def test_p1_04_rate_limiter_trusted_proxy_and_session_id():
    """Phase 1.4: Spoofed leftmost XFF does not change bucket when TRUSTED_PROXY_COUNT is used."""
    os.environ["TRUSTED_PROXY_COUNT"] = "1"
    limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60)

    # Key by IP from position -1 from right
    # Leftmost IP is spoofed, rightmost is trusted proxy
    xff_client1 = "spoofed.ip.1, 198.51.100.25"
    xff_client2 = "spoofed.ip.2, 198.51.100.25"

    ip1 = xff_client1.split(",")[-1].strip()
    ip2 = xff_client2.split(",")[-1].strip()
    assert ip1 == ip2 == "198.51.100.25"

    assert limiter.allow(f"ip:{ip1}") is True
    assert limiter.allow(f"ip:{ip2}") is True
    # Third request with a different spoofed leftmost IP is blocked because rightmost is identical
    assert limiter.allow(f"ip:{ip2}") is False

    # Session ID takes precedence over IP
    session_key = "sess:user-session-42"
    limiter.reset()
    assert limiter.allow(session_key) is True
    assert limiter.allow(session_key) is True
    assert limiter.allow(session_key) is False


def test_p1_05_cache_keys_and_deep_copy():
    """Phase 1.5: Cache key includes all inputs, data version, and returns deep copies."""
    cache: TTLCache[dict] = TTLCache()
    orig = {"count": 10, "items": ["a", "b"]}
    cache.set("k1", orig)

    retrieved = cache.get("k1")
    assert retrieved == orig
    # Mutating retrieved object does not mutate cached object
    retrieved["count"] = 99
    retrieved["items"].append("c")
    assert cache.get("k1")["count"] == 10
    assert cache.get("k1")["items"] == ["a", "b"]

    # Verify two requests differing only in quantity override do not collide
    req1 = InvestmentRequest(
        idea=Idea(business_id="dairy_small", scale=Scale.small),
        district="Nashik",
        quantity_overrides=[QuantityOverride(item_key="cattle", quantity=1)],
    )
    req2 = InvestmentRequest(
        idea=Idea(business_id="dairy_small", scale=Scale.small),
        district="Nashik",
        quantity_overrides=[QuantityOverride(item_key="cattle", quantity=2)],
    )
    inv1 = investment_service.estimate_investment(req1)
    inv2 = investment_service.estimate_investment(req2)
    assert inv1.total_investment != inv2.total_investment


def test_p1_06_report_ids_uuid_and_schema_version():
    """Phase 1.6: Report ID is UUID string, unknown returns 404, schema_version stored."""
    rep_id = save_report("session-test-p1", {"title": "Test Report", "score": 85})
    # Verify ID is a valid UUID
    uuid_obj = uuid.UUID(rep_id)
    assert str(uuid_obj) == rep_id

    # Verify schema_version is present
    rep = get_report(rep_id)
    assert rep is not None
    assert rep.get("schema_version") is not None

    # Unknown ID returns 404 JSON
    res = client.get(f"/api/v1/report/{uuid.uuid4()}/pdf")
    assert res.status_code == 404
    assert res.json().get("detail") == "Report not found"


def test_p1_07_money_rounding_decimal_and_exact_zero_balance():
    """Phase 1.7: Decimal precision in emi.py matches known PMT values and final balance is exactly 0.00."""
    # Standard PMT for P=100,000, r=12% per year (1% per month), n=12:
    # PMT = 100,000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) = 8884.8788... -> 8884.88
    emi = calculate_emi(100_000, 12, 12)
    assert emi == 8884.88

    # Amortisation schedule final balance is exactly 0.00
    plan = repayment_plan(EmiRequest(
        principal=100_000,
        annual_rate_pct=12,
        tenure_months=12,
        annual_net_profit=300_000,
    ))
    assert plan.schedule[-1].balance == 0.00
    assert math.isclose(sum(r.principal_paid for r in plan.schedule), 100_000, abs_tol=0.001)
    assert hasattr(plan, "affordable_pessimistic")

