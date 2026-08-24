/**
 * Exercise-Specific Pose Calibration & Baseline Normalization Engine.
 * 
 * Flow:
 * CAMERA CHECK -> PERSON DETECTED -> POSITION VERIFIED -> BASELINE CALIBRATION -> READY
 * 
 * Provides:
 * 1. Specific landmark visibility checks per exercise requirements.
 * 2. Multi-frame baseline angle normalization (e.g. initial standing knee lockout: 168° vs 178°).
 * 3. Position checks (centering, distance, framing).
 * 4. Graceful occlusion & recovery state handling.
 */

import { getLandmark, isLandmarkVisible } from './landmarks';
import type { NormalizedLandmark, PoseLandmarkName } from './landmarks';

export type CalibrationStatus =
  | 'CAMERA_CHECK'
  | 'NO_PERSON'
  | 'POSITION_CHECK'
  | 'CALIBRATING'
  | 'READY'
  | 'LOW_CONFIDENCE'
  | 'PAUSED_OCCLUSION';

export interface CalibrationResult {
  status: CalibrationStatus;
  progressPercent: number; // 0 - 100
  feedbackCue: string;
  isReady: boolean;
  baselineAngles: Record<string, number>;
  confidence: number;
}

export interface ExerciseRequirements {
  requiredLandmarks: PoseLandmarkName[];
  minConfidence: number;
  expectedStartingAngleJoint?: string;
  expectedBaselineMin?: number;
  expectedBaselineMax?: number;
}

export const EXERCISE_CV_REQUIREMENTS: Record<string, ExerciseRequirements> = {
  squat: {
    requiredLandmarks: ['LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_KNEE',
    expectedBaselineMin: 150,
    expectedBaselineMax: 185,
  },
  bicep_curl: {
    requiredLandmarks: ['LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_ELBOW',
    expectedBaselineMin: 145,
    expectedBaselineMax: 185,
  },
  shoulder_abduction: {
    requiredLandmarks: ['LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_HIP', 'RIGHT_HIP'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_SHOULDER',
    expectedBaselineMin: 10,
    expectedBaselineMax: 45,
  },
  shoulder_flexion: {
    requiredLandmarks: ['LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_HIP', 'RIGHT_HIP'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_SHOULDER',
    expectedBaselineMin: 10,
    expectedBaselineMax: 45,
  },
  knee_extension: {
    requiredLandmarks: ['LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_KNEE',
    expectedBaselineMin: 70,
    expectedBaselineMax: 110,
  },
  leg_raise: {
    requiredLandmarks: ['LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE'],
    minConfidence: 0.5,
    expectedStartingAngleJoint: 'LEFT_HIP',
    expectedBaselineMin: 160,
    expectedBaselineMax: 185,
  },
};

export class PoseCalibrationEngine {
  private exerciseCode: string;
  private requirements: ExerciseRequirements;
  private calibrationFrames: number = 0;
  private targetCalibrationFrames: number = 25; // ~0.8s at 30 FPS
  private collectedAngles: number[] = [];
  private baselineAngle: number | null = null;
  private consecutiveMissingFrames: number = 0;
  private isCalibrated: boolean = false;

  constructor(exerciseCode: string = 'squat') {
    this.exerciseCode = exerciseCode.toLowerCase();
    this.requirements = EXERCISE_CV_REQUIREMENTS[this.exerciseCode] || EXERCISE_CV_REQUIREMENTS['squat'];
  }

  public reset(): void {
    this.calibrationFrames = 0;
    this.collectedAngles = [];
    this.baselineAngle = null;
    this.consecutiveMissingFrames = 0;
    this.isCalibrated = false;
  }

  public getBaselineAngle(): number {
    return this.baselineAngle || 170.0;
  }

  public processFrame(
    landmarks: NormalizedLandmark[],
    currentAngle?: number
  ): CalibrationResult {
    // 1. Person Detection Check
    if (!landmarks || landmarks.length === 0) {
      this.consecutiveMissingFrames++;
      if (this.isCalibrated && this.consecutiveMissingFrames > 30) {
        return {
          status: 'PAUSED_OCCLUSION',
          progressPercent: 0,
          feedbackCue: 'Pose lost. Stand back in front of camera.',
          isReady: false,
          baselineAngles: {},
          confidence: 0,
        };
      }
      return {
        status: 'NO_PERSON',
        progressPercent: 0,
        feedbackCue: 'Step in front of the camera to begin setup.',
        isReady: false,
        baselineAngles: {},
        confidence: 0,
      };
    }

    this.consecutiveMissingFrames = 0;

    // 2. Specific Exercise Required Landmarks Verification
    const visibleCount = this.requirements.requiredLandmarks.filter((name) => {
      const lm = getLandmark(landmarks, name);
      return isLandmarkVisible(lm, this.requirements.minConfidence);
    }).length;

    const visibleRatio = visibleCount / this.requirements.requiredLandmarks.length;

    if (visibleRatio < 0.75) {
      return {
        status: 'POSITION_CHECK',
        progressPercent: Math.round(visibleRatio * 40),
        feedbackCue: 'Step back so your full required body joints are in view.',
        isReady: false,
        baselineAngles: {},
        confidence: visibleRatio,
      };
    }

    // 3. Position & Centering Check (Torso X between 0.15 and 0.85)
    const midHipX = ((getLandmark(landmarks, 'LEFT_HIP')?.x || 0.5) + (getLandmark(landmarks, 'RIGHT_HIP')?.x || 0.5)) / 2;

    if (midHipX < 0.15 || midHipX > 0.85) {
      return {
        status: 'POSITION_CHECK',
        progressPercent: 40,
        feedbackCue: 'Move slightly toward the center of your camera frame.',
        isReady: false,
        baselineAngles: {},
        confidence: 0.7,
      };
    }

    // 4. Calibration Stream
    if (!this.isCalibrated) {
      this.calibrationFrames++;
      if (currentAngle !== undefined) {
        this.collectedAngles.push(currentAngle);
      }

      const progress = Math.min(100, Math.round((this.calibrationFrames / this.targetCalibrationFrames) * 100));

      if (this.calibrationFrames < this.targetCalibrationFrames) {
        return {
          status: 'CALIBRATING',
          progressPercent: progress,
          feedbackCue: 'Hold steady for baseline posture calibration...',
          isReady: false,
          baselineAngles: {},
          confidence: visibleRatio,
        };
      }

      // Finalize calibration
      if (this.collectedAngles.length > 0) {
        this.baselineAngle =
          this.collectedAngles.reduce((a, b) => a + b, 0) / this.collectedAngles.length;
      } else {
        this.baselineAngle = 170.0;
      }
      this.isCalibrated = true;
    }

    // 5. Ready State
    return {
      status: 'READY',
      progressPercent: 100,
      feedbackCue: '✓ Calibrated and ready. Begin exercise!',
      isReady: true,
      baselineAngles: { baseline: Math.round(this.baselineAngle || 170) },
      confidence: visibleRatio,
    };
  }
}
