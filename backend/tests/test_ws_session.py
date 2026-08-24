"""Automated integration tests for Exercise Session WebSocket Hub."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.doctor import PatientProfile
from app.models.exercise import Exercise
from app.models.session import ExerciseSession, SessionStatus

client = TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_ws_unauthorized_no_token():
    """Verify WebSocket refuses connection without token."""
    with pytest.raises(Exception):
        with client.websocket_connect("/api/ws/exercise-session/fake-session-id") as websocket:
            pass


def test_ws_invalid_session(db):
    """Verify WebSocket closes when session does not exist."""
    user = db.query(User).filter(User.email == "patient@rehabai.com").first()
    token = create_access_token(str(user.id), user.role.value)

    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/ws/exercise-session/00000000-0000-0000-0000-000000000000?token={token}") as websocket:
            pass


def test_ws_lifecycle_and_metrics_streaming(db):
    """Verify full WebSocket lifecycle: Connect -> Metrics Update -> Rep Completed -> Pause -> Resume -> End."""
    # 1. Setup Patient and Active Session
    patient_user = db.query(User).filter(User.email == "patient@rehabai.com").first()
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == patient_user.id).first()
    exercise = db.query(Exercise).first()

    session_obj = ExerciseSession(
        patient_profile_id=patient_profile.id,
        exercise_id=exercise.id,
        status=SessionStatus.in_progress,
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    token = create_access_token(str(patient_user.id), patient_user.role.value)

    # 2. Connect to WebSocket
    with client.websocket_connect(f"/api/ws/exercise-session/{session_obj.id}?token={token}") as websocket:
        # Check initial connection handshake
        init_event = websocket.receive_json()
        assert init_event["event"] == "SESSION_CONNECTED"
        assert init_event["status"] == "ACTIVE"

        # 3. Stream Metrics Update
        websocket.send_json({
            "action": "METRICS_UPDATE",
            "session_id": str(session_obj.id),
            "timestamp_ms": 1000.0,
            "current_angle": 135.0,
            "current_rom": 45.0,
            "current_velocity": 25.0,
            "phase": "DESCENDING",
            "current_score": 95,
            "active_feedback": "Controlled descent.",
            "reps_completed": 0,
        })
        ack = websocket.receive_json()
        assert ack["event"] == "METRICS_ACK"
        assert ack["phase"] == "DESCENDING"

        # 4. Stream Repetition Logged
        websocket.send_json({
            "action": "REP_COMPLETED",
            "session_id": str(session_obj.id),
            "rep_number": 1,
            "form_score": 95,
            "peak_rom": 85.0,
            "duration_seconds": 2.5,
            "feedback_cues": ["Good depth!"],
            "timestamp_ms": 2500.0,
        })
        rep_ack = websocket.receive_json()
        assert rep_ack["event"] == "REP_LOGGED"
        assert rep_ack["rep_number"] == 1

        # 5. Pause and Resume
        websocket.send_json({"action": "SESSION_PAUSE", "session_id": str(session_obj.id)})
        pause_ack = websocket.receive_json()
        assert pause_ack["event"] == "SESSION_PAUSED"

        websocket.send_json({"action": "SESSION_RESUME", "session_id": str(session_obj.id)})
        resume_ack = websocket.receive_json()
        assert resume_ack["event"] == "SESSION_RESUMED"

        # 6. End Session
        websocket.send_json({
            "action": "SESSION_END",
            "session_id": str(session_obj.id),
            "completed_reps": 1,
            "average_form_score": 95.0,
        })
        end_ack = websocket.receive_json()
        assert end_ack["event"] == "SESSION_ENDED"
        assert end_ack["status"] == "COMPLETED"

    # Verify session persisted in DB as completed
    db.expire_all()
    session_check = db.query(ExerciseSession).filter(ExerciseSession.id == session_obj.id).first()
    assert session_check.status == SessionStatus.completed
    assert session_check.ended_at is not None
