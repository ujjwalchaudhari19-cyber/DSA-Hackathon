import asyncio, pytest
from types import SimpleNamespace as NS
from app.llm.placeholders import check_text, fill, inr, NarrativeRejected
from app.services.scheme_rules import match, rank_key
from app.services.report_pipeline import generate_report
from app.utils.idempotency import Idempotency

def test_inr():
    assert inr(235000) == "₹2,35,000"
    assert inr(999) == "₹999"
    assert inr(12500000) == "₹1,25,00,000"

def test_placeholders_ok_and_fill():
    t = "Your gap is {{gap}} and EMI {{emi}}."
    check_text(t)
    assert fill(t, {"gap": inr(235000), "emi": inr(7638)}) == "Your gap is ₹2,35,000 and EMI ₹7,638."

@pytest.mark.parametrize("bad", ["Gap is 235000 rupees", "गैप २३५००० है", "uses {{secret}}"])
def test_placeholders_reject(bad):
    with pytest.raises(NarrativeRejected):
        check_text(bad)

def test_small_numbers_allowed():
    check_text("Plan for 4 cows over 12 months with {{emi}}")   # 1-2 digit numbers are fine

SCHEMES = [
  {"id":"a","sectors":["agri"],"max_loan":100000,"interest_max":9,"eligibility":{}},
  {"id":"b","sectors":["agri"],"max_loan":500000,"interest_max":11,"eligibility":{"own_contribution_pct":10}},
  {"id":"c","sectors":["retail"],"eligibility":{}},
]
BIZ = {"sector":"agri"}

def test_partial_and_rank():
    out, fb = match(SCHEMES, {"age":30,"gender":"f"}, 235000, BIZ, 50000, 285000, {})
    byid = {m["id"]: m for m in out}
    assert byid["a"]["eligible"] == "partial" and byid["a"]["uncovered_gap"] == 135000
    assert byid["b"]["eligible"] == "yes" and byid["c"]["eligible"] == "no"
    assert out[0]["id"] == "b" and fb == []

def test_own_contribution_low_is_maybe():
    out, _ = match(SCHEMES, {"age":30}, 280000, BIZ, 1000, 285000, {})
    assert {m["id"]: m for m in out}["b"]["eligible"] == "maybe"

def test_no_scheme_gives_fallbacks():
    out, fb = match([SCHEMES[2]], {"age":30}, 1000, BIZ, 0, 1000, {})
    assert fb and out[0]["eligible"] == "no"

class Svc:
    default_rate = 12
    def __init__(s, profit=8000, capital=50000, fail_credit=False):
        s.profit, s.cap, s.fc = profit, capital, fail_credit
    async def local_get(s, r):
        return {"confidence": "high"}
    async def credit(s, p):
        if s.fc:
            raise RuntimeError("x")
        return {"bucket": "thin_file"}
    async def investment(s, r, l):
        return {"total": 285000}
    async def market_factor(s, l):
        return 70
    def gap(s, t, c):
        return {"gap": max(0, t - c), "capital_ratio": c / t}
    def projection(s, r, l, i):
        return {"break_even_months": 36 if s.profit > 0 else None}
    def match(s, p, g, b, c, t):
        return ([{"id": "a", "eligible": "yes", "interest_max": 9}], [])
    def repayment(s, loan, rate, n, proj):
        return {"dscr": 1.3, "rate": rate}
    def capital_factor(s, c, t):
        return 35
    def repayment_factor(s, d):
        return 100 if d is None else 60
    def breakeven_factor(s, m):
        return 0 if m is None else 60
    def risk_factor(s, l):
        return 60
    def score(s, f):
        return {"score": 63, "verdict": "feasible_with_conditions"}

class LLM:
    def __init__(s, src="llm"):
        s.src = src
    async def narrative(s, ctx, lang):
        return ({"summary": "x"}, s.src)

def req(capital=50000):
    return NS(profile={"capital": capital}, business={"sector": "agri"}, tenure_months=36, lang="en")

def test_pipeline_with_loan_uses_scheme_rate():
    r = asyncio.run(generate_report(req(), Svc(), LLM()))
    assert r["rate_source"] == "scheme:a" and r["repayment"]["rate"] == 9 and r["warnings"] == []

def test_pipeline_self_funded():
    r = asyncio.run(generate_report(req(500000), Svc(capital=500000), LLM()))
    assert r["repayment"] is None and r["schemes"] == [] and r["rate_source"] is None

def test_pipeline_partial_failures_become_warnings():
    r = asyncio.run(generate_report(req(), Svc(fail_credit=True), LLM("fallback")))
    codes = {w["code"] for w in r["warnings"]}
    assert codes == {"CREDIT_UNAVAILABLE", "NARRATIVE_FALLBACK"} and r["credit"] is None

def test_single_flight():
    calls = []
    async def work():
        calls.append(1)
        await asyncio.sleep(0.05)
        return "ok"
    async def main():
        i = Idempotency()
        return await asyncio.gather(*[i.run("k", work) for _ in range(5)])
    res = asyncio.run(main())
    assert res == ["ok"] * 5 and len(calls) == 1

