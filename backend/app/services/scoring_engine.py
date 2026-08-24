"""Deterministic Rehabilitation Scoring Engine for RehabAI.

Calculates multi-dimensional rehabilitation scores from measured biomechanical metrics:
1. ROM Score (Target vs. Achieved ROM)
2. Form Accuracy Score (Joint Alignment & Posture)
3. Movement Control Score (Tempo & Velocity Stability)
4. Completion / Adherence Score (Completed vs. Target Repetitions)
5. Metric Confidence Score (Landmark Visibility & Tracking Quality)

Final Formula:
Exercise Score (100) = (ROM_Weight * ROM_Score) + (Form_Weight * Form_Score) + (Control_Weight * Control_Score) + (Stability_Weight * Stability_Score)
Session Score (100) = (Exercise_Score * 0.70) + (Completion_Score * 0.30)
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ExerciseScoringWeights(BaseModel):
    rom_weight: float = 0.30
    form_weight: float = 0.25
    control_weight: float = 0.20
    stability_weight: float = 0.10
    completion_weight: float = 0.15


class RawRepMetrics(BaseModel):
    rep_number: int
    form_score: float = 100.0
    peak_rom_deg: float = 0.0
    duration_seconds: float = 2.0
    velocity_deg_per_sec: float = 80.0
    visibility_score: float = 1.0
    is_valid: bool = True
    issues: List[str] = Field(default_factory=list)


class SessionScoringInput(BaseModel):
    exercise_code: str
    target_reps: int = 10
    target_rom_deg: float = 85.0
    rep_metrics: List[RawRepMetrics] = Field(default_factory=list)
    average_visibility: float = 1.0
    scoring_weights: Optional[ExerciseScoringWeights] = None


class SessionScoreBreakdown(BaseModel):
    session_score: float
    exercise_quality_score: float
    rom_score: float
    form_score: float
    control_score: float
    stability_score: float
    completion_score: float
    confidence_score: float
    reps_completed: int
    target_reps: int
    summary_explanation: str
    feedback_highlights: List[str]


def calculate_rom_score(achieved_rom: float, target_rom: float) -> float:
    """Calculate normalized ROM score (0 - 100) against prescribed target."""
    if target_rom <= 0:
        return 100.0
    if achieved_rom <= 0:
        return 0.0

    ratio = achieved_rom / target_rom
    if ratio >= 1.0:
        # Full ROM achieved
        return 100.0
    elif ratio >= 0.80:
        # 80% to 100% target ROM
        return 80.0 + (ratio - 0.80) / 0.20 * 20.0
    elif ratio >= 0.50:
        # 50% to 80% target ROM
        return 40.0 + (ratio - 0.50) / 0.30 * 40.0
    else:
        # Sub-50% ROM
        return max(0.0, ratio / 0.50 * 40.0)


def calculate_control_score(reps: List[RawRepMetrics]) -> float:
    """Calculate movement tempo and velocity control score (0 - 100)."""
    if not reps:
        return 100.0

    total_control = 0.0
    for r in reps:
        # Ideal PT tempo is between 40 deg/s and 120 deg/s
        v = r.velocity_deg_per_sec
        if 30.0 <= v <= 110.0:
            rep_control = 100.0
        elif v < 30.0:
            rep_control = max(60.0, 100.0 - (30.0 - v) * 2.0)
        else:
            rep_control = max(30.0, 100.0 - (v - 110.0) * 1.2)
        total_control += rep_control

    return round(total_control / len(reps), 1)


def calculate_stability_score(reps: List[RawRepMetrics]) -> float:
    """Calculate consistency and absence of form jerkiness (0 - 100)."""
    if not reps:
        return 100.0

    penalties = 0.0
    for r in reps:
        issue_count = len(r.issues)
        penalties += min(50.0, issue_count * 12.0)

    avg_penalty = penalties / len(reps)
    return max(0.0, min(100.0, round(100.0 - avg_penalty, 1)))


def calculate_deterministic_session_score(data: SessionScoringInput) -> SessionScoreBreakdown:
    """
    Deterministically evaluates full rehabilitation session quality from physical measurements.
    Guarantees output within [0, 100] and produces clinical explanatory coaching feedback.
    """
    weights = data.scoring_weights or ExerciseScoringWeights()
    reps = [r for r in data.rep_metrics if r.is_valid]
    reps_count = len(reps)
    target_reps = max(1, data.target_reps)

    # 1. Completion / Adherence Component (0 - 100)
    completion_ratio = min(1.0, reps_count / target_reps)
    completion_score = round(completion_ratio * 100.0, 1)

    # Empty Session Safe Fallback
    if reps_count == 0:
        return SessionScoreBreakdown(
            session_score=0.0,
            exercise_quality_score=0.0,
            rom_score=0.0,
            form_score=0.0,
            control_score=0.0,
            stability_score=0.0,
            completion_score=0.0,
            confidence_score=0.0,
            reps_completed=0,
            target_reps=target_reps,
            summary_explanation="No valid exercise repetitions were recorded in this session.",
            feedback_highlights=["Ensure full body visibility and perform full repetitions."],
        )

    # 2. ROM Score Component
    avg_peak_rom = sum(r.peak_rom_deg for r in reps) / reps_count
    rom_score = round(calculate_rom_score(avg_peak_rom, data.target_rom_deg), 1)

    # 3. Form Accuracy Score Component
    form_score = round(sum(r.form_score for r in reps) / reps_count, 1)

    # 4. Movement Control Score Component
    control_score = calculate_control_score(reps)

    # 5. Stability Score Component
    stability_score = calculate_stability_score(reps)

    # 6. Normalized Exercise Quality Score (100 pts)
    # Sum of weighted kinematic dimensions
    total_weights = weights.rom_weight + weights.form_weight + weights.control_weight + weights.stability_weight
    if total_weights <= 0:
        total_weights = 1.0

    exercise_quality_score = round(
        (
            (rom_score * weights.rom_weight)
            + (form_score * weights.form_weight)
            + (control_score * weights.control_weight)
            + (stability_score * weights.stability_weight)
        )
        / total_weights,
        1,
    )
    exercise_quality_score = max(0.0, min(100.0, exercise_quality_score))

    # 7. Composite Session Score (100 pts)
    # 70% movement quality + 30% prescription target completion
    session_score = round((exercise_quality_score * 0.70) + (completion_score * 0.30), 1)
    session_score = max(0.0, min(100.0, session_score))

    # 8. Measurement Confidence Score (0.00 - 1.00)
    # Weighted by landmark visibility and sample size
    sample_factor = min(1.0, reps_count / max(3, target_reps * 0.5))
    visibility_factor = max(0.0, min(1.0, data.average_visibility))
    confidence_score = round((visibility_factor * 0.7) + (sample_factor * 0.3), 2)

    # 9. Deterministic Patient-Facing Explanation
    feedback_highlights: List[str] = []
    for r in reps:
        for issue in r.issues:
            if issue not in feedback_highlights:
                feedback_highlights.append(issue)

    if session_score >= 85:
        summary_explanation = f"Outstanding session! You completed {reps_count} of {target_reps} target repetitions with excellent form and controlled range of motion."
    elif session_score >= 70:
        summary_explanation = f"Strong workout progress. You achieved {reps_count} of {target_reps} reps ({round(avg_peak_rom, 1)}° avg ROM) with solid biomechanical control."
    elif session_score >= 50:
        summary_explanation = f"Moderate session completed ({reps_count}/{target_reps} reps). Focus on increasing depth and stabilizing tempo on upcoming sets."
    else:
        summary_explanation = f"Session logged with {reps_count}/{target_reps} reps completed. Aim for higher range of motion and smoother movement control."

    if not feedback_highlights:
        feedback_highlights = ["Clean movement mechanics across all counted repetitions."]

    return SessionScoreBreakdown(
        session_score=session_score,
        exercise_quality_score=exercise_quality_score,
        rom_score=rom_score,
        form_score=form_score,
        control_score=control_score,
        stability_score=stability_score,
        completion_score=completion_score,
        confidence_score=confidence_score,
        reps_completed=reps_count,
        target_reps=target_reps,
        summary_explanation=summary_explanation,
        feedback_highlights=feedback_highlights[:3],
    )
