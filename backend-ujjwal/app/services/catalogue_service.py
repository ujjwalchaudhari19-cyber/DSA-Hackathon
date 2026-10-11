"""Business catalogue querying and rule-based discovery filtering.

Owned by Backend Operator 2.
"""

from __future__ import annotations

from app.schemas.operator2 import Business, DiscoveryAnswers
from app.services.data_store import load_dataset


def list_all() -> list[Business]:
    data = load_dataset("businesses.json")
    return [
        Business(
            id=item["id"],
            name=item["name"],
            sector=item["sector"],
            min_investment=item["min_investment"],
            max_investment=item["max_investment"],
            space_needed=item["space_needed"],
            skills=item["skills"],
            time=item["time"],
            required_docs_key=item["required_docs_key"],
        )
        for item in data["businesses"]
    ]


def get_by_id(business_id: str) -> Business:
    for b in list_all():
        if b.id == business_id:
            return b
    raise ValueError(f"Unknown business_id: {business_id}")


def filter(answers: DiscoveryAnswers) -> list[Business]:
    """Filter business catalogue based on user constraints (budget, space, skills, sector)."""
    businesses = list_all()
    filtered: list[Business] = []

    min_budget = answers.budget_range[0] if len(answers.budget_range) > 0 else 0
    max_budget = answers.budget_range[1] if len(answers.budget_range) > 1 else float("inf")

    for b in businesses:
        # Check budget overlap
        if b.min_investment > max_budget:
            continue
        if b.max_investment < min_budget:
            continue

        # Check sector interests if provided
        if answers.interests:
            # Match directly or by broad category
            interest_match = any(
                interest.casefold() in b.sector.casefold() or b.sector.casefold() in interest.casefold()
                for interest in answers.interests
            )
            if not interest_match:
                continue

        # Check space needed if provided and not "any"
        if answers.space and answers.space != "any":
            if answers.space.casefold() not in b.space_needed.casefold() and b.space_needed.casefold() not in answers.space.casefold():
                continue

        # Check time commitment if specified and not "any"
        if answers.time and answers.time != "any":
            if b.time.casefold() != answers.time.casefold():
                continue

        filtered.append(b)

    # If strict filter yielded empty, fallback gracefully to budget-only or all businesses
    if not filtered:
        filtered = [b for b in businesses if b.min_investment <= max_budget] or businesses

    return filtered


filter_catalogue = filter

