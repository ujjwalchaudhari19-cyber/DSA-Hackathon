from fastapi import APIRouter

from app.schemas.operator2 import CreditQuizAnswers, CreditReadiness
from app.services.credit_service import assess_readiness

router = APIRouter(prefix="/api/v1/credit", tags=["credit readiness"])


@router.post("/readiness")
def readiness(answers: CreditQuizAnswers) -> CreditReadiness:
    return assess_readiness(answers)
