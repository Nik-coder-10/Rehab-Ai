"""Registration and login logic."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.doctor import DoctorProfile, PatientProfile
from app.models.user import User, UserRole
from app.schemas.auth import RegisterRequest

logger = logging.getLogger(__name__)


def register_user(db: Session, data: RegisterRequest) -> User:
    existing = db.scalar(select(User).where(User.email == data.email.lower()))
    if existing is not None:
        raise ConflictError("An account with this email already exists.")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=UserRole(data.role),
    )
    # Role profiles are created eagerly so every user is queryable uniformly.
    if user.role is UserRole.patient:
        user.patient_profile = PatientProfile()
    elif user.role is UserRole.doctor:
        user.doctor_profile = DoctorProfile()

    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Registered new %s account id=%s", user.role.value, user.id)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    # Same generic error for unknown email and wrong password (no enumeration).
    if user is None or not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid email or password.")
    if not user.is_active:
        raise AuthenticationError("This account is deactivated.")
    return user


def issue_token(user: User) -> str:
    return create_access_token(subject=str(user.id), role=user.role.value)


def get_user_by_id(db: Session, user_id: str) -> User | None:
    try:
        parsed = uuid.UUID(user_id)
    except ValueError:
        return None
    return db.get(User, parsed)
