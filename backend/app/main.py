"""GramUdyam AI FastAPI Application Entry Point."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting up %s v%s...", settings.APP_NAME, settings.APP_VERSION)
    # Database initialization or pre-loading can happen here
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.errors import install as install_errors

# Install central error handlers and request ID middleware
install_errors(app)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, str]:
    """Check health and version status of the API."""
    return {"status": "healthy", "version": settings.APP_VERSION}


# Include all routers conditionally to avoid crashing if module files do not exist yet
_ROUTER_MODULES = [
    ("discovery", "discovery_router"),
    ("idea", "idea_router"),
    ("analysis", "analysis_router"),
    ("report", "report_router"),
    ("report_pdf", "report_pdf_router"),
    ("compare", "compare_router"),
    ("documents", "documents_router"),
    ("advisor", "advisor_router"),
    ("i18n", "i18n_router"),
    ("finance", "finance_router"),
    ("schemes", "schemes_router"),
    ("credit", "credit_router"),
    ("suppliers", "suppliers_router"),
]

for module_name, router_attr in _ROUTER_MODULES:
    try:
        module = __import__(f"app.routers.{module_name}", fromlist=[router_attr, "router"])
        router = getattr(module, router_attr, getattr(module, "router", None))
        if router is not None:
            app.include_router(router, prefix="/api/v1")
            logger.info("Registered router: app.routers.%s", module_name)
        else:
            logger.warning("Router attribute not found in app.routers.%s", module_name)
    except ModuleNotFoundError:
        logger.debug("Router app.routers.%s not yet implemented; skipping.", module_name)
    except Exception as e:
        logger.warning("Failed to load router app.routers.%s: %s", module_name, e)
