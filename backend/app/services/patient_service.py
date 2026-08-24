"""Patient dashboard, profile, plans, exercises and progress business logic."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError
from app.models.doctor import DoctorProfile, PatientProfile
from app.models.exercise import Exercise
from app.models.plan import PlanExercise, PlanStatus, RehabilitationPlan
from app.models.session import ExerciseMetric, ExerciseSession, ProgressRecord, SessionStatus
from app.models.user import User
from app.schemas.patient import (
    DoctorSummary,
    ExerciseRead,
    ExerciseSessionCreate,
    ExerciseSessionRead,
    ExerciseSessionUpdate,
    PatientProfileRead,
    PatientProfileUpdate,
    PlanExerciseRead,
    ProgressSummaryRead,
    RehabilitationPlanRead,
)

logger = logging.getLogger(__name__)


def get_patient_profile(db: Session, user: User, profile: PatientProfile) -> PatientProfileRead:
    # Fetch linked doctors
    doctors_summary: list[DoctorSummary] = []
    for doc_profile in profile.doctors:
        doc_user = doc_profile.user
        doctors_summary.append(
            DoctorSummary(
                id=doc_profile.id,
                full_name=doc_user.full_name if doc_user else "Assigned Physiotherapist",
                email=doc_user.email if doc_user else "",
                specialization=doc_profile.specialization,
                organization=doc_profile.organization,
                license_number=doc_profile.license_number,
            )
        )

    return PatientProfileRead(
        id=profile.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        date_of_birth=profile.date_of_birth,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        medical_conditions=profile.medical_conditions,
        notes=profile.notes,
        created_at=profile.created_at,
        assigned_doctors=doctors_summary,
    )


def update_patient_profile(
    db: Session, profile: PatientProfile, data: PatientProfileUpdate
) -> PatientProfileRead:
    if data.date_of_birth is not None:
        profile.date_of_birth = data.date_of_birth
    if data.height_cm is not None:
        profile.height_cm = data.height_cm
    if data.weight_kg is not None:
        profile.weight_kg = data.weight_kg
    if data.medical_conditions is not None:
        profile.medical_conditions = data.medical_conditions
    if data.notes is not None:
        profile.notes = data.notes

    db.commit()
    db.refresh(profile)
    return get_patient_profile(db, profile.user, profile)


def get_active_patient_plan(db: Session, patient_profile_id: uuid.UUID) -> RehabilitationPlanRead | None:
    plan = db.scalar(
        select(RehabilitationPlan)
        .where(
            RehabilitationPlan.patient_profile_id == patient_profile_id,
            RehabilitationPlan.status == PlanStatus.active,
        )
        .options(
            joinedload(RehabilitationPlan.doctor).joinedload(DoctorProfile.user),
            joinedload(RehabilitationPlan.plan_exercises).joinedload(PlanExercise.exercise),
        )
        .order_by(desc(RehabilitationPlan.created_at))
    )

    if not plan:
        return None

    doctor_summary = None
    if plan.doctor and plan.doctor.user:
        doctor_summary = DoctorSummary(
            id=plan.doctor.id,
            full_name=plan.doctor.user.full_name,
            email=plan.doctor.user.email,
            specialization=plan.doctor.specialization,
            organization=plan.doctor.organization,
            license_number=plan.doctor.license_number,
        )

    plan_exercises_read = [
        PlanExerciseRead(
            id=pe.id,
            plan_id=pe.plan_id,
            exercise_id=pe.exercise_id,
            order_index=pe.order_index,
            target_sets=pe.target_sets,
            target_reps=pe.target_reps,
            target_rom_degrees=pe.target_rom_degrees,
            frequency_per_week=pe.frequency_per_week,
            instructions_override=pe.instructions_override,
            exercise=ExerciseRead.model_validate(pe.exercise),
        )
        for pe in plan.plan_exercises
        if pe.is_active and pe.exercise.is_active
    ]

    return RehabilitationPlanRead(
        id=plan.id,
        title=plan.title,
        description=plan.description,
        status=plan.status,
        start_date=plan.start_date,
        end_date=plan.end_date,
        doctor=doctor_summary,
        exercises=plan_exercises_read,
    )


def list_patient_exercises(db: Session, patient_profile_id: uuid.UUID) -> list[ExerciseRead]:
    """Return catalogue of active exercises."""
    exercises = db.scalars(
        select(Exercise).where(Exercise.is_active.is_(True)).order_by(Exercise.name)
    ).all()
    return [ExerciseRead.model_validate(ex) for ex in exercises]


def get_exercise_by_id(db: Session, exercise_id: uuid.UUID) -> Exercise:
    ex = db.get(Exercise, exercise_id)
    if not ex or not ex.is_active:
        raise NotFoundError("Exercise not found.")
    return ex


def create_patient_session(
    db: Session, patient_profile_id: uuid.UUID, data: ExerciseSessionCreate
) -> ExerciseSession:
    exercise = get_exercise_by_id(db, data.exercise_id)
    session = ExerciseSession(
        patient_profile_id=patient_profile_id,
        exercise_id=exercise.id,
        plan_exercise_id=data.plan_exercise_id,
        status=SessionStatus.in_progress,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_patient_session(
    db: Session, patient_profile_id: uuid.UUID, session_id: uuid.UUID, data: ExerciseSessionUpdate
) -> ExerciseSession:
    session = db.scalar(
        select(ExerciseSession).where(
            ExerciseSession.id == session_id,
            ExerciseSession.patient_profile_id == patient_profile_id,
        )
    )
    if not session:
        raise NotFoundError("Session not found.")

    session.status = data.status
    session.ended_at = data.ended_at or datetime.now(timezone.utc)

    # If completed reps were submitted, create placeholder rep metrics if none exist
    if data.completed_reps and data.completed_reps > 0:
        existing_metrics_count = db.scalar(
            select(func.count(ExerciseMetric.id)).where(ExerciseMetric.session_id == session.id)
        ) or 0
        if existing_metrics_count == 0:
            for rep_idx in range(1, data.completed_reps + 1):
                metric = ExerciseMetric(
                    session_id=session.id,
                    rep_index=rep_idx,
                    performed_at=session.ended_at,
                    form_score=85.0,  # Baseline score for manual completion
                    rom_min_deg=10.0,
                    rom_max_deg=85.0,
                    valid=True,
                )
                db.add(metric)

    db.commit()
    db.refresh(session)
    return session


def get_session_detail(
    db: Session, patient_profile_id: uuid.UUID, session_id: uuid.UUID
) -> ExerciseSession:
    session = db.scalar(
        select(ExerciseSession)
        .where(
            ExerciseSession.id == session_id,
            ExerciseSession.patient_profile_id == patient_profile_id,
        )
        .options(
            joinedload(ExerciseSession.exercise),
            joinedload(ExerciseSession.metrics),
        )
    )
    if not session:
        raise NotFoundError("Session not found.")
    return session


def list_patient_sessions(
    db: Session, patient_profile_id: uuid.UUID, limit: int = 50
) -> list[ExerciseSessionRead]:
    sessions = db.scalars(
        select(ExerciseSession)
        .where(ExerciseSession.patient_profile_id == patient_profile_id)
        .options(
            joinedload(ExerciseSession.exercise),
            joinedload(ExerciseSession.metrics),
        )
        .order_by(desc(ExerciseSession.started_at))
        .limit(limit)
    ).unique().all()

    result = []
    for s in sessions:
        metrics_count = len(s.metrics)
        avg_score = (
            sum(m.form_score for m in s.metrics if m.form_score is not None) / metrics_count
            if metrics_count > 0
            else None
        )
        max_rom = (
            max((m.rom_max_deg for m in s.metrics if m.rom_max_deg is not None), default=None)
            if metrics_count > 0
            else None
        )

        result.append(
            ExerciseSessionRead(
                id=s.id,
                patient_profile_id=s.patient_profile_id,
                exercise_id=s.exercise_id,
                plan_exercise_id=s.plan_exercise_id,
                status=s.status,
                started_at=s.started_at,
                ended_at=s.ended_at,
                created_at=s.created_at,
                exercise=ExerciseRead.model_validate(s.exercise) if s.exercise else None,
                metrics_count=metrics_count,
                average_form_score=round(avg_score, 1) if avg_score else None,
                max_rom=round(max_rom, 1) if max_rom else None,
            )
        )
    return result


def get_patient_progress_summary(
    db: Session, patient_profile_id: uuid.UUID
) -> ProgressSummaryRead:
    from app.services.recovery_engine import (
        HistoricalSessionSnapshot,
        calculate_recovery_score,
    )

    sessions = list_patient_sessions(db, patient_profile_id, limit=50)
    completed_sessions = [s for s in sessions if s.status == SessionStatus.completed]
    total_completed = len(completed_sessions)

    # Unique exercises completed
    unique_exercises = len(set(s.exercise_id for s in completed_sessions))

    # Form score average
    scores = [s.average_form_score for s in completed_sessions if s.average_form_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # Construct snapshots for recovery engine
    snapshots = [
        HistoricalSessionSnapshot(
            session_id=str(s.id),
            exercise_id=str(s.exercise_id),
            exercise_name=s.exercise.name if s.exercise else "Exercise",
            performed_at=s.started_at,
            completed_reps=s.metrics_count or 10,
            target_reps=10,
            average_form_score=s.average_form_score,
            max_rom_deg=s.max_rom,
        )
        for s in completed_sessions
    ]

    recovery_res = calculate_recovery_score(snapshots)

    # Fetch longitudinal progress records
    progress_records = db.scalars(
        select(ProgressRecord)
        .where(ProgressRecord.patient_profile_id == patient_profile_id)
        .order_by(ProgressRecord.recorded_at)
    ).all()

    rom_records = [
        {
            "id": str(r.id),
            "metric": r.metric,
            "value": r.value,
            "unit": r.unit or "deg",
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in progress_records
    ]

    # Weekly frequency calculated from actual sessions in past 7 days
    now = datetime.now(timezone.utc)
    days_map = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    day_counts = {d: 0 for d in days_map}
    for s in completed_sessions:
        if s.started_at:
            s_time = s.started_at if s.started_at.tzinfo is not None else s.started_at.replace(tzinfo=timezone.utc)
            if (now - s_time).days < 7:
                day_name = days_map[s_time.weekday()]
                day_counts[day_name] += 1

    weekly_frequency = [
        {"day": d, "sessions": day_counts[d], "target": 1 if d not in ["Sat", "Sun"] else 0}
        for d in days_map
    ]

    return ProgressSummaryRead(
        total_sessions_completed=total_completed,
        total_exercises_completed=unique_exercises,
        adherence_percentage=float(recovery_res.adherence_percentage),
        recovery_score_placeholder=f"Recovery Score: {recovery_res.recovery_score}/100 ({recovery_res.confidence.value} Confidence, Trend: {recovery_res.trend.value})",
        average_form_score=avg_score,
        rom_progress_records=rom_records,
        weekly_frequency=weekly_frequency,
        recent_sessions=sessions[:10],
    )
