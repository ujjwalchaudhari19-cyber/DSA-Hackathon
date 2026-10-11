import asyncio


async def generate_report(req, svc, llm):
    warnings = []
    capital = req.profile["capital"]

    # wave 1: independent
    local, credit = await asyncio.gather(svc.local_get(req), svc.credit(req.profile), return_exceptions=True)
    if isinstance(local, Exception):
        raise local                                   # core data: fail the request
    if isinstance(credit, Exception):
        credit = None
        warnings.append({"code": "CREDIT_UNAVAILABLE", "section": "credit"})

    # wave 2: depend on local
    investment, market_score = await asyncio.gather(svc.investment(req, local), svc.market_factor(local))
    gap = svc.gap(investment["total"], capital)
    projection = svc.projection(req, local, investment)

    schemes, fallback_opts = ([], [])
    repayment, rate_source = None, None
    if gap["gap"] > 0:
        schemes, fallback_opts = svc.match(req.profile, gap["gap"], req.business, capital, investment["total"])
        best = next((s for s in schemes if s["eligible"] in ("yes", "partial") and s.get("interest_max")), None)
        rate = best["interest_max"] if best else svc.default_rate
        rate_source = f"scheme:{best['id']}" if best else "assumed_default"
        repayment = svc.repayment(gap["gap"], rate, req.tenure_months, projection)

    factors = {
        "market": market_score,
        "capital": svc.capital_factor(capital, investment["total"]),
        "repayment": svc.repayment_factor(repayment["dscr"] if repayment else None),
        "breakeven": svc.breakeven_factor(projection["break_even_months"]),
        "risk": svc.risk_factor(local)
    }
    score = svc.score(factors)
    if repayment and repayment.get("dscr") is not None and repayment["dscr"] < 1.0 and score["verdict"] == "highly_feasible":
        score["verdict"] = "feasible_with_conditions"

    ctx = {"gap": gap, "score": score, "repayment": repayment, "schemes": schemes}
    narrative, source = await llm.narrative(ctx, req.lang)
    if source == "fallback":
        warnings.append({"code": "NARRATIVE_FALLBACK", "section": "narrative"})

    return {
        "investment": investment,
        "funding": gap,
        "projection": projection,
        "schemes": schemes,
        "fallback_options": fallback_opts,
        "repayment": repayment,
        "rate_source": rate_source,
        "score": score,
        "narrative": narrative,
        "narrative_source": source,
        "credit": credit,
        "warnings": warnings,
        "data_confidence": local.get("confidence", "approximate")
    }

