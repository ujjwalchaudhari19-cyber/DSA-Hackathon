"""
GramUdyam AI – Shared Pydantic schemas.

Every model used across Operator 1 (AI / LLM) and Operator 2 (Data / Finance)
is defined here so that the rest of the codebase imports from a single source
of truth.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════


class Language(str, Enum):
    """Supported UI / response languages."""

    EN = "en"
    HI = "hi"
    MR = "mr"


class VerdictLabel(str, Enum):
    """Feasibility verdict categories."""

    HIGHLY_FEASIBLE = "highly_feasible"
    FEASIBLE_WITH_CONDITIONS = "feasible_with_conditions"
    RISKY = "risky"
    NOT_RECOMMENDED = "not_recommended"


class CreditBucket(str, Enum):
    """CIBIL-readiness buckets."""

    STRONG = "strong"
    FAIR = "fair"
    THIN_FILE = "thin_file"
    NEEDS_REPAIR = "needs_repair"


class EligibilityStatus(str, Enum):
    """Scheme eligibility tri-state."""

    YES = "yes"
    MAYBE = "maybe"
    NO = "no"


class Scenario(str, Enum):
    """Financial projection scenarios."""

    BASE = "base"
    PESSIMISTIC = "pessimistic"
    OPTIMISTIC = "optimistic"


# ═══════════════════════════════════════════════════════════════════════════════
# Profile & Input Models
# ═══════════════════════════════════════════════════════════════════════════════


class Profile(BaseModel):
    """Entrepreneur profile collected during onboarding."""

    model_config = {"str_strip_whitespace": True}

    state: str = Field(..., description="Indian state name")
    district: str = Field(..., description="District within the state")
    village: str | None = Field(None, description="Village or town name")
    capital: float = Field(..., ge=0, description="Available capital in INR")
    category: Literal["general", "obc", "sc", "st"] = Field(
        ..., description="Social category for scheme eligibility"
    )
    gender: Literal["f", "m", "o"] = Field(
        ..., description="Gender: female / male / other"
    )
    age: int = Field(..., ge=18, le=100, description="Age of the entrepreneur")
    experience: Literal["none", "some", "experienced"] = Field(
        ..., description="Prior business experience level"
    )
    education: str | None = Field(
        None, description="Highest education qualification"
    )
    has_existing_loans: bool = Field(
        False, description="Whether the user has outstanding loans"
    )
    missed_emis: bool = Field(
        False, description="Whether the user has missed EMI payments"
    )
    has_credit_card: bool = Field(
        False, description="Whether the user owns a credit card"
    )
    first_time_borrower: bool = Field(
        True, description="True if the user has never taken a formal loan"
    )
    has_income_proof: bool = Field(
        False, description="Whether verifiable income proof is available"
    )
    has_collateral: bool = Field(
        False, description="Whether the user can offer collateral"
    )


class DiscoveryAnswers(BaseModel):
    """Answers from the *Choose Your Business* questionnaire."""

    model_config = {"str_strip_whitespace": True}

    interests: list[str] = Field(
        ...,
        description=(
            "Interest areas: agri, food, retail, services, manufacturing, craft"
        ),
    )
    budget_min: float = Field(..., ge=0, description="Minimum budget in INR")
    budget_max: float = Field(..., ge=0, description="Maximum budget in INR")
    time_commitment: Literal["full", "part"] = Field(
        ..., description="Full-time or part-time commitment"
    )
    skills: list[str] = Field(
        default_factory=list, description="Known skills / vocational training"
    )
    space_available: Literal["none", "room", "shed", "shop", "land"] = Field(
        ..., description="Physical space available to the entrepreneur"
    )
    location_type: Literal["village", "town", "city_fringe"] = Field(
        ..., description="Type of locality"
    )
    electricity: bool = Field(True, description="Reliable electricity access")
    water: bool = Field(True, description="Reliable water access")


class Idea(BaseModel):
    """Normalized business idea produced by the AI normalizer."""

    model_config = {"str_strip_whitespace": True}

    business_type: str = Field(..., description="Canonical business type key")
    scale: Literal["small", "medium", "large"] = Field(
        "small", description="Planned scale of the venture"
    )
    products: list[str] = Field(
        default_factory=list, description="Products or services offered"
    )
    target_customer: str = Field(
        "", description="Primary target customer segment"
    )
    raw_input: str | None = Field(
        None, description="Original free-text input from the user"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Operator 2 – Deterministic / Data Output Models
# ═══════════════════════════════════════════════════════════════════════════════


class Business(BaseModel):
    """A business entry from the curated catalogue."""

    id: str = Field(..., description="Unique business catalogue ID")
    name: str = Field(..., description="Display name of the business")
    sector: str = Field(..., description="Sector: agri, food, retail, …")
    min_investment: float | None = Field(
        None, description="Lower bound of typical investment (INR)"
    )
    max_investment: float | None = Field(
        None, description="Upper bound of typical investment (INR)"
    )
    space_needed: str = Field(
        ..., description="Space requirement label"
    )
    skills: list[str] = Field(
        default_factory=list, description="Skills helpful for this business"
    )
    time: str = Field(..., description="Time commitment label")
    difficulty: Literal["easy", "moderate", "hard"] | None = Field(
        "moderate", description="Difficulty rating"
    )


class CostItem(BaseModel):
    """Single line item in the investment breakdown."""

    item: str = Field(..., description="Name of the cost item")
    unit: str = Field(..., description="Unit of measurement")
    unit_cost: float = Field(..., description="Cost per unit in INR")
    quantity: float = Field(..., description="Number of units required")
    total: float = Field(..., description="Line-item total (unit_cost × quantity)")


class Investment(BaseModel):
    """Itemized investment estimate for a business idea."""

    items: list[CostItem] = Field(
        ..., description="Detailed cost line items"
    )
    fixed_cost: float = Field(
        ..., description="Total fixed / one-time costs in INR"
    )
    working_capital: float = Field(
        ..., description="Working capital requirement in INR"
    )
    contingency: float = Field(
        ..., description="Contingency buffer in INR"
    )
    total: float = Field(
        ..., description="Grand total investment in INR"
    )


class Gap(BaseModel):
    """Funding gap calculation result."""

    total_investment: float = Field(
        ..., description="Total investment required"
    )
    available_capital: float = Field(
        ..., description="Capital available with the entrepreneur"
    )
    gap: float = Field(
        ..., ge=0, description="Funding shortfall (investment − capital)"
    )
    capital_ratio: float = Field(
        ..., ge=0, le=1,
        description="Fraction of investment covered by own capital",
    )
    is_self_funded: bool = Field(
        ..., description="True when gap is zero"
    )


class SchemeMatch(BaseModel):
    """A matched government scheme with eligibility details."""

    scheme_id: str = Field(..., description="Unique scheme identifier")
    scheme_name: str = Field(..., description="Official scheme name")
    eligible: EligibilityStatus = Field(
        ..., description="Eligibility verdict"
    )
    reasons: list[str] = Field(
        ..., description="Reasons for the eligibility decision"
    )
    missing_info: list[str] = Field(
        default_factory=list,
        description="Information still needed from the user",
    )
    max_loan: float | None = Field(
        None, description="Maximum loan amount under the scheme"
    )
    subsidy_pct: float | None = Field(
        None, description="Subsidy percentage offered"
    )
    interest_range: str | None = Field(
        None, description="Indicative interest-rate range"
    )
    collateral_required: bool = Field(
        False, description="Whether collateral is required"
    )
    how_to_apply: list[str] = Field(
        default_factory=list, description="Step-by-step application guide"
    )
    source_url: str | None = Field(
        None, description="Official URL for the scheme"
    )


class MonthlyProjection(BaseModel):
    """Single month in the 12-month financial projection."""

    month: int = Field(..., ge=1, le=12, description="Month number (1-12)")
    revenue: float = Field(..., description="Projected revenue in INR")
    variable_cost: float = Field(
        ..., description="Variable costs for the month"
    )
    fixed_cost: float = Field(
        ..., description="Fixed costs for the month"
    )
    net_profit: float = Field(
        ..., description="Net profit (revenue − costs)"
    )
    cumulative_profit: float = Field(
        ..., description="Running total of net profit"
    )


class Projection(BaseModel):
    """12-month financial projection for the business."""

    monthly: list[MonthlyProjection] = Field(
        ..., description="Month-by-month projections"
    )
    break_even_months: int | None = Field(
        None, description="Month number when cumulative profit turns positive"
    )
    break_even_note: str = Field(
        "", description="Human-readable break-even explanation"
    )
    scenario: Scenario = Field(
        Scenario.BASE, description="Which scenario this projection represents"
    )
    annual_revenue: float = Field(
        ..., description="Total projected revenue for the year"
    )
    annual_net_profit: float = Field(
        ..., description="Total projected net profit for the year"
    )


class AmortizationEntry(BaseModel):
    """Single row in the loan amortization schedule."""

    month: int = Field(..., description="Month number")
    opening_balance: float = Field(
        ..., description="Balance at start of the month"
    )
    payment: float = Field(..., description="Payment made this month")
    emi: float | None = Field(default=None, description="Deprecated alias for payment")
    principal: float = Field(
        ..., description="Principal component of the EMI"
    )
    interest: float = Field(
        ..., description="Interest component of the EMI"
    )
    closing_balance: float = Field(
        ..., description="Balance at end of the month"
    )


class Repayment(BaseModel):
    """Loan repayment calculation with amortization schedule."""

    loan_amount: float = Field(..., description="Loan principal in INR")
    annual_rate_pct: float = Field(
        ..., description="Annual interest rate (percentage)"
    )
    tenure_months: int = Field(
        ..., description="Total loan tenure in months"
    )
    moratorium_months: int = Field(
        0, description="Interest-only moratorium period in months"
    )
    emi: float = Field(..., description="Equated monthly instalment in INR")
    total_interest: float = Field(
        ..., description="Total interest payable over the tenure"
    )
    total_payment: float = Field(
        ..., description="Total amount payable (principal + interest)"
    )
    schedule: list[AmortizationEntry] = Field(
        default_factory=list, description="Full amortization schedule"
    )
    dscr: float = Field(
        ..., description="Debt Service Coverage Ratio"
    )
    affordable: bool = Field(
        ..., description="Whether the EMI is affordable given projected income"
    )
    affordability_note: str = Field(
        "", description="Human-readable affordability explanation"
    )


class CreditAction(BaseModel):
    """A single action item to improve credit readiness."""

    action: str = Field(..., description="Description of the action")
    timeline: Literal["30_days", "60_days", "90_days"] = Field(
        ..., description="Recommended completion timeline"
    )
    priority: Literal["high", "medium", "low"] = Field(
        ..., description="Priority level"
    )


class CreditResult(BaseModel):
    """CIBIL readiness assessment result."""

    bucket: CreditBucket = Field(
        ..., description="Credit-readiness bucket"
    )
    bucket_label: str = Field(
        ..., description="Human-readable bucket label"
    )
    actions: list[CreditAction] = Field(
        ..., description="Recommended actions to improve credit standing"
    )
    what_lenders_check: list[str] = Field(
        ..., description="Key factors lenders evaluate"
    )
    alternative_routes: list[str] = Field(
        ...,
        description="Alternative funding routes if traditional credit is weak",
    )
    disclaimer: str = Field(
        ..., description="Legal / advisory disclaimer text"
    )


class FactorScore(BaseModel):
    """Individual factor contributing to the feasibility score."""

    factor: str = Field(..., description="Factor name")
    weight: float = Field(..., description="Weight assigned to this factor")
    score: float = Field(..., description="Raw score for this factor")
    weighted_score: float = Field(
        ..., description="Weighted contribution to the total"
    )
    explanation: str = Field(
        "", description="Brief explanation of the score"
    )


class ScoreResult(BaseModel):
    """Feasibility scoring result (0-100)."""

    score: float = Field(
        ..., ge=0, le=100, description="Overall feasibility score"
    )
    verdict_label: VerdictLabel = Field(
        ..., description="Machine-readable verdict"
    )
    verdict_display: str = Field(
        ..., description="Human-readable verdict string"
    )
    factor_scores: list[FactorScore] = Field(
        ..., description="Breakdown by individual factors"
    )


class LocalData(BaseModel):
    """Local market data for a district + business type combination."""

    district: str = Field(..., description="District name")
    business_type: str = Field(..., description="Business type key")
    population_band: str = Field(
        ..., description="Population band of the area"
    )
    nearest_market: str = Field(
        ..., description="Name of the nearest market town"
    )
    distance_to_market_km: float = Field(
        ..., description="Distance to the nearest market in km"
    )
    competitor_count: int = Field(
        ..., description="Estimated number of competitors in the area"
    )
    competitor_density: Literal["low", "medium", "high"] = Field(
        ..., description="Competitor density classification"
    )
    avg_selling_price: float | None = Field(
        None, description="Average selling price for key products in INR"
    )
    demand_level: Literal["low", "moderate", "high", "very_high"] = Field(
        ..., description="Estimated demand level"
    )
    seasonal_notes: str = Field(
        "", description="Seasonality information"
    )
    input_availability: Literal["easy", "moderate", "difficult"] = Field(
        ..., description="Ease of obtaining raw materials / inputs"
    )
    confidence: Literal["high", "medium", "approximate"] = Field(
        ..., description="Confidence level in the data"
    )
    market_score: float = Field(
        default=50, ge=0, le=100, description="Composite market-opportunity score"
    )
    risks: list[dict] = Field(  # type: ignore[type-arg]
        default_factory=list, description="List of risk dicts (name, severity, detail)"
    )


class DocItem(BaseModel):
    """A document in the registration / loan checklist."""

    name: str = Field(..., description="Document name")
    category: Literal["registration", "loan"] = Field(
        ..., description="Document category"
    )
    why: str = Field(..., description="Why this document is needed")
    where_to_get: str = Field(
        ..., description="Where to obtain this document"
    )
    approx_time: str = Field(
        ..., description="Approximate time to obtain"
    )
    approx_cost: str = Field(
        ..., description="Approximate cost to obtain"
    )
    required: bool = Field(
        True, description="Whether the document is mandatory"
    )


class DocLists(BaseModel):
    """Combined document checklists for registration and loans."""

    registration: list[DocItem] = Field(
        ..., description="Documents needed for business registration"
    )
    loan: list[DocItem] = Field(
        ..., description="Documents needed for loan application"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Operator 1 – LLM Output Schemas
# ═══════════════════════════════════════════════════════════════════════════════


class RiskItem(BaseModel):
    """A single identified risk with severity and mitigation strategy."""

    name: str = Field(..., description="Risk name / title")
    severity: Literal["low", "medium", "high"] = Field(
        ..., description="Severity level"
    )
    mitigation: str = Field(
        ..., description="Suggested mitigation strategy"
    )


class DiscoverySuggestion(BaseModel):
    """One business suggestion returned by the discovery flow."""

    business_id: str = Field(..., description="Catalogue business ID")
    business_name: str = Field(..., description="Display name")
    rank: int = Field(..., description="Rank (1 = best match)")
    why_it_suits_you: str = Field(
        ..., description="Personalized explanation of fit"
    )
    watch_out_for: str = Field(
        ..., description="Key risks or considerations"
    )
    estimated_investment_range: str = Field(
        ..., description="Approximate investment range string"
    )
    expected_monthly_income_range: str = Field(
        ..., description="Approximate monthly income range string"
    )
    difficulty: str = Field(
        ..., description="Difficulty label"
    )


class DiscoveryResponse(BaseModel):
    """Response payload for the business discovery endpoint."""

    suggestions: list[DiscoverySuggestion] = Field(
        ..., description="Ranked business suggestions"
    )
    note: str = Field(
        "", description="Optional note or disclaimer"
    )


class NormalizedIdea(BaseModel):
    """LLM-normalized version of a free-text business idea."""

    business_type: str = Field(
        ..., description="Canonical business type key"
    )
    scale: Literal["small", "medium", "large"] = Field(
        ..., description="Inferred scale"
    )
    products: list[str] = Field(
        default_factory=list, description="Inferred products / services"
    )
    target_customer: str = Field(
        ..., description="Inferred target customer segment"
    )
    ambiguities: list[str] = Field(
        default_factory=list, description="Parts of the input that were ambiguous"
    )
    clarifying_questions: list[str] = Field(
        default_factory=list,
        description="Follow-up questions the AI would like to ask",
    )
    confidence: float = Field(
        default=0.8, ge=0, le=1,
        description="Model confidence in the normalization (0-1)",
    )


class LocalAnalysisNarrative(BaseModel):
    """AI-generated narrative for local market analysis."""

    demand_summary: str = Field(
        ..., description="Summary of demand conditions"
    )
    customer_segments: list[str] = Field(
        ..., description="Identified customer segments"
    )
    competitor_summary: str = Field(
        ..., description="Summary of competitor landscape"
    )
    opportunities: list[str] = Field(
        ..., description="Key opportunities identified"
    )
    risks: list[RiskItem] = Field(
        ..., description="Identified risks with mitigations"
    )
    seasonal_insights: str = Field(
        "", description="Seasonal patterns or insights"
    )
    local_data: LocalData | None = Field(
        None, description="Quantitative market data from Op 2"
    )


class ReportNarrative(BaseModel):
    """AI-generated narrative sections for the full feasibility report."""

    verdict_summary: str = Field(
        ..., description="One-paragraph verdict summary"
    )
    market_summary: str = Field(
        ..., description="Market analysis narrative"
    )
    investment_summary: str = Field(
        ..., description="Investment breakdown narrative"
    )
    funding_summary: str = Field(
        ..., description="Funding gap and scheme narrative"
    )
    scheme_explanations: dict[str, str] = Field(
        ...,
        description="Per-scheme explanation keyed by scheme_id",
    )
    repayment_summary: str = Field(
        ..., description="Loan repayment narrative"
    )
    break_even_summary: str = Field(
        ..., description="Break-even analysis narrative"
    )
    risk_summary: str = Field(
        ..., description="Risk analysis narrative"
    )
    recommendations: list[str] = Field(
        ..., description="Actionable recommendations"
    )
    next_steps: list[str] = Field(
        ..., description="Suggested next steps for the entrepreneur"
    )
    disclaimer: str = Field(
        ..., description="Legal / advisory disclaimer"
    )


class ComparisonEntry(BaseModel):
    """One entry in a multi-idea comparison."""

    business_id: str = Field(..., description="Business catalogue ID")
    business_name: str = Field(..., description="Display name")
    rationale: str = Field(
        ..., description="Comparison rationale for this idea"
    )


class ComparisonResponse(BaseModel):
    """AI-generated comparison of multiple business ideas."""

    best_fit_id: str = Field(
        ..., description="ID of the recommended best-fit business"
    )
    best_fit_reason: str = Field(
        ..., description="Why this is the best fit"
    )
    entries: list[ComparisonEntry] = Field(
        ..., description="Per-idea comparison entries"
    )


class TailoredDocItem(BaseModel):
    """A document checklist item with local tailoring notes."""

    name: str = Field(..., description="Document name")
    category: Literal["registration", "loan"] = Field(
        ..., description="Document category"
    )
    why: str = Field(..., description="Why this document is needed")
    where_to_get: str = Field(
        ..., description="Where to obtain this document"
    )
    approx_time: str = Field(
        ..., description="Approximate time to obtain"
    )
    approx_cost: str = Field(
        ..., description="Approximate cost to obtain"
    )
    required: bool = Field(
        True, description="Whether the document is mandatory"
    )
    local_notes: str = Field(
        "", description="Location-specific tips or notes"
    )


class TailoredDocList(BaseModel):
    """AI-tailored document checklists with local context."""

    registration: list[TailoredDocItem] = Field(
        ..., description="Registration documents"
    )
    loan: list[TailoredDocItem] = Field(
        ..., description="Loan-application documents"
    )
    additional_notes: str = Field(
        "", description="Any extra notes or tips"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# API Request / Response Models
# ═══════════════════════════════════════════════════════════════════════════════


class DiscoverRequest(BaseModel):
    """Request body for the business discovery endpoint."""

    answers: DiscoveryAnswers = Field(
        ..., description="Questionnaire answers"
    )
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class IdeaNormalizeRequest(BaseModel):
    """Request body for the idea normalization endpoint."""

    raw_input: str = Field(
        ..., description="Free-text business idea from the user"
    )
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class LocalAnalysisRequest(BaseModel):
    """Request body for the local market analysis endpoint."""

    district: str = Field(..., description="Target district")
    business_type: str = Field(..., description="Business type key")
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class ReportGenerateRequest(BaseModel):
    """Request body for the full feasibility report endpoint."""

    profile: Profile = Field(..., description="Entrepreneur profile")
    idea: Idea = Field(..., description="Normalized business idea")
    loan_amount: float | None = Field(
        None, description="Desired loan amount in INR"
    )
    loan_rate: float | None = Field(
        None, description="Expected annual interest rate (%)"
    )
    loan_tenure_months: int | None = Field(
        60, description="Loan tenure in months"
    )
    moratorium_months: int = Field(
        0, description="Moratorium period in months"
    )
    lang: str = Field(
        "en", description="Response language (en, hi, mr with fallback to en)"
    )


class CompareRequest(BaseModel):
    """Request body for comparing multiple business ideas."""

    ideas: list[Idea] = Field(
        ..., min_length=2, max_length=3,
        description="Two or three business ideas to compare",
    )
    profile: Profile = Field(..., description="Entrepreneur profile")
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class DocumentChecklistRequest(BaseModel):
    """Request body for the document checklist endpoint."""

    business_type: str = Field(..., description="Business type key")
    profile: Profile = Field(..., description="Entrepreneur profile")
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class AdvisorChatRequest(BaseModel):
    """Request body for the AI advisor chat endpoint."""

    message: str = Field(
        ..., description="User's chat message"
    )
    session_id: str | None = Field(
        None, description="Chat session ID for context continuity"
    )
    profile: Profile | None = Field(
        None, description="Entrepreneur profile (if available)"
    )
    report_summary: dict | None = Field(  # type: ignore[type-arg]
        None, description="Summary of a previously generated report"
    )
    lang: Language = Field(
        Language.EN, description="Response language"
    )


class FeasibilityReport(BaseModel):
    """Complete feasibility report combining deterministic and AI-generated content."""

    report_id: str = Field(..., description="Unique report identifier")
    profile: Profile = Field(..., description="Entrepreneur profile used")
    idea: Idea = Field(..., description="Business idea evaluated")
    local_data: LocalData = Field(
        ..., description="Local market data snapshot"
    )
    investment: Investment = Field(
        ..., description="Itemized investment estimate"
    )
    gap: Gap = Field(..., description="Funding gap analysis")
    schemes: list[SchemeMatch] = Field(
        ..., description="Matched government schemes"
    )
    projection: Projection = Field(
        ..., description="12-month financial projection"
    )
    repayment: Repayment | None = Field(
        None, description="Loan repayment details (if applicable)"
    )
    credit: CreditResult = Field(
        ..., description="Credit-readiness assessment"
    )
    score: ScoreResult = Field(
        ..., description="Feasibility score and verdict"
    )
    narrative: ReportNarrative = Field(
        ..., description="AI-generated narrative sections"
    )
    narrative_source: Literal["llm", "fallback"] = Field(
        "llm", description="Whether narrative was generated by LLM or fallback"
    )
    lang: Language = Field(
        ..., description="Language of the report"
    )
    warnings: list[dict] = Field(default_factory=list, description="Advisory warnings generated during pipeline execution")
    data_confidence: Literal["high", "medium", "approximate", "low"] = Field("approximate", description="Confidence in local market and template data")
    rate_source: str | None = Field(None, description="Source of the interest rate used for repayment calculation")
    fallback_options: list[str] = Field(default_factory=list, description="Alternative financial routes if schemes are not eligible")
    saved: bool = Field(True, description="Whether the report was persisted to storage")
    owner_session: str | None = Field(None, description="Session ID that owns this report")
    created_at: str | None = Field(
        None, description="ISO-8601 creation timestamp"
    )


class HealthResponse(BaseModel):
    """Health-check response."""

    status: str = Field("healthy", description="Service status")
    version: str = Field(..., description="Application version string")


class ErrorResponse(BaseModel):
    """Standard error response body."""

    detail: str = Field(..., description="Human-readable error message")
    error_code: str | None = Field(
        None, description="Machine-readable error code"
    )
