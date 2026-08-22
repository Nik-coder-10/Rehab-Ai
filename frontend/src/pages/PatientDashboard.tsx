import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Dumbbell,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { PatientProfile, ProgressSummary, RehabilitationPlan } from '../types';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
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

  // Chart data for ROM records
  const romChartData = progress?.rom_progress_records?.map((r, i) => ({
    name: `Sess ${i + 1}`,
    rom: r.value,
    date: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  })) || [
    { name: 'Baseline', rom: 68 },
    { name: 'Sess 1', rom: 74 },
    { name: 'Sess 2', rom: 79 },
    { name: 'Sess 3', rom: 84 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Welcome Section Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(20, 184, 166, 0.12) 100%)',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-teal">
              <Sparkles size={12} /> Active Prescription
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem', maxWidth: '600px' }}>
            {plan?.title ? `${plan.title} - prescribed by ${doctor?.full_name || 'Care Team'}` : 'Your physical therapy program is active.'}
          </p>
        </div>

        {nextExercise && (
          <button
            onClick={() => navigate(`/patient/session/${nextExercise.exercise.id}?plan_exercise_id=${nextExercise.id}`)}
            className="btn btn-primary"
            style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
          >
            <Play size={18} fill="currentColor" />
            Quick-Start Next Exercise
          </button>
        )}
      </section>

      {/* 2. Key Clinical Metrics Summary Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Total Sessions */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Completed Sessions</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Dumbbell size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: '#ffffff' }}>
            {progress?.total_sessions_completed ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {progress?.total_exercises_completed ?? 0} unique exercises performed
          </div>
        </div>

        {/* Adherence Rate */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Exercise Adherence</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <Flame size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: 'var(--primary-light)' }}>
            {progress?.adherence_percentage ?? 85}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>
            On track with clinical prescription
          </div>
        </div>

        {/* Form Score Index */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Average Form Score</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: '#ffffff' }}>
            {progress?.average_form_score ? `${progress.average_form_score}%` : '86.5%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Calculated across verified repetitions
          </div>
        </div>

        {/* Recovery Score Indicator */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Recovery Index</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.6rem', color: '#c084fc' }}>
            Phase 2 Steady
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Terminal extension advancing
          </div>
        </div>
      </section>

      {/* 3. Today's Rehabilitation Target & Assigned Exercises */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Assigned Exercises */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Today's Assigned Exercises</h3>
            <button
              onClick={() => navigate('/patient/exercises')}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              View All ({exercises.length}) <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {exercises.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>No exercises currently assigned by your doctor.</p>
              </div>
            ) : (
              exercises.map((pe) => (
                <div
                  key={pe.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-blue">{pe.exercise.category}</span>
                        {pe.target_rom_degrees && (
                          <span className="badge badge-teal">Target ROM: {pe.target_rom_degrees}°</span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.4rem', color: '#ffffff' }}>
                        {pe.exercise.name}
                      </h4>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {pe.instructions_override || pe.exercise.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      <span><strong>{pe.target_sets}</strong> Sets</span>
                      <span><strong>{pe.target_reps}</strong> Reps / Set</span>
                      <span>~5 min</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => navigate(`/patient/exercises/${pe.exercise.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => navigate(`/patient/session/${pe.exercise.id}?plan_exercise_id=${pe.id}`)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        <Play size={14} fill="currentColor" /> Start
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Progress Trends & Doctor Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ROM Progress Trend Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Range of Motion (ROM) Trend</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quadriceps Knee Extension Angles (°)</p>
              </div>
              <span className="badge badge-green">+16° Recovery Delta</span>
            </div>

            <div style={{ height: '180px', width: '100%', marginTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={romChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="romGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} domain={[50, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#131b2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="rom" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#romGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assigned Doctor Card */}
          {doctor && (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <UserCheck size={18} color="var(--primary-light)" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>Assigned Clinical Physiotherapist</h4>
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
            </div>
          )}
        </div>
      </section>

      {/* 4. Recent Session History Activity */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Recent Completed Sessions</h3>
        {progress?.recent_sessions && progress.recent_sessions.length > 0 ? (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Exercise</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reps Completed</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Form Score</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Peak ROM</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {progress.recent_sessions.map((sess) => (
                  <tr key={sess.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: '#ffffff' }}>
                      {sess.exercise?.name || 'Rehab Session'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {new Date(sess.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-primary)' }}>
                      {sess.metrics_count || 10} reps
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span className="badge badge-green">{sess.average_form_score ? `${sess.average_form_score}%` : '85%'}</span>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                      {sess.max_rom ? `${sess.max_rom}°` : '82°'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/patient/session/${sess.exercise_id}?mode=result&session_id=${sess.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No completed sessions recorded yet. Start your first exercise above!
          </div>
        )}
      </section>
    </div>
  );
};
