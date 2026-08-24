"""Deterministic Adaptive Rehabilitation Engine.

Analyzes longitudinal patient metrics and active prescription protocols to generate
evidence-backed, AI-assisted progression/regression recommendations for physician review.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.recommendation import RecommendationType, RecommendationStatus
from app.services.recovery_engine import HistoricalSessionSnapshot, TrendDirection, calculate_recovery_score


class AdaptiveRuleEvidence(BaseModel):
    total_sessions: int
    recent_form_avg: float
    recent_rom_avg: float
    target_rom: float
    adherence_rate: int
    trend: TrendDirection
    confidence_score: float
    reasons: List[str]


class GeneratedRecommendation(BaseModel):
    recommendation_type: RecommendationType
    title: str
    clinical_rationale: str
    patient_message: str
    suggested_changes: Dict[str, Any]
    evidence: AdaptiveRuleEvidence
    confidence_score: float


class AdaptiveRehabilitationEngine:
    """Deterministic rule-based clinical recommendation evaluator."""

    @staticmethod
    def evaluate_patient_progression(
        sessions: List[HistoricalSessionSnapshot],
        current_target_reps: int = 10,
        current_target_sets: int = 3,
        prescribed_target_rom: float = 85.0,
        target_weekly_frequency: int = 3,
    ) -> GeneratedRecommendation:
        """
        Evaluates historical sessions and produces a transparent progression recommendation.
        """
        recovery = calculate_recovery_score(sessions, target_weekly_sessions=target_weekly_frequency)
        valid_sessions = [s for s in sessions if s.completed_reps > 0]
        total_sessions = len(valid_sessions)

        # 1. Check for Insufficient Data
        if total_sessions < 2:
            return GeneratedRecommendation(
                recommendation_type=RecommendationType.INSUFFICIENT_DATA,
                title="Baseline Data Collection",
                clinical_rationale="Patient has completed fewer than 2 sessions. Recommend continuing current baseline protocol until sufficient biometric data is recorded.",
                patient_message="Keep following your assigned plan so your physiotherapist can track your initial baseline progress.",
                suggested_changes={"target_reps": current_target_reps, "target_sets": current_target_sets},
                evidence=AdaptiveRuleEvidence(
                    total_sessions=total_sessions,
                    recent_form_avg=0.0,
                    recent_rom_avg=0.0,
                    target_rom=prescribed_target_rom,
                    adherence_rate=recovery.adherence_percentage,
                    trend=TrendDirection.INSUFFICIENT_DATA,
                    confidence_score=recovery.confidence_value,
                    reasons=["Insufficient historical session volume (< 2 sessions)"],
                ),
                confidence_score=recovery.confidence_value,
            )

        # Calculate recent averages (last 3 sessions)
        recent_sessions = valid_sessions[-3:]
        form_scores = [s.average_form_score for s in recent_sessions if s.average_form_score is not None]
        rom_scores = [s.max_rom_deg for s in recent_sessions if s.max_rom_deg is not None]

        recent_form_avg = round(sum(form_scores) / len(form_scores), 1) if form_scores else 75.0
        recent_rom_avg = round(sum(rom_scores) / len(rom_scores), 1) if rom_scores else 75.0

        reasons: List[str] = []

        # 2. Rule 1: High Form + Adequate ROM + Improving Trend -> Candidate for Progression
        if (
            recent_form_avg >= 85.0
            and recent_rom_avg >= prescribed_target_rom * 0.90
            and recovery.adherence_percentage >= 70
            and recovery.trend in [TrendDirection.IMPROVING, TrendDirection.STABLE]
        ):
            new_target_reps = current_target_reps + 2
            reasons.append(f"High movement form quality ({recent_form_avg}% average)")
            reasons.append(f"Achieved ROM ({recent_rom_avg}°) meets clinical prescription ({prescribed_target_rom}°)")
            reasons.append(f"Consistent weekly compliance ({recovery.adherence_percentage}% adherence)")

            return GeneratedRecommendation(
                recommendation_type=RecommendationType.INCREASE_REPETITIONS,
                title="Protocol Progression: Increase Repetitions",
                clinical_rationale=f"Patient demonstrated high movement fidelity ({recent_form_avg}% form, {recent_rom_avg}° ROM) with high adherence. Recommend progressing volume from {current_target_reps} to {new_target_reps} reps.",
                patient_message="Your recent sessions show improved movement quality and range of motion. Your physiotherapist has been notified that you may be ready for the next progression.",
                suggested_changes={"target_reps": new_target_reps, "target_sets": current_target_sets},
                evidence=AdaptiveRuleEvidence(
                    total_sessions=total_sessions,
                    recent_form_avg=recent_form_avg,
                    recent_rom_avg=recent_rom_avg,
                    target_rom=prescribed_target_rom,
                    adherence_rate=recovery.adherence_percentage,
                    trend=recovery.trend,
                    confidence_score=recovery.confidence_value,
                    reasons=reasons,
                ),
                confidence_score=recovery.confidence_value,
            )

        # 3. Rule 2: Declining Performance or Low Adherence -> Physician Review (Priority safety rule)
        if recovery.trend == TrendDirection.DECLINING or recovery.adherence_percentage < 40:
            if recovery.trend == TrendDirection.DECLINING:
                reasons.append("Downward longitudinal performance trajectory over past workouts")
            if recovery.adherence_percentage < 40:
                reasons.append(f"Low weekly session adherence ({recovery.adherence_percentage}%)")

            return GeneratedRecommendation(
                recommendation_type=RecommendationType.REVIEW_BY_DOCTOR,
                title="Clinical Follow-Up: Review Protocol",
                clinical_rationale="Downward performance trend or low adherence observed. Recommend physical therapist follow-up to evaluate pain, fatigue, or prescription difficulty.",
                patient_message="Your rehabilitation log has been shared with your care team to ensure your exercise plan stays comfortable and effective.",
                suggested_changes={"target_reps": current_target_reps, "target_sets": current_target_sets},
                evidence=AdaptiveRuleEvidence(
                    total_sessions=total_sessions,
                    recent_form_avg=recent_form_avg,
                    recent_rom_avg=recent_rom_avg,
                    target_rom=prescribed_target_rom,
                    adherence_rate=recovery.adherence_percentage,
                    trend=recovery.trend,
                    confidence_score=recovery.confidence_value,
                    reasons=reasons,
                ),
                confidence_score=recovery.confidence_value,
            )

        # 4. Rule 3: Sub-optimal Form (< 75%) with Adequate ROM -> Focus on Form & Technique
        if recent_form_avg < 75.0:
            reasons.append(f"Form accuracy score ({recent_form_avg}%) is below clinical target threshold (75%)")
            reasons.append("Kinematic compensation or alignment drift observed across recent sets")

            return GeneratedRecommendation(
                recommendation_type=RecommendationType.FOCUS_ON_FORM,
                title="Technique Cueing: Focus on Form & Tempo",
                clinical_rationale=f"Patient is achieving movement volume but exhibits alignment/tempo errors (avg form: {recent_form_avg}%). Recommend maintaining {current_target_reps} reps while prioritizing slower controlled tempo.",
                patient_message="Focus on slow, controlled repetitions on your upcoming sets to maximize joint stability.",
                suggested_changes={"target_reps": current_target_reps, "target_sets": current_target_sets, "tempo_focus": True},
                evidence=AdaptiveRuleEvidence(
                    total_sessions=total_sessions,
                    recent_form_avg=recent_form_avg,
                    recent_rom_avg=recent_rom_avg,
                    target_rom=prescribed_target_rom,
                    adherence_rate=recovery.adherence_percentage,
                    trend=recovery.trend,
                    confidence_score=recovery.confidence_value,
                    reasons=reasons,
                ),
                confidence_score=recovery.confidence_value,
            )

        # 5. Rule 4: Standard Maintenance
        reasons.append(f"Movement quality ({recent_form_avg}%) and ROM ({recent_rom_avg}°) are stable within expected target envelope")
        return GeneratedRecommendation(
            recommendation_type=RecommendationType.MAINTAIN_DIFFICULTY,
            title="Protocol Maintenance: On Track",
            clinical_rationale=f"Patient is performing consistently at current prescription level ({current_target_reps} reps, {recent_form_avg}% form). Recommend continuing current volume.",
            patient_message="You are making steady progress on your rehabilitation plan. Continue with your scheduled exercises.",
            suggested_changes={"target_reps": current_target_reps, "target_sets": current_target_sets},
            evidence=AdaptiveRuleEvidence(
                total_sessions=total_sessions,
                recent_form_avg=recent_form_avg,
                recent_rom_avg=recent_rom_avg,
                target_rom=prescribed_target_rom,
                adherence_rate=recovery.adherence_percentage,
                trend=recovery.trend,
                confidence_score=recovery.confidence_value,
                reasons=reasons,
            ),
            confidence_score=recovery.confidence_value,
        )
