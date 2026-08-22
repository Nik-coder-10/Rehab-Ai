import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Cpu,
  Zap,
} from 'lucide-react';
import { PoseDetector } from '../../components/exercise/PoseDetector';
import type { NormalizedLandmark, PoseDetectionFrame } from '../../cv/landmarks';

export const DevPoseTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentFrame, setCurrentFrame] = useState<PoseDetectionFrame | null>(null);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0c121e', color: '#f8fafc', padding: '1.75rem 2rem' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/patient')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} /> Exit Dev Sandbox
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                  MediaPipe Pose Estimation Testing Studio
                </h1>
                <span className="badge badge-teal">Dev Pipeline / 33 Landmarks</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Real client-side WASM/GPU inference via user webcam without server streaming.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
              <input
                type="checkbox"
                checked={showSkeleton}
                onChange={(e) => setShowSkeleton(e.target.checked)}
              />
              <span>Skeleton Lines</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
              <input
                type="checkbox"
                checked={showAngles}
                onChange={(e) => setShowAngles(e.target.checked)}
              />
              <span>Joint Angles (ROM)</span>
            </label>
          </div>
        </div>

        {/* Studio Grid: Left Camera & Pose Overlay / Right Telemetry Log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }} className="dev-grid">
          {/* Main Video & Landmark Overlay Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <PoseDetector
                onPoseFrame={(frame) => setCurrentFrame(frame)}
                showSkeleton={showSkeleton}
                showAngles={showAngles}
              />
            </div>

            {/* Architecture & Pipeline Reference */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Cpu size={24} color="var(--primary-light)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>Client-Side Computer Vision Pipeline:</strong> Webcam HTML5 Video Frame &rarr; WebGL/WASM Texture &rarr; MediaPipe Pose Landmarker Model (Float16) &rarr; 33 Biomechanical 3D Landmarks &rarr; Normalized Joint Coordinates &rarr; Canvas 2D Skeleton Overlay.
              </div>
            </div>
          </div>

          {/* Right Column: Live Landmark Telemetry Table & Debug Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Live Status Card */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={16} color="#fbbf24" /> Frame Telemetry
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PIPELINE FPS</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{currentFrame?.fps || 0}</div>
                </div>

                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LANDMARKS DETECTED</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa' }}>
                    {currentFrame?.landmarks.length || 0} / 33
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Pose Quality: <strong style={{ color: '#ffffff' }}>{currentFrame?.quality || 'IDLE'}</strong>
              </div>
            </div>

            {/* Landmark Inspector Table */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Key Joint Coordinates</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Normalized (x, y, visibility)</span>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
                {currentFrame && currentFrame.landmarks.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.3rem 0.4rem' }}>Joint</th>
                        <th style={{ padding: '0.3rem 0.4rem' }}>X</th>
                        <th style={{ padding: '0.3rem 0.4rem' }}>Y</th>
                        <th style={{ padding: '0.3rem 0.4rem' }}>Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFrame.landmarks.slice(11, 29).map((lm: NormalizedLandmark) => (
                        <tr key={lm.index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '0.35rem 0.4rem', color: '#ffffff' }}>{lm.name}</td>
                          <td style={{ padding: '0.35rem 0.4rem', color: 'var(--primary-light)' }}>{lm.x.toFixed(3)}</td>
                          <td style={{ padding: '0.35rem 0.4rem', color: '#60a5fa' }}>{lm.y.toFixed(3)}</td>
                          <td style={{ padding: '0.35rem 0.4rem', color: lm.visibility > 0.5 ? '#10b981' : '#f59e0b' }}>
                            {Math.round(lm.visibility * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                    Awaiting active camera frame and detected body pose...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dev-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
