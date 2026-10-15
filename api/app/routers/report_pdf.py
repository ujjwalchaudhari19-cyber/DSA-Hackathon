from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path
from fastapi.responses import Response

from app.models.database import get_report
from app.services.pdf_service import PdfRenderingUnavailable, render_report_pdf
from app.utils.auth import get_current_user
from app.models.database import User

router = APIRouter(prefix="/api/v1/report", tags=["report export"])


@router.get("/{report_id}/pdf")
def report_pdf(
    report_id: Annotated[str, Path(min_length=1)],
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    # If authorization header is present, enforce ownership
    user_id = None
    if authorization:
        # Resolve user
        try:
            from app.models.database import Session, engine
            with Session(engine) as session:
                user = get_current_user(authorization=authorization, db=session)
                user_id = user.id
        except Exception as exc:
            # Re-raise auth HTTPException
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(status_code=401, detail="Invalid authorization token")

    report = get_report(report_id, user_id=user_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    try:
        content = render_report_pdf(report)
    except PdfRenderingUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="gramudyam-report-{report_id}.pdf"'},
    )
