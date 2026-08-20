"""Alembic metadata entry point: import Base and every model package so that
Base.metadata contains all tables when migrations run.
"""

from app.db.base_class import Base  # noqa: F401
from app import models  # noqa: F401,E402
