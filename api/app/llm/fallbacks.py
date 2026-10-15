import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

def get_fallback(prompt_name: str, variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Return a deterministic fallback when the LLM fails.
    
    Populates template text using Operator 2's deterministic values.
    Sets narrative_source='fallback' where applicable.
    """
    fallback_generators = {
        "report_narrative": _grounded_report_narrative_fallback,
        "discovery_rank": _discovery_fallback,
        "idea_normalize": _idea_normalize_fallback,
        "local_analysis": _local_analysis_fallback,
        "compare_rationale": _compare_fallback,
        "document_tailor": _document_tailor_fallback,
    }
    
    generator = fallback_generators.get(prompt_name)
    if generator:
        return generator(variables, schema)
    
    # Generic fallback: try to construct with minimal required fields
    logger.warning(f"No specific fallback for [{prompt_name}], using generic")
    return _generic_fallback(variables, schema)


def _grounded_report_narrative_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Safe fallback: only interpolate supplied report inputs and checklist data."""
    import json

    def parsed(value, default):
        try:
            return json.loads(value) if isinstance(value, str) else value
        except (TypeError, json.JSONDecodeError):
            return default

    business = str(variables.get("business_type", "enterprise"))
    title = business.replace("_", " ").title()
    district = str(variables.get("district", "district not specified"))
    local = parsed(variables.get("local_data", "{}"), {}) or {}
    schemes = parsed(variables.get("schemes", "[]"), []) or []
    docs = parsed(variables.get("document_checklist", "{}"), {}) or {}
    get = lambda key, default="not available": str(variables.get(key, default))
    total, fixed, working = get("total_investment"), get("fixed_cost"), get("working_capital")
    capital, gap, emi, dscr = get("available_capital"), get("gap"), get("emi"), get("dscr")
    score, break_even, revenue, profit = get("score"), get("break_even_months"), get("annual_revenue"), get("annual_net_profit")
    demand, competitors = local.get("demand_level", "information not available"), local.get("competitor_count", "information not available")
    price, market_score = local.get("avg_selling_price", "information not available"), local.get("market_score", "information not available")
    top = next((s for s in schemes if s.get("eligible") in ("yes", "partial", "maybe")), schemes[0] if schemes else {})
    scheme_name = str(top.get("scheme_name", "a listed scheme"))
    confidence_note = " Figures are estimates based on regional averages." if get("data_confidence") != "high" else ""
    warning_note = ""
    if "optimistic_assumptions" in get("warnings_text", ""):
        warning_note += " Projections assume high capacity utilisation, so actual results may be lower."
    if "weak_downside" in get("warnings_text", ""):
        warning_note += " A 20% revenue drop would make loan repayment harder; keep a contingency fund."
    risks = local.get("risks") if isinstance(local.get("risks"), list) else []
    risk_names = ", ".join(str(r.get("name", "local risk")) for r in risks[:2] if isinstance(r, dict)) or "no local risk details"
    doc_items = [item for group in (docs.get("registration", []), docs.get("loan", [])) for item in group if isinstance(item, dict)]
    next_steps = [
        f"Get {item.get('name', 'the listed document')} at {item.get('where_to_get', 'the listed office')}; allow {item.get('approx_time', 'the stated time')} and {item.get('approx_cost', 'the stated cost')}."
        for item in doc_items[:5]
    ]
    if any(word in business.lower() for word in ("dairy", "tiffin", "flour", "kirana", "food")) and not any("fssai" in step.lower() for step in next_steps):
        next_steps.insert(0, "Apply for FSSAI at foscos.fssai.gov.in; allow 7-60 days and Rs. 100-5,000.")
    while len(next_steps) < 3:
        next_steps.append("Register on udyamregistration.gov.in; allow immediate online processing and no fee.")
    slides = {
        "1": f"{title} in {district} scores {score}/100.",
        "2": f"Own capital of {capital} supports this plan.",
        "3": f"{district} records demand as {demand} and {competitors} competitors.",
        "4": f"Investment is {total}, including {working} working capital.",
        "5": f"The funding gap is {gap} after own capital of {capital}.",
        "6": f"The estimate is EMI {emi} with DSCR {dscr}.",
        "7": f"Break-even is month {break_even} and annual profit is {profit}.",
        "8": f"The feasibility score is {score}/100 for {district}.",
        "9": "The supplied local risk data is included in this report.",
        "10": f"Credit preparation should address the {gap} funding gap.",
        "11": f"Document preparation supports the {total} investment plan.",
        "12": f"Figures use {get('data_confidence')} confidence and need verification.",
    }
    swot = {
        "strengths": [
            {"text": f"Own capital of {capital} is recorded for this plan.", "evidence_key": "profile.capital"},
            {"text": f"The market score is {market_score} for {district}.", "evidence_key": "local_data.market_score"},
        ],
        "weaknesses": [
            {"text": f"The funding gap is {gap} against investment of {total}.", "evidence_key": "gap.gap"},
            {"text": f"Break-even is projected in month {break_even}.", "evidence_key": "projection.break_even_months"},
        ],
        "opportunities": ([{"text": f"{scheme_name} is included in the matched schemes.", "evidence_key": "schemes[0].scheme_name"}] if top else []),
        "threats": ([{"text": f"The supplied risk data lists {risk_names}.", "evidence_key": "local_data.risks"}] if risks else [{"text": f"Loan service depends on the reported DSCR of {dscr}.", "evidence_key": "repayment.dscr"}]),
    }
    return schema.model_validate({
        "verdict_summary": f"{title} in {district} scores {score}/100 with the verdict {get('verdict')}. Investment is {total} against own capital of {capital}, leaving a gap of {gap}.{warning_note}",
        "market_summary": f"The supplied data for {district} records demand as {demand} and {competitors} competitors. Average selling price is {price} and market score is {market_score}.{confidence_note}",
        "investment_summary": f"Computed investment is {total}, with fixed costs of {fixed} and working capital of {working}. These figures are inputs for the {title} plan.{confidence_note}",
        "funding_summary": f"Own capital of {capital} leaves a funding gap of {gap}. {scheme_name} is matched, with a listed maximum loan of {top.get('max_loan', 'not available')}.",
        "scheme_explanations": _build_scheme_explanations(schemes),
        "repayment_summary": f"The loan input is {get('loan_amount')} at {get('interest_rate')}, with EMI {emi}. DSCR is {dscr} and affordability is {get('affordable')}.{warning_note}",
        "break_even_summary": f"The base projection places break-even in month {break_even}. It reports annual revenue of {revenue} and annual net profit of {profit}.",
        "risk_summary": f"The supplied risk list for {district} names {risk_names}. Plan reserves using working capital of {working} and the funding gap of {gap}.{warning_note}",
        "swot": swot,
        "recommendations": [
            f"1. Submit the {scheme_name} application within 7 days for the {gap} gap.",
            f"2. Obtain quotations matching the {total} investment within 14 days.",
            f"3. Keep {working} working capital available before month {break_even}.",
            f"4. Confirm EMI of {emi} against DSCR {dscr} before signing.",
        ],
        "next_steps": next_steps[:5], "slide_titles": slides,
        "disclaimer": "This is advisory guidance, not a guarantee of loan approval, scheme eligibility, or business success. Verify the figures and requirements with official portals and the local bank branch.",
    })


def _report_narrative_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Fallback narrative using deterministic values from Operator 2.

    Produces genuinely specific text by interpolating the computed numbers from
    variables[]. Sets narrative_source='fallback' upstream.
    """
    lang = variables.get("lang", "en")
    business_type = variables.get("business_type", "enterprise")
    district = variables.get("district", "your district")
    total_investment = variables.get("total_investment", "₹0")
    gap = variables.get("gap", "₹0")
    emi = variables.get("emi", "₹0")
    dscr = variables.get("dscr", "N/A")
    score = variables.get("score", "N/A")
    verdict = variables.get("verdict", "Feasible with Conditions")
    break_even = variables.get("break_even_months", "N/A")
    annual_profit = variables.get("annual_net_profit", "₹0")
    capital = variables.get("available_capital", "₹0")
    scheme_names = _extract_top_scheme_names(variables.get("schemes", "[]"))
    top_scheme = scheme_names[0] if scheme_names else "MUDRA Yojana"
    data_confidence = variables.get("data_confidence", "approximate")
    warnings_text = variables.get("warnings_text", "")
    biz_title = business_type.replace("_", " ").title()

    confidence_note = (
        "" if data_confidence == "high"
        else " Note: market figures are estimates based on regional averages."
    )
    warning_note = ""
    if "optimistic_assumptions" in warnings_text:
        warning_note += " Projections assume high capacity utilisation; actual results may be lower."
    if "weak_downside" in warnings_text:
        warning_note += " A 20% revenue drop would stress loan repayment — keep a 3-month cash buffer."

    swot = _build_grounded_swot(business_type, district, variables, lang)

    slide_titles = {
        "1": f"{biz_title} in {district} scores {score}/100 — {verdict}."[:90],
        "2": f"Entrepreneur snapshot: {capital} own capital, {biz_title}, {district}."[:90],
        "3": f"Market data for {biz_title} in {district} shows local demand and competition."[:90],
        "4": f"Total investment of {total_investment} covers equipment, stock and contingency."[:90],
        "5": f"Funding gap of {gap} best filled by {top_scheme}."[:90],
        "6": f"Monthly EMI of {emi} with DSCR {dscr} — loan repayment analysis."[:90],
        "7": f"Break-even projected at month {break_even}; annual profit {annual_profit}."[:90],
        "8": f"Feasibility score {score}/100 — five-factor weighted assessment."[:90],
        "9": f"Top risks for {biz_title} and how to manage them."[:90],
        "10": f"Credit readiness: 30/60/90-day action plan for loan eligibility."[:90],
        "11": f"Documents and registrations needed to start and apply for a loan."[:90],
        "12": f"Assumptions, data sources and advisory disclaimer."[:90],
    }

    data = {
        "verdict_summary": _t(
            f"Your {biz_title} project in {district} has been assessed at {score}/100 "
            f"({verdict}). The total investment required is {total_investment} against "
            f"your available capital of {capital}, leaving a funding gap of {gap}. "
            f"{warning_note}",
            lang,
        ),
        "market_summary": _t(
            f"The local market for {biz_title} in {district} has been evaluated using "
            f"district-level data.{confidence_note} Competitor density and demand level "
            f"are reflected in the market score component of your feasibility rating.",
            lang,
        ),
        "investment_summary": _t(
            f"The total project investment of {total_investment} covers fixed assets, "
            f"initial working capital, and a 10% contingency buffer. "
            f"Fixed costs and working capital are itemised in the investment table above.",
            lang,
        ),
        "funding_summary": _t(
            f"Your funding gap of {gap} can be addressed through {top_scheme}, which "
            f"is the top-ranked matching scheme for your profile. "
            f"Review the scheme details below for subsidy percentage and application steps.",
            lang,
        ),
        "scheme_explanations": _build_scheme_explanations(variables.get("schemes", "[]")),
        "repayment_summary": _t(
            f"Your estimated monthly EMI is {emi} over the loan tenure. "
            f"The Debt Service Coverage Ratio (DSCR) of {dscr} measures your ability "
            f"to service this loan from projected business income — a DSCR above 1.25 "
            f"is generally required by lenders.",
            lang,
        ),
        "break_even_summary": _t(
            f"Based on the ramped 12-month projection, break-even is expected at month "
            f"{break_even}. Annual net profit is projected at {annual_profit}. "
            f"This means the business should cover its full startup cost by month {break_even}, "
            f"after which all profits are yours to reinvest or save.",
            lang,
        ),
        "risk_summary": _t(
            f"The primary risks for {biz_title} in {district} relate to input cost "
            f"volatility and seasonal demand fluctuation. Build a 2–3 month working "
            f"capital reserve to absorb cost spikes. Diversify revenue streams once "
            f"the business stabilises in the first 6 months.",
            lang,
        ),
        "swot": swot,
        "recommendations": [
            _t(f"Apply for {top_scheme} immediately — it is your top-ranked eligible scheme.", lang),
            _t(f"Register on udyamregistration.gov.in (free, Aadhaar-based) within 7 days.", lang),
            _t(f"Build a 3-month working capital reserve of at least 25% of {total_investment}.", lang),
            _t(f"Verify all investment figures with local supplier quotations before bank submission.", lang),
        ],
        "next_steps": _build_next_steps(business_type, variables, lang),
        "slide_titles": slide_titles,
        "disclaimer": _t(
            "This report is generated algorithmically for advisory and planning purposes only. "
            "It does not guarantee loan approval, scheme eligibility, or business success. "
            "Please verify all information with official portals and your local bank branch.",
            lang,
        ),
    }
    return schema.model_validate(data)


def _extract_top_scheme_names(schemes_json: str) -> list[str]:
    """Extract scheme names from the JSON string passed in variables."""
    import json
    try:
        schemes = json.loads(schemes_json) if isinstance(schemes_json, str) else schemes_json
        if not isinstance(schemes, list):
            return []
        names = []
        for s in schemes:
            if isinstance(s, dict):
                eligible = s.get("eligible", {})
                eligible_val = eligible.get("value", eligible) if isinstance(eligible, dict) else eligible
                if eligible_val in ("yes", "maybe"):
                    name = s.get("scheme_name") or s.get("name") or s.get("scheme_id", "")
                    if name:
                        names.append(name)
        return names[:3]
    except Exception:
        return []


def _build_scheme_explanations(schemes_json: str) -> dict[str, str]:
    """Build scheme_explanations dict from the serialised schemes list."""
    import json
    try:
        schemes = json.loads(schemes_json) if isinstance(schemes_json, str) else schemes_json
        if not isinstance(schemes, list):
            return {}
        result = {}
        for s in schemes[:4]:
            if not isinstance(s, dict):
                continue
            sid = s.get("scheme_id") or s.get("id", "")
            name = s.get("scheme_name") or s.get("name") or sid
            max_loan = s.get("max_loan") or s.get("max_gap", 0)
            interest = s.get("interest_range") or s.get("interest_note", "bank rate")
            how = s.get("how_to_apply", [])
            first_step = how[0] if how else "Apply at your nearest bank branch."
            eligible = s.get("eligible", {})
            eligible_val = eligible.get("value", eligible) if isinstance(eligible, dict) else eligible
            if eligible_val == "no":
                result[sid] = (
                    f"{name}: Not eligible for your current profile. "
                    f"Check reasons[] in the scheme table for details."
                )
            else:
                max_str = f"₹{max_loan:,.0f}" if isinstance(max_loan, (int, float)) and max_loan > 0 else "varies"
                result[sid] = (
                    f"{name} offers up to {max_str} at {interest}. "
                    f"Step 1: {first_step}"
                )
        return result
    except Exception:
        return {}


def _build_next_steps(business_type: str, variables: dict, lang: str) -> list[str]:
    """Build next_steps from scheme how_to_apply and doc requirements."""
    bt = business_type.lower()
    is_food = any(k in bt for k in ["dairy", "tiffin", "flour", "kirana", "food"])
    steps = [
        _t("Gather KYC documents: Aadhaar card, PAN card, and 2 passport photos.", lang),
        _t(
            "Register your business on udyamregistration.gov.in — free, instant, "
            "Aadhaar-based. This is mandatory for all scheme applications.",
            lang,
        ),
    ]
    if is_food:
        steps.append(_t(
            "Apply for FSSAI Basic Registration at foscos.fssai.gov.in — "
            "₹100 fee, 7-30 days processing. Mandatory for all food businesses.",
            lang,
        ))
    steps.extend([
        _t(
            "Visit your nearest bank branch or apply on udyamimitra.in with your "
            "GramUdyam project report, KYC documents, and equipment quotations.",
            lang,
        ),
        _t(
            "Open a dedicated current account for the business to build a "
            "verifiable transaction history before the loan is sanctioned.",
            lang,
        ),
    ])
    return steps[:5]


def _build_grounded_swot(business_type: str, district: str, variables: dict, lang: str) -> dict:
    """Build a SWOT with SWOTItem structure (text + evidence_key)."""
    bt = business_type.lower()
    score = variables.get("score", "N/A")
    gap = variables.get("gap", "₹0")
    capital = variables.get("available_capital", "₹0")
    scheme_names = _extract_top_scheme_names(variables.get("schemes", "[]"))
    top_scheme = scheme_names[0] if scheme_names else "MUDRA Yojana"
    break_even = variables.get("break_even_months", "N/A")
    dscr = variables.get("dscr", "N/A")

    def item(text: str, evidence_key: str) -> dict:
        return {"text": text, "evidence_key": evidence_key}

    if any(k in bt for k in ["dairy", "milk", "cattle", "cow"]):
        return {
            "strengths": [
                item(f"Daily milk off-take from local cooperative provides predictable cash flow in {district}.", "local_data.demand_level"),
                item(f"Own capital of {capital} reduces loan dependency and improves DSCR {dscr}.", "profile.capital"),
            ],
            "weaknesses": [
                item(f"Total investment of {variables.get('total_investment','₹0')} requires a funding gap of {gap}.", "gap.gap"),
                item("Animal health risk can halt production without livestock insurance coverage.", "local_data.risks"),
            ],
            "opportunities": [
                item(f"{top_scheme} provides collateral-free credit to close the funding gap.", "schemes[0].scheme_name"),
                item("Value-added dairy products (curd, paneer) can increase revenue per litre.", "local_data.avg_selling_price"),
            ],
            "threats": [
                item(f"Seasonal fodder price spikes in {district} can compress margins.", "local_data.seasonal_notes"),
                item("Cooperative procurement price revisions are outside the entrepreneur's control.", "local_data.risks"),
            ],
        }
    elif any(k in bt for k in ["kirana", "grocery", "general", "store"]):
        return {
            "strengths": [
                item(f"Year-round daily FMCG demand in {district} provides revenue stability.", "local_data.demand_level"),
                item(f"Feasibility score of {score}/100 reflects viable market fundamentals.", "score"),
            ],
            "weaknesses": [
                item(f"Funding gap of {gap} requires institutional credit to fully stock the store.", "gap.gap"),
                item("Credit sales (udhari) risk requires strict cash discipline.", "local_data.risks"),
            ],
            "opportunities": [
                item(f"{top_scheme} provides collateral-free credit for stock and fixtures.", "schemes[0].scheme_name"),
                item("UPI payment acceptance can attract younger customers and improve tracking.", "local_data.demand_level"),
            ],
            "threats": [
                item(f"Competitor density in {district} could intensify with new entrants.", "local_data.competitor_count"),
                item("FMCG wholesale price fluctuations directly affect margins.", "local_data.risks"),
            ],
        }
    else:
        biz_title = bt.replace("_", " ").title()
        return {
            "strengths": [
                item(f"Feasibility score of {score}/100 confirms the business is viable in {district}.", "score"),
                item(f"Own capital of {capital} provides an equity foundation for the project.", "profile.capital"),
            ],
            "weaknesses": [
                item(f"Funding gap of {gap} means institutional credit is required to proceed.", "gap.gap"),
                item("Break-even at month {break_even} requires sustained effort before full profitability.".format(break_even=break_even), "projection.break_even_months"),
            ],
            "opportunities": [
                item(f"{top_scheme} provides government-backed credit at subsidised rates.", "schemes[0].scheme_name"),
                item(f"District-level demand for {biz_title} services is captured in the market score.", "local_data.market_score"),
            ],
            "threats": [
                item(f"Input cost volatility in {district} could affect working capital needs.", "local_data.risks"),
                item("DSCR of {dscr} must stay above 1.25 to remain bankable.".format(dscr=dscr), "repayment.dscr"),
            ],
        }


def _build_swot(business_type: str, district: str, lang: str) -> dict:
    """Generate a business-type-aware SWOT dict for the fallback path."""
    bt = business_type.lower()

    if any(k in bt for k in ["transport", "truck", "freight", "logistics", "tempo"]):
        return {
            "strengths": [
                "High and consistent demand for goods movement between mandis and urban centres.",
                "Commercial vehicle can be used for multiple cargo categories reducing downtime.",
                "No perishable product risk — revenue depends on kilometres run.",
            ],
            "weaknesses": [
                "High upfront vehicle cost requires significant loan or down-payment.",
                "Business highly dependent on individual driver health and availability.",
                "Working capital tied up in fuel and tolls before freight payment is received.",
            ],
            "opportunities": [
                "Mudra Tarun and Stand-Up India provide collateral-free vehicle financing.",
                "FPO direct-haulage contracts offer steady monthly income guarantee.",
                "GPS tracking and digital freight platforms can reduce deadhead runs.",
            ],
            "threats": [
                "Diesel price volatility can erode margins rapidly without escalation clauses.",
                "Competition from established fleet operators on popular routes.",
                "Seasonal slowdown during monsoon affecting road access and cargo volume.",
            ],
        }
    elif any(k in bt for k in ["kirana", "grocery", "general", "store"]):
        return {
            "strengths": [
                "Year-round daily demand for essential goods ensures stable revenue.",
                "Low technical skill barrier — manageable with basic retail experience.",
                "Proximity to residential cluster reduces customer acquisition cost.",
            ],
            "weaknesses": [
                "High working capital locked in inventory with slow turnover on some items.",
                "Credit sales (udhari) to known customers can strain cash flow.",
                "Thin margins require high volume to generate meaningful profit.",
            ],
            "opportunities": [
                "UPI and digital payments attract younger customers and improve tracking.",
                "Direct distributor sourcing can improve margins by 3-5%.",
                "PMEGP or Mudra Kishore funding available for stock and fixtures.",
            ],
            "threats": [
                "Growing presence of modern trade and e-commerce in semi-urban areas.",
                "New kirana competitors can open with minimal investment.",
                "Festive demand spikes may require short-term credit not always available.",
            ],
        }
    elif any(k in bt for k in ["dairy", "milk", "cattle", "cow"]):
        return {
            "strengths": [
                "Guaranteed daily off-take by local dairy cooperative ensures cash flow.",
                "Animal assets retain residual value as collateral for future credit.",
                "Secondary revenue from dung slurry and organic manure sales.",
            ],
            "weaknesses": [
                "Business heavily dependent on animal health — veterinary risk is real.",
                "Daily labour intensive with no holidays affecting work-life balance.",
                "High initial cost of quality milch cattle strains early capital.",
            ],
            "opportunities": [
                "Value-added products (curd, paneer, ghee) can triple per-litre revenue.",
                "Nabard Dairy Entrepreneurship Development Scheme offers 25% subsidy.",
                "Organic and A2 milk premium pricing is growing in nearby urban markets.",
            ],
            "threats": [
                "Fodder price spikes during drought years compress margins severely.",
                "Disease outbreaks (FMD, mastitis) can halt production with no insurance.",
                "Cooperative price revisions can reduce realisation without notice.",
            ],
        }
    elif any(k in bt for k in ["flour", "mill", "spice", "chakki"]):
        return {
            "strengths": [
                "Year-round steady demand from households and small eateries.",
                "No perishability risk — grain and spices have long shelf life.",
                "Low competition in rural clusters — nearest rival often 5+ km away.",
            ],
            "weaknesses": [
                "Dependence on stable 3-phase electricity supply for uninterrupted operation.",
                "Machine breakdowns during peak season can cause revenue loss.",
                "Skilled technician needed for pulveriser maintenance.",
            ],
            "opportunities": [
                "PM-FME scheme provides 35% credit-linked capital subsidy on machinery.",
                "Branded packaged spice pouches can command 40% premium over loose sale.",
                "FPO or cooperative tie-up for bulk grain processing at guaranteed rates.",
            ],
            "threats": [
                "New competitors setting up identical mills within the same cluster.",
                "Power tariff hikes directly reduce net margin per kg processed.",
                "Irregular monsoon affecting local grain availability and pricing.",
            ],
        }
    elif any(k in bt for k in ["tailoring", "tailor", "boutique", "stitch"]):
        return {
            "strengths": [
                "Festive and wedding season demand creates high-revenue peaks.",
                "Skill-based barrier to entry protects against unskilled competition.",
                "Low space requirement — a single room is sufficient to start.",
            ],
            "weaknesses": [
                "Revenue directly dependent on operator hours — not easily scalable alone.",
                "Seasonal demand fluctuation creates uneven monthly cash flow.",
                "Fabric procurement requires working capital in advance.",
            ],
            "opportunities": [
                "School uniform bulk orders from local schools provide stable income.",
                "Mudra Shishu / Kishore loan for machine upgrades at priority rates.",
                "Online fashion platforms open markets beyond the immediate village.",
            ],
            "threats": [
                "Ready-made garment availability at affordable prices from nearby towns.",
                "Fabric price increases reducing customer willingness to pay for tailoring.",
                "Competition from trained youth emerging from ITI tailoring courses.",
            ],
        }
    elif any(k in bt for k in ["poultry", "broiler", "chicken"]):
        return {
            "strengths": [
                "Short production cycle (42 days) enables rapid capital turnover.",
                "Integrator/contract farming model provides guaranteed price and chick supply.",
                "Growing protein demand in rural and semi-urban households.",
            ],
            "weaknesses": [
                "Disease risk (bird flu, Newcastle disease) can wipe out an entire batch.",
                "Working capital required for each batch cycle even before sale.",
                "Odour and waste management require careful shed placement.",
            ],
            "opportunities": [
                "NABARD poultry venture capital fund provides 25% back-ended subsidy.",
                "Contract arrangement with large integrators reduces price risk significantly.",
                "Rural cold chain growth enables value-added processed chicken products.",
            ],
            "threats": [
                "Bird flu scare creates sudden demand collapses and market closures.",
                "Feed cost (60% of revenue) highly volatile with global grain prices.",
                "Competition from commercial integrator-owned large units on price.",
            ],
        }
    elif any(k in bt for k in ["mobile", "repair", "phone"]):
        return {
            "strengths": [
                "Every household owns at least one mobile device — demand is universal.",
                "Low rent requirement — a small counter near bus stand is sufficient.",
                "Quick turnaround repairs generate same-day cash flow.",
            ],
            "weaknesses": [
                "Rapidly changing smartphone models require continuous skills upgrade.",
                "Spare parts procurement quality directly impacts reputation.",
                "Income dependent on single operator — illness halts revenue.",
            ],
            "opportunities": [
                "Battery and screen replacements are high-margin, high-frequency services.",
                "CGTMSE-backed Mudra loan for test equipment and spare parts stock.",
                "Expanding to mobile accessories retail can boost basket value.",
            ],
            "threats": [
                "Brand service centres expanding to taluka-level towns.",
                "Decline in feature phone repairs as smartphones dominate.",
                "Online spare parts suppliers reducing workshop margins.",
            ],
        }
    else:
        title = bt.replace("_", " ").title() or "Enterprise"
        return {
            "strengths": [
                f"Growing local demand for quality {title} in the target district.",
                "First-mover advantage in an underserved rural cluster.",
                "Government priority sector lending available for micro-enterprises.",
            ],
            "weaknesses": [
                "Limited initial scale constrains revenue until customer base grows.",
                "Working capital management critical in the first 6 months.",
                "Dependence on single operator increases key-person risk.",
            ],
            "opportunities": [
                "PMEGP and Mudra Yojana provide collateral-free credit at subsidised rates.",
                "Rural digital payment adoption opens new customer channels.",
                "FPO and cooperative linkages can provide bulk supply or demand contracts.",
            ],
            "threats": [
                "Input price volatility can compress margins without hedging.",
                "New competitors may enter with lower pricing once market is proven.",
                "Seasonal demand fluctuation requires working capital buffer.",
            ],
        }


def _discovery_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    return schema.model_validate({
        "suggestions": [],
        "note": "AI suggestions are temporarily unavailable. Please try again or browse our business catalogue."
    })


def _idea_normalize_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    raw = variables.get("raw_input", "")
    return schema.model_validate({
        "business_type": raw.lower().strip(),
        "scale": "small",
        "products": [],
        "target_customer": "local community",
        "ambiguities": ["Could not automatically parse your input. Please select from the business catalogue."],
        "clarifying_questions": ["What type of business would you like to start?", "What scale are you planning?"],
        "confidence": 0.2
    })


def _local_analysis_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    raw_bt = str(variables.get("business_type", "")).lower()
    
    if any(k in raw_bt for k in ["truck", "transport", "freight", "vehicle", "logistics", "tempo"]):
        return schema.model_validate({
            "demand_summary": "High demand for agricultural produce and commercial goods transport connecting rural mandis with regional market hubs.",
            "customer_segments": ["Mandi grain & vegetable merchants", "Fertilizer & seed distributors", "Local construction contractors", "Regional FMCG stockists"],
            "competitor_summary": "Local transport operators are largely individual vehicle owners lacking scheduled trip management, digital dispatching, and GPS tracking.",
            "opportunities": ["Direct annual haulage contracts with Farmer Producer Organizations (FPOs)", "Return-trip cargo load booking to eliminate deadhead runs", "Mudra Tarun / Stand-Up India commercial vehicle financing support"],
            "risks": [
                {"name": "Diesel price volatility", "severity": "medium", "mitigation": "Incorporate fuel index escalation clauses into freight contracts"},
                {"name": "Preventive maintenance & tyre wear", "severity": "medium", "mitigation": "Follow regular OEM servicing intervals and maintain working capital reserve"}
            ],
            "seasonal_insights": "Peak freight haulage demand occurs during post-harvest marketing months (March-May and Oct-Jan) and infrastructure construction cycles."
        })
    elif any(k in raw_bt for k in ["flour", "mill", "spice"]):
        return schema.model_validate({
            "demand_summary": "Consistent household demand for custom wheat/grain milling and packaged spice grinding across village clusters.",
            "customer_segments": ["Rural households", "Local sweet shops and eateries", "Weekly haat customers"],
            "competitor_summary": "Existing mills rely on outdated single-purpose machines with slow turnaround times.",
            "opportunities": ["Adding spice pulverizer to capture high-margin turmeric and chilli processing", "PM-FME 35% credit-linked capital subsidy"],
            "risks": [
                {"name": "3-phase power supply interruptions", "severity": "medium", "mitigation": "Install heavy-duty generator or solar backup system"}
            ],
            "seasonal_insights": "Highest demand during wheat harvest (March-May) and festive seasons (Oct-Dec)."
        })
    elif any(k in raw_bt for k in ["kirana", "grocery", "general"]):
        return schema.model_validate({
            "demand_summary": "Year-round daily consumption demand for FMCG, packaged foods, and household essentials.",
            "customer_segments": ["Local village households", "Agricultural laborers", "Commuters"],
            "competitor_summary": "Traditional shops suffer from stock-outs, cluttered layouts, and lack of digital payment options.",
            "opportunities": ["Distributor direct sourcing for 3-5% margin improvement", "Home delivery and digital UPI enablement"],
            "risks": [
                {"name": "Credit sales (udhari) non-recovery", "severity": "medium", "mitigation": "Set strict 15% cap on credit sales and maintain digital ledger"}
            ],
            "seasonal_insights": "Sales surge during festival seasons (Diwali, Holi) and harvest liquidation periods."
        })
    elif any(k in raw_bt for k in ["dairy", "milk", "cattle", "cow"]):
        return schema.model_validate({
            "demand_summary": "Guaranteed daily off-take by village dairy cooperative societies and steady local household demand.",
            "customer_segments": ["Dairy cooperative chilling centers", "Local sweet vendors & tea stalls", "Neighborhood families"],
            "competitor_summary": "Small unorganized producers with 1-2 cows lacking scientific fodder management.",
            "opportunities": ["Value addition through curd, paneer, and ghee", "Mudra / KCC subsidized livestock credit"],
            "risks": [
                {"name": "Dry fodder and feed price volatility", "severity": "medium", "mitigation": "Store seasonal silage and cultivate green fodder"}
            ],
            "seasonal_insights": "Milk yield peaks in winter (flush season); pricing firms up during summer (lean season)."
        })
    else:
        title = raw_bt.replace("_", " ").title() if raw_bt else "Enterprise"
        return schema.model_validate({
            "demand_summary": f"Growing local demand for quality {title} products and services in the target district.",
            "customer_segments": [f"Local residents & consumers seeking {title}", "Nearby village catchment clusters", "Local retail and trade buyers"],
            "competitor_summary": "Local competitors are unorganized with standard offerings, leaving substantial room for modern customer service.",
            "opportunities": [f"First-mover advantage in organized {title} offerings", "PMEGP / Mudra collateral-free government credit support"],
            "risks": [
                {"name": "Working capital fluctuations", "severity": "medium", "mitigation": "Maintain a 3-month operational cash reserve"}
            ],
            "seasonal_insights": "Demand increases during festival periods, harvest celebrations, and regional market days."
        })


def _compare_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    ideas = variables.get("ideas", [])
    entries = []
    for i, idea in enumerate(ideas if isinstance(ideas, list) else []):
        bid = idea.get("business_type", f"option_{i+1}") if isinstance(idea, dict) else f"option_{i+1}"
        entries.append({
            "business_id": bid,
            "business_name": bid.replace("_", " ").title(),
            "rationale": "Please review the numerical comparison in the table above."
        })
    return schema.model_validate({
        "best_fit_id": entries[0]["business_id"] if entries else "unknown",
        "best_fit_reason": "AI comparison is temporarily unavailable. Please compare the numbers directly.",
        "entries": entries
    })


def _document_tailor_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    return schema.model_validate({
        "registration": [],
        "loan": [],
        "additional_notes": "Detailed document guidance is temporarily unavailable. Please refer to the base document checklist."
    })


def _generic_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Try to create a minimal valid instance of the schema."""
    # Get required fields and try to fill them with defaults
    fields = schema.model_fields
    data = {}
    for name, field in fields.items():
        if field.is_required():
            if field.annotation == str:
                data[name] = "Temporarily unavailable"
            elif field.annotation == list:
                data[name] = []
            elif field.annotation == dict:
                data[name] = {}
            elif field.annotation == float:
                data[name] = 0.0
            elif field.annotation == int:
                data[name] = 0
            elif field.annotation == bool:
                data[name] = False
    return schema.model_validate(data)


def _t(text_en: str, lang: str) -> str:
    """Placeholder for translations in fallback mode.
    In production, this would look up a translation table.
    For now, returns English text with a note."""
    # Fallbacks are always in English; LLM handles translation when available
    return text_en
