"""
Operator 2 Service Stubs
========================
Realistic mock implementations of Operator 2's service interfaces.
Operator 1 calls these; Operator 2 will replace with real logic.

These stubs return hardcoded but realistic data for the primary demo persona:
Sunita, 34, village near Nashik, ₹50,000 savings, dairy business.
"""
import logging

from app.schemas.models import (
    AmortizationEntry,
    Business,
    CostItem,
    CreditAction,
    CreditBucket,
    CreditResult,
    DiscoveryAnswers,
    DocItem,
    DocLists,
    EligibilityStatus,
    FactorScore,
    FeasibilityReport,
    Gap,
    Idea,
    Investment,
    LocalData,
    MonthlyProjection,
    Profile,
    Projection,
    Repayment,
    SchemeMatch,
    ScoreResult,
    VerdictLabel,
)

logger = logging.getLogger(__name__)

# Business type name normalization map
_BUSINESS_TYPE_ALIASES: dict[str, str] = {
    "dairy_small": "dairy_small",
    "dairy": "dairy_small",
    "milk": "dairy_small",
    "cow": "dairy_small",
    "kirana_store": "kirana_store",
    "kirana": "kirana_store",
    "general_store": "kirana_store",
    "grocery": "kirana_store",
    "tailoring": "tailoring",
    "boutique": "tailoring",
    "stitching": "tailoring",
    "poultry_farming": "poultry_farming",
    "poultry": "poultry_farming",
    "chicken": "poultry_farming",
    "goat_farming": "goat_farming",
    "goat": "goat_farming",
    "mobile_repair": "mobile_repair",
    "mobile": "mobile_repair",
    "electronics": "mobile_repair",
    "flour_spice_mill": "flour_spice_mill",
    "flour_mill": "flour_spice_mill",
    "flour": "flour_spice_mill",
    "spice": "flour_spice_mill",
    "mill": "flour_spice_mill",
    "mini flour and spice mill": "flour_spice_mill",
    "tiffin_food_stall": "tiffin_food_stall",
    "tiffin": "tiffin_food_stall",
    "food_stall": "tiffin_food_stall",
    "food": "tiffin_food_stall",
    "mushroom_farming": "mushroom_farming",
    "mushroom": "mushroom_farming",
    "csc_eseva_center": "csc_eseva_center",
    "csc": "csc_eseva_center",
    "eseva": "csc_eseva_center",
    "commercial_transport": "commercial_transport",
    "truck": "commercial_transport",
    "trucking": "commercial_transport",
    "transport": "commercial_transport",
    "logistics": "commercial_transport",
    "freight": "commercial_transport",
    "vehicle": "commercial_transport",
    "tempo": "commercial_transport",
}

def _normalize_business_type(raw: str) -> str:
    """Normalize a business type string to a canonical business ID."""
    cleaned = raw.strip().lower().replace("-", "_")
    if cleaned in _BUSINESS_TYPE_ALIASES:
        return _BUSINESS_TYPE_ALIASES[cleaned]
    # Fuzzy partial match
    for keyword, canonical in _BUSINESS_TYPE_ALIASES.items():
        if keyword in cleaned or cleaned in keyword:
            return canonical
    return cleaned  # Return as-is if no match

# ========== In-memory report store (placeholder for DB) ==========
_report_store: dict[str, FeasibilityReport] = {}


# ========== Catalogue Filter ==========
async def catalogue_filter(answers: DiscoveryAnswers) -> list[Business]:
    """Filter business catalogue by hard constraints (budget, space, skills)."""
    all_businesses = [
        Business(
            id="dairy_small", name="Dairy (Small Unit)", sector="agri_allied",
            min_investment=150000, max_investment=400000,
            space_needed="shed", skills=["animal_care"], time="full", difficulty="moderate"
        ),
        Business(
            id="poultry_small", name="Poultry Farming", sector="agri_allied",
            min_investment=100000, max_investment=300000,
            space_needed="shed", skills=["animal_care"], time="full", difficulty="moderate"
        ),
        Business(
            id="kirana_store", name="Kirana / General Store", sector="retail",
            min_investment=80000, max_investment=250000,
            space_needed="shop", skills=[], time="full", difficulty="easy"
        ),
        Business(
            id="tailoring", name="Tailoring & Boutique", sector="services",
            min_investment=30000, max_investment=100000,
            space_needed="room", skills=["sewing", "design"], time="full", difficulty="moderate"
        ),
        Business(
            id="mobile_repair", name="Mobile & Electronics Repair", sector="services",
            min_investment=40000, max_investment=120000,
            space_needed="shop", skills=["electronics"], time="full", difficulty="moderate"
        ),
        Business(
            id="flour_mill", name="Flour & Spice Mill", sector="agri_processing",
            min_investment=120000, max_investment=350000,
            space_needed="shed", skills=[], time="full", difficulty="easy"
        ),
        Business(
            id="tiffin_stall", name="Tiffin / Food Stall", sector="food",
            min_investment=25000, max_investment=80000,
            space_needed="room", skills=["cooking"], time="full", difficulty="easy"
        ),
        Business(
            id="goat_farming", name="Goat Farming", sector="agri_allied",
            min_investment=100000, max_investment=300000,
            space_needed="land", skills=["animal_care"], time="full", difficulty="moderate"
        ),
        Business(
            id="mushroom_farming", name="Mushroom Farming", sector="agri_allied",
            min_investment=20000, max_investment=80000,
            space_needed="room", skills=[], time="part", difficulty="easy"
        ),
        Business(
            id="handicraft", name="Handicraft Unit", sector="craft",
            min_investment=15000, max_investment=60000,
            space_needed="room", skills=["crafting", "design"], time="part", difficulty="moderate"
        ),
        Business(
            id="e_seva_centre", name="e-Seva / CSC Centre", sector="services",
            min_investment=50000, max_investment=150000,
            space_needed="shop", skills=["computer"], time="full", difficulty="easy"
        ),
    ]

    # Simple filtering by budget and space
    filtered = []
    for b in all_businesses:
        if b.min_investment and b.min_investment > answers.budget_max * 3:
            continue  # Allow businesses up to 3x budget (loan-funded)
        if b.space_needed and answers.space_available == "none" and b.space_needed != "none":
            continue
        filtered.append(b)

    return filtered[:8]  # Return max 8 for LLM to rank


# ========== Local Market ==========
async def local_market_get(district: str, business_type: str) -> LocalData:
    """Get local market data for a district + business type."""
    from app.services.local_market_service import get_local_market as _get_real_market
    from app.services.data_store import business_by_id

    canonical_id = _normalize_business_type(business_type)
    if canonical_id == "commercial_transport":
        return LocalData(
            district=district,
            business_type="commercial_transport",
            population_band="tier-3 / regional transport hub",
            nearest_market=f"{district.title()} APMC & Transport Nagar",
            distance_to_market_km=12.0,
            competitor_count=7,
            competitor_density="medium",
            avg_selling_price=45.0,
            demand_level="high",
            seasonal_notes="Freight movement peaks during agricultural harvest seasons (March-May & Oct-Jan) and infrastructure construction cycles.",
            input_availability="easy",
            confidence="high",
            market_score=78.0,
            risks=[
                {"name": "Diesel price volatility & toll rate adjustments", "severity": "medium", "score": 38},
                {"name": "Vehicle preventive maintenance & tyre replacement cycles", "severity": "medium", "score": 32},
            ],
        )

    try:
        op2_data = _get_real_market(district, canonical_id)
        # Build risk list from risk_severity
        risk_severity = getattr(op2_data, 'risk_severity', 35)
        try:
            biz = business_by_id(canonical_id)
            biz_name = biz.get("name", canonical_id.replace("_", " ").title())
        except Exception:
            biz_name = canonical_id.replace("_", " ").title()

        risks = [
            {"name": f"Market competition in {biz_name}", "severity": "medium" if risk_severity < 35 else "high", "score": int(risk_severity)},
            {"name": "Seasonal demand fluctuation", "severity": "medium", "score": int(risk_severity * 0.8)},
        ]

        return LocalData(
            district=district,
            business_type=canonical_id,
            population_band=op2_data.population_band or "rural",
            nearest_market=op2_data.nearest_market or district.title() + " Market",
            distance_to_market_km=op2_data.distance_km or 15.0,
            competitor_count=op2_data.competitor_count,
            competitor_density=op2_data.competitor_density if op2_data.competitor_density in ("low", "medium", "high") else "medium",
            avg_selling_price=op2_data.avg_selling_price,
            demand_level=op2_data.demand_level if op2_data.demand_level in ("low", "moderate", "high", "very_high") else "moderate",
            seasonal_notes=op2_data.seasonal_notes,
            input_availability=op2_data.input_availability if op2_data.input_availability in ("easy", "moderate", "difficult") else "moderate",
            confidence=op2_data.confidence,
            market_score=op2_data.market_score,
            risks=risks,
        )
    except Exception as e:
        logger.warning("Real local_market_service failed for %s/%s, using fallback: %s", district, business_type, e)
        # Fallback: return generic data with the correct business_type
        return LocalData(
            district=district,
            business_type=canonical_id,
            population_band="50,000 - 1,00,000",
            nearest_market=district.title() + " City",
            distance_to_market_km=15.0,
            competitor_count=5,
            competitor_density="medium",
            avg_selling_price=100.0,
            demand_level="moderate",
            seasonal_notes="Seasonal patterns vary by business type.",
            input_availability="moderate",
            confidence="approximate",
            market_score=60.0,
            risks=[
                {"name": "Market uncertainty", "severity": "medium", "score": 35},
                {"name": "Input cost volatility", "severity": "medium", "score": 30},
            ]
        )


# ========== Investment Estimate ==========
async def investment_estimate(idea: Idea, local: LocalData | None) -> Investment:
    """Estimate itemised investment for a business idea."""
    from app.services.data_store import business_by_id

    canonical_id = _normalize_business_type(idea.business_type)
    scale = getattr(idea, 'scale', 'small')
    if hasattr(scale, 'value'):
        scale = scale.value
    scale = scale if scale in ('small', 'medium', 'large') else 'small'

    if canonical_id == "commercial_transport":
        items = [
            CostItem(item="Commercial Transport Vehicle (Down payment / asset purchase)", unit="vehicle", unit_cost=320000, quantity=1, total=320000, category="fixed"),
            CostItem(item="Commercial Permit, RTO Registration & Insurance", unit="lump sum", unit_cost=45000, quantity=1, total=45000, category="fixed"),
            CostItem(item="Working Capital for Fuel, Toll & Maintenance (2 months)", unit="month", unit_cost=25000, quantity=2, total=50000, category="working_capital"),
        ]
        subtotal = sum(i.total for i in items)
        contingency = round(subtotal * 0.10, 2)
        items.append(CostItem(item="Contingency (10%)", unit="lump sum", unit_cost=contingency, quantity=1, total=contingency, category="contingency"))
        fixed = sum(i.total for i in items if i.category == "fixed")
        working = sum(i.total for i in items if i.category == "working_capital")
        total = round(fixed + working + contingency, 2)
        return Investment(
            items=items, fixed_cost=fixed,
            working_capital=working, contingency=contingency, total=total
        )

    try:
        biz = business_by_id(canonical_id)
        items = []
        for template in biz["cost_template"]:
            qty = template["qty_by_scale"].get(scale, template["qty_by_scale"].get("small", 1))
            unit_cost = template["unit_cost"]
            line_total = round(unit_cost * qty, 2)
            cat = template.get("category", "fixed")
            items.append(CostItem(
                item=template["item"],
                unit=template.get("unit", "lump sum"),
                unit_cost=unit_cost,
                quantity=qty,
                total=line_total,
                category=cat,
            ))

        fixed = round(sum(i.total for i in items if i.category == "fixed"), 2)
        working = round(sum(i.total for i in items if i.category == "working_capital"), 2)
        contingency = round((fixed + working) * 0.10, 2)
        items.append(CostItem(
            item="Contingency (10%)",
            unit="lump sum",
            unit_cost=contingency,
            quantity=1,
            total=contingency,
            category="contingency",
        ))
        total = round(fixed + working + contingency, 2)
        assert abs(total - sum(i.total for i in items)) < 0.02, "Investment totals do not reconcile"
        return Investment(
            items=items, fixed_cost=fixed,
            working_capital=working, contingency=contingency, total=total
        )
    except Exception as e:
        logger.warning("business_by_id failed for %s, using generic fallback: %s", canonical_id, e)
        items = [
            CostItem(item="Equipment & setup", unit="lump sum", unit_cost=50000, quantity=1, total=50000, category="fixed"),
            CostItem(item="Initial inventory / raw material", unit="lump sum", unit_cost=20000, quantity=1, total=20000, category="working_capital"),
            CostItem(item="Working capital (3 months)", unit="lump sum", unit_cost=15000, quantity=1, total=15000, category="working_capital"),
        ]
        fixed = 50000.0
        working = 35000.0
        contingency = round((fixed + working) * 0.10, 2)
        items.append(CostItem(item="Contingency (10%)", unit="lump sum", unit_cost=contingency, quantity=1, total=contingency, category="contingency"))
        total = round(fixed + working + contingency, 2)
        return Investment(
            items=items, fixed_cost=fixed,
            working_capital=working, contingency=contingency, total=total
        )


# ========== Funding Gap ==========
async def finance_funding_gap(total: float, capital: float) -> Gap:
    """Calculate funding gap."""
    gap = max(0, total - capital)
    ratio = capital / total if total > 0 else 0
    return Gap(
        total_investment=total,
        available_capital=capital,
        gap=gap,
        capital_ratio=min(ratio, 1.0),
        is_self_funded=(gap == 0)
    )


# ========== Scheme Matcher ==========
async def schemes_match(profile: Profile, gap: float, idea: Idea) -> list[SchemeMatch]:
    """Match eligible government schemes against profile+gap+idea.

    Returns every scheme with eligible/maybe/no, reasons, max_amount, interest_range,
    subsidy, collateral, top-3 how_to_apply steps, documents[], source_url,
    last_verified, rank (1=best) and recommended flag (top eligible scheme only).
    Rate and tenure come from scheme data, not ad-hoc defaults.
    """
    from app.services.data_store import load_dataset
    schemes_data = load_dataset("schemes.json")["schemes"]

    canonical_id = _normalize_business_type(idea.business_type)
    biz_sector_map = {
        "dairy_small": "agri_allied", "kirana_store": "retail", "tailoring": "services",
        "poultry_farming": "agri_allied", "goat_farming": "agri_allied",
        "mobile_repair": "services", "flour_spice_mill": "food_agri",
        "tiffin_food_stall": "food_agri", "mushroom_farming": "agri_allied",
        "csc_eseva_center": "tech_csc", "commercial_transport": "services",
    }
    sector = biz_sector_map.get(canonical_id, "services")
    profile_location = getattr(profile, "location_type", "rural") or "rural"
    profile_gender = getattr(profile, "gender", "m")
    profile_category = getattr(profile, "category", "general")

    results = []
    for scheme in schemes_data:
        reasons: list[str] = []
        missing: list[str] = []
        fails: list[str] = []

        # Sector
        if sector not in scheme.get("sectors", []):
            fails.append(f"Business sector '{sector}' not covered by this scheme.")
        # Age
        if profile.age < scheme.get("min_age", 18):
            fails.append(f"Age {profile.age} below minimum {scheme['min_age']}.")
        if profile.age > scheme.get("max_age", 70):
            fails.append(f"Age {profile.age} above maximum {scheme['max_age']}.")
        # Gap bounds
        min_gap = scheme.get("min_gap", 0)
        max_gap = scheme.get("max_gap", 100_000_000)
        if gap > max_gap:
            fails.append(f"Funding gap ₹{gap:,.0f} exceeds scheme ceiling ₹{max_gap:,.0f}.")
        elif 0 < gap < min_gap:
            fails.append(f"Funding gap ₹{gap:,.0f} below minimum ₹{min_gap:,.0f}.")
        # Gender
        if scheme.get("requires_woman") and profile_gender != "f":
            fails.append("Scheme is for women entrepreneurs only.")
        # Category
        allowed_cats = scheme.get("categories", ["general", "obc", "sc", "st"])
        if profile_category not in allowed_cats:
            fails.append(f"Category '{profile_category}' not in scheme target list.")
        # Location
        allowed_locs = scheme.get("location_types", ["rural", "urban", "semi_urban"])
        if profile_location not in allowed_locs:
            missing.append("Confirm location type with implementing agency.")
        # Collateral
        if scheme.get("requires_collateral") and not getattr(profile, "collateral_available", False):
            missing.append("Collateral or primary security required; confirm with lender.")

        if fails:
            eligible = "no"
            reasons = fails
        elif missing:
            eligible = "maybe"
            reasons = ["Core criteria met; additional confirmation needed."] + missing
        else:
            eligible = "yes"
            subsidy = scheme.get("subsidy_pct", 0)
            reasons = [
                f"Eligible for up to {subsidy}% subsidy." if subsidy > 0
                else "All deterministic eligibility rules satisfied."
            ]

        how_to = scheme.get("how_to_apply", [])[:3]  # top 3 only
        results.append(SchemeMatch(
            scheme_id=scheme["id"],
            scheme_name=scheme["name"],
            eligible=EligibilityStatus(eligible),
            reasons=reasons,
            missing_info=missing,
            max_loan=scheme.get("max_gap"),
            subsidy_pct=scheme.get("subsidy_pct", 0),
            interest_range=scheme.get("interest_note", ""),
            interest_rate_pct=scheme.get("interest_rate_pct"),
            typical_tenure_months=scheme.get("typical_tenure_months", 36),
            collateral_required=scheme.get("requires_collateral", False),
            how_to_apply=how_to,
            documents=scheme.get("documents", []),
            source_url=scheme.get("source_url", ""),
            last_verified=scheme.get("last_verified", ""),
            rank=0,       # set after sort
            recommended=False,
        ))

    # Sort: yes < maybe < no, then subsidy desc, then no-collateral first
    rank_map = {"yes": 0, "maybe": 1, "no": 2}
    results.sort(key=lambda m: (
        rank_map[m.eligible.value],
        -(m.subsidy_pct or 0),
        1 if m.collateral_required else 0,
        m.scheme_id,
    ))
    # Assign rank and recommended
    for i, m in enumerate(results):
        m.rank = i + 1
        m.recommended = (i == 0 and m.eligible.value == "yes")

    return results


# ========== Financial Projection ==========

# Default ramp-up factors for months 1-3 (business ramp-up period).
# Month 1: 40% of full capacity, Month 2: 60%, Month 3: 80%, Month 4+: 100%.
# Applied to units-sold multiplier, not to fixed opex.
# Rationale: new businesses face customer acquisition lag and operational
# teething issues in the first quarter regardless of business type.
DEFAULT_RAMP_UP = [0.40, 0.60, 0.80]   # indices 0,1,2 → months 1,2,3

async def finance_projection(
    idea: Idea, local: LocalData, investment: Investment
) -> Projection:
    """Generate 12-month financial projection with ramp-up, 3 scenarios and DSCR inputs.

    Ramp-up factors (DEFAULT_RAMP_UP) are applied to monthly revenue for months 1-3.
    Break-even is computed on the ramped base scenario.
    Returns base, pessimistic (-20% revenue) and optimistic (+15% revenue) scenarios,
    each with annual_net_profit, break_even_months and the monthly detail needed for DSCR.
    """
    from app.services.data_store import business_by_id

    canonical_id = _normalize_business_type(idea.business_type)
    scale = getattr(idea, 'scale', 'small')
    if hasattr(scale, 'value'):
        scale = scale.value
    scale = scale if scale in ('small', 'medium', 'large') else 'small'

    if canonical_id == "commercial_transport":
        base_monthly_revenue = 85000 if scale == "small" else (140000 if scale == "medium" else 220000)
        variable_cost_pct = 0.52
        fixed_opex = 7500
        seasonality = [0.95, 1.0, 1.15, 1.2, 1.1, 0.85, 0.8, 0.85, 0.95, 1.1, 1.2, 1.15]
    else:
        try:
            biz = business_by_id(canonical_id)
            model = biz["revenue_model"]
            seasonality = biz.get("seasonality", [1.0] * 12)
            base_monthly_revenue = (
                model["unit_price"]
                * model["units_per_month_by_scale"].get(scale, model["units_per_month_by_scale"].get("small", 50000))
            )
            variable_cost_pct = model["variable_cost_pct"]
            fixed_opex = model["fixed_opex_monthly"]
        except Exception as e:
            logger.warning("business_by_id failed for projection %s: %s", canonical_id, e)
            seasonality = [1.0] * 12
            base_monthly_revenue = 40000
            variable_cost_pct = 0.45
            fixed_opex = 5000

    total_investment = investment.total

    def _build_scenario(name: str, revenue_multiplier: float) -> dict:
        monthly = []
        cumulative = 0.0
        break_even_month = None
        for m in range(12):
            sf = seasonality[m] if m < len(seasonality) else 1.0
            ramp = DEFAULT_RAMP_UP[m] if m < len(DEFAULT_RAMP_UP) else 1.0
            revenue = round(base_monthly_revenue * sf * ramp * revenue_multiplier)
            var_cost = round(revenue * variable_cost_pct)
            net = revenue - var_cost - fixed_opex
            cumulative += net
            monthly.append(MonthlyProjection(
                month=m + 1,
                revenue=revenue,
                variable_cost=var_cost,
                fixed_cost=fixed_opex,
                net_profit=net,
                cumulative_profit=round(cumulative, 2),
            ))
            if break_even_month is None and cumulative >= total_investment:
                break_even_month = m + 1
        annual_revenue = sum(mo.revenue for mo in monthly)
        annual_profit = sum(mo.net_profit for mo in monthly)
        return {
            "monthly": monthly,
            "annual_revenue": annual_revenue,
            "annual_profit": annual_profit,
            "break_even_month": break_even_month,
        }

    base = _build_scenario("base", 1.0)
    pess = _build_scenario("pessimistic", 0.80)
    opti = _build_scenario("optimistic", 1.15)

    def note(b):
        if b is None:
            ap = sum(mo.net_profit for mo in base["monthly"])
            if ap > 0:
                est = round(total_investment / (ap / 12))
                return f"Estimated break-even in ~{est} months"
            return "Break-even not achievable with current projections"
        return ""

    return Projection(
        monthly=base["monthly"],
        break_even_months=base["break_even_month"],
        break_even_note=note(base["break_even_month"]),
        annual_revenue=base["annual_revenue"],
        annual_net_profit=base["annual_profit"],
        # extended scenario fields consumed by report_service
        pessimistic_annual_net_profit=pess["annual_profit"],
        optimistic_annual_net_profit=opti["annual_profit"],
        pessimistic_monthly=pess["monthly"],
        optimistic_monthly=opti["monthly"],
        pessimistic_break_even_months=pess["break_even_month"],
        optimistic_break_even_months=opti["break_even_month"],
    )


# ========== Repayment Plan ==========
async def finance_repayment_plan(
    loan: float, rate: float, months: int, projection: Projection, moratorium_months: int = 0,
    scheme_id: str | None = None,
) -> Repayment | None:
    """Calculate EMI and amortisation.

    loan_principal defaults to the funding gap (caller's responsibility).
    Returns: emi, principal, annual_rate_pct, tenure_months, dscr (base),
    dscr_pessimistic, scheme_source.
    Default tenure MUST come from scheme data (typical_tenure_months >= 12);
    the caller must pass the scheme's tenure, not derive it from affordability.
    """
    from app.utils.emi import dscr as calc_dscr
    from app.utils.emi import emi as calc_emi
    from app.utils.emi import schedule as emi_schedule
    from app.utils.emi import year1_debt_service

    if loan <= 0:
        return None

    # Minimum tenure guard
    months = max(12, months)

    raw_schedule = emi_schedule(loan, rate, months, moratorium_months)
    monthly_emi = calc_emi(loan, rate, months - moratorium_months)

    schedule_entries = [
        AmortizationEntry(
            month=r["month"],
            opening_balance=round(r["balance"] + r["principal"], 2),
            payment=r["payment"],
            emi=r["payment"],
            principal=r["principal"],
            interest=r["interest"],
            closing_balance=r["balance"],
        )
        for r in raw_schedule
    ]

    total_interest = sum(r["interest"] for r in raw_schedule)
    annual_interest, annual_principal = year1_debt_service(raw_schedule)

    # Base DSCR
    op_profit_base = projection.annual_net_profit + annual_interest
    dscr_val = calc_dscr(op_profit_base, annual_interest, annual_principal)
    dscr_final = round(dscr_val, 2) if dscr_val is not None else 1.5

    # Pessimistic DSCR (-20%)
    pess_profit = getattr(projection, "pessimistic_annual_net_profit", projection.annual_net_profit * 0.80)
    op_profit_pess = pess_profit + annual_interest
    dscr_pess = calc_dscr(op_profit_pess, annual_interest, annual_principal)
    dscr_pess_final = round(dscr_pess, 2) if dscr_pess is not None else dscr_final * 0.80

    avg_monthly_profit = projection.annual_net_profit / 12 if projection.annual_net_profit > 0 else 0
    affordable = (dscr_final >= 1.25) and (monthly_emi <= avg_monthly_profit * 0.5)

    note = "Loan appears affordable." if affordable else (
        f"DSCR {dscr_final:.2f} below 1.25." if dscr_final < 1.25
        else f"EMI ₹{monthly_emi:,.0f} exceeds 50% of projected monthly profit ₹{avg_monthly_profit:,.0f}."
    )

    return Repayment(
        loan_amount=loan,
        annual_rate_pct=rate,
        tenure_months=months,
        moratorium_months=moratorium_months,
        emi=round(monthly_emi, 2),
        total_interest=round(total_interest, 2),
        total_payment=round(loan + total_interest, 2),
        schedule=schedule_entries,
        dscr=dscr_final,
        dscr_pessimistic=dscr_pess_final,
        affordable=affordable,
        affordability_note=note,
        scheme_source=scheme_id,
    )



# ========== Credit Readiness ==========
async def credit_readiness(profile: Profile) -> CreditResult:
    """Assess credit readiness from profile quiz answers."""
    # Determine bucket
    if profile.has_existing_loans and not profile.missed_emis and profile.has_income_proof:
        bucket = CreditBucket.STRONG
        label = "Strong"
    elif profile.has_existing_loans and not profile.missed_emis:
        bucket = CreditBucket.FAIR
        label = "Fair"
    elif profile.first_time_borrower:
        bucket = CreditBucket.THIN_FILE
        label = "Thin File (First-time Borrower)"
    else:
        bucket = CreditBucket.NEEDS_REPAIR
        label = "Needs Repair"

    actions = []
    if bucket == CreditBucket.THIN_FILE:
        actions = [
            CreditAction(action="Open a savings account and maintain regular deposits for 3 months", timeline="30_days", priority="high"),
            CreditAction(action="Get a small secured credit card (FD-backed) to build credit history", timeline="30_days", priority="high"),
            CreditAction(action="Collect income proof: bank passbook, dairy milk collection receipts, or SHG records", timeline="60_days", priority="high"),
            CreditAction(action="Apply for Udyam registration to establish business identity", timeline="60_days", priority="medium"),
            CreditAction(action="Build 3-month bank statement showing regular transactions", timeline="90_days", priority="high"),
            CreditAction(action="Join or form a Self-Help Group for group lending access", timeline="90_days", priority="medium"),
        ]
    elif bucket == CreditBucket.NEEDS_REPAIR:
        actions = [
            CreditAction(action="Pay off all overdue EMIs immediately", timeline="30_days", priority="high"),
            CreditAction(action="Request a settlement plan from existing lenders", timeline="30_days", priority="high"),
            CreditAction(action="Maintain zero missed payments for 3 consecutive months", timeline="90_days", priority="high"),
            CreditAction(action="Check your CIBIL report for errors at cibil.com", timeline="30_days", priority="medium"),
        ]
    elif bucket == CreditBucket.FAIR:
        actions = [
            CreditAction(action="Collect and organise income proof documents", timeline="30_days", priority="high"),
            CreditAction(action="Ensure all current EMIs are paid on time", timeline="30_days", priority="high"),
            CreditAction(action="Build a project report for the business", timeline="60_days", priority="medium"),
        ]
    else:  # STRONG
        actions = [
            CreditAction(action="Prepare a detailed project report", timeline="30_days", priority="medium"),
            CreditAction(action="Collect latest 6-month bank statements", timeline="30_days", priority="medium"),
        ]

    return CreditResult(
        bucket=bucket,
        bucket_label=label,
        actions=actions,
        what_lenders_check=[
            "Regular savings pattern (3-6 months of bank statements)",
            "Existing loan repayment history",
            "Income stability and proof",
            "Business viability (project report)",
            "Collateral or guarantee (for larger loans)",
            "Identity and address verification"
        ],
        alternative_routes=[
            "Mudra Shishu (up to ₹50,000, no collateral, no CIBIL needed)",
            "SHG-bank linkage (group lending through Self-Help Groups)",
            "CGTMSE-backed loan (government guarantee replaces collateral)",
            "Co-applicant with credit history (family member as co-borrower)",
            "Start smaller and build track record before scaling"
        ],
        disclaimer="This is guidance only. We do not access or modify your credit report. Please verify your actual credit standing at cibil.com or through your bank."
    )


# ========== Feasibility Score ==========
async def scoring_feasibility_score(factors: dict) -> ScoreResult:
    """Calculate weighted feasibility score with full explainability.

    Factor inputs are returned alongside each score so the report can show
    "what went into this number". Verdict rules:
    - Score >= 75 → highly_feasible ONLY IF data_confidence == "high" AND
      no plausibility warning is present (optimistic_assumptions or weak_downside).
    - Score 55-74.9 → feasible_with_conditions
    - Score 40-54.9 → risky
    - Score < 40   → not_recommended

    Plausibility warnings (appended to report warnings[]):
    - "optimistic_assumptions": annual_profit/total_investment > 1.0, OR
      break_even < 6 months, OR base DSCR > 3.0
    - "weak_downside": pessimistic DSCR < 1.25
    """
    WEIGHTS = {"market": 0.25, "capital": 0.20, "repayment": 0.25, "breakeven": 0.15, "risk": 0.15}

    local_data = factors.get("local_data")
    gap = factors.get("gap")
    projection = factors.get("projection")
    repayment = factors.get("repayment")
    data_confidence = getattr(local_data, "confidence", "approximate") if local_data else "approximate"
    total_investment = gap.total_investment if gap else 0

    # ── Factor raw scores ────────────────────────────────────────────────────
    market_score = float(local_data.market_score) if local_data else 50.0
    capital_ratio = float(gap.capital_ratio) if gap else 0.5
    capital_score = min(100.0, capital_ratio * 200.0)

    base_dscr = None
    if repayment:
        base_dscr = repayment.dscr
        repayment_score = max(0.0, min(100.0, (base_dscr - 0.8) / (1.5 - 0.8) * 100.0))
    else:
        repayment_score = 80.0

    be_months = (projection.break_even_months if projection and projection.break_even_months else 36)
    if be_months <= 12:
        breakeven_score = 100.0
    elif be_months >= 48:
        breakeven_score = 0.0
    else:
        breakeven_score = max(0.0, 100.0 - ((be_months - 12) / 36) * 100.0)

    risk_items = local_data.risks if local_data else []
    avg_risk = (sum(r.get("score", 50) for r in risk_items) / len(risk_items)) if risk_items else 40.0
    risk_score = max(0.0, 100.0 - avg_risk)

    # ── Plausibility warnings ────────────────────────────────────────────────
    plausibility_warnings: list[str] = []
    annual_profit = projection.annual_net_profit if projection else 0
    if total_investment > 0 and annual_profit / total_investment > 1.0:
        plausibility_warnings.append("optimistic_assumptions")
    if be_months is not None and be_months < 6:
        plausibility_warnings.append("optimistic_assumptions")
    if base_dscr is not None and base_dscr > 3.0:
        plausibility_warnings.append("optimistic_assumptions")
    pess_dscr = getattr(repayment, "dscr_pessimistic", None) if repayment else None
    if pess_dscr is not None and pess_dscr < 1.25:
        plausibility_warnings.append("weak_downside")
    # Deduplicate
    plausibility_warnings = list(dict.fromkeys(plausibility_warnings))

    # ── Build factor list with inputs ────────────────────────────────────────
    factor_list = [
        FactorScore(
            factor="market", weight=WEIGHTS["market"],
            score=round(market_score, 1), weighted_score=round(market_score * WEIGHTS["market"], 1),
            explanation=f"Local market score {market_score:.0f}/100 from district data (confidence: {data_confidence})",
        ),
        FactorScore(
            factor="capital", weight=WEIGHTS["capital"],
            score=round(capital_score, 1), weighted_score=round(capital_score * WEIGHTS["capital"], 1),
            explanation=f"Capital ratio {capital_ratio:.1%} → score {capital_score:.0f}/100",
        ),
        FactorScore(
            factor="repayment", weight=WEIGHTS["repayment"],
            score=round(repayment_score, 1), weighted_score=round(repayment_score * WEIGHTS["repayment"], 1),
            explanation=(
                f"Base DSCR {base_dscr:.2f} → score {repayment_score:.0f}/100"
                if base_dscr is not None else "Self-funded (no loan)"
            ),
        ),
        FactorScore(
            factor="breakeven", weight=WEIGHTS["breakeven"],
            score=round(breakeven_score, 1), weighted_score=round(breakeven_score * WEIGHTS["breakeven"], 1),
            explanation=f"Break-even at month {be_months} → score {breakeven_score:.0f}/100",
        ),
        FactorScore(
            factor="risk", weight=WEIGHTS["risk"],
            score=round(risk_score, 1), weighted_score=round(risk_score * WEIGHTS["risk"], 1),
            explanation=f"Average risk severity score {avg_risk:.0f} → risk score {risk_score:.0f}/100",
        ),
    ]
    total_score = round(sum(f.weighted_score for f in factor_list), 1)

    # ── Verdict with honesty guards ──────────────────────────────────────────
    if total_score >= 75 and not plausibility_warnings and data_confidence == "high":
        verdict = VerdictLabel.HIGHLY_FEASIBLE
        display = "Highly Feasible ✅"
    elif total_score >= 55:
        verdict = VerdictLabel.FEASIBLE_WITH_CONDITIONS
        display = "Feasible with Conditions ⚠️"
    elif total_score >= 40:
        verdict = VerdictLabel.RISKY
        display = "Risky ⚠️"
    else:
        verdict = VerdictLabel.NOT_RECOMMENDED
        display = "Not Recommended ❌"

    return ScoreResult(
        score=total_score,
        verdict_label=verdict,
        verdict_display=display,
        factor_scores=factor_list,
        plausibility_warnings=plausibility_warnings,
        data_confidence=data_confidence,
    )


# ========== Document Base Lists ==========
async def documents_base_lists(business_type: str) -> DocLists:
    """Get base document checklists for a business type."""
    registration = [
        DocItem(name="Aadhaar Card", category="registration", why="Primary identity proof for all applications", where_to_get="Nearest Aadhaar centre or uidai.gov.in", approx_time="Already available / 15 days for new", approx_cost="Free", required=True),
        DocItem(name="PAN Card", category="registration", why="Required for tax registration and bank accounts", where_to_get="Apply at incometax.gov.in or NSDL/UTIITSL", approx_time="7-15 days", approx_cost="₹107", required=True),
        DocItem(name="Udyam Registration", category="registration", why="Official MSME registration; needed for scheme benefits", where_to_get="udyamregistration.gov.in (free, online, Aadhaar-based)", approx_time="Instant (online)", approx_cost="Free", required=True),
        DocItem(name="Shop & Establishment / Gram Panchayat Licence", category="registration", why="Local operating permission", where_to_get="Municipal office or Gram Panchayat", approx_time="7-30 days", approx_cost="₹200-500", required=True),
    ]

    # Add sector-specific docs
    # FSSAI is required for ANY food-handling business
    FOOD_BUSINESS_IDS = {
        "dairy_small", "tiffin_stall", "tiffin_food_stall", "flour_mill",
        "flour_spice_mill", "kirana_store",   # kirana often stocks food items
    }
    if business_type in FOOD_BUSINESS_IDS:
        registration.append(DocItem(
            name="FSSAI Registration / Licence",
            category="registration",
            why="Mandatory for any food business (sale, storage, manufacture or distribution of food).",
            where_to_get="foscos.fssai.gov.in (online, self-service)",
            approx_time="7-60 days",
            approx_cost="₹100-5000 (based on turnover)",
            required=True,
        ))

    if business_type in {"kirana_store"}:
        registration.append(DocItem(
            name="GST Registration",
            category="registration",
            why="Required if annual turnover exceeds ₹40 lakh",
            where_to_get="gst.gov.in",
            approx_time="7-15 days",
            approx_cost="Free",
            required=False,
        ))

    loan = [
        DocItem(name="Identity Proof (Aadhaar + PAN)", category="loan", why="KYC requirement for all loan applications", where_to_get="Already in registration documents", approx_time="Already available", approx_cost="Free", required=True),
        DocItem(name="Address Proof", category="loan", why="Verification of residence", where_to_get="Aadhaar, voter ID, utility bill, or ration card", approx_time="Already available", approx_cost="Free", required=True),
        DocItem(name="Passport-size Photographs", category="loan", why="Application forms and bank records", where_to_get="Any photo studio", approx_time="Same day", approx_cost="₹50-100", required=True),
        DocItem(name="Bank Statements (6 months)", category="loan", why="Shows financial discipline and transaction history", where_to_get="Your bank branch or net banking", approx_time="1-3 days", approx_cost="Free-₹200", required=True),
        DocItem(name="Project Report / Business Plan", category="loan", why="Demonstrates business viability to the lender", where_to_get="Prepare yourself or with help from DIC/KVIC", approx_time="3-7 days", approx_cost="Free (DIY) or ₹500-2000 (professional)", required=True),
        DocItem(name="Quotations for Equipment/Machinery", category="loan", why="Validates investment estimates in the project report", where_to_get="From suppliers / dealers", approx_time="3-7 days", approx_cost="Free", required=True),
        DocItem(name="Category Certificate (SC/ST/OBC)", category="loan", why="Needed to claim category-based scheme benefits", where_to_get="Tehsildar / SDM office", approx_time="15-30 days", approx_cost="₹50-100", required=False),
        DocItem(name="Land/Property Documents or Rent Agreement", category="loan", why="Proof of business premises", where_to_get="Landlord / Sub-registrar office", approx_time="1-7 days", approx_cost="Varies", required=True),
    ]

    return DocLists(registration=registration, loan=loan)


# ========== DB Operations (in-memory for now) ==========
async def db_save_report(report: FeasibilityReport, owner_session: str | None = None) -> str:
    """Save report to in-memory store with owner session."""
    if owner_session:
        report.owner_session = owner_session
    _report_store[report.report_id] = report
    logger.info(f"Report saved: {report.report_id} owner={owner_session}")
    return report.report_id

async def db_get_report(report_id: str, owner_session: str | None = None) -> FeasibilityReport | None:
    """Retrieve report from in-memory store."""
    return _report_store.get(report_id)
