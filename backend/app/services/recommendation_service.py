"""Adaptive Recommendations service and doctor workflow management."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NotFoundError, AuthorizationError
from app.models.doctor import PatientDoctor, PatientProfile
from app.models.plan import RehabilitationPlan, PlanExercise, PlanStatus
from app.models.session import ExerciseSession, SessionStatus
from app.models.recommendation import (
    RehabilitationRecommendation,
    RecommendationStatus,
    RecommendationType,
)
from app.services.adaptive_engine import (
    AdaptiveRehabilitationEngine,
    GeneratedRecommendation,
)
from app.services.recovery_engine import HistoricalSessionSnapshot


def evaluate_and_generate_patient_recommendation(
    db: Session,
    patient_profile_id: uuid.UUID,
) -> RehabilitationRecommendation:
    """Run AdaptiveRehabilitationEngine for a patient and record pending recommendation."""
    # Find active plan
    active_plan = db.scalar(
        select(RehabilitationPlan)
        .where(
            RehabilitationPlan.patient_profile_id == patient_profile_id,
            RehabilitationPlan.status == PlanStatus.active,
        )
        .options(joinedload(RehabilitationPlan.exercises).joinedload(PlanExercise.exercise))
    )

    # Fetch completed sessions
    sessions = db.scalars(
        select(ExerciseSession)
        .where(
            ExerciseSession.patient_profile_id == patient_profile_id,
            ExerciseSession.status == SessionStatus.completed,
        )
        .options(joinedload(ExerciseSession.exercise), joinedload(ExerciseSession.metrics))
        .order_by(ExerciseSession.started_at)
    ).unique().all()

    snapshots = [
        HistoricalSessionSnapshot(
            session_id=str(s.id),
            exercise_id=str(s.exercise_id),
            exercise_name=s.exercise.name if s.exercise else "Exercise",
            performed_at=s.started_at,
            completed_reps=len(s.metrics) or 10,
            target_reps=10,
            average_form_score=(
                sum(m.form_score for m in s.metrics if m.form_score is not None) / len(s.metrics)
                if s.metrics
                else None
            ),
            max_rom_deg=(
                max((m.rom_max_deg for m in s.metrics if m.rom_max_deg is not None), default=None)
                if s.metrics
                else None
            ),
        )
        for s in sessions
    ]

    target_reps = 10
    target_sets = 3
    target_rom = 85.0
    primary_plan_ex = None
    primary_exercise_id = None

    if active_plan and active_plan.exercises:
        primary_plan_ex = active_plan.exercises[0]
        target_reps = primary_plan_ex.target_reps
        target_sets = primary_plan_ex.target_sets
        target_rom = primary_plan_ex.target_rom_degrees or 85.0
        primary_exercise_id = primary_plan_ex.exercise_id

    generated = AdaptiveRehabilitationEngine.evaluate_patient_progression(
        sessions=snapshots,
        current_target_reps=target_reps,
        current_target_sets=target_sets,
        prescribed_target_rom=target_rom,
    )

    # Check for existing GENERATED recommendation to avoid duplicate spam
    existing = db.scalar(
        select(RehabilitationRecommendation).where(
            RehabilitationRecommendation.patient_profile_id == patient_profile_id,
            RehabilitationRecommendation.status == RecommendationStatus.GENERATED,
        )
    )

    if existing:
        existing.recommendation_type = generated.recommendation_type
        existing.title = generated.title
        existing.clinical_rationale = generated.clinical_rationale
        existing.patient_message = generated.patient_message
        existing.suggested_changes = generated.suggested_changes
        existing.evidence_metrics = generated.evidence.model_dump()
        existing.confidence_score = generated.confidence_score
        db.commit()
        db.refresh(existing)
        return existing

    rec = RehabilitationRecommendation(
        patient_profile_id=patient_profile_id,
        plan_id=active_plan.id if active_plan else None,
        plan_exercise_id=primary_plan_ex.id if primary_plan_ex else None,
        exercise_id=primary_exercise_id,
        recommendation_type=generated.recommendation_type,
        status=RecommendationStatus.GENERATED,
        title=generated.title,
        clinical_rationale=generated.clinical_rationale,
        patient_message=generated.patient_message,
        suggested_changes=generated.suggested_changes,
        evidence_metrics=generated.evidence.model_dump(),
        confidence_score=generated.confidence_score,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def list_doctor_recommendations(
    db: Session, doctor_profile_id: uuid.UUID
) -> List[RehabilitationRecommendation]:
    """Retrieve all pending and reviewed AI recommendations for doctor's assigned patients."""
    recs = db.scalars(
        select(RehabilitationRecommendation)
        .join(PatientDoctor, PatientDoctor.patient_profile_id == RehabilitationRecommendation.patient_profile_id)
        .where(PatientDoctor.doctor_profile_id == doctor_profile_id)
        .options(
            joinedload(RehabilitationRecommendation.patient),
            joinedload(RehabilitationRecommendation.exercise),
            joinedload(RehabilitationRecommendation.plan),
        )
        .order_by(desc(RehabilitationRecommendation.created_at))
    ).unique().all()
    return recs


def apply_recommendation_decision(
    db: Session,
    doctor_profile_id: uuid.UUID,
    recommendation_id: uuid.UUID,
    decision: str,  # "APPROVED" | "REJECTED"
    doctor_note: Optional[str] = None,
) -> RehabilitationRecommendation:
    """Doctor approves or rejects AI recommendation. Approved updates prescription plan."""
    rec = db.scalar(
        select(RehabilitationRecommendation)
        .where(RehabilitationRecommendation.id == recommendation_id)
        .options(
            joinedload(RehabilitationRecommendation.plan),
            joinedload(RehabilitationRecommendation.plan_exercise_id),
        )
    )
    if not rec:
        raise NotFoundError("Recommendation not found.")

    # Verify doctor owns patient relationship
    assoc = db.scalar(
        select(PatientDoctor).where(
            PatientDoctor.doctor_profile_id == doctor_profile_id,
            PatientDoctor.patient_profile_id == rec.patient_profile_id,
        )
    )
    if not assoc:
        raise AuthorizationError("Unauthorized: patient is not assigned to your care team.")

    rec.reviewed_at = datetime.now(timezone.utc)
    rec.doctor_decision_note = doctor_note

    if decision.upper() == "APPROVED":
        rec.status = RecommendationStatus.APPROVED

        # Safely apply approved volume modification to the plan exercise
        if rec.plan_exercise_id and rec.suggested_changes:
            plan_ex = db.get(PlanExercise, rec.plan_exercise_id)
            if plan_ex:
                if "target_reps" in rec.suggested_changes:
                    plan_ex.target_reps = int(rec.suggested_changes["target_reps"])
                if "target_sets" in rec.suggested_changes:
                    plan_ex.target_sets = int(rec.suggested_changes["target_sets"])
        rec.status = RecommendationStatus.APPLIED
    else:
        rec.status = RecommendationStatus.REJECTED

    db.commit()
    db.refresh(rec)
    return rec
