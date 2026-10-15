import logging

from fastapi import APIRouter, HTTPException

from app.schemas.models import CompareRequest, ComparisonResponse
from app.services.compare_service import compare_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compare", tags=["Compare"])


@router.post("", response_model=ComparisonResponse)
async def compare_businesses(request: CompareRequest):
    """Compare 2-3 business options with deterministic metrics + LLM rationale."""
    try:
        result = await compare_service.compare(
            ideas=request.ideas,
            profile=request.profile,
            lang=request.lang
        )
        return result
    except Exception as e:
        logger.error(f"Compare failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
