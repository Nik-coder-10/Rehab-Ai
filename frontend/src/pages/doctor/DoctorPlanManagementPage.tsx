import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Exercise, PatientDetail } from '../../types';

export const DoctorPlanManagementPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Plan creation / editing state
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planDesc, setPlanDesc] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');

  // Exercise assignment form modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [targetSets, setTargetSets] = useState<number>(3);
  const [targetReps, setTargetReps] = useState<number>(10);
  const [targetRom, setTargetRom] = useState<string>('85');
  const [frequency, setFrequency] = useState<number>(5);
  const [overrideNotes, setOverrideNotes] = useState<string>('');

  const loadData = async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const [patData, exData] = await Promise.all([
        api.getDoctorPatientDetail(patientId),
        api.getDoctorExercises(),
      ]);
      setPatient(patData);
      setExercises(exData);
      if (exData.length > 0) {
        setSelectedExerciseId(exData[0].id);
      }
      if (patData.active_plan) {
        setPlanTitle(patData.active_plan.title);
        setPlanDesc(patData.active_plan.description || '');
        if (patData.active_plan.start_date) setStartDate(patData.active_plan.start_date);
        if (patData.active_plan.end_date) setEndDate(patData.active_plan.end_date);
      } else {
        setPlanTitle('Custom Rehabilitation Protocol');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load plan.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const handleCreateOrUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setFeedback(null);
    try {
      if (patient?.active_plan) {
        await api.updatePlan(patient.active_plan.id, {
          title: planTitle,
          description: planDesc,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setFeedback({ type: 'success', message: 'Rehabilitation plan details saved.' });
      } else {
        await api.createPatientPlan(patientId, {
          title: planTitle,
          description: planDesc,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setFeedback({ type: 'success', message: 'New active rehabilitation protocol established.' });
      }
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating plan.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleAssignExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.active_plan) {
      setFeedback({ type: 'error', message: 'Please create and save the plan first before assigning exercises.' });
      return;
    }
    setSaving(true);
    try {
      await api.assignExerciseToPlan(patient.active_plan.id, {
        exercise_id: selectedExerciseId,
        target_sets: targetSets,
        target_reps: targetReps,
        target_rom_degrees: targetRom ? parseFloat(targetRom) : undefined,
        frequency_per_week: frequency,
        instructions_override: overrideNotes || undefined,
      });
      setShowAssignModal(false);
      setOverrideNotes('');
      setFeedback({ type: 'success', message: 'Exercise added to patient prescription protocol.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign exercise.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRemoveExercise = async (planExerciseId: string) => {
    if (!patient?.active_plan) return;
    try {
      await api.removePlanExercise(patient.active_plan.id, planExerciseId);
      setFeedback({ type: 'success', message: 'Exercise removed from prescription.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove exercise.' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '60px', width: '220px' }} />
        <div className="skeleton" style={{ height: '240px', width: '100%' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate(`/doctor/patients/${patientId}`)}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Return to Patient Chart
        </button>
      </div>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
          Prescribe Rehabilitation Plan: {patient?.full_name}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Configure target repetitions, sets, joint ROM angles, and exercise cadence for this patient.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            color: feedback.type === 'success' ? '#6ee7b7' : '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Protocol Metadata Form */}
      <form onSubmit={handleCreateOrUpdatePlan} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>Protocol Specifications</h3>

        <div className="form-group">
          <label className="form-label">Protocol Title</label>
          <input
            type="text"
            required
            value={planTitle}
            onChange={(e) => setPlanTitle(e.target.value)}
            placeholder="e.g. Phase 2 ACL Recovery & Quadriceps Reactivation"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Clinical Goals & Guidelines</label>
          <textarea
            rows={3}
            value={planDesc}
            onChange={(e) => setPlanDesc(e.target.value)}
            placeholder="Key clinical focus areas, mobility milestones, pain thresholds..."
            className="form-textarea"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Review Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            <Save size={16} /> {saving ? 'Saving...' : patient?.active_plan ? 'Save Protocol Changes' : 'Create & Activate Protocol'}
          </button>
        </div>
      </form>

      {/* 2. Assigned Exercises in Plan */}
      <section className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Prescribed Exercise List</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Exercises patient must perform during this rehabilitation phase.
            </p>
          </div>

          <button
            onClick={() => setShowAssignModal(true)}
            disabled={!patient?.active_plan}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Assign Exercise
          </button>
        </div>

        {patient?.active_plan && patient.active_plan.exercises.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {patient.active_plan.exercises.map((pe, idx) => (
              <div
                key={pe.id}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-teal">#{idx + 1}</span>
                    <span className="badge badge-blue">{pe.exercise.category}</span>
                    {pe.target_rom_degrees && (
                      <span className="badge badge-green">{pe.target_rom_degrees}° Target ROM</span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginTop: '0.35rem' }}>
                    {pe.exercise.name}
                  </h4>
                  {pe.instructions_override && (
                    <p style={{ fontSize: '0.825rem', color: 'var(--primary-light)', marginTop: '0.2rem' }}>
                      Physio cue: {pe.instructions_override}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    <span><strong>{pe.target_sets}</strong> Sets</span>
                    <span><strong>{pe.target_reps}</strong> Reps / Set</span>
                    <span><strong>{pe.frequency_per_week || 5}x</strong> / Week</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveExercise(pe.id)}
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}
                >
                  <Trash2 size={15} /> Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No exercises currently prescribed in this protocol. Click 'Assign Exercise' to add exercises.
          </div>
        )}
      </section>

      {/* 3. Assign Exercise Modal */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(12, 18, 30, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 100,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: '#131b2e',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
              Assign Exercise to Plan
            </h3>

            <form onSubmit={handleAssignExercise} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Exercise from Catalog</label>
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="form-select"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Target Sets</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={targetSets}
                    onChange={(e) => setTargetSets(parseInt(e.target.value) || 1)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reps per Set</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={targetReps}
                    onChange={(e) => setTargetReps(parseInt(e.target.value) || 1)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Target Joint ROM (°)</label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={targetRom}
                    onChange={(e) => setTargetRom(e.target.value)}
                    placeholder="85"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Frequency (Days / Week)</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={frequency}
                    onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Physiotherapist Guidance / Tempo Override</label>
                <textarea
                  rows={2}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Focus on terminal extension and 2-second isometric hold."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  Confirm & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
