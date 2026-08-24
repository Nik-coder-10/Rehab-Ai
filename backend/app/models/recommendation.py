"""Adaptive Rehabilitation Recommendation ORM models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base_class import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")


class RecommendationType(str, enum.Enum):
    MAINTAIN_DIFFICULTY = "MAINTAIN_DIFFICULTY"
    INCREASE_REPETITIONS = "INCREASE_REPETITIONS"
    DECREASE_REPETITIONS = "DECREASE_REPETITIONS"
    INCREASE_REST = "INCREASE_REST"
    DECREASE_REST = "DECREASE_REST"
    FOCUS_ON_FORM = "FOCUS_ON_FORM"
    FOCUS_ON_ROM = "FOCUS_ON_ROM"
    REVIEW_BY_DOCTOR = "REVIEW_BY_DOCTOR"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class RecommendationStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    REVIEWED = "REVIEWED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    APPLIED = "APPLIED"


class RehabilitationRecommendation(Base):
    """AI-assisted adaptive prescription recommendation for physician review."""

    __tablename__ = "rehabilitation_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("rehabilitation_plans.id", ondelete="SET NULL"), nullable=True, index=True
    )
    plan_exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plan_exercises.id", ondelete="SET NULL"), nullable=True, index=True
    )
    exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True, index=True
    )

    recommendation_type: Mapped[RecommendationType] = mapped_column(
        Enum(RecommendationType, native_enum=False), nullable=False
    )
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, native_enum=False),
        nullable=False,
        default=RecommendationStatus.GENERATED,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    clinical_rationale: Mapped[str] = mapped_column(Text, nullable=False)
    patient_message: Mapped[str] = mapped_column(Text, nullable=False)

    suggested_changes: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    evidence_metrics: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.8)

    doctor_decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    patient = relationship("PatientProfile", backref="recommendations")
    plan = relationship("RehabilitationPlan")
    exercise = relationship("Exercise")
