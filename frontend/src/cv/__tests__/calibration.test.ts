import { describe, it, expect, beforeEach } from 'vitest';
import { PoseCalibrationEngine } from '../calibration';
import type { NormalizedLandmark } from '../landmarks';

function makeMockLandmarks(visible = true): NormalizedLandmark[] {
  const names = [
    'NOSE', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW',
    'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE',
    'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE',
  ];

  return names.map((name, index) => ({
    index,
    name: name as any,
    x: 0.5,
    y: 0.5,
    z: 0.0,
    visibility: visible ? 0.95 : 0.2,
  }));
}

describe('PoseCalibrationEngine', () => {
  let engine: PoseCalibrationEngine;

  beforeEach(() => {
    engine = new PoseCalibrationEngine('squat');
  });

  it('reports NO_PERSON when landmarks array is empty', () => {
    const res = engine.processFrame([]);
    expect(res.status).toBe('NO_PERSON');
    expect(res.isReady).toBe(false);
  });

  it('reports POSITION_CHECK when required landmarks are poorly visible', () => {
    const poorLandmarks = makeMockLandmarks(false);
    const res = engine.processFrame(poorLandmarks);
    expect(res.status).toBe('POSITION_CHECK');
    expect(res.isReady).toBe(false);
  });

  it('progresses through CALIBRATING into READY state over 25 frames', () => {
    const goodLandmarks = makeMockLandmarks(true);

    // Initial frames -> CALIBRATING
    let res = engine.processFrame(goodLandmarks, 172.0);
    expect(res.status).toBe('CALIBRATING');
    expect(res.isReady).toBe(false);

    // Feed 26 frames
    for (let i = 0; i < 26; i++) {
      res = engine.processFrame(goodLandmarks, 170.0);
    }

    expect(res.status).toBe('READY');
    expect(res.isReady).toBe(true);
    expect(res.baselineAngles.baseline).toBe(170);
  });

  it('handles pause on persistent occlusion after calibration', () => {
    const goodLandmarks = makeMockLandmarks(true);
    for (let i = 0; i < 30; i++) {
      engine.processFrame(goodLandmarks, 170.0);
    }

    // Now landmarks vanish for 35 frames
    let res: any;
    for (let i = 0; i < 35; i++) {
      res = engine.processFrame([]);
    }

    expect(res.status).toBe('PAUSED_OCCLUSION');
    expect(res.isReady).toBe(false);
  });
});
