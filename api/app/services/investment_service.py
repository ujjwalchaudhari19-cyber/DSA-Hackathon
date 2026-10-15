from __future__ import annotations

import hashlib
from typing import Any

from app.schemas.operator2 import (
    Idea,
    Investment,
    InvestmentItem,
    InvestmentRequest,
    LocalData,
    QuantityOverride,
    Scale,
)
from app.services.data_store import business_by_id
from app.services.local_market_service import get_local_market, normalize_district
from app.utils.cache import DATA_VERSION, TTLCache
from app.utils.errors import CalcInputError

_cache: TTLCache[Investment] = TTLCache()

SCALE_ORDER = ["small", "medium", "large"]


def estimate_investment(
    request_or_idea: InvestmentRequest | Idea,
    local_or_district: LocalData | dict[str, Any] | str | None = None,
    quantity_overrides: list[QuantityOverride] | None = None,
) -> Investment:
    if isinstance(request_or_idea, InvestmentRequest):
        idea = request_or_idea.idea
        district = request_or_idea.district
        overrides = request_or_idea.quantity_overrides
        local_data = get_local_market(district, idea.business_id)
    else:
        idea = request_or_idea
        overrides = quantity_overrides or []
        if isinstance(local_or_district, LocalData):
            local_data = local_or_district
            district = local_data.district
        elif isinstance(local_or_district, dict):
            district = local_or_district.get("district", "fallback")
            base_local = get_local_market(district, idea.business_id)
            merged = {**base_local.model_dump(), **local_or_district}
            local_data = LocalData(**merged)

        elif isinstance(local_or_district, str):
            district = local_or_district
            local_data = get_local_market(district, idea.business_id)
        else:
            district = "fallback"
            local_data = get_local_market(district, idea.business_id)

    warnings: list[str] = []

    # Validate quantity overrides
    override_map: dict[str, float] = {}
    for entry in overrides:
        if entry.quantity < 0:
            raise CalcInputError(f"Quantity override for item '{entry.item_key}' cannot be negative.")
        if entry.quantity > 10_000:
            raise CalcInputError(f"Quantity override for item '{entry.item_key}' is absurdly large ({entry.quantity}).")
        override_map[entry.item_key] = entry.quantity

    # Validate price factor
    raw_factor = getattr(local_data, "price_factor", None) if local_data is not None else None
    if raw_factor is not None and raw_factor <= 0:
        raise CalcInputError(f"Invalid local price factor: {raw_factor}. Must be greater than 0.")
    elif raw_factor is None:
        price_factor = 1.0
        warnings.append("Local price factor was missing; defaulted to 1.0.")
    else:
        price_factor = float(raw_factor)

    norm_district = normalize_district(district)
    scale_str = idea.scale.value if hasattr(idea.scale, "value") else str(idea.scale)
    sorted_overrides = tuple(sorted(override_map.items()))
    override_hash = hashlib.sha256(repr(sorted_overrides).encode("utf-8")).hexdigest()[:12]
    cache_key = f"inv:{DATA_VERSION}:{idea.business_id}:{norm_district}:{scale_str}:{override_hash}:{price_factor}"

    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    business = business_by_id(idea.business_id)
    items: list[InvestmentItem] = []
    fixed_cost = 0.0
    working_capital = 0.0

    target_scale = scale_str
    target_idx = SCALE_ORDER.index(target_scale) if target_scale in SCALE_ORDER else 0

    for template in business["cost_template"]:
        scale_map = template.get("qty_by_scale", {})
        if target_scale in scale_map:
            default_qty = scale_map[target_scale]
        else:
            # Fall back to nearest scale AND append a warning
            available_scales = [s for s in SCALE_ORDER if s in scale_map]
            if available_scales:
                nearest_scale = min(available_scales, key=lambda s: abs(SCALE_ORDER.index(s) - target_idx))
                default_qty = scale_map[nearest_scale]
                warnings.append(
                    f"Scale '{target_scale}' missing for item '{template['key']}'; "
                    f"fell back to nearest scale '{nearest_scale}'."
                )
            else:
                default_qty = 1.0
                warnings.append(
                    f"No scales defined for item '{template['key']}'; defaulted to quantity 1.0."
                )

        quantity = override_map.get(template["key"], default_qty)
        unit_cost = round(template["unit_cost"] * price_factor, 2)
        line_total = round(quantity * template["unit_cost"] * price_factor, 2)

        item = InvestmentItem(
            key=template["key"],
            item=template["item"],
            quantity=quantity,
            unit=template["unit"],
            unit_cost=unit_cost,
            line_total=line_total,
            category=template["category"],
        )
        items.append(item)
        if item.category == "fixed":
            fixed_cost += line_total
        else:
            working_capital += line_total

    contingency = round((fixed_cost + working_capital) * 0.10, 2)
    items.append(
        InvestmentItem(
            key="contingency",
            item="Contingency (10%)",
            quantity=1,
            unit="lump sum",
            unit_cost=contingency,
            line_total=contingency,
            category="contingency",
        )
    )

    scale_enum = Scale(scale_str) if scale_str in Scale._value2member_map_ else Scale.small
    result = Investment(
        business_id=idea.business_id,
        scale=scale_enum,
        items=items,
        fixed_cost=round(fixed_cost, 2),
        working_capital=round(working_capital, 2),
        contingency=contingency,
        total_investment=round(fixed_cost + working_capital + contingency, 2),
        local_price_factor=price_factor,
        warnings=warnings,
    )
    return _cache.set(cache_key, result)


estimate = estimate_investment
