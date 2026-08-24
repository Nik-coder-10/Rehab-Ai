import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { DoctorDashboardSummary, DoctorProfile, PatientListItem } from '../../types';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DoctorDashboardSummary | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [intelligence, setIntelligence] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashData, profData, intelData, recsData] = await Promise.all([
          api.getDoctorDashboard(),
          api.getDoctorProfile(),
          api.getDoctorIntelligence().catch(() => null),
          api.getDoctorRecommendations().catch(() => []),
        ]);
        setDashboard(dashData);
        setProfile(profData);
        setIntelligence(intelData);
        setRecommendations(recsData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load clinical dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '140px', width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
        <div className="skeleton" style={{ height: '350px', width: '100%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--status-danger)' }}>
        <AlertCircle size={40} color="var(--status-danger)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Clinical Data Error</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          <RotateCcw size={16} /> Retry
        </button>
      </div>
    );
  }

  const pendingRecs = recommendations.filter((r) => r.status === 'GENERATED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Welcome & Action Banner */}
      <section
        className="glass-panel"
        style={{
          padding: '2.25rem 2rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(59, 130, 246, 0.14) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-blue">
              <Stethoscope size={12} /> Physiotherapy Care Station
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Good morning, {user?.full_name || 'Dr. Vance'} 🩺
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.3rem', maxWidth: '650px' }}>
            {profile?.specialization || 'Orthopedic Physical Therapy'} • {profile?.organization || 'Apex Physical Therapy Institute'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/doctor/intelligence')}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Brain size={18} /> Open Intelligence Center
          </button>
          <button
            onClick={() => navigate('/doctor/patients')}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <Users size={18} /> Patient Directory
          </button>
        </div>
      </section>

      {/* 2. Key Clinical Triage Metric KPIs */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Total Assigned Patients */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL PATIENTS</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: '#ffffff' }}>
            {dashboard?.total_patients ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Active under direct clinical care
          </div>
        </div>

        {/* Needs Attention Alert Counter */}
        <div
          className="glass-panel"
          onClick={() => navigate('/doctor/intelligence')}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            border: (intelligence?.needs_attention_count || dashboard?.patients_needing_attention_count) ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>NEEDS ATTENTION</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: '#ef4444' }}>
            {intelligence?.needs_attention_count ?? dashboard?.patients_needing_attention_count ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Low compliance or performance decline
          </div>
        </div>

        {/* Improving Recovery */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>IMPROVING RECOVERY</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: '#10b981' }}>
            {intelligence?.improving_patients_count ?? 2}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Strong joint ROM & form stability gains
          </div>
        </div>

        {/* Pending AI Protocol Recommendations */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-light)', fontWeight: 600 }}>PENDING AI REVIEWS</span>
            <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: 'rgba(20, 184, 166, 0.15)', color: 'var(--primary-light)' }}>
              <Bot size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: '0.6rem', color: 'var(--primary-light)' }}>
            {pendingRecs.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Awaiting physician progression approval
          </div>
        </div>
      </section>

      {/* 3. Patient Activity Directory Table */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Active Care Team Patient Roster</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recent compliance, prescription status and session logs.</p>
          </div>
          <button onClick={() => navigate('/doctor/patients')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            View Full Directory <ArrowRight size={14} />
          </button>
        </div>

        {dashboard?.recent_patient_activity && dashboard.recent_patient_activity.length > 0 ? (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Patient</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Plan</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sessions</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Adherence</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent_patient_activity.map((p: PatientListItem) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{p.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.email}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-primary)' }}>
                      {p.active_plan_title || <span style={{ color: 'var(--text-muted)' }}>No Active Plan</span>}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-primary)' }}>
                      {p.total_sessions_completed} sessions
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span className={p.adherence_rate >= 80 ? 'badge badge-green' : 'badge badge-amber'}>
                        {p.adherence_rate}%
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      {p.needs_attention ? (
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                          <AlertTriangle size={12} /> Needs Review
                        </span>
                      ) : (
                        <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle2 size={12} /> On Track
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        Open Chart <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No patients currently linked to your care roster.
          </div>
        )}
      </section>
    </div>
  );
};
