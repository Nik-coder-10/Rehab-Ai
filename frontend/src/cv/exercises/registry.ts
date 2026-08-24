/**
 * Reusable Exercise Analyzer Factory & Registry
 */
import type { IExerciseAnalyzer } from './core/types';
import { SquatAnalyzer } from './squat/squatAnalyzer';
import { BicepCurlAnalyzer } from './bicepCurl/BicepCurlAnalyzer';
import { ShoulderAbductionAnalyzer } from './shoulderAbduction/ShoulderAbductionAnalyzer';
import { ShoulderFlexionAnalyzer } from './shoulderFlexion/ShoulderFlexionAnalyzer';
import { KneeExtensionAnalyzer } from './kneeExtension/KneeExtensionAnalyzer';
import { LegRaiseAnalyzer } from './legRaise/LegRaiseAnalyzer';

export type AnalyzerCreator = () => IExerciseAnalyzer;

export class ExerciseRegistry {
  private static instance: ExerciseRegistry;
  private registry: Map<string, AnalyzerCreator> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ExerciseRegistry {
    if (!ExerciseRegistry.instance) {
      ExerciseRegistry.instance = new ExerciseRegistry();
    }
    return ExerciseRegistry.instance;
  }

  private registerDefaults(): void {
    // Squat variations
    this.register(['squat', 'bodyweight_squats', 'chair_squat', 'sit_to_stand'], () => new SquatAnalyzer());

    // Bicep Curl variations
    this.register(['bicep_curl', 'biceps_curl', 'bicep_curls', 'dumbbell_curl'], () => new BicepCurlAnalyzer());

    // Shoulder Abduction
    this.register(['shoulder_abduction', 'lateral_raise', 'arm_abduction'], () => new ShoulderAbductionAnalyzer());

    // Shoulder Flexion
    this.register(['shoulder_flexion', 'front_raise', 'arm_flexion'], () => new ShoulderFlexionAnalyzer());

    // Knee Extension
    this.register(['knee_extension', 'seated_knee_extension', 'terminal_knee_ext', 'quad_extension'], () => new KneeExtensionAnalyzer());

    // Leg Raise
    this.register(['leg_raise', 'straight_leg_raise', 'slr', 'hip_flexion'], () => new LegRaiseAnalyzer());
  }

  public register(aliases: string[], creator: AnalyzerCreator): void {
    for (const alias of aliases) {
      this.registry.set(alias.toLowerCase().trim(), creator);
    }
  }

  public get(exerciseCodeOrName: string): IExerciseAnalyzer {
    const key = exerciseCodeOrName.toLowerCase().trim().replace(/[-\s]+/g, '_');
    const creator = this.registry.get(key);

    if (creator) {
      return creator();
    }

    // Fuzzy fallback: check if key includes known words
    if (key.includes('squat') || key.includes('stand')) return new SquatAnalyzer();
    if (key.includes('curl') || key.includes('bicep')) return new BicepCurlAnalyzer();
    if (key.includes('abduct') || key.includes('lateral')) return new ShoulderAbductionAnalyzer();
    if (key.includes('flexion') || key.includes('front')) return new ShoulderFlexionAnalyzer();
    if (key.includes('knee') || key.includes('quad')) return new KneeExtensionAnalyzer();
    if (key.includes('leg') || key.includes('raise') || key.includes('slr')) return new LegRaiseAnalyzer();

    // Default fallback
    return new SquatAnalyzer();
  }

  public has(exerciseCodeOrName: string): boolean {
    const key = exerciseCodeOrName.toLowerCase().trim().replace(/[-\s]+/g, '_');
    return this.registry.has(key);
  }

  public getRegisteredCodes(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const exerciseRegistry = ExerciseRegistry.getInstance();
