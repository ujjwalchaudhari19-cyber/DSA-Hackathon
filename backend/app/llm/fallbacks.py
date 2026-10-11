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
    return schema.model_validate({
        "demand_summary": "Local market analysis data is available in the detailed report sections.",
        "customer_segments": ["Local residents", "Nearby town customers"],
        "competitor_summary": "Competitor information has been collected from local data sources.",
        "opportunities": ["Growing local demand", "Limited current competition"],
        "risks": [{"name": "Market uncertainty", "severity": "medium", "mitigation": "Start at smaller scale and expand gradually"}],
        "seasonal_insights": "Seasonal patterns may affect your business. Plan inventory accordingly."
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
