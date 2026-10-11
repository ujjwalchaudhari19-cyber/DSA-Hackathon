from fastapi import APIRouter, HTTPException

from app.schemas.operator2 import SchemeMatchRequest, SchemeMatchResponse
from app.services.scheme_service import match_schemes

router = APIRouter(prefix="/api/v1/schemes", tags=["schemes"])


@router.post("/match")
def match(request: SchemeMatchRequest) -> SchemeMatchResponse:
    try:
        return match_schemes(request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
