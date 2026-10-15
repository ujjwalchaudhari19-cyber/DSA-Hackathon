import logging

from fastapi import APIRouter, HTTPException

from app.schemas.models import IdeaNormalizeRequest, NormalizedIdea
from app.services.idea_normalize_service import idea_normalize_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/idea", tags=["Idea"])


@router.post("/normalize", response_model=NormalizedIdea)
async def normalize_idea(request: IdeaNormalizeRequest):
    """Normalize free text/voice business idea input into structured format."""
    try:
        result = await idea_normalize_service.normalize(request.raw_input, request.lang)
        return result
    except Exception as e:
        logger.error(f"Idea normalization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
