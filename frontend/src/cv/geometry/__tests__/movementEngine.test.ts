import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculate2DAngle,
  calculate3DAngle,
  getDistance2D,
  getDistance3D,
  getMidpoint,
  getJointAngle,
} from '../angleCalculator';
import {
  ExponentialSmoothingFilter,
  MedianSmoothingFilter,
} from '../smoothing';
import { JointMovementTracker } from '../romTracker';
import { KinematicMovementEngine } from '../index';
import type { NormalizedLandmark } from '../../landmarks';

describe('Movement Analysis Engine - Geometric Unit Tests', () => {
  describe('calculate2DAngle', () => {
    it('calculates exact 90-degree right angle (L-shape)', () => {
      const a = { x: 0, y: 1 }; // Vertical leg
      const b = { x: 0, y: 0 }; // Vertex
      const c = { x: 1, y: 0 }; // Horizontal leg
      const angle = calculate2DAngle(a, b, c);
      expect(angle).toBe(90.0);
    });

    it('calculates exact 180-degree straight line', () => {
      const a = { x: -1, y: 0 };
      const b = { x: 0, y: 0 };
      const c = { x: 1, y: 0 };
      const angle = calculate2DAngle(a, b, c);
      expect(angle).toBe(180.0);
    });

    it('calculates exact 45-degree acute angle', () => {
      const a = { x: 1, y: 1 };
      const b = { x: 0, y: 0 };
      const c = { x: 1, y: 0 };
      const angle = calculate2DAngle(a, b, c);
      expect(angle).toBeCloseTo(45.0, 1);
    });

    it('calculates exact 0-degree overlapping lines', () => {
      const a = { x: 1, y: 0 };
      const b = { x: 0, y: 0 };
      const c = { x: 2, y: 0 };
      const angle = calculate2DAngle(a, b, c);
      expect(angle).toBe(0.0);
    });

    it('is invariant to coordinate scale and translations', () => {
      const a = { x: 100, y: 200 };
      const b = { x: 100, y: 100 };
      const c = { x: 200, y: 100 };
      expect(calculate2DAngle(a, b, c)).toBe(90.0);
    });
  });

  describe('3D Geometric & Distance Utilities', () => {
    it('computes 2D Euclidean distance accurately', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(getDistance2D(a, b)).toBe(5.0);
    });

    it('computes 3D Euclidean distance accurately', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 1, y: 2, z: 2 };
      expect(getDistance3D(a, b)).toBe(3.0);
    });

    it('computes 3D angle', () => {
      const a = { x: 0, y: 1, z: 0 };
      const b = { x: 0, y: 0, z: 0 };
      const c = { x: 1, y: 0, z: 0 };
      expect(calculate3DAngle(a, b, c)).toBe(90.0);
    });

    it('calculates midpoint accurately', () => {
      const lm1: NormalizedLandmark = { index: 0, name: 'LEFT_SHOULDER', x: 0.2, y: 0.4, z: 0.1, visibility: 0.9 };
      const lm2: NormalizedLandmark = { index: 1, name: 'RIGHT_SHOULDER', x: 0.6, y: 0.4, z: 0.3, visibility: 0.8 };
      const mid = getMidpoint(lm1, lm2);
      expect(mid.x).toBeCloseTo(0.4, 3);
      expect(mid.y).toBeCloseTo(0.4, 3);
      expect(mid.z).toBeCloseTo(0.2, 3);
      expect(mid.visibility).toBe(0.8);
    });
  });

  describe('Joint Angle Resolution & Landmark Validation', () => {
    const mockLandmarks: NormalizedLandmark[] = [
      { index: 23, name: 'LEFT_HIP', x: 0.5, y: 0.5, z: 0, visibility: 0.95 },
      { index: 25, name: 'LEFT_KNEE', x: 0.5, y: 0.75, z: 0, visibility: 0.9 },
      { index: 27, name: 'LEFT_ANKLE', x: 0.5, y: 1.0, z: 0, visibility: 0.85 },
    ];

    it('resolves left knee angle on straight leg as 180 degrees', () => {
      const result = getJointAngle(mockLandmarks, 'LEFT_KNEE');
      expect(result.isValid).toBe(true);
      expect(result.rawAngle).toBe(180.0);
      expect(result.visibility).toBe(0.85);
    });

    it('marks joint invalid when landmark visibility is below threshold', () => {
      const lowVisLandmarks: NormalizedLandmark[] = [
        { index: 23, name: 'LEFT_HIP', x: 0.5, y: 0.5, z: 0, visibility: 0.95 },
        { index: 25, name: 'LEFT_KNEE', x: 0.5, y: 0.75, z: 0, visibility: 0.2 }, // low visibility
        { index: 27, name: 'LEFT_ANKLE', x: 0.5, y: 1.0, z: 0, visibility: 0.85 },
      ];
      const result = getJointAngle(lowVisLandmarks, 'LEFT_KNEE', 0.5);
      expect(result.isValid).toBe(false);
    });

    it('returns invalid result when landmark is completely missing', () => {
      const result = getJointAngle([], 'LEFT_KNEE');
      expect(result.isValid).toBe(false);
      expect(result.rawAngle).toBe(0);
    });
  });

  describe('Signal Smoothing Filters', () => {
    it('EMA filter smooths noisy oscillations towards target', () => {
      const filter = new ExponentialSmoothingFilter(0.5);
      expect(filter.update(100)).toBe(100.0);
      // Next sample 120 -> 0.5 * 120 + 0.5 * 100 = 110
      expect(filter.update(120)).toBe(110.0);
      // Next sample 120 -> 0.5 * 120 + 0.5 * 110 = 115
      expect(filter.update(120)).toBe(115.0);
    });

    it('Median filter successfully eliminates single-frame spike anomaly', () => {
      const median = new MedianSmoothingFilter(5);
      median.update(90);
      median.update(91);
      median.update(90);
      median.update(175); // Glitched outlier frame
      const out = median.update(92);
      // Median of [90, 91, 90, 175, 92] -> sorted [90, 90, 91, 92, 175] -> 91
      expect(out).toBe(91.0);
    });
  });

  describe('JointMovementTracker (ROM & Angular Velocity)', () => {
    let tracker: JointMovementTracker;

    beforeEach(() => {
      tracker = new JointMovementTracker({ alpha: 1.0, medianWindow: 1 }); // Raw test mode
    });

    it('tracks range of motion min, max and ROM accurately across movement cycles', () => {
      let res = tracker.update(180, 1000);
      expect(res.minAngle).toBe(180);
      expect(res.maxAngle).toBe(180);
      expect(res.rom).toBe(0);

      // Flexion to 90 degrees
      res = tracker.update(90, 1500);
      expect(res.minAngle).toBe(90);
      expect(res.maxAngle).toBe(180);
      expect(res.rom).toBe(90);

      // Extension back to 175 degrees
      res = tracker.update(175, 2000);
      expect(res.minAngle).toBe(90);
      expect(res.maxAngle).toBe(180);
      expect(res.rom).toBe(90);
    });

    it('calculates angular velocity in degrees per second', () => {
      tracker.update(90, 1000);
      // Move 45 degrees in 500ms (0.5s) -> 45 / 0.5 = 90 deg/sec
      const res = tracker.update(135, 1500);
      expect(res.velocity).toBeCloseTo(90.0, 0);
      expect(res.velocityClass).toBe('NORMAL');
      expect(res.state).toBe('MOVING');
    });

    it('detects stationary / paused state when joint remains still', () => {
      tracker.update(90, 1000);
      tracker.update(90, 1300);
      const res = tracker.update(90, 1600);
      expect(res.velocity).toBe(0);
      expect(res.velocityClass).toBe('STATIONARY');
    });

    it('classifies excessive speed as TOO_FAST', () => {
      tracker.update(40, 1000);
      // 100 degrees change in 100ms -> 1000 deg/sec
      const res = tracker.update(140, 1100);
      expect(res.velocityClass).toBe('TOO_FAST');
    });
  });

  describe('KinematicMovementEngine Comprehensive Multi-Joint', () => {
    it('analyzes multiple kinematic joints in parallel', () => {
      const engine = new KinematicMovementEngine();
      const mockPose: NormalizedLandmark[] = [
        { index: 11, name: 'LEFT_SHOULDER', x: 0.4, y: 0.3, z: 0, visibility: 0.9 },
        { index: 13, name: 'LEFT_ELBOW', x: 0.4, y: 0.5, z: 0, visibility: 0.9 },
        { index: 15, name: 'LEFT_WRIST', x: 0.4, y: 0.7, z: 0, visibility: 0.9 },
        { index: 23, name: 'LEFT_HIP', x: 0.4, y: 0.6, z: 0, visibility: 0.9 },
        { index: 25, name: 'LEFT_KNEE', x: 0.4, y: 0.8, z: 0, visibility: 0.9 },
        { index: 27, name: 'LEFT_ANKLE', x: 0.4, y: 1.0, z: 0, visibility: 0.9 },
      ];

      const analysis = engine.analyzeFrame(mockPose, 1000);
      expect(analysis.LEFT_ELBOW.isValid).toBe(true);
      expect(analysis.LEFT_ELBOW.rawAngle).toBe(180.0);
      expect(analysis.LEFT_KNEE.isValid).toBe(true);
      expect(analysis.LEFT_KNEE.rawAngle).toBe(180.0);
      expect(analysis.RIGHT_KNEE.isValid).toBe(false); // Missing right landmarks
    });
  });
});
