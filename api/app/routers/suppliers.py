from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Path, Query

from app.models.database import save_supplier_lead
from app.schemas.operator2 import Supplier, SupplierLeadRequest, SupplierLeadResponse
from app.services.supplier_service import list_suppliers, supplier_exists

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


@router.get("")
def suppliers(
    category: Annotated[str | None, Query(max_length=50)] = None,
    district: Annotated[str | None, Query(max_length=80)] = None,
    price_band: Annotated[Literal["budget", "mid", "premium"] | None, Query()] = None,
    max_moq: Annotated[int | None, Query(ge=1, le=100_000)] = None,
) -> list[Supplier]:
    return list_suppliers(category, district, price_band, max_moq)


@router.post("/{supplier_id}/lead", status_code=201)
def create_lead(
    supplier_id: Annotated[str, Path(min_length=1, max_length=80)], request: SupplierLeadRequest
) -> SupplierLeadResponse:
    if not supplier_exists(supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")
    lead = save_supplier_lead(supplier_id, request.requester_name, request.phone, request.message)
    return SupplierLeadResponse(lead_id=lead.id, status="saved")
