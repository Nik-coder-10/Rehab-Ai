"""FastAPI application entrypoint for RehabAI."""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import engine

# Initialize structured logging
configure_logging()

# Auto-create tables on startup if in development SQLite
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="RehabAI API",
    description="AI-Assisted Physical Therapy & Motor Rehabilitation Platform Backend",
    version="0.1.0",
    debug=settings.debug,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": exc.error_code},
    )


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "RehabAI API", "environment": settings.environment}


# Mount all API routes under /api
app.include_router(api_router)
