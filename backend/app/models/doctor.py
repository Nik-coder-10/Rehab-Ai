"""Patient and doctor profiles plus the care-team association table."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, Float, ForeignKey, String, Text, Uuid, func, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.mixins import TimestampMixin


class PatientProfile(Base, TimestampMixin):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    medical_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    doctors = relationship(
        "DoctorProfile", secondary="patient_doctors", back_populates="patients"
    )
    plans = relationship(
        "RehabilitationPlan", back_populates="patient", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "ExerciseSession", back_populates="patient", cascade="all, delete-orphan"
    )
    progress_records = relationship(
        "ProgressRecord", back_populates="patient", cascade="all, delete-orphan"
    )


class DoctorProfile(Base, TimestampMixin):
    __tablename__ = "doctor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    specialization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user = relationship("User", back_populates="doctor_profile")
    patients = relationship(
        "PatientProfile", secondary="patient_doctors", back_populates="doctors"
    )
    plans = relationship("RehabilitationPlan", back_populates="doctor")


class PatientDoctor(Base):
    """Association table: which doctor manages which patient."""

    __tablename__ = "patient_doctors"

    patient_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    doctor_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("doctor_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
