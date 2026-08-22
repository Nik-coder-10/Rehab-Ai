import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateJointAngle,
  getLandmark,
  isLandmarkVisible,
  POSE_CONNECTIONS,
} from '../../cv/landmarks';
import type {
  PoseDetectionFrame,
  PoseQualityState,
} from '../../cv/landmarks';
import { detectPoseInVideoFrame, getPoseLandmarker } from '../../cv/poseService';

interface PoseDetectorProps {
  onPoseFrame?: (frame: PoseDetectionFrame) => void;
  showSkeleton?: boolean;
  showAngles?: boolean;
  videoSourceUrl?: string; // Optional test video URL for deterministic verification
}

export const PoseDetector: React.FC<PoseDetectorProps> = ({
  onPoseFrame,
  showSkeleton = true,
  showAngles = true,
  videoSourceUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [qualityState, setQualityState] = useState<PoseQualityState>('NO_PERSON');
  const [qualityReason, setQualityReason] = useState<string>('Camera offline');
  const [fps, setFps] = useState<number>(0);
  const [landmarkCount, setLandmarkCount] = useState<number>(0);
  const [rightKneeAngle, setRightKneeAngle] = useState<number | null>(null);
  const [leftKneeAngle, setLeftKneeAngle] = useState<number | null>(null);

  // FPS Calculation
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // 1. Initialize MediaPipe Model
  useEffect(() => {
    let mounted = true;
    async function initModel() {
      try {
        setModelLoading(true);
        const lm = await getPoseLandmarker();
        if (mounted) {
          landmarkerRef.current = lm;
          setModelLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setCameraError(`MediaPipe Initialization Error: ${err.message}`);
          setModelLoading(false);
        }
      }
    }
    initModel();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Start Camera Feed
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (videoSourceUrl && videoRef.current) {
        // If a test video file is supplied for deterministic testing
        videoRef.current.src = videoSourceUrl;
        videoRef.current.loop = true;
        await videoRef.current.play();
        setIsCameraActive(true);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support webcam video streaming (getUserMedia).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam device detected on your system. You can test with test video mode.');
      } else {
        setCameraError(err.message || 'Failed to start camera feed.');
      }
      setIsCameraActive(false);
    }
  }, [videoSourceUrl]);

  // 3. Stop Camera Feed & Release Stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setQualityState('NO_PERSON');
    setQualityReason('Camera stream stopped');
    setFps(0);
    setLandmarkCount(0);

    // Clear Canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 4. Processing & Rendering Loop
  useEffect(() => {
    let active = true;

    const processFrame = () => {
      if (!active || !isCameraActive || !videoRef.current || !canvasRef.current || !landmarkerRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState >= 2 && ctx) {
        // Match canvas dimensions to video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const now = performance.now();
        frameCountRef.current++;
        if (now - lastTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }

        // Run REAL MediaPipe Pose Detection
        try {
          const frame = detectPoseInVideoFrame(landmarkerRef.current, video, now, fps);

          setQualityState(frame.quality);
          setQualityReason(frame.qualityReason || '');
          setLandmarkCount(frame.landmarks.length);

          // Clear previous canvas drawing
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (frame.landmarks.length > 0) {
            // Draw Skeleton Connections
            if (showSkeleton) {
              ctx.lineWidth = 3;
              ctx.strokeStyle = frame.quality === 'READY' ? '#14b8a6' : '#f59e0b';

              for (const [startName, endName] of POSE_CONNECTIONS) {
                const startLm = getLandmark(frame.landmarks, startName);
                const endLm = getLandmark(frame.landmarks, endName);

                if (
                  isLandmarkVisible(startLm, 0.4) &&
                  isLandmarkVisible(endLm, 0.4) &&
                  startLm &&
                  endLm
                ) {
                  ctx.beginPath();
                  ctx.moveTo(startLm.x * canvas.width, startLm.y * canvas.height);
                  ctx.lineTo(endLm.x * canvas.width, endLm.y * canvas.height);
                  ctx.stroke();
                }
              }

              // Draw Landmark Keypoints
              for (const lm of frame.landmarks) {
                if (isLandmarkVisible(lm, 0.4)) {
                  ctx.beginPath();
                  ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI);
                  ctx.fillStyle = '#ffffff';
                  ctx.fill();
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = '#3b82f6';
                  ctx.stroke();
                }
              }
            }

            // Real-time Joint Angle Computation
            if (showAngles) {
              const rHip = getLandmark(frame.landmarks, 'RIGHT_HIP');
              const rKnee = getLandmark(frame.landmarks, 'RIGHT_KNEE');
              const rAnkle = getLandmark(frame.landmarks, 'RIGHT_ANKLE');

              if (rHip && rKnee && rAnkle && isLandmarkVisible(rKnee, 0.5)) {
                const angle = calculateJointAngle(rHip, rKnee, rAnkle);
                setRightKneeAngle(angle);

                // Draw Angle annotation on canvas
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 16px monospace';
                ctx.fillText(`${angle}°`, rKnee.x * canvas.width + 10, rKnee.y * canvas.height);
              }

              const lHip = getLandmark(frame.landmarks, 'LEFT_HIP');
              const lKnee = getLandmark(frame.landmarks, 'LEFT_KNEE');
              const lAnkle = getLandmark(frame.landmarks, 'LEFT_ANKLE');

              if (lHip && lKnee && lAnkle && isLandmarkVisible(lKnee, 0.5)) {
                const angle = calculateJointAngle(lHip, lKnee, lAnkle);
                setLeftKneeAngle(angle);

                ctx.fillStyle = '#60a5fa';
                ctx.font = 'bold 16px monospace';
                ctx.fillText(`${angle}°`, lKnee.x * canvas.width - 45, lKnee.y * canvas.height);
              }
            }
          }

          if (onPoseFrame) {
            onPoseFrame(frame);
          }
        } catch (err) {
          console.error('Frame pose detection error:', err);
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    if (isCameraActive) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive, showSkeleton, showAngles, onPoseFrame, fps]);

  const getQualityBadge = () => {
    switch (qualityState) {
      case 'READY':
        return <span className="badge badge-green"><CheckCircle2 size={12} /> READY (Optimal Tracking)</span>;
      case 'PARTIAL_BODY':
        return <span className="badge badge-blue"><Layers size={12} /> PARTIAL BODY</span>;
      case 'POOR_VISIBILITY':
        return <span className="badge badge-amber"><ShieldAlert size={12} /> POOR VISIBILITY</span>;
      default:
        return <span className="badge badge-teal" style={{ opacity: 0.7 }}>NO PERSON DETECTED</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* Camera & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isCameraActive ? (
            <button onClick={stopCamera} className="btn btn-danger" style={{ padding: '0.55rem 1.1rem' }}>
              <CameraOff size={16} /> Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={modelLoading}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.1rem' }}
            >
              <Camera size={16} /> {modelLoading ? 'Loading MediaPipe WASM...' : 'Start Webcam Stream'}
            </button>
          )}

          {getQualityBadge()}
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>FPS: <strong style={{ color: fps > 20 ? '#10b981' : '#f59e0b' }}>{fps}</strong></span>
          <span>Landmarks: <strong style={{ color: '#ffffff' }}>{landmarkCount} / 33</strong></span>
          {rightKneeAngle && <span>R Knee: <strong style={{ color: '#10b981' }}>{rightKneeAngle}°</strong></span>}
          {leftKneeAngle && <span>L Knee: <strong style={{ color: '#60a5fa' }}>{leftKneeAngle}°</strong></span>}
        </div>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ShieldAlert size={20} />
          <div>
            <strong>Camera Error:</strong> {cameraError}
          </div>
        </div>
      )}

      {/* Main Viewport & Skeleton Overlay Layer */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '460px',
          backgroundColor: '#070b14',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isCameraActive ? '2px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-subtle)',
        }}
      >
        {/* Real HTML5 Video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '560px',
            objectFit: 'contain',
            transform: 'scaleX(-1)', // Mirror webcam for natural physical therapy feedback
            display: isCameraActive ? 'block' : 'none',
          }}
        />

        {/* Real Canvas 2D Skeleton Overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transform: 'scaleX(-1)', // Match mirrored video transform
            display: isCameraActive ? 'block' : 'none',
          }}
        />

        {/* Offline Placeholder */}
        {!isCameraActive && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px dashed rgba(20, 184, 166, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Camera size={36} color="var(--primary-light)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Camera Stream Standby</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginTop: '0.4rem' }}>
              Click 'Start Webcam Stream' above to initialize MediaPipe Pose estimation and 33-landmark skeleton tracking.
            </p>
          </div>
        )}

        {/* Real-time Status Overlay at bottom */}
        {isCameraActive && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              right: '1rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 500 }}>
              {qualityReason}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontFamily: 'monospace' }}>
              MediaPipe GPU Pipeline Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
