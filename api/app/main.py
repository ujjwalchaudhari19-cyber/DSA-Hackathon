"""GramUdyam AI Backend Application.

Unifies Operator 1 (AI & Orchestration) and Operator 2 (Data, Finance & Infrastructure).
"""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.errors import AppError
from app.models.database import create_all, engine
from app.services.data_store import load_dataset
from app.utils.errors import CalcInputError
from app.utils.ratelimit import InMemoryRateLimiter

logger = logging.getLogger("gramudyam")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

limiter = InMemoryRateLimiter()
auth_limiter = InMemoryRateLimiter(max_requests=15, window_seconds=60)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting up %s v%s...", settings.APP_NAME, settings.APP_VERSION)
    # Initialize database schema
    create_all()
    # Preload primary datasets
    load_dataset("businesses.json")
    load_dataset("schemes.json")
    try:
        yield
    finally:
        logger.info("Shutting down %s...", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="GramUdyam AI Backend API - Rural Enterprise Intelligence Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
origins = settings.cors_origins_list or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_and_rate_limit_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id

    # Enforce max 100 KB payload size
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > 100 * 1024:
                return JSONResponse(
                    {
                        "error": {
                            "code": "PAYLOAD_TOO_LARGE",
                            "message": "Payload exceeds 100KB limit",
                            "details": {},
                            "request_id": request_id,
                        }
                    },
                    status_code=413,
                    headers={"x-request-id": request_id},
                )
        except ValueError:
            pass

    # Exempt health and docs from rate limiter
    if request.url.path in ("/api/v1/health", "/health", "/docs", "/openapi.json", "/redoc"):
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

    # Rate limiter IP extraction
    trusted_proxy_count = settings.TRUSTED_PROXY_COUNT
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if len(parts) >= trusted_proxy_count:
            client_ip = parts[-trusted_proxy_count]
        else:
            client_ip = parts[0]
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "anonymous"

    # Rate-limit key: session id header if present, else IP
    session_id = request.headers.get("x-session-id") or request.headers.get("session-id")
    if session_id and session_id.strip():
        rate_key = f"sess:{session_id.strip()}"
    else:
        rate_key = f"ip:{client_ip}"

    # Stricter rate limits on /api/v1/auth/* and /api/v1/me/claim-guest-data
    is_sensitive_auth_route = request.url.path.startswith("/api/v1/auth") or request.url.path == "/api/v1/me/claim-guest-data"
    active_limiter = auth_limiter if is_sensitive_auth_route else limiter

    if not active_limiter.allow(rate_key):
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too many requests. Please retry shortly.",
                "code": "rate_limited",
                "request_id": request_id,
                "error": {
                    "code": "RATE_LIMITED",
                    "message": "Too many requests",
                    "details": {},
                    "request_id": request_id,
                },
            },
            headers={"Retry-After": "60", "x-request-id": request_id},
        )

    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


# Exception Handlers
@app.exception_handler(CalcInputError)
async def calc_input_error_handler(request: Request, exc: CalcInputError):
    request_id = getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    return JSONResponse(
        status_code=422,
        content={
            "detail": str(exc),
            "code": "calc_input_error",
            "request_id": request_id,
        },
        headers={"x-request-id": request_id},
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    request_id = getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": request_id,
            }
        },
        headers={"x-request-id": request_id},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server exception: %s", exc)
    request_id = getattr(request.state, "request_id", None) or request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "code": "internal_error",
            "request_id": request_id,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Something went wrong. Please try again.",
                "details": {},
                "request_id": request_id,
            },
        },
        headers={"x-request-id": request_id},
    )


# Pure ASGI Middleware wrapper for request-id and boundary exception catching
class RequestIdASGIMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        req_id = None
        for k, v in scope.get("headers", []):
            if k.lower() == b"x-request-id":
                req_id = v.decode("latin1")
                break
        if not req_id:
            req_id = uuid.uuid4().hex[:12]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                has_req_id = any(h[0].lower() == b"x-request-id" for h in headers)
                if not has_req_id:
                    headers.append((b"x-request-id", req_id.encode("latin1")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception("Unhandled ASGI exception caught at boundary")
            body = json.dumps({
                "detail": "An internal server error occurred.",
                "code": "internal_error",
                "request_id": req_id,
            }).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("latin1")),
                    (b"x-request-id", req_id.encode("latin1")),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
            })


app.add_middleware(RequestIdASGIMiddleware)

# Register All Endpoints (Both Operator 1 and Operator 2)
# Operator 1 Routers (prefixed under /api/v1):
_OP1_ROUTERS = [
    ("discovery", ["router", "discovery_router"]),
    ("idea", ["router", "idea_router"]),
    ("analysis", ["router", "analysis_router"]),
    ("report", ["router", "report_router"]),
    ("compare", ["router", "compare_router"]),
    ("documents", ["router", "documents_router"]),
    ("advisor", ["router", "advisor_router"]),
    ("i18n", ["router", "i18n_router"]),
]

for module_name, router_attrs in _OP1_ROUTERS:
    try:
        module = __import__(f"app.routers.{module_name}", fromlist=router_attrs)
        router = None
        for attr in router_attrs:
            router = getattr(module, attr, None)
            if router is not None:
                break
        if router is not None:
            app.include_router(router, prefix="/api/v1")
            logger.info("Registered Op1 router: app.routers.%s", module_name)
    except Exception as e:
        logger.warning("Failed to load Op1 router app.routers.%s: %s", module_name, e)

# Operator 2 Routers (already contain /api/v1 in their intrinsic prefix):
_OP2_ROUTERS = [
    ("user", "router"),
    ("finance", "router"),
    ("schemes", "router"),
    ("credit", "router"),
    ("suppliers", "router"),
    ("catalogue", "router"),
    ("report_pdf", "router"),
]

for module_name, router_attr in _OP2_ROUTERS:
    try:
        module = __import__(f"app.routers.{module_name}", fromlist=[router_attr])
        router = getattr(module, router_attr, None)
        if router is not None:
            app.include_router(router)
            logger.info("Registered Op2 router: app.routers.%s", module_name)
    except Exception as e:
        logger.warning("Failed to load Op2 router app.routers.%s: %s", module_name, e)


# Health checks (both root /health and /api/v1/health)
@app.get("/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check():
    # Verify DB connectivity
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {exc}"

    # Verify dataset readiness
    data_status = "ok"
    try:
        load_dataset("businesses.json")
    except Exception as exc:
        data_status = f"unhealthy: {exc}"

    is_healthy = db_status == "ok" and data_status == "ok"
    status_code = 200 if is_healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if is_healthy else "degraded",
            "service": "gramudyam-backend",
            "version": settings.APP_VERSION,
            "database": db_status,
            "datasets": data_status,
        },
    )
