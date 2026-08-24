"""ORM models. Imported as a package so Base.metadata sees every table."""

from app.models.user import User, UserRole
from app.models.doctor import DoctorProfile, PatientDoctor, PatientProfile
from app.models.exercise import Exercise, ExerciseCategory
from app.models.plan import PlanExercise, PlanStatus, RehabilitationPlan
from app.models.session import (
    ExerciseMetric,
    ExerciseSession,
    ProgressRecord,
    SessionStatus,
)

from app.models.recommendation import (
    RehabilitationRecommendation,
    RecommendationStatus,
    RecommendationType,
)

__all__ = [
    "User",
    "UserRole",
    "PatientProfile",
    "DoctorProfile",
    "PatientDoctor",
    "Exercise",
    "ExerciseCategory",
    "RehabilitationPlan",
    "PlanStatus",
    "PlanExercise",
    "ExerciseSession",
    "SessionStatus",
    "ExerciseMetric",
    "ProgressRecord",
    "RehabilitationRecommendation",
    "RecommendationType",
    "RecommendationStatus",
]
