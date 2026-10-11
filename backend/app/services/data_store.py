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


def business_by_id(business_id: str) -> dict[str, Any]:
    for business in load_dataset("businesses.json")["businesses"]:
        if business["id"] == business_id:
            return business
    raise ValueError(f"Unknown business_id: {business_id}")
