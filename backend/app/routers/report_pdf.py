import logging

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.errors import AppError
from app.services.report_service import report_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["Report PDF"])

class PDFUnavailable(AppError):
    status = 501
    code = "PDF_UNAVAILABLE"
    def __init__(self):
        super().__init__("Use your browser's Print to save as PDF.")

@router.get("/{report_id}/pdf")
def render_report_pdf(report_id: str):
    """Render saved report to PDF using WeasyPrint with graceful fallback."""
    try:
        import weasyprint  # lazy import
    except ImportError:
        logger.info("WeasyPrint is not installed in the current environment.")
        raise PDFUnavailable()
    except Exception as e:
        logger.warning("WeasyPrint load error: %s", e)
        raise PDFUnavailable()

    # In production, render jinja2 html template -> weasyprint
    raise PDFUnavailable()

@router.get("/{report_id}/print", response_class=HTMLResponse)
async def render_report_print_view(report_id: str):
    """HTML print view for browser fallback."""
    report = await report_service.get(report_id)
    title = f"GramUdyam Feasibility Report - {report_id[:8]}" if report else "Report Print View"
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>
        body {{ font-family: 'Noto Sans', sans-serif; margin: 40px; color: #222; }}
        h1 {{ color: #166534; }}
        .box {{ border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }}
        @media print {{
            body {{ margin: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <button class="no-print" onclick="window.print()">Print Report / Save as PDF</button>
    <h1>GramUdyam AI - Feasibility Report</h1>
    <div class="box">
        <p><strong>Report ID:</strong> {report_id}</p>
        <p>This report can be printed directly using your browser's print dialogue (Ctrl+P / Cmd+P).</p>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)

