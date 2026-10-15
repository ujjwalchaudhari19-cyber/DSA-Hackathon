"""Shared, deterministic API contracts owned by Backend Operator 2."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, PositiveFloat, field_validator


class Scale(str, Enum):
    small = "small"
    medium = "medium"
    large = "large"


class Language(str, Enum):
    en = "en"
    hi = "hi"
    mr = "mr"


class Profile(BaseModel):
    state: str = Field(min_length=2, max_length=80)
    district: str = Field(min_length=2, max_length=80)
    village: str | None = Field(default=None, max_length=100)
    capital: float = Field(ge=0, le=10_000_000)
    category: Literal["general", "obc", "sc", "st"] = "general"
    gender: Literal["f", "m", "o"]
    age: int = Field(ge=18, le=70)
    experience: Literal["none", "some", "experienced"] = "none"
    location_type: Literal["rural", "urban", "semi_urban"] = "rural"
    collateral_available: bool = False


class Idea(BaseModel):
    business_id: str = Field(min_length=2, max_length=80)
    scale: Scale = Scale.small
    target_customer: str | None = Field(default=None, max_length=200)


class QuantityOverride(BaseModel):
    item_key: str = Field(min_length=1, max_length=80)
    quantity: float = Field(ge=0, le=10_000, allow_inf_nan=False)


class InvestmentRequest(BaseModel):
    idea: Idea
    district: str = Field(min_length=2, max_length=80)
    quantity_overrides: list[QuantityOverride] = Field(default_factory=list, max_length=30)


class InvestmentItem(BaseModel):
    key: str
    item: str
    quantity: float
    unit: str
    unit_cost: float
    line_total: float
    category: Literal["fixed", "working_capital", "contingency"]


class Investment(BaseModel):
    business_id: str
    scale: Scale
    items: list[InvestmentItem]
    fixed_cost: float
    working_capital: float
    contingency: float
    total_investment: float
    local_price_factor: float
    warnings: list[str] = Field(default_factory=list)



class GapRequest(BaseModel):
    total_investment: PositiveFloat = Field(le=100_000_000, allow_inf_nan=False)
    capital: float = Field(ge=0, le=100_000_000, allow_inf_nan=False)


class FundingGap(BaseModel):
    funding_gap: float
    capital_ratio: float
    self_funded: bool


class ProjectionRequest(BaseModel):
    idea: Idea
    district: str = Field(min_length=2, max_length=80)
    investment: Investment


class ProjectionMonth(BaseModel):
    month: int = Field(ge=1, le=12)
    revenue: float
    variable_cost: float
    fixed_opex: float
    net_profit: float


class ProjectionScenario(BaseModel):
    name: Literal["base", "pessimistic", "optimistic"]
    monthly: list[ProjectionMonth]
    annual_net_profit: float
    break_even_months: int | None


class Projection(BaseModel):
    base: ProjectionScenario
    pessimistic: ProjectionScenario
    optimistic: ProjectionScenario


class EmiRequest(BaseModel):
    principal: PositiveFloat = Field(allow_inf_nan=False)
    annual_rate_pct: float = Field(ge=0, le=40, allow_inf_nan=False)
    tenure_months: int = Field(ge=6, le=120)
    moratorium_months: int = Field(default=0, ge=0, le=24)
    annual_net_profit: float = Field(allow_inf_nan=False)
    annual_depreciation: float = Field(default=0, ge=0, allow_inf_nan=False)

    @field_validator("principal")
    @classmethod
    def validate_max_principal(cls, value: float):
        import os
        from app.services.data_store import load_dataset
        fallback = float(os.getenv("MAX_LOAN_AMOUNT", "50000000"))
        try:
            schemes = load_dataset("schemes.json").get("schemes", [])
            max_scheme = max((s.get("max_gap", 0) for s in schemes), default=0)
            max_allowed = float(max(max_scheme, fallback))
        except Exception:
            max_allowed = fallback
        if value > max_allowed:
            raise ValueError(f"Principal ₹{value:,.0f} exceeds maximum scheme ceiling of ₹{max_allowed:,.0f}")
        return value

    @field_validator("moratorium_months")
    @classmethod
    def moratorium_must_fit_term(cls, value: int, info):
        if "tenure_months" in info.data and value >= info.data["tenure_months"]:
            raise ValueError("moratorium_months must be shorter than tenure_months")
        return value


class AmortisationRow(BaseModel):
    month: int
    payment: float
    principal_paid: float
    interest_paid: float
    balance: float
    phase: Literal["moratorium", "repayment"]


class Repayment(BaseModel):
    emi: float
    total_interest: float
    total_payment: float
    annual_debt_service: float
    dscr: float | None
    affordable: bool
    affordable_pessimistic: bool = False
    schedule: list[AmortisationRow]


class SchemeMatchRequest(BaseModel):
    profile: Profile
    idea: Idea
    funding_gap: float = Field(ge=0)


class SchemeMatch(BaseModel):
    scheme_id: str
    name: str
    eligibility: Literal["yes", "maybe", "no"]
    reasons: list[str]
    missing_info: list[str]
    benefits: str
    interest_note: str
    collateral_note: str
    source_url: str


class SchemeMatchResponse(BaseModel):
    matches: list[SchemeMatch]
    fallback_options: list[str]


class CreditQuizAnswers(BaseModel):
    existing_loans: bool
    missed_emis_last_12_months: bool
    uses_credit_card_responsibly: bool
    first_time_borrower: bool
    has_income_proof: bool
    has_bank_statement_history: bool


class CreditReadiness(BaseModel):
    bucket: Literal["strong", "fair", "thin_file", "needs_repair"]
    actions_30_60_90: list[str]
    what_lenders_check: list[str]
    alternative_routes: list[str]
    disclaimer: str


class Supplier(BaseModel):
    id: str
    name: str
    category: str
    products: list[str]
    district: str
    contact: str
    price_band: Literal["budget", "mid", "premium"]
    moq: int = Field(ge=1)
    distance_km: float = Field(ge=0)
    is_demo: bool = True


class SupplierLeadRequest(BaseModel):
    requester_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20, pattern=r"^[0-9+() -]+$")
    message: str = Field(min_length=5, max_length=500)


class SupplierLeadResponse(BaseModel):
    lead_id: int | str
    status: Literal["saved"]



class ScoreInput(BaseModel):
    market_score: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    capital_ratio: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    dscr: float | None = Field(default=None, allow_inf_nan=False)
    break_even_months: int | None = Field(default=None)
    risk_severity: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    base_annual_net_profit: float | None = Field(default=None, allow_inf_nan=False)
    pessimistic_annual_net_profit: float | None = Field(default=None, allow_inf_nan=False)


class ScoreResult(BaseModel):
    score: float
    verdict_label: Literal[
        "highly_feasible", "feasible_with_conditions", "risky", "not_recommended"
    ]
    factor_scores: dict[str, float]
    factors_missing: list[str] = Field(default_factory=list)



class DiscoveryAnswers(BaseModel):
    interests: list[str] = Field(default_factory=list)
    budget_range: list[float] | tuple[float, float] = Field(default=(50_000, 500_000))
    space: str | None = None
    skills: list[str] = Field(default_factory=list)
    time: Literal["full", "part", "any"] = "any"
    location_type: Literal["rural", "urban", "semi_urban", "any"] = "any"


class Business(BaseModel):
    id: str
    name: str
    sector: str
    min_investment: float
    max_investment: float
    space_needed: str
    skills: list[str]
    time: str
    required_docs_key: str


class LocalData(BaseModel):
    district: str
    price_factor: float | None = 1.0
    market_score: float

    risk_severity: float
    confidence: Literal["high", "medium", "approximate"]
    demand_level: str
    competitor_count: int
    competitor_density: str
    avg_selling_price: float
    seasonal_notes: str
    input_availability: str
    population_band: str | None = None
    nearest_market: str | None = None
    distance_km: float | None = None

    def __getitem__(self, key: str):
        return getattr(self, key)

    def get(self, key: str, default=None):
        return getattr(self, key, default)



class DocItem(BaseModel):
    name: str
    why: str
    where: str
    approx_time: str
    approx_cost: str


class DocLists(BaseModel):
    registration: list[DocItem]
    loan: list[DocItem]


class CreditResult(CreditReadiness):
    pass

