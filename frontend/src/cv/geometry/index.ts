/**
 * Movement Analysis Engine Index
 */
export * from './types';
export * from './angleCalculator';
export * from './smoothing';
export * from './romTracker';

import type { NormalizedLandmark } from '../landmarks';
import { getJointAngle } from './angleCalculator';
import { JointMovementTracker } from './romTracker';
import type { JointMovementAnalysis, JointType } from './types';

/**
 * High-Level Movement Analysis Engine Instance
 * Coordinates real-time tracking across all 8 major physical therapy joints simultaneously
 */
export class KinematicMovementEngine {
  private trackers: Map<JointType, JointMovementTracker> = new Map();

  constructor() {
    const joints: JointType[] = [
      'LEFT_ELBOW',
      'RIGHT_ELBOW',
      'LEFT_SHOULDER',
      'RIGHT_SHOULDER',
      'LEFT_HIP',
      'RIGHT_HIP',
      'LEFT_KNEE',
      'RIGHT_KNEE',
    ];

    for (const j of joints) {
      this.trackers.set(j, new JointMovementTracker());
    }
  }

  /**
   * Processes a frame of normalized landmarks and returns analysis for all kinematic joints
   */
  public analyzeFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number = performance.now()
  ): Record<JointType, JointMovementAnalysis> {
    const results = {} as Record<JointType, JointMovementAnalysis>;

    this.trackers.forEach((tracker, joint) => {
      const angleResult = getJointAngle(landmarks, joint);

      if (angleResult.isValid) {
        const movement = tracker.update(angleResult.rawAngle, timestampMs);
        results[joint] = {
          joint,
          rawAngle: angleResult.rawAngle,
          smoothedAngle: movement.smoothedAngle,
          minAngle: movement.minAngle,
          maxAngle: movement.maxAngle,
          rom: movement.rom,
          velocity: movement.velocity,
          velocityClass: movement.velocityClass,
          state: movement.state,
          visibility: angleResult.visibility,
          isValid: true,
        };
      } else {
        results[joint] = {
          joint,
          rawAngle: 0,
          smoothedAngle: 0,
          minAngle: 0,
          maxAngle: 0,
          rom: 0,
          velocity: 0,
          velocityClass: 'STATIONARY',
          state: 'IDLE',
          visibility: angleResult.visibility,
          isValid: false,
        };
      }
    });

    return results;
  }

  /**
   * Resets ROM and state for a specific joint or all joints
   */
  public reset(joint?: JointType): void {
    if (joint) {
      this.trackers.get(joint)?.resetRom();
    } else {
      this.trackers.forEach((tracker) => tracker.resetRom());
    }
  }
}
