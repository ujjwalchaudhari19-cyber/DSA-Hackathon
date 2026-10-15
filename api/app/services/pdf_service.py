"""Render a saved, schema-validated report payload to a printable PDF using Jinja2 and WeasyPrint."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=True)


class PdfRenderingUnavailable(RuntimeError):
    """Raised when the hosting OS lacks WeasyPrint's required native libraries."""


def render_report_pdf(report: dict[str, Any]) -> bytes:
    """Return PDF bytes. Operator 1 supplies only the already-validated report payload."""
    title = report.get("title", "GramUdyam AI Feasibility Report")
    sections = report.get("sections", [])
    kpis = report.get("kpis", [])
    generated_at = report.get("generated_at", datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC"))

    template = jinja_env.get_template("report.html")
    html_content = template.render(
        title=title,
        sections=sections,
        kpis=kpis,
        generated_at=generated_at,
    )

    try:
        # Delayed import keeps all non-PDF API endpoints usable on developer
        # machines that do not have the GTK/Pango libraries installed.
        from weasyprint import HTML
        return HTML(string=html_content).write_pdf()
    except (ImportError, OSError) as exc:
        raise PdfRenderingUnavailable(
            "PDF rendering is unavailable on this host. Install WeasyPrint's GTK/Pango "
            "runtime and Noto Sans Devanagari fonts in the deployment image."
        ) from exc
