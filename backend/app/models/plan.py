"""Rehabilitation plans prescribed by doctors.

Plan -> PlanExercise -> Exercise models the prescription hierarchy;
targets (sets/reps/ROM) live on PlanExercise so the same Exercise can be
prescribed differently to different patients.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Boolean, Date, Enum, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin


class PlanStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class RehabilitationPlan(Base, TimestampMixin):
    __tablename__ = "rehabilitation_plans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("doctor_profiles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[PlanStatus] = mapped_column(
        Enum(PlanStatus, native_enum=False), nullable=False, default=PlanStatus.active
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    patient = relationship("PatientProfile", back_populates="plans")
    doctor = relationship("DoctorProfile", back_populates="plans")
    plan_exercises = relationship(
        "PlanExercise", back_populates="plan", cascade="all, delete-orphan",
        order_by="PlanExercise.order_index",
    )


class PlanExercise(Base, TimestampMixin):
    __tablename__ = "plan_exercises"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rehabilitation_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    target_sets: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    target_reps: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    target_rom_degrees: Mapped[float | None] = mapped_column(Float, nullable=True)
    frequency_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instructions_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    plan = relationship("RehabilitationPlan", back_populates="plan_exercises")
    exercise = relationship("Exercise", back_populates="plan_exercises")
    sessions = relationship("ExerciseSession", back_populates="plan_exercise")
