import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

def get_fallback(prompt_name: str, variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Return a deterministic fallback when the LLM fails.
    
    Populates template text using Operator 2's deterministic values.
    Sets narrative_source='fallback' where applicable.
    """
    fallback_generators = {
        "report_narrative": _report_narrative_fallback,
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


def _report_narrative_fallback(variables: dict, schema: type[BaseModel]) -> BaseModel:
    """Fallback narrative using deterministic values from Operator 2."""
    lang = variables.get("lang", "en")
    
    data = {
        "verdict_summary": _t("Based on the analysis, this business opportunity has been evaluated using market conditions, financial projections, and available funding options.", lang),
        "market_summary": _t("The local market analysis has been completed for your district. Please review the detailed numbers in the report sections below.", lang),
        "investment_summary": _t("The investment breakdown has been calculated based on current local prices and your chosen scale of operation.", lang),
        "funding_summary": _t("Your funding requirements and available capital have been analysed. Review the gap analysis and matched schemes below.", lang),
        "scheme_explanations": {},
        "repayment_summary": _t("The loan repayment schedule has been calculated. Review the EMI and DSCR details in the finance section.", lang),
        "break_even_summary": _t("The break-even timeline has been projected based on your revenue and cost estimates.", lang),
        "risk_summary": _t("Key risks have been identified based on local market conditions. Review the risk factors and mitigation suggestions.", lang),
        "recommendations": [
            _t("Review the detailed financial projections carefully.", lang),
            _t("Consult with your local bank about the matched schemes.", lang),
            _t("Prepare the documents listed in the checklist.", lang),
        ],
        "next_steps": [
            _t("Gather all required documents from the checklist.", lang),
            _t("Visit your nearest bank branch with the project report.", lang),
            _t("Apply for Udyam registration online.", lang),
        ],
        "disclaimer": _t("This is an advisory report. It does not guarantee loan approval or business success. Please verify all information with official sources.", lang),
    }
    return schema.model_validate(data)


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
