import type { NormalizedLandmark } from '../landmarks';
import { getLandmark, isLandmarkVisible } from '../landmarks';
import { JOINT_DEFINITIONS, type JointType, type JointAngleResult } from './types';

/**
 * Calculates Euclidean 2D distance between two points (normalized coordinate space)
 */
export function getDistance2D(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates Euclidean 3D distance between two landmarks including estimated depth
 */
export function getDistance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the midpoint between two landmarks
 */
export function getMidpoint(
  a: NormalizedLandmark,
  b: NormalizedLandmark
): { x: number; y: number; z: number; visibility: number } {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

/**
 * Computes 2D angle (in degrees 0 - 180°) at vertex joint B formed by vectors BA and BC
 * Uses dot product & cross product arctan2 for numerical precision and quadrant stability.
 */
export function calculate2DAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  // Vector BA
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;

  // Vector BC
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  // Dot product and determinant (cross product in 2D)
  const dot = v1x * v2x + v1y * v2y;
  const det = v1x * v2y - v1y * v2x;

  let angleRad = Math.atan2(Math.abs(det), dot);
  let angleDeg = (angleRad * 180.0) / Math.PI;

  if (isNaN(angleDeg)) {
    return 0;
  }

  // Constrain strictly between 0 and 180
  angleDeg = Math.max(0, Math.min(180, angleDeg));
  return Math.round(angleDeg * 10) / 10;
}

/**
 * Computes 3D angle (in degrees 0 - 180°) at vertex joint B using full 3D vector dot product
 */
export function calculate3DAngle(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number }
): number {
  // Vector BA
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v1z = (a.z || 0) - (b.z || 0);

  // Vector BC
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = (c.z || 0) - (b.z || 0);

  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDeg = (Math.acos(cosTheta) * 180.0) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

/**
 * Resolves and calculates the current angle for any of the standard kinematic joints
 */
export function getJointAngle(
  landmarks: NormalizedLandmark[],
  jointType: JointType,
  minVisibilityThreshold = 0.4
): JointAngleResult {
  const def = JOINT_DEFINITIONS[jointType];
  if (!def) {
    throw new Error(`Unknown joint definition: ${jointType}`);
  }

  const a = getLandmark(landmarks, def.proximal);
  const b = getLandmark(landmarks, def.vertex);
  const c = getLandmark(landmarks, def.distal);

  if (!a || !b || !c) {
    return {
      joint: jointType,
      rawAngle: 0,
      smoothedAngle: 0,
      visibility: 0,
      isValid: false,
    };
  }

  const minVisibility = Math.min(a.visibility, b.visibility, c.visibility);
  const isValid =
    isLandmarkVisible(a, minVisibilityThreshold) &&
    isLandmarkVisible(b, minVisibilityThreshold) &&
    isLandmarkVisible(c, minVisibilityThreshold);

  const angle = calculate2DAngle(a, b, c);

  return {
    joint: jointType,
    rawAngle: angle,
    smoothedAngle: angle,
    visibility: Math.round(minVisibility * 100) / 100,
    isValid,
  };
}
