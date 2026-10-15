import json
import logging

from app.llm.client import llm_client
from app.schemas.models import ComparisonResponse, Idea, Language, Profile
from app.services.op2_stubs import (
    finance_funding_gap,
    finance_projection,
    investment_estimate,
    local_market_get,
    scoring_feasibility_score,
)

logger = logging.getLogger(__name__)


class CompareService:
    """Compares 2-3 business options using Op 2 metrics + LLM rationale."""
    
    async def compare(
        self, ideas: list[Idea], profile: Profile, lang: Language
    ) -> ComparisonResponse:
        """Compare business ideas and identify the best fit."""
        metrics = []
        for idea in ideas:
            local = await local_market_get(profile.district, idea.business_type)
            inv = await investment_estimate(idea, local)
            gap = await finance_funding_gap(inv.total, profile.capital)
            proj = await finance_projection(idea, local, inv)
            score = await scoring_feasibility_score({
                "local_data": local,
                "gap": gap,
                "projection": proj,
                "repayment": None
            })
            metrics.append({
                "business_type": idea.business_type,
                "total_investment": inv.total,
                "gap": gap.gap,
                "capital_ratio": gap.capital_ratio,
                "annual_revenue": proj.annual_revenue,
                "annual_profit": proj.annual_net_profit,
                "break_even_months": proj.break_even_months,
                "feasibility_score": score.score,
                "verdict": score.verdict_display,
            })
        
        variables = {
            "options": json.dumps([i.model_dump() for i in ideas], indent=2),
            "metrics": json.dumps(metrics, indent=2),
            "profile": json.dumps(profile.model_dump(), indent=2),
        }
        
        result = await llm_client.generate_json(
            prompt_name="compare_rationale",
            variables=variables,
            schema=ComparisonResponse,
            lang=lang.value,
            max_tokens=1500
        )
        return result


compare_service = CompareService()
