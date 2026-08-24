/**
 * Common Contract and Types for Exercise Analyzers
 */
import type { NormalizedLandmark } from '../../landmarks';
import type { JointType } from '../../geometry/types';

export interface ExerciseRepRecord {
  repNumber: number;
  formScore: number;
  peakRom: number;
  durationSeconds: number;
  feedbackCues: string[];
  timestamp: number;
}

export interface ExerciseMetrics {
  primaryAngle: number;
  secondaryAngle?: number;
  peakRom: number;
  velocity: number;
  formScore: number;
  [key: string]: any;
}

export interface ExerciseAnalysisResult {
  exerciseCode: string;
  phase: string;
  repCount: number;
  formScore: number;
  currentRom: number;
  currentAngle: number;
  currentVelocity: number;
  activeFeedback: string;
  isTrackingValid: boolean;
  completedReps: ExerciseRepRecord[];
  metrics: ExerciseMetrics;
}

export interface ExerciseConfig {
  code: string;
  name: string;
  targetJoints: JointType[];
  primaryJoint: JointType;
  secondaryJoint?: JointType;
  thresholds: Record<string, number>;
  scoringWeights?: Record<string, number>;
}

export interface IExerciseAnalyzer {
  readonly config: ExerciseConfig;
  processFrame(landmarks: NormalizedLandmark[], timestampMs?: number): ExerciseAnalysisResult;
  processAngle?(angle: number, timestampMs?: number): { phase: string; repCount: number; formScore: number; activeFeedback: string };
  reset(): void;
}
