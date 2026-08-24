/**
 * Squat Biomechanical Analyzer Types & State Machine Definitions
 */


export type SquatPhase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';

export interface SquatThresholds {
  standingKneeAngle: number;    // e.g. >= 160 deg (extended leg)
  descendingKneeAngle: number;  // e.g. < 150 deg (begins descent)
  bottomKneeAngle: number;      // e.g. <= 100 deg (adequate depth)
  ascendingKneeAngle: number;   // e.g. > 105 deg (rising from bottom)
  minDepthThreshold: number;    // e.g. 115 deg (minimum depth to be valid)
  maxDescentSpeed: number;      // e.g. 140 deg/s (controlled descent)
  minAscentSpeed: number;       // e.g. 8 deg/s (active upward drive)
  hysteresisBuffer: number;     // e.g. 4 deg (noise margin around boundaries)
}

export const DEFAULT_SQUAT_THRESHOLDS: SquatThresholds = {
  standingKneeAngle: 160.0,
  descendingKneeAngle: 150.0,
  bottomKneeAngle: 100.0,
  ascendingKneeAngle: 108.0,
  minDepthThreshold: 115.0,
  maxDescentSpeed: 140.0,
  minAscentSpeed: 8.0,
  hysteresisBuffer: 4.0,
};

export interface SquatFormMetrics {
  kneeDepthAngle: number;          // Minimum knee angle reached at bottom
  hipKneeRatio: number;            // Hip-to-knee alignment
  torsoInclinationAngle: number;   // Torso vertical alignment relative to vertical
  kneeValgusDistance: number;      // Knee vs ankle medial collapse check
  descentVelocity: number;         // Peak descent speed (deg/s)
  isDepthAdequate: boolean;
  isDescentControlled: boolean;
  isTorsoStable: boolean;
  isKneeAligned: boolean;
}

export interface SquatRepRecord {
  repNumber: number;
  formScore: number;           // 0 - 100
  peakRom: number;             // Maximum ROM achieved
  bottomKneeAngle: number;     // Depth angle at vertex
  durationSeconds: number;     // Total duration of rep
  feedbackCues: string[];      // Form coaching observations
  timestamp: number;
}

export interface SquatFrameAnalysis {
  phase: SquatPhase;
  currentKneeAngle: number;
  currentHipAngle: number;
  currentRom: number;
  currentVelocity: number;
  repCount: number;
  currentRepScore: number;
  activeFeedback: string;
  formMetrics: SquatFormMetrics;
  completedReps: SquatRepRecord[];
  isTrackingValid: boolean;
}
