import logging

from fastapi import APIRouter, HTTPException

from app.schemas.models import LocalAnalysisNarrative, LocalAnalysisRequest
from app.services.analysis_service import analysis_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/local", response_model=LocalAnalysisNarrative)
async def local_analysis(request: LocalAnalysisRequest):
    """Generate local market analysis narrative from Op 2 data."""
    try:
        result = await analysis_service.analyze_local(
            request.district, request.business_type, request.lang
        )
        return result
    except Exception as e:
        logger.error(f"Local analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
