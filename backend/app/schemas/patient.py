"""Schemas for patient dashboard, profile, plans, exercises and metrics."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.exercise import ExerciseCategory
from app.models.plan import PlanStatus
from app.models.session import SessionStatus
from app.schemas.user import UserRead


# --- Doctor Summary Schemas ---
class DoctorSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    specialization: str | None = None
    organization: str | None = None
    license_number: str | None = None


# --- Patient Profile Schemas ---
class PatientProfileRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    date_of_birth: date | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    medical_conditions: str | None = None
    notes: str | None = None
    created_at: datetime
    assigned_doctors: list[DoctorSummary] = []


class PatientProfileUpdate(BaseModel):
    date_of_birth: date | None = None
    height_cm: float | None = Field(default=None, ge=30, le=300)
    weight_kg: float | None = Field(default=None, ge=10, le=500)
    medical_conditions: str | None = None
    notes: str | None = None


# --- Exercise Schemas ---
class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str | None = None
    category: ExerciseCategory
    instructions: str | None = None
    is_active: bool
    default_engine_config: dict[str, Any] | None = None


class PlanExerciseRead(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    exercise_id: uuid.UUID
    order_index: int
    target_sets: int
    target_reps: int
    target_rom_degrees: float | None = None
    frequency_per_week: int | None = None
    instructions_override: str | None = None
    exercise: ExerciseRead


# --- Rehabilitation Plan Schemas ---
class RehabilitationPlanRead(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    status: PlanStatus
    start_date: date | None = None
    end_date: date | None = None
    doctor: DoctorSummary | None = None
    exercises: list[PlanExerciseRead] = []


# --- Session Schemas ---
class ExerciseMetricRead(BaseModel):
    id: uuid.UUID
    rep_index: int
    performed_at: datetime
    rom_min_deg: float | None = None
    rom_max_deg: float | None = None
    form_score: float | None = None
    form_issues: list[Any] | None = None
    valid: bool


class ExerciseSessionCreate(BaseModel):
    exercise_id: uuid.UUID
    plan_exercise_id: uuid.UUID | None = None


class ExerciseSessionUpdate(BaseModel):
    status: SessionStatus = SessionStatus.completed
    ended_at: datetime | None = None
    completed_reps: int | None = None


class ExerciseSessionRead(BaseModel):
    id: uuid.UUID
    patient_profile_id: uuid.UUID
    exercise_id: uuid.UUID
    plan_exercise_id: uuid.UUID | None = None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime
    exercise: ExerciseRead | None = None
    metrics_count: int = 0
    average_form_score: float | None = None
    max_rom: float | None = None


# --- Progress & Analytics Schemas ---
class ProgressSummaryRead(BaseModel):
    total_sessions_completed: int
    total_exercises_completed: int
    adherence_percentage: float
    recovery_score_placeholder: str = "Clinical Recovery Index (Pending Longitudinal ROM Baseline)"
    average_form_score: float | None = None
    rom_progress_records: list[dict[str, Any]] = []
    weekly_frequency: list[dict[str, Any]] = []
    recent_sessions: list[ExerciseSessionRead] = []
