import json
import logging

from app.llm.client import llm_client
from app.schemas.models import (
    DiscoveryAnswers,
    DiscoveryResponse,
    Language,
)
from app.services.op2_stubs import catalogue_filter

logger = logging.getLogger(__name__)


class DiscoveryService:
    """Handles business discovery: filters catalogue (Op 2) + ranks via LLM (Op 1)."""
    
    async def suggest(
        self, answers: DiscoveryAnswers, lang: Language
    ) -> DiscoveryResponse:
        """Filter business catalogue and rank top 5 with LLM explanations."""
        # Step 1: Get filtered businesses from Op 2
        filtered = await catalogue_filter(answers)
        
        if not filtered:
            return DiscoveryResponse(
                suggestions=[],
                note="No businesses match your current criteria. Try adjusting your budget or available space."
            )
        
        # Step 2: Send to LLM for ranking and explanation
        variables = {
            "interests": ", ".join(answers.interests),
            "budget_min": str(answers.budget_min),
            "budget_max": str(answers.budget_max),
            "time_commitment": answers.time_commitment,
            "skills": ", ".join(answers.skills) if answers.skills else "none specified",
            "space_available": answers.space_available,
            "location_type": answers.location_type,
            "electricity": str(answers.electricity),
            "water": str(answers.water),
            "filtered_businesses": json.dumps(
                [b.model_dump() for b in filtered], indent=2
            ),
        }
        
        result = await llm_client.generate_json(
            prompt_name="discovery_rank",
            variables=variables,
            schema=DiscoveryResponse,
            lang=lang.value,
            max_tokens=2048
        )
        return result


discovery_service = DiscoveryService()
