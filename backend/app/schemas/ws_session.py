"""Pydantic schemas for WebSocket telemetry and exercise session lifecycle."""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class WsSessionStartMessage(BaseModel):
    action: str = "SESSION_START"
    session_id: str
    exercise_id: str
    target_reps: Optional[int] = 10


class WsMetricsUpdateMessage(BaseModel):
    action: str = "METRICS_UPDATE"
    session_id: str
    timestamp_ms: float
    current_angle: float
    current_rom: float
    current_velocity: float
    phase: str
    current_score: int
    active_feedback: str
    reps_completed: int


class WsRepCompletedMessage(BaseModel):
    action: str = "REP_COMPLETED"
    session_id: str
    rep_number: int
    form_score: int
    peak_rom: float
    duration_seconds: float
    feedback_cues: List[str] = Field(default_factory=list)
    timestamp_ms: float


class WsSessionStateChangeMessage(BaseModel):
    action: str  # "SESSION_PAUSE", "SESSION_RESUME", "SESSION_END"
    session_id: str
    completed_reps: Optional[int] = 0
    average_form_score: Optional[float] = 100.0
    max_rom: Optional[float] = 0.0
    feedback_summary: Optional[List[str]] = Field(default_factory=list)


class WsServerEventMessage(BaseModel):
    event: str
    session_id: str
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
