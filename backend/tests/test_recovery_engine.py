"""Deterministic Unit & Integration tests for the Longitudinal Recovery Engine."""

import pytest
from datetime import datetime, timedelta, timezone
from app.services.recovery_engine import (
    HistoricalSessionSnapshot,
    RecoveryScoreResult,
    TrendDirection,
    ConfidenceLevel,
    AlertCondition,
    calculate_recovery_score,
    compute_trend,
)


def test_empty_sessions_fallback():
    """Verify 0-session patient gracefully defaults to baseline with INSUFFICIENT_DATA."""
    res = calculate_recovery_score([])
    assert res.recovery_score == 50
    assert res.confidence == ConfidenceLevel.LOW
    assert res.trend == TrendDirection.INSUFFICIENT_DATA
    assert AlertCondition.INSUFFICIENT_DATA in res.active_alerts


def test_single_session_low_confidence():
    """Verify single-session patient generates valid score with LOW confidence."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id="s1",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now,
            completed_reps=10,
            target_reps=10,
            average_form_score=90.0,
            max_rom_deg=85.0,
        )
    ]

    res = calculate_recovery_score(sessions)
    assert res.total_sessions_completed == 1
    assert 0 <= res.recovery_score <= 100
    assert res.confidence == ConfidenceLevel.LOW
    assert res.trend == TrendDirection.INSUFFICIENT_DATA


def test_improving_trend_with_high_adherence():
    """Verify 6 consecutive improving sessions yield HIGH confidence and IMPROVING trend."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id=f"s{i}",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now - timedelta(days=12 - (i * 2)),
            completed_reps=10,
            target_reps=10,
            average_form_score=70.0 + (i * 5.0), # 70 -> 95
            max_rom_deg=65.0 + (i * 4.0),       # 65 -> 85
            session_score=65.0 + (i * 6.0),
        )
        for i in range(6)
    ]

    res = calculate_recovery_score(sessions)
    assert res.total_sessions_completed == 6
    assert res.confidence == ConfidenceLevel.HIGH
    assert res.trend == TrendDirection.IMPROVING
    assert res.form_trend == TrendDirection.IMPROVING
    assert res.rom_trend == TrendDirection.IMPROVING
    assert res.recovery_score >= 80
    assert "Excellent" in res.summary_insight


def test_declining_trend_triggers_alert():
    """Verify declining performance triggers PERFORMANCE_DECLINE alert."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id=f"s{i}",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now - timedelta(days=10 - (i * 2)),
            completed_reps=10,
            target_reps=10,
            average_form_score=95.0 - (i * 8.0), # 95 -> 63
            max_rom_deg=90.0 - (i * 6.0),
            session_score=95.0 - (i * 9.0),
        )
        for i in range(5)
    ]

    res = calculate_recovery_score(sessions)
    assert res.trend == TrendDirection.DECLINING
    assert AlertCondition.PERFORMANCE_DECLINE in res.active_alerts


def test_trend_calculation_rejects_micro_fluctuations():
    """Verify small random noise (< 5%) is classified as STABLE."""
    noisy_values = [80.0, 81.0, 79.5, 80.5, 80.0]
    assert compute_trend(noisy_values) == TrendDirection.STABLE
