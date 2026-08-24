/**
 * Knee Extension Biomechanical Analyzer (Seated Terminal Knee Extension)
 * Primary Joint: Right / Left Knee
 *
 * Sequence: FLEXED (Starting seated ~90°) -> EXTENDING -> TERMINAL_EXTENSION (>= 165°) -> FLEXING -> FLEXED
 */
import { BaseExerciseAnalyzer } from '../core/BaseExerciseAnalyzer';
import type { ExerciseConfig, ExerciseRepRecord } from '../core/types';

export class KneeExtensionAnalyzer extends BaseExerciseAnalyzer {
  public readonly config: ExerciseConfig = {
    code: 'knee_extension',
    name: 'Seated Knee Extension',
    targetJoints: ['RIGHT_KNEE', 'LEFT_KNEE', 'RIGHT_HIP'],
    primaryJoint: 'RIGHT_KNEE',
    secondaryJoint: 'RIGHT_HIP',
    thresholds: {
      flexedAngle: 95.0,          // Seated knee bent ~90°
      extendingThreshold: 110.0,  // Active kick initiation
      terminalExtension: 165.0,   // Full quadriceps lockout
      minExtensionThreshold: 145.0,// Min acceptable extension
    },
  };

  private maxKneeAngle: number = 90;
  private repStartTime: number = 0;

  protected stepStateMachine(
    kneeAngle: number,
    _velocity: number,
    timestampMs: number,
    _hipAngle?: number
  ): void {
    const t = this.config.thresholds;

    switch (this.currentPhase) {
      case 'STARTING':
      case 'FLEXED':
        if (kneeAngle > t.extendingThreshold) {
          this.currentPhase = 'EXTENDING';
          this.repStartTime = timestampMs;
          this.maxKneeAngle = kneeAngle;
          this.setFeedback('Kicking leg upward. Contract the quadriceps.', timestampMs);
        }
        break;

      case 'EXTENDING':
        if (kneeAngle > this.maxKneeAngle) {
          this.maxKneeAngle = kneeAngle;
        }

        if (kneeAngle >= t.terminalExtension) {
          this.currentPhase = 'TERMINAL_EXTENSION';
          this.setFeedback('Full knee extension reached! Hold 1 second and lower slowly.', timestampMs);
        } else if (kneeAngle < this.maxKneeAngle - 8.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Lowering leg back down...', timestampMs);
        }
        break;

      case 'TERMINAL_EXTENSION':
        if (kneeAngle < t.terminalExtension - 6.0) {
          this.currentPhase = 'LOWERING';
          this.setFeedback('Controlled eccentric lowering.', timestampMs);
        }
        break;

      case 'LOWERING':
        if (kneeAngle <= t.flexedAngle + 8.0) {
          if (this.maxKneeAngle >= t.minExtensionThreshold) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.repStartTime) / 1000);

            let score = 100;
            const cues: string[] = [];

            if (this.maxKneeAngle < t.terminalExtension - 10.0) {
              score -= 20;
              cues.push('Try reaching full straight-leg terminal extension (170°).');
            }

            if (cues.length === 0) cues.push('Strong terminal knee extension!');

            const repRecord: ExerciseRepRecord = {
              repNumber: this.repCount,
              formScore: Math.max(40, score),
              peakRom: Math.round((this.maxKneeAngle - t.flexedAngle) * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: cues,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(cues[0], timestampMs, true);
          } else {
            this.setFeedback('Extend knee straighter before lowering.', timestampMs, true);
          }

          this.currentPhase = 'FLEXED';
        }
        break;
    }
  }

  public override reset(): void {
    super.reset();
    this.maxKneeAngle = 90;
    this.repStartTime = 0;
  }
}
