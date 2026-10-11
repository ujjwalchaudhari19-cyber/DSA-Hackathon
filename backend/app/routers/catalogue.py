from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path

from app.schemas.operator2 import Business, DiscoveryAnswers
from app.services.catalogue_service import filter_catalogue, get_by_id, list_all

router = APIRouter(prefix="/api/v1/catalogue", tags=["catalogue"])


@router.get("")
def get_all_businesses() -> list[Business]:
    return list_all()


@router.post("/filter")
def filter_businesses(answers: DiscoveryAnswers) -> list[Business]:
    return filter_catalogue(answers)


@router.get("/{business_id}")
def get_business(business_id: Annotated[str, Path(min_length=2, max_length=80)]) -> Business:
    try:
        return get_by_id(business_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

