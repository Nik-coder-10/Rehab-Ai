"""Deterministic unit tests for the Adaptive Rehabilitation Engine."""

import pytest
from datetime import datetime, timedelta, timezone
from app.services.adaptive_engine import (
    AdaptiveRehabilitationEngine,
    HistoricalSessionSnapshot,
    RecommendationType,
)


def test_insufficient_data_rule():
    """Verify patient with 0 or 1 session receives INSUFFICIENT_DATA recommendation."""
    rec = AdaptiveRehabilitationEngine.evaluate_patient_progression(
        sessions=[],
        current_target_reps=10,
        current_target_sets=3,
        prescribed_target_rom=85.0,
    )
    assert rec.recommendation_type == RecommendationType.INSUFFICIENT_DATA
    assert rec.suggested_changes["target_reps"] == 10


def test_progression_rule_increase_reps():
    """Verify strong form (>85%), full ROM, and high adherence produces INCREASE_REPETITIONS."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id=f"s{i}",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now - timedelta(days=10 - (i * 2)),
            completed_reps=10,
            target_reps=10,
            average_form_score=92.0,  # > 85%
            max_rom_deg=88.0,        # > 85.0 target
            session_score=95.0,
        )
        for i in range(5)
    ]

    rec = AdaptiveRehabilitationEngine.evaluate_patient_progression(
        sessions=sessions,
        current_target_reps=10,
        current_target_sets=3,
        prescribed_target_rom=85.0,
    )

    assert rec.recommendation_type == RecommendationType.INCREASE_REPETITIONS
    assert rec.suggested_changes["target_reps"] == 12  # Progressed from 10 to 12
    assert "High movement form quality" in rec.evidence.reasons[0]


def test_form_focus_rule():
    """Verify sub-optimal form (< 75%) produces FOCUS_ON_FORM recommendation."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id=f"s{i}",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now - timedelta(days=8 - (i * 2)),
            completed_reps=10,
            target_reps=10,
            average_form_score=68.0,  # Below 75%
            max_rom_deg=85.0,
            session_score=70.0,
        )
        for i in range(4)
    ]

    rec = AdaptiveRehabilitationEngine.evaluate_patient_progression(
        sessions=sessions,
        current_target_reps=10,
        current_target_sets=3,
        prescribed_target_rom=85.0,
    )

    assert rec.recommendation_type == RecommendationType.FOCUS_ON_FORM
    assert rec.suggested_changes["target_reps"] == 10  # Volume maintained
    assert rec.suggested_changes.get("tempo_focus") is True


def test_declining_trend_rule_doctor_review():
    """Verify declining performance produces REVIEW_BY_DOCTOR."""
    now = datetime.now(timezone.utc)
    sessions = [
        HistoricalSessionSnapshot(
            session_id=f"s{i}",
            exercise_id="e1",
            exercise_name="Squat",
            performed_at=now - timedelta(days=10 - (i * 2)),
            completed_reps=10,
            target_reps=10,
            average_form_score=90.0 - (i * 10.0), # 90 -> 50
            max_rom_deg=85.0 - (i * 8.0),
            session_score=90.0 - (i * 12.0),
        )
        for i in range(4)
    ]

    rec = AdaptiveRehabilitationEngine.evaluate_patient_progression(
        sessions=sessions,
        current_target_reps=10,
        current_target_sets=3,
        prescribed_target_rom=85.0,
    )

    assert rec.recommendation_type == RecommendationType.REVIEW_BY_DOCTOR
