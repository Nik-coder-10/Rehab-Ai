"""WebSocket manager and live exercise session hub for RehabAI."""

import json
from datetime import datetime, timezone
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.doctor import PatientProfile
from app.models.session import ExerciseSession, ExerciseMetric, SessionStatus
from app.schemas.ws_session import (
    WsSessionStartMessage,
    WsMetricsUpdateMessage,
    WsRepCompletedMessage,
    WsSessionStateChangeMessage,
)

ws_router = APIRouter()


class ExerciseSessionManager:
    """Manages active live WebSocket connections and session states."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_states: Dict[str, Dict] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        if session_id not in self.session_states:
            self.session_states[session_id] = {
                "status": "ACTIVE",
                "connected_at": datetime.now(timezone.utc),
                "reps": 0,
                "metrics_updates_count": 0,
            }

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        self.session_states.pop(session_id, None)

    async def send_json(self, session_id: str, data: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_text(json.dumps(data))


session_manager = ExerciseSessionManager()


def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Validate bearer token from WebSocket query parameter."""
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        import uuid
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        return db.query(User).filter(User.id == user_uuid, User.is_active == True).first()
    except Exception:
        return None


@ws_router.websocket("/ws/exercise-session/{session_id}")
async def exercise_session_websocket(
    websocket: WebSocket,
    session_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket channel for live patient exercise telemetry.
    Authenticates user, verifies session ownership, and streams structured metrics.
    """
    db = SessionLocal()
    try:
        # 1. Authenticate WebSocket Connection
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
            return

        user = get_user_from_token(token, db)
        if not user or user.role != UserRole.patient:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized user or invalid role")
            return

        patient = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        if not patient:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Patient profile not found")
            return

        # 2. Verify Session Existence and Ownership
        import uuid
        try:
            session_uuid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
        except ValueError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid session UUID")
            return

        session_obj = db.query(ExerciseSession).filter(ExerciseSession.id == session_uuid).first()
        if not session_obj:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found")
            return

        if session_obj.patient_profile_id != patient.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Forbidden: patient does not own this session")
            return

        # 3. Accept and register connection
        await session_manager.connect(session_id, websocket)

        # Notify client session is live and connected
        await session_manager.send_json(
            session_id,
            {
                "event": "SESSION_CONNECTED",
                "session_id": session_id,
                "status": "ACTIVE",
                "message": "Real-time telemetry channel established.",
            },
        )

        # 4. Message Handling Loop
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
                action = data.get("action")

                if action == "METRICS_UPDATE":
                    # Structured metric heartbeat (smooth current ROM, velocity, score)
                    msg = WsMetricsUpdateMessage(**data)
                    state = session_manager.session_states.get(session_id, {})
                    state["metrics_updates_count"] = state.get("metrics_updates_count", 0) + 1
                    state["last_score"] = msg.current_score
                    state["last_rom"] = msg.current_rom

                    # Broadcast acknowledgement back
                    await session_manager.send_json(
                        session_id,
                        {
                            "event": "METRICS_ACK",
                            "session_id": session_id,
                            "phase": msg.phase,
                            "reps_completed": msg.reps_completed,
                        },
                    )

                elif action == "REP_COMPLETED":
                    # Store discrete repetition metric record in PostgreSQL
                    rep_msg = WsRepCompletedMessage(**data)
                    metric = ExerciseMetric(
                        session_id=session_uuid,
                        rep_index=rep_msg.rep_number,
                        form_score=float(rep_msg.form_score),
                        rom_max_deg=float(rep_msg.peak_rom),
                        form_issues=rep_msg.feedback_cues,
                        valid=True,
                    )
                    db.add(metric)
                    db.commit()

                    await session_manager.send_json(
                        session_id,
                        {
                            "event": "REP_LOGGED",
                            "session_id": session_id,
                            "rep_number": rep_msg.rep_number,
                            "form_score": rep_msg.form_score,
                            "message": f"Rep {rep_msg.rep_number} verified and stored.",
                        },
                    )

                elif action == "SESSION_PAUSE":
                    state = session_manager.session_states.get(session_id, {})
                    state["status"] = "PAUSED"
                    await session_manager.send_json(
                        session_id,
                        {"event": "SESSION_PAUSED", "session_id": session_id, "status": "PAUSED"},
                    )

                elif action == "SESSION_RESUME":
                    state = session_manager.session_states.get(session_id, {})
                    state["status"] = "ACTIVE"
                    await session_manager.send_json(
                        session_id,
                        {"event": "SESSION_RESUMED", "session_id": session_id, "status": "ACTIVE"},
                    )

                elif action == "SESSION_END":
                    _ = WsSessionStateChangeMessage(**data)
                    session_obj = db.query(ExerciseSession).filter(ExerciseSession.id == session_uuid).first()
                    if session_obj:
                        session_obj.status = SessionStatus.completed
                        session_obj.ended_at = datetime.now(timezone.utc)
                        db.commit()

                    await session_manager.send_json(
                        session_id,
                        {
                            "event": "SESSION_ENDED",
                            "session_id": session_id,
                            "status": "COMPLETED",
                            "message": "Exercise session finalized and persisted.",
                        },
                    )
                    break

            except Exception as e:
                await session_manager.send_json(
                    session_id,
                    {"event": "ERROR", "session_id": session_id, "message": str(e)},
                )

    except WebSocketDisconnect:
        session_manager.disconnect(session_id)
    finally:
        session_manager.disconnect(session_id)
        db.close()
