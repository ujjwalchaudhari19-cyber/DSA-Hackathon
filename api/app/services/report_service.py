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
    documents_base_lists,
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

        # Step 6 & 7: Schemes and rate/tenure determination
        schemes: list[SchemeMatch] = []
        fallback_options: list[str] = []
        rate_source: str | None = None
        selected_rate = loan_rate
        selected_tenure = max(12, loan_tenure_months or 36)  # minimum 12, from caller
        selected_scheme_id: str | None = None

        if gap.gap > 0:
            schemes = await schemes_match(profile, gap.gap, idea)
            if not any(s.eligible.value in ("yes", "partial") for s in schemes):
                fallback_options = [
                    "shg_bank_linkage", "co_applicant", "reduce_scale",
                    "microfinance_or_nbfc", "family_support"
                ]

            if selected_rate is None or loan_tenure_months is None:
                # Pick rate AND tenure from the best eligible scheme
                for s in schemes:
                    if s.eligible.value in ("yes", "partial"):
                        rate_from_scheme = getattr(s, "interest_rate_pct", None)
                        tenure_from_scheme = getattr(s, "typical_tenure_months", None)
                        if selected_rate is None and rate_from_scheme:
                            selected_rate = float(rate_from_scheme)
                            rate_source = f"scheme:{s.scheme_id}"
                            selected_scheme_id = s.scheme_id
                        if loan_tenure_months is None and tenure_from_scheme:
                            selected_tenure = max(12, int(tenure_from_scheme))
                        if selected_rate is not None:
                            break

            if selected_rate is None:
                default_rate = getattr(settings, "DEFAULT_MARKET_RATE", 12.0)
                selected_rate = float(default_rate)
                rate_source = "assumed_default"
        tenure = selected_tenure

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

        # Step 10: LLM Narrative generation — filler-reject + 1 retry, then fallback
        narrative_source = "llm"

        # Plausibility warnings → plain-language text for the prompt
        plaw = score.plausibility_warnings if hasattr(score, "plausibility_warnings") else []
        warnings_text = "; ".join(plaw) if plaw else "none"

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
            "business_type": idea.business_type,
            "district": profile.district,
            "lang": lang.value,
            "data_confidence": local_data.confidence,
            "warnings_text": warnings_text,
            "loan_amount": token_values["loan_amount"],
            "interest_rate": token_values["interest_rate"],
            "document_checklist": json.dumps(
                (await documents_base_lists(idea.business_type)).model_dump(), indent=2
            ),
        }

        # Filler phrases that must not appear in any section
        FILLER_PHRASES = [
            "has been completed",
            "please review",
            "review the detailed",
            "as mentioned above",
        ]
        MIN_SECTION_LEN = 40

        def _has_filler(narrative: ReportNarrative) -> list[str]:
            """Return list of fields containing filler or below minimum length."""
            problems = []
            minimum_length_fields = [
                "verdict_summary", "market_summary", "investment_summary",
                "funding_summary", "repayment_summary", "break_even_summary",
                "risk_summary", "disclaimer",
            ]
            nd = narrative.model_dump()
            for field in minimum_length_fields:
                val = nd.get(field, "") or ""
                if len(val) < MIN_SECTION_LEN:
                    problems.append(f"{field}: too short ({len(val)} chars)")
            for scheme_id, explanation in nd.get("scheme_explanations", {}).items():
                if len(explanation or "") < MIN_SECTION_LEN:
                    problems.append(f"scheme_explanations.{scheme_id}: too short")

            def strings(value, path=""):
                if isinstance(value, str):
                    yield path, value
                elif isinstance(value, dict):
                    for key, item in value.items():
                        yield from strings(item, f"{path}.{key}" if path else str(key))
                elif isinstance(value, list):
                    for index, item in enumerate(value):
                        yield from strings(item, f"{path}[{index}]")

            for path, value in strings(nd):
                for phrase in FILLER_PHRASES:
                    if phrase.lower() in value.lower():
                        problems.append(f"{path}: contains filler '{phrase}'")
            return problems

        narrative: ReportNarrative | None = None
        try:
            candidate, candidate_source = await llm_client.generate_json_with_source(
                prompt_name="report_narrative",
                variables=variables,
                schema=ReportNarrative,
                lang=lang.value,
                max_tokens=4000,
            )
            if candidate_source == "fallback":
                narrative = candidate
                narrative_source = "fallback"
                warnings.append({
                    "code": "NARRATIVE_FALLBACK",
                    "section": "narrative",
                    "message": "LLM unavailable or invalid output; using template-generated narrative.",
                })
            filler_problems = _has_filler(candidate) if candidate_source == "llm" else []
            if filler_problems:
                logger.warning(
                    "Narrative filler/short sections on first attempt: %s — retrying once",
                    filler_problems,
                )
                # Reject-and-retry once with explicit complaint
                extra_instruction = (
                    f"\n\nYour previous output had these quality problems: {filler_problems}. "
                    "Fix them: every section must be 2-4 specific sentences citing real numbers. "
                    "No filler. Return ONLY valid JSON."
                )
                candidate2, candidate2_source = await llm_client.generate_json_with_source(
                    prompt_name="report_narrative",
                    variables={**variables, "retry_hint": extra_instruction},
                    schema=ReportNarrative,
                    lang=lang.value,
                    max_tokens=4000,
                )
                filler_problems2 = _has_filler(candidate2) if candidate2_source == "llm" else ["LLM returned fallback"]
                if filler_problems2:
                    logger.warning(
                        "Narrative still has problems after retry: %s — using fallback",
                        filler_problems2,
                    )
                    raise ValueError(f"Narrative quality unacceptable after retry: {filler_problems2}")
                narrative = candidate2
                logger.info("Narrative accepted after 1 retry")
            elif narrative is None:
                narrative = candidate
        except Exception as e:
            logger.warning("Narrative generation failed, using fallback: %s", e)
            narrative_source = "fallback"
            from app.llm.fallbacks import get_fallback
            narrative = get_fallback("report_narrative", variables, ReportNarrative)
            warnings.append({
                "code": "NARRATIVE_FALLBACK",
                "section": "narrative",
                "message": f"Using template-generated narrative: {type(e).__name__}: {e}",
            })

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
