/**
 * Shoulder Abduction Biomechanical Analyzer
 * Primary Joint: Right / Left Shoulder (Arm elevation relative to torso line)
 *
 * Sequence: ADDUCTION (Starting at side <= 25°) -> ABDUCTING -> PEAK_ELEVATION (>= 90°) -> ADDUCTING -> ADDUCTION
 */
import { BaseExerciseAnalyzer } from '../core/BaseExerciseAnalyzer';
import type { ExerciseConfig, ExerciseRepRecord } from '../core/types';

export class ShoulderAbductionAnalyzer extends BaseExerciseAnalyzer {
  public readonly config: ExerciseConfig = {
    code: 'shoulder_abduction',
    name: 'Shoulder Abduction',
    targetJoints: ['RIGHT_SHOULDER', 'LEFT_SHOULDER', 'RIGHT_ELBOW'],
    primaryJoint: 'RIGHT_SHOULDER',
    secondaryJoint: 'RIGHT_ELBOW',
    thresholds: {
      startingAngle: 30.0,       // Arm resting along torso
      raisingThreshold: 45.0,    // Lateral raise initiated
      targetElevation: 90.0,     // Target 90° lateral plane
      minElevationThreshold: 75.0,// Min height for valid rep
      maxElevationLimit: 170.0,  // Full vertical overhead
    },
  };

  private maxShoulderAngle: number = 0;
  private repStartTime: number = 0;

  protected stepStateMachine(
    shoulderAngle: number,
    _velocity: number,
    timestampMs: number,
    elbowAngle?: number
  ): void {
    const t = this.config.thresholds;

    switch (this.currentPhase) {
      case 'STARTING':
      case 'ADDUCTION':
        if (shoulderAngle > t.raisingThreshold) {
          this.currentPhase = 'ABDUCTING';
          this.repStartTime = timestampMs;
          this.maxShoulderAngle = shoulderAngle;
          this.setFeedback('Raising arm laterally in scapular plane.', timestampMs);
        }
        break;

      case 'ABDUCTING':
        if (shoulderAngle > this.maxShoulderAngle) {
          this.maxShoulderAngle = shoulderAngle;
        }

        if (shoulderAngle >= t.targetElevation) {
          this.currentPhase = 'PEAK_ELEVATION';
          this.setFeedback('Excellent height reached! Lower under control.', timestampMs);
        } else if (shoulderAngle < this.maxShoulderAngle - 10.0) {
          this.currentPhase = 'ADDUCTING';
          this.setFeedback('Lowering arm back to your side...', timestampMs);
        }
        break;

      case 'PEAK_ELEVATION':
        if (shoulderAngle > this.maxShoulderAngle) {
          this.maxShoulderAngle = shoulderAngle;
        }

        if (shoulderAngle < t.targetElevation - 8.0) {
          this.currentPhase = 'ADDUCTING';
          this.setFeedback('Smooth controlled descent.', timestampMs);
        }
        break;

      case 'ADDUCTING':
        if (shoulderAngle <= t.startingAngle + 10.0) {
          if (this.maxShoulderAngle >= t.minElevationThreshold) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.repStartTime) / 1000);

            let score = 100;
            const cues: string[] = [];

            if (this.maxShoulderAngle < t.targetElevation - 10.0) {
              score -= 20;
              cues.push('Try elevating arm parallel to shoulder height (90°).');
            }
            if (elbowAngle && elbowAngle < 140) {
              score -= 15;
              cues.push('Keep elbow relatively straight with soft lockout.');
            }

            if (cues.length === 0) cues.push('Clean shoulder abduction form!');

            const repRecord: ExerciseRepRecord = {
              repNumber: this.repCount,
              formScore: Math.max(40, score),
              peakRom: Math.round(this.maxShoulderAngle * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: cues,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(cues[0], timestampMs, true);
          } else {
            this.setFeedback('Raise arm higher toward shoulder level.', timestampMs, true);
          }

          this.currentPhase = 'ADDUCTION';
        }
        break;
    }
  }

  public override reset(): void {
    super.reset();
    this.maxShoulderAngle = 0;
    this.repStartTime = 0;
  }
}
