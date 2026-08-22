import type { PoseLandmarkName } from '../landmarks';

export type JointType =
  | 'LEFT_ELBOW'
  | 'RIGHT_ELBOW'
  | 'LEFT_SHOULDER'
  | 'RIGHT_SHOULDER'
  | 'LEFT_HIP'
  | 'RIGHT_HIP'
  | 'LEFT_KNEE'
  | 'RIGHT_KNEE';

export interface JointDefinition {
  type: JointType;
  name: string;
  proximal: PoseLandmarkName; // A
  vertex: PoseLandmarkName;   // B (the joint center)
  distal: PoseLandmarkName;   // C
}

export const JOINT_DEFINITIONS: Record<JointType, JointDefinition> = {
  LEFT_ELBOW: {
    type: 'LEFT_ELBOW',
    name: 'Left Elbow',
    proximal: 'LEFT_SHOULDER',
    vertex: 'LEFT_ELBOW',
    distal: 'LEFT_WRIST',
  },
  RIGHT_ELBOW: {
    type: 'RIGHT_ELBOW',
    name: 'Right Elbow',
    proximal: 'RIGHT_SHOULDER',
    vertex: 'RIGHT_ELBOW',
    distal: 'RIGHT_WRIST',
  },
  LEFT_SHOULDER: {
    type: 'LEFT_SHOULDER',
    name: 'Left Shoulder',
    proximal: 'LEFT_HIP',
    vertex: 'LEFT_SHOULDER',
    distal: 'LEFT_ELBOW',
  },
  RIGHT_SHOULDER: {
    type: 'RIGHT_SHOULDER',
    name: 'Right Shoulder',
    proximal: 'RIGHT_HIP',
    vertex: 'RIGHT_SHOULDER',
    distal: 'RIGHT_ELBOW',
  },
  LEFT_HIP: {
    type: 'LEFT_HIP',
    name: 'Left Hip',
    proximal: 'LEFT_SHOULDER',
    vertex: 'LEFT_HIP',
    distal: 'LEFT_KNEE',
  },
  RIGHT_HIP: {
    type: 'RIGHT_HIP',
    name: 'Right Hip',
    proximal: 'RIGHT_SHOULDER',
    vertex: 'RIGHT_HIP',
    distal: 'RIGHT_KNEE',
  },
  LEFT_KNEE: {
    type: 'LEFT_KNEE',
    name: 'Left Knee',
    proximal: 'LEFT_HIP',
    vertex: 'LEFT_KNEE',
    distal: 'LEFT_ANKLE',
  },
  RIGHT_KNEE: {
    type: 'RIGHT_KNEE',
    name: 'Right Knee',
    proximal: 'RIGHT_HIP',
    vertex: 'RIGHT_KNEE',
    distal: 'RIGHT_ANKLE',
  },
};

export type MovementState = 'IDLE' | 'MOVING' | 'PAUSED' | 'COMPLETED';

export type VelocityClassification = 'TOO_FAST' | 'NORMAL' | 'TOO_SLOW' | 'STATIONARY';

export interface JointAngleResult {
  joint: JointType;
  rawAngle: number;
  smoothedAngle: number;
  visibility: number; // minimum visibility across A, B, C
  isValid: boolean;
}

export interface JointMovementAnalysis {
  joint: JointType;
  rawAngle: number;
  smoothedAngle: number;
  minAngle: number;
  maxAngle: number;
  rom: number; // maxAngle - minAngle
  velocity: number; // degrees per second
  velocityClass: VelocityClassification;
  state: MovementState;
  visibility: number;
  isValid: boolean;
}
