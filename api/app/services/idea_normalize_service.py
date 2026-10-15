import logging

from app.llm.client import llm_client
from app.schemas.models import Language, NormalizedIdea

logger = logging.getLogger(__name__)


class IdeaNormalizeService:
    """Normalizes freeform business idea input into structured format."""
    
    async def normalize(self, raw_input: str, lang: Language) -> NormalizedIdea:
        """Convert raw text/voice input to structured business idea."""
        variables = {
            "raw_input": raw_input,
        }
        
        result = await llm_client.generate_json(
            prompt_name="idea_normalize",
            variables=variables,
            schema=NormalizedIdea,
            lang=lang.value,
            max_tokens=1024
        )
        return result


idea_normalize_service = IdeaNormalizeService()
