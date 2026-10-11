import json
import logging

from app.llm.client import llm_client
from app.schemas.models import Language, LocalAnalysisNarrative
from app.services.op2_stubs import local_market_get

logger = logging.getLogger(__name__)


class AnalysisService:
    """Generates local market analysis narratives using Op 2 data + LLM."""
    
    async def analyze_local(
        self, district: str, business_type: str, lang: Language
    ) -> LocalAnalysisNarrative:
        """Fetch local data from Op 2, generate narrative via LLM."""
        # Step 1: Get local data from Op 2
        local_data = await local_market_get(district, business_type)
        
        # Step 2: Generate narrative via LLM
        variables = {
            "local_data": json.dumps(local_data.model_dump(), indent=2),
            "business_type": business_type,
        }
        
        result = await llm_client.generate_json(
            prompt_name="local_analysis",
            variables=variables,
            schema=LocalAnalysisNarrative,
            lang=lang.value,
            max_tokens=2048
        )
        return result


analysis_service = AnalysisService()
