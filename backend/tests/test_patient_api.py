"""Backend test suite for Auth, Patient Dashboard APIs, Exercise Detail, and Data Isolation."""

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.user import User


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def patient_token():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "patient@rehabai.com").first()
        assert user is not None
        return create_access_token(subject=str(user.id), role=user.role.value)
    finally:
        db.close()


@pytest.fixture(scope="module")
def doctor_token():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "doctor@rehabai.com").first()
        assert user is not None
        return create_access_token(subject=str(user.id), role=user.role.value)
    finally:
        db.close()


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_auth_login_patient(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "patient@rehabai.com", "password": "PatientPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "patient@rehabai.com"
    assert data["user"]["role"] == "patient"


def test_auth_login_invalid(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "patient@rehabai.com", "password": "WrongPassword!"},
    )
    assert res.status_code == 401
    assert res.json()["error_code"] == "authentication_failed"


def test_patient_profile(client, patient_token):
    res = client.get(
        "/api/patient/profile",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "patient@rehabai.com"
    assert data["full_name"] == "Marcus Sterling"
    assert len(data["assigned_doctors"]) > 0


def test_patient_plan(client, patient_token):
    res = client.get(
        "/api/patient/plan",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data is not None
    assert "Phase" in data["title"]


def test_patient_exercises_catalogue(client, patient_token):
    res = client.get(
        "/api/patient/exercises",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res.status_code == 200
    exercises = res.json()
    assert len(exercises) >= 5
    first = exercises[0]
    assert "id" in first
    assert "name" in first
    assert "category" in first


def test_exercise_detail(client, patient_token):
    res = client.get(
        "/api/patient/exercises",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    exercise_id = res.json()[0]["id"]

    detail_res = client.get(
        f"/api/exercises/{exercise_id}",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == exercise_id
    assert "instructions" in detail


def test_session_lifecycle(client, patient_token):
    # 1. Fetch exercise
    ex_res = client.get(
        "/api/patient/exercises",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    exercise_id = ex_res.json()[0]["id"]

    # 2. Create session
    create_res = client.post(
        "/api/sessions",
        json={"exercise_id": exercise_id},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert create_res.status_code == 201
    session_data = create_res.json()
    session_id = session_data["id"]
    assert session_data["status"] == "in_progress"

    # 3. Patch complete session
    patch_res = client.patch(
        f"/api/sessions/{session_id}",
        json={"status": "completed", "completed_reps": 10},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "completed"

    # 4. Get session detail
    detail_res = client.get(
        f"/api/sessions/{session_id}",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["metrics_count"] == 10


def test_patient_progress(client, patient_token):
    res = client.get(
        "/api/patient/progress",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_sessions_completed"] >= 1
    assert "recovery_score_placeholder" in data


def test_doctor_forbidden_from_patient_endpoints(client, doctor_token):
    # Doctor accessing /api/patient/plan should get 403 Forbidden
    res = client.get(
        "/api/patient/plan",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error_code"] == "forbidden"
