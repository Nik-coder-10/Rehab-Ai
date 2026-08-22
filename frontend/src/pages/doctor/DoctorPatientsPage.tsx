import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Search,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import type { PatientListItem } from '../../types';

export const DoctorPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    async function loadPatients() {
      try {
        setLoading(true);
        const data = await api.getDoctorPatients(search || undefined);
        setPatients(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    const timeout = setTimeout(() => {
      loadPatients();
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const filteredPatients = patients.filter((p) => {
    if (filterStatus === 'attention') return p.needs_attention;
    if (filterStatus === 'ontrack') return !p.needs_attention;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>Patient Roster & Case Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Monitor active rehabilitation protocols, patient compliance, and clinical milestones.
          </p>
        </div>

        {/* Search & Status Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '520px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search patient by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            style={{ width: 'auto' }}
          >
            <option value="all">All Patients ({patients.length})</option>
            <option value="attention">Needs Review</option>
            <option value="ontrack">On Track (&gt;80% Adherence)</option>
          </select>
        </div>
      </div>

      {/* Patients Roster Cards / Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '70px', width: '100%' }} />
          <div className="skeleton" style={{ height: '70px', width: '100%' }} />
          <div className="skeleton" style={{ height: '70px', width: '100%' }} />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h4 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '0.25rem' }}>No Patients Matching Filter</h4>
          <p style={{ fontSize: '0.85rem' }}>Try clearing your search query or selecting all patients.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="glass-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: patient.needs_attention ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                        fontWeight: 700,
                      }}
                    >
                      {patient.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{patient.full_name}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{patient.email}</p>
                    </div>
                  </div>

                  {patient.needs_attention ? (
                    <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                      <AlertTriangle size={12} /> Review
                    </span>
                  ) : (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle2 size={12} /> Active
                    </span>
                  )}
                </div>

                {/* Medical Condition Tag */}
                {patient.medical_conditions && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    <strong style={{ color: '#ffffff' }}>Diagnosis:</strong> {patient.medical_conditions}
                  </div>
                )}

                {/* Active Plan Info */}
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Active Protocol:{' '}
                  <strong style={{ color: patient.active_plan_title ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                    {patient.active_plan_title || 'No active plan'}
                  </strong>
                </div>
              </div>

              {/* Stats Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span><strong>{patient.total_sessions_completed}</strong> Sessions</span>
                <span>Adherence: <strong style={{ color: patient.adherence_rate >= 80 ? '#34d399' : '#fbbf24' }}>{patient.adherence_rate}%</strong></span>
                <span>Joined {new Date(patient.linked_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => navigate(`/doctor/patients/${patient.id}/plan`)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  <ClipboardList size={14} /> Prescribe Plan
                </button>
                <button
                  onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  Patient Chart <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
