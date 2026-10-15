import asyncio
import json
from types import SimpleNamespace as NS

import pytest

from app.llm.client import generate_json
from app.llm.fallbacks import get_fallback
from app.schemas.models import ReportNarrative


SUNIta_VARIABLES = {
    "lang": "en",
    "business_type": "dairy_small",
    "district": "Nashik",
    "total_investment": "Rs. 2,85,000",
    "fixed_cost": "Rs. 2,10,000",
    "working_capital": "Rs. 50,000",
    "available_capital": "Rs. 50,000",
    "gap": "Rs. 2,35,000",
    "annual_revenue": "Rs. 4,80,000",
    "annual_net_profit": "Rs. 1,20,000",
    "break_even_months": "9",
    "loan_amount": "Rs. 2,00,000",
    "interest_rate": "10.5%",
    "emi": "Rs. 4,299",
    "dscr": "1.31",
    "affordable": "True",
    "score": "68",
    "verdict": "Feasible with Conditions",
    "data_confidence": "medium",
    "warnings_text": "optimistic_assumptions; weak_downside",
    "local_data": json.dumps({
        "demand_level": "moderate", "competitor_count": 7,
        "avg_selling_price": 48, "market_score": 63,
        "risks": [{"name": "fodder-price volatility"}],
    }),
    "schemes": json.dumps([{
        "scheme_id": "mudra", "scheme_name": "Pradhan Mantri MUDRA Yojana",
        "eligible": "yes", "max_loan": 500000, "interest_range": "8%-12%",
        "how_to_apply": ["Apply at a participating bank branch"],
    }]),
    "document_checklist": json.dumps({
        "registration": [{
            "name": "Udyam Registration", "where_to_get": "udyamregistration.gov.in",
            "approx_time": "Immediate", "approx_cost": "Free",
        }, {
            "name": "FSSAI Registration", "where_to_get": "foscos.fssai.gov.in",
            "approx_time": "7-60 days", "approx_cost": "Rs. 100-5,000",
        }],
        "loan": [{
            "name": "Bank Statements", "where_to_get": "bank branch",
            "approx_time": "1-3 days", "approx_cost": "Free",
        }],
    }),
}


def narrative_for(lang="en") -> ReportNarrative:
    variables = {**SUNIta_VARIABLES, "lang": lang}
    return get_fallback("report_narrative", variables, ReportNarrative)


def test_sunita_golden_narrative_is_grounded_and_has_no_filler():
    narrative = narrative_for()
    content = narrative.model_dump_json().lower()
    assert all(phrase not in content for phrase in ("has been completed", "please review", "review the detailed"))

    expected_values = {
        "verdict_summary": ("Nashik", "Rs. 2,85,000"),
        "market_summary": ("moderate", "7"),
        "investment_summary": ("Rs. 2,85,000", "Rs. 50,000"),
        "funding_summary": ("Rs. 50,000", "Rs. 2,35,000"),
        "repayment_summary": ("Rs. 4,299", "1.31"),
        "break_even_summary": ("9", "Rs. 1,20,000"),
        "risk_summary": ("Nashik", "Rs. 50,000"),
    }
    for field, values in expected_values.items():
        section = getattr(narrative, field)
        assert len(section) >= 40
        assert all(value in section for value in values), field
    for quadrant in narrative.swot.model_dump().values():
        assert all(item["evidence_key"] for item in quadrant)
    assert any("foscos.fssai.gov.in" in step for step in narrative.next_steps)


@pytest.mark.parametrize("lang", ["en", "hi", "mr"])
def test_report_narrative_fallback_is_valid_in_supported_languages(lang):
    narrative = narrative_for(lang)
    assert isinstance(narrative, ReportNarrative)
    assert set(narrative.slide_titles) == {str(number) for number in range(1, 13)}
    assert all(len(title) <= 90 for title in narrative.slide_titles.values())


class Provider:
    def __init__(self, outputs):
        self.outputs = outputs
        self.calls = 0

    async def complete(self, **_kwargs):
        self.calls += 1
        return self.outputs.pop(0)


def test_report_schema_repair_retries_after_validation_error():
    valid_json = narrative_for().model_dump_json()
    provider = Provider([
        NS(text="{}", stop_reason="end_turn"),
        NS(text=valid_json, stop_reason="end_turn"),
    ])
    narrative, source = asyncio.run(generate_json(
        provider, "report_narrative", "system", "user", ReportNarrative, "en",
        lambda: narrative_for(), sleep=lambda _: asyncio.sleep(0),
    ))
    assert source == "llm"
    assert provider.calls == 2
    assert narrative.score if hasattr(narrative, "score") else narrative.verdict_summary
