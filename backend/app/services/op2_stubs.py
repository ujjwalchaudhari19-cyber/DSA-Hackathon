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
    # Default: Nashik district, dairy business (demo persona)
    return LocalData(
        district=district,
        business_type=business_type,
        population_band="50,000 - 1,00,000",
        nearest_market="Nashik City",
        distance_to_market_km=15.0,
        competitor_count=8,
        competitor_density="medium",
        avg_selling_price=32.0,  # per litre of milk
        demand_level="high",
        seasonal_notes="Demand peaks in winter (Oct-Feb). Summer months see slight dip due to heat stress on cattle.",
        input_availability="easy",
        confidence="medium",
        market_score=72.0,
        risks=[
            {"name": "Seasonal price fluctuation", "severity": "medium", "score": 35},
            {"name": "Feed cost volatility", "severity": "medium", "score": 40},
            {"name": "Disease outbreak risk", "severity": "high", "score": 25},
        ]
    )


# ========== Investment Estimate ==========
async def investment_estimate(idea: Idea, local: LocalData | None) -> Investment:
    """Estimate itemised investment for a business idea."""
    # Dairy small unit (demo)
    if idea.business_type == "dairy_small" or "dairy" in idea.business_type.lower():
        items = [
            CostItem(item="Cattle (HF/Jersey cross)", unit="per animal", unit_cost=45000, quantity=4, total=180000),
            CostItem(item="Cattle shed construction", unit="lump sum", unit_cost=35000, quantity=1, total=35000),
            CostItem(item="Milking equipment & utensils", unit="set", unit_cost=8000, quantity=1, total=8000),
            CostItem(item="Fodder storage", unit="lump sum", unit_cost=5000, quantity=1, total=5000),
            CostItem(item="Milk cans & cooling", unit="set", unit_cost=12000, quantity=1, total=12000),
            CostItem(item="Working capital (3 months)", unit="lump sum", unit_cost=30000, quantity=1, total=30000),
        ]
        subtotal = sum(i.total for i in items)
        contingency = round(subtotal * 0.10)
        total = subtotal + contingency
        working_capital = 30000
        fixed = total - working_capital - contingency
        return Investment(
            items=items, fixed_cost=fixed,
            working_capital=working_capital, contingency=contingency, total=total
        )

    # Generic fallback
    items = [
        CostItem(item="Equipment & setup", unit="lump sum", unit_cost=50000, quantity=1, total=50000),
        CostItem(item="Initial inventory / raw material", unit="lump sum", unit_cost=20000, quantity=1, total=20000),
        CostItem(item="Working capital (3 months)", unit="lump sum", unit_cost=15000, quantity=1, total=15000),
    ]
    subtotal = sum(i.total for i in items)
    contingency = round(subtotal * 0.10)
    total = subtotal + contingency
    return Investment(
        items=items, fixed_cost=50000,
        working_capital=15000, contingency=contingency, total=total
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
    """Match eligible government schemes."""
    schemes = []

    # PMEGP - Available for most new manufacturing/service businesses
    schemes.append(SchemeMatch(
        scheme_id="pmegp",
        scheme_name="Prime Minister's Employment Generation Programme (PMEGP)",
        eligible=EligibilityStatus.YES if profile.age >= 18 else EligibilityStatus.NO,
        reasons=["New enterprise in rural area", "Project cost within ₹25 lakh limit"],
        max_loan=2500000,
        subsidy_pct=35.0 if profile.category in ["sc", "st"] or profile.gender == "f" else 25.0,
        interest_range="10-12%",
        collateral_required=False,
        how_to_apply=[
            "Apply online at kviconline.gov.in",
            "Submit to nearest KVIC/KVIB/DIC office",
            "Attend EDP training (if selected)"
        ],
        source_url="https://www.kviconline.gov.in/pmegpeportal/"
    ))

    # Mudra Shishu
    if gap <= 50000:
        mudra_category = "Shishu"
        max_loan_mudra = 50000
    elif gap <= 500000:
        mudra_category = "Kishore"
        max_loan_mudra = 500000
    else:
        mudra_category = "Tarun"
        max_loan_mudra = 1000000

    schemes.append(SchemeMatch(
        scheme_id=f"mudra_{mudra_category.lower()}",
        scheme_name=f"PM Mudra Yojana ({mudra_category})",
        eligible=EligibilityStatus.YES,
        reasons=["Non-farm income generating activity", "No collateral required"],
        max_loan=max_loan_mudra,
        subsidy_pct=0,
        interest_range="8-12%",
        collateral_required=False,
        how_to_apply=[
            "Visit any commercial bank, RRB, or MFI",
            "Fill Mudra loan application form",
            "Submit business plan and identity documents"
        ],
        source_url="https://www.mudra.org.in/"
    ))

    # Stand-Up India (for SC/ST/Women)
    if profile.category in ["sc", "st"] or profile.gender == "f":
        schemes.append(SchemeMatch(
            scheme_id="standup_india",
            scheme_name="Stand-Up India",
            eligible=EligibilityStatus.YES,
            reasons=[
                f"Eligible as {'SC/ST' if profile.category in ['sc', 'st'] else 'woman'} entrepreneur",
                "Loan for greenfield enterprise"
            ],
            max_loan=10000000,
            subsidy_pct=0,
            interest_range="7.5-9%",
            collateral_required=False,
            how_to_apply=[
                "Apply on standupmitra.in portal",
                "Or visit nearest bank branch",
                "Submit required documents and project report"
            ],
            source_url="https://www.standupmitra.in/"
        ))

    # DAY-NRLM / SHG linkage
    if profile.gender == "f":
        schemes.append(SchemeMatch(
            scheme_id="day_nrlm",
            scheme_name="DAY-NRLM (SHG-Bank Linkage)",
            eligible=EligibilityStatus.MAYBE,
            reasons=["Must be an SHG member", "Group-based lending"],
            missing_info=["SHG membership status"],
            max_loan=500000,
            subsidy_pct=0,
            interest_range="7-9%",
            collateral_required=False,
            how_to_apply=[
                "Join or form a Self-Help Group (10-15 women)",
                "Maintain regular savings and meetings for 6 months",
                "Apply through SHG federation to bank"
            ],
            source_url="https://nrlm.gov.in/"
        ))

    # CGTMSE - credit guarantee
    schemes.append(SchemeMatch(
        scheme_id="cgtmse",
        scheme_name="CGTMSE (Credit Guarantee Fund Trust)",
        eligible=EligibilityStatus.YES,
        reasons=["Collateral-free loans up to ₹5 crore for MSMEs"],
        max_loan=50000000,
        subsidy_pct=0,
        interest_range="Bank rate",
        collateral_required=False,
        how_to_apply=[
            "Apply at any member lending institution (MLI)",
            "Bank applies for CGTMSE cover on your behalf"
        ],
        source_url="https://www.cgtmse.in/"
    ))

    # PM-FME (for food processing)
    if idea.business_type in ["tiffin_stall", "flour_mill"] or "food" in idea.business_type.lower():
        schemes.append(SchemeMatch(
            scheme_id="pm_fme",
            scheme_name="PM Formalisation of Micro Food Processing Enterprises (PM-FME)",
            eligible=EligibilityStatus.YES,
            reasons=["Food processing micro enterprise", "35% credit-linked subsidy"],
            max_loan=1000000,
            subsidy_pct=35.0,
            interest_range="8-10%",
            collateral_required=False,
            how_to_apply=[
                "Apply through state nodal agency",
                "Register on PM-FME portal",
                "Submit DPR (Detailed Project Report)"
            ],
            source_url="https://pmfme.mofpi.gov.in/"
        ))

    return schemes


# ========== Financial Projection ==========
async def finance_projection(
    idea: Idea, local: LocalData, investment: Investment
) -> Projection:
    """Generate 12-month financial projection."""
    # Dairy defaults
    seasonality = [1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 1.0, 1.0, 1.1, 1.1, 1.1, 1.0]
    base_monthly_revenue = 4 * 10 * 30 * 32  # 4 cows × 10L/day × 30 days × ₹32/L = ₹38,400
    variable_cost_pct = 0.45
    fixed_opex = 8000  # monthly: feed supplements, vet, misc

    if "kirana" in idea.business_type.lower() or "store" in idea.business_type.lower():
        base_monthly_revenue = 60000
        variable_cost_pct = 0.75
        fixed_opex = 5000
        seasonality = [1.0]*12
    elif "tailoring" in idea.business_type.lower():
        base_monthly_revenue = 25000
        variable_cost_pct = 0.30
        fixed_opex = 3000
        seasonality = [0.8, 0.9, 1.0, 1.1, 1.2, 0.9, 0.8, 0.8, 1.0, 1.3, 1.3, 1.0]

    monthly = []
    cumulative = 0
    break_even_month = None

    for m in range(12):
        revenue = round(base_monthly_revenue * seasonality[m])
        var_cost = round(revenue * variable_cost_pct)
        net = revenue - var_cost - fixed_opex
        cumulative += net
        monthly.append(MonthlyProjection(
            month=m + 1,
            revenue=revenue,
            variable_cost=var_cost,
            fixed_cost=fixed_opex,
            net_profit=net,
            cumulative_profit=cumulative
        ))
        if break_even_month is None and cumulative >= investment.total:
            break_even_month = m + 1

    annual_revenue = sum(m.revenue for m in monthly)
    annual_profit = sum(m.net_profit for m in monthly)

    note = ""
    if break_even_month is None:
        if annual_profit > 0:
            est_months = round(investment.total / (annual_profit / 12))
            note = f"Estimated break-even in ~{est_months} months"
        else:
            note = "Break-even not achievable with current projections"

    return Projection(
        monthly=monthly,
        break_even_months=break_even_month,
        break_even_note=note,
        annual_revenue=annual_revenue,
        annual_net_profit=annual_profit
    )


# ========== Repayment Plan ==========
async def finance_repayment_plan(
    loan: float, rate: float, months: int, projection: Projection, moratorium_months: int = 0
) -> Repayment | None:
    """Calculate EMI, amortization schedule, DSCR using app.utils.emi."""
    from app.utils.emi import dscr as calc_dscr
    from app.utils.emi import emi as calc_emi
    from app.utils.emi import schedule as emi_schedule
    from app.utils.emi import year1_debt_service

    if loan <= 0:
        return None

    raw_schedule = emi_schedule(loan, rate, months, moratorium_months)
    monthly_emi = calc_emi(loan, rate, months - moratorium_months)

    schedule_entries = [
        AmortizationEntry(
            month=r["month"],
            opening_balance=r["balance"] + r["principal"],
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

    # DSCR = operating profit BEFORE interest / (annual_interest + annual_principal)
    operating_profit_before_interest = projection.annual_net_profit + annual_interest
    dscr_val = calc_dscr(operating_profit_before_interest, annual_interest, annual_principal)
    dscr_final = round(dscr_val, 2) if dscr_val is not None else 1.5

    avg_monthly_profit = projection.annual_net_profit / 12 if projection.annual_net_profit > 0 else 0
    affordable = (dscr_final >= 1.25) and (monthly_emi <= (avg_monthly_profit * 0.5))

    note = ""
    if not affordable:
        if dscr_final < 1.25:
            note = f"DSCR ({dscr_final:.2f}) is below the recommended 1.25. Consider a longer tenure or smaller loan."
        elif monthly_emi > avg_monthly_profit * 0.5:
            note = f"Payment (₹{monthly_emi:,.0f}) exceeds 50% of estimated monthly profit (₹{avg_monthly_profit:,.0f}). Consider reducing the loan amount."
    else:
        note = "The loan appears affordable based on projected income."

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
        affordable=affordable,
        affordability_note=note,
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
    """Calculate weighted feasibility score."""
    WEIGHTS = {"market": 0.25, "capital": 0.20, "repayment": 0.25, "breakeven": 0.15, "risk": 0.15}

    local_data = factors.get("local_data")
    gap = factors.get("gap")
    projection = factors.get("projection")
    repayment = factors.get("repayment")

    # Market score
    market_score = local_data.market_score if local_data else 50

    # Capital adequacy
    capital_ratio = gap.capital_ratio if gap else 0.5
    capital_score = min(100, capital_ratio * 200)

    # Repayment strength
    if repayment:
        dscr = repayment.dscr
        repayment_score = max(0, min(100, (dscr - 0.8) / (1.5 - 0.8) * 100))
    else:
        repayment_score = 80  # Self-funded = good

    # Break-even speed
    be_months = projection.break_even_months if projection and projection.break_even_months else 36
    if be_months <= 12:
        breakeven_score = 100
    elif be_months >= 48:
        breakeven_score = 0
    else:
        breakeven_score = max(0, 100 - ((be_months - 12) / 36) * 100)

    # Risk
    risk_items = local_data.risks if local_data else []
    if risk_items:
        avg_risk = sum(r.get("score", 50) for r in risk_items) / len(risk_items)
        risk_score = 100 - avg_risk
    else:
        risk_score = 60

    factor_list = [
        FactorScore(factor="market", weight=WEIGHTS["market"], score=market_score, weighted_score=round(market_score * WEIGHTS["market"], 1), explanation="Local market demand and competition assessment"),
        FactorScore(factor="capital", weight=WEIGHTS["capital"], score=round(capital_score, 1), weighted_score=round(capital_score * WEIGHTS["capital"], 1), explanation="Your capital adequacy relative to total investment"),
        FactorScore(factor="repayment", weight=WEIGHTS["repayment"], score=round(repayment_score, 1), weighted_score=round(repayment_score * WEIGHTS["repayment"], 1), explanation="Debt service coverage ratio and loan affordability"),
        FactorScore(factor="breakeven", weight=WEIGHTS["breakeven"], score=round(breakeven_score, 1), weighted_score=round(breakeven_score * WEIGHTS["breakeven"], 1), explanation="Time to recover initial investment"),
        FactorScore(factor="risk", weight=WEIGHTS["risk"], score=round(risk_score, 1), weighted_score=round(risk_score * WEIGHTS["risk"], 1), explanation="Overall risk exposure from local conditions"),
    ]

    total_score = round(sum(f.weighted_score for f in factor_list), 1)

    if total_score >= 75:
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
        factor_scores=factor_list
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
    if business_type in ["dairy_small", "tiffin_stall", "flour_mill"]:
        registration.append(DocItem(name="FSSAI Registration / Licence", category="registration", why="Mandatory for food business operations", where_to_get="foscos.fssai.gov.in (online)", approx_time="7-60 days", approx_cost="₹100-5000 (based on turnover)", required=True))

    if business_type in ["kirana_store"]:
        registration.append(DocItem(name="GST Registration", category="registration", why="Required if annual turnover exceeds ₹40 lakh", where_to_get="gst.gov.in", approx_time="7-15 days", approx_cost="Free", required=False))

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
