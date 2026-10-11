from __future__ import annotations

from typing import Any

from app.schemas.operator2 import LocalData
from app.services.data_store import load_dataset
from app.utils.cache import TTLCache

_cache: TTLCache[LocalData] = TTLCache()

DISTRICT_ALIASES = {
    "nasik": "nashik",
    "नासिक": "nashik",
    "नाशिक": "nashik",
    "poona": "pune",
    "पुणे": "pune",
    "ahmed nagar": "ahmednagar",
    "ahmadnagar": "ahmednagar",
    "अहमदनगर": "ahmednagar",
}


def normalize_district(raw_district: str) -> str:
    cleaned = raw_district.strip().lower()
    return DISTRICT_ALIASES.get(cleaned, cleaned)


def get_local_market(district: str, business_id: str) -> LocalData:
    norm_district = normalize_district(district)
    key = f"{norm_district}:{business_id}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    data = load_dataset("local_market.json")
    district_data = data["districts"].get(norm_district)
    if district_data and business_id in district_data["businesses"]:
        raw = {
            "district": district,
            "price_factor": district_data["price_factor"],
            "population_band": district_data.get("population_band"),
            "nearest_market": district_data.get("nearest_market"),
            "distance_km": district_data.get("distance_km"),
            **district_data["businesses"][business_id],
        }
    else:
        # Fall back to state/regional average benchmark
        raw = {"district": district, **data["fallback"]}

    result = LocalData(**raw)
    return _cache.set(key, result)


get = get_local_market
