import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { Exercise, ExerciseSession } from '../types';
import { PoseDetector } from '../components/exercise/PoseDetector';
import type { PoseDetectionFrame } from '../cv/landmarks';
import { exerciseRegistry } from '../cv/exercises/registry';
import type { IExerciseAnalyzer, ExerciseAnalysisResult } from '../cv/exercises/core/types';
import { ExerciseSessionWsClient, type WsConnectionStatus } from '../services/sessionWsClient';

export const ExerciseSessionPage: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [savingSession, setSavingSession] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('CONNECTING');

  // Dynamic Biomechanical Analyzer Instance
  const analyzerRef = useRef<IExerciseAnalyzer>(exerciseRegistry.get('squat'));
  const wsClientRef = useRef<ExerciseSessionWsClient | null>(null);
  const lastProcessedRepCountRef = useRef<number>(0);

  const [analysisResult, setAnalysisResult] = useState<ExerciseAnalysisResult | null>(null);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [targetReps, setTargetReps] = useState<number>(10);
  const [formScore, setFormScore] = useState<number>(100);
  const [peakRom, setPeakRom] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<string>('STARTING');
  const [feedbackMessage, setFeedbackMessage] = useState<string>(
    'Stand 2 meters in front of the camera with your target joint in view.'
  );

  useEffect(() => {
    async function loadData() {
      if (!exerciseId) return;
      try {
        setLoading(true);
        const ex = await api.getExerciseDetail(exerciseId);
        setExercise(ex);

        // Dynamically instantiate the correct exercise analyzer from the registry
        const analyzerInstance = exerciseRegistry.get(ex.code || ex.name);
        analyzerRef.current = analyzerInstance;

        // Fetch prescription from patient plan if available
        try {
          const plan = await api.getPatientPlan();
          if (plan) {
            const planEx = plan.exercises.find((p) => p.exercise_id === exerciseId);
            if (planEx) {
              setTargetReps(planEx.target_reps);
            }
          }
        } catch {
          // Fallback to default
        }

        // Initialize session on backend
        const sess = await api.createSession(exerciseId);
        setSession(sess);
        setSessionActive(true);

        // Establish WebSocket telemetry channel
        const token = localStorage.getItem('token') || '';
        const wsClient = new ExerciseSessionWsClient({
          sessionId: sess.id,
          token,
          onStatusChange: (s) => setWsStatus(s),
        });
        wsClient.connect();
        wsClientRef.current = wsClient;
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return () => {
      wsClientRef.current?.disconnect();
    };
  }, [exerciseId]);

  // Session elapsed timer
  useEffect(() => {
    let interval: any;
    if (sessionActive) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Handle live pose estimation frame & feed to active dynamic analyzer + WebSocket
  const handlePoseFrame = (frame: PoseDetectionFrame) => {
    if (!sessionActive || frame.landmarks.length === 0) return;

    const analysis = analyzerRef.current.processFrame(frame.landmarks, frame.timestamp);
    setAnalysisResult(analysis);
    setCurrentPhase(analysis.phase);
    setCurrentReps(analysis.repCount);
    setFeedbackMessage(analysis.activeFeedback);
    setPeakRom(Math.round(analysis.currentRom));

    if (analysis.completedReps.length > 0) {
      const avgScore = Math.round(
        analysis.completedReps.reduce((acc, r) => acc + r.formScore, 0) / analysis.completedReps.length
      );
      setFormScore(avgScore);

      // Detect discrete rep completion to send over WebSocket
      if (analysis.repCount > lastProcessedRepCountRef.current) {
        const latestRep = analysis.completedReps[analysis.completedReps.length - 1];
        wsClientRef.current?.sendRepCompleted({
          rep_number: latestRep.repNumber,
          form_score: latestRep.formScore,
          peak_rom: latestRep.peakRom,
          duration_seconds: latestRep.durationSeconds,
          feedback_cues: latestRep.feedbackCues,
        });
        lastProcessedRepCountRef.current = analysis.repCount;
      }
    }

    // Stream lightweight metrics heartbeat over WebSocket
    wsClientRef.current?.sendMetrics({
      current_angle: analysis.currentAngle,
      current_rom: analysis.currentRom,
      current_velocity: analysis.currentVelocity,
      phase: analysis.phase,
      current_score: formScore,
      active_feedback: analysis.activeFeedback,
      reps_completed: analysis.repCount,
    });
  };

  // Toggle pause/resume
  const handleTogglePause = () => {
    if (sessionActive) {
      wsClientRef.current?.pauseSession();
      setSessionActive(false);
    } else {
      wsClientRef.current?.resumeSession();
      setSessionActive(true);
    }
  };

  // End and persist session with real biomechanical data to backend
  const handleEndSession = async () => {
    if (!session) {
      navigate('/patient');
      return;
    }
    setSavingSession(true);
    try {
      wsClientRef.current?.endSession();
      await api.finishSession(session.id, {
        status: 'completed',
        completed_reps: currentReps,
      });
      navigate(`/patient`);
    } catch (err) {
      console.error(err);
      navigate('/patient');
    } finally {
      setSavingSession(false);
    }
  };

  const handleSimulateRep = () => {
    // Manual step simulation for testing fallback
    analyzerRef.current.processAngle?.(95);
    setTimeout(() => {
      const finish = analyzerRef.current.processAngle?.(175);
      if (finish) {
        setCurrentReps(finish.repCount);
        setCurrentPhase(finish.phase);
        setFeedbackMessage(finish.activeFeedback);
      }
    }, 400);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPhaseBadge = (phase: string) => {
    switch (phase.toUpperCase()) {
      case 'STARTING':
      case 'STANDING':
      case 'SUPINE':
      case 'FLEXED':
      case 'EXTENSION':
      case 'ADDUCTION':
      case 'NEUTRAL':
        return <span className="badge badge-teal">{phase}</span>;
      case 'DESCENDING':
      case 'FLEXING':
      case 'ABDUCTING':
      case 'FLEXING_FORWARD':
      case 'EXTENDING':
      case 'RAISING':
        return <span className="badge badge-blue">{phase}</span>;
      case 'BOTTOM':
      case 'PEAK_CONTRACTION':
      case 'PEAK_ELEVATION':
      case 'OVERHEAD_PEAK':
      case 'TERMINAL_EXTENSION':
        return <span className="badge badge-green">PEAK ROM</span>;
      case 'ASCENDING':
      case 'LOWERING':
      case 'ADDUCTING':
        return <span className="badge badge-amber">{phase}</span>;
      default:
        return <span className="badge badge-teal">{phase}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '70px', width: '100%' }} />
        <div className="skeleton" style={{ height: '480px', width: '100%' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Session Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/patient/exercises')}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} /> Exit
          </button>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {exercise?.name || 'Rehabilitation Session'}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
              <span className="badge badge-teal">{exercise?.category}</span>
              {getPhaseBadge(currentPhase)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Real-time Connection Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  wsStatus === 'CONNECTED'
                    ? '#10b981'
                    : wsStatus === 'RECONNECTING' || wsStatus === 'CONNECTING'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>{wsStatus}</span>
          </div>

          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1.1rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#ffffff',
            }}
          >
            {formatTime(elapsedSeconds)}
          </div>

          <button
            onClick={handleTogglePause}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 0.9rem' }}
          >
            {sessionActive ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={handleEndSession}
            disabled={savingSession}
            className="btn btn-danger"
            style={{ padding: '0.55rem 1.25rem' }}
          >
            <StopCircle size={18} /> {savingSession ? 'Saving Session...' : 'Finish Workout'}
          </button>
        </div>
      </div>

      {/* Main Studio Viewport: Camera / Squat Overlay Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }} className="session-grid">
        {/* Left: Real Camera Feed & Pose Overlay Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <PoseDetector
            onPoseFrame={handlePoseFrame}
            showSkeleton={true}
            showAngles={true}
          />

          {/* Form Feedback & Coaching Banner */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(20, 184, 166, 0.08)',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(20, 184, 166, 0.2)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--primary-light)" />
              <span style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
                {feedbackMessage}
              </span>
            </div>

            <button
              onClick={handleSimulateRep}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Sparkles size={13} color="var(--primary-light)" /> Simulate Rep ({currentReps}/{targetReps})
            </button>
          </div>
        </div>

        {/* Right: Rep Counter & Session Live Metrics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Reps Goal Tile */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              REPETITIONS COMPLETED
            </span>
            <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, margin: '0.5rem 0' }}>
              {currentReps}
              <span style={{ fontSize: '1.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>/{targetReps}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginTop: '0.5rem',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (currentReps / targetReps) * 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary-light)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Form Score Tile */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FORM ACCURACY</span>
              <span className="badge badge-green">{formScore}%</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', marginTop: '0.4rem' }}>
              {formScore >= 80 ? 'Optimal Technique' : 'Good Focus'}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Depth: 35% | Tempo: 25% | Torso: 20% | Alignment: 20%
            </p>
          </div>

          {/* Peak ROM Tile */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MEASURED ROM</span>
              <span className="badge badge-blue">{peakRom}°</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.4rem' }}>
              {peakRom >= 80 ? 'Full Depth' : 'Working ROM'}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Vertex angle: {analysisResult ? `${Math.round(analysisResult.currentAngle)}°` : '--'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 850px) {
          .session-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
