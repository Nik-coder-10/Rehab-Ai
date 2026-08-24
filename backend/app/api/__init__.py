"""Root API router assembling auth, patient, doctor, exercise and session endpoints."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.doctor import router as doctor_router
from app.api.patient import router as patient_router
from app.api.sessions import router as session_router
from app.api.v1.endpoints.ws_session import ws_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(patient_router)
api_router.include_router(doctor_router)
api_router.include_router(session_router)
api_router.include_router(ws_router)
