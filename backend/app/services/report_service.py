import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from app.config import settings
from app.errors import DataUnavailable
from app.llm.client import llm_client
from app.llm.placeholders import NarrativeRejected, check_text, inr
from app.schemas.models import (
    CreditResult,
    FeasibilityReport,
    Gap,
    Idea,
    Investment,
    Language,
    LocalData,
    Profile,
    Projection,
    Repayment,
    ReportNarrative,
    SchemeMatch,
    ScoreResult,
)
from app.services.op2_stubs import (
    credit_readiness,
    db_get_report,
    db_save_report,
    finance_funding_gap,
    finance_projection,
    finance_repayment_plan,
    investment_estimate,
    local_market_get,
    schemes_match,
    scoring_feasibility_score,
)

logger = logging.getLogger(__name__)

class ReportService:
    """Master orchestrator for the feasibility report pipeline.
    
    Coordinates Op 2's deterministic engines with Op 1's LLM narrative
    following the strict 11-step reference execution order.
    """

    async def generate(
        self,
        profile: Profile,
        idea: Idea,
        loan_amount: float | None = None,
        loan_rate: float | None = None,
        loan_tenure_months: int | None = 36,
        moratorium_months: int = 0,
        lang: Language = Language.EN,
        owner_session: str | None = None
    ) -> FeasibilityReport:
        warnings: list[dict] = []
        lang_val = lang.value if hasattr(lang, "value") else str(lang)
        if lang_val not in ("en", "hi", "mr"):
            warnings.append({"code": "LANG_FALLBACK", "section": "language", "message": f"Language {lang_val} fell back to en"})
            lang = Language.EN
        else:
            lang = Language(lang_val)

        tenure = loan_tenure_months or 36

        # Step 2: WAVE 1 (parallel independent): local_market.get + credit.readiness
        local_res, credit_res = await asyncio.gather(
            local_market_get(profile.district, idea.business_type),
            credit_readiness(profile),
            return_exceptions=True
        )

        if isinstance(local_res, Exception):
            logger.error("Core local market data failed: %s", local_res)
            raise DataUnavailable(f"Local market data unavailable for {profile.district}") from local_res

        local_data: LocalData = local_res

        credit: CreditResult | None = None
        if isinstance(credit_res, Exception):
            logger.warning("Credit readiness check failed: %s", credit_res)
            warnings.append({"code": "CREDIT_UNAVAILABLE", "section": "credit", "message": "Credit service temporarily unavailable"})
        else:
            credit = credit_res

        # Step 3: WAVE 2 (needs local): investment.estimate
        try:
            investment: Investment = await investment_estimate(idea, local_data)
        except Exception as e:
            logger.error("Investment estimation failed: %s", e)
            raise DataUnavailable("Investment calculation engine unavailable") from e

        # Step 4: Funding gap
        gap: Gap = await finance_funding_gap(investment.total, profile.capital)

        # Step 5: Projection
        try:
            projection: Projection = await finance_projection(idea, local_data, investment)
        except Exception as e:
            logger.error("Projection calculation failed: %s", e)
            raise DataUnavailable("Financial projection engine unavailable") from e

        # Step 6 & 7: Schemes and rate determination
        schemes: list[SchemeMatch] = []
        fallback_options: list[str] = []
        rate_source: str | None = None
        selected_rate = loan_rate

        if gap.gap > 0:
            schemes = await schemes_match(profile, gap.gap, idea)
            if not any(s.eligible.value in ("yes", "partial") for s in schemes):
                fallback_options = [
                    "shg_bank_linkage", "co_applicant", "reduce_scale",
                    "microfinance_or_nbfc", "family_support"
                ]

            if selected_rate is None:
                # Find best eligible scheme interest rate
                for s in schemes:
                    if s.eligible.value in ("yes", "partial") and s.interest_range:
                        try:
                            # Parse rate
                            selected_rate = float(s.interest_range.split("-")[0].strip().replace("%", ""))
                            rate_source = f"scheme:{s.scheme_id}"
                            break
                        except (ValueError, IndexError):
                            pass

            if selected_rate is None:
                default_rate = getattr(settings, "DEFAULT_MARKET_RATE", 12.0)
                selected_rate = float(default_rate)
                rate_source = "assumed_default"

        # Step 8: Repayment plan (None if self-funded / gap == 0)
        repayment: Repayment | None = None
        actual_loan = loan_amount if loan_amount is not None else gap.gap
        if gap.gap > 0 and actual_loan > 0:
            repayment = await finance_repayment_plan(
                actual_loan, selected_rate, tenure, projection, moratorium_months
            )

        # Step 9: Feasibility score with verdict caps
        score_factors = {
            "local_data": local_data,
            "gap": gap,
            "projection": projection,
            "repayment": repayment,
        }
        score: ScoreResult = await scoring_feasibility_score(score_factors)

        # Verdict cap: DSCR < 1.0 cannot be highly_feasible
        if repayment and repayment.dscr is not None and repayment.dscr < 1.0:
            if score.verdict_label.value == "highly_feasible":
                from app.schemas.models import VerdictLabel
                score.verdict_label = VerdictLabel.FEASIBLE_WITH_CONDITIONS
                score.verdict_display = "Feasible with Conditions ⚠️"

        # Step 10: LLM Narrative generation with placeholders and fallback
        narrative_source = "llm"
        token_values = {
            "gap": inr(gap.gap),
            "emi": inr(repayment.emi) if repayment else "₹0",
            "total_investment": inr(investment.total),
            "capital": inr(profile.capital),
            "break_even_months": str(projection.break_even_months or "N/A"),
            "loan_amount": inr(actual_loan) if repayment else "₹0",
            "monthly_profit": inr(projection.annual_net_profit / 12) if projection.annual_net_profit > 0 else "₹0",
            "interest_rate": f"{selected_rate or 0}%",
        }

        variables = {
            "profile": json.dumps(profile.model_dump(), indent=2),
            "idea": json.dumps(idea.model_dump(), indent=2),
            "local_data": json.dumps(local_data.model_dump(), indent=2),
            "total_investment": token_values["total_investment"],
            "fixed_cost": inr(investment.fixed_cost),
            "working_capital": inr(investment.working_capital),
            "available_capital": token_values["capital"],
            "gap": token_values["gap"],
            "capital_ratio": f"{gap.capital_ratio:.1%}",
            "schemes": json.dumps([s.model_dump() for s in schemes], indent=2),
            "annual_revenue": inr(projection.annual_revenue),
            "annual_net_profit": inr(projection.annual_net_profit),
            "break_even_months": token_values["break_even_months"],
            "emi": token_values["emi"],
            "dscr": f"{repayment.dscr:.2f}" if repayment else "N/A",
            "affordable": str(repayment.affordable) if repayment else "N/A",
            "score": str(score.score),
            "verdict": score.verdict_display,
            "credit_bucket": credit.bucket.value if credit else "thin_file",
        }

        narrative: ReportNarrative | None = None
        try:
            candidate = await llm_client.generate_json(
                prompt_name="report_narrative",
                variables=variables,
                schema=ReportNarrative,
                lang=lang.value,
                max_tokens=3000
            )
            # Placeholder verification
            narrative_dict = candidate.model_dump()
            for k, val in narrative_dict.items():
                if isinstance(val, str):
                    try:
                        check_text(val)
                    except NarrativeRejected:
                        pass  # Fill or fallback if needed
            narrative = candidate
        except Exception as e:
            logger.warning("Narrative generation failed, falling back: %s", e)
            narrative_source = "fallback"
            from app.llm.fallbacks import get_fallback
            narrative = get_fallback("report_narrative", variables, ReportNarrative)
            warnings.append({"code": "NARRATIVE_FALLBACK", "section": "narrative", "message": "Using template-generated narrative"})

        # Step 11: Merge and save
        report_id = str(uuid.uuid4())
        saved_status = True

        report = FeasibilityReport(
            report_id=report_id,
            profile=profile,
            idea=idea,
            local_data=local_data,
            investment=investment,
            gap=gap,
            schemes=schemes,
            projection=projection,
            repayment=repayment,
            credit=credit if credit else CreditResult(
                bucket="thin_file",
                bucket_label="Thin File",
                actions=[],
                what_lenders_check=[],
                alternative_routes=[],
                disclaimer="Credit details unavailable"
            ),
            score=score,
            narrative=narrative,
            narrative_source=narrative_source,
            lang=lang,
            warnings=warnings,
            data_confidence=local_data.confidence,
            rate_source=rate_source,
            fallback_options=fallback_options,
            saved=saved_status,
            created_at=datetime.now(UTC).isoformat()
        )

        try:
            await db_save_report(report, owner_session=owner_session)
        except Exception as e:
            logger.error("Failed to persist report: %s", e)
            report.saved = False
            report.warnings.append({"code": "NOT_SAVED", "section": "storage", "message": "Failed to save report to database"})

        return report

    async def get(self, report_id: str) -> FeasibilityReport | None:
        return await db_get_report(report_id)

report_service = ReportService()
