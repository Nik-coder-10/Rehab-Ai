/**
 * Straight Leg Raise Biomechanical Analyzer
 * Primary Joint: Right / Left Hip (Hip flexion angle relative to torso)
 *
 * Sequence: SUPINE (Straight leg ~175°) -> RAISING -> PEAK_ELEVATION (<= 135° angle, ~45° lift) -> LOWERING -> SUPINE
 */
import { BaseExerciseAnalyzer } from '../core/BaseExerciseAnalyzer';
import type { ExerciseConfig, ExerciseRepRecord } from '../core/types';

export class LegRaiseAnalyzer extends BaseExerciseAnalyzer {
  public readonly config: ExerciseConfig = {
    code: 'leg_raise',
    name: 'Straight Leg Raise',
    targetJoints: ['RIGHT_HIP', 'LEFT_HIP', 'RIGHT_KNEE'],
    primaryJoint: 'RIGHT_HIP',
    secondaryJoint: 'RIGHT_KNEE',
    thresholds: {
      flatAngle: 175.0,          // Leg flat on surface (hip extended ~175°)
      raisingThreshold: 160.0,   // Active hip flexion initiation
      targetElevation: 135.0,    // 45° angle off horizontal (~135° internal hip angle)
      minElevationThreshold: 150.0, // Minimum lift acceptable
    },
  };

  private minHipAngle: number = 180;
  private repStartTime: number = 0;

  protected stepStateMachine(
    hipAngle: number,
    _velocity: number,
    timestampMs: number,
    kneeAngle?: number
  ): void {
    const t = this.config.thresholds;

    switch (this.currentPhase) {
      case 'STARTING':
      case 'SUPINE':
        if (hipAngle < t.raisingThreshold) {
          this.currentPhase = 'RAISING';
          this.repStartTime = timestampMs;
          this.minHipAngle = hipAngle;
          this.setFeedback('Lifting straight leg. Engage core muscles.', timestampMs);
        }
        break;

      case 'RAISING':
        if (hipAngle < this.minHipAngle) {
          this.minHipAngle = hipAngle;
        }

        if (hipAngle <= t.targetElevation) {
          this.currentPhase = 'PEAK_ELEVATION';
          this.setFeedback('Great leg lift! Hold momentarily and lower smoothly.', timestampMs);
        } else if (hipAngle > this.minHipAngle + 8.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Lowering leg...', timestampMs);
        }
        break;

      case 'PEAK_ELEVATION':
        if (hipAngle > t.targetElevation + 6.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Lowering leg with control.', timestampMs);
        }
        break;

      case 'LOWERING':
        if (hipAngle >= t.flatAngle - 8.0) {
          if (this.minHipAngle <= t.minElevationThreshold) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.repStartTime) / 1000);

            let score = 100;
            const cues: string[] = [];

            if (this.minHipAngle > t.targetElevation + 8.0) {
              score -= 20;
              cues.push('Aim for 45° elevation off the ground.');
            }
            if (kneeAngle && kneeAngle < 160) {
              score -= 20;
              cues.push('Keep knee locked straight during the entire leg raise.');
            }

            if (cues.length === 0) cues.push('Clean straight leg raise technique!');

            const repRecord: ExerciseRepRecord = {
              repNumber: this.repCount,
              formScore: Math.max(40, score),
              peakRom: Math.round((180 - this.minHipAngle) * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: cues,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(cues[0], timestampMs, true);
          } else {
            this.setFeedback('Lift leg higher before returning to ground.', timestampMs, true);
          }

          this.currentPhase = 'SUPINE';
        }
        break;
    }
  }

  public override reset(): void {
    super.reset();
    this.minHipAngle = 180;
    this.repStartTime = 0;
  }
}
