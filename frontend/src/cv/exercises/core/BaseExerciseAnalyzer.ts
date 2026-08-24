/**
 * Reusable Base Exercise Analyzer
 * Handles joint resolution, velocity tracking, smoothing, and rep bookkeeping
 */
import type { NormalizedLandmark } from '../../landmarks';
import { getJointAngle } from '../../geometry/angleCalculator';
import { JointMovementTracker } from '../../geometry/romTracker';
import type {
  ExerciseAnalysisResult,
  ExerciseConfig,
  ExerciseRepRecord,
  IExerciseAnalyzer,
} from './types';

export abstract class BaseExerciseAnalyzer implements IExerciseAnalyzer {
  public abstract readonly config: ExerciseConfig;

  protected primaryTracker: JointMovementTracker;
  protected secondaryTracker?: JointMovementTracker;

  protected currentPhase: string = 'STARTING';
  protected repCount: number = 0;
  protected completedReps: ExerciseRepRecord[] = [];

  protected activeFeedback: string = 'Assume starting position.';
  protected lastFeedbackUpdateTime: number = 0;
  protected feedbackCooldownMs: number = 1500;

  constructor(useFilters = true) {
    this.primaryTracker = new JointMovementTracker(
      useFilters ? { alpha: 0.35, medianWindow: 5 } : { alpha: 1.0, medianWindow: 1 }
    );
    this.secondaryTracker = new JointMovementTracker(
      useFilters ? { alpha: 0.35, medianWindow: 5 } : { alpha: 1.0, medianWindow: 1 }
    );
  }

  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number = performance.now()
  ): ExerciseAnalysisResult {
    const primaryRes = getJointAngle(landmarks, this.config.primaryJoint);

    if (!primaryRes.isValid) {
      return {
        exerciseCode: this.config.code,
        phase: this.currentPhase,
        repCount: this.repCount,
        formScore: this.getAverageScore(),
        currentRom: this.primaryTracker.currentRom,
        currentAngle: 0,
        currentVelocity: 0,
        activeFeedback: 'Ensure target joint is clearly visible to the camera.',
        isTrackingValid: false,
        completedReps: this.completedReps,
        metrics: {
          primaryAngle: 0,
          peakRom: this.primaryTracker.currentRom,
          velocity: 0,
          formScore: this.getAverageScore(),
        },
      };
    }

    const primaryMovement = this.primaryTracker.update(primaryRes.rawAngle, timestampMs);

    let secondaryAngle: number | undefined;
    if (this.config.secondaryJoint && this.secondaryTracker) {
      const secRes = getJointAngle(landmarks, this.config.secondaryJoint);
      if (secRes.isValid) {
        const secMovement = this.secondaryTracker.update(secRes.rawAngle, timestampMs);
        secondaryAngle = secMovement.smoothedAngle;
      }
    }

    // Step state machine in subclass
    this.stepStateMachine(primaryMovement.smoothedAngle, primaryMovement.velocity, timestampMs, secondaryAngle);

    return {
      exerciseCode: this.config.code,
      phase: this.currentPhase,
      repCount: this.repCount,
      formScore: this.getAverageScore(),
      currentRom: primaryMovement.rom,
      currentAngle: primaryMovement.smoothedAngle,
      currentVelocity: primaryMovement.velocity,
      activeFeedback: this.activeFeedback,
      isTrackingValid: true,
      completedReps: this.completedReps,
      metrics: {
        primaryAngle: primaryMovement.smoothedAngle,
        secondaryAngle,
        peakRom: primaryMovement.rom,
        velocity: primaryMovement.velocity,
        formScore: this.getAverageScore(),
      },
    };
  }

  public processAngle(
    angle: number,
    timestampMs: number = performance.now()
  ): { phase: string; repCount: number; formScore: number; activeFeedback: string } {
    const movement = this.primaryTracker.update(angle, timestampMs);
    this.stepStateMachine(movement.smoothedAngle, movement.velocity, timestampMs);
    return {
      phase: this.currentPhase,
      repCount: this.repCount,
      formScore: this.getAverageScore(),
      activeFeedback: this.activeFeedback,
    };
  }

  protected abstract stepStateMachine(
    primaryAngle: number,
    velocity: number,
    timestampMs: number,
    secondaryAngle?: number
  ): void;

  protected setFeedback(message: string, timestampMs: number, force = false): void {
    if (force || timestampMs - this.lastFeedbackUpdateTime >= this.feedbackCooldownMs) {
      this.activeFeedback = message;
      this.lastFeedbackUpdateTime = timestampMs;
    }
  }

  protected getAverageScore(): number {
    if (this.completedReps.length === 0) return 100;
    const sum = this.completedReps.reduce((acc, r) => acc + r.formScore, 0);
    return Math.round(sum / this.completedReps.length);
  }

  public reset(): void {
    this.currentPhase = 'STARTING';
    this.repCount = 0;
    this.completedReps = [];
    this.activeFeedback = 'Assume starting position.';
    this.primaryTracker.resetRom();
    this.secondaryTracker?.resetRom();
  }
}
