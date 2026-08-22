import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Plus,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Exercise, ExerciseCategory } from '../../types';

export const DoctorExercisesPage: React.FC = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal for new exercise creation
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [description, setDescription] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctorExercises();
      setExercises(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.createExercise({
        name,
        code: code || name.toLowerCase().replace(/\s+/g, '_'),
        category,
        description,
        instructions,
      });
      setShowCreateModal(false);
      setName('');
      setCode('');
      setDescription('');
      setInstructions('');
      setFeedback('New clinical exercise added to system catalog.');
      await loadExercises();
    } catch (err: any) {
      alert(err.message || 'Failed to create exercise');
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const filtered = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.description && ex.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Clinical Exercise Catalogue</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Biomechanical exercise library configured for real-time AI joint angle and posture detection.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem' }}
        >
          <Plus size={16} /> New Clinical Exercise
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '520px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search exercises..."
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
          <option value="all">All Categories ({exercises.length})</option>
          <option value="strength">Strength</option>
          <option value="mobility">Mobility</option>
          <option value="stretching">Stretching</option>
          <option value="balance">Balance</option>
        </select>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '220px' }} />
          <div className="skeleton" style={{ height: '220px' }} />
          <div className="skeleton" style={{ height: '220px' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((exercise) => (
            <div
              key={exercise.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge badge-teal">{exercise.category}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {exercise.code}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                  {exercise.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {exercise.description}
                </p>
              </div>

              {exercise.default_engine_config && (
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Target Joint: <strong style={{ color: 'var(--primary-light)' }}>{exercise.default_engine_config.target_joint || 'Joint Compound'}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Exercise Modal */}
      {showCreateModal && (
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
              maxWidth: '540px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: '#131b2e',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem' }}>
              Add Clinical Exercise to Catalog
            </h3>

            <form onSubmit={handleCreateExercise} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Exercise Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Terminal Knee Extension (TKE)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
                    className="form-select"
                  >
                    <option value="strength">Strength</option>
                    <option value="mobility">Mobility</option>
                    <option value="stretching">Stretching</option>
                    <option value="balance">Balance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Code Identifier (Auto/Custom)</label>
                  <input
                    type="text"
                    placeholder="terminal_knee_ext"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target muscle groups, joint kinetics..."
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Step-by-Step Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="1. Step one...&#10;2. Step two...&#10;3. Step three..."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? 'Saving...' : 'Add Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
