import uuid

from fastapi import Header
from fastapi.responses import StreamingResponse


def session_id(x_session_id: str | None = Header(default=None)) -> str | None:
    """Return a normalised session UUID, or None if the header is missing or not a valid UUID."""
    if not x_session_id:
        return None
    try:
        return str(uuid.UUID(x_session_id))
    except Exception:
        return None

def assert_owner(record: dict | None, sid: str | None):
    """Raise NotFound for BOTH missing and not-owned records, so ids cannot be probed."""
    from app.errors import NotFound
    if not record or sid is None or record.get("owner") != sid:
        raise NotFound("not found")

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive"
}

def sse_response(generator):
    return StreamingResponse(generator, media_type="text/event-stream", headers=SSE_HEADERS)

