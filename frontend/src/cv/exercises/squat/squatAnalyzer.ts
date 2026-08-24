/**
 * Squat Biomechanical Analyzer State Machine
 *
 * Sequence:
 * STANDING -> DESCENDING -> BOTTOM -> ASCENDING -> STANDING
 *
 * Enforces strict hysteresis, velocity tracking, noise rejection, and full-cycle repetition validation.
 */
import type { NormalizedLandmark } from '../../landmarks';
import { getJointAngle, calculate2DAngle } from '../../geometry/angleCalculator';
import { JointMovementTracker } from '../../geometry/romTracker';
import {
  DEFAULT_SQUAT_THRESHOLDS,
  type SquatPhase,
  type SquatThresholds,
  type SquatFormMetrics,
  type SquatRepRecord,
  type SquatFrameAnalysis,
} from './types';
import { evaluateSquatForm } from './scoring';

export class SquatAnalyzer {
  private thresholds: SquatThresholds;
  private kneeTracker: JointMovementTracker;
  private hipTracker: JointMovementTracker;

  // Rep State Machine
  private currentPhase: SquatPhase = 'STANDING';
  private repCount: number = 0;
  private completedReps: SquatRepRecord[] = [];

  // Active Rep Tracking Metrics
  private currentRepStartTime: number = 0;
  private currentRepMinKneeAngle: number = 180;
  private currentRepMaxDescentVelocity: number = 0;
  private currentRepMaxTorsoAngle: number = 0;
  private currentRepKneeValgusObserved: boolean = false;

  // Real-time Feedback & Debounce
  private activeFeedback: string = 'Stand in neutral position with feet shoulder-width apart.';
  private lastFeedbackUpdateTime: number = 0;
  private feedbackCooldownMs: number = 1500;

  constructor(thresholds: Partial<SquatThresholds> = {}, useFilters = true) {
    this.thresholds = { ...DEFAULT_SQUAT_THRESHOLDS, ...thresholds };
    this.kneeTracker = new JointMovementTracker(useFilters ? { alpha: 0.35, medianWindow: 5 } : { alpha: 1.0, medianWindow: 1 });
    this.hipTracker = new JointMovementTracker(useFilters ? { alpha: 0.35, medianWindow: 5 } : { alpha: 1.0, medianWindow: 1 });
  }

  /**
   * Process a single video frame of 33 normalized landmarks
   */
  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number = performance.now()
  ): SquatFrameAnalysis {
    // 1. Resolve Bilateral Knee & Hip Angles
    const rightKneeRes = getJointAngle(landmarks, 'RIGHT_KNEE');
    const leftKneeRes = getJointAngle(landmarks, 'LEFT_KNEE');
    const rightHipRes = getJointAngle(landmarks, 'RIGHT_HIP');
    const leftHipRes = getJointAngle(landmarks, 'LEFT_HIP');

    const isTrackingValid = (rightKneeRes.isValid && rightHipRes.isValid) || (leftKneeRes.isValid && leftHipRes.isValid);

    if (!isTrackingValid) {
      return {
        phase: this.currentPhase,
        currentKneeAngle: 0,
        currentHipAngle: 0,
        currentRom: this.kneeTracker.currentRom,
        currentVelocity: 0,
        repCount: this.repCount,
        currentRepScore: this.completedReps.length > 0 ? this.completedReps[this.completedReps.length - 1].formScore : 0,
        activeFeedback: 'Ensure full body is visible in camera view.',
        formMetrics: this.getCurrentFormMetrics(),
        completedReps: this.completedReps,
        isTrackingValid: false,
      };
    }

    // Pick highest visibility side or average
    const kneeAngleRaw = rightKneeRes.isValid && leftKneeRes.isValid
      ? (rightKneeRes.rawAngle + leftKneeRes.rawAngle) / 2
      : rightKneeRes.isValid ? rightKneeRes.rawAngle : leftKneeRes.rawAngle;

    const hipAngleRaw = rightHipRes.isValid && leftHipRes.isValid
      ? (rightHipRes.rawAngle + leftHipRes.rawAngle) / 2
      : rightHipRes.isValid ? rightHipRes.rawAngle : leftHipRes.rawAngle;

    // 2. Smooth Angles & Track Angular Velocity
    const kneeMovement = this.kneeTracker.update(kneeAngleRaw, timestampMs);
    const hipMovement = this.hipTracker.update(hipAngleRaw, timestampMs);

    const smoothedKnee = kneeMovement.smoothedAngle;
    const currentVelocity = kneeMovement.velocity;

    // 3. Compute Real-time Torso Inclination & Knee Alignment
    this.inspectTorsoAndAlignment(landmarks);

    // 4. Advance Squat State Machine
    this.updateStateMachine(smoothedKnee, currentVelocity, timestampMs);

    return {
      phase: this.currentPhase,
      currentKneeAngle: smoothedKnee,
      currentHipAngle: hipMovement.smoothedAngle,
      currentRom: kneeMovement.rom,
      currentVelocity,
      repCount: this.repCount,
      currentRepScore: this.completedReps.length > 0 ? this.completedReps[this.completedReps.length - 1].formScore : 0,
      activeFeedback: this.activeFeedback,
      formMetrics: this.getCurrentFormMetrics(),
      completedReps: this.completedReps,
      isTrackingValid: true,
    };
  }

  /**
   * Process raw angle stream directly (for deterministic unit tests)
   */
  public processAngle(
    kneeAngle: number,
    timestampMs: number = performance.now()
  ): { phase: SquatPhase; repCount: number; repScore: number; activeFeedback: string } {
    const kneeMovement = this.kneeTracker.update(kneeAngle, timestampMs);
    const smoothedKnee = kneeMovement.smoothedAngle;
    const velocity = kneeMovement.velocity;

    this.updateStateMachine(smoothedKnee, velocity, timestampMs);

    return {
      phase: this.currentPhase,
      repCount: this.repCount,
      repScore: this.completedReps.length > 0 ? this.completedReps[this.completedReps.length - 1].formScore : 0,
      activeFeedback: this.activeFeedback,
    };
  }

  private updateStateMachine(kneeAngle: number, velocity: number, timestampMs: number): void {
    switch (this.currentPhase) {
      case 'STANDING':
        // Transition: Knee flexes below descending threshold
        if (kneeAngle < this.thresholds.descendingKneeAngle) {
          this.currentPhase = 'DESCENDING';
          this.currentRepStartTime = timestampMs;
          this.currentRepMinKneeAngle = kneeAngle;
          this.currentRepMaxDescentVelocity = velocity;
          this.currentRepMaxTorsoAngle = 0;
          this.currentRepKneeValgusObserved = false;
          this.setFeedback('Descending into squat. Maintain controlled tempo.', timestampMs);
        }
        break;

      case 'DESCENDING':
        // Track lowest depth angle and peak descent speed
        if (kneeAngle < this.currentRepMinKneeAngle) {
          this.currentRepMinKneeAngle = kneeAngle;
        }
        if (velocity > this.currentRepMaxDescentVelocity) {
          this.currentRepMaxDescentVelocity = velocity;
        }

        // Transition 1: Reached bottom depth threshold
        if (kneeAngle <= this.thresholds.bottomKneeAngle) {
          this.currentPhase = 'BOTTOM';
          this.setFeedback('Good depth! Drive up through your heels.', timestampMs);
        }
        // Transition 2: Moving upward before bottom
        else if (kneeAngle > this.currentRepMinKneeAngle + 6.0) {
          this.currentPhase = 'ASCENDING';
          this.setFeedback('Driving upward...', timestampMs);
        }
        // Early abort: returned back to standing without squatting
        else if (kneeAngle >= this.thresholds.standingKneeAngle) {
          this.currentPhase = 'STANDING';
          this.setFeedback('Ready for next repetition.', timestampMs);
        }
        break;

      case 'BOTTOM':
        if (kneeAngle < this.currentRepMinKneeAngle) {
          this.currentRepMinKneeAngle = kneeAngle;
        }

        // Transition: Knee begins extending upward
        if (kneeAngle > this.thresholds.bottomKneeAngle + 5.0) {
          this.currentPhase = 'ASCENDING';
          this.setFeedback('Ascending. Keep your chest up.', timestampMs);
        }
        break;

      case 'ASCENDING':
        // Transition: Fully extended back to standing position (Rep complete)
        if (kneeAngle >= this.thresholds.standingKneeAngle - 5.0) {
          // Validate if minimum depth was reached for a valid physical therapy rep
          const wasAdequateDepth = this.currentRepMinKneeAngle <= this.thresholds.minDepthThreshold;

          if (wasAdequateDepth) {
            this.repCount++;
            const duration = Math.max(0.5, (timestampMs - this.currentRepStartTime) / 1000);
            const formEval = evaluateSquatForm(this.getCurrentFormMetrics(), this.thresholds);

            const repRecord: SquatRepRecord = {
              repNumber: this.repCount,
              formScore: formEval.totalScore,
              peakRom: Math.round((180 - this.currentRepMinKneeAngle) * 10) / 10,
              bottomKneeAngle: Math.round(this.currentRepMinKneeAngle * 10) / 10,
              durationSeconds: Math.round(duration * 10) / 10,
              feedbackCues: formEval.feedbackList,
              timestamp: timestampMs,
            };

            this.completedReps.push(repRecord);
            this.setFeedback(formEval.feedbackList[0] || 'Rep completed with good form!', timestampMs, true);
          } else {
            this.setFeedback('Squat depth was too shallow. Try lowering hips further next rep.', timestampMs, true);
          }

          this.currentPhase = 'STANDING';
        }
        // If patient drops back down during ascent
        else if (kneeAngle < this.currentRepMinKneeAngle) {
          this.currentRepMinKneeAngle = kneeAngle;
        }
        break;
    }
  }

  private inspectTorsoAndAlignment(landmarks: NormalizedLandmark[]): void {
    const lShoulder = landmarks.find((l) => l.name === 'LEFT_SHOULDER');
    const lHip = landmarks.find((l) => l.name === 'LEFT_HIP');
    const lKnee = landmarks.find((l) => l.name === 'LEFT_KNEE');
    const lAnkle = landmarks.find((l) => l.name === 'LEFT_ANKLE');

    if (lShoulder && lHip && lKnee) {
      // Torso inclination angle
      const verticalRef = { x: lHip.x, y: lHip.y - 0.5 };
      const torsoAngle = calculate2DAngle(lShoulder, lHip, verticalRef);
      if (torsoAngle > this.currentRepMaxTorsoAngle) {
        this.currentRepMaxTorsoAngle = torsoAngle;
      }
    }

    if (lHip && lKnee && lAnkle) {
      // Medial knee collapse check (knee x drifting inside ankle/hip corridor)
      const isValgus = lKnee.x < Math.min(lHip.x, lAnkle.x) - 0.04;
      if (isValgus) {
        this.currentRepKneeValgusObserved = true;
      }
    }
  }

  private setFeedback(message: string, timestampMs: number, force = false): void {
    if (force || timestampMs - this.lastFeedbackUpdateTime >= this.feedbackCooldownMs) {
      this.activeFeedback = message;
      this.lastFeedbackUpdateTime = timestampMs;
    }
  }

  public getCurrentFormMetrics(): SquatFormMetrics {
    return {
      kneeDepthAngle: Math.round(this.currentRepMinKneeAngle * 10) / 10,
      hipKneeRatio: 1.0,
      torsoInclinationAngle: Math.round(this.currentRepMaxTorsoAngle * 10) / 10,
      kneeValgusDistance: 0,
      descentVelocity: Math.round(this.currentRepMaxDescentVelocity * 10) / 10,
      isDepthAdequate: this.currentRepMinKneeAngle <= this.thresholds.minDepthThreshold,
      isDescentControlled: this.currentRepMaxDescentVelocity <= this.thresholds.maxDescentSpeed,
      isTorsoStable: this.currentRepMaxTorsoAngle <= 45,
      isKneeAligned: !this.currentRepKneeValgusObserved,
    };
  }

  public reset(): void {
    this.currentPhase = 'STANDING';
    this.repCount = 0;
    this.completedReps = [];
    this.currentRepMinKneeAngle = 180;
    this.currentRepMaxDescentVelocity = 0;
    this.currentRepMaxTorsoAngle = 0;
    this.currentRepKneeValgusObserved = false;
    this.activeFeedback = 'Stand in neutral position with feet shoulder-width apart.';
    this.kneeTracker.resetRom();
    this.hipTracker.resetRom();
  }
}
