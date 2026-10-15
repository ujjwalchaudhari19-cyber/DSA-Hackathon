import json
import logging

from app.llm.client import llm_client
from app.schemas.models import Language, Profile, TailoredDocList
from app.services.op2_stubs import documents_base_lists

logger = logging.getLogger(__name__)


class DocumentService:
    """Enhances base document checklists with LLM tailoring."""
    
    async def get_tailored_checklist(
        self, business_type: str, profile: Profile, lang: Language
    ) -> TailoredDocList:
        """Get a tailored document checklist for the given business and profile."""
        # Get base lists from Op 2
        base = await documents_base_lists(business_type)
        
        variables = {
            "base_docs": json.dumps(base.model_dump(), indent=2),
            "business_type": business_type,
            "profile": json.dumps(profile.model_dump(), indent=2),
        }
        
        result = await llm_client.generate_json(
            prompt_name="document_tailor",
            variables=variables,
            schema=TailoredDocList,
            lang=lang.value,
            max_tokens=2000
        )
        return result


document_service = DocumentService()
