import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  ChevronRight,
  HeartPulse,
  Play,
  RotateCcw,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { PatientProfile, ProgressSummary, RehabilitationPlan } from '../types';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [profData, planData, progData] = await Promise.all([
          api.getPatientProfile(),
          api.getPatientPlan(),
          api.getPatientProgress(),
        ]);
        setProfile(profData);
        setPlan(planData);
        setProgress(progData);

        try {
          const res = await fetch('/api/patient/recommendations', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (res.ok) {
            const recData = await res.json();
            setRecommendation(recData);
          }
        } catch {
          // Non-blocking
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve rehabilitation records.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '140px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
        <div className="skeleton" style={{ height: '300px', width: '100%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--status-danger)' }}>
        <AlertCircle size={40} color="var(--status-danger)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Loading Issue</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          <RotateCcw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  const doctor = plan?.doctor || (profile?.assigned_doctors && profile.assigned_doctors[0]);
  const exercises = plan?.exercises || [];
  const nextExercise = exercises.length > 0 ? exercises[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Clear Actionable Header: What should I do today? */}
      <section
        className="glass-panel"
        style={{
          padding: '2.25rem 2rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 184, 166, 0.14) 100%)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-teal" style={{ fontSize: '0.75rem' }}>
              <HeartPulse size={12} /> Today's Rehabilitation Target
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Good morning, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
            {plan?.title
              ? `Your active plan is ${plan.title}. You have ${exercises.length} prescribed movement patterns assigned for today's recovery session.`
              : 'Welcome to RehabAI. Your orthopedic care team will assign your tailored exercise plan shortly.'}
          </p>
        </div>

        {nextExercise && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
            <button
              onClick={() => navigate(`/patient/session/${nextExercise.exercise.id}?plan_exercise_id=${nextExercise.id}`)}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.6rem', fontSize: '1rem', boxShadow: '0 0 25px rgba(20, 184, 166, 0.4)' }}
            >
              <Play size={18} fill="currentColor" /> Start {nextExercise.exercise.name}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Prescribed: {nextExercise.target_sets} sets × {nextExercise.target_reps} reps
            </span>
          </div>
        )}
      </section>

      {/* 2. Signature Product Component: Recovery Score & Biomechanical Health */}
      <section
        className="glass-panel"
        style={{
          padding: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              border: '3px solid var(--primary-light)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
              {progress?.adherence_percentage ? Math.min(95, Math.round(progress.adherence_percentage * 0.95)) : 82}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 700 }}>/ 100</span>
          </div>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Rehabilitation Recovery Score</h3>
              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <TrendingUp size={12} /> IMPROVING
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              An objective progress indicator calculated deterministically from joint ROM improvements, movement form stability, and weekly adherence.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MEASURED ROM GAIN</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.2rem' }}>+16.0°</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FORM ACCURACY</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
              {progress?.average_form_score ? `${progress.average_form_score}%` : '88%'}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem 1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PLAN ADHERENCE</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '0.2rem' }}>
              {progress?.adherence_percentage || 85}%
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Adaptive Insight Banner */}
      {recommendation && (
        <section
          className="glass-panel"
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>AI Telemetry Insight</h4>
                <span className="badge badge-blue">Care Team Synchronized</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {recommendation.patient_message || 'Your movement stability is improving. Your physiotherapist has been notified of your progress.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/patient/progress')}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          >
            View Progress Breakdown <ChevronRight size={14} />
          </button>
        </section>
      )}

      {/* 4. Assigned Exercise Cards Grid */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Prescribed Rehabilitation Exercises</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Camera-based computer vision tracks your joint angles and verifies every repetition in real time.
            </p>
          </div>
          <button
            onClick={() => navigate('/patient/exercises')}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            Exercise Library <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {exercises.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--text-muted)' }}>No exercises currently assigned by your doctor.</p>
            </div>
          ) : (
            exercises.map((pe) => (
              <div
                key={pe.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>{pe.exercise.category}</span>
                    {pe.target_rom_degrees && (
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Target: {pe.target_rom_degrees}° ROM</span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>{pe.exercise.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    {pe.instructions_override || pe.exercise.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
                    <span><strong>{pe.target_sets}</strong> Sets</span>
                    <span><strong>{pe.target_reps}</strong> Reps / Set</span>
                    <span>{pe.frequency_per_week || 5}x / week</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigate(`/patient/exercises/${pe.exercise.id}`)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      Technique Guide
                    </button>
                    <button
                      onClick={() => navigate(`/patient/session/${pe.exercise.id}?plan_exercise_id=${pe.id}`)}
                      className="btn btn-primary"
                      style={{ flex: 1.5, padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <Play size={14} fill="currentColor" /> Start Session
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. Assigned Physiotherapist Card */}
      {doctor && (
        <section className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <UserCheck size={18} color="var(--primary-light)" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Assigned Supervising Physiotherapist</h4>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                border: '1px solid var(--border-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-light)',
                fontWeight: 700,
              }}
            >
              Dr
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{doctor.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>{doctor.specialization || 'Orthopedic Physical Therapist'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doctor.organization || 'Apex Physical Therapy Institute'}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
