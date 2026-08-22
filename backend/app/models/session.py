"""Exercise sessions, per-rep metrics and long-term progress records."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base_class import Base

JSONType = JSON().with_variant(JSONB(), "postgresql")


class SessionStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    aborted = "aborted"


class ExerciseSession(Base):
    __tablename__ = "exercise_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    plan_exercise_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("plan_exercises.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, native_enum=False), nullable=False,
        default=SessionStatus.in_progress,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    patient = relationship("PatientProfile", back_populates="sessions")
    exercise = relationship("Exercise", back_populates="sessions")
    plan_exercise = relationship("PlanExercise", back_populates="sessions")
    metrics = relationship(
        "ExerciseMetric", back_populates="session", cascade="all, delete-orphan"
    )


class ExerciseMetric(Base):
    """Metrics for a single counted repetition (produced by the CV engine)."""

    __tablename__ = "exercise_metrics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exercise_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rep_index: Mapped[int] = mapped_column(Integer, nullable=False)
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    rom_min_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    rom_max_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    form_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    form_issues: Mapped[list | None] = mapped_column(JSONType, nullable=True)
    valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    session = relationship("ExerciseSession", back_populates="metrics")


class ProgressRecord(Base):
    """Longitudinal metric snapshots (e.g. left_knee_rom_deg over weeks)."""

    __tablename__ = "progress_records"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("exercise_sessions.id", ondelete="SET NULL"), nullable=True
    )
    metric: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    patient = relationship("PatientProfile", back_populates="progress_records")
