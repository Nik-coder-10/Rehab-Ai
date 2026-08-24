/**
 * Bicep Curl Biomechanical Analyzer
 * Primary Joint: Right / Left Elbow
 * Secondary Joint: Shoulder (checks excessive momentum/elbow drift)
 *
 * Sequence: EXTENSION (Starting) -> FLEXING -> PEAK_CONTRACTION -> EXTENDING -> EXTENSION (Complete)
 */
import { BaseExerciseAnalyzer } from '../core/BaseExerciseAnalyzer';
import type { ExerciseConfig, ExerciseRepRecord } from '../core/types';

export class BicepCurlAnalyzer extends BaseExerciseAnalyzer {
  public readonly config: ExerciseConfig = {
    code: 'bicep_curl',
    name: 'Bicep Curl',
    targetJoints: ['RIGHT_ELBOW', 'LEFT_ELBOW', 'RIGHT_SHOULDER'],
    primaryJoint: 'RIGHT_ELBOW',
    secondaryJoint: 'RIGHT_SHOULDER',
    thresholds: {
      extensionAngle: 155.0,     // Arms extended down
      flexingThreshold: 140.0,   // Movement initiated
      peakContraction: 60.0,     // Full elbow flexion
      minFlexionThreshold: 85.0, // Minimum flexion to count rep
      maxVelocity: 160.0,        // Overly jerky momentum
    },
  };

  private minElbowAngle: number = 180;
  private repStartTime: number = 0;

  protected stepStateMachine(
    elbowAngle: number,
    velocity: number,
    timestampMs: number,
    shoulderAngle?: number
  ): void {
    const t = this.config.thresholds;

    switch (this.currentPhase) {
      case 'STARTING':
      case 'EXTENSION':
        if (elbowAngle < t.flexingThreshold) {
          this.currentPhase = 'FLEXING';
          this.repStartTime = timestampMs;
          this.minElbowAngle = elbowAngle;
          this.setFeedback('Curling upward. Keep your upper arm pinned to your side.', timestampMs);
        }
        break;

      case 'FLEXING':
        if (elbowAngle < this.minElbowAngle) {
          this.minElbowAngle = elbowAngle;
        }

        if (elbowAngle <= t.peakContraction) {
          this.currentPhase = 'PEAK_CONTRACTION';
          this.setFeedback('Great peak contraction! Squeeze and lower slowly.', timestampMs);
        } else if (elbowAngle > this.minElbowAngle + 10.0) {
          this.currentPhase = 'EXTENDING';
          this.setFeedback('Lowering weight...', timestampMs);
        }
        break;

      case 'PEAK_CONTRACTION':
        if (elbowAngle < this.minElbowAngle) {
          this.minElbowAngle = elbowAngle;
        }

        if (elbowAngle > t.peakContraction + 10.0) {
          this.currentPhase = 'EXTENDING';
          this.setFeedback('Controlled eccentric descent.', timestampMs);
        }
        break;

      case 'EXTENDING':
        if (elbowAngle >= t.extensionAngle - 8.0) {
          // Check if adequate flexion was reached
          if (this.minElbowAngle <= t.minFlexionThreshold) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.repStartTime) / 1000);

            // Compute Form Score (0 - 100)
            let score = 100;
            const cues: string[] = [];

            if (this.minElbowAngle > t.peakContraction + 15.0) {
              score -= 20;
              cues.push('Aim for a fuller range of elbow flexion at the top.');
            }
            if (velocity > t.maxVelocity) {
              score -= 15;
              cues.push('Avoid swinging your torso; isolate the biceps.');
            }
            if (shoulderAngle && shoulderAngle > 45) {
              score -= 15;
              cues.push('Keep your elbow stationary rather than drifting forward.');
            }

            if (cues.length === 0) cues.push('Crisp repetition form!');

            const repRecord: ExerciseRepRecord = {
              repNumber: this.repCount,
              formScore: Math.max(40, score),
              peakRom: Math.round((180 - this.minElbowAngle) * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: cues,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(cues[0], timestampMs, true);
          } else {
            this.setFeedback('Incomplete curl depth. Curl higher toward your shoulder.', timestampMs, true);
          }

          this.currentPhase = 'EXTENSION';
        }
        break;
    }
  }

  public override reset(): void {
    super.reset();
    this.minElbowAngle = 180;
    this.repStartTime = 0;
  }
}
