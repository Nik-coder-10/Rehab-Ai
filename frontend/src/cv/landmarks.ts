/**
 * Standard 33 MediaPipe Pose Landmark Definitions & Connections
 */

export const POSE_LANDMARKS = [
  'NOSE',
  'LEFT_EYE_INNER',
  'LEFT_EYE',
  'LEFT_EYE_OUTER',
  'RIGHT_EYE_INNER',
  'RIGHT_EYE',
  'RIGHT_EYE_OUTER',
  'LEFT_EAR',
  'RIGHT_EAR',
  'MOUTH_LEFT',
  'MOUTH_RIGHT',
  'LEFT_SHOULDER',
  'RIGHT_SHOULDER',
  'LEFT_ELBOW',
  'RIGHT_ELBOW',
  'LEFT_WRIST',
  'RIGHT_WRIST',
  'LEFT_PINKY',
  'RIGHT_PINKY',
  'LEFT_INDEX',
  'RIGHT_INDEX',
  'LEFT_THUMB',
  'RIGHT_THUMB',
  'LEFT_HIP',
  'RIGHT_HIP',
  'LEFT_KNEE',
  'RIGHT_KNEE',
  'LEFT_ANKLE',
  'RIGHT_ANKLE',
  'LEFT_HEEL',
  'RIGHT_HEEL',
  'LEFT_FOOT_INDEX',
  'RIGHT_FOOT_INDEX',
] as const;

export type PoseLandmarkName = (typeof POSE_LANDMARKS)[number];

export interface NormalizedLandmark {
  index: number;
  name: PoseLandmarkName;
  x: number; // 0.0 - 1.0 (normalized image width)
  y: number; // 0.0 - 1.0 (normalized image height)
  z: number; // Landmark depth
  visibility: number; // Confidence / visibility score (0.0 - 1.0)
}

export type PoseQualityState = 'NO_PERSON' | 'POOR_VISIBILITY' | 'PARTIAL_BODY' | 'READY';

export interface PoseDetectionFrame {
  landmarks: NormalizedLandmark[];
  quality: PoseQualityState;
  qualityReason?: string;
  fps: number;
  timestamp: number;
}

// 33 Landmark Skeleton Connection Pairs
export const POSE_CONNECTIONS: [PoseLandmarkName, PoseLandmarkName][] = [
  // Face
  ['NOSE', 'LEFT_EYE_INNER'],
  ['LEFT_EYE_INNER', 'LEFT_EYE'],
  ['LEFT_EYE', 'LEFT_EYE_OUTER'],
  ['LEFT_EYE_OUTER', 'LEFT_EAR'],
  ['NOSE', 'RIGHT_EYE_INNER'],
  ['RIGHT_EYE_INNER', 'RIGHT_EYE'],
  ['RIGHT_EYE', 'RIGHT_EYE_OUTER'],
  ['RIGHT_EYE_OUTER', 'RIGHT_EAR'],
  ['MOUTH_LEFT', 'MOUTH_RIGHT'],

  // Upper Body Torso
  ['LEFT_SHOULDER', 'RIGHT_SHOULDER'],
  ['LEFT_SHOULDER', 'LEFT_HIP'],
  ['RIGHT_SHOULDER', 'RIGHT_HIP'],
  ['LEFT_HIP', 'RIGHT_HIP'],

  // Left Arm
  ['LEFT_SHOULDER', 'LEFT_ELBOW'],
  ['LEFT_ELBOW', 'LEFT_WRIST'],
  ['LEFT_WRIST', 'LEFT_PINKY'],
  ['LEFT_WRIST', 'LEFT_INDEX'],
  ['LEFT_WRIST', 'LEFT_THUMB'],
  ['LEFT_PINKY', 'LEFT_INDEX'],

  // Right Arm
  ['RIGHT_SHOULDER', 'RIGHT_ELBOW'],
  ['RIGHT_ELBOW', 'RIGHT_WRIST'],
  ['RIGHT_WRIST', 'RIGHT_PINKY'],
  ['RIGHT_WRIST', 'RIGHT_INDEX'],
  ['RIGHT_WRIST', 'RIGHT_THUMB'],
  ['RIGHT_PINKY', 'RIGHT_INDEX'],

  // Left Leg
  ['LEFT_HIP', 'LEFT_KNEE'],
  ['LEFT_KNEE', 'LEFT_ANKLE'],
  ['LEFT_ANKLE', 'LEFT_HEEL'],
  ['LEFT_HEEL', 'LEFT_FOOT_INDEX'],
  ['LEFT_ANKLE', 'LEFT_FOOT_INDEX'],

  // Right Leg
  ['RIGHT_HIP', 'RIGHT_KNEE'],
  ['RIGHT_KNEE', 'RIGHT_ANKLE'],
  ['RIGHT_ANKLE', 'RIGHT_HEEL'],
  ['RIGHT_HEEL', 'RIGHT_FOOT_INDEX'],
  ['RIGHT_ANKLE', 'RIGHT_FOOT_INDEX'],
];

/**
 * Helper to check landmark visibility above threshold
 */
export function isLandmarkVisible(landmark: NormalizedLandmark | undefined, threshold = 0.5): boolean {
  return !!landmark && landmark.visibility >= threshold;
}

/**
 * Retrieve specific landmark by typed name
 */
export function getLandmark(landmarks: NormalizedLandmark[], name: PoseLandmarkName): NormalizedLandmark | undefined {
  return landmarks.find((l) => l.name === name);
}

/**
 * Calculate 2D angle (in degrees) between three landmarks (A - Vertex B - C)
 */
export function calculateJointAngle(
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  c: NormalizedLandmark
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * Evaluates Pose Quality State for Physical Therapy
 */
export function evaluatePoseQuality(landmarks: NormalizedLandmark[]): { quality: PoseQualityState; reason: string } {
  if (!landmarks || landmarks.length === 0) {
    return { quality: 'NO_PERSON', reason: 'No person detected in camera view.' };
  }

  // Key joints needed for basic posture analysis
  const keyUpper = ['LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_HIP', 'RIGHT_HIP'] as PoseLandmarkName[];
  const keyLower = ['LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE'] as PoseLandmarkName[];

  const visibleUpper = keyUpper.filter((name) => isLandmarkVisible(getLandmark(landmarks, name), 0.5));
  const visibleLower = keyLower.filter((name) => isLandmarkVisible(getLandmark(landmarks, name), 0.5));

  if (visibleUpper.length < 2) {
    return { quality: 'POOR_VISIBILITY', reason: 'Upper torso not clearly visible. Ensure good lighting.' };
  }

  if (visibleLower.length < 2) {
    return { quality: 'PARTIAL_BODY', reason: 'Full body framing needed. Step back 2 meters for full leg tracking.' };
  }

  return { quality: 'READY', reason: 'Pose tracking optimal. Ready for physical therapy analysis.' };
}
