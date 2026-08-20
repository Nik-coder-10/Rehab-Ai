"""Exercise catalogue.

`default_engine_config` stores a JSON serialised exercise definition for the
future CV analysis engine, so adding an exercise is a data change, not a
code change. The CV engine itself is NOT implemented yet.
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base_class import Base
from app.models.mixins import TimestampMixin

JSONType = JSON().with_variant(JSONB(), "postgresql")


class ExerciseCategory(str, enum.Enum):
    strength = "strength"
    mobility = "mobility"
    stretching = "stretching"
    balance = "balance"


class Exercise(Base, TimestampMixin):
    __tablename__ = "exercises"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[ExerciseCategory] = mapped_column(
        Enum(ExerciseCategory, native_enum=False),
        nullable=False,
        default=ExerciseCategory.strength,
    )
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_engine_config: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    plan_exercises = relationship("PlanExercise", back_populates="exercise")
    sessions = relationship("ExerciseSession", back_populates="exercise")
