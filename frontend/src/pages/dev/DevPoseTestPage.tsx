import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { PoseDetector } from '../../components/exercise/PoseDetector';
import type { PoseDetectionFrame } from '../../cv/landmarks';
import {
  JOINT_DEFINITIONS,
  KinematicMovementEngine,
  type JointType,
  type JointMovementAnalysis,
} from '../../cv/geometry';

export const DevPoseTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentFrame, setCurrentFrame] = useState<PoseDetectionFrame | null>(null);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  // Movement Analysis Engine State
  const engineRef = useRef<KinematicMovementEngine>(new KinematicMovementEngine());
  const [selectedJoint, setSelectedJoint] = useState<JointType>('RIGHT_KNEE');
  const [jointAnalyses, setJointAnalyses] = useState<Record<JointType, JointMovementAnalysis> | null>(null);

  const handlePoseFrame = (frame: PoseDetectionFrame) => {
    setCurrentFrame(frame);
    if (frame.landmarks.length > 0) {
      const analyses = engineRef.current.analyzeFrame(frame.landmarks, frame.timestamp);
      setJointAnalyses(analyses);
    }
  };

  const handleResetRom = () => {
    engineRef.current.reset(selectedJoint);
  };

  const currentAnalysis = jointAnalyses ? jointAnalyses[selectedJoint] : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0c121e', color: '#f8fafc', padding: '1.75rem 2rem' }}>
      <div style={{ maxWidth: '1350px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/patient')}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} /> Exit Sandbox
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                  Biomechanical Movement Analysis Studio
                </h1>
                <span className="badge badge-teal">Math Engine / 8 Kinematic Joints</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Real-time 2D/3D trigonometry, EMA & Median signal filtering, dynamic ROM & angular velocity.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
              <input
                type="checkbox"
                checked={showSkeleton}
                onChange={(e) => setShowSkeleton(e.target.checked)}
              />
              <span>Skeleton</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
              <input
                type="checkbox"
                checked={showAngles}
                onChange={(e) => setShowAngles(e.target.checked)}
              />
              <span>Live Angles</span>
            </label>
          </div>
        </div>

        {/* Studio Grid: Left Camera & Pose Overlay / Right Movement Telemetry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }} className="dev-grid">
          {/* Main Video & Landmark Overlay Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <PoseDetector
                onPoseFrame={handlePoseFrame}
                showSkeleton={showSkeleton}
                showAngles={showAngles}
              />
            </div>

            {/* Architecture Pipeline Summary */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Cpu size={24} color="var(--primary-light)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>Kinematic Pipeline:</strong> 33 Landmarks &rarr; Joint Triangle Vectors &rarr; Precision Arctan2 Angle &rarr; Median Outlier Filter &rarr; Exponential Smoothing &rarr; Dynamic Envelope Range of Motion (ROM) &rarr; $\Delta\theta/\Delta t$ Velocity &rarr; Movement State.
              </div>
            </div>
          </div>

          {/* Right Column: Joint Inspector & Movement Telemetry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Joint Selector Panel */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sliders size={16} color="var(--primary-light)" /> Kinematic Joint Inspector
                </h3>
                <button
                  onClick={handleResetRom}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  <RotateCcw size={12} /> Reset ROM
                </button>
              </div>

              <select
                value={selectedJoint}
                onChange={(e) => setSelectedJoint(e.target.value as JointType)}
                className="form-select"
                style={{ fontSize: '0.875rem' }}
              >
                {Object.values(JOINT_DEFINITIONS).map((j) => (
                  <option key={j.type} value={j.type}>
                    {j.name} ({j.proximal} &rarr; {j.vertex} &rarr; {j.distal})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Real-Time Biomechanical Metrics Card */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {JOINT_DEFINITIONS[selectedJoint].name} Telemetry
                </span>
                {currentAnalysis?.isValid ? (
                  <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                    <CheckCircle2 size={12} /> Tracking ({Math.round(currentAnalysis.visibility * 100)}% conf)
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                    Awaiting Joint
                  </span>
                )}
              </div>

              {/* 2x2 Metric Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Current Angle (Raw & Smoothed) */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SMOOTHED ANGLE</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                    {currentAnalysis?.isValid ? `${currentAnalysis.smoothedAngle}°` : '--'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Raw: {currentAnalysis?.isValid ? `${currentAnalysis.rawAngle}°` : '--'}
                  </div>
                </div>

                {/* Range of Motion (ROM) */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RANGE OF MOTION (ROM)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                    {currentAnalysis?.isValid ? `${currentAnalysis.rom}°` : '--'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Min: {currentAnalysis?.isValid ? `${currentAnalysis.minAngle}°` : '--'} | Max: {currentAnalysis?.isValid ? `${currentAnalysis.maxAngle}°` : '--'}
                  </div>
                </div>

                {/* Angular Velocity */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ANGULAR SPEED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa' }}>
                    {currentAnalysis?.isValid ? `${currentAnalysis.velocity}°/s` : '--'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: currentAnalysis?.velocityClass === 'TOO_FAST' ? '#ef4444' : '#34d399' }}>
                    {currentAnalysis?.isValid ? currentAnalysis.velocityClass : 'IDLE'}
                  </div>
                </div>

                {/* Movement State */}
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MOVEMENT STATE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: currentAnalysis?.state === 'MOVING' ? '#34d399' : '#fbbf24' }}>
                    {currentAnalysis?.isValid ? currentAnalysis.state : 'STANDBY'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Frame Rate: {currentFrame?.fps || 0} FPS
                  </div>
                </div>
              </div>
            </div>

            {/* 3. All 8 Joints Overview Table */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Kinematic Joints Overview</h3>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.35rem 0.4rem' }}>Joint</th>
                      <th style={{ padding: '0.35rem 0.4rem' }}>Angle</th>
                      <th style={{ padding: '0.35rem 0.4rem' }}>ROM</th>
                      <th style={{ padding: '0.35rem 0.4rem' }}>Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(JOINT_DEFINITIONS).map((def) => {
                      const analysis = jointAnalyses ? jointAnalyses[def.type] : null;
                      const isSelected = selectedJoint === def.type;
                      return (
                        <tr
                          key={def.type}
                          onClick={() => setSelectedJoint(def.type)}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.12)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.4rem', color: isSelected ? 'var(--primary-light)' : '#ffffff', fontWeight: isSelected ? 700 : 400 }}>
                            {def.name}
                          </td>
                          <td style={{ padding: '0.4rem', color: analysis?.isValid ? '#ffffff' : 'var(--text-muted)' }}>
                            {analysis?.isValid ? `${analysis.smoothedAngle}°` : '--'}
                          </td>
                          <td style={{ padding: '0.4rem', color: analysis?.isValid ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                            {analysis?.isValid ? `${analysis.rom}°` : '--'}
                          </td>
                          <td style={{ padding: '0.4rem', color: analysis?.isValid ? '#60a5fa' : 'var(--text-muted)' }}>
                            {analysis?.isValid ? `${analysis.velocity}°/s` : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
