import { describe, it, expect, beforeEach } from 'vitest';
import { SquatAnalyzer } from '../squatAnalyzer';
import { evaluateSquatForm } from '../scoring';
import { DEFAULT_SQUAT_THRESHOLDS } from '../types';

describe('Squat Analyzer Biomechanical State Machine Tests', () => {
  let analyzer: SquatAnalyzer;

  beforeEach(() => {
    // Zero out smoothing filter lag in unit test mode for crisp deterministic angle step tests
    analyzer = new SquatAnalyzer({}, false);
  });

  describe('Repetition State Machine & Phase Transitions', () => {
    it('accurately counts 1 complete squat repetition through full cycle', () => {
      // Sequence: Standing (175°) -> Descending (135°) -> Bottom (95°) -> Ascending (135°) -> Standing (175°)
      const trajectory = [
        { angle: 175, time: 0 },
        { angle: 165, time: 200 },
        { angle: 140, time: 600 },
        { angle: 110, time: 1000 },
        { angle: 95, time: 1400 },  // Bottom
        { angle: 110, time: 1800 },
        { angle: 140, time: 2200 }, // Ascending
        { angle: 165, time: 2600 },
        { angle: 175, time: 3000 }, // Complete
      ];

      for (const step of trajectory) {
        analyzer.processAngle(step.angle, step.time);
      }

      const res = analyzer.processAngle(175, 3200);
      expect(res.repCount).toBe(1);
      expect(res.phase).toBe('STANDING');
    });

    it('rejects tiny jitter / micro movements and does not increment rep count', () => {
      // Small jitter between 175° and 155° (never descends)
      const jitterTrajectory = [175, 172, 168, 162, 158, 165, 172, 175];
      let t = 0;
      for (const angle of jitterTrajectory) {
        analyzer.processAngle(angle, t);
        t += 200;
      }

      const res = analyzer.processAngle(175, t + 200);
      expect(res.repCount).toBe(0);
      expect(res.phase).toBe('STANDING');
    });

    it('does not award repetition for shallow squat failing min depth threshold', () => {
      // Only reaches 140° (shallow dip, above minDepthThreshold of 115°)
      const shallowTrajectory = [
        { angle: 175, time: 0 },
        { angle: 145, time: 400 },
        { angle: 135, time: 800 }, // Lowest depth is only 135°
        { angle: 145, time: 1200 },
        { angle: 175, time: 1600 },
      ];

      for (const step of shallowTrajectory) {
        analyzer.processAngle(step.angle, step.time);
      }

      const res = analyzer.processAngle(175, 1800);
      expect(res.repCount).toBe(0);
      expect(res.phase).toBe('STANDING');
    });

    it('accurately counts two consecutive full squat cycles without double-counting', () => {
      const singleCycle = [175, 155, 130, 95, 120, 155, 175];

      let t = 0;
      // Cycle 1
      for (const angle of singleCycle) {
        analyzer.processAngle(angle, t);
        t += 300;
      }
      expect(analyzer.processAngle(175, t).repCount).toBe(1);

      // Cycle 2
      t += 500;
      for (const angle of singleCycle) {
        analyzer.processAngle(angle, t);
        t += 300;
      }
      expect(analyzer.processAngle(175, t).repCount).toBe(2);
    });

    it('handles noisy oscillations around transition thresholds safely', () => {
      // Noise around 150° (descending boundary)
      const noisyBorder = [175, 160, 152, 149, 151, 148, 150, 147, 100, 140, 175];
      let t = 0;
      for (const angle of noisyBorder) {
        analyzer.processAngle(angle, t);
        t += 200;
      }
      expect(analyzer.processAngle(175, t).repCount).toBe(1);
    });
  });

  describe('Deterministic Squat Scoring Formula', () => {
    it('scores full depth and controlled tempo with high score (> 90)', () => {
      const idealMetrics = {
        kneeDepthAngle: 95,
        hipKneeRatio: 1.0,
        torsoInclinationAngle: 25,
        kneeValgusDistance: 0,
        descentVelocity: 85,
        isDepthAdequate: true,
        isDescentControlled: true,
        isTorsoStable: true,
        isKneeAligned: true,
      };

      const score = evaluateSquatForm(idealMetrics, DEFAULT_SQUAT_THRESHOLDS);
      expect(score.totalScore).toBe(100);
      expect(score.depthScore).toBe(35);
      expect(score.speedScore).toBe(25);
      expect(score.torsoScore).toBe(20);
      expect(score.alignmentScore).toBe(20);
    });

    it('penalizes shallow depth and uncontrolled rapid drop', () => {
      const flawedMetrics = {
        kneeDepthAngle: 128,          // Shallow
        hipKneeRatio: 1.0,
        torsoInclinationAngle: 50,    // Excessive lean
        kneeValgusDistance: 0,
        descentVelocity: 165,         // Rapid drop
        isDepthAdequate: false,
        isDescentControlled: false,
        isTorsoStable: false,
        isKneeAligned: false,
      };

      const score = evaluateSquatForm(flawedMetrics, DEFAULT_SQUAT_THRESHOLDS);
      expect(score.totalScore).toBeLessThan(50);
      expect(score.feedbackList.length).toBeGreaterThan(0);
    });
  });
});
