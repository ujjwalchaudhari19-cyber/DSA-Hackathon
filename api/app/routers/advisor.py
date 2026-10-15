import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.models import AdvisorChatRequest
from app.services.advisor_service import advisor_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/advisor", tags=["Advisor"])


@router.post("/chat")
async def advisor_chat(request: AdvisorChatRequest):
    """Context-aware AI advisor with SSE streaming."""
    try:
        async def event_stream():
            async for chunk in advisor_service.chat(
                message=request.message,
                session_id=request.session_id,
                profile=request.profile,
                report_summary=request.report_summary,
                lang=request.lang
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"Advisor chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
