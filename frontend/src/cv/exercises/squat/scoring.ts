/**
 * Transparent Biomechanical Scoring Engine for Squats
 *
 * Scoring Formula:
 * Form Score (100 pts) = Depth (35 pts) + Control/Speed (25 pts) + Torso Stability (20 pts) + Knee Alignment (20 pts)
 */
import type { SquatFormMetrics, SquatThresholds } from './types';

export interface SquatScoreBreakdown {
  totalScore: number;
  depthScore: number;
  speedScore: number;
  torsoScore: number;
  alignmentScore: number;
  feedbackList: string[];
}

export function evaluateSquatForm(
  metrics: SquatFormMetrics,
  thresholds: SquatThresholds
): SquatScoreBreakdown {
  const feedbackList: string[] = [];

  // 1. Depth & ROM Component (35 points)
  // Target bottom angle <= 100° gives 35 pts. Between 100° and 125° scales proportionally. > 125° gives penalty.
  let depthScore = 35;
  if (metrics.kneeDepthAngle <= thresholds.bottomKneeAngle) {
    depthScore = 35;
  } else if (metrics.kneeDepthAngle <= thresholds.minDepthThreshold) {
    // Proportional between 100° and 115°
    const ratio = (thresholds.minDepthThreshold - metrics.kneeDepthAngle) / (thresholds.minDepthThreshold - thresholds.bottomKneeAngle);
    depthScore = Math.round(20 + ratio * 15);
    feedbackList.push('Aim for slightly more depth on your squat descent.');
  } else if (metrics.kneeDepthAngle <= 130) {
    depthScore = 15;
    feedbackList.push('Squat depth was shallow. Try sinking hips back and down.');
  } else {
    depthScore = 5;
    feedbackList.push('Incomplete depth reached.');
  }

  // 2. Descent Control & Tempo Component (25 points)
  // Controlled descent speed <= 140 deg/s gives 25 pts. Uncontrolled drop gets penalized.
  let speedScore = 25;
  if (metrics.descentVelocity <= 110) {
    speedScore = 25;
  } else if (metrics.descentVelocity <= thresholds.maxDescentSpeed) {
    speedScore = 18;
  } else {
    speedScore = 10;
    feedbackList.push('Slow down your descent to maintain joint control.');
  }

  // 3. Torso Posture & Spine Stability Component (20 points)
  // Excessive forward torso lean > 45° gets penalized
  let torsoScore = 20;
  if (metrics.torsoInclinationAngle <= 30) {
    torsoScore = 20;
  } else if (metrics.torsoInclinationAngle <= 45) {
    torsoScore = 14;
    feedbackList.push('Keep your chest proud and avoid excessive forward lean.');
  } else {
    torsoScore = 8;
    feedbackList.push('Keep your torso upright and core engaged.');
  }

  // 4. Knee-to-Ankle Alignment & Valgus Component (20 points)
  let alignmentScore = 20;
  if (metrics.isKneeAligned) {
    alignmentScore = 20;
  } else {
    alignmentScore = 10;
    feedbackList.push('Try keeping your knees aligned over your toes.');
  }

  const totalScore = Math.max(0, Math.min(100, depthScore + speedScore + torsoScore + alignmentScore));

  if (feedbackList.length === 0) {
    feedbackList.push('Excellent repetition form!');
  }

  return {
    totalScore,
    depthScore,
    speedScore,
    torsoScore,
    alignmentScore,
    feedbackList,
  };
}
