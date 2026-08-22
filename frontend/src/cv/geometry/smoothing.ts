/**
 * Real-Time Signal Smoothing Filters (EMA and Windowed Median)
 */

/**
 * Exponential Moving Average (EMA) Filter
 * Smooths jitter while keeping low latency and high responsiveness.
 */
export class ExponentialSmoothingFilter {
  private alpha: number;
  private currentSmoothed: number | null = null;

  /**
   * @param alpha Smoothing factor between 0.0 (maximum smoothing / sluggish) and 1.0 (no smoothing / raw). Default 0.35
   */
  constructor(alpha = 0.35) {
    this.alpha = Math.max(0.01, Math.min(1.0, alpha));
  }

  public update(value: number): number {
    if (this.currentSmoothed === null) {
      this.currentSmoothed = value;
      return value;
    }
    this.currentSmoothed = this.alpha * value + (1 - this.alpha) * this.currentSmoothed;
    return Math.round(this.currentSmoothed * 10) / 10;
  }

  public get value(): number | null {
    return this.currentSmoothed !== null ? Math.round(this.currentSmoothed * 10) / 10 : null;
  }

  public reset(): void {
    this.currentSmoothed = null;
  }
}

/**
 * Windowed Median Filter
 * Effective at rejecting singular high-frequency frame anomalies / camera noise.
 */
export class MedianSmoothingFilter {
  private windowSize: number;
  private buffer: number[] = [];

  /**
   * @param windowSize Odd integer representing sliding window length. Default 5
   */
  constructor(windowSize = 5) {
    this.windowSize = windowSize % 2 === 0 ? windowSize + 1 : windowSize;
  }

  public update(value: number): number {
    this.buffer.push(value);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    const sorted = [...this.buffer].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return Math.round(median * 10) / 10;
  }

  public reset(): void {
    this.buffer = [];
  }
}
