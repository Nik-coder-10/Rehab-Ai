"""FastAPI dependencies for DB sessions and authenticated user injection."""

import uuid
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.doctor import DoctorProfile, PatientDoctor, PatientProfile
from app.models.user import User, UserRole


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    """Extract and validate the Bearer token from the Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("Missing or invalid Authorization header.")

    token = authorization[len("Bearer ") :].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload.")

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise AuthenticationError("Malformed user ID in token.")

    user = db.get(User, user_uuid)
    if user is None:
        raise AuthenticationError("User associated with token not found.")
    if not user.is_active:
        raise AuthenticationError("This account has been deactivated.")

    return user


def get_current_patient(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> tuple[User, PatientProfile]:
    """Ensure the authenticated user is a patient and return their patient profile."""
    if current_user.role != UserRole.patient:
        raise AuthorizationError("Only patients can access this resource.")

    profile = db.scalar(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    if profile is None:
        # Auto-heal profile if missing
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return current_user, profile


def get_current_doctor(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> tuple[User, DoctorProfile]:
    """Ensure the authenticated user is a doctor and return their doctor profile."""
    if current_user.role != UserRole.doctor:
        raise AuthorizationError("Only doctors/physiotherapists can access this resource.")

    profile = db.scalar(
        select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
    )
    if profile is None:
        # Auto-heal profile if missing
        profile = DoctorProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return current_user, profile


def verify_doctor_patient_access(
    db: Session, doctor_profile_id: uuid.UUID, patient_profile_id: uuid.UUID
) -> PatientProfile:
    """Verify that a patient is assigned to the doctor, preventing unauthorized access."""
    assoc = db.scalar(
        select(PatientDoctor).where(
            PatientDoctor.doctor_profile_id == doctor_profile_id,
            PatientDoctor.patient_profile_id == patient_profile_id,
        )
    )
    if not assoc:
        raise AuthorizationError("Access denied: Patient is not assigned to your care team.")

    patient_profile = db.get(PatientProfile, patient_profile_id)
    if not patient_profile:
        raise AuthorizationError("Patient profile not found.")

    return patient_profile
