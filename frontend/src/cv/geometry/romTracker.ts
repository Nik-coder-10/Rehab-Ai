/**
 * Robust Range of Motion (ROM) & Angular Velocity Tracker
 */
import { ExponentialSmoothingFilter, MedianSmoothingFilter } from './smoothing';
import type { MovementState, VelocityClassification } from './types';

export interface RomTrackerOptions {
  alpha?: number; // Smoothing factor (default 0.35)
  medianWindow?: number; // Median filter window for outlier suppression (default 5)
  velocityWindowMs?: number; // Rolling time window for velocity computation (default 200ms)
  stationaryVelocityThreshold?: number; // Deg/sec below which movement is considered PAUSED/IDLE (default 3.0)
  movingVelocityThreshold?: number; // Deg/sec above which movement is active (default 8.0)
  fastVelocityThreshold?: number; // Deg/sec above which velocity is TOO_FAST (default 120.0)
}

export class JointMovementTracker {
  private emaFilter: ExponentialSmoothingFilter;
  private medianFilter: MedianSmoothingFilter;

  private minAngle: number = 180;
  private maxAngle: number = 0;
  private hasValidSample: boolean = false;

  // History buffer for velocity & outlier rejection: [timestamp, angle]
  private history: [number, number][] = [];
  private velocityWindowMs: number;

  private currentVelocity: number = 0; // degrees per second
  private currentState: MovementState = 'IDLE';
  private stationaryThreshold: number;
  private movingThreshold: number;
  private fastThreshold: number;

  constructor(options: RomTrackerOptions = {}) {
    this.emaFilter = new ExponentialSmoothingFilter(options.alpha ?? 0.35);
    this.medianFilter = new MedianSmoothingFilter(options.medianWindow ?? 5);
    this.velocityWindowMs = options.velocityWindowMs ?? 200;
    this.stationaryThreshold = options.stationaryVelocityThreshold ?? 3.0;
    this.movingThreshold = options.movingVelocityThreshold ?? 8.0;
    this.fastThreshold = options.fastVelocityThreshold ?? 120.0;
  }

  /**
   * Updates the movement tracker with a new raw angle reading and timestamp
   */
  public update(rawAngle: number, timestampMs: number = performance.now()): {
    rawAngle: number;
    smoothedAngle: number;
    minAngle: number;
    maxAngle: number;
    rom: number;
    velocity: number;
    velocityClass: VelocityClassification;
    state: MovementState;
  } {
    // 1. Median filter first to drop camera glitched frames
    const medianCleaned = this.medianFilter.update(rawAngle);

    // 2. Exponential moving average for fluid responsiveness
    const smoothedAngle = this.emaFilter.update(medianCleaned);

    // 3. Update min / max with percentile/bounded outlier protection
    if (!this.hasValidSample) {
      this.minAngle = smoothedAngle;
      this.maxAngle = smoothedAngle;
      this.hasValidSample = true;
    } else {
      // Smoothly expand envelope
      if (smoothedAngle < this.minAngle) {
        this.minAngle = Math.round(smoothedAngle * 10) / 10;
      }
      if (smoothedAngle > this.maxAngle) {
        this.maxAngle = Math.round(smoothedAngle * 10) / 10;
      }
    }

    // 4. Calculate Movement Velocity (deg / sec) over rolling time window
    this.history.push([timestampMs, smoothedAngle]);

    // Prune history older than velocity window
    const cutoff = timestampMs - this.velocityWindowMs;
    while (this.history.length > 2 && this.history[0][0] < cutoff) {
      this.history.shift();
    }

    if (this.history.length >= 2) {
      const first = this.history[0];
      const last = this.history[this.history.length - 1];
      const dt = (last[0] - first[0]) / 1000; // in seconds
      const dTheta = Math.abs(last[1] - first[1]);

      if (dt > 0.02) {
        this.currentVelocity = Math.round((dTheta / dt) * 10) / 10;
      }
    }

    // 5. Determine Velocity Classification
    let velocityClass: VelocityClassification = 'NORMAL';
    if (this.currentVelocity <= this.stationaryThreshold) {
      velocityClass = 'STATIONARY';
    } else if (this.currentVelocity > this.fastThreshold) {
      velocityClass = 'TOO_FAST';
    } else if (this.currentVelocity < 6.0) {
      velocityClass = 'TOO_SLOW';
    } else {
      velocityClass = 'NORMAL';
    }

    // 6. Generic Movement State Resolution
    if (this.currentVelocity <= this.stationaryThreshold) {
      if (this.currentState === 'MOVING') {
        this.currentState = 'PAUSED';
      } else {
        this.currentState = 'IDLE';
      }
    } else if (this.currentVelocity >= this.movingThreshold) {
      this.currentState = 'MOVING';
    }

    const rom = Math.max(0, Math.round((this.maxAngle - this.minAngle) * 10) / 10);

    return {
      rawAngle,
      smoothedAngle,
      minAngle: this.minAngle,
      maxAngle: this.maxAngle,
      rom,
      velocity: this.currentVelocity,
      velocityClass,
      state: this.currentState,
    };
  }

  /**
   * Resets ROM min/max tracking (e.g. at the start of an exercise set)
   */
  public resetRom(): void {
    this.hasValidSample = false;
    this.minAngle = 180;
    this.maxAngle = 0;
    this.history = [];
    this.currentVelocity = 0;
    this.currentState = 'IDLE';
    this.emaFilter.reset();
    this.medianFilter.reset();
  }

  public get currentRom(): number {
    return this.hasValidSample ? Math.max(0, Math.round((this.maxAngle - this.minAngle) * 10) / 10) : 0;
  }
}
