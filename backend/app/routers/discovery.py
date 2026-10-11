import logging

from fastapi import APIRouter, HTTPException

from app.schemas.models import DiscoverRequest, DiscoveryResponse
from app.services.discovery_service import discovery_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/discover", tags=["Discovery"])


@router.post("/suggest", response_model=DiscoveryResponse)
async def suggest_businesses(request: DiscoverRequest):
    """Accept questionnaire answers, filter catalogue via Op 2, rank top 5 via LLM."""
    try:
        result = await discovery_service.suggest(request.answers, request.lang)
        return result
    except Exception as e:
        logger.error(f"Discovery suggest failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
