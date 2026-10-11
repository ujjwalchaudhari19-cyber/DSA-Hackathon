import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("app")

class AppError(Exception):
    status = 400
    code = "BAD_REQUEST"
    def __init__(self, message="", *, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class ValidationFailed(AppError):
    status, code = 422, "VALIDATION_FAILED"

class NotFound(AppError):
    status, code = 404, "NOT_FOUND"

class DataUnavailable(AppError):
    status, code = 503, "DATA_UNAVAILABLE"

class LLMUnavailable(AppError):
    status, code = 503, "LLM_UNAVAILABLE"

class LLMOutputInvalid(AppError):
    status, code = 502, "LLM_OUTPUT_INVALID"

class RateLimited(AppError):
    status, code = 429, "RATE_LIMITED"

class UnsupportedBusiness(AppError):
    status, code = 422, "UNSUPPORTED_BUSINESS"

class PayloadTooLarge(AppError):
    status, code = 413, "PAYLOAD_TOO_LARGE"

def _rid(request: Request) -> str:
    # Unhandled exceptions are handled outside the middleware, so request.state may be empty.
    rid = getattr(request.state, "request_id", None)
    if not rid:
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        try:
            request.state.request_id = rid
        except Exception:
            pass
    return rid

def _body(request: Request, code: str, message: str, details=None) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "request_id": _rid(request)
        }
    }

def install(app: FastAPI):
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        # Enforce max 100 KB payload size
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > 100 * 1024:
                    return JSONResponse(
                        _body(request, "PAYLOAD_TOO_LARGE", "Payload exceeds 100KB limit"),
                        status_code=413
                    )
            except ValueError:
                pass

        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request.state.request_id = rid
        resp = await call_next(request)
        resp.headers["x-request-id"] = rid
        return resp

    @app.exception_handler(AppError)
    async def app_error(request: Request, exc: AppError):
        return JSONResponse(_body(request, exc.code, exc.message, exc.details), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def val_error(request: Request, exc: RequestValidationError):
        fields = [{"field": ".".join(map(str, e["loc"][1:])), "msg": e["msg"]} for e in exc.errors()]
        return JSONResponse(_body(request, "VALIDATION_FAILED", "Invalid input", {"fields": fields}), status_code=422)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        rid = _rid(request)
        log.exception("unhandled request_id=%s", rid)
        return JSONResponse(
            _body(request, "INTERNAL_ERROR", "Something went wrong. Please try again."),
            status_code=500,
            headers={"x-request-id": rid}
        )

