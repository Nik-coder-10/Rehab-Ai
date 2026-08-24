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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    return response


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
