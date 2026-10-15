"""Read-only access to curated Operator 2 JSON datasets."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=None)
def load_dataset(name: str) -> dict[str, Any]:
    with (DATA_DIR / name).open(encoding="utf-8") as source:
        return json.load(source)


_BUSINESS_ALIASES = {
    "truck": "commercial_transport",
    "trucking": "commercial_transport",
    "transport": "commercial_transport",
    "logistics": "commercial_transport",
    "freight": "commercial_transport",
    "vehicle": "commercial_transport",
    "tempo": "commercial_transport",
    "flour_mill": "flour_spice_mill",
    "chakki": "flour_spice_mill",
    "dairy": "dairy_small",
    "milk": "dairy_small",
    "cow": "dairy_small",
    "kirana": "kirana_store",
    "grocery": "kirana_store",
    "tailor": "tailoring",
    "poultry": "poultry_farming",
    "chicken": "poultry_farming",
    "goat": "goat_farming",
    "mobile": "mobile_repair",
    "tiffin": "tiffin_food_stall",
    "food_stall": "tiffin_food_stall",
    "mushroom": "mushroom_farming",
    "csc": "csc_eseva_center",
    "eseva": "csc_eseva_center",
}

_COMMERCIAL_TRANSPORT = {
    "id": "commercial_transport",
    "name": "Commercial Transport & Goods Carrier",
    "sector": "services",
    "min_investment": 320000,
    "max_investment": 1200000,
    "space_needed": "parking",
    "skills": ["commercial_driving", "route_logistics"],
    "time": "full",
    "required_docs_key": "services",
    "cost_template": [
        {"key": "vehicle", "item": "Commercial Goods Vehicle (Down payment / Asset Purchase)", "unit": "vehicle", "unit_cost": 320000, "qty_by_scale": {"small": 1, "medium": 1, "large": 2}, "category": "fixed"},
        {"key": "rto_permit", "item": "Commercial RTO Permit, National Fitness & Comprehensive Insurance", "unit": "lump sum", "unit_cost": 42000, "qty_by_scale": {"small": 1, "medium": 1, "large": 1}, "category": "fixed"},
        {"key": "gps_rigging", "item": "Fleet GPS Tracking System, Tarpaulin Cover & Tie-down Rigging", "unit": "lump sum", "unit_cost": 15000, "qty_by_scale": {"small": 1, "medium": 1, "large": 1}, "category": "fixed"},
        {"key": "fuel_working_capital", "item": "Working Capital for Fuel, Tolls & Operational Buffer (2 Months)", "unit": "month", "unit_cost": 25000, "qty_by_scale": {"small": 2, "medium": 2, "large": 3}, "category": "working_capital"}
    ],
    "revenue_model": {"unit_price": 45, "units_per_month_by_scale": {"small": 1900, "medium": 3200, "large": 5000}, "variable_cost_pct": 0.52, "fixed_opex_monthly": 7500},
    "seasonality": [0.95, 1.0, 1.15, 1.2, 1.1, 0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.15]
}


def business_by_id(business_id: str) -> dict[str, Any]:
    cleaned = (business_id or "").strip().lower().replace("-", "_")
    target_id = _BUSINESS_ALIASES.get(cleaned, cleaned)
    
    # Check if alias partial match
    if target_id not in _BUSINESS_ALIASES.values():
        for k, v in _BUSINESS_ALIASES.items():
            if k in cleaned or cleaned in k:
                target_id = v
                break

    if target_id == "commercial_transport":
        return dict(_COMMERCIAL_TRANSPORT)

    for business in load_dataset("businesses.json")["businesses"]:
        if business["id"] == target_id:
            return business

    # Dynamic fallback synthesis for custom/unlisted business
    title = cleaned.replace("_", " ").title() or "Micro Enterprise"
    sector = (
        "services"
        if any(w in cleaned for w in ["repair", "service", "center", "transport", "tailor", "tech", "salon", "truck", "cab"])
        else ("retail" if any(w in cleaned for w in ["store", "mart", "shop", "kirana", "retail"]) else "manufacturing")
    )
    return {
        "id": cleaned or "custom_enterprise",
        "name": title,
        "sector": sector,
        "min_investment": 100000,
        "max_investment": 500000,
        "space_needed": "commercial_premises",
        "skills": ["enterprise_management"],
        "time": "full",
        "required_docs_key": "services",
        "cost_template": [
            {"key": "machinery", "item": f"{title} Core Equipment & Setup", "unit": "set", "unit_cost": 85000, "qty_by_scale": {"small": 1, "medium": 2, "large": 3}, "category": "fixed"},
            {"key": "fixtures", "item": "Premises Fixtures, Setup & Trade Compliance", "unit": "lump sum", "unit_cost": 28000, "qty_by_scale": {"small": 1, "medium": 1, "large": 1}, "category": "fixed"},
            {"key": "working_capital", "item": "Initial Materials / Working Capital Reserve (2 Months)", "unit": "month", "unit_cost": 20000, "qty_by_scale": {"small": 2, "medium": 3, "large": 4}, "category": "working_capital"},
        ],
        "revenue_model": {"unit_price": 100, "units_per_month_by_scale": {"small": 600, "medium": 1200, "large": 2000}, "variable_cost_pct": 0.45, "fixed_opex_monthly": 6000},
        "seasonality": [1.0] * 12,
    }
