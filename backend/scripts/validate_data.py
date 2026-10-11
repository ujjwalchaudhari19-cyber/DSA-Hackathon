"""Fail fast if demo data is malformed or lacks mandatory provenance.

Covers edge-case checks D-01 through D-10, P-02, P-03, and SC-01.
"""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "app" / "data"
REQUIRED_DATASETS = (
    "businesses.json",
    "local_market.json",
    "schemes.json",
    "documents.json",
    "suppliers.json",
    "credit_rules.json",
)


def has_null(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, dict):
        return any(has_null(item) for item in value.values())
    if isinstance(value, list):
        return any(has_null(item) for item in value)
    return False


def validate() -> None:
    # 1. UTF-8 JSON load, provenance & null checks
    datasets: dict[str, dict] = {}
    for filename in REQUIRED_DATASETS:
        file_path = DATA_DIR / filename
        assert file_path.exists(), f"{filename} is missing from {DATA_DIR}"
        with file_path.open(encoding="utf-8") as source:
            payload = json.load(source)
        assert payload.get("source"), f"{filename}: 'source' metadata is required"
        assert payload.get("last_verified"), f"{filename}: 'last_verified' metadata is required"
        assert not has_null(payload), f"{filename}: null values are not permitted in demo data"
        datasets[filename] = payload

    # 2. Documents validation
    doc_keys = set(datasets["documents.json"]["lists"].keys())

    # 3. Businesses validation (D-02, D-03, D-06, D-07, D-10, P-02, P-03)
    businesses = datasets["businesses.json"]["businesses"]
    biz_ids: set[str] = set()
    for b in businesses:
        bid = b["id"]
        assert bid not in biz_ids, f"Duplicate business id: {bid}"
        biz_ids.add(bid)
        assert b["required_docs_key"] in doc_keys, (
            f"Business {bid} has unknown doc key '{b['required_docs_key']}'"
        )
        assert len(b["seasonality"]) == 12, f"Business {bid} seasonality must have 12 values"
        assert all(s > 0 for s in b["seasonality"]), f"Business {bid} has non-positive seasonality"
        seasonality_mean = sum(b["seasonality"]) / 12.0
        assert 0.95 <= seasonality_mean <= 1.05, (
            f"Business {bid} seasonality mean ({seasonality_mean:.3f}) deviates from 1.0 baseline"
        )
        for cost in b["cost_template"]:
            assert cost["unit_cost"] > 0, f"Business {bid} item {cost['key']} has non-positive cost"

    # 4. Local market validation (D-05, D-09)
    local_data = datasets["local_market.json"]
    for dist_name, dist_info in local_data.get("districts", {}).items():
        assert dist_info.get("price_factor", 0) > 0, f"District {dist_name} has invalid price_factor"
        for mbiz_id, mbiz in dist_info.get("businesses", {}).items():
            assert mbiz_id in biz_ids, f"District {dist_name} references unknown business: {mbiz_id}"
            assert mbiz["confidence"] in ("high", "medium", "approximate"), (
                f"Invalid confidence '{mbiz['confidence']}' in district {dist_name}"
            )

    # 5. Schemes validation (D-04, D-10)
    schemes = datasets["schemes.json"]["schemes"]
    scheme_ids: set[str] = set()
    for s in schemes:
        sid = s["id"]
        assert sid not in scheme_ids, f"Duplicate scheme id: {sid}"
        scheme_ids.add(sid)
        assert s.get("source_url"), f"Scheme {sid} must have source_url"
        assert s["min_age"] >= 18, f"Scheme {sid} min_age must be >= 18"
        assert s["max_gap"] > 0, f"Scheme {sid} max_gap must be > 0"

    # 6. Suppliers validation (D-08, D-10)
    suppliers = datasets["suppliers.json"]["suppliers"]
    supplier_ids: set[str] = set()
    for sup in suppliers:
        sup_id = sup["id"]
        assert sup_id not in supplier_ids, f"Duplicate supplier id: {sup_id}"
        supplier_ids.add(sup_id)
        assert sup.get("is_demo") is True, f"Supplier {sup_id} must have is_demo=True"
        assert sup["moq"] >= 1, f"Supplier {sup_id} moq must be >= 1"
        assert sup["distance_km"] >= 0, f"Supplier {sup_id} distance must be >= 0"


if __name__ == "__main__":
    validate()
    print("Operator 2 comprehensive data validation passed.")
