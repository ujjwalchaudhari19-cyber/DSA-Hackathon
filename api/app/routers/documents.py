import logging

from fastapi import APIRouter, HTTPException

from app.schemas.models import DocumentChecklistRequest, TailoredDocList
from app.services.document_service import document_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/checklist", response_model=TailoredDocList)
async def document_checklist(request: DocumentChecklistRequest):
    """Generate a tailored document checklist based on business type and profile."""
    try:
        result = await document_service.get_tailored_checklist(
            business_type=request.business_type,
            profile=request.profile,
            lang=request.lang
        )
        return result
    except Exception as e:
        logger.error(f"Document checklist failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
