from __future__ import annotations

from typing import Any

from app.schemas.operator2 import DocItem, DocLists
from app.services.data_store import business_by_id, load_dataset


def base_lists(business_id_or_sector: str) -> DocLists:
    dataset = load_dataset("documents.json")["lists"]
    if business_id_or_sector in dataset:
        raw_list = dataset[business_id_or_sector]
    else:
        try:
            business = business_by_id(business_id_or_sector)
            doc_key = business["required_docs_key"]
        except ValueError:
            doc_key = "services"
        raw_list = dataset.get(doc_key, dataset["services"])

    return DocLists(
        registration=[DocItem(**item) for item in raw_list.get("registration", [])],
        loan=[DocItem(**item) for item in raw_list.get("loan", [])],
    )
