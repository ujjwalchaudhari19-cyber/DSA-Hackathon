
from app.errors import UnsupportedBusiness
from app.schemas.models import Business, Idea

BLOCKED_KEYWORDS = {
    "gambling", "betting", "casino", "lottery",
    "weapon", "weapons", "firearms", "gun",
    "drugs", "narcotics", "smuggling",
    "fraud", "pyramid scheme", "ponzi", "counterfeit",
    "unlicensed alcohol", "illicit liquor"
}

ALIAS_MAP = {
    "kirana": "kirana_store",
    "general store": "kirana_store",
    "provision store": "kirana_store",
    "grocery": "kirana_store",
    "dairy": "dairy_small",
    "milk": "dairy_small",
    "cows": "dairy_small",
    "buffalo": "dairy_small",
    "tailoring": "tailoring",
    "boutique": "tailoring",
    "clothes sewing": "tailoring",
    "mobile repair": "mobile_repair",
    "phone repair": "mobile_repair",
    "flour mill": "flour_mill",
    "atta chakki": "flour_mill",
    "poultry": "poultry_small",
    "chicken farm": "poultry_small",
    "goat": "goat_farming",
    "goat farming": "goat_farming",
    "mushroom": "mushroom_farming",
    "handicraft": "handicraft",
    "csc": "e_seva_centre",
    "e-seva": "e_seva_centre",
    "tiffin": "tiffin_stall",
    "food stall": "tiffin_stall"
}

def resolve_business(idea: Idea) -> tuple[Business, str]:
    """Resolve an idea into a catalogue business or fallback.
    Returns: (business, confidence_level: 'high' | 'medium' | 'low')
    Raises UnsupportedBusiness if illegal, harmful, or gibberish.
    """
    raw = (idea.raw_input or idea.business_type or "").strip().lower()
    if not raw or len(raw) < 2:
        raise UnsupportedBusiness("Idea cannot be empty or gibberish")

    for blocked in BLOCKED_KEYWORDS:
        if blocked in raw:
            raise UnsupportedBusiness(f"The business idea involves prohibited activities: {blocked}")

    # Tier 1: exact / alias match
    normalized_key = idea.business_type.lower().strip()
    target_id = ALIAS_MAP.get(normalized_key) or ALIAS_MAP.get(raw)

    if not target_id:
        for alias, bid in ALIAS_MAP.items():
            if alias in raw:
                target_id = bid
                break

    if target_id:
        return Business(
            id=target_id,
            name=target_id.replace("_", " ").title(),
            sector="agri_allied" if "dairy" in target_id or "poultry" in target_id or "goat" in target_id else "retail",
            min_investment=100000,
            max_investment=300000,
            space_needed="shed" if "dairy" in target_id else "shop",
            skills=[],
            time="full",
            difficulty="moderate"
        ), "high"

    # Tier 3 unknown fallback: estimate conservatively
    return Business(
        id=f"custom_{normalized_key[:20]}",
        name=idea.business_type.title(),
        sector="general_enterprise",
        min_investment=50000,
        max_investment=200000,
        space_needed="room",
        skills=[],
        time="full",
        difficulty="moderate"
    ), "low"

