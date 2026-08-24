/**
 * Shoulder Flexion Biomechanical Analyzer
 * Primary Joint: Right / Left Shoulder (Sagittal forward arm elevation)
 *
 * Sequence: NEUTRAL (<= 30°) -> FLEXING_FORWARD -> OVERHEAD_PEAK (>= 120°) -> EXTENDING -> NEUTRAL
 */
import { BaseExerciseAnalyzer } from '../core/BaseExerciseAnalyzer';
import type { ExerciseConfig, ExerciseRepRecord } from '../core/types';

export class ShoulderFlexionAnalyzer extends BaseExerciseAnalyzer {
  public readonly config: ExerciseConfig = {
    code: 'shoulder_flexion',
    name: 'Shoulder Flexion',
    targetJoints: ['RIGHT_SHOULDER', 'LEFT_SHOULDER', 'RIGHT_ELBOW'],
    primaryJoint: 'RIGHT_SHOULDER',
    secondaryJoint: 'RIGHT_ELBOW',
    thresholds: {
      startingAngle: 30.0,
      raisingThreshold: 45.0,
      peakFlexionTarget: 130.0,
      minFlexionThreshold: 90.0,
    },
  };

  private maxFlexionAngle: number = 0;
  private repStartTime: number = 0;

  protected stepStateMachine(
    shoulderAngle: number,
    _velocity: number,
    timestampMs: number,
    _elbowAngle?: number
  ): void {
    const t = this.config.thresholds;

    switch (this.currentPhase) {
      case 'STARTING':
      case 'NEUTRAL':
        if (shoulderAngle > t.raisingThreshold) {
          this.currentPhase = 'FLEXING_FORWARD';
          this.repStartTime = timestampMs;
          this.maxFlexionAngle = shoulderAngle;
          this.setFeedback('Raising arm forward overhead. Maintain tall posture.', timestampMs);
        }
        break;

      case 'FLEXING_FORWARD':
        if (shoulderAngle > this.maxFlexionAngle) {
          this.maxFlexionAngle = shoulderAngle;
        }

        if (shoulderAngle >= t.peakFlexionTarget) {
          this.currentPhase = 'OVERHEAD_PEAK';
          this.setFeedback('Great overhead flexion! Lower arm steadily.', timestampMs);
        } else if (shoulderAngle < this.maxFlexionAngle - 10.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Lowering arm...', timestampMs);
        }
        break;

      case 'OVERHEAD_PEAK':
        if (shoulderAngle < t.peakFlexionTarget - 10.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Lowering arm steadily.', timestampMs);
        }
        break;

      case 'LOWERING':
        if (shoulderAngle <= t.startingAngle + 10.0) {
          if (this.maxFlexionAngle >= t.minFlexionThreshold) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.repStartTime) / 1000);

            let score = 100;
            const cues: string[] = [];

            if (this.maxFlexionAngle < t.peakFlexionTarget - 15.0) {
              score -= 20;
              cues.push('Work toward full vertical overhead flexion.');
            }

            if (cues.length === 0) cues.push('Excellent shoulder flexion mechanics!');

            const repRecord: ExerciseRepRecord = {
              repNumber: this.repCount,
              formScore: Math.max(40, score),
              peakRom: Math.round(this.maxFlexionAngle * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: cues,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(cues[0], timestampMs, true);
          } else {
            this.setFeedback('Reach higher forward before lowering.', timestampMs, true);
          }

          this.currentPhase = 'NEUTRAL';
        }
        break;
    }
  }

  public override reset(): void {
    super.reset();
    this.maxFlexionAngle = 0;
    this.repStartTime = 0;
  }
}
