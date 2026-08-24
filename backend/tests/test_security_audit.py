"""Comprehensive Security, Authorization, RBAC, IDOR, and Privacy Tests for RehabAI."""

import pytest
from fastapi.testclient import TestClient
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def doctor_token():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "doctor@rehabai.com").first()
        assert user is not None
        return create_access_token(subject=str(user.id), role=user.role.value)
    finally:
        db.close()


@pytest.fixture(scope="module")
def patient_token():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "patient@rehabai.com").first()
        assert user is not None
        return create_access_token(subject=str(user.id), role=user.role.value)
    finally:
        db.close()


def test_auth_rejection_on_invalid_token(client):
    res = client.get("/api/patient/profile", headers={"Authorization": "Bearer invalid.token.payload"})
    assert res.status_code == 401


def test_auth_rejection_on_missing_auth_header(client):
    res = client.get("/api/patient/profile")
    assert res.status_code == 401


def test_security_headers_present_on_all_responses(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Content-Security-Policy" in res.headers


def test_rbac_doctor_forbidden_from_patient_endpoints(client, doctor_token):
    # Doctor attempting patient profile route
    res = client.get("/api/patient/profile", headers={"Authorization": f"Bearer {doctor_token}"})
    assert res.status_code == 403


def test_rbac_patient_forbidden_from_doctor_endpoints(client, patient_token):
    # Patient attempting doctor dashboard
    res = client.get("/api/doctor/dashboard", headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403

    # Patient attempting doctor intelligence center
    res = client.get("/api/doctor/intelligence", headers={"Authorization": f"Bearer {patient_token}"})
    assert res.status_code == 403


def test_idor_unassigned_patient_access_denied_for_doctor(client, doctor_token):
    fake_patient_uuid = "00000000-0000-0000-0000-000000000999"
    res = client.get(f"/api/doctor/patients/{fake_patient_uuid}", headers={"Authorization": f"Bearer {doctor_token}"})
    assert res.status_code in (403, 404)
