"""Exercise catalogue and session execution endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_patient, get_current_user
from app.db.session import get_db
from app.models.doctor import PatientProfile
from app.models.user import User
from app.schemas.patient import (
    ExerciseMetricRead,
    ExerciseRead,
    ExerciseSessionCreate,
    ExerciseSessionRead,
    ExerciseSessionUpdate,
)
from app.services.patient_service import (
    create_patient_session,
    get_exercise_by_id,
    get_session_detail,
    list_patient_exercises,
    update_patient_session,
)

router = APIRouter(tags=["exercises & sessions"])


@router.get("/exercises", response_model=list[ExerciseRead])
def get_exercises(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ExerciseRead]:
    return list_patient_exercises(db, current_user.id)


@router.get("/exercises/{exercise_id}", response_model=ExerciseRead)
def get_exercise(
    exercise_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ExerciseRead:
    ex = get_exercise_by_id(db, exercise_id)
    return ExerciseRead.model_validate(ex)


@router.post("/sessions", response_model=ExerciseSessionRead, status_code=status.HTTP_201_CREATED)
def start_session(
    data: ExerciseSessionCreate,
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> ExerciseSessionRead:
    _, profile = patient_auth
    session = create_patient_session(db, profile.id, data)
    return ExerciseSessionRead(
        id=session.id,
        patient_profile_id=session.patient_profile_id,
        exercise_id=session.exercise_id,
        plan_exercise_id=session.plan_exercise_id,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        created_at=session.created_at,
        exercise=ExerciseRead.model_validate(session.exercise) if session.exercise else None,
    )


@router.get("/sessions/{session_id}")
def get_session(
    session_id: uuid.UUID,
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    _, profile = patient_auth
    session = get_session_detail(db, profile.id, session_id)
    metrics_read = [
        ExerciseMetricRead(
            id=m.id,
            rep_index=m.rep_index,
            performed_at=m.performed_at,
            rom_min_deg=m.rom_min_deg,
            rom_max_deg=m.rom_max_deg,
            form_score=m.form_score,
            form_issues=m.form_issues,
            valid=m.valid,
        )
        for m in session.metrics
    ]
    avg_score = (
        sum(m.form_score for m in session.metrics if m.form_score is not None) / len(session.metrics)
        if session.metrics
        else None
    )
    max_rom = (
        max((m.rom_max_deg for m in session.metrics if m.rom_max_deg is not None), default=None)
        if session.metrics
        else None
    )

    return {
        "id": str(session.id),
        "patient_profile_id": str(session.patient_profile_id),
        "exercise_id": str(session.exercise_id),
        "plan_exercise_id": str(session.plan_exercise_id) if session.plan_exercise_id else None,
        "status": session.status.value,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "exercise": ExerciseRead.model_validate(session.exercise).model_dump() if session.exercise else None,
        "metrics": [m.model_dump() for m in metrics_read],
        "metrics_count": len(metrics_read),
        "average_form_score": round(avg_score, 1) if avg_score else None,
        "max_rom": round(max_rom, 1) if max_rom else None,
    }


@router.patch("/sessions/{session_id}", response_model=ExerciseSessionRead)
def finish_session(
    session_id: uuid.UUID,
    data: ExerciseSessionUpdate,
    patient_auth: Annotated[tuple[User, PatientProfile], Depends(get_current_patient)],
    db: Annotated[Session, Depends(get_db)],
) -> ExerciseSessionRead:
    _, profile = patient_auth
    session = update_patient_session(db, profile.id, session_id, data)
    return ExerciseSessionRead(
        id=session.id,
        patient_profile_id=session.patient_profile_id,
        exercise_id=session.exercise_id,
        plan_exercise_id=session.plan_exercise_id,
        status=session.status,
        started_at=session.started_at,
        ended_at=session.ended_at,
        created_at=session.created_at,
        exercise=ExerciseRead.model_validate(session.exercise) if session.exercise else None,
    )
