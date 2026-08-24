"""Doctor management API endpoints: patients, clinical plans, exercise assignments, analytics."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_doctor
from app.db.session import get_db
from app.models.doctor import DoctorProfile
from app.models.user import User
from app.schemas.doctor import (
    DoctorAnalyticsSummary,
    DoctorDashboardSummary,
    DoctorProfileRead,
    DoctorProfileUpdate,
    ExerciseCreate,
    ExerciseUpdate,
    PatientDetailRead,
    PatientListItem,
    PlanCreate,
    PlanExerciseCreate,
    PlanExerciseUpdate,
    PlanUpdate,
)
from app.schemas.patient import ExerciseRead, PlanExerciseRead, RehabilitationPlanRead
from app.services.doctor_service import (
    add_exercise_to_plan,
    create_exercise,
    create_patient_plan,
    get_doctor_analytics,
    get_doctor_dashboard,
    get_doctor_patient_detail,
    get_doctor_profile,
    list_doctor_patients,
    remove_exercise_from_plan,
    update_doctor_profile,
    update_exercise,
    update_plan,
    update_plan_exercise,
)
from app.services.patient_service import list_patient_exercises

router = APIRouter(prefix="/doctor", tags=["doctor"])


# --- Doctor Profile ---
@router.get("/profile", response_model=DoctorProfileRead)
def get_profile(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorProfileRead:
    user, profile = doctor_auth
    return get_doctor_profile(db, user, profile)


@router.put("/profile", response_model=DoctorProfileRead)
def update_profile(
    data: DoctorProfileUpdate,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorProfileRead:
    _, profile = doctor_auth
    return update_doctor_profile(db, profile, data)


# --- Doctor Dashboard & Analytics ---
@router.get("/dashboard", response_model=DoctorDashboardSummary)
def get_dashboard(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorDashboardSummary:
    _, profile = doctor_auth
    return get_doctor_dashboard(db, profile.id)


@router.get("/analytics", response_model=DoctorAnalyticsSummary)
def get_analytics(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> DoctorAnalyticsSummary:
    _, profile = doctor_auth
    return get_doctor_analytics(db, profile.id)


# --- Patient Care Management ---
@router.get("/patients", response_model=list[PatientListItem])
def get_patients(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(default=None),
) -> list[PatientListItem]:
    _, profile = doctor_auth
    return list_doctor_patients(db, profile.id, search=search)


@router.get("/patients/{patient_id}", response_model=PatientDetailRead)
def get_patient_details(
    patient_id: uuid.UUID,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientDetailRead:
    _, profile = doctor_auth
    return get_doctor_patient_detail(db, profile.id, patient_id)


# --- Rehabilitation Plan Management ---
@router.post("/patients/{patient_id}/plans", response_model=RehabilitationPlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    patient_id: uuid.UUID,
    data: PlanCreate,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> RehabilitationPlanRead:
    _, profile = doctor_auth
    return create_patient_plan(db, profile.id, patient_id, data)


@router.put("/plans/{plan_id}", response_model=RehabilitationPlanRead)
def update_plan_details(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> RehabilitationPlanRead:
    _, profile = doctor_auth
    return update_plan(db, profile.id, plan_id, data)


# --- Exercise Assignments to Plan ---
@router.post("/plans/{plan_id}/exercises", response_model=PlanExerciseRead, status_code=status.HTTP_201_CREATED)
def assign_exercise_to_plan(
    plan_id: uuid.UUID,
    data: PlanExerciseCreate,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> PlanExerciseRead:
    _, profile = doctor_auth
    return add_exercise_to_plan(db, profile.id, plan_id, data)


@router.put("/plans/{plan_id}/exercises/{plan_exercise_id}", response_model=PlanExerciseRead)
def update_assigned_exercise(
    plan_id: uuid.UUID,
    plan_exercise_id: uuid.UUID,
    data: PlanExerciseUpdate,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> PlanExerciseRead:
    _, profile = doctor_auth
    return update_plan_exercise(db, profile.id, plan_id, plan_exercise_id, data)


@router.delete("/plans/{plan_id}/exercises/{plan_exercise_id}")
def delete_assigned_exercise(
    plan_id: uuid.UUID,
    plan_exercise_id: uuid.UUID,
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    _, profile = doctor_auth
    return remove_exercise_from_plan(db, profile.id, plan_id, plan_exercise_id)


# --- Exercise Catalog Management ---
@router.get("/exercises", response_model=list[ExerciseRead])
def get_all_exercises(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[ExerciseRead]:
    user, _ = doctor_auth
    return list_patient_exercises(db, user.id)


# --- Adaptive AI Recommendations Workflow ---
@router.get("/recommendations")
def get_recommendations(
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> list[dict]:
    from app.services.recommendation_service import list_doctor_recommendations
    _, profile = doctor_auth
    recs = list_doctor_recommendations(db, profile.id)
    return [
        {
            "id": str(r.id),
            "patient_profile_id": str(r.patient_profile_id),
            "patient_name": r.patient.user.full_name if r.patient and r.patient.user else "Patient",
            "plan_id": str(r.plan_id) if r.plan_id else None,
            "exercise_name": r.exercise.name if r.exercise else "General Protocol",
            "recommendation_type": r.recommendation_type.value,
            "status": r.status.value,
            "title": r.title,
            "clinical_rationale": r.clinical_rationale,
            "patient_message": r.patient_message,
            "suggested_changes": r.suggested_changes,
            "evidence_metrics": r.evidence_metrics,
            "confidence_score": r.confidence_score,
            "doctor_decision_note": r.doctor_decision_note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recs
    ]


@router.post("/recommendations/{recommendation_id}/decision")
def submit_recommendation_decision(
    recommendation_id: uuid.UUID,
    data: dict,  # {"decision": "APPROVED" | "REJECTED", "doctor_note": str}
    doctor_auth: Annotated[tuple[User, DoctorProfile], Depends(get_current_doctor)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    from app.services.recommendation_service import apply_recommendation_decision
    _, profile = doctor_auth
    rec = apply_recommendation_decision(
        db=db,
        doctor_profile_id=profile.id,
        recommendation_id=recommendation_id,
        decision=data.get("decision", "APPROVED"),
        doctor_note=data.get("doctor_note"),
    )
    return {
        "id": str(rec.id),
        "status": rec.status.value,
        "message": f"Recommendation successfully {rec.status.value.lower()}.",
    }
