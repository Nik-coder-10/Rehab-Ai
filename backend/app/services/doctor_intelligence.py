"""Doctor Clinical Intelligence Center Aggregation Engine."""

import enum
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.orm import Session, joinedload

from app.models.doctor import DoctorProfile, PatientDoctor, PatientProfile
from app.models.plan import RehabilitationPlan, PlanStatus, PlanExercise
from app.models.session import ExerciseSession, SessionStatus, ExerciseMetric
from app.models.recommendation import RehabilitationRecommendation, RecommendationStatus
from app.services.recovery_engine import (
    HistoricalSessionSnapshot,
    RecoveryScoreResult,
    TrendDirection,
    AlertCondition,
    calculate_recovery_score,
)
from app.services.ai_assistant import RehabilitationAIService, StructuredRehabContext


class ClinicalPriority(str, enum.Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class PatientTriageSummary(BaseModel):
    patient_id: str
    patient_name: str
    active_plan_name: str
    recovery_score: int
    recovery_trend: TrendDirection
    adherence_percentage: int
    priority: ClinicalPriority
    active_alerts: List[str] = Field(default_factory=list)
    pending_recommendations_count: int = 0
    total_sessions_completed: int = 0
    last_session_date: Optional[str] = None


class DoctorIntelligenceOverview(BaseModel):
    total_active_patients: int
    improving_patients_count: int
    stable_patients_count: int
    needs_attention_count: int
    insufficient_data_count: int
    pending_recommendations_count: int
    recent_alerts_count: int
    patients: List[PatientTriageSummary]


def evaluate_clinical_priority(
    recovery: RecoveryScoreResult,
    has_pending_recommendation: bool = False,
) -> ClinicalPriority:
    """Deterministic classification of patient triage priority."""
    if recovery.total_sessions_completed < 2:
        return ClinicalPriority.INSUFFICIENT_DATA

    if (
        recovery.trend == TrendDirection.DECLINING
        or recovery.adherence_percentage < 50
        or AlertCondition.PERFORMANCE_DECLINE in recovery.active_alerts
        or AlertCondition.LOW_ADHERENCE in recovery.active_alerts
    ):
        return ClinicalPriority.NEEDS_ATTENTION

    if recovery.trend == TrendDirection.IMPROVING and recovery.adherence_percentage >= 70:
        return ClinicalPriority.IMPROVING

    return ClinicalPriority.STABLE


def get_doctor_clinical_intelligence(
    db: Session, doctor_profile_id: uuid.UUID
) -> DoctorIntelligenceOverview:
    """Aggregate full clinical monitoring telemetry for all assigned patients."""
    # Find all patients assigned to this doctor
    patient_assocs = db.scalars(
        select(PatientDoctor)
        .where(PatientDoctor.doctor_profile_id == doctor_profile_id)
        .options(
            joinedload(PatientDoctor.patient_profile_id),
        )
    ).all()

    patient_summaries: List[PatientTriageSummary] = []
    improving_c = 0
    stable_c = 0
    needs_attention_c = 0
    insufficient_c = 0
    total_pending_recs = 0
    total_alerts = 0

    for assoc in patient_assocs:
        p_id = assoc.patient_profile_id
        patient = db.get(PatientProfile, p_id)
        if not patient:
            continue

        # Active plan
        active_plan = db.scalar(
            select(RehabilitationPlan).where(
                RehabilitationPlan.patient_profile_id == p_id,
                RehabilitationPlan.status == PlanStatus.active,
            )
        )
        plan_title = active_plan.title if active_plan else "No Active Prescription"

        # Sessions
        sessions = db.scalars(
            select(ExerciseSession)
            .where(
                ExerciseSession.patient_profile_id == p_id,
                ExerciseSession.status == SessionStatus.completed,
            )
            .options(joinedload(ExerciseSession.exercise), joinedload(ExerciseSession.metrics))
            .order_by(desc(ExerciseSession.started_at))
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

        recovery = calculate_recovery_score(snapshots)

        # Pending recommendations
        pending_recs_count = db.scalar(
            select(func.count(RehabilitationRecommendation.id)).where(
                RehabilitationRecommendation.patient_profile_id == p_id,
                RehabilitationRecommendation.status == RecommendationStatus.GENERATED,
            )
        ) or 0
        total_pending_recs += pending_recs_count

        priority = evaluate_clinical_priority(recovery, has_pending_recommendation=(pending_recs_count > 0))

        if priority == ClinicalPriority.IMPROVING:
            improving_c += 1
        elif priority == ClinicalPriority.STABLE:
            stable_c += 1
        elif priority == ClinicalPriority.NEEDS_ATTENTION:
            needs_attention_c += 1
        else:
            insufficient_c += 1

        alert_strings = [a.value for a in recovery.active_alerts]
        total_alerts += len(alert_strings)

        last_sess_date = sessions[0].started_at.strftime("%b %d, %Y") if sessions else None

        patient_summaries.append(
            PatientTriageSummary(
                patient_id=str(p_id),
                patient_name=patient.user.full_name if patient.user else "Patient",
                active_plan_name=plan_title,
                recovery_score=recovery.recovery_score,
                recovery_trend=recovery.trend,
                adherence_percentage=recovery.adherence_percentage,
                priority=priority,
                active_alerts=alert_strings,
                pending_recommendations_count=pending_recs_count,
                total_sessions_completed=len(sessions),
                last_session_date=last_sess_date,
            )
        )

    return DoctorIntelligenceOverview(
        total_active_patients=len(patient_summaries),
        improving_patients_count=improving_c,
        stable_patients_count=stable_c,
        needs_attention_count=needs_attention_c,
        insufficient_data_count=insufficient_c,
        pending_recommendations_count=total_pending_recs,
        recent_alerts_count=total_alerts,
        patients=patient_summaries,
    )
