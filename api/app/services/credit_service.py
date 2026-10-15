from __future__ import annotations

from app.schemas.operator2 import CreditQuizAnswers, CreditReadiness, CreditResult, Profile
from app.services.data_store import load_dataset

DISCLAIMER = "Guidance only. GramUdyam does not access, change, or guarantee any credit score or loan decision."


def assess_readiness(answers: CreditQuizAnswers) -> CreditReadiness:
    if answers.missed_emis_last_12_months:
        bucket = "needs_repair"
    elif answers.first_time_borrower and not answers.has_bank_statement_history:
        bucket = "thin_file"
    elif answers.has_income_proof and answers.has_bank_statement_history and (not answers.existing_loans or answers.uses_credit_card_responsibly):
        bucket = "strong"
    else:
        bucket = "fair"

    rules = load_dataset("credit_rules.json")
    return CreditReadiness(
        bucket=bucket,
        actions_30_60_90=rules["actions"][bucket],
        what_lenders_check=rules["what_lenders_check"],
        alternative_routes=rules["alternatives"],
        disclaimer=DISCLAIMER,
    )


def readiness(profile_or_answers: Profile | CreditQuizAnswers) -> CreditResult:
    """Operator 1 interface for credit readiness assessment."""
    if isinstance(profile_or_answers, CreditQuizAnswers):
        res = assess_readiness(profile_or_answers)
    else:
        # Infer baseline quiz answers from profile attributes
        profile = profile_or_answers
        answers = CreditQuizAnswers(
            existing_loans=False,
            missed_emis_last_12_months=False,
            uses_credit_card_responsibly=False,
            first_time_borrower=profile.experience == "none",
            has_income_proof=profile.capital > 25000,
            has_bank_statement_history=profile.experience != "none",
        )
        res = assess_readiness(answers)

    return CreditResult(
        bucket=res.bucket,
        actions_30_60_90=res.actions_30_60_90,
        what_lenders_check=res.what_lenders_check,
        alternative_routes=res.alternative_routes,
        disclaimer=res.disclaimer,
    )
