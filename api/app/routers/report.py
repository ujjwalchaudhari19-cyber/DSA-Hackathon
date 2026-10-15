import logging
import uuid

from fastapi import APIRouter, Header, Response

from app.errors import NotFound
from app.schemas.models import FeasibilityReport, ReportGenerateRequest
from app.security import assert_owner, session_id
from app.services.report_service import report_service
from app.utils.idempotency import Idempotency

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["Report"])

_idempotency = Idempotency(ttl=600)

@router.post("/generate", response_model=FeasibilityReport)
async def generate_report(
    request: ReportGenerateRequest,
    response: Response,
    x_session_id: str | None = Header(default=None),
    idempotency_key: str | None = Header(default=None),
):
    """Master orchestration endpoint. Coordinates Op 2 calculators + Op 1 LLM narrative."""
    sid = session_id(x_session_id) or str(uuid.uuid4())
    response.headers["x-session-id"] = sid

    async def execute():
        res = await report_service.generate(
            profile=request.profile,
            idea=request.idea,
            loan_amount=request.loan_amount,
            loan_rate=request.loan_rate,
            loan_tenure_months=request.loan_tenure_months,
            moratorium_months=request.moratorium_months,
            lang=request.lang,
            owner_session=sid
        )
        return res

    if idempotency_key:
        cache_key = f"{sid}:{idempotency_key}"
        result = await _idempotency.run(cache_key, execute)
    else:
        result = await execute()

    return result


@router.get("/{report_id}", response_model=FeasibilityReport)
async def get_report(
    report_id: str,
    x_session_id: str | None = Header(default=None),
):
    """Retrieve a previously generated report, bound to the user session."""
    result = await report_service.get(report_id)
    if not result:
        raise NotFound("Report not found")

    sid = session_id(x_session_id)
    report_owner = getattr(result, "owner_session", None)
    record = {"owner": report_owner} if report_owner else None
    assert_owner(record, sid)

    return result
