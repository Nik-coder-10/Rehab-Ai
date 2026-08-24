"""Longitudinal Rehabilitation Progress & Recovery Score Engine.

Calculates:
1. Multi-factor Recovery Score (0 - 100)
2. Trend Classifications (IMPROVING, STABLE, DECLINING, INSUFFICIENT_DATA)
3. Longitudinal Metric Progression (ROM, Form Accuracy, Volume)
4. Prescribed Adherence Rate vs Target Frequency
5. Deterministic Clinical Alert Indicators (e.g. LOW_ADHERENCE, PERFORMANCE_DECLINE)
"""

import enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field


class TrendDirection(str, enum.Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class AlertCondition(str, enum.Enum):
    PERFORMANCE_DECLINE = "PERFORMANCE_DECLINE"
    LOW_ADHERENCE = "LOW_ADHERENCE"
    ROM_PLATEAU = "ROM_PLATEAU"
    REPEATED_FORM_ISSUES = "REPEATED_FORM_ISSUES"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class ConfidenceLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class HistoricalSessionSnapshot(BaseModel):
    session_id: str
    exercise_id: str
    exercise_name: str
    performed_at: datetime
    completed_reps: int
    target_reps: int = 10
    average_form_score: Optional[float] = None
    max_rom_deg: Optional[float] = None
    session_score: Optional[float] = None


class RecoveryScoreResult(BaseModel):
    recovery_score: int
    confidence: ConfidenceLevel
    confidence_value: float
    trend: TrendDirection
    adherence_percentage: int
    total_sessions_completed: int
    form_trend: TrendDirection
    rom_trend: TrendDirection
    active_alerts: List[AlertCondition]
    summary_insight: str


def compute_trend(values: List[float], min_delta_pct: float = 0.05) -> TrendDirection:
    """Determine trend direction using linear regression / endpoint comparison over window."""
    if len(values) < 2:
        return TrendDirection.INSUFFICIENT_DATA

    # Compare first half vs second half or start vs recent
    half = len(values) // 2
    if half == 0:
        first_avg = values[0]
        recent_avg = values[-1]
    else:
        first_avg = sum(values[:half]) / half
        recent_avg = sum(values[half:]) / (len(values) - half)

    if first_avg == 0:
        return TrendDirection.STABLE if recent_avg == 0 else TrendDirection.IMPROVING

    pct_change = (recent_avg - first_avg) / first_avg
    if pct_change >= min_delta_pct:
        return TrendDirection.IMPROVING
    elif pct_change <= -min_delta_pct:
        return TrendDirection.DECLINING
    else:
        return TrendDirection.STABLE


def calculate_recovery_score(
    sessions: List[HistoricalSessionSnapshot],
    target_weekly_sessions: int = 3,
    plan_start_date: Optional[datetime] = None,
) -> RecoveryScoreResult:
    """
    Calculates normalized Recovery Score (0 - 100) from historical database sessions.
    
    Formula:
    Recovery Score = (0.35 * Recent_Form) + (0.30 * Recent_ROM_Quality) + (0.20 * Adherence) + (0.15 * Trend_Bonus)
    """
    total_sessions = len(sessions)

    # 1. Handle Insufficient Data / Empty State
    if total_sessions == 0:
        return RecoveryScoreResult(
            recovery_score=50,  # Safe baseline default
            confidence=ConfidenceLevel.LOW,
            confidence_value=0.10,
            trend=TrendDirection.INSUFFICIENT_DATA,
            adherence_percentage=0,
            total_sessions_completed=0,
            form_trend=TrendDirection.INSUFFICIENT_DATA,
            rom_trend=TrendDirection.INSUFFICIENT_DATA,
            active_alerts=[AlertCondition.INSUFFICIENT_DATA],
            summary_insight="Begin prescribed exercise sessions to establish baseline rehabilitation metrics.",
        )

    # Sort chronological
    sorted_sessions = sorted(sessions, key=lambda s: s.performed_at)

    # 2. Form Quality Component (0 - 100)
    valid_form_scores = [s.average_form_score for s in sorted_sessions if s.average_form_score is not None]
    if valid_form_scores:
        recent_form = sum(valid_form_scores[-3:]) / len(valid_form_scores[-3:])
        form_trend = compute_trend(valid_form_scores)
    else:
        recent_form = 75.0
        form_trend = TrendDirection.INSUFFICIENT_DATA

    # 3. ROM Quality Component (0 - 100)
    valid_rom_scores = [s.max_rom_deg for s in sorted_sessions if s.max_rom_deg is not None]
    if valid_rom_scores:
        recent_rom_val = sum(valid_rom_scores[-3:]) / len(valid_rom_scores[-3:])
        # Normalized relative to standard 90° PT target
        rom_normalized = min(100.0, (recent_rom_val / 85.0) * 100.0)
        rom_trend = compute_trend(valid_rom_scores)
    else:
        rom_normalized = 75.0
        rom_trend = TrendDirection.INSUFFICIENT_DATA

    # 4. Adherence Calculation (Past 14 Days)
    now = datetime.now(timezone.utc)
    two_weeks_ago = now - timedelta(days=14)

    def is_within_14d(dt: datetime) -> bool:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt >= two_weeks_ago

    recent_sessions_count = sum(1 for s in sorted_sessions if is_within_14d(s.performed_at))
    expected_sessions_14d = max(1, target_weekly_sessions * 2)
    adherence_ratio = min(1.0, recent_sessions_count / expected_sessions_14d)
    adherence_percentage = int(round(adherence_ratio * 100))

    # 5. Trend Bonus Component (0 - 100)
    session_scores = [
        s.session_score if s.session_score is not None else ((s.average_form_score or 75.0) * 0.7 + 30.0)
        for s in sorted_sessions
    ]
    overall_trend = compute_trend(session_scores)

    trend_bonus = 75.0
    if overall_trend == TrendDirection.IMPROVING:
        trend_bonus = 95.0
    elif overall_trend == TrendDirection.DECLINING:
        trend_bonus = 50.0

    # 6. Composite Recovery Score (100 pts)
    raw_recovery_score = (
        (recent_form * 0.35)
        + (rom_normalized * 0.30)
        + (adherence_percentage * 0.20)
        + (trend_bonus * 0.15)
    )
    final_score = int(round(max(0, min(100, raw_recovery_score))))

    # 7. Confidence Rating
    if total_sessions >= 6:
        confidence = ConfidenceLevel.HIGH
        conf_val = 0.90
    elif total_sessions >= 3:
        confidence = ConfidenceLevel.MODERATE
        conf_val = 0.65
    else:
        confidence = ConfidenceLevel.LOW
        conf_val = 0.35

    # 8. Alert Indicators
    active_alerts: List[AlertCondition] = []
    if adherence_percentage < 50 and total_sessions >= 1:
        active_alerts.append(AlertCondition.LOW_ADHERENCE)
    if overall_trend == TrendDirection.DECLINING and total_sessions >= 3:
        active_alerts.append(AlertCondition.PERFORMANCE_DECLINE)
    if rom_trend == TrendDirection.STABLE and total_sessions >= 5 and rom_normalized < 70:
        active_alerts.append(AlertCondition.ROM_PLATEAU)

    # 9. Summary Insight
    if final_score >= 80:
        summary_insight = f"Excellent recovery trajectory (Score: {final_score}/100). Movement precision and Range of Motion remain strong."
    elif final_score >= 65:
        summary_insight = f"Consistent rehabilitation progress (Score: {final_score}/100). Maintaining weekly frequency will foster further ROM gains."
    else:
        summary_insight = f"Recovery score is {final_score}/100. Focus on completing all assigned sets and stabilizing joint control."

    return RecoveryScoreResult(
        recovery_score=final_score,
        confidence=confidence,
        confidence_value=conf_val,
        trend=overall_trend,
        adherence_percentage=adherence_percentage,
        total_sessions_completed=total_sessions,
        form_trend=form_trend,
        rom_trend=rom_trend,
        active_alerts=active_alerts,
        summary_insight=summary_insight,
    )
