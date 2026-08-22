"""Patient dashboard, profile, active rehabilitation plan and progress endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_patient
from app.db.session import get_db
from app.models.doctor import PatientProfile
from app.models.user import User
from app.schemas.patient import (
    ExerciseRead,
    ExerciseSessionRead,
    PatientProfileRead,
    PatientProfileUpdate,
    ProgressSummaryRead,
    RehabilitationPlanRead,
)
from app.services.patient_service import (
    get_active_patient_plan,
    get_patient_profile,
    get_patient_progress_summary,
    list_patient_exercises,
    list_patient_sessions,
    update_patient_profile,
)

router = APIRouter(prefix="/patient", tags=["patient"])


@router.get("/profile", response_model=PatientProfileRead)
def get_profile(
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientProfileRead:
    user, profile = patient_auth
    return get_patient_profile(db, user, profile)


@router.put("/profile", response_model=PatientProfileRead)
def update_profile(
    data: PatientProfileUpdate,
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientProfileRead:
    _, profile = patient_auth
    return update_patient_profile(db, profile, data)


@router.get("/plan", response_model=RehabilitationPlanRead | None)
def get_current_plan(
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> RehabilitationPlanRead | None:
    _, profile = patient_auth
    return get_active_patient_plan(db, profile.id)


@router.get("/exercises", response_model=list[ExerciseRead])
def get_exercises(
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ExerciseRead]:
    _, profile = patient_auth
    return list_patient_exercises(db, profile.id)


@router.get("/sessions", response_model=list[ExerciseSessionRead])
def get_sessions(
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ExerciseSessionRead]:
    _, profile = patient_auth
    return list_patient_sessions(db, profile.id)


@router.get("/progress", response_model=ProgressSummaryRead)
def get_progress(
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> ProgressSummaryRead:
    _, profile = patient_auth
    return get_patient_progress_summary(db, profile.id)
