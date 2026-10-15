from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.schemas.operator2 import SchemeMatchRequest, SchemeMatchResponse
from app.services.data_store import load_dataset
from app.services.scheme_service import match_schemes

router = APIRouter(prefix="/api/v1/schemes", tags=["schemes"])


@router.get("/all")
def all_schemes(
    sector: str | None = Query(None, description="Filter by sector, e.g. 'retail', 'agri_allied'"),
    min_gap: float | None = Query(None, description="Minimum funding gap to filter schemes"),
    max_gap: float | None = Query(None, description="Maximum funding gap to filter schemes"),
) -> dict[str, Any]:
    """
    Return all government schemes from the data store, with optional sector
    and gap-range filters.  Used by the frontend to drive the SchemeCard
    components dynamically without any hardcoded scheme objects.
    """
    data = load_dataset("schemes.json")
    schemes = data.get("schemes", [])

    if sector:
        schemes = [s for s in schemes if sector in s.get("sectors", [])]
    if min_gap is not None:
        schemes = [s for s in schemes if s.get("max_gap", 0) >= min_gap]
    if max_gap is not None:
        schemes = [s for s in schemes if s.get("min_gap", 0) <= max_gap]

    return {
        "source": data.get("source", ""),
        "last_verified": data.get("last_verified", ""),
        "total": len(schemes),
        "schemes": schemes,
    }


@router.post("/match")
def match(request: SchemeMatchRequest) -> SchemeMatchResponse:
    try:
        return match_schemes(request)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
