from __future__ import annotations

from app.schemas.operator2 import Supplier
from app.services.data_store import load_dataset


def list_suppliers(category: str | None = None, district: str | None = None, price_band: str | None = None, max_moq: int | None = None) -> list[Supplier]:
    result = [Supplier(**item) for item in load_dataset("suppliers.json")["suppliers"]]
    if category:
        result = [item for item in result if item.category.casefold() == category.casefold()]
    if district:
        result = [item for item in result if item.district.casefold() == district.casefold()]
    if price_band:
        result = [item for item in result if item.price_band == price_band]
    if max_moq is not None:
        result = [item for item in result if item.moq <= max_moq]
    return result


def supplier_exists(supplier_id: str) -> bool:
    return any(item.id == supplier_id for item in list_suppliers())
