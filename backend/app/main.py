"""
FastAPI application factory with MongoDB lifespan management.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.mongo import close_mongo, connect_mongo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle:
    - Startup: Connect to MongoDB, create indexes, initialise per-user session store.
    - Shutdown: Close MongoDB connection.
    """
    # ── Startup ────────────────────────────────────────────────────────────────
    await connect_mongo(app)

    # Per-user in-memory session store: { user_id_str: { "profile": Profile, "preferences_text": str | None } }
    # Cleared on server restart — the MongoDB resume_cache handles persistence.
    app.state.user_sessions = {}

    logger.info("Application startup complete")
    yield

    # ── Shutdown ───────────────────────────────────────────────────────────────
    await close_mongo(app)
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="JobSense",
        description="Auth-protected, rate-limited job matching powered by Gemini AI.",
        version="2.0.0",
        lifespan=lifespan,
    )

    # CORS — origins are controlled by the CORS_ORIGINS environment variable
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global error handler for unhandled exceptions
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected internal error occurred."},
        )

    # Include routers
    from app.api.auth_routes import router as auth_router
    from app.api.routes import router as api_router

    app.include_router(auth_router)
    app.include_router(api_router)

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": "2.0.0"}

    return app


app = create_app()
