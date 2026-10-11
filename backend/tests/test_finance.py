import pytest
from app.utils.emi import schedule, emi, dscr, year1_debt_service, FinanceError
from app.utils.scoring import (feasibility_score, verdict, break_even_months, breakeven_factor,
                    repayment_factor, capital_factor, WEIGHTS)

@pytest.mark.parametrize("mor", [0, 3, 6, 12])
def test_schedule_fully_repays(mor):
    rows = schedule(235000, 10.5, 36, mor)
    assert len(rows) == 36
    assert rows[-1]["balance"] == 0
    assert abs(sum(r["principal"] for r in rows) - 235000) <= 1          # 1 rupee tolerance

def test_moratorium_months_are_interest_only():
    rows = schedule(100000, 12, 24, 6)
    assert all(r["principal"] == 0 for r in rows[:6])
    assert rows[6]["principal"] > 0

def test_zero_rate():
    assert round(emi(120000, 0, 12)) == 10000

def test_emi_known_value():
    assert round(emi(100000, 12, 12), 2) == 8884.88                       # textbook value

@pytest.mark.parametrize("args", [(0,10,12), (-5,10,12), (1000,41,12), (1000,10,5), (1000,10,121), (1000,10,12,12)])
def test_invalid_loan_rejected(args):
    with pytest.raises(FinanceError):
        schedule(*args)

def test_dscr_no_loan_is_none_not_crash():
    assert dscr(100000, 0, 0) is None
    assert repayment_factor(None) == 100

def test_dscr_boundary():
    assert dscr(125, 0, 100) == 1.25
    assert dscr(124, 0, 100) < 1.25

def test_year1_debt_service_matches_schedule():
    rows = schedule(235000, 10.5, 36)
    i, p = year1_debt_service(rows)
    assert abs(i + p - sum(r["payment"] for r in rows[:12])) <= 1

def test_weights_sum_to_one():
    assert abs(sum(WEIGHTS.values()) - 1) < 1e-9

@pytest.mark.parametrize("s,label", [(39,"not_recommended"),(40,"risky"),(54,"risky"),
                                     (55,"feasible_with_conditions"),(74,"feasible_with_conditions"),(75,"highly_feasible")])
def test_verdict_thresholds(s, label):
    assert verdict(s) == label

def test_score_missing_factor_raises():
    with pytest.raises(KeyError):
        feasibility_score({"market": 50})

def test_break_even_never():
    assert break_even_months(100000, [-100]*12) is None
    assert breakeven_factor(None) == 0

def test_break_even_beyond_12_months_uses_cycle():
    assert break_even_months(285000, [8000]*12) == 36

def test_capital_factor_caps_at_100():
    assert capital_factor(500000, 285000) == 100
    with pytest.raises(ValueError):
        capital_factor(1000, 0)

