import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Info,
  Play,
} from 'lucide-react';
import { api } from '../services/api';
import type { Exercise, RehabilitationPlan } from '../types';

export const ExerciseDetailPage: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadExercise() {
      if (!exerciseId) return;
      try {
        setLoading(true);
        const [exData, planData] = await Promise.all([
          api.getExerciseDetail(exerciseId),
          api.getPatientPlan(),
        ]);
        setExercise(exData);
        setPlan(planData);
      } catch (err: any) {
        setError(err.message || 'Exercise not found.');
      } finally {
        setLoading(false);
      }
    }
    loadExercise();
  }, [exerciseId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '60px', width: '200px' }} />
        <div className="skeleton" style={{ height: '350px', width: '100%' }} />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--status-danger)' }}>Error Loading Exercise</h3>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>{error || 'Exercise not found'}</p>
        <button onClick={() => navigate('/patient/exercises')} className="btn btn-secondary">
          <ArrowLeft size={16} /> Return to Exercise Library
        </button>
      </div>
    );
  }

  const assignedPlanEx = plan?.exercises.find((pe) => pe.exercise_id === exercise.id);

  // Parse structured clinical steps
  const instructionLines = exercise.instructions ? exercise.instructions.split('\n').filter(Boolean) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Back Navigation */}
      <div>
        <button
          onClick={() => navigate('/patient/exercises')}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Exercises
        </button>
      </div>

      {/* Header Info Card */}
      <section
        className="glass-panel"
        style={{
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-teal">{exercise.category}</span>
            {assignedPlanEx && <span className="badge badge-green">Prescribed in Active Plan</span>}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {exercise.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {exercise.description}
          </p>
        </div>

        <button
          onClick={() =>
            navigate(`/patient/session/${exercise.id}${assignedPlanEx ? `?plan_exercise_id=${assignedPlanEx.id}` : ''}`)
          }
          className="btn btn-primary"
          style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
        >
          <Play size={18} fill="currentColor" /> Start Exercise Session
        </button>
      </section>

      {/* Prescription Parameters Bar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Prescribed Sets</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
            {assignedPlanEx?.target_sets || 3} Sets
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Reps Per Set</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
            {assignedPlanEx?.target_reps || 10} Reps
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Target Joint ROM</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: '0.2rem' }}>
            {assignedPlanEx?.target_rom_degrees || 85}°
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Rest Duration</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
            45 Sec
          </div>
        </div>
      </section>

      {/* Instructions & Step-by-Step Guidance */}
      <section className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} color="var(--primary-light)" /> Step-by-Step Exercise Guidance
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {instructionLines.map((line, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(20, 184, 166, 0.15)',
                  color: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', lineHeight: 1.5 }}>
                {line.replace(/^\d+\.\s*/, '')}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Clinical Caution & Common Form Mistakes */}
      <section className="glass-panel" style={{ padding: '1.75rem', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.03)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} /> Common Form Mistakes & Precautions
        </h3>

        <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <li>Avoid jerky, fast movements. Maintain a smooth 2-3 second eccentric (lowering) cadence.</li>
          <li>Do not hyperextend beyond comfortable joint limits or push through sharp acute pain.</li>
          <li>Keep your core braced and maintain upright posture to avoid lumbar compensation.</li>
          <li>Stop immediately if you experience sharp knee patellar pain or joint instability.</li>
        </ul>
      </section>

      {/* Therapist Override Notes */}
      {assignedPlanEx?.instructions_override && (
        <section className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-glow)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={16} /> Physiotherapist Special Instructions
          </h4>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {assignedPlanEx.instructions_override}
          </p>
        </section>
      )}
    </div>
  );
};
