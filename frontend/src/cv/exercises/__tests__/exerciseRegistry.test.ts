import { describe, it, expect, beforeEach } from 'vitest';
import { BicepCurlAnalyzer } from '../bicepCurl/BicepCurlAnalyzer';
import { ShoulderAbductionAnalyzer } from '../shoulderAbduction/ShoulderAbductionAnalyzer';
import { ShoulderFlexionAnalyzer } from '../shoulderFlexion/ShoulderFlexionAnalyzer';
import { KneeExtensionAnalyzer } from '../kneeExtension/KneeExtensionAnalyzer';
import { LegRaiseAnalyzer } from '../legRaise/LegRaiseAnalyzer';
import { exerciseRegistry } from '../registry';

describe('Generalized Exercise Analyzers - Deterministic Unit Tests', () => {
  describe('ExerciseRegistry Dispatcher', () => {
    it('returns appropriate analyzers by code and fuzzy name matching', () => {
      expect(exerciseRegistry.get('squat').config.code).toBe('squat');
      expect(exerciseRegistry.get('bicep_curl').config.code).toBe('bicep_curl');
      expect(exerciseRegistry.get('shoulder_abduction').config.code).toBe('shoulder_abduction');
      expect(exerciseRegistry.get('shoulder_flexion').config.code).toBe('shoulder_flexion');
      expect(exerciseRegistry.get('knee_extension').config.code).toBe('knee_extension');
      expect(exerciseRegistry.get('leg_raise').config.code).toBe('leg_raise');
    });

    it('isolates state so switching exercises starts clean with 0 reps', () => {
      const curl1 = exerciseRegistry.get('bicep_curl');
      curl1.processAngle?.(160, 0);
      curl1.processAngle?.(55, 500);
      curl1.processAngle?.(160, 1000);

      const squatNew = exerciseRegistry.get('squat');
      expect(squatNew.processAngle?.(175, 0).repCount).toBe(0);
    });
  });

  describe('BicepCurlAnalyzer', () => {
    let analyzer: BicepCurlAnalyzer;
    beforeEach(() => {
      analyzer = new BicepCurlAnalyzer(false);
    });

    it('counts full bicep curl repetition (160° -> 55° -> 160°)', () => {
      analyzer.processAngle(160, 0);   // Extension
      analyzer.processAngle(110, 500); // Flexing
      analyzer.processAngle(55, 1000); // Peak contraction
      analyzer.processAngle(110, 1500);// Extending
      const res = analyzer.processAngle(160, 2000); // Back down
      expect(res.repCount).toBe(1);
      expect(res.formScore).toBeGreaterThanOrEqual(80);
    });

    it('rejects shallow curl failing minimum flexion (< 85° required)', () => {
      analyzer.processAngle(160, 0);
      analyzer.processAngle(110, 500);
      analyzer.processAngle(100, 1000); // lowest is only 100°
      analyzer.processAngle(130, 1500);
      const res = analyzer.processAngle(160, 2000);
      expect(res.repCount).toBe(0);
    });
  });

  describe('ShoulderAbductionAnalyzer', () => {
    let analyzer: ShoulderAbductionAnalyzer;
    beforeEach(() => {
      analyzer = new ShoulderAbductionAnalyzer(false);
    });

    it('counts lateral shoulder abduction rep (25° -> 92° -> 25°)', () => {
      analyzer.processAngle(25, 0);   // At side
      analyzer.processAngle(60, 500);  // Abducting
      analyzer.processAngle(92, 1000); // Peak elevation
      analyzer.processAngle(60, 1500); // Adducting
      const res = analyzer.processAngle(25, 2000);
      expect(res.repCount).toBe(1);
    });
  });

  describe('ShoulderFlexionAnalyzer', () => {
    let analyzer: ShoulderFlexionAnalyzer;
    beforeEach(() => {
      analyzer = new ShoulderFlexionAnalyzer(false);
    });

    it('counts forward shoulder flexion rep (25° -> 135° -> 25°)', () => {
      analyzer.processAngle(25, 0);
      analyzer.processAngle(80, 500);
      analyzer.processAngle(135, 1000);
      analyzer.processAngle(80, 1500);
      const res = analyzer.processAngle(25, 2000);
      expect(res.repCount).toBe(1);
    });
  });

  describe('KneeExtensionAnalyzer', () => {
    let analyzer: KneeExtensionAnalyzer;
    beforeEach(() => {
      analyzer = new KneeExtensionAnalyzer(false);
    });

    it('counts terminal knee extension rep (90° -> 170° -> 90°)', () => {
      analyzer.processAngle(90, 0);    // Seated
      analyzer.processAngle(130, 500); // Extending
      analyzer.processAngle(170, 1000);// Lockout
      analyzer.processAngle(130, 1500);// Lowering
      const res = analyzer.processAngle(90, 2000);
      expect(res.repCount).toBe(1);
    });
  });

  describe('LegRaiseAnalyzer', () => {
    let analyzer: LegRaiseAnalyzer;
    beforeEach(() => {
      analyzer = new LegRaiseAnalyzer(false);
    });

    it('counts straight leg raise rep (175° -> 130° -> 175°)', () => {
      analyzer.processAngle(175, 0);   // Supine
      analyzer.processAngle(150, 500); // Raising
      analyzer.processAngle(130, 1000);// 45° off ground (internal 130°)
      analyzer.processAngle(150, 1500);// Lowering
      const res = analyzer.processAngle(175, 2000);
      expect(res.repCount).toBe(1);
    });
  });
});
