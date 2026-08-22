import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Play, Search, Target } from 'lucide-react';
import { api } from '../services/api';
import type { Exercise, RehabilitationPlan } from '../types';

export const ExercisesPage: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [exData, planData] = await Promise.all([
          api.getPatientExercises(),
          api.getPatientPlan(),
        ]);
        setExercises(exData);
        setPlan(planData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const assignedMap = new Map(
    plan?.exercises.map((pe) => [pe.exercise_id, pe]) || []
  );

  const filtered = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.description && ex.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '80px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '220px' }} />
          <div className="skeleton" style={{ height: '220px' }} />
          <div className="skeleton" style={{ height: '220px' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Rehabilitation Exercise Library</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Exercises prescribed by your doctor and standard clinical physiotherapy catalog.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search exercise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">All Categories</option>
            <option value="strength">Strength</option>
            <option value="mobility">Mobility</option>
            <option value="stretching">Stretching</option>
            <option value="balance">Balance</option>
          </select>
        </div>
      </div>

      {/* Grid of Exercise Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((exercise) => {
          const assignedPlanEx = assignedMap.get(exercise.id);
          return (
            <div
              key={exercise.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: assignedPlanEx ? '1px solid rgba(20, 184, 166, 0.35)' : '1px solid var(--border-subtle)',
                background: assignedPlanEx ? 'linear-gradient(135deg, rgba(23, 33, 56, 0.8) 0%, rgba(20, 184, 166, 0.08) 100%)' : 'var(--bg-card)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge badge-teal">{exercise.category}</span>
                  {assignedPlanEx ? (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                      <Target size={12} /> Prescribed In Plan
                    </span>
                  ) : (
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Standard Catalog</span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                  {exercise.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {assignedPlanEx?.instructions_override || exercise.description}
                </p>
              </div>

              {/* Target Reps / Sets summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span><strong>{assignedPlanEx ? assignedPlanEx.target_sets : 3}</strong> Sets</span>
                <span><strong>{assignedPlanEx ? assignedPlanEx.target_reps : 10}</strong> Reps</span>
                <span>Target ROM: <strong>{assignedPlanEx?.target_rom_degrees || 90}°</strong></span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/patient/exercises/${exercise.id}`)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }}
                >
                  <Info size={15} /> Guide & Details
                </button>
                <button
                  onClick={() => navigate(`/patient/session/${exercise.id}${assignedPlanEx ? `?plan_exercise_id=${assignedPlanEx.id}` : ''}`)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.55rem', fontSize: '0.85rem' }}
                >
                  <Play size={15} fill="currentColor" /> Start Session
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
