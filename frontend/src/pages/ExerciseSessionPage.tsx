import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { api } from '../services/api';
import type { Exercise, ExerciseSession } from '../types';

export const ExerciseSessionPage: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const [searchParams] = useSearchParams();
  const planExerciseId = searchParams.get('plan_exercise_id');
  const initialSessionId = searchParams.get('session_id');
  const mode = searchParams.get('mode'); // 'result' or undefined (active)

  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(mode !== 'result');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(mode === 'result');

  // Exercise Session Live State
  const [targetReps] = useState<number>(10);
  const [currentReps, setCurrentReps] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [liveFormScore, setLiveFormScore] = useState<number>(88);
  const [liveRomAngle, setLiveRomAngle] = useState<number>(76);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Ready. Position yourself in camera frame.');

  // Initialize Session
  useEffect(() => {
    async function initSession() {
      if (!exerciseId) return;
      try {
        setLoading(true);
        const exData = await api.getExerciseDetail(exerciseId);
        setExercise(exData);

        if (initialSessionId) {
          const sessData = await api.getSessionDetail(initialSessionId);
          setSession(sessData);
          if (mode === 'result') {
            setSessionCompleted(true);
            setIsSessionActive(false);
          }
        } else {
          // Create new backend session
          const newSess = await api.createSession(exerciseId, planExerciseId);
          setSession(newSess);
        }
      } catch (err) {
        console.error('Failed to init session:', err);
      } finally {
        setLoading(false);
      }
    }
    initSession();
  }, [exerciseId, initialSessionId, planExerciseId, mode]);

  // Live Timer Hook
  useEffect(() => {
    let interval: any = null;
    if (isSessionActive && !isPaused && !sessionCompleted) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, sessionCompleted]);

  // Simulate Repetition Increment for developer / test interaction
  const handleSimulateRep = () => {
    if (currentReps + 1 >= targetReps) {
      setCurrentReps(targetReps);
      setLiveRomAngle(84);
      setLiveFormScore(92);
      setFeedbackMessage('Target completed! Perfect terminal joint extension.');
      handleEndSession(targetReps);
    } else {
      const next = currentReps + 1;
      setCurrentReps(next);
      setLiveRomAngle(75 + (next % 4) * 3);
      setLiveFormScore(86 + (next % 3) * 2);
      setFeedbackMessage('Good extension. Maintain 2-second hold at peak.');
    }
  };

  const handleEndSession = async (repsToSubmit?: number) => {
    if (!session) return;
    try {
      const reps = repsToSubmit !== undefined ? repsToSubmit : currentReps;
      const updated = await api.finishSession(session.id, {
        status: 'completed',
        completed_reps: reps,
      });
      setSession(updated);
      setSessionCompleted(true);
      setIsSessionActive(false);
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Initializing Exercise Session...</p>
      </div>
    );
  }

  // --- RESULT VIEW (Session Complete) ---
  if (sessionCompleted) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(20, 184, 166, 0.12) 100%)',
            border: '1px solid rgba(20, 184, 166, 0.3)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(20, 184, 166, 0.2)',
              border: '1px solid var(--border-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
            }}
          >
            <CheckCircle2 size={36} color="var(--primary-light)" />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>Rehabilitation Session Completed!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            {exercise?.name} summary recorded and synced with your care team.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REPETITIONS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {currentReps || session?.metrics_count || 10} / {targetReps}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DURATION</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                {timerSeconds > 0 ? formatTime(timerSeconds) : '02:45'}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AVERAGE FORM</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '0.25rem' }}>
                {liveFormScore}%
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PEAK ROM</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                {liveRomAngle}°
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.25rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/patient/progress')} className="btn btn-secondary">
              <Activity size={16} /> View Longitudinal Progress
            </button>
            <button onClick={() => navigate('/patient')} className="btn btn-primary">
              Return to Dashboard <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE SESSION INTERFACE (Camera / CV Pipeline Hook) ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Session Status Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/patient/exercises')}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>{exercise?.name}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-teal">Live Session</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{exercise?.category}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SESSION TIME</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
              {formatTime(timerSeconds)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem' }}
            >
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => handleEndSession()}
              className="btn btn-danger"
              style={{ padding: '0.5rem 0.9rem' }}
            >
              <StopCircle size={16} /> End Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport: Camera / Overlay Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }} className="session-grid">
        {/* Left: Camera Feed & Pose Overlay Area */}
        <div
          className="glass-panel"
          style={{
            position: 'relative',
            minHeight: '480px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            backgroundColor: '#070b14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(20, 184, 166, 0.3)',
          }}
        >
          {/* CAMERA FEED PLACEHOLDER (Will bind to webcam / MediaPipe video) */}
          <div
            id="CameraFeed"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at center, #111a2e 0%, #060a12 100%)',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px dashed rgba(20, 184, 166, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <Camera size={32} color="var(--primary-light)" />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Camera & Pose Tracking Area</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', marginTop: '0.4rem' }}>
              MediaPipe Computer Vision pipeline hook ready. Place device 2 meters away with full body visible.
            </p>

            <button
              onClick={handleSimulateRep}
              className="btn btn-secondary"
              style={{ marginTop: '1.5rem', background: 'rgba(20, 184, 166, 0.15)', borderColor: 'var(--border-glow)' }}
            >
              <Sparkles size={16} color="var(--primary-light)" />
              Simulate Repetition ({currentReps}/{targetReps})
            </button>
          </div>

          {/* POSE OVERLAY HOOK */}
          <div
            id="PoseOverlay"
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              zIndex: 10,
            }}
          >
            <span className="badge badge-teal">
              <Eye size={12} /> Landmark Detection Ready
            </span>
          </div>

          {/* Real-time Form Feedback Banner at bottom of viewport */}
          <div
            id="FormFeedback"
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              right: '1rem',
              padding: '0.85rem 1.25rem',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              zIndex: 10,
            }}
          >
            <ShieldCheck size={20} color="var(--primary-light)" />
            <span style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: 500 }}>
              {feedbackMessage}
            </span>
          </div>
        </div>

        {/* Right: Rep Counter & Session Live Metrics Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Rep Counter */}
          <div
            id="RepCounter"
            className="glass-panel"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(23, 33, 56, 0.9) 0%, rgba(20, 184, 166, 0.1) 100%)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Target Repetitions
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, margin: '0.5rem 0' }}>
              {currentReps} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {targetReps}</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(currentReps / targetReps) * 100}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary-light)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Session Metrics Hook */}
          <div id="SessionMetrics" className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Joint & Form Telemetry</h4>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Instantaneous Form Score</span>
                <strong style={{ color: 'var(--primary-light)' }}>{liveFormScore}%</strong>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                <div style={{ width: `${liveFormScore}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current Joint Angle (ROM)</span>
                <strong style={{ color: '#60a5fa' }}>{liveRomAngle}°</strong>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                <div style={{ width: `${(liveRomAngle / 90) * 100}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
              </div>
            </div>
          </div>

          {/* Exercise Instructions Quick Reference */}
          <div className="glass-panel" style={{ padding: '1.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <h5 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>Form Cue</h5>
            <p>{exercise?.instructions?.split('\n')[0] || 'Maintain posture and move with steady cadence.'}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .session-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
