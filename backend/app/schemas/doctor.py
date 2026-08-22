"""Schemas for doctor portal, patient management, prescription plans, exercise assignments and analytics."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.exercise import ExerciseCategory
from app.models.plan import PlanStatus
from app.models.session import SessionStatus
from app.schemas.patient import ExerciseRead, ExerciseSessionRead, PlanExerciseRead, RehabilitationPlanRead


# --- Doctor Profile Schemas ---
class DoctorProfileRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    specialization: str | None = None
    organization: str | None = None
    license_number: str | None = None
    created_at: datetime
    patients_count: int = 0
    active_plans_count: int = 0


class DoctorProfileUpdate(BaseModel):
    specialization: str | None = None
    organization: str | None = None
    license_number: str | None = None


# --- Doctor Patient Management Schemas ---
class PatientListItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    date_of_birth: date | None = None
    medical_conditions: str | None = None
    notes: str | None = None
    linked_at: datetime
    active_plan_title: str | None = None
    active_plan_id: uuid.UUID | None = None
    total_sessions_completed: int = 0
    last_session_at: datetime | None = None
    adherence_rate: float = 0.0
    needs_attention: bool = False


class PatientDetailRead(BaseModel):
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
    linked_at: datetime
    active_plan: RehabilitationPlanRead | None = None
    all_plans: list[RehabilitationPlanRead] = []
    recent_sessions: list[ExerciseSessionRead] = []
    total_sessions_completed: int = 0
    average_form_score: float | None = None
    adherence_percentage: float = 0.0
    rom_progress_records: list[dict[str, Any]] = []


# --- Rehabilitation Plan Management Schemas ---
class PlanCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    status: PlanStatus | None = None
    start_date: date | None = None
    end_date: date | None = None


# --- Plan Exercise Assignment Schemas ---
class PlanExerciseCreate(BaseModel):
    exercise_id: uuid.UUID
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps: int = Field(default=10, ge=1, le=100)
    target_rom_degrees: float | None = Field(default=None, ge=5, le=180)
    frequency_per_week: int | None = Field(default=5, ge=1, le=7)
    instructions_override: str | None = None
    order_index: int = 0


class PlanExerciseUpdate(BaseModel):
    target_sets: int | None = Field(default=None, ge=1, le=20)
    target_reps: int | None = Field(default=None, ge=1, le=100)
    target_rom_degrees: float | None = Field(default=None, ge=5, le=180)
    frequency_per_week: int | None = Field(default=None, ge=1, le=7)
    instructions_override: str | None = None
    order_index: int | None = None
    is_active: bool | None = None


# --- Exercise Management Schemas ---
class ExerciseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    category: ExerciseCategory = ExerciseCategory.strength
    instructions: str | None = None
    default_engine_config: dict[str, Any] | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: ExerciseCategory | None = None
    instructions: str | None = None
    default_engine_config: dict[str, Any] | None = None
    is_active: bool | None = None


# --- Doctor Dashboard & Analytics Schemas ---
class DoctorDashboardSummary(BaseModel):
    total_patients: int
    active_plans_count: int
    total_sessions_completed: int
    patients_needing_attention_count: int
    average_adherence_rate: float
    recent_patient_activity: list[PatientListItem] = []
    recent_sessions: list[ExerciseSessionRead] = []


class DoctorAnalyticsSummary(BaseModel):
    total_patients: int
    total_sessions: int
    average_adherence_rate: float
    average_form_score: float | None = None
    weekly_session_volume: list[dict[str, Any]] = []
    adherence_distribution: list[dict[str, Any]] = []
    top_prescribed_exercises: list[dict[str, Any]] = []
