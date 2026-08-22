import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  evaluatePoseQuality,
  POSE_LANDMARKS,
  type NormalizedLandmark,
  type PoseDetectionFrame,
} from './landmarks';

let poseLandmarkerInstance: PoseLandmarker | null = null;
let isInitializing = false;

/**
 * Initializes and caches the MediaPipe PoseLandmarker instance using WASM
 */
export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarkerInstance) {
    return poseLandmarkerInstance;
  }

  if (isInitializing) {
    // Wait until existing initialization finishes
    while (isInitializing) {
      await new Promise((res) => setTimeout(res, 50));
    }
    if (poseLandmarkerInstance) return poseLandmarkerInstance;
  }

  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    return poseLandmarkerInstance;
  } finally {
    isInitializing = false;
  }
}

/**
 * Executes pose detection on a HTMLVideoElement frame and maps to NormalizedLandmark model
 */
export function detectPoseInVideoFrame(
  landmarker: PoseLandmarker,
  videoElement: HTMLVideoElement,
  timestampMs: number,
  fps = 30
): PoseDetectionFrame {
  const result = landmarker.detectForVideo(videoElement, timestampMs);

  if (!result.landmarks || result.landmarks.length === 0) {
    return {
      landmarks: [],
      quality: 'NO_PERSON',
      qualityReason: 'No person detected in video frame.',
      fps,
      timestamp: timestampMs,
    };
  }

  const rawLandmarks = result.landmarks[0];
  const normalized: NormalizedLandmark[] = rawLandmarks.map((lm, idx) => ({
    index: idx,
    name: POSE_LANDMARKS[idx] || 'NOSE',
    x: lm.x,
    y: lm.y,
    z: lm.z,
    visibility: lm.visibility ?? 1.0,
  }));

  const { quality, reason } = evaluatePoseQuality(normalized);

  return {
    landmarks: normalized,
    quality,
    qualityReason: reason,
    fps,
    timestamp: timestampMs,
  };
}
