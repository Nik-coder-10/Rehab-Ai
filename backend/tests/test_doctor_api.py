"""Comprehensive test suite for Doctor Management, Patient Assignment, Plans, Exercise Workflow and Cross-Role Security."""

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.doctor import DoctorProfile, PatientDoctor, PatientProfile
from app.models.exercise import Exercise
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


def test_doctor_profile(client, doctor_token):
    res = client.get(
        "/api/doctor/profile",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "doctor@rehabai.com"
    assert data["full_name"] == "Dr. Elena Vance, DPT"
    assert data["patients_count"] >= 1


def test_doctor_dashboard(client, doctor_token):
    res = client.get(
        "/api/doctor/dashboard",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_patients"] >= 1
    assert data["active_plans_count"] >= 1
    assert len(data["recent_patient_activity"]) >= 1


def test_doctor_analytics(client, doctor_token):
    res = client.get(
        "/api/doctor/analytics",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "weekly_session_volume" in data
    assert "adherence_distribution" in data


def test_doctor_patients_list(client, doctor_token):
    res = client.get(
        "/api/doctor/patients",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 200
    patients = res.json()
    assert len(patients) >= 1
    assert patients[0]["full_name"] == "Marcus Sterling"


def test_doctor_patient_detail(client, doctor_token):
    # Get patient id from list
    res = client.get(
        "/api/doctor/patients",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    patient_id = res.json()[0]["id"]

    detail_res = client.get(
        f"/api/doctor/patients/{patient_id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["id"] == patient_id
    assert data["active_plan"] is not None


def test_doctor_create_plan_and_assign_exercise(client, doctor_token, patient_token):
    # 1. Get patient ID
    res = client.get(
        "/api/doctor/patients",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    patient_id = res.json()[0]["id"]

    # 2. Doctor creates a new rehabilitation plan
    plan_res = client.post(
        f"/api/doctor/patients/{patient_id}/plans",
        json={
            "title": "Phase 4 High-Performance Conditioning",
            "description": "Progressive strength, single-leg stability and full range knee flexion.",
            "start_date": "2026-08-22",
            "end_date": "2026-09-22",
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert plan_res.status_code == 201
    new_plan = plan_res.json()
    plan_id = new_plan["id"]
    assert new_plan["title"] == "Phase 4 High-Performance Conditioning"

    # 3. Doctor fetches exercise catalogue
    ex_res = client.get(
        "/api/doctor/exercises",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert ex_res.status_code == 200
    exercises = ex_res.json()
    exercise_id = exercises[0]["id"]

    # 4. Doctor assigns exercise to new plan
    assign_res = client.post(
        f"/api/doctor/plans/{plan_id}/exercises",
        json={
            "exercise_id": exercise_id,
            "target_sets": 4,
            "target_reps": 12,
            "target_rom_degrees": 88.0,
            "frequency_per_week": 5,
            "instructions_override": "Perform with 3-second eccentric tempo.",
            "order_index": 1,
        },
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert assign_res.status_code == 201
    assigned = assign_res.json()
    assigned_pe_id = assigned["id"]
    assert assigned["target_sets"] == 4
    assert assigned["target_reps"] == 12

    # 5. Patient fetches active plan and verifies the new assignment is immediately visible!
    patient_plan_res = client.get(
        "/api/patient/plan",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patient_plan_res.status_code == 200
    patient_plan = patient_plan_res.json()
    assert patient_plan["id"] == plan_id
    assert len(patient_plan["exercises"]) == 1
    assert patient_plan["exercises"][0]["instructions_override"] == "Perform with 3-second eccentric tempo."

    # 6. Doctor removes exercise assignment
    del_res = client.delete(
        f"/api/doctor/plans/{plan_id}/exercises/{assigned_pe_id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert del_res.status_code == 200


def test_patient_forbidden_from_doctor_endpoints(client, patient_token):
    # Patient trying to access /api/doctor/dashboard must be blocked with 403
    res = client.get(
        "/api/doctor/dashboard",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error_code"] == "forbidden"


def test_doctor_unassigned_patient_access_denied(client, doctor_token):
    # Create an unassigned dummy patient profile with unique email
    import uuid
    random_email = f"unassigned_{uuid.uuid4().hex[:8]}@rehabai.com"
    db = SessionLocal()
    try:
        dummy_user = User(
            email=random_email,
            password_hash="fakehash",
            full_name="Unassigned Patient",
            role=UserRole.patient,
        )
        dummy_prof = PatientProfile()
        dummy_user.patient_profile = dummy_prof
        db.add(dummy_user)
        db.commit()
        db.refresh(dummy_prof)
        unassigned_id = str(dummy_prof.id)
    finally:
        db.close()

    # Doctor trying to view details of unassigned patient must get 403 Forbidden
    res = client.get(
        f"/api/doctor/patients/{unassigned_id}",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error_code"] == "forbidden"
