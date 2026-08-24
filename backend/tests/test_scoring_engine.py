"""Deterministic tests for the Rehabilitation Scoring Engine."""

import pytest
from app.services.scoring_engine import (
    SessionScoringInput,
    RawRepMetrics,
    ExerciseScoringWeights,
    calculate_rom_score,
    calculate_control_score,
    calculate_stability_score,
    calculate_deterministic_session_score,
)


def test_perfect_exercise_session():
    """Verify perfect execution yields maximum scores (~100) and confidence."""
    reps = [
        RawRepMetrics(
            rep_number=i + 1,
            form_score=100.0,
            peak_rom_deg=90.0,
            velocity_deg_per_sec=75.0,
            duration_seconds=2.2,
            visibility_score=1.0,
            is_valid=True,
            issues=[],
        )
        for i in range(10)
    ]

    inp = SessionScoringInput(
        exercise_code="squat",
        target_reps=10,
        target_rom_deg=90.0,
        rep_metrics=reps,
        average_visibility=1.0,
    )

    result = calculate_deterministic_session_score(inp)

    assert result.session_score == 100.0
    assert result.exercise_quality_score == 100.0
    assert result.rom_score == 100.0
    assert result.form_score == 100.0
    assert result.control_score == 100.0
    assert result.completion_score == 100.0
    assert result.confidence_score >= 0.95
    assert "Outstanding" in result.summary_explanation


def test_poor_rom_penalizes_rom_score():
    """Verify suboptimal ROM appropriately scales down the ROM component."""
    # Target 100°, patient only achieves 50°
    assert calculate_rom_score(50.0, 100.0) == 40.0
    assert calculate_rom_score(90.0, 100.0) == 90.0
    assert calculate_rom_score(110.0, 100.0) == 100.0


def test_poor_form_penalizes_form_score():
    """Verify repeated alignment faults reduce form score."""
    reps = [
        RawRepMetrics(
            rep_number=1,
            form_score=60.0,
            peak_rom_deg=85.0,
            issues=["Knee valgus detected", "Torso forward lean"],
        ),
        RawRepMetrics(
            rep_number=2,
            form_score=65.0,
            peak_rom_deg=85.0,
            issues=["Knee valgus detected"],
        ),
    ]

    inp = SessionScoringInput(
        exercise_code="squat",
        target_reps=2,
        target_rom_deg=85.0,
        rep_metrics=reps,
    )

    result = calculate_deterministic_session_score(inp)
    assert result.form_score == 62.5
    assert result.stability_score < 85.0
    assert "Knee valgus detected" in result.feedback_highlights


def test_incomplete_repetitions_reduces_completion_score():
    """Verify completing only 3 of 10 target reps yields 30% completion score."""
    reps = [
        RawRepMetrics(rep_number=i + 1, form_score=100.0, peak_rom_deg=85.0)
        for i in range(3)
    ]

    inp = SessionScoringInput(
        exercise_code="bicep_curl",
        target_reps=10,
        target_rom_deg=85.0,
        rep_metrics=reps,
    )

    result = calculate_deterministic_session_score(inp)
    assert result.completion_score == 30.0
    assert result.session_score < result.exercise_quality_score


def test_empty_session_safe_handling():
    """Verify empty/zero-rep sessions return safe 0 scores without NaN or crash."""
    inp = SessionScoringInput(
        exercise_code="squat",
        target_reps=10,
        target_rom_deg=85.0,
        rep_metrics=[],
    )

    result = calculate_deterministic_session_score(inp)
    assert result.session_score == 0.0
    assert result.confidence_score == 0.0
    assert result.reps_completed == 0


def test_score_boundaries_always_within_0_to_100():
    """Verify bounds guarantee for extreme values."""
    extreme_reps = [
        RawRepMetrics(
            rep_number=1,
            form_score=150.0,       # Extreme overshoot
            peak_rom_deg=500.0,
            velocity_deg_per_sec=999.0,
            issues=["A", "B", "C", "D", "E", "F", "G"],
        )
    ]

    inp = SessionScoringInput(
        exercise_code="squat",
        target_reps=1,
        target_rom_deg=85.0,
        rep_metrics=extreme_reps,
    )

    result = calculate_deterministic_session_score(inp)
    assert 0.0 <= result.session_score <= 100.0
    assert 0.0 <= result.exercise_quality_score <= 100.0
    assert 0.0 <= result.confidence_score <= 1.0
